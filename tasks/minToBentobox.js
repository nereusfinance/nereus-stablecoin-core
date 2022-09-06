const { task } = require("hardhat/config");
const nxusdAbi = require("./abis/nxusdAbi.json");
const degenBoxAbi = require("./abis/degenBoxAbi.json");
const { TokenSymbol } = require("./data/TokenSymbol");

const ownerAddress = "0xdD3dE3B819EDD3a014fDA93868d7Dfc873341467";
const nxusdAddress = "0xf14f4ce569cb3679e99d5059909e23b07bd2f387";
const degenBoxAddress = "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775";

const cauldrons = {
  [TokenSymbol.USDC]: "0xD75a20314FB7FBE79EC7474497d5Bf09e9c00cfc",
  [TokenSymbol.av3CRV]: "0x8Fb8884C031c49038966a39895f0E141F1Ed14AD",
  [TokenSymbol.sAVAX]: "0x0194eB3520b7d7eB0b014FCe6ed464Eaea0Ca765",
  [TokenSymbol.JOE]: "0x5E1A0e4bfb9329513E62E4fc7DC7Ce8C3CbBE7c7",
  [TokenSymbol.LINKe]: "0x0207B99E529310Eb413254B4504FE3F4a509f717",
  [TokenSymbol.BTCb]: "0x13d370e3de628387FD27709aE9fA9Bc7d2bc9C29",
  [TokenSymbol.JLPWAVAXUSDC]: "0xC0A7a7F141b6A5Bce3EC1B81823c8AFA456B6930",
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

const mintToBentoBox = async (pool, amount, ethers) => {
  const cauldronAddress = cauldrons[pool];
  if (!cauldronAddress) {
    throw Error("cauldronAddress not found");
  }
  const utils = ethers.utils;
  const ownerSigner = await ethers.provider.getSigner(ownerAddress);
  const nusdContract = new ethers.Contract(
    nxusdAddress,
    JSON.stringify(nxusdAbi),
    ownerSigner
  );

  console.log(
    `cauldron ${cauldronAddress}(${pool}) balance of NXUSD before`,
    utils.formatEther(await cauldronBalance(cauldronAddress, ethers))
  );

  await (
    await nusdContract
      .connect(ownerSigner)
      .mintToBentoBox(
        cauldronAddress,
        utils.parseEther(amount),
        degenBoxAddress
      )
  ).wait();

  console.log(
    `cauldron ${cauldronAddress}(${pool}) balance of NXUSD after`,
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
