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
import { RealEstateToken } from "../src/token/RealEstateToken.sol";
import { EquityToken } from "../src/token/EquityToken.sol";

/// @title DeployWeb — despliega la infra completa + tokens demo y escribe deployment.json.
/// @notice Deja listo el dashboard: infra + preset manager + implementaciones de los 3 tipos de
///         token (base, real-estate, equity) + un token demo de cada uno con holders verificados.
///         RealEstate ya trae rentas depositadas y Equity una propuesta abierta.
///
///   anvil
///   forge script script/DeployWeb.s.sol --rpc-url http://127.0.0.1:8545 \
///     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
///     --broadcast
contract DeployWeb is Script {
    uint256 internal constant KYC_TOPIC = 1;
    string internal constant OUT = "./web/src/config/deployment.json";

    // anvil #1..#3
    address internal constant INV1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address internal constant INV2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;
    address internal constant INV3 = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    IdentityCloneFactory internal idFactory;
    IdentityRegistry internal registry;
    address internal deployer;

    function run() external {
        uint256 pk = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        // infra
        idFactory = new IdentityCloneFactory();
        registry = new IdentityRegistry(deployer);
        registry.addClaimTopic(KYC_TOPIC);
        registry.setTrustedIssuer(KYC_TOPIC, deployer, true);
        registry.setAgent(deployer, true);
        TokenCloneFactory factory = new TokenCloneFactory();
        CompliancePresetManager presetManager = new CompliancePresetManager();

        // implementaciones de los tipos especiales (para clonar desde el dashboard)
        address reImpl = address(new RealEstateToken());
        address eqImpl = address(new EquityToken());

        // inversores verificados
        _verify(INV1);
        _verify(INV2);
        _verify(INV3);

        // --- token base demo ---
        (address demoToken,) = factory.createTokenWithCompliance(
            factory.tokenImplementation(), "Demo Security Token", "DEMO", 18, deployer, address(registry), 1_000_000e18, 100, 0
        );
        Token(demoToken).mint(INV1, 10_000e18);

        // --- real-estate demo (con rentas depositadas) ---
        (address demoRE,) = factory.createTokenWithCompliance(
            reImpl, "Downtown Tower", "TOWER", 18, deployer, address(registry), 0, 0, 0
        );
        RealEstateToken re = RealEstateToken(demoRE);
        re.setPropertyRef("ipfs://QmDeedDowntownTower");
        re.mint(INV1, 6_000e18); // 60%
        re.mint(INV2, 4_000e18); // 40%
        re.depositDividends{ value: 5 ether }(); // renta a repartir

        // --- equity demo (con propuesta abierta) ---
        (address demoEQ,) = factory.createTokenWithCompliance(
            eqImpl, "Acme Equity", "ACMEEQ", 18, deployer, address(registry), 0, 0, 0
        );
        EquityToken eq = EquityToken(demoEQ);
        eq.mint(INV1, 700e18);
        eq.mint(INV2, 300e18);
        eq.createProposal("Aprobar reparto de dividendo anual", 7 days);

        vm.stopBroadcast();

        _writeJson(
            address(idFactory),
            address(registry),
            address(factory),
            address(presetManager),
            reImpl,
            eqImpl,
            demoToken,
            demoRE,
            demoEQ
        );

        console2.log("deployment.json escrito en", OUT);
        console2.log("Registry :", address(registry));
        console2.log("Factory  :", address(factory));
        console2.log("Demo base:", demoToken);
        console2.log("Demo RE  :", demoRE);
        console2.log("Demo EQ  :", demoEQ);
    }

    function _verify(address user) internal {
        address identity = idFactory.createIdentity(user);
        Identity(identity).addClaim(KYC_TOPIC, deployer, "kyc-ok");
        registry.registerIdentity(user, identity, 840);
    }

    struct Addrs {
        address idFactory;
        address registry;
        address factory;
        address presetManager;
        address reImpl;
        address eqImpl;
        address demoToken;
        address demoRE;
        address demoEQ;
    }

    function _writeJson(
        address idFactory_,
        address registry_,
        address factory_,
        address presetManager_,
        address reImpl_,
        address eqImpl_,
        address demoToken_,
        address demoRE_,
        address demoEQ_
    ) internal {
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "identityCloneFactory", idFactory_);
        vm.serializeAddress(obj, "identityRegistry", registry_);
        vm.serializeAddress(obj, "tokenCloneFactory", factory_);
        vm.serializeAddress(obj, "compliancePresetManager", presetManager_);
        vm.serializeAddress(obj, "realEstateImpl", reImpl_);
        vm.serializeAddress(obj, "equityImpl", eqImpl_);
        vm.serializeAddress(obj, "demoToken", demoToken_);
        vm.serializeAddress(obj, "demoRealEstate", demoRE_);
        string memory json = vm.serializeAddress(obj, "demoEquity", demoEQ_);
        vm.writeJson(json, OUT);
    }
}
