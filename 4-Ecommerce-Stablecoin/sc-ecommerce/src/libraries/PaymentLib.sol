// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { AppStorage, Invoice, Company } from "./Types.sol";

/// @notice Pays invoices in EuroToken, moving funds from the payer to the company wallet.
library PaymentLib {
    using SafeERC20 for IERC20;

    event PaymentProcessed(
        uint256 indexed invoiceId,
        address indexed payer,
        uint256 indexed companyId,
        uint256 amount
    );

    /// @dev Transfers the invoice total from `payer` to the company wallet and marks it paid.
    ///      Requires the payer to have approved this contract for `totalAmount` first.
    function processPayment(AppStorage storage s, IERC20 token, address payer, uint256 invoiceId)
        internal
    {
        Invoice storage inv = s.invoices[invoiceId];
        require(inv.invoiceId != 0, "Payment: invoice not found");
        require(!inv.isPaid, "Payment: already paid");

        Company storage company = s.companies[inv.companyId];

        // Effects before interaction.
        inv.isPaid = true;
        inv.paymentTxHash = keccak256(abi.encodePacked(invoiceId, payer, block.number));

        token.safeTransferFrom(payer, company.companyAddress, inv.totalAmount);

        emit PaymentProcessed(invoiceId, payer, inv.companyId, inv.totalAmount);
    }
}
