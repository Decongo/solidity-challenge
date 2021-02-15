const EVM_REVERT = "VM Exception while processing transaction: revert"

const ether = (n) => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  );
}

const tokens = (n) => ether(n);

const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'


const Staker = artifacts.require('./Staker')
const RewardToken = artifacts.require('./RewardToken')

require('chai')
  .use(require('chai-as-promised'))
  .should()

const Web3 = require('web3')

contract('Staker', ([deployer, user1, user2, user3, user4]) => {
  let stakerInstance;
  let token;

  beforeEach(async () => {
    token = await RewardToken.new();
    await token.transfer(user1, tokens(100), { from: deployer })
    stakerInstance = await Staker.new();
    await token.addMinter(stakerInstance.address, { from: deployer });
  })

  describe("deployment", () => {
    it("tracks block number", async () => {
      const web3 = new Web3("ws://localhost:7545");
      await stakerInstance.updateBlockNumber();
      const blockNumberFromStaker = await stakerInstance.blockNumber();
      const blockNumberFromWeb3 = await web3.eth.getBlockNumber();
      blockNumberFromStaker.toString().should.equal(blockNumberFromWeb3.toString());
    })

    it('inits minter', async () => {
      const result = await stakerInstance.minter();
      result.should.equal(deployer);
    })
  })

  describe("depositing tokens", () => {
    let result;
    let amount;

    describe("success", () => {
      beforeEach(async () => {
        amount = tokens(10);
        await token.approve(stakerInstance.address, amount, { from: user1 });
        result = await stakerInstance.depositToken(token.address, amount, { from: user1 });
      })

      it("tracks the token deposit", async () => {
        // check staker token balance
        let balance = await token.balanceOf(stakerInstance.address);
        balance.toString().should.equal(amount.toString());
        // check tokens on staker
        balance = await stakerInstance.tokens(user1);
        balance.toString().should.equal(amount.toString());
      })

      it('triggers a "Deposit" event', async () => {
        const log = result.logs[0];
        log.event.should.eq('Deposit');
        const event = log.args;
        event.user.should.equal(user1, "user address is correct");
        event.amount.toString().should.equal(amount.toString(), "amount is correct");
        event.balance.toString().should.equal(amount.toString(), "balance is correct");
      })
    })

    describe("failure", () => {
      it('fails when no tokens are approved', async () => {
        // don't approve any tokens before depositing
        await stakerInstance.depositToken(token.address, tokens(10), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      })
    })
  })

  describe('withdrawing tokens', () => {
    let result;
    let amount;

    describe('success', async () => {
      beforeEach(async () => {
        // Deposit tokens first
        amount = tokens(10);
        await token.approve(stakerInstance.address, amount, { from: user1 });
        await stakerInstance.depositToken(token.address, amount, { from: user1 });
  
        // withdraw tokens
        result = await stakerInstance.withdrawToken(token.address, amount, {from: user1 });
      })

      it('withdraws Token funds', async () => {
        const balance = await stakerInstance.tokens(user1);
        balance.toString().should.equal('0');
      })

      it('triggers a "Withdraw" event', async () => {
        const log = result.logs[0];
        log.event.should.eq('Withdraw');
        const event = log.args;
        event.user.should.equal(user1);
        event.amount.toString().should.equal(amount.toString());
        event.balance.toString().should.equal("0");
      })
    })

    describe("failure", async () => {
      it('rejects Ether withdraws', async () => {
        await stakerInstance.withdrawToken(ETHER_ADDRESS, tokens(10), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      })

      it('rejects withdraws for insufficient balances', async () => {
        await stakerInstance.withdrawToken(token.address, tokens(10), { from: user1 })
          .should.be.rejectedWith(EVM_REVERT);
      })
    })
  })

  describe('distibuting rewards', () => {
    const tokensPerBlock = tokens(100);
    const amount = tokens(100);
    const user1Start = tokens(100);
    const user2Start = tokens(75);
    const user3Start = tokens(50);
    const user4Start = tokens(25);
    
    beforeEach(async () => {
      let requests = [];
      requests.push(token.transfer(user2, user2Start, { from: deployer }));
      requests.push(token.transfer(user3, user3Start, { from: deployer }));
      requests.push(token.transfer(user4, user4Start, { from: deployer }));
      await Promise.all(requests);

      requests = [];
      requests.push(token.approve(stakerInstance.address, user2Start, { from: user2 }));
      requests.push(token.approve(stakerInstance.address, user1Start, { from: user1 }));
      requests.push(token.approve(stakerInstance.address, user3Start, { from: user3 }));
      requests.push(token.approve(stakerInstance.address, user3Start, { from: user4 }));
      await Promise.all(requests);

      requests = [];
      requests.push(stakerInstance.depositToken(token.address, user1Start, { from: user1 }));
      requests.push(stakerInstance.depositToken(token.address, user2Start, { from: user2 }));
      requests.push(stakerInstance.depositToken(token.address, user3Start, { from: user3 }));
      requests.push(stakerInstance.depositToken(token.address, user4Start, { from: user4 }));
      await Promise.all(requests);
    })

    it('mints new tokens', async () => {
      const oldBalance = await token.balanceOf(stakerInstance.address);
      await stakerInstance.mint(token.address, amount);
      const newBalance = await token.balanceOf(stakerInstance.address);
      newBalance.sub(oldBalance).toString().should.equal(amount.toString());
    })

    it('distributes tokens among stakers', async () => {
      const web3 = new Web3("ws://localhost:7545");

      // init users for testing
      const stakerUsers = [
        {
          user: user1,
          oldBalance: 0,
          newBalance: 0
        },
        {
          user: user2,
          oldBalance: 0,
          newBalance: 0
        },
        {
          user: user3,
          oldBalance: 0,
          newBalance: 0
        },
        {
          user: user4,
          oldBalance: 0,
          newBalance:0
        }
      ];

      // get users' old balances
      const stakerBalances = [];
      for (let stakerUser of stakerUsers) {
        stakerUser.oldBalance = await stakerInstance.balanceOf(stakerUser.user);
      }

      // get old contract info
      const oldBalance = await stakerInstance.totalBalance();
      const oldBlockNumber = await stakerInstance.blockNumber();
     
      // distribute rewards
      await stakerInstance.distributeRewards(token.address);

      // get new contract info
      const newBlockNumber = await stakerInstance.blockNumber();

      // get users' new balances and verify
      let numNewTokens;
      let numBlocks = newBlockNumber - oldBlockNumber;
      for (let stakerUser of stakerUsers) {
        stakerUser.newBalance = await stakerInstance.balanceOf(stakerUser.user);
        numNewTokens = tokensPerBlock * numBlocks * (stakerUser.oldBalance / oldBalance);
        (stakerUser.newBalance.sub(stakerUser.oldBalance)).toString().should.equal(numNewTokens.toString());
      }
    })
  })
})