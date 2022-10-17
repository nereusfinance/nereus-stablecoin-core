import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { ChainId, setDeploymentSupportedChains } from "../utilities"

const vaultName = "qiUSDCnVault"
const ParametersPerChain: {
  [key in ChainId]?: {
    asset: string
    name: string
    symbol: string
    idleBetweenCompoundsSeconds: number
    wrapAsset: string
    bentoBox: string
    comptrollerAddress: string
    rewardTypes: number[]
    rewardTokens: string[]
  }
} = {
  [ChainId.Avalanche]: {
    asset: "0xB715808a78F6041E46d61Cb123C9B4A27056AE9C", //qiUSDCn
    name: "Nereus Benqi USDCn Vault",
    symbol: "NqiUSDCn",
    idleBetweenCompoundsSeconds: 60 * 60 * 12, // 12 hours
    wrapAsset: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    bentoBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    comptrollerAddress: "0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4",
    rewardTokens: [
      "0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5", //BenQi
      "0x0000000000000000000000000000000000000001", //native token - AVAX
    ],
    rewardTypes: [
      0, //BenQi
      1, //native token - AVAX
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

  const tx = await deployments.deploy("QiVault", {
    from: deployer,
    args: [
      parameters.asset,
      parameters.name,
      parameters.symbol,
      rewardsSwapperDeployment.address,
      parameters.idleBetweenCompoundsSeconds,
      parameters.wrapAsset,
      parameters.bentoBox,
      parameters.comptrollerAddress,
      parameters.rewardTokens,
      parameters.rewardTypes,
    ],
    log: true,
  })

  await deployments.save(vaultName, {
    abi: [],
    linkedData: {
      asset: parameters.asset,
    },
    address: tx.address,
  })
  console.log(`deployed ${vaultName}`, tx.address)
}

export default deployFunction

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction)

deployFunction.tags = [vaultName]
deployFunction.dependencies = []
