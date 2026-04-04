import { PrismaClient } from '@prisma/client';
import { parsePagination, buildPaginatedResult } from '../../utils/paginate';
import type { KlienInput, UpdateKlienInput } from './klien.schema';

const prisma = new PrismaClient();

export async function list(perusahaanId: string, query: {
  page?: string; limit?: string; search?: string; aktif?: string;
}) {
  const { page, limit, skip } = parsePagination(query);
  const where = {
    perusahaanId,
    isActive: query.aktif === 'false' ? false : true,
    ...(query.search && {
      OR: [
        { nama: { contains: query.search, mode: 'insensitive' as const } },
        { email: { contains: query.search, mode: 'insensitive' as const } },
        { noTelp: { contains: query.search } },
      ],
    }),
  };
  const [data, total] = await Promise.all([
    prisma.klien.findMany({ where, skip, take: limit, orderBy: { nama: 'asc' } }),
    prisma.klien.count({ where }),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}

export async function getById(id: string, perusahaanId: string) {
  const klien = await prisma.klien.findFirst({ where: { id, perusahaanId } });
  if (!klien) throw Object.assign(new Error('Klien tidak ditemukan'), { statusCode: 404 });
  return klien;
}

export async function create(perusahaanId: string, data: KlienInput) {
  return prisma.klien.create({ data: { ...data, perusahaanId } });
}

export async function update(id: string, perusahaanId: string, data: UpdateKlienInput) {
  await getById(id, perusahaanId);
  return prisma.klien.update({ where: { id }, data });
}

export async function remove(id: string, perusahaanId: string) {
  await getById(id, perusahaanId);
  // Soft delete — nonaktifkan saja, jangan hapus (ada relasi ke dokumen)
  return prisma.klien.update({ where: { id }, data: { isActive: false } });
}

export async function getDokumen(id: string, perusahaanId: string, query: {
  page?: string; limit?: string;
}) {
  await getById(id, perusahaanId);
  const { page, limit, skip } = parsePagination(query);
  const where = { klienId: id };
  const [data, total] = await Promise.all([
    prisma.dokumen.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nomor: true, tipe: true, status: true, total: true,
        tanggalDokumen: true, tanggalJatuhTempo: true, judul: true,
      },
    }),
    prisma.dokumen.count({ where }),
  ]);
  return buildPaginatedResult(data, total, page, limit);
}
