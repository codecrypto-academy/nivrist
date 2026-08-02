// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { MinimalForwarder } from "../../src/MinimalForwarder.sol";

/// @dev Test base that can build and EIP-712-sign ForwardRequests for a given forwarder,
///      exactly as ethers `signTypedData` would on the frontend.
abstract contract MetaTxHelper is Test {
    bytes32 internal constant _TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
    );
    bytes32 internal constant _DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    function _domainSeparator(address forwarder) internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                _DOMAIN_TYPEHASH,
                keccak256(bytes("MinimalForwarder")),
                keccak256(bytes("1")),
                block.chainid,
                forwarder
            )
        );
    }

    /// @dev Build a signed ForwardRequest calling `to` with `data` on behalf of the key `pk`.
    function _buildRequest(
        MinimalForwarder forwarder,
        uint256 pk,
        address to,
        uint256 value,
        bytes memory data
    ) internal view returns (MinimalForwarder.ForwardRequest memory req, bytes memory sig) {
        address from = vm.addr(pk);
        req = MinimalForwarder.ForwardRequest({
            from: from,
            to: to,
            value: value,
            gas: 1_000_000,
            nonce: forwarder.getNonce(from),
            data: data
        });

        bytes32 structHash = keccak256(
            abi.encode(_TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, keccak256(req.data))
        );
        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", _domainSeparator(address(forwarder)), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        sig = abi.encodePacked(r, s, v);
    }
}
