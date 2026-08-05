// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { AbstractModule } from "../AbstractModule.sol";

/// @title MaxHoldersCompliance — limita el número de holders con balance > 0.
/// @dev Mantiene el conteo vía hooks (post-update): si el balance de `to` tras la operación es
///      exactamente `amount`, antes era 0 → nuevo holder (+1); si `from` queda en 0 → -1.
contract MaxHoldersCompliance is AbstractModule {
    uint256 public maxHolders;
    uint256 public holderCount;

    event MaxHoldersUpdated(uint256 maxHolders);

    constructor(address initialOwner, uint256 _maxHolders) AbstractModule(initialOwner) {
        maxHolders = _maxHolders;
    }

    function setMaxHolders(uint256 _maxHolders) external onlyOwner {
        maxHolders = _maxHolders;
        emit MaxHoldersUpdated(_maxHolders);
    }

    function canTransfer(address, address to, uint256) external view override returns (bool) {
        if (IERC20(token).balanceOf(to) > 0) return true; // ya es holder, no cambia el conteo
        return holderCount < maxHolders; // nuevo holder → debe caber
    }

    function created(address to, uint256 amount) external override onlyCompliance {
        if (IERC20(token).balanceOf(to) == amount) holderCount += 1;
    }

    function transferred(address from, address to, uint256 amount)
        external
        override
        onlyCompliance
    {
        if (IERC20(token).balanceOf(to) == amount) holderCount += 1; // to era 0 antes
        if (IERC20(token).balanceOf(from) == 0) holderCount -= 1; // from quedó en 0
    }

    function destroyed(address from, uint256) external override onlyCompliance {
        if (IERC20(token).balanceOf(from) == 0 && holderCount > 0) holderCount -= 1;
    }
}
