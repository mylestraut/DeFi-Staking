// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

/*------ Errors ------*/
error Staking__TransferFailed();
error Staking__NeedsMoreThanZero();

contract Staking {

    // s_ means storage variable
    IERC20 public s_stakingToken;
    IERC20 public s_rewardsToken;

    // Address => staked amount
    mapping (address => uint256) public s_balances;

    //How much each address has been paid
    mapping (address => uint256) public s_userRewardPerTokenPaid;

    // How much rewards each address has to claim
    mapping (address => uint256) public s_rewards;

    // Keeps track of users vesting choice
    mapping (address => uint256) internal userStakedTime;
    // Keeps track of the time user stakes
    mapping (address => uint256) public stakedTimestamp;

    uint256 public constant REWARD_RATE = 100;
    uint256 public s_totalSupply;
    uint256 public s_rewardPerTokenStored;
    uint256 public s_lastUpdateTime;

    uint256 internal constant oneMonth = 4 weeks;
    uint256 fourMonths = 16 weeks;
    uint256 oneYear = 52 weeks;
    
    constructor(address _stakingToken, address _rewardsToken){
        s_stakingToken = IERC20(_stakingToken);
        s_rewardsToken = IERC20(_rewardsToken);
        console.log("1 Year: ", oneYear);
    }
    

    function earned(address _account) public view returns(uint256) {
        uint256 currentBalance = s_balances[_account];
        uint256 amountPaid = s_userRewardPerTokenPaid[_account];
        uint256 currentRewardPerToken = rewardPerToken();
        uint256 pastRewards = s_rewards[_account];

        uint256 _earned = ((currentBalance * (currentRewardPerToken - amountPaid))/1e18) + pastRewards;
        return _earned;
    }

    function rewardPerToken() public view returns(uint256){
        if(s_totalSupply == 0){
            return s_rewardPerTokenStored;
        }
        return s_rewardPerTokenStored + (((block.timestamp - s_lastUpdateTime) * REWARD_RATE * 1e18)/ s_totalSupply);
    }

    function stake(uint256 _amount, uint256 _vestingPeriod) external updateReward(msg.sender) {
        require(
            _vestingPeriod == oneMonth || 
            _vestingPeriod == fourMonths || 
            _vestingPeriod == oneYear, "Only 1, 4 or 12 months");

        s_balances[msg.sender] += _amount;
        s_totalSupply += _amount;

        userStakedTime[msg.sender] = _vestingPeriod;
        stakedTimestamp[msg.sender] = block.timestamp;

        //emit event

        bool success = s_stakingToken.transferFrom(msg.sender, address(this), _amount);
        if (!success) {
            revert Staking__TransferFailed();
        }
    }

    function withdraw(uint256 _amount) external 
        updateReward(msg.sender) 
        {
            if(userStakedTime[msg.sender] == oneMonth){
                require(block.timestamp >= stakedTimestamp[msg.sender] + oneMonth, "CANT WITHDRAW");
                _withdraw(_amount);
            }
            if(userStakedTime[msg.sender] == fourMonths){
                require(block.timestamp >= stakedTimestamp[msg.sender] + fourMonths, "CANT WITHDRAW");
                _withdraw(_amount);
            }
            if(userStakedTime[msg.sender] == oneYear){
                require(block.timestamp >= stakedTimestamp[msg.sender] + oneYear, "CANT WITHDRAW");
                _withdraw(_amount);
            }
        }

    function _withdraw(uint256 _amount) internal {
        s_balances[msg.sender] -= _amount;
        s_totalSupply -= _amount;

        bool success = s_stakingToken.transfer(msg.sender, _amount);
        if(!success) {
        revert Staking__TransferFailed();
        }
    } 

    function claimReward() external updateReward(msg.sender) {
        uint256 reward = s_rewards[msg.sender];
        bool success = s_rewardsToken.transfer(msg.sender, reward);
        if (!success) {
            revert Staking__TransferFailed();
        }
        // How much rewards should users get?
        // Contract emits x tokens per second
        // And disperses them to all stakers

        // 100 Reward Tokens per second
        // Staked:  50 staked tokens, 20 staked tokens, 30 staked tokens (Total: 100)
        // Reward:  50 Reward tokens, 20 Rewards Tokens, 30 reward Tokens (Total: 100)

        // Staked:  100 staked tokens, 50 staked tokens, 20 staked tokens, 30 staked tokens (Total: 200)
        // Rewards: 50 reward tokens, 25 Reward tokens, 10 rewards Tokens, 15 Reward Tokens (Total: 100)

        // 5 seconds Person 1 had 100 tokens staked: rewards = 500
        // second 6 2 people have 100 tokens staked: 
        //      rewards: Person 1: 550
        //      rewards: Person 2: 50

        // From seconds 1 - 5 person 1 got 100 tokens per second rewards
        // From second 6 onwards, person 1 and 2 only get 50 tokens per second 

        
    }

    modifier updateReward(address _account) {
        s_rewardPerTokenStored = rewardPerToken();
        s_lastUpdateTime = block.timestamp;
        s_rewards[_account] = earned(_account);
        s_userRewardPerTokenPaid[_account] = s_rewardPerTokenStored;
        _;
    }

    // modifier moreThanZero(uint256 _amount) {
    //     if (_amount == 0) {
    //         revert Staking__NeedsMoreThanZero();
    //         _;
    //     }
    // }
}