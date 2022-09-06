import { task } from "hardhat/config";

const config = {
  Oracles: {
    AVAX: "0x9141E3c09268274696c62C7bEE8dE72cbd4980Be",
    WETH: "0xBAa61A86B99214323f0104089430Eb3454b0291e",
    WBTC: "0x24ed1513d790f8F9A1A177F53915c45d4F590349",
    BTCb: "0x24ed1513d790f8F9A1A177F53915c45d4F590349",
    DAI: "0xA5FEd9f9da2c2bd3c5b6ED495936b9A2EC7705ff",
    USDC: "0x9d6eC3D371431a8491dB0BB7e6eD60e3f9306d4d",
    av3CRV: "0xf310bD399AED40a685f159F22ef103C3E8EF6de0",
    sAVAX: "0x396E2379119a893895FD8CA94Dd8a044E001A0C0",
    JOE: "0x7195d3A344106b877F8D5f62CA570Fd25D43D180",
    LINK: "0x67c74C56eebCDBCb84a0B69CD2D8b70D84cE0F25",
    JLPWAVAXUSDC: "0xf955a6694C6F5629f5Ecd514094B3bd450b59000",
  },
  Cauldrons: {
    AVAX: "0xc337467F7266Fa6677d8459D4bC531d056348Da8",
    WETH: "0x570F08643B4B1573514244d8f0B5005718Fa3e8a",
    WBTC: "0x88A6414466D61b9Fb6aaFC763c1BaB6EE1462631",
    BTCb: "0x13d370e3de628387FD27709aE9fA9Bc7d2bc9C29",
    DAI: "0x42E07D41312E752143d72Fd0daE60B301ff139De",
    USDC: "0xD75a20314FB7FBE79EC7474497d5Bf09e9c00cfc",
    av3CRV: "0x8Fb8884C031c49038966a39895f0E141F1Ed14AD",
    sAVAX: "0x0194eB3520b7d7eB0b014FCe6ed464Eaea0Ca765",
    JOE: "0x5E1A0e4bfb9329513E62E4fc7DC7Ce8C3CbBE7c7",
    LINK: "0x0207B99E529310Eb413254B4504FE3F4a509f717",
    JLPWAVAXUSDC: "0xC0A7a7F141b6A5Bce3EC1B81823c8AFA456B6930",
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
