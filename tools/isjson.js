module.exports = function(msg, curentclient){
	try {
		let receiveData = JSON.parse(msg);
		if ( typeof receiveData !== 'object') {
			return false;
		}
		return receiveData;
	} catch (Exception) {
		return false;
	}
	
}