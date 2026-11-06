// Membersihkan nilai RPTAG (termasuk format teks berkoma dan desimal ribuan di sheet Oktober 2026)
export function cleanRupiah(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    if (val > 0 && val < 10000) {
      return Math.round(val * 1000);
    }
    return Math.round(val);
  }
  const str = String(val).trim().replace(/,/g, '').replace(/\./g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

// Membersihkan nilai DAYA (mengubah angka kVA di sheet Oktober seperti 33.0 menjadi 33000 VA)
export function cleanDaya(val) {
  if (val === null || val === undefined || val === '') return 0;
  const num = parseFloat(String(val).replace(/,/g, '.'));
  if (isNaN(num)) return 0;
  if (num > 0 && num < 1000) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
}

// Mengelompokkan kapasitas Daya ke dalam kategori analisis
export function getKategoriDaya(dayaVA) {
  if (dayaVA <= 6600) return '6.600 VA ke Bawah';
  if (dayaVA <= 16500) return '7.700 - 16.500 VA';
  if (dayaVA <= 41500) return '23.000 - 41.500 VA';
  return '53.000 VA ke Atas';
}

// Mengubah format tanggal Excel (serial number atau Date) menjadi YYYY-MM-DD
export function cleanDate(val) {
  if (!val) return '';
  if (val instanceof Date && !isNaN(val)) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    if (!isNaN(date)) return date.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const matchISO = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (matchISO) return matchISO[1];

  const parsed = new Date(str);
  if (!isNaN(parsed)) return parsed.toISOString().split('T')[0];
  return '';
}

// Format angka ke Rupiah lengkap (contoh: Rp 707.441.631)
export function formatRupiah(num) {
  const n = Number(num) || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(n);
}

// Format angka ke Rupiah ringkas untuk kartu & grafik (contoh: Rp 7,25 M atau Rp 707,4 Jt)
export function formatRupiahSingkat(num) {
  const n = Number(num) || 0;
  if (n >= 1_000_000_000) {
    return `Rp ${(n / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (n >= 1_000_000) {
    return `Rp ${(n / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
  }
  return formatRupiah(n);
}

// Format ribuan standar Indonesia
export function formatNumber(num) {
  return new Intl.NumberFormat('id-ID').format(Number(num) || 0);
}

// Format tanggal YYYY-MM-DD menjadi bacaan Indonesia (contoh: 21 Okt 2026)
export function formatTanggalIndo(dateStr) {
  if (!dateStr) return 'Belum Lunas';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const mIdx = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]} ${parts[0]}`;
}