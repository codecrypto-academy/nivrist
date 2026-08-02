// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { EuroToken } from "../src/EuroToken.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract EuroTokenTest is Test {
    EuroToken internal token;
    address internal owner = address(this);
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        token = new EuroToken();
    }

    function test_Metadata() public view {
        assertEq(token.name(), "EuroToken");
        assertEq(token.symbol(), "EURT");
        assertEq(token.decimals(), 6);
        assertEq(token.owner(), owner);
        assertEq(token.totalSupply(), 0);
    }

    function test_OwnerCanMint() public {
        token.mint(alice, 100e6); // 100 EURT
        assertEq(token.balanceOf(alice), 100e6);
        assertEq(token.totalSupply(), 100e6);
    }

    function test_MintEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit EuroToken.Minted(alice, 50e6);
        token.mint(alice, 50e6);
    }

    function test_RevertWhen_NonOwnerMints() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        token.mint(alice, 100e6);
    }

    function test_RevertWhen_MintToZero() public {
        vm.expectRevert("EuroToken: mint to zero address");
        token.mint(address(0), 100e6);
    }

    function test_RevertWhen_MintZeroAmount() public {
        vm.expectRevert("EuroToken: zero amount");
        token.mint(alice, 0);
    }

    function test_Transfer() public {
        token.mint(alice, 100e6);
        vm.prank(alice);
        token.transfer(bob, 40e6);
        assertEq(token.balanceOf(alice), 60e6);
        assertEq(token.balanceOf(bob), 40e6);
    }

    function test_ApproveAndTransferFrom() public {
        token.mint(alice, 100e6);
        vm.prank(alice);
        token.approve(bob, 30e6);
        vm.prank(bob);
        token.transferFrom(alice, bob, 30e6);
        assertEq(token.balanceOf(bob), 30e6);
        assertEq(token.allowance(alice, bob), 0);
    }
}
