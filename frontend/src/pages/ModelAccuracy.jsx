
import { useEffect, useState } from "react";
import { Cpu, Layers3 } from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

import { dashboardApi } from "../lib/api";

export default function ModelAccuracy() {
  const [data, setData] = useState({
    models: [],
    metrics: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      dashboardApi.models(),
      dashboardApi.metrics(),
    ])
      .then(([modelsResponse, metricsResponse]) => {
        if (cancelled) return;

        const modelsData = modelsResponse.data;
        const metricsData = metricsResponse.data;

        setData({
          models: Array.isArray(modelsData)
            ? modelsData
            : modelsData?.models || [],

          metrics: Array.isArray(metricsData)
            ? metricsData
            : metricsData?.metrics || [],
        });
      })
      .catch((err) => {
        console.error("Model metrics loading failed:", err);

        if (!cancelled) {
          setError("Unable to load model information.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">MODEL LAB</div>
          <h1>Model accuracy & experiments</h1>
          <p>
            Compare the SVM baseline with CNN and CNN-LSTM experiments.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="panel empty">
          Loading model information...
        </div>
      ) : error ? (
        <div className="error-box">{error}</div>
      ) : (
        <>
          <div className="model-cards">
            {data.models.map((model) => {
              const isDeepLearning =
                model.type === "deep_learning";

              const hasAccuracy =
                model.accuracy != null;

              return (
                <div
                  className={`model-card ${model.active ? "active" : ""}`}
                  key={model.name}
                >
                  <small>
                    {isDeepLearning
                      ? "Deep learning"
                      : "Classical ML"}
                  </small>

                  <h3>{model.name}</h3>

                  <p>
                    {model.description || "No description available."}
                  </p>

                  <div className="model-metric">
                    <span>Accuracy</span>
                    <b>
                      {hasAccuracy
                        ? `${model.accuracy}%`
                        : "Not trained"}
                    </b>
                  </div>

                  {hasAccuracy && (
                    <div className="model-metric">
                      <span>Precision / Recall / F1</span>
                      <b>
                        {model.precision ?? "—"}% ·{" "}
                        {model.recall ?? "—"}% ·{" "}
                        {model.f1 ?? "—"}%
                      </b>
                    </div>
                  )}
                </div>
              );
            })}

            {data.models.length === 0 && (
              <div className="empty">
                No model information available.
              </div>
            )}
          </div>

          <section className="panel">
            <div className="panel-head">
              <div>
                <b>Model comparison</b>
                <small>Metrics stored by the backend</small>
              </div>
            </div>

            {data.metrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={data.metrics}
                  margin={{
                    top: 15,
                    right: 15,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#25304a"
                  />

                  <XAxis
                    dataKey="model"
                    tick={{
                      fill: "#8a96ad",
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    domain={[0, 100]}
                    tick={{
                      fill: "#8a96ad",
                      fontSize: 11,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#12192a",
                      border: "1px solid #25304a",
                      borderRadius: 8,
                    }}
                  />

                  <Legend />

                  <Bar
                    dataKey="accuracy"
                    name="Accuracy"
                    fill="#7c6cf4"
                    radius={[7, 7, 0, 0]}
                  />

                  <Bar
                    dataKey="f1"
                    name="F1 Score"
                    fill="#22d3ee"
                    radius={[7, 7, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty">
                No comparison metrics available yet.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
