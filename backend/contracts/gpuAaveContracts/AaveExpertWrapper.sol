// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/IERC20.sol";
import {SafeERC20} from "@aave/core-v3/contracts/dependencies/openzeppelin/contracts/SafeERC20.sol";

contract AaveExpertWrapper {
    using SafeERC20 for IERC20;
    
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public pool;
    
    uint16 public constant REFERRAL_CODE = 0;
    
    event PoolInitialized(address pool);
    event Supplied(address indexed user, address indexed asset, uint256 amount);
    event Withdrawn(address indexed user, address indexed asset, uint256 amount);
    event Borrowed(address indexed user, address indexed asset, uint256 amount, uint256 interestRateMode);
    event Repaid(address indexed user, address indexed asset, uint256 amount, uint256 interestRateMode);

    error InvalidAddress();
    error InvalidAmount();
    error PoolNotInitialized();
    error AaveOperationFailed();
    
    modifier poolInitialized() {
        if (address(pool) == address(0)) revert PoolNotInitialized();
        _;
    }
    
    constructor(address addressesProvider) {
        if (addressesProvider == address(0)) revert InvalidAddress();
        ADDRESSES_PROVIDER = IPoolAddressesProvider(addressesProvider);
    }
    
    /**
     * @dev Initialize the pool after deployment
     */
    function initializePool() external {
        address poolAddress = ADDRESSES_PROVIDER.getPool();
        if (poolAddress == address(0)) revert InvalidAddress();
        
        pool = IPool(poolAddress);
        emit PoolInitialized(poolAddress);
    }
    
    /**
     * @dev Supply assets to the custom Aave pool
     */
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external poolInitialized {
        _validateInputs(asset, amount);
        
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).safeApprove(address(pool), amount);
        
        try pool.supply(asset, amount, onBehalfOf, REFERRAL_CODE) {
            IERC20(asset).safeApprove(address(pool), 0);
            emit Supplied(msg.sender, asset, amount);
        } catch {
            IERC20(asset).safeTransfer(msg.sender, amount);
            IERC20(asset).safeApprove(address(pool), 0);
            revert AaveOperationFailed();
        }
    }
    
    /**
     * @dev Withdraw assets from the custom Aave pool
     */
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external poolInitialized {
        _validateInputs(asset, amount);
        if (to == address(0)) revert InvalidAddress();
        
        uint256 initialBalance = IERC20(asset).balanceOf(to);
        try pool.withdraw(asset, amount, to) returns (uint256 /* withdrawnAmount*/) {
            uint256 finalBalance = IERC20(asset).balanceOf(to);
            uint256 actualReceived = finalBalance - initialBalance;
            
            emit Withdrawn(msg.sender, asset, actualReceived);
        } catch {
            revert AaveOperationFailed();
        }
    }

    /**
     * @dev Borrow from the custom Aave pool
     */
    function borrow(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external poolInitialized {
        _validateInputs(asset, amount);
        
        try pool.borrow(asset, amount, interestRateMode, REFERRAL_CODE, onBehalfOf) {
            emit Borrowed(msg.sender, asset, amount, interestRateMode);
        } catch {
            revert AaveOperationFailed();
        }
    }
    
    /**
     * @dev Repay to the custom Aave pool
     */
    function repay(
        address asset,
        uint256 amount,
        uint256 interestRateMode,
        address onBehalfOf
    ) external poolInitialized {
        _validateInputs(asset, amount);
        
        if (amount != type(uint256).max) {
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
            IERC20(asset).safeApprove(address(pool), amount);
        }
        
        try pool.repay(asset, amount, interestRateMode, onBehalfOf) returns (uint256 repaidAmount) {
            if (amount != type(uint256).max) {
                IERC20(asset).safeApprove(address(pool), 0);
            }
            emit Repaid(msg.sender, asset, repaidAmount, interestRateMode);
        } catch {
            if (amount != type(uint256).max) {
                IERC20(asset).safeApprove(address(pool), 0);
            }
            revert AaveOperationFailed();
        }
    }
    
    /**
     * @dev Get user account data from custom pool
     */
    function getUserAccountData(address user) 
        external 
        view 
        poolInitialized 
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        ) 
    {
        return pool.getUserAccountData(user);
    }
    
    function _validateInputs(address asset, uint256 amount) internal pure {
        if (asset == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
    }
    
    /**
     * @dev Emergency function to rescue tokens (for testing)
     */
    function rescueToken(address token, uint256 amount) external {
        IERC20(token).safeTransfer(msg.sender, amount);
    }
    
    receive() external payable {}
}