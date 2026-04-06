import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import type { CreateUserInput, UpdateUserInput } from './users.schema';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

/** Ambil semua user dalam perusahaan yang sama */
export async function listUsers(perusahaanId: string) {
  // Owner: user yang memiliki perusahaan ini
  // Sub-user: user yang punya perusahaanId === perusahaanId
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { perusahaan: { some: { id: perusahaanId } } },
        { perusahaanId },
      ],
    },
    select: {
      id: true,
      email: true,
      nama: true,
      role: true,
      isActive: true,
      perusahaanId: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  return users;
}

/** Buat user baru dalam perusahaan milik requester */
export async function createUser(input: CreateUserInput, perusahaanId: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('Email sudah terdaftar'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      nama: input.nama,
      passwordHash,
      role: input.role,
      perusahaanId,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      nama: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}

/** Update user (hanya dalam perusahaan yang sama) */
export async function updateUser(
  userId: string,
  input: UpdateUserInput,
  perusahaanId: string,
  requesterId: string,
) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      OR: [
        { perusahaan: { some: { id: perusahaanId } } },
        { perusahaanId },
      ],
    },
  });

  if (!user) {
    throw Object.assign(new Error('User tidak ditemukan'), { statusCode: 404 });
  }
  if (user.id === requesterId && input.isActive === false) {
    throw Object.assign(new Error('Tidak bisa menonaktifkan akun sendiri'), { statusCode: 400 });
  }

  const data: Record<string, unknown> = {};
  if (input.nama !== undefined) data.nama = input.nama;
  if (input.role !== undefined) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password) data.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      nama: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return updated;
}

/** Hapus / nonaktifkan user */
export async function deleteUser(
  userId: string,
  perusahaanId: string,
  requesterId: string,
) {
  if (userId === requesterId) {
    throw Object.assign(new Error('Tidak bisa menghapus akun sendiri'), { statusCode: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      OR: [
        { perusahaan: { some: { id: perusahaanId } } },
        { perusahaanId },
      ],
    },
  });

  if (!user) {
    throw Object.assign(new Error('User tidak ditemukan'), { statusCode: 404 });
  }

  // Tidak benar-benar hapus — nonaktifkan saja
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
}
