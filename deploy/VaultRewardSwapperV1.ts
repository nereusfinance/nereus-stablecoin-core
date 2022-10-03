import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { ChainId, setDeploymentSupportedChains } from "../utilities"

const name = "VaultRewardSwapperV1"

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { upgrades, ethers, deployments } = hre

  console.log(`deploying VaultRewardSwapperProxy`)
  const swapperFactory = await ethers.getContractFactory("VaultRewardSwapperV1")
  const swapper = await upgrades.deployProxy(swapperFactory, [])
  await swapper.deployed()

  await deployments.save("VaultRewardSwapperProxy", {
    abi: [],
    address: swapper.address,
  })
  console.log(`deployed VaultRewardSwapperProxy`, swapper.address)
}

export default deployFunction

setDeploymentSupportedChains([ChainId.Avalanche.toString()], deployFunction)

deployFunction.tags = [name]
deployFunction.dependencies = []
