import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schema';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

function signAccessToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as jwt.SignOptions['expiresIn'],
  });
}

function signRefreshToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('Email sudah terdaftar'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: 'owner',
      perusahaan: {
        create: { nama: input.namaPerusahaan },
      },
    },
    select: { id: true, email: true, role: true },
  });

  const perusahaan = await prisma.perusahaan.findFirst({ where: { userId: user.id } });

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    perusahaanId: perusahaan?.id,
  };

  return {
    user: { id: user.id, email: user.email, role: user.role },
    perusahaanId: perusahaan?.id,
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { perusahaan: { select: { id: true }, take: 1 } },
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw Object.assign(new Error('Email atau password salah'), { statusCode: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Akun Anda dinonaktifkan'), { statusCode: 403 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const perusahaanId = user.perusahaan[0]?.id;
  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    perusahaanId,
  };

  return {
    user: { id: user.id, email: user.email, role: user.role },
    perusahaanId,
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Object.assign(new Error('User tidak ditemukan'), { statusCode: 404 });

  const valid = await bcrypt.compare(input.passwordLama, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Password lama tidak sesuai'), { statusCode: 401 });

  const passwordHash = await bcrypt.hash(input.passwordBaru, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function refreshTokens(token: string) {
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as jwt.JwtPayload;
  } catch {
    throw Object.assign(new Error('Refresh token tidak valid'), { statusCode: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: payload['userId'] } });
  if (!user || !user.isActive) {
    throw Object.assign(new Error('Akun tidak ditemukan atau dinonaktifkan'), { statusCode: 401 });
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    perusahaanId: payload['perusahaanId'],
  };

  return {
    accessToken: signAccessToken(tokenPayload),
    refreshToken: signRefreshToken(tokenPayload),
  };
}
