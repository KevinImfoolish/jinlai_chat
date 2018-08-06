 module.exports = function () {
	let mysql = require('./model/mysql_model');
	let mysqlClient = new mysql();

	let redis = require('./model/redis_model');
    let redisClient = new redis();
   	this.save = function (utype, val, callback) {
   		//不同用户允许保存的字段值
   		let tableRow = [];
   		if (utype == 'biz') {
   			tableRow = ['-', 's_biz_id', 'user_id', 'type', 'content', 'sender_type', 'receiver_type', 'time_create','creator_id','-'];
   		} else {
   			tableRow = ['-', 's_user_id', 'biz_id', 'type', 'content', 'sender_type', 'receiver_type', 'time_create','creator_id','-'];
   		}
   		let checkRow = tableRow.join('-');
   		let rowArr = [], valArr = [], _blank = [];
   		let typeMap = '-text-image-item-';
   		let res = true;
   		//检查字段
   		for (keys in val){
   			// 字段不允许
   			if (tableRow.indexOf(keys) === -1) {
   				res = false;
   				break;
   			}
   			// 数值类型
   			if (keys.indexOf('_id') > -1 && isNaN(parseInt(val[keys]))) {
				res = false;
				break;
   			}
   			//列名
   			//值
   			//?占位符
   			rowArr.push( '`' + keys + '`');
   			valArr.push(val[keys]);
   			_blank.push('?');
   		}
   		if (isNaN(parseInt(val['time_create']))) {
   			res = false;
   		}
   		if (typeMap.indexOf(val['type']) === -1) {
   			res = false;
   		}
   		if (typeof(val['content']) != 'string') {
   			res = false
   		} else {
   			val['content'] = trim(val['content']);
	   		if (val['content'] == '') {
	   			res = false;
	   		}
   		}
   		
   		if (!res) {
   			callback('wrong row!', null);
   		} else {
   			let sql = 'insert into `message` (' + rowArr.join(',') +') values(' + _blank.join(',') + ')'
	   		mysqlClient.query(sql, valArr, function(err, results) {
	   			if (err) {
	   				callback(err, null);
	   			} else {
	   				results = JSON.stringify(results);//把results对象转为字符串，去掉RowDataPacket
	   				if (results === false) {
						callback('no results', null);
					} else {
						callback(null, JSON.parse(results)['insertId']);	
					}
	   			}
	   		});
   		}
   		
   	}
	this.checkverify = function (val, callback) {
		// let mysql_query = function(token, cb){
		// 	let sql = 'select * from `ws_verify` where token=?'
		// 	mysqlClient.query(sql, [token], function(err, results){
		// 		if (err) {
		// 			cb('mysql error', false);
		// 		} else {
		// 			results = JSON.stringify(results);//把results对象转为字符串，去掉RowDataPacket
		// 			if (results === false || results.length == 2) {
		// 				cb('no results', null);
		// 			} else {
		// 				cb(null, JSON.parse(results)[0]);	
		// 			}
		// 		}
		// 	});
		// }
	    // 暂时设定只读取 redis 的token，减少mysql
		redisClient.gethash(val, function(error, res){
			if (error) {
				console.log('redis-read error');
				callback('redis-read error', false);
				//mysql_query(val, callback);
			} else if (res == null) {
				console.log('redis-read none');
				callback('redis-read none', false);
				//mysql_query(val, callback)
			} else {
				callback(null, res)
			}
		});
	
		
		
  		//console.log(results);//'[{"count":"1","type":"RangeError"},{"count":"3","type":"ReferenceError"}]'
  		//results = JSON.parse(results);//把results字符串转为json对象
	};

	this.read = function(uinfo, msg, callback) {
		let sent_key = uinfo['utype'] == 'biz' ? 's_user_id' : 's_biz_id';
		if (!msg.hasOwnProperty(sent_key) || isNaN(parseInt(msg[sent_key]))){
			callback('wrong value', null);
		} else {
			let	whoSent = '`' + sent_key + '`=' + msg[sent_key];
			let whoRead = '`' + uinfo['utype'] + '_id`=' + uinfo['uid'];
			let sql = 'update message set `read`=2 where ' + whoSent + ' and ' + whoRead;
			mysqlClient.query(sql, function(err, result){
				if(err) {
					callback('mysql wrong', null);
				} else {
					callback(null, sent_key);
				}
			});
		}
	}


	this.currentServerIsRun = function(callback) {
		redisClient.get('websocket:useful', function(err, result) {
			if (err) {
				console.log(err)
				console.log( __filename + ' REDIS goes RWONG');
				callback(true, null);
			} else {
				callback(false, parseInt(result));
			}
		})
	}

	this.addReceiveCount = function(who, callback) {
		let aDate = new Date();
		let str = aDate.getMonth() + '-' + aDate.getDate() + '-' + aDate.getHours();
		who = who + str;
		redisClient.increase(who, 1, true, function(err, res){
			if (err) {
				console.log( __filename + ' REDIS goes RWONG');
				callback(true, null);
			} else {
				callback(false, parseInt(res));
			}
		})
	}
	this.addTimeLong = function(who, callback) {
		redisClient.increase(who, 30, false, function(err, res){
			if (err) {
				console.log( __filename + ' REDIS goes RWONG');
				callback(true, null);
			} else {
				callback(false, parseInt(res));
			}
		})
	}

	this.runtimeMsg = function(type) {
		redisClient.runtimeCount(type, function(err, res){
		})
	}

	this.maxNumber = function(key, value, cb) {
		redisClient.get(key, function(err, res){
			if (isNaN(parseInt(res))) {
				cb(true, false);
			} else {
				if(parseInt(res) < value) {
					redisClient.set(key, value, function(error, result){
						if(error){
							cb(true, false);
						} else {
							cb(false, result);
						}
					})
				} else {
					cb(false, true);
				}
			}
		});
	}

	this.runtimeRecord = function(key, cb) {
		let dateObj = new Date();
		let str = dateObj.getFullYear() + '-' + dateObj.getMonth() + '-' + dateObj.getDate() + ' ' + (dateObj.getHours() + 1) + ':' + dateObj.getMinutes() + ':' + dateObj.getSeconds();
		redisClient.insert(key, str, function(err, res){
			if (err) {
				cb(true, false);
			} else {
				cb(false, res);
			}
		})
	}
	this.runtimeMemory = function(key, rss, cb) {
		rss = rss / 1024 / 1024;
		rss = parseInt(rss)
		redisClient.set(key, rss, function(err, res){
			if (err) {
				cb(true, false);
			} else {
				cb(false, res);
			}
		})
	}
	this.currentOnline = function(key, value, cb) {
		redisClient.set(key, value, function(err, res){
			if (err) {
				cb(true, false);
			} else {
				cb(false, res);
			}
		})
	}
	function trim(str){
		let trimLeft = /^\s+/,
	        trimRight = /\s+$/;
	    return str.replace(trimLeft, "").replace(trimRight, "");
	}
	

}
	
 
