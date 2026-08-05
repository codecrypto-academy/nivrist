// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Token } from "../token/Token.sol";
import { ComplianceAggregator } from "../compliance/ComplianceAggregator.sol";
import { MaxBalanceCompliance } from "../compliance/modules/MaxBalanceCompliance.sol";
import { MaxHoldersCompliance } from "../compliance/modules/MaxHoldersCompliance.sol";
import { LockupCompliance } from "../compliance/modules/LockupCompliance.sol";

/// @title TokenCloneFactory — despliega security tokens (clones EIP-1167) con su compliance.
/// @notice `createTokenWithCompliance` orquesta todo el flujo: clona el token, crea su
///         ComplianceAggregator, despliega los módulos pedidos, los cablea y transfiere la
///         propiedad del compliance al admin del token.
contract TokenCloneFactory {
    /// @notice Implementación base de Token para clonar (para tokens genéricos).
    address public immutable tokenImplementation;

    struct Deployment {
        address token;
        address aggregator;
        address admin;
    }

    Deployment[] private _deployments;
    mapping(address => bool) public isToken;

    event TokenCreated(address indexed token, address indexed aggregator, address indexed admin);

    constructor() {
        tokenImplementation = address(new Token());
    }

    /// @notice Crea un token (clon de `implementation`) con un aggregator vacío.
    function createToken(
        address implementation,
        string memory name,
        string memory symbol,
        uint8 decimals,
        address admin,
        address identityRegistry
    ) public returns (address token, address aggregator) {
        require(implementation != address(0), "Factory: zero impl");

        ComplianceAggregator agg = new ComplianceAggregator(address(this));
        token = Clones.clone(implementation);
        Token(token).init(name, symbol, decimals, admin, identityRegistry, address(agg));
        agg.bindToken(token);
        agg.transferOwnership(admin);
        aggregator = address(agg);

        _deployments.push(Deployment(token, aggregator, admin));
        isToken[token] = true;
        emit TokenCreated(token, aggregator, admin);
    }

    /// @notice Crea un token y configura compliance en un solo paso.
    /// @param maxBalance  0 = sin módulo de balance máximo.
    /// @param maxHolders  0 = sin módulo de máximo de holders.
    /// @param lockPeriod  0 = sin lock-up por defecto.
    function createTokenWithCompliance(
        address implementation,
        string memory name,
        string memory symbol,
        uint8 decimals,
        address admin,
        address identityRegistry,
        uint256 maxBalance,
        uint256 maxHolders,
        uint256 lockPeriod
    ) external returns (address token, address aggregator) {
        require(implementation != address(0), "Factory: zero impl");

        ComplianceAggregator agg = new ComplianceAggregator(address(this));
        token = Clones.clone(implementation);
        Token(token).init(name, symbol, decimals, admin, identityRegistry, address(agg));
        agg.bindToken(token);

        if (maxBalance > 0) {
            MaxBalanceCompliance m = new MaxBalanceCompliance(address(this), maxBalance);
            _wire(agg, address(m), token, admin);
        }
        if (maxHolders > 0) {
            MaxHoldersCompliance m = new MaxHoldersCompliance(address(this), maxHolders);
            _wire(agg, address(m), token, admin);
        }
        if (lockPeriod > 0) {
            LockupCompliance m = new LockupCompliance(address(this), lockPeriod);
            _wire(agg, address(m), token, admin);
        }

        agg.transferOwnership(admin);
        aggregator = address(agg);

        _deployments.push(Deployment(token, aggregator, admin));
        isToken[token] = true;
        emit TokenCreated(token, aggregator, admin);
    }

    /// @dev Cablea un módulo: le fija token y aggregator, lo añade y le pasa la propiedad al admin.
    function _wire(ComplianceAggregator agg, address module, address token, address admin)
        internal
    {
        AbstractLike(module).setToken(token);
        AbstractLike(module).setComplianceContract(address(agg));
        agg.addModule(module);
        Ownable(module).transferOwnership(admin);
    }

    function deployments() external view returns (Deployment[] memory) {
        return _deployments;
    }

    function count() external view returns (uint256) {
        return _deployments.length;
    }
}

/// @dev Vista mínima para cablear cualquier módulo que herede de AbstractModule.
interface AbstractLike {
    function setToken(address) external;
    function setComplianceContract(address) external;
}
