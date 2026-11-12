import { CONFIG } from '../config.js';
import { formatRupiah, formatNumber, formatTanggalIndo } from '../utils/formatter.js';

// Fungsi mengecek apakah pembayaran dilakukan lewat dari tanggal 20 bulan berjalan
function checkLatePayment(record, monthsOrder) {
  if (!record.isLunas || !record.tanggalLunas) {
    return {
      isNunggak: true,
      statusType: 'BELUM_LUNAS',
      dayPaid: null,
      formattedTglLunas: null
    };
  }

  const raw = String(record.tanggalLunas).trim();
  const bulanIdx = monthsOrder.indexOf(record.bulan); // 0 = Januari, 1 = Februari, dst.
  let day = null;
  let month = null;

  // Format ISO: YYYY-MM-DD (contoh: 2026-01-27)
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  } else {
    // Format DD/MM/YYYY atau DD-MM-YYYY atau "27 Jan 2026"
    const dmyMatch = raw.match(/^(\d{1,2})[/\-\s]([a-zA-Z0-9]+)/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      const mPart = dmyMatch[2].toLowerCase();
      if (/^\d+$/.test(mPart)) {
        month = parseInt(mPart, 10) - 1;
      } else {
        const monthPrefixes = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
        const foundIdx = monthPrefixes.findIndex((p) => mPart.startsWith(p));
        if (foundIdx !== -1) month = foundIdx;
      }
    }
  }

  const formattedTglLunas = formatTanggalIndo(record.tanggalLunas) || raw;

  if (day !== null) {
    // Jika dibayar di bulan berikutnya atau tanggal bayar > 20, tetap dihitung menunggak
    const isNextMonth = month !== null && bulanIdx !== -1 && month > bulanIdx;
    const isAfter20 = day > 20 || isNextMonth;

    return {
      isNunggak: isAfter20,
      statusType: isAfter20 ? 'LUNAS_LEWAT_20' : 'LUNAS_TEPAT_WAKTU',
      dayPaid: day,
      formattedTglLunas
    };
  }

  return {
    isNunggak: true,
    statusType: 'LUNAS_LEWAT_20',
    dayPaid: null,
    formattedTglLunas
  };
}

