// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// --- THE FIX IS HERE ---
// This line imports the necessary tools, including 'Test', from the Foundry library.
import "forge-std/Test.sol";
import "../src/Nitrolite.sol";

contract NitroliteTest is Test {
    // This will be our main contract instance for testing.
    Nitrolite public nitrolite;

    // We create some constant addresses to represent our users.
    address public constant CREATOR = address(0x1); // A test address for the stream creator
    address public constant DONOR = address(0x2);   // A test address for the donor

    // This special `setUp` function runs before every test.
    function setUp() public {
        nitrolite = new Nitrolite("StreamFi Vaults", "VAULT");
    }

    // --- TEST #1: Can a vault be created correctly? ---
    function testCreateVault() public {
        uint256 vaultId = nitrolite.createVault(CREATOR);
        assertEq(vaultId, 1, "First vault ID should be 1");
        assertEq(nitrolite.ownerOf(vaultId), CREATOR, "Vault owner should be the creator");
    }

    // --- TEST #2: Can a user deposit funds correctly? ---
    function testDeposit() public {
        uint256 vaultId = nitrolite.createVault(CREATOR);
        uint256 donationAmount = 1 ether; // 1 ETH
        vm.deal(DONOR, donationAmount);
        vm.prank(DONOR);
        nitrolite.deposit{value: donationAmount}(vaultId);
        assertEq(nitrolite.balanceOfVault(vaultId), donationAmount, "Vault balance should match deposit");
    }
}