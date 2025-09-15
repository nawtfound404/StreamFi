// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "lib/forge-std/src/Script.sol";
import "../src/Nitrolite.sol";
import "../src/ChannelManager.sol";
import "../src/NitroliteToken.sol";
import "../src/Adjudicator.sol";

contract DeployNitrolite is Script {
    function run() external returns (
        address tokenAddr,
        address custodyAddr,
        address adjudicatorAddr,
        address vaultAddr,
        uint256 deployBlock
    ) {
        vm.startBroadcast();

        // Deploy core components
        NitroliteToken token = new NitroliteToken(1_000_000 ether);
        Nitrolite nitrolite = new Nitrolite("StreamFi Vaults", "SVAULT");
        ChannelManager custody = new ChannelManager(nitrolite);
        Adjudicator adjudicator = new Adjudicator();

        deployBlock = block.number;
        vm.stopBroadcast();

        // Log deployed addresses
        console.log("NitroliteToken deployed:", address(token));
        console.log("Nitrolite Vault deployed:", address(nitrolite));
        console.log("ChannelManager (Custody) deployed:", address(custody));
        console.log("Adjudicator deployed:", address(adjudicator));
        console.log("Deploy block:", deployBlock);

        tokenAddr = address(token);
        custodyAddr = address(custody);
        adjudicatorAddr = address(adjudicator);
        vaultAddr = address(nitrolite);

        // Deployment JSON logging (for manual copy)
        string memory json = string(
            abi.encodePacked(
                '{"network":"sepolia","deployBlock":',
                vm.toString(deployBlock),
                ',"token":"', vm.toString(tokenAddr),
                '","custody":"', vm.toString(custodyAddr),
                '","adjudicator":"', vm.toString(adjudicatorAddr),
                '","vault":"', vm.toString(vaultAddr), '"}'
            )
        );
        console.log("Deployment JSON:", json);
    }
}
