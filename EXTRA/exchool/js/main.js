/**
 * EXCHOOL - Lógica Interactiva del Sitio Web
 * Vanilla JS sin dependencias externas
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initGarmentCatalog();
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

/* 2. Catálogo Interactivo Demo */
const PRENDAS_DEMO = [
  {
    id: 1,
    categoria: 'polos',
    titulo: 'Polo Manga Corta Uniforme Oficial',
    colegio: 'Green Stone British School',
    talla: '8 años',
    estado: 'Como nuevo',
    precio: '12.00 €',
    emoji: '👕',
    color: '#0B1C3A'
  },
  {
    id: 2,
    categoria: 'jerseis',
    titulo: 'Jersey Punto con Escudo Bordado',
    colegio: 'Colegio Peñalar',
    talla: '10 años',
    estado: 'Muy bueno',
    precio: '18.50 €',
    emoji: '🧶',
    color: '#162E59'
  },
  {
    id: 3,
    categoria: 'pantalones',
    titulo: 'Falda Tablas Uniforme de Invierno',
    colegio: 'San Ignacio de Loyola',
    talla: '12 años',
    estado: 'Excelente',
    precio: '15.00 €',
    emoji: '👗',
    color: '#0A2540'
  },
  {
    id: 4,
    categoria: 'pantalones',
    titulo: 'Pantalón Gris Escolar Lana/Poliéster',
    colegio: 'Los Sauces Torrelodones',
    talla: '6 años',
    estado: 'Buen estado',
    precio: '9.00 €',
    emoji: '👖',
    color: '#1E293B'
  },
  {
    id: 5,
    categoria: 'jerseis',
    titulo: 'Sudadera Deporte Oficial con Capucha',
    colegio: 'Colegio Gondomar',
    talla: '14 años',
    estado: 'Como nuevo',
    precio: '14.00 €',
    emoji: '🧥',
    color: '#0F172A'
  },
  {
    id: 6,
    categoria: 'mochilas',
    titulo: 'Mochila Ergonómica Reforzada Infantil',
    colegio: 'CEIP San Martín',
    talla: 'Única',
    estado: 'Muy bueno',
    precio: '0.00 € (Donación)',
    emoji: '🎒',
    color: '#064E3B'
  },
  {
    id: 7,
    categoria: 'polos',
    titulo: 'Camiseta Deporte Cuello Redondo',
    colegio: 'Real Colegio Alfonso XII',
    talla: 'XS',
    estado: 'Como nuevo',
    precio: '8.00 €',
    emoji: '🎽',
    color: '#1E3A8A'
  },
  {
    id: 8,
    categoria: 'mochilas',
    titulo: 'Babi Escolar Infantil Botones Delanteros',
    colegio: 'GSD El Escorial',
    talla: '4 años',
    estado: 'Muy bueno',
    precio: '6.50 €',
    emoji: '🎨',
    color: '#047857'
  }
];

function initGarmentCatalog() {
  const container = document.getElementById('garments-grid');
  const filterPills = document.querySelectorAll('.filter-pill');

  function renderGarments(category = 'todos') {
    if (!container) return;
    container.innerHTML = '';

    const filtradas = category === 'todos' 
      ? PRENDAS_DEMO 
      : PRENDAS_DEMO.filter(p => p.categoria === category);

    filtradas.forEach(p => {
      const card = document.createElement('div');
      card.className = 'garment-card';
      card.innerHTML = `
        <div class="garment-img-wrap" style="background: linear-gradient(135deg, ${p.color} 0%, #0B1C3A 100%);">
          <span class="garment-emoji">${p.emoji}</span>
          <span class="garment-badge-school">🏫 ${p.colegio}</span>
          <span class="garment-badge-price">${p.precio}</span>
        </div>
        <div class="garment-body">
          <div>
            <h4 class="garment-title">${p.titulo}</h4>
            <div class="garment-meta">
              <span>Estado: <strong>${p.estado}</strong></span>
              <span class="garment-tag-size">Talla ${p.talla}</span>
            </div>
          </div>
          <a href="../" class="btn btn-secondary btn-sm btn-block" style="border-color: var(--color-gold); color: #0B1C3A; font-weight: 700;">
            💬 Ver en la App
          </a>
        </div>
      `;
      container.appendChild(card);
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const cat = pill.getAttribute('data-filter');
      renderGarments(cat);
    });
  });

  renderGarments('todos');
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
