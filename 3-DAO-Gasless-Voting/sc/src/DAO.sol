// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title DAO — treasury with gasless voting
/// @notice Members fund the DAO with ETH, create spending proposals, and vote on them.
///         Voting runs through an EIP-2771 trusted forwarder, so members vote without
///         paying gas. Approved proposals transfer ETH to a beneficiary after a safety
///         delay.
/// @dev Inherits ERC2771Context so `_msgSender()` resolves to the original signer when a
///      call arrives via the trusted MinimalForwarder.
contract DAO is ERC2771Context, ReentrancyGuard {
    enum VoteType {
        For,
        Against,
        Abstain
    }

    struct Proposal {
        uint256 id;
        address proposer;
        address recipient;
        uint256 amount;
        uint256 deadline;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        bool executed;
    }

    /// @notice ETH deposited per member — their stake / voting eligibility.
    mapping(address => uint256) public userBalance;

    /// @notice Sum of all deposits ever made (denominator for the 10% proposal threshold).
    uint256 public totalDeposited;

    /// @notice Minimum stake required to cast a vote.
    uint256 public immutable minVoteBalance;

    /// @notice Extra time after the deadline before an approved proposal can execute.
    uint256 public immutable executionDelay;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;

    // proposalId => voter => has voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    // proposalId => voter => the vote they cast (valid only when hasVoted is true)
    mapping(uint256 => mapping(address => VoteType)) public voteOf;

    event Funded(address indexed member, uint256 amount, uint256 newBalance);
    event ProposalCreated(
        uint256 indexed id, address indexed proposer, address recipient, uint256 amount, uint256 deadline
    );
    event Voted(uint256 indexed id, address indexed voter, VoteType voteType);
    event ProposalExecuted(uint256 indexed id, address indexed recipient, uint256 amount);

    constructor(address trustedForwarder, uint256 _minVoteBalance, uint256 _executionDelay)
        ERC2771Context(trustedForwarder)
    {
        minVoteBalance = _minVoteBalance;
        executionDelay = _executionDelay;
    }

    // ---------------------------------------------------------------------
    // Funding
    // ---------------------------------------------------------------------

    /// @notice Deposit ETH into the DAO treasury, crediting the caller's stake.
    function fundDAO() external payable {
        _fund(_msgSender(), msg.value);
    }

    /// @dev Plain transfers are treated as funding from the sender.
    receive() external payable {
        _fund(msg.sender, msg.value);
    }

    function _fund(address member, uint256 amount) internal {
        require(amount > 0, "DAO: zero funding");
        userBalance[member] += amount;
        totalDeposited += amount;
        emit Funded(member, amount, userBalance[member]);
    }

    // ---------------------------------------------------------------------
    // Proposals
    // ---------------------------------------------------------------------

    /// @notice Create a spending proposal. Requires the proposer to hold at least 10% of
    ///         the total deposited stake.
    function createProposal(address recipient, uint256 amount, uint256 deadline)
        external
        returns (uint256 id)
    {
        address proposer = _msgSender();
        require(recipient != address(0), "DAO: invalid recipient");
        require(amount > 0, "DAO: invalid amount");
        require(deadline > block.timestamp, "DAO: deadline in past");
        // proposer stake >= 10% of total  <=>  stake * 10 >= total
        require(userBalance[proposer] * 10 >= totalDeposited, "DAO: need >= 10% to propose");

        id = ++proposalCount;
        Proposal storage p = proposals[id];
        p.id = id;
        p.proposer = proposer;
        p.recipient = recipient;
        p.amount = amount;
        p.deadline = deadline;

        emit ProposalCreated(id, proposer, recipient, amount, deadline);
    }

    // ---------------------------------------------------------------------
    // Voting (gasless via the trusted forwarder)
    // ---------------------------------------------------------------------

    /// @notice Cast or change a vote on a proposal before its deadline.
    /// @dev One vote per member; re-voting moves the tally from the old choice to the new.
    function vote(uint256 proposalId, VoteType voteType) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "DAO: proposal does not exist");
        require(block.timestamp < p.deadline, "DAO: voting closed");

        address voter = _msgSender();
        require(userBalance[voter] >= minVoteBalance, "DAO: insufficient balance to vote");

        if (hasVoted[proposalId][voter]) {
            _removeVote(p, voteOf[proposalId][voter]);
        }
        _addVote(p, voteType);
        hasVoted[proposalId][voter] = true;
        voteOf[proposalId][voter] = voteType;

        emit Voted(proposalId, voter, voteType);
    }

    function _addVote(Proposal storage p, VoteType voteType) internal {
        if (voteType == VoteType.For) p.votesFor++;
        else if (voteType == VoteType.Against) p.votesAgainst++;
        else p.votesAbstain++;
    }

    function _removeVote(Proposal storage p, VoteType voteType) internal {
        if (voteType == VoteType.For) p.votesFor--;
        else if (voteType == VoteType.Against) p.votesAgainst--;
        else p.votesAbstain--;
    }

    // ---------------------------------------------------------------------
    // Execution
    // ---------------------------------------------------------------------

    /// @notice Execute an approved proposal: deadline + safety delay passed, more For than
    ///         Against, and enough treasury. Transfers the amount to the recipient.
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "DAO: proposal does not exist");
        require(!p.executed, "DAO: already executed");
        require(block.timestamp >= p.deadline + executionDelay, "DAO: execution delay not passed");
        require(p.votesFor > p.votesAgainst, "DAO: not approved");
        require(address(this).balance >= p.amount, "DAO: insufficient treasury");

        p.executed = true;
        (bool ok,) = p.recipient.call{ value: p.amount }("");
        require(ok, "DAO: transfer failed");

        emit ProposalExecuted(proposalId, p.recipient, p.amount);
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        require(proposals[proposalId].id != 0, "DAO: proposal does not exist");
        return proposals[proposalId];
    }

    function getUserBalance(address user) external view returns (uint256) {
        return userBalance[user];
    }

    /// @notice The DAO's spendable ETH treasury.
    function treasury() external view returns (uint256) {
        return address(this).balance;
    }
}
