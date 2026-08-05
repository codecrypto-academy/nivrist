// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IIdentityRegistry — registro de identidades (estilo ERC-3643, simplificado)
/// @notice Vincula una wallet a una identidad on-chain con país y claims verificados por
///         trusted issuers. El token consulta `isVerified` antes de permitir holdings.
interface IIdentityRegistry {
    /// @notice ¿La wallet tiene identidad registrada y todos los claims requeridos válidos?
    function isVerified(address user) external view returns (bool);

    /// @notice Código de país (ISO numérico) del usuario, o 0 si no registrado.
    function investorCountry(address user) external view returns (uint16);

    /// @notice ¿La wallet tiene una identidad registrada?
    function contains(address user) external view returns (bool);
}
