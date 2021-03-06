// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Factory.sol";
import "@sushiswap/core/contracts/uniswapv2/interfaces/IUniswapV2Pair.sol";
import "../../interfaces/ISwapperGeneric.sol";

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

contract DAINXUSDSwapper is ISwapperGeneric {
    IBentoBoxV1 public constant degenBox = IBentoBoxV1(0x3c4479f3274113dd44F770632cC89F4AdDf33617);

    address  public constant NXUSD3POOL = 0x6BF6fc7EaF84174bb7e1610Efd865f0eBD2AA96D;
    Zap public constant ZAP3POOL = Zap(0x001E3BA199B4FF4B5B6e97aCD96daFC0E2e4156e);

    IERC20 public constant DAIe = IERC20(0xd586E7F844cEa2F87f50152665BCbc2C279D8d70);
    IERC20 public constant NXUSD = IERC20(0xF14f4CE569cB3679E99d5059909E23B07bd2F387);

    constructor() {
        DAIe.approve(address(ZAP3POOL), type(uint256).max);
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
        IERC20 ,
        IERC20 ,
        address recipient,
        uint256 shareToMin,
        uint256 shareFrom
    ) public override returns (uint256 extraShare, uint256 shareReturned) {

        (uint256 amountFrom, ) = degenBox.withdraw(DAIe, address(this), address(this), 0, shareFrom);

        uint256 DAIeAmount = DAIe.balanceOf(address(this));

        //      DAIe.e => NXUSD
        uint256 amountTo = ZAP3POOL.exchange_underlying(NXUSD3POOL, 1, 0, DAIeAmount, 0, recipient);

        (, shareReturned) = degenBox.deposit(NXUSD, address(degenBox), recipient, amountTo, 0);

        extraShare = shareReturned - shareToMin;
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