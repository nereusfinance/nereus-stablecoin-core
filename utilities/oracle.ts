import { IERC20Metadata, OracleMock } from "../typechain"
import { HardhatRuntimeEnvironment } from "hardhat/types"

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
  await oracle.set(exchangeRate)
  await oracle.setSuccess(true)
  await cauldron.updateExchangeRate()
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
