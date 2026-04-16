const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

// Flexible field extraction — accepts many common payload shapes
// (Zapier / Make / Mailgun / Cloudmailin / n8n / generic JSON)
function pick(obj: any, keys: string[]): string {
  for (const k of keys) {
    const parts = k.split(".");
    let v: any = obj;
    for (const p of parts) {
      if (v == null) break;
      v = v[p];
    }
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const expected = Deno.env.get("INBOUND_EMAIL_KEY");
    if (!expected) {
      return new Response(
        JSON.stringify({ error: "INBOUND_EMAIL_KEY not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth via x-api-key header OR ?key= query param (some services only support one)
    const url = new URL(req.url);
    const provided = req.headers.get("x-api-key") || url.searchParams.get("key") || "";
    if (provided !== expected) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body — accept JSON or form-encoded
    let body: any = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    } else {
      const text = await req.text();
      try { body = JSON.parse(text); } catch { body = { raw: text }; }
    }

    // Brand override via query string (?brand=faithdrive) — defaults to tendercards
    const brand = (url.searchParams.get("brand") || pick(body, ["brand"]) || "tendercards").toLowerCase();

    // Extract fields flexibly
    const from_email = pick(body, [
      "from", "from_email", "sender", "email", "fromAddress", "envelope.from",
      "headers.From", "headers.from", "payload.headers.From",
    ]);
    const from_name = pick(body, [
      "from_name", "senderName", "name", "fromName",
    ]);
    const subject = pick(body, [
      "subject", "Subject", "headers.Subject", "headers.subject", "title",
    ]);
    const body_text = pick(body, [
      "text", "body", "body_text", "body-plain", "stripped-text",
      "textBody", "plain", "snippet", "message", "content",
    ]);
    const body_html = pick(body, [
      "html", "body_html", "htmlBody", "body-html", "stripped-html",
    ]);
    const received_at = pick(body, [
      "date", "received_at", "timestamp", "Date", "headers.Date",
    ]);

    const title = subject || (body_text ? body_text.slice(0, 80) : "Nieuwe aanvraag");

    const insertPayload = {
      brand,
      from_email: from_email || null,
      from_name: from_name || null,
      subject: title,
      body_text: body_text || null,
      body_html: body_html || null,
      received_at: received_at ? new Date(received_at).toISOString() : new Date().toISOString(),
      raw: body,
      status: "new",
    };

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/requests`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify(insertPayload),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      return new Response(
        JSON.stringify({ error: "Insert failed", detail: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const inserted = await insertRes.json();
    return new Response(
      JSON.stringify({ ok: true, id: inserted[0]?.id, brand }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
