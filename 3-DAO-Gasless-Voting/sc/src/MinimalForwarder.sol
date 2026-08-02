// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { Nonces } from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title MinimalForwarder
/// @notice EIP-2771 trusted forwarder. Relays meta-transactions: a user signs a
///         ForwardRequest off-chain, a relayer submits and pays the gas, and the
///         target contract sees the original user as `_msgSender()`.
/// @dev Signatures are EIP-712 typed data. A per-user nonce prevents replay attacks.
///      The original sender's address is appended to the calldata so an
///      ERC2771Context target can recover it.
contract MinimalForwarder is EIP712, Nonces {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from; // externally-owned account that signed the request
        address to; // target contract
        uint256 value; // ETH to forward
        uint256 gas; // gas limit for the inner call
        uint256 nonce; // expected nonce of `from`
        bytes data; // calldata for the target
    }

    bytes32 private constant _TYPEHASH = keccak256(
        "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
    );

    event MetaTransactionExecuted(address indexed from, address indexed to, bool success);

    constructor() EIP712("MinimalForwarder", "1") { }

    /// @notice Current nonce for `from`. Include this value in the next request.
    function getNonce(address from) public view returns (uint256) {
        return nonces(from);
    }

    /// @notice Recover the signer and check the nonce without mutating state.
    /// @return True if `signature` is a valid EIP-712 signature of `req` by `req.from`
    ///         and `req.nonce` is the current nonce.
    function verify(ForwardRequest calldata req, bytes calldata signature)
        public
        view
        returns (bool)
    {
        address signer = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, keccak256(req.data)
                )
            )
        ).recover(signature);
        return nonces(req.from) == req.nonce && signer == req.from;
    }

    /// @notice Execute a verified meta-transaction, forwarding `req.value` and appending
    ///         `req.from` to the calldata (EIP-2771).
    /// @dev Consumes the nonce before the external call (checks-effects-interactions).
    /// @return success Whether the inner call succeeded.
    /// @return returndata The inner call's return data.
    function execute(ForwardRequest calldata req, bytes calldata signature)
        public
        payable
        returns (bool success, bytes memory returndata)
    {
        require(verify(req, signature), "MinimalForwarder: signature does not match request");
        _useCheckedNonce(req.from, req.nonce);

        (success, returndata) =
            req.to.call{ gas: req.gas, value: req.value }(abi.encodePacked(req.data, req.from));

        // Guard against insufficient-gas griefing: per EIP-150 the 1/64 left to the
        // caller must be enough to finish, otherwise the relayer wasted gas silently.
        if (gasleft() <= req.gas / 63) {
            assembly {
                invalid()
            }
        }

        emit MetaTransactionExecuted(req.from, req.to, success);
    }
}
