import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { BentoBoxV1, WXTOracle } from "../typechain";
import { expect } from "chai";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";

const ParametersPerChain = {
  [ChainId.Avalanche]: {
    owner: LothricFin,
    degenBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    collateral: "0xfcDe4A87b8b6FA58326BB462882f1778158B02F1",
    oracle: "0xd2276a18E7bF769B5C2079e4A94C929a68a2D676",
    oracleData: "0x0000000000000000000000000000000000000000",
    masterContract: "0x34450F4edB5Cff128fB81E7D7734299E79760D49",
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
    collateral: "0x14f7313b49452a13515F99FE9891b466ECA039bf",
    oracle: "0x42d3d4b15822b1b7976BF2711514E18513Ab8a49",
    oracleData: "0x0000000000000000000000000000000000000000",
    masterContract: "0xC5Bc760fCDf700A8c4e2386c6846C2f7e366951a",
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const BentoBox = await ethers.getContractAt<BentoBoxV1>("BentoBoxV1", parameters.degenBox);
  const PermissionedCauldronMasterContract = parameters.masterContract;
  const collateral = parameters.collateral;
  const oracleProxy = await ethers.getContractAt<WXTOracle>("WXTOracle", parameters.oracle);
  const oracleData = parameters.oracleData;

  const INTEREST_CONVERSION = 1e18 / (365.25 * 3600 * 24) / 100;
  const OPENING_CONVERSION = 1e5 / 100;

  const collateralization = 80 * 1e3; // 80% LTV
  const opening = 0.5 * OPENING_CONVERSION; // .5% initial
  const interest = parseInt(String(0 * INTEREST_CONVERSION)); // 0% Interest
  const liquidation = 10 * 1e3 + 1e5;

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracleProxy.address, oracleData, interest, liquidation, collateralization, opening]
  );

  const tx = await (await BentoBox.deploy(PermissionedCauldronMasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  expect(deployEvent?.eventSignature).to.be.eq("LogDeploy(address,bytes,address)");
  deployments.save("WXTPermissionedCauldron", {
    abi: [],
    address: deployEvent?.args?.cloneAddress,
  });
  console.log("WXTPermissionedCauldron", (await deployments.get("WXTPermissionedCauldron")).address);
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["WXTPermissionedCauldron"];
deployFunction.dependencies = [];
