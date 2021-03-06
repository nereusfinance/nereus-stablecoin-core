// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol";

interface IERC20 {
    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice EIP 2612
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
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

contract NXUSDWAVAXSwapper {
    IBentoBoxV1 public constant DEGENBOX = IBentoBoxV1(0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775);

    address public constant NXUSD3POOL = 0x6BF6fc7EaF84174bb7e1610Efd865f0eBD2AA96D;
    Zap public constant ZAP3POOL = Zap(0x001E3BA199B4FF4B5B6e97aCD96daFC0E2e4156e);

    IERC20 public constant WAVAX = IERC20(0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7);
    IERC20 public constant USDTe = IERC20(0xc7198437980c041c805A1EDcbA50c1Ce5db95118);
    IERC20 public constant NXUSD = IERC20(0xF14f4CE569cB3679E99d5059909E23B07bd2F387);

    IUniswapV2Pair public constant WAVAX_USDTe = IUniswapV2Pair(0xeD8CBD9F0cE3C6986b22002F03c6475CEb7a6256);

    constructor() {
        NXUSD.approve(address(ZAP3POOL), type(uint256).max);
        WAVAX.approve(address(DEGENBOX), type(uint256).max);
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

    function swap(
        address recipient,
        uint256 shareToMin,
        uint256 shareFrom
    ) public returns (uint256 extraShare, uint256 shareReturned) {
        (uint256 amountFrom, ) = DEGENBOX.withdraw(NXUSD, address(this), address(this), 0, shareFrom);

        //       NXUSD => USDT.e

        uint256 usdteAmount = ZAP3POOL.exchange_underlying(NXUSD3POOL, 0, 3, amountFrom, 0, address(this));
        //      USDT.e => WAVAX
        _traderJoeSwap(USDTe, WAVAX_USDTe, usdteAmount);

        uint256 wavaxAmount = WAVAX.balanceOf(address(this));

       (, shareReturned) = DEGENBOX.deposit(WAVAX, address(this), recipient, wavaxAmount, 0);
        extraShare = shareReturned - shareToMin;
    }

    function _traderJoeSwap(IERC20 token, IUniswapV2Pair pool, uint256 tokenAmount) private {
        (uint256 reserve0, uint256 reserve1, ) = pool.getReserves();
        uint256 fromSecondTokenToFirst = _getAmountOut(tokenAmount, reserve1, reserve0);
        token.transfer(address(pool), tokenAmount);
        pool.swap(fromSecondTokenToFirst, 0, address(this), new bytes(0));
    }
}
