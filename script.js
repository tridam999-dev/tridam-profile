/* ============================================================
   DUCKTRI — script.js  |  Core UI Logic (optimized v3)
   Background animation handled by bg.js
   ============================================================ */

/* ===== DOM References ===== */
const intro       = document.getElementById('intro');
const main        = document.getElementById('main');
const bgMusic     = document.getElementById('bgMusic');
const avatarImg   = document.getElementById('avatarImg');
const musicPlayer = document.getElementById('musicPlayer');
const mpPlayBtn   = document.getElementById('mpPlayBtn');
const mpDisc      = document.getElementById('mpDisc');
const iconPlay    = document.getElementById('iconPlay');
const iconPause   = document.getElementById('iconPause');

let isPlaying    = false;
let musicStarted = false;

/* ===== Avatar Placeholder Fallback ===== */
avatarImg.onerror = function () {
  this.onerror = null;
  this.src =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E" +
    "%3Ccircle cx='60' cy='60' r='60' fill='%230a0a16'/%3E" +
    "%3Ccircle cx='60' cy='60' r='58' fill='none' stroke='%23a259ff' stroke-width='1' stroke-opacity='0.4'/%3E" +
    "%3Ctext x='60' y='68' text-anchor='middle' dominant-baseline='middle' " +
    "fill='%23a259ff' font-size='28' font-family='monospace' font-weight='bold'%3EDT%3C/text%3E" +
    "%3C/svg%3E";
};

/* ===== Intro Click — Transition to Main ===== */
intro.addEventListener('click', function handleIntroClick() {
  intro.removeEventListener('click', handleIntroClick);
  intro.classList.add('fade-out');

  setTimeout(() => {
    intro.style.display = 'none';
    main.classList.remove('hidden');

    // Double rAF: let browser paint before triggering transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        main.classList.add('visible');
      });
    });

    musicPlayer.classList.remove('hidden');
    startMusic();
    
    // Start typing name after a slight delay
    setTimeout(typeNameEffect, 500);
  }, 750);
});

/* ===== Music Player ===== */
const playlist = [
  { src: "Tinh Yeu Cham Tre.mp3", title: "Tình Yêu Chậm Trễ", artist: "MONSTAR" },
  { src: "Sau Con Mua.mp3", title: "Sau Cơn Mưa", artist: "RyO" }
];
let currentTrackIndex = 0;

function loadTrack(index) {
  const track = playlist[index];
  bgMusic.src = track.src;
  const titleEl = document.querySelector('.mp-title');
  const artistEl = document.querySelector('.mp-artist');
  if (titleEl) titleEl.textContent = track.title;
  if (artistEl) artistEl.textContent = track.artist;
  bgMusic.load();
}

bgMusic.addEventListener('ended', () => {
  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
  loadTrack(currentTrackIndex);
  bgMusic.play()
    .then(() => setPlayState(true))
    .catch(() => setPlayState(false));
});

function setPlayState(playing) {
  isPlaying = playing;
  if (playing) {
    mpDisc.classList.add('spinning');
    musicPlayer.classList.add('playing');
    iconPlay.style.display  = 'none';
    iconPause.style.display = 'block';
  } else {
    mpDisc.classList.remove('spinning');
    musicPlayer.classList.remove('playing');
    iconPlay.style.display  = 'block';
    iconPause.style.display = 'none';
  }
}

function startMusic() {
  if (musicStarted) return;
  musicStarted = true;
  bgMusic.volume = 0.32;
  bgMusic.play()
    .then(() => setPlayState(true))
    .catch(() => {
      setPlayState(false);
      musicStarted = false; // Allow retry on next interaction
    });
}

// Auto play attempt on load
window.addEventListener('DOMContentLoaded', () => {
  loadTrack(0); // Load first track
  startMusic();
});

// Fallback to start music on first click anywhere if autoplay was blocked
document.body.addEventListener('click', () => {
  if (!musicStarted) {
    startMusic();
  }
}, { once: true });

mpPlayBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // Prevent triggering body click
  if (!musicStarted) { startMusic(); return; }
  if (isPlaying) {
    bgMusic.pause();
    setPlayState(false);
  } else {
    bgMusic.play()
      .then(() => setPlayState(true))
      .catch(() => {});
  }
});

/* ===== Name Typing Effect (One-time) ===== */
const nameStr = "Đức Trí";
const nameTypingEl = document.getElementById('name-typing');
let nameCharIdx = 0;

function typeNameEffect() {
  if (!nameTypingEl) return;
  if (nameCharIdx <= nameStr.length) {
    nameTypingEl.textContent = nameStr.slice(0, nameCharIdx);
    nameCharIdx++;
    setTimeout(typeNameEffect, 150); // Speed of typing the name
  } else {
    // Hide cursor after typing is done
    const nameCursor = document.querySelector('h1.name .cursor');
    if(nameCursor) nameCursor.style.display = 'none';
  }
}

