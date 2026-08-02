// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AppStorage, CartItem, Product } from "./Types.sol";

/// @notice Shopping-cart management over AppStorage.
library CartLib {
    event AddedToCart(address indexed customer, uint256 indexed productId, uint256 quantity);
    event CartCleared(address indexed customer);

    /// @dev Adds `quantity` of `productId` to the customer's cart, merging duplicates.
    function addToCart(
        AppStorage storage s,
        address customer,
        uint256 productId,
        uint256 quantity
    ) internal {
        Product storage p = s.products[productId];
        require(p.productId != 0, "Cart: product not found");
        require(p.isActive, "Cart: product inactive");
        require(quantity > 0, "Cart: quantity must be > 0");

        CartItem[] storage items = s.carts[customer];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i].productId == productId) {
                items[i].quantity += quantity;
                emit AddedToCart(customer, productId, quantity);
                return;
            }
        }
        items.push(CartItem({ productId: productId, quantity: quantity }));
        emit AddedToCart(customer, productId, quantity);
    }

    /// @dev Sets an item's quantity (0 removes it).
    function updateQuantity(
        AppStorage storage s,
        address customer,
        uint256 productId,
        uint256 quantity
    ) internal {
        CartItem[] storage items = s.carts[customer];
        for (uint256 i = 0; i < items.length; i++) {
            if (items[i].productId == productId) {
                if (quantity == 0) {
                    items[i] = items[items.length - 1];
                    items.pop();
                } else {
                    items[i].quantity = quantity;
                }
                return;
            }
        }
        revert("Cart: item not found");
    }

    function getCart(AppStorage storage s, address customer)
        internal
        view
        returns (CartItem[] memory)
    {
        return s.carts[customer];
    }

    function clearCart(AppStorage storage s, address customer) internal {
        delete s.carts[customer];
        emit CartCleared(customer);
    }

    /// @dev Total price of the whole cart, in EURT units.
    function cartTotal(AppStorage storage s, address customer) internal view returns (uint256 total) {
        CartItem[] storage items = s.carts[customer];
        for (uint256 i = 0; i < items.length; i++) {
            total += s.products[items[i].productId].price * items[i].quantity;
        }
    }
}
