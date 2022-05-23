pragma solidity ^0.8.0;

// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol";
import "../../interfaces/ISwapperGeneric.sol";

interface Zap {
    function exchange_underlying(address _pool, int128 i, int128 j, uint256 dx, uint256 min_dy, address receiver) external returns (uint256);
}

interface IBentoBoxV1 {
    function withdraw(
        IERC20 token,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) external returns (uint256, uint256);

    function deposit(
        IERC20 token,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) external returns (uint256, uint256);
}

contract NXUSDWETHSwapper is ISwapperGeneric {
    IBentoBoxV1 public constant DEGENBOX = IBentoBoxV1(0x3c4479f3274113dd44F770632cC89F4AdDf33617);

    address public constant NXUSD3POOL = 0x6BF6fc7EaF84174bb7e1610Efd865f0eBD2AA96D;
    Zap public constant ZAP3POOL = Zap(0x001E3BA199B4FF4B5B6e97aCD96daFC0E2e4156e);

    IERC20 public constant WETH = IERC20(0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB);
    IERC20 public constant USDCe = IERC20(0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664);
    IERC20 public constant NXUSD = IERC20(0xF14f4CE569cB3679E99d5059909E23B07bd2F387);

    IUniswapV2Pair public constant WETH_USDCe = IUniswapV2Pair(0x199fb78019A08af2Cb6a078409D0C8233Eba8a0c);

    constructor() {
        NXUSD.approve(address(ZAP3POOL), type(uint256).max);
    }

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @inheritdoc ISwapperGeneric
    function swap(
        IERC20,
        IERC20,
        address recipient,
        uint256 shareToMin,
        uint256 shareFrom
    ) public override returns (uint256 extraShare, uint256 shareReturned) {
        (uint256 amountFrom,) = DEGENBOX.withdraw(NXUSD, address(this), address(this), 0, shareFrom);

        //       NXUSD => USDC.e

        uint256 usdceAmount = ZAP3POOL.exchange_underlying(NXUSD3POOL, 0, 2, amountFrom, 0, address(this));

        //      USDC.e => WETH
        _traderJoeSwap(USDCe, WETH_USDCe, usdceAmount);

        uint256 wethAmount = WETH.balanceOf(address(this));

        (, shareReturned) = DEGENBOX.deposit(WETH, address(this), recipient, wethAmount, 0);
        extraShare = shareReturned - shareToMin;
    }

    function _traderJoeSwap(IERC20 token, IUniswapV2Pair pool, uint256 tokenAmount) private {
        (uint256 reserve0, uint256 reserve1,) = pool.getReserves();
        uint256 fromSecondTokenToFirst = _getAmountOut(tokenAmount, reserve1, reserve0);
        token.transfer(address(pool), tokenAmount);
        pool.swap(fromSecondTokenToFirst, 0, address(this), new bytes(0));
    }

    /// @inheritdoc ISwapperGeneric
    function swapExact(
        IERC20,
        IERC20,
        address,
        address,
        uint256,
        uint256
    ) public override returns (uint256 shareUsed, uint256 shareReturned) {
        return (0, 0);
    }
}
