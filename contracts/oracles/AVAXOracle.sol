// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;
import "@boringcrypto/boring-solidity/contracts/libraries/BoringMath.sol";
import "../interfaces/IOracle.sol";

// Chainlink Aggregator

interface IAggregator {
    function latestAnswer() external view returns (int256 answer);
}

contract AVAXOracle is IOracle {
    using BoringMath for uint256; // Keep everything in uint256


    // Chainlink Data Feeds Avalanche Mainnet AVAX/USD 0x0A77230d17318075983913bC2145DB16C7366156
    // Chainlink Data Feeds Avalanche Fuji AVAX/USD 0x5498BB86BC934c8D34FDA08E81D444153d0D06aD
    // ?? 0xE9490791171630664Ea40db9Ca664e9F1b58A799
    IAggregator public constant aggregatorProxy = IAggregator(0x5498BB86BC934c8D34FDA08E81D444153d0D06aD);

    // Calculates the lastest exchange rate
    // Uses both divide and multiply only for tokens not supported directly by Chainlink, for example MKR/USD
    function _get() internal view returns (uint256) {
        return 1e26 / uint256(aggregatorProxy.latestAnswer());
    }

    // Get the latest exchange rate
    /// @inheritdoc IOracle
    function get(bytes calldata) public override returns (bool, uint256) {
        return (true, _get());
    }

    // Check the last exchange rate without any state changes
    /// @inheritdoc IOracle
    function peek(bytes calldata ) public view override returns (bool, uint256) {
        return (true, _get());
    }

    // Check the current spot exchange rate without any state changes
    /// @inheritdoc IOracle
    function peekSpot(bytes calldata data) external view override returns (uint256 rate) {
        (, rate) = peek(data);
    }

    /// @inheritdoc IOracle
    function name(bytes calldata) public view override returns (string memory) {
        return "AVAX Chainlink";
    }

    /// @inheritdoc IOracle
    function symbol(bytes calldata) public view override returns (string memory) {
        return "AVAX/USD";
    }
}
