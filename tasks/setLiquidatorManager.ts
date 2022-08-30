import LiquidatorAbi from "./abis/liquidatorAbi.json";
import { task } from "hardhat/config";

const LiquidatorAddress = "0xB0B69A8E0cf6cCfe62590d1133767E07A773adFf";
const LiquidatorOwnerAddress = "0xdd3de3b819edd3a014fda93868d7dfc873341467";

task("set-liquidator-manager", "set liquidator manager")
  .addParam("manager", "Manager's address to be added")
  .setAction(async ({ manager: managerAddress }, { ethers }) => {
    await ethers.provider.send("hardhat_impersonateAccount", [LiquidatorOwnerAddress]);
    const ownerSigner = await ethers.provider.getSigner(LiquidatorOwnerAddress);
    await ethers.provider.send("hardhat_setBalance", [LiquidatorOwnerAddress, ethers.utils.hexValue(ethers.utils.parseEther("100"))]);
    const liquidator = await ethers.getContractAt(LiquidatorAbi, LiquidatorAddress, ownerSigner);

    const isManager = await liquidator.managers(managerAddress);

    if (!isManager) {
      console.log(`adding manager ${managerAddress}`);
      await liquidator.addManager(managerAddress);
      const isManager = await liquidator.managers(managerAddress);

      console.log(`${managerAddress} isManager ${Boolean(isManager)}`);
    } else {
      console.log(`${managerAddress} is already manager, nothing to update`);
    }
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [LiquidatorOwnerAddress]);
  });
