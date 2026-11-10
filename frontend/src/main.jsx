import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./styles.css";

// Displays React component errors instead of a blank page.
class Boundary extends React.Component {
  state = {
    error: null,
  };

  static getDerivedStateFromError(error) {
    return {
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("VocalSense React error:", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <pre
          style={{
            color: "#fff",
            background: "#7f1d1d",
            padding: 20,
            margin: 0,
            minHeight: "100vh",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          }}
        >
          {"VocalSense crashed:\n\n"}
          {String(
            this.state.error?.stack || this.state.error
          )}
        </pre>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <Boundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Boundary>
);