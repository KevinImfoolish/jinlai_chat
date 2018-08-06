let config = {
	environment: 'dev',
	websocketport: 2989,
	backlog: 1024,
	mysql_config: {
		host: 'sensestrong.mysql.rds.aliyuncs.com',
		user: 'huangxin',
		password: 'Huangxin2261',
		database: 'jinlai',
		port: '3306',
	},
	redis_config:{
		host: '127.0.0.1',
		port: '6379',
		database: 0,
		timeout: 4
	}
};
module.exports = config;