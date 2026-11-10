import { useEffect, useState } from "react";

import {
  Activity,
  AudioWaveform,
  BrainCircuit,
  Gauge,
  Mic2,
  ArrowUpRight,
} from "lucide-react";

import { dashboardApi } from "../lib/api";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { Link } from "react-router-dom";

const colors = [
  "#7c6cf4",
  "#22d3ee",
  "#34d399",
  "#f59e0b",
  "#fb7185",
  "#a78bfa",
  "#84cc16",
  "#f472b6",
];

export default function Dashboard() {
  const [d, setD] = useState({
    summary: {},
    distribution: [],
    recent: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    dashboardApi
      .summary()
      .then((r) => {
        if (!cancelled) {
          setD(r.data);
        }
      })
      .catch((error) => {
        console.error("Dashboard loading failed:", error);
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

  const s = d.summary || {};
  const distribution = d.distribution || [];
  const recent = d.recent || [];

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">OVERVIEW</div>
          <h1>Emotion intelligence dashboard</h1>
          <p>
            Monitor detections, model performance, and your
            speech analysis history.
          </p>
        </div>

        <Link to="/detect" className="primary-btn compact">
          <Mic2 size={16} />
          New detection
        </Link>
      </div>

      <div className="stat-grid">
        <Stat
          i={AudioWaveform}
          l="Total analyses"
          v={s.total_predictions ?? "—"}
        />

        <Stat
          i={Gauge}
          l="Average confidence"
          v={
            s.avg_confidence != null
              ? `${s.avg_confidence}%`
              : "—"
          }
        />

        <Stat
          i={BrainCircuit}
          l="Active model"
          v={s.active_model || "SVM"}
        />

        <Stat
          i={Activity}
          l="Top emotion"
          v={s.top_emotion || "—"}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <Head
            t="Emotion distribution"
            st="Your recent predictions"
            link="/history"
          />

          {loading ? (
            <div className="empty">Loading chart...</div>
          ) : distribution.length === 0 ? (
            <div className="empty">
              No emotion data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribution}>
                <XAxis
                  dataKey="emotion"
                  tick={{ fill: "#7e8ba4", fontSize: 11 }}
                  axisLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#7e8ba4", fontSize: 11 }}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "#12192a",
                    border: "1px solid #25304a",
                  }}
                />

                <Bar
                  dataKey="count"
                  fill="#7c6cf4"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="panel">
          <Head
            t="Emotion share"
            st="All recorded analyses"
          />

          {loading ? (
            <div className="empty">Loading chart...</div>
          ) : distribution.length === 0 ? (
            <div className="empty">
              No emotion data available yet.
            </div>
          ) : (
            <div className="pie-layout">
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={distribution}
                    dataKey="count"
                    nameKey="emotion"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {distribution.map((_, i) => (
                      <Cell
                        key={i}
                        fill={colors[i % colors.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="legend">
                {distribution.map((x, i) => (
                  <div key={x.emotion}>
                    <i
                      style={{
                        background: colors[i % colors.length],
                      }}
                    />
                    {x.emotion}
                    <b>{x.count}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <Head
          t="Recent detections"
          st="Latest activity from your account"
          link="/history"
        />

        <div className="table">
          <div className="tr th">
            <span>Emotion</span>
            <span>Model</span>
            <span>Confidence</span>
            <span>Date</span>
          </div>

          {recent.map((r) => (
            <div className="tr" key={r.id}>
              <span className="emotion-chip">
                {r.emoji} {r.emotion}
              </span>

              <span>{r.model}</span>

              <span>{r.confidence}%</span>

              <span>
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
          ))}

          {!loading && recent.length === 0 && (
            <div className="empty">
              No detections yet. Start your first analysis.
            </div>
          )}

          {loading && (
            <div className="empty">Loading detections...</div>
          )}
        </div>
      </section>
    </div>
  );
}

// Reusable statistic card
function Stat({ i: Icon, l, v }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={18} />
      </div>

      <small>{l}</small>
      <strong>{v}</strong>
    </div>
  );
}

// Reusable panel heading
function Head({ t, st, link }) {
  return (
    <div className="panel-head">
      <div>
        <b>{t}</b>
        <small>{st}</small>
      </div>

      {link && (
        <Link to={link}>
          View all <ArrowUpRight size={14} />
        </Link>
      )}
    </div>
  );
}
