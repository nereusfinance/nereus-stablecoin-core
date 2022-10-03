import { expect } from "chai"
import hre, { deployments, ethers, getNamedAccounts, network, run } from "hardhat"
import {
  CauldronV2,
  NXUSD,
  TokenizedVaultOracle,
  TokenizedVaultV1,
  VaultRewardSwapperV1,
} from "../../typechain"
import { Contract, Signer } from "ethers"
import { erc20TopUp, getTokenContract, TokenSymbol } from "../../utilities/tokens"
import { ChainId } from "../../utilities"
import { impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers"
import { forkAvalancheMainnet } from "../../utilities/fork"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers"
import { increase } from "@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time"

type FixtureType = (options?: any) => Promise<{
  aAvaUSDC: Contract
  aAvaUSDCVault: TokenizedVaultV1
  aAvaUSDCVCauldron: CauldronV2
  aAvaUSDCVOracle: TokenizedVaultOracle

  user1: string
  user2: string

  signers: {
    deployer: Signer
    user1: SignerWithAddress
    user2: Signer
  }
}>

describe("aAvaUSDC", () => {
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

      await deployments.run(["aAvaUSDCVault"], { resetMemory: false })
      const aAvaUSDCVaultDeployment = await deployments.get("aAvaUSDCVault")
      const aAvaUSDCVault = await ethers.getContractAt<TokenizedVaultV1>(
        "TokenizedVaultV1",
        aAvaUSDCVaultDeployment.address
      )
      await rewardsSwapper.addManager(aAvaUSDCVault.address)

      await deployments.run(["aAvaUSDCVOracle"], { resetMemory: false })
      await deployments.run(["aAvaUSDCVCauldron"], { resetMemory: false })
      const aAvaUSDCVCauldronDeployment = await deployments.get("aAvaUSDCVCauldron")
      const aAvaUSDCVCauldron = await ethers.getContractAt<CauldronV2>(
        "CauldronV2",
        aAvaUSDCVCauldronDeployment.address
      )

      const aAvaUSDCVOracle = await ethers.getContractAt<TokenizedVaultOracle>(
        "TokenizedVaultOracle",
        await aAvaUSDCVCauldron.oracle()
      )

      const aAvaUSDC = await getTokenContract(chainId, TokenSymbol.aAvaUSDC, hre)

      await erc20TopUp(user1, "20000", TokenSymbol.aAvaUSDC, { ethers })

      return {
        aAvaUSDC,
        aAvaUSDCVault,
        aAvaUSDCVCauldron,
        aAvaUSDCVOracle,

        signers,
        user1,
        user2,
      }
    })
  })

  it("should verify aAvaUSDCVault deployment", async () => {
    console.assert(network.config.chainId === ChainId.Avalanche)

    const { aAvaUSDC, aAvaUSDCVault } = await createTestEnv()

    expect(await aAvaUSDC.symbol()).to.eq("aAvaUSDC")

    const aAvaUSDCAddress = "0x625E7708f30cA75bfd92586e17077590C60eb4cD"
    expect(await aAvaUSDCVault.asset()).to.eq(aAvaUSDCAddress)
    expect(await aAvaUSDCVault.decimals()).to.eq(18)
    expect(await aAvaUSDCVault.name()).to.eq("aAvaUSDCVault")
    expect(await aAvaUSDCVault.symbol()).to.eq("aAvaUSDCV")
  })

  it("should verify aAvaUSDCVCauldron deployment", async () => {
    const { aAvaUSDCVault, aAvaUSDCVCauldron } = await createTestEnv()

    expect(await aAvaUSDCVCauldron.bentoBox()).to.eq("0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775")
    expect(await aAvaUSDCVCauldron.collateral()).to.eq(aAvaUSDCVault.address)
    expect(await aAvaUSDCVCauldron.masterContract()).to.eq(
      "0xE767C6C3Bf42f550A5A258A379713322B6c4c060"
    )
    expect(await aAvaUSDCVCauldron.BORROW_OPENING_FEE()).to.eq(500) // 0.5 %
    expect(await aAvaUSDCVCauldron.COLLATERIZATION_RATE()).to.eq(90 * 1e3) // 90 %
    expect(await aAvaUSDCVCauldron.LIQUIDATION_MULTIPLIER()).to.eq(5 * 1e3 + 1e5) // multiplier 1.05 = 5% liquidation fee
  })

  it("should deposit aAvaUSDC and mint shares", async () => {
    const { aAvaUSDC, aAvaUSDCVault, signers, user1 } = await createTestEnv()
    const depositAmount = ethers.utils.parseUnits("1000", await aAvaUSDC.decimals())
    const sharesAmount = ethers.utils.parseUnits("1000", await aAvaUSDCVault.decimals())

    await aAvaUSDC.connect(signers.user1).approve(aAvaUSDCVault.address, depositAmount)

    expect(await aAvaUSDCVault.totalAssets()).to.eq(0)

    expect(await aAvaUSDCVault.connect(signers.user1).deposit(depositAmount, user1))
      .to.emit(aAvaUSDC, "Transfer")
      .withArgs(user1, aAvaUSDCVault.address, depositAmount)
      .to.emit(aAvaUSDCVault, "Transfer")
      .withArgs(ethers.constants.AddressZero, user1, sharesAmount)

    await increase(60 * 68)

    expect(await aAvaUSDCVault.totalAssets()).to.be.gt(depositAmount)
    expect(await aAvaUSDCVault.balanceOf(user1)).to.eq(sharesAmount)
  })
})
