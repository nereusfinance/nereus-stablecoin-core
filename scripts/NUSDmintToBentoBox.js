const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();

  // You have to use your addresses of the deployed smart contracts in the necessary network here
  const avaxCauldron = "0xD72B033604ee6CBfB6C50eE9178C2Ba5f7D25B8a"; //Avalanche Fuji deployed address
  const degenBox = "0x3c4479f3274113dd44F770632cC89F4AdDf33617"; //Avalanche Fuji deployed address
  const nusd = "0x08Ccc70e9D460e8EbD9D384e261CDEDAe68F1E41"; //Avalanche Fuji deployed address

  const nusdContract = (await hre.ethers.getContractAt("NXUSD", nusd)).connect(
    owner
  );

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
