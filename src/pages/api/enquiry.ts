import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

// Where enquiry notifications are delivered. stay@remarkablebnb.nz is an
// Email Routing custom address that forwards to the hosts' verified inbox.
const NOTIFY_TO = 'stay@remarkablebnb.nz';
const FROM_ADDRESS = 'enquiries@remarkablebnb.nz';

const STAY_LABELS: Record<string, string> = {
  unit: 'Two Bedroom Unit',
  room: 'Guest Room',
  general: 'General Enquiry',
  house: 'The Whole House',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wantsJson(request: Request): boolean {
  return (request.headers.get('accept') || '').includes('application/json');
}

function redirectBack(status: 'sent' | 'error'): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: `/contact?${status}=1#enquiry-form` },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const json = wantsJson(request);
  let data: Record<string, string> = {};

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const form = await request.formData();
      for (const [k, v] of form.entries()) data[k] = String(v);
    }
  } catch {
    return json
      ? new Response(JSON.stringify({ ok: false, error: 'Invalid request' }), { status: 400 })
      : redirectBack('error');
  }

  // Honeypot: real users leave this empty; bots fill it. Pretend success.
  if (data.company && data.company.trim() !== '') {
    return json ? new Response(JSON.stringify({ ok: true })) : redirectBack('sent');
  }

  const name = (data.name || '').trim();
  const email = (data.email || '').trim();
  const message = (data.message || '').trim();
  const stay = (data.stay || 'general').trim();
  const dates = (data.dates || '').trim();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || !emailValid || !message) {
    return json
      ? new Response(JSON.stringify({ ok: false, error: 'Please fill in your name, a valid email, and a message.' }), { status: 400 })
      : redirectBack('error');
  }

  // 1. Persist first — an enquiry must never be lost, even if email fails.
  let enquiryId: number | null = null;
  try {
    const res = await env.DB.prepare(
      'INSERT INTO enquiries (name, email, stay, dates, message) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(name, email, stay, dates || null, message)
      .run();
    enquiryId = res.meta?.last_row_id ?? null;
  } catch (err) {
    console.error('Failed to persist enquiry:', err);
  }

  // 2. Try to send a notification email to the hosts.
  const stayLabel = STAY_LABELS[stay] ?? stay;
  const subject = `New enquiry — ${stayLabel}${dates ? ` (${dates})` : ''}`;
  const textBody = [
    `New enquiry from the Remarkable BnB website`,
    ``,
    `Name:  ${name}`,
    `Email: ${email}`,
    `Stay:  ${stayLabel}`,
    `Dates: ${dates || '—'}`,
    ``,
    `Message:`,
    message,
  ].join('\n');
  const htmlBody = `
    <h2>New enquiry from the Remarkable BnB website</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}<br>
    <strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a><br>
    <strong>Stay:</strong> ${escapeHtml(stayLabel)}<br>
    <strong>Dates:</strong> ${escapeHtml(dates || '—')}</p>
    <p><strong>Message:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

  let emailed = false;
  const emailBinding = (env as any).EMAIL;
  if (emailBinding?.send) {
    try {
      await emailBinding.send({
        to: NOTIFY_TO,
        from: { email: FROM_ADDRESS, name: 'Remarkable BnB Enquiries' },
        replyTo: email,
        subject,
        text: textBody,
        html: htmlBody,
      });
      emailed = true;
      if (enquiryId !== null) {
        await env.DB.prepare('UPDATE enquiries SET emailed = 1 WHERE id = ?').bind(enquiryId).run().catch(() => {});
      }
    } catch (err) {
      console.error('Failed to send enquiry email:', err);
    }
  } else {
    console.warn('EMAIL binding not available; enquiry captured in D1 only.');
  }

  // As long as we captured the enquiry (D1 or email), it's a success for the guest.
  const captured = enquiryId !== null || emailed;
  if (json) {
    return new Response(JSON.stringify({ ok: captured }), {
      status: captured ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return redirectBack(captured ? 'sent' : 'error');
};
