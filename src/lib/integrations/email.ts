import "server-only";
import nodemailer from "nodemailer";
import { db } from "../db";
import { getSetting } from "../settings";

/** Sendir tölvupóst ef SMTP er stillt; annars er pósturinn vistaður í "Útsendur póstur" í stjórnborði. */
export async function sendEmail(to: string, subject: string, html: string) {
  const host = await getSetting("smtp.host");
  if (!host) {
    await db.emailOutbox.create({ data: { to, subject, html, status: "LOGGED" } });
    return { sent: false };
  }
  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(await getSetting("smtp.port")) || 587,
      auth: { user: await getSetting("smtp.user"), pass: await getSetting("smtp.pass") },
    });
    await transport.sendMail({ from: await getSetting("smtp.from"), to, subject, html });
    await db.emailOutbox.create({ data: { to, subject, html, status: "SENT" } });
    return { sent: true };
  } catch (e) {
    await db.emailOutbox.create({ data: { to, subject, html, status: "FAILED", error: String(e) } });
    return { sent: false, error: String(e) };
  }
}

export function emailLayout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F5EBD9;font-family:Arial,sans-serif;color:#2B1B1E">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="font-family:Georgia,serif;font-size:26px;color:#6A2833;letter-spacing:.04em;margin-bottom:24px">FINCAFRESH</div>
<div style="background:#FCF8F1;border-radius:16px;padding:28px">
<h1 style="font-family:Georgia,serif;color:#6A2833;font-size:24px;margin:0 0 16px">${title}</h1>
${body}
</div>
<p style="font-size:12px;color:#6E5C58;margin-top:24px">Fincafresh · Árstíðabundnir ávextir beint frá völdum bændum á Spáni</p>
</div></body></html>`;
}
