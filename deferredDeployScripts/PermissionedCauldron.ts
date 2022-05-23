import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";
import { PermissionedCauldron } from "../typechain";

const ParametersPerChain = {
  [ChainId.Avalanche]: {
    owner: LothricFin,
    degenBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    nxusd: "0xF14f4CE569cB3679E99d5059909E23B07bd2F387",
    permissionManager: "0x9934248Bb601b7C0E1B2e1E71571C1Ef71D09c89",
    whitelistManager: "0x662e896e36e57606B0334708B366212c6fe0CAB6",
  },
  [ChainId.Localhost]: {
    owner: LothricFin,
    degenBox: "",
    nxusd: "",
    permissionManager: "",
    whitelistManager: "",
  },
  [ChainId.Fuji]: {
    owner: LothricFin,
    degenBox: "0x3c4479f3274113dd44F770632cC89F4AdDf33617",
    nxusd: "0x08Ccc70e9D460e8EbD9D384e261CDEDAe68F1E41",
    permissionManager: "0xBd0c5318a49232E660fB336de4aB393093eb5a5f",
    whitelistManager: "0x789348B5A0c24EAe846D2691e93ff41BC28AFe4b",
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const tx = await deploy("PermissionedCauldron", {
    from: deployer,
    args: [parameters.degenBox, parameters.nxusd, parameters.permissionManager, parameters.whitelistManager],
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
