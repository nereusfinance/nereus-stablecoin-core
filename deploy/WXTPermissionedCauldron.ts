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

  const BentoBox = await ethers.getContractAt<BentoBoxV1>("BentoBoxV1", "0x4cA5dD575DacE76781C41cafe68281dfc4dF0038");
  const PermissionedCauldronMasterContract = "0xd2276a18E7bF769B5C2079e4A94C929a68a2D676"; // PermissionedCauldron
  const collateral = "0xfcDe4A87b8b6FA58326BB462882f1778158B02F1"; // WXT Avalanche
  const oracleProxy = await ethers.getContractAt<WXTOracle>("WXTOracle", "0x662e896e36e57606B0334708B366212c6fe0CAB6"); // PriceOracle Avalanche Fuji
  const oracleData = "0x0000000000000000000000000000000000000000";

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
