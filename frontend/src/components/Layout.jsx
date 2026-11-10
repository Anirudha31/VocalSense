import { NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  History,
  Home,
  LogOut,
  Mic2,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";

const links = [
  ["/", "Dashboard", Home],
  ["/detect", "Detect Emotion", Mic2],
  ["/history", "Emotion History", History],
  ["/models", "Model Accuracy", BarChart3],
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">

        <div className="logo">
          <img
            src="/vocalsense-icon.png"
            className="logo-icon"
          />

          <span className="logo-text">
            Vocal<span>Sense</span>
          </span>
        </div>


        <div className="side-caption">SPEECH EMOTION AI</div>

        <nav>
          {links.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                isActive ? "nav active" : "nav"
              }
            >
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="engine-status">
            <i className="live-dot" />
            AI engine ready
          </div>
          <div className="mini-user">
            <div className="avatar">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>

            <div>
              <b>{user?.name || "User"}</b>
              <small>{user?.email || ""}</small>
            </div>
          </div>

          <button className="ghost-btn" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
        </header>

        <Outlet />
      </main>
    </div>
  );
}