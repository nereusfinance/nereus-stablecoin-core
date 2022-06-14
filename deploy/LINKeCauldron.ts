import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { BentoBoxV1, LINKOracle } from "../typechain";
import { expect } from "chai";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";

const ParametersPerChain = {
  [ChainId.Avalanche]: {
    owner: LothricFin,
    degenBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    collateral: "0x5947BB275c521040051D82396192181b413227A3",
    oracle: "0x7D9e9b0c5dab2202d2B3b29371DAa8e0f11d49B6",
    oracleData: "0x0000000000000000000000000000000000000000",
    masterContract: "0xE767C6C3Bf42f550A5A258A379713322B6c4c060",
  },
  [ChainId.Localhost]: {
    owner: LothricFin,
    degenBox: "",
    collateral: "",
    oracle: "",
    oracleData: "",
    masterContract: "",
  },
  [ChainId.Fuji]: {
    owner: LothricFin,
    degenBox: "",
    collateral: "",
    oracle: "",
    oracleData: "",
    masterContract: "",
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const BentoBox = await ethers.getContractAt<BentoBoxV1>("BentoBoxV1", parameters.degenBox);
  const CauldronV2MasterContract = parameters.masterContract;
  const collateral = parameters.collateral;
  const oracleProxy = await ethers.getContractAt<LINKOracle>("LINKOracle", parameters.oracle);
  const oracleData = parameters.oracleData;

  const INTEREST_CONVERSION = 1e18 / (365.25 * 3600 * 24) / 100;
  const OPENING_CONVERSION = 1e5 / 100;

  const collateralization = 50 * 1e3; // 90% LTV
  const opening = 0.5 * OPENING_CONVERSION; // .5% initial
  const interest = parseInt(String(0 * INTEREST_CONVERSION)); // 0% Interest
  const liquidation = 12.5 * 1e3 + 1e5;

  const initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracleProxy.address, oracleData, interest, liquidation, collateralization, opening]
  );

  const tx = await (await BentoBox.deploy(CauldronV2MasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  expect(deployEvent?.eventSignature).to.be.eq("LogDeploy(address,bytes,address)");
  await deployments.save("LINKeCauldron", {
    abi: [],
    address: deployEvent?.args?.cloneAddress,
  });

  console.log("LINKeCauldron", (await deployments.get("LINKeCauldron")).address);
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["LINKeCauldron"];
deployFunction.dependencies = [];
