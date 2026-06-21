// ─── Scroll Reveal ───────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 70);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── Nav ─────────────────────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ─── Mobile Menu ──────────────────────────────────────────────────────────────
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
  menuBtn.textContent = mobileMenu.classList.contains('open') ? '✕' : '☰';
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    menuBtn.textContent = '☰';
  });
});

// ─── FAQ Accordion ────────────────────────────────────────────────────────────
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ─── Smooth Scroll ────────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    }
  });
});

// ─── Fragment Animation Engine ────────────────────────────────────────────────
// Each image is split into a 4×4 grid of tiles.
// Tiles scatter outward from their grid position and re-assemble as the
// section enters the viewport, then scatter again as it exits.

const COLS = 4, ROWS = 4;

function mkRng(seed) {
  let s = (seed ^ 0xDEADBEEF) >>> 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 0xFFFFFFFF; };
}

function buildGrid(img, seed) {
  const rng = mkRng(seed);
  const grid = document.createElement('div');
  grid.className = 'frag-grid';

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'frag-cell';
      cell.style.backgroundImage = `url(${img.src})`;
      cell.style.backgroundSize  = `${COLS * 100}% ${ROWS * 100}%`;
      cell.style.backgroundPosition = `${(c / (COLS - 1)) * 100}% ${(r / (ROWS - 1)) * 100}%`;

      // Radiate outward from grid center + noise
      const angle = Math.atan2(r - (ROWS-1)/2 + (rng()-.5)*.5, c - (COLS-1)/2 + (rng()-.5)*.5);
      const dist  = 60 + rng() * 130;
      cell.dataset.sx = (Math.cos(angle) * dist).toFixed(1);
      cell.dataset.sy = (Math.sin(angle) * dist).toFixed(1);
      cell.dataset.sr = ((rng() - .5) * 26).toFixed(1);
      cell.dataset.ss = (.2 + rng() * .35).toFixed(3);

      applyCell(cell, 0);
      grid.appendChild(cell);
    }
  }

  img.replaceWith(grid);
  return grid;
}

function applyCell(cell, p) {
  // ease-out cubic
  const e  = 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const sx = +cell.dataset.sx, sy = +cell.dataset.sy;
  const sr = +cell.dataset.sr, ss = +cell.dataset.ss;
  cell.style.transform = `translate(${sx*(1-e)}px,${sy*(1-e)}px) rotate(${sr*(1-e)}deg) scale(${ss + (1-ss)*e})`;
  cell.style.opacity   = (e * e).toFixed(4);
}

function setGridProgress(grid, p) {
  grid.querySelectorAll('.frag-cell').forEach(c => applyCell(c, p));
}

// Enter as top crosses 80% vh, exit as bottom crosses 20% vh
function calcProgress(el) {
  const rect = el.getBoundingClientRect(), vh = window.innerHeight;
  if (rect.bottom <= 0 || rect.top >= vh) return 0;
  const enter = Math.min(1, Math.max(0, (vh * .80 - rect.top) / (vh * .55)));
  const exit  = Math.min(1, Math.max(0,  rect.bottom / (vh * .25)));
  return Math.min(enter, exit);
}

const allGrids  = [];
const heroGrids = [];
const HERO_INIT_MS = 2000;
const startTime = Date.now();

function initFragments() {
  let seed = 53;

  document.querySelectorAll('.hero-photo-card img').forEach(img => {
    const g = buildGrid(img, seed += 17);
    allGrids.push(g);
    heroGrids.push(g);
  });
  document.querySelectorAll('.product-photo-wrap img').forEach(img => {
    allGrids.push(buildGrid(img, seed += 17));
  });
  document.querySelectorAll('.gallery-item img').forEach(img => {
    allGrids.push(buildGrid(img, seed += 17));
  });

  // Hero: staggered CSS-transition assembly on load
  heroGrids.forEach(grid => {
    const cells = [...grid.querySelectorAll('.frag-cell')];
    cells.forEach((c, i) => {
      c.style.transition = `transform .95s ${.038*i}s cubic-bezier(.16,1,.3,1), opacity .75s ${.038*i}s`;
    });
    // Double-rAF ensures transition is registered before target state is applied
    requestAnimationFrame(() => requestAnimationFrame(() => setGridProgress(grid, 1)));
    setTimeout(() => cells.forEach(c => c.style.transition = ''), cells.length * 38 + 1100);
  });
}

let rafPending = false;
function tick() {
  const elapsed = Date.now() - startTime;
  allGrids.forEach(g => {
    if (heroGrids.includes(g) && elapsed < HERO_INIT_MS) return;
    setGridProgress(g, calcProgress(g));
  });
  rafPending = false;
}

window.addEventListener('scroll', () => {
  if (!rafPending) { rafPending = true; requestAnimationFrame(tick); }
}, { passive: true });

initFragments();
tick(); // set initial state for non-hero grids
