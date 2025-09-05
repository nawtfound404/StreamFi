// This defines the data we expect for a new user signup.
// We only want the name, email, and password, not other user fields.
export type CreateUserDto = { name?: string | null; email: string; password: string };
