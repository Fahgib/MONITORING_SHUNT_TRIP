import { formatRupiah, formatNumber, formatTanggalIndo } from '../utils/formatter.js';

let chartDaya = null;

export function renderPagePelangganDaya(container, records) {
  const tarifUnik = [...new Set(records.map((r) => r.tarif))].sort();
  const kategoriDayaList = [
    '6.600 VA ke Bawah',
    '7.700 - 16.500 VA',
    '23.000 - 41.500 VA',
    '53.000 VA ke Atas'
  ];

  container.innerHTML = `
    <!-- GRAFIK DISTRIBUSI DAYA & FILTER PENCARIAN -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="glass-card p-6">
        <h3 class="text-base font-bold text-white mb-1">Distribusi Pelanggan per Kelompok Daya</h3>
        <p class="text-xs text-slate-400 mb-4">Klasifikasi otomatis kapasitas Daya terpasang (VA)</p>
        <div class="h-56">
          <canvas id="chart-daya-distribusi"></canvas>
        </div>
      </div>

      <div class="glass-card p-6 lg:col-span-2 flex flex-col justify-between">
        <div>
          <h3 class="text-base font-bold text-white mb-1">Filter & Pencarian Data Pelanggan</h3>
          <p class="text-xs text-slate-400 mb-4">Cek cepat berdasarkan IDPEL, Nama, Golongan Tarif, Daya, maupun Status Lunas</p>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="md:col-span-2">
              <label class="text-[11px] font-semibold text-slate-400">Cari IDPEL / Nama / Alamat</label>
              <input id="filter-search-pelanggan" type="text" placeholder="Ketik IDPEL atau Nama Pelanggan..." class="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500" />
            </div>

            <div>
              <label class="text-[11px] font-semibold text-slate-400">Golongan Tarif</label>
              <select id="filter-tarif" class="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                <option value="ALL">Semua Tarif</option>
                ${tarifUnik.map((t) => `<option value="${t}">Tarif ${t}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="text-[11px] font-semibold text-slate-400">Kelompok Daya</label>
              <select id="filter-daya" class="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                <option value="ALL">Semua Daya</option>
                ${kategoriDayaList.map((k) => `<option value="${k}">${k}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div>
              <label class="text-[11px] font-semibold text-slate-400">Status Pelunasan</label>
              <select id="filter-status-lunas" class="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                <option value="ALL">Semua Status</option>
                <option value="LUNAS">Sudah Lunas</option>
                <option value="BELUM">Belum Lunas (Nunggak)</option>
              </select>
            </div>

            <div>
              <label class="text-[11px] font-semibold text-slate-400">Status Eksekusi TE</label>
              <select id="filter-eksekusi" class="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
                <option value="ALL">Semua Eksekusi</option>
                <option value="Shuntrip">Shuntrip</option>
                <option value="Modem Off">Modem Off</option>
                <option value="Belum Eksekusi">Belum Eksekusi</option>
              </select>
            </div>

            <div class="flex items-end">
              <div id="filter-summary-box" class="w-full p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 font-semibold text-center">
                Menampilkan ${formatNumber(records.length)} data
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TABEL RINCIAN PELANGGAN & DAYA -->
    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto max-h-[520px]">
        <table class="w-full text-left data-table text-xs">
          <thead class="sticky top-0 z-10">
            <tr>
              <th class="py-3.5 px-4">Bulan</th>
              <th class="py-3.5 px-4">IDPEL</th>
              <th class="py-3.5 px-4">Nama Pelanggan</th>
              <th class="py-3.5 px-4">Tarif / Daya</th>
              <th class="py-3.5 px-4">Lingkup Daerah</th>
              <th class="py-3.5 px-4 text-right">Tagihan (Rp)</th>
              <th class="py-3.5 px-4">Eksekusi TE</th>
              <th class="py-3.5 px-4">Status & Tgl Lunas</th>
            </tr>
          </thead>
          <tbody id="tbody-pelanggan-daya"></tbody>
        </table>
      </div>
    </div>
  `;

  renderChartDaya(records, kategoriDayaList);

  const applyFilter = () => {
    const q = document.getElementById('filter-search-pelanggan').value.toLowerCase().trim();
    const tarif = document.getElementById('filter-tarif').value;
    const dayaKat = document.getElementById('filter-daya').value;
    const stLunas = document.getElementById('filter-status-lunas').value;
    const eks = document.getElementById('filter-eksekusi').value;

    const filtered = records.filter((r) => {
      if (q && !(`${r.idpel} ${r.nama} ${r.alamat}`.toLowerCase().includes(q))) return false;
      if (tarif !== 'ALL' && r.tarif !== tarif) return false;
      if (dayaKat !== 'ALL' && r.kategoriDaya !== dayaKat) return false;
      if (stLunas === 'LUNAS' && !r.isLunas) return false;
      if (stLunas === 'BELUM' && r.isLunas) return false;
      if (eks !== 'ALL' && r.eksekusiTE !== eks) return false;
      return true;
    });

    const totalRpFiltered = filtered.reduce((a, b) => a + b.rptag, 0);
    document.getElementById('filter-summary-box').innerHTML =
      `${formatNumber(filtered.length)} Pelanggan &bull; ${formatRupiah(totalRpFiltered)}`;

    const tbody = document.getElementById('tbody-pelanggan-daya');
    tbody.innerHTML = filtered.slice(0, 300).map((r) => `
      <tr>
        <td class="py-3 px-4 font-semibold text-slate-300">${r.bulan}</td>
        <td class="py-3 px-4 font-mono text-cyan-400 font-semibold">${r.idpel}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-white">${r.nama}</div>
          <div class="text-[11px] text-slate-400 truncate max-w-xs">${r.alamat}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold">${r.tarif}</span>
          <span class="ml-1 text-slate-200 font-semibold">${formatNumber(r.daya)} VA</span>
        </td>
        <td class="py-3 px-4 font-semibold text-purple-300">${r.daerah}</td>
        <td class="py-3 px-4 text-right font-bold text-white">${formatRupiah(r.rptag)}</td>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${
            r.eksekusiTE === 'Shuntrip'
              ? 'bg-cyan-500/20 text-cyan-300'
              : r.eksekusiTE === 'Modem Off'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-slate-800 text-slate-400'
          }">${r.eksekusiTE}</span>
        </td>
        <td class="py-3 px-4">
          ${
            r.isLunas
              ? `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300">Lunas (${formatTanggalIndo(r.tanggalLunas)})</span>`
              : `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300">Belum Lunas</span>`
          }
        </td>
      </tr>
    `).join('');
  };

  ['filter-search-pelanggan', 'filter-tarif', 'filter-daya', 'filter-status-lunas', 'filter-eksekusi'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', applyFilter);
  });

  applyFilter();
}

function renderChartDaya(records, kategoriList) {
  if (chartDaya) chartDaya.destroy();
  const ctx = document.getElementById('chart-daya-distribusi');
  if (!ctx) return;

  const counts = kategoriList.map((k) => records.filter((r) => r.kategoriDaya === k).length);
  chartDaya = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: kategoriList,
      datasets: [{
        label: 'Jumlah Pelanggan',
        data: counts,
        backgroundColor: ['#38bdf8', '#818cf8', '#f59e0b', '#f43f5e'],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.3)' } },
        y: { ticks: { color: '#e2e8f0', font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}