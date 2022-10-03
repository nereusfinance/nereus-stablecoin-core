// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

interface IComptroller {
    function claimReward(uint8 rewardType, address payable holder) external;
    function rewardAccrued(uint8 rewardType, address holder) external view returns(uint256);
}