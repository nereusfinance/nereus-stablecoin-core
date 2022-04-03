const hre = require("hardhat");

async function main() {
    const [owner] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", owner.address);
    console.log("Account balance:", (await owner.getBalance()).toString());
    const PermissionManager = await hre.ethers.getContractFactory("PermissionManager");
    const permissionManager = await PermissionManager.deploy();
    await permissionManager.deployed();
    console.log("PermissionManager deployed to:", permissionManager.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});