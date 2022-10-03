import { ethers } from "hardhat"
import comptrollerAbi from "../utilities/abis/comptrollerAbi.json"
import qiTokenAbi from "../utilities/abis/qiTokenAbi.json"

async function main() {
  const comptrollerAddress = "0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4"
  const qiDaiAddress = "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D"
  const user = "0xe27BB639D30bC103A738091C6C7088B7041F9f4A"

  const comptroller = await ethers.getContractAt(comptrollerAbi, comptrollerAddress)
  const qiDai = await ethers.getContractAt(qiTokenAbi, qiDaiAddress)
  const qiDaiDecimals = await qiDai.decimals()

  const exchangeRateCurrent = await qiDai.callStatic.exchangeRateCurrent()
  console.log("await qiDai.exchangeRateCurrent()", exchangeRateCurrent.toString())
  //    (oErr, vars.qiTokenBalance, vars.borrowBalance, vars.exchangeRateMantissa)
  // const snapshot = await qiDai.callStatic.getAccountSnapshot(user)
  const qiDaiBalance = await qiDai.balanceOf(user)

  const DaiAmount = qiDaiBalance.mul(exchangeRateCurrent).div(10n ** 18n)
  console.log("DaiAmount", ethers.utils.formatEther(DaiAmount))
  console.log("qiDai balance", qiDaiBalance.toString())
  console.log("qiDai balance decimals", ethers.utils.formatUnits(qiDaiBalance, qiDaiDecimals))
  console.log("rewardAccrued QI", (await comptroller.rewardAccrued(0, user)).toString())
  console.log("rewardAccrued AVAX", (await comptroller.rewardAccrued(1, user)).toString())
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
