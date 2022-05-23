const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const user = "0x1B21B125be9284D17550e97BD4215b9EBd507047";

  const addresses = {
    bentoBox: "0x57c5e7E753239f5260FE7C376De4f5813C61Ceb1",
    cauldron: "0x3909683B2e3A3c56ba7Ec984F54aFCbD90aBCE95",
    token: "0xf3630877aA6d47646112D006369C3ba538cC1b8A",
    collateral: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3",
  };


  const cauldron = await ethers.getContractAt(
    "PermissionedCauldron",
    addresses.cauldron
  );
  const bentoBox = await ethers.getContractAt("DegenBox", addresses.bentoBox);

  const userCollateralShare = await cauldron.userCollateralShare(user);
  const bentoBoxTotals = await bentoBox.totals(addresses.collateral);
  const userBorrowPart = await cauldron.userBorrowPart(user);
  const totalBorrow = await cauldron.totalBorrow();
  const totalCollateralShare = await cauldron.totalCollateralShare();
  const exchangeRate = await cauldron.exchangeRate();
  const LIQUIDATION_MULTIPLIER = await cauldron.LIQUIDATION_MULTIPLIER();
  const LIQUIDATION_MULTIPLIER_PRECISION = ethers.BigNumber.from(100000);
  const EXCHANGE_RATE_PRECISION = ethers.BigNumber.from(100000).mul(100000).mul(100000).mul(1000);
  console.log('LIQUIDATION_MULTIPLIER', LIQUIDATION_MULTIPLIER.toString());
  console.log('EXCHANGE_RATE_PRECISION', EXCHANGE_RATE_PRECISION.toString());
  console.log('exchangeRate', exchangeRate.toString());
  console.log('userCollateralShare', userCollateralShare.toString());
  console.log('userBorrowPart', userBorrowPart.toString());
  console.log('totalBorrow', totalBorrow);
  console.log('bentoBoxTotals', bentoBoxTotals);
  console.log('totalCollateralShare', totalCollateralShare.toString());

  function toElastic(total, base) {
    return base.mul(total.elastic).div(total.base);
  }

  function toBase(total, base) {
    return base.mul(total.base).div(total.elastic);
  }

  const borrowAmount = toElastic(totalBorrow, userBorrowPart);
  console.log('borrowAmount', borrowAmount.toString());
  const calc = (borrowAmount.mul(LIQUIDATION_MULTIPLIER).mul(exchangeRate)).div(LIQUIDATION_MULTIPLIER_PRECISION.mul(EXCHANGE_RATE_PRECISION));
  console.log('calc', calc.toString());
  const collateralShare = toBase(
    bentoBoxTotals,
    calc
  );
  console.log('collateralShare', collateralShare.toString());
  const newUserCollateralShare = userCollateralShare.sub(collateralShare);
  console.log('newUserCollateralShare', newUserCollateralShare.toString())
  const newTotalCollateralShare = totalCollateralShare.sub(collateralShare);
  console.log('newTotalCollateralShare', newTotalCollateralShare.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
