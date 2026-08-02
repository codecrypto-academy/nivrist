// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title Escrow — trustless ERC-20 token swaps
/// @notice The owner whitelists tradable tokens. A maker locks `amountA` of token A and asks
///         for `amountB` of token B; any taker can fill it by providing token B, receiving
///         token A atomically. The maker can cancel and recover their tokens while active.
contract Escrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Operation {
        uint256 id;
        address creator;
        address tokenA; // offered (locked in the contract)
        address tokenB; // requested
        uint256 amountA;
        uint256 amountB;
        bool active;
        address completedBy; // taker, once completed
    }

    address[] private allowedTokens;
    mapping(address => bool) public isAllowed;

    Operation[] private operations;

    event TokenAdded(address indexed token);
    event OperationCreated(
        uint256 indexed id,
        address indexed creator,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    );
    event OperationCompleted(uint256 indexed id, address indexed completedBy);
    event OperationCancelled(uint256 indexed id);

    constructor() Ownable(msg.sender) { }

    // ---------------------------------------------------------------------
    // Allowed tokens
    // ---------------------------------------------------------------------

    /// @notice Whitelist an ERC-20 token so it can be used in swaps. Owner-only.
    function addToken(address token) external onlyOwner {
        require(token != address(0), "Escrow: zero token");
        require(!isAllowed[token], "Escrow: already allowed");
        isAllowed[token] = true;
        allowedTokens.push(token);
        emit TokenAdded(token);
    }

    function getAllowedTokens() external view returns (address[] memory) {
        return allowedTokens;
    }

    // ---------------------------------------------------------------------
    // Operations
    // ---------------------------------------------------------------------

    /// @notice Create a swap: lock `amountA` of `tokenA`, ask for `amountB` of `tokenB`.
    /// @dev Caller must approve this contract for `amountA` of `tokenA` first.
    function createOperation(address tokenA, address tokenB, uint256 amountA, uint256 amountB)
        external
        nonReentrant
        returns (uint256 id)
    {
        require(isAllowed[tokenA] && isAllowed[tokenB], "Escrow: token not allowed");
        require(tokenA != tokenB, "Escrow: same token");
        require(amountA > 0 && amountB > 0, "Escrow: zero amount");

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);

        id = operations.length;
        operations.push(
            Operation({
                id: id,
                creator: msg.sender,
                tokenA: tokenA,
                tokenB: tokenB,
                amountA: amountA,
                amountB: amountB,
                active: true,
                completedBy: address(0)
            })
        );

        emit OperationCreated(id, msg.sender, tokenA, tokenB, amountA, amountB);
    }

    /// @notice Fill an active operation. Taker sends token B to the maker and receives token A.
    /// @dev Taker must approve this contract for `amountB` of `tokenB` first.
    function completeOperation(uint256 operationId) external nonReentrant {
        Operation storage op = operations[operationId];
        require(op.active, "Escrow: operation is not active");
        require(op.creator != msg.sender, "Escrow: cannot complete your own operation");

        op.active = false;
        op.completedBy = msg.sender;

        // Taker → maker (token B), then contract → taker (token A).
        IERC20(op.tokenB).safeTransferFrom(msg.sender, op.creator, op.amountB);
        IERC20(op.tokenA).safeTransfer(msg.sender, op.amountA);

        emit OperationCompleted(operationId, msg.sender);
    }

    /// @notice Cancel an active operation and return the locked token A to its creator.
    function cancelOperation(uint256 operationId) external nonReentrant {
        Operation storage op = operations[operationId];
        require(op.active, "Escrow: operation is not active");
        require(op.creator == msg.sender, "Escrow: only creator can cancel");

        op.active = false;
        IERC20(op.tokenA).safeTransfer(op.creator, op.amountA);

        emit OperationCancelled(operationId);
    }

    function getAllOperations() external view returns (Operation[] memory) {
        return operations;
    }

    function getOperation(uint256 operationId) external view returns (Operation memory) {
        require(operationId < operations.length, "Escrow: no such operation");
        return operations[operationId];
    }

    function operationsCount() external view returns (uint256) {
        return operations.length;
    }
}
