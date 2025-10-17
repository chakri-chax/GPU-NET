// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimplePriceOracle {
    struct AssetConfig {
        uint256 price;
        uint8 decimals;
        bool isSupported;
    }

    mapping(address => AssetConfig) private assetConfigs;
    address[] private supportedAssets;
    address private owner;

    event AssetPriceUpdated(address indexed asset, uint256 price);
    event AssetDecimalUpdated(address indexed asset, uint8 decimals);
    event AssetAdded(address indexed asset, uint256 price, uint8 decimals);
    event AssetRemoved(address indexed asset);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can update prices");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Add a new supported asset with price and decimals
     */
    function addAsset(
        address asset,
        uint256 price,
        uint8 decimals
    ) external onlyOwner {
        require(!assetConfigs[asset].isSupported, "Asset already supported");

        assetConfigs[asset] = AssetConfig(price, decimals, true);
        supportedAssets.push(asset);

        emit AssetAdded(asset, price, decimals);
    }

    /**
     * @dev Remove an asset from supported list
     */
    function removeAsset(address asset) external onlyOwner {
        require(assetConfigs[asset].isSupported, "Asset not supported");

        assetConfigs[asset].isSupported = false;

        // Remove from supportedAssets array
        for (uint i = 0; i < supportedAssets.length; i++) {
            if (supportedAssets[i] == asset) {
                supportedAssets[i] = supportedAssets[
                    supportedAssets.length - 1
                ];
                supportedAssets.pop();
                break;
            }
        }

        emit AssetRemoved(asset);
    }

    function setAssetPrice(address asset, uint256 price) external onlyOwner {
        require(assetConfigs[asset].isSupported, "Asset not supported");
        assetConfigs[asset].price = price;
        emit AssetPriceUpdated(asset, price);
    }

    function setAssetDecimal(address asset, uint8 decimal) external onlyOwner {
        require(assetConfigs[asset].isSupported, "Asset not supported");
        assetConfigs[asset].decimals = decimal;
        emit AssetDecimalUpdated(asset, decimal);
    }

    function getAssetPrice(address asset) external view returns (uint256) {
        require(assetConfigs[asset].isSupported, "Asset not supported");
        return assetConfigs[asset].price;
    }

    function getAssetDecimal(address asset) external view returns (uint8) {
        require(assetConfigs[asset].isSupported, "Asset not supported");
        return assetConfigs[asset].decimals;
    }

    function isAssetSupported(address asset) external view returns (bool) {
        return assetConfigs[asset].isSupported;
    }

    function getSupportedAssets() external view returns (address[] memory) {
        return supportedAssets;
    }

    function getAssetConfig(
        address asset
    ) external view returns (uint256 price, uint8 decimals, bool isSupported) {
        AssetConfig memory config = assetConfigs[asset];
        return (config.price, config.decimals, config.isSupported);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner address");
        owner = newOwner;
    }
}
