import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { idea, category, brand } = await req.json();

    if (!idea) {
      return new Response(
        JSON.stringify({ error: "idea is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY niet ingesteld in Supabase secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const brandContext: Record<string, string> = {
      elev8: "ELEV8 is een holding/merkenhuis dat meerdere merken bouwt en schaalt (o.a. FaithDrive, Tender Cards).",
      faithdrive: "FaithDrive is een christelijk lifestyle/automotive merk dat auto-accessoires en lifestyle producten verkoopt met een faith-based insteek.",
      tendercards: "Tender Cards is een card-based product/service voor relatiegeschenken en persoonlijke boodschappen.",
    };

    const context = brandContext[brand] || "";

    const prompt = `Je bent een ervaren strategie- en businessconsultant voor creatieve merken.
${context}

Een medewerker heeft het volgende idee ingediend in de categorie "${category}":

"${idea}"

Werk dit idee uit in een heldere, concrete en praktische blueprint. Gebruik markdown-opmaak met de volgende secties:

## Kern van het idee
Beschrijf in 2-3 zinnen wat het idee inhoudt en waarom het waardevol kan zijn.

## Waarom dit werkt
3-4 bullets met onderbouwing (markt, doelgroep, timing).

## Concrete uitwerking
Een stappenplan met 4-6 duidelijke stappen om dit idee te realiseren.

## Quick wins
2-3 acties die je deze week al kan ondernemen.

## Risico's & aandachtspunten
2-3 zaken om op te letten.

## Benodigdheden
Korte lijst van resources (mensen, budget, tools).

Wees concreet, direct en praktisch. Geen marketing fluff. Schrijf in het Nederlands.`;

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await anthropicRes.json();

    if (!anthropicRes.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || "Claude API error", raw: data }),
        { status: anthropicRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const text = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