export function renderPageSosialisasi(container, allRecords) {
  const months = CONFIG.MONTH_ORDER;

  container.innerHTML = `
    <!-- PANEL KONTROL & FILTER PENUNGGAK -->
    <div class="glass-card p-6">
      <div>
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">MODUL SOSIALISASI PELANGGAN (BATAS TGL 20)</span>
        <h3 class="text-lg font-extrabold text-white mt-2">Daftar Penunggak per Bulan & Edukasi Pembayaran Tepat Waktu</h3>
        <p class="text-xs text-slate-400 mt-0.5">Pelanggan dihitung menunggak apabila <strong>Belum Lunas</strong> atau <strong>Lunas lewat dari tanggal 20</strong>. Klik badge frekuensi untuk rincian bulan.</p>
      </div>

      <!-- Baris Filter 4 Kolom Rapi & Sejajar -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
        <div class="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
          <span class="text-xs text-slate-400 font-medium whitespace-nowrap">Bulan:</span>
          <select id="filter-sos-bulan" class="bg-transparent text-xs font-bold text-cyan-400 focus:outline-none cursor-pointer text-right w-full">
            <option value="ALL">Semua Bulan (2026)</option>
            ${months.map((m) => `<option value="${m}">${m} 2026</option>`).join('')}
          </select>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
          <span class="text-xs text-slate-400 font-medium whitespace-nowrap">Kategori:</span>
          <select id="filter-sos-kategori" class="bg-transparent text-xs font-bold text-amber-400 focus:outline-none cursor-pointer text-right w-full">
            <option value="ALL">Semua Penunggak</option>
          </select>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
          <span class="text-xs text-slate-400 font-medium whitespace-nowrap">Status Bayar:</span>
          <select id="filter-sos-status" class="bg-transparent text-xs font-bold text-rose-400 focus:outline-none cursor-pointer text-right w-full">
            <option value="ALL">Semua Status</option>
            <option value="BELUM_LUNAS">Hanya Belum Lunas</option>
            <option value="LUNAS_LEWAT_20">Lunas (> Tanggal 20)</option>
          </select>
        </div>

        <div class="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-2">
          <span class="text-xs text-slate-400 font-medium whitespace-nowrap">Tgl Pelunasan:</span>
          <select id="filter-sos-tgl-lunas" class="bg-transparent text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer text-right w-full">
            <option value="ALL">Semua Tanggal</option>
          </select>
        </div>
      </div>

      <!-- Kotak Ringkasan Statistik Penunggak -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4" id="sos-stats-container"></div>
    </div>

    <!-- TABEL DAFTAR PENUNGGAK -->
    <div class="glass-card overflow-hidden">
      <div class="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 class="text-sm font-bold text-white" id="sos-table-title">Daftar Pelanggan Menunggak (Belum Lunas & Bayar > Tanggal 20)</h4>
          <p class="text-xs text-slate-400">Tekan tombol badge pada kolom <strong>Status Frekuensi</strong> untuk membuka rincian riwayat bulan & tanggal pelunasan</p>
        </div>
        <input id="search-sos-input" type="text" placeholder="Cari IDPEL / Nama Pelanggan..." class="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 w-full sm:w-64" />
      </div>
      <div class="overflow-x-auto max-h-[520px]">
        <table class="w-full text-left data-table text-xs">
          <thead class="sticky top-0 z-10">
            <tr>
              <th class="py-3.5 px-4 whitespace-nowrap">Bulan</th>
              <th class="py-3.5 px-4">IDPEL & Nama Pelanggan</th>
              <th class="py-3.5 px-4 whitespace-nowrap">Tarif / Daya</th>
              <th class="py-3.5 px-4 whitespace-nowrap">Kawasan</th>
              <th class="py-3.5 px-4 text-right whitespace-nowrap">Tagihan (Rp)</th>
              <th class="py-3.5 px-4 text-center whitespace-nowrap">Status & Tgl Pelunasan</th>
              <th class="py-3.5 px-4 text-center whitespace-nowrap">Status Frekuensi (s.d. Bulan Ini)</th>
              <th class="py-3.5 px-4 text-center whitespace-nowrap">Aksi Sosialisasi</th>
            </tr>
          </thead>
          <tbody id="tbody-sosialisasi"></tbody>
        </table>
      </div>
    </div>
  `;

  // Evaluasi setiap baris dengan aturan jatuh tempo tanggal 20
  const evaluatedRecords = allDataSorted(allRecords).map((r) => {
    const evalInfo = checkLatePayment(r, months);
    return {
      ...r,
      ...evalInfo
    };
  });

  // Menyimpan riwayat lengkap per IDPEL khusus yang terhitung menunggak
  const idpelRecordsMap = {};
  evaluatedRecords.forEach((r) => {
    if (!r.isNunggak) return;
    if (!idpelRecordsMap[r.idpel]) {
      idpelRecordsMap[r.idpel] = [];
    }
    const sudahAdaBulanIni = idpelRecordsMap[r.idpel].some((item) => item.bulan === r.bulan);
    if (!sudahAdaBulanIni) {
      idpelRecordsMap[r.idpel].push(r);
    }
  });

  // Opsi dropdown Kategori Nunggak (1 s.d. 12 mengikuti bulan)
  const updateKategoriOptions = () => {
    const selectedBulan = document.getElementById('filter-sos-bulan').value;
    const katSelect = document.getElementById('filter-sos-kategori');
    const prevValue = katSelect.value;

    const maxNunggak = selectedBulan === 'ALL' ? months.length : months.indexOf(selectedBulan) + 1;

    let optionsHtml = `<option value="ALL">Semua Penunggak</option>`;
    for (let i = 1; i <= maxNunggak; i++) {
      const label = i === 1 ? `Nunggak 1x (Baru)` : `Nunggak ${i}x`;
      optionsHtml += `<option value="${i}">${label}</option>`;
    }

    if (maxNunggak > 1) {
      optionsHtml += `<option value="BERULANG">Semua Berulang (>1x)</option>`;
    }

    katSelect.innerHTML = optionsHtml;

    const isStillValid =
      prevValue === 'ALL' ||
      (prevValue === 'BERULANG' && maxNunggak > 1) ||
      (!isNaN(parseInt(prevValue, 10)) && parseInt(prevValue, 10) <= maxNunggak);

    katSelect.value = isStillValid ? prevValue : 'ALL';
  };

  // Opsi dropdown Tanggal Pelunasan
  const updateTanggalLunasOptions = () => {
    const selectedBulan = document.getElementById('filter-sos-bulan').value;
    const selectedStatus = document.getElementById('filter-sos-status').value;
    const tglSelect = document.getElementById('filter-sos-tgl-lunas');
    const prevTgl = tglSelect.value;

    if (selectedStatus === 'BELUM_LUNAS') {
      tglSelect.innerHTML = `<option value="ALL">Semua Tanggal</option>`;
      tglSelect.value = 'ALL';
      tglSelect.disabled = true;
      tglSelect.classList.add('opacity-50', 'cursor-not-allowed');
      return;
    }

    tglSelect.disabled = false;
    tglSelect.classList.remove('opacity-50', 'cursor-not-allowed');

    let relevantRows = evaluatedRecords.filter((r) => r.isNunggak && r.statusType === 'LUNAS_LEWAT_20');
    if (selectedBulan !== 'ALL') {
      relevantRows = relevantRows.filter((r) => r.bulan === selectedBulan);
    }

    const uniqueDates = [];
    const seen = new Set();
    relevantRows.forEach((r) => {
      const tglLabel = r.formattedTglLunas || formatTanggalIndo(r.tanggalLunas);
      if (tglLabel && tglLabel !== '-' && !seen.has(tglLabel)) {
        seen.add(tglLabel);
        uniqueDates.push({
          label: tglLabel,
          dayPaid: r.dayPaid || 99
        });
      }
    });

    uniqueDates.sort((a, b) => a.dayPaid - b.dayPaid || a.label.localeCompare(b.label));

    let html = `<option value="ALL">Semua Tanggal</option>`;
    uniqueDates.forEach((d) => {
      html += `<option value="${d.label}">${d.label}</option>`;
    });

    tglSelect.innerHTML = html;
    tglSelect.value = seen.has(prevTgl) ? prevTgl : 'ALL';
  };

  // Pembuat teks WhatsApp
  const buildWhatsappText = (item) => {
    const tglLunasText = item.formattedTglLunas || formatTanggalIndo(item.tanggalLunas);
    const statusKalimat =
      item.statusType === 'BELUM_LUNAS'
        ? `terpantau *belum melakukan pelunasan* hingga melewati batas waktu tanggal 20.`
        : `tercatat melakukan pelunasan pada tanggal *${tglLunasText}* (melewati batas jatuh tempo tanggal 20 setiap bulannya).`;

    const edukasiKalimat = item.isBaruPertamaKali
      ? `Mengingat ini adalah keterlambatan pertama Bapak/Ibu di tahun 2026, kami ingin bersilaturahmi sekaligus mengingatkan agar ke depannya pembayaran listrik dapat dilakukan *sebelum tanggal 20 setiap bulannya* guna menghindari pemutusan otomatis (Shunt Trip).\n\n`
      : `Mengingat IDPEL Bapak/Ibu tercatat sudah melewati batas pembayaran tanggal 20 sebanyak *${item.riwayatTotal} kali* (yaitu pada bulan: *${item.riwayatBulanDetailList}*), kami sangat mengharapkan kerja sama Bapak/Ibu untuk melakukan pembayaran tepat waktu sebelum tanggal 20 guna menghindari pemutusan otomatis (Shunt Trip) maupun sanksi pembongkaran rampung.\n\n`;

    return (
      `Yth. Bpk/Ibu *${item.nama}* (IDPEL: ${item.idpel}),\n\n` +
      `Kami dari petugas PLN UP3 Jatinegara menginformasikan bahwa tagihan rekening listrik untuk bulan *${item.bulan} 2026* dengan daya ${formatNumber(item.daya)} VA sebesar *${formatRupiah(item.rptag)}* ${statusKalimat}\n\n` +
      edukasiKalimat +
      `Terima kasih atas kerja sama dan perhatian Bapak/Ibu dalam membayar tagihan listrik tepat waktu sebelum tanggal 20.\n\n` +
      `_Salam hangat,_\n*Tim Pelayanan Pelanggan PLN UP3 Jatinegara*`
    );
  };

  // Modal Pesan Sosialisasi
  const openSocializationModal = (item) => {
    const isDark = document.documentElement.classList.contains('dark');
    const teksSosialisasi = buildWhatsappText(item);

    window.Swal.fire({
      title: '',
      padding: '0',
      width: 560,
      showConfirmButton: false,
      background: isDark ? '#0f172a' : '#ffffff',
      customClass: {
        popup: 'rounded-2xl border border-slate-800 shadow-2xl overflow-hidden'
      },
      html: `
        <div class="text-left text-xs">
          <div class="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <i data-lucide="message-square" class="w-4 h-4"></i>
              </div>
              <div>
                <h3 class="text-sm font-extrabold text-white">Draft Pesan Sosialisasi Pelanggan</h3>
                <p class="text-[11px] text-slate-400">${item.nama} &bull; IDPEL ${item.idpel}</p>
              </div>
            </div>
            <button type="button" id="btn-close-wa-modal" class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>

          <div class="p-6 space-y-3">
            <p class="text-slate-300">Salin draf pesan edukasi batas pembayaran tanggal 20 di bawah ini untuk dikirimkan melalui WhatsApp:</p>
            <textarea readonly class="w-full h-52 bg-slate-950 text-emerald-400 p-4 rounded-xl border border-slate-800 focus:outline-none font-mono text-[11px] leading-relaxed resize-none">${teksSosialisasi}</textarea>
          </div>

          <div class="px-6 py-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button type="button" id="btn-cancel-wa-modal" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:opacity-80 transition">
              Tutup
            </button>
            <button type="button" id="btn-copy-wa-modal" class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20">
              <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              <span>Salin Teks ke Clipboard</span>
            </button>
          </div>
        </div>
      `,
      didOpen: () => {
        if (window.lucide) window.lucide.createIcons();
        document.getElementById('btn-close-wa-modal')?.addEventListener('click', () => window.Swal.close());
        document.getElementById('btn-cancel-wa-modal')?.addEventListener('click', () => window.Swal.close());
        document.getElementById('btn-copy-wa-modal')?.addEventListener('click', () => {
          navigator.clipboard.writeText(teksSosialisasi);
          window.Swal.fire({
            title: 'Berhasil Disalin!',
            text: 'Teks sosialisasi siap ditempel ke WhatsApp.',
            icon: 'success',
            timer: 1400,
            showConfirmButton: false,
            background: isDark ? '#0f172a' : '#ffffff',
            color: isDark ? '#f8fafc' : '#0f172a'
          });
        });
      }
    });
  };

  const updateView = () => {
    const selectedBulan = document.getElementById('filter-sos-bulan').value;
    const selectedKat = document.getElementById('filter-sos-kategori').value;
    const selectedStatus = document.getElementById('filter-sos-status').value;
    const selectedTglLunas = document.getElementById('filter-sos-tgl-lunas').value;
    const query = document.getElementById('search-sos-input').value.toLowerCase().trim();

    let rows = evaluatedRecords.filter((r) => r.isNunggak);

    if (selectedBulan !== 'ALL') {
      rows = rows.filter((r) => r.bulan === selectedBulan);
    }

    if (selectedStatus !== 'ALL') {
      rows = rows.filter((r) => r.statusType === selectedStatus);
    }

    if (selectedTglLunas !== 'ALL') {
      rows = rows.filter((r) => {
        const tglLabel = r.formattedTglLunas || formatTanggalIndo(r.tanggalLunas);
        return tglLabel === selectedTglLunas;
      });
    }

    if (query) {
      rows = rows.filter((r) => `${r.idpel} ${r.nama} ${r.alamat}`.toLowerCase().includes(query));
    }

    const processedRows = rows.map((r) => {
      const allHistoryForIdpel = idpelRecordsMap[r.idpel] || [];
      const currentMonthIdx = months.indexOf(r.bulan);

      const recordsUpToCurrentMonth = allHistoryForIdpel.filter(
        (item) => months.indexOf(item.bulan) <= currentMonthIdx
      );

      const riwayatTotal = recordsUpToCurrentMonth.length;
      const isBaruPertamaKali = riwayatTotal === 1;
      const riwayatBulanList = recordsUpToCurrentMonth.map((item) => item.bulan).join(', ');
      const riwayatBulanDetailList = recordsUpToCurrentMonth
        .map((item) => {
          const tgl = item.formattedTglLunas || formatTanggalIndo(item.tanggalLunas);
          return item.isLunas && tgl && tgl !== '-'
            ? `${item.bulan} (Lunas ${tgl})`
            : `${item.bulan} (Belum Lunas)`;
        })
        .join(', ');

      return {
        ...r,
        isBaruPertamaKali,
        riwayatTotal,
        riwayatBulanList,
        riwayatBulanDetailList,
        recordsUpToCurrentMonth
      };
    });

    const finalRows = processedRows.filter((r) => {
      if (selectedKat === 'ALL') return true;
      if (selectedKat === 'BARU') return r.riwayatTotal === 1;
      if (selectedKat === 'BERULANG') return r.riwayatTotal > 1;

      const targetFreq = parseInt(selectedKat, 10);
      if (!isNaN(targetFreq)) {
        return r.riwayatTotal === targetFreq;
      }
      return true;
    });

    const totalRpTunggakan = finalRows.reduce((a, b) => a + b.rptag, 0);
    const jumlahBaru = finalRows.filter((r) => r.isBaruPertamaKali).length;
    const jumlahBerulang = finalRows.length - jumlahBaru;
    const jumlahLunasTelat = finalRows.filter((r) => r.statusType === 'LUNAS_LEWAT_20').length;
    const jumlahBelumLunas = finalRows.filter((r) => r.statusType === 'BELUM_LUNAS').length;

    document.getElementById('sos-stats-container').innerHTML = `
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Total Terhitung Menunggak</span>
        <p class="text-xl font-extrabold text-rose-400 mt-1">${formatNumber(finalRows.length)} Pelanggan</p>
        <span class="text-[10px] text-slate-400">${formatNumber(jumlahBelumLunas)} Belum Lunas &bull; ${formatNumber(jumlahLunasTelat)} Lunas > Tgl 20</span>
      </div>
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Penunggak Baru (1x Tunggak)</span>
        <p class="text-xl font-extrabold text-amber-400 mt-1">${formatNumber(jumlahBaru)} Pelanggan</p>
        <span class="text-[10px] text-slate-400">Prioritas edukasi awal</span>
      </div>
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Penunggak Berulang (>1x Bulan)</span>
        <p class="text-xl font-extrabold text-purple-400 mt-1">${formatNumber(jumlahBerulang)} Pelanggan</p>
        <span class="text-[10px] text-slate-400">Sering bayar > tanggal 20</span>
      </div>
      <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
        <span class="text-[11px] text-slate-400 font-semibold">Total Nilai Tagihan</span>
        <p class="text-xl font-extrabold text-white mt-1">${formatRupiah(totalRpTunggakan)}</p>
        <span class="text-[10px] text-slate-400">Akumulasi sesuai filter aktif</span>
      </div>
    `;

    const tbody = document.getElementById('tbody-sosialisasi');
    if (finalRows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="py-8 text-center text-slate-500">Tidak ada data penunggak yang sesuai dengan filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = finalRows
      .map((r) => {
        const tglLunasLabel = r.formattedTglLunas || formatTanggalIndo(r.tanggalLunas);
        return `
      <tr>
        <td class="py-3 px-4 font-bold text-slate-300 whitespace-nowrap">${r.bulan}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-white">${r.nama}</div>
          <div class="font-mono text-[11px] text-cyan-400">${r.idpel}</div>
        </td>
        <td class="py-3 px-4 font-semibold text-amber-300 whitespace-nowrap">${r.tarif} / ${formatNumber(r.daya)} VA</td>
        <td class="py-3 px-4 font-semibold text-purple-300 whitespace-nowrap">${r.daerah}</td>
        <td class="py-3 px-4 text-right font-extrabold text-rose-400 whitespace-nowrap">${formatRupiah(r.rptag)}</td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          ${
            r.statusType === 'BELUM_LUNAS'
              ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                   <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                   <span>Belum Lunas</span>
                 </span>`
              : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                   <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                   <span>Lunas &bull; ${tglLunasLabel}</span>
                 </span>`
          }
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <button
            type="button"
            data-idpel="${r.idpel}"
            data-bulan="${r.bulan}"
            title="Klik untuk melihat rincian bulan menunggak"
            class="btn-detail-frekuensi inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
              r.isBaruPertamaKali
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30'
                : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30'
            }"
          >
            <span>${r.isBaruPertamaKali ? 'Baru (1x Tunggak)' : `Berulang (${r.riwayatTotal}x Bulan)`}</span>
            <i data-lucide="info" class="w-3.5 h-3.5 opacity-80"></i>
          </button>
        </td>
        <td class="py-3 px-4 text-center whitespace-nowrap">
          <button data-idpel="${r.idpel}" data-bulan="${r.bulan}" class="btn-sosialisasi px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500 text-cyan-400 hover:text-slate-950 border border-cyan-500/30 font-bold text-xs transition inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
            <span>Buat Pesan Sosialisasi</span>
          </button>
        </td>
      </tr>
    `;
      })
      .join('');

    // Event Klik Badge Frekuensi: Pop-up Rincian Riwayat Bulan Menunggak
    tbody.querySelectorAll('.btn-detail-frekuensi').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idpel = btn.getAttribute('data-idpel');
        const bulan = btn.getAttribute('data-bulan');
        const item = finalRows.find((x) => x.idpel === idpel && x.bulan === bulan);
        if (!item) return;

        const isDark = document.documentElement.classList.contains('dark');
        const totalAkumulasi = item.recordsUpToCurrentMonth.reduce((sum, rec) => sum + rec.rptag, 0);

        const badgeBulanHtml = item.recordsUpToCurrentMonth
          .map((rec, i) => {
            const tglLunasRec = rec.formattedTglLunas || formatTanggalIndo(rec.tanggalLunas);
            const isSudahLunas = rec.isLunas && tglLunasRec && tglLunasRec !== '-';

            return `<div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
              isSudahLunas
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }">
              <span class="w-4 h-4 rounded-full ${
                isSudahLunas ? 'bg-amber-500/20' : 'bg-rose-500/20'
              } flex items-center justify-center text-[10px] font-extrabold">${i + 1}</span>
              <span>${rec.bulan} 2026</span>
              <span class="opacity-50">&bull;</span>
              <span class="text-[11px] font-semibold">${isSudahLunas ? `Lunas ${tglLunasRec}` : 'Belum Lunas'}</span>
            </div>`;
          })
          .join('');

        const detailHtml = `
          <div class="text-left text-xs">
            <!-- Header Modal -->
            <div class="px-6 py-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl ${item.isBaruPertamaKali ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'} border flex items-center justify-center shrink-0">
                  <i data-lucide="history" class="w-5 h-5"></i>
                </div>
                <div>
                  <h3 class="text-base font-extrabold text-white leading-tight">Rincian Riwayat Bulan Menunggak (> Tgl 20)</h3>
                  <p class="text-[11px] text-slate-400 mt-0.5">Rekapitulasi kronologis dari Januari s.d. ${item.bulan} 2026</p>
                </div>
              </div>
              <button type="button" id="btn-close-detail-modal" class="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>

            <!-- Konten Utama -->
            <div class="p-6 space-y-4">
              <!-- Kartu Info Pelanggan -->
              <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Identitas Pelanggan</span>
                  <div class="text-sm font-extrabold text-white mt-0.5">${item.nama}</div>
                  <div class="text-xs text-slate-400 mt-0.5">${item.alamat} <span class="text-purple-400 font-semibold">(${item.daerah})</span></div>
                </div>
                <div class="sm:text-right shrink-0">
                  <div class="inline-block px-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-800 font-mono text-xs font-bold text-cyan-400">
                    IDPEL: ${item.idpel}
                  </div>
                  <div class="text-xs font-bold text-amber-400 mt-1">${item.tarif} / ${formatNumber(item.daya)} VA</div>
                </div>
              </div>

              <!-- Box Penjelasan Bulan Menunggak -->
              <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                <div class="flex items-center gap-2 text-slate-200 font-medium">
                  <i data-lucide="alert-circle" class="w-4 h-4 text-rose-400 shrink-0"></i>
                  <span>
                    Sampai periode <strong class="text-white">${item.bulan} 2026</strong>, pelanggan ini tercatat menunggak (belum lunas / bayar lewat tanggal 20) sebanyak
                    <strong class="text-rose-400 underline">${item.riwayatTotal} kali (bulan)</strong>, yaitu pada:
                  </span>
                </div>
                <div class="flex flex-wrap gap-2 pt-1">
                  ${badgeBulanHtml}
                </div>
              </div>

              <!-- Tabel Rincian Tunggakan per Bulan -->
              <div class="overflow-x-auto rounded-xl border border-slate-800">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="bg-slate-900/60 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th class="py-3 px-4 whitespace-nowrap w-12">No</th>
                      <th class="py-3 px-4 whitespace-nowrap">Bulan Tunggakan</th>
                      <th class="py-3 px-4 text-right whitespace-nowrap">Tagihan (Rp)</th>
                      <th class="py-3 px-4 whitespace-nowrap">Eksekusi</th>
                      <th class="py-3 px-4 text-center whitespace-nowrap">Status & Tanggal Pelunasan</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800/70">
                    ${item.recordsUpToCurrentMonth
                      .map((rec, idx) => {
                        const tglLunasRec = rec.formattedTglLunas || formatTanggalIndo(rec.tanggalLunas);
                        return `
                      <tr class="bg-slate-950">
                        <td class="py-3 px-4 font-bold text-slate-400 whitespace-nowrap">${idx + 1}</td>
                        <td class="py-3 px-4 font-extrabold text-white whitespace-nowrap">${rec.bulan} 2026</td>
                        <td class="py-3 px-4 text-right font-bold text-amber-400 whitespace-nowrap">${formatRupiah(rec.rptag)}</td>
                        <td class="py-3 px-4 font-semibold text-slate-300 whitespace-nowrap">${rec.eksekusiTE || '-'}</td>
                        <td class="py-3 px-4 text-center whitespace-nowrap">
                          ${
                            rec.isLunas
                              ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                                   <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                   <span>Lunas > Tgl 20 &bull; ${tglLunasRec}</span>
                                 </span>`
                              : `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                                   <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                   <span>Belum Lunas</span>
                                 </span>`
                          }
                        </td>
                      </tr>
                    `;
                      })
                      .join('')}
                  </tbody>
                  <tfoot>
                    <tr class="bg-slate-900/60 border-t border-slate-800 font-extrabold">
                      <td colspan="2" class="py-3.5 px-4 text-white whitespace-nowrap">Total Akumulasi Tagihan (s.d. ${item.bulan})</td>
                      <td class="py-3.5 px-4 text-right text-sm text-rose-400 whitespace-nowrap">${formatRupiah(totalAkumulasi)}</td>
                      <td colspan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <!-- Footer Modal -->
            <div class="px-6 py-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between gap-3">
              <span class="text-[11px] text-slate-400">Klik tombol di kanan untuk membuat pesan edukasi WA</span>
              <div class="flex items-center gap-2">
                <button type="button" id="btn-tutup-detail-bawah" class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:opacity-80 transition">
                  Tutup
                </button>
                <button type="button" id="btn-lanjut-wa-detail" class="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/20">
                  <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                  <span>Buat Pesan Sosialisasi</span>
                </button>
              </div>
            </div>
          </div>
        `;

        window.Swal.fire({
          title: '',
          html: detailHtml,
          width: 760,
          padding: '0',
          showConfirmButton: false,
          background: isDark ? '#0f172a' : '#ffffff',
          customClass: {
            popup: 'rounded-2xl border border-slate-800 shadow-2xl overflow-hidden'
          },
          didOpen: () => {
            if (window.lucide) window.lucide.createIcons();
            document.getElementById('btn-close-detail-modal')?.addEventListener('click', () => window.Swal.close());
            document.getElementById('btn-tutup-detail-bawah')?.addEventListener('click', () => window.Swal.close());
            document.getElementById('btn-lanjut-wa-detail')?.addEventListener('click', () => {
              openSocializationModal(item);
            });
          }
        });
      });
    });

    // Event Klik Tombol Buat Pesan Sosialisasi di Tabel
    tbody.querySelectorAll('.btn-sosialisasi').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idpel = btn.getAttribute('data-idpel');
        const bulan = btn.getAttribute('data-bulan');
        const item = finalRows.find((x) => x.idpel === idpel && x.bulan === bulan);
        if (!item) return;
        openSocializationModal(item);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  };

  // Inisialisasi awal opsi filter dinamis
  updateKategoriOptions();
  updateTanggalLunasOptions();

  // Event Listeners
  document.getElementById('filter-sos-bulan').addEventListener('change', () => {
    updateKategoriOptions();
    updateTanggalLunasOptions();
    updateView();
  });

  document.getElementById('filter-sos-kategori').addEventListener('change', updateView);

  document.getElementById('filter-sos-status').addEventListener('change', () => {
    updateTanggalLunasOptions();
    updateView();
  });

  document.getElementById('filter-sos-tgl-lunas').addEventListener('change', updateView);
  document.getElementById('search-sos-input').addEventListener('input', updateView);

  updateView();
}

function allDataSorted(records) {
  return [...records].sort((a, b) => CONFIG.MONTH_ORDER.indexOf(a.bulan) - CONFIG.MONTH_ORDER.indexOf(b.bulan));
}