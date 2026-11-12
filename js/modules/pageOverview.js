import { CONFIG } from '../config.js';
import { formatRupiah, formatRupiahSingkat, formatNumber } from '../utils/formatter.js';
import { rekapPerDaerah } from '../services/daerahMapper.js';

let chartBulanan = null;
let chartEksekusi = null;

export function renderPageOverview(container, records) {
  const totalBarisTransaksi = records.length;

  // Mengelompokkan berdasarkan IDPEL unik agar pelanggan yang sama dihitung 1 kali
  const mapPelangganUnik = new Map();
  records.forEach((r) => {
    if (!mapPelangganUnik.has(r.idpel)) {
      mapPelangganUnik.set(r.idpel, {
        idpel: r.idpel,
        tarif: r.tarif,
        daerah: r.daerah,
        daya: r.daya,
        masihAdaBelumLunas: !r.isLunas
      });
    } else {
      const existing = mapPelangganUnik.get(r.idpel);
      if (!r.isLunas) existing.masihAdaBelumLunas = true;
    }
  });

  const listPelangganUnik = Array.from(mapPelangganUnik.values());
  const totalPelangganUnik = listPelangganUnik.length;
  const pelangganUnikBelumLunas = listPelangganUnik.filter((p) => p.masihAdaBelumLunas).length;
  const pelangganUnikLunas = totalPelangganUnik - pelangganUnikBelumLunas;

  // Untuk Rupiah, Daya, dan Eksekusi tetap dijumlahkan seluruhnya dari semua baris
  const lunasList = records.filter((r) => r.isLunas);
  const belumList = records.filter((r) => !r.isLunas);

  const totalRupiah = records.reduce((acc, r) => acc + r.rptag, 0);
  const rupiahLunas = lunasList.reduce((acc, r) => acc + r.rptag, 0);
  const rupiahBelum = belumList.reduce((acc, r) => acc + r.rptag, 0);

  const totalDayaVA = records.reduce((acc, r) => acc + r.daya, 0);
  const totalDayaMVA = (totalDayaVA / 1_000_000).toFixed(2);

  const shuntripCount = records.filter((r) => r.eksekusiTE === 'Shuntrip').length;
  const modemOffCount = records.filter((r) => r.eksekusiTE === 'Modem Off').length;
  const daerahList = rekapPerDaerah(records);

  const persenLunasPelanggan = totalPelangganUnik
    ? ((pelangganUnikLunas / totalPelangganUnik) * 100).toFixed(1)
    : 0;

  const unikR3 = listPelangganUnik.filter((p) => p.tarif === 'R3').length;
  const unikB2 = listPelangganUnik.filter((p) => p.tarif === 'B2').length;
  const unikTebet = listPelangganUnik.filter((p) => p.daerah === 'TEBET').length;
  const unikCipinang = listPelangganUnik.filter((p) => p.daerah === 'CIPINANG').length;

  container.innerHTML = `
    <!-- 5 KARTU PILAR UTAMA -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <!-- 1. Jumlah Pelanggan (IDPEL Unik Tanpa Berulang) -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Pelanggan</span>
          <div class="p-2 rounded-lg bg-cyan-500/15 text-cyan-400"><i data-lucide="users" class="w-5 h-5"></i></div>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3">${formatNumber(totalPelangganUnik)}</p>
        <p class="text-xs text-slate-400 mt-1">Akumulasi Tagihan: <strong class="text-slate-200">${formatNumber(totalBarisTransaksi)}x</strong></p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-emerald-400 font-semibold">Lunas: ${formatNumber(pelangganUnikLunas)} (${persenLunasPelanggan}%)</span>
          <span class="text-rose-400 font-semibold">Sisa: ${formatNumber(pelangganUnikBelumLunas)}</span>
        </div>
      </div>

      <!-- 2. Total Rupiah (Tetap Dijumlahkan Semua) -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Rupiah</span>
          <div class="p-2 rounded-lg bg-emerald-500/15 text-emerald-400"><i data-lucide="wallet" class="w-5 h-5"></i></div>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3" title="${formatRupiah(totalRupiah)}">${formatRupiahSingkat(totalRupiah)}</p>
        <p class="text-xs text-slate-400 mt-1 truncate">${formatRupiah(totalRupiah)}</p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-emerald-400 font-semibold">Lunas: ${formatRupiahSingkat(rupiahLunas)}</span>
          <span class="text-rose-400 font-semibold">Sisa: ${formatRupiahSingkat(rupiahBelum)}</span>
        </div>
      </div>

      <!-- 3. Kapasitas Daya (Tetap Dijumlahkan) -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Daya</span>
          <div class="p-2 rounded-lg bg-amber-500/15 text-amber-400"><i data-lucide="zap" class="w-5 h-5"></i></div>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3">${totalDayaMVA} MVA</p>
        <p class="text-xs text-slate-400 mt-1">${formatNumber(totalDayaVA)} VA Terpasang</p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-amber-300 font-semibold">R3: ${formatNumber(unikR3)} Plg</span>
          <span class="text-sky-300 font-semibold">B2: ${formatNumber(unikB2)} Plg</span>
        </div>
      </div>

      <!-- 4. Lingkup Daerah (Pelanggan Unik per Daerah) -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Lingkup Daerah</span>
          <div class="p-2 rounded-lg bg-purple-500/15 text-purple-400"><i data-lucide="map-pin" class="w-5 h-5"></i></div>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3">${daerahList.length} Kawasan</p>
        <p class="text-xs text-slate-400 mt-1 truncate">Tertinggi: <strong class="text-purple-300">${daerahList[0]?.daerah || '-'}</strong></p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-slate-300">Tebet: ${formatNumber(unikTebet)}</span>
          <span class="text-slate-300">Cipinang: ${formatNumber(unikCipinang)}</span>
        </div>
      </div>

      <!-- 5. Status Eksekusi Shunt Trip (Tetap Dijumlahkan Semua) -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Eksekusi TE</span>
          <div class="p-2 rounded-lg bg-rose-500/15 text-rose-400"><i data-lucide="shield-alert" class="w-5 h-5"></i></div>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3">${formatNumber(shuntripCount)} Shuntrip</p>
        <p class="text-xs text-slate-400 mt-1">Modem Off: <strong class="text-amber-300">${formatNumber(modemOffCount)}</strong></p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-cyan-400 font-semibold">Req Niaga: ${formatNumber(records.filter(r => r.requestNiaga === 'Request').length)}</span>
          <span class="text-slate-400">Tanpa Eks: ${formatNumber(totalBarisTransaksi - shuntripCount - modemOffCount)}</span>
        </div>
      </div>
    </div>

    <!-- GRAFIK TREN RUPIAH BULANAN & KOMPOSISI EKSEKUSI -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="glass-card p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-base font-bold text-white">Tren Rupiah Tagihan & Pelunasan per Bulan</h3>
            <p class="text-xs text-slate-400">Perbandingan Rupiah Lunas vs Sisa Tunggakan (Januari - Oktober 2026)</p>
          </div>
        </div>
        <div class="h-72">
          <canvas id="chart-overview-bulanan"></canvas>
        </div>
      </div>

      <div class="glass-card p-6">
        <h3 class="text-base font-bold text-white mb-1">Komposisi Eksekusi Lapangan</h3>
        <p class="text-xs text-slate-400 mb-4">Proporsi Shuntrip, Modem Off, & Belum Eksekusi</p>
        <div class="h-64 flex items-center justify-center">
          <canvas id="chart-overview-eksekusi"></canvas>
        </div>
      </div>
    </div>

    <!-- TABEL REKAPITULASI BULANAN -->
    <div class="glass-card overflow-hidden">
      <div class="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 class="text-base font-bold text-white">Tabel Rekapitulasi Bulanan AMR 2026</h3>
          <p class="text-xs text-slate-400">Rincian pelanggan unik per bulan, eksekusi Shuntrip, Modem Off, dan realisasi pelunasan Rupiah</p>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left data-table text-xs">
          <thead>
            <tr>
              <th class="py-3.5 px-4">Bulan</th>
              <th class="py-3.5 px-4 text-right">Pelanggan (IDPEL)</th>
              <th class="py-3.5 px-4 text-right">Shuntrip</th>
              <th class="py-3.5 px-4 text-right">Modem Off</th>
              <th class="py-3.5 px-4 text-right">Sudah Lunas</th>
              <th class="py-3.5 px-4 text-right">Belum Lunas</th>
              <th class="py-3.5 px-4 text-right">Total Rupiah</th>
              <th class="py-3.5 px-4 text-right">Rupiah Lunas</th>
              <th class="py-3.5 px-4 text-right">Sisa Belum Lunas</th>
            </tr>
          </thead>
          <tbody id="tbody-rekap-bulanan"></tbody>
        </table>
      </div>
    </div>
  `;

  renderTabelDanGrafikBulanan(records, shuntripCount, modemOffCount, totalBarisTransaksi);
  if (window.lucide) window.lucide.createIcons();
}

