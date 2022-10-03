// SPDX-License-Identifier: MIT
pragma solidity ^0.8.6;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "../access/ManageableUpgradeable.sol";
import "../interfaces/IVaultRewardSwapperV1.sol";
import "../interfaces/IAAVEV3.sol";
import "../interfaces/IJoePair.sol";
import "../interfaces/IJoeRouter02.sol";
import "../interfaces/IJoeFactory.sol";
import "../interfaces/ICERC20.sol";
import "../interfaces/IWrapToken.sol";

contract VaultRewardSwapperV2Mock is Initializable, ManageableUpgradeable, IVaultRewardSwapperV1 {

    // actionType:
    // 1 = joe swap
    // 2 = aaveV3 supply
    // 3 = cToken mint
    struct SwapAction {
        uint256 actionType;
        address tokenIn;
        address tokenOut;
    }

    event Swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, address caller);
    event RouteSet(address tokenIn, address tokenOut, SwapAction[] actions);
    event RouteMinAmountSet(address tokenIn, uint256 minAmount);
    event JoeFactorySet(address joeFactory);
    event AaveLendingPoolV3Set(address aaveLendingPoolV3);

    error SwapActionNotSupported();

    // example: routes[startToken][endToken] = SwapAction[]
    mapping(address => mapping(address => SwapAction[])) public routes;
    mapping(address => uint256) public routeMinAmount;

    IAAVEV3 public aaveLendingPoolV3;
    IJoeFactory public joeFactory;

    uint256 public mockTag;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function setMockTag(uint256 tag) public {
        mockTag = tag;
    }

    function swap(address tokenIn_, address tokenOut_) public onlyManager {
        address recipient = _msgSender();
        uint256 amountIn = IERC20(tokenIn_).balanceOf(address(this));
        uint256 amountOutStart = IERC20(tokenOut_).balanceOf(recipient);

        SwapAction[] storage actions = routes[tokenIn_][tokenOut_];
        uint256 amount = amountIn;

        uint256 actionsLength = actions.length;
        for (uint256 i = 0; i < actionsLength; i++) {
            SwapAction storage action = actions[i];

            if (action.actionType == 1) {
                bool isLastAction = (i + 1) == actionsLength;
                address swapRecipient = isLastAction ? recipient : address(this);
                uint256 amountOut = _swapJoePair(action, amount, swapRecipient);
                amount = isLastAction ? 0 : amountOut;
            } else if (action.actionType == 2) {
                amount = _aaveV3Supply(action, amount);
            } else if (action.actionType == 3) {
                amount = _cMint(action, amount);
            } else {
                revert SwapActionNotSupported();
            }
        }

        uint256 amountOutEnd = IERC20(tokenOut_).balanceOf(recipient) - amountOutStart;

        emit Swap(tokenIn_, tokenOut_, amountIn, amountOutEnd, _msgSender());
    }

    function canSwap(
        address tokenIn,
        address tokenOut,
        uint256 amount
    ) public view returns (bool) {
        SwapAction[] memory actions = routes[tokenIn][tokenOut];
        return actions.length > 0 && amount > routeMinAmount[tokenIn];
    }

    function setRoute(
        address tokenIn,
        address tokenOut,
        SwapAction[] calldata actions
    ) external onlyOwner {
        delete routes[tokenIn][tokenOut];

        for (uint256 i = 0; i < actions.length; i++) {
            SwapAction calldata action = actions[i];
            require(action.actionType != 0, "VaultRewardSwapperV1: action type is invalid");
            routes[tokenIn][tokenOut].push(action);
        }

        emit RouteSet(tokenIn, tokenOut, actions);
    }

    function setMinAmount(
        address tokenIn,
        uint256 minAmount
    ) external onlyOwner {
        routeMinAmount[tokenIn] = minAmount;
        emit RouteMinAmountSet(tokenIn, minAmount);
    }

    function getRoute(
        address tokenIn,
        address tokenOut
    ) external view returns(SwapAction[] memory) {
        return routes[tokenIn][tokenOut];
    }

    function setAaveLendingPoolV3(address aaveLendingPoolV3_) external onlyOwner {
        aaveLendingPoolV3 = IAAVEV3(aaveLendingPoolV3_);
        emit AaveLendingPoolV3Set(aaveLendingPoolV3_);
    }

    function setJoeFactory(address joeFactory_) external onlyOwner {
        joeFactory = IJoeFactory(joeFactory_);
        emit JoeFactorySet(joeFactory_);
    }

    function setAllowance(
        address token,
        address spender,
        uint256 amount
    ) external onlyOwner {
        SafeERC20Upgradeable.safeApprove(IERC20Upgradeable(token), spender, amount);
    }

    function _swapJoePair(
        SwapAction memory action,
        uint256 amountIn,
        address recipient
    ) public returns (uint256) {
        address joePair = IJoeFactory(joeFactory).getPair(action.tokenIn, action.tokenOut);
        require(joePair != address(0), "VaultRewardSwapperV1: joe pair not found");
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(action.tokenIn), joePair, amountIn);
        uint256 amount0Out;
        uint256 amount1Out;
        (uint256 reserve0, uint256 reserve1, ) = IJoePair(joePair).getReserves();
        if (action.tokenIn < action.tokenOut) {
            // TokenIn=token0
            amount1Out = _getAmountOut(amountIn, reserve0, reserve1);
        } else {
            // TokenIn=token1
            amount0Out = _getAmountOut(amountIn, reserve1, reserve0);
        }
        uint256 amountOutBeforeSwap = IERC20(action.tokenOut).balanceOf(recipient);

        IJoePair(joePair).swap(amount0Out, amount1Out, recipient, new bytes(0));

        uint256 amountOut = IERC20(action.tokenOut).balanceOf(recipient) - amountOutBeforeSwap;
        return amountOut;
    }

    // source: UniswapV2Library.getAmountOut
    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, "UniswapV2Library: INSUFFICIENT_INPUT_AMOUNT");
        require(
            reserveIn > 0 && reserveOut > 0,
            "UniswapV2Library: INSUFFICIENT_LIQUIDITY"
        );
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    function _aaveV3Supply(SwapAction storage action, uint256 amount) internal returns (uint256) {
        aaveLendingPoolV3.supply(action.tokenIn, amount, _msgSender(), 0);
        return 0;
    }

    function _cMint(SwapAction storage action, uint256 amount) internal returns (uint256) {
        ICERC20(action.tokenOut).mint(amount);
        SafeERC20Upgradeable.safeTransfer(IERC20Upgradeable(action.tokenOut), _msgSender(), IERC20(action.tokenOut).balanceOf(address(this)));
        return 0;
    }
}
