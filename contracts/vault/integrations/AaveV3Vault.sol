// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "../TokenizedVaultV1.sol";
import {IAaveRewardControllerV3} from "../interfaces/IAaveRewardController.sol";

contract AaveV3Vault is TokenizedVaultV1 {
    IAaveRewardControllerV3 public rewardController;

    address[] internal _assets;

    constructor(
        ERC20 asset_,
        string memory name_,
        string memory symbol_,
        address swapper_,
        uint256 idleBetweenCompounds_,
        address wrapAsset_,
        address bentoBox_,
        IAaveRewardControllerV3 rewardController_,
        address[] memory rewardAssets_
    ) TokenizedVaultV1(asset_, name_, symbol_, swapper_, idleBetweenCompounds_, wrapAsset_, bentoBox_, rewardAssets_) {
        rewardController = rewardController_;

        _assets = new address[](1);
        _assets[0] = asset();
    }

    function _claimRewards() internal virtual override {
        rewardController.claimAllRewardsToSelf(_assets);
    }
}
