const { network, getNamedAccounts, ethers } = require("hardhat")
const { ForStatement } = require("prettier-plugin-solidity/src/nodes")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async function({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const chainId = network.config.chainId
  let ethUsdPriceFeedAddress

  if (developmentChains.includes(network.name)) {
    const ethUsdAggregator = await ethers.getContract("MockV3Aggregator")
    ethUsdPriceFeedAddress = ethUsdAggregator.address
  } else {
    ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed
  }

  log("-----------------------------------")

  const sadSVG = await fs.readFileSync("./images/dynamic/frown.svg", { encoding: "utf8" })
  const happySVG = await fs.readFileSync("./images/dynamic/happy.svg", { encoding: "utf8" })

  args = [ethUsdPriceFeedAddress, sadSVG, happySVG]
  const dynamicSvgNft = await deploy("DynamicSvgNft", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1
  })

  // Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...")
    await verify(dynamicSvgNft.address, arguments)
  }
}

module.exports.tags = ["all", "dynamicsvg", "main"]
