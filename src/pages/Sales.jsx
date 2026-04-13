import { useState } from "react";

const PROJECTS = [
  {
    id: "elev8",
    name: "ELEV8",
    sub: "Overzicht",
    description: "Totaaloverzicht van alle merken en omzet",
    color: "#FF6B35",
    status: "Actief",
    dashboardUrl: "/dashboard-elev8.html",
  },
  {
    id: "faithdrive",
    name: "FaithDrive",
    sub: "AmaanCover",
    description: "Premium gordelhoezen met Arabische kalligrafie",
    color: "#C4963D",
    status: "Pre-launch",
    dashboardUrl: "/dashboard-faithdrive.html",
  },
  {
    id: "tendercards",
    name: "Tender Cards",
    sub: "Verzuimpreventie",
    description: "Premium steunkaarten voor HR & verzuimbegeleiding",
    color: "#2D6B4F",
    status: "Pre-launch",
    dashboardUrl: "/dashboard-tendercards.html",
  },
];

export default function Sales() {
  const [selectedProject, setSelectedProject] = useState(null);

  if (selectedProject) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setSelectedProject(null)} style={{
            padding: "6px 14px", borderRadius: 2, border: "1px solid rgba(255,255,255,0.08)",
            background: "transparent", color: "#6E6E72", fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif", letterSpacing: 1, textTransform: "uppercase",
          }}>
            ← Sales
          </button>
          <div style={{ width: 8, height: 8, borderRadius: 99, background: selectedProject.color }} />
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>{selectedProject.name}</span>
          <span style={{ fontSize: 12, color: "#6E6E72", fontWeight: 300 }}>{selectedProject.sub}</span>
        </div>
        <iframe
          src={selectedProject.dashboardUrl}
          style={{ flex: 1, border: "none", width: "100%", background: "#0D0D0D" }}
          title={`${selectedProject.name} Dashboard`}
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/elev8-8-standalone.svg" alt="" style={{ width: 20, height: 26, opacity: 0.5 }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Sales</div>
          </div>
          <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0", opacity: 0.3 }} />
          <p style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>Klik op een merk om het volledige dashboard te openen</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          {PROJECTS.map((project) => (
            <button key={project.id} onClick={() => setSelectedProject(project)} style={{
              display: "flex", alignItems: "center", gap: 16, padding: "22px 24px", borderRadius: 2, width: "100%",
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
              cursor: "pointer", transition: "all 0.25s ease", textAlign: "left",
              fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${project.color}40`; e.currentTarget.style.background = `${project.color}08`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
            >
              <div style={{ width: 52, height: 52, borderRadius: 2, background: `${project.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${project.color}25` }}>
                <div style={{ width: 14, height: 14, borderRadius: 99, background: project.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{project.name}</span>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${project.color}18`, color: project.color, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{project.status}</span>
                </div>
                <div style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>{project.description}</div>
              </div>
              <div style={{ color: "#6E6E72", flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
