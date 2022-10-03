import { HardhatRuntimeEnvironment } from "hardhat/types"
import { DeployFunction } from "hardhat-deploy/types"
import { ethers } from "hardhat"
import { BentoBoxV1 } from "../typechain"
import { expect } from "chai"
import { ChainId, setDeploymentSupportedChains } from "../utilities"

const prefix = "aAvaUSDC"
const cauldronName = `${prefix}VCauldron`
const ParametersPerChain: {
  [key in ChainId]?: {
    degenBox: string
    oracleData: string
    masterContract: string
  }
} = {
  [ChainId.Avalanche]: {
    degenBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    oracleData: "0x0000000000000000000000000000000000000000",
    masterContract: "0xE767C6C3Bf42f550A5A258A379713322B6c4c060",
  },
}

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(`deploying ${cauldronName}`)
  const { deployments } = hre
  const chainId = await hre.getChainId()
  const parameters = ParametersPerChain[parseInt(chainId)]

  const bentoBox = await ethers.getContractAt<BentoBoxV1>("BentoBoxV1", parameters.degenBox)
  const oracleAddress = (await deployments.get(`${prefix}VOracle`)).address
  const collateralAddress = (await deployments.get(`${prefix}Vault`)).address
  console.log(`using ${prefix}Oracle ${oracleAddress}`)
  console.log(`using ${prefix}Vault ${collateralAddress} as collateral`)

  const collateralization = 90 * 1e3 // 90% LTV
  const opening = 0.5 * 1e3 // .5% initial
  const interest = 0 // 0% Interest
  const liquidation = 5 * 1e3 + 1e5 // 5 %

  const initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [
      collateralAddress,
      oracleAddress,
      parameters.oracleData,
      interest,
      liquidation,
      collateralization,
      opening,
    ]
  )

  const tx = await (await bentoBox.deploy(parameters.masterContract, initData, true)).wait()

  const deployEvent = tx?.events?.[0]
  expect(deployEvent?.eventSignature).to.be.eq("LogDeploy(address,bytes,address)")
  await deployments.save(cauldronName, {
    abi: [],
    address: deployEvent?.args?.cloneAddress,
  })
  console.log(`deployed ${cauldronName}`, deployEvent?.args?.cloneAddress)
}

export default deployFunction

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction)

deployFunction.tags = [cauldronName]
deployFunction.dependencies = []
