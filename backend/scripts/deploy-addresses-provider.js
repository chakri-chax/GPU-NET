const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy PoolAddressesProvider
  const PoolAddressesProvider = await ethers.getContractFactory("PoolAddressesProvider");
  const addressesProvider = await PoolAddressesProvider.deploy(deployer.address);
  await addressesProvider.deployed();
  
  console.log("PoolAddressesProvider deployed to:", addressesProvider.address);

  // Deploy ACLManager
  const ACLManager = await ethers.getContractFactory("ACLManager");
  const aclManager = await ACLManager.deploy(deployer.address);
  await aclManager.deployed();
  
  console.log("ACLManager deployed to:", aclManager.address);

  // Deploy SimplePriceOracle
  const SimplePriceOracle = await ethers.getContractFactory("SimplePriceOracle");
  const priceOracle = await SimplePriceOracle.deploy();
  await priceOracle.deployed();
  
  console.log("SimplePriceOracle deployed to:", priceOracle.address);

  // Configure AddressesProvider
  console.log("Configuring AddressesProvider...");
  
  await addressesProvider.setACLManager(aclManager.address);
  console.log("ACLManager set in AddressesProvider");
  
  await addressesProvider.setPriceOracle(priceOracle.address);
  console.log("PriceOracle set in AddressesProvider");

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    deployer: deployer.address,
    contracts: {
      PoolAddressesProvider: addressesProvider.address,
      ACLManager: aclManager.address,
      SimplePriceOracle: priceOracle.address,
    },
    timestamp: new Date().toISOString()
  };

  console.log("Deployment completed:", JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });