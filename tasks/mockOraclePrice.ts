import { task } from "hardhat/config";

task("mock-oracle-price", "Mock oracle price")
  .addParam("asset", "Possible values: AVAXOracle, ETHOracle, BTCOracle, DAIOracle")
  .setAction(async ({ asset }, { run, ethers, deployments, artifacts }) => {
    await run("compile");
    const deployment = await deployments.get(asset);
    if (!deployment) {
      throw Error("Deployment not found");
    }
    const artifact = await artifacts.readArtifact(asset);
    if (!artifact) {
      throw Error("Artifact not found");
    }
    console.log("updating...", deployment.address);
    await ethers.provider.send("hardhat_setCode", [deployment.address, artifact.deployedBytecode]);
    await ethers.provider.send("evm_mine", []);
  });
