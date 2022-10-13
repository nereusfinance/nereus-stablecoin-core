import { task } from "hardhat/config"
import { TokenSymbol } from "../utilities/tokens"

task("print-p3-deployments").setAction(async (args, { deployments }) => {
  console.log(
    JSON.stringify(
      {
        [TokenSymbol.aAvaUSDT]: {
          vault: (await deployments.get("aAvaUSDTVault")).address,
          vaultAsset: (await deployments.get("aAvaUSDTVault")).linkedData.asset,
          oracle: (await deployments.get("aAvaUSDTVOracle")).address,
          cauldron: (await deployments.get("aAvaUSDTVCauldron")).address,
          collateral: (await deployments.get("aAvaUSDTVCauldron")).linkedData?.collateral,
        },
        [TokenSymbol.aAvaUSDC]: {
          vault: (await deployments.get("aAvaUSDCVault")).address,
          vaultAsset: (await deployments.get("aAvaUSDCVault")).linkedData.asset,
          oracle: (await deployments.get("aAvaUSDCVOracle")).address,
          cauldron: (await deployments.get("aAvaUSDCVCauldron")).address,
          collateral: (await deployments.get("aAvaUSDCVCauldron")).linkedData?.collateral,
        },
        [TokenSymbol.aAvaDAI]: {
          vault: (await deployments.get("aAvaDAIVault")).address,
          vaultAsset: (await deployments.get("aAvaDAIVault")).linkedData.asset,
          oracle: (await deployments.get("aAvaDAIVOracle")).address,
          cauldron: (await deployments.get("aAvaDAIVCauldron")).address,
          collateral: (await deployments.get("aAvaDAIVCauldron")).linkedData?.collateral,
        },
        [TokenSymbol.qiDAI]: {
          vault: (await deployments.get("qiDAIVault")).address,
          vaultAsset: (await deployments.get("qiDAIVault")).linkedData.asset,
          oracle: (await deployments.get("qiDAIVOracle")).address,
          cauldron: (await deployments.get("qiDAIVCauldron")).address,
          collateral: (await deployments.get("qiDAIVCauldron")).linkedData?.collateral,
        },
        [TokenSymbol.qiUSDCn]: {
          vault: (await deployments.get("qiUSDCnVault")).address,
          vaultAsset: (await deployments.get("qiUSDCnVault")).linkedData.asset,
          oracle: (await deployments.get("qiUSDCnVOracle")).address,
          cauldron: (await deployments.get("qiUSDCnVCauldron")).address,
          collateral: (await deployments.get("qiUSDCnVCauldron")).linkedData?.collateral,
        },
      },
      null,
      4
    )
  )
})
