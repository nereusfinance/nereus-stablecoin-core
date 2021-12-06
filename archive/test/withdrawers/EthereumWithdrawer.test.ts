import hre, { ethers, network, deployments, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { ChainId, getBigNumber, impersonate } from "../utilities";
import { CauldronV2, EthereumWithdrawer, IERC20 } from "../typechain";

const MimProvider = "0x5f0DeE98360d8200b20812e174d139A1a633EDd2";

const CauldronMasterContracts = [
  "0x63905bb681b9e68682f392Df2B22B7170F78D300", // CauldronV2Flat
  "0x1DF188958A8674B5177f77667b8D173c3CdD9e51", // CauldronV2CheckpointV1
  "0x469a991a6bB8cbBfEe42E7aB846eDEef1bc0B3d3", // CauldronLowRiskV1
  "0x4a9Cb5D0B755275Fd188f87c0A8DF531B0C7c7D2", // CauldronMediumRiskV1
  "0x476b1E35DDE474cB9Aa1f6B85c9Cc589BFa85c1F", // Cauldron V2
];

describe("Ethereum Cauldron Fee Withdrawer", async () => {
  let snapshotId;
  let Withdrawer: EthereumWithdrawer;
  let MIM: IERC20;
  let SPELL: IERC20;
  let sSPELL: IERC20;
  let deployerSigner;

  before(async () => {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: process.env.ETHEREUM_RPC_URL || `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
            blockNumber: 13728225,
          },
        },
      ],
    });

    hre.getChainId = () => Promise.resolve(ChainId.Mainnet.toString());
    await deployments.fixture(["EthereumWithdrawer"]);
    const { deployer } = await getNamedAccounts();
    deployerSigner = await ethers.getSigner(deployer);

    MIM = await ethers.getContractAt<IERC20>("ERC20", "0x99D8a9C45b2ecA8864373A26D1459e3Dff1e17F3");
    SPELL = await ethers.getContractAt<IERC20>("ERC20", "0x090185f2135308BaD17527004364eBcC2D37e5F6");
    sSPELL = await ethers.getContractAt<IERC20>("ERC20", "0x26FA3fFFB6EfE8c1E69103aCb4044C26B9A106a9");

    Withdrawer = await ethers.getContract<EthereumWithdrawer>("EthereumWithdrawer");

    // change cauldron master contracts feeTo to withdrawer address
    for (let i = 0; i < CauldronMasterContracts.length; i++) {
      const cauldronMasterContract = await ethers.getContractAt<CauldronV2>("CauldronV2", CauldronMasterContracts[i]);
      const owner = await cauldronMasterContract.owner();
      await impersonate(owner);
      const signer = await ethers.getSigner(owner);
      await cauldronMasterContract.connect(signer).setFeeTo(Withdrawer.address);
    }

    // Set MIM provider allowance for transferring MIM to withdrawer
    await impersonate(MimProvider);
    const mimProviderSigner = await ethers.getSigner(MimProvider);
    await MIM.connect(mimProviderSigner).approve(Withdrawer.address, ethers.constants.MaxUint256);
    await MIM.connect(mimProviderSigner).transfer(Withdrawer.address, getBigNumber(100000));
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await network.provider.send("evm_revert", [snapshotId]);
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  it("should withdraw mim from all cauldrons", async () => {
    const mimBefore = await MIM.balanceOf(Withdrawer.address);
    await Withdrawer.withdraw();
    const mimAfter = await MIM.balanceOf(Withdrawer.address);

    expect(mimAfter).to.be.gt(mimBefore);

    console.log("MIM Withdrawn:", mimAfter.sub(mimBefore).toString());
  });

  it("should take the right treasury share", async () => {
    const treasury = "0x5A7C5505f3CFB9a0D9A8493EC41bf27EE48c406D";
    const shares = [0, 10, 15, 25];

    for (let i = 0; i < shares.length; i++) {
      console.log(`share ${shares[i]}%`);
      await Withdrawer.setTreasuryShare(shares[i]);
      const mimBefore = await MIM.balanceOf(treasury);
      await Withdrawer.withdraw();
      const mimAmount = await MIM.balanceOf(Withdrawer.address);

      const amount1 = mimAmount.mul(10).div(100);
      const amount2 = mimAmount.mul(20).div(100);
      const mimAmountToSwap = amount1.add(amount2);
      await Withdrawer.swapMimForSpell(amount1, amount2, 0, 0, true);

      const mimAfter = await MIM.balanceOf(treasury);

      expect(mimAfter.sub(mimBefore)).to.eq(mimAmountToSwap.mul(shares[i]).div(100));
      await network.provider.send("evm_revert", [snapshotId]);
      snapshotId = await ethers.provider.send("evm_snapshot", []);
    }
  });

  it("should be able to rescue token", async () => {
    const { deployer } = await getNamedAccounts();
    const mimBefore = await MIM.balanceOf(deployer);
    await Withdrawer.withdraw();

    const amountToRescue = await MIM.balanceOf(Withdrawer.address);
    await Withdrawer.connect(deployerSigner).rescueTokens(MIM.address, deployer, amountToRescue);
    const mimAfter = await MIM.balanceOf(deployer);
    expect(mimAfter.sub(mimBefore)).to.eq(amountToRescue);
  });

  it("should not allow swapping from unauthorized account", async () => {
    const { alice } = await getNamedAccounts();
    const aliceSigner = await ethers.getSigner(alice);
    const tx = Withdrawer.connect(aliceSigner).swapMimForSpell(0, 0, 0, 0, false);
    await expect(tx).to.be.revertedWith("Only verified operators");
  });

  it("should swap the whole mim balance in multiple steps", async () => {
    await Withdrawer.withdraw();
    const withdrawnMimAmount = await MIM.balanceOf(Withdrawer.address);

    const swap = async (mimToSwapOnSushi, mimToSwapOnUniswap) => {
      console.log(`Swapping ${mimToSwapOnSushi.toString()} MIM on sushiswap and ${mimToSwapOnUniswap.toString()} MIM on uniswap...`);
      const mimBefore = await MIM.balanceOf(Withdrawer.address);
      const totalSwapped = mimToSwapOnSushi.add(mimToSwapOnUniswap);

      await Withdrawer.swapMimForSpell(mimToSwapOnSushi, mimToSwapOnUniswap, 0, 0, true);
      const mimAfter = await MIM.balanceOf(Withdrawer.address);
      expect(mimBefore.sub(mimAfter)).to.eq(totalSwapped);
    };

    const spellAmountinSSpellBefore = await SPELL.balanceOf(sSPELL.address);
    let mimAmount = await MIM.balanceOf(Withdrawer.address);
    await swap(mimAmount.mul(10).div(100), mimAmount.mul(20).div(100));

    mimAmount = await MIM.balanceOf(Withdrawer.address);
    await swap(mimAmount.div(2), getBigNumber(0));

    mimAmount = await MIM.balanceOf(Withdrawer.address);
    await swap(getBigNumber(0), mimAmount);
    const spellAmountinSSpellAfter = await SPELL.balanceOf(sSPELL.address);

    const spellBought = spellAmountinSSpellAfter.sub(spellAmountinSSpellBefore);
    console.log(
      `Swapped ${ethers.utils.formatUnits(withdrawnMimAmount)} MIM to ${ethers.utils.formatUnits(
        spellBought
      )} SPELL into sSPELL for an avg price of ${(parseInt(withdrawnMimAmount.toString()) / parseInt(spellBought.toString())).toFixed(4)} MIM`
    );
    const mimBalance = await MIM.balanceOf(Withdrawer.address);
    expect(mimBalance).eq(0);
  });

  it("should prevent frontrunning when swapping", async () => {
    await Withdrawer.withdraw();
    const withdrawnMimAmount = await MIM.balanceOf(Withdrawer.address);

    await expect(Withdrawer.swapMimForSpell(0, withdrawnMimAmount, 0, ethers.constants.MaxUint256, true)).to.be.revertedWith(
      "Too little received"
    );
    await expect(Withdrawer.swapMimForSpell(withdrawnMimAmount, 0, ethers.constants.MaxUint256, 0, true)).to.be.revertedWith(
      "Too little received"
    );

    await expect(
      Withdrawer.swapMimForSpell(withdrawnMimAmount.div(2), withdrawnMimAmount.div(2), getBigNumber(100), ethers.constants.MaxUint256, true)
    ).to.be.revertedWith("Too little received");
    await expect(
      Withdrawer.swapMimForSpell(withdrawnMimAmount.div(2), withdrawnMimAmount.div(2), ethers.constants.MaxUint256, getBigNumber(100), true)
    ).to.be.revertedWith("Too little received");

    await expect(Withdrawer.swapMimForSpell(withdrawnMimAmount.div(2), withdrawnMimAmount.div(2), 0, 0, true)).to.not.be.revertedWith(
      "Too little received"
    );
  });

  it("should allow 1inch swapping", async () => {
    await impersonate(MimProvider);
    const mimProviderSigner = await ethers.getSigner(MimProvider);
    await MIM.connect(mimProviderSigner).transfer(Withdrawer.address, getBigNumber(900000));

    const spellAmountinSSpellBefore = await SPELL.balanceOf(sSPELL.address);

    const unwrappedAddress = Withdrawer.address.replace("0x", "");
    const data = `0x7c02520000000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd20000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000018000000000000000000000000099d8a9c45b2eca8864373a26d1459e3dff1e17f3000000000000000000000000090185f2135308bad17527004364ebcc2d37e5f600000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd2000000000000000000000000${unwrappedAddress}00000000000000000000000000000000000000000000be951906eba2aa8000000000000000000000000000000000000000000000003c1f3ea11542b5c952a17a00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000012c000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002200000000000000000000000000000000000000000000000000000000000000360000000000000000000000000000000000000000000000000000000000000066000000000000000000000000000000000000000000000000000000000000009600000000000000000000000000000000000000000000000000000000000000ba00000000000000000000000000000000000000000000000000000000000000d00000000000000000000000000000000000000000000000000000000000000102080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000064eb5625d900000000000000000000000099d8a9c45b2eca8864373a26d1459e3dff1e17f30000000000000000000000005a6a4d54456819380173272a5e8e9b9904bdf41b00000000000000000000000000000000000000000000be951906eba2aa800000000000000000000000000000000000000000000000000000000000008000000000000000000000005a6a4d54456819380173272a5e8e9b9904bdf41b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000084a6417ed60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000be951906eba2aa80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000244b3af37c000000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000320000000000000000000000000000003280000000000000000000000088e6a0c2ddd26feeb64f039a2c41296fcb3f56400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000104128acb0800000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd20000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000001000276a400000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000244b3af37c000000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000500000000000000000000000000000032000000000000000000000000febf38b1d34818d4827034f97b7d6d77c79d49970000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000104128acb0800000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000fffd8963efd1fc6a506488495d951d5263988d2500000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000040000000000000000000000000090185f2135308bad17527004364ebcc2d37e5f6000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000184b3af37c000000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000024000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000002d0000000000000000000000000000002d000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000b5de0c3753b6e1b4dba616db82767f17513e6d4e00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a4b757fed6000000000000000000000000b5de0c3753b6e1b4dba616db82767f17513e6d4e000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000090185f2135308bad17527004364ebcc2d37e5f60000000000000000002dc6c027239549dd40e1d60f5b80b0c4196923745b1fd2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000002647f8fe7a00000000000000000000000000000000000000000000000000000000000000080800000000000000000000000000000000000000000000000000000000000004400000000000000000000000027239549dd40e1d60f5b80b0c4196923745b1fd200000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000a405971224000000000000000000000000090185f2135308bad17527004364ebcc2d37e5f6000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000001000000000000000000000000000000000000000000000016c43c3cf2c8eaa12b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004470bdb947000000000000000000000000090185f2135308bad17527004364ebcc2d37e5f60000000000000000000000000000000000000000003cbab6361aa5a58589c4ba0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001a4b3af37c000000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000044000000000000000000000000090185f2135308bad17527004364ebcc2d37e5f6000000000000000000000000000000010000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000090185f2135308bad17527004364ebcc2d37e5f6000000000000000000000000${unwrappedAddress}00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cfee7c08`;

    await Withdrawer.swapMimForSpell1Inch("0x11111112542d85b3ef69ae05771c2dccff4faa26", data);

    const spellAmountinSSpellAfter = await SPELL.balanceOf(sSPELL.address);
    const spellBought = spellAmountinSSpellAfter.sub(spellAmountinSSpellBefore);

    console.log(
      `Swapped ${ethers.utils.formatUnits(getBigNumber(900000))} MIM to ${ethers.utils.formatUnits(
        spellBought
      )} SPELL into sSPELL for an avg price of ${(parseInt(getBigNumber(900000).toString()) / parseInt(spellBought.toString())).toFixed(4)} MIM`
    );
  });
});
