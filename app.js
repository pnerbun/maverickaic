/* ===========================================
   Maverick AI Consulting — Shared client JS
   - Scroll reveal for .reveal elements
   - CTA → star morph + spin + burst animation
   - Wires up any link with href ending in #contact
   =========================================== */

(function () {
  'use strict';

  /* ---------- Scroll reveal ---------- */
  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')),
      { threshold: 0.15 }
    );
    els.forEach(el => io.observe(el));
  }

  /* ---------- CTA animation ---------- */
  const STAR_SVG = `
<svg viewBox="-100 -100 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="ctaStarLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7DC8FF"/>
      <stop offset="100%" stop-color="#1B6FDB"/>
    </linearGradient>
    <linearGradient id="ctaStarDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0053BC"/>
      <stop offset="100%" stop-color="#001F45"/>
    </linearGradient>
  </defs>
  <!-- Light facets -->
  <polygon points="0,0 0,-72 -16,-22" fill="url(#ctaStarLight)"/>
  <polygon points="0,0 -68.5,-22.3 -26,8.5" fill="url(#ctaStarLight)"/>
  <polygon points="0,0 -42.3,58.3 0,27.4" fill="url(#ctaStarLight)"/>
  <polygon points="0,0 42.3,58.3 26,8.5" fill="url(#ctaStarLight)"/>
  <polygon points="0,0 68.5,-22.3 16,-22" fill="url(#ctaStarLight)"/>
  <!-- Dark facets -->
  <polygon points="0,0 0,-72 16,-22" fill="url(#ctaStarDark)"/>
  <polygon points="0,0 -68.5,-22.3 -16,-22" fill="url(#ctaStarDark)"/>
  <polygon points="0,0 -42.3,58.3 -26,8.5" fill="url(#ctaStarDark)"/>
  <polygon points="0,0 42.3,58.3 0,27.4" fill="url(#ctaStarDark)"/>
  <polygon points="0,0 68.5,-22.3 26,8.5" fill="url(#ctaStarDark)"/>
  <!-- Bright core -->
  <circle cx="0" cy="0" r="7" fill="#FFFFFF"/>
</svg>`;

  function isContactLink(href) {
    if (!href) return false;
    return /#contact($|\?|\&)/.test(href);
  }

  function isSamePageContact(href) {
    if (href === '#contact' || href.startsWith('#contact')) return true;
    // Same path but with #contact suffix (e.g. "index.html#contact" when we're on index.html)
    try {
      const u = new URL(href, window.location.href);
      return u.pathname === window.location.pathname && u.hash === '#contact';
    } catch (e) {
      return false;
    }
  }

  function animateAndNavigate(btn, href) {
    if (btn.classList.contains('cta-animating')) return;

    // Snapshot original innerHTML so we can restore (same-page case)
    const originalHTML = btn.innerHTML;

    // Wrap content + inject star
    btn.innerHTML =
      '<span class="cta-text">' + originalHTML + '</span>' +
      '<span class="cta-star">' + STAR_SVG + '</span>';

    btn.classList.add('cta-animating');
    // Force a frame so the transition fires
    requestAnimationFrame(() => btn.classList.add('cta-morphing'));

    // Burst flash at 1.7s
    setTimeout(() => btn.classList.add('cta-burst'), 1700);

    // Navigate at 2s
    setTimeout(() => {
      if (isSamePageContact(href)) {
        const target = document.getElementById('contact');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Reset button after the scroll lands
        setTimeout(() => {
          btn.classList.remove('cta-animating', 'cta-morphing', 'cta-burst');
          btn.innerHTML = originalHTML;
        }, 900);
      } else {
        // Different page — navigate hard
        window.location.href = href;
      }
    }, 2000);
  }

  function initCtaAnimation() {
    const selectors = [
      'a.btn-primary',
      'a.nav-cta',
      'a.tier-cta',
      'a.form-submit'
    ].join(',');

    document.querySelectorAll(selectors).forEach(btn => {
      const href = btn.getAttribute('href') || '';
      if (!isContactLink(href)) return;

      btn.addEventListener('click', (e) => {
        // Honor modifier-clicks (open in new tab)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        animateAndNavigate(btn, href);
      });
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    initScrollReveal();
    initCtaAnimation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
