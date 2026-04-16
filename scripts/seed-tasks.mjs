// Seed all tasks from the 3 brand dashboards into Supabase with auto-assignment.
// Run: node scripts/seed-tasks.mjs

const SUPA_URL = 'https://uyxfyywjhblnivihnsxq.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5eGZ5eXdqaGJsbml2aWhuc3hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTkyMzAsImV4cCI6MjA5MTU3NTIzMH0.1qVymlD2iqJCx5JX8HnN5G2tj2naDlptv7cMNIwxtIk';

// ─────────── TEAM MATCHER ───────────
const TEAM = [
  {
    short: 'Lucas',
    skills: {
      website: 10, webapp: 10, app: 7, dashboard: 10, code: 10,
      development: 10, developer: 10, ontwikkelen: 9, ontwikkeling: 9,
      frontend: 10, backend: 9, fullstack: 10, api: 9, database: 8,
      supabase: 10, react: 10, javascript: 10, html: 9, css: 9,
      shopify: 9, integratie: 8, automation: 9, automatisering: 9, automatiseren: 9,
      tooling: 10, tool: 8, systeem: 7, technisch: 9, bug: 10, fix: 8,
      landingspagina: 9, formulier: 7, checkout: 7, 'e-commerce': 7,
      ui: 9, ux: 9, interface: 9, webshop: 9, tracking: 8,
      design: 6, ontwerp: 6, mockup: 7, prototype: 8, figma: 9,
      branding: 4, brand: 3, logo: 4, huisstijl: 4,
    },
  },
  {
    short: 'Raymond',
    skills: {
      strategie: 10, strategisch: 10, merkstrategie: 10, positionering: 10,
      richting: 8, visie: 9, merk: 9, brand: 7, branding: 9,
      concept: 9, conceptueel: 9, creatief: 9, creative: 9, creatieve: 9,
      campagne: 9, campaign: 9, storytelling: 9, narratief: 9,
      identiteit: 10, huisstijl: 9, logo: 8, visueel: 9, visuele: 9,
      moodboard: 9, 'art direction': 10, artdirection: 10, specification: 7,
      kleur: 7, kleuren: 7, typografie: 8, illustratie: 7, fotografie: 6,
      design: 9, ontwerp: 9, grafisch: 9, pantone: 9, verpakking: 6,
      tender: 8, tendercards: 8, 'tender cards': 8, cards: 5,
    },
  },
  {
    short: 'Shihab',
    skills: {
      sales: 10, verkoop: 10, klant: 10, klanten: 10, klantcontact: 10,
      lead: 9, leads: 9, conversie: 8, deal: 9, offerte: 9, quote: 8, quotes: 8,
      relatie: 9, relaties: 9, b2b: 9, outreach: 9,
      acquisitie: 10, pitch: 8, presentatie: 7, meeting: 7, afspraak: 7,
      productie: 10, produceren: 10, fulfillment: 10, verzending: 10,
      logistiek: 10, voorraad: 10, inventory: 10, leverancier: 10, leveranciers: 10,
      supplier: 10, inkoop: 9, bestelling: 9, bestellen: 9, order: 8, orders: 8,
      verpakking: 9, packaging: 9, shipping: 10, alibaba: 10,
      operations: 10, operationeel: 10, proces: 8, processen: 8, workflow: 7,
      qc: 9, inspectie: 9, qima: 10, sample: 8, samples: 8,
      pilot: 8, mkb: 9, benader: 9, benaderen: 9,
    },
  },
];

function score(text) {
  const lower = text.toLowerCase();
  return TEAM.map((m) => {
    let pts = 0;
    const matched = [];
    Object.entries(m.skills).forEach(([kw, w]) => {
      const rx = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
      if (rx.test(lower)) { pts += w; matched.push(kw); }
    });
    return { short: m.short, score: pts, matched };
  }).sort((a, b) => b.score - a.score);
}

function assign(text) {
  const ranked = score(text);
  const total = ranked.reduce((s, m) => s + m.score, 0);
  if (total === 0) return { assigned_to: 'Gezamenlijk', reason: 'Geen specifieke skill-match' };
  const [first, second] = ranked;
  const topShare = first.score / total;
  if (topShare < 0.55 && second && second.score >= 5) {
    return {
      assigned_to: `${first.short} + ${second.short}`,
      reason: `${first.short}: ${first.matched.slice(0, 2).join(', ')} · ${second.short}: ${second.matched.slice(0, 2).join(', ')}`,
    };
  }
  return { assigned_to: first.short, reason: first.matched.slice(0, 3).join(', ') || 'Beste algemene match' };
}

