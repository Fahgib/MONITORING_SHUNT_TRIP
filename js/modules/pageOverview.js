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
  const tanpaEksCount = totalBarisTransaksi - shuntripCount - modemOffCount;
  const reqNiagaCount = records.filter((r) => r.requestNiaga === 'Request').length;
  const daerahList = rekapPerDaerah(records);

  const persenLunasPelanggan = totalPelangganUnik
    ? ((pelangganUnikLunas / totalPelangganUnik) * 100).toFixed(1)
    : 0;
  const persenRupiahLunas = totalRupiah
    ? ((rupiahLunas / totalRupiah) * 100).toFixed(1)
    : 0;

  const unikR3 = listPelangganUnik.filter((p) => p.tarif === 'R3').length;
  const unikB2 = listPelangganUnik.filter((p) => p.tarif === 'B2').length;
  const unikLainnya = totalPelangganUnik - unikR3 - unikB2;
  const unikTebet = listPelangganUnik.filter((p) => p.daerah === 'TEBET').length;
  const unikCipinang = listPelangganUnik.filter((p) => p.daerah === 'CIPINANG').length;

  // Menghitung rincian per bulan untuk ditampilkan di dalam pop-up penjelasan ikon
  const monthsPresent = CONFIG.MONTH_ORDER.filter((m) => records.some((r) => r.bulan === m));
  const seenIdpel = new Set();
  const rincianBulanan = monthsPresent.map((bulan) => {
    const items = records.filter((r) => r.bulan === bulan);
    let baruCount = 0;
    let berulangCount = 0;
    items.forEach((it) => {
      if (!seenIdpel.has(it.idpel)) {
        baruCount += 1;
        seenIdpel.add(it.idpel);
      } else {
        berulangCount += 1;
      }
    });

    const lunasItems = items.filter((r) => r.isLunas);
    const belumItems = items.filter((r) => !r.isLunas);
    const rpTotal = items.reduce((a, b) => a + b.rptag, 0);
    const rpLunas = lunasItems.reduce((a, b) => a + b.rptag, 0);
    const rpBelum = belumItems.reduce((a, b) => a + b.rptag, 0);
    const dayaVA = items.reduce((a, b) => a + b.daya, 0);
    const shunt = items.filter((r) => r.eksekusiTE === 'Shuntrip').length;
    const modem = items.filter((r) => r.eksekusiTE === 'Modem Off').length;
    const tanpaEks = items.length - shunt - modem;
    const req = items.filter((r) => r.requestNiaga === 'Request').length;

    return {
      bulan,
      totalBaris: items.length,
      baruCount,
      berulangCount,
      kumulatifUnik: seenIdpel.size,
      rpTotal,
      rpLunas,
      rpBelum,
      dayaVA,
      dayaMVA: (dayaVA / 1_000_000).toFixed(2),
      shunt,
      modem,
      tanpaEks,
      req
    };
  });

  container.innerHTML = `
    <!-- 5 KARTU PILAR UTAMA DENGAN IKON PENJELASAN RINCIAN PER BULAN -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
      <!-- 1. Jumlah Pelanggan -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Jumlah Pelanggan</span>
          <button data-info="pelanggan" title="Klik untuk melihat rincian penjumlahan per bulan" class="btn-icon-info p-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 transition cursor-pointer">
            <i data-lucide="users" class="w-5 h-5"></i>
          </button>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3">${formatNumber(totalPelangganUnik)}</p>
        <p class="text-xs text-slate-400 mt-1">Akumulasi Tagihan: <strong class="text-slate-200">${formatNumber(totalBarisTransaksi)}x</strong></p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-emerald-400 font-semibold">Lunas: ${formatNumber(pelangganUnikLunas)} (${persenLunasPelanggan}%)</span>
          <span class="text-rose-400 font-semibold">Sisa: ${formatNumber(pelangganUnikBelumLunas)}</span>
        </div>
      </div>

      <!-- 2. Total Rupiah -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Rupiah</span>
          <button data-info="rupiah" title="Klik untuk melihat rincian penjumlahan Rupiah per bulan" class="btn-icon-info p-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 transition cursor-pointer">
            <i data-lucide="wallet" class="w-5 h-5"></i>
          </button>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3" title="${formatRupiah(totalRupiah)}">${formatRupiahSingkat(totalRupiah)}</p>
        <p class="text-xs text-slate-400 mt-1 truncate">${formatRupiah(totalRupiah)}</p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-emerald-400 font-semibold">Lunas: ${formatRupiahSingkat(rupiahLunas)}</span>
          <span class="text-rose-400 font-semibold">Sisa: ${formatRupiahSingkat(rupiahBelum)}</span>
        </div>
      </div>

      <!-- 3. Kapasitas Daya -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Total Daya</span>
          <button data-info="daya" title="Klik untuk melihat rincian penjumlahan Daya per bulan" class="btn-icon-info p-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 transition cursor-pointer">
            <i data-lucide="zap" class="w-5 h-5"></i>
          </button>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3">${totalDayaMVA} MVA</p>
        <p class="text-xs text-slate-400 mt-1">${formatNumber(totalDayaVA)} VA Terpasang</p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-amber-300 font-semibold">R3: ${formatNumber(unikR3)} Plg</span>
          <span class="text-sky-300 font-semibold">B2: ${formatNumber(unikB2)} Plg</span>
        </div>
      </div>

      <!-- 4. Lingkup Daerah -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Lingkup Daerah</span>
          <button data-info="daerah" title="Klik untuk melihat rincian per Kawasan dan Bulan" class="btn-icon-info p-2 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-400 transition cursor-pointer">
            <i data-lucide="map-pin" class="w-5 h-5"></i>
          </button>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3">${daerahList.length} Kawasan</p>
        <p class="text-xs text-slate-400 mt-1 truncate">Tertinggi: <strong class="text-purple-300">${daerahList[0]?.daerah || '-'}</strong></p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-slate-300">Tebet: ${formatNumber(unikTebet)}</span>
          <span class="text-slate-300">Cipinang: ${formatNumber(unikCipinang)}</span>
        </div>
      </div>

      <!-- 5. Status Eksekusi Shunt Trip -->
      <div class="glass-card p-5">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Eksekusi TE</span>
          <button data-info="eksekusi" title="Klik untuk melihat rincian Eksekusi per bulan" class="btn-icon-info p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 transition cursor-pointer">
            <i data-lucide="shield-alert" class="w-5 h-5"></i>
          </button>
        </div>
        <p class="text-2xl font-extrabold text-white mt-3">${formatNumber(shuntripCount)} Shuntrip</p>
        <p class="text-xs text-slate-400 mt-1">Modem Off: <strong class="text-amber-300">${formatNumber(modemOffCount)}</strong></p>
        <div class="mt-3 pt-3 border-t border-slate-800/80 flex justify-between text-xs">
          <span class="text-cyan-400 font-semibold">Req Niaga: ${formatNumber(reqNiagaCount)}</span>
          <span class="text-slate-400">Tanpa Eks: ${formatNumber(tanpaEksCount)}</span>
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

  setupIconExplanations(container, {
    totalPelangganUnik,
    totalBarisTransaksi,
    pelangganUnikLunas,
    pelangganUnikBelumLunas,
    persenLunasPelanggan,
    totalRupiah,
    rupiahLunas,
    rupiahBelum,
    persenRupiahLunas,
    totalDayaVA,
    totalDayaMVA,
    unikR3,
    unikB2,
    unikLainnya,
    daerahList,
    shuntripCount,
    modemOffCount,
    tanpaEksCount,
    reqNiagaCount,
    rincianBulanan
  });

  renderTabelDanGrafikBulanan(records, shuntripCount, modemOffCount, totalBarisTransaksi);
  if (window.lucide) window.lucide.createIcons();
}

function setupIconExplanations(container, stats) {
  const totalBerulang = stats.totalBarisTransaksi - stats.totalPelangganUnik;

  const infoMap = {
    pelanggan: {
      title: 'Penjelasan Angka Jumlah Pelanggan',
      html: `
        <div class="text-left text-xs space-y-3 leading-relaxed">
          <p><strong>Mengapa angkanya ${formatNumber(stats.totalPelangganUnik)}?</strong><br/>
          Sistem membaca kolom <code>IDPEL</code> dan menyaring nomor yang unik (tanpa duplikasi). Jika 1 pelanggan yang sama muncul di beberapa bulan, sistem tetap menghitungnya sebagai <strong>1 Pelanggan Unik</strong>.</p>
          <div class="p-3 rounded-xl bg-slate-900 text-slate-100 space-y-1">
            <div>• <strong>Pelanggan Unik (IDPEL):</strong> ${formatNumber(stats.totalPelangganUnik)} Pelanggan</div>
            <div>• <strong>Akumulasi Baris Tagihan:</strong> ${formatNumber(stats.totalBarisTransaksi)}x kemunculan (${formatNumber(stats.totalPelangganUnik)} IDPEL Baru + ${formatNumber(totalBerulang)} IDPEL Berulang)</div>
            <div>• <strong>Sudah Lunas Penuh:</strong> ${formatNumber(stats.pelangganUnikLunas)} Pelanggan (${stats.persenLunasPelanggan}%)</div>
            <div>• <strong>Masih Memiliki Tunggakan:</strong> ${formatNumber(stats.pelangganUnikBelumLunas)} Pelanggan</div>
          </div>
          <p class="font-bold text-cyan-400 pt-1">Rincian Penjumlahan Pelanggan per Bulan:</p>
          <div class="max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-2">
            <table class="w-full text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-slate-700 text-slate-400">
                  <th class="py-1.5 text-left">Bulan</th>
                  <th class="py-1.5 text-right">Total Plg</th>
                  <th class="py-1.5 text-right text-emerald-400">+ IDPEL Baru</th>
                  <th class="py-1.5 text-right text-amber-300">IDPEL Berulang</th>
                  <th class="py-1.5 text-right text-cyan-300">Kumulatif Unik</th>
                </tr>
              </thead>
              <tbody>
                ${stats.rincianBulanan.map((m) => `
                  <tr class="border-b border-slate-800/80">
                    <td class="py-1 font-semibold">${m.bulan}</td>
                    <td class="py-1 text-right">${formatNumber(m.totalBaris)}</td>
                    <td class="py-1 text-right font-bold text-emerald-400">+${formatNumber(m.baruCount)}</td>
                    <td class="py-1 text-right text-amber-300">${formatNumber(m.berulangCount)}</td>
                    <td class="py-1 text-right font-bold text-cyan-300">${formatNumber(m.kumulatifUnik)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="font-extrabold text-white bg-slate-900">
                  <td class="py-1.5">TOTAL</td>
                  <td class="py-1.5 text-right">${formatNumber(stats.totalBarisTransaksi)}</td>
                  <td class="py-1.5 text-right text-emerald-400">${formatNumber(stats.totalPelangganUnik)} Unik</td>
                  <td class="py-1.5 text-right text-amber-300">${formatNumber(totalBerulang)}</td>
                  <td class="py-1.5 text-right text-cyan-300">${formatNumber(stats.totalPelangganUnik)} Plg</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `
    },
    rupiah: {
      title: 'Penjelasan Perhitungan Total Rupiah',
      html: `
        <div class="text-left text-xs space-y-3 leading-relaxed">
          <p><strong>Mengapa hasilnya ${formatRupiahSingkat(stats.totalRupiah)} (${formatRupiah(stats.totalRupiah)})?</strong><br/>
          Nilai tagihan pada kolom <code>RPTAG</code> <strong>dijumlahkan seluruhnya dari setiap bulan</strong> (${formatNumber(stats.totalBarisTransaksi)} baris tagihan).</p>
          <div class="p-3 rounded-xl bg-slate-900 text-slate-100 space-y-1">
            <div>• <strong>Total Tagihan (RPTAG):</strong> ${formatRupiah(stats.totalRupiah)}</div>
            <div>• <strong>Rupiah Sudah Lunas:</strong> ${formatRupiah(stats.rupiahLunas)} (${stats.persenRupiahLunas}%)</div>
            <div>• <strong>Sisa Belum Lunas:</strong> ${formatRupiah(stats.rupiahBelum)}</div>
          </div>
          <p class="font-bold text-emerald-400 pt-1">Rincian Penjumlahan Rupiah per Bulan:</p>
          <div class="max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-2">
            <table class="w-full text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-slate-700 text-slate-400">
                  <th class="py-1.5 text-left">Bulan</th>
                  <th class="py-1.5 text-right">Total Tagihan (Rp)</th>
                  <th class="py-1.5 text-right text-emerald-400">Sudah Lunas</th>
                  <th class="py-1.5 text-right text-rose-400">Belum Lunas</th>
                </tr>
              </thead>
              <tbody>
                ${stats.rincianBulanan.map((m) => `
                  <tr class="border-b border-slate-800/80">
                    <td class="py-1 font-semibold">${m.bulan}</td>
                    <td class="py-1 text-right font-bold">+ ${formatRupiah(m.rpTotal)}</td>
                    <td class="py-1 text-right text-emerald-400">${formatRupiah(m.rpLunas)}</td>
                    <td class="py-1 text-right text-rose-400">${formatRupiah(m.rpBelum)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="font-extrabold text-white bg-slate-900">
                  <td class="py-1.5">TOTAL</td>
                  <td class="py-1.5 text-right text-cyan-300">${formatRupiah(stats.totalRupiah)}</td>
                  <td class="py-1.5 text-right text-emerald-400">${formatRupiah(stats.rupiahLunas)}</td>
                  <td class="py-1.5 text-right text-rose-400">${formatRupiah(stats.rupiahBelum)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `
    },
    daya: {
      title: 'Penjelasan Perhitungan Total Daya',
      html: `
        <div class="text-left text-xs space-y-3 leading-relaxed">
          <p><strong>Mengapa hasilnya ${stats.totalDayaMVA} MVA?</strong><br/>
          Sistem menjumlahkan kapasitas daya pada kolom <code>DAYA</code> dari setiap bulan dalam satuan VA lalu membaginya dengan <code>1.000.000</code>.</p>
          <div class="p-3 rounded-xl bg-slate-900 text-slate-100 space-y-1">
            <div>• <strong>Rumus Konversi:</strong> ${formatNumber(stats.totalDayaVA)} VA ÷ 1.000.000 = <strong>${stats.totalDayaMVA} MVA</strong></div>
            <div>• <strong>Pelanggan Unik Tarif R3:</strong> ${formatNumber(stats.unikR3)} Plg | <strong>Tarif B2:</strong> ${formatNumber(stats.unikB2)} Plg | <strong>Lainnya:</strong> ${formatNumber(stats.unikLainnya)} Plg</div>
          </div>
          <p class="font-bold text-amber-400 pt-1">Rincian Penjumlahan Daya per Bulan:</p>
          <div class="max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-2">
            <table class="w-full text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-slate-700 text-slate-400">
                  <th class="py-1.5 text-left">Bulan</th>
                  <th class="py-1.5 text-right">Pelanggan</th>
                  <th class="py-1.5 text-right text-amber-300">Total Daya (VA)</th>
                  <th class="py-1.5 text-right text-cyan-300">Daya (MVA)</th>
                </tr>
              </thead>
              <tbody>
                ${stats.rincianBulanan.map((m) => `
                  <tr class="border-b border-slate-800/80">
                    <td class="py-1 font-semibold">${m.bulan}</td>
                    <td class="py-1 text-right">${formatNumber(m.totalBaris)}</td>
                    <td class="py-1 text-right font-bold text-amber-300">+ ${formatNumber(m.dayaVA)} VA</td>
                    <td class="py-1 text-right text-cyan-300">${m.dayaMVA} MVA</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="font-extrabold text-white bg-slate-900">
                  <td class="py-1.5">TOTAL</td>
                  <td class="py-1.5 text-right">${formatNumber(stats.totalBarisTransaksi)}</td>
                  <td class="py-1.5 text-right text-amber-300">${formatNumber(stats.totalDayaVA)} VA</td>
                  <td class="py-1.5 text-right text-cyan-300">${stats.totalDayaMVA} MVA</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `
    },
    daerah: {
      title: 'Penjelasan Pemetaan Lingkup Daerah',
      html: `
        <div class="text-left text-xs space-y-3 leading-relaxed">
          <p><strong>Mengapa muncul ${stats.daerahList.length} Kawasan?</strong><br/>
          Sistem membaca teks pada kolom <code>ALAMAT</code> dan mengelompokkan pelanggan unik serta menjumlahkan tagihan Rupiah per kawasan.</p>
          <div class="max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-2">
            <table class="w-full text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-slate-700 text-slate-400">
                  <th class="py-1.5 text-left">Kawasan / Daerah</th>
                  <th class="py-1.5 text-right">IDPEL Unik</th>
                  <th class="py-1.5 text-right text-emerald-400">Lunas</th>
                  <th class="py-1.5 text-right text-rose-400">Sisa</th>
                  <th class="py-1.5 text-right text-cyan-300">Akumulasi Rupiah</th>
                </tr>
              </thead>
              <tbody>
                ${stats.daerahList.map((d) => `
                  <tr class="border-b border-slate-800/80">
                    <td class="py-1 font-bold text-purple-300">${d.daerah}</td>
                    <td class="py-1 text-right font-bold">${formatNumber(d.totalPelanggan)}</td>
                    <td class="py-1 text-right text-emerald-400">${formatNumber(d.lunas)}</td>
                    <td class="py-1 text-right text-rose-400">${formatNumber(d.belumLunas)}</td>
                    <td class="py-1 text-right font-semibold">${formatRupiah(d.totalRupiah)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="font-extrabold text-white bg-slate-900">
                  <td class="py-1.5">TOTAL (${stats.daerahList.length} Kawasan)</td>
                  <td class="py-1.5 text-right">${formatNumber(stats.totalPelangganUnik)} Plg</td>
                  <td class="py-1.5 text-right text-emerald-400">${formatNumber(stats.pelangganUnikLunas)}</td>
                  <td class="py-1.5 text-right text-rose-400">${formatNumber(stats.pelangganUnikBelumLunas)}</td>
                  <td class="py-1.5 text-right text-cyan-300">${formatRupiah(stats.totalRupiah)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `
    },
    eksekusi: {
      title: 'Penjelasan Status Eksekusi TE per Bulan',
      html: `
        <div class="text-left text-xs space-y-3 leading-relaxed">
          <p><strong>Mengapa hasilnya ${formatNumber(stats.shuntripCount)} Shuntrip?</strong><br/>
          Sistem menjumlahkan tindakan pada kolom <code>Eksekusi TE</code> dan <code>Request Niaga</code> dari setiap bulan.</p>
          <div class="p-3 rounded-xl bg-slate-900 text-slate-100 space-y-1">
            <div>• <strong>Total Shuntrip:</strong> ${formatNumber(stats.shuntripCount)} | <strong>Modem Off:</strong> ${formatNumber(stats.modemOffCount)} | <strong>Tanpa Eks:</strong> ${formatNumber(stats.tanpaEksCount)}</div>
            <div>• <strong>Total Request Niaga:</strong> ${formatNumber(stats.reqNiagaCount)} pengajuan</div>
          </div>
          <p class="font-bold text-rose-400 pt-1">Rincian Penjumlahan Eksekusi per Bulan:</p>
          <div class="max-h-56 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-2">
            <table class="w-full text-[11px] text-slate-200">
              <thead>
                <tr class="border-b border-slate-700 text-slate-400">
                  <th class="py-1.5 text-left">Bulan</th>
                  <th class="py-1.5 text-right text-cyan-300">Shuntrip</th>
                  <th class="py-1.5 text-right text-amber-300">Modem Off</th>
                  <th class="py-1.5 text-right">Tanpa Eks</th>
                  <th class="py-1.5 text-right text-emerald-400">Req Niaga</th>
                </tr>
              </thead>
              <tbody>
                ${stats.rincianBulanan.map((m) => `
                  <tr class="border-b border-slate-800/80">
                    <td class="py-1 font-semibold">${m.bulan}</td>
                    <td class="py-1 text-right font-bold text-cyan-300">+${formatNumber(m.shunt)}</td>
                    <td class="py-1 text-right text-amber-300">+${formatNumber(m.modem)}</td>
                    <td class="py-1 text-right text-slate-400">${formatNumber(m.tanpaEks)}</td>
                    <td class="py-1 text-right text-emerald-400">${formatNumber(m.req)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="font-extrabold text-white bg-slate-900">
                  <td class="py-1.5">TOTAL</td>
                  <td class="py-1.5 text-right text-cyan-300">${formatNumber(stats.shuntripCount)}</td>
                  <td class="py-1.5 text-right text-amber-300">${formatNumber(stats.modemOffCount)}</td>
                  <td class="py-1.5 text-right">${formatNumber(stats.tanpaEksCount)}</td>
                  <td class="py-1.5 text-right text-emerald-400">${formatNumber(stats.reqNiagaCount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `
    }
  };

  container.querySelectorAll('.btn-icon-info').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-info');
      const item = infoMap[key];
      if (!item || !window.Swal) return;
      window.Swal.fire({
        title: item.title,
        html: item.html,
        width: 650,
        confirmButtonText: 'Mengerti',
        background: document.documentElement.classList.contains('dark') ? '#0f172a' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a'
      });
    });
  });
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