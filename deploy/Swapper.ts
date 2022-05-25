import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";
import {ChainId, setDeploymentSupportedChains} from "../utilities";
import {Caeltrial} from "../test/constants";
import {NXUSDWAVAXSwapper} from "../typechain";

const ParametersPerChain = {
    [ChainId.Avalanche]: {
        owner: Caeltrial,
    },
    [ChainId.Localhost]: {
        owner: Caeltrial,
    },
    [ChainId.Fuji]: {
        owner: Caeltrial,
    },
};

const deployFunction: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {deployments, getNamedAccounts} = hre;
    const {deploy} = deployments;

    const {deployer} = await getNamedAccounts();

    const tx = await deploy("NXUSDWAVAXSwapper", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deployments.save("NXUSDWAVAXSwapper", {
        abi: [],
        address: tx.address,
    });
};

export default deployFunction;

setDeploymentSupportedChains(Object.keys(ParametersPerChain), deployFunction);

deployFunction.tags = ["NXUSDWAVAXSwapper"];

deployFunction.dependencies = [];
