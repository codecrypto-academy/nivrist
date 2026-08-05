// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { Euro } from "../src/Euro.sol";

/// @notice Despliega solo el token EUR (con 10M al deployer).
/// @dev forge script script/DeployEuro.s.sol --rpc-url $RPC --broadcast --private-key $PK
contract DeployEuro is Script {
    function run() external returns (Euro eur) {
        vm.startBroadcast();
        eur = new Euro();
        vm.stopBroadcast();
        console.log("EUR=%s", address(eur));
    }
}
