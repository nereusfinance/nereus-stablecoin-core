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
  qiUSDCnVCauldron: CauldronV2
  qiUSDCnVault: TokenizedVaultV1
  qiUSDCnVOracle: TokenizedVaultCompOracle

  USDC: Contract
  qiUSDCn: Contract
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

describe("qiUSDCn", () => {
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

      await deployments.run(["qiUSDCnVault"], { resetMemory: false })
      const qiUSDCnVaultDeployment = await deployments.get("qiUSDCnVault")
      const qiUSDCnVault = await ethers.getContractAt<QiVault>(
        "QiVault",
        qiUSDCnVaultDeployment.address
      )

      await rewardsSwapper.addManager(qiUSDCnVault.address)

      await deployments.run(["qiUSDCnVOracle"], { resetMemory: false })
      await deployments.run(["qiUSDCnVCauldron"], { resetMemory: false })
      const qiUSDCnVCauldronDeployment = await deployments.get("qiUSDCnVCauldron")
      const qiUSDCnVCauldron = await ethers.getContractAt<CauldronV2>(
        "CauldronV2",
        qiUSDCnVCauldronDeployment.address
      )

      const qiUSDCnVOracle = await ethers.getContractAt<TokenizedVaultCompOracle>(
        "TokenizedVaultCompOracle",
        await qiUSDCnVCauldron.oracle()
      )

      const degenBox = await ethers.getContractAt<DegenBox>("DegenBox", degenBoxAddress)
      const comptroller = await ethers.getContractAt(comptrollerAbi, comptrollerAddress)

      const nxusd = await getTokenContract<NXUSD>(chainId, TokenSymbol.NXUSD, hre)
      const USDC = await getTokenContract(chainId, TokenSymbol.USDC, hre)
      const qiUSDCn = await getTokenContract(chainId, TokenSymbol.qiUSDCn, hre)
      const BenQi = await getTokenContract(chainId, TokenSymbol.BenQi, hre)
      const WAVAX = await getTokenContract(chainId, TokenSymbol.WAVAX, hre)

      await impersonateAccount(nxusdMultisigOwnerAddress)
      await nxusd
        .connect(signers.nxusdMultisigOwner)
        .mintToBentoBox(
          qiUSDCnVCauldron.address,
          ethers.utils.parseEther("1000000"),
          degenBox.address
        )
      await stopImpersonatingAccount(nxusdMultisigOwnerAddress)

      await erc20TopUp(user1, "20000", TokenSymbol.USDC, { ethers })
      await erc20TopUp(user1, "10000", TokenSymbol.NXUSD, { ethers })

      return {
        qiUSDCnVCauldron,
        qiUSDCnVault,
        qiUSDCnVOracle,

        USDC,
        qiUSDCn,
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

  describe("qiUSDCn token", () => {
    it("should mint, redeem qiUSDCn and claim QI+AVAX rewards", async () => {
      const { USDC, qiUSDCn, BenQi, comptroller, signers, user1 } = await createTestEnv()

      const depositAmount = ethers.utils.parseUnits("10000", await USDC.decimals())
      const benQiDecimals = await BenQi.decimals()
      const qiUSDCnDecimals = await qiUSDCn.decimals()

      // USDCAmount = qiUSDCnAmount * exchangeRateCurrent
      console.log(
        "qiUSDCn.exchangeRateCurrent",
        (await qiUSDCn.callStatic.exchangeRateCurrent()).toString()
      )

      expect(await qiUSDCn.balanceOf(user1)).to.eq(0)

      await USDC.connect(signers.user1).approve(qiUSDCn.address, depositAmount)
      await qiUSDCn.connect(signers.user1).mint(depositAmount)

      const qiUSDCnBalance = await qiUSDCn.balanceOf(user1)
      console.log(
        "qiUSDCn balance after mint with 10000 USDC",
        ethers.utils.formatUnits(qiUSDCnBalance, qiUSDCnDecimals)
      )
      expect(qiUSDCnBalance).to.be.gt(ethers.constants.Zero)

      const days10 = 60 * 60 * 24 * 10
      await increase(days10)

      // call redeem to refresh rewardAccrued
      await qiUSDCn.connect(signers.user1).redeem(1n)

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

      await qiUSDCn.connect(signers.user1).redeem(await qiUSDCn.balanceOf(user1))

      expect(await qiUSDCn.balanceOf(user1)).to.eq(0)
    }).timeout(60000)
  })

  describe("qiUSDCnVault", () => {
    it("should verify qiUSDCnVault deployment", async () => {
      console.assert(network.config.chainId === ChainId.Avalanche)

      const { qiUSDCn, qiUSDCnVault } = await createTestEnv()

      expect(await qiUSDCn.symbol()).to.eq("qiUSDCn")

      const qiUSDCnAddress = "0xB715808a78F6041E46d61Cb123C9B4A27056AE9C"
      expect(await qiUSDCnVault.asset()).to.eq(qiUSDCnAddress)
      expect(await qiUSDCnVault.decimals()).to.eq(18)
      expect(await qiUSDCnVault.name()).to.eq("Nereus Benqi USDCn Vault")
      expect(await qiUSDCnVault.symbol()).to.eq("NqiUSDCn")
    })

    it("should verify qiUSDCnVCauldron deployment", async () => {
      const { qiUSDCnVault, qiUSDCnVCauldron } = await createTestEnv()

      expect(await qiUSDCnVCauldron.bentoBox()).to.eq("0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775")
      expect(await qiUSDCnVCauldron.collateral()).to.eq(qiUSDCnVault.address)
      expect(await qiUSDCnVCauldron.masterContract()).to.eq(
        "0xE767C6C3Bf42f550A5A258A379713322B6c4c060"
      )
      expect(await qiUSDCnVCauldron.BORROW_OPENING_FEE()).to.eq(500) // 0.5 %
      expect(await qiUSDCnVCauldron.COLLATERIZATION_RATE()).to.eq(90 * 1e3) // 90 %
      expect(await qiUSDCnVCauldron.LIQUIDATION_MULTIPLIER()).to.eq(5 * 1e3 + 1e5) // multiplier 1.05 = 5% liquidation fee
    })

    it("should deposit qiUSDCn, mint shares and redeem shares including swapped QI+AVAX rewards", async () => {
      const { USDC, qiUSDCn, qiUSDCnVault, signers, user1 } = await createTestEnv()

      const daiAmount = ethers.utils.parseUnits("1000", await USDC.decimals())

      await USDC.connect(signers.user1).approve(qiUSDCn.address, daiAmount)
      expect(await qiUSDCn.balanceOf(user1)).to.eq(0)
      await qiUSDCn.connect(signers.user1).mint(daiAmount)

      const depositAmount = await qiUSDCn.balanceOf(user1)

      const sharesAmount = depositAmount.mul(
        10n ** BigInt((await qiUSDCnVault.decimals()) - (await qiUSDCn.decimals()))
      )

      await qiUSDCn.connect(signers.user1).approve(qiUSDCnVault.address, depositAmount)

      expect(await qiUSDCnVault.totalAssets()).to.eq(0)

      expect(await qiUSDCnVault.connect(signers.user1).deposit(depositAmount, user1))
        .to.emit(qiUSDCn, "Transfer")
        .withArgs(user1, qiUSDCnVault.address, depositAmount)
        .to.emit(qiUSDCnVault, "Transfer")
        .withArgs(ethers.constants.AddressZero, user1, sharesAmount)

      const days10 = 60 * 60 * 24 * 10
      await increase(days10)

      expect(await qiUSDCnVault.totalAssets()).to.eq(depositAmount)
      expect(await qiUSDCnVault.balanceOf(user1)).to.eq(sharesAmount)

      await qiUSDCnVault.connect(signers.user1).redeem(sharesAmount, user1, user1)

      expect(await qiUSDCnVault.totalAssets()).to.eq(0)
      expect(await qiUSDCnVault.balanceOf(user1)).to.eq(0)
      expect(await qiUSDCn.balanceOf(user1)).to.gt(depositAmount)
    }).timeout(60000)

    it("should add collateral, borrow, repay and get back collateral", async () => {
      const { USDC, qiUSDCn, qiUSDCnVault, qiUSDCnVCauldron, degenBox, nxusd, signers, user1 } =
        await createTestEnv()
      const daiAmount = ethers.utils.parseUnits("1000", await USDC.decimals())

      await USDC.connect(signers.user1).approve(qiUSDCn.address, daiAmount)
      await qiUSDCn.connect(signers.user1).mint(daiAmount)

      const depositAmount = await qiUSDCn.balanceOf(user1)
      const collateralAmount = depositAmount.mul(
        10n ** BigInt((await qiUSDCnVault.decimals()) - (await qiUSDCn.decimals()))
      )

      const borrowNXUSDAmount = ethers.utils.parseEther("100")
      const borrowFee = await qiUSDCnVCauldron.BORROW_OPENING_FEE()
      const borrowFeePrecision = "100000"
      const debtNXUSDAmount = borrowNXUSDAmount.add(
        borrowNXUSDAmount.mul(borrowFee).div(borrowFeePrecision)
      )

      console.log("mint Vault shares")
      // mint Vault shares
      await qiUSDCn.connect(signers.user1).approve(qiUSDCnVault.address, depositAmount)
      await qiUSDCnVault.connect(signers.user1).deposit(depositAmount, user1)
      expect(collateralAmount).to.eq(await qiUSDCnVault.balanceOf(user1))

      console.log("Cualdrons approve")

      // approve Cualdrons
      await degenBox
        .connect(signers.user1)
        .setMasterContractApproval(
          user1,
          await qiUSDCnVCauldron.callStatic.masterContract(),
          true,
          ethers.constants.Zero,
          ethers.utils.hexZeroPad("0x", 32),
          ethers.utils.hexZeroPad("0x", 32)
        )

      // add collateral
      await degenBox
        .connect(signers.user1)
        .deposit(qiUSDCnVault.address, user1, user1, collateralAmount, ethers.constants.Zero)
      expect(await degenBox.balanceOf(qiUSDCnVault.address, user1)).to.eq(collateralAmount)

      await qiUSDCnVCauldron.connect(signers.user1).addCollateral(user1, false, collateralAmount)
      expect(await degenBox.balanceOf(qiUSDCnVault.address, qiUSDCnVCauldron.address)).to.eq(
        collateralAmount
      )

      // borrow
      await qiUSDCnVCauldron.connect(signers.user1).borrow(user1, borrowNXUSDAmount)

      expect(await qiUSDCnVCauldron.userBorrowPart(user1)).to.eq(debtNXUSDAmount)
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
      await qiUSDCnVCauldron.connect(signers.user1).repay(user1, false, debtNXUSDAmount)

      expect(await degenBox.balanceOf(nxusd.address, user1)).to.eq(0)
      expect(await degenBox.balanceOf(qiUSDCnVault.address, qiUSDCnVCauldron.address)).to.eq(
        collateralAmount
      )
      expect(await qiUSDCnVault.balanceOf(degenBox.address)).to.eq(collateralAmount)
      expect(await qiUSDCnVault.balanceOf(user1)).to.eq(0)

      // get back collateral
      await qiUSDCnVCauldron.connect(signers.user1).removeCollateral(user1, collateralAmount)
      await degenBox
        .connect(signers.user1)
        .withdraw(qiUSDCnVault.address, user1, user1, collateralAmount, ethers.constants.Zero)
      expect(await qiUSDCnVault.balanceOf(user1)).to.eq(collateralAmount)

      // get back qiUSDCn
      const qiUSDCnBalanceBeforeRedeem = await qiUSDCn.balanceOf(user1)
      const expectedRedeemAmount = collateralAmount.div(
        10n ** (18n - BigInt(await qiUSDCn.decimals()))
      )
      await qiUSDCnVault.connect(signers.user1).redeem(collateralAmount, user1, user1)
      expect(await qiUSDCnVault.balanceOf(user1)).to.eq(0)
      expect(await qiUSDCn.balanceOf(user1)).to.eq(
        qiUSDCnBalanceBeforeRedeem.add(expectedRedeemAmount)
      )
    }).timeout(60000)
  })

  describe("qiUSDCnVOracle", () => {
    it("should verify oracle deployment", async () => {
      const { qiUSDCnVOracle, qiUSDCnVault } = await createTestEnv()

      expect(await qiUSDCnVOracle.name("0x")).to.eq("NqiUSDCn Chainlink")
      expect(await qiUSDCnVOracle.symbol("0x")).to.eq("NqiUSDCn/USD")
      expect(await qiUSDCnVOracle.priceFeed()).to.eq("0xF096872672F44d6EBA71458D74fe67F9a77a23B9") //USDC ChainLink
      expect(await qiUSDCnVOracle.vault()).to.eq(qiUSDCnVault.address)
    })

    it("should verify oracle rate", async () => {
      const { USDC, qiUSDCn, qiUSDCnVault, qiUSDCnVOracle, signers, user1 } = await createTestEnv()

      const daiAmount = ethers.utils.parseUnits("123", await qiUSDCn.decimals())
      await USDC.connect(signers.user1).approve(qiUSDCn.address, daiAmount)
      await qiUSDCn.connect(signers.user1).mint(daiAmount)
      await qiUSDCn
        .connect(signers.user1)
        .approve(qiUSDCnVault.address, ethers.constants.MaxUint256)
      await qiUSDCnVault.connect(signers.user1).deposit(await qiUSDCn.balanceOf(user1), user1)

      const oracleAggregator = await ethers.getContractAt<IAggregatorV3Interface>(
        "IAggregatorV3Interface",
        await qiUSDCnVOracle.priceFeed()
      )

      const exchangeRate = await qiUSDCnVOracle.callStatic.peekSpot("0x")
      const exchangeRateExpected = ethers.BigNumber.from("49577068793145655892")
      expect(exchangeRate).to.be.closeTo(exchangeRateExpected, 1e12)

      const qiUnderlying = await ethers.getContractAt<IERC20Metadata>(
        "IERC20Metadata",
        await qiUSDCn.underlying()
      )
      const cExchangeRateDecimals =
        (await qiUnderlying.decimals()) + 18 - (await qiUSDCn.decimals())
      const rateToAggregatorPrice = ethers.BigNumber.from("10")
        .pow(BigInt(await oracleAggregator.decimals()))
        .mul(await qiUSDCn.callStatic.exchangeRateCurrent())
        .mul(exchangeRate)
        .div(10n ** BigInt(cExchangeRateDecimals + (await qiUSDCnVault.decimals())))

      const latestRoundData = await oracleAggregator.latestRoundData()
      expect(rateToAggregatorPrice).to.be.closeTo(latestRoundData.answer, 1e5)
    })
  })
})
