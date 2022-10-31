const { task } = require("hardhat/config")

task("deploy-markets", "Deploy on Nereus dev1 RPC").setAction(async (args, { run }) => {
  await run("deploy-p1-markets")
  await run("deploy-p2-markets")

  await run("mint-to-bentobox")
  await run("set-liquidator-manager", {
    manager: "0xD859Ab3B2359e7Ca6cBf7e9908A566bD44fB7410",
  })
})
