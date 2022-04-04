const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  // You have to use your addresses of the deployed smart contracts in the necessary network here
  const avaxCauldron = "0xb2385F0eE59644BaC1FaC9945EE8B227aE7f995c"; //Avalanche Fuji deployed address
  const degenBox = "0xA0c72b19b0C22Ec026a0958F2BfF6f6b3beb1268"; //Avalanche Fuji deployed address
  const nusd = "0x58743aC84ea96d8091a51D00202B7eC02B78bEa5"; //Avalanche Fuji deployed address

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
