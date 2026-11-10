import { useEffect, useRef } from "react";

export default function Waveform({ file, height = 110 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!file || !ref.current) return;

    let dead = false;
    let audioContext;

    const canvas = ref.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const drawWaveform = async () => {
      try {
        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) {
          throw new Error("AudioContext is not supported.");
        }

        audioContext = new AudioContextClass();

        const buffer = await file.arrayBuffer();
        const audio = await audioContext.decodeAudioData(buffer);

        if (dead) return;

        const data = audio.getChannelData(0);
        const samples = 1000;
        const step = Math.max(1, Math.floor(data.length / samples));
        const peaks = [];

        for (let i = 0; i < samples; i++) {
          let peak = 0;

          for (let j = 0; j < step; j++) {
            peak = Math.max(
              peak,
              Math.abs(data[i * step + j] || 0)
            );
          }

          peaks.push(peak);
        }

        const width = canvas.clientWidth || 600;
        const ratio = window.devicePixelRatio || 1;

        canvas.width = width * ratio;
        canvas.height = height * ratio;

        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = "#7c6cf4";
        ctx.lineWidth = 2;
        ctx.beginPath();

        peaks.forEach((value, index) => {
          const x = (index / (peaks.length - 1)) * width;
          const y = height / 2 - value * height * 0.42;

          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();
      } catch (error) {
        if (!dead) {
          console.error("Waveform generation failed:", error);
        }
      }
    };

    drawWaveform();

    return () => {
      dead = true;

      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().catch(() => {});
      }
    };
  }, [file, height]);

  return (
    <canvas
      ref={ref}
      className="waveform"
      style={{ height }}
    />
  );
}