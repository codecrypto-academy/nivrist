// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { DocumentRegistry } from "../src/DocumentRegistry.sol";

/// @notice Deploys DocumentRegistry and logs its address.
/// @dev Run against a local Anvil node:
///      forge script script/Deploy.s.sol --rpc-url http://localhost:8545 \
///        --broadcast --private-key $PRIVATE_KEY
contract DeployScript is Script {
    function run() external returns (DocumentRegistry registry) {
        vm.startBroadcast();
        registry = new DocumentRegistry();
        vm.stopBroadcast();

        console.log("DocumentRegistry deployed at:", address(registry));
    }
}
