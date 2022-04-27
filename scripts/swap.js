const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();

  const weth = await ethers.getContractAt("WETH", "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", user);
  const tx = await weth.transfer("0xaAd9d30E43868e09777e0Ac090C7b8ffa583E942", '10000000000000000000');
  await tx.wait();

  const balanceSwapper = await weth.balanceOf("0xaAd9d30E43868e09777e0Ac090C7b8ffa583E942");
  console.log('Swapper balance:', balanceSwapper);

  const swapper = await ethers.getContractAt("WETHNXUSDSwapper", "0xaAd9d30E43868e09777e0Ac090C7b8ffa583E942", user);
  await swapper.swap(
    "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    "0xa18807e5B5C297e7aD5C254f6288f336Fe0972De",
    0,
    0
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
