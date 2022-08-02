require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.3",
  networks: {
    hardhat: {
      // avalanche mainnet fork
      chainId: 43114,
      forking: {
        url: `https://api.avax.network/ext/bc/C/rpc`,
        blockNumber: 16580532,
      },
      gasPrice: "auto",
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        accountsBalance: "950000000000000000000",
      },
    },
  },
};
