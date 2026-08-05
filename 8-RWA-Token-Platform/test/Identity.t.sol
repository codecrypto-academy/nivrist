// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { Identity } from "../src/identity/Identity.sol";
import { IdentityRegistry } from "../src/identity/IdentityRegistry.sol";
import { TrustedIssuersRegistry } from "../src/identity/TrustedIssuersRegistry.sol";
import { IdentityCloneFactory } from "../src/factory/IdentityCloneFactory.sol";

contract IdentityTest is Test {
    IdentityCloneFactory factory;
    IdentityRegistry registry;
    TrustedIssuersRegistry tir;

    address issuer = makeAddr("issuer");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    uint256 constant KYC = 1;

    function setUp() public {
        factory = new IdentityCloneFactory();
        tir = new TrustedIssuersRegistry(address(this));
        uint256[] memory topics = new uint256[](1);
        topics[0] = KYC;
        tir.addTrustedIssuer(issuer, topics);
        registry = new IdentityRegistry(address(this), address(tir));
        registry.addClaimTopic(KYC);
    }

    function test_FactoryCreatesInitializedClone() public {
        address id = factory.createIdentity(alice);
        assertEq(Identity(id).owner(), alice);
        assertEq(factory.identityOfOwner(alice), id);
        assertEq(factory.count(), 1);
    }

    function test_FactoryRevertsOnDuplicate() public {
        factory.createIdentity(alice);
        vm.expectRevert("Factory: identity exists");
        factory.createIdentity(alice);
    }

    function test_CloneCannotBeReinitialized() public {
        address id = factory.createIdentity(alice);
        vm.expectRevert("Identity: initialized");
        Identity(id).init(bob);
    }

    function test_IssuerCanAddClaim() public {
        address id = factory.createIdentity(alice);
        vm.prank(issuer);
        Identity(id).addClaim(KYC, issuer, "kyc-passed");
        assertTrue(Identity(id).hasClaim(KYC));
        assertEq(Identity(id).claimIssuer(KYC), issuer);
    }

    function test_OwnerCanAddClaim() public {
        address id = factory.createIdentity(alice);
        vm.prank(alice);
        Identity(id).addClaim(KYC, issuer, "");
        assertTrue(Identity(id).hasClaim(KYC));
    }

    function test_StrangerCannotAddClaim() public {
        address id = factory.createIdentity(alice);
        vm.prank(bob);
        vm.expectRevert("Identity: not authorized");
        Identity(id).addClaim(KYC, issuer, "");
    }

    function test_OwnerCanRemoveClaim() public {
        address id = factory.createIdentity(alice);
        vm.prank(issuer);
        Identity(id).addClaim(KYC, issuer, "");
        vm.prank(alice);
        Identity(id).removeClaim(KYC);
        assertFalse(Identity(id).hasClaim(KYC));
    }

    function test_IsVerified_TrueWhenClaimFromTrustedIssuer() public {
        address id = factory.createIdentity(alice);
        vm.prank(issuer);
        Identity(id).addClaim(KYC, issuer, "");
        registry.registerIdentity(alice, id, 840);
        assertTrue(registry.isVerified(alice));
    }

    function test_IsVerified_FalseWhenUnregistered() public view {
        assertFalse(registry.isVerified(alice));
    }

    function test_IsVerified_FalseWhenIssuerNotTrusted() public {
        address rogue = makeAddr("rogue");
        address id = factory.createIdentity(alice);
        vm.prank(rogue);
        Identity(id).addClaim(KYC, rogue, "");
        registry.registerIdentity(alice, id, 840);
        assertFalse(registry.isVerified(alice));
    }

    function test_IsVerified_FalseWhenMissingRequiredClaim() public {
        registry.addClaimTopic(2); // AML topic también requerido
        uint256[] memory topics = new uint256[](2);
        topics[0] = KYC;
        topics[1] = 2;
        tir.updateIssuerTopics(issuer, topics);
        address id = factory.createIdentity(alice);
        vm.prank(issuer);
        Identity(id).addClaim(KYC, issuer, ""); // solo KYC, falta AML
        registry.registerIdentity(alice, id, 840);
        assertFalse(registry.isVerified(alice));
    }
}
