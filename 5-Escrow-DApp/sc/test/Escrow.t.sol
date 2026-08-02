// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { Escrow } from "../src/Escrow.sol";
import { TestToken } from "../src/TestToken.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract EscrowTest is Test {
    Escrow internal escrow;
    TestToken internal tka;
    TestToken internal tkb;

    address internal owner = address(this);
    address internal maker = makeAddr("maker");
    address internal taker = makeAddr("taker");

    uint256 internal constant AMT_A = 100e18;
    uint256 internal constant AMT_B = 50e18;

    function setUp() public {
        escrow = new Escrow();
        tka = new TestToken("Token A", "TKA");
        tkb = new TestToken("Token B", "TKB");
        escrow.addToken(address(tka));
        escrow.addToken(address(tkb));

        tka.mint(maker, 1000e18);
        tkb.mint(taker, 1000e18);
    }

    // ---- helpers ----
    function _createOp() internal returns (uint256 id) {
        vm.startPrank(maker);
        tka.approve(address(escrow), AMT_A);
        id = escrow.createOperation(address(tka), address(tkb), AMT_A, AMT_B);
        vm.stopPrank();
    }

    // ---- allowed tokens ----
    function test_AddToken() public {
        TestToken t = new TestToken("X", "X");
        escrow.addToken(address(t));
        assertTrue(escrow.isAllowed(address(t)));
        assertEq(escrow.getAllowedTokens().length, 3);
    }

    function test_RevertWhen_NonOwnerAddsToken() public {
        vm.prank(maker);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, maker));
        escrow.addToken(address(0x1234));
    }

    function test_RevertWhen_AddDuplicateToken() public {
        vm.expectRevert("Escrow: already allowed");
        escrow.addToken(address(tka));
    }

    // ---- create ----
    function test_CreateOperation_LocksTokenA() public {
        uint256 id = _createOp();
        assertEq(id, 0);
        assertEq(tka.balanceOf(address(escrow)), AMT_A);
        assertEq(tka.balanceOf(maker), 900e18);

        Escrow.Operation memory op = escrow.getOperation(id);
        assertEq(op.creator, maker);
        assertTrue(op.active);
        assertEq(op.amountA, AMT_A);
        assertEq(op.amountB, AMT_B);
    }

    function test_RevertWhen_CreateWithDisallowedToken() public {
        TestToken bad = new TestToken("Bad", "BAD");
        vm.startPrank(maker);
        bad.mint(maker, 100e18);
        bad.approve(address(escrow), 100e18);
        vm.expectRevert("Escrow: token not allowed");
        escrow.createOperation(address(bad), address(tkb), 100e18, AMT_B);
        vm.stopPrank();
    }

    function test_RevertWhen_CreateSameToken() public {
        vm.startPrank(maker);
        tka.approve(address(escrow), AMT_A);
        vm.expectRevert("Escrow: same token");
        escrow.createOperation(address(tka), address(tka), AMT_A, AMT_B);
        vm.stopPrank();
    }

    function test_RevertWhen_CreateZeroAmount() public {
        vm.startPrank(maker);
        tka.approve(address(escrow), AMT_A);
        vm.expectRevert("Escrow: zero amount");
        escrow.createOperation(address(tka), address(tkb), 0, AMT_B);
        vm.stopPrank();
    }

    // ---- complete ----
    function test_CompleteOperation_SwapsTokens() public {
        uint256 id = _createOp();

        vm.startPrank(taker);
        tkb.approve(address(escrow), AMT_B);
        escrow.completeOperation(id);
        vm.stopPrank();

        // maker received token B, taker received token A.
        assertEq(tkb.balanceOf(maker), AMT_B);
        assertEq(tka.balanceOf(taker), AMT_A);
        // escrow emptied.
        assertEq(tka.balanceOf(address(escrow)), 0);

        Escrow.Operation memory op = escrow.getOperation(id);
        assertFalse(op.active);
        assertEq(op.completedBy, taker);
    }

    function test_RevertWhen_CompleteOwnOperation() public {
        uint256 id = _createOp();
        vm.startPrank(maker);
        tkb.mint(maker, AMT_B);
        tkb.approve(address(escrow), AMT_B);
        vm.expectRevert("Escrow: cannot complete your own operation");
        escrow.completeOperation(id);
        vm.stopPrank();
    }

    function test_RevertWhen_CompleteInactive() public {
        uint256 id = _createOp();
        vm.prank(maker);
        escrow.cancelOperation(id);

        vm.startPrank(taker);
        tkb.approve(address(escrow), AMT_B);
        vm.expectRevert("Escrow: operation is not active");
        escrow.completeOperation(id);
        vm.stopPrank();
    }

    // ---- cancel ----
    function test_CancelOperation_ReturnsTokenA() public {
        uint256 id = _createOp();
        vm.prank(maker);
        escrow.cancelOperation(id);

        assertEq(tka.balanceOf(maker), 1000e18); // fully returned
        assertEq(tka.balanceOf(address(escrow)), 0);
        assertFalse(escrow.getOperation(id).active);
    }

    function test_RevertWhen_NonCreatorCancels() public {
        uint256 id = _createOp();
        vm.prank(taker);
        vm.expectRevert("Escrow: only creator can cancel");
        escrow.cancelOperation(id);
    }

    function test_RevertWhen_CancelTwice() public {
        uint256 id = _createOp();
        vm.startPrank(maker);
        escrow.cancelOperation(id);
        vm.expectRevert("Escrow: operation is not active");
        escrow.cancelOperation(id);
        vm.stopPrank();
    }

    // ---- views ----
    function test_GetAllOperations() public {
        _createOp();
        _createOp();
        assertEq(escrow.getAllOperations().length, 2);
        assertEq(escrow.operationsCount(), 2);
    }

    function test_EmptyViewsDoNotRevert() public view {
        assertEq(escrow.getAllOperations().length, 0);
        assertEq(escrow.getAllowedTokens().length, 2);
    }
}
