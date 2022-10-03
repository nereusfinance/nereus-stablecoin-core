import { task } from "hardhat/config"

task("deploy-p3-markets", "Deploy markets").setAction(async (args, { run, deployments }) => {
  await run("compile")
  const options = { reset: true, noCompile: true }

  await run("deploy", { tags: "VaultRewardSwapperV1", ...options })

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

  await run("mint-to-bentobox", { cauldron: (await deployments.get("aAvaUSDTVCauldron")).address })
  await run("mint-to-bentobox", { cauldron: (await deployments.get("aAvaUSDCVCauldron")).address })
  await run("mint-to-bentobox", { cauldron: (await deployments.get("aAvaDAIVCauldron")).address })
  await run("mint-to-bentobox", { cauldron: (await deployments.get("qiDAIVCauldron")).address })
  await run("mint-to-bentobox", { cauldron: (await deployments.get("qiUSDCnVCauldron")).address })

  await run("print-p3-deployments")
})
