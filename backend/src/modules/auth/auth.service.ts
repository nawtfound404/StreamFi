// =================================================================
// 📂 src/modules/auth/auth.service.ts (CORRECTED & FULLY FUNCTIONAL)
// =================================================================
import { prisma } from '../../lib/prisma';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken'; // Import SignOptions
import { env } from '../../config/environment';
import { User } from '@prisma/client';

// Helper function to generate JWT
const generateToken = (user: User) => {
  const payload = {
    id: user.id,
    role: user.role,
  };

  const secret = env.jwtSecret;

  // This is the definitive fix.
  // We create an options object and explicitly type it as SignOptions.
  // This tells TypeScript exactly which overload of jwt.sign to use.
  const options: SignOptions = {
  expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
};


  if (!secret) {
    throw new Error('JWT_SECRET is not defined in your .env file.');
  }

  return jwt.sign(payload, secret, options);
};


/*
 * Registers a new user, hashes their password, and returns a JWT.
 * @param userData - Object containing name, email, and password.
 * @returns { token: string, user: Omit<User, 'password'> }
 */
export const signupUser = async (userData: Pick<User, 'name' | 'email' | 'password'>) => {
  const { email, password, name } = userData;

  if (!email || !password || !name) {
    throw new Error('Name, email, and password are required.');
  }

  // 1. Check if user already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('An account with this email already exists.');
  }

  // 2. Hash the password
  const hashedPassword = await bcrypt.hash(password!, 10);

  // 3. Create the new user in the database
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: 'STREAMER', // Default new signups to streamers
    },
  });

  // 4. Generate a JWT
  const token = generateToken(user);

  // 5. Return the token and user object (without the password)
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};


/*
 * Logs in an existing user by verifying their password and returns a JWT.
 * @param email - The user's email.
 * @param password - The user's plain-text password.
 * @returns { token: string, user: Omit<User, 'password'> }
 */
export const loginUser = async (email: string, password: string) => {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  // 1. Find the user by email
  const user = await prisma.user.findUnique({ where: { email } });

  // 2. Check if user exists and if password is correct
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    // Use a generic error message for security
    throw new Error('Invalid email or password.');
  }

  // 3. Generate a JWT
  const token = generateToken(user);

  // 4. Return the token and user object (without the password)
  const { password: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
};

/*
 * Fetches a user's public profile by their ID.
 * @param id - The user's unique ID.
 * @returns The user object without sensitive information.
 */
export const getUserById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, displayName: true },
  });

  if (!user) {
    throw new Error('User not found');
  }
  return user;
};
