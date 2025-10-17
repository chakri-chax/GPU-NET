const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("=== Starting Full Suite Deployment on Sepolia ===");

  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("ETH Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // ---------- Constants ----------
  const USDC_DECIMALS = 6;
  const WETH_DECIMALS = 18;
  const USDT_DECIMALS = 6;
  const DAI_DECIMALS = 18;
  const WBTC_DECIMALS = 8;
  const PRICE_DECIMALS = 8;

  const parseUSDC = (a) => ethers.parseUnits(a, USDC_DECIMALS);
  const parseWETH = (a) => ethers.parseUnits(a, WETH_DECIMALS);
  const parseUSDT = (a) => ethers.parseUnits(a, USDT_DECIMALS);
  const parseDAI = (a) => ethers.parseUnits(a, DAI_DECIMALS);
  const parseWBTC = (a) => ethers.parseUnits(a, WBTC_DECIMALS);
  const parsePrice = (a) => ethers.parseUnits(a, PRICE_DECIMALS);

  // ---------- Deploy Mock Tokens ----------
  console.log("\nDeploying Mock Tokens...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  
  // Deploy tokens sequentially
  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", WETH_DECIMALS);
  await weth.waitForDeployment();
  console.log("WETH deployed:", weth.target);

  const usdc = await MockERC20.deploy("USD Coin", "USDC", USDC_DECIMALS);
  await usdc.waitForDeployment();
  console.log("USDC deployed:", usdc.target);

  const usdt = await MockERC20.deploy("Tether USD", "USDT", USDT_DECIMALS);
  await usdt.waitForDeployment();
  console.log("USDT deployed:", usdt.target);

  const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", DAI_DECIMALS);
  await dai.waitForDeployment();
  console.log("DAI deployed:", dai.target);

  const wbtc = await MockERC20.deploy("Wrapped BTC", "WBTC", WBTC_DECIMALS);
  await wbtc.waitForDeployment();
  console.log("WBTC deployed:", wbtc.target);

  console.log("✅ All Tokens Deployed");

  // ---------- Mint Tokens to Deployer Immediately ----------
  console.log("\nMinting tokens to deployer...");
  
  let tx = await weth.mint(deployer.address, parseWETH("1000"));
  await tx.wait();
  
  tx = await usdc.mint(deployer.address, parseUSDC("1000000"));
  await tx.wait();
  
  tx = await usdt.mint(deployer.address, parseUSDT("1000000"));
  await tx.wait();
  
  tx = await dai.mint(deployer.address, parseDAI("1000000"));
  await tx.wait();
  
  tx = await wbtc.mint(deployer.address, parseWBTC("100"));
  await tx.wait();
  
  console.log("✅ Tokens Minted to Deployer");

  // ---------- Deploy Price Oracle ----------
  console.log("\nDeploying SimplePriceOracle...");
  const SimplePriceOracle = await ethers.getContractFactory("SimplePriceOracle");
  const priceOracle = await SimplePriceOracle.deploy();
  await priceOracle.waitForDeployment();
  console.log("Price Oracle deployed:", priceOracle.target);

  // Add assets to oracle sequentially
  console.log("Adding assets to oracle...");
  await priceOracle.addAsset(weth.target, parsePrice("2000"), WETH_DECIMALS);
  await priceOracle.addAsset(usdc.target, parsePrice("1"), USDC_DECIMALS);
  await priceOracle.addAsset(usdt.target, parsePrice("1"), USDT_DECIMALS);
  await priceOracle.addAsset(dai.target, parsePrice("1"), DAI_DECIMALS);
  await priceOracle.addAsset(wbtc.target, parsePrice("30000"), WBTC_DECIMALS);
  console.log("✅ Oracle Initialized");

  // ---------- Deploy Core Contracts ----------
  console.log("\nDeploying Core Infrastructure...");
  
  const PoolAddressesProvider = await ethers.getContractFactory("PoolAddressesProvider");
  const addressesProvider = await PoolAddressesProvider.deploy(deployer.address);
  await addressesProvider.waitForDeployment();
  console.log("AddressesProvider deployed:", addressesProvider.target);

  const ACLManager = await ethers.getContractFactory("ACLManager");
  const aclManager = await ACLManager.deploy(deployer.address);
  await aclManager.waitForDeployment();
  console.log("ACLManager deployed:", aclManager.target);

  const MockPool = await ethers.getContractFactory("MockPool");
  const mockPool = await MockPool.deploy(priceOracle.target);
  await mockPool.waitForDeployment();
  console.log("MockPool deployed:", mockPool.target);

  // ---------- Pool Configuration ----------
  console.log("\nConfiguring Pool...");
  await mockPool.addAsset(weth.target, 7500, 8000);
  await mockPool.addAsset(usdc.target, 8000, 8500);
  await mockPool.addAsset(usdt.target, 7500, 8000);
  await mockPool.addAsset(dai.target, 7500, 8000);
  await mockPool.addAsset(wbtc.target, 7000, 7500);

  await addressesProvider.setACLManager(aclManager.target);
  await addressesProvider.setPriceOracle(priceOracle.target);
  await addressesProvider.setPool(mockPool.target);
  console.log("✅ Pool Configured");

  // ---------- Deploy Wrapper ----------
  console.log("\nDeploying Wrapper...");
  const AaveExpertWrapper = await ethers.getContractFactory("AaveExpertWrapper");
  const wrapper = await AaveExpertWrapper.deploy(addressesProvider.target);
  await wrapper.waitForDeployment();
  console.log("Wrapper deployed:", wrapper.target);
  
  await wrapper.initializePool();
  console.log("✅ Wrapper Initialized");

  // ---------- Approve Tokens for Pool ----------
  console.log("\nApproving tokens for pool...");
  
  tx = await weth.approve(mockPool.target, parseWETH("1000"));
  await tx.wait();
  
  tx = await usdc.approve(mockPool.target, parseUSDC("1000000"));
  await tx.wait();
  
  tx = await usdt.approve(mockPool.target, parseUSDT("1000000"));
  await tx.wait();
  
  tx = await dai.approve(mockPool.target, parseDAI("1000000"));
  await tx.wait();
  
  tx = await wbtc.approve(mockPool.target, parseWBTC("100"));
  await tx.wait();
  
  console.log("✅ Tokens Approved");

  // ---------- Fund Pool ----------
  console.log("\nFunding pool...");
  
  tx = await mockPool.fundPool(weth.target, parseWETH("500"));
  await tx.wait();
  
  tx = await mockPool.fundPool(usdc.target, parseUSDC("500000"));
  await tx.wait();
  
  tx = await mockPool.fundPool(usdt.target, parseUSDT("500000"));
  await tx.wait();
  
  tx = await mockPool.fundPool(dai.target, parseDAI("500000"));
  await tx.wait();
  
  tx = await mockPool.fundPool(wbtc.target, parseWBTC("50"));
  await tx.wait();
  
  console.log("✅ Pool Funded");

  // ---------- Fund Test Users ----------
  console.log("\nFunding test users...");
  
  console.log("Funding user1...");
  await weth.mint(user1.address, parseWETH("10"));
  await usdc.mint(user1.address, parseUSDC("10000"));
  await usdt.mint(user1.address, parseUSDT("10000"));
  await dai.mint(user1.address, parseDAI("10000"));
  await wbtc.mint(user1.address, parseWBTC("1"));
  
  
  
  console.log("✅ Users Funded");

  // ---------- Save Deployment Info ----------
  const deploymentInfo = {
    network: "sepolia",
    deployer: deployer.address,
    addressesProvider: addressesProvider.target,
    aclManager: aclManager.target,
    priceOracle: priceOracle.target,
    wrapper: wrapper.target,
    mockPool: mockPool.target,
    weth: weth.target,
    usdc: usdc.target,
    usdt: usdt.target,
    dai: dai.target,
    wbtc: wbtc.target,
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n=== Deployment Complete ===");
  console.log("Deployment info saved to deployment.json");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});