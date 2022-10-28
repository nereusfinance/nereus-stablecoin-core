//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ILiquidator {

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
