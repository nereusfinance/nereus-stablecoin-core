const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0x43BEddB3199F2a635C85FfC4f1af228198D268Ab"],
  });

  const signer = await ethers.getSigner("0x43BEddB3199F2a635C85FfC4f1af228198D268Ab")

  const wavax = await ethers.getContractAt("WETH", "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", signer);

  const balanceUserBefore = await wavax.balanceOf("0x43BEddB3199F2a635C85FfC4f1af228198D268Ab");
  console.log('Balance user wavax before', balanceUserBefore);

  const tx = await wavax.transfer(user.address, '1000000000000000000000');
  await tx.wait();

  const wavaxBalance = await wavax.balanceOf(user.address);
  console.log('user.address', user.address);
  console.log('My wavax balance', wavaxBalance);

  const balanceUserAfter = await wavax.balanceOf("0x43BEddB3199F2a635C85FfC4f1af228198D268Ab");
  console.log('Balance user wavax after', balanceUserAfter);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
