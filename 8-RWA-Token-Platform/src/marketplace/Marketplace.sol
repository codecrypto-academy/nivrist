// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Marketplace — mercado secundario simple para security tokens ERC-3643.
/// @notice Un holder publica una orden de venta (cantidad + precio en ETH) tras aprobar al
///         marketplace. Un comprador paga el ETH exacto y recibe los tokens vía `transferFrom`,
///         que **pasa por el compliance del token**: el comprador debe estar verificado (KYC),
///         no congelado, el token no en pausa y cumplir todos los módulos. Así el mercado
///         secundario hereda las mismas reglas que el primario.
/// @dev Basado en allowance (no custodia): el vendedor mantiene sus tokens hasta la compra.
contract Marketplace is ReentrancyGuard {
    struct Listing {
        uint256 id;
        address seller;
        address token;
        uint256 amount;
        uint256 price; // precio TOTAL en wei por el lote
        bool active;
    }

    Listing[] private _listings;

    event Listed(
        uint256 indexed id,
        address indexed seller,
        address indexed token,
        uint256 amount,
        uint256 price
    );
    event Bought(uint256 indexed id, address indexed buyer, uint256 price);
    event Cancelled(uint256 indexed id);

    /// @notice Publica una orden de venta. El vendedor debe haber aprobado `amount` a este contrato.
    function list(address token, uint256 amount, uint256 price) external returns (uint256 id) {
        require(token != address(0), "MKT: zero token");
        require(amount > 0, "MKT: zero amount");
        require(price > 0, "MKT: zero price");
        require(IERC20(token).allowance(msg.sender, address(this)) >= amount, "MKT: approve first");
        require(IERC20(token).balanceOf(msg.sender) >= amount, "MKT: insufficient balance");

        id = _listings.length;
        _listings.push(
            Listing({
                id: id, seller: msg.sender, token: token, amount: amount, price: price, active: true
            })
        );
        emit Listed(id, msg.sender, token, amount, price);
    }

    /// @notice Compra un lote. Envía exactamente `price`; recibes los tokens (si cumples compliance).
    function buy(uint256 id) external payable nonReentrant {
        Listing storage l = _listings[id];
        require(l.active, "MKT: inactive");
        require(msg.value == l.price, "MKT: wrong price");
        require(msg.sender != l.seller, "MKT: self buy");

        l.active = false; // efecto antes de interacciones (CEI)

        // mueve los tokens: pasa por el _update del Token → exige comprador verificado, etc.
        bool ok = IERC20(l.token).transferFrom(l.seller, msg.sender, l.amount);
        require(ok, "MKT: transfer failed");

        // paga al vendedor
        (bool paid,) = l.seller.call{ value: msg.value }("");
        require(paid, "MKT: payment failed");

        emit Bought(id, msg.sender, msg.value);
    }

    /// @notice Cancela una orden propia.
    function cancel(uint256 id) external {
        Listing storage l = _listings[id];
        require(l.seller == msg.sender, "MKT: not seller");
        require(l.active, "MKT: inactive");
        l.active = false;
        emit Cancelled(id);
    }

    // ---- lecturas ----
    function getListing(uint256 id) external view returns (Listing memory) {
        return _listings[id];
    }

    function getListings() external view returns (Listing[] memory) {
        return _listings;
    }

    function count() external view returns (uint256) {
        return _listings.length;
    }
}
