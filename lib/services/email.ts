import { MailtrapClient } from "mailtrap";

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
}

export interface EmailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

function getConfig() {
  const provider = process.env.EMAIL_PROVIDER || "mailtrap";
  const from = process.env.EMAIL_FROM || "no-reply@dentora.ma";
  const fromName = process.env.EMAIL_FROM_NAME || "Dentora";
  const apiToken = process.env.MAILTRAP_API_TOKEN;
  const inboxId = process.env.MAILTRAP_INBOX_ID ? Number(process.env.MAILTRAP_INBOX_ID) : undefined;
  const host = process.env.MAILTRAP_HOST;
  const port = process.env.MAILTRAP_PORT ? Number(process.env.MAILTRAP_PORT) : undefined;
  const username = process.env.MAILTRAP_USERNAME;
  const password = process.env.MAILTRAP_PASSWORD;
  return { provider, from, fromName, apiToken, inboxId, host, port, username, password };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const cfg = getConfig();
  const toAddr = payload.to.trim();
  if (!toAddr) return { ok: false, error: "Missing recipient" };

  const sender = { name: payload.fromName || cfg.fromName, email: payload.from || cfg.from };

  try {
    if (cfg.apiToken) {
      // A sandbox inbox id is passed explicitly rather than inferred, so a
      // production token can never be routed to the shared sandbox.
      const client = new MailtrapClient(
        cfg.inboxId ? { token: cfg.apiToken, testInboxId: cfg.inboxId } : { token: cfg.apiToken },
      );
      const res = await client.send({
        from: sender,
        to: [{ email: toAddr }],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        category: "clinic-otp",
      });
      return { ok: true, messageId: res.message_ids[0] };
    }

    if (cfg.host && cfg.username && cfg.password) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port || 587,
        auth: { user: cfg.username, pass: cfg.password },
        secure: (cfg.port || 587) === 465,
      });
      const info = await transporter.sendMail({
        from: `${sender.name} <${sender.email}>`,
        to: toAddr,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      });
      return { ok: true, messageId: info.messageId };
    }

    return { ok: false, error: "Mailtrap not configured (set MAILTRAP_API_TOKEN or SMTP credentials)" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendClinicOtpEmail(to: string, code: string): Promise<EmailResult> {
  const subject = "Votre code de connexion - Dentora";
  const text = `Votre code de vérification est : ${code}\nIl expire dans 10 minutes.`;
  const html = `<p>Votre code de vérification est <strong style="font-size:1.2rem">${code}</strong>.</p><p>Il expire dans 10 minutes.</p>`;
  return sendEmail({ to, subject, text, html });
}
