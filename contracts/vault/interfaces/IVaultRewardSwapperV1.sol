// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IVaultRewardSwapperV1 {
    function swap(address tokenIn, address tokenOut) external;

    function canSwap(
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) external returns (bool);
}
