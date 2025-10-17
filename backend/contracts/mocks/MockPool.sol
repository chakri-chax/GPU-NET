// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {DataTypes} from "@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {SafeERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/SafeERC20.sol";

contract MockPool is IPool {
    using SafeERC20 for IERC20;

    address public wrapper;
    address[] public supportedAssets;

    mapping(address => mapping(address => uint256)) public supplied;
    mapping(address => mapping(address => uint256)) public borrowed;

    event SupplyExecuted(address asset, uint256 amount, address onBehalfOf);
    event WithdrawExecuted(address asset, uint256 amount, address to);
    event BorrowExecuted(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    );
    event RepayExecuted(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    );
    event AssetAdded(
        address indexed asset,
        uint256 ltv,
        uint256 liquidationThreshold
    );
    event AssetRemoved(address indexed asset);
    address public priceOracle;
    address public owner;
    IPoolAddressesProvider private constant MOCK_ADDRESSES_PROVIDER =
        IPoolAddressesProvider(address(0x123));
        
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    struct CollateralConfig {
        uint256 ltv;
        uint256 liquidationThreshold;
        bool enabled;
    }

    mapping(address => CollateralConfig) public collateralConfigs;

    constructor(address _priceOracle) {
        owner = msg.sender;
        priceOracle = _priceOracle;
    }

    function addAsset(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold
    ) external onlyOwner {
        require(!_isSupportedAsset(asset), "Asset already supported");

        supportedAssets.push(asset);
        collateralConfigs[asset] = CollateralConfig(
            ltv,
            liquidationThreshold,
            true
        );

        emit AssetAdded(asset, ltv, liquidationThreshold);
    }

    /**
     * @dev Remove an asset from supported list
     */
    function removeAsset(address asset) external onlyOwner {
        require(_isSupportedAsset(asset), "Asset not supported");

        collateralConfigs[asset].enabled = false;

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

    function setPriceOracle(address _priceOracle) external onlyOwner {
        priceOracle = _priceOracle;
    }

    function setCollateralConfig(
        address asset,
        uint256 ltv,
        uint256 liquidationThreshold,
        bool enabled
    ) external onlyOwner {
        require(_isSupportedAsset(asset), "Asset not supported");
        collateralConfigs[asset] = CollateralConfig(
            ltv,
            liquidationThreshold,
            enabled
        );
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {
        require(_isSupportedAsset(asset), "Asset not supported");
        require(
            collateralConfigs[asset].enabled,
            "Asset not enabled as collateral"
        );

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        supplied[asset][onBehalfOf] += amount;
        emit SupplyExecuted(asset, amount, onBehalfOf);
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external override returns (uint256) {
        require(_isSupportedAsset(asset), "Asset not supported");

        uint256 userSupply = supplied[asset][to];
        require(userSupply >= amount, "Insufficient supply");

        require(
            _checkHealthFactorAfterWithdrawal(to, asset, amount),
            "Health factor too low"
        );

        supplied[asset][to] -= amount;
        IERC20(asset).safeTransfer(to, amount);

        emit WithdrawExecuted(asset, amount, to);
        return amount;
    }

    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        uint16 referralCode,
        address onBehalfOf
    ) external override {
        require(_isSupportedAsset(asset), "Asset not supported");

        // Calculate borrowing power
        (
            uint256 maxBorrowValue,
            uint256 currentDebtValue
        ) = _calculateBorrowingPower(onBehalfOf);
        uint256 borrowValue = _calculateAssetValue(asset, amount);

        require(borrowValue > 0, "Invalid borrow amount");
        require(
            currentDebtValue + borrowValue <= maxBorrowValue,
            "Exceeds borrowing power"
        );

        IERC20(asset).safeTransfer(onBehalfOf, amount);

        borrowed[asset][onBehalfOf] += amount;

        emit BorrowExecuted(asset, amount, interestRateMode, onBehalfOf);
    }

    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external override returns (uint256) {
        require(_isSupportedAsset(asset), "Asset not supported");

        uint256 currentDebt = borrowed[asset][onBehalfOf];
        uint256 repayAmount = amount;

        if (repayAmount == type(uint256).max) {
            repayAmount = currentDebt;
        } else {
            require(repayAmount <= currentDebt, "Repay exceeds debt");
        }

        IERC20(asset).safeTransferFrom(msg.sender, address(this), repayAmount);
        borrowed[asset][onBehalfOf] -= repayAmount;

        emit RepayExecuted(asset, repayAmount, interestRateMode, onBehalfOf);
        return repayAmount;
    }

    function calculateBorrowingPower(
        address user
    )
        external
        view
        returns (
            uint256 maxBorrowValue,
            uint256 currentDebtValue,
            uint256 availableBorrowValue,
            address[] memory borrowableAssets,
            uint256[] memory borrowableAmounts
        )
    {
        (maxBorrowValue, currentDebtValue) = _calculateBorrowingPower(user);
        availableBorrowValue = maxBorrowValue > currentDebtValue
            ? maxBorrowValue - currentDebtValue
            : 0;

        // Calculate maximum borrowable amount for each supported asset
        borrowableAssets = supportedAssets;
        borrowableAmounts = new uint256[](borrowableAssets.length);

        for (uint i = 0; i < borrowableAssets.length; i++) {
            if (availableBorrowValue > 0) {
                borrowableAmounts[i] = _valueToAssetAmount(
                    borrowableAssets[i],
                    availableBorrowValue
                );
            }
        }
    }

    function getBorrowableAssets(
        address user
    )
        external
        view
        returns (
            address[] memory assets,
            uint256[] memory maxBorrowAmounts,
            uint256 totalCollateralValue,
            uint256 availableBorrowValue
        )
    {
        (
            uint256 maxBorrowValue,
            uint256 currentDebtValue
        ) = _calculateBorrowingPower(user);
        availableBorrowValue = maxBorrowValue > currentDebtValue
            ? maxBorrowValue - currentDebtValue
            : 0;
        totalCollateralValue = _calculateTotalCollateralValue(user);

        assets = supportedAssets;
        maxBorrowAmounts = new uint256[](assets.length);

        for (uint i = 0; i < assets.length; i++) {
            if (availableBorrowValue > 0) {
                maxBorrowAmounts[i] = _valueToAssetAmount(
                    assets[i],
                    availableBorrowValue
                );
            }
        }
    }

    function _calculateBorrowingPower(
        address user
    ) internal view returns (uint256 maxBorrowValue, uint256 currentDebtValue) {
        uint256 totalCollateralValue = _calculateTotalCollateralValue(user);
        currentDebtValue = _calculateTotalDebtValue(user);

        // Max borrow = weighted collateral value
        maxBorrowValue = _calculateWeightedCollateralValue(user);

        return (maxBorrowValue, currentDebtValue);
    }

    function _calculateTotalCollateralValue(
        address user
    ) internal view returns (uint256) {
        uint256 totalValue = 0;

        for (uint i = 0; i < supportedAssets.length; i++) {
            address asset = supportedAssets[i];
            if (supplied[asset][user] > 0 && collateralConfigs[asset].enabled) {
                totalValue += _calculateAssetValue(
                    asset,
                    supplied[asset][user]
                );
            }
        }
        return totalValue;
    }

    function _calculateWeightedCollateralValue(
        address user
    ) internal view returns (uint256) {
        uint256 weightedValue = 0;

        for (uint i = 0; i < supportedAssets.length; i++) {
            address asset = supportedAssets[i];
            if (supplied[asset][user] > 0 && collateralConfigs[asset].enabled) {
                uint256 assetValue = _calculateAssetValue(
                    asset,
                    supplied[asset][user]
                );
                weightedValue +=
                    (assetValue * collateralConfigs[asset].ltv) /
                    10000;
            }
        }
        return weightedValue;
    }

    function _calculateTotalDebtValue(
        address user
    ) internal view returns (uint256) {
        uint256 totalDebt = 0;

        for (uint i = 0; i < supportedAssets.length; i++) {
            address asset = supportedAssets[i];
            if (borrowed[asset][user] > 0) {
                totalDebt += _calculateAssetValue(asset, borrowed[asset][user]);
            }
        }
        return totalDebt;
    }

    function _calculateAssetValue(
        address asset,
        uint256 amount
    ) internal view returns (uint256) {
        (bool success, bytes memory data) = priceOracle.staticcall(
            abi.encodeWithSignature("getAssetPrice(address)", asset)
        );
        require(success, "Price oracle call failed");
        uint256 price = abi.decode(data, (uint256));

        (success, data) = priceOracle.staticcall(
            abi.encodeWithSignature("getAssetDecimal(address)", asset)
        );
        require(success, "Decimal oracle call failed");
        uint8 assetDecimals = abi.decode(data, (uint8));

        // Convert to USD value (8 decimals)
        return (amount * price) / (10 ** assetDecimals);
    }

    function _valueToAssetAmount(
        address asset,
        uint256 value
    ) internal view returns (uint256) {
        (bool success, bytes memory data) = priceOracle.staticcall(
            abi.encodeWithSignature("getAssetPrice(address)", asset)
        );
        require(success, "Price oracle call failed");
        uint256 price = abi.decode(data, (uint256));

        (success, data) = priceOracle.staticcall(
            abi.encodeWithSignature("getAssetDecimal(address)", asset)
        );
        require(success, "Decimal oracle call failed");
        uint8 assetDecimals = abi.decode(data, (uint8));

        // Convert USD value to asset amount
        return (value * (10 ** assetDecimals)) / price;
    }

    function _checkHealthFactorAfterWithdrawal(
        address user,
        address asset,
        uint256 amount
    ) internal view returns (bool) {
        uint256 collateralValue = _calculateTotalCollateralValue(user);
        uint256 debtValue = _calculateTotalDebtValue(user);

        if (debtValue == 0) return true; // No debt, always safe

        // Remove withdrawn collateral value
        uint256 withdrawnValue = _calculateAssetValue(asset, amount);
        collateralValue -= withdrawnValue;

        // Calculate weighted collateral for health factor (using liquidation threshold)
        uint256 weightedCollateral = 0;

        for (uint i = 0; i < supportedAssets.length; i++) {
            address supportedAsset = supportedAssets[i];
            uint256 assetSupply = supplied[supportedAsset][user];
            if (supportedAsset == asset) {
                assetSupply -= amount; // Subtract withdrawn amount
            }
            if (assetSupply > 0 && collateralConfigs[supportedAsset].enabled) {
                uint256 assetValue = _calculateAssetValue(
                    supportedAsset,
                    assetSupply
                );
                weightedCollateral +=
                    (assetValue *
                        collateralConfigs[supportedAsset]
                            .liquidationThreshold) /
                    10000;
            }
        }

        // Health factor = (weighted collateral) / debt
        return ((weightedCollateral * 10 ** 18) / debtValue) > 1.1 * 10 ** 18; // HF > 1.1
    }

    function _isSupportedAsset(address asset) internal view returns (bool) {
        for (uint i = 0; i < supportedAssets.length; i++) {
            if (supportedAssets[i] == asset) {
                return collateralConfigs[asset].enabled;
            }
        }
        return false;
    }

    function _getSupportedAssets() internal view returns (address[] memory) {
        return supportedAssets;
    }

    function getUserAccountData(
        address user
    )
        external
        view
        override
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        )
    {
        totalCollateralBase = _calculateTotalCollateralValue(user);
        totalDebtBase = _calculateTotalDebtValue(user);

        // Available borrows = weighted collateral - existing debt
        uint256 weightedCollateral = _calculateWeightedCollateralValue(user);
        availableBorrowsBase = weightedCollateral > totalDebtBase
            ? weightedCollateral - totalDebtBase
            : 0;

        // Average LTV and liquidation threshold
        (ltv, currentLiquidationThreshold) = _calculateAverageFactors(user);

        // Health factor = (total collateral * avg liquidation threshold) / total debt
        if (totalDebtBase > 0) {
            uint256 healthFactorValue = (((totalCollateralBase *
                currentLiquidationThreshold) / 10000) * 10 ** 18) /
                totalDebtBase;
            healthFactor = healthFactorValue;
        } else {
            healthFactor = type(uint256).max;
        }
    }

    function fundPool(address asset, uint256 amount) external {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
    }

    function getSupportedAssets() external view returns (address[] memory) {
        return supportedAssets;
    }

    function _calculateAverageFactors(
        address user
    ) internal view returns (uint256 avgLTV, uint256 avgLiquidationThreshold) {
        uint256 totalCollateral = _calculateTotalCollateralValue(user);
        if (totalCollateral == 0) return (0, 0);

        uint256 weightedLTV = 0;
        uint256 weightedLiquidationThreshold = 0;

        for (uint i = 0; i < supportedAssets.length; i++) {
            address asset = supportedAssets[i];
            if (supplied[asset][user] > 0 && collateralConfigs[asset].enabled) {
                uint256 assetValue = _calculateAssetValue(
                    asset,
                    supplied[asset][user]
                );
                uint256 weight = (assetValue * 10000) / totalCollateral;

                weightedLTV += (collateralConfigs[asset].ltv * weight) / 10000;
                weightedLiquidationThreshold +=
                    (collateralConfigs[asset].liquidationThreshold * weight) /
                    10000;
            }
        }

        return (weightedLTV, weightedLiquidationThreshold);
    }

    // Helper functions for testing
    function getUserSupply(
        address asset,
        address user
    ) external view returns (uint256) {
        return supplied[asset][user];
    }

    function getUserBorrow(
        address asset,
        address user
    ) external view returns (uint256) {
        return borrowed[asset][user];
    }

    // Add this function to simulate aToken transfer
    function simulateATokenTransfer(
        address asset,
        address from,
        address to,
        uint256 amount
    ) external {
        require(supplied[asset][from] >= amount, "Insufficient balance");
        supplied[asset][from] -= amount;
        supplied[asset][to] += amount;
    }

    

    function ADDRESSES_PROVIDER()
        external
        view
        override
        returns (IPoolAddressesProvider)
    {
        return MOCK_ADDRESSES_PROVIDER;
    }

    function BRIDGE_PROTOCOL_FEE() external pure override returns (uint256) {
        return 0;
    }

    function FLASHLOAN_PREMIUM_TOTAL()
        external
        pure
        override
        returns (uint128)
    {
        return 9; // 0.09%
    }

    function FLASHLOAN_PREMIUM_TO_PROTOCOL()
        external
        pure
        override
        returns (uint128)
    {
        return 0;
    }

    function MAX_NUMBER_RESERVES() external pure override returns (uint16) {
        return 128;
    }

    function MAX_STABLE_RATE_BORROW_SIZE_PERCENT()
        external
        pure
        override
        returns (uint256)
    {
        return 2500; // 25%
    }

    function backUnbacked(
        address asset,
        uint256 amount,
        uint256 fee
    ) external override returns (uint256) {
        return amount;
    }

    function configureEModeCategory(
        uint8 id,
        DataTypes.EModeCategory memory config
    ) external override {}

    function deposit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {
        supplyFunds(asset, amount, onBehalfOf, referralCode);
    }

    function supplyFunds(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) public {}

    function dropReserve(address asset) external override {}

    function finalizeTransfer(
        address asset,
        address from,
        address to,
        uint256 amount,
        uint256 balanceFromBefore,
        uint256 balanceToBefore
    ) external override {}

    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external override {}

    function getConfiguration(
        address asset
    )
        external
        pure
        override
        returns (DataTypes.ReserveConfigurationMap memory)
    {
        return DataTypes.ReserveConfigurationMap(0);
    }

    //  uint16 ltv;
    //     uint16 liquidationThreshold;
    //     uint16 liquidationBonus;
    //     // each eMode category may or may not have a custom oracle to override the individual assets price oracles
    //     address priceSource;
    //     string label;
    function getEModeCategoryData(
        uint8 id
    ) external pure override returns (DataTypes.EModeCategory memory) {
        return DataTypes.EModeCategory(0, 0, 0, address(0), "");
    }

    function getReserveAddressById(
        uint16 id
    ) external pure override returns (address) {
        return address(0);
    }

    function getReserveData(
        address asset
    ) external view override returns (DataTypes.ReserveData memory) {
        // Return minimal ReserveData structure
        return
            DataTypes.ReserveData(
                DataTypes.ReserveConfigurationMap(0),
                uint128(0),
                uint128(0),
                uint128(0),
                uint128(0),
                uint128(0),
                uint40(0),
                uint16(0),
                address(0),
                address(0),
                address(0),
                address(0),
                uint128(0),
                uint128(0),
                uint128(0)
            );
    }

    function getReserveNormalizedIncome(
        address asset
    ) external pure override returns (uint256) {
        return 1e27; // Ray with 27 decimals
    }

    function getReserveNormalizedVariableDebt(
        address asset
    ) external pure override returns (uint256) {
        return 1e27; // Ray with 27 decimals
    }

    function getReservesList()
        external
        pure
        override
        returns (address[] memory)
    {
        return new address[](0);
    }

    function getUserConfiguration(
        address user
    ) external pure override returns (DataTypes.UserConfigurationMap memory) {
        return DataTypes.UserConfigurationMap(0);
    }

    function getUserEMode(
        address user
    ) external pure override returns (uint256) {
        return 0;
    }

    function initReserve(
        address asset,
        address aTokenAddress,
        address stableDebtAddress,
        address variableDebtAddress,
        address interestRateStrategyAddress
    ) external override {}

    function mintToTreasury(address[] calldata assets) external override {}

    function mintUnbacked(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external override {}

    function rebalanceStableBorrowRate(
        address asset,
        address user
    ) external override {}

    function repayWithATokens(
        address asset,
        uint256 amount,
        uint256 interestRateMode
    ) external override returns (uint256) {
        return amount;
    }

    function repayWithPermit(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external override returns (uint256) {
        return amount;
    }

    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external override {}

    function resetIsolationModeTotalDebt(address asset) external override {}

    function setConfiguration(
        address asset,
        DataTypes.ReserveConfigurationMap calldata configuration
    ) external override {}

    function setReserveInterestRateStrategyAddress(
        address asset,
        address rateStrategyAddress
    ) external override {}

    function setUserEMode(uint8 categoryId) external override {}

    function supplyWithPermit(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode,
        uint256 deadline,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external override {}

    function updateBridgeProtocolFee(
        uint256 bridgeProtocolFee
    ) external override {}

    function updateFlashloanPremiums(
        uint128 flashLoanPremiumTotal,
        uint128 flashLoanPremiumToProtocol
    ) external override {}

    // Your existing functions that were already implemented...
    function setUserUseReserveAsCollateral(
        address asset,
        bool useAsCollateral
    ) external override {}

    function swapBorrowRateMode(
        address asset,
        uint256 interestRateMode
    ) external override {}

    function flashLoan(
        address receiverAddress,
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata interestRateModes,
        address onBehalfOf,
        bytes calldata params,
        uint16 referralCode
    ) external override {}

    function liquidationCall(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        bool receiveAToken
    ) external override {}
}
