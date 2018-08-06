module.exports = function(returnVal, clink) {
	if (clink.readyState == 1) {
		clink.send(JSON.stringify(returnVal));
	}
	clink.terminate();
}