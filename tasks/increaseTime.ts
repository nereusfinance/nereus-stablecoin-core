import { task } from "hardhat/config"

task("increase-time", "Transfer test tokens to test account").setAction(async (args, hre) => {
  const day = 60 * 60 * 24

  await hre.network.provider.send("evm_increaseTime", [day * 30])
  await hre.network.provider.send("evm_mine", [])
})
