import { expect } from "chai"
import hre, { deployments, ethers, getNamedAccounts, network, run } from "hardhat"
import {
  CauldronV2,
  DegenBox,
  IAggregatorV3Interface,
  IERC20Metadata,
  NXUSD,
  QiVault,
  TokenizedVaultCompOracle,
  TokenizedVaultV1,
  VaultRewardSwapperV1,
} from "../../typechain"
import { Contract, Signer } from "ethers"
import comptrollerAbi from "../../utilities/abis/comptrollerAbi.json"
import { erc20TopUp, getTokenContract, TokenSymbol } from "../../utilities/tokens"
import { ChainId } from "../../utilities"
import { increase } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time"
import {
  impersonateAccount,
  stopImpersonatingAccount,
} from "@nomicfoundation/hardhat-network-helpers"
import { forkAvalancheMainnet } from "../../utilities/fork"

type FixtureType = (options?: any) => Promise<{
  qiDAIVCauldron: CauldronV2
  qiDAIVault: TokenizedVaultV1
  qiDAIVOracle: TokenizedVaultCompOracle
  rewardsSwapper: VaultRewardSwapperV1

  DAIe: Contract
  qiDAI: Contract
  BenQi: Contract
  WAVAX: Contract
  degenBox: DegenBox
  nxusd: NXUSD
  comptroller: Contract

  user1: string
  user2: string

  signers: {
    deployer: Signer
    user1: Signer
    user2: Signer
  }
}>

