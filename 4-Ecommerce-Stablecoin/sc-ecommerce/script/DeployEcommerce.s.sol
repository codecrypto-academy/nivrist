// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { Ecommerce } from "../src/Ecommerce.sol";

/// @notice Deploys the Ecommerce contract, wired to an already-deployed EuroToken.
/// @dev The token address comes from the EUROTOKEN_ADDRESS env var (set by restart-all.sh
///      after deploying the stablecoin):
///        EUROTOKEN_ADDRESS=0x... forge script script/DeployEcommerce.s.sol \
///          --rpc-url http://localhost:8545 --broadcast --private-key $PK
contract DeployEcommerce is Script {
    function run() external returns (Ecommerce shop) {
        address euroToken = vm.envAddress("EUROTOKEN_ADDRESS");

        vm.startBroadcast();
        shop = new Ecommerce(euroToken);
        vm.stopBroadcast();

        console.log("Ecommerce:", address(shop));
        console.log("EuroToken:", euroToken);
    }
}
