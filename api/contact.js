
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "null");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;

  if (!webhook) {
    return res.status(500).json({ error: "Server not configured" });
  }

  const { name, email, message } = req.body || {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof message !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !message.trim() ||
    name.length > 100 ||
    email.length > 254 ||
    message.length > 3000
  ) {
    return res.status(400).json({ error: "Invalid form data" });
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: "New Portfolio Contact",
          fields: [
            { name: "Name", value: name.trim() },
            { name: "Email", value: email.trim() },
            { name: "Message", value: message.trim() }
          ]
        }]
      })
    });

    if (!response.ok) {
      return res.status(502).json({ error: "Message delivery failed" });
    }

    return res.status(200).json({ success: true });
  } catch {
    return res.status(502).json({ error: "Message delivery failed" });
  }
}
