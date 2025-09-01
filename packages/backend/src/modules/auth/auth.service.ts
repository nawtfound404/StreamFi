// packages/backend/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/environment';
import { User } from '@prisma/client';
import { CreateUserDto } from './auth.dto';

/**
 * Generates JWT for a user
 */
export const generateToken = (user: { id: string; role: User['role'] }) => {
  const payload = {
    id: user.id,
    role: user.role,
  };

  const options: SignOptions = {
    expiresIn: env.jwt.expiresIn as jwt.SignOptions['expiresIn'],

  };

  return jwt.sign(payload, env.jwt.secret, options);
};

/**
 * Create a user (used by signup)
 */
export const createUser = async (userData: CreateUserDto) => {
  const { email, password, name } = userData;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  return user;
};

/**
 * Helper: find user by email
 */
export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

/**
 * Controller-facing: register a new user and return token + user
 */
export const signupUser = async (payload: CreateUserDto) => {
  // optionally validate payload here
  if (!payload.email) {
  throw new Error('Email is required.');
}
const existing = await findUserByEmail(payload.email);

  if (existing) {
    throw new Error('Email already in use.');
  }

  const user = await createUser(payload);
  const token = generateToken({ id: user.id, role: user.role });

  // remove sensitive fields before returning
  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.displayName,
    role: user.role,
  };

  return { user: safeUser, token };
};

/**
 * Controller-facing: login with email/password, return token + user
 */
export const loginUser = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('Email and password required.');
  }

  const user = await findUserByEmail(email);
  if (!user || !user.password) {
    throw new Error('Invalid credentials.');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials.');
  }

  const token = generateToken({ id: user.id, role: user.role });

  const safeUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    displayName: user.displayName,
    role: user.role,
  };

  return { user: safeUser, token };
};

/**
 * Controller-facing: fetch user by id (safe shape)
 */
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, displayName: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};
