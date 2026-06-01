export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;

  // sendBeacon sends as text/plain; parse manually if needed
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const { messages, opportunities, userEmail, businessType, abandoned } = body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const patEmail = process.env.CONTACT_EMAIL;

  if (!resendKey || !patEmail) {
    console.error('Missing RESEND_API_KEY or CONTACT_EMAIL');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const status = abandoned ? 'Abandoned' : 'Lead Captured';
  const businessLabel = businessType || 'Unknown Business';
  const subject = `Maverick AI Chat — ${businessLabel} [${status}]`;
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const visibleMessages = messages.filter(m => m.content !== '__start__');
  const transcript = visibleMessages
    .map(m => {
      const label = m.role === 'user' ? 'Visitor' : 'Assistant';
      const text = (m.content || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      return `<p style="margin:0 0 10px"><strong style="color:${m.role === 'user' ? '#1B6FDB' : '#374151'}">${label}:</strong><br>${text}</p>`;
    })
    .join('');

  const opportunitiesHtml = Array.isArray(opportunities) && opportunities.length
    ? `<h2 style="font-size:16px;margin:24px 0 8px;padding-top:16px;border-top:1px solid #e2e6ea">AI Opportunities Identified</h2>
       <ul style="font-size:14px;color:#374151;margin:0;padding-left:20px;line-height:1.9">
         ${opportunities.map(o => `<li>${(o || '').replace(/</g, '&lt;')}</li>`).join('')}
       </ul>`
    : '';

  const nextStepHtml = !abandoned && userEmail
    ? `<div style="margin-top:24px;padding:16px;background:#f0f4ff;border-radius:8px;border:1px solid #c7d7f7">
         <p style="font-size:14px;margin:0"><strong>Next step:</strong> Reply to <a href="mailto:${userEmail}">${userEmail}</a> to schedule their Discovery Call.</p>
       </div>`
    : abandoned
    ? `<div style="margin-top:24px;padding:16px;background:#fff8f0;border-radius:8px;border:1px solid #f7d7c7">
         <p style="font-size:14px;margin:0;color:#92400e"><strong>Note:</strong> Visitor left without booking or providing email. Review transcript for context.</p>
       </div>`
    : '';

  const html = `
<div style="font-family:sans-serif;max-width:680px;margin:0 auto;color:#1a202c">
  <div style="background:${abandoned ? '#4b5563' : '#1B6FDB'};padding:20px 24px;border-radius:8px 8px 0 0">
    <h1 style="color:#fff;margin:0;font-size:20px">Maverick AI Chat — ${status}</h1>
    <p style="color:${abandoned ? '#d1d5db' : '#bfdbfe'};margin:4px 0 0;font-size:14px">${businessLabel} · ${date}</p>
  </div>
  <div style="border:1px solid #e2e6ea;border-top:none;padding:24px;border-radius:0 0 8px 8px">

    <h2 style="font-size:16px;margin:0 0 12px">Contact</h2>
    <table style="font-size:14px;border-collapse:collapse;width:100%;margin-bottom:8px">
      <tr>
        <td style="padding:4px 12px 4px 0;color:#6b7280;width:120px">Email</td>
        <td>${userEmail ? `<a href="mailto:${userEmail}">${userEmail}</a>` : '<span style="color:#ef4444">Not provided</span>'}</td>
      </tr>
      <tr>
        <td style="padding:4px 12px 4px 0;color:#6b7280">Business type</td>
        <td>${businessLabel}</td>
      </tr>
      <tr>
        <td style="padding:4px 12px 4px 0;color:#6b7280">Messages</td>
        <td>${visibleMessages.filter(m => m.role === 'user').length} from visitor</td>
      </tr>
    </table>

    ${opportunitiesHtml}

    <h2 style="font-size:16px;margin:24px 0 8px;padding-top:16px;border-top:1px solid #e2e6ea">Conversation Transcript</h2>
    <div style="font-size:13px;line-height:1.7;background:#f9fafb;padding:16px;border-radius:6px;border:1px solid #e5e7eb">
      ${transcript || '<p style="color:#9ca3af;font-style:italic">No messages recorded.</p>'}
    </div>

    ${nextStepHtml}
  </div>
</div>`;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendKey}`
      },
      body: JSON.stringify({
        from: 'Maverick AI Chat <intake@maverickaic.com>',
        to: patEmail,
        subject,
        html
      })
    });

    if (!emailRes.ok) {
      console.error('Resend error:', await emailRes.text());
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Summary handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
