pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";

contract LiquidatorManager is BoringOwnable {
    struct LiquidatorInfo {
        uint index;
        bool isApproved;
    }
    mapping(address => LiquidatorInfo) public liquidatorsInfo;
    address[] public liquidators;

    function setLiquidator(address _liquidator) public {
        if (liquidatorsInfo[_liquidator].isApproved) {
            revert("Liquidator was added");
        }
        liquidatorsInfo[_liquidator] = LiquidatorInfo({index: liquidators.length, isApproved: true});
        liquidators.push(_liquidator);
    }

    function removeLiquidator(address _liquidator) public {
        LiquidatorInfo memory info = liquidatorsInfo[_liquidator];

        if (info.index != liquidators.length-1) {
            address last = liquidators[liquidators.length-1];
            LiquidatorInfo storage infoLast = liquidatorsInfo[last];

            liquidators[info.index] = last;
            infoLast.index = info.index;
        }

        delete liquidatorsInfo[_liquidator];
        liquidators.pop();
    }

    function getAllLiquidators() public returns (address[] memory) {
        return liquidators;
    }
}