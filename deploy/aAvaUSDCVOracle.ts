import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { ChainId, setDeploymentSupportedChains } from "../utilities"

const prefix = "aAvaUSDC"
const name = `${prefix}VOracle`
const ParametersPerChain: {
  [key in ChainId]?: {
    name: string
    symbol: string
    priceFeed: string
  }
} = {
  [ChainId.Avalanche]: {
    name: "NaAvaUSDC Chainlink",
    symbol: "NaAvaUSDC/USD",
    priceFeed: "0xf096872672f44d6eba71458d74fe67f9a77a23b9", //USDC ChainLink
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
