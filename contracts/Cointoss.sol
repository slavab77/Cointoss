pragma solidity 0.5.12;
import "./Ownable.sol";
import "./provableAPI.sol";
//import "github.com/provable-things/ethereum-api/provableAPI.sol";

contract Cointoss is Ownable, usingProvable{
	
	uint public balance;
	uint public testInt;
	
	uint256 NUM_RANDOM_BYTES_REQUESTED = 1;
	uint public latestNumber;
	
	struct BetSummary {
      uint id;
	  uint totalBets;
      uint totalWins;
	  uint profit;
	  uint256 currentBetSide;
	  uint currentBetAmount;
    }
	
	
	mapping (address => BetSummary) private bets;
    address[] private gamblers;
	
	mapping (bytes32 => address) private query2address;
    bytes32[] private oracleQueries;

    modifier costs(uint cost){
        require(msg.value >= cost);
        _;
    }
	
	event betAdded(uint betNumber, uint256 side);
	event betResolved(address gambler, bool win);
	event topUpSuccessful(uint newBalance);
	event topUpUnsuccessful(uint newBalance);
	event logNewProvableQuery(string description);
	event generatedRandomNumber(uint256 randomNumber);
	event profitWithdrawn(uint amount);
	event LogNewProvableQuery(bytes32 queryId);
	event proofVerificationFailed(bytes32 queryId);
	event betReverted(address gambler);
	
	//event testowy(address n1, uint256 n2);
	//event testowy2(address n1, uint256 n2);

	function getBalance() public view returns (uint){
		return balance;
	}
    
	
	function topUp() public payable returns (uint) {
		uint oldBalance = balance;
		balance += msg.value;
		if (balance > oldBalance) {
			emit topUpSuccessful(balance);
			return balance;
		}
		emit topUpUnsuccessful(balance);
		return balance;
   }
	
	
/* 	function random() public view returns (uint) {
		return now % 2;
	} */
	
	
	function random() payable public returns (bytes32) {
		uint256 QUERY_EXECUTION_DELAY = 0;
		uint256 GAS_FOR_CALLBACK = 4000000;
		bytes32 queryId = provable_newRandomDSQuery(QUERY_EXECUTION_DELAY, NUM_RANDOM_BYTES_REQUESTED, GAS_FOR_CALLBACK);
		emit LogNewProvableQuery(queryId);
		return queryId;
	}
	
	
 	function withdrawAll() public onlyOwner returns(uint) {
       uint toTransfer = balance;
       balance = 0;
       msg.sender.transfer(toTransfer);
       return toTransfer;
    }
	
	
	function withdrawProfit() public returns(uint) {
       uint toTransfer = bets[msg.sender].profit;
       bets[msg.sender].profit = 0;
       msg.sender.transfer(toTransfer);
	   emit profitWithdrawn(toTransfer);
       return toTransfer;
    }
   
	
  	function createBet(uint256 side) public payable costs(100000000000000000 wei)  {
		require((side == 0 || side  == 1), "Side has to be either Heads or Tails");
		require(balance >= msg.value*2, 'Contract balance too small to cover a win');
		
		balance += msg.value;
		address gambler = msg.sender;
  		BetSummary memory newBetSummary = bets[gambler];
		newBetSummary.totalBets = newBetSummary.totalBets + 1;
		newBetSummary.currentBetSide = side;
		newBetSummary.currentBetAmount = msg.value;
		
        bets[gambler] = newBetSummary;
		gamblers.push(gambler);
		
		assert(
            keccak256(
                abi.encodePacked(
                    bets[gambler].totalBets,
                    bets[gambler].currentBetSide
                    , bets[gambler].currentBetAmount
                )
            )
            ==
            keccak256(
                abi.encodePacked(
                    newBetSummary.totalBets,
                    newBetSummary.currentBetSide
                    , newBetSummary.currentBetAmount
                )
            )
        );  
		
		//bytes32 queryId = testRandom();
		provable_setProof(proofType_TLSNotary | proofStorage_IPFS);
		bytes32 queryId = random();
		query2address[queryId] = gambler;
		oracleQueries.push(queryId);
		
		emit betAdded(newBetSummary.totalWins, side);
	}  

	
	function getBetSummary() public view returns(uint totalBets, uint totalWins, uint profit, uint256 currentBetSide, uint currentBetAmount) {
		address gambler = msg.sender;
		return (bets[gambler].totalBets, bets[gambler].totalWins, bets[gambler].profit, bets[gambler].currentBetSide, bets[gambler].currentBetAmount);
	}


	function __callback(bytes32 _queryId, string memory _result, bytes memory _proof) public {
		require(msg.sender == provable_cbAddress());
		if (provable_randomDS_proofVerify__returnCode(_queryId, _result, _proof) != 0) {
			emit proofVerificationFailed(_queryId);
            revertBet(_queryId);
        } else {
			uint256 randomNumber = uint(keccak256(abi.encodePacked(_result))) % 2;
			latestNumber = randomNumber;
			resolveBet(_queryId, randomNumber);	
			emit generatedRandomNumber(randomNumber);
		}
	}
	
	
	function resolveBet(bytes32 queryId, uint256 tossResult) private {
		address gambler = query2address[queryId];
		BetSummary memory existingBetSummary = bets[gambler];
		
		if(existingBetSummary.currentBetSide == tossResult)	{
			balance -= existingBetSummary.currentBetAmount*2;
			existingBetSummary.totalWins = existingBetSummary.totalWins + 1;
			existingBetSummary.profit = existingBetSummary.profit + existingBetSummary.currentBetAmount*2;
			existingBetSummary.currentBetAmount = 0;
			msg.sender.transfer(existingBetSummary.currentBetAmount*2);
			bets[gambler] = existingBetSummary;
			emit betResolved(gambler, true);
		}
		else {	
			existingBetSummary.currentBetAmount = 0;	
			bets[gambler] = existingBetSummary;
			emit betResolved(gambler, false);
		}
		
 		assert(
            keccak256(
                abi.encodePacked(
                    bets[gambler].totalWins,
                    bets[gambler].profit,
                    bets[gambler].currentBetAmount
                )
            )
            ==
            keccak256(
                abi.encodePacked(
                    existingBetSummary.totalWins,
                    existingBetSummary.profit,
                    existingBetSummary.currentBetAmount
                )
            )
        );  
   
	}
	
	function revertBet(bytes32 queryId) private {
		address gambler = query2address[queryId];
		BetSummary memory existingBetSummary = bets[gambler];
		balance -= existingBetSummary.currentBetAmount;
		existingBetSummary.profit = existingBetSummary.profit + existingBetSummary.currentBetAmount;
		existingBetSummary.currentBetAmount = 0;
		bets[gambler] = existingBetSummary;
		emit betReverted(gambler);
	}
	
	
/* 	function testRandom() public returns (bytes32) {
		bytes32 queryId = bytes32(keccak256(abi.encodePacked(msg.sender)));
		__callback(queryId, "1", bytes("test"));
		return queryId;
	} */
	
	
	
}