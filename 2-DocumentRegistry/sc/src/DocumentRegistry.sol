// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title DocumentRegistry
/// @author CodeCrypto student
/// @notice Stores document hashes together with an ECDSA signature and a timestamp so the
///         authenticity and authorship of a document can be verified on-chain, immutably.
/// @dev Gas-optimized: existence is derived from `documents[hash].signer != address(0)`,
///      so there is NO redundant `bool exists` field and NO separate `hashExists` mapping.
contract DocumentRegistry {
    using ECDSA for bytes32;

    /// @notice A registered document.
    /// @param hash      keccak256 hash of the document contents
    /// @param timestamp unix time (seconds) recorded when the document was stored
    /// @param signer    address that produced the signature
    /// @param signature ECDSA signature over the EIP-191 prefixed document hash
    struct Document {
        bytes32 hash;
        uint256 timestamp;
        address signer;
        bytes signature;
    }

    /// @notice hash => Document. A zero `signer` means "not stored".
    mapping(bytes32 => Document) private documents;

    /// @notice Ordered list of every stored hash, for enumeration.
    bytes32[] private documentHashes;

    /// @notice Emitted whenever a new document is stored.
    event DocumentStored(bytes32 indexed hash, address indexed signer, uint256 timestamp);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Reverts if a document with `_hash` already exists.
    modifier documentNotExists(bytes32 _hash) {
        require(documents[_hash].signer == address(0), "Document already exists");
        _;
    }

    /// @dev Reverts if no document with `_hash` exists.
    modifier documentExists(bytes32 _hash) {
        require(documents[_hash].signer != address(0), "Document does not exist");
        _;
    }

    // ---------------------------------------------------------------------
    // State-changing functions
    // ---------------------------------------------------------------------

    /// @notice Store a document hash, its signature, signer and timestamp.
    /// @param _hash      keccak256 hash of the document
    /// @param _timestamp unix timestamp associated with the signature
    /// @param _signature ECDSA signature over the EIP-191 prefixed `_hash`
    /// @param _signer    address that produced `_signature`
    function storeDocumentHash(
        bytes32 _hash,
        uint256 _timestamp,
        bytes memory _signature,
        address _signer
    ) external documentNotExists(_hash) {
        require(_signer != address(0), "Invalid signer");
        require(_hash != bytes32(0), "Invalid hash");

        documents[_hash] = Document({
            hash: _hash,
            timestamp: _timestamp,
            signer: _signer,
            signature: _signature
        });
        documentHashes.push(_hash);

        emit DocumentStored(_hash, _signer, _timestamp);
    }

    // ---------------------------------------------------------------------
    // View functions
    // ---------------------------------------------------------------------

    /// @notice Verify that `_signature` over `_hash` was produced by `_signer`, and that the
    ///         stored record for `_hash` also belongs to `_signer`.
    /// @dev Recovers the address from the EIP-191 (`personal_sign`) prefixed hash, matching
    ///      ethers.js `wallet.signMessage(getBytes(hash))`.
    /// @return isValid true when the recovered signer matches `_signer` and the stored signer.
    function verifyDocument(bytes32 _hash, address _signer, bytes memory _signature)
        external
        view
        documentExists(_hash)
        returns (bool isValid)
    {
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(_hash);
        address recovered = ECDSA.recover(ethSignedHash, _signature);
        return recovered == _signer && documents[_hash].signer == _signer;
    }

    /// @notice Return the full record stored for `_hash`.
    function getDocumentInfo(bytes32 _hash)
        external
        view
        documentExists(_hash)
        returns (Document memory)
    {
        return documents[_hash];
    }

    /// @notice Whether a document with `_hash` has been stored.
    function isDocumentStored(bytes32 _hash) external view returns (bool) {
        return documents[_hash].signer != address(0);
    }

    /// @notice Total number of stored documents.
    function getDocumentCount() external view returns (uint256) {
        return documentHashes.length;
    }

    /// @notice Return the stored hash at position `_index` in insertion order.
    function getDocumentHashByIndex(uint256 _index) external view returns (bytes32) {
        require(_index < documentHashes.length, "Index out of bounds");
        return documentHashes[_index];
    }
}
