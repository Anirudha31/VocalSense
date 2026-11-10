
import { useState } from "react";

import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  Lock,
  Mail,
  User,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import { errMsg } from "../lib/api";

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(errMsg(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <img
          src="/vocalsense-icon.png"
          alt="VocalSense Logo"
          className="auth-logo-icon"
        />

        <span>
          Vocal<span className="brand-highlight">Sense</span>
        </span>
      </div>

      <div className="auth-card">
        <div className="eyebrow">
          CREATE YOUR WORKSPACE
        </div>

        <h1>Create account</h1>

        <p>
          Save your speech emotion analyses and track
          model results.
        </p>

        <form
          onSubmit={handleRegister}
          className="auth-form"
        >
          <Field icon={User} label="Name">
            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              type="text"
              placeholder="Your name"
              autoComplete="name"
              required
            />
          </Field>

          <Field icon={Mail} label="Email">
            <input
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </Field>

          <Field icon={Lock} label="Password">
            <input
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              type="password"
              minLength={8}
              placeholder="At least 8 characters"
              autoComplete="new-password"
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
            {loading ? "Creating account..." : "Create account"}
            <span>→</span>
          </button>
        </form>

        <p className="auth-switch">
          Already registered?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
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