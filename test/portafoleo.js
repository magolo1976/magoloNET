// URL DE TU GOOGLE SHEET (PUBLICADA COMO CSV)
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRsnmjygWG6TxoCh01ThLVM5YDD5NOQnMkBgMHxVqc9MF8d2fn1J7LCUyItMoZ-BoGfL5iU0Dw2yLWR/pub?gid=2022586956&single=true&output=csv";

// Función helper para limpiar y parsear precios
const cleanText = (txt) => txt ? txt.replace(/"/g, '').trim() : "";
const cleanPrice = (txt) => {
    if (!txt) return null;
    const cleaned = cleanText(txt);
    if (cleaned === "" || isNaN(parseFloat(cleaned))) {
        return null;
    }
    return parseFloat(cleaned);
};

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
});

async function fetchData() {
    const container = document.getElementById('stock-grid');
    
    try {
        // Añadimos un timestamp a la URL para evitar caché
        const response = await fetch(`${SHEET_URL}&t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("No se pudo conectar con Google Sheets");
        
        const textData = await response.text();
        // \r\n es más robusto para saltos de línea de Windows/CSV
        const rows = textData.split(/\r?\n/).map(row => row.split(','));

        if (rows.length < 2) {
            container.innerHTML = '<div class="state-msg">La hoja de datos está vacía.</div>';
            return;
        }

        // Analizar cabeceras (Fila 0)
        const headers = rows[0];
        const lastColIndex = headers.length - 1; // Índice de la última columna
        
        // ---- ¡CAMBIO IMPORTANTE AQUÍ! ----
        // El historial de precios empieza en la Columna D (índice 3)
        // A=0 (Ticker), B=1 (Estado), C=2 (¡Sumatorio! -> IGNORAR)
        const firstDataColIndex = 3; 

        const lastUpdateDate = cleanText(headers[lastColIndex]);
        document.getElementById('header-date').textContent = `Últimos datos: ${lastUpdateDate}`;

        container.innerHTML = ''; 
        let activeCount = 0;

        // Procesar filas de datos (Desde fila 1)
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length <= 1) continue;

            const ticker = cleanText(row[0]);   // Columna A (Índice 0)
            const estado = cleanText(row[1]);   // Columna B (Índice 1)

            // --- FILTRO CRÍTICO ---
            if (estado !== "1" || ticker === "") {
                continue;
            }

            activeCount++;

            // --- NUEVA LÓGICA DE CÁLCULO ---
            
            // 1. Encontrar el ÚLTIMO precio
            const lastPrice = cleanPrice(row[lastColIndex]);

            // 2. Encontrar el PRIMER precio
            let firstPrice = null;
            let firstPriceIndex = -1;
            
            // Bucle corregido: empieza en firstDataColIndex (3)
            for (let j = firstDataColIndex; j <= lastColIndex; j++) {
                const price = cleanPrice(row[j]);
                if (price !== null) {
                    firstPrice = price;
                    firstPriceIndex = j;
                    break; // Encontramos el primero, paramos
                }
            }

            // 3. Determinar qué mostrar
            let displayValue = "---";
            let subText = "Sin datos";
            let colorClass = "color-neutral"; // Azul por defecto

            if (lastPrice === null) {
                // Caso: Sin precio hoy (raro, pero posible)
                displayValue = "---";
                subText = "Sin datos hoy";
            } else if (firstPrice === null || firstPriceIndex === lastColIndex) {
                // Caso: Es el PRIMER dato (Azul)
                displayValue = `$${lastPrice.toFixed(2)}`;
                subText = "Dato inicial";
                colorClass = "color-neutral";
            } else {
                // Caso: Hay historial para comparar
                const diff = lastPrice - firstPrice;
                
                if (diff > 0) {
                    displayValue = `+$${diff.toFixed(2)}`;
                    colorClass = "color-positive"; // Verde
                } else if (diff < 0) {
                    displayValue = `-$${Math.abs(diff).toFixed(2)}`;
                    colorClass = "color-negative"; // Rojo
                } else {
                    displayValue = `$${diff.toFixed(2)}`;
                    colorClass = "color-neutral"; // Azul/Neutro si es 0.00
                }
                subText = `vs $${firstPrice.toFixed(2)} inicial`;
            }
            
            // 4. Crear la tarjeta
            const card = document.createElement('div');
            card.className = 'stock-card';
            card.style.animationDelay = `${activeCount * 0.05}s`;
            
            card.innerHTML = `
                <div class="ticker-group">
                    <div class="ticker-name">${ticker}</div>
                </div>
                <div class="price-group">
                    <div class="price-value ${colorClass}">${displayValue}</div>
                    <div class="last-update">${subText}</div>
                </div>
            `;
            container.appendChild(card);
        }

        if (activeCount === 0) {
            container.innerHTML = '<div class="state-msg">No hay acciones activas configuradas.</div>';
        }

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="state-msg error-msg">Error al cargar datos:<br>${error.message}</div>`;
    }
}