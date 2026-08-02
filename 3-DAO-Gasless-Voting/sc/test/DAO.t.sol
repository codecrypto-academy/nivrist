// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { MetaTxHelper } from "./utils/MetaTxHelper.sol";
import { MinimalForwarder } from "../src/MinimalForwarder.sol";
import { DAO } from "../src/DAO.sol";

contract DAOTest is MetaTxHelper {
    MinimalForwarder internal forwarder;
    DAO internal dao;

    uint256 internal constant EXEC_DELAY = 1 days;
    uint256 internal constant MIN_VOTE = 1 ether;

    // Members with known keys (so we can sign meta-tx votes).
    uint256 internal constant A_PK = 0xA;
    uint256 internal constant B_PK = 0xB;
    uint256 internal constant C_PK = 0xC;
    address internal alice;
    address internal bob;
    address internal carol;
    address internal relayer = makeAddr("relayer");
    address internal beneficiary = makeAddr("beneficiary");

    function setUp() public {
        forwarder = new MinimalForwarder();
        dao = new DAO(address(forwarder), MIN_VOTE, EXEC_DELAY);

        alice = vm.addr(A_PK);
        bob = vm.addr(B_PK);
        carol = vm.addr(C_PK);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    // ---- helpers ----

    function _fund(address who, uint256 amount) internal {
        vm.prank(who);
        dao.fundDAO{ value: amount }();
    }

    /// @dev Cast a gasless vote: `pk` signs, `relayer` submits and pays.
    function _gaslessVote(uint256 pk, uint256 proposalId, DAO.VoteType v) internal {
        bytes memory data = abi.encodeCall(DAO.vote, (proposalId, v));
        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildRequest(forwarder, pk, address(dao), 0, data);
        vm.prank(relayer);
        forwarder.execute(req, sig);
    }

    // ---- funding ----

    function test_FundDAO() public {
        _fund(alice, 10 ether);
        assertEq(dao.getUserBalance(alice), 10 ether);
        assertEq(dao.totalDeposited(), 10 ether);
        assertEq(dao.treasury(), 10 ether);
    }

    function test_FundViaReceive() public {
        vm.prank(alice);
        (bool ok,) = address(dao).call{ value: 3 ether }("");
        assertTrue(ok);
        assertEq(dao.getUserBalance(alice), 3 ether);
    }

    function test_RevertWhen_FundZero() public {
        vm.prank(alice);
        vm.expectRevert("DAO: zero funding");
        dao.fundDAO{ value: 0 }();
    }

    // ---- proposal creation ----

    function test_CreateProposal_WithEnoughStake() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        uint256 id = dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);
        assertEq(id, 1);
        DAO.Proposal memory p = dao.getProposal(1);
        assertEq(p.proposer, alice);
        assertEq(p.recipient, beneficiary);
        assertEq(p.amount, 1 ether);
    }

    function test_RevertWhen_CreateProposal_InsufficientStake() public {
        _fund(alice, 10 ether); // 90.9% of total after bob funds? compute below
        _fund(bob, 5 ether); // total 15; bob has 5/15 = 33%, alice 66%
        // Make bob under 10%: add a big whale so bob < 10%.
        _fund(carol, 100 ether); // total 115; bob 5/115 ~ 4.3% < 10%
        vm.prank(bob);
        vm.expectRevert("DAO: need >= 10% to propose");
        dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);
    }

    function test_RevertWhen_CreateProposal_PastDeadline() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        vm.expectRevert("DAO: deadline in past");
        dao.createProposal(beneficiary, 1 ether, block.timestamp);
    }

    function test_RevertWhen_CreateProposal_ZeroRecipient() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        vm.expectRevert("DAO: invalid recipient");
        dao.createProposal(address(0), 1 ether, block.timestamp + 1 days);
    }

    // ---- voting ----

    function test_GaslessVote_CountedForSigner() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        uint256 id = dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);

        _gaslessVote(A_PK, id, DAO.VoteType.For);

        DAO.Proposal memory p = dao.getProposal(id);
        assertEq(p.votesFor, 1);
        assertTrue(dao.hasVoted(id, alice));
    }

    function test_DirectVote() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        uint256 id = dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);
        vm.prank(alice);
        dao.vote(id, DAO.VoteType.Against);
        assertEq(dao.getProposal(id).votesAgainst, 1);
    }

    function test_ChangeVoteBeforeDeadline() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        uint256 id = dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);

        _gaslessVote(A_PK, id, DAO.VoteType.For);
        assertEq(dao.getProposal(id).votesFor, 1);

        _gaslessVote(A_PK, id, DAO.VoteType.Against); // change vote
        DAO.Proposal memory p = dao.getProposal(id);
        assertEq(p.votesFor, 0, "old vote removed");
        assertEq(p.votesAgainst, 1, "new vote counted");
    }

    function test_RevertWhen_VoteInsufficientBalance() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        uint256 id = dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);
        // Carol funded below MIN_VOTE.
        _fund(carol, 0.5 ether);
        vm.prank(carol);
        vm.expectRevert("DAO: insufficient balance to vote");
        dao.vote(id, DAO.VoteType.For);
    }

    function test_RevertWhen_VoteNonexistentProposal() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        vm.expectRevert("DAO: proposal does not exist");
        dao.vote(999, DAO.VoteType.For);
    }

    function test_RevertWhen_VoteAfterDeadline() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        uint256 id = dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);
        vm.warp(block.timestamp + 2 days);
        vm.prank(alice);
        vm.expectRevert("DAO: voting closed");
        dao.vote(id, DAO.VoteType.For);
    }

    // ---- execution (the full scenario from the brief) ----

    function test_FullScenario_ApprovedAndExecuted() public {
        _fund(alice, 10 ether); // A: 10
        _fund(bob, 5 ether); // B: 5
        vm.prank(alice);
        uint256 id = dao.createProposal(beneficiary, 2 ether, block.timestamp + 1 days);

        _gaslessVote(A_PK, id, DAO.VoteType.For);
        _gaslessVote(B_PK, id, DAO.VoteType.Against);
        _fund(carol, 20 ether); // C: 20
        _gaslessVote(C_PK, id, DAO.VoteType.For); // For 2 > Against 1 => approved

        // deadline + safety delay
        vm.warp(block.timestamp + 1 days + EXEC_DELAY);

        uint256 before = beneficiary.balance;
        dao.executeProposal(id);

        assertEq(beneficiary.balance, before + 2 ether);
        assertTrue(dao.getProposal(id).executed);
    }

    function test_RevertWhen_ExecuteBeforeDelay() public {
        uint256 id = _approvedProposal();
        vm.warp(block.timestamp + 1 days); // deadline passed but not the safety delay
        vm.expectRevert("DAO: execution delay not passed");
        dao.executeProposal(id);
    }

    function test_RevertWhen_ExecuteNotApproved() public {
        _fund(alice, 10 ether);
        vm.prank(alice);
        uint256 id = dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);
        _gaslessVote(A_PK, id, DAO.VoteType.Against); // Against >= For
        vm.warp(block.timestamp + 1 days + EXEC_DELAY);
        vm.expectRevert("DAO: not approved");
        dao.executeProposal(id);
    }

    function test_RevertWhen_ExecuteTwice() public {
        uint256 id = _approvedProposal();
        vm.warp(block.timestamp + 1 days + EXEC_DELAY);
        dao.executeProposal(id);
        vm.expectRevert("DAO: already executed");
        dao.executeProposal(id);
    }

    function test_RevertWhen_ExecuteNonexistent() public {
        vm.expectRevert("DAO: proposal does not exist");
        dao.executeProposal(123);
    }

    /// @dev Create a proposal that is approved (1 For, 0 Against) but not yet executable.
    function _approvedProposal() internal returns (uint256 id) {
        _fund(alice, 10 ether);
        vm.prank(alice);
        id = dao.createProposal(beneficiary, 1 ether, block.timestamp + 1 days);
        _gaslessVote(A_PK, id, DAO.VoteType.For);
    }
}
