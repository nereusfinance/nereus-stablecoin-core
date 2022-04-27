const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0xf8a2cBC21f835015248468f56c83e006943cB9ec"],
  });

  const signer = await ethers.getSigner("0xf8a2cBC21f835015248468f56c83e006943cB9ec")

  const weth = await ethers.getContractAt("WETH", "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", signer);

  const balanceUserBefore = await weth.balanceOf("0xf8a2cBC21f835015248468f56c83e006943cB9ec");
  console.log('Balance user weth before', balanceUserBefore);

  const tx = await weth.transfer(user.address, '1000000000000000000000');
  await tx.wait();

  const wethBalance = await weth.balanceOf(user.address);
  console.log('user.address', user.address);
  console.log('My weth balance', wethBalance);

  const balanceUserAfter = await weth.balanceOf("0xf8a2cBC21f835015248468f56c83e006943cB9ec");
  console.log('Balance user weth after', balanceUserAfter);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
