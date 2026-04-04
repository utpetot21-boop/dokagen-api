import { PrismaClient } from '@prisma/client';
import type { UpdatePerusahaanInput } from './perusahaan.schema';

const prisma = new PrismaClient();

export async function getByUserId(userId: string) {
  const perusahaan = await prisma.perusahaan.findFirst({ where: { userId } });
  if (!perusahaan) {
    throw Object.assign(new Error('Data perusahaan tidak ditemukan'), { statusCode: 404 });
  }
  return perusahaan;
}

export async function update(userId: string, data: UpdatePerusahaanInput) {
  const existing = await prisma.perusahaan.findFirst({ where: { userId } });
  if (!existing) {
    throw Object.assign(new Error('Data perusahaan tidak ditemukan'), { statusCode: 404 });
  }
  return prisma.perusahaan.update({
    where: { id: existing.id },
    data,
  });
}

export async function updateLogoUrl(userId: string, logoUrl: string) {
  const existing = await prisma.perusahaan.findFirst({ where: { userId } });
  if (!existing) {
    throw Object.assign(new Error('Data perusahaan tidak ditemukan'), { statusCode: 404 });
  }
  return prisma.perusahaan.update({
    where: { id: existing.id },
    data: { logoUrl },
  });
}

export async function updateStempelUrl(userId: string, stempelUrl: string) {
  const existing = await prisma.perusahaan.findFirst({ where: { userId } });
  if (!existing) {
    throw Object.assign(new Error('Data perusahaan tidak ditemukan'), { statusCode: 404 });
  }
  return prisma.perusahaan.update({
    where: { id: existing.id },
    data: { stempelUrl },
  });
}

export async function updateTtdUrl(userId: string, ttdUrl: string) {
  const existing = await prisma.perusahaan.findFirst({ where: { userId } });
  if (!existing) {
    throw Object.assign(new Error('Data perusahaan tidak ditemukan'), { statusCode: 404 });
  }
  return prisma.perusahaan.update({
    where: { id: existing.id },
    data: { ttdUrl },
  });
}
