// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { AppStorage, Company } from "./Types.sol";

/// @notice Company registration and lookups over AppStorage.
library CompanyLib {
    event CompanyRegistered(uint256 indexed companyId, address indexed owner, string name);

    /// @dev Registers a company for `owner`. One company per wallet.
    function registerCompany(
        AppStorage storage s,
        address owner,
        string memory name,
        string memory taxId
    ) internal returns (uint256 companyId) {
        require(bytes(name).length > 0, "Company: name required");
        require(s.companyOfOwner[owner] == 0, "Company: owner already has a company");

        companyId = ++s.companyCount;
        s.companies[companyId] = Company({
            companyId: companyId,
            name: name,
            companyAddress: owner,
            taxId: taxId,
            isActive: true
        });
        s.companyOfOwner[owner] = companyId;

        emit CompanyRegistered(companyId, owner, name);
    }

    function getCompany(AppStorage storage s, uint256 companyId)
        internal
        view
        returns (Company memory)
    {
        require(s.companies[companyId].companyId != 0, "Company: not found");
        return s.companies[companyId];
    }

    function getAllCompanies(AppStorage storage s) internal view returns (Company[] memory list) {
        list = new Company[](s.companyCount);
        for (uint256 i = 0; i < s.companyCount; i++) {
            list[i] = s.companies[i + 1];
        }
    }

    /// @dev Reverts unless `caller` owns `companyId`.
    function requireOwner(AppStorage storage s, uint256 companyId, address caller) internal view {
        require(s.companies[companyId].companyId != 0, "Company: not found");
        require(s.companies[companyId].companyAddress == caller, "Company: not the owner");
    }
}
