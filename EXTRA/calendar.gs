/**
 * Versión OPTIMIZADA para evitar el error de tiempo de ejecución.
 * Rellena histórico semanal de forma masiva.
 */
function normalizarFechaHoja_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor.getTime())) {
    return new Date(valor.getTime());
  }

  if (typeof valor === 'number' && !isNaN(valor)) {
    const fechaNumero = new Date(valor);
    return isNaN(fechaNumero.getTime()) ? null : fechaNumero;
  }

  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (!texto) return null;

    const matchEs = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (matchEs) {
      const dia = Number(matchEs[1]);
      const mes = Number(matchEs[2]) - 1;
      const anio = Number(matchEs[3]);
      const fechaEs = new Date(anio, mes, dia);
      if (fechaEs.getFullYear() === anio && fechaEs.getMonth() === mes && fechaEs.getDate() === dia) {
        return fechaEs;
      }
    }

    const fechaTexto = new Date(texto);
    return isNaN(fechaTexto.getTime()) ? null : fechaTexto;
  }

  return null;
}

function completarHistoricoSemanal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName("Datos");
  
  if (!hoja) return;

  const hoy = new Date();
  const milisegundosSemana = 7 * 24 * 60 * 60 * 1000;

  // --- 1. ACTUALIZAR CABECERAS (Igual que antes, es rápido) ---
  let ultimaCol = hoja.getLastColumn();
  let ultimaFechaCargada;

  if (ultimaCol < 3) {
    ultimaFechaCargada = new Date(hoy.getTime() - (milisegundosSemana * 4));
    ultimaCol = 2; 
  } else {
    ultimaFechaCargada = normalizarFechaHoja_(hoja.getRange(1, ultimaCol).getValue());
    if (!ultimaFechaCargada) {
      ultimaFechaCargada = new Date(hoy.getTime() - (milisegundosSemana * 4));
      ultimaCol = Math.max(2, ultimaCol - 1);
    }
  }

  let proximaFecha = new Date(ultimaFechaCargada.getTime() + milisegundosSemana);
  while (proximaFecha <= hoy) {
    ultimaCol++;
    hoja.getRange(1, ultimaCol).setValue(proximaFecha).setNumberFormat("dd/MM/yyyy");
    proximaFecha = new Date(proximaFecha.getTime() + milisegundosSemana);
  }

  // --- 2. PROCESAMIENTO MASIVO (Aquí está la optimización) ---
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) return;

  // Leemos TODA la tabla de una vez (desde Col C hasta la última)
  const numFilas = ultimaFila - 1;
  const numCols = ultimaCol - 2;
  const rangoDatos = hoja.getRange(2, 3, numFilas, numCols);
  const valoresActuales = rangoDatos.getValues();
  const tickers = hoja.getRange(2, 1, numFilas, 1).getValues();
  const fechasHeaders = hoja.getRange(1, 3, 1, numCols).getValues()[0];

  // Creamos una matriz de fórmulas/valores en memoria
  const nuevaMatriz = [];

  for (let i = 0; i < numFilas; i++) {
    const filaNueva = [];
    const ticker = tickers[i][0];

    for (let j = 0; j < numCols; j++) {
      const valorCelda = valoresActuales[i][j];
      
      // Si la celda está vacía, preparamos la fórmula
      if (valorCelda === "" && ticker !== "") {
        const f = normalizarFechaHoja_(fechasHeaders[j]);
        if (!f) {
          filaNueva.push(valorCelda);
          continue;
        }
        const fechaFormula = `DATE(${f.getFullYear()};${f.getMonth()+1};${f.getDate()})`;
        filaNueva.push(`=IFERROR(INDEX(GOOGLEFINANCE("${ticker}"; "price"; ${fechaFormula}); 2; 2); "")`);
      } else {
        // Si ya tiene dato, mantenemos el valor actual
        filaNueva.push(valorCelda);
      }
    }
    nuevaMatriz.push(filaNueva);
  }

  // ESCRIBIMOS TODA LA MATRIZ DE GOLPE
  rangoDatos.setFormulas(nuevaMatriz);

  // --- 3. CONGELAR DATOS ---
  // Damos 5 segundos para que Google calcule las fórmulas nuevas
  SpreadsheetApp.flush();
  Utilities.sleep(5000); 

  // Convertimos todo a valores estáticos para ahorrar recursos
  const resultadosFinales = rangoDatos.getValues();
  rangoDatos.setValues(resultadosFinales);
  
  console.log("Sincronización masiva completada.");
}