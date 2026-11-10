import io
import os
import tempfile

import numpy as np
import librosa


# Audio configuration
SR = 16000
N_MFCC = 40
N_FFT = 1024
HOP_LENGTH = 256

# Pitch detection range in Hz
FMIN = 65
FMAX = 500


def _mean_std(values):
    """Return mean and standard deviation as a flat array."""

    values = np.asarray(values, dtype=np.float32).flatten()

    return np.array(
        [
            np.mean(values),
            np.std(values)
        ],
        dtype=np.float32
    )


def features_from_signal(y, sr=SR):
    """
    Extract 256 audio features from a speech signal.

    Features:
    - MFCC mean and standard deviation
    - Delta MFCC mean and standard deviation
    - Delta-delta MFCC mean and standard deviation
    - Pitch statistics
    - RMS energy
    - Zero crossing rate
    - Spectral centroid
    - Spectral bandwidth
    - Spectral rolloff
    """

    y = np.asarray(y, dtype=np.float32).flatten()

    if y.size < N_FFT:
        raise ValueError(
            "Audio is too short (need at least 1024 samples)."
        )

    if not np.all(np.isfinite(y)):
        raise ValueError("Audio contains invalid numerical values.")

    # Normalize audio for more consistent spectral features.
    y = librosa.util.normalize(y)

    # -------------------------------------------------
    # 1. MFCC features
    # -------------------------------------------------

    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH
    )

    # Delta and delta-delta features.
    # Use an adaptive width to support shorter recordings.
    frames = mfcc.shape[1]

    if frames >= 3:
        delta_width = min(9, frames)

        if delta_width % 2 == 0:
            delta_width -= 1

        delta = librosa.feature.delta(
            mfcc,
            order=1,
            width=delta_width,
            mode="nearest"
        )

        delta_delta = librosa.feature.delta(
            mfcc,
            order=2,
            width=delta_width,
            mode="nearest"
        )
    else:
        delta = np.zeros_like(mfcc)
        delta_delta = np.zeros_like(mfcc)

    mfcc_features = np.concatenate([
        mfcc.mean(axis=1),
        mfcc.std(axis=1),
        delta.mean(axis=1),
        delta.std(axis=1),
        delta_delta.mean(axis=1),
        delta_delta.std(axis=1)
    ])

    # -------------------------------------------------
    # 2. Pitch features (Fundamental Frequency)
    # -------------------------------------------------

    pitch = librosa.yin(
        y,
        fmin=FMIN,
        fmax=FMAX,
        sr=sr,
        frame_length=N_FFT,
        hop_length=HOP_LENGTH
    )

    rms_frames = librosa.feature.rms(
        y=y,
        frame_length=N_FFT,
        hop_length=HOP_LENGTH
    )[0]

    # Use energy to exclude low-energy / likely unvoiced frames.
    min_length = min(len(pitch), len(rms_frames))

    pitch = pitch[:min_length]
    rms_frames = rms_frames[:min_length]

    threshold = max(
        float(np.max(rms_frames)) * 0.10,
        1e-4
    )

    voiced_mask = rms_frames > threshold
    voiced_pitch = pitch[voiced_mask]

    if voiced_pitch.size > 0:
        pitch_features = np.array([
            np.mean(voiced_pitch),
            np.std(voiced_pitch),
            np.median(voiced_pitch),
            np.percentile(voiced_pitch, 10),
            np.percentile(voiced_pitch, 90),
            np.mean(voiced_mask)
        ], dtype=np.float32)
    else:
        pitch_features = np.zeros(6, dtype=np.float32)

    # -------------------------------------------------
    # 3. RMS Energy
    # -------------------------------------------------

    rms = librosa.feature.rms(
        y=y,
        frame_length=N_FFT,
        hop_length=HOP_LENGTH
    )[0]

    rms_features = _mean_std(rms)

    # -------------------------------------------------
    # 4. Zero Crossing Rate
    # -------------------------------------------------

    zcr = librosa.feature.zero_crossing_rate(
        y,
        frame_length=N_FFT,
        hop_length=HOP_LENGTH
    )[0]

    zcr_features = _mean_std(zcr)

    # -------------------------------------------------
    # 5. Spectral features
    # -------------------------------------------------

    centroid = librosa.feature.spectral_centroid(
        y=y,
        sr=sr,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH
    )[0]

    bandwidth = librosa.feature.spectral_bandwidth(
        y=y,
        sr=sr,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH
    )[0]

    rolloff = librosa.feature.spectral_rolloff(
        y=y,
        sr=sr,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH
    )[0]

    spectral_features = np.concatenate([
        _mean_std(centroid),
        _mean_std(bandwidth),
        _mean_std(rolloff)
    ])

    # -------------------------------------------------
    # 6. Combine all features
    # -------------------------------------------------

    features = np.concatenate([
        mfcc_features,
        pitch_features,
        rms_features,
        zcr_features,
        spectral_features
    ]).astype(np.float32)

    if features.shape[0] != 256:
        raise ValueError(
            f"Expected 256 features, got {features.shape[0]}."
        )

    if not np.all(np.isfinite(features)):
        raise ValueError("Extracted features contain invalid values.")

    return features


def load_audio(data: bytes, sr=SR):
    """Load audio bytes, with a temporary-file fallback."""

    try:
        y, _ = librosa.load(
            io.BytesIO(data),
            sr=sr,
            mono=True
        )

        return y

    except Exception:
        pass

    # Fallback for formats that cannot be decoded from memory.
    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".audio"
    ) as f:
        f.write(data)
        path = f.name

    try:
        y, _ = librosa.load(
            path,
            sr=sr,
            mono=True
        )

        return y

    except Exception as error:
        raise ValueError(
            "Could not decode this audio. "
            "Use WAV/MP3/OGG, or install ffmpeg."
        ) from error

    finally:
        if os.path.exists(path):
            os.unlink(path)


def extract_mfcc(data: bytes, sr=SR):
    """
    Extract the shared feature vector from uploaded audio.

    The function name is retained to avoid changing existing API imports.
    """

    y = load_audio(data, sr)

    return features_from_signal(y, sr)