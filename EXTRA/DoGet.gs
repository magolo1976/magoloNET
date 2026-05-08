/**************************************
 * BKI Portfolio API - Apps Script
 * Con caché (CacheService)
 **************************************/

const CONFIG = {
  SHEET_ID: '16lkpPdLcgCaeOw7xBkaZmnCrtEcyHMs1lRYW3lkLnYA',
  DATOS_SHEET: 'Datos',
  ANALISIS_SHEET: 'Analisis',
  API_SECRET: 'bki_2026',
  CACHE_TTL_SECONDS: 180 // 3 min
};

/* ========= Entradas Web App ========= */

function doGet(e) {
  try {
    const apiKey = String((e && e.parameter && e.parameter.apiKey) || '');
    if (CONFIG.API_SECRET && apiKey !== CONFIG.API_SECRET) {
      return jsonOut({ ok: false, error: 'Unauthorized' });
    }

    const budget = toNumSafe((e.parameter && e.parameter.budget), 1000);
    const lambda = toNumSafe((e.parameter && e.parameter.lambda), 0.5);

    return runCoreCached_(budget, lambda);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const apiKey = String(body.apiKey || '');
    if (CONFIG.API_SECRET && apiKey !== CONFIG.API_SECRET) {
      return jsonOut({ ok: false, error: 'Unauthorized' });
    }

    const budget = toNumSafe(body.budget, 1000);
    const lambda = toNumSafe(body.lambda, 0.5);

    return runCoreCached_(budget, lambda);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err.message || err) });
  }
}

/* ========= Core + Caché ========= */

function runCoreCached_(budget, lambda) {
  const cache = CacheService.getScriptCache();
  const key = makeCacheKey_(budget, lambda);

  const cached = cache.get(key);
  if (cached) {
    const payload = JSON.parse(cached);
    payload.meta = payload.meta || {};
    payload.meta.cache = 'hit';
    return jsonOut(payload);
  }

  const payload = runCore_(budget, lambda);
  const serial = JSON.stringify(payload);

  // Cache seguro: solo cacheamos respuestas ok
  if (payload.ok) {
    cache.put(key, serial, CONFIG.CACHE_TTL_SECONDS);
    payload.meta = payload.meta || {};
    payload.meta.cache = 'miss';
  }

  return jsonOut(payload);
}

function makeCacheKey_(budget, lambda) {
  // clave sensible a inputs + versión del algoritmo
  const algoVersion = 'v1';
  return `bki:${algoVersion}:b=${round6_(budget)}:l=${round6_(lambda)}`;
}

/* ========= Núcleo ========= */

function runCore_(budget, lambda) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  const shDatos = ss.getSheetByName(CONFIG.DATOS_SHEET);
  const shAnalisis = ss.getSheetByName(CONFIG.ANALISIS_SHEET);

  if (!shDatos) throw new Error(`No existe hoja "${CONFIG.DATOS_SHEET}"`);
  if (!shAnalisis) throw new Error(`No existe hoja "${CONFIG.ANALISIS_SHEET}"`);

  const datosValues = shDatos.getDataRange().getValues();
  const analisisValues = shAnalisis.getDataRange().getValues();

  if (datosValues.length < 2) throw new Error('Datos vacío o sin filas');
  if (analisisValues.length < 2) throw new Error('Analisis vacío o sin filas');

  const datos = parseDatos_(datosValues);
  const analisis = parseAnalisis_(analisisValues);

  const stockStats = buildStockStats_(datos, analisis);
  if (!stockStats.length) throw new Error('No hay activos válidos para optimizar');

  const result = optimizePortfolio_(stockStats, budget, lambda);
  const history = buildHistory_(result.positions, datos.historicalByTicker);
  const ranking = buildRanking_(result.positions, datos.historicalByTicker);

  // ── Benchmark SP500TR ────────────────────────────────────────────────────
  try {
    const shSP500 = ss.getSheetByName('SP500TR');
    if (shSP500) {
      const lastCol = shSP500.getLastColumn();
      const numDataCols = lastCol - 1; // columnas B..lastCol

      // Fechas: fila 1, desde B1
      const bmDates = shSP500.getRange(1, 2, 1, numDataCols).getValues()[0]
        .map(v => v instanceof Date
          ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'dd/MM/yyyy')
          : String(v).trim());

      // Precio inicial SP500: B2 (apertura del primer día, antes del primer retorno)
      const sp500Init = Number(shSP500.getRange(2, 2).getValue());

      // Retornos absolutos: fila 3, desde C3
      const returns = shSP500.getRange(3, 3, 1, numDataCols - 1).getValues()[0].map(Number);

      // Valor acumulado del benchmark, normalizado al mismo presupuesto
      let cumR = 0;
      const bmValues = [budget]; // primer día = presupuesto inicial
      returns.forEach(r => { cumR += r; bmValues.push(budget * (1 + cumR / sp500Init)); });

      // Comparar fechas por timestamp (ms). Los labels de history pueden venir
      // como Date.toString() si el header del Sheets era un Date object.
      // Usamos un parser flexible que intenta dd/MM/yyyy y luego new Date(s).
      const flexTime_ = s => {
        const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).setHours(0,0,0,0);
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      };

      const bmByTime = new Map();
      bmDates.forEach((d, i) => {
        const t = flexTime_(d);
        if (t !== null) bmByTime.set(t, bmValues[i]);
      });

      const bmAligned = (history.labels || []).map(d => {
        const t = flexTime_(d);
        if (t === null) return null;
        const v = bmByTime.get(t);
        return (v !== undefined && isFiniteNum_(v)) ? round2_(v) : null;
      });

      // Fill: nulls al inicio → budget; nulls al final → último valor conocido.
      let lastKnown = null;
      history.benchmark = bmAligned.map(v => {
        if (v !== null) lastKnown = v;
        return v !== null ? v : (lastKnown !== null ? lastKnown : round2_(budget));
      });
    }
  } catch (e) {
    // SP500TR no disponible → el frontend omite el benchmark
  }
  // ────────────────────────────────────────────────────────────────────────

  return {
    ok: true,
    budget,
    lambda,
    positions: result.positions,
    invested: result.invested,
    cash: Math.max(0, budget - result.invested),
    history,
    ranking,
    meta: {
      total_assets: stockStats.length,
      selected_assets: result.positions.length
    }
  };
}

