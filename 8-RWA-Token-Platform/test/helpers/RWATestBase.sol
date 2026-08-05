// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { Identity } from "../../src/identity/Identity.sol";
import { IdentityRegistry } from "../../src/identity/IdentityRegistry.sol";
import { TrustedIssuersRegistry } from "../../src/identity/TrustedIssuersRegistry.sol";
import { IdentityCloneFactory } from "../../src/factory/IdentityCloneFactory.sol";
import { Token } from "../../src/token/Token.sol";
import { ComplianceAggregator } from "../../src/compliance/ComplianceAggregator.sol";

/// @dev Base de tests: monta registry + factory de identidades + issuer de confianza y helpers
///      para dar de alta inversores verificados y desplegar tokens con su aggregator.
///      El contrato de test (`address(this)`) es owner/agent de todo lo que crea.
contract RWATestBase is Test {
    IdentityRegistry internal registry;
    TrustedIssuersRegistry internal tir;
    IdentityCloneFactory internal idFactory;

    address internal issuer = makeAddr("issuer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal dan = makeAddr("dan");
    address internal outsider = makeAddr("outsider");

    uint256 internal constant KYC_TOPIC = 1;
    uint16 internal constant COUNTRY_US = 840;
    uint16 internal constant COUNTRY_ES = 724;

    function setUp() public virtual {
        idFactory = new IdentityCloneFactory();
        tir = new TrustedIssuersRegistry(address(this));
        uint256[] memory topics = new uint256[](1);
        topics[0] = KYC_TOPIC;
        tir.addTrustedIssuer(issuer, topics);
        registry = new IdentityRegistry(address(this), address(tir));
        registry.addClaimTopic(KYC_TOPIC);
        registry.setAgent(address(this), true);
    }

    /// @dev Da de alta un inversor verificado (identity + claim KYC del issuer + registro).
    function _verify(address user, uint16 country) internal returns (address id) {
        id = idFactory.createIdentity(user);
        vm.prank(issuer);
        Identity(id).addClaim(KYC_TOPIC, issuer, "");
        registry.registerIdentity(user, id, country);
    }

    function _verify(address user) internal returns (address id) {
        return _verify(user, COUNTRY_US);
    }

    /// @dev Despliega un Token base con su aggregator vacío; test = admin/agent y owner del agg.
    function _newToken() internal returns (Token t, ComplianceAggregator agg) {
        agg = new ComplianceAggregator(address(this));
        t = new Token();
        t.init("RWA Token", "RWA", 18, address(this), address(registry), address(agg));
        agg.bindToken(address(t));
    }
}
