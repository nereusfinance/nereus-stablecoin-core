const hre = require("hardhat");

async function main() {
  const whitelistManager = await hre.ethers.getContractAt(
    "WhitelistManager",
    "0xBe7aaef41e97926B042832FCd17e62a9CfE9C3c1"
  );
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0xdD3dE3B819EDD3a014fDA93868d7Dfc873341467"],
  });
  const owner = await hre.ethers.getSigner(
    "0xdD3dE3B819EDD3a014fDA93868d7Dfc873341467"
  );
  const tx = await whitelistManager.connect(owner).permit(user.address);
  await tx.wait();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
