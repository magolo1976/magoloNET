/**************************************
 * Marcelo Calendar API (Apps Script)
 * Hoja única: columnas A=fecha, B=texto, C=updated_at, D=color
 **************************************/

const CONFIG = {
  SHEET_ID: '11iSha11HzmNOaQ-XJvOPVtJSK4MLQVq24ZS1zXL-RzQ',
  SHEET_NAME: 'Calendar',
  RECURRING_SHEET: 'Recurrentes',
  API_SECRET: '' // vacío = público
};

function doGet(e) {
  try {
    const apiKey = String((e && e.parameter && e.parameter.apiKey) || '');
    if (CONFIG.API_SECRET && apiKey !== CONFIG.API_SECRET) {
      return jsonOut({ ok: false, error: 'Unauthorized' });
    }

    const action = String((e && e.parameter && e.parameter.action) || 'list');
    if (action !== 'list') {
      return jsonOut({ ok: false, error: 'Acción GET no soportada' });
    }

    const year = Number((e && e.parameter && e.parameter.year) || new Date().getFullYear());
    return listByYear_(year);
  } catch (err) {
    return jsonOut({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = parseBody_(e);
    const apiKey = String(body.apiKey || '');
    if (CONFIG.API_SECRET && apiKey !== CONFIG.API_SECRET) {
      return jsonOut({ ok: false, error: 'Unauthorized' });
    }

    const action = String(body.action || '');
    if (action === 'list') {
      const year = Number(body.year || new Date().getFullYear());
      return listByYear_(year);
    }
    if (action === 'listRecurring') {
      return listRecurring_();
    }
    if (action === 'upsertRecurring') {
      return upsertRecurring_(body);
    }
    if (action === 'deleteRecurring') {
      return deleteRecurring_(body);
    }
    if (action === 'upsert') {
      return upsert_(body);
    }
    if (action === 'delete') {
      return delete_(body);
    }

    return jsonOut({ ok: false, error: 'Acción POST no soportada' });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err.message || err) });
  }
}

function parseBody_(e) {
  const fallback = {};
  const raw = (e && e.postData && e.postData.contents) || '';
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      // no-op: quizás vino como form-urlencoded
    }
  }

  const p = (e && e.parameter) || fallback;
  return {
    action: String(p.action || ''),
    year: String(p.year || ''),
    fecha: String(p.fecha || ''),
    endDate: String(p.endDate || ''),
    monthDay: String(p.monthDay || ''),
    texto: String(p.texto || ''),
    color: String(p.color || ''),
    active: String(p.active || ''),
    recurring: String(p.recurring || ''),
    deleteRecurring: String(p.deleteRecurring || ''),
    apiKey: String(p.apiKey || '')
  };
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sh = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sh) sh = ss.insertSheet(CONFIG.SHEET_NAME);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 4).setValues([['fecha', 'texto', 'updated_at', 'color']]);
  }
  return sh;
}

function getRecurringSheet_() {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sh = ss.getSheetByName(CONFIG.RECURRING_SHEET);
  if (!sh) sh = ss.insertSheet(CONFIG.RECURRING_SHEET);

  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 5).setValues([['mes_dia', 'texto', 'color', 'active', 'updated_at']]);
  }
  return sh;
}

function normalizeDate_(value) {
  const s = toDateKey_(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error('Fecha inválida. Formato requerido: YYYY-MM-DD');
  }
  return s;
}

function toDateKey_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  const s = String(value || '').trim();
  if (!s) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }

  return '';
}

function normalizeMonthDay_(value) {
  const s = String(value || '').trim();
  if (!s) return '';

  if (/^\d{2}-\d{2}$/.test(s)) return s;

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slash) {
    return `${String(slash[2]).padStart(2, '0')}-${String(slash[1]).padStart(2, '0')}`;
  }

  const dash = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (dash) {
    return `${String(dash[1]).padStart(2, '0')}-${String(dash[2]).padStart(2, '0')}`;
  }

  return '';
}

function isValidDateKey_(key) {
  const m = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && (dt.getMonth() + 1) === mo && dt.getDate() === d;
}

function parseBool_(v, fallback) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return fallback;
  if (['1', 'true', 'si', 'sí', 'yes', 'y', 'on'].indexOf(s) >= 0) return true;
  if (['0', 'false', 'no', 'n', 'off'].indexOf(s) >= 0) return false;
  return fallback;
}

