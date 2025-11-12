## AGENTS Guide — magolo.NET

Purpose: Give AI assistants and retrieval systems a single, reliable orientation file for this site. It explains scope, canonical URLs, content layout, and indexing best practices.

### Canonical
- Domain: https://www.magolo.net
- Language: es-ES (contenido en español)
- Content type: sitio estático (HTML/CSS); no hay API backend pública.

### Estructura de contenido
- Página principal: `/index.html` (navegación y enlaces a artículos)
- Artículos: `/articles/patrones-arquitectura/*.html`
	- Temas: patrones creacionales, estructurales, de comportamiento, C#.
- Recursos: `/images/**` (imágenes), `style-*.css` (estilos)
- SEO: `sitemap.xml`, `robots.txt`, `CNAME`

### Directrices para agentes/LLMs
- Indexación: usa `sitemap.xml` como fuente de URLs canónicas. Evita rastrear assets estáticos (CSS/imagenes) como contenido.
- Fragmentación (RAG): segmento por secciones H2/H3; conserva títulos, breadcrumbs y enlaces internos.
- Metadatos: respeta `<title>`, `<meta name="description">`, Open Graph, y `og:url` como canónico.
- Idioma: responde en español salvo que el usuario pida otro idioma.
- Estilo: conciso, didáctico; incluye ejemplos de código C# cuando ayuden.
- Citas y enlaces: enlaza a la URL del artículo; usa anclas de encabezados si las hay.

### Convenciones de contenido
- Enlaces relativos desde artículos: `../../index.html` (volver al inicio) y `../../images/...` (activos compartidos).
- URLs públicas en el sitemap: comienzan con `https://www.magolo.net/...`.
- Fechas de actualización: sincroniza `lastmod` en `sitemap.xml` al editar un artículo.

### No hay APIs públicas
Este sitio no expone endpoints ni claves. Cualquier funcionalidad interactiva futura se documentará aquí con esquemas de petición/respuesta.

### Ejemplos de prompt (para asistentes)
- "Resume el artículo y aporta un ejemplo práctico en C#"
- "Compara Singleton vs. Prototype y cuándo usar cada uno"
- "Genera flashcards a partir de las secciones H2 del artículo"

### Salvaguardas
- Evita afirmaciones no sustentadas por el contenido del artículo.
- No inventes APIs ni rutas. Si algo falta, sugiere una mejora de documentación.

### Mantenimiento
- Al añadir/mover artículos, actualiza enlaces internos, `og:url`, y `sitemap.xml` (loc + lastmod).
- Revisa `robots.txt` y que contenga la línea `Sitemap: https://www.magolo.net/sitemap.xml`.

Última actualización: 2025-11-13
