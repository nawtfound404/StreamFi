// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "lib/forge-std/src/Script.sol";
import "../src/Nitrolite.sol";

contract DeployNitrolite is Script {
    function run() external returns (address) {
        // We start "broadcasting" which tells Foundry to send the following as a real transaction.
        vm.startBroadcast();

        // We create a new instance of our Nitrolite contract.
        // The constructor arguments are the Name and Symbol for the NFT collection.
        Nitrolite nitrolite = new Nitrolite("StreamFi Vaults", "SVAULT");

        // We stop broadcasting.
        vm.stopBroadcast();

        // Log the final address to the console for us to use later.
        console.log("Nitrolite Registry deployed at address:", address(nitrolite));
        return address(nitrolite);
    }
}