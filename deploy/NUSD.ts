import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";
import { NereusStableCoin } from "../typechain";

const ParametersPerChain = {
  [ChainId.Localhost]: {
    weth: "0x49d5c2bdffac6ce2bfdb6640f4f80f226bc10bab",
    owner: LothricFin,
  },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

  const tx = await deploy("NereusStableCoin", {
    from: deployer,
    args: [],
    log: true,
    deterministicDeployment: false,
  });

  await deployments.save("NereusStableCoin", {
    abi: [],
    address: tx.address,
  });
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["NUSD"];
deployFunction.dependencies = [];
