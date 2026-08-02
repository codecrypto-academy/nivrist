// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AppStorage } from "./Types.sol";

/// @notice Tracks known customers (first time they interact) for the admin's client list.
library CustomerLib {
    event CustomerRegistered(address indexed customer);

    /// @dev Records a customer the first time they are seen. Idempotent.
    function touch(AppStorage storage s, address customer) internal {
        if (!s.isCustomer[customer]) {
            s.isCustomer[customer] = true;
            s.customers.push(customer);
            emit CustomerRegistered(customer);
        }
    }

    function getAllCustomers(AppStorage storage s) internal view returns (address[] memory) {
        return s.customers;
    }

    function getCustomerInvoices(AppStorage storage s, address customer)
        internal
        view
        returns (uint256[] memory)
    {
        return s.customerInvoices[customer];
    }
}
