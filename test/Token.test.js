const EVM_REVERT = "VM Exception while processing transaction: revert"

const ether = (n) => {
  return new web3.utils.BN(
    web3.utils.toWei(n.toString(), 'ether')
  );
}

const tokens = (n) => ether(n);

const ETHER_ADDRESS = '0x0000000000000000000000000000000000000000'


const RewardToken = artifacts.require('./RewardToken')
require('chai')
  .use(require('chai-as-promised'))
  .should()

contract('RewardToken', ([deployer, receiver]) => {
  const name = 'RewardToken';
  const symbol = 'RTK';
  const decimals = '18';
  const totalSupply = tokens(1000000).toString();
  const minter = deployer;

  let token;

  beforeEach(async () => {
    // fetch token from blockchain
    token = await RewardToken.new();
  })

  describe("deployment", () => {
    it("tracks the name", async () => {
      const result = await token.name();
      result.should.equal(name);
    })

    it('tracks the symbol', async () => {
      const result = await token.symbol();
      result.should.equal(symbol);
    })

    it('tracks the decimals', async () => {
      const result = await token.decimals();
      result.toString().should.equal(decimals);
    })

    it('tracks the total suppply', async () => {
      const result = await token.totalSupply();
      result.toString().should.equal(totalSupply.toString());
    })

    it('assigns the total supply to the deployer', async () => {
      const result = await token.balanceOf(deployer);
      result.toString().should.equal(totalSupply.toString());
    })

    it("assigns the minter on deploy", async () => {
      const result = await token.minters(0);
      result.should.equal(minter);
    })
  })

  describe("sending tokens", () => {
    let amount;
    let result;

    describe("success", async () => {
      beforeEach(async () => {
        // transfer funds
        amount = tokens(100);
        result = await token.transfer(receiver, amount, { from: deployer });
      })
  
      it("transfers token balances", async () => {
        let balanceOf;
    
        // balances after transfer
        balanceOf = await token.balanceOf(deployer);
        balanceOf.toString().should.equal(tokens(999900).toString());
        balanceOf = await token.balanceOf(receiver);
        balanceOf.toString().should.equal(tokens(100).toString());
      })
  
      it("triggers a Transfer event", async () => {
        const log = result.logs[0];
        log.event.should.eq('Transfer');
        const event = log.args;
        event.from.toString().should.equal(deployer, "from is correct");
        event.to.should.equal(receiver, "to is correct");
        event.value.toString().should.equal(amount.toString(), "value is correct");
      })
    })

    describe("failure", async => {
      it("rejects insufficient balances", async () => {
        let invalidAmount = tokens(100000000); // 100 million - greater than total supply
        await token.transfer(receiver, invalidAmount, { from: deployer }).should.be.rejectedWith(EVM_REVERT);

        // Attempt transfer tokens when you have none
        invalidAmount = tokens(10);
        await token.transfer(deployer, invalidAmount, { from: receiver }).should.be.rejectedWith(EVM_REVERT);
      })

      it("rejects invalid recipients", async () => {
        await token.transfer(0x0, amount, {from: deployer }).should.be.rejected;
      })
    })
  })

  describe("minting tokens", () => {
    let result;
    let amount;

    describe("success", async () => {
      beforeEach(async () => {
        amount = tokens(100);
        result = await token.mint(amount, { from: deployer });
      })

      it('mints new tokens', async () => {
        let balanceOf = await token.balanceOf(deployer);
        balanceOf.toString().should.equal(tokens(1000100).toString());
        let totalSupply = await token.totalSupply();
        totalSupply.toString().should.equal(tokens(1000100).toString());
      })

      it("triggers a Mint event", async () => {
        const log = result.logs[0];
        log.event.should.eq('Mint');
        const event = log.args;
        event.minterAddress.toString().should.equal(deployer, "minter is correct");
        event.amount.toString().should.equal(amount.toString(), "amount is correct");
        event.totalSupply.toString().should.equal(tokens(1000100).toString(), "total supply is correct");
      })
    })

    describe("failure", async () => {
      it('rejects non-minters', async () => {
        amount = tokens(100);
        await token.mint(amount, { from: receiver }).should.be.rejectedWith(EVM_REVERT);
      })
    })
  })
})