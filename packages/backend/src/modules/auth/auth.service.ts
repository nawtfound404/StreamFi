import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/environment';
import { User } from '@prisma/client';
import { CreateUserDto } from './auth.dto';

const generateToken = (user: User) => {
  const payload = { id: user.id, role: user.role };
  const secret = env.jwt.secret;
  const options: SignOptions = { expiresIn: env.jwt.expiresIn };
  if (!secret) throw new Error('JWT_SECRET is not defined.');
  return jwt.sign(payload, secret, options);
};

export const signupUser = async (userData: CreateUserDto) => {
  const { email, password, name } = userData;
  if (!email || !password || !name) throw new Error('Name, email, and password are required.');
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new Error('An account with this email already exists.');
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role: 'STREAMER' },
  });
  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

export const loginUser = async (email: string, password: string) => {
  if (!email || !password) throw new Error('Email and password are required.');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new Error('Invalid email or password.');
  }
  const token = generateToken(user);
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
