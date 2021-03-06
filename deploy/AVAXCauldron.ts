import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { BentoBoxV1, AVAXOracle } from "../typechain";
import { expect } from "chai";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";

const ParametersPerChain = {
  [ChainId.Avalanche]: {
    owner: LothricFin,
    degenBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    collateral: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    oracle: "0x9141E3c09268274696c62C7bEE8dE72cbd4980Be",
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
    collateral: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    oracle: "0x3FB913D0c17AD4e8e5aEFCcA97B9dDEaC403cDc2",
    oracleData: "0x0000000000000000000000000000000000000000",
    masterContract: "0x38FA19EBE61c5751EE5a4552301E517e24438Cf3",
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const BentoBox = await ethers.getContractAt<BentoBoxV1>("BentoBoxV1", parameters.degenBox);
  const CauldronV2MasterContract = parameters.masterContract;
  const collateral = parameters.collateral;
  const oracleProxy = await ethers.getContractAt<AVAXOracle>("AVAXOracle", parameters.oracle);
  const oracleData = parameters.oracleData;

  const INTEREST_CONVERSION = 1e18 / (365.25 * 3600 * 24) / 100;
  const OPENING_CONVERSION = 1e5 / 100;

  const collateralization = 75 * 1e3; // 75% LTV
  const opening = 0.5 * OPENING_CONVERSION; // .5% initial
  const interest = parseInt(String(0 * INTEREST_CONVERSION)); // 0% Interest
  const liquidation = 12.5 * 1e3 + 1e5;

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracleProxy.address, oracleData, interest, liquidation, collateralization, opening]
  );

  const tx = await (await BentoBox.deploy(CauldronV2MasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  expect(deployEvent?.eventSignature).to.be.eq("LogDeploy(address,bytes,address)");
  deployments.save("AVAXCauldron", {
    abi: [],
    address: deployEvent?.args?.cloneAddress,
  });
  console.log("AVAXCauldron", (await deployments.get("AVAXCauldron")).address);
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["AVAXCauldron"];
deployFunction.dependencies = [];
