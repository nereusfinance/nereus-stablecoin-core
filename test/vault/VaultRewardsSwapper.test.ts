import hre, { deployments, ethers, getNamedAccounts, network, run } from "hardhat"
import {
  IERC20Metadata as IERC20,
  VaultRewardSwapperV1,
  VaultRewardSwapperV2Mock,
} from "../../typechain"
import { Signer } from "ethers"
import { erc20TopUp, getTokenContract, TokenSymbol } from "../../utilities/tokens"
import { expect } from "chai"
import { forkAvalancheMainnet } from "../../utilities/fork"
import { ActionType, SwapAction } from "../../utilities/types/Vault"
import { getActionSpender, swapConfigData } from "../../tasks/configureVaultSwapper"
import { ChainId } from "../../utilities"
import { txWait } from "../../utilities/tx"

type FixtureType = (options?: any) => Promise<{
  rewardsSwapper: VaultRewardSwapperV1
  wavax: IERC20
  aAvaUSDT: IERC20
  usdt: IERC20

  user1: string
  user2: string

  signers: {
    deployer: Signer
    user1: Signer
    user2: Signer
  }
}>

const toStoredActionComparison = (action) => [
  ethers.BigNumber.from(action.actionType),
  ethers.utils.getAddress(action.tokenIn),
  ethers.utils.getAddress(action.tokenOut),
]

