import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";

const ParametersPerChain = {
  [ChainId.Avalanche]: {
    owner: LothricFin,
  },
  [ChainId.Localhost]: {
    owner: LothricFin,
  },
  [ChainId.Fuji]: {
    owner: LothricFin,
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  try {
    const tx = await deploy("sAVAXOracle", {
      from: deployer,
      args: [],
      log: true,
      deterministicDeployment: false,
    });

    await deployments.save("sAVAXOracle", {
      abi: [],
      address: tx.address,
    });
  } catch (err) {
    console.log("err", err);
    throw err;
  }
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["sAVAXOracle"];
deployFunction.dependencies = [];
