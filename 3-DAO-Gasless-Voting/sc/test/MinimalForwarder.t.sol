// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { MetaTxHelper } from "./utils/MetaTxHelper.sol";
import { MinimalForwarder } from "../src/MinimalForwarder.sol";
import { ERC2771Context } from "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/// @dev Minimal ERC2771 target that records who the forwarder says the caller is.
contract RecorderTarget is ERC2771Context {
    address public lastSender;
    uint256 public lastValue;

    constructor(address forwarder) ERC2771Context(forwarder) { }

    function record() external payable {
        lastSender = _msgSender();
        lastValue = msg.value;
    }
}

contract MinimalForwarderTest is MetaTxHelper {
    MinimalForwarder internal forwarder;
    RecorderTarget internal target;

    uint256 internal constant USER_PK = 0xA11CE;
    address internal user;
    address internal relayer = makeAddr("relayer");

    function setUp() public {
        forwarder = new MinimalForwarder();
        target = new RecorderTarget(address(forwarder));
        user = vm.addr(USER_PK);
    }

    function test_InitialNonceIsZero() public view {
        assertEq(forwarder.getNonce(user), 0);
    }

    function test_VerifyValidSignature() public view {
        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildRequest(forwarder, USER_PK, address(target), 0, abi.encodeCall(RecorderTarget.record, ()));
        assertTrue(forwarder.verify(req, sig));
    }

    function test_VerifyFailsOnWrongNonce() public view {
        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildRequest(forwarder, USER_PK, address(target), 0, abi.encodeCall(RecorderTarget.record, ()));
        req.nonce = 99; // tamper: signature no longer matches
        assertFalse(forwarder.verify(req, sig));
    }

    function test_ExecuteForwardsOriginalSender() public {
        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildRequest(forwarder, USER_PK, address(target), 0, abi.encodeCall(RecorderTarget.record, ()));

        vm.prank(relayer); // the relayer pays gas, not the user
        (bool ok,) = forwarder.execute(req, sig);

        assertTrue(ok);
        assertEq(target.lastSender(), user, "target must see the user, not the relayer");
        assertEq(forwarder.getNonce(user), 1, "nonce must increment");
    }

    function test_ExecuteForwardsValue() public {
        vm.deal(relayer, 1 ether);
        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildRequest(forwarder, USER_PK, address(target), 0.5 ether, abi.encodeCall(RecorderTarget.record, ()));

        vm.prank(relayer);
        forwarder.execute{ value: 0.5 ether }(req, sig);

        assertEq(target.lastValue(), 0.5 ether);
    }

    function test_RevertWhen_WrongSigner() public {
        // Build a request for `user`, but sign it with a different key. The recovered
        // signer won't match req.from, so verify() fails.
        (MinimalForwarder.ForwardRequest memory req,) =
            _buildRequest(forwarder, USER_PK, address(target), 0, abi.encodeCall(RecorderTarget.record, ()));
        (, bytes memory wrongSig) =
            _buildRequest(forwarder, 0xBAD, address(target), 0, abi.encodeCall(RecorderTarget.record, ()));

        vm.expectRevert("MinimalForwarder: signature does not match request");
        forwarder.execute(req, wrongSig);
    }

    function test_RevertWhen_Replay() public {
        (MinimalForwarder.ForwardRequest memory req, bytes memory sig) =
            _buildRequest(forwarder, USER_PK, address(target), 0, abi.encodeCall(RecorderTarget.record, ()));

        forwarder.execute(req, sig);
        // Same request again: nonce already consumed, verify() now fails.
        vm.expectRevert("MinimalForwarder: signature does not match request");
        forwarder.execute(req, sig);
    }
}
