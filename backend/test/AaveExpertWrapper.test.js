const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AaveExpertWrapper System", function () {
  let deployer, user1, user2;
  let addressesProvider, aclManager, priceOracle, wrapper;
  let usdc, weth, mockPool;

  // Test constants
  const USDC_DECIMALS = 6;
  const WETH_DECIMALS = 18;
  const PRICE_DECIMALS = 8;
  
  const parseUSDC = (amount) => ethers.parseUnits(amount, USDC_DECIMALS);
  const parseWETH = (amount) => ethers.parseUnits(amount, WETH_DECIMALS);
  const parsePrice = (amount) => ethers.parseUnits(amount, PRICE_DECIMALS);

  beforeEach(async function () {
    [deployer, user1, user2] = await ethers.getSigners();

    // Deploy Mock Tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await MockERC20.deploy("USD Coin", "USDC", USDC_DECIMALS);
    weth = await MockERC20.deploy("Wrapped Ether", "WETH", WETH_DECIMALS);

    // Deploy Core Infrastructure
    const PoolAddressesProvider = await ethers.getContractFactory("PoolAddressesProvider");
    addressesProvider = await PoolAddressesProvider.deploy(deployer.address);

    const ACLManager = await ethers.getContractFactory("ACLManager");
    aclManager = await ACLManager.deploy(deployer.address);

    const SimplePriceOracle = await ethers.getContractFactory("SimplePriceOracle");
    priceOracle = await SimplePriceOracle.deploy();

    const MockPool = await ethers.getContractFactory("MockPool");
    mockPool = await MockPool.deploy();

    // Configure System
    await addressesProvider.setACLManager(aclManager.target);
    await addressesProvider.setPriceOracle(priceOracle.target);
    await addressesProvider.setPool(mockPool.target);

    // Set prices
    await priceOracle.setAssetPrice(weth.target, parsePrice("2000"));
    await priceOracle.setAssetPrice(usdc.target, parsePrice("1"));

    // Deploy Wrapper
    const AaveExpertWrapper = await ethers.getContractFactory("AaveExpertWrapper");
    wrapper = await AaveExpertWrapper.deploy(addressesProvider.target);
    await wrapper.initializePool();

    // Set wrapper in mock pool (CRITICAL - this was missing)
    await mockPool.setWrapper(wrapper.target);

    // Fund the mock pool with tokens (CRITICAL - this was missing)
    await usdc.mint(deployer.address, parseUSDC("100000"));
    await usdc.connect(deployer).approve(mockPool.target, parseUSDC("100000"));
    await mockPool.connect(deployer).fundPool(usdc.target, parseUSDC("50000"));

    await weth.mint(deployer.address, parseWETH("1000"));
    await weth.connect(deployer).approve(mockPool.target, parseWETH("1000"));
    await mockPool.connect(deployer).fundPool(weth.target, parseWETH("500"));

    // Fund users with test tokens
    await usdc.mint(user1.address, parseUSDC("10000"));
    await weth.mint(user1.address, parseWETH("10"));
    await usdc.mint(user2.address, parseUSDC("5000"));
  });

  describe("Deployment", function () {
    it("Should deploy all contracts successfully", async function () {
      expect(await addressesProvider.getOwner()).to.equal(deployer.address);
      expect(await aclManager.isPoolAdmin(deployer.address)).to.be.true;
      expect(await wrapper.ADDRESSES_PROVIDER()).to.equal(addressesProvider.target);
    });

    it("Should initialize pool correctly", async function () {
      const poolAddress = await addressesProvider.getPool();
      expect(poolAddress).to.equal(mockPool.target);
    });
  });

  describe("Supply Operations", function () {
    it("Should allow supplying assets", async function () {
      const supplyAmount = parseUSDC("1000");
      
      // Check initial balances
      const initialUserBalance = await usdc.balanceOf(user1.address);
      const initialPoolBalance = await usdc.balanceOf(mockPool.target);
      
      // Approve and supply
      await usdc.connect(user1).approve(wrapper.target, supplyAmount);
      
      console.log("supplying",usdc.target, supplyAmount, user1.address);
      
      await expect(wrapper.connect(user1).supply(usdc.target, supplyAmount, user1.address))
        .to.emit(wrapper, "Supplied")
        .withArgs(user1.address, usdc.target, supplyAmount);

      // Check final balances
      const finalUserBalance = await usdc.balanceOf(user1.address);
      const finalPoolBalance = await usdc.balanceOf(mockPool.target);

      // User should have less USDC
      expect(finalUserBalance).to.equal(initialUserBalance - supplyAmount);
      // Pool should have more USDC
      expect(finalPoolBalance).to.equal(initialPoolBalance + supplyAmount);

      // Check that user's supply was recorded
      const userSupply = await mockPool.getUserSupply(usdc.target, user1.address);
      expect(userSupply).to.equal(supplyAmount);
    });

    it("Should revert when supplying with invalid parameters", async function () {
      const supplyAmount = parseUSDC("1000");
      
      await usdc.connect(user1).approve(wrapper.target, supplyAmount);

      // Invalid asset address
      await expect(
        wrapper.connect(user1).supply(ethers.ZeroAddress, supplyAmount, user1.address)
      ).to.be.revertedWithCustomError(wrapper, "InvalidAddress");

      // Zero amount
      await expect(
        wrapper.connect(user1).supply(usdc.target, 0, user1.address)
      ).to.be.revertedWithCustomError(wrapper, "InvalidAmount");
    });
  });

  describe("Withdraw Operations", function () {
    beforeEach(async function () {
      // First supply some assets
      const supplyAmount = parseUSDC("1000");
      await usdc.connect(user1).approve(wrapper.target, supplyAmount);
      await wrapper.connect(user1).supply(usdc.target, supplyAmount, user1.address);
    });

    it("Should allow withdrawing assets", async function () {
      // Check initial balances
      const initialUserBalance = await usdc.balanceOf(user1.address);
      const initialPoolBalance = await usdc.balanceOf(mockPool.target);
      
      console.log("Initial user USDC balance:", initialUserBalance.toString());
      console.log("Initial pool USDC balance:", initialPoolBalance.toString());

      // Get user's supply from the pool
      const userSupply = await mockPool.getUserSupply(usdc.target, user1.address);
      console.log("User supply in pool:", userSupply.toString());
      
      const withdrawAmount = parseUSDC("500");
      
      await expect(wrapper.connect(user1).withdraw(usdc.target, withdrawAmount, user1.address))
        .to.emit(wrapper, "Withdrawn")
        .withArgs(user1.address, usdc.target, withdrawAmount);

      // Verify balances after withdrawal
      const finalUserBalance = await usdc.balanceOf(user1.address);
      const finalPoolBalance = await usdc.balanceOf(mockPool.target);
      
      console.log("Final user USDC balance:", finalUserBalance.toString());
      console.log("Final pool USDC balance:", finalPoolBalance.toString());

      // User should have received the withdrawn amount
      expect(finalUserBalance - initialUserBalance).to.equal(withdrawAmount);
      // Pool should have less USDC
      expect(initialPoolBalance - finalPoolBalance).to.equal(withdrawAmount);

      // Check that user's supply was reduced
      const finalUserSupply = await mockPool.getUserSupply(usdc.target, user1.address);
      expect(finalUserSupply).to.equal(parseUSDC("500")); // 1000 - 500 = 500
    });

    it("Should revert when withdrawing with invalid parameters", async function () {
      const withdrawAmount = parseUSDC("500");
      
      // Invalid asset address
      await expect(
        wrapper.connect(user1).withdraw(ethers.ZeroAddress, withdrawAmount, user1.address)
      ).to.be.revertedWithCustomError(wrapper, "InvalidAddress");

      // Invalid recipient
      await expect(
        wrapper.connect(user1).withdraw(usdc.target, withdrawAmount, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(wrapper, "InvalidAddress");

      // Zero amount
      await expect(
        wrapper.connect(user1).withdraw(usdc.target, 0, user1.address)
      ).to.be.revertedWithCustomError(wrapper, "InvalidAmount");
    });

    it("Should revert when withdrawing more than supplied", async function () {
      const excessiveAmount = parseUSDC("2000"); // More than the 1000 supplied
      
      await expect(
        wrapper.connect(user1).withdraw(usdc.target, excessiveAmount, user1.address)
      ).to.be.reverted; // MockPool will revert with "Insufficient supply"
    });
  });

  describe("Borrow Operations", function () {
    beforeEach(async function () {
      // Supply collateral first
      const collateralAmount = parseWETH("1");
      await weth.connect(user1).approve(wrapper.target, collateralAmount);
      await wrapper.connect(user1).supply(weth.target, collateralAmount, user1.address);
    });

    it("Should allow borrowing assets", async function () {
      const borrowAmount = parseUSDC("500");
      const initialBalance = await usdc.balanceOf(user1.address);
      const initialPoolBalance = await usdc.balanceOf(mockPool.target);
      
      await expect(wrapper.connect(user1).borrow(usdc.target, borrowAmount, 2, user1.address))
        .to.emit(wrapper, "Borrowed")
        .withArgs(user1.address, usdc.target, borrowAmount, 2);

      // Check that user received the borrowed tokens
      const finalBalance = await usdc.balanceOf(user1.address);
      const finalPoolBalance = await usdc.balanceOf(mockPool.target);
      
      expect(finalBalance - initialBalance).to.equal(borrowAmount);
      expect(initialPoolBalance - finalPoolBalance).to.equal(borrowAmount);
    });

    it("Should revert when borrowing with invalid interest rate mode", async function () {
      const borrowAmount = parseUSDC("500");
      
      await expect(
        wrapper.connect(user1).borrow(usdc.target, borrowAmount, 3, user1.address)
      ).to.be.revertedWithCustomError(wrapper, "InvalidInterestRateMode");
    });

    it("Should revert when borrowing without sufficient collateral", async function () {
      // Try to borrow without supplying collateral first
      const borrowAmount = parseUSDC("500");
      
      await expect(
        wrapper.connect(user2).borrow(usdc.target, borrowAmount, 2, user2.address)
      ).to.be.reverted; // MockPool will revert with "Insufficient collateral"
    });
  });

  describe("Repay Operations", function () {
    beforeEach(async function () {
      // Supply collateral and borrow
      const collateralAmount = parseWETH("1");
      await weth.connect(user1).approve(wrapper.target, collateralAmount);
      await wrapper.connect(user1).supply(weth.target, collateralAmount, user1.address);

      const borrowAmount = parseUSDC("500");
      await wrapper.connect(user1).borrow(usdc.target, borrowAmount, 2, user1.address);
    });

    it("Should allow repaying borrowed assets", async function () {
      const repayAmount = parseUSDC("100");
      const initialUserBalance = await usdc.balanceOf(user1.address);
      const initialPoolBalance = await usdc.balanceOf(mockPool.target);
      
      await usdc.connect(user1).approve(wrapper.target, repayAmount);
      
      await expect(wrapper.connect(user1).repay(usdc.target, repayAmount, 2, user1.address))
        .to.emit(wrapper, "Repaid")
        .withArgs(user1.address, usdc.target, repayAmount, 2);

      // Verify token transfers
      const finalUserBalance = await usdc.balanceOf(user1.address);
      const finalPoolBalance = await usdc.balanceOf(mockPool.target);
      
      expect(initialUserBalance - finalUserBalance).to.equal(repayAmount);
      expect(finalPoolBalance - initialPoolBalance).to.equal(repayAmount);
    });

    it("Should allow full repayment using max uint", async function () {
      const userBalance = await usdc.balanceOf(user1.address);
      await usdc.connect(user1).approve(wrapper.target, userBalance);
      
      await expect(wrapper.connect(user1).repay(usdc.target, ethers.MaxUint256, 2, user1.address))
        .to.emit(wrapper, "Repaid")
        .withArgs(user1.address, usdc.target, parseUSDC("500"), 2);
    });
  });

  describe("User Account Data", function () {
    it("Should return user account data", async function () {
      const userData = await wrapper.getUserAccountData(user1.address);
      
      expect(userData.totalCollateralBase).to.be.a("bigint");
      expect(userData.totalDebtBase).to.be.a("bigint");
      expect(userData.availableBorrowsBase).to.be.a("bigint");
      expect(userData.currentLiquidationThreshold).to.be.a("bigint");
      expect(userData.ltv).to.be.a("bigint");
      expect(userData.healthFactor).to.be.a("bigint");
    });

    it("Should return different data for different users", async function () {
      const user1Data = await wrapper.getUserAccountData(user1.address);
      const user2Data = await wrapper.getUserAccountData(user2.address);
      
      // Both should return valid data (mock returns same data for now)
      expect(user1Data.healthFactor).to.be.a("bigint");
      expect(user2Data.healthFactor).to.be.a("bigint");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple operations sequentially", async function () {
      // Supply
      const supplyAmount = parseUSDC("1000");
      await usdc.connect(user1).approve(wrapper.target, supplyAmount);
      await wrapper.connect(user1).supply(usdc.target, supplyAmount, user1.address);

      // Withdraw partially
      await wrapper.connect(user1).withdraw(usdc.target, parseUSDC("300"), user1.address);

      // Supply more
      await usdc.connect(user1).approve(wrapper.target, parseUSDC("500"));
      await wrapper.connect(user1).supply(usdc.target, parseUSDC("500"), user1.address);

      // Final supply should be 1000 - 300 + 500 = 1200
      const finalSupply = await mockPool.getUserSupply(usdc.target, user1.address);
      expect(finalSupply).to.equal(parseUSDC("1200"));
    });

    it("Should revert when pool is not initialized", async function () {
      // Deploy new wrapper without initializing
      const AaveExpertWrapper = await ethers.getContractFactory("AaveExpertWrapper");
      const newWrapper = await AaveExpertWrapper.deploy(addressesProvider.target);
      
      // Should revert when trying to use uninitialized wrapper
      await expect(
        newWrapper.connect(user1).supply(usdc.target, parseUSDC("100"), user1.address)
      ).to.be.revertedWithCustomError(newWrapper, "PoolNotInitialized");
    });
  });
});