const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Initializing pool with account:", deployer.address);

  // Load deployment info
  const deployment = JSON.parse(fs.readFileSync('deployment.json', 'utf8'));
  const wrapperAddress = deployment.contracts.AaveExpertWrapper;
  
  if (!wrapperAddress) {
    console.log("AaveExpertWrapper not deployed. Please deploy it first.");
    process.exit(1);
  }

  const AaveExpertWrapper = await ethers.getContractFactory("AaveExpertWrapper");
  const wrapper = await AaveExpertWrapper.attach(wrapperAddress);

  // Initialize pool (this would normally be the actual Aave Pool address)
  // For testing, we'll use a mock or set a placeholder
  const poolAddress = deployment.contracts.MockPool || "0x0000000000000000000000000000000000000001";
  
  console.log("Setting pool address:", poolAddress);
  
  // If we have a mock pool, initialize it
  if (deployment.contracts.MockPool) {
    await wrapper.initializePool();
    console.log("Pool initialized in wrapper");
  } else {
    console.log("No MockPool found. Please deploy mock contracts first.");
  }

  return true;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });