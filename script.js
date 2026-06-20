const nav = document.getElementById('nav');
window.addEventListener('scroll', () => { nav.classList.toggle('scrolled', window.scrollY > 40); });

const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => { mobileMenu.classList.toggle('open'); });
mobileMenu.querySelectorAll('a').forEach(link => { link.addEventListener('click', () => mobileMenu.classList.remove('open')); });

const revealObserver = new IntersectionObserver(
  (entries) => { entries.forEach((entry, i) => { if (entry.isIntersecting) { setTimeout(() => entry.target.classList.add('visible'), i * 80); revealObserver.unobserve(entry.target); } }); },
  { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
);
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

const speedEl = document.getElementById('speedDisplay');
if (speedEl) {
  const speeds = ['1.8 mph', '2.0 mph', '2.3 mph', '2.5 mph', '2.2 mph', '2.0 mph'];
  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % speeds.length;
    speedEl.style.opacity = '0';
    setTimeout(() => { speedEl.textContent = speeds[idx]; speedEl.style.opacity = '1'; }, 200);
  }, 2000);
  speedEl.style.transition = 'opacity 0.2s ease';
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) { e.preventDefault(); const top = target.getBoundingClientRect().top + window.scrollY - 80; window.scrollTo({ top, behavior: 'smooth' }); }
  });
});