// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Token } from "./Token.sol";

/// @title RealEstateToken — token de propiedad inmobiliaria con reparto de rentas (dividendos).
/// @notice Extiende el security token base: el agente deposita ETH (rentas) y los holders
///         reclaman su parte proporcional al balance. Patrón de "dividends per share" acumulado
///         para repartir de forma justa aunque los balances cambien.
contract RealEstateToken is Token {
    uint256 private constant MAGNITUDE = 2 ** 128;

    uint256 public magnifiedDividendPerShare;
    mapping(address => int256) private _magnifiedCorrections;
    mapping(address => uint256) public withdrawnDividends;

    string public propertyRef; // referencia del inmueble (catastro/URI)

    event DividendsDeposited(address indexed from, uint256 amount);
    event DividendClaimed(address indexed holder, uint256 amount);

    /// @notice Metadatos del inmueble (llamar tras `init`).
    function setPropertyRef(string calldata ref) external onlyRole(DEFAULT_ADMIN_ROLE) {
        propertyRef = ref;
    }

    /// @notice Deposita rentas (ETH) a repartir entre los holders.
    function depositDividends() external payable onlyRole(AGENT_ROLE) {
        require(totalSupply() > 0, "RE: no supply");
        require(msg.value > 0, "RE: zero");
        magnifiedDividendPerShare += (msg.value * MAGNITUDE) / totalSupply();
        emit DividendsDeposited(msg.sender, msg.value);
    }

    /// @notice Dividendos acumulados y aún no reclamados por `account`.
    function withdrawableDividendOf(address account) public view returns (uint256) {
        return _accumulativeDividendOf(account) - withdrawnDividends[account];
    }

    function _accumulativeDividendOf(address account) internal view returns (uint256) {
        int256 raw =
            int256(magnifiedDividendPerShare * balanceOf(account)) + _magnifiedCorrections[account];
        return uint256(raw < 0 ? int256(0) : raw) / MAGNITUDE;
    }

    /// @notice Reclama tus rentas acumuladas.
    function claimDividends() external {
        uint256 amount = withdrawableDividendOf(msg.sender);
        require(amount > 0, "RE: nothing to claim");
        withdrawnDividends[msg.sender] += amount;
        (bool ok,) = msg.sender.call{ value: amount }("");
        require(ok, "RE: transfer failed");
        emit DividendClaimed(msg.sender, amount);
    }

    /// @dev Ajusta las correcciones para que el reparto sea justo al cambiar balances.
    function _update(address from, address to, uint256 amount) internal override {
        super._update(from, to, amount);
        int256 magCorrection = int256(magnifiedDividendPerShare * amount);
        if (from != address(0)) _magnifiedCorrections[from] += magCorrection;
        if (to != address(0)) _magnifiedCorrections[to] -= magCorrection;
    }
}
