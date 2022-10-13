import { task } from "hardhat/config"
import nxusdAbi from "../utilities/abis/nxusdAbi.json"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const nxusdAddress = "0xf14f4ce569cb3679e99d5059909e23b07bd2f387"

task("mint-to-bentobox-status", "Mint NXUSD to BentoBox for Cauldrons Status").setAction(
  async (taskArgs, hre) => {
    await checkAllowedMindAmountNxusd(hre)
  }
)

const checkAllowedMindAmountNxusd = async (hre: HardhatRuntimeEnvironment) => {
  const ethers = hre.ethers
  const utils = hre.ethers.utils
  const nxusd = await ethers.getContractAt(nxusdAbi, nxusdAddress)

  const totalSupply = await nxusd.totalSupply()
  const lastMint = await nxusd.lastMint()

  const MINTING_PERIOD = 24 * 60 * 60
  const MINTING_INCREASE = 15000
  const MINTING_PRECISION = 1e5

  console.log("totalSupply NXUSD", utils.formatEther(totalSupply.toString()))

  const allowedToMintPerPeriod = totalSupply.mul(MINTING_INCREASE).div(MINTING_PRECISION)
  console.log("allowedToMintPerPeriod NXUSDT", utils.formatEther(allowedToMintPerPeriod))

  console.log(
    "lastMint.time (local)",
    new Date(lastMint.time.toString() * 1000).toLocaleString("en-GB")
  )
  console.log("lastMint.amount NXUSD", utils.formatEther(lastMint.amount))

  if (Date.now() - lastMint.time.toString() * 1000 > 60 * 60 * 24 * 1000) {
    console.log("leftToMin(allowedToMintPerPeriod)", utils.formatEther(allowedToMintPerPeriod))
    return
  }
  const leftToMint = allowedToMintPerPeriod.sub(lastMint.amount)
  console.log("leftToMint NXUSDT", utils.formatEther(leftToMint))

  const timeLeftTillNextPeriod =
    lastMint.time.toNumber() + MINTING_PERIOD - Math.floor(Date.now() / 1000)
  const date = new Date(0)
  date.setSeconds(timeLeftTillNextPeriod)
  const timeLeftTillNextPeriodFormatted = date.toISOString().substr(11, 8)
  console.log("timeLeftTillNextPeriod hours:minutes:seconds", timeLeftTillNextPeriodFormatted)
}
