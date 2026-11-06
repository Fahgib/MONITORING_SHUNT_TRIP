export const CONFIG = {
  APP_NAME: 'Dasbor Mas Andre - Monitoring Shunt Trip JTN 2026',
  
  // Jika Anda menaruh file MONITORING SHUNT TRIP JTN 2026.xlsx di dalam folder data/,
  // sistem otomatis membacanya saat pertama kali dibuka
  DEFAULT_LOCAL_FILE: './data/MONITORING SHUNT TRIP JTN 2026.xlsx',

  // Masukkan Link Google Spreadsheet Anda di sini (atau bisa lewat tombol di web)
  DEFAULT_GSHEET_URL: '',

  // Urutan resmi bulan pada file MONITORING SHUNT TRIP JTN 2026.xlsx
  MONTH_ORDER: [
    'Januari', 'Februari', 'Maret', 'April', 'Mei',
    'Juni', 'Juli', 'Agustus', 'September', 'Oktober'
  ],

  // Daftar nama sheet pelanggan AMR yang digabungkan otomatis
  TARGET_SHEETS: [
    'MONITORING EKSEKUSI AMR',
    'April 2026',
    'Mei 2026',
    'Juni 2026',
    'Juli 2026',
    'Agustus 2026',
    'September 2026',
    'Oktober 2026'
  ],

  STORAGE_KEYS: {
    GSHEET_URL: 'mas_andre_gsheet_url',
    MANUAL_LUNAS: 'mas_andre_manual_lunas_updates'
  }
};