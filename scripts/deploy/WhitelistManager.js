const hre = require("hardhat");

async function main() {
    const [owner] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", owner.address);
    console.log("Account balance:", (await owner.getBalance()).toString());
    const WhitelistManager = await hre.ethers.getContractFactory("WhitelistManager");
    const whitelistManager = await WhitelistManager.deploy();
    await whitelistManager.deployed();
    console.log("WhitelistManager deployed to:", whitelistManager.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});