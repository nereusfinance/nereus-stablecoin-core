import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { ChainId, setDeploymentSupportedChains } from "../utilities";
import { LothricFin } from "../test/constants";
import { DegenBox } from "../typechain";

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
  const chainId = await hre.getChainId();
  const parameters = ParametersPerChain[parseInt(chainId)];

  const tx = await deploy("DegenBox", {
    from: deployer,
    args: [parameters.weth],
    log: true,
    deterministicDeployment: false,
  });

  const DegenBox = await ethers.getContract<DegenBox>("DegenBox");

  if ((await DegenBox.owner()) != parameters.owner && network.name !== "hardhat") {
    await DegenBox.transferOwnership(parameters.owner, true, false);
  }

  await deployments.save("DegenBox", {
    abi: [],
    address: tx.address,
  });
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["DegenBox"];
deployFunction.dependencies = ["NUSD"];
