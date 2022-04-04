import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { BentoBoxV1, WXTOracle } from "../typechain";
import { expect } from "chai";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";

const ParametersPerChain = {
  [ChainId.Localhost]: {
    wavax: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
    owner: LothricFin,
  },
  [ChainId.Fuji]: {
    wavax: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
    owner: LothricFin,
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;

  const BentoBox = await ethers.getContractAt<BentoBoxV1>("BentoBoxV1", "0x3c4479f3274113dd44F770632cC89F4AdDf33617");
  const PermissionedCauldronMasterContract = "0x5B26FEc5eC24d4C052C6710724E16d2f87059c85"; // PermissionedCauldron
  const collateral = "0x14f7313b49452a13515F99FE9891b466ECA039bf"; // WXT Avalanche Fuji
  const oracleProxy = await ethers.getContractAt<WXTOracle>("WXTOracle", "0xFa00C87719F0E11Fa4F292Cd7a38102824E42F91"); // PriceOracle Avalanche Fuji
  const oracleData = "0x0000000000000000000000000000000000000000";

  const INTEREST_CONVERSION = 1e18 / (365.25 * 3600 * 24) / 100;
  const OPENING_CONVERSION = 1e5 / 100;

  const collateralization = 75 * 1e3; // 75% LTV
  const opening = 0.5 * OPENING_CONVERSION; // .5% initial
  const interest = parseInt(String(0 * INTEREST_CONVERSION)); // 1% Interest
  const liquidation = 12.5 * 1e3 + 1e5;

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
