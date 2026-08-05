// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";
import { IdentityCloneFactory } from "../src/factory/IdentityCloneFactory.sol";
import { IdentityRegistry } from "../src/identity/IdentityRegistry.sol";
import { TokenCloneFactory } from "../src/factory/TokenCloneFactory.sol";
import { Identity } from "../src/identity/Identity.sol";
import { Token } from "../src/token/Token.sol";
import { ComplianceAggregator } from "../src/compliance/ComplianceAggregator.sol";

/// @title DeployDemo — despliega la plataforma y ejecuta un flujo completo de ejemplo.
/// @notice Además de la infra, da de alta un inversor (KYC), emite un security token con
///         compliance (maxBalance + maxHolders) y hace una emisión. Sirve como demo end-to-end
///         reproducible en anvil. El deployer actúa como owner, agent e issuer de KYC.
///
///   anvil
///   forge script script/DeployDemo.s.sol --rpc-url http://127.0.0.1:8545 \
///     --private-key 0xac0974... --broadcast
contract DeployDemo is Script {
    uint256 internal constant KYC_TOPIC = 1;

    function run() external {
        uint256 pk = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(pk);
        // segundo anvil account como inversor demo
        address investor = vm.envOr("INVESTOR", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));

        vm.startBroadcast(pk);

        // --- infra ---
        IdentityCloneFactory idFactory = new IdentityCloneFactory();
        IdentityRegistry registry = new IdentityRegistry(deployer);
        registry.addClaimTopic(KYC_TOPIC);
        registry.setTrustedIssuer(KYC_TOPIC, deployer, true); // deployer = issuer
        registry.setAgent(deployer, true);
        TokenCloneFactory tokenFactory = new TokenCloneFactory();

        // --- onboarding del inversor (KYC) ---
        address identity = idFactory.createIdentity(investor);
        // el deployer (owner de la identity NO — el investor lo es; pero el issuer sí puede)
        Identity(identity).addClaim(KYC_TOPIC, deployer, "kyc-ok");
        registry.registerIdentity(investor, identity, 840);

        // --- emisión de un security token con compliance ---
        (address tokenAddr, address aggAddr) = tokenFactory.createTokenWithCompliance(
            tokenFactory.tokenImplementation(),
            "Demo Security Token",
            "DEMO",
            18,
            deployer,
            address(registry),
            1_000_000e18, // maxBalance
            100, // maxHolders
            0
        );
        Token(tokenAddr).mint(investor, 10_000e18);

        vm.stopBroadcast();

        console2.log("== Demo RWA desplegada ==");
        console2.log("IdentityRegistry :", address(registry));
        console2.log("TokenCloneFactory:", address(tokenFactory));
        console2.log("Token (DEMO)     :", tokenAddr);
        console2.log("Aggregator       :", aggAddr);
        console2.log("Modulos          :", ComplianceAggregator(aggAddr).moduleCount());
        console2.log("Inversor         :", investor);
        console2.log("Balance inversor :", Token(tokenAddr).balanceOf(investor));
    }
}
