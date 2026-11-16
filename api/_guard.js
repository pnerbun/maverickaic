// Shared request checks for the chat widget endpoints.
// Files starting with "_" in api/ are not deployed as their own functions.

const ALLOWED_ORIGINS = new Set([
  'https://maverickaic.com',
  'https://www.maverickaic.com',
  'http://localhost:8080',
  'http://localhost:3000'
]);

const MAX_MESSAGES = 30;          // ~15 back-and-forth turns
const MAX_CHARS_PER_MESSAGE = 2000;
const MAX_TOTAL_CHARS = 20000;

// Browsers always send an Origin header on POST (fetch and sendBeacon).
// Scripts can fake it, so this stops casual abuse, not a determined attacker.
export function originAllowed(req) {
  const origin = req.headers.origin;
  return typeof origin === 'string' && ALLOWED_ORIGINS.has(origin);
}

export function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Rebuilds the message list from scratch so only plain
// { role: 'user' | 'assistant', content: string } objects reach Claude.
// Returns { messages } or { error }.
export function cleanChatMessages(input) {
  if (!Array.isArray(input) || input.length === 0) return { error: 'messages array required' };
  if (input.length > MAX_MESSAGES) return { error: 'conversation too long' };

  let total = 0;
  const messages = [];
  for (const m of input) {
    if (!m || typeof m !== 'object') return { error: 'invalid message' };
    if (m.role !== 'user' && m.role !== 'assistant') return { error: 'invalid role' };
    if (typeof m.content !== 'string') return { error: 'invalid content' };
    const content = m.content.trim();
    if (!content) return { error: 'empty message' };
    if (content.length > MAX_CHARS_PER_MESSAGE) return { error: 'message too long' };
    total += content.length;
    if (total > MAX_TOTAL_CHARS) return { error: 'conversation too long' };
    messages.push({ role: m.role, content });
  }

  if (messages[0].role !== 'user') return { error: 'conversation must start with user' };
  if (messages[messages.length - 1].role !== 'user') return { error: 'last message must be from user' };
  return { messages };
}
