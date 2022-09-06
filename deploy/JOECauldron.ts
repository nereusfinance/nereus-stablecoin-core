import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { BentoBoxV1, JOEOracle } from "../typechain";
import { expect } from "chai";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";

const ParametersPerChain = {
  [ChainId.Avalanche]: {
    owner: LothricFin,
    degenBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    collateral: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
    oracle: "0x7195d3A344106b877F8D5f62CA570Fd25D43D180",
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
  const oracleProxy = await ethers.getContractAt<JOEOracle>("JOEOracle", parameters.oracle);
  const oracleData = parameters.oracleData;

  const INTEREST_CONVERSION = 1e18 / (365.25 * 3600 * 24) / 100;
  const OPENING_CONVERSION = 1e5 / 100;

  const collateralization = 50 * 1e3; // 50% LTV
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
  await deployments.save("JOECauldron", {
    abi: [],
    address: deployEvent?.args?.cloneAddress,
  });
  console.log("JOECauldron", (await deployments.get("JOECauldron")).address);
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["JOECauldron"];
deployFunction.dependencies = [];
