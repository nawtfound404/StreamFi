// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// The import path for EIP712 has been corrected below.
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol"; // <-- THE FIX IS HERE
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";

/// @title Nitrolite
/// @author h-ilke
/// @notice A gas-optimized ERC-7241 implementation, built on ERC-721 for full NFT compatibility.
contract Nitrolite is ERC721, EIP712 {
    using Math for uint256;
    using SafeCast for uint256;

    string public constant VERSION = "1";
    bytes32 public constant SALT = keccak256("org.erc7824.nitrolite");

    struct Vault {
        address owner;
        uint96 balance;
    }

    Vault[] internal _vaults;

    bytes32 public constant WITHDRAW_TYPEHASH =
        keccak256("Withdraw(uint256 vaultId,uint96 amount,uint64 nonce)");

    mapping(uint256 vaultId => uint64 nonce) public nonces;

    event VaultCreated(uint256 indexed vaultId, address indexed owner);
    event Deposit(uint256 indexed vaultId, address indexed sender, uint256 amount);
    event Withdraw(
        uint256 indexed vaultId,
        address indexed receiver,
        address indexed owner,
        uint256 amount
    );

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
        EIP712(name_, VERSION)
    {
        _vaults.push();
    }

    function createVault(address owner) external returns (uint256) {
        uint256 vaultId = _vaults.length;
        _vaults.push(Vault({owner: owner, balance: 0}));
        _mint(owner, vaultId);
        emit VaultCreated(vaultId, owner);
        return vaultId;
    }

    function deposit(uint256 vaultId) external payable {
        if (msg.value == 0) revert("Deposit amount must be greater than zero");
        _vaults[vaultId].balance += msg.value.toUint96();
        emit Deposit(vaultId, msg.sender, msg.value);
    }

    function withdraw(uint256 vaultId, address receiver, uint96 amount) external {
        if (msg.sender != _vaults[vaultId].owner) revert("Caller is not the vault owner");
        if (amount == 0) revert("Withdraw amount must be greater than zero");
        _vaults[vaultId].balance -= amount;
        emit Withdraw(vaultId, receiver, msg.sender, amount);
        (bool success, ) = receiver.call{value: amount}("");
        if (!success) revert("Withdrawal failed");
    }

    function withdrawWithSignature(
        uint256 vaultId,
        address receiver,
        uint96 amount,
        bytes calldata signature
    ) external {
        if (amount == 0) revert("Withdraw amount must be greater than zero");
        bytes32 digest = _hashWithdraw(vaultId, amount);
        address signer = ECDSA.recover(digest, signature);
        if (signer != _vaults[vaultId].owner) revert("Invalid signature");
        nonces[vaultId]++;
        _vaults[vaultId].balance -= amount;
        emit Withdraw(vaultId, receiver, signer, amount);
        (bool success, ) = receiver.call{value: amount}("");
        if (!success) revert("Withdrawal failed");
    }

    function balanceOfVault(uint256 vaultId) external view returns (uint256) {
        return _vaults[vaultId].balance;
    }

    function ownerOf(uint256 vaultId) public view override returns (address) {
        return _vaults[vaultId].owner;
    }

    function _hashWithdraw(uint256 vaultId, uint96 amount) internal view returns (bytes32) {
        return
            _hashTypedDataV4(
                keccak256(
                    abi.encode(WITHDRAW_TYPEHASH, vaultId, amount, nonces[vaultId])
                )
            );
    }
}