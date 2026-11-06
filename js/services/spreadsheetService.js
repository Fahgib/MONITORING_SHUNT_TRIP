import { CONFIG } from '../config.js';
import { cleanRupiah, cleanDaya, getKategoriDaya, cleanDate } from '../utils/formatter.js';
import { detectLingkupDaerah } from './daerahMapper.js';

// Mengubah link Google Spreadsheet biasa menjadi link unduh XLSX langsung
export function buildGoogleSheetExportUrl(rawUrl) {
  if (!rawUrl) return '';
  const match = rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
  }
  return rawUrl;
}

// Mengambil daftar update pelunasan manual yang disimpan di browser
export function getManualLunasUpdates() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEYS.MANUAL_LUNAS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Menyimpan update status lunas harian dari tabel dasbor
export function saveManualLunasUpdate(rowKey, tanggalLunas) {
  const current = getManualLunasUpdates();
  if (tanggalLunas) {
    current[rowKey] = tanggalLunas;
  } else {
    delete current[rowKey];
  }
  localStorage.setItem(CONFIG.STORAGE_KEYS.MANUAL_LUNAS, JSON.stringify(current));
}

// Membaca seluruh sheet dari objek Workbook SheetJS (XLSX)
export function parseWorkbookToRecords(workbook) {
  const manualUpdates = getManualLunasUpdates();
  const records = [];

  CONFIG.TARGET_SHEETS.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
    rows.forEach((row, idx) => {
      const bulan = String(row['Bulan'] || '').trim();
      const rawIdpel = row['IDPEL'];
      if (!bulan || !rawIdpel) return;

      const idpel = String(Math.trunc(Number(rawIdpel)) || rawIdpel).trim();
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

// Membaca file dari ArrayBuffer (baik dari upload lokal maupun Google Spreadsheet)
export async function loadFromArrayBuffer(buffer) {
  const data = new Uint8Array(buffer);
  const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
  return parseWorkbookToRecords(workbook);
}