import { task } from "hardhat/config"
import { erc20TopUp, TokenSymbol } from "../utilities/tokens"

task("deploy-p3-markets", "Deploy markets")
  .addOptionalParam("user", "Test user account address")
  .setAction(async ({ user }, hre) => {
    const { run, deployments } = hre
    await run("compile")
    const options = { noCompile: true }

    await run("deploy", { tags: "VaultRewardSwapperV1", reset: true, ...options })

    await run("deploy", { tags: "aAvaUSDTVault", ...options })
    await run("deploy", { tags: "aAvaUSDTVOracle", ...options })
    await run("deploy", { tags: "aAvaUSDTVCauldron", ...options })

    await run("deploy", { tags: "aAvaUSDCVault", ...options })
    await run("deploy", { tags: "aAvaUSDCVOracle", ...options })
    await run("deploy", { tags: "aAvaUSDCVCauldron", ...options })

    await run("deploy", { tags: "aAvaDAIVault", ...options })
    await run("deploy", { tags: "aAvaDAIVOracle", ...options })
    await run("deploy", { tags: "aAvaDAIVCauldron", ...options })

    await run("deploy", { tags: "qiDAIVault", ...options })
    await run("deploy", { tags: "qiDAIVOracle", ...options })
    await run("deploy", { tags: "qiDAIVCauldron", ...options })

    await run("deploy", { tags: "qiUSDCnVault", ...options })
    await run("deploy", { tags: "qiUSDCnVOracle", ...options })
    await run("deploy", { tags: "qiUSDCnVCauldron", ...options })

    const rewardsSwapperDeployment = await deployments.get("VaultRewardSwapperProxy")
    await run("configure-vault-swapper-p3", { swapper: rewardsSwapperDeployment.address })
    await run("configure-vault-swapper-managers-p3", { swapper: rewardsSwapperDeployment.address })

    await run("mint-to-bentobox", {
      cauldron: (await deployments.get("aAvaUSDTVCauldron")).address,
    })
    await run("mint-to-bentobox", {
      cauldron: (await deployments.get("aAvaUSDCVCauldron")).address,
    })
    await run("mint-to-bentobox", { cauldron: (await deployments.get("aAvaDAIVCauldron")).address })
    await run("mint-to-bentobox", { cauldron: (await deployments.get("qiDAIVCauldron")).address })
    await run("mint-to-bentobox", { cauldron: (await deployments.get("qiUSDCnVCauldron")).address })

    if (user) {
      await erc20TopUp(user, "10000", TokenSymbol.aAvaUSDT, hre)
      await erc20TopUp(user, "10000", TokenSymbol.aAvaUSDC, hre)
      await erc20TopUp(user, "10000", TokenSymbol.aAvaDAI, hre)
      await erc20TopUp(user, "10000", TokenSymbol.qiDAI, hre)
      await erc20TopUp(user, "10000", TokenSymbol.qiUSDCn, hre)
    }

    await run("print-p3-deployments")
  })
