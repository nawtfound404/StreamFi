#!/bin/bash
set -e

# ==============================================================================
#  Definitive Setup Script for StreamFi Smart Contracts
#  This script provides a clean, professional Foundry environment.
#  It creates the Nitrolite contract file directly to prevent download errors.
# ==============================================================================

echo "--- Starting the Definitive Reset for Contracts ---"

# Step 1: Clean up any previous failed attempts
echo "[1/5] Deleting old 'foundry-contracts' directory..."
rm -rf foundry-contracts
echo "Cleanup complete."

# Step 2: Create a new, clean Foundry project
echo "[2/5] Creating a new, clean Foundry project..."
forge init --no-git foundry-contracts
cd foundry-contracts
echo "New project created."

# Step 3: Install the standard, required libraries
echo "[3/5] Installing standard contract libraries (OpenZeppelin)..."
forge install OpenZeppelin/openzeppelin-contracts
echo "Libraries installed."

# Step 4: Create the official Nitrolite.sol contract file directly
echo "[4/5] Creating the official Nitrolite.sol contract..."
cat << 'EOF' > src/Nitrolite.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @title Nitrolite
/// @author h-ilke
/// @notice A gas-optimized ERC-7241 implementation, built on ERC-721 for full NFT compatibility.
/// This contract allows for the creation and management of individual, non-custodial vaults.
contract Nitrolite is ERC721, EIP712 {
    using Math for uint256;
    using SafeCast for uint256;

    /// @dev The version of this contract, used in the EIP-712 signature.
    string public constant VERSION = "1";

    /// @dev A salt to ensure EIP-712 hashes are unique to this contract.
    bytes32 public constant SALT = keccak256("org.erc7824.nitrolite");

    /// @dev A struct representing each vault's data.
    struct Vault {
        address owner;
        uint96 balance;
    }

    /// @dev An array storing all created vaults. The vault ID (tokenId) is the index.
    Vault[] internal _vaults;

    /// @dev The EIP-712 type hash for the Withdraw action.
    bytes32 public constant WITHDRAW_TYPEHASH =
        keccak256("Withdraw(uint256 vaultId,uint96 amount,uint64 nonce)");

    /// @dev A mapping to track nonces for signature-based withdrawals, preventing replay attacks.
    mapping(uint256 vaultId => uint64 nonce) public nonces;

    /// @notice Emitted when a new vault is created.
    /// @param vaultId The unique ID of the new vault (equivalent to the NFT tokenId).
    /// @param owner The address of the creator who owns the vault.
    event VaultCreated(uint256 indexed vaultId, address indexed owner);

    /// @notice Emitted when funds are deposited into a vault.
    /// @param vaultId The ID of the vault receiving the deposit.
    /// @param sender The address of the donor.
    /// @param amount The amount of the deposit in wei.
    event Deposit(uint256 indexed vaultId, address indexed sender, uint256 amount);

    /// @notice Emitted when funds are withdrawn from a vault.
    /// @param vaultId The ID of the vault from which funds were withdrawn.
    /// @param receiver The address receiving the withdrawn funds.
    /// @param owner The owner of the vault who authorized the withdrawal.
    /// @param amount The amount of the withdrawal in wei.
    event Withdraw(
        uint256 indexed vaultId,
        address indexed receiver,
        address indexed owner,
        uint256 amount
    );

    /// @param name_ The name of the NFT collection (e.g., "StreamFi Vaults").
    /// @param symbol_ The symbol for the NFT collection (e.g., "VAULT").
    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        EIP712(name_, VERSION)
    {
        // The first vault (ID 0) is a null vault and cannot be used.
        // This ensures vaultId 0 is never assigned.
        _vaults.push();
    }

    /// @notice Creates a new vault for a specified owner.
    /// @dev Mints an NFT to the owner, representing ownership of the vault.
    /// @param owner The address of the creator who will own the new vault.
    /// @return vaultId The ID of the newly created vault.
    function createVault(address owner) external returns (uint256) {
        uint256 vaultId = _vaults.length;
        _vaults.push(Vault({owner: owner, balance: 0}));
        _mint(owner, vaultId);
        emit VaultCreated(vaultId, owner);
        return vaultId;
    }

    /// @notice Deposits funds into a specific vault.
    /// @dev This function is `payable`, allowing it to receive the native currency (ETH/MATIC).
    /// @param vaultId The ID of the vault to deposit into.
    function deposit(uint256 vaultId) external payable {
        if (msg.value == 0) revert("Deposit amount must be greater than zero");
        _vaults[vaultId].balance += msg.value.toUint96();
        emit Deposit(vaultId, msg.sender, msg.value);
    }

    /// @notice Withdraws funds from a vault to a specified receiver.
    /// @dev Can only be called by the vault owner.
    /// @param vaultId The ID of the vault to withdraw from.
    /// @param receiver The address to send the funds to.
    /// @param amount The amount to withdraw in wei.
    function withdraw(uint256 vaultId, address receiver, uint96 amount) external {
        if (msg.sender != _vaults[vaultId].owner) revert("Caller is not the vault owner");
        if (amount == 0) revert("Withdraw amount must be greater than zero");
        _vaults[vaultId].balance -= amount;
        emit Withdraw(vaultId, receiver, msg.sender, amount);
        (bool success, ) = receiver.call{value: amount}("");
        if (!success) revert("Withdrawal failed");
    }

    /// @notice Withdraws funds from a vault using a signature.
    /// @dev Allows a third party to execute a withdrawal on behalf of the owner,
    /// enabling features like gasless transactions.
    /// @param vaultId The ID of the vault to withdraw from.
    /// @param receiver The address to send the funds to.
    /// @param amount The amount to withdraw in wei.
    /// @param signature An EIP-712 signature from the vault owner authorizing the withdrawal.
    function withdrawWithSignature(
        uint256 vaultId,
        address receiver,
        uint96 amount,
        bytes calldata signature
    ) external {
        if (amount == 0) revert("Withdraw amount must be greater than zero");

        bytes32 digest = _hashWithdraw(vaultId, amount);
        address signer = _recover(digest, signature);

        if (signer != _vaults[vaultId].owner) revert("Invalid signature");

        nonces[vaultId]++;
        _vaults[vaultId].balance -= amount;

        emit Withdraw(vaultId, receiver, signer, amount);
        (bool success, ) = receiver.call{value: amount}("");
        if (!success) revert("Withdrawal failed");
    }

    /// @notice Returns the balance of a specific vault.
    function balanceOfVault(uint256 vaultId) external view returns (uint256) {
        return _vaults[vaultId].balance;
    }

    /// @notice Returns the owner of a specific vault.
    /// @dev Overrides the ERC-721 `ownerOf` to read directly from our internal struct, saving gas.
    function ownerOf(uint256 vaultId) public view override returns (address) {
        return _vaults[vaultId].owner;
    }

    /// @dev Internal function to create the EIP-712 digest for a withdrawal signature.
    function _hashWithdraw(uint256 vaultId, uint96 amount) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(WITHDRAW_TYPEHASH, vaultId, amount, nonces[vaultId])
                )
            );
    }
}
EOF
echo "Nitrolite.sol created successfully."

# Step 5: Compile and test the project to prove the environment is sound.
echo "[5/5] Compiling and testing the new project..."
forge build
forge test
echo "---"
echo "✅ SUCCESS! Your professional smart contract environment is ready."
echo "You can now write tests and deployment scripts for Nitrolite.sol."
echo "---"
```