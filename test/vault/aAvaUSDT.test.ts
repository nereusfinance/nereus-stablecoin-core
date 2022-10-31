import { expect } from "chai"
import hre, { artifacts, deployments, ethers, getNamedAccounts, network, run } from "hardhat"
import {
  CauldronV2,
  DegenBox,
  IAggregatorV3Interface,
  ILiquidator,
  NXUSD,
  OracleMock,
  TokenizedVaultOracle,
  TokenizedVaultV1,
  VaultRewardSwapperV1,
} from "../../typechain"
import { Contract, Signer } from "ethers"
import avaRewardsControllerAbi from "../../utilities/abis/avaRewardsControllerAbi.json"
import { erc20TopUp, getTokenContract, TokenSymbol } from "../../utilities/tokens"
import { ChainId } from "../../utilities"
import {
  impersonateAccount,
  mine,
  setBalance,
  setCode,
  stopImpersonatingAccount,
} from "@nomicfoundation/hardhat-network-helpers"
import { increase } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time"
import { getOraclePriceUsd, mockOraclePriceUsd } from "../../utilities/oracle"
import { forkAvalancheMainnet } from "../../utilities/fork"
import { buildPermitSignatureParams, getSignatureFromTypedData } from "../../utilities/signature"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers"

type FixtureType = (options?: any) => Promise<{
  aAvaUSDT: Contract
  aAvaUSDTVault: TokenizedVaultV1
  aAvaUSDTVCauldron: CauldronV2
  aAvaUSDTVOracle: TokenizedVaultOracle
  rewardsSwapper: VaultRewardSwapperV1

  degenBox: DegenBox
  nxusd: NXUSD
  liquidator: ILiquidator
  avaRewardsController: Contract

  user1: string
  user2: string

  signers: {
    deployer: Signer
    user1: SignerWithAddress
    user2: Signer
    liquidatorManager: Signer
    nxusdMultisigOwner: Signer
  }
}>

