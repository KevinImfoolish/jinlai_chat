

module.exports = function(){
	const config = require('../config.js');

	let redis = require('redis');

	let client = redis.createClient({
		port: config['redis_config']['port'], 
		host: config['redis_config']['host'],
		retry_strategy: function(options){
			console.log(options);
			if (options.error && options.error.code === 'ECONNREFUSED') {
				process.exit('redis is refused');
			}
			if(options.total_retry_time > 20) {
				process.exit('redis retry too long');
			}
			if(options.attempt > 10) {
				process.exit('redis retry too many');
			}
			// reconnect after 
        	return Math.max(options.attempt * 100, 3000);
		}
	});
	client.select(config['redis_config']['database'], function(err){
		if(err){
			console.log('redis-select error');
		}
	});
	client.on("error", function (err) {
	   process.exit('redis on error');
	});


	this.set = function(key, data, cb){
		client.set(key, data, function(err, res){
			if (res == null) {
				cb('no result', null)
			} else {
				cb(null, res)
			}
		});
	};
	
	this.get = function(key, cb){
		client.get(key, function(err, res){
			if (res == null) {
				cb('no result', null)
			} else {
				cb(null, res)
			}
		});
	};

	this.gethash = function(key, cb) {
		client.hgetall(key, function(err, res) {
			
			if (res == null) {
				cb('no result', null)
			} else {
				cb(null, res)
			}
		});
	}

	this.increase = function(key, value, expire, cb) {
		client.incrby(key, value , function(err, res){
			if (err) {
				cb('wrong', null);
			} else {
				if (expire) {
					let dateObj = new Date();
					let str = dateObj.getFullYear() + '-' + dateObj.getMonth() + '-' + dateObj.getDate() + ' ' + (dateObj.getHours() + 1) + ':00:00';
					let lstime = (new Date(str)).getTime();
					lstime = lstime / 1000;
					client.expire(key, lstime, function(error, result){
						if( error) {
							cb('wrong', null);
						} else {
							console.log('with message limit');
							cb(false, result);
						}
					})
				} else {
					if(err) {
						cb('wrong', null);
					} else {
						cb(false, res);
					}
				}
			}
		})
	}

	this.runtimeCount = function(key, cb){
		client.incrby(key, 1 , function(err, res){
			if (err) {
				cb('wrong', null);
			} else {
				cb(false, res);
			}
		});
	}

	this.insert = function(key, value, callback) {
		client.lpush(key, value, function(err, res){
			if( err) {
				callback(true, false);
			} else {
				callback(false, true);
			}
		})
	}
}