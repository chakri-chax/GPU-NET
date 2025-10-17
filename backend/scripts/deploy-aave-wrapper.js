const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying AaveExpertWrapper with account:", deployer.address);

  // Load previously deployed addresses
  let addressesProviderAddress;
  
  try {
    const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf8'));
    addressesProviderAddress = deployment.contracts.PoolAddressesProvider;
  } catch (error) {
    console.log("No previous deployment found. Please deploy AddressesProvider first.");
    console.log("Run: npx hardhat run scripts/deploy-addresses-provider.js --network <network>");
    process.exit(1);
  }

  // Deploy AaveExpertWrapper
  const AaveExpertWrapper = await ethers.getContractFactory("AaveExpertWrapper");
  const wrapper = await AaveExpertWrapper.deploy(addressesProviderAddress);
  await wrapper.deployed();
  
  console.log("AaveExpertWrapper deployed to:", wrapper.address);

  // Update deployment info
  const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf8'));
  deployment.contracts.AaveExpertWrapper = wrapper.address;
  deployment.wrapperDeployedAt = new Date().toISOString();
  
  fs.writeFileSync('deployment.json', JSON.stringify(deployment, null, 2));

  console.log("Deployment info updated in deployment.json");

  return wrapper.address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });