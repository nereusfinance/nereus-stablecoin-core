// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol";
import "../../interfaces/ISwapperGeneric.sol";
import "hardhat/console.sol";

interface CurvePool {
  function exchange_underlying(int128 i, int128 j, uint256 dx, uint256 min_dy, address receiver) external returns (uint256);
  function approve(address _spender, uint256 _value) external returns (bool);
  function remove_liquidity_one_coin(uint256 tokenAmount, int128 i, uint256 min_amount) external;
}

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

contract WETHNXUSDSwapper is ISwapperGeneric {
    IBentoBoxV1 public constant degenBox = IBentoBoxV1(0x3c4479f3274113dd44F770632cC89F4AdDf33617);

    CurvePool public constant NXUSD3POOL = CurvePool(0x6BF6fc7EaF84174bb7e1610Efd865f0eBD2AA96D);
    Zap public constant ZAP3POOL = Zap(0x001E3BA199B4FF4B5B6e97aCD96daFC0E2e4156e);

    IERC20 public constant WETHe = IERC20(0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB);
    IERC20 public constant USDCe = IERC20(0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664);

    IUniswapV2Pair public constant WETHe_USDCe = IUniswapV2Pair(0x199fb78019A08af2Cb6a078409D0C8233Eba8a0c);

    constructor() {
      USDCe.approve(address(ZAP3POOL), type(uint256).max);
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
      IERC20 fromToken,
      IERC20 toToken,
      address recipient,
      uint256 shareToMin,
      uint256 shareFrom
  ) public override returns (uint256 extraShare, uint256 shareReturned) {

      (uint256 amountFrom, ) = degenBox.withdraw(fromToken, address(this), address(this), 0, shareFrom);

//      WETH.e => USDC.e
      traderJoeSwap(WETHe, WETHe_USDCe);

      uint256 usdceAmount = USDCe.balanceOf(address(this));

//      USDC.e => NXUSD
      uint256 toAmount = ZAP3POOL.exchange_underlying(address(NXUSD3POOL), 2, 0, usdceAmount, 0, recipient);

      (, shareReturned) = degenBox.deposit(toToken, address(degenBox), recipient, amountTo, 0);
      extraShare = shareReturned.sub(shareToMin);
    }

    function traderJoeSwap(IERC20 token, IUniswapV2Pair pool) internal {
      uint256 tokenAmount = token.balanceOf(address(this));
      (uint256 reserve0, uint256 reserve1, ) = pool.getReserves();
      uint256 fromFirstTokenToSecond = _getAmountOut(tokenAmount, reserve0, reserve1);
      token.transfer(address(pool), tokenAmount);
      pool.swap(0, fromFirstTokenToSecond, address(this), new bytes(0));
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
