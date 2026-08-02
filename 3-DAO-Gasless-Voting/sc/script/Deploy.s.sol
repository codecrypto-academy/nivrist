// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { MinimalForwarder } from "../src/MinimalForwarder.sol";
import { DAO } from "../src/DAO.sol";

/// @notice Deploys MinimalForwarder + DAO and logs their addresses.
/// @dev Works for both local (Anvil) and testnet — only the --rpc-url / --private-key
///      flags change. Tunables come from the environment (with demo-friendly defaults):
///        MIN_VOTE_BALANCE  minimum stake (wei) required to vote   [default 0.01 ether]
///        EXECUTION_DELAY   safety delay (seconds) after deadline  [default 60]
///
/// Local:
///   forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast \
///     --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
/// Testnet (e.g. Sepolia):
///   forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast \
///     --private-key $DEPLOYER_KEY --verify --etherscan-api-key $ETHERSCAN_API_KEY
contract DeployScript is Script {
    function run() external returns (MinimalForwarder forwarder, DAO dao) {
        uint256 minVoteBalance = vm.envOr("MIN_VOTE_BALANCE", uint256(0.01 ether));
        uint256 executionDelay = vm.envOr("EXECUTION_DELAY", uint256(60));

        vm.startBroadcast();
        forwarder = new MinimalForwarder();
        dao = new DAO(address(forwarder), minVoteBalance, executionDelay);
        vm.stopBroadcast();

        console.log("MinimalForwarder:", address(forwarder));
        console.log("DAO:            ", address(dao));
        console.log("minVoteBalance: ", minVoteBalance);
        console.log("executionDelay: ", executionDelay);
    }
}
