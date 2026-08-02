// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { EuroToken } from "../src/EuroToken.sol";

/// @notice Deploys EuroToken and mints an initial 1,000,000 EURT to the deployer.
/// @dev  forge script script/DeployEuroToken.s.sol --rpc-url http://localhost:8545 \
///         --broadcast --private-key $PK
contract DeployEuroToken is Script {
    function run() external returns (EuroToken token) {
        vm.startBroadcast();
        token = new EuroToken();
        token.mint(msg.sender, 1_000_000e6); // 1,000,000 EURT (6 decimals)
        vm.stopBroadcast();

        console.log("EuroToken:", address(token));
        console.log("Owner/minter:", msg.sender);
        console.log("Initial supply (EURT):", token.totalSupply() / 1e6);
    }
}
