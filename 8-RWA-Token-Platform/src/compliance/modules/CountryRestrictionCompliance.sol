// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { AbstractModule } from "../AbstractModule.sol";

/// @title CountryRestrictionCompliance — restringe transferencias por país (tipo sanciones).
/// @dev Asigna país (código ISO numérico) a cada usuario. Un país bloqueado nunca pasa; si hay
///      lista de permitidos, ambos deben estar en ella.
contract CountryRestrictionCompliance is AbstractModule {
    mapping(address => uint16) public userCountry;
    mapping(uint16 => bool) public allowedCountry;
    mapping(uint16 => bool) public blockedCountry;
    bool public useAllowList; // si true, exige que ambos países estén permitidos

    event UserCountrySet(address indexed user, uint16 country);
    event CountryAllowed(uint16 indexed country, bool status);
    event CountryBlocked(uint16 indexed country, bool status);

    constructor(address initialOwner) AbstractModule(initialOwner) { }

    function setUserCountry(address user, uint16 country) external onlyOwner {
        userCountry[user] = country;
        emit UserCountrySet(user, country);
    }

    function setAllowedCountry(uint16 country, bool status) external onlyOwner {
        allowedCountry[country] = status;
        useAllowList = true;
        emit CountryAllowed(country, status);
    }

    function setBlockedCountry(uint16 country, bool status) external onlyOwner {
        blockedCountry[country] = status;
        emit CountryBlocked(country, status);
    }

    function canTransfer(address from, address to, uint256) external view override returns (bool) {
        uint16 cFrom = userCountry[from];
        uint16 cTo = userCountry[to];
        if (blockedCountry[cFrom] || blockedCountry[cTo]) return false;
        if (useAllowList && (!allowedCountry[cFrom] || !allowedCountry[cTo])) return false;
        return true;
    }
}
