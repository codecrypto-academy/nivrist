// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { Escrow } from "../src/Escrow.sol";
import { TestToken } from "../src/TestToken.sol";

/// @notice Deploys Escrow + two test tokens, whitelists them, and mints 1000 of each token
///         to Anvil's first three accounts. Addresses are logged for deploy.sh to capture.
contract DeployScript is Script {
    address constant ACC0 = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant ACC1 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address constant ACC2 = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC;

    function run() external returns (Escrow escrow, TestToken tokenA, TestToken tokenB) {
        vm.startBroadcast();

        escrow = new Escrow();
        tokenA = new TestToken("Token A", "TKA");
        tokenB = new TestToken("Token B", "TKB");

        escrow.addToken(address(tokenA));
        escrow.addToken(address(tokenB));

        address[3] memory accts = [ACC0, ACC1, ACC2];
        for (uint256 i = 0; i < accts.length; i++) {
            tokenA.mint(accts[i], 1000e18);
            tokenB.mint(accts[i], 1000e18);
        }

        vm.stopBroadcast();

        console.log("ESCROW=%s", address(escrow));
        console.log("TOKEN_A=%s", address(tokenA));
        console.log("TOKEN_B=%s", address(tokenB));
    }
}
