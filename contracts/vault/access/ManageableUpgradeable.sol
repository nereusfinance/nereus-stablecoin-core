// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ManageableUpgradeable is OwnableUpgradeable {
    mapping(address => bool) public managers;

    event AddedManager(
        address manager
    );

    event RemovedManager(
        address manager
    );

    modifier onlyManager() {
        _onlyManager();
        _;
    }

    function _onlyManager() private view {
        require(
            managers[msg.sender] == true,
            "Only manager is allowed"
        );
    }

    function addManagers(address[] calldata managers_) public onlyOwner {
        for (uint256 i = 0; i < managers_.length; i++) {
            addManager(managers_[i]);
        }
    }

    function addManager(address manager) public onlyOwner {
        managers[manager] = true;
        emit AddedManager(manager);
    }

    function removeManager(address manager) public onlyOwner {
        managers[manager] = false;
        emit RemovedManager(manager);
    }
}
