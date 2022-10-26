// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts/interfaces/IERC4626.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import "./interfaces/ICERC20.sol";
import "./interfaces/IAggregatorV3Interface.sol";

interface IOracle {
    function get(bytes calldata data) external returns (bool success, uint256 rate);
    function peek(bytes calldata data) external returns (bool success, uint256 rate);
    function peekSpot(bytes calldata data) external returns (uint256 rate);
    function symbol(bytes calldata data) external view returns (string memory);
    function name(bytes calldata data) external view returns (string memory);
}

/**
 * @title TokenizedVaultCompOracle contract
 * @notice Calculates Vault shares rate to USD for compound-like tokens (e.g. qiToken)
 * based on Chainlink price feed and exchangeRate
 **/
contract TokenizedVaultCompOracle is IOracle {

    IAggregatorV3Interface public immutable priceFeed;

    IERC4626 public immutable vault;
    uint256 public immutable vaultDecimals;
    uint256 public immutable vaultAssetDecimals;
    uint256 public immutable rateDividend;

    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_, address priceFeed_, address vault_) {
        _name = name_;
        _symbol = symbol_;
        priceFeed = IAggregatorV3Interface(priceFeed_);
        vault = IERC4626(vault_);

        IERC20Metadata vaultAsset = IERC20Metadata(vault.asset());
        vaultDecimals = IERC20Metadata(vault).decimals();
        vaultAssetDecimals = vaultAsset.decimals();
        address cUnderlying = ICERC20(vault.asset()).underlying();
        uint256 cUnderlyingDecimals = IERC20Metadata(cUnderlying).decimals();
        uint256 cExchangeRateDecimals = cUnderlyingDecimals + 18 - vaultAssetDecimals;
        rateDividend = 10**(vaultAssetDecimals + priceFeed.decimals() + vaultDecimals + cExchangeRateDecimals);
    }

    // Calculates the latest exchange rate
    function _get() internal returns (uint256) {
        (
            /*uint startedAt*/,
            int256 answer,
            /*uint80 roundID*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = priceFeed.latestRoundData();
        uint256 vaultTotalSupply = vault.totalSupply();
        uint256 cExchangeRate = ICERC20(vault.asset()).exchangeRateCurrent();

        uint256 price = vaultTotalSupply == 0
            ? 10**vaultAssetDecimals * uint256(answer)
            : (vault.totalAssets() * uint256(answer) * 10**vaultDecimals) / vaultTotalSupply;

        return rateDividend / (price * cExchangeRate);
    }

    // Get the latest exchange rate
    /// @inheritdoc IOracle
    function get(bytes calldata) public override returns (bool, uint256) {
        return (true, _get());
    }

    // Check the last exchange rate without any state changes
    /// @inheritdoc IOracle
    function peek(bytes calldata) public override returns (bool, uint256) {
        return (true, _get());
    }

    // Check the current spot exchange rate without any state changes
    /// @inheritdoc IOracle
    function peekSpot(bytes calldata data) external override returns (uint256 rate) {
        (, rate) = peek(data);
    }

    /// @inheritdoc IOracle
    function name(bytes calldata) public view override returns (string memory) {
        return _name;
    }

    /// @inheritdoc IOracle
    function symbol(bytes calldata) public view override returns (string memory) {
        return _symbol;
    }

}

