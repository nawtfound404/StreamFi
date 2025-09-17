// Minimal ABI for Nitrolite/CreatorVault interactions used by the backend
// Keep this in TS to avoid JSON import issues under module NodeNext
const Nitrolite = {
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

    { type: 'function', name: 'name', stateMutability: 'view',
      inputs: [], outputs: [ { name: '', type: 'string', internalType: 'string' } ] },

    { type: 'function', name: 'deposit', stateMutability: 'payable',
      inputs: [ { name: 'vaultId', type: 'uint256', internalType: 'uint256' } ],
      outputs: [],
    },

    { type: 'function', name: 'balanceOfVault', stateMutability: 'view',
      inputs: [ { name: 'vaultId', type: 'uint256', internalType: 'uint256' } ],
      outputs: [ { name: '', type: 'uint256', internalType: 'uint256' } ],
    },

    { type: 'function', name: 'withdraw', stateMutability: 'nonpayable',
      inputs: [
        { name: 'vaultId', type: 'uint256', internalType: 'uint256' },
        { name: 'receiver', type: 'address', internalType: 'address' },
        { name: 'amount', type: 'uint96', internalType: 'uint96' },
      ],
      outputs: [],
    },

    { type: 'function', name: 'withdrawWithSignature', stateMutability: 'nonpayable',
      inputs: [
        { name: 'vaultId', type: 'uint256', internalType: 'uint256' },
        { name: 'receiver', type: 'address', internalType: 'address' },
        { name: 'amount', type: 'uint96', internalType: 'uint96' },
        { name: 'signature', type: 'bytes', internalType: 'bytes' },
      ],
      outputs: [],
    },

    { type: 'function', name: 'nonces', stateMutability: 'view',
      inputs: [ { name: 'vaultId', type: 'uint256', internalType: 'uint256' } ],
      outputs: [ { name: '', type: 'uint64', internalType: 'uint64' } ],
    },

    { type: 'function', name: 'tokenURI', stateMutability: 'view',
      inputs: [ { name: 'tokenId', type: 'uint256', internalType: 'uint256' } ],
      outputs: [ { name: 'uri', type: 'string', internalType: 'string' } ],
    },
  ],
} as const;

export default Nitrolite;
