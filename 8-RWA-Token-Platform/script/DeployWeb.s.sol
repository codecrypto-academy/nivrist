// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { console2 } from "forge-std/console2.sol";
import { IdentityCloneFactory } from "../src/factory/IdentityCloneFactory.sol";
import { IdentityRegistry } from "../src/identity/IdentityRegistry.sol";
import { TrustedIssuersRegistry } from "../src/identity/TrustedIssuersRegistry.sol";
import { TokenCloneFactory } from "../src/factory/TokenCloneFactory.sol";
import { CompliancePresetManager } from "../src/compliance/CompliancePresetManager.sol";
import { Marketplace } from "../src/marketplace/Marketplace.sol";
import { Identity } from "../src/identity/Identity.sol";
import { Token } from "../src/token/Token.sol";
import { RealEstateToken } from "../src/token/RealEstateToken.sol";
import { EquityToken } from "../src/token/EquityToken.sol";

/// @title DeployWeb — despliega la infra completa + tokens demo + marketplace y escribe el JSON.
/// @notice Deja listo el dashboard: registro de issuers de confianza (contrato aparte), identity
///         registry, factory + presets, marketplace, e implementaciones de los 3 tipos de token,
///         con un demo de cada uno y una orden de venta ya publicada.
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

    struct Addrs {
        address idFactory;
        address trustedIssuersRegistry;
        address registry;
        address factory;
        address presetManager;
        address marketplace;
        address reImpl;
        address eqImpl;
        address demoToken;
        address demoRE;
        address demoEQ;
    }

    function run() external {
        uint256 pk = vm.envOr(
            "PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );
        deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        Addrs memory a;

        // --- infra de identidad (trusted issuers en contrato aparte) ---
        idFactory = new IdentityCloneFactory();
        TrustedIssuersRegistry tir = new TrustedIssuersRegistry(deployer);
        registry = new IdentityRegistry(deployer, address(tir));
        registry.addClaimTopic(KYC_TOPIC);
        uint256[] memory topics = new uint256[](1);
        topics[0] = KYC_TOPIC;
        tir.addTrustedIssuer(deployer, topics); // deployer = issuer de confianza
        registry.setAgent(deployer, true);

        TokenCloneFactory factory = new TokenCloneFactory();
        CompliancePresetManager presetManager = new CompliancePresetManager();
        Marketplace marketplace = new Marketplace();

        address reImpl = address(new RealEstateToken());
        address eqImpl = address(new EquityToken());

        // inversores verificados (+ el deployer, para que pueda ser vendedor en el marketplace)
        _verify(deployer);
        _verify(INV1);
        _verify(INV2);
        _verify(INV3);

        // --- token base demo (+ orden de venta en el marketplace) ---
        (address demoToken,) = factory.createTokenWithCompliance(
            factory.tokenImplementation(),
            "Demo Security Token",
            "DEMO",
            18,
            deployer,
            address(registry),
            1_000_000e18,
            100,
            0
        );
        Token(demoToken).mint(INV1, 10_000e18);
        Token(demoToken).mint(deployer, 1_000e18); // stock del vendedor
        Token(demoToken).approve(address(marketplace), 500e18);
        marketplace.list(demoToken, 500e18, 0.5 ether); // 500 DEMO por 0.5 ETH

        // --- real-estate demo (con rentas depositadas) ---
        (address demoRE,) = factory.createTokenWithCompliance(
            reImpl, "Downtown Tower", "TOWER", 18, deployer, address(registry), 0, 0, 0
        );
        RealEstateToken re = RealEstateToken(demoRE);
        re.setPropertyRef("ipfs://QmDeedDowntownTower");
        re.mint(INV1, 6_000e18); // 60%
        re.mint(INV2, 4_000e18); // 40%
        re.depositDividends{ value: 5 ether }();

        // --- equity demo (con propuesta abierta) ---
        (address demoEQ,) = factory.createTokenWithCompliance(
            eqImpl, "Acme Equity", "ACMEEQ", 18, deployer, address(registry), 0, 0, 0
        );
        EquityToken eq = EquityToken(demoEQ);
        eq.mint(INV1, 700e18);
        eq.mint(INV2, 300e18);
        eq.createProposal("Aprobar reparto de dividendo anual", 7 days);

        vm.stopBroadcast();

        a.idFactory = address(idFactory);
        a.trustedIssuersRegistry = address(tir);
        a.registry = address(registry);
        a.factory = address(factory);
        a.presetManager = address(presetManager);
        a.marketplace = address(marketplace);
        a.reImpl = reImpl;
        a.eqImpl = eqImpl;
        a.demoToken = demoToken;
        a.demoRE = demoRE;
        a.demoEQ = demoEQ;
        _writeJson(a);

        console2.log("deployment.json escrito en", OUT);
        console2.log("TrustedIssuersRegistry:", a.trustedIssuersRegistry);
        console2.log("Marketplace           :", a.marketplace);
        console2.log("Demo base             :", demoToken);
        console2.log("Demo RE               :", demoRE);
        console2.log("Demo EQ               :", demoEQ);
    }

    function _verify(address user) internal {
        address identity = idFactory.createIdentity(user);
        Identity(identity).addClaim(KYC_TOPIC, deployer, "kyc-ok");
        registry.registerIdentity(user, identity, 840);
    }

    function _writeJson(Addrs memory a) internal {
        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeAddress(obj, "deployer", deployer);
        vm.serializeAddress(obj, "identityCloneFactory", a.idFactory);
        vm.serializeAddress(obj, "trustedIssuersRegistry", a.trustedIssuersRegistry);
        vm.serializeAddress(obj, "identityRegistry", a.registry);
        vm.serializeAddress(obj, "tokenCloneFactory", a.factory);
        vm.serializeAddress(obj, "compliancePresetManager", a.presetManager);
        vm.serializeAddress(obj, "marketplace", a.marketplace);
        vm.serializeAddress(obj, "realEstateImpl", a.reImpl);
        vm.serializeAddress(obj, "equityImpl", a.eqImpl);
        vm.serializeAddress(obj, "demoToken", a.demoToken);
        vm.serializeAddress(obj, "demoRealEstate", a.demoRE);
        string memory json = vm.serializeAddress(obj, "demoEquity", a.demoEQ);
        vm.writeJson(json, OUT);
    }
}
