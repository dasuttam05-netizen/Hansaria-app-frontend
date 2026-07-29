import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaBuilding, FaBoxes, FaBoxOpen, FaFileAlt, FaMapMarkerAlt, FaTruck, FaUserFriends, FaWarehouse } from "react-icons/fa";

const modules = [
  { label: "Employee", to: "/employees", icon: FaUserFriends },
  { label: "Company", to: "/companies", icon: FaBuilding },
  { label: "Company Account", to: "/company-accounts", icon: FaBuilding },
  { label: "Location", to: "/locations", icon: FaMapMarkerAlt },
  { label: "Warehouse", to: "/warehouses", icon: FaWarehouse },
  { label: "Products", to: "/products", icon: FaBoxOpen },
  { label: "Entry", to: "/inward", icon: FaFileAlt },
  { label: "Names", to: "/buyer-names", icon: FaUserFriends },
  { label: "Transport", to: "/transport-management", icon: FaTruck },
];

export default function MasterModuleSidebar() {
  const location = useLocation();

  return (
    <aside style={sidebarStyle}>
      <div style={brandStyle}>
        <div style={brandTitle}>Master Menu</div>
        <div style={brandSubTitle}>Open the module you need</div>
      </div>
      <nav style={navStyle}>
        {modules.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              style={{
                ...linkStyle,
                ...(active ? activeLinkStyle : null),
              }}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

const sidebarStyle = {
  width: 260,
  minWidth: 260,
  padding: 18,
  background: "linear-gradient(180deg, #122232 0%, #0f172a 100%)",
  color: "#fff",
  borderRadius: 16,
  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
  position: "sticky",
  top: 16,
  alignSelf: "flex-start",
};

const brandStyle = {
  paddingBottom: 14,
  marginBottom: 14,
  borderBottom: "1px solid rgba(255,255,255,0.12)",
};

const brandTitle = { fontSize: 18, fontWeight: 800, letterSpacing: 0.2 };
const brandSubTitle = { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 6 };
const navStyle = { display: "grid", gap: 8 };
const linkStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 12px",
  borderRadius: 12,
  color: "rgba(255,255,255,0.88)",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
  transition: "background 0.2s ease, transform 0.2s ease",
};
const activeLinkStyle = {
  background: "rgba(255,255,255,0.14)",
  color: "#fff",
  transform: "translateX(2px)",
};
