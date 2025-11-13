// TU URL DEL CSV AQUÍ
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRsnmjygWG6TxoCh01ThLVM5YDD5NOQnMkBgMHxVqc9MF8d2fn1J7LCUyItMoZ-BoGfL5iU0Dw2yLWR/pub?gid=1627775802&single=true&output=csv";

document.addEventListener("DOMContentLoaded", () => {
    fetchData();
});

async function fetchData() {
    const container = document.getElementById('stock-list');
    
    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error("Error de conexión");
        
        const data = await response.text();
        // Dividimos filas y columnas
        const rows = data.split('\n').map(row => row.split(','));
        
        if (rows.length < 2) {
            container.innerHTML = '<div class="error">Esperando datos...</div>';
            return;
        }

        // ESTRUCTURA DEL CSV:
        // Col 0: Ticker
        // Col 1: Estado (1 o 0)
        // Col ...: Fechas
        // Col Última: Precio de Hoy

        const headers = rows[0];
        const lastColIndex = headers.length - 1;
        const lastUpdateDate = headers[lastColIndex].replace(/"/g, ''); // Limpiar comillas

        container.innerHTML = ''; // Limpiar carga

        // Empezamos en i=1 para saltar cabeceras
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length <= 1) continue;

            const ticker = row[0].replace(/"/g, '').trim();
            const estado = row[1].replace(/"/g, '').trim(); // COLUMNA B
            const precioRaw = row[lastColIndex].replace(/"/g, '').trim();

            // FILTRO MAESTRO:
            // Solo mostramos si Estado es "1"
            if (estado !== "1") {
                continue; 
            }

            // Si es "1", renderizamos la tarjeta
            let precioDisplay = precioRaw;
            if (!isNaN(parseFloat(precioRaw)) && precioRaw !== "") {
                precioDisplay = `$${parseFloat(precioRaw).toFixed(2)}`;
            } else {
                precioDisplay = "Cargando..."; // Por si acaso falló la carga ese día
            }

            const card = document.createElement('div');
            card.className = 'stock-card';
            card.innerHTML = `
                <div class="ticker">${ticker}</div>
                <div class="price-info">
                    <div class="price">${precioDisplay}</div>
                    <div class="date">${lastUpdateDate}</div>
                </div>
            `;
            container.appendChild(card);
        }
        
        // Mensaje si no hay nada activo
        if (container.children.length === 0) {
            container.innerHTML = '<div class="loading">No hay acciones activas.</div>';
        }

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}