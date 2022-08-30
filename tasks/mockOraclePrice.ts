import { task } from "hardhat/config";

const config = {
  Oracles: {
    AVAX: "0x9141E3c09268274696c62C7bEE8dE72cbd4980Be",
    WETH: "0xBAa61A86B99214323f0104089430Eb3454b0291e",
    WBTC: "0x24ed1513d790f8F9A1A177F53915c45d4F590349",
    BTCb: "0x24ed1513d790f8F9A1A177F53915c45d4F590349",
    DAI: "0xA5FEd9f9da2c2bd3c5b6ED495936b9A2EC7705ff",
    USDC: "0x3d6fd3FB5c33d44A1EE362f8701FCcd02739e1Da",
    av3CRV: "0x246e3D08C94855077d1C6045ef8C51dC1cAC5420",
    sAVAX: "0x7eFE7196e8bc6fAa36cd9ca275F73725f09847A9",
    JOE: "0xD98ba6A7C497E7f44F4578aDCC896cA87CC4b716",
    LINK: "0x7D9e9b0c5dab2202d2B3b29371DAa8e0f11d49B6",
    JLPWAVAXUSDC: "0xE6D29A8F7086B71EAEc58b572fE5916AC699E3fe",
  },
  Cauldrons: {
    AVAX: "0xc337467F7266Fa6677d8459D4bC531d056348Da8",
    WETH: "0x570F08643B4B1573514244d8f0B5005718Fa3e8a",
    WBTC: "0x88A6414466D61b9Fb6aaFC763c1BaB6EE1462631",
    BTCb: "0x13d370e3de628387FD27709aE9fA9Bc7d2bc9C29",
    DAI: "0x42E07D41312E752143d72Fd0daE60B301ff139De",
    USDC: "0x55893534b8e6343F726a012D99524146eFb46688",
    av3CRV: "0x22097ED0Bb12E741e0A832d510A9b3CB596B16e2",
    sAVAX: "0x8a0DBf7072A59d70EA59B3EDDB72764437CF06b2",
    JOE: "0x8598Ea8f5672Fa133C3abbE6b73d7a9E58e74882",
    LINK: "0x7E15B17Ed0945d320030031eB3E2A473E288452b",
    JLPWAVAXUSDC: "0x43aa6Fb5E7adAdd2Cb9c17AE5A5133f2bDA37EDD",
  },
};

task("mock-oracle-price", "Mock oracle price")
  .addParam("asset", "Possible values: AVAX, WETH, WBTC, BTCb, DAI, USDC, av3CRV, sAVAX, JOE, LINK, JLPWAVAXUSDC")
  .setAction(async ({ asset }, { run, ethers, artifacts }) => {
    await run("compile");
    const oracleAddress = config.Oracles[asset];
    const overrideOracleName = {
      WETH: "ETHOracle",
      BTCb: "BTCOracle",
      WBTC: "BTCOracle",
    };
    const artifact = await artifacts.readArtifact(overrideOracleName[asset] ? overrideOracleName[asset] : `${asset}Oracle`);
    console.log("updating oracle...", oracleAddress);
    await ethers.provider.send("hardhat_setCode", [oracleAddress, artifact.deployedBytecode]);

    const cauldronAddress = config.Cauldrons[asset];
    const cauldronFactory = await ethers.getContractFactory("CauldronV2");
    const contractCauldron = await cauldronFactory.attach(cauldronAddress);
    await (await contractCauldron.updateExchangeRate()).wait();

    console.log("done");
    await ethers.provider.send("evm_mine", []);
  });
