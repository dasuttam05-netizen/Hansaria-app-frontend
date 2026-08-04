import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { hasAnyPermission, hasPermission, saveSession } from "../utils/auth";
import { getApiUrl } from "../utils/api";
import logo from "./logo.png";
import heroBg from "../assets/login-corn-jute-warehouse.png";

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

const prefetchCommonModules = () => {
  if (typeof window === "undefined") return;
  const loaders = [
    () => import("./DashboardPage"),
    () => import("./WarehouseTradingPage"),
    () => import("./InwardPage"),
    () => import("./OutwardPage"),
    () => import("./LocationManagementPage"),
  ];

  loaders.forEach((loader) => {
    loader().catch(() => {});
  });
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("idle") === "1") {
      setError("You were automatically logged out after 1 hour of inactivity. Please log in again.");
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const res = await axios.post(getApiUrl("/auth/login"), {
        username,
        password,
      });

      const savedUser = saveSession(res.data.token, res.data.user);
      if (typeof window !== "undefined") {
        window.setTimeout(prefetchCommonModules, 0);
      }
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
              <div style={eyebrowStyle}>Warehouse Management System</div>
              <div style={brandNameStyle}>Hansaria Food Warehouse</div>
            </div>
          </div>

          <h1 style={titleStyle}>
            Smart <span style={accentTextStyle}>Stock</span>
            <br />
            Management System
          </h1>

          <p style={introStyle}>
            Keep corn stock, jute bag inventory, expenses, parties, cash books, and reports organized in one secure workspace.
          </p>

          <div style={featureListStyle}>
            {[
              ["ST", "Stock Maintain", "Inward, outward, party stock, and warehouse movement."],
              ["EX", "Expense Approval", "HO/BM approval, palti lorry, self loading, and local sale."],
              ["RP", "Real-time Reports", "Ledger, rent, settlement, ERP, transport, and activity logs."],
              ["SC", "Secure Access", "Admin, HO, BM, and employee permissions with location control."],
            ].map(([code, label, text]) => (
              <div key={label} style={featureItemStyle}>
                <div style={featureBadgeStyle}>{code}</div>
                <div>
                  <div style={featureTitleStyle}>{label}</div>
                  <div style={featureTextStyle}>{text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={loginPanelStyle} className="login-form-panel">
          <div style={formCardStyle}>
            <div style={cardIconStyle}>
              <div style={cardLogoStyle} aria-label="Hansaria Food Warehouse">
                HF
              </div>
            </div>
            <div style={formHeaderStyle}>
              <h2 style={formTitleStyle}>Welcome Back!</h2>
              <p style={formTextStyle}>Sign in to continue to your account</p>
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
                <div style={passwordFieldWrapStyle}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ ...inputStyle, paddingRight: 90 }}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={toggleButtonStyle}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </label>

              {error ? <div style={errorStyle}>{error}</div> : null}

              <button type="submit" disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.72 : 1 }}>
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <div style={poweredStyle}>
              <span style={poweredLineStyle} />
              <span>Powered by Hansaria Food Warehouse System</span>
              <span style={poweredLineStyle} />
            </div>
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
  backgroundImage: `linear-gradient(90deg, rgba(2, 20, 32, 0.88) 0%, rgba(2, 20, 32, 0.72) 47%, rgba(2, 20, 32, 0.34) 100%), url(${heroBg})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  fontFamily: "Segoe UI, Arial, sans-serif",
  color: "#0f172a",
};

const brandPanelStyle = {
  padding: "56px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  background: "transparent",
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
  width: 58,
  height: 58,
  borderRadius: 14,
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
  fontSize: 13,
  fontWeight: 800,
  color: "#a7f3d0",
  textTransform: "uppercase",
};

const brandNameStyle = {
  fontSize: 22,
  fontWeight: 900,
  color: "#ffffff",
  marginTop: 3,
};

const titleStyle = {
  margin: "22px 0 0",
  fontSize: 52,
  lineHeight: 1.05,
  letterSpacing: 0,
};

const accentTextStyle = {
  color: "#f6c343",
};

const introStyle = {
  maxWidth: 700,
  fontSize: 18,
  lineHeight: 1.65,
  color: "#e6fffb",
  margin: "20px 0 32px",
};

const featureListStyle = {
  display: "grid",
  gap: 14,
  maxWidth: 560,
};

const featureItemStyle = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  padding: 0,
  border: "none",
  background: "transparent",
  borderRadius: 8,
};

const featureBadgeStyle = {
  width: 38,
  height: 38,
  borderRadius: 8,
  background: "rgba(15, 118, 110, 0.88)",
  color: "#ffffff",
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
  alignItems: "center",
  padding: "48px 56px 48px 20px",
  background: "transparent",
};

const formCardStyle = {
  width: "100%",
  maxWidth: 430,
  padding: "38px 34px",
  borderRadius: 22,
  border: "1px solid rgba(219, 229, 239, 0.95)",
  background: "rgba(255, 255, 255, 0.96)",
  boxShadow: "0 26px 70px rgba(2, 20, 32, 0.28)",
};

const formHeaderStyle = {
  textAlign: "center",
  marginBottom: 26,
};

const cardIconStyle = {
  width: 82,
  height: 82,
  borderRadius: "50%",
  background: "linear-gradient(145deg, #07345e 0%, #0f766e 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 18px",
  boxShadow: "0 16px 30px rgba(11, 53, 93, 0.24), inset 0 0 0 6px rgba(255, 255, 255, 0.12)",
};

const cardLogoStyle = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  border: "1px solid rgba(255, 255, 255, 0.28)",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 23,
  fontWeight: 950,
  letterSpacing: 0,
  background: "rgba(255, 255, 255, 0.08)",
};

const formTitleStyle = {
  margin: "0 0 8px",
  fontSize: 28,
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

const passwordFieldWrapStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
};

const toggleButtonStyle = {
  position: "absolute",
  right: 10,
  top: "50%",
  transform: "translateY(-50%)",
  border: "none",
  background: "transparent",
  color: "#0f766e",
  fontWeight: 700,
  cursor: "pointer",
  padding: "4px 8px",
  fontSize: 13,
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

const poweredStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  color: "#475569",
  fontSize: 12,
  fontWeight: 750,
  marginTop: 24,
  textAlign: "center",
};

const poweredLineStyle = {
  height: 1,
  background: "#e2e8f0",
  flex: 1,
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
      padding: 22px !important;
    }
  }
`;
