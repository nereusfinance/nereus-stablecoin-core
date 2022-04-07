const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  // You have to use your addresses of the deployed smart contracts in the necessary network here
  const avaxCauldron = "0x3909683B2e3A3c56ba7Ec984F54aFCbD90aBCE95"; //Avalanche Fuji deployed address
  const degenBox = "0x57c5e7E753239f5260FE7C376De4f5813C61Ceb1"; //Avalanche Fuji deployed address
  const nusd = "0xf3630877aA6d47646112D006369C3ba538cC1b8A"; //Avalanche Fuji deployed address

  const nusdContract = (await hre.ethers.getContractAt("NXUSD", nusd)).connect(
    owner
  );

  const txNUSD = await nusdContract.mintToBentoBox(
    avaxCauldron,
    hre.ethers.utils.parseEther("1000000"),
    degenBox
  );
  await txNUSD.wait();

  const balance = await nusdContract.balanceOf(degenBox);
  console.log("degen box balance", balance);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
