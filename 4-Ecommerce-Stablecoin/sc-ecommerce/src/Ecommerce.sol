// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { AppStorage, Company, Product, CartItem, Invoice } from "./libraries/Types.sol";
import { CompanyLib } from "./libraries/CompanyLib.sol";
import { ProductLib } from "./libraries/ProductLib.sol";
import { CustomerLib } from "./libraries/CustomerLib.sol";
import { CartLib } from "./libraries/CartLib.sol";
import { InvoiceLib } from "./libraries/InvoiceLib.sol";
import { PaymentLib } from "./libraries/PaymentLib.sol";

/// @title Ecommerce
/// @notice On-chain store: companies register, list products, customers fill a cart, check
///         out into invoices, and pay with EuroToken. State lives in a single AppStorage
///         struct manipulated by focused libraries (AppStorage pattern).
contract Ecommerce is ReentrancyGuard {
    using CompanyLib for AppStorage;
    using ProductLib for AppStorage;
    using CustomerLib for AppStorage;
    using CartLib for AppStorage;
    using InvoiceLib for AppStorage;
    using PaymentLib for AppStorage;

    AppStorage internal s;

    /// @notice The stablecoin used for payments.
    IERC20 public immutable euroToken;

    constructor(address euroToken_) {
        require(euroToken_ != address(0), "Ecommerce: token is zero");
        euroToken = IERC20(euroToken_);
    }

    // ---------------------------------------------------------------------
    // Companies
    // ---------------------------------------------------------------------

    function registerCompany(string calldata name, string calldata taxId)
        external
        returns (uint256)
    {
        return s.registerCompany(msg.sender, name, taxId);
    }

    function getCompany(uint256 companyId) external view returns (Company memory) {
        return s.getCompany(companyId);
    }

    function getAllCompanies() external view returns (Company[] memory) {
        return s.getAllCompanies();
    }

    /// @notice The company owned by `owner`, or 0 if none.
    function companyOf(address owner) external view returns (uint256) {
        return s.companyOfOwner[owner];
    }

    // ---------------------------------------------------------------------
    // Products
    // ---------------------------------------------------------------------

    function addProduct(
        uint256 companyId,
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 stock,
        string calldata ipfsImageHash
    ) external returns (uint256) {
        return s.addProduct(msg.sender, companyId, name, description, price, stock, ipfsImageHash);
    }

    function updateProduct(uint256 productId, uint256 price, uint256 stock, bool isActive)
        external
    {
        s.updateProduct(msg.sender, productId, price, stock, isActive);
    }

    function getProduct(uint256 productId) external view returns (Product memory) {
        return s.getProduct(productId);
    }

    function getAllProducts() external view returns (Product[] memory) {
        return s.getAllProducts();
    }

    // ---------------------------------------------------------------------
    // Cart
    // ---------------------------------------------------------------------

    function addToCart(uint256 productId, uint256 quantity) external {
        s.addToCart(msg.sender, productId, quantity);
    }

    function updateCartQuantity(uint256 productId, uint256 quantity) external {
        s.updateQuantity(msg.sender, productId, quantity);
    }

    function getCart(address customer) external view returns (CartItem[] memory) {
        return s.getCart(customer);
    }

    function getCartTotal(address customer) external view returns (uint256) {
        return s.cartTotal(customer);
    }

    function clearCart() external {
        s.clearCart(msg.sender);
    }

    // ---------------------------------------------------------------------
    // Invoices & payment
    // ---------------------------------------------------------------------

    /// @notice Checkout: turn the caller's cart items for `companyId` into an invoice.
    function createInvoice(uint256 companyId) external returns (uint256) {
        return s.createInvoice(msg.sender, companyId);
    }

    function getInvoice(uint256 invoiceId) external view returns (Invoice memory) {
        return s.getInvoice(invoiceId);
    }

    function getInvoiceItems(uint256 invoiceId) external view returns (CartItem[] memory) {
        return s.getInvoiceItems(invoiceId);
    }

    /// @notice Pay an invoice in EuroToken. The caller must have approved this contract for
    ///         the invoice total beforehand. Anyone can pay, but funds move from the caller.
    function processPayment(uint256 invoiceId) external nonReentrant {
        s.processPayment(euroToken, msg.sender, invoiceId);
    }

    // ---------------------------------------------------------------------
    // Customers (admin views)
    // ---------------------------------------------------------------------

    function getAllCustomers() external view returns (address[] memory) {
        return s.getAllCustomers();
    }

    function getCustomerInvoices(address customer) external view returns (uint256[] memory) {
        return s.getCustomerInvoices(customer);
    }

    function getCompanyInvoices(uint256 companyId) external view returns (uint256[] memory) {
        return s.companyInvoices[companyId];
    }
}