function findRowByDate_(sheet, fecha) {
  const lr = sheet.getLastRow();
  if (lr < 2) return -1;
  const colA = sheet.getRange(2, 1, lr - 1, 1).getValues().flat();
  for (let i = 0; i < colA.length; i++) {
    if (toDateKey_(colA[i]) === fecha) return i + 2;
  }
  return -1;
}

function findRecurringRowByMonthDay_(sheet, monthDay) {
  const lr = sheet.getLastRow();
  if (lr < 2) return -1;
  const colA = sheet.getRange(2, 1, lr - 1, 1).getValues().flat();
  for (let i = 0; i < colA.length; i++) {
    if (normalizeMonthDay_(colA[i]) === monthDay) return i + 2;
  }
  return -1;
}

function listDateRange_(startDate, endDate) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    throw new Error('Rango de fechas inválido');
  }

  const out = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    out.push(Utilities.formatDate(cursor, Session.getScriptTimeZone(), 'yyyy-MM-dd'));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function listByYear_(year) {
  const y = Number(year);
  if (!Number.isFinite(y) || y < 2000 || y > 2500) {
    throw new Error('Año inválido');
  }

  const sh = getSheet_();
  const lr = sh.getLastRow();
  const rows = lr >= 2 ? sh.getRange(2, 1, lr - 1, 4).getValues() : [];
  const prefix = String(y) + '-';

  const registrosBase = rows
    .map(r => ({
      fecha: toDateKey_(r[0]),
      texto: String(r[1] || '').trim(),
      color: String(r[3] || r[2] || '').trim()
    }))
    .filter(r => r.fecha.startsWith(prefix) && r.texto && r.color);

  const recurringVirtual = buildRecurringVirtualForYear_(y);

  // Regla: Calendar (manual) tiene prioridad sobre recurrente en la misma fecha
  const map = new Map();
  recurringVirtual.registros.forEach(function(r) { map.set(r.fecha, r); });
  registrosBase.forEach(function(r) { map.set(r.fecha, r); });

  const registros = Array.from(map.values()).sort(function(a, b) {
    return String(a.fecha).localeCompare(String(b.fecha));
  });

  return jsonOut({ ok: true, registros: registros, reservas: registros, recurring: recurringVirtual.meta });
}

function buildRecurringVirtualForYear_(year) {
  const recSheet = getRecurringSheet_();
  const recLr = recSheet.getLastRow();
  if (recLr < 2) return { registros: [], meta: { applied: 0, checked: 0, virtual: true } };

  const rows = recSheet.getRange(2, 1, recLr - 1, 4).getValues(); // mes_dia,texto,color,active
  const registros = [];
  let checked = 0;

  rows.forEach(function(r) {
    const monthDay = normalizeMonthDay_(r[0]);
    const texto = String(r[1] || '').trim();
    const color = String(r[2] || '').trim();
    const active = parseBool_(r[3], true);

    if (!active || !monthDay || !texto || !color) return;

    const fecha = `${year}-${monthDay}`;
    if (!isValidDateKey_(fecha)) return;

    checked++;
    registros.push({ fecha: fecha, texto: texto, color: color });
  });

  return {
    registros: registros,
    meta: {
      applied: registros.length,
      checked: checked,
      virtual: true
    }
  };
}

function listRecurring_() {
  const sh = getRecurringSheet_();
  const lr = sh.getLastRow();
  if (lr < 2) return jsonOut({ ok: true, recurrentes: [] });

  const rows = sh.getRange(2, 1, lr - 1, 4).getValues();
  const recurrentes = rows
    .map(function(r) {
      return {
        monthDay: normalizeMonthDay_(r[0]),
        texto: String(r[1] || '').trim(),
        color: String(r[2] || '').trim(),
        active: parseBool_(r[3], true)
      };
    })
    .filter(function(x) { return x.monthDay && x.texto && x.color; });

  return jsonOut({ ok: true, recurrentes: recurrentes });
}

