import { CONFIG } from './config.js';
import { loadFromArrayBuffer, buildGoogleSheetExportUrl, saveManualLunasUpdate } from './services/spreadsheetService.js';
import { formatRupiah, formatNumber, formatTanggalIndo } from './utils/formatter.js';
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
  },
  'prioritas-lapangan': {
    title: 'Target Prioritas Eksekusi & Navigasi Maps Lapangan',
    subtitle: 'Daftar prioritas tunggakan tertinggi yang belum lunas beserta tautan titik lokasi Google Maps'
  }
};

// Adaptasi otomatis semua komponen saat Mode Cerah (Light Mode) dipilih
function injectLightModeAdapter() {
  if (document.getElementById('light-mode-adapter')) return;
  const style = document.createElement('style');
  style.id = 'light-mode-adapter';
  style.textContent = `
    html:not(.dark) .text-white { color: #0f172a !important; }
    html:not(.dark) .text-slate-200,
    html:not(.dark) .text-slate-300 { color: #334155 !important; }
    html:not(.dark) .text-slate-400 { color: #475569 !important; }
    html:not(.dark) .bg-slate-950,
    html:not(.dark) .bg-slate-950\\/80,
    html:not(.dark) .bg-slate-950\\/90 { background-color: #f8fafc !important; }
    html:not(.dark) .bg-slate-900\\/60 { background-color: #f1f5f9 !important; }
    html:not(.dark) .bg-slate-800 { background-color: #e2e8f0 !important; }
    html:not(.dark) .border-slate-800,
    html:not(.dark) .border-slate-800\\/80,
    html:not(.dark) .divide-slate-800\\/70 > :not([hidden]) ~ :not([hidden]) { border-color: #cbd5e1 !important; }
    html:not(.dark) .text-cyan-300,
    html:not(.dark) .text-cyan-400 { color: #0284c7 !important; }
    html:not(.dark) .text-emerald-300,
    html:not(.dark) .text-emerald-400 { color: #059669 !important; }
    html:not(.dark) .text-amber-300,
    html:not(.dark) .text-amber-400 { color: #d97706 !important; }
    html:not(.dark) .text-rose-300,
    html:not(.dark) .text-rose-400 { color: #e11d48 !important; }
    html:not(.dark) .text-purple-300,
    html:not(.dark) .text-purple-400 { color: #7c3aed !important; }
  `;
  document.head.appendChild(style);
}

function updateThemeButtonLabel() {
  const isDark = document.documentElement.classList.contains('dark');
  const label = document.getElementById('theme-label-text');
  if (label) label.textContent = isDark ? 'Cerah' : 'Gelap';
}

function initTheme() {
  injectLightModeAdapter();
  const savedTheme = localStorage.getItem('mas_andre_theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
  updateThemeButtonLabel();
}

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
    ? 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
    : 'px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300';

  label.textContent = sourceName;
  sync.textContent = `Sinkron: ${new Date().toLocaleTimeString('id-ID')} (${STATE.allRecords.length} baris)`;
}

