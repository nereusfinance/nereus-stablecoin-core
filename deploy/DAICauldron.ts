import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { BentoBoxV1, DAIOracle } from "../typechain";
import { expect } from "chai";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";

const ParametersPerChain = {
  [ChainId.Avalanche]: {
    owner: LothricFin,
    degenBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    collateral: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    oracle: "0xA5FEd9f9da2c2bd3c5b6ED495936b9A2EC7705ff",
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
    degenBox: "0x3c4479f3274113dd44F770632cC89F4AdDf33617",
    collateral: "0xea2D28c00Bef56A353C363084Da76058057B8b05",
    oracle: "0x8AB969a41b658Ee9981c2d5AA61EDA98a3a860Cc",
    oracleData: "0x0000000000000000000000000000000000000000",
    masterContract: "0xA5D590c9950df89Bb287d3CB860380C89116288A",
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const BentoBox = await ethers.getContractAt<BentoBoxV1>("BentoBoxV1", parameters.degenBox);
  const CauldronV2MasterContract = parameters.masterContract; 
  const collateral = parameters.collateral; 
  const oracleProxy = await ethers.getContractAt<DAIOracle>("DAIOracle", parameters.oracle);
  const oracleData = parameters.oracleData;

  const INTEREST_CONVERSION = 1e18 / (365.25 * 3600 * 24) / 100;
  const OPENING_CONVERSION = 1e5 / 100;

  const collateralization = 90 * 1e3; // 90% LTV
  const opening = 0.5 * OPENING_CONVERSION; // .5% initial
  const interest = parseInt(String(0 * INTEREST_CONVERSION)); // 0% Interest
  const liquidation = 5 * 1e3 + 1e5;

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracleProxy.address, oracleData, interest, liquidation, collateralization, opening]
  );

  const tx = await (await BentoBox.deploy(CauldronV2MasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  expect(deployEvent?.eventSignature).to.be.eq("LogDeploy(address,bytes,address)");
  deployments.save("DAICauldron", {
    abi: [],
    address: deployEvent?.args?.cloneAddress,
  });
  console.log("DAICauldron", (await deployments.get("DAICauldron")).address);
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["DAICauldron"];
deployFunction.dependencies = [];
