const { task } = require("hardhat/config");

task(
  "deploy-p1-markets",
  "Deploy USDC, av3CRV, sAVAX, JOE, LINK markets"
).setAction(async (args, { run }) => {
  await run("deploy", { tags: "USDCOracle" });
  await run("deploy", { tags: "av3CRVOracle" });
  await run("deploy", { tags: "sAVAXOracle" });
  await run("deploy", { tags: "JOEOracle" });
  await run("deploy", { tags: "LINKOracle" });

  await run("deploy", { tags: "USDCCauldron" });
  await run("deploy", { tags: "av3CRVCauldron" });
  await run("deploy", { tags: "sAVAXCauldron" });
  await run("deploy", { tags: "JOECauldron" });
  await run("deploy", { tags: "LINKeCauldron" });
});
