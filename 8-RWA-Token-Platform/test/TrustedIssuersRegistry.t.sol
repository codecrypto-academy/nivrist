// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { TrustedIssuersRegistry } from "../src/identity/TrustedIssuersRegistry.sol";

contract TrustedIssuersRegistryTest is Test {
    TrustedIssuersRegistry tir;
    address issuer = makeAddr("issuer");
    address other = makeAddr("other");
    uint256 constant KYC = 1;
    uint256 constant AML = 2;

    function setUp() public {
        tir = new TrustedIssuersRegistry(address(this));
    }

    function _topics(uint256 a) internal pure returns (uint256[] memory t) {
        t = new uint256[](1);
        t[0] = a;
    }

    function test_AddTrustedIssuer() public {
        tir.addTrustedIssuer(issuer, _topics(KYC));
        assertTrue(tir.isTrustedIssuer(issuer));
        assertTrue(tir.isTrustedIssuerForTopic(KYC, issuer));
        assertFalse(tir.isTrustedIssuerForTopic(AML, issuer));
        assertEq(tir.count(), 1);
        assertEq(tir.getTrustedIssuers()[0], issuer);
    }

    function test_AddRejectsDuplicate() public {
        tir.addTrustedIssuer(issuer, _topics(KYC));
        vm.expectRevert("TIR: exists");
        tir.addTrustedIssuer(issuer, _topics(KYC));
    }

    function test_AddRejectsEmptyTopics() public {
        uint256[] memory none = new uint256[](0);
        vm.expectRevert("TIR: no topics");
        tir.addTrustedIssuer(issuer, none);
    }

    function test_OnlyOwnerCanAdd() public {
        vm.prank(other);
        vm.expectRevert();
        tir.addTrustedIssuer(issuer, _topics(KYC));
    }

    function test_RemoveTrustedIssuer() public {
        tir.addTrustedIssuer(issuer, _topics(KYC));
        tir.removeTrustedIssuer(issuer);
        assertFalse(tir.isTrustedIssuer(issuer));
        assertFalse(tir.isTrustedIssuerForTopic(KYC, issuer));
        assertEq(tir.count(), 0);
    }

    function test_RemoveRevertsIfMissing() public {
        vm.expectRevert("TIR: not found");
        tir.removeTrustedIssuer(issuer);
    }

    function test_UpdateIssuerTopics() public {
        tir.addTrustedIssuer(issuer, _topics(KYC));
        uint256[] memory both = new uint256[](2);
        both[0] = KYC;
        both[1] = AML;
        tir.updateIssuerTopics(issuer, both);
        assertTrue(tir.isTrustedIssuerForTopic(KYC, issuer));
        assertTrue(tir.isTrustedIssuerForTopic(AML, issuer));
        // reduce back to only AML → KYC drops
        tir.updateIssuerTopics(issuer, _topics(AML));
        assertFalse(tir.isTrustedIssuerForTopic(KYC, issuer));
        assertTrue(tir.isTrustedIssuerForTopic(AML, issuer));
        assertEq(tir.issuerTopics(issuer).length, 1);
    }
}
