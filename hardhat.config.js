require("@nomicfoundation/hardhat-toolbox");
require("hardhat-gas-reporter");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  gasReporter: {
    enabled: true,
    showTimeSpent: true,
    coinmarketcap: process.env.CMC_API_KEY,
  },
};
