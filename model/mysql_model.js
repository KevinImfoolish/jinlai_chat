

module.exports = function () {
	let mysql  = require('mysql');

	const config = require('../config');

	let pool = mysql.createPool({
		host: config['mysql_config']['host'],
		user: config['mysql_config']['user'],
		password: config['mysql_config']['password'],
		database: config['mysql_config']['database'],
		port: config['mysql_config']['port'],
		queueLimit: 0,
		timeout: 3
	});

	this.query = function (sql, values, callback) {
		try {
			pool.getConnection(function(err, conn){
				
				if (err) {
					throw err;
				} else {
					conn.on('error', function(conerr) {
						console.error('pool is on error')
					  	console.log(conerr.code); // 'ER_BAD_DB_ERROR'
					  	conn.end();
					  	throw conerr;
					});
					conn.query(sql, values, function(err, results, fields){
						//释放链接
						conn.release();
	  				
						callback(err, results, fields)
					})
				}
			})
		} catch (exc) {
			callback(true, false, false);
		}

	}
}