import { CONFIG } from './config.js';
import { loadFromArrayBuffer, buildGoogleSheetExportUrl } from './services/spreadsheetService.js';
import { renderPageOverview } from './modules/pageOverview.js';
import { renderPagePelangganDaya } from './modules/pagePelangganDaya.js';
import { renderPageLingkupDaerah } from './modules/pageLingkupDaerah.js';
import { renderPageReportHarian } from './modules/pageReportHarian.js';
import { renderPageHabitTracker } from './modules/pageHabitTracker.js';

const STATE = {
  allRecords: [],
  activePage: 'overview',
  selectedMonth: 'ALL'
};

const PAGE_META = {
  'overview': {
    title: 'Ringkasan Eksekutif Dasbor Mas Andre',
    subtitle: 'Pantauan menyeluruh Jumlah Pelanggan, Daya, Lingkup Daerah, Rupiah, dan Eksekusi Shunt Trip'
  },
  'pelanggan-daya': {
    title: 'Data Pelanggan & Kapasitas Daya',
    subtitle: 'Filter interaktif berdasarkan Golongan Tarif, Kelompok Daya (VA), dan Status Eksekusi Lapangan'
  },
  'lingkup-daerah': {
    title: 'Analisis Lingkup Daerah & Kawasan',
    subtitle: 'Pemetaan wilayah otomatis dari alamat pelanggan beserta capaian pelunasan per kawasan'
  },
  'report-harian': {
    title: 'Report Harian Pelanggan Sudah Lunas',
    subtitle: 'Rekapitulasi pelunasan harian, update status lunas instan, dan generator laporan WhatsApp'
  },
  'habit-tracker': {
    title: 'Detektor Pelanggan Langganan Nunggak',
    subtitle: 'Identifikasi IDPEL yang berulang kali masuk daftar tunggakan di berbagai bulan'
  }
};

function getFilteredByMonth() {
  if (STATE.selectedMonth === 'ALL') return STATE.allRecords;
  return STATE.allRecords.filter((r) => r.bulan === STATE.selectedMonth);
}

function updateSourceStatus(sourceName, isSuccess = true) {
  const badge = document.getElementById('data-status-badge');
  const label = document.getElementById('data-source-label');
  const sync = document.getElementById('last-sync-label');

  badge.textContent = isSuccess ? 'Terhubung' : 'Perlu File';
  badge.className = isSuccess
    ? 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300'
    : 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300';

  label.textContent = sourceName;
  sync.textContent = `Sinkron: ${new Date().toLocaleTimeString('id-ID')} (${STATE.allRecords.length} baris)`;
}

