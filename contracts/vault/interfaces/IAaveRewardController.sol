// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

interface IAaveRewardController {
    function claimRewards(
        address[] calldata assets,
        uint256 amount,
        address to
    ) external returns (uint256);
}

interface IAaveRewardControllerV3 {
    function claimAllRewardsToSelf(address[] calldata assets)
    external
    returns (address[] memory rewardsList, uint256[] memory claimedAmounts);
}