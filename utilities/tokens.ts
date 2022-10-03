import { ChainId } from "./chains"
import usdcAbi from "./abis/usdcAbi.json"
import erc20Abi from "./abis/erc20Abi.json"
import sAvaxAbi from "./abis/sAvaxAbi.json"
import aTokenAbi from "./abis/aTokenAbi.json"
import qiTokenAbi from "./abis/qiTokenAbi.json"
import benQiAbi from "./abis/benQiAbi.json"
import nxusdAbi from "./abis/nxusdAbi.json"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { IERC20Metadata } from "../typechain"
import { Contract } from "ethers"

export enum TokenSymbol {
  AVAX = "AVAX",
  WAVAX = "WAVAX",
  WETH = "WETH",
  NXUSD = "NXUSD",
  WETHe = "WETHe",
  USDC = "USDC",
  av3CRV = "av3CRV",
  sAVAX = "sAVAX",
  JOE = "JOE",
  LINKe = "LINKe",
  WBTC = "WBTC",
  BTCb = "BTCb",
  WXT = "WXT",
  JLPWAVAXUSDC = "JLPWAVAXUSDC",
  aAvaWAVAX = "aAvaWAVAX",
  aAvaUSDT = "aAvaUSDT",
  aAvaUSDC = "aAvaUSDC",
  aAvaDAI = "aAvaDAI",
  USDt = "USDt",
  qiDai = "qiDai",
  qiAvax = "qiAvax",
  qiUSDCn = "qiUSDCn",
  qiDAI = "qiDAI",
  DAIe = "DAIe",
  BenQi = "BenQi",
}
export const tokens = {
  [ChainId.Avalanche]: {
    [TokenSymbol.WAVAX]: {
      tokenAddress: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      abi: erc20Abi,
      sourceAddress: "0xf4003f4efbe8691b60249e6afbd307abe7758adb",
      decimals: 18,
    },
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
      abi: nxusdAbi,
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
    [TokenSymbol.WBTC]: {
      tokenAddress: "0x50b7545627a5162F82A992c33b87aDc75187B218",
      sourceAddress: "0xc09c12093b037866bf68c9474ecdb5113160fbce",
      decimals: 8,
      abi: erc20Abi,
    },
    [TokenSymbol.JLPWAVAXUSDC]: {
      tokenAddress: "0xf4003F4efBE8691B60249E6afbD307aBE7758adb",
      sourceAddress: "0x8a5658c67c5a28885e8dac103b3400b186025e93",
      decimals: 18,
      abi: erc20Abi,
    },
    [TokenSymbol.WXT]: {
      tokenAddress: "0xfcDe4A87b8b6FA58326BB462882f1778158B02F1",
      sourceAddress: "0xe195b82df6a797551eb1acd506e892531824af27",
      decimals: 18,
      abi: erc20Abi,
    },
    [TokenSymbol.aAvaWAVAX]: {
      tokenAddress: "0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97",
      sourceAddress: "0xaac0f2d0630d1d09ab2b5a400412a4840b866d95",
      decimals: 18,
      abi: aTokenAbi,
    },
    [TokenSymbol.aAvaUSDT]: {
      tokenAddress: "0x6ab707Aca953eDAeFBc4fD23bA73294241490620",
      sourceAddress: "0x6946b0527421b72df7a5f0c0c7a1474219684e8f",
      decimals: 6,
      abi: aTokenAbi,
    },
    [TokenSymbol.aAvaUSDC]: {
      tokenAddress: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
      sourceAddress: "0x733ee5446711e06612b66d5bfc292533bf620f24",
      decimals: 6,
      abi: aTokenAbi,
    },
    [TokenSymbol.aAvaDAI]: {
      tokenAddress: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
      sourceAddress: "0x50b1ba98cf117c9682048d56628b294ebbaa4ec2",
      decimals: 18,
      abi: aTokenAbi,
    },
    [TokenSymbol.USDt]: {
      tokenAddress: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      sourceAddress: "0x279f8940ca2a44c35ca3edf7d28945254d0f0ae6",
      decimals: 6,
      abi: aTokenAbi,
    },
    [TokenSymbol.DAIe]: {
      tokenAddress: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
      sourceAddress: "0x47afa96cdc9fab46904a55a6ad4bf6660b53c38a",
      decimals: 18,
      abi: erc20Abi,
    },
    [TokenSymbol.qiDai]: {
      tokenAddress: "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D",
      sourceAddress: "0xe1076ff8b7d61b2084054c238860ec7aa9a9f9b3",
      decimals: 8,
      abi: qiTokenAbi,
    },
    [TokenSymbol.qiAvax]: {
      tokenAddress: "0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c",
      sourceAddress: "0x8b414448de8b609e96bd63dcf2a8adbd5ddf7fdd",
      decimals: 8,
      abi: qiTokenAbi,
    },
    [TokenSymbol.qiUSDCn]: {
      tokenAddress: "0xB715808a78F6041E46d61Cb123C9B4A27056AE9C",
      sourceAddress: "0xd620aadabaa20d2af700853c4504028cba7c3333",
      decimals: 8,
      abi: qiTokenAbi,
    },
    [TokenSymbol.qiDAI]: {
      tokenAddress: "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D",
      sourceAddress: "0xcf1347dad4dd90fa73448d191950639c657ff0e2",
      decimals: 8,
      abi: qiTokenAbi,
    },
    [TokenSymbol.BenQi]: {
      tokenAddress: "0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5",
      sourceAddress: "0x142eb2ed775e6d497aa8d03a2151d016bbfe7fc2",
      decimals: 18,
      abi: benQiAbi,
    },
  },
}

