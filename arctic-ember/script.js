const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 70);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

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

document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

function animateTemp(element, target, unit) {
  let current = parseFloat(element.textContent) || 0;
  const step = (target - current) / 40;
  let frame = 0;
  const interval = setInterval(() => {
    current += step;
    frame++;
    element.textContent = Math.round(current) + unit;
    if (frame >= 40) { element.textContent = target + unit; clearInterval(interval); }
  }, 30);
}

const heroSection = document.querySelector('.hero');
const heroObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    setTimeout(() => {
      document.querySelectorAll('.plunge-temp').forEach(el => animateTemp(el, 38, '°F'));
      document.querySelectorAll('.sauna-temp').forEach(el => animateTemp(el, 140, '°F'));
    }, 800);
    heroObserver.disconnect();
  }
}, { threshold: 0.3 });
if (heroSection) heroObserver.observe(heroSection);