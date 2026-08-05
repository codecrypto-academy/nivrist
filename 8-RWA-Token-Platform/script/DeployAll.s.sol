// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";
import { IdentityCloneFactory } from "../src/factory/IdentityCloneFactory.sol";
import { IdentityRegistry } from "../src/identity/IdentityRegistry.sol";
import { TokenCloneFactory } from "../src/factory/TokenCloneFactory.sol";
import { CompliancePresetManager } from "../src/compliance/CompliancePresetManager.sol";

/// @title DeployAll — despliega la infraestructura completa de la plataforma RWA.
/// @notice Despliega las piezas base (identity factory + registry + token factory + preset
///         manager), configura el topic KYC y un trusted issuer, y deja todo listo para emitir.
///
/// Uso local (anvil):
///   anvil
///   forge script script/DeployAll.s.sol --rpc-url http://127.0.0.1:8545 \
///     --private-key $PK --broadcast
///
/// Variables de entorno opcionales:
///   KYC_ISSUER  — dirección del trusted issuer de KYC (por defecto: el deployer)
contract DeployAll is Script {
    uint256 internal constant KYC_TOPIC = 1;

    function run() external {
        uint256 pk = vm.envOr("PRIVATE_KEY", uint256(0));
        address deployer = pk == 0 ? msg.sender : vm.addr(pk);
        address issuer = vm.envOr("KYC_ISSUER", deployer);

        if (pk == 0) vm.startBroadcast();
        else vm.startBroadcast(pk);

        // 1) Infra de identidad
        IdentityCloneFactory idFactory = new IdentityCloneFactory();
        IdentityRegistry registry = new IdentityRegistry(deployer);

        // 2) KYC obligatorio + issuer de confianza
        registry.addClaimTopic(KYC_TOPIC);
        registry.setTrustedIssuer(KYC_TOPIC, issuer, true);
        registry.setAgent(deployer, true);

        // 3) Fábrica de tokens + gestor de presets
        TokenCloneFactory tokenFactory = new TokenCloneFactory();
        CompliancePresetManager presetManager = new CompliancePresetManager();

        vm.stopBroadcast();

        console2.log("== RWA Token Platform desplegada ==");
        console2.log("IdentityCloneFactory   :", address(idFactory));
        console2.log("IdentityRegistry       :", address(registry));
        console2.log("TokenCloneFactory      :", address(tokenFactory));
        console2.log("  tokenImplementation  :", tokenFactory.tokenImplementation());
        console2.log("CompliancePresetManager:", address(presetManager));
        console2.log("KYC issuer (trusted)   :", issuer);
        console2.log("Deployer (owner/agent) :", deployer);
    }
}
