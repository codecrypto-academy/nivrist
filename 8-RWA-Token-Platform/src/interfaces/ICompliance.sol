// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICompliance — interfaz de un módulo (o agregador) de compliance (estilo ERC-3643)
/// @notice `canTransfer` es la comprobación (view); `transferred`/`created`/`destroyed` son
///         hooks de estado que el token/agregador dispara tras cada operación para que el
///         módulo actualice sus contadores (transfers diarios, holders, etc.).
interface ICompliance {
    /// @return true si la transferencia cumple la regla del módulo.
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);

    /// @notice Hook tras una transferencia exitosa.
    function transferred(address from, address to, uint256 amount) external;

    /// @notice Hook tras un mint.
    function created(address to, uint256 amount) external;

    /// @notice Hook tras un burn.
    function destroyed(address from, uint256 amount) external;
}
