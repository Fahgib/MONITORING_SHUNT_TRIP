import { CONFIG } from '../config.js';
import { formatRupiah, formatNumber } from '../utils/formatter.js';

export function renderPageSosialisasi(container, allRecords) {
  const months = CONFIG.MONTH_ORDER;

  container.innerHTML = `
    <!-- PANEL KONTROL & FILTER PENUNGGAK -->
    <div class="glass-card p-6">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MODUL SOSIALISASI PELANGGAN</span>
          <h3 class="text-lg font-extrabold text-white mt-2">Daftar Penunggak per Bulan & Edukasi Pelanggan Baru</h3>
          <p class="text-xs text-slate-400">Pantau pelanggan yang belum lunas secara kronologis per bulan. Identifikasi penunggak pertama kali untuk sosialisasi pendekatan persuasif.</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <span class="text-xs text-slate-400 font-medium">Pilih Bulan:</span>
            <select id="filter-sos-bulan" class="bg-transparent text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer">
              <option value="ALL">Semua Bulan (Tunggakan Aktif)</option>
              ${months.map((m) => `<option value="${m}">${m} 2026</option>`).join('')}
            </select>
          </div>

          <div class="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <span class="text-xs text-slate-400 font-medium">Kategori:</span>
            <select id="filter-sos-kategori" class="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer">
              <option value="ALL">Semua Penunggak</option>
              <option value="BARU">Penunggak Baru (Pertama Kali Muncul)</option>
              <option value="BERULANG">Penunggak Berulang (>1 Bulan)</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Kotak Ringkasan Statistik Penunggak -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6" id="sos-stats-container"></div>
    </div>

    <!-- TABEL DAFTAR PENUNGGAK -->
    <div class="glass-card overflow-hidden">
      <div class="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h4 class="text-sm font-bold text-white" id="sos-table-title">Daftar Pelanggan Menunggak</h4>
          <p class="text-xs text-slate-400">Klik tombol "Buat Pesan Sosialisasi" untuk menyusun kalimat pendekatan bagi pelanggan</p>
        </div>
        <input id="search-sos-input" type="text" placeholder="Cari IDPEL / Nama Pelanggan..." class="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 w-64" />
      </div>
      <div class="overflow-x-auto max-h-[520px]">
        <table class="w-full text-left data-table text-xs">
          <thead class="sticky top-0 z-10">
            <tr>
              <th class="py-3.5 px-4">Bulan</th>
              <th class="py-3.5 px-4">IDPEL & Nama Pelanggan</th>
              <th class="py-3.5 px-4">Tarif / Daya</th>
              <th class="py-3.5 px-4">Kawasan</th>
              <th class="py-3.5 px-4 text-right">Tagihan (Rp)</th>
              <th class="py-3.5 px-4 text-center">Status Frekuensi (s.d. Bulan Ini)</th>
              <th class="py-3.5 px-4 text-center">Aksi Sosialisasi</th>
            </tr>
          </thead>
          <tbody id="tbody-sosialisasi"></tbody>
        </table>
      </div>
    </div>
  `;

  // Merekam daftar bulan unik kemunculan setiap IDPEL secara berurutan
  const idpelMonthsMap = {};
  allDataSorted(allRecords).forEach((r) => {
    if (!idpelMonthsMap[r.idpel]) {
      idpelMonthsMap[r.idpel] = [];
    }
    if (!idpelMonthsMap[r.idpel].includes(r.bulan)) {
      idpelMonthsMap[r.idpel].push(r.bulan);
    }
  });

  const updateView = () => {
    const selectedBulan = document.getElementById('filter-sos-bulan').value;
    const selectedKat = document.getElementById('filter-sos-kategori').value;
    const query = document.getElementById('search-sos-input').value.toLowerCase().trim();

    // Saring data yang belum lunas
    let rows = allRecords.filter((r) => !r.isLunas);
    if (selectedBulan !== 'ALL') {
      rows = rows.filter((r) => r.bulan === selectedBulan);
    }

    if (query) {
      rows = rows.filter((r) => `${r.idpel} ${r.nama} ${r.alamat}`.toLowerCase().includes(query));
    }

    // Klasifikasi kategori baru vs berulang secara KRONOLOGIS sampai bulan pada baris tersebut
    const processedRows = rows.map((r) => {
      const allMonthsForIdpel = idpelMonthsMap[r.idpel] || [];
      const currentMonthIdx = months.indexOf(r.bulan);

      // Hanya hitung bulan dari Januari sampai dengan bulan baris ini (r.bulan)
      const historyUpToCurrentMonth = allMonthsForIdpel.filter(
        (m) => months.indexOf(m) <= currentMonthIdx
      );

      const riwayatTotal = historyUpToCurrentMonth.length;
      const isBaruPertamaKali = riwayatTotal === 1;

      return {
        ...r,
        isBaruPertamaKali,
        riwayatTotal,
        riwayatBulanList: historyUpToCurrentMonth.join(', ')
      };
    });

    const finalRows = processedRows.filter((r) => {
      if (selectedKat === 'BARU' && !r.isBaruPertamaKali) return false;
      if (selectedKat === 'BERULANG' && r.isBaruPertamaKali) return false;
      return true;
    });

    const totalRpTunggakan = finalRows.reduce((a, b) => a + b.rptag, 0);
    const jumlahBaru = finalRows.filter((r) => r.isBaruPertamaKali).length;

    document.getElementById('sos-stats-container').innerHTML = `
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Total Pelanggan Menunggak</span>
        <p class="text-xl font-extrabold text-rose-400 mt-1">${formatNumber(finalRows.length)} Pelanggan</p>
      </div>
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Penunggak Baru (Target Sosialisasi)</span>
        <p class="text-xl font-extrabold text-amber-400 mt-1">${formatNumber(jumlahBaru)} Pelanggan</p>
      </div>
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Total Nilai Tagihan Menunggak</span>
        <p class="text-xl font-extrabold text-white mt-1">${formatRupiah(totalRpTunggakan)}</p>
      </div>
    `;

    const tbody = document.getElementById('tbody-sosialisasi');
    if (finalRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-slate-500">Tidak ada data penunggak yang sesuai dengan filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = finalRows.map((r) => `
      <tr>
        <td class="py-3 px-4 font-bold text-slate-300">${r.bulan}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-white">${r.nama}</div>
          <div class="font-mono text-[11px] text-cyan-400">${r.idpel}</div>
        </td>
        <td class="py-3 px-4 font-semibold text-amber-300">${r.tarif} / ${formatNumber(r.daya)} VA</td>
        <td class="py-3 px-4 font-semibold text-purple-300">${r.daerah}</td>
        <td class="py-3 px-4 text-right font-extrabold text-rose-400">${formatRupiah(r.rptag)}</td>
        <td class="py-3 px-4 text-center">
          ${
            r.isBaruPertamaKali
              ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30" title="Muncul pertama kali di ${r.bulan}">Baru (1x Tunggak)</span>`
              : `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30" title="Riwayat: ${r.riwayatBulanList}">Berulang (${r.riwayatTotal}x Bulan)</span>`
          }
          <div class="text-[10px] text-slate-400 mt-1">${r.riwayatBulanList}</div>
        </td>
        <td class="py-3 px-4 text-center">
          <button data-idpel="${r.idpel}" data-bulan="${r.bulan}" class="btn-sosialisasi px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 mx-auto">
            <i data-lucide="message-square" class="w-3.5 h-3.5"></i> Buat Pesan Sosialisasi
          </button>
        </td>
      </tr>
    `).join('');

    // Event Klik Tombol Buat Pesan Sosialisasi
    tbody.querySelectorAll('.btn-sosialisasi').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idpel = btn.getAttribute('data-idpel');
        const bulan = btn.getAttribute('data-bulan');
        const item = finalRows.find((x) => x.idpel === idpel && x.bulan === bulan);
        if (!item) return;

        const teksSosialisasi =
          `Yth. Bpk/Ibu *${item.nama}* (IDPEL: ${item.idpel}),\n\n` +
          `Kami dari petugas PLN UPJ Jatinegara menginformasikan bahwa tagihan rekening listrik untuk bulan *${item.bulan} 2026* dengan daya ${formatNumber(item.daya)} VA sebesar *${formatRupiah(item.rptag)}* terpantau belum melakukan pelunasan.\n\n` +
          (item.isBaruPertamaKali
            ? `Mengingat ini adalah kendala penunggakan pertama Bapak/Ibu di tahun 2026, kami ingin bersilaturahmi sekaligus membantu memberikan penjelasan terkait kemudahan layanan pembayaran serta pencegahan pemutusan otomatis (Shunt Trip).\n\n`
            : `Mengingat tagihan pada IDPEL ini tercatat sudah mengalami keterlambatan sebanyak *${item.riwayatTotal} kali* (${item.riwayatBulanList}), kami sangat mengharapkan kerja sama Bapak/Ibu untuk segera melakukan pelunasan guna menghindari pemutusan otomatis (Shunt Trip) maupun sanksi pembongkaran rampung.\n\n`) +
          `Mohon bantuannya untuk melakukan pelunasan melalui saluran resmi PLN Mobile atau perbankan terdekat. Terima kasih atas kerja sama dan perhatian Bapak/Ibu.\n\n` +
          `_Salam hangat,_\n*Tim Pelayanan Pelanggan PLN UPJ Jatinegara*`;

        window.Swal.fire({
          title: `Pesan Sosialisasi Pelanggan`,
          html: `
            <div class="text-left text-xs space-y-2">
              <p class="text-slate-300">Salin pesan edukasi dan sosialisasi ini untuk dikirimkan melalui WhatsApp kepada pelanggan:</p>
              <textarea readonly class="w-full h-48 bg-slate-950 text-emerald-300 p-3 rounded-xl border border-slate-800 focus:outline-none font-mono">${teksSosialisasi}</textarea>
            </div>
          `,
          confirmButtonText: 'Salin Teks ke Clipboard',
          background: '#0f172a',
          color: '#f8fafc'
        }).then((res) => {
          if (res.isConfirmed) {
            navigator.clipboard.writeText(teksSosialisasi);
            window.Swal.fire({ title: 'Berhasil Disalin!', icon: 'success', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#f8fafc' });
          }
        });
      });
    });

    if (window.lucide) window.lucide.createIcons();
  };

  document.getElementById('filter-sos-bulan').addEventListener('change', updateView);
  document.getElementById('filter-sos-kategori').addEventListener('change', updateView);
  document.getElementById('search-sos-input').addEventListener('input', updateView);

  updateView();
}

function allDataSorted(records) {
  return [...records].sort((a, b) => CONFIG.MONTH_ORDER.indexOf(a.bulan) - CONFIG.MONTH_ORDER.indexOf(b.bulan));
}