import { formatRupiah, formatNumber, formatTanggalIndo } from '../utils/formatter.js';
import { rekapPerDaerah } from '../services/daerahMapper.js';

// Membuat format teks Laporan Harian WhatsApp yang rapi
export function generateWhatsAppReportText(tanggal, lunasHariIni, seluruhDataPeriode) {
  const totalRpHarian = lunasHariIni.reduce((a, b) => a + b.rptag, 0);
  const totalDayaHarian = lunasHariIni.reduce((a, b) => a + b.daya, 0);
  const sisaBelumLunas = seluruhDataPeriode.filter((r) => !r.isLunas);
  const totalRpSisa = sisaBelumLunas.reduce((a, b) => a + b.rptag, 0);

  const rekapDaerahHarian = rekapPerDaerah(lunasHariIni);
  const rincianDaerah = rekapDaerahHarian
    .slice(0, 6)
    .map((d) => `  • ${d.daerah}: ${d.totalPelanggan} Plg (${formatRupiah(d.totalRupiah)})`)
    .join('\n');

  return (
    `*LAPORAN HARIAN PELUNASAN SHUNT TRIP & AMR JTN*\n` +
    `*Dasbor Monitoring Mas Andre*\n` +
    `📅 Tanggal Lunas: *${formatTanggalIndo(tanggal)}*\n` +
    `----------------------------------------\n` +
    `✅ *REALISASI LUNAS HARI INI:*\n` +
    `• Jumlah Pelanggan : *${formatNumber(lunasHariIni.length)} Pelanggan*\n` +
    `• Total Daya Lunas : *${formatNumber(totalDayaHarian)} VA*\n` +
    `• Total Rupiah Lunas : *${formatRupiah(totalRpHarian)}*\n\n` +
    `📍 *SEBARAN DAERAH LUNAS HARI INI:*\n` +
    `${rincianDaerah || '  • Belum ada rincian daerah'}\n\n` +
    `⏳ *SISA TUNGGAKAN PERIODE AKTIF:*\n` +
    `• Sisa Belum Lunas : *${formatNumber(sisaBelumLunas.length)} Pelanggan*\n` +
    `• Sisa Rupiah : *${formatRupiah(totalRpSisa)}*\n` +
    `----------------------------------------\n` +
    `_Generated otomatis via Dasbor Mas Andre_`
  );
}

// Ekspor daftar Report Harian ke file Excel (.xlsx)
export function exportReportToExcel(tanggal, rows) {
  if (!window.XLSX) return;
  const dataExport = rows.map((r, i) => ({
    No: i + 1,
    Bulan: r.bulan,
    IDPEL: r.idpel,
    'Nama Pelanggan': r.nama,
    Tarif: r.tarif,
    'Daya (VA)': r.daya,
    'Lingkup Daerah': r.daerah,
    Alamat: r.alamat,
    'Tagihan (Rp)': r.rptag,
    'Eksekusi TE': r.eksekusiTE,
    'Tanggal Lunas': r.tanggalLunas
  }));

  const ws = window.XLSX.utils.json_to_sheet(dataExport);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, 'Report_Harian_Lunas');
  window.XLSX.writeFile(wb, `Report_Harian_Lunas_${tanggal || 'Semua'}.xlsx`);
}

// Ekspor daftar Report Harian ke file PDF
export function exportReportToPDF(tanggal, rows) {
  if (!window.jspdf) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape');

  doc.setFontSize(14);
  doc.text(`LAPORAN HARIAN PELUNASAN SHUNT TRIP JTN — DASBOR MAS ANDRE`, 14, 15);
  doc.setFontSize(10);
  const totalRp = rows.reduce((a, b) => a + b.rptag, 0);
  doc.text(
    `Tanggal Lunas: ${formatTanggalIndo(tanggal)} | Total Pelanggan:${rows.length} | Total Rupiah: ${formatRupiah(totalRp)}`,
    14,
    22
  );

  const tableBody = rows.map((r, idx) => [
    idx + 1,
    r.bulan,
    r.idpel,
    r.nama,
    `${r.tarif} / ${formatNumber(r.daya)} VA`,
    r.daerah,
    formatRupiah(r.rptag),
    r.eksekusiTE,
    r.tanggalLunas
  ]);

  doc.autoTable({
    startY: 27,
    head: [['No', 'Bulan', 'IDPEL', 'Nama Pelanggan', 'Tarif / Daya', 'Daerah', 'Rupiah', 'Eksekusi', 'Tgl Lunas']],
    body: tableBody,
    styles: { fontSize: 8 }
  });

  doc.save(`Report_Harian_Lunas_${tanggal || 'Semua'}.pdf`);
}