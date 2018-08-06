
module.exports = function(fullurl) {
	let start = fullurl.indexOf('?')
	if (start == -1) {
		return '';
	}
	let end = fullurl.indexOf('&') == -1 ? fullurl.length : fullurl.indexOf('&');

	try {
		return fullurl.substring(start + 7, end);
	} catch (Exception) {
		return '';
	}
	
}