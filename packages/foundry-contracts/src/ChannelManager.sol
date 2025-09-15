// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Nitrolite} from "./Nitrolite.sol";

/// @title ChannelManager
/// @notice Minimal channel manager that escrows ETH deposits on open and
///         settles spent amount into Nitrolite vaults on close.
contract ChannelManager {
    struct Channel {
        address viewer;
        uint256 vaultId;
        uint256 deposit;
        uint256 spent;
        bool closed;
    }

    Nitrolite public immutable vault;
    mapping(bytes32 => Channel) public channels;

    event ChannelOpened(bytes32 indexed channelId, address indexed viewer, uint256 indexed vaultId, uint256 deposit);
    event ChannelClosed(bytes32 indexed channelId, uint256 spent, address settler);

    constructor(Nitrolite _vault) {
        vault = _vault;
    }

    /// @dev Computes channel id as keccak256(viewer, streamIdHash, vaultId).
    function computeChannelId(address viewer, bytes32 streamIdHash, uint256 vaultId) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(viewer, streamIdHash, vaultId));
    }

    /// @notice Open a channel providing ETH as deposit.
    function openChannel(address viewer, bytes32 streamIdHash, uint256 vaultId) external payable returns (bytes32 channelId) {
        require(msg.value > 0, "deposit required");
        channelId = computeChannelId(viewer, streamIdHash, vaultId);
        Channel storage ch = channels[channelId];
        require(ch.viewer == address(0), "exists");
        ch.viewer = viewer;
        ch.vaultId = vaultId;
        ch.deposit = msg.value;
        emit ChannelOpened(channelId, viewer, vaultId, msg.value);
    }

    /// @notice Close a channel and settle spent amount to the creator vault.
    function closeChannel(bytes32 channelId, uint256 spent) external {
        Channel storage ch = channels[channelId];
        require(ch.viewer != address(0), "not found");
        require(!ch.closed, "closed");
        require(spent <= ch.deposit, "exceeds");
        ch.closed = true;
        ch.spent = spent;
        if (spent > 0) {
            // deposit into Nitrolite vault
            (bool ok, ) = address(vault).call{value: spent}(abi.encodeWithSelector(vault.deposit.selector, ch.vaultId));
            require(ok, "settle failed");
        }
        emit ChannelClosed(channelId, spent, msg.sender);
        // remaining funds, if any, are left in the contract for later withdrawal logic (omitted in MVP)
    }

    receive() external payable {}
}
