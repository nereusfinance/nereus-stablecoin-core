import { task } from "hardhat/config"
import { VaultRewardSwapperV1 } from "../typechain"
import { txWait } from "../utilities/tx"
import { ActionType, SwapAction } from "../utilities/types/Vault"
import { ChainId } from "../utilities/chains"

// Vault rewards info
// const aaveRewardAssets = [wavaxAddress]
// const qiRewardAssets = [benQiAddress, nativeAddress]
// const rewardTypeQi = 0
// const rewardTypeAvax = 1
// const qiRewardTypesAssets = [rewardTypeQi, rewardTypeAvax]

export const swapConfigData = {
  [ChainId.Avalanche]: {
    nativeAddress: "0x0000000000000000000000000000000000000001",
    wavaxAddress: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    usdtAddress: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    usdcAddress: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    aAvaUsdtAddress: "0x6ab707Aca953eDAeFBc4fD23bA73294241490620",
    aAvaUsdcAddress: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
    aAvaDaiAddress: "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
    benQiAddress: "0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5",
    daieAddress: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    qiDaiAddress: "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D",
    qiUSDCnAddress: "0xB715808a78F6041E46d61Cb123C9B4A27056AE9C",

    aaveLendingPoolV3: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
    // joeRouter02: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
    joeFactory: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
  },
}

export const getActionSpender = (action: SwapAction, configData) => {
  switch (action.actionType) {
    case ActionType.JoeSwap:
      return // no spender required, tokens transferred to joe pair directly
    case ActionType.AaveV3Supply:
      return configData.aaveLendingPoolV3
    case ActionType.cTokenMint:
      return action.tokenOut
  }
}
task("configure-vault-swapper-p3")
  .addParam("swapper", "VaultRewardsSwapper address")
  .setAction(async ({ swapper: swapperAddress }, { ethers, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    const signers = {
      deployer: await ethers.getSigner(deployer),
    }

    const swapper = (
      await ethers.getContractAt<VaultRewardSwapperV1>("VaultRewardSwapperV1", swapperAddress)
    ).connect(signers.deployer)

    const {
      nativeAddress,
      wavaxAddress,
      usdtAddress,
      usdcAddress,
      aAvaUsdtAddress,
      aAvaUsdcAddress,
      aAvaDaiAddress,
      benQiAddress,
      daieAddress,
      qiDaiAddress,
      qiUSDCnAddress,

      aaveLendingPoolV3,
      joeFactory,
    } = swapConfigData[ChainId.Avalanche]

    const routeMinAmounts = {
      [wavaxAddress]: ethers.utils.parseUnits("0.001", 18),
      [benQiAddress]: ethers.utils.parseUnits("0.001", 18),
    }

    const routes: Array<{
      startToken: string
      endToken: string
      actions: SwapAction[]
    }> = [
      {
        startToken: wavaxAddress,
        endToken: aAvaUsdtAddress,
        actions: [
          {
            actionType: ActionType.JoeSwap,
            tokenIn: wavaxAddress,
            tokenOut: usdtAddress,
          },
          {
            actionType: ActionType.AaveV3Supply,
            tokenIn: usdtAddress,
            tokenOut: aAvaUsdtAddress,
          },
        ],
      },
      {
        startToken: wavaxAddress,
        endToken: aAvaUsdcAddress,
        actions: [
          {
            actionType: ActionType.JoeSwap,
            tokenIn: wavaxAddress,
            tokenOut: usdcAddress,
          },
          {
            actionType: ActionType.AaveV3Supply,
            tokenIn: usdcAddress,
            tokenOut: aAvaUsdcAddress,
          },
        ],
      },
      {
        startToken: wavaxAddress,
        endToken: aAvaDaiAddress,
        actions: [
          {
            actionType: ActionType.JoeSwap,
            tokenIn: wavaxAddress,
            tokenOut: daieAddress,
          },
          {
            actionType: ActionType.AaveV3Supply,
            tokenIn: daieAddress,
            tokenOut: aAvaDaiAddress,
          },
        ],
      },
      {
        startToken: benQiAddress,
        endToken: qiDaiAddress,
        actions: [
          {
            actionType: ActionType.JoeSwap,
            tokenIn: benQiAddress,
            tokenOut: wavaxAddress,
          },
          {
            actionType: ActionType.JoeSwap,
            tokenIn: wavaxAddress,
            tokenOut: daieAddress,
          },
          {
            actionType: ActionType.cTokenMint,
            tokenIn: daieAddress,
            tokenOut: qiDaiAddress,
          },
        ],
      },
      {
        startToken: wavaxAddress,
        endToken: qiDaiAddress,
        actions: [
          {
            actionType: ActionType.JoeSwap,
            tokenIn: wavaxAddress,
            tokenOut: daieAddress,
          },
          {
            actionType: ActionType.cTokenMint,
            tokenIn: daieAddress,
            tokenOut: qiDaiAddress,
          },
        ],
      },
      {
        startToken: benQiAddress,
        endToken: qiUSDCnAddress,
        actions: [
          {
            actionType: ActionType.JoeSwap,
            tokenIn: benQiAddress,
            tokenOut: wavaxAddress,
          },
          {
            actionType: ActionType.JoeSwap,
            tokenIn: wavaxAddress,
            tokenOut: usdcAddress,
          },
          {
            actionType: ActionType.cTokenMint,
            tokenIn: usdcAddress,
            tokenOut: qiUSDCnAddress,
          },
        ],
      },
      {
        startToken: wavaxAddress,
        endToken: qiUSDCnAddress,
        actions: [
          {
            actionType: ActionType.JoeSwap,
            tokenIn: wavaxAddress,
            tokenOut: usdcAddress,
          },
          {
            actionType: ActionType.cTokenMint,
            tokenIn: usdcAddress,
            tokenOut: qiUSDCnAddress,
          },
        ],
      },
    ]

    await txWait(swapper.setAaveLendingPoolV3(aaveLendingPoolV3))
    await txWait(swapper.setJoeFactory(joeFactory))

    const allowances = {}
    for (const { startToken, endToken, actions } of routes) {
      for (const action of actions) {
        const allowance = {
          token: action.tokenIn,
          spender: getActionSpender(action, swapConfigData[ChainId.Avalanche]),
        }

        if (!allowance.spender) {
          continue
        }
        if (!allowances[`${allowance.token}${allowance.spender}`]) {
          allowances[`${allowance.token}${allowance.spender}`] = allowance
        }
      }
      await txWait(swapper.setRoute(startToken as string, endToken as string, actions as any))
    }

    for (const key in allowances) {
      const allowance = allowances[key]
      await txWait(
        swapper.setAllowance(allowance.token, allowance.spender, ethers.constants.MaxUint256)
      )
    }
    for (const tokenStart in routeMinAmounts) {
      const minAmount = routeMinAmounts[tokenStart]
      await txWait(swapper.setMinAmount(tokenStart, minAmount))
    }
  })

task("configure-vault-swapper-managers-p3")
  .addParam("swapper", "VaultRewardsSwapper address")
  .setAction(async ({ swapper: swapperAddress }, { ethers, getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts()
    const swapper = (
      await ethers.getContractAt<VaultRewardSwapperV1>("VaultRewardSwapperV1", swapperAddress)
    ).connect(await ethers.getSigner(deployer))

    await swapper.addManagers([
      (await deployments.get("aAvaUSDTVault")).address,
      (await deployments.get("aAvaUSDCVault")).address,
      (await deployments.get("aAvaDAIVault")).address,
      (await deployments.get("qiDAIVault")).address,
      (await deployments.get("qiUSDCnVault")).address,
    ])
  })
