// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { Euro } from "../src/Euro.sol";

/// @dev Interfaz mínima del SuperTokenFactory de Superfluid. El selector de `createERC20Wrapper`
///      es keccak256("createERC20Wrapper(address,uint8,string,string)") — coincide con la firma
///      real (los tipos IERC20WithTokenInfo→address y el enum Upgradability→uint8 se canonizan
///      igual), así que esta interfaz reducida basta para llamar al factory en el fork de mainnet.
interface ISuperTokenFactory {
    // Upgradability: 0 = NON_UPGRADABLE, 1 = SEMI_UPGRADABLE, 2 = FULL_UPGRADABLE
    function createERC20Wrapper(
        address underlyingToken,
        uint8 upgradability,
        string calldata name,
        string calldata symbol
    ) external returns (address superToken);
}

/// @title DeployAll — despliega EUR y crea el Super Token EURx (fork de mainnet)
/// @notice Requiere Anvil con fork de mainnet (Chain ID 1): `anvil --fork-url <ALCHEMY_MAINNET>`.
///         Así el SuperTokenFactory de Superfluid ya existe en la cadena forkeada.
/// @dev  forge script script/DeployAll.s.sol:DeployAllScript --rpc-url http://127.0.0.1:8545 \
///         --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
contract DeployAllScript is Script {
    // SuperTokenFactory en Ethereum mainnet (override con env FACTORY si cambia de versión).
    address constant DEFAULT_FACTORY = 0x0422689cc4087b6B7280e0a7e7F655200ec86Ae1;

    function run() external returns (Euro eur, address eurx) {
        address factory = vm.envOr("FACTORY", DEFAULT_FACTORY);

        vm.startBroadcast();

        // 1) Token subyacente EUR (10M al deployer).
        eur = new Euro();

        // 2) Crear el wrapper Super Token EURx vía el factory de Superfluid (SEMI_UPGRADABLE).
        eurx = ISuperTokenFactory(factory).createERC20Wrapper(
            address(eur), 1, "Super Euro", "EURx"
        );

        vm.stopBroadcast();

        console.log("EUR=%s", address(eur));
        console.log("EURx=%s", eurx);
        console.log("Factory=%s", factory);
    }
}
