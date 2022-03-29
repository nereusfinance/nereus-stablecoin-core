pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";

contract WhitelistManager is BoringOwnable {
    struct WhitelistInfo {
        uint index;
        bool isWhitelisted;
    }
    mapping(address => WhitelistInfo) public info;
    address[] public whitelistedAccounts;

    bool checkEnable = true;

    function permit(address _account) public onlyOwner {
        if (info[_account].isWhitelisted) {
            revert("Account is already whitelisted");
        }
        info[_account] = WhitelistInfo({index: whitelistedAccounts.length, isWhitelisted: true});
        whitelistedAccounts.push(_account);
    }

    function revoke(address _account) public onlyOwner {
        WhitelistInfo memory accountInfo = info[_account];

        if (accountInfo.index != whitelistedAccounts.length-1) {
            address last = whitelistedAccounts[whitelistedAccounts.length-1];
            WhitelistInfo storage infoLast = info[last];

            whitelistedAccounts[accountInfo.index] = last;
            infoLast.index = accountInfo.index;
        }

        delete info[_account];
        whitelistedAccounts.pop();
    }

    function getAllAccounts() public returns (address[] memory) {
        return whitelistedAccounts;
    }

    function isEnable() public returns (bool) {
        return checkEnable;
    }

    modifier isWhitelisted() {
        require(info[msg.sender].isWhitelisted, "sender is not in whitelist");
        _;
    }
}