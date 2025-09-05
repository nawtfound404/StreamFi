// packages/backend/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { connectMongo, UserModel } from '../../lib/mongo';
import { env } from '../../config/environment';
import { UserRole } from '../../types/models';
import { CreateUserDto } from './auth.dto';

/**
 * Generates JWT for a user
 */
export const generateToken = (user: { id: string; role: UserRole }) => {
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

  await connectMongo();
  const doc = await UserModel.create({ email, password: hashedPassword, name, role: UserRole.AUDIENCE });
  const user = { id: doc._id.toString(), email: doc.email, name: doc.name, displayName: doc.displayName, role: doc.role as UserRole };

  return user;
};

/**
 * Helper: find user by email
 */
export const findUserByEmail = async (email: string) => {
  await connectMongo();
  return UserModel.findOne({ email }).lean<any>();
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
  const token = generateToken({ id: (user as any)._id?.toString?.() || (user as any).id, role: user.role as UserRole });

  // remove sensitive fields before returning
  const safeUser = {
    id: (user as any)._id?.toString?.() || (user as any).id,
    email: (user as any).email,
    name: (user as any).name,
    displayName: (user as any).displayName,
    role: user.role as UserRole,
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

  const user: any = await findUserByEmail(email);
  if (!user || !user.password) {
    throw new Error('Invalid credentials.');
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials.');
  }

  const token = generateToken({ id: (user as any)._id.toString(), role: user.role as UserRole });

  const safeUser = {
    id: (user as any)._id.toString(),
    email: (user as any).email,
    name: (user as any).name,
    displayName: (user as any).displayName,
    role: (user as any).role,
  };

  return { user: safeUser, token };
};

/**
 * Controller-facing: fetch user by id (safe shape)
 */
export const getUserById = async (id: string) => {
  await connectMongo();
  const user = await UserModel.findById(id).select('email name displayName role').lean();

  if (!user) {
    throw new Error('User not found');
  }

  return { id, email: (user as any).email, name: (user as any).name, displayName: (user as any).displayName, role: (user as any).role as UserRole };
};
