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
import "./PermissionManager.sol";
import "./CauldronV2.sol";


/// @title PermissionedCauldron
/// @dev This contract allows contract calls to any contract (except BentoBox)
/// from arbitrary callers thus, don't trust calls from this contract in any circumstances.
contract PermissionedCauldron is CauldronV2 {

    function setManagerAddress(address contract_address) public onlyOwner returns (address){
        address manager_address = contract_address;
        return manager_address;
    }
    WhitelistManager whitelistManager = WhitelistManager(setManagerAddress(0x9eB1307133996D4b5b264EAcd4d70F964D7F6a0F));

    /// @notice The constructor is only used for the initial master contract. Subsequent clones are initialised via `init`.
    constructor(IBentoBoxV1 bentoBox_, IERC20 nereusStableCoin_, PermissionManager permissionManager) CauldronV2(bentoBox_, nereusStableCoin_, permissionManager) public {
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
