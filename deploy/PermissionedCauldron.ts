import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";
import { PermissionedCauldron } from "../typechain";

const ParametersPerChain = {
  [ChainId.Avalanche]: {
    wavax: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
    owner: LothricFin,
  },
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

  const degenBox = "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775";
  const nxusd = "0xF14f4CE569cB3679E99d5059909E23B07bd2F387";
  const permissionManager = "0x9934248Bb601b7C0E1B2e1E71571C1Ef71D09c89";
  const whitelistManager = "0x662e896e36e57606B0334708B366212c6fe0CAB6";

  const tx = await deploy("PermissionedCauldron", {
    from: deployer,
    args: [degenBox, nxusd, permissionManager, whitelistManager],
    log: true,
    deterministicDeployment: false,
  });

  const PermissionedCauldron = await ethers.getContract<PermissionedCauldron>("PermissionedCauldron");

  if ((await PermissionedCauldron.owner()) != parameters.owner && network.name !== "hardhat") {
    await PermissionedCauldron.transferOwnership(parameters.owner, true, false);
  }

  await deployments.save("PermissionedCauldron", {
    abi: [],
    address: tx.address,
  });
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["PermissionedCauldron"];
deployFunction.dependencies = [];
