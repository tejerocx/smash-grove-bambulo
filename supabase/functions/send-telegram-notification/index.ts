const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BookingPayload = {
  type?: "booking";
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

type OpenPlayPayload = {
  type: "open_play";
  fullName: string;
  courtName: string;
  date: string;
  timeLabel: string;
  paymentType: string;
  amount: number;
};

type Payload = BookingPayload | OpenPlayPayload;

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

function buildBookingMessage(p: BookingPayload): string {
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
    `👆 <a href="https://smashgrove.com/admin.html">Open admin panel to verify &amp; confirm.</a>`
  );
}

function buildOpenPlayMessage(p: OpenPlayPayload): string {
  return (
    `🏓 <b>OPEN PLAY SIGN-UP!</b>\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>${p.fullName}</b>\n` +
    `\n` +
    `🏟️ <b>${p.courtName}</b>\n` +
    `📅 ${fmtDate(p.date)}\n` +
    `⏰ ${p.timeLabel}\n` +
    `\n` +
    `💳 <b>GCash</b>\n` +
    `⚡ DP: <b>${p.paymentType}</b> — ${fmtPHP(p.amount)}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `👆 <a href="https://smashgrove.com/admin.html">View Open Play registrations.</a>`
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
    const chatIdRaw = Deno.env.get("TELEGRAM_CHAT_ID") || "";

    if (!botToken || !chatIdRaw) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "Telegram not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatIds = chatIdRaw.split(",").map((id) => id.trim()).filter(Boolean);
    const body = (await req.json()) as Payload;

    let message: string;

    if (body.type === "open_play") {
      if (!body.fullName) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      message = buildOpenPlayMessage(body);
    } else {
      const b = body as BookingPayload;
      if (!b.bookingRef || !b.fullName) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      message = buildBookingMessage(b);
    }

    // Send to all chat IDs in parallel
    const results = await Promise.allSettled(
      chatIds.map(async (chatId) => {
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
        if (!res.ok) throw new Error(`Chat ${chatId}: ${res.status} ${JSON.stringify(json)}`);
        return { chatId, ok: true };
      })
    );

    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.error("Some Telegram sends failed:", failed.map((r) => (r as PromiseRejectedResult).reason));
    }

    return new Response(JSON.stringify({ ok: true, sent: chatIds.length, failed: failed.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
