import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { hasAnyPermission, hasPermission, saveSession } from "../utils/auth";
import logo from "./logo.png";

function resolveLandingPath(user) {
  if (hasPermission(user, "dashboard.view")) return "/dashboard";

  if (
    hasAnyPermission(user, [
      "expense.entry",
      "expense.view",
      "expense.create",
      "expense.edit",
      "expense.delete",
    ])
  ) {
    return "/expenses";
  }

  if (
    hasAnyPermission(user, [
      "inward.view",
      "inward.create",
      "inward.edit",
      "inward.delete",
    ])
  ) {
    return "/inward";
  }

  if (
    hasAnyPermission(user, [
      "outward.view",
      "outward.create",
      "outward.edit",
      "outward.delete",
    ])
  ) {
    return "/outward";
  }

  if (hasPermission(user, "report.inward")) return "/inward-report";

  return "/dashboard";
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await axios.post("https://hansaria-app-backend.onrender.com/auth/login", {
        username,
        password,
      });

      const savedUser = saveSession(res.data.token, res.data.user);
      navigate(resolveLandingPath(savedUser));
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{responsiveCss}</style>
      <main style={pageStyle}>
        <section style={brandPanelStyle} className="login-brand-panel">
          <div style={brandTopStyle}>
            <div style={logoWrapStyle}>
              <img src={logo} alt="Hansaria" style={logoStyle} />
            </div>
            <div>
              <div style={eyebrowStyle}>Hansaria Stock Management</div>
              <h1 style={titleStyle}>Warehouse Operations</h1>
            </div>
          </div>

          <p style={introStyle}>
            Track stock movement, expenses, parties, warehouses, and reports from one secure workspace.
          </p>

          <div style={featureGridStyle}>
            {[
              ["Stock", "Inward, outward, party stock, and warehouse movement."],
              ["Expense", "Entry, approval, palti lorry, self loading, and local sale."],
              ["Parties", "Manage company accounts, parties, consignees, and buyers."],
              ["Reports", "Ledger, rent, settlement, ERP, transport, and activity logs."],
            ].map(([label, text]) => (
              <div key={label} style={featureItemStyle}>
                <div style={featureBadgeStyle}>{label.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div style={featureTitleStyle}>{label}</div>
                  <div style={featureTextStyle}>{text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={loginPanelStyle} className="login-form-panel">
          <div style={mobileLogoStyle} className="login-mobile-logo">
            <img src={logo} alt="Hansaria" style={mobileLogoImageStyle} />
          </div>
          <div style={formCardStyle}>
            <div style={formHeaderStyle}>
              <div style={formKickerStyle}>Secure Login</div>
              <h2 style={formTitleStyle}>Sign in to continue</h2>
              <p style={formTextStyle}>Use your admin, HO, BM, or employee credentials.</p>
            </div>

            <form onSubmit={handleLogin} style={formStyle}>
              <label style={labelStyle}>
                Username
                <input
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={inputStyle}
                  autoComplete="username"
                  required
                />
              </label>

              <label style={labelStyle}>
                Password
                <input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  autoComplete="current-password"
                  required
                />
              </label>

              {error ? <div style={errorStyle}>{error}</div> : null}

              <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.72 : 1 }}>
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}

const pageStyle = {
  minHeight: "100vh",
  display: "grid",
  gridTemplateColumns: "minmax(360px, 1.08fr) minmax(340px, 0.92fr)",
  background: "linear-gradient(160deg, #eef3f7 0%, #dde8f2 100%)",
  fontFamily: "Segoe UI, Arial, sans-serif",
  color: "#0f172a",
};

const brandPanelStyle = {
  padding: "56px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  background: "linear-gradient(135deg, #0f766e 0%, #134e4a 58%, #172554 100%)",
  color: "#fff",
  minHeight: "100vh",
};

const brandTopStyle = {
  display: "flex",
  alignItems: "center",
  gap: 18,
  marginBottom: 28,
};

const logoWrapStyle = {
  width: 82,
  height: 82,
  borderRadius: 18,
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
  overflow: "hidden",
};

const logoStyle = {
  width: "100%",
  height: "100%",
  objectFit: "contain",
};

const eyebrowStyle = {
  fontSize: 14,
  fontWeight: 800,
  color: "#b6f3e8",
  textTransform: "uppercase",
};

const titleStyle = {
  margin: "4px 0 0",
  fontSize: 46,
  lineHeight: 1.05,
  letterSpacing: 0,
};

const introStyle = {
  maxWidth: 700,
  fontSize: 19,
  lineHeight: 1.65,
  color: "#e6fffb",
  margin: "0 0 34px",
};

const featureGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
  gap: 14,
  maxWidth: 760,
};

const featureItemStyle = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: 16,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.09)",
  borderRadius: 8,
};

const featureBadgeStyle = {
  width: 38,
  height: 38,
  borderRadius: 8,
  background: "#ffffff",
  color: "#0f766e",
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "0 0 auto",
};

const featureTitleStyle = {
  fontWeight: 850,
  fontSize: 15,
  marginBottom: 4,
};

const featureTextStyle = {
  color: "#d9fbf5",
  fontSize: 13,
  lineHeight: 1.45,
};

const loginPanelStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  padding: "48px",
  background: "rgba(248, 250, 252, 0.82)",
  backdropFilter: "blur(4px)",
};

const formCardStyle = {
  width: "100%",
  maxWidth: 470,
  padding: "34px",
  borderRadius: 18,
  border: "1px solid #dbe5ef",
  background: "#ffffff",
  boxShadow: "0 24px 50px rgba(15, 23, 42, 0.12)",
};

const mobileLogoStyle = {
  display: "none",
};

const mobileLogoImageStyle = {
  width: 70,
  height: 70,
  objectFit: "contain",
};

const formHeaderStyle = {
  marginBottom: 26,
};

const formKickerStyle = {
  color: "#0f766e",
  fontWeight: 850,
  fontSize: 13,
  textTransform: "uppercase",
};

const formTitleStyle = {
  margin: "6px 0 6px",
  fontSize: 34,
  lineHeight: 1.15,
  letterSpacing: 0,
};

const formTextStyle = {
  margin: 0,
  color: "#64748b",
  fontSize: 15,
};

const formStyle = {
  display: "grid",
  gap: 16,
  width: "100%",
  maxWidth: 430,
};

const labelStyle = {
  display: "grid",
  gap: 7,
  fontSize: 13,
  fontWeight: 800,
  color: "#334155",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "13px 14px",
  fontSize: 15,
  outline: "none",
  background: "#fff",
};

const errorStyle = {
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#b91c1c",
  padding: "11px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
};

const buttonStyle = {
  border: "none",
  borderRadius: 8,
  background: "#0f766e",
  color: "#fff",
  padding: "13px 16px",
  fontSize: 15,
  fontWeight: 850,
  cursor: "pointer",
  boxShadow: "0 14px 28px rgba(15, 118, 110, 0.24)",
};

const responsiveCss = `
  @media (max-width: 1024px) {
    .login-brand-panel {
      min-height: auto !important;
      padding: 38px !important;
    }
    .login-form-panel {
      min-height: auto !important;
      padding: 32px !important;
    }
  }

  @media (max-width: 860px) {
    main {
      grid-template-columns: 1fr !important;
    }
    .login-brand-panel {
      display: none !important;
    }
    .login-form-panel {
      min-height: 100vh !important;
      justify-content: center !important;
      background: transparent !important;
      backdrop-filter: none !important;
      padding: 22px !important;
    }
    .login-mobile-logo {
      display: block !important;
      margin-bottom: 14px !important;
    }
  }
`;
