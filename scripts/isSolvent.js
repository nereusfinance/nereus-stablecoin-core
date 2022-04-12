const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  const [user] = await hre.ethers.getSigners();
  const price = 6001;
  const addresses = {
    bentoBox: "0x0B1F9C2211F77Ec3Fa2719671c5646cf6e59B775",
    cauldron: "0xD70Bfc49f4a293920c8642e97217807a0132284B",
    token: "0xfcDe4A87b8b6FA58326BB462882f1778158B02F1",
  };
  const cauldron = await ethers.getContractAt(
    "PermissionedCauldron",
    addresses.cauldron
  );
  const bentoBox = await ethers.getContractAt("DegenBox", addresses.bentoBox);
  const collateralShare = await cauldron.userCollateralShare(user.address);
  const part1 = await bentoBox.toAmount(
    addresses.token,
    collateralShare.mul("10000000000000").mul(80 * 1e3),
    false
  );
  const borrowPart = await cauldron.userBorrowPart(user.address);
  const _totalBorrow = await cauldron.totalBorrow();

  let a = ethers.BigNumber.from("1000000000000000000000000");

  const _exchangeRate = a.div(price);

  const part2 = borrowPart
    .mul(_totalBorrow.elastic)
    .mul(_exchangeRate)
    .div(_totalBorrow.base);
  console.log(part1 >= part2 ? "Solvent" : "Not solvent");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
