const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");



let donor1, donor1Address;
let project1Owner1, project1Owner1Address;
let grant1Admin1, grant1Admin1Address;
let owner, ownerAddress;

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
