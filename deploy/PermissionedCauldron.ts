import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";
import { PermissionedCauldron } from "../typechain";

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

  const degenBox = "0x3c4479f3274113dd44F770632cC89F4AdDf33617";
  const nxusd = "0x08Ccc70e9D460e8EbD9D384e261CDEDAe68F1E41";
  const permissionManager = "0xBd0c5318a49232E660fB336de4aB393093eb5a5f";
  const whitelistManager = "0x789348B5A0c24EAe846D2691e93ff41BC28AFe4b";

  console.log("deployer", deployer);

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
