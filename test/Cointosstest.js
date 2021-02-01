const Cointoss = artifacts.require("Cointoss");
const truffleAssert = require("truffle-assertions");
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
};


contract("Cointoss", async function(accounts) {
	
	let instance;
	
 	beforeEach(async function() {
		instance = await Cointoss.new();
		await instance.topUp({value: web3.utils.toWei("1", "ether"), from: accounts[0]});
	}); 
 
 	
   	it("should be possible to register a new bet", async function() {
		const C_SIDE = 1;
		//instance = await Cointoss.deployed();
		let b = await web3.eth.getBalance(instance.address).then(result => parseInt(result));
		console.log('B: ' + b);
		betsBefore = await instance.getBetSummary({from: accounts[1]});
		console.log('NUMBER BEFORE: ' + betsBefore[0]);
		await instance.createBet(C_SIDE, {value: 100000000000000000, from: accounts[1]});
		bets = await instance.getBetSummary({from: accounts[1]});
		console.log('NUMBER NOW: ' + bets[0]);
		assert(bets[0] > betsBefore[0], "Bet wasn't registered correctly!");
	});  
	
  	it("should be possible to resolve a bet", async function() {
		const C_SIDE  = 1;
		//instance = await Cointoss.deployed();
		betsBefore = await instance.getBetSummary({from: accounts[1]});
		let b4_wins = parseInt(betsBefore[1]);
		let b4_profit = parseInt(betsBefore[2]);
		let b4_balance = await web3.eth.getBalance(instance.address).then(result => parseInt(result));
		await instance.createBet(C_SIDE, {value: 100000000000000000, from: accounts[1]});
		
 		bets = await instance.getBetSummary({from: accounts[1]});
		let wins = parseInt(bets[1]);
		let profit = parseInt(bets[2]);
		let balance = await web3.eth.getBalance(instance.address).then(result => parseInt(result));
		console.log(wins + " / " + b4_wins + " / " + profit + " / " + b4_profit + " / " + balance + " / " + b4_balance);
		assert((((wins > b4_wins) && (profit > b4_profit) && (balance < b4_balance)) || ((wins == b4_wins) && (profit == b4_profit) && (balance > b4_balance))), "Bet wasn't resolved correctly!"); 
	}); 
	
	it("shouldn't be able to withdraw all funds by non-owner", async function() {
		//instance = await Cointoss.deployed();
		await truffleAssert.fails(
			instance.withdrawAll({from: accounts[1]}),
			truffleAssert.ErrorType.REVERT
		);
		
	}); 
	
	 it("should be able to withdraw all funds by owner", async function() {
		//instance = await Cointoss.deployed();
		await instance.withdrawAll({from: accounts[0]});
		balance = await web3.eth.getBalance(instance.address).then(result => parseInt(result));
		balance2 = await instance.getBalance().then(result => parseInt(result));
		assert(balance === 0, 'Withdrawal failed');
	}); 
	
	 
	
	

})