describe("aAvaUSDT", () => {
  const degenBoxAddress = "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775"
  const nxusdMultisigOwnerAddress = "0xdD3dE3B819EDD3a014fDA93868d7Dfc873341467"
  const liquidatorAddress = "0xB0B69A8E0cf6cCfe62590d1133767E07A773adFf"
  const avaRewardsControllerAddress = "0x929EC64c34a17401F460460D4B9390518E5B473e"

  let createTestEnv: FixtureType
  before(() => {
    createTestEnv = deployments.createFixture(async () => {
      await forkAvalancheMainnet(19865000, hre)
      const chainId = network.config.chainId

      const { deployer, user1, user2 } = await getNamedAccounts()
      const liquidatorManager = "0x48348529901a24c2d327910Ae990BC3f84e803fF"
      await impersonateAccount(liquidatorManager)
      await setBalance(liquidatorManager, ethers.utils.parseEther("100"))
      const signers = {
        deployer: await ethers.getSigner(deployer),
        user1: await ethers.getSigner(user1),
        user2: await ethers.getSigner(user2),
        liquidatorManager: await ethers.getSigner(liquidatorManager),
        nxusdMultisigOwner: await ethers.getSigner(nxusdMultisigOwnerAddress),
      }

      await deployments.run(["VaultRewardSwapperV1"], { resetMemory: false })
      const rewardsSwapperDeployment = await deployments.get("VaultRewardSwapperProxy")
      const rewardsSwapper = await ethers.getContractAt<VaultRewardSwapperV1>(
        "VaultRewardSwapperV1",
        rewardsSwapperDeployment.address
      )
      await run("configure-vault-swapper-p3", { swapper: rewardsSwapper.address })

      await deployments.run(["aAvaUSDTVault"], { resetMemory: false })
      const aAvaUSDTVaultDeployment = await deployments.get("aAvaUSDTVault")
      const aAvaUSDTVault = await ethers.getContractAt<TokenizedVaultV1>(
        "TokenizedVaultV1",
        aAvaUSDTVaultDeployment.address
      )
      await rewardsSwapper.addManager(aAvaUSDTVault.address)

      await deployments.run(["aAvaUSDTVOracle"], { resetMemory: false })
      await deployments.run(["aAvaUSDTVCauldron"], { resetMemory: false })
      const aAvaUSDTVCauldronDeployment = await deployments.get("aAvaUSDTVCauldron")
      const aAvaUSDTVCauldron = await ethers.getContractAt<CauldronV2>(
        "CauldronV2",
        aAvaUSDTVCauldronDeployment.address
      )

      const aAvaUSDTVOracle = await ethers.getContractAt<TokenizedVaultOracle>(
        "TokenizedVaultOracle",
        await aAvaUSDTVCauldron.oracle()
      )

      const degenBox = await ethers.getContractAt<DegenBox>("DegenBox", degenBoxAddress)
      const nxusd = await getTokenContract<NXUSD>(chainId, TokenSymbol.NXUSD, hre)
      const aAvaUSDT = await getTokenContract(chainId, TokenSymbol.aAvaUSDT, hre)

      const liquidator = await ethers.getContractAt<ILiquidator>("ILiquidator", liquidatorAddress)
      const avaRewardsController = await ethers.getContractAt(
        avaRewardsControllerAbi,
        avaRewardsControllerAddress
      )

      await impersonateAccount(nxusdMultisigOwnerAddress)
      await nxusd
        .connect(signers.nxusdMultisigOwner)
        .mintToBentoBox(
          aAvaUSDTVCauldron.address,
          ethers.utils.parseEther("1000000"),
          degenBox.address
        )
      await liquidator.connect(signers.nxusdMultisigOwner).addManager(liquidatorManager)
      await stopImpersonatingAccount(nxusdMultisigOwnerAddress)

      await erc20TopUp(user1, "20000", TokenSymbol.aAvaUSDT, { ethers })
      await erc20TopUp(user1, "10000", TokenSymbol.NXUSD, { ethers })

      return {
        aAvaUSDT,
        aAvaUSDTVault,
        aAvaUSDTVCauldron,
        aAvaUSDTVOracle,

        rewardsSwapper,
        degenBox,
        nxusd,
        liquidator,
        avaRewardsController,

        signers,
        user1,
        user2,
      }
    })
  })

  it("should verify aAvaUSDTVault deployment", async () => {
    console.assert(network.config.chainId === ChainId.Avalanche)

    const { aAvaUSDT, aAvaUSDTVault } = await createTestEnv()

    expect(await aAvaUSDT.symbol()).to.eq("aAvaUSDT")

    const aAvaUSDTAddress = "0x6ab707Aca953eDAeFBc4fD23bA73294241490620"
    expect(await aAvaUSDTVault.asset()).to.eq(aAvaUSDTAddress)
    expect(await aAvaUSDTVault.decimals()).to.eq(18)
    expect(await aAvaUSDTVault.name()).to.eq("Nereus Aave Avalanche USDT Vault")
    expect(await aAvaUSDTVault.symbol()).to.eq("NaAvaUSDT")

    const wavaxAddress = await aAvaUSDTVault.rewardAssets(0)
    expect(wavaxAddress).to.eq(
      ethers.utils.getAddress("0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7")
    )
  })

  it("should verify aAvaUSDTVCauldron deployment", async () => {
    const { aAvaUSDTVault, aAvaUSDTVCauldron } = await createTestEnv()

    expect(await aAvaUSDTVCauldron.bentoBox()).to.eq("0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775")
    expect(await aAvaUSDTVCauldron.collateral()).to.eq(aAvaUSDTVault.address)
    expect(await aAvaUSDTVCauldron.masterContract()).to.eq(
      "0xE767C6C3Bf42f550A5A258A379713322B6c4c060"
    )
    expect(await aAvaUSDTVCauldron.BORROW_OPENING_FEE()).to.eq(500) // 0.5 %
    expect(await aAvaUSDTVCauldron.COLLATERIZATION_RATE()).to.eq(90 * 1e3) // 90 %
    expect(await aAvaUSDTVCauldron.LIQUIDATION_MULTIPLIER()).to.eq(5 * 1e3 + 1e5) // multiplier 1.05 = 5% liquidation fee
  })

  it("should deposit aAvaUSDT to mint shares and redeem shares", async () => {
    const { aAvaUSDT, aAvaUSDTVault, avaRewardsController, rewardsSwapper, signers, user1 } =
      await createTestEnv()
    const depositAmount = ethers.utils.parseUnits("10000", await aAvaUSDT.decimals())
    const sharesAmount = ethers.utils.parseUnits("10000", await aAvaUSDTVault.decimals())

    await aAvaUSDT.connect(signers.user1).approve(aAvaUSDTVault.address, depositAmount)

    expect(await aAvaUSDTVault.totalAssets()).to.eq(0)

    expect(await aAvaUSDTVault.connect(signers.user1).deposit(depositAmount, user1))
      .to.emit(aAvaUSDT, "Transfer")
      .withArgs(user1, aAvaUSDTVault.address, depositAmount)
      .to.emit(aAvaUSDTVault, "Transfer")
      .withArgs(ethers.constants.AddressZero, user1, sharesAmount)

    // increase blockchain timestamp to bypass compound idle period and to reach min swap amount
    const days1 = 60 * 60 * 24
    await increase(days1)

    expect(await aAvaUSDTVault.totalAssets()).to.be.gt(depositAmount)
    expect(await aAvaUSDTVault.balanceOf(user1)).to.eq(sharesAmount)

    const unclaimedWavaxRewards = (
      await avaRewardsController.getAllUserRewards([aAvaUSDT.address], aAvaUSDTVault.address)
    ).unclaimedAmounts[0]

    await expect(aAvaUSDTVault.connect(signers.user1).redeem(sharesAmount, user1, user1))
      .to.emit(rewardsSwapper, "Swap")
      .withArgs(
        await aAvaUSDTVault.rewardAssets(0), //tokenIn = rewardAsset = WAVAX
        aAvaUSDT.address, //tokenOut
        (amountIn) => amountIn.gt(unclaimedWavaxRewards),
        37936, // amountOut = aAvaUSDT received after trade and supply
        aAvaUSDTVault.address
      )
  })

  it("should deposit aAvaUSDT to mint shares and redeem shares without compound", async () => {
    const { aAvaUSDT, aAvaUSDTVault, rewardsSwapper, signers, user1 } = await createTestEnv()
    const depositAmount = ethers.utils.parseUnits("10000", await aAvaUSDT.decimals())
    const sharesAmount = ethers.utils.parseUnits("10000", await aAvaUSDTVault.decimals())

    await aAvaUSDT.connect(signers.user1).approve(aAvaUSDTVault.address, depositAmount)

    expect(await aAvaUSDTVault.totalAssets()).to.eq(0)

    expect(await aAvaUSDTVault.connect(signers.user1).deposit(depositAmount, user1))
      .to.emit(aAvaUSDT, "Transfer")
      .withArgs(user1, aAvaUSDTVault.address, depositAmount)
      .to.emit(aAvaUSDTVault, "Transfer")
      .withArgs(ethers.constants.AddressZero, user1, sharesAmount)

    // increase blockchain timestamp to bypass compound idle period and to reach min swap amount
    const days1 = 60 * 60 * 24
    await increase(days1)

    expect(await aAvaUSDTVault.totalAssets()).to.be.gt(depositAmount)
    expect(await aAvaUSDTVault.balanceOf(user1)).to.eq(sharesAmount)

    await expect(
      aAvaUSDTVault.connect(signers.user1).redeemWithoutCompound(sharesAmount, user1, user1)
    ).to.not.emit(rewardsSwapper, "Swap")
  })

  it("should deposit aAvaUSDT with permit and mint shares", async () => {
    const { aAvaUSDT, aAvaUSDTVault, signers, user1 } = await createTestEnv()
    const depositAmount = ethers.utils.parseUnits("1000", await aAvaUSDT.decimals())
    const sharesAmount = ethers.utils.parseUnits("1000", await aAvaUSDTVault.decimals())

    expect(await aAvaUSDTVault.totalAssets()).to.eq(0)

    const deadline = Math.trunc(Date.now() / 1000) + 60 //seconds
    const permitParams = buildPermitSignatureParams({
      chainId: Number(network.config.chainId),
      verifyingContract: aAvaUSDT.address,
      version: "1",
      domainName: await aAvaUSDT.name(),
      owner: user1,
      spender: aAvaUSDTVault.address,
      nonce: (await aAvaUSDT.nonces(user1)).toNumber(),
      deadline: deadline.toString(),
      value: depositAmount.toString(),
    })
    const { v, r, s } = await getSignatureFromTypedData(user1, permitParams, hre)

    expect(
      await aAvaUSDTVault
        .connect(signers.user1)
        .depositWithPermit(depositAmount, user1, deadline, v, r, s)
    )
      .to.emit(aAvaUSDT, "Transfer")
      .withArgs(user1, aAvaUSDTVault.address, depositAmount)
      .to.emit(aAvaUSDTVault, "Transfer")
      .withArgs(ethers.constants.AddressZero, user1, sharesAmount)

    await mine()

    expect(await aAvaUSDTVault.totalAssets()).to.be.gt(depositAmount)
    expect(await aAvaUSDTVault.balanceOf(user1)).to.eq(sharesAmount)
  })

  it("should add collateral, borrow, repay and get back collateral", async () => {
    const { aAvaUSDT, aAvaUSDTVault, aAvaUSDTVCauldron, degenBox, nxusd, signers, user1 } =
      await createTestEnv()
    const depositAmount = ethers.utils.parseUnits("1000", await aAvaUSDT.decimals())
    const collateralAmount = ethers.utils.parseUnits("1000", await aAvaUSDTVault.decimals())
    const borrowNXUSDAmount = ethers.utils.parseEther("100")
    const borrowFee = await aAvaUSDTVCauldron.BORROW_OPENING_FEE()
    const borrowFeePrecision = "100000"
    const debtNXUSDAmount = borrowNXUSDAmount.add(
      borrowNXUSDAmount.mul(borrowFee).div(borrowFeePrecision)
    )

    // mint Vault shares
    await aAvaUSDT.connect(signers.user1).approve(aAvaUSDTVault.address, depositAmount)
    await aAvaUSDTVault.connect(signers.user1).deposit(depositAmount, user1)

    // Bentobox has default approval
    // await aAvaUSDTVault.connect(signers.user1).approve(degenBox.address, collateralAmount);

    // approve Cualdrons
    await degenBox
      .connect(signers.user1)
      .setMasterContractApproval(
        user1,
        await aAvaUSDTVCauldron.masterContract(),
        true,
        ethers.constants.Zero,
        ethers.utils.hexZeroPad("0x", 32),
        ethers.utils.hexZeroPad("0x", 32)
      )

    // add collateral
    await degenBox
      .connect(signers.user1)
      .deposit(aAvaUSDTVault.address, user1, user1, collateralAmount, ethers.constants.Zero)
    await aAvaUSDTVCauldron.connect(signers.user1).addCollateral(user1, false, collateralAmount)

    // borrow
    await aAvaUSDTVCauldron.connect(signers.user1).borrow(user1, borrowNXUSDAmount)
    expect(await aAvaUSDTVCauldron.userBorrowPart(user1)).to.eq(debtNXUSDAmount)
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
    await aAvaUSDTVCauldron.connect(signers.user1).repay(user1, false, debtNXUSDAmount)

    expect(await degenBox.balanceOf(nxusd.address, user1)).to.eq(0)
    expect(await degenBox.balanceOf(aAvaUSDTVault.address, aAvaUSDTVCauldron.address)).to.eq(
      collateralAmount
    )
    expect(await aAvaUSDTVault.balanceOf(degenBox.address)).to.eq(collateralAmount)
    expect(await aAvaUSDTVault.balanceOf(user1)).to.eq(0)

    // get back collateral
    await aAvaUSDTVCauldron.connect(signers.user1).removeCollateral(user1, collateralAmount)
    await degenBox
      .connect(signers.user1)
      .withdraw(aAvaUSDTVault.address, user1, user1, collateralAmount, ethers.constants.Zero)
    expect(await aAvaUSDTVault.balanceOf(user1)).to.eq(collateralAmount)

    // get back aAvaUSDT
    const aAvaUSDTBalanceBeforeRedeem = await aAvaUSDT.balanceOf(user1)
    const expectedRedeemAmount = collateralAmount.div(
      10n ** (18n - BigInt(await aAvaUSDT.decimals()))
    )
    await aAvaUSDTVault.connect(signers.user1).redeem(collateralAmount, user1, user1)
    expect(await aAvaUSDTVault.balanceOf(user1)).to.eq(0)
    expect(await aAvaUSDT.balanceOf(user1)).to.gt(
      aAvaUSDTBalanceBeforeRedeem.add(expectedRedeemAmount)
    )
  })

  describe("Liquidation flow", () => {
    const prepareDebtPosition = async (
      { depositAmount, collateralAmount, borrowNXUSDAmount },
      testEnv
    ) => {
      const { aAvaUSDT, aAvaUSDTVault, aAvaUSDTVCauldron, degenBox, nxusd, signers, user1 } =
        testEnv

      const oracleMockArtifact = await artifacts.readArtifact("OracleMock")
      const oracleAddress = await aAvaUSDTVCauldron.oracle()
      console.log("updating oracle...", oracleAddress)
      await setCode(oracleAddress, oracleMockArtifact.deployedBytecode)

      const aAvaUSDTVOracleMock = await ethers.getContractAt<OracleMock>(
        "OracleMock",
        oracleAddress
      )

      const initPriceUsd = "2.3"
      await mockOraclePriceUsd(
        initPriceUsd,
        aAvaUSDTVault,
        aAvaUSDTVOracleMock,
        aAvaUSDTVCauldron,
        hre
      )
      console.log(
        "mocked oracle price USD",
        await getOraclePriceUsd(aAvaUSDTVOracleMock, aAvaUSDTVault, hre)
      )

      const borrowFee = await aAvaUSDTVCauldron.BORROW_OPENING_FEE()
      const borrowFeePrecision = "100000"
      const debtNXUSDAmount = borrowNXUSDAmount.add(
        borrowNXUSDAmount.mul(borrowFee).div(borrowFeePrecision)
      )

      // mint Vault shares
      await aAvaUSDT.connect(signers.user1).approve(aAvaUSDTVault.address, depositAmount)
      await aAvaUSDTVault.connect(signers.user1).deposit(depositAmount, user1)

      // Bentobox has default approval
      // await aAvaUSDTVault.connect(signers.user1).approve(degenBox.address, collateralAmount);

      // approve Cualdrons
      await degenBox
        .connect(signers.user1)
        .setMasterContractApproval(
          user1,
          await aAvaUSDTVCauldron.masterContract(),
          true,
          ethers.constants.Zero,
          ethers.utils.hexZeroPad("0x", 32),
          ethers.utils.hexZeroPad("0x", 32)
        )

      // add collateral
      await degenBox
        .connect(signers.user1)
        .deposit(aAvaUSDTVault.address, user1, user1, collateralAmount, ethers.constants.Zero)
      await aAvaUSDTVCauldron.connect(signers.user1).addCollateral(user1, false, collateralAmount)

      // borrow
      await aAvaUSDTVCauldron.connect(signers.user1).borrow(user1, borrowNXUSDAmount)
      expect(await aAvaUSDTVCauldron.userBorrowPart(user1)).to.eq(debtNXUSDAmount)
      expect(await degenBox.balanceOf(nxusd.address, user1)).to.eq(borrowNXUSDAmount)
      expect(
        await degenBox
          .connect(signers.user1)
          .withdraw(nxusd.address, user1, user1, borrowNXUSDAmount, ethers.constants.Zero)
      )
        .to.emit(nxusd, "Transfer")
        .withArgs(degenBox.address, user1, borrowNXUSDAmount)

      return { aAvaUSDTVOracleMock, debtNXUSDAmount }
    }

    it("should liquidate user's position if price drops below solvency and retrieve underlying asset", async () => {
      const testEnv = await createTestEnv()
      const {
        aAvaUSDT,
        aAvaUSDTVault,
        aAvaUSDTVCauldron,
        degenBox,
        liquidator,
        signers,
        user1,
        user2,
      } = testEnv

      const depositAmount = ethers.utils.parseUnits("1000", await aAvaUSDT.decimals())
      const collateralAmount = ethers.utils.parseUnits("1000", await aAvaUSDTVault.decimals())
      const borrowNXUSDAmount = ethers.utils.parseEther("2000")
      const { aAvaUSDTVOracleMock, debtNXUSDAmount } = await prepareDebtPosition(
        { depositAmount, collateralAmount, borrowNXUSDAmount },
        testEnv
      )

      const [user1Data] = await liquidator.getBatchUserData(aAvaUSDTVCauldron.address, [user1])
      expect(user1Data.borrowPart).to.eq(debtNXUSDAmount)
      expect(user1Data.isSolvent).to.be.true

      await mockOraclePriceUsd("1.5", aAvaUSDTVault, aAvaUSDTVOracleMock, aAvaUSDTVCauldron, hre)

      const [user1DataAfter] = await liquidator.getBatchUserData(aAvaUSDTVCauldron.address, [user1])
      expect(user1DataAfter.isSolvent).to.be.false

      const exchangeRate = await aAvaUSDTVCauldron.callStatic.exchangeRate()
      const LIQUIDATION_MULTIPLIER = await aAvaUSDTVCauldron.LIQUIDATION_MULTIPLIER()
      const maxDebtToLiquidate = collateralAmount
        .mul(10n ** 5n)
        .mul(10n ** 18n)
        .div(await aAvaUSDTVCauldron.LIQUIDATION_MULTIPLIER())
        .div(exchangeRate)

      console.log("maxDebtToCover", maxDebtToLiquidate.toString())

      expect(await degenBox.balanceOf(aAvaUSDTVault.address, liquidator.address)).to.eq(
        ethers.constants.Zero
      )

      const debtToLiquidate = ethers.utils.parseEther("1000")
      const collateralToReceive = debtToLiquidate
        .mul(exchangeRate)
        .mul(LIQUIDATION_MULTIPLIER)
        .div(10n ** 18n)
        .div(10n ** 5n)

      console.log("collateralToReceive", collateralToReceive.toString())
      await liquidator
        .connect(signers.liquidatorManager)
        .liquidate(aAvaUSDTVCauldron.address, [user1], [debtToLiquidate], false)

      expect(await degenBox.balanceOf(aAvaUSDTVault.address, liquidator.address)).to.eq(
        collateralToReceive
      )

      await impersonateAccount(nxusdMultisigOwnerAddress)
      await liquidator
        .connect(signers.nxusdMultisigOwner)
        .withdrawBentoBox(degenBox.address, aAvaUSDTVault.address, user2, collateralToReceive)
      await stopImpersonatingAccount(nxusdMultisigOwnerAddress)

      expect(await aAvaUSDTVault.balanceOf(user2)).to.eq(collateralToReceive)

      expect(await aAvaUSDT.balanceOf(user2)).to.eq(0)

      const underlyingAssetAmount = await aAvaUSDTVault.callStatic.convertToAssets(
        collateralToReceive
      )

      await aAvaUSDTVault.connect(signers.user2).redeem(collateralToReceive, user2, user2)

      console.log("underlyingAssetAmount", underlyingAssetAmount.toString())
      const balanceAfterRedeem = await aAvaUSDT.balanceOf(user2)
      expect(balanceAfterRedeem).to.be.closeTo(underlyingAssetAmount, 10)
    })
  })

  describe("AaveVault with compounding", () => {
    it("should claim rewards and swap to underlying asset if called compound", async () => {
      const testEnv = await createTestEnv()
      const { aAvaUSDT, aAvaUSDTVault, avaRewardsController, signers, user1 } = testEnv

      const depositAmount = ethers.utils.parseUnits("10000", await aAvaUSDT.decimals())

      await aAvaUSDT
        .connect(signers.user1)
        .approve(aAvaUSDTVault.address, ethers.constants.MaxUint256)

      expect(await aAvaUSDTVault.totalAssets()).to.eq(0)

      await aAvaUSDTVault.connect(signers.user1).deposit(depositAmount, user1)

      const days10 = 60 * 60 * 24 * 10
      await increase(days10)

      console.log(
        "underlying assets before compound",
        (await aAvaUSDTVault.totalAssets()).toString()
      )
      console.log(
        "unclaimed rewards before compound",
        (
          await avaRewardsController.getAllUserRewards([aAvaUSDT.address], aAvaUSDTVault.address)
        ).unclaimedAmounts[0].toString()
      )

      await aAvaUSDTVault.compound()

      console.log(
        "underlying assets after compound",
        (await aAvaUSDTVault.totalAssets()).toString()
      )

      expect(
        await (
          await avaRewardsController.getAllUserRewards([aAvaUSDT.address], aAvaUSDTVault.address)
        ).unclaimedAmounts[0]
      ).to.eq(0)
    })
  })

  describe("aAvaUSDTVOracle", () => {
    it("should verify oracle deployment", async () => {
      const { aAvaUSDTVOracle, aAvaUSDTVault } = await createTestEnv()

      expect(await aAvaUSDTVOracle.name("0x")).to.eq("NaAvaUSDT Chainlink")
      expect(await aAvaUSDTVOracle.symbol("0x")).to.eq("NaAvaUSDT/USD")
      expect(await aAvaUSDTVOracle.priceFeed()).to.eq("0xEBE676ee90Fe1112671f19b6B7459bC678B67e8a") //USDT ChainLink
      expect(await aAvaUSDTVOracle.vault()).to.eq(aAvaUSDTVault.address)
    })

    it("should verify oracle rate if Vault total supply is 0", async () => {
      const { aAvaUSDTVault, aAvaUSDTVOracle } = await createTestEnv()

      expect(await aAvaUSDTVault.totalSupply()).to.eq(0)

      const oracleAggregator = await ethers.getContractAt<IAggregatorV3Interface>(
        "IAggregatorV3Interface",
        await aAvaUSDTVOracle.priceFeed()
      )
      const expectedRate = ethers.BigNumber.from("999905938848332537")
      expect(await aAvaUSDTVOracle.peekSpot("0x")).to.eq(expectedRate)

      const rateToAggregatorPrice = ethers.BigNumber.from("10")
        .pow(BigInt((await aAvaUSDTVault.decimals()) + (await oracleAggregator.decimals())))
        .div(expectedRate)

      const latestRoundData = await oracleAggregator.latestRoundData()
      expect(latestRoundData.answer).to.eq(rateToAggregatorPrice)
    })

    it("should verify oracle rate if Vault total supply > 0", async () => {
      const { aAvaUSDT, aAvaUSDTVault, aAvaUSDTVOracle, signers, user1 } = await createTestEnv()

      const depositAmount = 123123 //some small number
      await aAvaUSDT
        .connect(signers.user1)
        .approve(aAvaUSDTVault.address, ethers.constants.MaxUint256)

      await aAvaUSDTVault.connect(signers.user1).deposit(depositAmount, user1)
      const oracleAggregator = await ethers.getContractAt<IAggregatorV3Interface>(
        "IAggregatorV3Interface",
        await aAvaUSDTVOracle.priceFeed()
      )
      const expectedRate = ethers.BigNumber.from("999905938848332537")
      expect(await aAvaUSDTVOracle.peekSpot("0x")).to.eq(expectedRate)

      const rateToAggregatorPrice = ethers.BigNumber.from("10")
        .pow(BigInt((await aAvaUSDTVault.decimals()) + (await oracleAggregator.decimals())))
        .div(expectedRate)

      const latestRoundData = await oracleAggregator.latestRoundData()
      expect(latestRoundData.answer).to.eq(rateToAggregatorPrice)
    })
  })
})
