import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { ChainId, setDeploymentSupportedChains } from "../utilities"

const name = "VaultRewardSwapperV2Upgrade"

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { upgrades, ethers, deployments } = hre

  const swapperProxy = await deployments.get("VaultRewardSwapperProxy")
  console.log(`upgrading VaultRewardSwapperProxy`, swapperProxy.address)
  const swapperFactoryV2 = await ethers.getContractFactory("VaultRewardSwapperV2Mock")
  await upgrades.upgradeProxy(swapperProxy.address, swapperFactoryV2, { kind: "transparent" })
  console.log(`upgraded VaultRewardSwapperProxy`, swapperProxy.address)
}

export default deployFunction

setDeploymentSupportedChains([ChainId.Avalanche.toString()], deployFunction)

deployFunction.tags = [name]
deployFunction.dependencies = []
