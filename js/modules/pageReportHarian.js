import { formatRupiah, formatNumber, formatTanggalIndo } from '../utils/formatter.js';
import { saveManualLunasUpdate } from '../services/spreadsheetService.js';
import { generateWhatsAppReportText, exportReportToExcel, exportReportToPDF } from './whatsappExport.js';

export function renderPageReportHarian(container, records, onDataUpdated) {
  // Mengambil daftar semua tanggal lunas yang ada di spreadsheet, diurutkan dari yang terbaru
  const tanggalTersedia = [...new Set(records.filter((r) => r.tanggalLunas).map((r) => r.tanggalLunas))].sort().reverse();
  const defaultDate = tanggalTersedia[0] || new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <!-- PANEL KONTROL REPORT HARIAN -->
    <div class="glass-card p-6">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">FITUR UNGGULAN REPORT HARIAN</span>
          <h3 class="text-lg font-extrabold text-white mt-2">Pusat Report Harian Pelanggan Sudah Lunas</h3>
          <p class="text-xs text-slate-400">Pilih tanggal pelunasan untuk melihat rincian harian, tandai pelanggan baru lunas, atau salin format laporan WhatsApp</p>
        </div>

        <!-- Pemilih Tanggal & Tombol Aksi Cepat -->
        <div class="flex flex-wrap items-center gap-2.5">
          <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <span class="text-xs text-slate-400 font-medium">Pilih Tanggal Lunas:</span>
            <select id="select-tanggal-report" class="bg-transparent text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer">
              <option value="ALL_LUNAS">Semua Tanggal Lunas (${records.filter(r => r.isLunas).length} Plg)</option>
              ${tanggalTersedia.map((tgl) => {
                const jml = records.filter((r) => r.tanggalLunas === tgl).length;
                return `<option value="${tgl}" ${tgl === defaultDate ? 'selected' : ''}>${formatTanggalIndo(tgl)} (${jml} Lunas)</option>`;
              }).join('')}
            </select>
          </div>

          <button id="btn-wa-report" class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-emerald-500/20">
            <i data-lucide="share-2" class="w-4 h-4"></i>
            <span>Salin Report WA</span>
          </button>

          <button id="btn-excel-report" class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-bold text-xs transition">
            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
            <span>Excel</span>
          </button>

          <button id="btn-pdf-report" class="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span>PDF</span>
          </button>
        </div>
      </div>

      <!-- 4 Kartu Statistik Harian -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6" id="daily-kpi-cards"></div>
    </div>

    <!-- 2 KOLOM: DAFTAR SUDAH LUNAS HARI INI & UPDATE CEPAT PELANGGAN BELUM LUNAS -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <!-- Tabel Pelanggan Sudah Lunas pada Tanggal Terpilih -->
      <div class="glass-card overflow-hidden xl:col-span-2">
        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h4 class="text-sm font-bold text-white" id="title-tabel-harian">Daftar Pelanggan Sudah Lunas</h4>
            <p class="text-xs text-slate-400">Rincian pelanggan yang melunasi tagihan pada tanggal terpilih</p>
          </div>
        </div>
        <div class="overflow-x-auto max-h-[480px]">
          <table class="w-full text-left data-table text-xs">
            <thead class="sticky top-0 z-10">
              <tr>
                <th class="py-3 px-4">IDPEL & Nama</th>
                <th class="py-3 px-4">Tarif / Daya</th>
                <th class="py-3 px-4">Daerah</th>
                <th class="py-3 px-4 text-right">Rupiah Lunas</th>
                <th class="py-3 px-4">Eksekusi</th>
                <th class="py-3 px-4">Tanggal Lunas</th>
              </tr>
            </thead>
            <tbody id="tbody-lunas-harian"></tbody>
          </table>
        </div>
      </div>

      <!-- Panel Tandai Pelanggan Baru Lunas Hari Ini -->
      <div class="glass-card overflow-hidden flex flex-col">
        <div class="p-5 border-b border-slate-800">
          <h4 class="text-sm font-bold text-amber-300">Update Cepat Pelanggan Baru Lunas</h4>
          <p class="text-xs text-slate-400 mt-0.5">Daftar pelanggan yang masih belum lunas. Klik tombol <strong>Tandai Lunas</strong> untuk memasukkannya ke Report Harian.</p>
          <input id="search-belum-lunas" type="text" placeholder="Cari IDPEL / Nama yang belum lunas..." class="mt-3 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400" />
        </div>
        <div class="overflow-y-auto max-h-[400px] divide-y divide-slate-800/70" id="list-belum-lunas-action"></div>
      </div>
    </div>
  `;

  const selectTgl = document.getElementById('select-tanggal-report');

  const updateHarianView = () => {
    const selectedDate = selectTgl.value;
    const rowsLunas = selectedDate === 'ALL_LUNAS'
      ? records.filter((r) => r.isLunas)
      : records.filter((r) => r.tanggalLunas === selectedDate);

    const totalRpHarian = rowsLunas.reduce((a, b) => a + b.rptag, 0);
    const totalDayaHarian = rowsLunas.reduce((a, b) => a + b.daya, 0);
    const shuntCount = rowsLunas.filter((r) => r.eksekusiTE === 'Shuntrip').length;

    document.getElementById('daily-kpi-cards').innerHTML = `
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Tanggal Report</span>
        <p class="text-lg font-extrabold text-cyan-400 mt-1">${selectedDate === 'ALL_LUNAS' ? 'Semua Tanggal' : formatTanggalIndo(selectedDate)}</p>
      </div>
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Pelanggan Lunas</span>
        <p class="text-lg font-extrabold text-emerald-400 mt-1">${formatNumber(rowsLunas.length)} Pelanggan</p>
      </div>
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Total Rupiah Lunas</span>
        <p class="text-lg font-extrabold text-white mt-1">${formatRupiah(totalRpHarian)}</p>
      </div>
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Daya & Eks. Shuntrip</span>
        <p class="text-lg font-extrabold text-amber-300 mt-1">${formatNumber(totalDayaHarian)} VA (${shuntCount} Shuntrip)</p>
      </div>
    `;

    document.getElementById('tbody-lunas-harian').innerHTML = rowsLunas.map((r) => `
      <tr>
        <td class="py-3 px-4">
          <div class="font-bold text-white">${r.nama}</div>
          <div class="font-mono text-[11px] text-cyan-400">${r.idpel} &bull; ${r.bulan}</div>
        </td>
        <td class="py-3 px-4 font-semibold text-amber-300">${r.tarif} / ${formatNumber(r.daya)} VA</td>
        <td class="py-3 px-4 text-purple-300 font-semibold">${r.daerah}</td>
        <td class="py-3 px-4 text-right font-bold text-emerald-400">${formatRupiah(r.rptag)}</td>
        <td class="py-3 px-4">${r.eksekusiTE}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">${formatTanggalIndo(r.tanggalLunas)}</span>
        </td>
      </tr>
    `).join('');

    // Tombol Aksi WA, Excel, PDF
    document.getElementById('btn-wa-report').onclick = () => {
      const textWA = generateWhatsAppReportText(selectedDate, rowsLunas, records);
      navigator.clipboard.writeText(textWA);
      window.Swal.fire({
        title: 'Laporan Harian Disalin!',
        html: `<pre class="text-left text-xs bg-slate-950 p-4 rounded-xl text-emerald-300 overflow-x-auto">${textWA}</pre>`,
        icon: 'success',
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonText: 'Siap Tempel di WhatsApp'
      });
    };

    document.getElementById('btn-excel-report').onclick = () => exportReportToExcel(selectedDate, rowsLunas);
    document.getElementById('btn-pdf-report').onclick = () => exportReportToPDF(selectedDate, rowsLunas);
  };

  // Render daftar pelanggan yang belum lunas agar bisa ditandai lunas dengan cepat
  const renderBelumLunasList = () => {
    const q = (document.getElementById('search-belum-lunas')?.value || '').toLowerCase().trim();
    const belumRows = records.filter((r) => !r.isLunas && (`${r.idpel} ${r.nama} ${r.daerah}`.toLowerCase().includes(q)));

    const listEl = document.getElementById('list-belum-lunas-action');
    if (belumRows.length === 0) {
      listEl.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">Semua pelanggan pada filter ini sudah lunas!</div>`;
      return;
    }

    listEl.innerHTML = belumRows.map((r) => `
      <div class="p-3.5 flex items-center justify-between hover:bg-slate-900/60 transition">
        <div class="pr-2">
          <p class="text-xs font-bold text-white">${r.nama}</p>
          <p class="text-[11px] text-slate-400 font-mono">${r.idpel} &bull; ${r.bulan} &bull; ${r.daerah}</p>
          <p class="text-xs font-bold text-rose-400 mt-0.5">${formatRupiah(r.rptag)} (${formatNumber(r.daya)} VA)</p>
        </div>
        <button data-rowkey="${r.rowKey}" class="btn-tandai-lunas shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-xs font-bold transition">
          Tandai Lunas
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('.btn-tandai-lunas').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-rowkey');
        const targetDate = selectTgl.value === 'ALL_LUNAS' ? new Date().toISOString().split('T')[0] : selectTgl.value;
        saveManualLunasUpdate(key, targetDate);
        if (onDataUpdated) onDataUpdated(key, targetDate);
      });
    });
  };

  selectTgl.addEventListener('change', updateHarianView);
  document.getElementById('search-belum-lunas').addEventListener('input', renderBelumLunasList);

  updateHarianView();
  renderBelumLunasList();
  if (window.lucide) window.lucide.createIcons();
}