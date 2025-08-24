// Auth & Identity Module (stubs)
export type Role = "streamer" | "viewer" | "admin";

export type Session = { userId: string; role: Role; token: string } | null;

const DUMMY_ACCOUNTS: Array<{ email: string; password: string; role: Role; userId: string }> = [
  { email: "demo@streamfi.dev", password: "demo123", role: "viewer", userId: "demo" },
  { email: "creator@streamfi.dev", password: "stream123", role: "streamer", userId: "creator" },
  { email: "admin@streamfi.dev", password: "admin123", role: "admin", userId: "admin" },
];

export const auth = {
  async signIn(params: { email: string; password: string }): Promise<Session> {
    const found = DUMMY_ACCOUNTS.find((a) => a.email.toLowerCase() === params.email.toLowerCase() && a.password === params.password);
    if (!found) return null;
    return { userId: found.userId, role: found.role, token: "dev" };
  },
  async signUp(params: { email: string; password: string }): Promise<Session> {
    // Demo-only: pretend we created an account as a viewer
    const userId = params.email.split("@")[0] || "user"
    return { userId, role: "viewer", token: "dev" }
  },
  async signOut() {
    return true;
  },
  async getSession(): Promise<Session> {
    return null;
  },
};
