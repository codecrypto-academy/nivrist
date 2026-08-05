// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { IdentityRegistry } from "../src/identity/IdentityRegistry.sol";
import { TrustedIssuersRegistry } from "../src/identity/TrustedIssuersRegistry.sol";
import { IdentityCloneFactory } from "../src/factory/IdentityCloneFactory.sol";
import { Identity } from "../src/identity/Identity.sol";

contract IdentityRegistryTest is Test {
    IdentityRegistry registry;
    TrustedIssuersRegistry tir;
    IdentityCloneFactory factory;

    address agent = makeAddr("agent");
    address issuer = makeAddr("issuer");
    address alice = makeAddr("alice");
    uint256 constant KYC = 1;

    function setUp() public {
        tir = new TrustedIssuersRegistry(address(this));
        registry = new IdentityRegistry(address(this), address(tir));
        factory = new IdentityCloneFactory();
    }

    function test_OnlyOwnerCanSetAgent() public {
        vm.prank(alice);
        vm.expectRevert();
        registry.setAgent(agent, true);
    }

    function test_AgentCanRegister() public {
        registry.setAgent(agent, true);
        address id = factory.createIdentity(alice);
        vm.prank(agent);
        registry.registerIdentity(alice, id, 840);
        assertTrue(registry.contains(alice));
        assertEq(registry.investorCountry(alice), 840);
        assertEq(registry.identityOf(alice), id);
    }

    function test_NonAgentCannotRegister() public {
        address id = factory.createIdentity(alice);
        vm.prank(alice);
        vm.expectRevert("IR: not agent");
        registry.registerIdentity(alice, id, 840);
    }

    function test_RegisterRejectsZeroAddress() public {
        vm.expectRevert("IR: zero addr");
        registry.registerIdentity(address(0), address(1), 840);
    }

    function test_DeleteIdentity() public {
        address id = factory.createIdentity(alice);
        registry.registerIdentity(alice, id, 840);
        registry.deleteIdentity(alice);
        assertFalse(registry.contains(alice));
    }

    function test_UpdateCountry() public {
        address id = factory.createIdentity(alice);
        registry.registerIdentity(alice, id, 840);
        registry.updateCountry(alice, 724);
        assertEq(registry.investorCountry(alice), 724);
    }

    function test_UpdateCountryRevertsIfUnregistered() public {
        vm.expectRevert("IR: not registered");
        registry.updateCountry(alice, 724);
    }

    function test_AddClaimTopicRejectsDuplicate() public {
        registry.addClaimTopic(KYC);
        vm.expectRevert("IR: topic exists");
        registry.addClaimTopic(KYC);
    }

    function test_SetTrustedIssuersRegistry() public {
        TrustedIssuersRegistry tir2 = new TrustedIssuersRegistry(address(this));
        registry.setTrustedIssuersRegistry(address(tir2));
        assertEq(address(registry.trustedIssuersRegistry()), address(tir2));
    }
}