function slug(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

// ─────────── ALL TASKS (extracted from dashboards) ───────────
const TASKS = [
  // ═══ FAITHDRIVE — CHECKLIST ═══
  { brand: 'faithdrive', source: 'checklist', title: 'Product Specification Sheet opstellen', description: 'Materiaal, kleuren (Pantone), afmetingen, borduurdichtheid' },
  { brand: 'faithdrive', source: 'checklist', title: 'Arabische tekst laten verifiëren', description: 'Door native speaker of islamitisch geleerde' },
  { brand: 'faithdrive', source: 'checklist', title: '3 leveranciers vergelijken op Alibaba', description: 'Min. verified, 4.8+ rating, ervaring met borduurwerk' },
  { brand: 'faithdrive', source: 'checklist', title: '3 fysieke samples bestellen', description: "Nooit alleen op foto's goedkeuren" },
  { brand: 'faithdrive', source: 'checklist', title: 'Sample goedgekeurd en schriftelijk vastgelegd', description: 'Contract met leverancier met exacte specificaties' },
  { brand: 'faithdrive', source: 'checklist', title: 'Eerste order geplaatst (100–150 stuks)', description: 'Klein starten, markt testen' },
  { brand: 'faithdrive', source: 'checklist', title: 'QC inspectie geboekt (QIMA/AsiaInspection)', description: 'Vóór verzending, max 2.5% defecten AQL' },
  { brand: 'faithdrive', source: 'checklist', title: 'Verpakking ontworpen (matte zwarte doos)', description: 'Met goudfolie logo, inlegkaart, tissue paper' },
  { brand: 'faithdrive', source: 'checklist', title: 'Freight forwarder geregeld', description: 'Shypple, Flexport of vergelijkbaar — DDP optie' },
  { brand: 'faithdrive', source: 'checklist', title: 'Importbelasting en BTW ingecalculeerd', description: '~21% BTW + eventuele invoerrechten' },
  { brand: 'faithdrive', source: 'checklist', title: 'KvK inschrijving geregeld', description: '' },
  { brand: 'faithdrive', source: 'checklist', title: 'Webshop / betaallink ingericht', description: 'Shopify, WooCommerce of Stripe direct' },
  { brand: 'faithdrive', source: 'checklist', title: 'Instagram account aangemaakt (@faithdrive.nl)', description: '' },
  { brand: 'faithdrive', source: 'checklist', title: 'TikTok account aangemaakt', description: '' },
  { brand: 'faithdrive', source: 'checklist', title: 'Unboxing video opgenomen van sample', description: 'Dit is je eerste content stuk — doe het goed' },

  // ═══ FAITHDRIVE — STAPPENPLAN ═══
  { brand: 'faithdrive', source: 'stappenplan', title: 'Product Specification Sheet', description: 'Leg alles schriftelijk vast: materiaalsoort, dikte fluweel, Pantone kleurcode, borduurdichtheid, afmetingen, stikselvolgorde en verpakkingsvereisten. Dit is het contract met je leverancier.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Arabische tekst 100% verifiëren', description: 'Laat de tekst controleren door een native Arabic speaker of een vertrouwde islamitisch geleerde — niet door Google Translate.' },
  { brand: 'faithdrive', source: 'stappenplan', title: '3 fysieke samples bestellen', description: 'Altijd meerdere samples aanvragen, ook bij dezelfde leverancier. Voel het materiaal, controleer de borduurdichtheid, trek aan de naden.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Zoeken op Alibaba of 1688.com', description: 'Zoekterm: seat belt cover embroidery. Filter op: Verified Supplier, Trade Assurance, min. 4.8 ster, actief 3+ jaar.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Minimaal 3 leveranciers vergelijken', description: 'Vraag elk dezelfde specificaties aan. Vergelijk prijs, MOQ, levertijd, sampletijd en communicatiesnelheid.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Begin klein: 100–150 stuks', description: 'Eerste order klein houden. Test de markt, verzamel reviews, optimaliseer je product — schaal daarna pas op.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Third-party QC inspectie boeken', description: 'Gebruik QIMA of Bureau Veritas voor een inspectie vóór verzending. Kost ~€200–300.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'AQL instellen op 2.5%', description: 'AQL van 2.5% = max 2.5% defecten in de batch. Leg dit vast in je contract.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Matte zwarte geschenkdoos met goudfolie', description: 'Het product zit in een auto — mensen kopen het ook als cadeau voor Eid, geboorte, afstuderen. Een mooie doos rechtvaardigt een prijs van €29–35.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Inlegkaartje met betekenis', description: 'Een kaartje met de betekenis van de Arabische tekst in het Nederlands én Arabisch. Dit maakt het persoonlijk.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Unboxing = je marketing', description: 'Mensen filmen unboxings. Zorg dat het de moeite waard is: tissue paper, subtiele geur, lint. Levert gratis TikTok/Instagram content op.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Eerste orders via Air Freight', description: 'Voor 100–500 stuks: luchtvrachtvervoer via een freight forwarder zoals Shypple.nl. Duurt 7–14 dagen, regelt ook douane.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Kies DDP (Delivered Duty Paid)', description: 'DDP = leverancier of forwarder regelt alles inclusief douane en importbelasting. Geen verrassingen bij aankomst.' },
  { brand: 'faithdrive', source: 'stappenplan', title: 'Kostprijsberekening per stuk', description: 'Inkoop China: €3–5 · Verpakking: €1–2 · Shipping + douane: €1–2 · Totale kostprijs: ~€6–9. Verkoopprijs: €25–35.' },

  // ═══ TENDERCARDS — CHECKLIST ═══
  { brand: 'tendercards', source: 'checklist', title: '3 kaartcollecties ontwerpen', description: 'Verbinding (vroeg verzuim), Herstel (langdurig), Terugkeer (re-integratie)' },
  { brand: 'tendercards', source: 'checklist', title: 'Teksten laten reviewen door HR-professional', description: 'Toon, empathie en juridische correctheid checken' },
  { brand: 'tendercards', source: 'checklist', title: 'Drukproef bestellen', description: 'Papier kwaliteit, kleuren en afwerking beoordelen' },
  { brand: 'tendercards', source: 'checklist', title: 'Verpakking ontwerpen', description: 'Premium doos, envelop, inlegkaart met instructies' },
  { brand: 'tendercards', source: 'checklist', title: 'Handleiding schrijven', description: 'Hoe HR-teams de kaarten effectief inzetten bij verzuim' },
  { brand: 'tendercards', source: 'checklist', title: 'KvK inschrijving geregeld', description: '' },
  { brand: 'tendercards', source: 'checklist', title: 'Stripe/Mollie betaalintegratie', description: 'Koppeling met abonnementssysteem' },
  { brand: 'tendercards', source: 'checklist', title: 'Abonnementssysteem opzetten', description: 'Kwartaalabonnementen Essentials & Pro' },
  { brand: 'tendercards', source: 'checklist', title: 'Fulfillment proces inrichten', description: 'Drukwerk, verpakking, verzending workflow' },
  { brand: 'tendercards', source: 'checklist', title: 'Eerste 3 pilot klanten binnenhalen', description: 'HR-directeuren uit netwerk benaderen' },
  { brand: 'tendercards', source: 'checklist', title: 'LinkedIn bedrijfspagina aanmaken', description: 'Tender Cards profiel met branding en beschrijving' },
  { brand: 'tendercards', source: 'checklist', title: 'Case study schrijven van pilot klant', description: 'Resultaten, quotes en concrete impact op verzuim' },
  { brand: 'tendercards', source: 'checklist', title: 'Website copy schrijven', description: 'tendercards.nl — landingspagina met demo aanvraag' },
  { brand: 'tendercards', source: 'checklist', title: 'Demo aanvraagformulier opzetten', description: 'Leadgeneratie via website en LinkedIn' },

  // ═══ TENDERCARDS — STAPPENPLAN ═══
  { brand: 'tendercards', source: 'stappenplan', title: 'Specificaties kaarten bepalen', description: 'Leg alles vast: formaat, papiersoort (300gr+ gerecycled), afwerking, hoekafronding, kleurprofiel (CMYK).' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Papier kwaliteit selecteren', description: 'Kies duurzaam, FSC-gecertificeerd papier. De kaart moet stevig aanvoelen, professioneel ogen.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Drukwerk proefdruk bestellen', description: 'Bestel bij minimaal 2 drukkerijen een proefdruk. Beoordeel kleurechtheid, papiergevoel, leesgraad.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Vergelijk 3 drukkerijen in Nederland', description: 'Zoek drukkerijen met ervaring in premium kaartwerk. Vergelijk prijs, minimale oplage, levertijd.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Let op schaalvoordeel', description: 'Vraag prijzen op voor 250, 500 en 1000 sets. Het verschil per stuk kan significant zijn.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Benader HR-directeuren uit je netwerk', description: 'Start met 3-5 organisaties die je persoonlijk kent. Bied een gratis pilot van 3 maanden aan.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Focus op zorg en onderwijs', description: 'Deze sectoren hebben het hoogste verzuim (6.8% zorg, 6.2% onderwijs).' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Verzamel resultaten en quotes', description: 'Meet het effect: worden kaarten daadwerkelijk gebruikt? Daalt het verzuim? Deze data is goud voor je sales pitch.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Premium doos ontwerpen', description: 'Een stevige, matte doos met het Tender Cards logo. De verpakking communiceert professionaliteit.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Envelop en inlegkaart toevoegen', description: 'Een inlegkaart met gebruiksinstructies: wanneer welke kaart inzetten, tips voor het gesprek, QR-code naar online handleiding.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Fulfillment workflow opzetten', description: 'Automatiseer zoveel mogelijk: bestelling binnenkomt, drukwerk wordt getriggerd, verpakking en verzending.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'tendercards.nl lanceren', description: 'Eenvoudige, professionele landingspagina met uitleg over de collecties, pricing, demo aanvraagformulier en testimonials.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Stripe abonnementen instellen', description: 'Essentials (€149/kw) en Pro (€349/kw) als terugkerende betalingen. Voeg een optie toe voor Maatwerk met offerte-aanvraag.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Essentials — €149 per kwartaal', description: '25 kaarten uit 1 collectie naar keuze. Ideaal voor kleinere organisaties.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Pro — €349 per kwartaal', description: '75 kaarten uit alle 3 collecties. Voor grotere organisaties. Inclusief handleiding en support.' },
  { brand: 'tendercards', source: 'stappenplan', title: 'Maatwerk — custom pricing', description: 'Op maat gemaakte kaarten met eigen logo, teksten of specifieke themas. Offerte op aanvraag.' },

  // ═══ ELEV8 — Q2 / Q3 PRIORITEITEN ═══
  { brand: 'elev8', source: 'stappenplan', title: 'FaithDrive: Eerste sample bestellen', description: 'Zoek leveranciers op Alibaba, bestel 3 samples, laat Arabische tekst verifiëren. Eerste fysieke product in handen krijgen.' },
  { brand: 'elev8', source: 'stappenplan', title: 'Tender Cards: Eerste pilot starten', description: 'Benader 3–5 MKB-bedrijven voor een gratis pilotprogramma. Verzamel feedback en optimaliseer het product.' },
  { brand: 'elev8', source: 'stappenplan', title: 'Scale marketing', description: 'Beide merken actief promoten via social media, influencer partnerships en gerichte advertenties. Content strategie per merk uitrollen.' },
  { brand: 'elev8', source: 'stappenplan', title: 'Optimize operations', description: 'Supply chain optimaliseren voor FaithDrive, abonnementsmodel fine-tunen voor Tender Cards. Processen documenteren en automatiseren.' },
];

// ─────────── UPSERT ───────────
async function main() {
  const payload = TASKS.map((t) => {
    const { assigned_to, reason } = assign(t.title + ' ' + (t.description || ''));
    return {
      brand: t.brand,
      source: t.source,
      task_key: slug(t.title),
      title: t.title,
      description: t.description || null,
      assigned_to,
      assigned_reason: reason,
    };
  });

  console.log(`Upserting ${payload.length} tasks...`);

  const res = await fetch(`${SUPA_URL}/rest/v1/tasks?on_conflict=brand,source,task_key`, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error('Upsert failed:', res.status, await res.text());
    process.exit(1);
  }

  const inserted = await res.json();
  console.log(`✓ ${inserted.length} tasks upserted.`);

  // Summary per person
  const counts = {};
  payload.forEach((t) => {
    counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1;
  });
  console.log('\n── Task distribution ──');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([who, n]) => {
    console.log(`  ${who}: ${n}`);
  });

  // Lucas' tasks
  console.log('\n── Lucas will see these on /mijn-taken ──');
  payload
    .filter((t) => (t.assigned_to || '').includes('Lucas'))
    .forEach((t) => console.log(`  [${t.brand}/${t.source}] ${t.title}  →  ${t.assigned_to}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
