// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { RWATestBase } from "./helpers/RWATestBase.sol";
import { Token } from "../src/token/Token.sol";
import { TokenCloneFactory } from "../src/factory/TokenCloneFactory.sol";
import { ComplianceAggregator } from "../src/compliance/ComplianceAggregator.sol";
import { CompliancePresetManager } from "../src/compliance/CompliancePresetManager.sol";
import { WhitelistCompliance } from "../src/compliance/modules/WhitelistCompliance.sol";

contract FactoryTest is RWATestBase {
    TokenCloneFactory factory;

    function setUp() public override {
        super.setUp();
        factory = new TokenCloneFactory();
        _verify(alice);
        _verify(bob);
    }

    function test_CreateBareToken() public {
        (address t, address a) = factory.createToken(
            factory.tokenImplementation(), "A", "A", 18, address(this), address(registry)
        );
        assertTrue(factory.isToken(t));
        assertEq(factory.count(), 1);
        // el admin (este test) recibió el ownership del aggregator
        assertEq(ComplianceAggregator(a).owner(), address(this));
        // funciona como token
        Token(t).mint(alice, 100e18);
        assertEq(Token(t).balanceOf(alice), 100e18);
    }

    function test_CreateTokenWithCompliance_WiresModules() public {
        (address t, address a) = factory.createTokenWithCompliance(
            factory.tokenImplementation(),
            "RWA",
            "RWA",
            18,
            address(this),
            address(registry),
            500e18, // maxBalance
            2, // maxHolders
            0 // sin lockup
        );
        assertEq(ComplianceAggregator(a).moduleCount(), 2);
        assertEq(ComplianceAggregator(a).owner(), address(this));

        Token token = Token(t);
        token.mint(alice, 1000e18);
        // maxBalance 500 → transferir 600 falla
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(bob, 600e18);
        // 400 pasa
        vm.prank(alice);
        token.transfer(bob, 400e18);
        assertEq(token.balanceOf(bob), 400e18);
    }

    function test_FactoryRejectsZeroImplementation() public {
        vm.expectRevert("Factory: zero impl");
        factory.createToken(address(0), "A", "A", 18, address(this), address(registry));
    }

    // ---------- Preset Manager ----------

    function test_PresetNone_NoModules() public {
        (, address a) = factory.createToken(
            factory.tokenImplementation(), "A", "A", 18, address(this), address(registry)
        );
        ComplianceAggregator agg = ComplianceAggregator(a);
        CompliancePresetManager pm = new CompliancePresetManager();
        // el aggregator debe ser propiedad del manager para poder añadir módulos
        agg.transferOwnership(address(pm));
        pm.applyPreset(
            agg,
            address(1),
            CompliancePresetManager.Preset.NONE,
            address(this),
            CompliancePresetManager.Config(0, 0, 0)
        );
        assertEq(agg.moduleCount(), 0);
    }

    function test_PresetBasic_Whitelist() public {
        (, address a) = factory.createToken(
            factory.tokenImplementation(), "A", "A", 18, address(this), address(registry)
        );
        ComplianceAggregator agg = ComplianceAggregator(a);
        CompliancePresetManager pm = new CompliancePresetManager();
        agg.transferOwnership(address(pm));
        CompliancePresetManager.BuiltModules memory b = pm.applyPreset(
            agg,
            address(1),
            CompliancePresetManager.Preset.BASIC,
            address(this),
            CompliancePresetManager.Config(0, 0, 0)
        );
        assertEq(agg.moduleCount(), 1);
        assertTrue(b.whitelist != address(0));
        // el módulo whitelist quedó bajo control de este test (owner)
        WhitelistCompliance(b.whitelist).addToWhitelist(alice);
        assertTrue(WhitelistCompliance(b.whitelist).isWhitelisted(alice));
    }

    function test_PresetStandard_ThreeModules() public {
        (, address a) = factory.createToken(
            factory.tokenImplementation(), "A", "A", 18, address(this), address(registry)
        );
        ComplianceAggregator agg = ComplianceAggregator(a);
        CompliancePresetManager pm = new CompliancePresetManager();
        agg.transferOwnership(address(pm));
        pm.applyPreset(
            agg,
            address(1),
            CompliancePresetManager.Preset.STANDARD,
            address(this),
            CompliancePresetManager.Config(0, 0, 0)
        );
        assertEq(agg.moduleCount(), 3); // whitelist + holders + balance
    }

    function test_PresetStrict_FiveModules() public {
        (, address a) = factory.createToken(
            factory.tokenImplementation(), "A", "A", 18, address(this), address(registry)
        );
        ComplianceAggregator agg = ComplianceAggregator(a);
        CompliancePresetManager pm = new CompliancePresetManager();
        agg.transferOwnership(address(pm));
        pm.applyPreset(
            agg,
            address(1),
            CompliancePresetManager.Preset.STRICT,
            address(this),
            CompliancePresetManager.Config(0, 0, 0)
        );
        assertEq(agg.moduleCount(), 5); // + country + dailyLimit
    }
}
