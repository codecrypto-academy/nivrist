// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from "forge-std/Test.sol";
import { Euro } from "../src/Euro.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract EuroTest is Test {
    Euro internal eur;
    address internal owner = address(this);
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    function setUp() public {
        eur = new Euro();
    }

    function test_Metadata() public view {
        assertEq(eur.name(), "Euro");
        assertEq(eur.symbol(), "EUR");
        assertEq(eur.decimals(), 18);
        assertEq(eur.owner(), owner);
    }

    function test_InitialSupplyToDeployer() public view {
        assertEq(eur.totalSupply(), 10_000_000 ether);
        assertEq(eur.balanceOf(owner), 10_000_000 ether);
    }

    function test_OwnerCanMint() public {
        eur.mint(alice, 500 ether);
        assertEq(eur.balanceOf(alice), 500 ether);
        assertEq(eur.totalSupply(), 10_000_000 ether + 500 ether);
    }

    function test_MintEmitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit Euro.Minted(alice, 100 ether);
        eur.mint(alice, 100 ether);
    }

    function test_RevertWhen_NonOwnerMints() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));
        eur.mint(alice, 100 ether);
    }

    function test_RevertWhen_MintToZero() public {
        vm.expectRevert("Euro: mint to zero");
        eur.mint(address(0), 100 ether);
    }

    function test_RevertWhen_MintZero() public {
        vm.expectRevert("Euro: zero amount");
        eur.mint(alice, 0);
    }

    function test_Transfer() public {
        eur.transfer(alice, 1000 ether);
        assertEq(eur.balanceOf(alice), 1000 ether);
        vm.prank(alice);
        eur.transfer(bob, 400 ether);
        assertEq(eur.balanceOf(bob), 400 ether);
    }

    function test_ApproveAndTransferFrom() public {
        eur.transfer(alice, 1000 ether);
        vm.prank(alice);
        eur.approve(bob, 300 ether);
        vm.prank(bob);
        eur.transferFrom(alice, bob, 300 ether);
        assertEq(eur.balanceOf(bob), 300 ether);
        assertEq(eur.allowance(alice, bob), 0);
    }

    function test_Burn() public {
        eur.transfer(alice, 1000 ether);
        vm.prank(alice);
        eur.burn(400 ether);
        assertEq(eur.balanceOf(alice), 600 ether);
        assertEq(eur.totalSupply(), 10_000_000 ether - 400 ether);
    }

    function test_BurnFrom() public {
        eur.transfer(alice, 1000 ether);
        vm.prank(alice);
        eur.approve(bob, 500 ether);
        vm.prank(bob);
        eur.burnFrom(alice, 500 ether);
        assertEq(eur.balanceOf(alice), 500 ether);
    }
}
