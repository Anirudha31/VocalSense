import { useEffect, useState } from "react";

import { Search, FileAudio } from "lucide-react";

import { dashboardApi } from "../lib/api";

export default function History() {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch prediction history
  useEffect(() => {
    let cancelled = false;

    dashboardApi
      .history()
      .then((response) => {
        if (!cancelled) {
          const data = response.data;
          setRecords(Array.isArray(data) ? data : []);
        }
      })
      .catch((error) => {
        console.error("History loading failed:", error);

        if (!cancelled) {
          setError("Unable to load prediction history.");
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

  // Filter records by emotion or model
  const filteredRecords = records.filter((record) => {
    const emotion = String(record.emotion || "").toLowerCase();
    const model = String(record.model || "").toLowerCase();
    const search = query.toLowerCase();

    return (
      emotion.includes(search) ||
      model.includes(search)
    );
  });

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR DATA</div>

          <h1>Emotion history</h1>

          <p>
            Completed predictions are stored in PostgreSQL
            for reporting and analysis.
          </p>
        </div>
      </div>

      <section className="panel">
        <div className="toolbar">
          <div className="search">
            <Search size={15} />

            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search emotion or model"
            />
          </div>

          <span>
            {filteredRecords.length} records
          </span>
        </div>

        <div className="history-table">
          <div className="tr th">
            <span>Audio</span>
            <span>Emotion</span>
            <span>Model</span>
            <span>Confidence</span>
            <span>Created</span>
          </div>

          {filteredRecords.map((record) => (
            <div className="tr" key={record.id}>
              <span>
                <FileAudio
                  size={13}
                  style={{
                    marginRight: 8,
                    verticalAlign: "-2px",
                    color: "#9b91ff",
                  }}
                />

                {record.filename || "Audio recording"}
              </span>

              <span className="emotion-chip">
                {record.emoji || "🎭"} {record.emotion}
              </span>

              <span>{record.model || "—"}</span>

              <span>
                {record.confidence ?? "—"}%
              </span>

              <span>
                {record.created_at
                  ? new Date(
                      record.created_at
                    ).toLocaleString()
                  : "—"}
              </span>
            </div>
          ))}

          {loading && (
            <div className="empty">
              Loading prediction history...
            </div>
          )}

          {!loading && error && (
            <div className="empty">
              {error}
            </div>
          )}

          {!loading && !error && filteredRecords.length === 0 && (
            <div className="empty">
              No matching predictions.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}