function renderTabelDanGrafikBulanan(records, shuntripCount, modemOffCount, totalBarisTransaksi) {
  const monthsPresent = CONFIG.MONTH_ORDER.filter((m) => records.some((r) => r.bulan === m));
  const tbody = document.getElementById('tbody-rekap-bulanan');
  const labels = [];
  const dataRupiahLunas = [];
  const dataRupiahBelum = [];

  tbody.innerHTML = monthsPresent.map((bulan) => {
    const items = records.filter((r) => r.bulan === bulan);
    const unikIdpelBulan = new Set(items.map((r) => r.idpel)).size;
    const lunas = items.filter((r) => r.isLunas);
    const belum = items.filter((r) => !r.isLunas);
    const rpTotal = items.reduce((a, b) => a + b.rptag, 0);
    const rpLunas = lunas.reduce((a, b) => a + b.rptag, 0);
    const rpBelum = belum.reduce((a, b) => a + b.rptag, 0);
    const shunt = items.filter((r) => r.eksekusiTE === 'Shuntrip').length;
    const modem = items.filter((r) => r.eksekusiTE === 'Modem Off').length;

    labels.push(bulan);
    dataRupiahLunas.push(rpLunas);
    dataRupiahBelum.push(rpBelum);

    return `
      <tr>
        <td class="py-3 px-4 font-bold text-white">${bulan}</td>
        <td class="py-3 px-4 text-right font-semibold">${formatNumber(unikIdpelBulan)}</td>
        <td class="py-3 px-4 text-right text-cyan-400">${formatNumber(shunt)}</td>
        <td class="py-3 px-4 text-right text-amber-400">${formatNumber(modem)}</td>
        <td class="py-3 px-4 text-right text-emerald-400 font-semibold">${formatNumber(lunas.length)}</td>
        <td class="py-3 px-4 text-right text-rose-400 font-semibold">${formatNumber(belum.length)}</td>
        <td class="py-3 px-4 text-right font-bold text-slate-200">${formatRupiah(rpTotal)}</td>
        <td class="py-3 px-4 text-right text-emerald-400">${formatRupiah(rpLunas)}</td>
        <td class="py-3 px-4 text-right text-rose-400">${formatRupiah(rpBelum)}</td>
      </tr>
    `;
  }).join('');

  if (chartBulanan) chartBulanan.destroy();
  const ctx1 = document.getElementById('chart-overview-bulanan');
  if (ctx1) {
    chartBulanan = new window.Chart(ctx1, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Rupiah Lunas',
            data: dataRupiahLunas,
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 6
          },
          {
            label: 'Sisa Tunggakan',
            data: dataRupiahBelum,
            backgroundColor: 'rgba(244, 63, 94, 0.85)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#cbd5e1' } }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
          y: {
            ticks: {
              color: '#94a3b8',
              callback: (val) => 'Rp ' + (val / 1_000_000).toFixed(0) + ' Jt'
            },
            grid: { color: 'rgba(51, 65, 85, 0.3)' }
          }
        }
      }
    });
  }

  if (chartEksekusi) chartEksekusi.destroy();
  const ctx2 = document.getElementById('chart-overview-eksekusi');
  if (ctx2) {
    const belumEks = Math.max(0, totalBarisTransaksi - shuntripCount - modemOffCount);
    chartEksekusi = new window.Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Shuntrip', 'Modem Off', 'Belum Eksekusi'],
        datasets: [{
          data: [shuntripCount, modemOffCount, belumEks],
          backgroundColor: ['#06b6d4', '#f59e0b', '#475569'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#cbd5e1', padding: 16 } }
        }
      }
    });
  }
}