// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AppStorage, CartItem, Invoice, Product } from "./Types.sol";
import { ProductLib } from "./ProductLib.sol";
import { CustomerLib } from "./CustomerLib.sol";

/// @notice Invoice creation from a cart, and lookups, over AppStorage.
library InvoiceLib {
    using ProductLib for AppStorage;
    using CustomerLib for AppStorage;

    event InvoiceCreated(
        uint256 indexed invoiceId,
        uint256 indexed companyId,
        address indexed customer,
        uint256 totalAmount
    );

    /// @dev Builds an invoice from the customer's cart items belonging to `companyId`.
    ///      Snapshots the line items, reserves (decrements) stock, and removes those items
    ///      from the cart. Items from other companies stay in the cart.
    function createInvoice(AppStorage storage s, address customer, uint256 companyId)
        internal
        returns (uint256 invoiceId)
    {
        require(s.companies[companyId].companyId != 0, "Invoice: company not found");

        CartItem[] storage cart = s.carts[customer];
        uint256 total = 0;
        uint256 matched = 0;

        // First pass: total + stock for this company's items.
        for (uint256 i = 0; i < cart.length; i++) {
            Product storage p = s.products[cart[i].productId];
            if (p.companyId == companyId) {
                total += p.price * cart[i].quantity;
                matched++;
            }
        }
        require(matched > 0, "Invoice: no items for company");

        invoiceId = ++s.invoiceCount;
        s.invoices[invoiceId] = Invoice({
            invoiceId: invoiceId,
            companyId: companyId,
            customerAddress: customer,
            totalAmount: total,
            timestamp: block.timestamp,
            isPaid: false,
            paymentTxHash: bytes32(0)
        });

        // Second pass: snapshot line items, reserve stock, and rebuild the cart without them.
        CartItem[] memory remaining = new CartItem[](cart.length - matched);
        uint256 r = 0;
        for (uint256 i = 0; i < cart.length; i++) {
            if (s.products[cart[i].productId].companyId == companyId) {
                s.invoiceItems[invoiceId].push(cart[i]);
                s.decreaseStock(cart[i].productId, cart[i].quantity);
            } else {
                remaining[r++] = cart[i];
            }
        }
        delete s.carts[customer];
        for (uint256 i = 0; i < remaining.length; i++) {
            s.carts[customer].push(remaining[i]);
        }

        s.customerInvoices[customer].push(invoiceId);
        s.companyInvoices[companyId].push(invoiceId);
        s.touch(customer);

        emit InvoiceCreated(invoiceId, companyId, customer, total);
    }

    function getInvoice(AppStorage storage s, uint256 invoiceId)
        internal
        view
        returns (Invoice memory)
    {
        require(s.invoices[invoiceId].invoiceId != 0, "Invoice: not found");
        return s.invoices[invoiceId];
    }

    function getInvoiceItems(AppStorage storage s, uint256 invoiceId)
        internal
        view
        returns (CartItem[] memory)
    {
        return s.invoiceItems[invoiceId];
    }
}
