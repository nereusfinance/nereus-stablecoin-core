import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";
import { CauldronV2 } from "../typechain";

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
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const nusd = (await deployments.get("NXUSD")).address;
  const degenBox = (await deployments.get("DegenBox")).address;
  const permissionManager = "0xBd0c5318a49232E660fB336de4aB393093eb5a5f";

  const tx = await deploy("CauldronV2", {
    from: deployer,
    args: [degenBox, nusd, permissionManager],
    log: true,
    deterministicDeployment: false,
  });

  const CauldronV2 = await ethers.getContract<CauldronV2>("CauldronV2");

  if ((await CauldronV2.owner()) != parameters.owner && network.name !== "hardhat") {
    await CauldronV2.transferOwnership(parameters.owner, true, false);
  }

  await deployments.save("CauldronV2", {
    abi: [],
    address: tx.address,
  });
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["CauldronV2"];
deployFunction.dependencies = ["DegenBox"];
