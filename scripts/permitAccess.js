const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();
  console.log("user:", user.address);
  const whitelistManager = await hre.ethers.getContractAt(
    "WhitelistManager",
    "0x662e896e36e57606B0334708B366212c6fe0CAB6"
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
