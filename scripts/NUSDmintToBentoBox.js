const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  // You have to use your addresses of the deployed smart contracts here
  const avaxCauldron = "0x3581559DaA31DD3113E9dd338323Fca6c1215EFF";
  const degenBox = "0x4cA5dD575DacE76781C41cafe68281dfc4dF0038";
  const nusd = "0x83A90d53dbc9a55888333224ca6C8210A3a7bDef";

  const nusdContract = (
    await hre.ethers.getContractAt("NereusStableCoin", nusd)
  ).connect(owner);

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
