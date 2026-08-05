// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";
import { IdentityCloneFactory } from "../src/factory/IdentityCloneFactory.sol";
import { IdentityRegistry } from "../src/identity/IdentityRegistry.sol";
import { TokenCloneFactory } from "../src/factory/TokenCloneFactory.sol";
import { CompliancePresetManager } from "../src/compliance/CompliancePresetManager.sol";
import { Identity } from "../src/identity/Identity.sol";
import { Token } from "../src/token/Token.sol";

/// @title DeployWeb — despliega la infra completa y escribe web/src/config/deployment.json.
/// @notice Pensado para el dashboard: deja infra + preset manager + un token demo con un inversor
///         ya verificado, y persiste las direcciones en un JSON que la web lee al arrancar.
///         El deployer (anvil #0) es owner/agent/issuer.
///
///   anvil
///   forge script script/DeployWeb.s.sol --rpc-url http://127.0.0.1:8545 \
///     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
///     --broadcast
contract DeployWeb is Script {
    uint256 internal constant KYC_TOPIC = 1;
    string internal constant OUT = "./web/src/config/deployment.json";

    function run() external {
        uint256 pk = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        address deployer = vm.addr(pk);
        address investor = vm.envOr("INVESTOR", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));

        vm.startBroadcast(pk);

        IdentityCloneFactory idFactory = new IdentityCloneFactory();
        IdentityRegistry registry = new IdentityRegistry(deployer);
        registry.addClaimTopic(KYC_TOPIC);
        registry.setTrustedIssuer(KYC_TOPIC, deployer, true);
        registry.setAgent(deployer, true);
        TokenCloneFactory tokenFactory = new TokenCloneFactory();
        CompliancePresetManager presetManager = new CompliancePresetManager();

        // inversor demo verificado
        address identity = idFactory.createIdentity(investor);
        Identity(identity).addClaim(KYC_TOPIC, deployer, "kyc-ok");
        registry.registerIdentity(investor, identity, 840);

        // token demo con compliance
        (address demoToken,) = tokenFactory.createTokenWithCompliance(
            tokenFactory.tokenImplementation(),
            "Demo Security Token",
            "DEMO",
            18,
            deployer,
            address(registry),
            1_000_000e18,
            100,
            0
        );
        Token(demoToken).mint(investor, 10_000e18);

        vm.stopBroadcast();

        _writeJson(deployer, address(idFactory), address(registry), address(tokenFactory), address(presetManager), demoToken);

        console2.log("deployment.json escrito en", OUT);
        console2.log("IdentityRegistry :", address(registry));
        console2.log("TokenCloneFactory:", address(tokenFactory));
        console2.log("PresetManager    :", address(presetManager));
        console2.log("Demo token       :", demoToken);
    }

    function _writeJson(
        address deployer,
        address idFactory,
        address registry,
        address tokenFactory,
        address presetManager,
        address demoToken
    ) internal {
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "identityCloneFactory", idFactory);
        vm.serializeAddress(obj, "identityRegistry", registry);
        vm.serializeAddress(obj, "tokenCloneFactory", tokenFactory);
        vm.serializeAddress(obj, "compliancePresetManager", presetManager);
        string memory json = vm.serializeAddress(obj, "demoToken", demoToken);
        vm.writeJson(json, OUT);
    }
}
