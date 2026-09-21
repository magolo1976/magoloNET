/**
 * EXCHOOL — Landing Page v3.0
 * Premium interactions: scroll reveals, animated counters,
 * testimonials carousel, particle effect, smooth navigation
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initRevealOnScroll();
  initAnimatedCounters();
  initTestimonialsCarousel();
  initMockupFavs();
  initParticles();
  initSmoothScrollLinks();
});

/* ============================================================
   1. NAVBAR — Glass effect on scroll + hamburger
   ============================================================ */
function initNavbar() {
  const header = document.getElementById('nav-header');
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks = document.getElementById('nav-links');
  const allLinks = navLinks ? navLinks.querySelectorAll('.nav__link') : [];

  // Scroll class
  function onScroll() {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Update active link
    const sections = document.querySelectorAll('section[id]');
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 100;
      if (scrollY >= top) {
        current = section.getAttribute('id');
      }
    });
    allLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // Initial check

  // Hamburger
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('mobile-open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    allLinks.forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }
}

/* ============================================================
   2. SCROLL REVEAL — Intersection Observer powered
   ============================================================ */
function initRevealOnScroll() {
  const elements = document.querySelectorAll('.reveal-up');
  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ============================================================
   3. ANIMATED COUNTERS — Smooth count-up
   ============================================================ */
function initAnimatedCounters() {
  const counters = document.querySelectorAll('[data-target]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
}

function animateCounter(el) {
  const target = parseInt(el.dataset.target);
  const duration = 2000;
  const start = performance.now();

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress);
    const current = Math.round(eased * target);

    el.textContent = current.toLocaleString('es-ES');

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/* ============================================================
   4. TESTIMONIALS CAROUSEL
   ============================================================ */
function initTestimonialsCarousel() {
  const track = document.getElementById('testimonials-track');
  const prevBtn = document.getElementById('testimonials-prev');
  const nextBtn = document.getElementById('testimonials-next');
  const dotsContainer = document.getElementById('testimonials-dots');

  if (!track || !prevBtn || !nextBtn || !dotsContainer) return;

  const cards = track.querySelectorAll('.testimonial');
  let currentIndex = 0;
  let cardsPerView = getCardsPerView();

  function getCardsPerView() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 3;
  }

  const totalPages = Math.ceil(cards.length / cardsPerView);

  // Create dots
  function createDots() {
    dotsContainer.innerHTML = '';
    const pages = Math.ceil(cards.length / cardsPerView);
    for (let i = 0; i < pages; i++) {
      const dot = document.createElement('div');
      dot.className = 'testimonials__dot' + (i === currentIndex ? ' active' : '');
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  function goTo(index) {
    const pages = Math.ceil(cards.length / cardsPerView);
    currentIndex = Math.max(0, Math.min(index, pages - 1));
    const cardWidth = cards[0].getBoundingClientRect().width + 24; // gap
    track.style.transform = `translateX(-${currentIndex * cardsPerView * cardWidth}px)`;
    updateDots();
  }

  function updateDots() {
    dotsContainer.querySelectorAll('.testimonials__dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

  createDots();

  // Auto-play
  let autoplay = setInterval(() => {
    const pages = Math.ceil(cards.length / cardsPerView);
    goTo((currentIndex + 1) % pages);
  }, 5000);

  track.addEventListener('mouseenter', () => clearInterval(autoplay));
  track.addEventListener('mouseleave', () => {
    autoplay = setInterval(() => {
      const pages = Math.ceil(cards.length / cardsPerView);
      goTo((currentIndex + 1) % pages);
    }, 5000);
  });

  // Handle resize
  window.addEventListener('resize', () => {
    cardsPerView = getCardsPerView();
    createDots();
    goTo(0);
  });
}

/* ============================================================
   5. MOCKUP FAVORITES INTERACTION
   ============================================================ */
function initMockupFavs() {
  document.querySelectorAll('.mockup-card__fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isFav = btn.textContent.trim() === '❤️';
      btn.textContent = isFav ? '🤍' : '❤️';
      btn.style.transform = 'scale(1.4)';
      setTimeout(() => { btn.style.transform = ''; }, 250);
    });
  });
}

/* ============================================================
   6. CTA PARTICLE EFFECT
   ============================================================ */
function initParticles() {
  const container = document.getElementById('cta-particles');
  if (!container) return;

  // Create floating particle dots
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    const size = Math.random() * 4 + 2;
    particle.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      background: rgba(212, 169, 23, ${Math.random() * 0.3 + 0.1});
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation: particleFloat ${Math.random() * 6 + 4}s ease-in-out infinite;
      animation-delay: ${Math.random() * 4}s;
    `;
    container.appendChild(particle);
  }

  // Add keyframe dynamically
  if (!document.querySelector('#particle-keyframes')) {
    const style = document.createElement('style');
    style.id = 'particle-keyframes';
    style.textContent = `
      @keyframes particleFloat {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
        25% { transform: translate(${Math.random() * 40 - 20}px, -${Math.random() * 30 + 10}px) scale(1.2); opacity: 1; }
        50% { transform: translate(${Math.random() * 60 - 30}px, -${Math.random() * 50 + 20}px) scale(0.8); opacity: 0.7; }
        75% { transform: translate(${Math.random() * 40 - 20}px, -${Math.random() * 20 + 5}px) scale(1.1); opacity: 0.9; }
      }
    `;
    document.head.appendChild(style);
  }
}

/* ============================================================
   7. SMOOTH SCROLL FOR ALL HASH LINKS
   ============================================================ */
function initSmoothScrollLinks() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
