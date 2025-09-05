declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export async function connectWallet(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return accounts?.[0] ?? null;
}

export async function getAccounts(): Promise<string[]> {
  if (typeof window === 'undefined' || !window.ethereum) return [];
  const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  return accounts ?? [];
}