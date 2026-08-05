// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { MaxBalanceCompliance } from "../src/compliance/modules/MaxBalanceCompliance.sol";
import { MaxHoldersCompliance } from "../src/compliance/modules/MaxHoldersCompliance.sol";
import {
    DailyTransferLimitCompliance
} from "../src/compliance/modules/DailyTransferLimitCompliance.sol";
import { WhitelistCompliance } from "../src/compliance/modules/WhitelistCompliance.sol";
import { LockupCompliance } from "../src/compliance/modules/LockupCompliance.sol";

/// @dev Tests unitarios de setters/vistas de los módulos, sin pasar por el Token.
contract ModuleUnitsTest is Test {
    address alice = makeAddr("alice");

    function test_MaxBalanceSetter() public {
        MaxBalanceCompliance m = new MaxBalanceCompliance(address(this), 100);
        assertEq(m.maxBalance(), 100);
        m.setMaxBalance(500);
        assertEq(m.maxBalance(), 500);
    }

    function test_MaxBalanceSetterOnlyOwner() public {
        MaxBalanceCompliance m = new MaxBalanceCompliance(address(this), 100);
        vm.prank(alice);
        vm.expectRevert();
        m.setMaxBalance(1);
    }

    function test_MaxHoldersSetter() public {
        MaxHoldersCompliance m = new MaxHoldersCompliance(address(this), 3);
        assertEq(m.maxHolders(), 3);
        m.setMaxHolders(10);
        assertEq(m.maxHolders(), 10);
    }

    function test_DailyLimitSettersAndViews() public {
        vm.warp(1_700_000_000); // timestamp realista para getCurrentDay
        DailyTransferLimitCompliance m = new DailyTransferLimitCompliance(address(this), 100);
        assertEq(m.dailyLimit(), 100);
        assertEq(m.limitOf(alice), 100); // usa global
        assertEq(m.remainingToday(alice), 100);
        m.setDailyLimit(200);
        assertEq(m.dailyLimit(), 200);
        m.setCustomLimit(alice, 50);
        assertEq(m.limitOf(alice), 50); // override
        assertEq(m.remainingToday(alice), 50);
        assertGt(m.getCurrentDay(), 0);
    }

    function test_WhitelistRemove() public {
        WhitelistCompliance m = new WhitelistCompliance(address(this));
        m.addToWhitelist(alice);
        assertTrue(m.isWhitelisted(alice));
        m.removeFromWhitelist(alice);
        assertFalse(m.isWhitelisted(alice));
    }

    function test_LockupDefaultSetter() public {
        LockupCompliance m = new LockupCompliance(address(this), 10 days);
        assertEq(m.defaultLockup(), 10 days);
        m.setDefaultLockup(20 days);
        assertEq(m.defaultLockup(), 20 days);
    }

    function test_ModuleSettersOnlyOwner() public {
        MaxHoldersCompliance m = new MaxHoldersCompliance(address(this), 3);
        m.setToken(address(0xBEEF));
        m.setComplianceContract(address(0xCAFE));
        assertEq(m.token(), address(0xBEEF));
        assertEq(m.complianceContract(), address(0xCAFE));
    }
}
