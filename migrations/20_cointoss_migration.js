const Cointoss = artifacts.require("Cointoss");

 
module.exports = function(deployer, network, accounts) {
  deployer.deploy(Cointoss).then(function(instance){
		instance.topUp({value: 400000000000000000, from: accounts[1]})
  });
};  