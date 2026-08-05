// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AbstractModule } from "../AbstractModule.sol";

/// @title DailyTransferLimitCompliance — límite de tokens enviables por día por usuario.
/// @dev El "día" es `block.timestamp / 1 days`; los acumulados se resetean solos al cambiar de
///      día. Soporta un límite global y overrides por usuario (VIP/Regular/Basic).
contract DailyTransferLimitCompliance is AbstractModule {
    uint256 public dailyLimit;
    mapping(address => uint256) private _customLimit; // 0 = usa el global
    mapping(address => bool) private _hasCustom;
    // user => día => enviado
    mapping(address => mapping(uint256 => uint256)) public dailyTransfers;

    event DailyLimitUpdated(uint256 limit);
    event CustomLimitSet(address indexed user, uint256 limit);

    constructor(address initialOwner, uint256 _dailyLimit) AbstractModule(initialOwner) {
        dailyLimit = _dailyLimit;
    }

    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function setDailyLimit(uint256 _dailyLimit) external onlyOwner {
        dailyLimit = _dailyLimit;
        emit DailyLimitUpdated(_dailyLimit);
    }

    function setCustomLimit(address user, uint256 limit) external onlyOwner {
        _customLimit[user] = limit;
        _hasCustom[user] = true;
        emit CustomLimitSet(user, limit);
    }

    function limitOf(address user) public view returns (uint256) {
        return _hasCustom[user] ? _customLimit[user] : dailyLimit;
    }

    /// @notice Tokens que `user` aún puede enviar hoy.
    function remainingToday(address user) external view returns (uint256) {
        uint256 used = dailyTransfers[user][getCurrentDay()];
        uint256 lim = limitOf(user);
        return used >= lim ? 0 : lim - used;
    }

    function canTransfer(address from, address, uint256 amount)
        external
        view
        override
        returns (bool)
    {
        return dailyTransfers[from][getCurrentDay()] + amount <= limitOf(from);
    }

    function transferred(address from, address, uint256 amount) external override onlyCompliance {
        dailyTransfers[from][getCurrentDay()] += amount;
    }
}
