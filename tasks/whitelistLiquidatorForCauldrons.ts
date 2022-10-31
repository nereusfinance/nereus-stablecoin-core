import { task } from "hardhat/config"

task("whitelist-liquidator", "whitelist liquidator").setAction(async (taskArgs, { ethers }) => {
  const permissionManagerOwnerAddress = "0xdd3de3b819edd3a014fda93868d7dfc873341467"
  const liquidatorAddress = "0xB0B69A8E0cf6cCfe62590d1133767E07A773adFf"
  const whitelistManagerContractAddress = "0xaad9d30e43868e09777e0ac090c7b8ffa583e942"

  const permissionManagerOwnerSigner = await ethers.provider.getSigner(
    permissionManagerOwnerAddress
  )

  await ethers.provider.send("hardhat_impersonateAccount", [permissionManagerOwnerAddress])
  await ethers.provider.send("hardhat_setBalance", [
    permissionManagerOwnerAddress,
    ethers.utils.parseEther("10").toHexString(),
  ])
  const whitelistManager = await ethers.getContractAt(
    "WhitelistManager",
    whitelistManagerContractAddress
  )
  await whitelistManager.connect(permissionManagerOwnerSigner).permit(liquidatorAddress)

  console.log("getAllAccounts", await whitelistManager.getAllAccounts())

  await ethers.provider.send("hardhat_stopImpersonatingAccount", [permissionManagerOwnerAddress])
})
