/* eslint-disable @typescript-eslint/no-non-null-assertion */
import "dotenv/config"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-solhint"
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@openzeppelin/hardhat-upgrades"
import "@typechain/hardhat"
import "@tenderly/hardhat-tenderly"
import "hardhat-abi-exporter"
import "hardhat-gas-reporter"
import "solidity-coverage"
import "hardhat-deploy"
import "hardhat-watcher"
import "hardhat-tracer"
import "./tasks"

if (process.env.SKIP_LOAD !== "true") {
  import("./tasks/mockOraclePrice")
  import("./tasks/topUpAccount")
  import("./tasks/configureVaultSwapper")
  import("./tasks/setLiquidatorManager")
  import("./tasks/deployP3Markets")
  import("./tasks/minToBentobox")
  import("./tasks/printP3Deployments")
  import("./tasks/permitSignature")
  import("./tasks/increaseTime")
  import("./tasks/printRewardSwapEvents")
  import("./tasks/mockOracleVaultPrice")
}

const accounts = {
  mnemonic: process.env.MNEMONIC || "test test test test test test test test test test test junk",
}
const accountsFromPrivateKeys = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : []

const config = {
  defaultNetwork: "hardhat",
  abiExporter: {
    path: "./abi",
    clear: false,
    flat: true,
  },
  paths: {
    artifacts: "artifacts",
    cache: "cache",
    deploy: "deploy",
    deployments: "deployments",
    imports: "imports",
    sources: process.env.CONTRACTS_PATH || "contracts",
    tests: "test",
  },
  etherscan: {
    apiKey: {
      // avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
      avalanche: process.env.SNOWTRACE_API_KEY,
    },
  },
  gasReporter: {
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: "USD",
    enabled: process.env.REPORT_GAS === "true",
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    user1: {
      default: 1,
    },
    user2: {
      default: 2,
    },
    user3: {
      default: 3,
    },
    liquidatorManager: {
      default: 4,
    },
  },
  networks: {
    localhost: {
      url: "http://localhost:8545",
      live: false,
      saveDeployments: true,
      tags: ["local"],
    },
    nereusdev1: {
      url: process.env.NEREUS_DEV_RPC_URL1 || "",
      accounts: accountsFromPrivateKeys,
    },
    nereusdev2: {
      url: process.env.NEREUS_DEV_RPC_URL2 || "",
    },
    nereusdev3: {
      url: process.env.NEREUS_DEV_RPC_URL3 || "",
    },
    hardhat: {
      chainId: 43114,
      accounts,
      gasPrice: 0,
      initialBaseFeePerGas: 0,
      live: false,
      saveDeployments: false,
      tags: ["test", "local"],
    },
    avalanche: {
      chainId: 43114,
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: accountsFromPrivateKeys,
      gasPrice: 75 * 1e9,
      live: true,
      saveDeployments: true,
      tags: ["prod"],
    },
  },
  mocha: {
    timeout: 40000,
    bail: true,
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT || "project",
    username: process.env.TENDERLY_USERNAME || "",
  },
  watcher: {
    contractsAndTests: {
      tasks: [],
      start: "echo compiling... && npx hardhat test",
      files: ["./test/**/*", "./contracts/"],
      verbose: true,
      runOnLaunch: true,
    },
    testsNoCompile: {
      tasks: [
        {
          command: "test",
          params: { noCompile: true, testFiles: ["{path}"], trace: true },
        },
      ],
      files: ["./test/**/*"],
      verbose: true,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.4",
      },
      {
        version: "0.8.6",
      },
      {
        version: "0.8.7",
      },
      {
        version: "0.8.9",
      },
      {
        version: "0.8.10",
      },
      {
        version: "0.7.6",
      },
    ],
    overrides: {
      "contracts/oracle/AGLDUniV3ChainlinkOracle.sol": {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9000,
          },
        },
      },
      "@uniswap/v3-core/contracts/libraries/FullMath.sol": {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9000,
          },
        },
      },
      "@uniswap/v3-core/contracts/libraries/TickMath.sol": {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9000,
          },
        },
      },
      "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol": {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9000,
          },
        },
      },
      "contracts/SpellPower.sol": {
        version: "0.8.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9000,
          },
        },
      },
      "contracts/KashiPair.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
      "contracts/mocks/KashiPairMock.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
        },
      },
      "contracts/swappers/Leverage/AGLDLevSwapper.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9000,
          },
        },
      },
      "contracts/swappers/Liquidations/AGLDSwapper.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 9000,
          },
        },
      },
      "contracts-flat/DegenBox.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/KashiPairMediumRiskV2.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 350,
          },
        },
      },
      "contracts-flat/CauldronV2Multichain.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 350,
          },
        },
      },
      "contracts-flat/BentoBoxFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/YearnChainlinkOracleV1.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/YearnChainlinkOracleV2.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/sSpellFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/MagicInternetMoneyFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/MinimalTimeLockFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/CauldronV2CheckpointV1.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 350,
          },
        },
      },
      "contracts-flat/CauldronMediumRiskV1.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 350,
          },
        },
      },
      "contracts-flat/CauldronLowRiskV1.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 350,
          },
        },
      },
      "contracts-flat/KashiPairFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 350,
          },
        },
      },
      "contracts-flat/SushiSwapSwapperFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/PeggedOracleFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/SimpleSLPTWAP0OracleFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/SimpleSLPTWAP1OracleFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/ChainlinkOracleFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/ChainlinkOracleV2Flat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/CompoundOracle.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
      "contracts-flat/BoringHelperFlat.sol": {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    },
  },
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more
export default config
