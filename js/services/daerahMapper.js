const DAERAH_RULES = [
  { nama: 'TEBET', regex: /\b(TEBET|TBT|TEBE|GUDANG PELURU|ASEM BARIS)\b/i },
  { nama: 'CIPINANG', regex: /\b(CIPINANG|CIP|CIPC|CIPB|CIPBESEL|CIMPDK|PWI)\b/i },
  { nama: 'MENTENG DALAM / SAHARJO', regex: /\b(MENTENG|MENT|SAHARJO|CASABLANCA|SUPOMO|RASAMALA|DUKUH PATRA|PAL BATU)\b/i },
  { nama: 'JATINEGARA', regex: /\b(JATINEGARA|JTN|BEKASI TIMUR|BEKASI TMR|RW BUNGA)\b/i },
  { nama: 'BUKIT DURI', regex: /\b(BUKIT DURI|BKT DR|BK DURI|BKT|BUKI)\b/i },
  { nama: 'MATRAMAN', regex: /\b(MATRAMAN|MATR|TEGALAN|PALMERIAM|PISANGAN)\b/i },
  { nama: 'KEBON BARU', regex: /\b(KEB BARU|KB BARU|KEBON BARU)\b/i },
  { nama: 'BIDARA CINA / OTISTA', regex: /\b(BID CINA|BIDARA CINA|OTISTA|OTTO ISKANDARDINATA|PEDATI|KB NANAS)\b/i },
  { nama: 'CAWANG', regex: /\b(CAWANG|PANJAITAN)\b/i },
  { nama: 'KAMPUNG MELAYU', regex: /\b(KP MELAYU|KAMPUNG MELAYU|MELAYU|SYAFEI)\b/i },
  { nama: 'MANGGARAI', regex: /\b(MANGGARAI|MANGGARA)\b/i }
];

export function detectLingkupDaerah(alamat) {
  if (!alamat) return 'AREA LAINNYA';
  const str = String(alamat).toUpperCase();
  for (const rule of DAERAH_RULES) {
    if (rule.regex.test(str)) {
      return rule.nama;
    }
  }
  return 'AREA LAINNYA';
}

export function rekapPerDaerah(records) {
  const map = {};
  records.forEach((item) => {
    const d = item.daerah || 'AREA LAINNYA';
    if (!map[d]) {
      map[d] = {
        daerah: d,
        totalPelanggan: 0,
        lunas: 0,
        belumLunas: 0,
        totalRupiah: 0,
        rupiahLunas: 0,
        rupiahBelum: 0,
        totalDayaVA: 0,
        shuntrip: 0,
        modemOff: 0
      };
    }
    map[d].totalPelanggan += 1;
    map[d].totalRupiah += item.rptag;
    map[d].totalDayaVA += item.daya;
    if (item.isLunas) {
      map[d].lunas += 1;
      map[d].rupiahLunas += item.rptag;
    } else {
      map[d].belumLunas += 1;
      map[d].rupiahBelum += item.rptag;
    }
    if (item.eksekusiTE === 'Shuntrip') map[d].shuntrip += 1;
    if (item.eksekusiTE === 'Modem Off') map[d].modemOff += 1;
  });

  return Object.values(map).sort((a, b) => b.totalPelanggan - a.totalPelanggan);
}