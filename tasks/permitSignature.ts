import { task } from "hardhat/config"
import aTokenAbi from "../utilities/abis/aTokenAbi.json"
import { buildPermitSignatureParams, getSignatureFromTypedData } from "../utilities/signature"
import { ChainId } from "../utilities/chains"

task("permit-signature", "Sign permit message")
  .addParam("user", "Tokens owner")
  .addParam("amount", "Deposit amount")
  .addParam("token", "The aToken address you want to spend")
  .addParam("vault", "The spender's address - Vault contract")
  .addOptionalParam("deadline", "Seconds")
  .setAction(async ({ user, amount, token, vault, deadline = 60 }, hre) => {
    const aToken = await hre.ethers.getContractAt(aTokenAbi, token)
    const deadlineTime = Math.trunc(Date.now() / 1000) + Number(deadline) //seconds

    const aTokenDecimals = await aToken.decimals()
    const depositAmount = hre.ethers.utils.parseUnits(amount, aTokenDecimals).toString()

    const permitParams = buildPermitSignatureParams({
      chainId: Number(ChainId.Avalanche),
      verifyingContract: token,
      version: "1",
      domainName: await aToken.name(),
      owner: user,
      spender: vault,
      nonce: (await aToken.nonces(user)).toNumber(),
      deadline: deadlineTime.toString(),
      value: depositAmount,
    })
    const { v, r, s } = await getSignatureFromTypedData(user, permitParams, hre)

    console.log("aTokenVault.depositWithPermit params", {
      assets: depositAmount,
      receiver: user,
      deadline: deadlineTime,
      v,
      r: "0x" + r.toString("hex"),
      s: "0x" + s.toString("hex"),
    })
  })
