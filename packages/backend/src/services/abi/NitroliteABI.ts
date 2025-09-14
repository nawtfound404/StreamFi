// Minimal ABI for Nitrolite/CreatorVault interactions used by the backend
// Kept in TS to avoid JSON import issues under NodeNext/ts-node-dev
const NitroliteABI = {
  abi: [
    { type: 'constructor', inputs: [
      { name: 'name_', type: 'string', internalType: 'string' },
      { name: 'symbol_', type: 'string', internalType: 'string' },
    ], stateMutability: 'nonpayable' },

    { type: 'event', name: 'Transfer', inputs: [
      { indexed: true, name: 'from', type: 'address', internalType: 'address' },
      { indexed: true, name: 'to', type: 'address', internalType: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256', internalType: 'uint256' },
    ], anonymous: false },

    { type: 'event', name: 'VaultCreated', inputs: [
      { indexed: true, name: 'vaultId', type: 'uint256', internalType: 'uint256' },
      { indexed: true, name: 'owner', type: 'address', internalType: 'address' },
    ], anonymous: false },

    { type: 'event', name: 'Deposit', inputs: [
      { indexed: true, name: 'vaultId', type: 'uint256', internalType: 'uint256' },
      { indexed: true, name: 'sender', type: 'address', internalType: 'address' },
      { indexed: false, name: 'amount', type: 'uint256', internalType: 'uint256' },
    ], anonymous: false },

    { type: 'function', name: 'createVault', stateMutability: 'nonpayable',
      inputs: [ { name: 'owner', type: 'address', internalType: 'address' } ],
      outputs: [ { name: 'vaultId', type: 'uint256', internalType: 'uint256' } ],
    },

    { type: 'function', name: 'ownerOf', stateMutability: 'view',
      inputs: [ { name: 'tokenId', type: 'uint256', internalType: 'uint256' } ],
      outputs: [ { name: 'owner', type: 'address', internalType: 'address' } ],
    },

    { type: 'function', name: 'deposit', stateMutability: 'payable',
      inputs: [ { name: 'vaultId', type: 'uint256', internalType: 'uint256' } ],
      outputs: [],
    },

    { type: 'function', name: 'tokenURI', stateMutability: 'view',
      inputs: [ { name: 'tokenId', type: 'uint256', internalType: 'uint256' } ],
      outputs: [ { name: 'uri', type: 'string', internalType: 'string' } ],
    },
  ],
} as const;

export default NitroliteABI;
