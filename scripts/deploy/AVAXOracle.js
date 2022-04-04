const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", owner.address);
  console.log("Account balance:", (await owner.getBalance()).toString());
  const AVAXOracle = await hre.ethers.getContractFactory("AVAXOracle");
  const avaxOracle = await AVAXOracle.deploy();
  await avaxOracle.deployed();
  console.log("AVAXOracle deployed to:", avaxOracle.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
