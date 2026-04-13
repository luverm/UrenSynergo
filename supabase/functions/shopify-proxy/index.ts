import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { storeDomain, accessToken, endpoint } = await req.json();

    if (!storeDomain || !accessToken) {
      return new Response(
        JSON.stringify({ error: "storeDomain and accessToken are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Whitelist allowed endpoints
    const allowedEndpoints = [
      "orders.json",
      "orders/count.json",
      "products.json",
      "products/count.json",
    ];

    const ep = endpoint || "orders.json";
    if (!allowedEndpoints.some((a) => ep.startsWith(a.split(".")[0]))) {
      return new Response(
        JSON.stringify({ error: "Endpoint not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const domain = storeDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const url = `https://${domain}/admin/api/2024-01/${ep}`;

    const shopifyRes = await fetch(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    const data = await shopifyRes.json();

    return new Response(JSON.stringify(data), {
      status: shopifyRes.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
