import { task } from "hardhat/config";

task("mock-oracle-price", "Mock oracle price")
  .addParam("asset", "Possible values: AVAX, ETH, BTC, DAI")
  .setAction(async ({ asset }, { run, ethers, deployments, artifacts }) => {
    await run("compile");
    const deployment = await deployments.get(`${asset}Oracle`);
    const artifact = await artifacts.readArtifact(`${asset}Oracle`);
    console.log("updating...", deployment.address);
    await ethers.provider.send("hardhat_setCode", [deployment.address, artifact.deployedBytecode]);

    const overrideCauldronPrefix = {
      ETH: "WETH",
      BTC: "BTCb",
    };

    const deploymentCauldron = await deployments.get(`${overrideCauldronPrefix[asset] ? overrideCauldronPrefix[asset] : asset}Cauldron`);
    const cauldronFactory = await ethers.getContractFactory("CauldronV2");
    const contractCauldron = await cauldronFactory.attach(deploymentCauldron.address);
    await contractCauldron.updateExchangeRate();

    await ethers.provider.send("evm_mine", []);
  });