describe("qiDAI", () => {
  const degenBoxAddress = "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775"
  const nxusdMultisigOwnerAddress = "0xdD3dE3B819EDD3a014fDA93868d7Dfc873341467"
  const comptrollerAddress = "0x486Af39519B4Dc9a7fCcd318217352830E8AD9b4"

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
        nxusdMultisigOwner: await ethers.getSigner(nxusdMultisigOwnerAddress),
      }

      await deployments.run(["VaultRewardSwapperV1"], { resetMemory: false })
      const rewardsSwapperDeployment = await deployments.get("VaultRewardSwapperProxy")
      const rewardsSwapper = await ethers.getContractAt<VaultRewardSwapperV1>(
        "VaultRewardSwapperV1",
        rewardsSwapperDeployment.address
      )
      await run("configure-vault-swapper-p3", { swapper: rewardsSwapper.address })

      await deployments.run(["qiDAIVault"], { resetMemory: false })
      const qiDAIVaultDeployment = await deployments.get("qiDAIVault")
      const qiDAIVault = await ethers.getContractAt<QiVault>(
        "QiVault",
        qiDAIVaultDeployment.address
      )
      await rewardsSwapper.addManager(qiDAIVault.address)

      await deployments.run(["qiDAIVOracle"], { resetMemory: false })
      await deployments.run(["qiDAIVCauldron"], { resetMemory: false })
      const qiDAIVCauldronDeployment = await deployments.get("qiDAIVCauldron")
      const qiDAIVCauldron = await ethers.getContractAt<CauldronV2>(
        "CauldronV2",
        qiDAIVCauldronDeployment.address
      )

      const qiDAIVOracle = await ethers.getContractAt<TokenizedVaultCompOracle>(
        "TokenizedVaultCompOracle",
        await qiDAIVCauldron.oracle()
      )

      const degenBox = await ethers.getContractAt<DegenBox>("DegenBox", degenBoxAddress)
      const comptroller = await ethers.getContractAt(comptrollerAbi, comptrollerAddress)

      const nxusd = await getTokenContract<NXUSD>(chainId, TokenSymbol.NXUSD, hre)
      const DAIe = await getTokenContract(chainId, TokenSymbol.DAIe, hre)
      const qiDAI = await getTokenContract(chainId, TokenSymbol.qiDAI, hre)
      const BenQi = await getTokenContract(chainId, TokenSymbol.BenQi, hre)
      const WAVAX = await getTokenContract(chainId, TokenSymbol.WAVAX, hre)

      await impersonateAccount(nxusdMultisigOwnerAddress)
      await nxusd
        .connect(signers.nxusdMultisigOwner)
        .mintToBentoBox(
          qiDAIVCauldron.address,
          ethers.utils.parseEther("1000000"),
          degenBox.address
        )
      await stopImpersonatingAccount(nxusdMultisigOwnerAddress)

      await erc20TopUp(user1, "20000", TokenSymbol.DAIe, { ethers })
      await erc20TopUp(user1, "10000", TokenSymbol.NXUSD, { ethers })

      return {
        qiDAIVCauldron,
        qiDAIVault,
        qiDAIVOracle,
        rewardsSwapper,

        DAIe,
        qiDAI,
        WAVAX,
        BenQi,

        degenBox,
        nxusd,

        comptroller,

        signers,
        user1,
        user2,
      }
    })
  })

  describe("qiDAI token", () => {
    it("should mint, redeem qiDAI and claim QI+AVAX rewards", async () => {
      const { DAIe, qiDAI, BenQi, comptroller, signers, user1 } = await createTestEnv()

      const depositAmount = ethers.utils.parseUnits("10000", await DAIe.decimals())
      const benQiDecimals = await BenQi.decimals()
      const qiDAIDecimals = await qiDAI.decimals()

      // DAIeAmount = qiDAIAmount * exchangeRateCurrent
      console.log(
        "qiDAI.exchangeRateCurrent",
        (await qiDAI.callStatic.exchangeRateCurrent()).toString()
      )

      expect(await qiDAI.balanceOf(user1)).to.eq(0)

      await DAIe.connect(signers.user1).approve(qiDAI.address, depositAmount)
      await qiDAI.connect(signers.user1).mint(depositAmount)

      const qiDAIBalance = await qiDAI.balanceOf(user1)
      console.log(
        "qiDAI balance after mint with 10000 DAIe",
        ethers.utils.formatUnits(qiDAIBalance, qiDAIDecimals)
      )
      expect(qiDAIBalance).to.be.gt(ethers.constants.Zero)

      const days10 = 60 * 60 * 24 * 10
      await increase(days10)

      // call redeem to refresh rewardAccrued
      await qiDAI.connect(signers.user1).redeem(1n)

      const rewardTypeQi = 0
      const qiRewardsBalance = await comptroller.rewardAccrued(rewardTypeQi, user1)
      console.log("rewardAccrued QI", ethers.utils.formatUnits(qiRewardsBalance, benQiDecimals))
      expect(qiRewardsBalance).to.be.gt(ethers.constants.Zero)

      const rewardTypeAvax = 1
      const avaxRewardsBalance = await comptroller.rewardAccrued(rewardTypeAvax, user1)
      console.log("rewardAccrued AVAX", ethers.utils.formatEther(avaxRewardsBalance))
      expect(avaxRewardsBalance).to.be.gt(ethers.constants.Zero)

      const benQiComptrollerBalanceBefore = await BenQi.balanceOf(comptroller.address)
      const benQiUserBalanceBefore = await BenQi.balanceOf(user1)
      await comptroller.connect(signers.user1).claimReward(rewardTypeQi, user1)
      const benQiComptrollerBalanceAfter = await BenQi.balanceOf(comptroller.address)
      const benQiUserBalanceAfter = await BenQi.balanceOf(user1)
      expect(benQiComptrollerBalanceBefore).to.be.gt(benQiComptrollerBalanceAfter)
      expect(benQiUserBalanceBefore).to.be.lt(benQiUserBalanceAfter)

      const avaxComptrollerBalanceBefore = await ethers.provider.getBalance(comptroller.address)
      const avaxUserBalanceBefore = await ethers.provider.getBalance(user1)
      await comptroller.connect(signers.user1).claimReward(rewardTypeAvax, user1)
      const avaxComptrollerBalanceAfter = await ethers.provider.getBalance(comptroller.address)
      const avaxUserBalanceAfter = await ethers.provider.getBalance(user1)
      expect(avaxComptrollerBalanceBefore).to.be.gt(avaxComptrollerBalanceAfter)
      expect(avaxUserBalanceBefore).to.be.lt(avaxUserBalanceAfter)

      await qiDAI.connect(signers.user1).redeem(await qiDAI.balanceOf(user1))

      expect(await qiDAI.balanceOf(user1)).to.eq(0)
    }).timeout(60000)
  })

  describe("qiDAIVault", () => {
    it("should verify qiDAIVault deployment", async () => {
      console.assert(network.config.chainId === ChainId.Avalanche)

      const { qiDAI, qiDAIVault } = await createTestEnv()

      expect(await qiDAI.symbol()).to.eq("qiDAI")

      const qiDAIAddress = "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D"
      expect(await qiDAIVault.asset()).to.eq(qiDAIAddress)
      expect(await qiDAIVault.decimals()).to.eq(18)
      expect(await qiDAIVault.name()).to.eq("Nereus Benqi DAI Vault")
      expect(await qiDAIVault.symbol()).to.eq("NqiDAI")

      const benQIAddress = await qiDAIVault.rewardAssets(0)
      expect(benQIAddress).to.eq("0x8729438EB15e2C8B576fCc6AeCdA6A148776C0F5")

      const avaxNativeAddress = await qiDAIVault.rewardAssets(1)
      expect(avaxNativeAddress).to.eq("0x0000000000000000000000000000000000000001")

      const wavaxAddress = await qiDAIVault.wrapAsset()
      expect(wavaxAddress).to.eq(
        ethers.utils.getAddress("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7")
      )
    })

    it("should verify qiDAIVCauldron deployment", async () => {
      const { qiDAIVault, qiDAIVCauldron } = await createTestEnv()

      expect(await qiDAIVCauldron.bentoBox()).to.eq("0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775")
      expect(await qiDAIVCauldron.collateral()).to.eq(qiDAIVault.address)
      expect(await qiDAIVCauldron.masterContract()).to.eq(
        "0xE767C6C3Bf42f550A5A258A379713322B6c4c060"
      )
      expect(await qiDAIVCauldron.BORROW_OPENING_FEE()).to.eq(500) // 0.5 %
      expect(await qiDAIVCauldron.COLLATERIZATION_RATE()).to.eq(90 * 1e3) // 90 %
      expect(await qiDAIVCauldron.LIQUIDATION_MULTIPLIER()).to.eq(5 * 1e3 + 1e5) // multiplier 1.05 = 5% liquidation fee
    })

    it("should deposit qiDAI, mint shares and redeem shares including swapped QI+AVAX rewards", async () => {
      const { DAIe, qiDAI, qiDAIVault, rewardsSwapper, signers, user1 } = await createTestEnv()

      const daiAmount = ethers.utils.parseUnits("10000", await DAIe.decimals())

      await DAIe.connect(signers.user1).approve(qiDAI.address, daiAmount)
      expect(await qiDAI.balanceOf(user1)).to.eq(0)
      await qiDAI.connect(signers.user1).mint(daiAmount)

      const depositAmount = await qiDAI.balanceOf(user1)
      const sharesAmount = depositAmount.mul(
        10n ** BigInt((await qiDAIVault.decimals()) - (await qiDAI.decimals()))
      )

      await qiDAI.connect(signers.user1).approve(qiDAIVault.address, depositAmount)

      expect(await qiDAIVault.totalAssets()).to.eq(0)

      expect(await qiDAIVault.connect(signers.user1).deposit(depositAmount, user1))
        .to.emit(qiDAI, "Transfer")
        .withArgs(user1, qiDAIVault.address, depositAmount)
        .to.emit(qiDAIVault, "Transfer")
        .withArgs(ethers.constants.AddressZero, user1, sharesAmount)

      // increase blockchain timestamp to bypass compound idle period and to reach min swap amount
      const days10 = 60 * 60 * 24 * 10
      await increase(days10)

      expect(await qiDAIVault.totalAssets()).to.eq(depositAmount)
      expect(await qiDAIVault.balanceOf(user1)).to.eq(sharesAmount)

      const benQiAddress = await qiDAIVault.rewardAssets(0)
      await expect(qiDAIVault.connect(signers.user1).redeem(sharesAmount, user1, user1))
        .to.emit(rewardsSwapper, "Swap")
        .withArgs(
          await qiDAIVault.wrapAsset(), //tokenIn = rewardAsset = WAVAX
          qiDAI.address, //tokenOut
          (amountIn) => amountIn.gt(ethers.constants.Zero),
          (amountOut) => amountOut.gt(ethers.constants.Zero), // amountOut = qiDAI received after trade and supply
          qiDAIVault.address
        )
        .to.emit(rewardsSwapper, "Swap")
        .withArgs(
          benQiAddress, //tokenIn = rewardAsset = BenQi
          qiDAI.address, //tokenOut
          (amountIn) => amountIn.gt(ethers.constants.Zero),
          (amountOut) => amountOut.gt(ethers.constants.Zero), // amountOut = qiDAI received after trade and supply
          qiDAIVault.address
        )

      expect(await qiDAIVault.totalAssets()).to.eq(0)
      expect(await qiDAIVault.balanceOf(user1)).to.eq(0)
      expect(await qiDAI.balanceOf(user1)).to.be.gt(depositAmount)
    }).timeout(60000)

    it("should add collateral, borrow, repay and get back collateral", async () => {
      const { DAIe, qiDAI, qiDAIVault, qiDAIVCauldron, degenBox, nxusd, signers, user1 } =
        await createTestEnv()
      const daiAmount = ethers.utils.parseUnits("1000", await DAIe.decimals())

      await DAIe.connect(signers.user1).approve(qiDAI.address, daiAmount)
      await qiDAI.connect(signers.user1).mint(daiAmount)

      const depositAmount = await qiDAI.balanceOf(user1)
      const collateralAmount = depositAmount.mul(
        10n ** BigInt((await qiDAIVault.decimals()) - (await qiDAI.decimals()))
      )

      const borrowNXUSDAmount = ethers.utils.parseEther("100")
      const borrowFee = await qiDAIVCauldron.BORROW_OPENING_FEE()
      const borrowFeePrecision = "100000"
      const debtNXUSDAmount = borrowNXUSDAmount.add(
        borrowNXUSDAmount.mul(borrowFee).div(borrowFeePrecision)
      )

      console.log("mint Vault shares")
      // mint Vault shares
      await qiDAI.connect(signers.user1).approve(qiDAIVault.address, depositAmount)
      await qiDAIVault.connect(signers.user1).deposit(depositAmount, user1)
      expect(collateralAmount).to.eq(await qiDAIVault.balanceOf(user1))

      console.log("Cualdrons approve")

      // approve Cualdrons
      await degenBox
        .connect(signers.user1)
        .setMasterContractApproval(
          user1,
          await qiDAIVCauldron.callStatic.masterContract(),
          true,
          ethers.constants.Zero,
          ethers.utils.hexZeroPad("0x", 32),
          ethers.utils.hexZeroPad("0x", 32)
        )

      // add collateral
      await degenBox
        .connect(signers.user1)
        .deposit(qiDAIVault.address, user1, user1, collateralAmount, ethers.constants.Zero)
      expect(await degenBox.balanceOf(qiDAIVault.address, user1)).to.eq(collateralAmount)

      await qiDAIVCauldron.connect(signers.user1).addCollateral(user1, false, collateralAmount)
      expect(await degenBox.balanceOf(qiDAIVault.address, qiDAIVCauldron.address)).to.eq(
        collateralAmount
      )

      // borrow
      await qiDAIVCauldron.connect(signers.user1).borrow(user1, borrowNXUSDAmount)

      expect(await qiDAIVCauldron.userBorrowPart(user1)).to.eq(debtNXUSDAmount)
      expect(await degenBox.balanceOf(nxusd.address, user1)).to.eq(borrowNXUSDAmount)
      expect(
        await degenBox
          .connect(signers.user1)
          .withdraw(nxusd.address, user1, user1, borrowNXUSDAmount, ethers.constants.Zero)
      )
        .to.emit(nxusd, "Transfer")
        .withArgs(degenBox.address, user1, borrowNXUSDAmount)

      //repay
      await nxusd.connect(signers.user1).approve(degenBox.address, debtNXUSDAmount)
      await degenBox
        .connect(signers.user1)
        .deposit(nxusd.address, user1, user1, debtNXUSDAmount, ethers.constants.Zero)
      await qiDAIVCauldron.connect(signers.user1).repay(user1, false, debtNXUSDAmount)

      expect(await degenBox.balanceOf(nxusd.address, user1)).to.eq(0)
      expect(await degenBox.balanceOf(qiDAIVault.address, qiDAIVCauldron.address)).to.eq(
        collateralAmount
      )
      expect(await qiDAIVault.balanceOf(degenBox.address)).to.eq(collateralAmount)
      expect(await qiDAIVault.balanceOf(user1)).to.eq(0)

      // get back collateral
      await qiDAIVCauldron.connect(signers.user1).removeCollateral(user1, collateralAmount)
      await degenBox
        .connect(signers.user1)
        .withdraw(qiDAIVault.address, user1, user1, collateralAmount, ethers.constants.Zero)
      expect(await qiDAIVault.balanceOf(user1)).to.eq(collateralAmount)

      // get back qiDAI
      const qiDAIBalanceBeforeRedeem = await qiDAI.balanceOf(user1)
      const expectedRedeemAmount = collateralAmount.div(
        10n ** (18n - BigInt(await qiDAI.decimals()))
      )
      await qiDAIVault.connect(signers.user1).redeem(collateralAmount, user1, user1)
      expect(await qiDAIVault.balanceOf(user1)).to.eq(0)
      expect(await qiDAI.balanceOf(user1)).to.eq(qiDAIBalanceBeforeRedeem.add(expectedRedeemAmount))
    }).timeout(60000)
  })

  describe("qiDAIVOracle", () => {
    it("should verify oracle deployment", async () => {
      const { qiDAIVOracle, qiDAIVault } = await createTestEnv()

      expect(await qiDAIVOracle.name("0x")).to.eq("NqiDAI Chainlink")
      expect(await qiDAIVOracle.symbol("0x")).to.eq("NqiDAI/USD")
      expect(await qiDAIVOracle.priceFeed()).to.eq("0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300") //DAI ChainLink
      expect(await qiDAIVOracle.vault()).to.eq(qiDAIVault.address)
    })

    it("should verify oracle rate if Vault supply is 0", async () => {
      const { qiDAI, qiDAIVault, qiDAIVOracle } = await createTestEnv()

      const oracleAggregator = await ethers.getContractAt<IAggregatorV3Interface>(
        "IAggregatorV3Interface",
        await qiDAIVOracle.priceFeed()
      )
      const exchangeRate = await qiDAIVOracle.callStatic.peekSpot("0x")
      const exchangeRateExpected = ethers.BigNumber.from("47595035414435052555")
      expect(exchangeRate).to.be.closeTo(exchangeRateExpected, 1e12)

      const qiUnderlying = await ethers.getContractAt<IERC20Metadata>(
        "IERC20Metadata",
        await qiDAI.underlying()
      )
      const cExchangeRateDecimals = (await qiUnderlying.decimals()) + 18 - (await qiDAI.decimals())
      const rateToAggregatorPrice = ethers.BigNumber.from("10")
        .pow(BigInt(25 + (await oracleAggregator.decimals())))
        .mul(await qiDAI.callStatic.exchangeRateCurrent())
        .mul(exchangeRate)
        .div(10n ** BigInt(cExchangeRateDecimals + (await qiDAIVault.decimals()) + 25))

      const latestRoundData = await oracleAggregator.latestRoundData()
      expect(rateToAggregatorPrice).to.be.closeTo(latestRoundData.answer, 10)
    })

    it("should verify oracle rate if Vault supply > 0", async () => {
      const { DAIe, qiDAI, qiDAIVault, qiDAIVOracle, signers, user1 } = await createTestEnv()

      const daiAmount = ethers.utils.parseUnits("123", await qiDAI.decimals())
      await DAIe.connect(signers.user1).approve(qiDAI.address, daiAmount)
      await qiDAI.connect(signers.user1).mint(daiAmount)
      await qiDAI.connect(signers.user1).approve(qiDAIVault.address, ethers.constants.MaxUint256)
      await qiDAIVault.connect(signers.user1).deposit(await qiDAI.balanceOf(user1), user1)

      const oracleAggregator = await ethers.getContractAt<IAggregatorV3Interface>(
        "IAggregatorV3Interface",
        await qiDAIVOracle.priceFeed()
      )
      const exchangeRate = await qiDAIVOracle.callStatic.peekSpot("0x")
      const exchangeRateExpected = ethers.BigNumber.from("47595035414435052555")
      expect(exchangeRate).to.be.closeTo(exchangeRateExpected, 1e12)

      const qiUnderlying = await ethers.getContractAt<IERC20Metadata>(
        "IERC20Metadata",
        await qiDAI.underlying()
      )
      const cExchangeRateDecimals = (await qiUnderlying.decimals()) + 18 - (await qiDAI.decimals())
      const rateToAggregatorPrice = ethers.BigNumber.from("10")
        .pow(BigInt(25 + (await oracleAggregator.decimals())))
        .mul(await qiDAI.callStatic.exchangeRateCurrent())
        .mul(exchangeRate)
        .div(10n ** BigInt(cExchangeRateDecimals + (await qiDAIVault.decimals()) + 25))

      const latestRoundData = await oracleAggregator.latestRoundData()
      expect(rateToAggregatorPrice).to.be.closeTo(latestRoundData.answer, 10)
    })
  })
})
