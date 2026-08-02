// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { Ecommerce } from "../src/Ecommerce.sol";
import { MockEuroToken } from "./mocks/MockEuroToken.sol";
import { Company, Product, CartItem, Invoice } from "../src/libraries/Types.sol";

contract EcommerceTest is Test {
    Ecommerce internal shop;
    MockEuroToken internal token;

    address internal merchant = makeAddr("merchant");
    address internal merchant2 = makeAddr("merchant2");
    address internal customer = makeAddr("customer");

    uint256 internal constant PRICE_A = 10e6; // €10
    uint256 internal constant PRICE_B = 25e6; // €25

    function setUp() public {
        token = new MockEuroToken();
        shop = new Ecommerce(address(token));
    }

    // --- helpers ---

    function _companyWithProducts() internal returns (uint256 companyId, uint256 pA, uint256 pB) {
        vm.startPrank(merchant);
        companyId = shop.registerCompany("Mi Tienda", "ES-B12345678");
        pA = shop.addProduct(companyId, "Producto A", "desc A", PRICE_A, 100, "ipfsA");
        pB = shop.addProduct(companyId, "Producto B", "desc B", PRICE_B, 50, "ipfsB");
        vm.stopPrank();
    }

    // --- companies ---

    function test_RegisterCompany() public {
        vm.prank(merchant);
        uint256 id = shop.registerCompany("Mi Tienda", "ES-B12345678");
        assertEq(id, 1);
        Company memory c = shop.getCompany(id);
        assertEq(c.name, "Mi Tienda");
        assertEq(c.companyAddress, merchant);
        assertTrue(c.isActive);
        assertEq(shop.companyOf(merchant), 1);
    }

    function test_RevertWhen_TwoCompaniesPerOwner() public {
        vm.startPrank(merchant);
        shop.registerCompany("A", "t1");
        vm.expectRevert("Company: owner already has a company");
        shop.registerCompany("B", "t2");
        vm.stopPrank();
    }

    // --- products ---

    function test_AddProduct() public {
        (, uint256 pA,) = _companyWithProducts();
        Product memory p = shop.getProduct(pA);
        assertEq(p.name, "Producto A");
        assertEq(p.price, PRICE_A);
        assertEq(p.stock, 100);
        assertEq(shop.getAllProducts().length, 2);
    }

    function test_RevertWhen_NonOwnerAddsProduct() public {
        (uint256 companyId,,) = _companyWithProducts();
        vm.prank(customer);
        vm.expectRevert("Company: not the owner");
        shop.addProduct(companyId, "X", "d", 1e6, 5, "");
    }

    function test_UpdateProduct() public {
        (, uint256 pA,) = _companyWithProducts();
        vm.prank(merchant);
        shop.updateProduct(pA, 12e6, 80, true);
        Product memory p = shop.getProduct(pA);
        assertEq(p.price, 12e6);
        assertEq(p.stock, 80);
    }

    function test_RevertWhen_UpdateOtherCompanysProduct() public {
        (, uint256 pA,) = _companyWithProducts();
        vm.prank(merchant2);
        shop.registerCompany("Otra", "t2");
        vm.prank(merchant2);
        vm.expectRevert("Company: not the owner");
        shop.updateProduct(pA, 1e6, 1, true);
    }

    // --- cart ---

    function test_AddToCartMergesQuantities() public {
        (, uint256 pA,) = _companyWithProducts();
        vm.startPrank(customer);
        shop.addToCart(pA, 1);
        shop.addToCart(pA, 2);
        vm.stopPrank();
        CartItem[] memory cart = shop.getCart(customer);
        assertEq(cart.length, 1);
        assertEq(cart[0].quantity, 3);
    }

    function test_CartTotal() public {
        (, uint256 pA, uint256 pB) = _companyWithProducts();
        vm.startPrank(customer);
        shop.addToCart(pA, 2);
        shop.addToCart(pB, 1);
        vm.stopPrank();
        assertEq(shop.getCartTotal(customer), 2 * PRICE_A + PRICE_B); // €45
    }

    function test_RevertWhen_AddNonexistentProductToCart() public {
        vm.prank(customer);
        vm.expectRevert("Cart: product not found");
        shop.addToCart(999, 1);
    }

    function test_UpdateCartQuantity() public {
        (, uint256 pA, uint256 pB) = _companyWithProducts();
        vm.startPrank(customer);
        shop.addToCart(pA, 2);
        shop.addToCart(pB, 1);
        shop.updateCartQuantity(pA, 5); // change
        shop.updateCartQuantity(pB, 0); // remove
        vm.stopPrank();
        CartItem[] memory cart = shop.getCart(customer);
        assertEq(cart.length, 1);
        assertEq(cart[0].productId, pA);
        assertEq(cart[0].quantity, 5);
    }

    function test_RevertWhen_UpdateMissingCartItem() public {
        (, uint256 pA,) = _companyWithProducts();
        vm.prank(customer);
        vm.expectRevert("Cart: item not found");
        shop.updateCartQuantity(pA, 1);
    }

    function test_ClearCart() public {
        (, uint256 pA,) = _companyWithProducts();
        vm.startPrank(customer);
        shop.addToCart(pA, 1);
        shop.clearCart();
        vm.stopPrank();
        assertEq(shop.getCart(customer).length, 0);
    }

    function test_RevertWhen_AddInactiveProductToCart() public {
        (, uint256 pA,) = _companyWithProducts();
        vm.prank(merchant);
        shop.updateProduct(pA, PRICE_A, 100, false); // deactivate
        vm.prank(customer);
        vm.expectRevert("Cart: product inactive");
        shop.addToCart(pA, 1);
    }

    function test_GetAllCompanies() public {
        _companyWithProducts();
        vm.prank(merchant2);
        shop.registerCompany("Otra", "t2");
        assertEq(shop.getAllCompanies().length, 2);
    }

    function test_RevertWhen_PayNonexistentInvoice() public {
        vm.prank(customer);
        vm.expectRevert("Payment: invoice not found");
        shop.processPayment(999);
    }

    // --- full flow: cart -> invoice -> payment ---

    function test_FullFlow_CheckoutAndPay() public {
        (uint256 companyId, uint256 pA, uint256 pB) = _companyWithProducts();

        vm.startPrank(customer);
        shop.addToCart(pA, 2);
        shop.addToCart(pB, 1);
        uint256 invoiceId = shop.createInvoice(companyId);
        vm.stopPrank();

        // Invoice totals €45 and cart is cleared.
        Invoice memory inv = shop.getInvoice(invoiceId);
        assertEq(inv.totalAmount, 2 * PRICE_A + PRICE_B);
        assertFalse(inv.isPaid);
        assertEq(shop.getCart(customer).length, 0);

        // Stock reserved at checkout.
        assertEq(shop.getProduct(pA).stock, 98);
        assertEq(shop.getProduct(pB).stock, 49);

        // Fund + approve + pay.
        token.mint(customer, 100e6);
        vm.startPrank(customer);
        token.approve(address(shop), inv.totalAmount);
        shop.processPayment(invoiceId);
        vm.stopPrank();

        assertTrue(shop.getInvoice(invoiceId).isPaid);
        assertEq(token.balanceOf(merchant), 45e6); // company received funds
        assertEq(token.balanceOf(customer), 55e6);
    }

    function test_RevertWhen_PayTwice() public {
        (uint256 companyId, uint256 pA,) = _companyWithProducts();
        vm.startPrank(customer);
        shop.addToCart(pA, 1);
        uint256 invoiceId = shop.createInvoice(companyId);
        vm.stopPrank();

        token.mint(customer, 100e6);
        vm.startPrank(customer);
        token.approve(address(shop), 100e6);
        shop.processPayment(invoiceId);
        vm.expectRevert("Payment: already paid");
        shop.processPayment(invoiceId);
        vm.stopPrank();
    }

    function test_RevertWhen_PayWithoutBalance() public {
        (uint256 companyId, uint256 pA,) = _companyWithProducts();
        vm.startPrank(customer);
        shop.addToCart(pA, 1);
        uint256 invoiceId = shop.createInvoice(companyId);
        token.approve(address(shop), 100e6); // approved but no balance
        vm.expectRevert(); // ERC20 insufficient balance
        shop.processPayment(invoiceId);
        vm.stopPrank();
    }

    function test_RevertWhen_CheckoutInsufficientStock() public {
        vm.startPrank(merchant);
        uint256 companyId = shop.registerCompany("T", "t");
        uint256 p = shop.addProduct(companyId, "Scarce", "d", 1e6, 1, "");
        vm.stopPrank();

        vm.startPrank(customer);
        shop.addToCart(p, 5); // more than stock
        vm.expectRevert("Product: insufficient stock");
        shop.createInvoice(companyId);
        vm.stopPrank();
    }

    function test_MultiCompanyCheckoutSeparatesInvoices() public {
        (uint256 c1, uint256 pA,) = _companyWithProducts();
        vm.prank(merchant2);
        uint256 c2 = shop.registerCompany("Otra", "t2");
        vm.prank(merchant2);
        uint256 pC = shop.addProduct(c2, "Producto C", "d", 5e6, 10, "");

        vm.startPrank(customer);
        shop.addToCart(pA, 1);
        shop.addToCart(pC, 3);
        uint256 inv1 = shop.createInvoice(c1); // only company 1 items
        vm.stopPrank();

        // Company 2's item stays in the cart.
        assertEq(shop.getInvoice(inv1).totalAmount, PRICE_A);
        CartItem[] memory left = shop.getCart(customer);
        assertEq(left.length, 1);
        assertEq(left[0].productId, pC);
    }

    // --- admin views ---

    function test_CustomerAndCompanyInvoiceViews() public {
        (uint256 companyId, uint256 pA,) = _companyWithProducts();
        vm.startPrank(customer);
        shop.addToCart(pA, 1);
        uint256 invoiceId = shop.createInvoice(companyId);
        vm.stopPrank();

        assertEq(shop.getCustomerInvoices(customer)[0], invoiceId);
        assertEq(shop.getCompanyInvoices(companyId)[0], invoiceId);
        assertEq(shop.getAllCustomers()[0], customer);
        assertEq(shop.getInvoiceItems(invoiceId).length, 1);
    }
}
