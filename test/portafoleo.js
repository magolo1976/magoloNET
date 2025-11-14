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
            // Leemos el precio ANTERIOR (penúltima) y el NUEVO (última)
            const rawPreviousPrice = cleanText(row[lastColIndex - 1]); // Penúltima columna
            const rawNewPrice = cleanText(row[lastColIndex]); // Última columna
            // --- FIN MODIFICADO ---
            
            // --- FILTRO CRÍTICO ---
            // Solo mostramos si Estado es "1" y el ticker tiene nombre
            if (estado !== "1" || !ticker) {
                continue;
            }
            
            activeCount++;
            
            // --- MODIFICADO: Formatear precio ---
            // Limpiamos la coma del precio nuevo (ej. 150,50 -> 150.50)
            const cleanNewPrice = rawNewPrice.replace(',', '.');
            
            let displayPrice = "---";
            if (rawNewPrice && !isNaN(parseFloat(cleanNewPrice))) {
                // Formatear como moneda
                displayPrice = `$${parseFloat(cleanNewPrice).toFixed(2)}`;
            } else if (rawNewPrice === "#N/A") {
                displayPrice = "N/A";
            } else if (rawNewPrice) {
                // Si es texto (ej. "Error" o "Cargando")
                displayPrice = rawNewPrice;
            }
            // --- FIN MODIFICADO ---
            
            
            // --- MODIFICADO: Determinar color basado en el CÁLCULO ---
            let changeClass = ''; // Clase por defecto (azul/neutro)
            
            // Limpiamos comas de ambos valores
            const cleanPrevious = rawPreviousPrice.replace(',', '.');
            const cleanNew = rawNewPrice.replace(',', '.');
            
            // Convertimos a números
            const previousPrice = parseFloat(cleanPrevious);
            const newPrice = parseFloat(cleanNew);
            
            // Solo calculamos si AMBOS son números válidos
            if (!isNaN(previousPrice) && !isNaN(newPrice)) {
                const changeValue = newPrice - previousPrice;
                
                if (changeValue > 0) {
                    changeClass = 'price-positive'; // Verde
                } else if (changeValue < 0) {
                    changeClass = 'price-negative'; // Rojo
                }
                // Si es 0, se queda con la clase vacía (usará el azul por defecto)
            }
            // --- FIN MODIFICADO ---
            
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