const hre = require("hardhat");

async function main() {
  const lendingPool = '0xB9257597EDdfA0eCaff04FF216939FBc31AAC026';
  const controller = '0xa57a8C5dd29bd9CC605027E62935db2cB5485378';
  const params = {
    strategyToken: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', //WETH.e
    bentoBox: '0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775',
    strategyExecutor: '0xa18807e5B5C297e7aD5C254f6288f336Fe0972De',
    factory: '0xc35DADB65012eC5796536bD9864eD8773aBc74C4',
  };

  const [owner] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", owner.address);
  console.log("Account balance:", (await owner.getBalance()).toString());
  const AaveStrategy = await hre.ethers.getContractFactory("AaveStrategy");
  const aaveStrategy = await AaveStrategy.deploy(
    lendingPool,
    controller,
    params
  );
  await aaveStrategy.deployed();
  console.log("AaveStrategy deployed to:", aaveStrategy.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
