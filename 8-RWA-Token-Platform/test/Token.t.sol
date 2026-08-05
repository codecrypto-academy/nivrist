// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { RWATestBase } from "./helpers/RWATestBase.sol";
import { Token } from "../src/token/Token.sol";
import { ComplianceAggregator } from "../src/compliance/ComplianceAggregator.sol";

contract TokenTest is RWATestBase {
    Token token;
    ComplianceAggregator agg;

    function setUp() public override {
        super.setUp();
        (token, agg) = _newToken();
        _verify(alice);
        _verify(bob);
    }

    function test_Metadata() public view {
        assertEq(token.name(), "RWA Token");
        assertEq(token.symbol(), "RWA");
        assertEq(token.decimals(), 18);
    }

    function test_CannotReinitialize() public {
        vm.expectRevert("Token: initialized");
        token.init("X", "X", 6, address(this), address(registry), address(agg));
    }

    function test_MintToVerified() public {
        token.mint(alice, 1000e18);
        assertEq(token.balanceOf(alice), 1000e18);
    }

    function test_MintToUnverifiedReverts() public {
        vm.expectRevert("Token: receiver not verified");
        token.mint(outsider, 1000e18);
    }

    function test_MintOnlyAgent() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(alice, 1000e18);
    }

    function test_TransferBetweenVerified() public {
        token.mint(alice, 1000e18);
        vm.prank(alice);
        token.transfer(bob, 400e18);
        assertEq(token.balanceOf(bob), 400e18);
        assertEq(token.balanceOf(alice), 600e18);
    }

    function test_TransferToUnverifiedReverts() public {
        token.mint(alice, 1000e18);
        vm.prank(alice);
        vm.expectRevert("Token: receiver not verified");
        token.transfer(outsider, 1e18);
    }

    function test_FrozenSenderCannotTransfer() public {
        token.mint(alice, 1000e18);
        token.setFrozen(alice, true);
        vm.prank(alice);
        vm.expectRevert("Token: frozen");
        token.transfer(bob, 1e18);
    }

    function test_FrozenReceiverCannotReceive() public {
        token.mint(alice, 1000e18);
        token.setFrozen(bob, true);
        vm.prank(alice);
        vm.expectRevert("Token: frozen");
        token.transfer(bob, 1e18);
    }

    function test_PausedBlocksTransfers() public {
        token.mint(alice, 1000e18);
        token.setPaused(true);
        vm.prank(alice);
        vm.expectRevert("Token: paused");
        token.transfer(bob, 1e18);
    }

    function test_UnpauseRestoresTransfers() public {
        token.mint(alice, 1000e18);
        token.setPaused(true);
        token.setPaused(false);
        vm.prank(alice);
        token.transfer(bob, 1e18);
        assertEq(token.balanceOf(bob), 1e18);
    }

    function test_Burn() public {
        token.mint(alice, 1000e18);
        token.burn(alice, 400e18);
        assertEq(token.balanceOf(alice), 600e18);
    }

    function test_ForcedTransferSkipsComplianceButNeedsVerified() public {
        token.mint(alice, 1000e18);
        token.setFrozen(alice, true); // aún así el agente puede forzar
        token.forcedTransfer(alice, bob, 500e18);
        assertEq(token.balanceOf(bob), 500e18);
    }

    function test_ForcedTransferToUnverifiedReverts() public {
        token.mint(alice, 1000e18);
        vm.expectRevert("Token: receiver not verified");
        token.forcedTransfer(alice, outsider, 1e18);
    }

    function test_SetPausedOnlyAgent() public {
        vm.prank(alice);
        vm.expectRevert();
        token.setPaused(true);
    }

    function test_AdminCanSwapCompliance() public {
        ComplianceAggregator agg2 = new ComplianceAggregator(address(this));
        agg2.bindToken(address(token));
        token.setCompliance(address(agg2));
        assertEq(address(token.compliance()), address(agg2));
    }
}
