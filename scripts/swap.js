const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();

  const wavax = await ethers.getContractAt("WETH", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", user);
  const tx = await wavax.transfer("0xaAd9d30E43868e09777e0Ac090C7b8ffa583E942", '10000000000000000000');
  await tx.wait();

  const balanceSwapper = await wavax.balanceOf("0xaAd9d30E43868e09777e0Ac090C7b8ffa583E942");
  console.log('Swapper balance:', balanceSwapper);

  const swapper = await ethers.getContractAt("WAVAXNXUSDSwapper", "0xaAd9d30E43868e09777e0Ac090C7b8ffa583E942", user);
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
