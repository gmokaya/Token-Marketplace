import { Router } from "express";
import { z } from "zod";
import { ReplitConnectors } from "@replit/connectors-sdk";

const router = Router();

const contactSchema = z.object({
  name:    z.string().min(1).max(100),
  email:   z.string().email(),
  message: z.string().min(1).max(5000),
});

router.post("/contact", async (req, res): Promise<void> => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { name, email, message } = parsed.data;

  try {
    const connectors = new ReplitConnectors();

    const response = await connectors.proxy("resend", "/emails", {
      method: "POST",
      body: JSON.stringify({
        from:    "TokenHarvest Contact <onboarding@resend.dev>",
        to:      ["gnyakundi@trevitagroup.com"],
        replyTo: email,
        subject: `[WRS Marketplace] Contact from ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
            <h2 style="color:#0d3d38;margin-bottom:4px;">New contact form submission</h2>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>Message:</strong></p>
            <p style="white-space:pre-wrap;background:#f9fafb;padding:16px;border-radius:6px;">${message}</p>
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
            <p style="color:#6b7280;font-size:13px;">Sent from WRS Marketplace contact form</p>
          </div>
        `,
      }),
    });

    const body = await response.json() as { id?: string; statusCode?: number; message?: string };

    if (!response.ok) {
      console.error("[contact] Resend error:", body);
      res.status(502).json({ error: "Failed to send email", details: body });
      return;
    }

    res.json({ ok: true, id: body.id });
  } catch (err: any) {
    console.error("[contact] Unexpected error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
