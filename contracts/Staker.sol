pragma solidity >=0.4.22 <0.9.0;

import "./RewardToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Staker {
  using SafeMath for uint256;

  address[] public stakers;                         // Accounts that have deposited tokens
  mapping(address => uint256) public tokens;        // balances of accounts
  uint256 public blockNumber;                       // the block number of the last rewards payout
  address public minter;                            // the account that can use the mint() function
  uint256 public totalBalance;                      // the total number of tokens staked

  event Deposit(address user, uint256 amount, uint256 balance);
  event Withdraw(address user, uint256 amount, uint256 balance);
  event DistributeRewards(address user, uint256 amount, uint256 totalRewards, uint256 accountBalance, uint256 oldTotalBalance);


  constructor() public {
    blockNumber = block.number;
    minter = msg.sender;
  }


  function depositToken(address _token, uint256 _amount) public {
    // check if user has deposited before: if not, set flag to add user as staker
    bool addStaker = tokens[msg.sender] == 0;

    // attempt transfer
    require(RewardToken(_token).transferFrom(msg.sender, address(this), _amount), "tokens were not deposited");

    // manage deposit - update balance
    tokens[msg.sender] = tokens[msg.sender].add(_amount);

    // add to total balance
    totalBalance = totalBalance.add(_amount);

    // add staker if needed
    if (addStaker) {
      stakers.push(msg.sender);
    }

    // emit event
    emit Deposit(msg.sender, _amount, tokens[msg.sender]);
  }


  function withdrawToken(address _token, uint256 _amount) public {
    // check funds
    require(tokens[msg.sender] >= _amount, 'insufficient balance; cannot withdraw tokens');

    // perform transfer and subtract amount from balance
    require(RewardToken(_token).transfer(msg.sender, _amount), 'token transfer failed');
    tokens[msg.sender] = tokens[msg.sender].sub(_amount);

    // manage totalBalance
    totalBalance = totalBalance.sub(_amount);

    // emit event
    emit Withdraw(msg.sender, _amount, tokens[msg.sender]);
  }


  function balanceOf(address _user) public view returns(uint256) {
    return tokens[_user];
  }


  function mint(address _token, uint256 _amount) public {
    require(RewardToken(_token).mint(_amount), 'token mint failed');
    totalBalance = totalBalance.add(_amount);
  }


  function updateBlockNumber() public {
    blockNumber = block.number;
  }


  function distributeRewards(address _token) public returns(bool success) {
    // check if block number increased
    uint oldBlockNumber = blockNumber;
    updateBlockNumber();
    if (oldBlockNumber == blockNumber) return false;

    uint oldTotalBalance = totalBalance;

    // mint 100 new coins per block
    uint numBlocks = blockNumber - oldBlockNumber;
    uint amount = numBlocks * 100 * (10 ** 18);
    mint(_token, amount);

    // distribute new tokens among token holders
    uint portion;
    uint ratio;
    address staker;
    for (uint i = 0; i < stakers.length; i++) {
      staker = stakers[i];
      require(staker != address(0), 'staker does not exist');

      ratio = tokens[staker].mul(100) / oldTotalBalance;
      require(tokens[staker] != 0, 'no tokens');
      require(oldTotalBalance != 0, 'no contract balance');
      // require(ratio != 0, 'ratio is 0');

      portion = amount.mul(ratio).div(100);
      // require(portion > 0, 'no rewards');

      tokens[staker] = tokens[staker].add(portion);
      emit DistributeRewards(staker, portion, amount, tokens[staker], oldTotalBalance);
    }

    return true;
  }
}