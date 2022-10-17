import { IERC20Metadata, OracleMock, TokenizedVaultV1 } from "../typechain"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { txWait } from "./tx"

export const priceToRate = (priceUSD: string, decimals, { ethers }: HardhatRuntimeEnvironment) => {
  return ethers.BigNumber.from(10n ** (BigInt(decimals) + 8n)).div(
    ethers.utils.parseUnits(priceUSD, 8)
  )
}

export const mockOraclePriceUsd = async (
  price,
  token,
  oracle,
  cauldron,
  hre: HardhatRuntimeEnvironment
) => {
  const tokenDecimals = await token.decimals()
  const exchangeRate = priceToRate(price, tokenDecimals, hre)
  await txWait(oracle.set(exchangeRate))
  await txWait(oracle.setSuccess(true))
  await txWait(cauldron.updateExchangeRate())
}

export const mockOraclePriceUsdByCauldron = async (
  price,
  cauldron,
  hre: HardhatRuntimeEnvironment
) => {
  const oracleAddress = await cauldron.oracle()
  const collateralAddress = await cauldron.collateral()
  console.log("updating oracle...", oracleAddress)
  const oracleMockArtifact = await hre.artifacts.readArtifact("OracleMock")
  await hre.ethers.provider.send("hardhat_setCode", [
    oracleAddress,
    oracleMockArtifact.deployedBytecode,
  ])

  const oracle = await hre.ethers.getContractAt<OracleMock>("OracleMock", oracleAddress)
  const token = await hre.ethers.getContractAt<TokenizedVaultV1>(
    "TokenizedVaultV1",
    collateralAddress
  )

  const tokenDecimals = await token.decimals()
  const exchangeRate = priceToRate(price, tokenDecimals, hre)
  await txWait(oracle.set(exchangeRate))
  await txWait(oracle.setSuccess(true))
  await txWait(cauldron.updateExchangeRate())
}

export const getOraclePriceUsd = async (
  oracle: OracleMock,
  token: IERC20Metadata,
  { ethers }: HardhatRuntimeEnvironment
) => {
  const price = ethers.BigNumber.from(10n ** (BigInt(await token.decimals()) + 18n)).div(
    await oracle.peekSpot(ethers.utils.hexZeroPad("0x", 32))
  )

  return ethers.utils.formatUnits(price, 18)
}
