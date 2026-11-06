import { formatRupiah, formatNumber } from '../utils/formatter.js';

export function renderPageHabitTracker(container, allRecords) {
  const mapPelanggan = {};
  allRecords.forEach((r) => {
    if (!mapPelanggan[r.idpel]) {
      mapPelanggan[r.idpel] = {
        idpel: r.idpel,
        nama: r.nama,
        tarif: r.tarif,
        daya: r.daya,
        daerah: r.daerah,
        alamat: r.alamat,
        frekuensi: 0,
        bulanList: [],
        totalTagihanAkumulasi: 0,
        kaliShuntrip: 0,
        masihNunggak: 0
      };
    }
    const item = mapPelanggan[r.idpel];
    item.frekuensi += 1;
    if (!item.bulanList.includes(r.bulan)) item.bulanList.push(r.bulan);
    item.totalTagihanAkumulasi += r.rptag;
    if (r.eksekusiTE === 'Shuntrip') item.kaliShuntrip += 1;
    if (!r.isLunas) item.masihNunggak += 1;
  });

  const habitList = Object.values(mapPelanggan)
    .filter((p) => p.frekuensi >= 2)
    .sort((a, b) => b.frekuensi - a.frekuensi || b.totalTagihanAkumulasi - a.totalTagihanAkumulasi);

  container.innerHTML = `
    <div class="glass-card p-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">ANALITIK HABIT PELANGGAN</span>
          <h3 class="text-lg font-extrabold text-white mt-2">Detektor Pelanggan Langganan Nunggak (${formatNumber(habitList.length)} IDPEL)</h3>
          <p class="text-xs text-slate-400">Daftar pelanggan yang muncul berulang kali (2 s.d. 10 bulan) pada daftar monitoring Shunt Trip 2026</p>
        </div>
        <input id="search-habit" type="text" placeholder="Cari IDPEL atau Nama..." class="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 w-full md:w-72" />
      </div>
    </div>

    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto max-h-[540px]">
        <table class="w-full text-left data-table text-xs">
          <thead class="sticky top-0 z-10">
            <tr>
              <th class="py-3.5 px-4">Frekuensi</th>
              <th class="py-3.5 px-4">IDPEL & Nama Pelanggan</th>
              <th class="py-3.5 px-4">Tarif / Daya</th>
              <th class="py-3.5 px-4">Lingkup Daerah</th>
              <th class="py-3.5 px-4">Riwayat Bulan Muncul</th>
              <th class="py-3.5 px-4 text-right">Eks. Shuntrip</th>
              <th class="py-3.5 px-4 text-right">Total Akumulasi Tagihan</th>
            </tr>
          </thead>
          <tbody id="tbody-habit-tracker"></tbody>
        </table>
      </div>
    </div>
  `;

  const renderRows = () => {
    const q = (document.getElementById('search-habit')?.value || '').toLowerCase().trim();
    const filtered = habitList.filter((p) => `${p.idpel} ${p.nama} ${p.daerah}`.toLowerCase().includes(q));

    document.getElementById('tbody-habit-tracker').innerHTML = filtered.slice(0, 200).map((p) => `
      <tr>
        <td class="py-3 px-4">
          <span class="px-2.5 py-1 rounded-full text-xs font-extrabold ${
            p.frekuensi >= 6 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300'
          }">${p.frekuensi}x Bulan</span>
        </td>
        <td class="py-3 px-4">
          <div class="font-bold text-white">${p.nama}</div>
          <div class="font-mono text-[11px] text-cyan-400">${p.idpel}</div>
        </td>
        <td class="py-3 px-4 font-semibold text-amber-300">${p.tarif} / ${formatNumber(p.daya)} VA</td>
        <td class="py-3 px-4 font-semibold text-purple-300">${p.daerah}</td>
        <td class="py-3 px-4 max-w-xs">
          <div class="flex flex-wrap gap-1">
            ${p.bulanList.map((b) => `<span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">${b}</span>`).join('')}
          </div>
        </td>
        <td class="py-3 px-4 text-right font-bold text-cyan-400">${p.kaliShuntrip}x</td>
        <td class="py-3 px-4 text-right font-extrabold text-white">${formatRupiah(p.totalTagihanAkumulasi)}</td>
      </tr>
    `).join('');
  };

  document.getElementById('search-habit').addEventListener('input', renderRows);
  renderRows();
}