import { BigNumber } from "ethers"
import { DeployFunction } from "hardhat-deploy/types"
import hre, { network } from "hardhat"

export const BASE_TEN = 10

export const impersonate = async (address: string) => {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [address],
  })
}

// Defaults to e18 using amount * 10^18
export function getBigNumber(amount: any, decimals = 18) {
  return BigNumber.from(amount).mul(BigNumber.from(BASE_TEN).pow(decimals))
}

export const setDeploymentSupportedChains = (
  supportedChains: string[],
  deployFunction: DeployFunction
) => {
  if (network.name !== "hardhat" || process.env.HARDHAT_LOCAL_NODE) {
    deployFunction.skip = ({ getChainId }) =>
      new Promise((resolve, reject) => {
        try {
          getChainId().then((chainId) => {
            resolve(supportedChains.indexOf(chainId.toString()) === -1)
          })
        } catch (error) {
          reject(error)
        }
      })
  }
}

export * from "./chains"
export * from "./time"
