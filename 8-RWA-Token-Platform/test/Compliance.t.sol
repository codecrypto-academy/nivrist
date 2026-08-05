// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { RWATestBase } from "./helpers/RWATestBase.sol";
import { Token } from "../src/token/Token.sol";
import { ComplianceAggregator } from "../src/compliance/ComplianceAggregator.sol";
import { MaxBalanceCompliance } from "../src/compliance/modules/MaxBalanceCompliance.sol";
import { MaxHoldersCompliance } from "../src/compliance/modules/MaxHoldersCompliance.sol";
import { WhitelistCompliance } from "../src/compliance/modules/WhitelistCompliance.sol";
import {
    CountryRestrictionCompliance
} from "../src/compliance/modules/CountryRestrictionCompliance.sol";
import {
    DailyTransferLimitCompliance
} from "../src/compliance/modules/DailyTransferLimitCompliance.sol";
import { LockupCompliance } from "../src/compliance/modules/LockupCompliance.sol";

contract ComplianceTest is RWATestBase {
    Token token;
    ComplianceAggregator agg;

    function setUp() public override {
        super.setUp();
        (token, agg) = _newToken();
        _verify(alice);
        _verify(bob);
        _verify(carol);
    }

    /// @dev Cablea un módulo ya construido al aggregator del token.
    function _bind(address module) internal {
        (bool ok,) = module.call(abi.encodeWithSignature("setToken(address)", address(token)));
        require(ok, "setToken");
        (ok,) = module.call(abi.encodeWithSignature("setComplianceContract(address)", address(agg)));
        require(ok, "setCompliance");
        agg.addModule(module);
    }

    // ---------- Aggregator ----------

    function test_AggregatorEmptyAllowsAll() public {
        token.mint(alice, 100e18);
        vm.prank(alice);
        token.transfer(bob, 50e18);
        assertEq(token.balanceOf(bob), 50e18);
    }

    function test_AggregatorAddRemoveModule() public {
        MaxBalanceCompliance m = new MaxBalanceCompliance(address(this), 1);
        _bind(address(m));
        assertEq(agg.moduleCount(), 1);
        agg.removeModule(address(m));
        assertEq(agg.moduleCount(), 0);
    }

    function test_AggregatorRejectsDuplicateModule() public {
        MaxBalanceCompliance m = new MaxBalanceCompliance(address(this), 1);
        _bind(address(m));
        vm.expectRevert("Aggregator: exists");
        agg.addModule(address(m));
    }

    function test_HookOnlyCallableByToken() public {
        vm.expectRevert("Aggregator: not token");
        agg.transferred(alice, bob, 1);
    }

    // ---------- MaxBalance ----------

    function test_MaxBalanceBlocksOverLimit() public {
        MaxBalanceCompliance m = new MaxBalanceCompliance(address(this), 500e18);
        _bind(address(m));
        token.mint(alice, 1000e18);
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(bob, 600e18);
    }

    function test_MaxBalanceAllowsUpToLimit() public {
        MaxBalanceCompliance m = new MaxBalanceCompliance(address(this), 500e18);
        _bind(address(m));
        token.mint(alice, 1000e18);
        vm.prank(alice);
        token.transfer(bob, 500e18);
        assertEq(token.balanceOf(bob), 500e18);
    }

    // ---------- MaxHolders ----------

    function test_MaxHoldersCounting() public {
        MaxHoldersCompliance m = new MaxHoldersCompliance(address(this), 2);
        _bind(address(m));
        token.mint(alice, 100e18); // holder 1
        token.mint(bob, 100e18); // holder 2
        assertEq(m.holderCount(), 2);
        // carol sería el holder 3 → bloqueado
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(carol, 10e18);
    }

    function test_MaxHoldersDecrementsWhenEmptied() public {
        MaxHoldersCompliance m = new MaxHoldersCompliance(address(this), 2);
        _bind(address(m));
        token.mint(alice, 100e18);
        token.mint(bob, 100e18);
        vm.prank(alice);
        token.transfer(bob, 100e18); // alice queda en 0 → holder libre
        assertEq(m.holderCount(), 1);
        // ahora carol sí cabe
        vm.prank(bob);
        token.transfer(carol, 50e18);
        assertEq(m.holderCount(), 2);
    }

    // ---------- Whitelist ----------

    function test_WhitelistBlocksNonListed() public {
        WhitelistCompliance m = new WhitelistCompliance(address(this));
        _bind(address(m));
        m.addToWhitelist(alice); // bob NO en whitelist
        token.mint(alice, 100e18);
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(bob, 10e18);
    }

    function test_WhitelistAllowsBothListed() public {
        WhitelistCompliance m = new WhitelistCompliance(address(this));
        _bind(address(m));
        address[] memory who = new address[](2);
        who[0] = alice;
        who[1] = bob;
        m.batchWhitelist(who);
        token.mint(alice, 100e18);
        vm.prank(alice);
        token.transfer(bob, 10e18);
        assertEq(token.balanceOf(bob), 10e18);
    }

    // ---------- CountryRestriction ----------

    function test_CountryBlocked() public {
        CountryRestrictionCompliance m = new CountryRestrictionCompliance(address(this));
        _bind(address(m));
        m.setUserCountry(alice, COUNTRY_US);
        m.setUserCountry(bob, COUNTRY_ES);
        m.setBlockedCountry(COUNTRY_ES, true);
        token.mint(alice, 100e18);
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(bob, 10e18);
    }

    function test_CountryAllowList() public {
        CountryRestrictionCompliance m = new CountryRestrictionCompliance(address(this));
        _bind(address(m));
        m.setUserCountry(alice, COUNTRY_US);
        m.setUserCountry(bob, COUNTRY_US);
        m.setAllowedCountry(COUNTRY_US, true); // activa allowlist
        token.mint(alice, 100e18);
        vm.prank(alice);
        token.transfer(bob, 10e18);
        assertEq(token.balanceOf(bob), 10e18);
    }

    // ---------- DailyTransferLimit ----------

    function test_DailyLimitBlocksOverDaily() public {
        DailyTransferLimitCompliance m = new DailyTransferLimitCompliance(address(this), 100e18);
        _bind(address(m));
        token.mint(alice, 1000e18);
        vm.prank(alice);
        token.transfer(bob, 100e18); // consume todo el día
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(bob, 1e18);
    }

    function test_DailyLimitResetsNextDay() public {
        DailyTransferLimitCompliance m = new DailyTransferLimitCompliance(address(this), 100e18);
        _bind(address(m));
        token.mint(alice, 1000e18);
        vm.prank(alice);
        token.transfer(bob, 100e18);
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice);
        token.transfer(bob, 100e18); // nuevo día
        assertEq(token.balanceOf(bob), 200e18);
    }

    function test_DailyLimitCustomOverride() public {
        DailyTransferLimitCompliance m = new DailyTransferLimitCompliance(address(this), 100e18);
        _bind(address(m));
        m.setCustomLimit(alice, 500e18); // alice VIP
        token.mint(alice, 1000e18);
        vm.prank(alice);
        token.transfer(bob, 400e18);
        assertEq(token.balanceOf(bob), 400e18);
    }

    // ---------- Lockup (custom) ----------

    function test_LockupBlocksSaleUntilUnlock() public {
        LockupCompliance m = new LockupCompliance(address(this), 30 days);
        _bind(address(m));
        token.mint(alice, 100e18); // alice recibe → se le aplica lockup de 30d
        assertTrue(m.isLocked(alice));
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(bob, 10e18);
    }

    function test_LockupExpires() public {
        LockupCompliance m = new LockupCompliance(address(this), 30 days);
        _bind(address(m));
        token.mint(alice, 100e18);
        vm.warp(block.timestamp + 31 days);
        assertFalse(m.isLocked(alice));
        vm.prank(alice);
        token.transfer(bob, 10e18);
        assertEq(token.balanceOf(bob), 10e18);
    }

    function test_LockupManualUnlock() public {
        LockupCompliance m = new LockupCompliance(address(this), 30 days);
        _bind(address(m));
        token.mint(alice, 100e18);
        m.setUnlockTime(alice, block.timestamp); // desbloqueo inmediato
        vm.prank(alice);
        token.transfer(bob, 10e18);
        assertEq(token.balanceOf(bob), 10e18);
    }

    // ---------- Composición de módulos ----------

    function test_MultipleModulesAllMustPass() public {
        MaxBalanceCompliance mb = new MaxBalanceCompliance(address(this), 500e18);
        WhitelistCompliance wl = new WhitelistCompliance(address(this));
        _bind(address(mb));
        _bind(address(wl));
        wl.addToWhitelist(alice);
        wl.addToWhitelist(bob);
        token.mint(alice, 1000e18);
        // pasa whitelist pero excede balance máximo
        vm.prank(alice);
        vm.expectRevert("Token: not compliant");
        token.transfer(bob, 600e18);
        // dentro de límite → pasa ambos
        vm.prank(alice);
        token.transfer(bob, 400e18);
        assertEq(token.balanceOf(bob), 400e18);
    }
}
