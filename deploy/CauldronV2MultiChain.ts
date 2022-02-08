import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";
import { CauldronV2MultiChain } from "../typechain";

const ParametersPerChain = {
  [ChainId.Localhost]: {
    wavax: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
    owner: LothricFin,
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const nusd = (await deployments.get("NereusStableCoin")).address;
  const degenBox = (await deployments.get("DegenBox")).address;

  const tx = await deploy("CauldronV2MultiChain", {
    from: deployer,
    args: [degenBox, nusd],
    log: true,
    deterministicDeployment: false,
  });

  const CauldronV2MultiChain = await ethers.getContract<CauldronV2MultiChain>("CauldronV2MultiChain");

  if ((await CauldronV2MultiChain.owner()) != parameters.owner && network.name !== "hardhat") {
    await CauldronV2MultiChain.transferOwnership(parameters.owner, true, false);
  }

  await deployments.save("CauldronV2MultiChain", {
    abi: [],
    address: tx.address,
  });
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["CauldronV2MultiChain"];
deployFunction.dependencies = ["DegenBox"];
