// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title TrustedIssuersRegistry — registro de emisores de claims de confianza (ERC-3643 / T-REX)
/// @notice Contrato dedicado (separado del IdentityRegistry, como en T-REX real) que declara qué
///         issuers son de confianza y para qué claim topics. El IdentityRegistry lo consulta en
///         `isVerified`: un claim solo cuenta si su issuer está aquí y cubre ese topic.
contract TrustedIssuersRegistry is Ownable {
    struct TrustedIssuer {
        bool exists;
        uint256[] topics;
    }

    mapping(address => TrustedIssuer) private _issuers;
    address[] private _issuerList;
    // topic => issuer => confiable para ese topic
    mapping(uint256 => mapping(address => bool)) public isTrustedIssuerForTopic;

    event TrustedIssuerAdded(address indexed issuer, uint256[] topics);
    event TrustedIssuerRemoved(address indexed issuer);
    event TrustedIssuerTopicsUpdated(address indexed issuer, uint256[] topics);

    constructor(address initialOwner) Ownable(initialOwner) { }

    /// @notice Registra un issuer de confianza para el conjunto de topics indicado.
    function addTrustedIssuer(address issuer, uint256[] calldata topics) external onlyOwner {
        require(issuer != address(0), "TIR: zero issuer");
        require(!_issuers[issuer].exists, "TIR: exists");
        require(topics.length > 0, "TIR: no topics");
        _issuers[issuer] = TrustedIssuer({ exists: true, topics: topics });
        _issuerList.push(issuer);
        for (uint256 i = 0; i < topics.length; i++) {
            isTrustedIssuerForTopic[topics[i]][issuer] = true;
        }
        emit TrustedIssuerAdded(issuer, topics);
    }

    /// @notice Elimina un issuer y todos sus topics.
    function removeTrustedIssuer(address issuer) external onlyOwner {
        require(_issuers[issuer].exists, "TIR: not found");
        uint256[] memory topics = _issuers[issuer].topics;
        for (uint256 i = 0; i < topics.length; i++) {
            isTrustedIssuerForTopic[topics[i]][issuer] = false;
        }
        delete _issuers[issuer];

        uint256 len = _issuerList.length;
        for (uint256 i = 0; i < len; i++) {
            if (_issuerList[i] == issuer) {
                _issuerList[i] = _issuerList[len - 1];
                _issuerList.pop();
                break;
            }
        }
        emit TrustedIssuerRemoved(issuer);
    }

    /// @notice Reemplaza el conjunto de topics de un issuer ya registrado.
    function updateIssuerTopics(address issuer, uint256[] calldata topics) external onlyOwner {
        require(_issuers[issuer].exists, "TIR: not found");
        require(topics.length > 0, "TIR: no topics");
        uint256[] memory old = _issuers[issuer].topics;
        for (uint256 i = 0; i < old.length; i++) {
            isTrustedIssuerForTopic[old[i]][issuer] = false;
        }
        _issuers[issuer].topics = topics;
        for (uint256 i = 0; i < topics.length; i++) {
            isTrustedIssuerForTopic[topics[i]][issuer] = true;
        }
        emit TrustedIssuerTopicsUpdated(issuer, topics);
    }

    // ---- lecturas ----
    function isTrustedIssuer(address issuer) external view returns (bool) {
        return _issuers[issuer].exists;
    }

    function issuerTopics(address issuer) external view returns (uint256[] memory) {
        return _issuers[issuer].topics;
    }

    function getTrustedIssuers() external view returns (address[] memory) {
        return _issuerList;
    }

    function count() external view returns (uint256) {
        return _issuerList.length;
    }
}
