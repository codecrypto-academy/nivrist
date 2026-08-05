// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { RWATestBase } from "./helpers/RWATestBase.sol";
import { RealEstateToken } from "../src/token/RealEstateToken.sol";
import { EquityToken } from "../src/token/EquityToken.sol";
import { ComplianceAggregator } from "../src/compliance/ComplianceAggregator.sol";

contract TokenTypesTest is RWATestBase {
    function _deployRealEstate() internal returns (RealEstateToken t) {
        ComplianceAggregator agg = new ComplianceAggregator(address(this));
        t = new RealEstateToken();
        t.init("Property #1", "PROP1", 18, address(this), address(registry), address(agg));
        agg.bindToken(address(t));
    }

    function _deployEquity() internal returns (EquityToken t) {
        ComplianceAggregator agg = new ComplianceAggregator(address(this));
        t = new EquityToken();
        t.init("Acme Equity", "ACME", 18, address(this), address(registry), address(agg));
        agg.bindToken(address(t));
    }

    // ---------- RealEstateToken (dividendos) ----------

    function test_RealEstate_DividendsProportional() public {
        _verify(alice);
        _verify(bob);
        RealEstateToken t = _deployRealEstate();
        t.mint(alice, 75e18); // 75%
        t.mint(bob, 25e18); // 25%

        t.depositDividends{ value: 4 ether }();

        // el patrón magnified deja unos pocos wei de polvo por división entera
        assertApproxEqAbs(t.withdrawableDividendOf(alice), 3 ether, 100);
        assertApproxEqAbs(t.withdrawableDividendOf(bob), 1 ether, 100);
    }

    function test_RealEstate_Claim() public {
        _verify(alice);
        RealEstateToken t = _deployRealEstate();
        t.mint(alice, 100e18);
        t.depositDividends{ value: 2 ether }();

        uint256 before = alice.balance;
        vm.prank(alice);
        t.claimDividends();
        assertApproxEqAbs(alice.balance - before, 2 ether, 100);
        assertEq(t.withdrawableDividendOf(alice), 0);
    }

    function test_RealEstate_DividendsFairAcrossTransfers() public {
        _verify(alice);
        _verify(bob);
        RealEstateToken t = _deployRealEstate();
        t.mint(alice, 100e18);

        // deposita mientras alice tiene el 100%
        t.depositDividends{ value: 1 ether }();
        // alice transfiere la mitad a bob DESPUÉS del depósito
        vm.prank(alice);
        t.transfer(bob, 50e18);
        // el primer ether entero le corresponde a alice, no a bob
        assertApproxEqAbs(t.withdrawableDividendOf(alice), 1 ether, 100);
        assertEq(t.withdrawableDividendOf(bob), 0);

        // nuevo depósito ahora 50/50
        t.depositDividends{ value: 2 ether }();
        assertApproxEqAbs(t.withdrawableDividendOf(alice), 2 ether, 100); // 1 + 1
        assertApproxEqAbs(t.withdrawableDividendOf(bob), 1 ether, 100);
    }

    function test_RealEstate_DepositRequiresSupply() public {
        RealEstateToken t = _deployRealEstate();
        vm.expectRevert("RE: no supply");
        t.depositDividends{ value: 1 ether }();
    }

    function test_RealEstate_ClaimNothingReverts() public {
        _verify(alice);
        RealEstateToken t = _deployRealEstate();
        t.mint(alice, 100e18);
        vm.prank(alice);
        vm.expectRevert("RE: nothing to claim");
        t.claimDividends();
    }

    function test_RealEstate_PropertyRef() public {
        RealEstateToken t = _deployRealEstate();
        t.setPropertyRef("ipfs://deed-hash");
        assertEq(t.propertyRef(), "ipfs://deed-hash");
    }

    // ---------- EquityToken (gobernanza) ----------

    function test_Equity_VoteWeightedByBalance() public {
        _verify(alice);
        _verify(bob);
        EquityToken t = _deployEquity();
        t.mint(alice, 700e18);
        t.mint(bob, 300e18);

        uint256 id = t.createProposal("Aprobar dividendo", 1 days);
        vm.prank(alice);
        t.vote(id, true);
        vm.prank(bob);
        t.vote(id, false);

        EquityToken.Proposal memory p = t.getProposal(id);
        assertEq(p.forVotes, 700e18);
        assertEq(p.againstVotes, 300e18);

        vm.warp(block.timestamp + 1 days + 1);
        assertTrue(t.executeProposal(id));
    }

    function test_Equity_ProposalFailsWhenAgainstWins() public {
        _verify(alice);
        _verify(bob);
        EquityToken t = _deployEquity();
        t.mint(alice, 300e18);
        t.mint(bob, 700e18);
        uint256 id = t.createProposal("X", 1 days);
        vm.prank(alice);
        t.vote(id, true);
        vm.prank(bob);
        t.vote(id, false);
        vm.warp(block.timestamp + 1 days + 1);
        assertFalse(t.executeProposal(id));
    }

    function test_Equity_CannotVoteTwice() public {
        _verify(alice);
        EquityToken t = _deployEquity();
        t.mint(alice, 100e18);
        uint256 id = t.createProposal("X", 1 days);
        vm.prank(alice);
        t.vote(id, true);
        vm.prank(alice);
        vm.expectRevert("Equity: already voted");
        t.vote(id, true);
    }

    function test_Equity_NoVotingPowerReverts() public {
        _verify(alice);
        _verify(bob);
        EquityToken t = _deployEquity();
        t.mint(alice, 100e18);
        uint256 id = t.createProposal("X", 1 days);
        vm.prank(bob); // sin balance
        vm.expectRevert("Equity: no voting power");
        t.vote(id, true);
    }

    function test_Equity_CannotVoteAfterDeadline() public {
        _verify(alice);
        EquityToken t = _deployEquity();
        t.mint(alice, 100e18);
        uint256 id = t.createProposal("X", 1 days);
        vm.warp(block.timestamp + 2 days);
        vm.prank(alice);
        vm.expectRevert("Equity: voting closed");
        t.vote(id, true);
    }

    function test_Equity_OnlyAgentCreatesProposal() public {
        EquityToken t = _deployEquity();
        vm.prank(alice);
        vm.expectRevert();
        t.createProposal("X", 1 days);
    }

    function test_Equity_CannotExecuteBeforeDeadline() public {
        EquityToken t = _deployEquity();
        uint256 id = t.createProposal("X", 1 days);
        vm.expectRevert("Equity: voting open");
        t.executeProposal(id);
    }

    /// @dev requerido para poder recibir ETH al hacer claim de dividendos
    receive() external payable { }
}
