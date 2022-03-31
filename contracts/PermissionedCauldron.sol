// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/ERC20.sol";
import "@boringcrypto/boring-solidity/contracts/interfaces/IMasterContract.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";
import "@sushiswap/bentobox-sdk/contracts/IBentoBoxV1.sol";
import "./NereusStableCoin.sol";
import "./interfaces/IOracle.sol";
import "./interfaces/ISwapper.sol";

import "./WhitelistManager.sol";
import "./CauldronV2.sol";



/// @title PermissionedCauldron
/// @dev This contract allows contract calls to any contract (except BentoBox)
/// from arbitrary callers thus, don't trust calls from this contract in any circumstances.
contract PermissionedCauldron is CauldronV2 {
    WhitelistManager public immutable whitelistManager;

    /// @notice The constructor is only used for the initial master contract. Subsequent clones are initialised via `init`.
    constructor(IBentoBoxV1 bentoBox_, IERC20 nereusStableCoin_, WhitelistManager whitelistManager_) CauldronV2(bentoBox_, nereusStableCoin_, whitelistManager_) public {
        whitelistManager = whitelistManager_;
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    /// @return part Total part of the debt held by borrowers.
    /// @return share Total amount in shares borrowed.

    function borrow(address to, uint256 amount) public override solvent returns (uint256 part, uint256 share) {
        if(whitelistManager.isEnable()) {
            (, bool isWhitelisted) = whitelistManager.info(msg.sender);
            require(isWhitelisted, "sender is not in whitelist");
        }
        accrue();
        (part, share) = _borrow(to, amount);
    }

    /// @notice Repays a loan.
    /// @param to Address of the user this payment should go.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `bentoBox` should be transferred.
    /// @param part The amount to repay. See `userBorrowPart`.
    /// @return amount The total amount repayed.
    function repay(
        address to,
        bool skim,
        uint256 part
    ) public override returns (uint256 amount) {
        if(whitelistManager.isEnable()) {
            (, bool isWhitelisted) = whitelistManager.info(msg.sender);
            require(isWhitelisted, "sender is not in whitelist");
        }
        accrue();
        amount = _repay(to, skim, part);
    }



    /// @dev Helper function for depositing into `bentoBox`.
    function _bentoDeposit(
        bytes memory data,
        uint256 value,
        uint256 value1,
        uint256 value2
    ) internal override returns (uint256, uint256) {
        if(whitelistManager.isEnable()) {
            (, bool isWhitelisted) = whitelistManager.info(msg.sender);
            require(isWhitelisted, "sender is not in whitelist");
        }
        (IERC20 token, address to, int256 amount, int256 share) = abi.decode(data, (IERC20, address, int256, int256));
        amount = int256(_num(amount, value1, value2)); // Done this way to avoid stack too deep errors
        share = int256(_num(share, value1, value2));
        return bentoBox.deposit{value: value}(token, msg.sender, to, uint256(amount), uint256(share));
    }

    /// @dev Helper function to withdraw from the `bentoBox`.
    function _bentoWithdraw(
        bytes memory data,
        uint256 value1,
        uint256 value2
    ) internal override returns  (uint256, uint256) {
        if(whitelistManager.isEnable()) {
            (, bool isWhitelisted) = whitelistManager.info(msg.sender);
            require(isWhitelisted, "sender is not in whitelist");
        }
        (IERC20 token, address to, int256 amount, int256 share) = abi.decode(data, (IERC20, address, int256, int256));
        return bentoBox.withdraw(token, msg.sender, to, _num(amount, value1, value2), _num(share, value1, value2));
    }
}
