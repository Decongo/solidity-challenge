pragma solidity >=0.4.22 <0.9.0;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract RewardToken {
  using SafeMath for uint;
  
  string public name = "RewardToken";
  string public symbol = "RTK";
  uint256 public decimals = 18;
  uint256 public totalSupply;
  address[] public minters;             // array of valid minters

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Mint(address indexed minterAddress, uint256 amount, uint256 totalSupply);

  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  constructor() public {
    totalSupply = 1000000 * (10 ** decimals);
    balanceOf[msg.sender] = totalSupply;
    addMinter(msg.sender);
  }

  // Adds a new minter. Can only be called by a current minter.
  function addMinter(address newMinter) public returns (bool success) {
    require(isMinter(msg.sender) || minters.length == 0, 'not allowed to add minter');
    minters.push(newMinter);
    return true;
  }


  function transfer(address _to, uint256 _value) public returns(bool success) {
    require(balanceOf[msg.sender] >= _value, "value must be less-than or equal-to the total funds");
    _transfer(msg.sender, _to, _value);
    return true;
  }


  function _transfer(address _from, address _to, uint256 _value) internal {
    require(_to != address(0), "recipient must be a valid address");
    // decrease sender's balance
    balanceOf[_from] = balanceOf[_from].sub(_value);
    // increase receiver's balance
    balanceOf[_to] = balanceOf[_to].add(_value);
    emit Transfer(_from, _to, _value);
  }


  function approve(address _spender, uint256 _value) public returns(bool success) {
    require(_spender != address(0), "recipient must be a valid address");
    allowance[msg.sender][_spender] = _value;

    emit Approval(msg.sender, _spender, _value);
    return true;
  }


  function transferFrom(address _from, address _to, uint256 _value) public returns(bool success) {
    require(_value <= balanceOf[_from], "value must not be greater than balance");
    require(_value <= allowance[_from][msg.sender], "value must not be greater than allowance");
    allowance[_from][msg.sender] = allowance[_from][msg.sender].sub(_value);
    _transfer(_from, _to, _value);
    return true;
  }


  function mint(uint _amount) public returns(bool success) {
    address minter = msg.sender;

    // verify that sender is a minter
    require(isMinter(minter), 'not a minter');

    // add tokens to sender's balance
    balanceOf[minter] = balanceOf[minter].add(_amount);

    // add tokens to total supply
    totalSupply = totalSupply.add(_amount);
    
    emit Mint(minter, _amount, totalSupply);
    return true;
  }


  function isMinter(address sender) private view returns(bool success) {
    bool valid = false;
    for (uint i = 0; i < minters.length; i++) {
      if (sender == minters[i]) {
        valid = true;
        break;
      }
    }

    return valid;
  }
}