/* ========= Parseo Datos ========= */

function parseDatos_(values) {
  const headers = values[0].map(String);
  const rows = values.slice(1);

  const tickerIdx = 0;
  const dateStartIdx = 2;

  const dateLabels = headers.slice(dateStartIdx).map(s => String(s).trim());
  const parsedDates = dateLabels.map(parseDateLabelSafe_);

  const validDateCols = [];
  for (let i = 0; i < parsedDates.length; i++) {
    if (parsedDates[i]) validDateCols.push({
      idx: i + dateStartIdx,
      label: dateLabels[i],
      date: parsedDates[i]
    });
  }

  validDateCols.sort((a, b) => a.date.getTime() - b.date.getTime());

  const historicalByTicker = {};
  const latestPriceByTicker = {};
  const muByTicker = {};

  rows.forEach(r => {
    const ticker = String(r[tickerIdx] || '').trim();
    if (!ticker) return;

    const series = [];
    validDateCols.forEach(col => {
      const p = toNum_(r[col.idx]);
      if (isFiniteNum_(p)) {
        series.push({ date: col.label, price: p });
      }
    });

    if (!series.length) return;

    historicalByTicker[ticker] = series;
    latestPriceByTicker[ticker] = series[series.length - 1].price;

    const rets = [];
    for (let i = 1; i < series.length; i++) {
      const prev = series[i - 1].price;
      const curr = series[i].price;
      if (isFiniteNum_(prev) && prev > 0 && isFiniteNum_(curr)) {
        rets.push((curr / prev) - 1);
      }
    }
    muByTicker[ticker] = rets.length ? mean_(rets) : 0;
  });

  return { historicalByTicker, latestPriceByTicker, muByTicker };
}

/* ========= Parseo Analisis ========= */

function parseAnalisis_(values) {
  const headers = values[0].map(h => String(h).trim());
  const rows = values.slice(1);

  const idxTicker = findHeaderIndex_(headers, ['Ticker', 'ticker'], 0);
  const idxMu = findHeaderIndex_(headers, ['MediaRetorno', 'mu', 'media', 'return', 'retorno'], 1);
  const idxVol = findHeaderIndex_(headers, ['Volatilidad', 'vol', 'sigma', 'std'], 2);

  const covCols = {};
  headers.forEach((h, i) => {
    const name = String(h).trim();
    if (!name) return;
    if (i === idxTicker || i === idxMu || i === idxVol) return;
    covCols[name] = i;
  });

  const muByTicker = {};
  const volByTicker = {};
  const covByTicker = {};

  rows.forEach(r => {
    const ticker = String(r[idxTicker] || '').trim();
    if (!ticker) return;

    const mu = toNum_(r[idxMu]);
    const vol = toNum_(r[idxVol]);

    if (isFiniteNum_(mu)) muByTicker[ticker] = mu;
    if (isFiniteNum_(vol)) volByTicker[ticker] = vol;

    const covRow = {};
    Object.keys(covCols).forEach(colTicker => {
      const v = toNum_(r[covCols[colTicker]]);
      if (isFiniteNum_(v)) covRow[colTicker] = v;
    });
    covByTicker[ticker] = covRow;
  });

  return { muByTicker, volByTicker, covByTicker };
}

/* ========= Universo ========= */

