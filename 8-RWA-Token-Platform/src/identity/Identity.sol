// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Identity — identidad on-chain por inversor (estilo ONCHAINID, simplificado)
/// @notice Contiene los claims (KYC, acreditación, país…) de un inversor. Cloneable vía
///         EIP-1167: sin lógica en el constructor, se inicializa con `init`.
/// @dev Un claim por topic (simplificación). Un claim lo añade el owner de la identidad o el
///      propio issuer del claim; la validez frente a trusted issuers la evalúa el registry.
contract Identity {
    struct Claim {
        uint256 topic;
        address issuer;
        bytes data;
        bool exists;
    }

    address public owner; // management key
    bool private _initialized;
    mapping(uint256 => Claim) private _claims; // topic => claim

    event Initialized(address indexed owner);
    event ClaimAdded(uint256 indexed topic, address indexed issuer);
    event ClaimRemoved(uint256 indexed topic);

    modifier onlyOwner() {
        require(msg.sender == owner, "Identity: not owner");
        _;
    }

    /// @notice Inicializa el clon con su owner (la wallet del inversor o su controlador).
    function init(address owner_) external {
        require(!_initialized, "Identity: initialized");
        require(owner_ != address(0), "Identity: zero owner");
        _initialized = true;
        owner = owner_;
        emit Initialized(owner_);
    }

    /// @notice Añade/actualiza el claim de un topic. Lo puede llamar el owner o el issuer.
    function addClaim(uint256 topic, address issuer, bytes calldata data) external {
        require(msg.sender == owner || msg.sender == issuer, "Identity: not authorized");
        require(issuer != address(0), "Identity: zero issuer");
        _claims[topic] = Claim({ topic: topic, issuer: issuer, data: data, exists: true });
        emit ClaimAdded(topic, issuer);
    }

    function removeClaim(uint256 topic) external onlyOwner {
        delete _claims[topic];
        emit ClaimRemoved(topic);
    }

    function getClaim(uint256 topic)
        external
        view
        returns (address issuer, bytes memory data, bool exists)
    {
        Claim storage c = _claims[topic];
        return (c.issuer, c.data, c.exists);
    }

    function hasClaim(uint256 topic) external view returns (bool) {
        return _claims[topic].exists;
    }

    function claimIssuer(uint256 topic) external view returns (address) {
        return _claims[topic].issuer;
    }
}
