// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AbstractModule } from "../AbstractModule.sol";

/// @title MaxBalanceCompliance — ningún holder puede superar `maxBalance`.
contract MaxBalanceCompliance is AbstractModule {
    uint256 public maxBalance;

    event MaxBalanceUpdated(uint256 maxBalance);

    constructor(address initialOwner, uint256 _maxBalance) AbstractModule(initialOwner) {
        maxBalance = _maxBalance;
    }

    function setMaxBalance(uint256 _maxBalance) external onlyOwner {
        maxBalance = _maxBalance;
        emit MaxBalanceUpdated(_maxBalance);
    }

    function canTransfer(address, address to, uint256 amount)
        external
        view
        override
        returns (bool)
    {
        return IERC20(token).balanceOf(to) + amount <= maxBalance;
    }
}
