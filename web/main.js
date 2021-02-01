var web3 = new Web3(Web3.givenProvider);
var contractInstance;
//var address = "0x4F0E04fF694003eFd486452D612C28c9CC491E8e";
//var address = "0xa0ca8DEA0f51C254f9782d3AAfeB2D5b8D17b3b1";
var address = "0x4b674fCe595151445D78DF98819534d44740681C";
var socketInstance;


function showMessage(messageType, messageText) {
	$('#messages').removeClass();
	$('#messages').addClass("alert");
	$('#messages').addClass(messageType);
	$('#messages').text(messageText);
	$('#messages').css("visibility", "visible");
}

function toEth(val) {
	return parseInt(val)/1000000000000000000;
}

$(document).ready(function() {
	$('#messages').css("visibility", "hidden");
     window.ethereum.enable().then(function(accounts){
      contractInstance = new web3.eth.Contract(abi, address, {from: accounts[0]});
	  sessionStorage.setItem('gambler', web3.utils.toChecksumAddress(accounts[0]));
    });
	
    $("#btn_place_bet").click(placeBet);
    $("#btn_get_summary").click(fetchAndDisplay);
	$("#btn_withdraw").click(withdrawProfit);
	$("#btn_withdraw_all").click(withdrawAll);

});


function placeBet(){
  let gambler = sessionStorage.getItem('gambler');	
  $('#messages').css("visibility", "hidden");	
  var amount = $("#bet_amount_slider").val();
  var radioValue = $("input[name='optradio']:checked").val();
  //console.log(amount);
  if(radioValue == null) {
	  showMessage('alert-danger', 'You have to select side of the coin to bet on!');
	  return;
  }
  console.log(radioValue);
  showMessage('alert-info', 'Your bet is being placed...');
   contractInstance.methods.createBet(radioValue).send({value: amount*1000000000000000000})
  .on('error', console.error);
  
  contractInstance.events.betAdded({})
    .on('data', async function(event){
		showMessage('alert-info', 'Your bet was placed. We are tossing the coin right now.');
    })
	.on('error', console.error);

	contractInstance.events.betResolved({})
    .on('data', async function(event){
		showMessage('alert-info', 'Your bet was placed. We are tossing the coin right now.');
        console.log(event.returnValues);
 		//console.log('WIN: ' + event.returnValues.win);
		//console.log('GAMBLER: ' + gambler);
		//console.log('GAMBLER - EVENT: ' + event.returnValues.gambler);
		if(gambler === web3.utils.toChecksumAddress(event.returnValues.gambler)) {
			if(event.returnValues.win) {
				//console.log('TADA');
				showMessage('alert-success', 'You won! Congratulations!');
			}
			else {
				//console.log('TADA2');
				showMessage('alert-dark', 'You lost! Better luck next time!');
			}
		}
		fetchAndDisplay();
    })
	
	contractInstance.events.betReverted({})
    .on('data', async function(event){
        //console.log(event.returnValues);
		if(gambler === web3.utils.toChecksumAddress(event.returnValues.gambler)) {
			showMessage('alert-danger', 'Your bet has been cancelled. Betted amount was added to your profit pool.');
		}
    })
	
	
  }
  
 function fetchAndDisplay(){
  contractInstance.methods.getBetSummary().call().then(function(res){
    displayInfo(res);
  });
}

function withdrawProfit(){
  if($("#profit").text() == "0") {
	  showMessage('alert-danger', 'There are no funds to withdraw!');
  }	
  else {
	  contractInstance.methods.withdrawProfit().send().then(function(amount){
		showMessage('alert-info', 'Withdrawing funds...');
	  })
	contractInstance.events.profitWithdrawn({})
    .on('data', async function(event){
		showMessage('alert-success', 'Your profits were withdrawn (' + toEth(event.returnValues.amount) + ' ETH).');
    })
	.on('error', console.error);
  };
}

function withdrawAll(){
  contractInstance.methods.withdrawAll().send().then(function(amount){
	showMessage('alert-info', 'Withdrawing funds...');
  })
 .on('error', console.error);

}


function displayInfo(res){
  let currentBetSide = ((res["currentBetAmount"] == 0) ? 'None' : ((res["currentBetSide"]) == 1 ? 'Heads' : 'Tails') );	
  let profit = toEth(res["profit"]);
  $("#totalBets").text(res["totalBets"]);
  $("#totalWins").text(res["totalWins"]);
  $("#profit").text(profit);
  $("#currBetSide").text(currentBetSide);
  $("#currBetAmount").text(res["currentBetAmount"]);

} 