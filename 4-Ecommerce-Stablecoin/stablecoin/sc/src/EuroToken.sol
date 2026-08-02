// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title EuroToken (EURT)
/// @notice A euro-pegged stablecoin: 1 EURT = 1 EUR. Uses 6 decimals so the smallest
///         unit is one euro-cent's hundredth (matches product prices stored in 6-dec units).
/// @dev Mintable only by the owner (the backend that mints after a confirmed Stripe payment).
contract EuroToken is ERC20, Ownable {
    event Minted(address indexed to, uint256 amount);

    constructor() ERC20("EuroToken", "EURT") Ownable(msg.sender) { }

    /// @notice EURT uses 6 decimals (like most fiat-backed stablecoins).
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Create `amount` new tokens and credit them to `to`. Owner-only.
    /// @dev Called by the purchase backend after Stripe confirms a payment.
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "EuroToken: mint to zero address");
        require(amount > 0, "EuroToken: zero amount");
        _mint(to, amount);
        emit Minted(to, amount);
    }
}
