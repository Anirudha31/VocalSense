import { useEffect, useMemo, useRef, useState } from "react";

import {
  AudioWaveform,
  FileAudio,
  Mic2,
  Upload,
  Square,
  RotateCcw,
} from "lucide-react";

import { predictionApi, errMsg } from "../lib/api";
import { toWav16k } from "../lib/audio";
import Waveform from "../components/Waveform";

export default function Detect() {
  const input = useRef(null);
  const recRef = useRef(null);
  const streamRef = useRef(null);

  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [model, setModel] = useState("svm");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Generate an audio preview URL
  const url = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  // Clean up audio preview URL
  useEffect(() => {
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [url]);

  // Stop microphone recording when the component unmounts
  useEffect(() => {
    return () => {
      const recorder = recRef.current;

      if (recorder) {
        recorder.onstop = null;

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  // Start microphone recording
  const start = async () => {
    setError("");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone access is not supported by this browser."
        );
      }

      if (!window.MediaRecorder) {
        throw new Error(
          "Audio recording is not supported by this browser."
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];

      const mimeType = supportedTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || "audio/webm";

        const extension = type.includes("ogg")
          ? "ogg"
          : type.includes("mp4")
            ? "m4a"
            : "webm";

        const audioFile = new File(
          chunks,
          `voice-recording.${extension}`,
          { type }
        );

        setFile(audioFile);
        setResult(null);
        setRecording(false);

        stream.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
        recRef.current = null;
      };

      recorder.onerror = () => {
        setError("An error occurred while recording audio.");
      };

      recorder.start();

      recRef.current = recorder;
      setRecording(true);
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
      recRef.current = null;

      setRecording(false);

      setError(
        error.message ||
        "Microphone access was denied or is unavailable. Use localhost or HTTPS."
      );
    }
  };

  // Stop microphone recording
  const stop = () => {
    if (
      recRef.current &&
      recRef.current.state !== "inactive"
    ) {
      recRef.current.stop();
    }
  };

  // Analyze uploaded or recorded audio
  const analyze = async () => {
    if (!file || busy) return;

    setBusy(true);
    setError("");
    setResult(null);

    try {
      let audioFile = file;

      // Convert non-WAV audio to 16 kHz WAV
      if (!/\.wav$/i.test(file.name)) {
        try {
          audioFile = await toWav16k(file);
        } catch (error) {
          console.warn(
            "Audio conversion failed. Sending original file.",
            error
          );
        }
      }

      const response = await predictionApi.predict(
        audioFile,
        model
      );

      setResult(response.data);
    } catch (error) {
      setError(errMsg(error, "Prediction failed."));
    } finally {
      setBusy(false);
    }
  };

  // Select uploaded audio
  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError("");
    }

    event.target.value = "";
  };

  // Remove selected audio
  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError("");
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">LIVE ANALYZER</div>

          <h1>Detect emotion from speech</h1>

          <p>
            Record a voice sample or upload audio, then select
            the model.
          </p>
        </div>
      </div>

      <div className="detect-grid">
        <section className="panel">
          <div className="upload-grid">
            <button
              className="upload-card"
              onClick={() => input.current?.click()}
              disabled={busy || recording}
            >
              <span>
                <Upload />
              </span>

              <b>Upload audio</b>
              <small>WAV, MP3, OGG, WEBM, M4A</small>
            </button>

            <button
              className={`upload-card ${recording ? "recording" : ""
                }`}
              onClick={recording ? stop : start}
              disabled={busy}
            >
              <span>
                {recording ? <Square /> : <Mic2 />}
              </span>

              <b>
                {recording
                  ? "Stop recording"
                  : "Record speech"}
              </b>

              <small>
                {recording
                  ? "Recording..."
                  : "Use your microphone"}
              </small>
            </button>
          </div>

          <input
            ref={input}
            hidden
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
          />

          {file && (
            <div className="selected-audio">
              <div className="selected-title">
                <FileAudio size={18} />

                <b>{file.name}</b>

                <button
                  onClick={removeFile}
                  disabled={busy}
                  title="Remove audio"
                >
                  <RotateCcw size={15} />
                </button>
              </div>

              <Waveform file={file} />

              <audio controls src={url} />
            </div>
          )}

          <div className="model-select">
            <label>
              Inference model

              <select
                value={model}
                onChange={(event) =>
                  setModel(event.target.value)
                }
                disabled={busy}
              >
                <option value="svm">
                  SVM — MFCC baseline
                </option>

                <option value="cnn">
                  CNN — Mel Spectrogram
                </option>

                <option value="cnn_lstm">
                  CNN-LSTM — Temporal features
                </option>
              </select>
            </label>

            <button
              className="primary-btn"
              disabled={!file || busy || recording}
              onClick={analyze}
            >
              {busy ? "Analyzing..." : "Analyze emotion"}
              <span>→</span>
            </button>
          </div>

          {error && (
            <div
              className="error-box"
              style={{ marginTop: 12 }}
            >
              {error}
            </div>
          )}
        </section>

        <section className="panel result-panel">
          {result ? (
            <Result d={result} />
          ) : (
            <div className="empty-result">
              <div className="result-orb">
                <AudioWaveform />
              </div>

              <h2>Your prediction appears here</h2>

              <p>
                Upload or record a voice sample to begin.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Display emotion prediction results
function Result({ d }) {
  const probabilities = Object.entries(
    d.probabilities || {}
  ).sort((a, b) => Number(b[1]) - Number(a[1]));

  return (
    <div>
      <div className="result-main">
        <div className="big-emoji">
          {d.emoji || "🎭"}
        </div>

        <div>
          <div className="eyebrow">PREDICTED EMOTION</div>

          <h2>{d.emotion || "Unknown"}</h2>

          <span className="confidence-pill">
            {d.confidence ?? "—"}% confidence
          </span>
        </div>
      </div>

      <div className="prob-list">
        {probabilities.map(([emotion, value]) => (
          <div className="prob" key={emotion}>
            <span>{emotion}</span>

            <div>
              <i
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, Number(value) || 0)
                  )}%`,
                }}
              />
            </div>

            <b>{value}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}