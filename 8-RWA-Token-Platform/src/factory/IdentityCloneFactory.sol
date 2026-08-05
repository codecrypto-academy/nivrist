// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { Identity } from "../identity/Identity.sol";

/// @title IdentityCloneFactory — despliega identidades como clones EIP-1167 (gas barato)
/// @notice Cada inversor obtiene su propia Identity (clon de una implementación única).
contract IdentityCloneFactory {
    address public immutable implementation;

    address[] private _identities;
    mapping(address => address) public identityOfOwner; // owner => Identity

    event IdentityCreated(address indexed owner, address indexed identity);

    constructor() {
        implementation = address(new Identity());
    }

    /// @notice Crea y inicializa una Identity para `owner`.
    function createIdentity(address owner) external returns (address identity) {
        require(identityOfOwner[owner] == address(0), "Factory: identity exists");
        identity = Clones.clone(implementation);
        Identity(identity).init(owner);
        identityOfOwner[owner] = identity;
        _identities.push(identity);
        emit IdentityCreated(owner, identity);
    }

    function allIdentities() external view returns (address[] memory) {
        return _identities;
    }

    function count() external view returns (uint256) {
        return _identities.length;
    }
}
