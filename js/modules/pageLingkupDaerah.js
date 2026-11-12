import { rekapPerDaerah } from '../services/daerahMapper.js';
import { formatRupiah, formatRupiahSingkat, formatNumber } from '../utils/formatter.js';

let chartDaerah = null;

export function renderPageLingkupDaerah(container, records) {
  const rekap = rekapPerDaerah(records);

  container.innerHTML = `
    <!-- GRAFIK PERBANDINGAN DAERAH -->
    <div class="glass-card p-6">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-bold text-white">Sebaran Pelanggan & Tagihan Berdasarkan Lingkup Daerah</h3>
          <p class="text-xs text-slate-400">Diekstrak otomatis dari alamat pelanggan (Klik kartu kawasan di bawah untuk memfilter rincian)</p>
        </div>
      </div>
      <div class="h-72">
        <canvas id="chart-lingkup-daerah"></canvas>
      </div>
    </div>

    <!-- KARTU KAWASAN INTERAKTIF -->
    <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4" id="grid-kartu-daerah">
      ${rekap.map((d) => {
        const persen = d.totalPelanggan ? ((d.lunas / d.totalPelanggan) * 100).toFixed(0) : 0;
        return `
          <div data-daerah="${d.daerah}" class="kartu-daerah cursor-pointer glass-card p-4 hover:border-cyan-400 transition">
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-cyan-400 truncate">${d.daerah}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200">${formatNumber(d.totalPelanggan)} Plg</span>
            </div>
            <p class="text-lg font-extrabold text-white mt-2">${formatRupiahSingkat(d.totalRupiah)}</p>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-emerald-400 h-full" style="width: ${persen}%"></div>
            </div>
            <div class="flex justify-between text-[11px] mt-2">
              <span class="text-emerald-400">Lunas: ${d.lunas} (${persen}%)</span>
              <span class="text-rose-400">Sisa: ${d.belumLunas}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- TABEL REKAP DAERAH -->
    <div class="glass-card overflow-hidden">
      <div class="p-5 border-b border-slate-800 flex items-center justify-between">
        <h3 class="text-base font-bold text-white" id="judul-tabel-daerah">Rekapitulasi Seluruh Lingkup Daerah</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left data-table text-xs">
          <thead>
            <tr>
              <th class="py-3.5 px-4">Lingkup Daerah</th>
              <th class="py-3.5 px-4 text-right">Jumlah Pelanggan</th>
              <th class="py-3.5 px-4 text-right">Total Daya (VA)</th>
              <th class="py-3.5 px-4 text-right">Shuntrip</th>
              <th class="py-3.5 px-4 text-right">Sudah Lunas</th>
              <th class="py-3.5 px-4 text-right">Belum Lunas</th>
              <th class="py-3.5 px-4 text-right">Total Tagihan (Rp)</th>
              <th class="py-3.5 px-4 text-right">Sisa Tunggakan (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${rekap.map((d) => `
              <tr>
                <td class="py-3 px-4 font-bold text-cyan-300">${d.daerah}</td>
                <td class="py-3 px-4 text-right font-semibold">${formatNumber(d.totalPelanggan)}</td>
                <td class="py-3 px-4 text-right text-amber-300">${formatNumber(d.totalDayaVA)} VA</td>
                <td class="py-3 px-4 text-right text-cyan-400">${formatNumber(d.shuntrip)}</td>
                <td class="py-3 px-4 text-right text-emerald-400 font-semibold">${formatNumber(d.lunas)}</td>
                <td class="py-3 px-4 text-right text-rose-400 font-semibold">${formatNumber(d.belumLunas)}</td>
                <td class="py-3 px-4 text-right font-bold text-white">${formatRupiah(d.totalRupiah)}</td>
                <td class="py-3 px-4 text-right text-rose-400 font-bold">${formatRupiah(d.rupiahBelum)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  renderGrafikDaerah(rekap);
}

function renderGrafikDaerah(rekap) {
  if (chartDaerah) chartDaerah.destroy();
  const ctx = document.getElementById('chart-lingkup-daerah');
  if (!ctx) return;

  chartDaerah = new window.Chart(ctx, {
    type: 'bar',
    data: {
      labels: rekap.map((d) => d.daerah),
      datasets: [
        {
          label: 'Pelanggan Lunas',
          data: rekap.map((d) => d.lunas),
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderRadius: 6
        },
        {
          label: 'Belum Lunas',
          data: rekap.map((d) => d.belumLunas),
          backgroundColor: 'rgba(244, 63, 94, 0.85)',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#cbd5e1', font: { size: 10 } }, grid: { display: false } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(51,65,85,0.3)' } }
      }
    }
  });
}