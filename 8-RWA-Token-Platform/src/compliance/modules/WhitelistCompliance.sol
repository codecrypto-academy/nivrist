// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AbstractModule } from "../AbstractModule.sol";

/// @title WhitelistCompliance — solo direcciones en whitelist pueden enviar y recibir.
contract WhitelistCompliance is AbstractModule {
    mapping(address => bool) public isWhitelisted;

    event AddressWhitelisted(address indexed account);
    event AddressRemovedFromWhitelist(address indexed account);

    constructor(address initialOwner) AbstractModule(initialOwner) { }

    function addToWhitelist(address account) public onlyOwner {
        isWhitelisted[account] = true;
        emit AddressWhitelisted(account);
    }

    function removeFromWhitelist(address account) external onlyOwner {
        isWhitelisted[account] = false;
        emit AddressRemovedFromWhitelist(account);
    }

    function batchWhitelist(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            addToWhitelist(accounts[i]);
        }
    }

    function canTransfer(address from, address to, uint256) external view override returns (bool) {
        return isWhitelisted[from] && isWhitelisted[to];
    }
}
