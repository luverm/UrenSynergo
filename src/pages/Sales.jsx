import { useState } from "react";

const PROJECTS = [
  {
    id: "faithdrive",
    name: "FaithDrive",
    sub: "AmaanCover",
    description: "Premium gordelhoezen met Arabische kalligrafie",
    color: "#C4963D",
    revenue: 0,
    target: 2400,
    customers: 0,
    status: "Pre-launch",
    margin: "€24/stuk",
    price: "€29",
    dashboardUrl: null,
  },
  {
    id: "tendercards",
    name: "Tender Cards",
    sub: "Verzuimpreventie",
    description: "Premium steunkaarten voor HR & verzuimbegeleiding",
    color: "#2D6B4F",
    revenue: 0,
    target: 5960,
    customers: 0,
    status: "Pre-launch",
    margin: "~70%",
    price: "€149–349/kw",
    dashboardUrl: null,
  },
];

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ flex: 1, padding: "20px", background: "rgba(255,255,255,0.02)", borderLeft: `2px solid ${color || "#FF6B35"}`, minWidth: 140 }}>
      <div style={{ fontSize: 10, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 300, color: color || "#F5F3EE", fontFamily: "'Syne', sans-serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6E6E72", fontWeight: 300, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ProjectCard({ project, isSelected, onClick }) {
  const pct = project.target > 0 ? Math.min((project.revenue / project.target) * 100, 100) : 0;
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 16, padding: "18px 20px", borderRadius: 2, width: "100%",
      background: isSelected ? "rgba(255,107,53,0.06)" : "rgba(255,255,255,0.02)",
      border: isSelected ? "1px solid rgba(255,107,53,0.2)" : "1px solid rgba(255,255,255,0.04)",
      cursor: "pointer", transition: "all 0.25s ease", textAlign: "left",
      fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE",
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 2, background: `${project.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${project.color}30` }}>
        <div style={{ width: 12, height: 12, borderRadius: 99, background: project.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</span>
          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 99, background: `${project.color}18`, color: project.color, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{project.status}</span>
        </div>
        <div style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>{project.description}</div>
        <div style={{ marginTop: 8, height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: project.color, borderRadius: 99, transition: "width 0.6s ease" }} />
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 300, color: project.revenue > 0 ? project.color : "rgba(255,255,255,0.1)", fontFamily: "'Syne', sans-serif" }}>€{project.revenue.toLocaleString()}</div>
        <div style={{ fontSize: 11, color: "#6E6E72" }}>/ €{project.target.toLocaleString()} target</div>
      </div>
    </button>
  );
}

function ProjectDetail({ project }) {
  return (
    <div style={{ animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 10, height: 10, borderRadius: 99, background: project.color }} />
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "#F5F3EE" }}>{project.name}</span>
        <span style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>{project.sub}</span>
      </div>

      <div style={{ display: "flex", gap: 1, marginBottom: 24, flexWrap: "wrap" }}>
        <StatCard label="Omzet" value={`€${project.revenue.toLocaleString()}`} color={project.color} />
        <StatCard label="Klanten" value={project.customers} color={project.color} />
        <StatCard label="Prijs" value={project.price} sub={`Marge ${project.margin}`} color={project.color} />
        <StatCard label="Target" value={`€${project.target.toLocaleString()}`} sub="Eerste fase" color="rgba(255,107,53,0.3)" />
      </div>

      <div style={{ padding: 20, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ fontSize: 11, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Acties</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: 99, background: project.color, flexShrink: 0 }} />
            <span style={{ color: "#F5F3EE", fontWeight: 400 }}>Bekijk het volledige {project.name} dashboard</span>
          </div>
          <div style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300, paddingLeft: 16 }}>
            Ga naar <span style={{ color: project.color }}>/{project.id}/tool.html</span> voor het complete interne dashboard met checklist, stappenplan, marketing en verkoop.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const [selectedProject, setSelectedProject] = useState(null);

  const totalRevenue = PROJECTS.reduce((s, p) => s + p.revenue, 0);
  const totalTarget = PROJECTS.reduce((s, p) => s + p.target, 0);
  const totalCustomers = PROJECTS.reduce((s, p) => s + p.customers, 0);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F3EE", padding: "32px 24px", boxSizing: "border-box" }}>
      <style>{`
        @media (max-width: 600px) {
          .sales-stats { flex-direction: column !important; }
        }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/elev8-8-standalone.svg" alt="" style={{ width: 20, height: 26, opacity: 0.5 }} />
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Sales</div>
            </div>
          </div>
          <div style={{ width: 40, height: 1, background: "#FF6B35", margin: "12px 0", opacity: 0.3 }} />
          <p style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>Omzet en voortgang van alle ELEV8 merken</p>
        </div>

        {/* Total stats */}
        <div className="sales-stats" style={{ display: "flex", gap: 1, marginBottom: 28, animation: "fadeUp 0.6s 0.1s cubic-bezier(.22,1,.36,1) both" }}>
          <StatCard label="Totale omzet" value={`€${totalRevenue.toLocaleString()}`} color="#FF6B35" />
          <StatCard label="Totaal klanten" value={totalCustomers} />
          <StatCard label="Actieve merken" value={PROJECTS.length} sub={`${PROJECTS.filter(p => p.status !== "Pre-launch").length} live`} />
          <StatCard label="Totaal target" value={`€${totalTarget.toLocaleString()}`} sub="Eerste fase" color="rgba(255,107,53,0.3)" />
        </div>

        {/* Projects */}
        <div style={{ animation: "fadeUp 0.6s 0.15s cubic-bezier(.22,1,.36,1) both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 12, height: 1, background: "#FF6B35" }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: "#6E6E72", textTransform: "uppercase", letterSpacing: 1.5 }}>Merken</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {PROJECTS.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isSelected={selectedProject?.id === project.id}
                onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
              />
            ))}
          </div>
        </div>

        {/* Selected project detail */}
        {selectedProject && (
          <div style={{ marginTop: 28 }}>
            <ProjectDetail project={selectedProject} />
          </div>
        )}

        {/* Revenue chart placeholder */}
        <div style={{ marginTop: 28, padding: 24, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", textAlign: "center", animation: "fadeUp 0.6s 0.2s cubic-bezier(.22,1,.36,1) both" }}>
          <div style={{ fontSize: 11, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Omzet over tijd</div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 6, height: 120 }}>
            {["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun"].map((month, i) => (
              <div key={month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: 32, height: Math.max(4, (i + 1) * 2), borderRadius: "2px 2px 0 0", background: i < 4 ? "rgba(255,255,255,0.04)" : "rgba(255,107,53,0.15)", transition: "height 0.3s" }} />
                <span style={{ fontSize: 10, color: "#6E6E72" }}>{month}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", marginTop: 12 }}>Data verschijnt zodra de eerste verkopen binnenkomen</div>
        </div>
      </div>
    </div>
  );
}
