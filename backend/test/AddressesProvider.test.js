const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PoolAddressesProvider", function () {
  let addressesProvider;
  let owner, user;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    const PoolAddressesProvider = await ethers.getContractFactory("PoolAddressesProvider");
    addressesProvider = await PoolAddressesProvider.deploy(owner.address);
  });

  describe("Ownership", function () {
    it("Should set the right owner", async function () {
      expect(await addressesProvider.getOwner()).to.equal(owner.address);
    });

    it("Should transfer ownership", async function () {
      await addressesProvider.connect(owner).transferOwnership(user.address);
      expect(await addressesProvider.getOwner()).to.equal(user.address);
    });

    it("Should prevent non-owners from transferring ownership", async function () {
      await expect(
        addressesProvider.connect(user).transferOwnership(user.address)
      ).to.be.reverted;
    });
  });

  describe("Address Management", function () {
    const testId = ethers.utils.formatBytes32String("TEST_ID");
    const testAddress = "0x0000000000000000000000000000000000000001";

    it("Should allow owner to set addresses", async function () {
      await expect(addressesProvider.connect(owner).setAddress(testId, testAddress))
        .to.emit(addressesProvider, "AddressSet")
        .withArgs(testId, ethers.constants.AddressZero, testAddress);

      expect(await addressesProvider.getAddress(testId)).to.equal(testAddress);
    });

    it("Should prevent non-owners from setting addresses", async function () {
      await expect(
        addressesProvider.connect(user).setAddress(testId, testAddress)
      ).to.be.reverted;
    });

    it("Should update existing addresses", async function () {
      const newAddress = "0x0000000000000000000000000000000000000002";
      
      await addressesProvider.connect(owner).setAddress(testId, testAddress);
      await addressesProvider.connect(owner).setAddress(testId, newAddress);

      expect(await addressesProvider.getAddress(testId)).to.equal(newAddress);
    });
  });

  describe("Pool Management", function () {
    const poolAddress = "0x0000000000000000000000000000000000000001";

    it("Should set and get pool address", async function () {
      await addressesProvider.connect(owner).setPool(poolAddress);
      expect(await addressesProvider.getPool()).to.equal(poolAddress);
    });
  });
});