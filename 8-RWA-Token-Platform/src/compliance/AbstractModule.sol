// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ICompliance } from "../interfaces/ICompliance.sol";

/// @title AbstractModule — base para módulos de compliance
/// @notice Implementa `ICompliance` con hooks vacíos por defecto; cada módulo sobreescribe
///         `canTransfer` y los hooks que necesite. Los hooks de estado solo los puede llamar
///         el compliance vinculado (el ComplianceAggregator).
abstract contract AbstractModule is ICompliance, Ownable {
    /// @notice El ComplianceAggregator (o token) autorizado a disparar los hooks de estado.
    address public complianceContract;

    /// @notice El token vinculado (para módulos que leen balances/holdings).
    address public token;

    event ComplianceBound(address indexed compliance);
    event TokenBound(address indexed token);

    modifier onlyCompliance() {
        require(msg.sender == complianceContract, "Module: not authorized");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) { }

    /// @notice Vincula el agregador que llamará a los hooks (equivale a addAuthorizedCaller).
    function setComplianceContract(address compliance) external onlyOwner {
        complianceContract = compliance;
        emit ComplianceBound(compliance);
    }

    function setToken(address token_) external onlyOwner {
        token = token_;
        emit TokenBound(token_);
    }

    // Hooks vacíos por defecto; los módulos con estado los sobreescriben.
    function transferred(address, address, uint256) external virtual override onlyCompliance { }
    function created(address, uint256) external virtual override onlyCompliance { }
    function destroyed(address, uint256) external virtual override onlyCompliance { }

    // canTransfer lo implementa cada módulo.
    function canTransfer(address from, address to, uint256 amount)
        external
        view
        virtual
        override
        returns (bool);
}
