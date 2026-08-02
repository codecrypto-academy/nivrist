// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { DocumentRegistry } from "../src/DocumentRegistry.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract DocumentRegistryTest is Test {
    DocumentRegistry internal registry;

    // Deterministic signer derived from a known private key.
    uint256 internal constant SIGNER_PK = 0xA11CE;
    address internal signer;

    // A different key, used for negative signature tests.
    uint256 internal constant OTHER_PK = 0xB0B;
    address internal other;

    bytes32 internal constant DOC_HASH = keccak256("hello world document");
    uint256 internal constant TS = 1_700_000_000;

    event DocumentStored(bytes32 indexed hash, address indexed signer, uint256 timestamp);

    function setUp() public {
        registry = new DocumentRegistry();
        signer = vm.addr(SIGNER_PK);
        other = vm.addr(OTHER_PK);
    }

    /// @dev Store a document signed by the canonical test signer, returning the signature.
    function _store(bytes32 hash) internal returns (bytes memory sig) {
        sig = _signWrapper(SIGNER_PK, hash);
        registry.storeDocumentHash(hash, TS, sig, signer);
    }

    function _signWrapper(uint256 pk, bytes32 hash) internal pure returns (bytes memory) {
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(hash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, ethHash);
        return abi.encodePacked(r, s, v);
    }

    // 1. Stores a document correctly and exposes its fields.
    function test_StoreDocument() public {
        bytes memory sig = _store(DOC_HASH);
        DocumentRegistry.Document memory doc = registry.getDocumentInfo(DOC_HASH);

        assertEq(doc.hash, DOC_HASH);
        assertEq(doc.timestamp, TS);
        assertEq(doc.signer, signer);
        assertEq(doc.signature, sig);
    }

    // 2. Emits the DocumentStored event on store.
    function test_StoreEmitsEvent() public {
        bytes memory sig = _signWrapper(SIGNER_PK, DOC_HASH);
        vm.expectEmit(true, true, false, true);
        emit DocumentStored(DOC_HASH, signer, TS);
        registry.storeDocumentHash(DOC_HASH, TS, sig, signer);
    }

    // 3. Rejects duplicate documents.
    function test_RevertWhen_DuplicateDocument() public {
        _store(DOC_HASH);
        bytes memory sig = _signWrapper(SIGNER_PK, DOC_HASH);
        vm.expectRevert("Document already exists");
        registry.storeDocumentHash(DOC_HASH, TS, sig, signer);
    }

    // 4. Rejects storing with a zero signer.
    function test_RevertWhen_ZeroSigner() public {
        bytes memory sig = _signWrapper(SIGNER_PK, DOC_HASH);
        vm.expectRevert("Invalid signer");
        registry.storeDocumentHash(DOC_HASH, TS, sig, address(0));
    }

    // 5. Returns correct info for a stored document.
    function test_GetDocumentInfo() public {
        _store(DOC_HASH);
        DocumentRegistry.Document memory doc = registry.getDocumentInfo(DOC_HASH);
        assertEq(doc.signer, signer);
        assertEq(doc.timestamp, TS);
    }

    // 6. isDocumentStored reflects existence correctly.
    function test_IsDocumentStored() public {
        assertFalse(registry.isDocumentStored(DOC_HASH));
        _store(DOC_HASH);
        assertTrue(registry.isDocumentStored(DOC_HASH));
    }

    // 7. Counts documents.
    function test_GetDocumentCount() public {
        assertEq(registry.getDocumentCount(), 0);
        _store(DOC_HASH);
        _store(keccak256("second doc"));
        assertEq(registry.getDocumentCount(), 2);
    }

    // 8. Iterates documents by index in insertion order.
    function test_GetDocumentHashByIndex() public {
        bytes32 h2 = keccak256("second doc");
        _store(DOC_HASH);
        _store(h2);
        assertEq(registry.getDocumentHashByIndex(0), DOC_HASH);
        assertEq(registry.getDocumentHashByIndex(1), h2);
    }

    // 9. Reverts when reading an out-of-range index.
    function test_RevertWhen_IndexOutOfBounds() public {
        _store(DOC_HASH);
        vm.expectRevert("Index out of bounds");
        registry.getDocumentHashByIndex(1);
    }

    // 10. verifyDocument returns true for the correct signer.
    function test_VerifyDocument_ValidSigner() public {
        bytes memory sig = _store(DOC_HASH);
        assertTrue(registry.verifyDocument(DOC_HASH, signer, sig));
    }

    // 11. verifyDocument returns false when the claimed signer is wrong.
    function test_VerifyDocument_InvalidSigner() public {
        bytes memory sig = _store(DOC_HASH);
        assertFalse(registry.verifyDocument(DOC_HASH, other, sig));
    }

    // Extra: reverts verifying / reading a non-existent document.
    function test_RevertWhen_VerifyNonExistent() public {
        bytes memory sig = _signWrapper(SIGNER_PK, DOC_HASH);
        vm.expectRevert("Document does not exist");
        registry.verifyDocument(DOC_HASH, signer, sig);
    }
}
