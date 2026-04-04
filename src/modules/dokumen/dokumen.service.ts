import { PrismaClient, Prisma } from '@prisma/client';
import { parsePagination, buildPaginatedResult } from '../../utils/paginate';
import { generateNomorDokumen } from '../../utils/nomor-dokumen';
import { sendMail } from '../../utils/mailer';
import * as pdfService from '../pdf/pdf.service';
import type {
  CreateDokumenInput, UpdateDokumenInput,
  UpdateStatusInput, PembayaranInput, KirimEmailInput,
} from './dokumen.schema';

const prisma = new PrismaClient();

// ─── Hitung subtotal item ─────────────────────────────────────────────────
function hitungSubtotalItem(item: {
  qty: number; hargaSatuan: number; diskonPersen: number;
}): number {
  const gross = item.qty * item.hargaSatuan;
  return gross - (gross * item.diskonPersen) / 100;
}

// ─── Hitung total dokumen ─────────────────────────────────────────────────
function hitungTotals(items: ReturnType<typeof hitungSubtotalItem>[], diskonPersen: number, pajakPersen: number) {
  const subtotal = items.reduce((a, b) => a + b, 0);
  const diskonNominal = (subtotal * diskonPersen) / 100;
  const setelahDiskon = subtotal - diskonNominal;
  const pajakNominal = (setelahDiskon * pajakPersen) / 100;
  const total = setelahDiskon + pajakNominal;
  return { subtotal, diskonNominal, pajakNominal, total };
}

