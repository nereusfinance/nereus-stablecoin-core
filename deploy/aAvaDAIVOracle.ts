import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { ChainId, setDeploymentSupportedChains } from "../utilities"

const prefix = "aAvaDAI"
const name = `${prefix}VOracle`
const ParametersPerChain: {
  [key in ChainId]?: {
    name: string
    symbol: string
    priceFeed: string
  }
} = {
  [ChainId.Avalanche]: {
    name: "NaAvaDAI Chainlink",
    symbol: "NaAvaDAI/USD",
    priceFeed: "0x51d7180eda2260cc4f6e4eebb82fef5c3c2b8300", //DAI ChainLink
  },
}

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const chainId = await hre.getChainId()
  const parameters = ParametersPerChain[Number(chainId)]

  const { deployer } = await getNamedAccounts()

  const vaultDeployment = await deployments.get(`${prefix}Vault`)

  console.log(`deploying ${name}, vault ${prefix}Vault(${vaultDeployment.address})`)
  const tx = await deployments.deploy("TokenizedVaultOracle", {
    from: deployer,
    args: [parameters.name, parameters.symbol, parameters.priceFeed, vaultDeployment.address],
    log: true,
  })

  await deployments.save(name, {
    abi: [],
    address: tx.address,
  })
  console.log(`deployed ${name}`, tx.address)
}

export default deployFunction

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction)

deployFunction.tags = [name]
deployFunction.dependencies = []
