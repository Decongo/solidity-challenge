# Staker and RewardToken smart contracts
This repo contains my implementation of the Staker and RewardToken smart contracts as described in the challenge specs.

For the RewardToken contract, I used an [ERC20 token that I previously implemented](https://github.com/Decongo/blockchain-developer-bootcamp/blob/master/src/contracts/Token.sol) as a template. For this project, I added the following functions and data members:
* `minters`
* `addMinter()`
* `mint()`
* `isMinter()`

For the Staker contract, I used the `depositToken` and `withdrawToken` functions from a [decentralized exchange contract that I previously implmented](https://github.com/Decongo/blockchain-developer-bootcamp/blob/master/src/contracts/Exchange.sol). For this project, I added the following functions and data members:
* `stakers`
* `blockNumber`
* `minter`
* `totalBalance`
* `mint()`
* `updateBlockNumber()`
* `distributeRewards()`

## Minters
Though I followed the spec, I'd like to take the time to explain some design decisions. First, I chose to implement an array of minters for the RewardToken contract. This is because the token needs to accept `mint()` requests from both the owner of the contract and the Staker contract. To avoid the possibility of man-in-the middle attacks, I felt that it was best to register both the owner and the Staker contract as valid minters. In addition, I included a minter in the Staker contract. This combination restricts the ability to mint new tokens to two situations:

1. The owner calls `mint()` on the Staker, causing the Staker to call `mint()` on the token
2. The owner calls `mint()` on the token directly

Because minting requests can only be initiated in these two specific transaction chains, the routine is protected against man-in-the-middle attacks.

## Block Number
Because of the nature of smart contracts, this contract cannot run uninterrupted to provide real-time rewards to the stakers like a centralized server might. Instead, the idea of this design is to run a recurring command (e.g. every day) on another server that would call the Staker's `distributeRewards()` function. This function calculates the number of blocks since the last reward cycle and distributes the rewards to stakers accordingly.

## Setup

### Install Node
Get version 10.16.3 from [their website](https://nodejs.org/en/download/) or from a package manager.

### Install Ganache
Get it from the [website](https://www.trufflesuite.com/ganache).

### Clone this repo
```
git clone https://github.com/Decongo/solidity-challenge.git
cd solidity-challenge
```

### Install dependencies
```
npm install
```

## Truffle
I developed this project using Truffle. To run the dev blockchain, start Ganache's "Quickstart" workspace. Then do the following:

### Deploy Contracts
```
npx truffle migrate
```

### Interact with Contracts
```
npx truffle console
```

* `let token = await RewardToken.new()` - fetch contract (replace "RewardToken" with "Staker" to get the Staker contract)
* `token.<function>(<function_arguments>)` - call a smart contract function

### Run Tests
I created a test suite to develop this project. You can run it simply with the following command:
```
npx truffle test
```

## Final Thoughts
This was a great excercise for me as a developer because I had not implemented a contract involving minting or staking before. There are a few points that I would like to improve given more time. First, I may consider adding a limit to the number of minters allowed for the RewardToken contract to increase the security of the `mint()` function. Second, the `distributeRewards()` function is probably the most computationally-heavy part of this project. It may be possible to find more efficient ways to work, particularly when iterating over the list of stakers and calculating their rewards.

# challenge specs
create and deploy (locally) an ERC20 token and a staking contract that will distribute rewards to stakers over time. No need for an app or UI. You can reuse published or open source code, but you must indicate the source and what you have modified.

## User journey
An account with some balance of the tokens can deposit them into the staking contract (which also has the tokens and distributes them over time). As the time goes by and blocks are being produced, this user should accumulate more of the tokens and can claim the rewards and withdraw the deposit.

## RewardToken.sol
this contract defines an ERC20 token that will be used for staking/rewards. The owner should be able to mint the token.

## Staker.sol
this contract will get deployed with some tokens minted for the distribution to the stakers. And then, according to a schedule, allocate the reward tokens to addresses that deposited those tokens into the contract. The schedule is up to you, but you could say that every block 100 tokens are being distributed; then you'd take the allocated tokens and divide by the total balance of the deposited tokens so each depositor get's proportional share of the rewards. Ultimately, a user will deposit some tokens and later will be able to withdraw the principal amount plus the earned rewards. The following functions must be implemented: deposit(), withdraw()

## Scoring criteria
- launch ERC20 token
- implement reward allocation logic
- safe deposit/withdraw functions (avoid common attack vectors)
