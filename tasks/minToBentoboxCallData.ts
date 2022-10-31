import { task } from "hardhat/config"
import nxusdAbi from "../utilities/abis/nxusdAbi.json"
import degenBoxAbi from "../utilities/abis/degenBoxAbi.json"
import { TokenSymbol } from "../utilities/tokens"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const nxusdAddress = "0xf14f4ce569cb3679e99d5059909e23b07bd2f387"
const degenBoxAddress = "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775"

const cauldrons = {
  [TokenSymbol.USDC]: "0xD75a20314FB7FBE79EC7474497d5Bf09e9c00cfc",
  [TokenSymbol.av3CRV]: "0x8Fb8884C031c49038966a39895f0E141F1Ed14AD",
  [TokenSymbol.sAVAX]: "0x0194eB3520b7d7eB0b014FCe6ed464Eaea0Ca765",
  [TokenSymbol.JOE]: "0x5E1A0e4bfb9329513E62E4fc7DC7Ce8C3CbBE7c7",
  [TokenSymbol.LINKe]: "0x0207B99E529310Eb413254B4504FE3F4a509f717",
  [TokenSymbol.BTCb]: "0x13d370e3de628387FD27709aE9fA9Bc7d2bc9C29",
}

task("mint-to-bentobox-calldata", "Mint NXUSD to BentoBox for Cauldrons").setAction(
  async (taskArgs, hre) => {
    await mintToBentoBoxCallData(TokenSymbol.av3CRV, "2000000", hre)
    await mintToBentoBoxCallData(TokenSymbol.sAVAX, "1000000", hre)
    await mintToBentoBoxCallData(TokenSymbol.JOE, "250000", hre)
    await mintToBentoBoxCallData(TokenSymbol.LINKe, "250000", hre)
    await mintToBentoBoxCallData(TokenSymbol.BTCb, "2000000", hre)
    await mintToBentoBoxCallData(TokenSymbol.USDC, "2500000", hre)
  }
)

const mintToBentoBoxCallData = async (pool, amount, { ethers }: HardhatRuntimeEnvironment) => {
  const cauldronAddress = cauldrons[pool]
  if (!cauldronAddress) {
    throw Error("cauldronAddress not found")
  }
  const utils = ethers.utils
  const nusdContract = await ethers.getContractAt(nxusdAbi, nxusdAddress)

  console.log(
    `cauldron ${cauldronAddress}(${pool}) balance of NXUSD`,
    utils.formatEther(await cauldronBalance(cauldronAddress, ethers))
  )

  const amountBN = utils.parseEther(amount)
  const callData = nusdContract.interface.encodeFunctionData("mintToBentoBox", [
    cauldronAddress,
    amountBN,
    degenBoxAddress,
  ])
  console.log(
    `mintToBentoBox ${cauldronAddress}(${pool}) amount ${amountBN.toString()} / 1e18 = ${amount} NXUSD callData`,
    callData
  )
}

const cauldronBalance = async (cauldronAddress, ethers) => {
  const degenBoxContract = new ethers.Contract(degenBoxAddress, degenBoxAbi, ethers.provider)

  return degenBoxContract.balanceOf(nxusdAddress, cauldronAddress)
}
