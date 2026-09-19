/**
 * EXCHOOL - Lógica Interactiva del Sitio Web
 * Vanilla JS sin dependencias externas
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMockupFavs();
  initFaqAccordion();
});

/* 1. Barra de Navegación & Scroll */
function initNavbar() {
  const header = document.querySelector('.site-header');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
      const isOpen = navLinks.classList.contains('mobile-open');
      mobileToggle.textContent = isOpen ? '✕' : '☰';
    });

    // Cerrar menú móvil al hacer clic en un enlace
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
        mobileToggle.textContent = '☰';
      });
    });
  }
}

/* 2. Soporte interactivo para botones favoritos en maquetas */
function initMockupFavs() {
  document.querySelectorAll('.mockup-btn-fav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const esFav = btn.textContent.trim() === '❤️';
      btn.textContent = esFav ? '🤍' : '❤️';
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => { btn.style.transform = ''; }, 200);
    });
  });
}

/* 4. Acordeón de Preguntas Frecuentes (FAQ) */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isCurrentActive = item.classList.contains('active');
        // Cerrar otros
        faqItems.forEach(i => i.classList.remove('active'));
        if (!isCurrentActive) {
          item.classList.add('active');
        }
      });
    }
  });
}
