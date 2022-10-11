// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface ICERC20 {
    function mint(uint256 mintAmount) external returns (uint256);
    function exchangeRateCurrent() external returns (uint256);
    function underlying() external returns (address);
}