function renderActivePage() {
  const container = document.getElementById('page-container');
  const meta = PAGE_META[STATE.activePage] || PAGE_META['overview'];
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-subtitle').textContent = meta.subtitle;

  if (STATE.allRecords.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-12 text-center max-w-xl mx-auto my-12">
        <div class="w-16 h-16 rounded-2xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mx-auto mb-4">
          <i data-lucide="file-spreadsheet" class="w-8 h-8"></i>
        </div>
        <h3 class="text-lg font-extrabold text-white">Muat File Spreadsheet Monitoring Anda</h3>
        <p class="text-xs text-slate-400 mt-2 leading-relaxed">
          Klik tombol <strong>Upload Excel</strong> di pojok kiri bawah untuk memilih file <code>MONITORING SHUNT TRIP JTN 2026.xlsx</code>, atau hubungkan langsung dengan tautan <strong>Google Sheet</strong> Anda.
        </p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const records = getFilteredByMonth();

  if (STATE.activePage === 'overview') {
    renderPageOverview(container, records);
  } else if (STATE.activePage === 'pelanggan-daya') {
    renderPagePelangganDaya(container, records);
  } else if (STATE.activePage === 'lingkup-daerah') {
    renderPageLingkupDaerah(container, records);
  } else if (STATE.activePage === 'report-harian') {
    renderPageReportHarian(container, records, (rowKey, targetDate) => {
      const target = STATE.allRecords.find((r) => r.rowKey === rowKey);
      if (target) {
        target.tanggalLunas = targetDate;
        target.isLunas = true;
        target.isManualUpdate = true;
      }
      renderActivePage();
    });
  } else if (STATE.activePage === 'habit-tracker') {
    renderPageHabitTracker(container, STATE.allRecords);
  }
}

// Memuat otomatis dari folder data/ atau Google Sheet jika tersimpan
async function initDataLoading() {
  const savedGsheet = localStorage.getItem(CONFIG.STORAGE_KEYS.GSHEET_URL) || CONFIG.DEFAULT_GSHEET_URL;
  if (savedGsheet) {
    try {
      const exportUrl = buildGoogleSheetExportUrl(savedGsheet);
      const res = await fetch(exportUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        STATE.allRecords = await loadFromArrayBuffer(buf);
        updateSourceStatus('Google Spreadsheet (Live)', true);
        renderActivePage();
        return;
      }
    } catch (e) {
      console.warn('Gagal memuat Google Sheet otomatis, mencoba file lokal...', e);
    }
  }

  try {
    const res = await fetch(CONFIG.DEFAULT_LOCAL_FILE);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      STATE.allRecords = await loadFromArrayBuffer(buf);
      updateSourceStatus('MONITORING SHUNT TRIP JTN 2026.xlsx', true);
      renderActivePage();
      return;
    }
  } catch {
    // Biarkan pengguna memilih file manual jika belum ditaruh di folder data/
  }

  renderActivePage();
}

function setupEventListeners() {
  // Navigasi Sidebar Antar-Halaman
  document.querySelectorAll('#sidebar-nav .nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#sidebar-nav .nav-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.activePage = btn.getAttribute('data-page');
      renderActivePage();
    });
  });

  // Filter Global Periode Bulan
  document.getElementById('global-month-filter').addEventListener('change', (e) => {
    STATE.selectedMonth = e.target.value;
    renderActivePage();
  });

  // Upload File Excel Lokal
  document.getElementById('input-excel-file').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    STATE.allRecords = await loadFromArrayBuffer(buf);
    updateSourceStatus(file.name, true);
    renderActivePage();
  });

  // Koneksi Link Google Spreadsheet
  document.getElementById('btn-open-gsheet').addEventListener('click', async () => {
    const currentUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.GSHEET_URL) || '';
    const { value: url } = await window.Swal.fire({
      title: 'Hubungkan Google Spreadsheet',
      input: 'url',
      inputValue: currentUrl,
      inputLabel: 'Pastikan akses Google Sheet sudah diatur ke "Siapa saja yang memiliki link"',
      inputPlaceholder: 'https://docs.google.com/spreadsheets/d/.../edit',
      showCancelButton: true,
      confirmButtonText: 'Tarik Data Sekarang',
      background: '#0f172a',
      color: '#f8fafc'
    });

    if (url) {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.GSHEET_URL, url);
        const exportUrl = buildGoogleSheetExportUrl(url);
        const res = await fetch(exportUrl);
        const buf = await res.arrayBuffer();
        STATE.allRecords = await loadFromArrayBuffer(buf);
        updateSourceStatus('Google Spreadsheet (Live)', true);
        renderActivePage();
      } catch {
        window.Swal.fire({
          title: 'Gagal Menarik Data',
          text: 'Pastikan link Google Spreadsheet sudah disetel "Siapa saja yang memiliki link" (Publik).',
          icon: 'error',
          background: '#0f172a',
          color: '#f8fafc'
        });
      }
    }
  });

  // Tombol Refresh Data
  document.getElementById('btn-refresh-data').addEventListener('click', () => {
    initDataLoading();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();
  setupEventListeners();
  initDataLoading();
});