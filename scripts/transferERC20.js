const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();
  const senderAddress = "0x1d915bb031cff61a563174fd6ca93c39fa48803f";
  console.log("user:", user.address);
  const erc20 = await hre.ethers.getContractAt(
    "ERC20",
    "0xfcDe4A87b8b6FA58326BB462882f1778158B02F1"
  );
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [senderAddress],
  });
  const sender = await hre.ethers.getSigner(senderAddress);
  const balance = await erc20.balanceOf(sender.address);
  console.log("balance", String(balance));
  const tx = await erc20.connect(sender).transfer(user.address, balance);
  await tx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
