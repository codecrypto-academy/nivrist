// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Identity } from "./Identity.sol";
import { IIdentityRegistry } from "../interfaces/IIdentityRegistry.sol";

/// @title IdentityRegistry — registro de inversores verificados (ERC-3643 simplificado)
/// @notice Vincula wallet → Identity + país. Un inversor está "verificado" si su Identity
///         tiene todos los claim topics requeridos, cada uno emitido por un trusted issuer.
///         El Token consulta `isVerified(to)` antes de permitir que reciba tokens.
contract IdentityRegistry is IIdentityRegistry, Ownable {
    mapping(address => address) private _identity; // wallet => Identity
    mapping(address => uint16) private _country;
    mapping(address => bool) public isAgent;

    uint256[] public requiredClaimTopics;
    mapping(uint256 => bool) private _isRequiredTopic;
    // topic => issuer => confiable
    mapping(uint256 => mapping(address => bool)) public isTrustedIssuer;

    event IdentityRegistered(address indexed user, address indexed identity, uint16 country);
    event IdentityRemoved(address indexed user);
    event CountryUpdated(address indexed user, uint16 country);
    event AgentSet(address indexed agent, bool status);
    event ClaimTopicAdded(uint256 indexed topic);
    event TrustedIssuerSet(uint256 indexed topic, address indexed issuer, bool status);

    modifier onlyAgent() {
        require(isAgent[msg.sender] || msg.sender == owner(), "IR: not agent");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) { }

    // ---- configuración (owner) ----
    function setAgent(address agent, bool status) external onlyOwner {
        isAgent[agent] = status;
        emit AgentSet(agent, status);
    }

    function addClaimTopic(uint256 topic) external onlyOwner {
        require(!_isRequiredTopic[topic], "IR: topic exists");
        _isRequiredTopic[topic] = true;
        requiredClaimTopics.push(topic);
        emit ClaimTopicAdded(topic);
    }

    function setTrustedIssuer(uint256 topic, address issuer, bool status) external onlyOwner {
        isTrustedIssuer[topic][issuer] = status;
        emit TrustedIssuerSet(topic, issuer, status);
    }

    // ---- registro de identidades (agent) ----
    function registerIdentity(address user, address identity, uint16 country) external onlyAgent {
        require(user != address(0) && identity != address(0), "IR: zero addr");
        _identity[user] = identity;
        _country[user] = country;
        emit IdentityRegistered(user, identity, country);
    }

    function deleteIdentity(address user) external onlyAgent {
        delete _identity[user];
        delete _country[user];
        emit IdentityRemoved(user);
    }

    function updateCountry(address user, uint16 country) external onlyAgent {
        require(_identity[user] != address(0), "IR: not registered");
        _country[user] = country;
        emit CountryUpdated(user, country);
    }

    // ---- lecturas ----
    function identityOf(address user) external view returns (address) {
        return _identity[user];
    }

    function contains(address user) public view returns (bool) {
        return _identity[user] != address(0);
    }

    function investorCountry(address user) external view returns (uint16) {
        return _country[user];
    }

    /// @notice Verificado = registrado + todos los topics requeridos con claim de trusted issuer.
    function isVerified(address user) external view returns (bool) {
        address id = _identity[user];
        if (id == address(0)) return false;
        Identity identity = Identity(id);
        uint256 len = requiredClaimTopics.length;
        for (uint256 i = 0; i < len; i++) {
            uint256 topic = requiredClaimTopics[i];
            if (!identity.hasClaim(topic)) return false;
            if (!isTrustedIssuer[topic][identity.claimIssuer(topic)]) return false;
        }
        return true;
    }
}
