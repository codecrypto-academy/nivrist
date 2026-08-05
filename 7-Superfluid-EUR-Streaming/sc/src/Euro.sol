// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Burnable } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Euro (EUR)
/// @notice ERC-20 stablecoin used as the underlying token for the Superfluid Super Token (EURx).
///         Se envuelve (upgrade) a EURx para hacer streaming; se desenvuelve (downgrade) de vuelta.
/// @dev Supply inicial de 10,000,000 EUR al deployer. mint/burn restringidos al owner.
contract Euro is ERC20, ERC20Burnable, Ownable {
    uint256 public constant INITIAL_SUPPLY = 10_000_000 ether; // 10M, 18 decimales

    event Minted(address indexed to, uint256 amount);

    constructor() ERC20("Euro", "EUR") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

    /// @notice Acuña nuevos EUR. Solo el owner.
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Euro: mint to zero");
        require(amount > 0, "Euro: zero amount");
        _mint(to, amount);
        emit Minted(to, amount);
    }
}
