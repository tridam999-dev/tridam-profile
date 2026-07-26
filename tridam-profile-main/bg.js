/* ============================================================
   DUCKTRI — bg.js  |  Optimized Background Engine v3
   ─────────────────────────────────────────────────────
   Single rAF loop • Adaptive performance tiers
   Canvas-only code rain • Minimal DOM overlays

   VISUAL_CONFIG (line ~20) — tweak density/speed/counts here
   ============================================================ */

(function BGEngine() {
  'use strict';

  /* ── helpers ── */
  const rand = (a, b) => Math.random() * (b - a) + a;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ============================================================
     VISUAL_CONFIG — Adjust these to tune visuals & performance
     ============================================================ */
  const TIER = detectTier();           // 'high' | 'mid' | 'lite'

  const VISUAL_CONFIG = {
    /* ── code rain ── */
    codeRain: {
      density:       { high: 0.18,  mid: 0.12,  lite: 0.07  }[TIER],
      colSpacing:    28,                    // px between columns
      streamLen:     { high: [3,12], mid: [3,8],  lite: [2,6]  }[TIER],
      maxAlpha:      0.10,                  // brightest char
      speed:         { high: [0.10, 0.45], mid: [0.08, 0.35], lite: [0.06, 0.25] }[TIER],
      fontSize:      { high: 11, mid: 10, lite: 10 }[TIER],
      mutationRate:  0.005,                 // chance to swap char per frame
    },

    /* ── code snippet overlays (rendered on same canvas) ── */
    snippets: {
      count:   { high: 6,  mid: 4,  lite: 2 }[TIER],
      alpha:   [0.04, 0.085],               // opacity range
      speed:   [0.03, 0.10],
      fontSize: 11,
    },

    /* ── canvas FPS cap (Giảm xuống cực thấp để siêu mượt cho CPU) ── */
    fpsCap: { high: 10, mid: 8, lite: 5 }[TIER],

    /* ── particles (DOM, CSS animated — no JS loop needed) ── */
    particles: {
      count: { high: 18, mid: 10, lite: 5 }[TIER],
    },

    /* ── parallax (Tắt để không tính toán chuột liên tục) ── */
    enableParallax: false,
    parallaxStrength: { high: 1.0, mid: 0.6, lite: 0 }[TIER],

    /* ── HUD corners ── */
    enableHUD: TIER !== 'lite',

    /* ── vignette (CSS-only, no DOM node needed — use body pseudo) ── */
    enableVignette: true,

    /* ── sweep line (Tắt để giảm tải render mảng lớn) ── */
    enableSweep: false,

    /* ── current tier for debugging ── */
    tier: TIER,
  };

  /* Expose so user can tweak in console: BGConfig.codeRain.density = 0.05 */
  window.BGConfig = VISUAL_CONFIG;

  /* ── Performance tier detection ── */
  function detectTier() {
    const w = window.innerWidth;
    const isMobile = w < 768;
    const isTablet = w >= 768 && w < 1100;

    /* Coarse pointer = likely phone/tablet */
    const isTouch = window.matchMedia('(pointer:coarse)').matches;

    /* Hardware concurrency hint */
    const cores = navigator.hardwareConcurrency || 2;

    if (isMobile || (isTouch && cores <= 4)) return 'lite';
    if (isTablet || cores <= 4) return 'mid';
    return 'high';
  }


  /* ============================================================
     LAYER 1 — Code Rain Canvas (single canvas, single rAF)
     Sparse vertical char streams + horizontal code snippets
     ============================================================ */
  (function initCodeRain() {
    const canvas = document.getElementById('canvas-rain');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    /* Character pool — concise, cyber-aesthetic */
    const CHARS = '01アカサタ{}[]<>=;:#@$ABCDEFabcdef'.split('');

    /* Code snippet fragments — drifting horizontally */
    const SNIPS = [
      'system.init()', 'neural.ready()', 'import torch',
      'model.predict()', 'epoch 100/100', 'acc: 98.7%',
      '> connecting...', '// pipeline ok', 'loss: 0.003',
      'git push origin', 'docker build .', 'ssh root@srv',
      'def train(x):', '[OK] compiled', 'λ lr=1e-4',
    ];

    const cfg  = VISUAL_CONFIG.codeRain;
    const scfg = VISUAL_CONFIG.snippets;
    const INTERVAL = 1000 / VISUAL_CONFIG.fpsCap;

    let W, H, streams = [], snips = [], lastTick = 0;
    let fontStr = '';   // cached font string

    function buildStreams() {
      streams.length = 0;
      snips.length   = 0;

      const cols = Math.ceil(W / cfg.colSpacing);

      for (let i = 0; i < cols; i++) {
        if (Math.random() > cfg.density) continue;

        const len = Math.floor(rand(cfg.streamLen[0], cfg.streamLen[1]));
        const isPurple = Math.random() > 0.4;

        streams.push({
          x:      i * cfg.colSpacing + cfg.colSpacing * 0.5,
          y:      rand(-H * 0.5, 0),
          speed:  rand(cfg.speed[0], cfg.speed[1]),
          alpha:  rand(0.025, cfg.maxAlpha),
          purple: isPurple,
          chars:  Array.from({ length: len }, () => pick(CHARS)),
        });
      }

      /* Snippet overlays */
      for (let i = 0; i < scfg.count; i++) {
        snips.push({
          x:      rand(0, W),
          y:      rand(0, H),
          speed:  rand(scfg.speed[0], scfg.speed[1]),
          driftX: rand(-0.02, 0.02),
          text:   pick(SNIPS),
          alpha:  rand(scfg.alpha[0], scfg.alpha[1]),
          purple: Math.random() > 0.5,
        });
      }
    }

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
      fontStr = `${cfg.fontSize}px "Space Mono",monospace`;
      buildStreams();
    }

    function tick(ts) {
      requestAnimationFrame(tick);
      if (ts - lastTick < INTERVAL) return;
      lastTick = ts;

      ctx.clearRect(0, 0, W, H);
      ctx.font = fontStr;

      const lineH = cfg.fontSize * 1.4;

      /* ── vertical streams ── */
      for (let i = 0, len = streams.length; i < len; i++) {
        const s = streams[i];
        const cLen = s.chars.length;

        for (let ci = 0; ci < cLen; ci++) {
          const cy = s.y - ci * lineH;
          if (cy < -lineH || cy > H + lineH) continue;

          /* Fade: head bright, tail dim */
          const ratio = 1 - ci / cLen;
          const a = ci === 0
            ? Math.min(s.alpha * 2.5, 0.22)
            : s.alpha * (0.35 + ratio * 0.65);

          ctx.globalAlpha = a;
          ctx.fillStyle = s.purple
            ? 'rgb(162,89,255)'
            : 'rgb(0,212,255)';
          ctx.fillText(s.chars[ci], s.x, cy);
        }

        /* advance */
        s.y += s.speed;
        if (s.y > H + cLen * lineH + 30) {
          s.y = rand(-120, -20);
          /* re-generate chars */
          for (let ci = 0; ci < cLen; ci++) s.chars[ci] = pick(CHARS);
        }

        /* occasional char mutation — very cheap */
        if (Math.random() < cfg.mutationRate) {
          s.chars[Math.floor(Math.random() * cLen)] = pick(CHARS);
        }
      }

      /* ── snippet overlays ── */
      ctx.font = `${scfg.fontSize}px "Space Mono",monospace`;
      for (let i = 0, len = snips.length; i < len; i++) {
        const sn = snips[i];
        ctx.globalAlpha = sn.alpha;
        ctx.fillStyle = sn.purple
          ? 'rgb(162,89,255)'
          : 'rgb(0,212,255)';
        ctx.fillText(sn.text, sn.x, sn.y);

        sn.y += sn.speed;
        sn.x += sn.driftX;

        if (sn.y > H + 20) {
          sn.y = rand(-40, -10);
          sn.x = rand(0, W);
          sn.text = pick(SNIPS);
        }
        if (sn.x < -200 || sn.x > W + 50) sn.x = rand(20, W - 20);
      }

      ctx.globalAlpha = 1;
    }

    /* Debounced resize */
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });
    resize();
    requestAnimationFrame(tick);
  })();


  /* ============================================================
     HUD Corner Brackets (pure CSS, no JS loop)
     4 small L-brackets at screen corners, pulse with CSS only
     ============================================================ */
  if (VISUAL_CONFIG.enableHUD) {
    (function initHUD() {
      const style = document.createElement('style');
      style.textContent = `
        #hud-layer{position:fixed;inset:0;pointer-events:none;z-index:5}
        .hud-c{position:absolute;width:32px;height:32px;
          border-color:rgba(0,212,255,0.22);border-style:solid;border-width:0;
          opacity:0.6}
        .hud-c::before{content:'';position:absolute;width:3px;height:3px;
          border-radius:50%;background:rgba(0,212,255,0.5)}
        .hud-tl{top:16px;left:16px;border-top-width:1px;border-left-width:1px}
        .hud-tl::before{top:-1px;left:-1px}
        .hud-tr{top:16px;right:16px;border-top-width:1px;border-right-width:1px}
        .hud-tr::before{top:-1px;right:-1px}
        .hud-bl{bottom:16px;left:16px;border-bottom-width:1px;border-left-width:1px}
        .hud-bl::before{bottom:-1px;left:-1px}
        .hud-br{bottom:16px;right:16px;border-bottom-width:1px;border-right-width:1px}
        .hud-br::before{bottom:-1px;right:-1px}
        @media(max-width:600px){.hud-c{display:none}}
      `;
      document.head.appendChild(style);

      const wrap = document.createElement('div');
      wrap.id = 'hud-layer';
      ['tl','tr','bl','br'].forEach(p => {
        const d = document.createElement('div');
        d.className = `hud-c hud-${p}`;
        wrap.appendChild(d);
      });
      document.body.appendChild(wrap);
    })();
  }


  /* ============================================================
     Vignette + optional sweep line (CSS only, no rAF)
     ============================================================ */
  (function initOverlays() {
    const css = [];

    if (VISUAL_CONFIG.enableVignette) {
      css.push(`
        #vignette{position:fixed;inset:0;pointer-events:none;z-index:6;
          background:radial-gradient(ellipse 85% 85% at 50% 50%,
            transparent 42%, rgba(0,0,0,0.5) 100%)}
      `);
    }

    if (VISUAL_CONFIG.enableSweep) {
      css.push(`
        #sweep{position:fixed;top:-2px;left:0;right:0;height:1px;
          pointer-events:none;z-index:7;
          background:linear-gradient(90deg,transparent 0%,
            rgba(0,212,255,0.1) 30%,rgba(162,89,255,0.14) 50%,
            rgba(0,212,255,0.1) 70%,transparent 100%);
          animation:sweepY 12s linear infinite}
        @keyframes sweepY{
          0%{transform:translateY(0);opacity:0}
          3%{opacity:1}97%{opacity:0.5}
          100%{transform:translateY(100vh);opacity:0}}
      `);
    }

    if (css.length) {
      const s = document.createElement('style');
      s.textContent = css.join('');
      document.head.appendChild(s);

      if (VISUAL_CONFIG.enableVignette) {
        const v = document.createElement('div');
        v.id = 'vignette';
        document.body.appendChild(v);
      }
      if (VISUAL_CONFIG.enableSweep) {
        const sw = document.createElement('div');
        sw.id = 'sweep';
        document.body.appendChild(sw);
      }
    }
  })();


  /* ============================================================
     Scroll Reveal for achievement cards (IntersectionObserver)
     Uses IO instead of scroll listener — much more efficient
     ============================================================ */
  (function initScrollReveal() {
    const style = document.createElement('style');
    style.textContent = `
      .achievement-card{
        opacity:0;transform:translateY(18px);
        transition:opacity 0.5s ease,transform 0.5s ease,
          border-color 0.3s ease,background 0.3s ease,
          box-shadow 0.3s ease}
      .achievement-card.revealed{opacity:1;transform:translateY(0)}
    `;
    document.head.appendChild(style);

    /* Use IntersectionObserver — no scroll listener overhead */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('revealed'), i * 80);
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.15 });

      /* Observe cards after main becomes visible */
      const mainEl = document.getElementById('main');
      const observeCards = () => {
        document.querySelectorAll('.achievement-card').forEach(c => io.observe(c));
      };

      if (mainEl) {
        const mo = new MutationObserver(() => {
          if (mainEl.classList.contains('visible')) {
            setTimeout(observeCards, 300);
            mo.disconnect();
          }
        });
        mo.observe(mainEl, { attributes: true, attributeFilter: ['class'] });
      }
      observeCards();
    } else {
      /* Fallback: just show them */
      document.querySelectorAll('.achievement-card').forEach(c =>
        c.classList.add('revealed'));
    }
  })();


  /* Log tier for debugging */
  console.log(`[BG] Performance tier: ${TIER} | Canvas FPS cap: ${VISUAL_CONFIG.fpsCap}`);

})();
