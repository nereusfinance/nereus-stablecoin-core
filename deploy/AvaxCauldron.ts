import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { BentoBoxV1, AVAXOracle } from "../typechain";
import { expect } from "chai";

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;

  const degenBox = (await deployments.get("DegenBox")).address;
  const cauldron = (await deployments.get("CauldronV2")).address;

  const BentoBox = await ethers.getContractAt<BentoBoxV1>("BentoBoxV1", degenBox);
  const CauldronV2MasterContract = cauldron; // CauldronV2
  const collateral = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"; // WAVAX
  const oracleProxy = await ethers.getContractAt<AVAXOracle>("AVAXOracle", "0x0824545b22dd6dc644c8b66d7923e613816ff63a");
  const oracleData =
    "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000";

  const INTEREST_CONVERSION = 1e18 / (365.25 * 3600 * 24) / 100;
  const OPENING_CONVERSION = 1e5 / 100;

  const collateralization = 75 * 1e3; // 85% LTV
  const opening = 0.5 * OPENING_CONVERSION; // .5% initial
  const interest = parseInt(String(1 * INTEREST_CONVERSION)); // 3% Interest
  const liquidation = 12.5 * 1e3 + 1e5;

  let initData = ethers.utils.defaultAbiCoder.encode(
    ["address", "address", "bytes", "uint64", "uint256", "uint256", "uint256"],
    [collateral, oracleProxy.address, oracleData, interest, liquidation, collateralization, opening]
  );

  const tx = await (await BentoBox.deploy(CauldronV2MasterContract, initData, true)).wait();

  const deployEvent = tx?.events?.[0];
  expect(deployEvent?.eventSignature).to.be.eq("LogDeploy(address,bytes,address)");
  deployments.save("AvaxCauldron", {
    abi: [],
    address: deployEvent?.args?.cloneAddress,
  });
  console.log("AvaxCauldron", (await deployments.get("AvaxCauldron")).address);
};

export default deployFunction;

if (network.name !== "hardhat" || process.env.HARDHAT_LOCAL_NODE) {
  deployFunction.skip = ({ getChainId }) =>
    new Promise((resolve, reject) => {
      try {
        getChainId().then((chainId) => {
          resolve(chainId !== "43114");
        });
      } catch (error) {
        reject(error);
      }
    });
}

deployFunction.tags = ["AvaxCauldron"];
deployFunction.dependencies = ["CauldronV2"];
