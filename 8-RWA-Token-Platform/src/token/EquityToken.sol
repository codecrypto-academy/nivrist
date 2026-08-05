// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Token } from "./Token.sol";

/// @title EquityToken — token de equity con derecho de voto ponderado por balance.
/// @notice Extiende el security token base con gobernanza: el agente crea propuestas y los
///         holders votan con peso = su balance. Se ejecuta si For > Against tras el deadline.
contract EquityToken is Token {
    struct Proposal {
        uint256 id;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
    }

    Proposal[] private _proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(uint256 indexed id, string description, uint256 deadline);
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed id, bool passed);

    function createProposal(string calldata description, uint256 duration)
        external
        onlyRole(AGENT_ROLE)
        returns (uint256 id)
    {
        require(duration > 0, "Equity: zero duration");
        id = _proposals.length;
        _proposals.push(
            Proposal({
                id: id,
                description: description,
                forVotes: 0,
                againstVotes: 0,
                deadline: block.timestamp + duration,
                executed: false
            })
        );
        emit ProposalCreated(id, description, block.timestamp + duration);
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = _proposals[proposalId];
        require(block.timestamp < p.deadline, "Equity: voting closed");
        require(!hasVoted[proposalId][msg.sender], "Equity: already voted");
        uint256 weight = balanceOf(msg.sender);
        require(weight > 0, "Equity: no voting power");

        hasVoted[proposalId][msg.sender] = true;
        if (support) p.forVotes += weight;
        else p.againstVotes += weight;
        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external returns (bool passed) {
        Proposal storage p = _proposals[proposalId];
        require(block.timestamp >= p.deadline, "Equity: voting open");
        require(!p.executed, "Equity: executed");
        p.executed = true;
        passed = p.forVotes > p.againstVotes;
        emit ProposalExecuted(proposalId, passed);
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return _proposals[proposalId];
    }

    function proposalCount() external view returns (uint256) {
        return _proposals.length;
    }
}
