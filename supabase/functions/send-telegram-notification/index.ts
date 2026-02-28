const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  bookingRef: string;
  fullName: string;
  contactNumber: string;
  courtName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  total: number;
  downpayment: number;
  paymentMethod: string;
  gcashRef?: string | null;
};

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtPHP(n: number): string {
  return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

function buildMessage(p: Payload): string {
  const method =
    p.paymentMethod === "gcash"
      ? "GCash"
      : p.paymentMethod === "gotyme"
      ? "GoTyme"
      : "Cash";

  const refLine = p.gcashRef
    ? `\n🔖 <b>Ref #:</b> <code>${p.gcashRef}</code>`
    : "";

  return (
    `🎾 <b>NEW BOOKING!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>${p.fullName}</b>\n` +
    `📱 ${p.contactNumber}\n` +
    `\n` +
    `🏟️ <b>${p.courtName}</b>\n` +
    `📅 ${fmtDate(p.date)}\n` +
    `⏰ ${p.startTime} – ${p.endTime} (${p.duration} hr${p.duration !== 1 ? "s" : ""})\n` +
    `\n` +
    `💳 <b>${method}</b>${refLine}\n` +
    `💰 Total: ${fmtPHP(p.total)}\n` +
    `⚡ Downpayment: <b>${fmtPHP(p.downpayment)}</b>\n` +
    `\n` +
    `📋 Ref: <code>${p.bookingRef}</code>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👆 Open admin panel to verify & confirm.`
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    const chatId = Deno.env.get("TELEGRAM_CHAT_ID") || "";

    if (!botToken || !chatId) {
      // Silently succeed if Telegram is not configured — don't break the booking flow
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Telegram not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Payload;
    if (!body.bookingRef || !body.fullName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = buildMessage(body);

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Telegram error ${res.status}: ${JSON.stringify(json)}`);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Return 200 so booking flow is not disrupted even if Telegram fails
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
