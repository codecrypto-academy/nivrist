// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { RWATestBase } from "./helpers/RWATestBase.sol";
import { Token } from "../src/token/Token.sol";
import { TokenCloneFactory } from "../src/factory/TokenCloneFactory.sol";
import { ComplianceAggregator } from "../src/compliance/ComplianceAggregator.sol";
import { MaxBalanceCompliance } from "../src/compliance/modules/MaxBalanceCompliance.sol";

/// @dev Escenario completo: emisor lanza un security token con compliance, da de alta inversores,
///      emite, mueve tokens respetando reglas, congela un mal actor y hace recuperación forzada.
contract IntegrationTest is RWATestBase {
    TokenCloneFactory factory;

    function setUp() public override {
        super.setUp();
        factory = new TokenCloneFactory();
    }

    function test_FullLifecycle() public {
        // 1) Emisor lanza token con maxBalance = 600k y hasta 3 holders
        (address tAddr, address aAddr) = factory.createTokenWithCompliance(
            factory.tokenImplementation(),
            "Acme Security Token",
            "ACME",
            18,
            address(this),
            address(registry),
            600_000e18,
            3,
            0
        );
        Token token = Token(tAddr);
        ComplianceAggregator agg = ComplianceAggregator(aAddr);
        assertEq(agg.moduleCount(), 2);

        // 2) KYC de tres inversores
        _verify(alice, COUNTRY_US);
        _verify(bob, COUNTRY_ES);
        _verify(carol, COUNTRY_US);

        // 3) Emisión inicial
        token.mint(alice, 500_000e18);
        token.mint(bob, 300_000e18);
        assertEq(token.totalSupply(), 800_000e18);

        // 4) Transferencia válida
        vm.prank(alice);
        token.transfer(carol, 100_000e18);
        assertEq(token.balanceOf(carol), 100_000e18);

        // 5) Un 4º holder es rechazado (maxHolders = 3)
        _verify(dan);
        vm.prank(bob);
        vm.expectRevert("Token: not compliant");
        token.transfer(dan, 1e18);

        // 6) Rechazo por maxBalance (carol no puede pasar de 600k)
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(carol, 550_000e18);

        // 7) Congelar a bob (sospechoso) → no puede mover
        token.setFrozen(bob, true);
        vm.prank(bob);
        vm.expectRevert("Token: frozen");
        token.transfer(alice, 1e18);

        // 8) Recuperación forzada desde bob (aunque esté congelado)
        uint256 bobBal = token.balanceOf(bob);
        token.forcedTransfer(bob, alice, bobBal);
        assertEq(token.balanceOf(bob), 0);

        // 9) Pausa global de emergencia
        token.setPaused(true);
        vm.prank(alice);
        vm.expectRevert("Token: paused");
        token.transfer(carol, 1e18);
        token.setPaused(false);

        // 10) Tras despausar, opera normal
        vm.prank(alice);
        token.transfer(carol, 1000e18);
        assertEq(token.balanceOf(carol), 101_000e18);
    }

    function test_MultipleTokensShareRegistry() public {
        _verify(alice);
        _verify(bob);
        (address t1,) = factory.createToken(
            factory.tokenImplementation(), "T1", "T1", 18, address(this), address(registry)
        );
        (address t2,) = factory.createToken(
            factory.tokenImplementation(), "T2", "T2", 6, address(this), address(registry)
        );
        // ambos tokens comparten el mismo registro de identidades
        Token(t1).mint(alice, 100e18);
        Token(t2).mint(alice, 100e6);
        assertEq(Token(t1).balanceOf(alice), 100e18);
        assertEq(Token(t2).balanceOf(alice), 100e6);
        assertEq(Token(t2).decimals(), 6);
    }
}
