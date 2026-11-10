export async function toWav16k(file) {
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error("AudioContext is not supported by this browser.");
  }

  let audioContext;
  let decoded;

  try {
    audioContext = new AudioContextClass();

    const audioBuffer = await file.arrayBuffer();
    decoded = await audioContext.decodeAudioData(audioBuffer);
  } catch (error) {
    throw new Error(
      "Unable to decode audio. Please upload a valid audio file."
    );
  } finally {
    if (audioContext && audioContext.state !== "closed") {
      await audioContext.close();
    }
  }

  const sampleRate = 16000;

  const offlineContext = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * sampleRate)),
    sampleRate
  );

  const source = offlineContext.createBufferSource();

  source.buffer = decoded;
  source.connect(offlineContext.destination);
  source.start();

  const renderedBuffer = await offlineContext.startRendering();
  const samples = renderedBuffer.getChannelData(0);

  // Create WAV file buffer
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // Write ASCII strings into the WAV header
  const writeString = (offset, text) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");

  // Format chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  // Data chunk
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  // Convert Float32 samples to signed 16-bit PCM
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]));

    view.setInt16(
      44 + i * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
  }

  // Return WAV file
  const fileName =
    file.name.replace(/\.[^.]+$/, "") + ".wav";

  return new File([buffer], fileName, {
    type: "audio/wav",
  });
}
