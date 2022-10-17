import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { ChainId, setDeploymentSupportedChains } from "../utilities"

const vaultName = "aAvaDAIVault"
const ParametersPerChain: {
  [key in ChainId]?: {
    asset: string
    name: string
    symbol: string
    idleBetweenCompoundsSeconds: number
    wrapAsset: string
    bentoBox: string
    avaRewardsControllerAddress: string
    rewardTokens: string[]
  }
} = {
  [ChainId.Avalanche]: {
    asset: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE", //aAvaDAI
    name: "Nereus Aave Avalanche DAI Vault",
    symbol: "NaAvaDAI",
    idleBetweenCompoundsSeconds: 60 * 60 * 12, // 12 hours
    wrapAsset: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    bentoBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    avaRewardsControllerAddress: "0x929EC64c34a17401F460460D4B9390518E5B473e",
    rewardTokens: [
      "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", //WAVAX
    ],
  },
}

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`deploying ${vaultName}`)
  const { deployments, getNamedAccounts } = hre
  const chainId = await hre.getChainId()
  const parameters = ParametersPerChain[Number(chainId)]

  const { deployer } = await getNamedAccounts()
  const rewardsSwapperDeployment = await deployments.get("VaultRewardSwapperProxy")
  console.log("using rewardsSwapper", rewardsSwapperDeployment.address)

  const tx = await deployments.deploy("AaveV3Vault", {
    from: deployer,
    args: [
      parameters.asset,
      parameters.name,
      parameters.symbol,
      rewardsSwapperDeployment.address,
      parameters.idleBetweenCompoundsSeconds,
      parameters.wrapAsset,
      parameters.bentoBox,
      parameters.avaRewardsControllerAddress,
      parameters.rewardTokens,
    ],
    log: true,
  })

  await deployments.save(vaultName, {
    abi: [],
    address: tx.address,
    linkedData: {
      asset: parameters.asset,
    },
  })
  console.log(`deployed ${vaultName}`, tx.address)
}

export default deployFunction

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction)

deployFunction.tags = [vaultName]
deployFunction.dependencies = []