describe("VaultRewardsSwapper", () => {
  const wavaxAddress = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"
  const usdtAddress = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7"
  const aAvaUsdtAddress = "0x6ab707Aca953eDAeFBc4fD23bA73294241490620"

  let createTestEnv: FixtureType
  before(() => {
    createTestEnv = deployments.createFixture(async () => {
      await forkAvalancheMainnet(19865000, hre)

      const chainId = network.config.chainId
      const { deployer, user1, user2 } = await getNamedAccounts()
      const signers = {
        deployer: await ethers.getSigner(deployer),
        user1: await ethers.getSigner(user1),
        user2: await ethers.getSigner(user2),
      }

      await deployments.run(["VaultRewardSwapperV1"], { resetMemory: false })
      const rewardsSwapperDeployment = await deployments.get("VaultRewardSwapperProxy")
      const rewardsSwapper = await ethers.getContractAt<VaultRewardSwapperV1>(
        "VaultRewardSwapperV1",
        rewardsSwapperDeployment.address
      )
      await run("configure-vault-swapper-p3", { swapper: rewardsSwapper.address })

      const usdt = await getTokenContract<IERC20>(chainId, TokenSymbol.USDt, hre)
      const aAvaUSDT = await getTokenContract<IERC20>(chainId, TokenSymbol.aAvaUSDT, hre)
      const wavax = await getTokenContract<IERC20>(chainId, TokenSymbol.WAVAX, hre)

      await erc20TopUp(user1, "500", TokenSymbol.WAVAX, { ethers })
      await erc20TopUp(user1, "20000", TokenSymbol.aAvaUSDT, { ethers })

      return {
        rewardsSwapper,
        wavax,
        aAvaUSDT,
        usdt,

        signers,
        user1,
        user2,
      }
    })
  })

  describe("Success Path", () => {
    it("should verify VaultRewardsSwapper deployment", async () => {
      const { rewardsSwapper } = await createTestEnv()

      // Vault rewards info
      // const aaveRewardAssets = [wavaxAddress]
      // const qiRewardAssets = [benQiAddress, nativeAddress]
      // const rewardTypeQi = 0
      // const rewardTypeAvax = 1
      // const qiRewardTypesAssets = [rewardTypeQi, rewardTypeAvax]

      const configData = swapConfigData[ChainId.Avalanche]
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
      } = configData

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

      expect(await rewardsSwapper.aaveLendingPoolV3()).to.eq(aaveLendingPoolV3)
      expect(await rewardsSwapper.joeFactory()).to.eq(joeFactory)

      for (const route of routes) {
        for (const action of route.actions) {
          const tokenContract = await ethers.getContractAt("IERC20Metadata", action.tokenIn)
          const spender = getActionSpender(action, configData)
          if (spender) {
            const allowance = await tokenContract.allowance(rewardsSwapper.address, spender)
            expect(allowance).to.eq(ethers.constants.MaxUint256)
          }
        }

        expect(await rewardsSwapper.getRoute(route.startToken, route.endToken)).to.deep.eq(
          route.actions.map(toStoredActionComparison)
        )
      }

      const routeMinAmounts = {
        [wavaxAddress]: ethers.utils.parseUnits("0.001", 18),
        [benQiAddress]: ethers.utils.parseUnits("0.001", 18),
      }

      for (const tokenStart in routeMinAmounts) {
        expect(await rewardsSwapper.routeMinAmount(tokenStart)).to.deep.eq(
          routeMinAmounts[tokenStart]
        )
      }
    })

    it("should verify route update", async () => {
      const { rewardsSwapper } = await createTestEnv()
      const startToken = wavaxAddress
      const endToken = aAvaUsdtAddress

      const expectedTestActions = [
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
      ]
      expect(await rewardsSwapper.getRoute(wavaxAddress, aAvaUsdtAddress)).to.deep.eq(
        expectedTestActions.map(toStoredActionComparison)
      )

      const setNewRouteActions = [
        {
          actionType: ActionType.JoeSwap,
          tokenIn: wavaxAddress,
          tokenOut: usdtAddress,
        },
      ]

      const receipt = await txWait(
        rewardsSwapper.setRoute(startToken, endToken, setNewRouteActions)
      )
      const eventArgs = receipt.events?.find((e) => e.event === "RouteSet")?.args
      expect(eventArgs.tokenIn).to.eq(startToken)
      expect(eventArgs.tokenOut).to.eq(endToken)
      expect(eventArgs.actions).to.deep.eq([
        [ethers.BigNumber.from(ActionType.JoeSwap), wavaxAddress, usdtAddress],
      ])
      const newRouteActionRead = await rewardsSwapper.getRoute(startToken, endToken)

      expect(newRouteActionRead).to.deep.eq(setNewRouteActions.map(toStoredActionComparison))
    }).timeout(60000)

    it("should upgrade Swapper proxy implementation to V2Mock", async () => {
      const { rewardsSwapper } = await createTestEnv()

      const expectedTestActions = [
        {
          actionType: ActionType.JoeSwap,
          tokenIn: wavaxAddress,
          tokenOut: usdtAddress,
          minAmount: ethers.utils.parseUnits("0.001", 18),
        },
        {
          actionType: ActionType.AaveV3Supply,
          tokenIn: usdtAddress,
          tokenOut: aAvaUsdtAddress,
          minAmount: ethers.constants.Zero,
        },
      ]
      expect(await rewardsSwapper.getRoute(wavaxAddress, aAvaUsdtAddress)).to.deep.eq(
        expectedTestActions.map(toStoredActionComparison)
      )

      await deployments.run(["VaultRewardSwapperV2Upgrade"], { resetMemory: false })

      const rewardsSwapperDeployment = await deployments.get("VaultRewardSwapperProxy")
      const rewardsSwapperV2 = await ethers.getContractAt<VaultRewardSwapperV2Mock>(
        "VaultRewardSwapperV2Mock",
        rewardsSwapperDeployment.address
      )
      await rewardsSwapperV2.setMockTag(123)
      expect(await rewardsSwapperV2.mockTag()).to.eq(123)

      expect(await rewardsSwapperV2.getRoute(wavaxAddress, aAvaUsdtAddress)).to.deep.eq(
        expectedTestActions.map(toStoredActionComparison)
      )
    })
  })

  describe("Error Path", () => {
    it("should be reverted if setRoute called not by the owner", async () => {
      const { rewardsSwapper, signers, user1 } = await createTestEnv()

      expect(await rewardsSwapper.owner()).to.not.eq(user1)
      await expect(
        rewardsSwapper.connect(signers.user1).setRoute(wavaxAddress, aAvaUsdtAddress, [])
      ).to.be.revertedWith("Ownable: caller is not the owner")
    })
  })
})
