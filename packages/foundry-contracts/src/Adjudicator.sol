// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Adjudicator
/// @notice Minimal stub for dispute resolution. Validates ECDSA signature over channel state and emits an event.
contract Adjudicator {
    event DisputeAdjudicated(bytes32 indexed channelId, address indexed viewer, uint256 spent, uint64 nonce, bool valid);

    struct ChannelState {
        bytes32 channelId;
        uint256 vaultId;
        address viewer;
        uint256 deposit;
        uint256 spent;
        uint64 nonce;
    }

    /// @notice Domain separator fields provided by backend; no on-chain EIP712 for MVP.
    function adjudicate(
        ChannelState calldata state,
        bytes calldata signature,
        address expectedViewer
    ) external {
        // Recreate the packed hash like backend uses: keccak256(abi.encode(...)) is fine for MVP
        bytes32 digest = keccak256(abi.encode(
            state.channelId,
            state.vaultId,
            state.viewer,
            state.deposit,
            state.spent,
            state.nonce
        ));
        address rec = ECDSA.recover(digest, signature);
        bool ok = (rec == expectedViewer && rec == state.viewer);
        emit DisputeAdjudicated(state.channelId, state.viewer, state.spent, state.nonce, ok);
    }
}
