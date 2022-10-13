import { expect } from "chai"
import hre, { deployments, ethers, getNamedAccounts, network, run } from "hardhat"
import {
  CauldronV2,
  IAggregatorV3Interface,
  NXUSD,
  TokenizedVaultOracle,
  TokenizedVaultV1,
  VaultRewardSwapperV1,
} from "../../typechain"
import { Contract, Signer } from "ethers"
import { erc20TopUp, getTokenContract, TokenSymbol } from "../../utilities/tokens"
import { ChainId } from "../../utilities"
import { impersonateAccount, mine, setBalance } from "@nomicfoundation/hardhat-network-helpers"
import { forkAvalancheMainnet } from "../../utilities/fork"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers"

type FixtureType = (options?: any) => Promise<{
  aAvaDAI: Contract
  aAvaDAIVault: TokenizedVaultV1
  aAvaDAIVCauldron: CauldronV2
  aAvaDAIVOracle: TokenizedVaultOracle

  user1: string
  user2: string

  signers: {
    deployer: Signer
    user1: SignerWithAddress
    user2: Signer
  }
}>

describe("aAvaDAI", () => {
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
      }

      await deployments.run(["VaultRewardSwapperV1"], { resetMemory: false })
      const rewardsSwapperDeployment = await deployments.get("VaultRewardSwapperProxy")
      const rewardsSwapper = await ethers.getContractAt<VaultRewardSwapperV1>(
        "VaultRewardSwapperV1",
        rewardsSwapperDeployment.address
      )
      await run("configure-vault-swapper-p3", { swapper: rewardsSwapper.address })

      await deployments.run(["aAvaDAIVault"], { resetMemory: false })
      const aAvaDAIVaultDeployment = await deployments.get("aAvaDAIVault")
      const aAvaDAIVault = await ethers.getContractAt<TokenizedVaultV1>(
        "TokenizedVaultV1",
        aAvaDAIVaultDeployment.address
      )
      await rewardsSwapper.addManager(aAvaDAIVault.address)

      await deployments.run(["aAvaDAIVOracle"], { resetMemory: false })
      await deployments.run(["aAvaDAIVCauldron"], { resetMemory: false })
      const aAvaDAIVCauldronDeployment = await deployments.get("aAvaDAIVCauldron")
      const aAvaDAIVCauldron = await ethers.getContractAt<CauldronV2>(
        "CauldronV2",
        aAvaDAIVCauldronDeployment.address
      )

      const aAvaDAIVOracle = await ethers.getContractAt<TokenizedVaultOracle>(
        "TokenizedVaultOracle",
        await aAvaDAIVCauldron.oracle()
      )

      const aAvaDAI = await getTokenContract(chainId, TokenSymbol.aAvaDAI, hre)

      await erc20TopUp(user1, "20000", TokenSymbol.aAvaDAI, { ethers })

      return {
        aAvaDAI,
        aAvaDAIVault,
        aAvaDAIVCauldron,
        aAvaDAIVOracle,

        signers,
        user1,
        user2,
      }
    })
  })

  it("should verify aAvaDAIVault deployment", async () => {
    console.assert(network.config.chainId === ChainId.Avalanche)

    const { aAvaDAI, aAvaDAIVault } = await createTestEnv()

    expect(await aAvaDAI.symbol()).to.eq("aAvaDAI")

    const aAvaDAIAddress = "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE"
    expect(await aAvaDAIVault.asset()).to.eq(aAvaDAIAddress)
    expect(await aAvaDAIVault.decimals()).to.eq(18)
    expect(await aAvaDAIVault.name()).to.eq("aAvaDAIVault")
    expect(await aAvaDAIVault.symbol()).to.eq("aAvaDAIV")
  })

  it("should verify aAvaDAIVCauldron deployment", async () => {
    const { aAvaDAIVault, aAvaDAIVCauldron } = await createTestEnv()

    expect(await aAvaDAIVCauldron.bentoBox()).to.eq("0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775")
    expect(await aAvaDAIVCauldron.collateral()).to.eq(aAvaDAIVault.address)
    expect(await aAvaDAIVCauldron.masterContract()).to.eq(
      "0xE767C6C3Bf42f550A5A258A379713322B6c4c060"
    )
    expect(await aAvaDAIVCauldron.BORROW_OPENING_FEE()).to.eq(500) // 0.5 %
    expect(await aAvaDAIVCauldron.COLLATERIZATION_RATE()).to.eq(90 * 1e3) // 90 %
    expect(await aAvaDAIVCauldron.LIQUIDATION_MULTIPLIER()).to.eq(5 * 1e3 + 1e5) // multiplier 1.05 = 5% liquidation fee
  })

  it("should deposit aAvaDAI and mint shares", async () => {
    const { aAvaDAI, aAvaDAIVault, signers, user1 } = await createTestEnv()
    const depositAmount = ethers.utils.parseUnits("1000", await aAvaDAI.decimals())
    const sharesAmount = ethers.utils.parseUnits("1000", await aAvaDAIVault.decimals())

    await aAvaDAI.connect(signers.user1).approve(aAvaDAIVault.address, depositAmount)

    expect(await aAvaDAIVault.totalAssets()).to.eq(0)

    expect(await aAvaDAIVault.connect(signers.user1).deposit(depositAmount, user1))
      .to.emit(aAvaDAI, "Transfer")
      .withArgs(user1, aAvaDAIVault.address, depositAmount)
      .to.emit(aAvaDAIVault, "Transfer")
      .withArgs(ethers.constants.AddressZero, user1, sharesAmount)

    await mine()

    expect(await aAvaDAIVault.totalAssets()).to.be.gt(depositAmount)
    expect(await aAvaDAIVault.balanceOf(user1)).to.eq(sharesAmount)
  })

  describe("aAvaDAIVOracle", () => {
    it("should verify oracle deployment", async () => {
      const { aAvaDAIVOracle, aAvaDAIVault } = await createTestEnv()

      expect(await aAvaDAIVOracle.name("0x")).to.eq("aAvaDAIVault Chainlink")
      expect(await aAvaDAIVOracle.symbol("0x")).to.eq("aAvaDAIV/USD")
      expect(await aAvaDAIVOracle.priceFeed()).to.eq("0x51D7180edA2260cc4F6e4EebB82FEF5c3c2B8300") //DAI ChainLink
      expect(await aAvaDAIVOracle.vault()).to.eq(aAvaDAIVault.address)
    })

    it("should verify oracle rate if Vault total supply is 0", async () => {
      const { aAvaDAIVault, aAvaDAIVOracle } = await createTestEnv()

      expect(await aAvaDAIVault.totalSupply()).to.eq(0)

      const oracleAggregator = await ethers.getContractAt<IAggregatorV3Interface>(
        "IAggregatorV3Interface",
        await aAvaDAIVOracle.priceFeed()
      )
      const expectedRate = ethers.BigNumber.from("1000000000000000000")
      expect(await aAvaDAIVOracle.peekSpot("0x")).to.eq(expectedRate)

      const rateToAggregatorPrice = ethers.BigNumber.from("10")
        .pow(BigInt((await aAvaDAIVault.decimals()) + (await oracleAggregator.decimals())))
        .div(expectedRate)

      const latestRoundData = await oracleAggregator.latestRoundData()
      expect(latestRoundData.answer).to.eq(rateToAggregatorPrice)
    })

    it("should verify oracle rate if Vault total supply > 0", async () => {
      const { aAvaDAI, aAvaDAIVault, aAvaDAIVOracle, signers, user1 } = await createTestEnv()

      const depositAmount = 123123 //some small number
      await aAvaDAI
        .connect(signers.user1)
        .approve(aAvaDAIVault.address, ethers.constants.MaxUint256)

      await aAvaDAIVault.connect(signers.user1).deposit(depositAmount, user1)
      const oracleAggregator = await ethers.getContractAt<IAggregatorV3Interface>(
        "IAggregatorV3Interface",
        await aAvaDAIVOracle.priceFeed()
      )
      const expectedRate = ethers.BigNumber.from("1000000000000000000")
      expect(await aAvaDAIVOracle.peekSpot("0x")).to.eq(expectedRate)

      const rateToAggregatorPrice = ethers.BigNumber.from("10")
        .pow(BigInt((await aAvaDAIVault.decimals()) + (await oracleAggregator.decimals())))
        .div(expectedRate)

      const latestRoundData = await oracleAggregator.latestRoundData()
      expect(latestRoundData.answer).to.eq(rateToAggregatorPrice)
    })
  })
})
