import { NavLink } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "10px 14px",
    borderRadius: "12px",
    background: isActive ? "rgba(124, 58, 237, 0.18)" : "transparent",
    border: isActive ? "1px solid rgba(124, 58, 237, 0.28)" : "1px solid transparent",
    color: isActive ? "#ffffff" : "#c4b5fd",
    fontWeight: 600,
  });

  return (
    <div className="app-shell">
      <div className="badge">Ethereum Sepolia Live MVP</div>

      <h1 className="hero-title" style={{ marginTop: 16 }}>
        nft-ticketing-dapp
      </h1>

      <nav className="navbar">
        <NavLink to="/" style={linkStyle}>
          Home
        </NavLink>
        <NavLink to="/organizer" style={linkStyle}>
          Organizer
        </NavLink>
        <NavLink to="/verify" style={linkStyle}>
          Verify
        </NavLink>
        <NavLink to="/my-tickets" style={linkStyle}>
          My Tickets
        </NavLink>
        <NavLink to="/marketplace" style={linkStyle}>
          Marketplace
        </NavLink>
      </nav>

      <div className="page-card">{children}</div>
    </div>
  );
}