function buildStockStats_(datos, analisis) {
  const tickers = Object.keys(datos.latestPriceByTicker);

  const stats = tickers.map(t => {
    const price = datos.latestPriceByTicker[t];
    const mu = isFiniteNum_(analisis.muByTicker[t]) ? analisis.muByTicker[t] : (datos.muByTicker[t] || 0);
    const vol = isFiniteNum_(analisis.volByTicker[t]) ? analisis.volByTicker[t] : 0;
    return { ticker: t, price, mu, vol };
  }).filter(x => isFiniteNum_(x.price) && x.price > 0 && isFiniteNum_(x.mu));

  stats.forEach(s => {
    s.cov = stats.map(s2 => {
      const v = analisis.covByTicker[s.ticker] && analisis.covByTicker[s.ticker][s2.ticker];
      if (isFiniteNum_(v)) return v;
      if (s.ticker === s2.ticker && isFiniteNum_(s.vol) && s.vol > 0) return s.vol * s.vol;
      return 0;
    });
  });

  return stats;
}

/* ========= Optimización ========= */

function optimizePortfolio_(stockStats, budget, lambda) {
  let remaining = budget;
  const portfolio = stockStats.map(s => ({
    ticker: s.ticker,
    price: s.price,
    mu: s.mu,
    cov: s.cov,
    qty: 0
  }));

  let invested = 0;

  while (true) {
    let bestScore = -Infinity;
    let bestIdx = -1;

    for (let i = 0; i < portfolio.length; i++) {
      const s = portfolio[i];
      if (remaining < s.price) continue;

      const addedReturn = s.price * s.mu;

      let addedRisk = 0;
      for (let j = 0; j < portfolio.length; j++) {
        const s2 = portfolio[j];
        addedRisk += 2 * (portfolio[i].qty + 1) * s.price * portfolio[j].qty * s2.price * s.cov[j];
      }
      addedRisk += Math.pow(s.price, 2) * s.cov[i];

      const score = addedReturn - (lambda * addedRisk / Math.max(1, budget));
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    portfolio[bestIdx].qty += 1;
    remaining -= portfolio[bestIdx].price;
    invested += portfolio[bestIdx].price;
  }

  const positions = portfolio
    .filter(p => p.qty > 0)
    .map(p => ({
      ticker: p.ticker,
      qty: p.qty,
      price: round2_(p.price),
      value: round2_(p.qty * p.price)
    }));

  return { positions, invested: round2_(invested) };
}

/* ========= History ========= */

function buildHistory_(positions, historicalByTicker) {
  const tickers = positions.map(p => p.ticker);
  const dateSet = {};

  tickers.forEach(t => {
    const s = historicalByTicker[t] || [];
    s.forEach(pt => { dateSet[pt.date] = true; });
  });

  const labels = Object.keys(dateSet).sort((a, b) => {
    const da = parseDateLabelSafe_(a);
    const db = parseDateLabelSafe_(b);
    return da.getTime() - db.getTime();
  });

  const assets = {};
  tickers.forEach(t => {
    const map = {};
    (historicalByTicker[t] || []).forEach(pt => { map[pt.date] = pt.price; });
    assets[t] = labels.map(d => isFiniteNum_(map[d]) ? round6_(map[d]) : null);
  });

  const qtyByTicker = {};
  positions.forEach(p => qtyByTicker[p.ticker] = p.qty);

  const portfolio = labels.map(d => {
    let total = 0;
    let hasAny = false;

    tickers.forEach(t => {
      const arr = historicalByTicker[t] || [];
      const pt = arr.find(x => x.date === d);
      if (pt && isFiniteNum_(pt.price)) {
        total += qtyByTicker[t] * pt.price;
        hasAny = true;
      }
    });

    return hasAny ? round2_(total) : null;
  });

  return { labels, portfolio, assets };
}

function buildRanking_(positions, historicalByTicker) {
  return positions.map(p => {
    const s = historicalByTicker[p.ticker] || [];
    let change = 0;
    if (s.length >= 2) {
      const first = s[0].price;
      const last = s[s.length - 1].price;
      if (isFiniteNum_(first) && first > 0 && isFiniteNum_(last)) {
        change = ((last - first) / first) * 100;
      }
    }

    return {
      ticker: p.ticker,
      value: round2_(p.value),
      change: round2_(change)
    };
  });
}

/* ========= Utils ========= */

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function toNum_(v) {
  if (v === null || v === undefined) return NaN;
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace(/\s/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
function toNumSafe(v, fallback) {
  const n = toNum_(v);
  return Number.isFinite(n) ? n : fallback;
}
function isFiniteNum_(v) {
  return typeof v === 'number' && Number.isFinite(v);
}
function mean_(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function round2_(n) {
  return Math.round(n * 100) / 100;
}
function round6_(n) {
  return Math.round(n * 1e6) / 1e6;
}
function parseDateLabelSafe_(s) {
  const m = String(s || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return new Date('1970-01-01');
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}
function findHeaderIndex_(headers, aliases, fallback) {
  const norm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hs = headers.map(h => norm(h));
  for (const a of aliases) {
    const i = hs.indexOf(norm(a));
    if (i >= 0) return i;
  }
  return fallback;
}