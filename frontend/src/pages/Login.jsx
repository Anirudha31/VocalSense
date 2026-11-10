
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { Lock, Mail } from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { errMsg } from "../lib/api";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(
        err?.response?.status === 401
          ? "Invalid email or password."
          : errMsg(err, "Login failed.")
      );
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Auth
      title="Welcome back"
      sub="Sign in to continue to your emotion intelligence dashboard."
    >
      <form onSubmit={handleLogin} className="auth-form">
        <Field icon={Mail} label="Email">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </Field>

        <Field icon={Lock} label="Password">
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </Field>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="primary-btn"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
          <span>→</span>
        </button>
      </form>

      <p className="auth-switch">
        New to VocalSense?{" "}
        <Link to="/register">Create an account</Link>
      </p>
    </Auth>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label>
      {label}

      <div className="input-icon">
        <Icon size={16} />
        {children}
      </div>
    </label>
  );
}

function Auth({ title, sub, children }) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <img
          src="/vocalsense-icon.png"
          alt="VocalSense"
          className="auth-logo-icon"
        />

        <span>
          Vocal<span className="brand-highlight">Sense</span>
        </span>
      </div>

      <div className="auth-card">
        <div className="eyebrow">
          SPEECH EMOTION RECOGNITION
        </div>

        <h1>{title}</h1>

        <p>{sub}</p>

        {children}
      </div>
    </div>
  );
}