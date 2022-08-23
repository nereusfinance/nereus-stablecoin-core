import { task } from "hardhat/config";

const config = {
  Oracles: {
    USDC: "0x3d6fd3FB5c33d44A1EE362f8701FCcd02739e1Da",
    av3CRV: "0x246e3D08C94855077d1C6045ef8C51dC1cAC5420",
    sAvax: "0x7eFE7196e8bc6fAa36cd9ca275F73725f09847A9",
    JOE: "0xD98ba6A7C497E7f44F4578aDCC896cA87CC4b716",
    LINK: "0x7D9e9b0c5dab2202d2B3b29371DAa8e0f11d49B6",
    JLPWAVAXUSDC: "0xE6D29A8F7086B71EAEc58b572fE5916AC699E3fe",
  },
  Cauldrons: {
    USDC: "0x55893534b8e6343F726a012D99524146eFb46688",
    av3CRV: "0x22097ED0Bb12E741e0A832d510A9b3CB596B16e2",
    sAvax: "0x8a0DBf7072A59d70EA59B3EDDB72764437CF06b2",
    JOE: "0x8598Ea8f5672Fa133C3abbE6b73d7a9E58e74882",
    LINK: "0x7E15B17Ed0945d320030031eB3E2A473E288452b",
    BTCb: "0x13d370e3de628387FD27709aE9fA9Bc7d2bc9C29",
    JLPWAVAXUSDC: "0x43aa6Fb5E7adAdd2Cb9c17AE5A5133f2bDA37EDD",
  },
};

task("mock-oracle-price", "Mock oracle price")
  .addParam("asset", "Possible values: AVAX, ETH, BTC, DAI, USDC, av3CRV, sAvax")
  .setAction(async ({ asset }, { run, ethers, deployments, artifacts }) => {
    await run("compile");
    const deployment = config.Oracles[asset]
      ? {
          address: config.Oracles[asset],
        }
      : await deployments.get(`${asset}Oracle`);
    const artifact = await artifacts.readArtifact(`${asset}Oracle`);
    console.log("updating...", deployment.address);
    await ethers.provider.send("hardhat_setCode", [deployment.address, artifact.deployedBytecode]);

    const overrideCauldronPrefix = {
      ETH: "WETH",
      BTC: "BTCb",
    };

    const cauldronPrefix = overrideCauldronPrefix[asset] ? overrideCauldronPrefix[asset] : asset;
    const deploymentCauldron = config.Cauldrons[cauldronPrefix]
      ? {
          address: config.Cauldrons[cauldronPrefix],
        }
      : await deployments.get(`${overrideCauldronPrefix[asset] ? overrideCauldronPrefix[asset] : asset}Cauldron`);
    const cauldronFactory = await ethers.getContractFactory("CauldronV2");
    const contractCauldron = await cauldronFactory.attach(deploymentCauldron.address);
    await (await contractCauldron.updateExchangeRate()).wait();

    console.log("done");
    await ethers.provider.send("evm_mine", []);
  });
