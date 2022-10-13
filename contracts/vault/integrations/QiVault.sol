// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "hardhat/console.sol";
import "../TokenizedVaultV1.sol";
import {IAaveRewardControllerV3} from "../interfaces/IAaveRewardController.sol";
import "../interfaces/IComptroller.sol";

/**
 * @title QiVault contract
 * @notice The contract implements TokenizedVaultV1 and defines claim logic of qiToken rewards
 **/
contract QiVault is TokenizedVaultV1 {
    /// @notice Emitted when reward types is set by owner
    event RewardTypesSet(uint8[] rewardTypes);

    /// @notice The reward controller which should be called to claim rewards
    IComptroller public rewardController;

    /// @notice The reward types
    /// rewardType = 0 (BENQI)
    /// rewardType = 1 (AVAX)
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

    /// @notice Claim qiToken rewards by their types
    function _claimRewards() internal virtual override {
        for (uint256 i = 0; i < rewardTypes.length; i++) {
            rewardController.claimReward(rewardTypes[i], payable(address(this)));
        }
    }

    /// @notice Set reward types, can be called by owner
    function setRewardTypes(uint8[] memory rewardTypes_) public onlyOwner {
        rewardTypes = rewardTypes_;
        emit RewardTypesSet(rewardTypes);
    }
}
