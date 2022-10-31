import { fromRpcSig, ECDSASignature } from "ethereumjs-util"
import { HardhatRuntimeEnvironment } from "hardhat/types"

export const buildPermitSignatureParams = ({
  chainId,
  verifyingContract,
  version,
  domainName,
  owner,
  spender,
  nonce,
  deadline,
  value,
}: {
  chainId: number
  verifyingContract: string
  version: string
  domainName: string
  owner: string
  spender: string
  nonce: number
  deadline: string
  value: string
}) => ({
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  },
  primaryType: "Permit",
  domain: {
    name: domainName,
    version,
    chainId,
    verifyingContract,
  },
  message: {
    owner,
    spender,
    value,
    nonce,
    deadline,
  },
})

export const getSignatureFromTypedData = async (
  signer: string,
  typedData: any,
  hre: HardhatRuntimeEnvironment
): Promise<ECDSASignature> => {
  const signature = await hre.ethers.provider.send("eth_signTypedData_v4", [
    signer,
    JSON.stringify(typedData),
  ])

  return fromRpcSig(signature)
}
