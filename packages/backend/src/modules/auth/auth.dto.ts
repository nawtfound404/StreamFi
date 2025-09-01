import { User } from '@prisma/client';

// This defines the data we expect for a new user signup.
// We only want the name, email, and password, not other user fields.
export type CreateUserDto = Pick<User, 'name' | 'email' | 'password'>;
