// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AbstractModule } from "../AbstractModule.sol";

/// @title LockupCompliance — módulo CUSTOM: bloquea la venta de tokens hasta una fecha.
/// @notice Cada holder tiene un `unlockTime`; no puede ENVIAR tokens antes de esa fecha (útil
///         para vesting/cliffs de equity o lock-ups regulatorios). Recibir siempre se permite;
///         al recibir por primera vez se le puede aplicar el lock-up por defecto.
contract LockupCompliance is AbstractModule {
    uint256 public defaultLockup; // segundos de lock-up al primer ingreso (0 = sin lock)
    mapping(address => uint256) public unlockTime; // 0 = sin lock

    event DefaultLockupUpdated(uint256 seconds_);
    event UnlockTimeSet(address indexed user, uint256 unlockTime);

    constructor(address initialOwner, uint256 _defaultLockup) AbstractModule(initialOwner) {
        defaultLockup = _defaultLockup;
    }

    function setDefaultLockup(uint256 seconds_) external onlyOwner {
        defaultLockup = seconds_;
        emit DefaultLockupUpdated(seconds_);
    }

    function setUnlockTime(address user, uint256 ts) external onlyOwner {
        unlockTime[user] = ts;
        emit UnlockTimeSet(user, ts);
    }

    function isLocked(address user) public view returns (bool) {
        return block.timestamp < unlockTime[user];
    }

    function canTransfer(address from, address, uint256) external view override returns (bool) {
        return !isLocked(from); // el emisor no debe estar bloqueado
    }

    /// @dev Al recibir por primera vez (mint o transfer), aplica el lock-up por defecto.
    function _applyDefault(address to) internal {
        if (defaultLockup > 0 && unlockTime[to] == 0) {
            unlockTime[to] = block.timestamp + defaultLockup;
            emit UnlockTimeSet(to, unlockTime[to]);
        }
    }

    function created(address to, uint256) external override onlyCompliance {
        _applyDefault(to);
    }

    function transferred(address, address to, uint256) external override onlyCompliance {
        _applyDefault(to);
    }
}
