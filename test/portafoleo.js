// URL DE TU GOOGLE SHEET (PUBLICADA COMO CSV)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRsnmjygWG6TxoCh01ThLVM5YDD5NOQnMkBgMHxVqc9MF8d2fn1J7LCUyItMoZ-BoGfL5iU0Dw2yLWR/pub?gid=1627775802&single=true&output=csv";

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
});

async function fetchData() {
    const container = document.getElementById('stock-grid');
    
    try {
        // 1. Obtener los datos crudos
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error("No se pudo conectar con Google Sheets");
        
        const textData = await response.text();
        
        // 2. Parsear CSV
        const rows = textData.split('\n').map(row => row.split(','));
        
        // Validaciones iniciales
        if (rows.length < 2) {
            container.innerHTML = '<div class="state-msg">La hoja de datos está vacía o inicializando.</div>';
            return;
        }
        
        // 3. Analizar cabeceras (Fila 0)
        const headers = rows[0];
        const lastColIndex = headers.length - 1;
        
        // Limpiamos comillas y espacios que a veces añade el CSV
        const cleanText = (txt) => txt ? txt.replace(/"/g, '').trim() : "";
        
        // Fecha de la última columna
        const lastDate = cleanText(headers[lastColIndex]);
        
        // Actualizar subtítulo con la fecha real
        if (lastDate && lastDate !== "Estado") {
            document.getElementById('header-date').textContent = `Últimos datos: ${lastDate}`;
        } else {
            document.getElementById('header-date').textContent = "Datos listos";
        }
        
        container.innerHTML = ''; // Limpiar mensaje de carga
        
        // 4. Procesar filas de datos (Desde fila 1)
        let activeCount = 0;
        
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            // Si la fila está rota o vacía, saltar
            if (row.length <= 1) continue;
            
            // Extraer datos clave
            const ticker = cleanText(row[0]); // Columna A
            const estado = cleanText(row[1]); // Columna B (0 o 1)
            
            // Asegurarnos de que estamos leyendo la columna correcta
            if (row.length <= lastColIndex) continue;
            
            // --- MODIFICADO ---
            // Asumimos que la penúltima columna es el CAMBIO
            // y la última es el PRECIO.
            const rawChange = cleanText(row[lastColIndex - 1]); // Penúltima columna
            const rawPrice = cleanText(row[lastColIndex]); // Última columna
            // --- FIN MODIFICADO ---
            
            // --- FILTRO CRÍTICO ---
            // Solo mostramos si Estado es "1" y el ticker tiene nombre
            if (estado !== "1" || !ticker) {
                continue;
            }
            
            activeCount++;
            
            // Formatear precio
            let displayPrice = "---";
            if (rawPrice && !isNaN(parseFloat(rawPrice))) {
                // Formatear como moneda
                displayPrice = `$${parseFloat(rawPrice).toFixed(2)}`;
            } else if (rawPrice === "#N/A") {
                displayPrice = "N/A";
            } else if (rawPrice) {
                // Si es texto (ej. "Error" o "Cargando")
                displayPrice = rawPrice;
            }
            
            // --- NUEVO: Determinar color basado en el cambio ---
            let changeClass = ''; // Clase por defecto (azul/neutro)
            if (rawChange && !isNaN(parseFloat(rawChange))) {
                const changeValue = parseFloat(rawChange);
                if (changeValue > 0) {
                    changeClass = 'price-positive'; // Verde
                } else if (changeValue < 0) {
                    changeClass = 'price-negative'; // Rojo
                }
                // Si es 0, se queda con la clase vacía (usará el azul por defecto)
            }
            // --- FIN NUEVO ---
            
            // Crear tarjeta HTML
            const card = document.createElement('div');
            card.className = 'stock-card';
            // Retraso escalonado para la animación
            card.style.animationDelay = `${activeCount * 0.05}s`;
            
            // Esta estructura HTML coincide con la que espera tu CSS
            // --- MODIFICADO: Se añade la variable changeClass ---
            card.innerHTML = `
                <div class="ticker-group">
                    <div class="ticker-name">${ticker}</div>
                </div>
                <div class="price-group">
                    <div class="price-value ${changeClass}">${displayPrice}</div>
                </div>
            `;
            // --- FIN MODIFICADO ---
            container.appendChild(card);
        }
        
        // Si tras filtrar no queda nada, mostrar mensaje
        if (activeCount === 0) {
            container.innerHTML = '<div class="state-msg">No hay acciones activas configuradas.<br>Revisa la hoja "Config".</div>';
        }
        
    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="state-msg error-msg">Error al cargar datos:<br>${error.message}</div>`;
    }
}