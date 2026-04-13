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
    costPerUnit: "€5",
    costBreakdown: [
      { label: "Inkoop China", value: "€4.00" },
      { label: "Verpakking", value: "€1.50" },
      { label: "Shipping + customs", value: "€1.50" },
      { label: "NL bezorging", value: "€4.25" },
    ],
    totalCost: "€11.25",
    profitPerUnit: "€17.75",
    milestones: [
      { label: "Sample besteld", done: false },
      { label: "Sample goedgekeurd", done: false },
      { label: "Verpakking ontworpen", done: false },
      { label: "Productie order geplaatst", done: false },
      { label: "Website live", done: false },
    ],
    checklist: {
      "Productie": [
        "Product Specification Sheet opstellen",
        "Arabische tekst laten verifiëren",
        "3 leveranciers vergelijken op Alibaba",
        "3 fysieke samples bestellen",
        "Sample goedgekeurd en vastgelegd",
        "Eerste order geplaatst (100–150 stuks)",
        "QC inspectie geboekt",
      ],
      "Verpakking & Shipping": [
        "Verpakking ontworpen (matte zwarte doos)",
        "Freight forwarder geregeld",
        "Importbelasting en BTW ingecalculeerd",
        "KvK inschrijving geregeld",
        "Webshop / betaallink ingericht",
      ],
      "Marketing": [
        "Instagram account aangemaakt",
        "TikTok account aangemaakt",
        "Unboxing video opgenomen",
      ],
    },
    nextAction: "Bestel je eerste sample op Alibaba",
    bigMoment: "Eid al-Adha — 26 mei 2026",
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
    costPerUnit: "~€3/kaart",
    costBreakdown: [
      { label: "Drukwerk per kaart", value: "€1.50" },
      { label: "Verpakking", value: "€0.80" },
      { label: "Verzending NL", value: "€4.25" },
      { label: "Platform kosten", value: "€2.00" },
    ],
    totalCost: "~€8.55/zending",
    profitPerUnit: "~€140/kwartaal (Starter)",
    milestones: [
      { label: "Prototype kaarten ontworpen", done: false },
      { label: "Eerste pilot klant", done: false },
      { label: "Website live (tendercards.nl)", done: false },
      { label: "Betaalsysteem ingericht", done: false },
      { label: "Eerste 10 klanten", done: false },
    ],
    checklist: {
      "Product": [
        "3 kaartcollecties ontwerpen (Verbinding, Herstel, Terugkeer)",
        "Teksten laten reviewen door HR-professional",
        "Drukproef bestellen",
        "Verpakking ontwerpen",
        "Handleiding voor HR-teams schrijven",
      ],
      "Sales & Operations": [
        "KvK inschrijving geregeld",
        "Stripe/Mollie betalingen opgezet",
        "Abonnementssysteem ingericht",
        "Fulfillment proces vastgelegd",
        "Eerste 3 pilot klanten benaderen",
      ],
      "Marketing": [
        "LinkedIn bedrijfspagina aangemaakt",
        "Case study van pilot klant",
        "Website copy geschreven",
        "Demo aanvraagformulier live",
      ],
    },
    nextAction: "Eerste pilot klant binnenhalen uit je netwerk",
    bigMoment: "HR Dag Nederland — najaar 2026",
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2, flexWrap: "wrap" }}>
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
        <div style={{ fontSize: 11, color: "#6E6E72" }}>/ €{project.target.toLocaleString()}</div>
      </div>
    </button>
  );
}

