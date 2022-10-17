import { task } from "hardhat/config"
import { mockOraclePriceUsdByCauldron } from "../utilities/oracle"

task("mock-vault-oracle-price", "Mock oracle price")
  .addParam("price", "Approximate USD price, since we set rate")
  .addParam("asset", "Possible values: aAvaUSDTV, aAvaUSDCV, aAvaDAIV, qiDAIV, qiUSDCnV")
  .setAction(async ({ asset, price }, hre) => {
    const { ethers, deployments } = hre

    const cauldronDeployment = await deployments.get(`${asset}Cauldron`)
    const cauldron = await ethers.getContractAt("CauldronV2", cauldronDeployment.address)

    await mockOraclePriceUsdByCauldron(price, cauldron, hre)
    console.log("done")
  })
