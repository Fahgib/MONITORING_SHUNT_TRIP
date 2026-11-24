import { CONFIG } from '../config.js';
import { cleanRupiah, cleanDaya, getKategoriDaya, cleanDate } from '../utils/formatter.js';
import { detectLingkupDaerah } from './daerahMapper.js';

export function buildGoogleSheetExportUrl(rawUrl) {
  if (!rawUrl) return '';
  const match = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
  }
  return rawUrl;
}

export function getManualLunasUpdates() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.MANUAL_LUNAS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualLunasUpdate(rowKey, tanggalLunas) {
  const current = getManualLunasUpdates();
  if (tanggalLunas) {
    current[rowKey] = tanggalLunas;
  } else {
    delete current[rowKey];
  }
  localStorage.setItem(CONFIG.STORAGE_KEYS.MANUAL_LUNAS, JSON.stringify(current));
}

// Menyamakan format nama bulan (contoh: "november" / "NOVEMBER" -> "November")
function normalizeBulan(rawBulan, sheetName) {
  const source = String(rawBulan || sheetName || '').trim().toLowerCase();
  const matched = CONFIG.MONTH_ORDER.find((m) => source.includes(m.toLowerCase()));
  return matched || '';
}

// Mendeteksi semua sheet AMR bulanan secara fleksibel (mengabaikan LAPORAN & EKSEKUSI AMI)
function getValidTargetSheets(workbook) {
  const ignored = ['LAPORAN', 'EKSEKUSI AMI'];
  const targetUpper = CONFIG.TARGET_SHEETS.map((s) => s.toUpperCase());

  return workbook.SheetNames.filter((name) => {
    const upper = name.trim().toUpperCase();
    if (ignored.includes(upper)) return false;
    if (targetUpper.includes(upper)) return true;
    return CONFIG.MONTH_ORDER.some((m) => upper.includes(m.toUpperCase()));
  });
}

export function parseWorkbookToRecords(workbook) {
  const manualUpdates = getManualLunasUpdates();
  const records = [];
  const sheetsToRead = getValidTargetSheets(workbook);

  sheetsToRead.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
    rows.forEach((row, idx) => {
      const bulan = normalizeBulan(row['Bulan'], sheetName);
      const rawIdpel = row['IDPEL'];
      if (!bulan || !rawIdpel) return;

      const idpel = String(Math.trunc(Number(rawIdpel)) || rawIdpel).trim();
      if (!idpel || idpel === 'NaN') return;

      const rowKey = `${bulan}_${idpel}_${idx}`;
      const daya = cleanDaya(row['DAYA']);
      const rptag = cleanRupiah(row['RPTAG']);
      const alamat = String(row['ALAMAT'] || '').trim();
      const tanggalAsli = cleanDate(row['Tanggal Lunas']);
      const tanggalLunas = manualUpdates[rowKey] !== undefined ? manualUpdates[rowKey] : tanggalAsli;

      const eksekusiRaw = String(row['Eksekusi TE'] || '').trim();
      const reqNiagaRaw = String(row['Request Niaga'] || '').trim();

      records.push({
        rowKey,
        sheetName,
        bulan,
        idpel,
        nama: String(row['NAMA'] || '-').trim(),
        tarif: String(row['TARIF'] || '-').trim(),
        daya,
        kategoriDaya: getKategoriDaya(daya),
        alamat,
        daerah: detectLingkupDaerah(alamat),
        rptag,
        requestNiaga: reqNiagaRaw || 'Belum Request',
        eksekusiTE: eksekusiRaw || 'Belum Eksekusi',
        tanggalLunas,
        isLunas: Boolean(tanggalLunas),
        isManualUpdate: Boolean(manualUpdates[rowKey])
      });
    });
  });

  return records;
}

export async function loadFromArrayBuffer(buffer) {
  const data = new Uint8Array(buffer);
  const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
  return parseWorkbookToRecords(workbook);
}