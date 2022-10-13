import { TokenSymbol } from "../utilities/tokens"
import { task } from "hardhat/config"
import { avaxTopUp, erc20TopUp } from "../utilities/tokens"

task("top-up-test-tokens", "Transfer test tokens to test account")
  .addParam("user", "User address")
  .setAction(async ({ user: userAddress }, hre) => {
    await avaxTopUp(userAddress, "1000", hre)
    await erc20TopUp(userAddress, "1000", TokenSymbol.WXT, hre)
    await erc20TopUp(userAddress, "100", TokenSymbol.WETHe, hre)
    await erc20TopUp(userAddress, "10000", TokenSymbol.NXUSD, hre)
    await erc20TopUp(userAddress, "500", TokenSymbol.USDC, hre)
    await erc20TopUp(userAddress, "500", TokenSymbol.av3CRV, hre)
    await erc20TopUp(userAddress, "500", TokenSymbol.sAVAX, hre)
    await erc20TopUp(userAddress, "500", TokenSymbol.JOE, hre)
    await erc20TopUp(userAddress, "500", TokenSymbol.LINKe, hre)
    await erc20TopUp(userAddress, "5", TokenSymbol.BTCb, hre)
    await erc20TopUp(userAddress, "5", TokenSymbol.WBTC, hre)
    await erc20TopUp(userAddress, "10000", TokenSymbol.USDt, hre)
    await erc20TopUp(userAddress, "10000", TokenSymbol.DAIe, hre)
    await erc20TopUp(userAddress, "10000", TokenSymbol.aAvaUSDT, hre)
    await erc20TopUp(userAddress, "5000", TokenSymbol.aAvaUSDC, hre)
    await erc20TopUp(userAddress, "5000", TokenSymbol.aAvaDAI, hre)
    await erc20TopUp(userAddress, "5000", TokenSymbol.qiDAI, hre)
    await erc20TopUp(userAddress, "5000", TokenSymbol.qiUSDCn, hre)
  })
