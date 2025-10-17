const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Enhanced Aave V3 System - Dynamic Addresses", function () {
    let deployer, user1, user2;
    let addressesProvider, aclManager, priceOracle, wrapper, mockPool;
    let weth, usdc, usdt, dai, wbtc;

    // Test constants
    const USDC_DECIMALS = 6;
    const WETH_DECIMALS = 18;
    const USDT_DECIMALS = 6;
    const DAI_DECIMALS = 18;
    const WBTC_DECIMALS = 8;
    const PRICE_DECIMALS = 8;

    const parseUSDC = (amount) => ethers.parseUnits(amount, USDC_DECIMALS);
    const parseWETH = (amount) => ethers.parseUnits(amount, WETH_DECIMALS);
    const parseUSDT = (amount) => ethers.parseUnits(amount, USDT_DECIMALS);
    const parseDAI = (amount) => ethers.parseUnits(amount, DAI_DECIMALS);
    const parseWBTC = (amount) => ethers.parseUnits(amount, WBTC_DECIMALS);
    const parsePrice = (amount) => ethers.parseUnits(amount, PRICE_DECIMALS);

    beforeEach(async function () {
        [deployer, user1, user2] = await ethers.getSigners();

        // Deploy Mock Tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        weth = await MockERC20.deploy("Wrapped Ether", "WETH", WETH_DECIMALS);
        usdc = await MockERC20.deploy("USD Coin", "USDC", USDC_DECIMALS);
        usdt = await MockERC20.deploy("Tether USD", "USDT", USDT_DECIMALS);
        dai = await MockERC20.deploy("Dai Stablecoin", "DAI", DAI_DECIMALS);
        wbtc = await MockERC20.deploy("Wrapped BTC", "WBTC", WBTC_DECIMALS);

        // Deploy Enhanced Price Oracle (Dynamic)
        const SimplePriceOracle = await ethers.getContractFactory("SimplePriceOracle");
        priceOracle = await SimplePriceOracle.deploy();

        // Add assets to oracle with prices and decimals
        await priceOracle.addAsset(weth.target, parsePrice("2000"), WETH_DECIMALS);
        await priceOracle.addAsset(usdc.target, parsePrice("1"), USDC_DECIMALS);
        await priceOracle.addAsset(usdt.target, parsePrice("1"), USDT_DECIMALS);
        await priceOracle.addAsset(dai.target, parsePrice("1"), DAI_DECIMALS);
        await priceOracle.addAsset(wbtc.target, parsePrice("30000"), WBTC_DECIMALS);

        // Deploy Core Infrastructure
        const PoolAddressesProvider = await ethers.getContractFactory("PoolAddressesProvider");
        addressesProvider = await PoolAddressesProvider.deploy(deployer.address);

        const ACLManager = await ethers.getContractFactory("ACLManager");
        aclManager = await ACLManager.deploy(deployer.address);

        // Deploy Enhanced MockPool (Dynamic)
        const MockPool = await ethers.getContractFactory("MockPool");
        mockPool = await MockPool.deploy(priceOracle.target);

        // Add assets to MockPool with collateral configurations
        await mockPool.addAsset(weth.target, 7500, 8000); // 75% LTV, 80% liquidation
        await mockPool.addAsset(usdc.target, 8000, 8500); // 80% LTV, 85% liquidation
        await mockPool.addAsset(usdt.target, 7500, 8000); // 75% LTV, 80% liquidation
        await mockPool.addAsset(dai.target, 7500, 8000);  // 75% LTV, 80% liquidation
        await mockPool.addAsset(wbtc.target, 7000, 7500); // 70% LTV, 75% liquidation

        // Configure System
        await addressesProvider.setACLManager(aclManager.target);
        await addressesProvider.setPriceOracle(priceOracle.target);
        await addressesProvider.setPool(mockPool.target);

        // Deploy Wrapper
        const AaveExpertWrapper = await ethers.getContractFactory("AaveExpertWrapper");
        wrapper = await AaveExpertWrapper.deploy(addressesProvider.target);
        await wrapper.initializePool();

        // Fund the mock pool with all tokens
        const fundPromises = [
            weth.mint(deployer.address, parseWETH("1000")),
            usdc.mint(deployer.address, parseUSDC("1000000")),
            usdt.mint(deployer.address, parseUSDT("1000000")),
            dai.mint(deployer.address, parseDAI("1000000")),
            wbtc.mint(deployer.address, parseWBTC("100")),
        ];

        await Promise.all(fundPromises);

        const approveAndFund = [
            weth.connect(deployer).approve(mockPool.target, parseWETH("1000")),
            usdc.connect(deployer).approve(mockPool.target, parseUSDC("1000000")),
            usdt.connect(deployer).approve(mockPool.target, parseUSDT("1000000")),
            dai.connect(deployer).approve(mockPool.target, parseDAI("1000000")),
            wbtc.connect(deployer).approve(mockPool.target, parseWBTC("100")),
        ];

        await Promise.all(approveAndFund);

        const fundPool = [
            mockPool.connect(deployer).fundPool(weth.target, parseWETH("500")),
            mockPool.connect(deployer).fundPool(usdc.target, parseUSDC("500000")),
            mockPool.connect(deployer).fundPool(usdt.target, parseUSDT("500000")),
            mockPool.connect(deployer).fundPool(dai.target, parseDAI("500000")),
            mockPool.connect(deployer).fundPool(wbtc.target, parseWBTC("50")),
        ];

        await Promise.all(fundPool);

        // Fund users with test tokens
        const userFunding = [
            weth.mint(user1.address, parseWETH("10")),
            usdc.mint(user1.address, parseUSDC("10000")),
            usdt.mint(user1.address, parseUSDT("10000")),
            dai.mint(user1.address, parseDAI("10000")),
            wbtc.mint(user1.address, parseWBTC("1")),
            weth.mint(user2.address, parseWETH("5")),
            usdc.mint(user2.address, parseUSDC("5000")),
        ];

        await Promise.all(userFunding);
    });

    describe("Dynamic System Setup", function () {
        it("Should add all tokens to oracle successfully", async function () {
            const supportedAssets = await priceOracle.getSupportedAssets();
            expect(supportedAssets).to.have.lengthOf(5);
            expect(supportedAssets).to.include(weth.target);
            expect(supportedAssets).to.include(usdc.target);
        });

        it("Should add all tokens to pool successfully", async function () {
            const poolAssets = await mockPool.getSupportedAssets();
            expect(poolAssets).to.have.lengthOf(5);
            expect(poolAssets).to.include(weth.target);
            expect(poolAssets).to.include(usdc.target);
        });

        it("Should have correct prices in oracle", async function () {
            expect(await priceOracle.getAssetPrice(weth.target)).to.equal(parsePrice("2000"));
            expect(await priceOracle.getAssetPrice(usdc.target)).to.equal(parsePrice("1"));
            expect(await priceOracle.getAssetPrice(wbtc.target)).to.equal(parsePrice("30000"));
        });

        it("Should have correct collateral configs in pool", async function () {
            const wethConfig = await mockPool.collateralConfigs(weth.target);
            expect(wethConfig.ltv).to.equal(7500);
            expect(wethConfig.liquidationThreshold).to.equal(8000);
            expect(wethConfig.enabled).to.be.true;
        });
    });

    describe("Cross-Asset Operations with Dynamic Addresses", function () {
        it("Should supply WETH and borrow USDC", async function () {
            // Supply WETH
            await weth.connect(user1).approve(wrapper.target, parseWETH("1.5"));
            console.log("user1  weth balance step 1 :",ethers.formatUnits( await weth.balanceOf(user1.address),WETH_DECIMALS));
            console.log("pool weth balance:", await weth.balanceOf(mockPool.target));
            console.log("wrapper weth balance:", await weth.balanceOf(wrapper.target));
            console.log("user1  weth balance step 2 :",ethers.formatUnits( await weth.balanceOf(user1.address),WETH_DECIMALS));

            await wrapper.connect(user1).supply(weth.target, parseWETH("1.5"), user1.address);
            console.log("user1  weth balance step 3 :",ethers.formatUnits( await weth.balanceOf(user1.address),WETH_DECIMALS));

            await wrapper.connect(user1).withdraw(weth.target, parseWETH("0.5"), user1.address);
            console.log("user1  weth balance step 4:",ethers.formatUnits( await weth.balanceOf(user1.address),WETH_DECIMALS));
           

            console.log('====================================');
            console.log('User 1 supplied 1 WETH');
            console.log("user1  weth balance:", await weth.balanceOf(user1.address));
            console.log("pool weth balance:", await weth.balanceOf(mockPool.target));
            console.log("wrapper weth balance:", await weth.balanceOf(wrapper.target));

            console.log('====================================');


            console.log("user1  usdc balance:", ethers.formatUnits( await usdc.balanceOf(user1.address),6));
            console.log("pool usdc balance:", ethers.formatUnits(await usdc.balanceOf(mockPool.target),6));
            // Borrow USDC
            const borrowAmount = parseUSDC("1000");
            await wrapper.connect(user1).borrow(usdc.target, borrowAmount, 2, user1.address);
            console.log("user1  usdc balance:",ethers.formatUnits( await usdc.balanceOf(user1.address),6));
            console.log("pool usdc balance:", ethers.formatUnits(await usdc.balanceOf(mockPool.target),6));
            
            // Verify
            const userSupply = await mockPool.getUserSupply(weth.target, user1.address);
            const userDebt = await mockPool.getUserBorrow(usdc.target, user1.address);

            expect(userSupply).to.equal(parseWETH("1"));
            expect(userDebt).to.equal(borrowAmount);

            await usdc.connect(user1).approve(wrapper.target, parseWETH("1000"));

            const repayAmount = parseUSDC("1000");
            await wrapper.connect(user1).repay(usdc.target, repayAmount,2, user1.address);
            const userDebtAfterRepay = await mockPool.getUserBorrow(usdc.target, user1.address);
            expect(userDebtAfterRepay).to.equal(parseUSDC("0"));


            console.log("user1  weth balance:",ethers.formatUnits( await weth.balanceOf(user1.address),WETH_DECIMALS));

            await wrapper.connect(user1).withdraw(weth.target, parseWETH("1"), user1.address);

            console.log("user1  weth balance after withdraw:",ethers.formatUnits( await weth.balanceOf(user1.address),WETH_DECIMALS));
        });

        it("Should calculate borrowing power correctly", async function () {
            // Supply WETH
            await weth.connect(user1).approve(wrapper.target, parseWETH("1"));
            await wrapper.connect(user1).supply(weth.target, parseWETH("1"), user1.address);

            const result = await mockPool.calculateBorrowingPower(user1.address);

            // 1 WETH = $2000 * 75% LTV = $1500 borrowing power
            expect(result.maxBorrowValue).to.be.gt(0);
            expect(result.availableBorrowValue).to.equal(result.maxBorrowValue);
            expect(result.borrowableAssets).to.have.lengthOf(5);
        });

        it("Should handle multiple collateral types", async function () {
            // Supply multiple assets
            await weth.connect(user1).approve(wrapper.target, parseWETH("1"));
            await wrapper.connect(user1).supply(weth.target, parseWETH("1"), user1.address);

            await wbtc.connect(user1).approve(wrapper.target, parseWBTC("0.1"));
            await wrapper.connect(user1).supply(wbtc.target, parseWBTC("0.1"), user1.address);

            const result = await mockPool.calculateBorrowingPower(user1.address);

            // Should have combined borrowing power
            expect(result.maxBorrowValue).to.be.gt(parsePrice("1500"));
        });
    });


});