/* ===== Subtitle Typing Effect ===== */
const typingWords = ['Developer', 'AI Builder', 'Student', 'Vibe Coder', 'Night Coder', 'Creator'];
const typingEl    = document.getElementById('typing-text');
let wordIdx = 0, charIdx = 0, isDeleting = false;

function typeLoop() {
  const word = typingWords[wordIdx];
  if (isDeleting) { charIdx--; } else { charIdx++; }
  typingEl.textContent = word.slice(0, charIdx);

  let delay = isDeleting ? 48 : 92;
  if (!isDeleting && charIdx === word.length) {
    delay = 2000; isDeleting = true;
  } else if (isDeleting && charIdx === 0) {
    isDeleting = false;
    wordIdx = (wordIdx + 1) % typingWords.length;
    delay = 300;
  }
  setTimeout(typeLoop, delay);
}
typeLoop();

/* ===== Floating Particles (lightweight) ===== */
(function spawnParticles() {
  const container = document.getElementById('particles');

  /* Use BGConfig if available, else fallback */
  const COUNT = (window.BGConfig && window.BGConfig.particles)
    ? window.BGConfig.particles.count
    : (window.innerWidth < 768 ? 6 : 14);

  const colors = [
    'rgba(162,89,255,0.5)',
    'rgba(162,89,255,0.25)',
    'rgba(0,212,255,0.35)',
    'rgba(0,212,255,0.18)',
    'rgba(255,255,255,0.15)',
  ];

  for (let i = 0; i < COUNT; i++) {
    const p    = document.createElement('div');
    p.className = 'particle';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size  = (Math.random() * 1.6 + 0.6).toFixed(2);
    const dur   = (Math.random() * 22 + 14).toFixed(0);
    const del   = -(Math.random() * 24).toFixed(0);

    p.style.cssText =
      `width:${size}px;height:${size}px;` +
      `left:${(Math.random() * 100).toFixed(1)}%;` +
      `background:${color};` +
      `animation-duration:${dur}s;` +
      `animation-delay:${del}s;`;
    container.appendChild(p);
  }
})();

/* ===== Mouse Parallax — single rAF, desktop only ===== */
(function initParallax() {
  /* Check BGConfig first, fallback to media query */
  const enabled = window.BGConfig
    ? window.BGConfig.enableParallax
    : !window.matchMedia('(pointer:coarse)').matches;
  if (!enabled) return;

  const strength = (window.BGConfig && window.BGConfig.parallaxStrength) || 1.0;
  const blobs     = document.querySelectorAll('.blob');
  const gridLayer = document.querySelector('.cyber-grid-layer');

  /* Disable CSS animation on blobs — JS takes over */
  blobs.forEach(b => { b.style.animation = 'none'; });

  let tx = 0, ty = 0, cx = 0, cy = 0;

  document.addEventListener('mousemove', e => {
    tx = e.clientX / window.innerWidth  - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function frame() {
    requestAnimationFrame(frame);
    cx = lerp(cx, tx, 0.03);
    cy = lerp(cy, ty, 0.03);

    const s = strength;
    blobs.forEach((b, i) => {
      const d = (i + 1) * 20 * s;
      b.style.transform = `translate(${cx * d}px, ${cy * d}px)`;
    });

    if (gridLayer) {
      gridLayer.style.transform =
        `perspective(480px) rotateX(56deg) ` +
        `translate(${cx * 22 * s}px, ${cy * 8 * s}px)`;
    }
  }
  frame();
})();

/* ===== Custom Cursor & Spotlight (Desktop Only) ===== */
(function initInteractiveFeatures() {
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  const interactives = document.querySelectorAll('.interactive');
  const spotlights = document.querySelectorAll('.spotlight-card');

  if (!dot || !ring) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let dotX = mouseX;
  let dotY = mouseY;
  let isMoving = false;

  document.addEventListener('mousemove', (e) => {
    if (!isMoving) {
      isMoving = true;
      document.body.classList.add('has-custom-cursor');
      dot.classList.add('active');
      ring.classList.add('active');
    }
    
    mouseX = e.clientX;
    mouseY = e.clientY;

    // Spotlight calculation
    spotlights.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  }, { passive: true });

  // Hover states for cursor ring
  interactives.forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function renderCursor() {
    requestAnimationFrame(renderCursor);
    if (!isMoving) return;
    
    dotX = lerp(dotX, mouseX, 0.4);
    dotY = lerp(dotY, mouseY, 0.4);
    
    ringX = lerp(ringX, mouseX, 0.15);
    ringY = lerp(ringY, mouseY, 0.15);

    dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
  }
  requestAnimationFrame(renderCursor);
})();

