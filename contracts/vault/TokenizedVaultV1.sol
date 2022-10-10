// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";
import "@openzeppelin/contracts/interfaces/IERC4626.sol";

import "./interfaces/IVaultRewardSwapperV1.sol";
import "./interfaces/IWrapToken.sol";

/**
 * @title TokenizedVault contract
 * @notice The Vault implements ERC4626 and includes compound of reward assets,
 * it allows to distribute rewards between share holders and to use Vault shares as collateral to borrow NXUSD
 **/
abstract contract TokenizedVaultV1 is ERC4626, Ownable, ReentrancyGuard {

    /// @notice Emitted when RewardsSwapper proxy changed by owner
    event RewardSwapperSet(address swapper);
    /// @notice Emitted when reward asset asset added by owner
    event RewardAssetAdded(address rewardAsset);
    /// @notice Emitted when reward asset asset removed by owner
    event RewardAssetRemoved(address rewardAsset);

    /// @notice Timestamp of the latest compound
    uint256 public lastCompound;
    /// @notice Seconds between compounds to reduce gas costs
    uint256 public idleBetweenCompounds;

    /// @notice BentoBox address is approved as spender by default
    address public immutable bentoBox;
    /// @notice List of reward assets which should be claimed
    address[] public rewardAssets;
    /// @notice Swapper proxy contract is responsible to swap from reward asset to Vault asset
    IVaultRewardSwapperV1 public swapper;
    /// @notice ERC20 contract to wrap native asset into ERC20 token (e.g. AVAX to WAVAX)
    address public immutable wrapAsset;

    constructor(
        ERC20 asset_,
        string memory name_,
        string memory symbol_,
        address swapper_,
        uint256 idleBetweenCompounds_,
        address wrapAsset_,
        address bentoBox_,
        address[] memory rewardAssets_
    ) ERC4626(asset_) ERC20(name_, symbol_) {
        setSwapper(swapper_);
        idleBetweenCompounds = idleBetweenCompounds_;
        wrapAsset = wrapAsset_;
        bentoBox = bentoBox_;

        for (uint256 i = 0; i < rewardAssets_.length; i++) {
            addRewardAsset(rewardAssets_[i]);
        }
    }

    /// @notice The logic to claim rewards should be implemented in child contracts
    function _claimRewards() internal virtual;

    /// @param idleBetweenCompounds_ seconds to wait between compounds
    function setIdleBetweenCompounds(uint256 idleBetweenCompounds_) public onlyOwner {
        idleBetweenCompounds = idleBetweenCompounds_;
    }

    /// @param swapper_ swapper proxy address
    function setSwapper(address swapper_) public onlyOwner {
        swapper = IVaultRewardSwapperV1(swapper_);
        emit RewardSwapperSet(swapper_);
    }

    function addRewardAsset(address rewardAsset) public onlyOwner {
        rewardAssets.push(rewardAsset);
        emit RewardAssetAdded(rewardAsset);
    }

    function removeRewardAsset(uint256 index) external onlyOwner {
        require(index < rewardAssets.length);
        address rewardAsset = rewardAssets[index];
        rewardAssets[index] = rewardAssets[rewardAssets.length - 1];
        rewardAssets.pop();
        emit RewardAssetRemoved(rewardAsset);
    }

    /// @notice Compound logic can be called separately at any time
    function compound() public nonReentrant {
        _compound();
    }

    /// @notice Compound functionality includes rewards claim and swap them to Vault underlying asset
    function _compound() internal {
        if (block.timestamp < lastCompound + idleBetweenCompounds) {
            return;
        }

        lastCompound = block.timestamp;

        _claimRewards();

        for (uint256 i = 0; i < rewardAssets.length; i++) {
            if (rewardAssets[i] == address(0) || rewardAssets[i] == asset()) continue;

            if (rewardAssets[i] == address(1)) {
                uint256 rewardBalance = address(this).balance;
                if (swapper.canSwap(wrapAsset, asset(), rewardBalance)) {
                    IWrapToken(wrapAsset).deposit{value: rewardBalance}();
                    SafeERC20.safeTransfer(IWrapToken(wrapAsset), address(swapper), rewardBalance);
                    swapper.swap(wrapAsset, asset());
                }
            } else {
                uint256 rewardBalance = IERC20(rewardAssets[i]).balanceOf(address(this));

                if (swapper.canSwap(rewardAssets[i], asset(), rewardBalance)) {
                    SafeERC20.safeTransfer(IERC20(rewardAssets[i]), address(swapper), rewardBalance);
                    swapper.swap(rewardAssets[i], asset());
                }
            }
        }
    }

    /// @notice Extends IERC4626.transferFrom with default approval for BentoBox
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override(ERC20) returns (bool) {
        address spender = _msgSender();

        if (spender != address(bentoBox)) {
            _spendAllowance(from, spender, amount);
        }

        _transfer(from, to, amount);
        return true;
    }

    /// @notice See _depositWithPermit
    function deposit(uint256 assets, address receiver) public virtual override nonReentrant returns (uint256) {
        return _depositWithCompound(assets, receiver);
    }

    /// @notice Allows to apply ERC2612 and perform deposit into Vault with one transaction instead of approve + deposit
    function depositWithPermit(
        uint256 assets,
        address receiver,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual nonReentrant returns (uint256) {
        SafeERC20.safePermit(IERC20Permit(asset()), _msgSender(), address(this), assets, deadline, v, r, s);
        return _depositWithCompound(assets, receiver);
    }

    /// @notice Extends IERC4626.deposit with compound logic
    function _depositWithCompound(uint256 assets, address receiver) internal returns (uint256) {
        require(assets <= maxDeposit(receiver), "ERC4626: deposit more than max");

        _compound();

        uint256 shares = previewDeposit(assets);
        _deposit(_msgSender(), receiver, assets, shares);

        return shares;
    }

    /// @notice Extends IERC4626.mint with compound logic
    function mint(uint256 shares, address receiver) public virtual override nonReentrant returns (uint256) {
        require(shares <= maxMint(receiver), "ERC4626: mint more than max");

        _compound();

        uint256 assets = previewMint(shares);
        _deposit(_msgSender(), receiver, assets, shares);

        return assets;
    }

    /// @notice Extends IERC4626.withdraw with compound logic
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public virtual override nonReentrant returns (uint256) {
        require(assets <= maxWithdraw(owner), "ERC4626: withdraw more than max");

        _compound();

        uint256 shares = previewWithdraw(assets);
        _withdraw(_msgSender(), receiver, owner, assets, shares);

        return shares;
    }

    /// @notice Extends IERC4626.redeem with compound logic
    function redeem(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual override nonReentrant returns (uint256) {
        require(shares <= maxRedeem(owner), "ERC4626: redeem more than max");

        _compound();

        uint256 assets = previewRedeem(shares);
        _withdraw(_msgSender(), receiver, owner, assets, shares);

        return assets;
    }

    /// @notice IERC4626.redeem call can be used as emergency withdrawal without compound
    function redeemWithoutCompound(
        uint256 shares,
        address receiver,
        address owner
    ) public virtual returns (uint256) {
        return ERC4626.redeem(shares, receiver, owner);
    }

    /// @notice Allows to receive rewards in native asset
    fallback() external payable {
        return;
    }

    /// @notice Allows to receive rewards in native asset
    receive() external payable {
        return;
    }
}
