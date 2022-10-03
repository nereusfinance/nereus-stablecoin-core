// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "hardhat/console.sol";
import "../TokenizedVaultV1.sol";
import {IAaveRewardControllerV3} from "../interfaces/IAaveRewardController.sol";
import "../interfaces/IComptroller.sol";

contract QiVault is TokenizedVaultV1 {
    event RewardTypesSet(uint8[] rewardTypes);

    IComptroller public rewardController;

    uint8[] public rewardTypes;

    constructor(
        ERC20 asset_,
        string memory name_,
        string memory symbol_,
        address swapper_,
        uint256 idleBetweenCompounds_,
        address wrapAsset_,
        address bentoBox_,
        IComptroller comptroller_,
        address[] memory rewardAssets_,
        uint8[] memory rewardTypes_
    ) TokenizedVaultV1(asset_, name_, symbol_, swapper_, idleBetweenCompounds_, wrapAsset_, bentoBox_, rewardAssets_) {
        rewardController = comptroller_;

        setRewardTypes(rewardTypes_);
    }

    function _claimRewards() internal virtual override {
        for (uint256 i = 0; i < rewardTypes.length; i++) {
            rewardController.claimReward(rewardTypes[i], payable(address(this)));
        }
    }

    function setRewardTypes(uint8[] memory rewardTypes_) public onlyOwner {
        rewardTypes = rewardTypes_;
        emit RewardTypesSet(rewardTypes);
    }
}
