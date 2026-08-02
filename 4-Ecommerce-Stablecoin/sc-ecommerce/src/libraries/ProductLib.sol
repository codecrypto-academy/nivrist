// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AppStorage, Product } from "./Types.sol";
import { CompanyLib } from "./CompanyLib.sol";

/// @notice Product CRUD with stock control over AppStorage.
library ProductLib {
    using CompanyLib for AppStorage;

    event ProductAdded(uint256 indexed productId, uint256 indexed companyId, uint256 price);
    event ProductUpdated(uint256 indexed productId, uint256 price, uint256 stock, bool isActive);

    function addProduct(
        AppStorage storage s,
        address caller,
        uint256 companyId,
        string memory name,
        string memory description,
        uint256 price,
        uint256 stock,
        string memory ipfsImageHash
    ) internal returns (uint256 productId) {
        s.requireOwner(companyId, caller);
        require(bytes(name).length > 0, "Product: name required");
        require(price > 0, "Product: price must be > 0");

        productId = ++s.productCount;
        s.products[productId] = Product({
            productId: productId,
            companyId: companyId,
            name: name,
            description: description,
            price: price,
            stock: stock,
            ipfsImageHash: ipfsImageHash,
            isActive: true
        });
        s.productIds.push(productId);

        emit ProductAdded(productId, companyId, price);
    }

    function updateProduct(
        AppStorage storage s,
        address caller,
        uint256 productId,
        uint256 price,
        uint256 stock,
        bool isActive
    ) internal {
        Product storage p = s.products[productId];
        require(p.productId != 0, "Product: not found");
        s.requireOwner(p.companyId, caller);
        require(price > 0, "Product: price must be > 0");

        p.price = price;
        p.stock = stock;
        p.isActive = isActive;

        emit ProductUpdated(productId, price, stock, isActive);
    }

    function getProduct(AppStorage storage s, uint256 productId)
        internal
        view
        returns (Product memory)
    {
        require(s.products[productId].productId != 0, "Product: not found");
        return s.products[productId];
    }

    function getAllProducts(AppStorage storage s) internal view returns (Product[] memory list) {
        list = new Product[](s.productIds.length);
        for (uint256 i = 0; i < s.productIds.length; i++) {
            list[i] = s.products[s.productIds[i]];
        }
    }

    /// @dev Reduce stock for a sale; reverts if insufficient or product inactive.
    function decreaseStock(AppStorage storage s, uint256 productId, uint256 quantity) internal {
        Product storage p = s.products[productId];
        require(p.productId != 0, "Product: not found");
        require(p.isActive, "Product: inactive");
        require(p.stock >= quantity, "Product: insufficient stock");
        p.stock -= quantity;
    }
}
