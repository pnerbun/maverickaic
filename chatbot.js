(function () {
  'use strict';

  var API_CHAT = '/api/chat';
  var API_SUMMARY = '/api/summary';
  var DISCOVERY_URL = '/discovery.html';

  var messages = [];
  var phase = 'probing';
  var opportunities = [];
  var userEmail = null;
  var businessType = null;
  var summaryEmailSent = false;
  var isOpen = false;
  var isBusy = false;

  var BUSINESS_KEYWORDS = [
    'restaurant', 'cafe', 'bakery', 'bar', 'retail', 'boutique', 'store', 'shop',
    'law firm', 'attorney', 'legal', 'real estate', 'realtor', 'salon', 'spa',
    'gym', 'fitness', 'dental', 'dentist', 'medical', 'clinic', 'chiropractic',
    'accounting', 'bookkeeping', 'cpa', 'trucking', 'logistics', 'freight',
    'construction', 'contractor', 'plumbing', 'hvac', 'electrical', 'roofing',
    'landscaping', 'cleaning', 'marketing agency', 'agency', 'consulting',
    'insurance', 'mortgage', 'auto', 'dealership', 'hotel', 'staffing', 'staffing agency'
  ];

  var WIDGET_HTML = [
    '<div id="mav-chat-tooltip" style="display:none">',
    '  <button class="mav-tooltip-close" aria-label="Dismiss">&times;</button>',
    '  <p>Find out how <strong>Maverick AI</strong> can save you 10+ hours per week!</p>',
    '</div>',
    '<button id="mav-chat-btn" aria-label="Chat with Maverick AI">',
    '  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">',
    '    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="#7DF9FF" opacity="0.85"/>',
    '    <circle cx="8" cy="10" r="1.5" fill="#050B1A"/>',
    '    <circle cx="12" cy="10" r="1.5" fill="#050B1A"/>',
    '    <circle cx="16" cy="10" r="1.5" fill="#050B1A"/>',
    '  </svg>',
    '</button>',
    '<div id="mav-chat-panel" class="hidden">',
    '  <div class="mav-chat-header">',
    '    <div class="mav-header-icon">',
    '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">',
    '        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#7DF9FF"/>',
    '      </svg>',
    '    </div>',
    '    <div class="mav-header-text">',
    '      <h3>Maverick AI</h3>',
    '      <p>AI Consulting Assistant</p>',
    '    </div>',
    '    <button class="mav-chat-close" aria-label="Close chat">&times;</button>',
    '  </div>',
    '  <div class="mav-chat-messages" id="mav-messages"></div>',
    '  <div class="mav-chat-cta hidden" id="mav-cta">',
    '    <a class="mav-book-btn" href="' + DISCOVERY_URL + '" target="_blank">Book a Free Discovery Call &rarr;</a>',
    '    <p class="mav-email-label">Want a copy of this summary sent to your inbox?</p>',
    '    <div class="mav-email-row" id="mav-email-row">',
    '      <input type="email" id="mav-email-input" placeholder="your@email.com" autocomplete="email">',
    '      <button id="mav-email-submit">Send it</button>',
    '    </div>',
    '  </div>',
    '  <div class="mav-chat-input-area">',
    '    <textarea id="mav-input" rows="1" placeholder="Tell me about your business..."></textarea>',
    '    <button class="mav-send-btn" id="mav-send" aria-label="Send">',
    '      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">',
    '        <path d="M22 2L11 13" stroke="#7DF9FF" stroke-width="2.5" stroke-linecap="round"/>',
    '        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="#7DF9FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    '      </svg>',
    '    </button>',
    '  </div>',
    '</div>'
  ].join('\n');

  function init() {
    var wrap = document.createElement('div');
    wrap.innerHTML = WIDGET_HTML;
    document.body.appendChild(wrap);

    document.getElementById('mav-chat-btn').addEventListener('click', togglePanel);
    document.querySelector('.mav-chat-close').addEventListener('click', closePanel);
    document.getElementById('mav-send').addEventListener('click', sendMessage);
    document.getElementById('mav-email-submit').addEventListener('click', handleEmailSubmit);
    document.querySelector('.mav-tooltip-close').addEventListener('click', dismissTooltip);

    if (!sessionStorage.getItem('mav-tooltip-seen')) {
      setTimeout(showTooltip, 4000);
    }

    var ta = document.getElementById('mav-input');
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    ta.addEventListener('input', function () {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 90) + 'px';
    });

    window.addEventListener('beforeunload', sendAbandonmentBeacon);
  }

  function togglePanel() {
    if (isOpen) closePanel(); else openPanel();
  }

  function showTooltip() {
    var tip = document.getElementById('mav-chat-tooltip');
    if (!tip) return;
    tip.style.display = 'block';
    document.getElementById('mav-chat-btn').classList.add('mav-btn-pulse');
  }

  function dismissTooltip() {
    var tip = document.getElementById('mav-chat-tooltip');
    if (!tip || tip.style.display === 'none') return;
    tip.classList.add('mav-tooltip-out');
    document.getElementById('mav-chat-btn').classList.remove('mav-btn-pulse');
    sessionStorage.setItem('mav-tooltip-seen', '1');
    setTimeout(function () { tip.style.display = 'none'; }, 220);
  }

  function openPanel() {
    isOpen = true;
    dismissTooltip();
    document.getElementById('mav-chat-panel').classList.remove('hidden');
    if (messages.length === 0) startConversation();
    else scrollBottom();
    setTimeout(function () {
      var input = document.getElementById('mav-input');
      if (input) input.focus();
    }, 120);
  }

  function closePanel() {
    isOpen = false;
    document.getElementById('mav-chat-panel').classList.add('hidden');
  }

  function addMessage(role, text) {
    var container = document.getElementById('mav-messages');
    var el = document.createElement('div');
    el.className = 'mav-msg ' + (role === 'assistant' ? 'bot' : 'user');
    el.textContent = text;
    container.appendChild(el);
    scrollBottom();
  }

  function showTypingIndicator() {
    var container = document.getElementById('mav-messages');
    var el = document.createElement('div');
    el.className = 'mav-typing';
    el.id = 'mav-typing-dots';
    el.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(el);
    scrollBottom();
  }

  function hideTypingIndicator() {
    var el = document.getElementById('mav-typing-dots');
    if (el) el.remove();
  }

  function scrollBottom() {
    var container = document.getElementById('mav-messages');
    if (container) container.scrollTop = container.scrollHeight;
  }

  function cleanMessages() {
    return messages.filter(function (m) { return m.content !== '__start__'; });
  }

  async function startConversation() {
    isBusy = true;
    showTypingIndicator();
    messages.push({ role: 'user', content: '__start__' });

    try {
      var res = await callChat();
      hideTypingIndicator();
      messages.push({ role: 'assistant', content: res.message });
      addMessage('assistant', res.message);
      checkPhase(res);
    } catch (_) {
      hideTypingIndicator();
      var fallback = "Hi! I'm Maverick AI's consulting assistant — I help small business owners figure out exactly where AI can save them real time and money.\n\nTo get started: what kind of business do you run, and what's your role there?";
      messages.push({ role: 'assistant', content: fallback });
      addMessage('assistant', fallback);
    }

    isBusy = false;
  }

  async function sendMessage() {
    if (isBusy) return;

    var ta = document.getElementById('mav-input');
    var text = ta.value.trim();
    if (!text) return;

    ta.value = '';
    ta.style.height = 'auto';
    document.getElementById('mav-send').disabled = true;

    messages.push({ role: 'user', content: text });
    addMessage('user', text);

    if (!businessType) inferBusinessType(text);

    isBusy = true;
    showTypingIndicator();

    try {
      var res = await callChat();
      hideTypingIndicator();
      messages.push({ role: 'assistant', content: res.message });
      addMessage('assistant', res.message);
      checkPhase(res);
    } catch (_) {
      hideTypingIndicator();
      addMessage('assistant', "Something went wrong on my end — please try again in a moment.");
    }

    isBusy = false;
    document.getElementById('mav-send').disabled = false;
    setTimeout(function () {
      var input = document.getElementById('mav-input');
      if (input) input.focus();
    }, 50);
  }

  async function callChat() {
    var res = await fetch(API_CHAT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages })
    });
    if (!res.ok) throw new Error('API error ' + res.status);
    var data = await res.json();
    if (!data.message) throw new Error('Invalid response');
    return data;
  }

  function checkPhase(res) {
    if (res.phase === 'summary' && phase !== 'summary') {
      phase = 'summary';
      opportunities = Array.isArray(res.opportunities) ? res.opportunities : [];
      document.getElementById('mav-cta').classList.remove('hidden');
      scrollBottom();
    }
  }

  async function handleEmailSubmit() {
    var input = document.getElementById('mav-email-input');
    var email = input.value.trim();
    if (!email || !email.includes('@') || !email.includes('.')) {
      input.focus();
      return;
    }

    userEmail = email;
    var btn = document.getElementById('mav-email-submit');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      await fetch(API_SUMMARY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: cleanMessages(),
          opportunities: opportunities,
          userEmail: userEmail,
          businessType: businessType,
          abandoned: false
        })
      });
      summaryEmailSent = true;
      var row = document.getElementById('mav-email-row');
      row.innerHTML = '<p class="mav-email-sent">✓ On its way to your inbox</p>';
    } catch (_) {
      btn.disabled = false;
      btn.textContent = 'Send it';
    }
  }

  function sendAbandonmentBeacon() {
    var userTurns = cleanMessages().filter(function (m) { return m.role === 'user'; }).length;
    if (summaryEmailSent || userTurns < 2) return;

    var payload = JSON.stringify({
      messages: cleanMessages(),
      opportunities: opportunities,
      userEmail: null,
      businessType: businessType,
      abandoned: true
    });

    try {
      navigator.sendBeacon(API_SUMMARY, new Blob([payload], { type: 'application/json' }));
    } catch (_) {}
  }

  function inferBusinessType(text) {
    var lower = text.toLowerCase();
    for (var i = 0; i < BUSINESS_KEYWORDS.length; i++) {
      if (lower.indexOf(BUSINESS_KEYWORDS[i]) !== -1) {
        businessType = BUSINESS_KEYWORDS[i]
          .split(' ')
          .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); })
          .join(' ');
        return;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
