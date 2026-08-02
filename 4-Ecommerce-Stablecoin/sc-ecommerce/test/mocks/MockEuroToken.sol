// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal 6-decimal ERC20 with open mint, standing in for EuroToken in tests.
contract MockEuroToken is ERC20 {
    constructor() ERC20("EuroToken", "EURT") { }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
