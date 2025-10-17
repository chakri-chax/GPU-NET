// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ACLManager
 * @dev Access Control List Manager for Aave V3
 */
contract ACLManager {
    // Roles
    bytes32 public constant POOL_ADMIN_ROLE = keccak256("POOL_ADMIN");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN");
    bytes32 public constant RISK_ADMIN_ROLE = keccak256("RISK_ADMIN");

    // Mapping of roles to addresses
    mapping(bytes32 => mapping(address => bool)) private _roles;

    address private _owner;

    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);

    modifier onlyOwner() {
        require(msg.sender == _owner, "Caller is not the owner");
        _;
    }

    modifier onlyRole(bytes32 role) {
        require(_roles[role][msg.sender], "Caller does not have required role");
        _;
    }

    constructor(address owner) {
        require(owner != address(0), "Owner cannot be zero address");
        _owner = owner;
        _roles[POOL_ADMIN_ROLE][owner] = true;
    }

    function grantRole(bytes32 role, address account) external onlyOwner {
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    function revokeRole(bytes32 role, address account) external onlyOwner {
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function isPoolAdmin(address account) external view returns (bool) {
        return _roles[POOL_ADMIN_ROLE][account];
    }
}