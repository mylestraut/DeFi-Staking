const { expect } = require("chai");
const { utils } = require("ethers");
const { ethers} = require("hardhat");
const { moveBlocks } = require("../utils/move-blocks");
const { moveTime } = require("../utils/move-time");
const { currentTime, fastForward } = require("../utils/TestUtils");
// const { oneMonth, fourMonths, oneYear } = require("../utils/TEST");

const oneMonth = 2419200;
const fourMonths = 9676800;
const oneYear = 31449600;

let CurrentTime;

describe("Staking tests", function () {
    let stakingContract, stakingInstance; 
    let rewardTokenContract, rewardTokenInstance;
    let stakingTokenContract, stakingTokenInstance; 
    let deployer, Alice, Bob; 
    let stakeAmount;

    beforeEach(async () => {
        [deployer, Alice, Bob] = await ethers.getSigners();
        deployerAddress = await deployer.getAddress();
        AliceAddress = await Alice.getAddress();
        BobAddress = await Bob.getAddress(); 

        rewardTokenContract = await ethers.getContractFactory("RewardToken");
        rewardTokenInstance = await rewardTokenContract.connect(deployer).deploy();

        stakingTokenContract = await ethers.getContractFactory("RewardToken");
        stakingTokenInstance = await stakingTokenContract.connect(deployer).deploy();

        stakingContract = await ethers.getContractFactory("Staking");
        stakingInstance = await stakingContract.connect(deployer).deploy(
            stakingTokenInstance.address,
            rewardTokenInstance.address
        );

        stakeAmount = ethers.utils.parseEther("100000");
    });

    it("allows users to stake and earn rewards", async () => {
        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await stakingInstance.connect(deployer).stake(stakeAmount, oneMonth);
        const startingEarned = await stakingInstance.connect(deployer).earned(deployer.address);
        console.log(`Starting Earned: ${startingEarned}`);

        const endingEarned = await stakingInstance.connect(deployer).earned(deployer.address);
        console.log(`Ending Earned: ${endingEarned}`);
    });
    it("can withdraw after one month", async () => {
        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await rewardTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await stakingInstance.connect(deployer).stake(stakeAmount, oneMonth);

        let CurrentTime = await currentTime(); 
        console.log("Current Time: " + CurrentTime);
        let currentPlusOne = CurrentTime + oneMonth;
        console.log("Current Time + 1m: " + currentPlusOne);

        await expect(stakingInstance.connect(deployer).withdraw(stakeAmount))
            .to.be.revertedWith("CANT WITHDRAW");

        await fastForward(oneMonth);
        CurrentTime = await currentTime(); 
        console.log("1m in future: " + CurrentTime);

        const balanceBefore = await stakingTokenInstance.balanceOf(deployer.address);
        console.log(`deployer Balance Before: ${balanceBefore}`);

        await stakingInstance.connect(deployer).withdraw(stakeAmount);

        const balanceAfter = await stakingTokenInstance.balanceOf(deployer.address);
        console.log(`deployer Balance After: ${balanceAfter}`);

        expect(balanceAfter).to.equal(balanceBefore.add(stakeAmount));
    });
    it("can withdraw after four months", async () => {
        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await rewardTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await stakingInstance.connect(deployer).stake(stakeAmount, fourMonths);

        await fastForward(oneMonth);

        await expect(stakingInstance.connect(deployer).withdraw(stakeAmount))
            .to.be.revertedWith("CANT WITHDRAW");
        
        await fastForward(fourMonths);

        const balanceBefore = await stakingTokenInstance.balanceOf(deployer.address);
        console.log(`deployer Balance Before: ${balanceBefore}`);

        await stakingInstance.connect(deployer).withdraw(stakeAmount);

        const balanceAfter = await stakingTokenInstance.balanceOf(deployer.address);
        console.log(`deployer Balance After: ${balanceAfter}`);

        expect(balanceAfter).to.equal(balanceBefore.add(stakeAmount));
    });
    it("can withdraw after one year", async () => {
        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await rewardTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await stakingInstance.connect(deployer).stake(stakeAmount, oneYear);

        await expect(stakingInstance.connect(deployer).withdraw(stakeAmount))
            .to.be.revertedWith("CANT WITHDRAW");

        await fastForward(oneYear);

        const balanceBefore = await stakingTokenInstance.balanceOf(deployer.address);
        console.log(`deployer Balance Before: ${balanceBefore}`);

        await stakingInstance.connect(deployer).withdraw(stakeAmount);

        const balanceAfter = await stakingTokenInstance.balanceOf(deployer.address);
        console.log(`deployer Balance After: ${balanceAfter}`);

        expect(balanceAfter).to.equal(balanceBefore.add(stakeAmount));
    });
});