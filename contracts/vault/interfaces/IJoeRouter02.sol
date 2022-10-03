// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IJoeRouter02 {
    function factory() external returns (address);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}