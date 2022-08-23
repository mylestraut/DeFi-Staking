const { expect } = require("chai");
const { utils } = require("ethers");
const { ethers} = require("hardhat");
const { currentTime, fastForward } = require("../utils/TestUtils");

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

        await rewardTokenInstance.connect(deployer).transfer(stakingInstance.address, ethers.utils.parseEther("1000000"));

        stakeAmount = ethers.utils.parseEther("100000");
    });

    it("allows users to stake and earn rewards", async () => {
        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await stakingInstance.connect(deployer).stake(stakeAmount, oneMonth);
        const startingEarned = await stakingInstance.connect(deployer).earned(deployer.address);
        console.log(`Starting Earned: ${startingEarned}`);

        await fastForward(oneMonth);

        const endingEarned = await stakingInstance.connect(deployer).earned(deployer.address);
        console.log(`Ending Earned: ${endingEarned}`);

        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);

        expect(await stakingInstance.connect(deployer).stake(stakeAmount, oneMonth))
            .to.emit(stakingInstance, "Staked")
            .withArgs(deployerAddress, stakeAmount, oneMonth);
    });
    it("can claim rewards", async () => {
        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await rewardTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await stakingInstance.connect(deployer).stake(stakeAmount, fourMonths);

        await fastForward(oneMonth);

        const endingEarned = await stakingInstance.connect(deployer).earned(deployer.address);

        let balanceBefore = await rewardTokenInstance.balanceOf(deployerAddress);

        await stakingInstance.connect(deployer).claimReward();

        let balanceAfter = await rewardTokenInstance.balanceOf(deployerAddress);

        expect(balanceAfter).to.equal(balanceBefore + endingEarned);

        expect(await stakingInstance.connect(deployer).claimReward())
            .to.emit(stakingInstance, "RewardClaimed")
            .withArgs(deployerAddress, endingEarned);
    });
    it("can withdraw after one month", async () => {
        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await rewardTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await stakingInstance.connect(deployer).stake(stakeAmount, oneMonth);

        await expect(stakingInstance.connect(deployer).withdraw(stakeAmount))
            .to.be.revertedWith("CANT WITHDRAW");

        await fastForward(oneMonth);

        const balanceBefore = await stakingTokenInstance.balanceOf(deployer.address);

        await stakingInstance.connect(deployer).withdraw(stakeAmount);

        const balanceAfter = await stakingTokenInstance.balanceOf(deployer.address);

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

        await stakingInstance.connect(deployer).withdraw(stakeAmount);

        const balanceAfter = await stakingTokenInstance.balanceOf(deployer.address);

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

        await stakingInstance.connect(deployer).withdraw(stakeAmount);

        const balanceAfter = await stakingTokenInstance.balanceOf(deployer.address);

        expect(balanceAfter).to.equal(balanceBefore.add(stakeAmount));
    });
    it("withdraw emits event", async () => {
        await stakingTokenInstance.connect(deployer).approve(stakingInstance.address, stakeAmount);
        await stakingInstance.connect(deployer).stake(stakeAmount, oneMonth);

        await fastForward(oneMonth);

        expect(await stakingInstance.connect(deployer).withdraw(stakeAmount))
            .to.emit(stakingInstance, "Withdrawn")
            .withArgs(deployerAddress, stakeAmount);
    });
});