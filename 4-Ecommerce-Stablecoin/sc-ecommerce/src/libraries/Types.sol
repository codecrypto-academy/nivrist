// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Data structures shared by the Ecommerce contract and its libraries.

struct Company {
    uint256 companyId;
    string name;
    address companyAddress; // wallet that receives payments (owner)
    string taxId;
    bool isActive;
}

struct Product {
    uint256 productId;
    uint256 companyId;
    string name;
    string description;
    uint256 price; // in EURT units (6 decimals)
    uint256 stock;
    string ipfsImageHash;
    bool isActive;
}

struct CartItem {
    uint256 productId;
    uint256 quantity;
}

struct Invoice {
    uint256 invoiceId;
    uint256 companyId;
    address customerAddress;
    uint256 totalAmount; // in EURT units (6 decimals)
    uint256 timestamp;
    bool isPaid;
    bytes32 paymentTxHash; // reference set at payment time
}

/// @dev Single shared storage struct (AppStorage pattern). The Ecommerce contract owns one
///      instance and passes it by `storage` reference to every library, so libraries can
///      read and mutate the same state without inheritance or delegatecall.
struct AppStorage {
    // --- companies ---
    uint256 companyCount;
    mapping(uint256 => Company) companies;
    mapping(address => uint256) companyOfOwner; // owner => companyId (0 = none)
    // --- products ---
    uint256 productCount;
    mapping(uint256 => Product) products;
    uint256[] productIds;
    // --- carts ---
    mapping(address => CartItem[]) carts;
    // --- customers ---
    address[] customers;
    mapping(address => bool) isCustomer;
    // --- invoices ---
    uint256 invoiceCount;
    mapping(uint256 => Invoice) invoices;
    mapping(uint256 => CartItem[]) invoiceItems; // invoiceId => line items
    mapping(address => uint256[]) customerInvoices;
    mapping(uint256 => uint256[]) companyInvoices; // companyId => invoiceIds
}
