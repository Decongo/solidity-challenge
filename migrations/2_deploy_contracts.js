const RewardToken = artifacts.require("RewardToken");
const Staker = artifacts.require("Staker");

module.exports = function (deployer) {
  deployer.deploy(RewardToken);
  deployer.deploy(Staker);
};
