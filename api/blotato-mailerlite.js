module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Gentle Rise Blotato -> MailerLite bridge",
      configured: Boolean(process.env.MAILERLITE_API_TOKEN),
      group: process.env.MAILERLITE_GROUP_NAME || "Gentle Rise — Free Reset Leads"
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const expectedSecret = process.env.BLOTATO_WEBHOOK_SECRET;
  if (expectedSecret) {
    const receivedSecret = req.headers["x-webhook-secret"];
    if (receivedSecret !== expectedSecret) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
  }

  const body = req.body || {};
  const email =
    body.email ||
    body.contact?.email ||
    body.data?.email ||
    body.lead?.email ||
    body.user?.email;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ ok: false, error: "Valid email is required" });
  }

  const token = process.env.MAILERLITE_API_TOKEN;
  if (!token) {
    return res.status(503).json({ ok: false, error: "MAILERLITE_API_TOKEN is not configured" });
  }

  const groupName =
    process.env.MAILERLITE_GROUP_NAME || "Gentle Rise — Free Reset Leads";

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  };

  try {
    const groupsResponse = await fetch(
      "https://connect.mailerlite.com/api/groups?limit=100",
      { headers }
    );

    if (!groupsResponse.ok) {
      const detail = await groupsResponse.text();
      return res.status(502).json({
        ok: false,
        error: "MailerLite groups lookup failed",
        detail: detail.slice(0, 500)
      });
    }

    const groupsJson = await groupsResponse.json();
    const groups = Array.isArray(groupsJson?.data) ? groupsJson.data : [];
    const group = groups.find((g) => g.name === groupName);

    if (!group) {
      return res.status(500).json({
        ok: false,
        error: `MailerLite group not found: ${groupName}`
      });
    }

    const subscriberResponse = await fetch(
      "https://connect.mailerlite.com/api/subscribers",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          groups: [group.id]
        })
      }
    );

    const subscriberText = await subscriberResponse.text();
    let subscriberJson;
    try {
      subscriberJson = JSON.parse(subscriberText);
    } catch {
      subscriberJson = { raw: subscriberText.slice(0, 500) };
    }

    if (!subscriberResponse.ok) {
      return res.status(502).json({
        ok: false,
        error: "MailerLite subscriber upsert failed",
        detail: subscriberJson
      });
    }

    return res.status(200).json({
      ok: true,
      addedToGroup: groupName,
      subscriberId: subscriberJson?.data?.id || null
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Bridge error",
      detail: error?.message || "Unknown error"
    });
  }
};
