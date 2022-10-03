const { task } = require("hardhat/config")

task("deploy-p2-markets", "Deploy BTCb, JLPWAVAXUSDC markets").setAction(async (args, { run }) => {
  await run("deploy", { tags: "JLPWAVAXUSDCOracle" })

  await run("deploy", { tags: "BTCbCauldron" })
  await run("deploy", { tags: "JLPWAVAXUSDCCauldron" })
})