function upsertRecurring_(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const monthDay = normalizeMonthDay_(body.monthDay);
    const texto = String(body.texto || '').trim();
    const color = String(body.color || '').trim();
    const active = parseBool_(body.active, true);

    if (!monthDay) throw new Error('monthDay inválido. Usa MM-DD');
    if (!texto) throw new Error('Texto vacío');
    if (!color) throw new Error('Color vacío');

    const sh = getRecurringSheet_();
    const row = findRecurringRowByMonthDay_(sh, monthDay);

    if (row > 0) {
      sh.getRange(row, 2, 1, 4).setValues([[texto, color, active, new Date()]]);
      return jsonOut({ ok: true, mode: 'update', row: row, monthDay: monthDay });
    }

    sh.appendRow([monthDay, texto, color, active, new Date()]);
    return jsonOut({ ok: true, mode: 'insert', monthDay: monthDay });
  } finally {
    lock.releaseLock();
  }
}

function deleteRecurring_(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const monthDay = normalizeMonthDay_(body.monthDay);
    if (!monthDay) throw new Error('monthDay inválido. Usa MM-DD');

    const sh = getRecurringSheet_();
    const row = findRecurringRowByMonthDay_(sh, monthDay);
    if (row > 0) {
      sh.getRange(row, 2, 1, 4).clearContent();
      return jsonOut({ ok: true, mode: 'cleared', row: row, monthDay: monthDay });
    }

    return jsonOut({ ok: true, mode: 'not_found', monthDay: monthDay });
  } finally {
    lock.releaseLock();
  }
}

function upsert_(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const fecha = normalizeDate_(body.fecha);
    const endDate = normalizeDate_(body.endDate || body.fecha);
    const texto = String(body.texto || '').trim();
    const color = String(body.color || '').trim();
    const useRecurring = parseBool_(body.recurring, false);

    if (!texto) throw new Error('Texto vacío');
    if (!color) throw new Error('Color vacío');

    const dates = listDateRange_(fecha, endDate);
    let affected = 0;
    let recurringSaved = 0;

    if (!useRecurring) {
      const sh = getSheet_();
      dates.forEach(function(currentDate) {
        const row = findRowByDate_(sh, currentDate);
        if (row > 0) {
          sh.getRange(row, 2, 1, 3).setValues([[texto, new Date(), color]]);
        } else {
          sh.appendRow([currentDate, texto, new Date(), color]);
        }
        affected++;
      });
    }

    if (useRecurring) {
      const recSheet = getRecurringSheet_();
      dates.forEach(function(currentDate) {
        const monthDay = currentDate.slice(5);
        const recRow = findRecurringRowByMonthDay_(recSheet, monthDay);
        if (recRow > 0) {
          recSheet.getRange(recRow, 2, 1, 4).setValues([[texto, color, true, new Date()]]);
        } else {
          recSheet.appendRow([monthDay, texto, color, true, new Date()]);
        }
        recurringSaved++;
      });
      affected = dates.length;
    }

    return jsonOut({
      ok: true,
      mode: 'upsert_range',
      affected: affected,
      startDate: fecha,
      endDate: endDate,
      recurringEnabled: useRecurring,
      recurringSaved: recurringSaved
    });
  } finally {
    lock.releaseLock();
  }
}

function delete_(body) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const fecha = normalizeDate_(body.fecha);
    const endDate = normalizeDate_(body.endDate || body.fecha);
    const removeRecurring = parseBool_(body.deleteRecurring, false);
    const dates = listDateRange_(fecha, endDate);
    const sh = getSheet_();
    let affected = 0;
    let recurringDeleted = 0;

    dates.forEach(function(currentDate) {
      const row = findRowByDate_(sh, currentDate);
      if (row > 0) {
        sh.getRange(row, 2, 1, 3).clearContent();
        affected++;
      }
    });

    if (removeRecurring) {
      const recSheet = getRecurringSheet_();
      dates.forEach(function(currentDate) {
        const monthDay = currentDate.slice(5);
        const recRow = findRecurringRowByMonthDay_(recSheet, monthDay);
        if (recRow > 0) {
          recSheet.getRange(recRow, 2, 1, 4).clearContent();
          recurringDeleted++;
        }
      });
    }

    return jsonOut({
      ok: true,
      mode: 'delete_range',
      affected: affected,
      startDate: fecha,
      endDate: endDate,
      recurringEnabled: removeRecurring,
      recurringDeleted: recurringDeleted
    });
  } finally {
    lock.releaseLock();
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
