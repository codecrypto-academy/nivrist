// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { RWATestBase } from "./helpers/RWATestBase.sol";
import { Token } from "../src/token/Token.sol";
import { ComplianceAggregator } from "../src/compliance/ComplianceAggregator.sol";
import { Marketplace } from "../src/marketplace/Marketplace.sol";

contract MarketplaceTest is RWATestBase {
    Token token;
    ComplianceAggregator agg;
    Marketplace market;

    function setUp() public override {
        super.setUp();
        (token, agg) = _newToken();
        market = new Marketplace();
        _verify(alice);
        _verify(bob);
        token.mint(alice, 1000e18); // alice = vendedora
        vm.deal(bob, 10 ether);
        vm.deal(carol, 10 ether);
    }

    function _list(uint256 amount, uint256 price) internal returns (uint256 id) {
        vm.startPrank(alice);
        token.approve(address(market), amount);
        id = market.list(address(token), amount, price);
        vm.stopPrank();
    }

    function test_ListRequiresApproval() public {
        vm.prank(alice);
        vm.expectRevert("MKT: approve first");
        market.list(address(token), 100e18, 1 ether);
    }

    function test_ListAndBuy() public {
        uint256 id = _list(200e18, 1 ether);
        uint256 sellerBefore = alice.balance;

        vm.prank(bob); // bob verificado
        market.buy{ value: 1 ether }(id);

        assertEq(token.balanceOf(bob), 200e18);
        assertEq(token.balanceOf(alice), 800e18);
        assertEq(alice.balance - sellerBefore, 1 ether);
        assertFalse(market.getListing(id).active);
    }

    function test_BuyWrongPriceReverts() public {
        uint256 id = _list(200e18, 1 ether);
        vm.prank(bob);
        vm.expectRevert("MKT: wrong price");
        market.buy{ value: 0.5 ether }(id);
    }

    function test_BuyByUnverifiedReverts() public {
        uint256 id = _list(200e18, 1 ether);
        // outsider (no KYC) tiene ETH pero no puede recibir el security token
        vm.deal(outsider, 10 ether);
        vm.prank(outsider);
        vm.expectRevert("Token: receiver not verified");
        market.buy{ value: 1 ether }(id);
    }

    function test_SellerCannotSelfBuy() public {
        uint256 id = _list(200e18, 1 ether);
        vm.deal(alice, 10 ether);
        vm.prank(alice);
        vm.expectRevert("MKT: self buy");
        market.buy{ value: 1 ether }(id);
    }

    function test_Cancel() public {
        uint256 id = _list(200e18, 1 ether);
        vm.prank(alice);
        market.cancel(id);
        assertFalse(market.getListing(id).active);
        vm.prank(bob);
        vm.expectRevert("MKT: inactive");
        market.buy{ value: 1 ether }(id);
    }

    function test_OnlySellerCancels() public {
        uint256 id = _list(200e18, 1 ether);
        vm.prank(bob);
        vm.expectRevert("MKT: not seller");
        market.cancel(id);
    }

    function test_ListingsEnumeration() public {
        _list(100e18, 1 ether);
        _list(50e18, 2 ether);
        assertEq(market.count(), 2);
        assertEq(market.getListings().length, 2);
        assertEq(market.getListing(1).price, 2 ether);
    }
}
