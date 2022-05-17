const hre = require("hardhat");
const {ethers} = require("hardhat");

async function main() {
  const aTokenAddress = '0x92F79834fC52f0Aa328f991C91185e081ea4f957';
  const wetheAddress = '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB';
  const addressForCheck = '0xDD96289d27DD58566485EA6BdE21C1Fe48406EDf';
  const Atoken = await ethers.getContractAt("WETH", aTokenAddress);
  const wethe = await ethers.getContractAt("WETH", wetheAddress);
  const balance = await Atoken.balanceOf(addressForCheck);
  const availableWethe = await wethe.balanceOf(aTokenAddress);
  console.log('Balance aToken:', balance);
  console.log('Available WETH.e:', availableWethe);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