function FullDashboard({ project }) {
  const [checkedItems, setCheckedItems] = useState({});
  const [activeTab, setActiveTab] = useState("overview");

  const toggleCheck = (key) => setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const totalChecklist = Object.values(project.checklist).flat().length;
  const doneCount = Object.values(project.checklist).flat().filter((item) => checkedItems[item]).length;
  const milestoneDone = project.milestones.filter((m) => m.done).length;
  const milestonePct = Math.round((milestoneDone / project.milestones.length) * 100);
  const c = project.color;

  const tabs = [
    { id: "overview", label: "Dashboard" },
    { id: "checklist", label: "Checklist" },
    { id: "verkoop", label: "Verkoop" },
  ];

  return (
    <div style={{ animation: "fadeUp 0.3s cubic-bezier(.22,1,.36,1) both" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <div style={{ width: 10, height: 10, borderRadius: 99, background: c }} />
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, color: "#F5F3EE" }}>{project.name}</span>
        <span style={{ fontSize: 13, color: "#6E6E72", fontWeight: 300 }}>{project.sub}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 0 }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: "10px 20px", borderRadius: "2px 2px 0 0", border: "none",
            background: activeTab === tab.id ? `${c}12` : "transparent",
            borderBottom: activeTab === tab.id ? `2px solid ${c}` : "2px solid transparent",
            color: activeTab === tab.id ? "#F5F3EE" : "#6E6E72",
            fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            transition: "all 0.15s",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "overview" && (
        <div>
          {/* Stats row */}
          <div style={{ display: "flex", gap: 1, marginBottom: 20, flexWrap: "wrap" }}>
            <StatCard label="Verkopen" value={project.customers} color={c} />
            <StatCard label="Omzet" value={`€${project.revenue.toLocaleString()}`} color={c} />
            <StatCard label="Prijs" value={project.price} sub={`Marge ${project.margin}`} color={c} />
            <StatCard label="Kostprijs" value={project.costPerUnit} color="rgba(255,255,255,0.15)" />
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {/* Launch progress */}
            <div style={{ flex: 1, minWidth: 280, padding: 20, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Lanceervoortgang</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6E6E72", marginBottom: 6 }}>
                <span>Fase 1</span><span>{milestonePct}%</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 16 }}>
                <div style={{ width: `${milestonePct}%`, height: "100%", background: `linear-gradient(90deg, ${c}, ${c}cc)`, borderRadius: 99, transition: "width 0.6s" }} />
              </div>
              {project.milestones.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#6E6E72", padding: "6px 0", borderBottom: i < project.milestones.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <span>{m.label}</span>
                  <span style={{ color: m.done ? c : "#6E6E72" }}>{m.done ? "✓" : "○"}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ padding: 20, borderRadius: 2, background: `${c}08`, border: `1px solid ${c}20` }}>
                <div style={{ fontSize: 10, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Volgende actie</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#F5F3EE" }}>{project.nextAction}</div>
              </div>
              <div style={{ padding: 20, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Eerste grote moment</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#F5F3EE" }}>{project.bigMoment}</div>
              </div>
              <div style={{ padding: 20, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ fontSize: 10, color: "#6E6E72", fontWeight: 500, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>Checklist voortgang</div>
                <div style={{ fontSize: 22, fontWeight: 300, color: c, fontFamily: "'Syne', sans-serif" }}>{doneCount}/{totalChecklist}</div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginTop: 8 }}>
                  <div style={{ width: `${totalChecklist > 0 ? (doneCount / totalChecklist) * 100 : 0}%`, height: "100%", background: c, borderRadius: 99, transition: "width 0.4s" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checklist Tab */}
      {activeTab === "checklist" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#6E6E72" }}>{doneCount} van {totalChecklist} taken afgerond</div>
            <div style={{ fontSize: 22, fontWeight: 300, color: c, fontFamily: "'Syne', sans-serif" }}>{totalChecklist > 0 ? Math.round((doneCount / totalChecklist) * 100) : 0}%</div>
          </div>
          <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ width: `${totalChecklist > 0 ? (doneCount / totalChecklist) * 100 : 0}%`, height: "100%", background: `linear-gradient(90deg, ${c}, ${c}cc)`, borderRadius: 99, transition: "width 0.4s" }} />
          </div>

          {Object.entries(project.checklist).map(([category, items]) => (
            <div key={category} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: c, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${c}25` }}>{category}</div>
              <div style={{ padding: "0 16px", borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                {items.map((item, i) => (
                  <div key={item} onClick={() => toggleCheck(item)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "12px 0", cursor: "pointer",
                    borderBottom: i < items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                      border: checkedItems[item] ? `2px solid ${c}` : "2px solid rgba(255,255,255,0.15)",
                      background: checkedItems[item] ? c : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {checkedItems[item] && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="#0E0E10" strokeWidth="2" strokeLinecap="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 14, color: checkedItems[item] ? "#6E6E72" : "#F5F3EE", textDecoration: checkedItems[item] ? "line-through" : "none", transition: "all 0.15s" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verkoop Tab */}
      {activeTab === "verkoop" && (
        <div>
          <div style={{ display: "flex", gap: 1, marginBottom: 24, flexWrap: "wrap" }}>
            <StatCard label="Totale omzet" value={`€${project.revenue}`} color={c} />
            <StatCard label="Aantal orders" value={project.customers} color={c} />
            <StatCard label="Gem. orderwaarde" value={project.revenue > 0 ? `€${Math.round(project.revenue / project.customers)}` : "—"} sub={`Target: ${project.price}`} />
            <StatCard label="Winst" value={`€${project.revenue > 0 ? Math.round(project.revenue * 0.6) : 0}`} color={project.revenue > 0 ? "#4CAF7D" : "rgba(255,255,255,0.1)"} />
          </div>

          {/* Cost calculator */}
          <div style={{ padding: 20, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 20 }}>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Kostprijsberekening</div>
            {project.costBreakdown.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#6E6E72", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span>{item.label}</span>
                <span style={{ color: "#F5F3EE", fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "10px 0", borderTop: "2px solid rgba(255,255,255,0.08)", marginTop: 4 }}>
              <span style={{ fontWeight: 600, color: "#F5F3EE" }}>Totale kostprijs</span>
              <span style={{ fontWeight: 600, color: "#F5F3EE" }}>{project.totalCost}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0" }}>
              <span style={{ color: "#6E6E72" }}>Verkoopprijs {project.price}</span>
              <span style={{ fontWeight: 600, color: "#4CAF7D" }}>Winst {project.profitPerUnit}</span>
            </div>
          </div>

          {/* Orders */}
          <div style={{ padding: 24, borderRadius: 2, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>📦</div>
            <div style={{ fontSize: 14, color: "#6E6E72" }}>Nog geen orders</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.15)", marginTop: 4 }}>Zodra je lanceert komen ze hier te staan</div>
          </div>
        </div>
      )}
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

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ animation: "fadeUp 0.6s cubic-bezier(.22,1,.36,1) both", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src="/elev8-8-standalone.svg" alt="" style={{ width: 20, height: 26, opacity: 0.5 }} />
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700, color: "#F5F3EE", letterSpacing: "-0.01em" }}>Sales</div>
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

        {/* Full project dashboard */}
        {selectedProject && (
          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <FullDashboard project={selectedProject} />
          </div>
        )}
      </div>
    </div>
  );
}
