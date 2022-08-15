const { task } = require("hardhat/config");
const nxusdAbi = require("./abis/nxusdAbi.json");
const degenBoxAbi = require("./abis/degenBoxAbi.json");
const { TokenSymbol } = require("./data/TokenSymbol");

const ownerAddress = "0xdD3dE3B819EDD3a014fDA93868d7Dfc873341467";
const nxusdAddress = "0xf14f4ce569cb3679e99d5059909e23b07bd2f387";
const degenBoxAddress = "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775";

const cauldrons = {
  [TokenSymbol.USDC]: "0x55893534b8e6343F726a012D99524146eFb46688",
  [TokenSymbol.av3CRV]: "0x22097ED0Bb12E741e0A832d510A9b3CB596B16e2",
  [TokenSymbol.sAVAX]: "0x8a0DBf7072A59d70EA59B3EDDB72764437CF06b2",
  [TokenSymbol.JOE]: "0x8598Ea8f5672Fa133C3abbE6b73d7a9E58e74882",
  [TokenSymbol.LINKe]: "0x7E15B17Ed0945d320030031eB3E2A473E288452b",
  [TokenSymbol.BTCb]: "0x13d370e3de628387FD27709aE9fA9Bc7d2bc9C29",
  [TokenSymbol.JLPWAVAXUSDC]: "0x43aa6Fb5E7adAdd2Cb9c17AE5A5133f2bDA37EDD",
};

task("mint-to-bentobox", "Mint NXUSD to BentoBox for Cauldrons").setAction(
  async (taskArgs, { ethers }) => {
    await ethers.provider.send("hardhat_impersonateAccount", [ownerAddress]);
    await ethers.provider.send("hardhat_setBalance", [
      ownerAddress,
      ethers.utils.hexValue(ethers.utils.parseEther("100")),
    ]);

    await mintToBentoBox(cauldrons[TokenSymbol.USDC], "100000", ethers);
    await mintToBentoBox(cauldrons[TokenSymbol.av3CRV], "100000", ethers);
    await mintToBentoBox(cauldrons[TokenSymbol.sAVAX], "100000", ethers);
    await mintToBentoBox(cauldrons[TokenSymbol.JOE], "100000", ethers);
    await mintToBentoBox(cauldrons[TokenSymbol.LINKe], "100000", ethers);
    await mintToBentoBox(cauldrons[TokenSymbol.BTCb], "100000", ethers);
    await mintToBentoBox(cauldrons[TokenSymbol.JLPWAVAXUSDC], "100000", ethers);

    await ethers.provider.send("hardhat_stopImpersonatingAccount", [
      ownerAddress,
    ]);
  }
);

const mintToBentoBox = async (cauldronAddress, amount, ethers) => {
  const utils = ethers.utils;
  const ownerSigner = await ethers.provider.getSigner(ownerAddress);
  const nusdContract = new ethers.Contract(
    nxusdAddress,
    JSON.stringify(nxusdAbi),
    ownerSigner
  );

  console.log(
    `cauldron ${cauldronAddress} balance of NXUSD before`,
    utils.formatEther(await cauldronBalance(cauldronAddress, ethers))
  );

  await nusdContract
    .connect(ownerSigner)
    .mintToBentoBox(cauldronAddress, utils.parseEther(amount), degenBoxAddress);

  console.log(
    `cauldron ${cauldronAddress} balance of NXUSD after`,
    utils.formatEther(await cauldronBalance(cauldronAddress, ethers))
  );
};

const cauldronBalance = async (cauldronAddress, ethers) => {
  const degenBoxContract = new ethers.Contract(
    degenBoxAddress,
    JSON.stringify(degenBoxAbi),
    ethers.provider
  );

  return degenBoxContract.balanceOf(nxusdAddress, cauldronAddress);
};
