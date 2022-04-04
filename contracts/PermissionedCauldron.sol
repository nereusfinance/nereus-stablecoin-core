// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;
import "@sushiswap/bentobox-sdk/contracts/IBentoBoxV1.sol";
import "./WhitelistManager.sol";
import "./PermissionManager.sol";
import "./CauldronV2.sol";


/// @title PermissionedCauldron
/// @dev This contract allows contract calls to any contract (except BentoBox)
/// from arbitrary callers thus, don't trust calls from this contract in any circumstances.
contract PermissionedCauldron is CauldronV2 {

    WhitelistManager public immutable whitelistManager;

    /// @notice The constructor is only used for the initial master contract. Subsequent clones are initialised via `init`.
    constructor(IBentoBoxV1 bentoBox_, IERC20 nxusd_, PermissionManager permissionManager, WhitelistManager whitelistManager_) CauldronV2(bentoBox_, nxusd_, permissionManager) public {
      whitelistManager = whitelistManager_;
    }

    /// @notice Sender borrows `amount` and transfers it to `to`.
    function borrow(address to, uint256 amount) public override solvent returns (uint256 part, uint256 share) {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        return super.borrow(to, amount);
    }

    function accrue() public override {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        super.accrue();
    }

    function updateExchangeRate() public override returns (bool updated, uint256 rate) {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        return super.updateExchangeRate();
    }

    function addCollateral(
        address to,
        bool skim,
        uint256 share
    ) public override {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        super.addCollateral(to, skim, share);
    }

    /// @notice Repays a loan.
    function repay(
        address to,
        bool skim,
        uint256 part
    ) public override returns (uint256 amount) {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        return super.repay(to, skim, part);
    }


    /// @notice Removes `share` amount of collateral and transfers it to `to`.
    /// @param to The receiver of the shares.
    /// @param share Amount of shares to remove.
    function removeCollateral(address to, uint256 share) public override solvent {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        super.removeCollateral(to, share);
    }

    function cook(
        uint8[] calldata actions,
        uint256[] calldata values,
        bytes[] calldata datas
    ) public override payable returns (uint256 value1, uint256 value2) {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        return super.cook(actions, values, datas);
    }

    /// @notice Withdraws the fees accumulated.
    function withdrawFees() public override {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        super.withdrawFees();
    }

    /// @notice Sets the beneficiary of interest accrued.
    /// MasterContract Only Admin function.
    function setFeeTo(address newFeeTo) public override onlyOwner {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        setFeeTo(newFeeTo);
    }

    /// @notice reduces the supply of NUSD
    function reduceSupply(uint256 amount) public override {
        if (whitelistManager.isEnable()) {
            (, bool isEnable) = whitelistManager.info(msg.sender);
            require(isEnable, "sender is not in whitelist");
        }
        super.reduceSupply(amount);
    }
}
