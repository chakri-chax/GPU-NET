// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title PoolAddressesProvider
 * @dev Main registry of addresses part of or connected to the protocol
 * @author Aave
 */
contract PoolAddressesProvider {
    // Main identifiers
    bytes32 private constant POOL = "POOL";
    bytes32 private constant POOL_CONFIGURATOR = "POOL_CONFIGURATOR";
    bytes32 private constant PRICE_ORACLE = "PRICE_ORACLE";
    bytes32 private constant ACL_MANAGER = "ACL_MANAGER";
    bytes32 private constant ACL_ADMIN = "ACL_ADMIN";
    bytes32 private constant DATA_PROVIDER = "DATA_PROVIDER";

    // Events
    event AddressSet(bytes32 indexed id, address indexed oldAddress, address indexed newAddress);
    event AddressSetAsProxy(bytes32 indexed id, address indexed proxyAddress, address oldImplementationAddress, address newImplementationAddress);

    // Mapping of id to addresses
    mapping(bytes32 => address) private _addresses;
    
    // Owner address
    address private _owner;

    modifier onlyOwner() {
        require(msg.sender == _owner, "Caller is not the owner");
        _;
    }

    constructor(address owner) {
        require(owner != address(0), "Owner cannot be zero address");
        _owner = owner;
    }

    /**
     * @dev Returns the address of the owner.
     */
    function getOwner() external view returns (address) {
        return _owner;
    }

    /**
     * @dev Registers an id and its corresponding address
     */
    function setAddress(bytes32 id, address newAddress) external onlyOwner {
        address oldAddress = _addresses[id];
        _addresses[id] = newAddress;
        emit AddressSet(id, oldAddress, newAddress);
    }

    /**
     * @dev Returns the address associated with the specific id
     */
    function getAddress(bytes32 id) public view returns (address) {
        return _addresses[id];
    }

    /**
     * @dev Returns the Pool proxy address
     */
    function getPool() external view returns (address) {
        return getAddress(POOL);
    }

    /**
     * @dev Updates the implementation of the Pool proxy
     */
    function setPool(address newPool) external onlyOwner {
        address oldPool = _addresses[POOL];
        _addresses[POOL] = newPool;
        emit AddressSet(POOL, oldPool, newPool);
    }

    /**
     * @dev Returns the PoolConfigurator proxy address
     */
    function getPoolConfigurator() external view returns (address) {
        return getAddress(POOL_CONFIGURATOR);
    }

    /**
     * @dev Updates the implementation of the PoolConfigurator proxy
     */
    function setPoolConfigurator(address newPoolConfigurator) external onlyOwner {
        address oldPoolConfigurator = _addresses[POOL_CONFIGURATOR];
        _addresses[POOL_CONFIGURATOR] = newPoolConfigurator;
        emit AddressSet(POOL_CONFIGURATOR, oldPoolConfigurator, newPoolConfigurator);
    }

    /**
     * @dev Returns the PriceOracle proxy address
     */
    function getPriceOracle() external view returns (address) {
        return getAddress(PRICE_ORACLE);
    }

    /**
     * @dev Updates the implementation of the PriceOracle proxy
     */
    function setPriceOracle(address newPriceOracle) external onlyOwner {
        address oldPriceOracle = _addresses[PRICE_ORACLE];
        _addresses[PRICE_ORACLE] = newPriceOracle;
        emit AddressSet(PRICE_ORACLE, oldPriceOracle, newPriceOracle);
    }

    /**
     * @dev Returns the ACLManager proxy address
     */
    function getACLManager() external view returns (address) {
        return getAddress(ACL_MANAGER);
    }

    /**
     * @dev Updates the implementation of the ACLManager proxy
     */
    function setACLManager(address newACLManager) external onlyOwner {
        address oldACLManager = _addresses[ACL_MANAGER];
        _addresses[ACL_MANAGER] = newACLManager;
        emit AddressSet(ACL_MANAGER, oldACLManager, newACLManager);
    }

    /**
     * @dev Transfers ownership of the contract to a new account
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        _owner = newOwner;
    }
}