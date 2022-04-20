import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";
import { CauldronV2 } from "../typechain";

const ParametersPerChain = {
  [ChainId.Localhost]: {
    owner: LothricFin,
    degenBox: "",
    nxusd: "",
    permissionManager: "",
  },
  [ChainId.Fuji]: {
    owner: LothricFin,
    degenBox: "0x3c4479f3274113dd44F770632cC89F4AdDf33617",
    nxusd: "0x08Ccc70e9D460e8EbD9D384e261CDEDAe68F1E41",
    permissionManager: "0xdA75546EA91c07657Cd0fB83a2Bb379cA0c09f06",
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const tx = await deploy("CauldronV2", {
    from: deployer,
    args: [parameters.degenBox, parameters.nxusd, parameters.permissionManager],
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
deployFunction.dependencies = [""];
