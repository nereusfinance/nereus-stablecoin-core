const { TokenSymbol } = require("./data/TokenSymbol");
const { task } = require("hardhat/config");
const usdcAbi = require("./abis/usdcAbi.json");
const erc20Abi = require("./abis/erc20Abi.json");
const sAvaxAbi = require("./abis/sAvaxAbi.json");

task("top-up-test-tokens", "Mint NXUSD to BentoBox for Cauldrons")
  .addParam("user", "User address")
  .setAction(async ({ user: userAddress }, { ethers }) => {
    await erc20TopUp(userAddress, "1000", TokenSymbol.NXUSD, ethers);
    await erc20TopUp(userAddress, "500", TokenSymbol.USDC, ethers);
    await erc20TopUp(userAddress, "500", TokenSymbol.av3CRV, ethers);
    await erc20TopUp(userAddress, "500", TokenSymbol.sAVAX, ethers);
    await erc20TopUp(userAddress, "500", TokenSymbol.JOE, ethers);
    await erc20TopUp(userAddress, "500", TokenSymbol.LINKe, ethers);
    await erc20TopUp(userAddress, "5", TokenSymbol.BTCb, ethers);
    await erc20TopUp(userAddress, "0.001", TokenSymbol.JLPWAVAXUSDC, ethers);
  });

const config = {
  [TokenSymbol.USDC]: {
    tokenAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    abi: usdcAbi,
    sourceAddress: "0x42d6ce661bb2e5f5cc639e7befe74ff9fd649541",
    decimals: 6,
  },
  [TokenSymbol.av3CRV]: {
    tokenAddress: "0x1337BedC9D22ecbe766dF105c9623922A27963EC",
    sourceAddress: "0x654296d56532f62b7d91d335791d3c364a9385b5",
    decimals: 18,
    abi: erc20Abi,
  },
  [TokenSymbol.sAVAX]: {
    tokenAddress: "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE",
    sourceAddress: "0xc73df1e68fc203f6e4b6270240d6f82a850e8d38",
    decimals: 18,
    abi: sAvaxAbi,
  },
  [TokenSymbol.JOE]: {
    tokenAddress: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
    sourceAddress: "0x279f8940ca2a44c35ca3edf7d28945254d0f0ae6",
    decimals: 18,
    abi: erc20Abi,
  },
  [TokenSymbol.LINKe]: {
    tokenAddress: "0x5947BB275c521040051D82396192181b413227A3",
    sourceAddress: "0x6f3a0c89f611ef5dc9d96650324ac633d02265d3",
    decimals: 18,
    abi: erc20Abi,
  },
  [TokenSymbol.NXUSD]: {
    tokenAddress: "0xF14f4CE569cB3679E99d5059909E23B07bd2F387",
    sourceAddress: "0x5a7a792d70d1ea39708b9ad9531069e73795c6a4",
    decimals: 18,
    abi: erc20Abi,
  },
  [TokenSymbol.WETHe]: {
    tokenAddress: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    sourceAddress: "0x53f7c5869a859f0aec3d334ee8b4cf01e3492f21",
    decimals: 18,
    abi: erc20Abi,
  },
  [TokenSymbol.BTCb]: {
    tokenAddress: "0x152b9d0FdC40C096757F570A51E494bd4b943E50",
    sourceAddress: "0x2fd81391e30805cc7f2ec827013ce86dc591b806",
    decimals: 8,
    abi: erc20Abi,
  },
  [TokenSymbol.JLPWAVAXUSDC]: {
    tokenAddress: "0xf4003F4efBE8691B60249E6afbD307aBE7758adb",
    sourceAddress: "0xbecb0c28c4a9358e987c2916dc088df12374f036",
    decimals: 18,
    abi: erc20Abi,
  },
};

const erc20TopUp = async (address, amount, symbol, ethers) => {
  const utils = ethers.utils;
  if (!config[symbol]) {
    throw Error(`Token symbol ${symbol} is not configured`);
  }

  const { tokenAddress, abi, sourceAddress, decimals } = config[symbol];
  await ethers.provider.send("hardhat_impersonateAccount", [sourceAddress]);
  await ethers.provider.send("hardhat_setBalance", [
    sourceAddress,
    utils.hexValue(utils.parseEther("100")),
  ]);
  const richSigner = ethers.provider.getSigner(sourceAddress);

  const erc20Contract = new ethers.Contract(
    tokenAddress,
    JSON.stringify(abi),
    richSigner
  );
  console.log(
    `${symbol} sourceAddress ${sourceAddress} balance`,
    utils.formatUnits(await erc20Contract.balanceOf(sourceAddress), decimals)
  );

  console.log(
    `${symbol} address ${address} balance before`,
    utils.formatUnits(await erc20Contract.balanceOf(address), decimals)
  );

  await erc20Contract.transfer(address, utils.parseUnits(amount, decimals));

  console.log(
    `${symbol} address ${address} balance after`,
    utils.formatUnits(await erc20Contract.balanceOf(address), decimals)
  );
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [
    sourceAddress,
  ]);
};
