import prisma from '../../lib/prisma';
import { StatusDokumen, TipeDokumen } from '@prisma/client';

export async function getRingkasan(perusahaanId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [
    totalPendapatan,
    pendapatanBulanIni,
    pendapatanBulanLalu,
    totalDokumen,
    dokumenBulanIni,
    dokumenMenunggu,
    dokumenJatuhTempo,
    totalKlien,
  ] = await Promise.all([
    // Total pendapatan (semua invoice lunas)
    prisma.dokumen.aggregate({
      where: { perusahaanId, tipe: TipeDokumen.invoice, status: StatusDokumen.lunas },
      _sum: { total: true },
    }),
    // Pendapatan bulan ini
    prisma.dokumen.aggregate({
      where: {
        perusahaanId,
        tipe: TipeDokumen.invoice,
        status: StatusDokumen.lunas,
        tanggalLunas: { gte: startOfMonth },
      },
      _sum: { total: true },
    }),
    // Pendapatan bulan lalu
    prisma.dokumen.aggregate({
      where: {
        perusahaanId,
        tipe: TipeDokumen.invoice,
        status: StatusDokumen.lunas,
        tanggalLunas: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      _sum: { total: true },
    }),
    // Total semua dokumen
    prisma.dokumen.count({ where: { perusahaanId } }),
    // Dokumen bulan ini
    prisma.dokumen.count({
      where: { perusahaanId, createdAt: { gte: startOfMonth } },
    }),
    // Dokumen menunggu pembayaran (terkirim)
    prisma.dokumen.count({
      where: { perusahaanId, tipe: TipeDokumen.invoice, status: StatusDokumen.terkirim },
    }),
    // Dokumen jatuh tempo (terkirim + past due date)
    prisma.dokumen.count({
      where: {
        perusahaanId,
        tipe: TipeDokumen.invoice,
        status: StatusDokumen.terkirim,
        tanggalJatuhTempo: { lt: now },
      },
    }),
    // Total klien aktif
    prisma.klien.count({ where: { perusahaanId, isActive: true } }),
  ]);

  const pendapatanIni = Number(pendapatanBulanIni._sum.total ?? 0);
  const pendapatanLalu = Number(pendapatanBulanLalu._sum.total ?? 0);
  const growthPersen = pendapatanLalu === 0
    ? (pendapatanIni > 0 ? 100 : 0)
    : Math.round(((pendapatanIni - pendapatanLalu) / pendapatanLalu) * 100);

  return {
    pendapatan: {
      total: Number(totalPendapatan._sum.total ?? 0),
      bulanIni: pendapatanIni,
      bulanLalu: pendapatanLalu,
      growthPersen,
    },
    dokumen: {
      total: totalDokumen,
      bulanIni: dokumenBulanIni,
      menungguPembayaran: dokumenMenunggu,
      jatuhTempo: dokumenJatuhTempo,
    },
    klien: {
      total: totalKlien,
    },
  };
}

export async function getPendapatanChart(
  perusahaanId: string,
  bulan: number,
  tahun: number,
) {
  // Last N months ending at given month/year
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(tahun, bulan - 1 - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    const label = start.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    months.push({ label, start, end });
  }

  const data = await Promise.all(
    months.map(async (m) => {
      const agg = await prisma.dokumen.aggregate({
        where: {
          perusahaanId,
          tipe: TipeDokumen.invoice,
          status: StatusDokumen.lunas,
          tanggalLunas: { gte: m.start, lte: m.end },
        },
        _sum: { total: true },
      });
      return { label: m.label, total: Number(agg._sum.total ?? 0) };
    }),
  );

  return data;
}

export async function getDokumenStats(perusahaanId: string) {
  const [byTipe, byStatus] = await Promise.all([
    prisma.dokumen.groupBy({
      by: ['tipe'],
      where: { perusahaanId },
      _count: { id: true },
    }),
    prisma.dokumen.groupBy({
      by: ['status'],
      where: { perusahaanId },
      _count: { id: true },
    }),
  ]);

  return {
    byTipe: byTipe.map((r) => ({ tipe: r.tipe, jumlah: r._count.id })),
    byStatus: byStatus.map((r) => ({ status: r.status, jumlah: r._count.id })),
  };
}

export async function getKlienTerbaik(perusahaanId: string, limit = 5) {
  const result = await prisma.dokumen.groupBy({
    by: ['klienId'],
    where: {
      perusahaanId,
      tipe: TipeDokumen.invoice,
      status: StatusDokumen.lunas,
      klienId: { not: null },
    },
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: 'desc' } },
    take: limit,
  });

  const klienIds = result.map((r) => r.klienId!);
  const klienList = await prisma.klien.findMany({
    where: { id: { in: klienIds } },
    select: { id: true, nama: true, email: true },
  });

  return result.map((r) => {
    const klien = klienList.find((k) => k.id === r.klienId);
    return {
      klienId: r.klienId,
      nama: klien?.nama ?? '-',
      email: klien?.email ?? '',
      totalPendapatan: Number(r._sum.total ?? 0),
      jumlahDokumen: r._count.id,
    };
  });
}

export async function exportDokumenCsv(perusahaanId: string): Promise<string> {
  const dokumen = await prisma.dokumen.findMany({
    where: { perusahaanId },
    orderBy: { tanggalDokumen: 'desc' },
    select: {
      nomor: true,
      tipe: true,
      status: true,
      klienNama: true,
      tanggalDokumen: true,
      tanggalJatuhTempo: true,
      subtotal: true,
      diskonNominal: true,
      pajakNominal: true,
      total: true,
    },
  });

  const header = 'Nomor,Tipe,Status,Klien,Tanggal,Jatuh Tempo,Subtotal,Diskon,Pajak,Total\n';
  const rows = dokumen.map((d) => {
    const fmt = (v: unknown) => `"${v ?? ''}"`;
    const fmtDate = (date: Date | null | undefined) =>
      date ? new Date(date).toLocaleDateString('id-ID') : '';
    return [
      fmt(d.nomor),
      fmt(d.tipe),
      fmt(d.status),
      fmt(d.klienNama),
      fmtDate(d.tanggalDokumen),
      fmtDate(d.tanggalJatuhTempo),
      Number(d.subtotal),
      Number(d.diskonNominal),
      Number(d.pajakNominal),
      Number(d.total),
    ].join(',');
  });

  return header + rows.join('\n');
}