// FITUR BARU: Halaman Target Prioritas Eksekusi & Navigasi Google Maps Lapangan
function renderPagePrioritasLapangan(container, records) {
  const belumLunas = records
    .filter((r) => !r.isLunas)
    .sort((a, b) => b.rptag - a.rptag);

  const totalRpTarget = belumLunas.reduce((a, b) => a + b.rptag, 0);
  const belumDiShuntrip = belumLunas.filter((r) => r.eksekusiTE !== 'Shuntrip');

  container.innerHTML = `
    <div class="glass-card p-6">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">KOMANDO EKSEKUSI LAPANGAN</span>
          <h3 class="text-lg font-extrabold text-white mt-2">Daftar Target Prioritas Belum Lunas (${formatNumber(belumLunas.length)} Pelanggan)</h3>
          <p class="text-xs text-slate-400">Diurutkan otomatis dari nilai tagihan Rupiah terbesar dilengkapi navigasi Google Maps untuk tim lapangan</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Potensi Tagihan Tertunggak</span>
            <span class="text-base font-extrabold text-rose-400">${formatRupiah(totalRpTarget)}</span>
          </div>
          <button id="btn-cetak-surat-tugas" class="flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-cyan-500/20">
            <i data-lucide="printer" class="w-4 h-4"></i>
            <span>Cetak Target Lapangan (PDF)</span>
          </button>
        </div>
      </div>
    </div>

    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto max-h-[540px]">
        <table class="w-full text-left data-table text-xs">
          <thead class="sticky top-0 z-10">
            <tr>
              <th class="py-3.5 px-4">Prioritas</th>
              <th class="py-3.5 px-4">Bulan</th>
              <th class="py-3.5 px-4">IDPEL & Nama Pelanggan</th>
              <th class="py-3.5 px-4">Tarif / Daya</th>
              <th class="py-3.5 px-4">Daerah & Alamat</th>
              <th class="py-3.5 px-4 text-right">Tagihan (Rp)</th>
              <th class="py-3.5 px-4">Status Eksekusi</th>
              <th class="py-3.5 px-4 text-center">Aksi Lapangan</th>
            </tr>
          </thead>
          <tbody id="tbody-prioritas-lapangan">
            ${belumLunas.map((r, idx) => {
              const mapsQuery = encodeURIComponent(`${r.alamat}, Jakarta Timur`);
              return `
                <tr>
                  <td class="py-3 px-4 font-extrabold text-rose-400">#${idx + 1}</td>
                  <td class="py-3 px-4 font-semibold text-slate-300">${r.bulan}</td>
                  <td class="py-3 px-4">
                    <div class="font-bold text-white">${r.nama}</div>
                    <div class="font-mono text-[11px] text-cyan-400">${r.idpel}</div>
                  </td>
                  <td class="py-3 px-4 font-semibold text-amber-300">${r.tarif} / ${formatNumber(r.daya)} VA</td>
                  <td class="py-3 px-4 max-w-xs">
                    <div class="font-bold text-purple-300">${r.daerah}</div>
                    <div class="text-[11px] text-slate-400 truncate">${r.alamat}</div>
                  </td>
                  <td class="py-3 px-4 text-right font-extrabold text-rose-400">${formatRupiah(r.rptag)}</td>
                  <td class="py-3 px-4">
                    <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">${r.eksekusiTE}</span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center justify-center gap-2">
                      <a href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" target="_blank" class="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-bold text-[11px] flex items-center gap-1 transition">
                        <i data-lucide="map-pin" class="w-3.5 h-3.5"></i> Maps
                      </a>
                      <button data-rowkey="${r.rowKey}" class="btn-lunas-cepat px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-[11px] transition">
                        Lunas
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Event tombol tandai lunas langsung dari halaman target lapangan
  container.querySelectorAll('.btn-lunas-cepat').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-rowkey');
      const today = new Date().toISOString().split('T')[0];
      saveManualLunasUpdate(key, today);
      const target = STATE.allRecords.find((r) => r.rowKey === key);
      if (target) {
        target.tanggalLunas = today;
        target.isLunas = true;
        target.isManualUpdate = true;
      }
      renderActivePage();
    });
  });

  // Event tombol Cetak PDF Surat Tugas Target Lapangan
  const btnCetak = document.getElementById('btn-cetak-surat-tugas');
  if (btnCetak) {
    btnCetak.addEventListener('click', () => {
      if (!window.jspdf) return;
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('landscape');
      doc.setFontSize(14);
      doc.text('DAFTAR TARGET PRIORITAS EKSEKUSI LAPANGAN — DASBOR MAS ANDRE', 14, 15);
      doc.setFontSize(10);
      doc.text(`Total Target Belum Lunas: ${belumLunas.length} Pelanggan | Belum Shuntrip: ${belumDiShuntrip.length} | Total Tagihan: ${formatRupiah(totalRpTarget)}`, 14, 22);

      const body = belumLunas.map((r, i) => [
        i + 1,
        r.bulan,
        r.idpel,
        r.nama,
        `${r.tarif} / ${formatNumber(r.daya)} VA`,
        r.daerah,
        r.alamat,
        formatRupiah(r.rptag),
        r.eksekusiTE
      ]);

      doc.autoTable({
        startY: 27,
        head: [['No', 'Bulan', 'IDPEL', 'Nama Pelanggan', 'Tarif/Daya', 'Daerah', 'Alamat Lengkap', 'Tagihan (Rp)', 'Status Eks']],
        body,
        styles: { fontSize: 7.5 }
      });
      doc.save('Daftar_Target_Eksekusi_Lapangan_PLN.pdf');
    });
  }

  if (window.lucide) window.lucide.createIcons();
}

