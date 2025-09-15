// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title NitroliteToken
/// @notice Simple ERC20 utility token for credits UI. Not used for on-chain ETH settlement.
contract NitroliteToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Nitrolite Credit", "NITR") {
        _mint(msg.sender, initialSupply);
    }
}
