const { ethers } = require("hardhat");

// Gets the time of the last block.
const currentTime = async () => {
  const { timestamp } = await ethers.provider.getBlock("latest");
  return timestamp;
};

// Increases the time in the EVM.
// seconds = number of seconds to increase the time by
const fastForward = async (seconds) => {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
};

module.exports = {
  currentTime: currentTime,
  fastForward: fastForward,
};
