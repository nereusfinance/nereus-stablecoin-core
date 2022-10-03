import { ChainId } from "./chains"

export const forkAvalancheMainnet = async (blockNumber: number, hre) => {
  console.assert(hre.network.config.chainId === ChainId.Avalanche)
  await hre.network.provider.request({
    method: "hardhat_reset",
    params: [
      {
        forking: {
          jsonRpcUrl: "https://api.avax.network/ext/bc/C/rpc",
          blockNumber,
        },
      },
    ],
  })
  await hre.deployments.fixture([])
}