// ─── List ─────────────────────────────────────────────────────────────────
export async function list(perusahaanId: string, query: {
  page?: string; limit?: string; tipe?: string; status?: string;
  search?: string; klienId?: string;
}) {
  const { page, limit, skip } = parsePagination(query);
  const where: Prisma.DokumenWhereInput = {
    perusahaanId,
    ...(query.tipe && { tipe: query.tipe as any }),
    ...(query.status && { status: query.status as any }),
    ...(query.klienId && { klienId: query.klienId }),
    ...(query.search && {
      OR: [
        { nomor: { contains: query.search, mode: 'insensitive' } },
        { klienNama: { contains: query.search, mode: 'insensitive' } },
        { judul: { contains: query.search, mode: 'insensitive' } },
      ],
    }),
  };
  const [data, total] = await Promise.all([
    prisma.dokumen.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
    prisma.dokumen.count({ where }),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

// ─── Get by ID ────────────────────────────────────────────────────────────
export async function getById(id: string, perusahaanId: string) {
  const doc = await prisma.dokumen.findFirst({
    where: { id, perusahaanId },
    include: { items: { orderBy: { urutan: 'asc' } }, lampiran: true },
  });
  if (!doc) throw Object.assign(new Error('Dokumen tidak ditemukan'), { statusCode: 404 });
  return doc;
}

// ─── Create ───────────────────────────────────────────────────────────────
export async function create(
  perusahaanId: string,
  userId: string,
  input: CreateDokumenInput,
) {
  const nomor = await generateNomorDokumen(perusahaanId, input.tipe);

  // Snapshot data klien
  let klienSnapshot: Partial<{
    klienNama: string; klienAlamat: string; klienNpwp: string;
    klienEmail: string; klienNoTelp: string;
  }> = {};
  if (input.klienId) {
    const klien = await prisma.klien.findUnique({ where: { id: input.klienId } });
    if (klien) {
      klienSnapshot = {
        klienNama: klien.nama,
        klienAlamat: klien.alamat ?? undefined,
        klienNpwp: klien.npwp ?? undefined,
        klienEmail: klien.email ?? undefined,
        klienNoTelp: klien.noTelp ?? undefined,
      };
    }
  }

  // Hitung finansial
  const subtotals = input.items.map(hitungSubtotalItem);
  const { subtotal, diskonNominal, pajakNominal, total } = hitungTotals(
    subtotals, input.diskonPersen ?? 0, input.pajakPersen ?? 0,
  );

  return prisma.dokumen.create({
    data: {
      perusahaanId,
      klienId: input.klienId,
      tipe: input.tipe,
      nomor,
      judul: input.judul,
      ...klienSnapshot,
      tanggalDokumen: input.tanggalDokumen ? new Date(input.tanggalDokumen) : new Date(),
      tanggalJatuhTempo: input.tanggalJatuhTempo ? new Date(input.tanggalJatuhTempo) : undefined,
      diskonPersen: input.diskonPersen ?? 0,
      diskonNominal,
      pajakPersen: input.pajakPersen ?? 0,
      pajakNominal,
      subtotal,
      total,
      nominalHutang: input.nominalHutang,
      cicilanPerBulan: input.cicilanPerBulan,
      catatan: input.catatan,
      syaratKetentuan: input.syaratKetentuan,
      tema: input.tema ?? 'professional',
      dibuatOleh: userId,
      items: {
        create: input.items.map((item, i) => ({
          ...item,
          urutan: i + 1,
          subtotal: subtotals[i],
        })),
      },
    },
    include: { items: true },
  });
}

// ─── Update ───────────────────────────────────────────────────────────────
export async function update(
  id: string, perusahaanId: string, input: UpdateDokumenInput,
) {
  await getById(id, perusahaanId);

  const subtotals = (input.items ?? []).map(hitungSubtotalItem);
  const { subtotal, diskonNominal, pajakNominal, total } = hitungTotals(
    subtotals, input.diskonPersen ?? 0, input.pajakPersen ?? 0,
  );

  return prisma.$transaction(async (tx) => {
    if (input.items !== undefined) {
      await tx.dokumenItem.deleteMany({ where: { dokumenId: id } });
    }
    return tx.dokumen.update({
      where: { id },
      data: {
        ...(input.klienId !== undefined && { klienId: input.klienId }),
        ...(input.judul !== undefined && { judul: input.judul }),
        ...(input.tanggalDokumen && { tanggalDokumen: new Date(input.tanggalDokumen) }),
        ...(input.tanggalJatuhTempo && { tanggalJatuhTempo: new Date(input.tanggalJatuhTempo) }),
        ...(input.diskonPersen !== undefined && { diskonPersen: input.diskonPersen, diskonNominal }),
        ...(input.pajakPersen !== undefined && { pajakPersen: input.pajakPersen, pajakNominal }),
        ...(input.items !== undefined && { subtotal, total }),
        ...(input.catatan !== undefined && { catatan: input.catatan }),
        ...(input.syaratKetentuan !== undefined && { syaratKetentuan: input.syaratKetentuan }),
        ...(input.tema !== undefined && { tema: input.tema }),
        ...(input.items !== undefined && {
          items: {
            create: input.items.map((item, i) => ({
              ...item,
              urutan: i + 1,
              subtotal: subtotals[i],
            })),
          },
        }),
      },
      include: { items: { orderBy: { urutan: 'asc' } } },
    });
  });
}

// ─── Update Status ────────────────────────────────────────────────────────
export async function updateStatus(
  id: string, perusahaanId: string, input: UpdateStatusInput,
) {
  await getById(id, perusahaanId);
  return prisma.dokumen.update({
    where: { id },
    data: {
      status: input.status as any,
      ...(input.status === 'terkirim' && { tanggalTerkirim: new Date() }),
      ...(input.status === 'lunas' && {
        tanggalLunas: input.tanggalLunas ? new Date(input.tanggalLunas) : new Date(),
      }),
    },
  });
}

// ─── Remove ───────────────────────────────────────────────────────────────
export async function remove(id: string, perusahaanId: string) {
  const doc = await getById(id, perusahaanId);
  if (doc.status !== 'draft') {
    throw Object.assign(new Error('Hanya dokumen berstatus Draft yang dapat dihapus'), { statusCode: 422 });
  }
  await prisma.dokumen.delete({ where: { id } });
}

// ─── Pembayaran ───────────────────────────────────────────────────────────
export async function addPembayaran(
  dokumenId: string, perusahaanId: string, userId: string, input: PembayaranInput,
) {
  await getById(dokumenId, perusahaanId);
  const pembayaran = await prisma.pembayaran.create({
    data: {
      dokumenId,
      tanggal: new Date(input.tanggal),
      jumlah: input.jumlah,
      metode: input.metode as any,
      noReferensi: input.noReferensi,
      catatan: input.catatan,
      dibuatOleh: userId,
    },
  });

  // Cek apakah total pembayaran sudah mencapai total dokumen → auto lunas
  const doc = await prisma.dokumen.findUnique({
    where: { id: dokumenId },
    include: { pembayaran: true },
  });
  if (doc) {
    const totalBayar = doc.pembayaran.reduce((sum, p) => sum + Number(p.jumlah), 0);
    if (totalBayar >= Number(doc.total)) {
      await prisma.dokumen.update({
        where: { id: dokumenId },
        data: { status: 'lunas', tanggalLunas: new Date() },
      });
    }
  }
  return pembayaran;
}

export async function getPembayaran(dokumenId: string, perusahaanId: string) {
  await getById(dokumenId, perusahaanId);
  return prisma.pembayaran.findMany({
    where: { dokumenId },
    orderBy: { tanggal: 'desc' },
  });
}

// ─── Build DokumenData (for PDF generation) ───────────────────────────────
export async function buildDokumenData(id: string, perusahaanId: string): Promise<pdfService.DokumenData> {
  const doc = await getById(id, perusahaanId);
  const perusahaan = await prisma.perusahaan.findUnique({ where: { id: perusahaanId } });

  return {
    ...doc,
    subtotal: doc.subtotal.toNumber(),
    diskonPersen: doc.diskonPersen.toNumber(),
    diskonNominal: doc.diskonNominal.toNumber(),
    pajakPersen: doc.pajakPersen.toNumber(),
    pajakNominal: doc.pajakNominal.toNumber(),
    total: doc.total.toNumber(),
    tema: doc.tema,
    nominalHutang: doc.nominalHutang?.toNumber() ?? null,
    cicilanPerBulan: doc.cicilanPerBulan?.toNumber() ?? null,
    items: doc.items.map((item) => ({
      ...item,
      qty: item.qty.toNumber(),
      hargaSatuan: item.hargaSatuan.toNumber(),
      diskonPersen: item.diskonPersen.toNumber(),
      subtotal: item.subtotal.toNumber(),
    })),
    perusahaan: perusahaan ? {
      nama: perusahaan.nama,
      alamat: perusahaan.alamat,
      kota: perusahaan.kota,
      noTelp: perusahaan.noTelp,
      email: perusahaan.email,
      npwp: perusahaan.npwp,
      logoUrl: perusahaan.logoUrl,
      namaBank: perusahaan.namaBank,
      noRekening: perusahaan.noRekening,
      atasNama: perusahaan.atasNama,
      ttdUrl: perusahaan.ttdUrl,
      stempelUrl: perusahaan.stempelUrl,
      namaDirektur: perusahaan.namaDirektur,
      jabatanDirektur: perusahaan.jabatanDirektur,
    } : undefined,
  };
}

// ─── Kirim Email ──────────────────────────────────────────────────────────
export async function kirimDokumen(
  id: string, perusahaanId: string, input: KirimEmailInput,
) {
  const docData = await buildDokumenData(id, perusahaanId);

  const tipeLabel = docData.tipe === 'invoice' ? 'Invoice'
    : docData.tipe === 'sph' ? 'Penawaran Harga (SPH)'
    : docData.tipe === 'kasbon' ? 'Bukti Kasbon'
    : 'Surat Hutang';

  const pdfBuffer = await pdfService.generatePdf(docData);

  const perusahaanNama = docData.perusahaan?.nama ?? 'kami';

  const pesan = input.pesan
    ?? `Halo,\n\nTerlampir ${tipeLabel} nomor ${docData.nomor} dari ${perusahaanNama}.\n\nTerima kasih.`;

  await sendMail({
    to: input.email,
    subject: `${tipeLabel} ${docData.nomor} dari ${perusahaanNama}`,
    html: `<pre style="font-family:sans-serif;white-space:pre-wrap;">${pesan}</pre>`,
    attachments: [
      {
        filename: `${docData.nomor}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });

  // Update status ke terkirim jika masih draft
  if (docData.status === 'draft') {
    await prisma.dokumen.update({
      where: { id },
      data: { status: 'terkirim', tanggalTerkirim: new Date() },
    });
  }

  return { nomor: docData.nomor, email: input.email };
}
