const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("ETH balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const WETH_DECIMALS = 18;
  const parseWETH = (amount) => ethers.parseUnits(amount, WETH_DECIMALS);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", WETH_DECIMALS);
  await weth.waitForDeployment();
  console.log("WETH deployed at:", weth.target);

  // Mint tokens
  const mintTx = await weth.mint(deployer.address, parseWETH("1000"));
  const receipt = await mintTx.wait();
  console.log("Mint TX confirmed in block", receipt.blockNumber);

  const bal = await weth.balanceOf(deployer.address);
  console.log("WETH balance:", ethers.formatUnits(bal, WETH_DECIMALS));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