export const getTokenData = (chainId: unknown, symbol: TokenSymbol) => {
  const token = tokens[chainId as ChainId][symbol]
  if (!token) {
    throw Error(`Token ${chainId}.${symbol} not found`)
  }

  return token
}

export async function getTokenContract<T extends Contract = IERC20Metadata>(
  chainId: unknown,
  symbol: TokenSymbol,
  { ethers }: HardhatRuntimeEnvironment
): Promise<T> {
  const tokenData = getTokenData(chainId, symbol)
  const contract = await ethers.getContractAt<T>(tokenData.abi, tokenData.tokenAddress)

  return contract as T
}

export const avaxTopUp = async (address, amount, { ethers }) => {
  console.log(
    `AVAX address ${address} balance before`,
    ethers.utils.formatEther(await ethers.provider.getBalance(address))
  )
  await ethers.provider.send("hardhat_setBalance", [
    address,
    ethers.utils.hexValue(ethers.utils.parseEther(amount)),
  ])
  console.log(
    `AVAX address ${address} balance after`,
    ethers.utils.formatEther(await ethers.provider.getBalance(address))
  )
}

export const erc20TopUp = async (address, amount, symbol, { ethers }) => {
  const utils = ethers.utils
  const { tokenAddress, abi, sourceAddress, decimals } = getTokenData(ChainId.Avalanche, symbol)
  await ethers.provider.send("hardhat_impersonateAccount", [sourceAddress])
  await ethers.provider.send("hardhat_setBalance", [
    sourceAddress,
    utils.hexValue(utils.parseEther("100")),
  ])
  const richSigner = ethers.provider.getSigner(sourceAddress)

  const erc20Contract = new ethers.Contract(tokenAddress, JSON.stringify(abi), richSigner)
  console.log(
    `${symbol} sourceAddress ${sourceAddress} balance`,
    utils.formatUnits(await erc20Contract.balanceOf(sourceAddress), decimals)
  )

  console.log(
    `${symbol} address ${address} balance before`,
    utils.formatUnits(await erc20Contract.balanceOf(address), decimals)
  )

  await (await erc20Contract.transfer(address, utils.parseUnits(amount, decimals))).wait()

  console.log(
    `${symbol} address ${address} balance after`,
    utils.formatUnits(await erc20Contract.balanceOf(address), decimals)
  )
  await ethers.provider.send("hardhat_stopImpersonatingAccount", [sourceAddress])
}