// FITUR BARU: Modal Pencarian Cepat Global IDPEL / Nama (Command + K)
async function openQuickSearchModal() {
  if (STATE.allRecords.length === 0) return;
  const { value: query } = await window.Swal.fire({
    title: 'Cari Cepat Pelanggan (IDPEL / Nama)',
    input: 'text',
    inputPlaceholder: 'Ketik nomor IDPEL atau nama pelanggan...',
    showCancelButton: true,
    confirmButtonText: 'Cek Riwayat Lengkap',
    cancelButtonText: 'Tutup',
    background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a'
  });

  if (!query) return;
  const q = query.toLowerCase().trim();
  const matches = STATE.allRecords.filter((r) => `${r.idpel} ${r.nama}`.toLowerCase().includes(q));

  if (matches.length === 0) {
    window.Swal.fire('Tidak Ditemukan', `Tidak ada pelanggan dengan kata kunci "${query}"`, 'info');
    return;
  }

  const first = matches[0];
  const historyRows = STATE.allRecords.filter((r) => r.idpel === first.idpel);
  const totalAkumulasi = historyRows.reduce((a, b) => a + b.rptag, 0);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(first.alamat + ', Jakarta Timur')}`;

  const htmlTable = `
    <div class="text-left text-xs space-y-3">
      <div class="p-3 rounded-xl bg-slate-900 text-slate-100">
        <p class="text-sm font-extrabold text-cyan-400">${first.nama} (${first.idpel})</p>
        <p class="mt-1">Tarif/Daya: <strong>${first.tarif} / ${formatNumber(first.daya)} VA</strong> &bull; Daerah: <strong>${first.daerah}</strong></p>
        <p class="mt-0.5 text-slate-300">Alamat: ${first.alamat}</p>
        <p class="mt-1 text-amber-300 font-bold">Total Akumulasi (${historyRows.length} Bulan): ${formatRupiah(totalAkumulasi)}</p>
        <a href="${mapsUrl}" target="_blank" class="inline-block mt-2 px-3 py-1 rounded bg-cyan-500 text-slate-950 font-bold">Buka Lokasi di Google Maps</a>
      </div>
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-700 text-slate-400">
            <th class="py-1.5">Bulan</th>
            <th class="py-1.5">Tagihan</th>
            <th class="py-1.5">Eksekusi</th>
            <th class="py-1.5">Status Lunas</th>
          </tr>
        </thead>
        <tbody>
          ${historyRows.map((h) => `
            <tr class="border-b border-slate-800">
              <td class="py-1.5 font-bold">${h.bulan}</td>
              <td class="py-1.5">${formatRupiah(h.rptag)}</td>
              <td class="py-1.5">${h.eksekusiTE}</td>
              <td class="py-1.5 font-bold ${h.isLunas ? 'text-emerald-400' : 'text-rose-400'}">
                ${h.isLunas ? `Lunas (${formatTanggalIndo(h.tanggalLunas)})` : 'Belum Lunas'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  window.Swal.fire({
    title: 'Kartu Riwayat Pelanggan',
    html: htmlTable,
    width: 640,
    confirmButtonText: 'Selesai',
    background: '#0f172a',
    color: '#f8fafc'
  });
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
  } else if (STATE.activePage === 'prioritas-lapangan') {
    renderPagePrioritasLapangan(container, records);
  }
}

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
    // Menunggu unggahan manual jika file belum ada di folder data/
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

  // Tombol Pengalih Tema Cerah / Gelap
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const htmlEl = document.documentElement;
      if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        localStorage.setItem('mas_andre_theme', 'light');
      } else {
        htmlEl.classList.add('dark');
        localStorage.setItem('mas_andre_theme', 'dark');
      }
      updateThemeButtonLabel();
      if ( window.lucide ) window.lucide.createIcons();
    });
  }

  // Tombol & Pintasan Keyboard Pencarian Cepat (Cmd+K / Ctrl+K)
  const btnQuickSearch = document.getElementById('btn-quick-search');
  if (btnQuickSearch) {
    btnQuickSearch.addEventListener('click', openQuickSearchModal);
  }
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openQuickSearchModal();
    }
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
  initTheme();
  if (window.lucide) window.lucide.createIcons();
  setupEventListeners();
  initDataLoading();
});