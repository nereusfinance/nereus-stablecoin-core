//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ILiquidator {
    /**
     * Configuration for token that we should swap liquidated collateral to
     * token - address of erc20 token
     * percentage - how much percentages for liquidated collateral will be swapped to specified {token}
     */
    struct LiquidationSwapToken {
        address token;
        uint256 percentage;
    }

    /**
    * Configuration for token liquidation strategy
    * For cases when as a liquidation collateral some staked or LP token received and some liquidation strategy
    * strategy - address of smart contract to that applies liquidation strategy
     */
    struct TokenLiquidationStrategy {
        address strategy;
        bool shouldTransfer;
        bool active;
    }

    struct UserData {
        bool isSolvent;
        uint256 borrowPart;
    }

    event Liquidated(address origin, address[] destinations, uint256[] amounts);
    event TokenLiquidationStrategyAdded(address token, address strategy);
    event LiquidationSwapTokenConfigurationSet(LiquidationSwapToken[] swapTokenConfiguration);

    function getBatchUserData(address _pool, address[] calldata users)
        external
        view
        returns (UserData[] memory);

    function batchBalanceOf(address[] calldata tokens)
        external
        view
        returns (uint256[] memory);

    function balanceOf(address user, address token)
        external
        view
        returns (uint256);

    function liquidate(
        address _pool,
        address[] calldata users,
        uint256[] calldata maxBorrowParts,
        bool useSwap
    ) external payable;

    function withdraw(address token, address to, uint256 value) external;

    function withdrawETH(address to, uint256 value) external;

    function withdrawBentoBox(address bentoBox, address token, address to, uint256 amount) external;

    function managers(address manager) external view returns (bool);

    function addManager(address manager) external;

    function removeManager(address manager) external;
}
