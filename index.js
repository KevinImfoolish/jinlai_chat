const fs = require('fs');
const https = require('https');
const WebSocket = require('ws');
const config = require('./config');
const query = require('./query');
const handleMsg = require('./tools/handlemsg');
const getToken = require('./tools/gettoken');
const isJSON = require('./tools/isjson');
const shuwdownLink = require('./tools/end');
const formatMsg = require('./tools/formatmsg');

const websocketOptions = {
	port: config['websocketport'],
	backlog: config['backlog']
};

var connection = [];
var dataQuery = new query();
var blankFunc = function(err, res){}
const wss = new WebSocket.Server(websocketOptions)
wss.on('error', function(err){
	console.log('wss on err');
	console.log(err);
});

//重启次数
dataQuery.runtimeMsg('runtime:start:-');
//重启时间
dataQuery.runtimeRecord('runtime:start:time-list', blankFunc);

wss.on('connection', function(ws, request){
	//链接数
	dataQuery.runtimeMsg('runtime:connection:all');
	dataQuery.currentServerIsRun(function(err, isRun){
		let wrongResult = {status: 500, error:{message:''},no:1};
		let successResult = {status: 200,result:'success', content:{}, msg:'',no:1}
		if (err || isRun != 1){
			wrongResult.error.message = '聊天服务暂不可用！';
			shuwdownLink(wrongResult, ws);
		} else {
			//token过滤
			let token = getToken(request.url);
			if (token.length > 45 || token.length < 39) {
				wrongResult.error.message = '参数token非法！';
				shuwdownLink(wrongResult, ws);
			}

			// 查询数据回调
			let identityCheck = function(err, result) {
				if (err || result == false) {
					dataQuery.runtimeMsg('runtime:connection:wrongtoken');
					wrongResult.error.message = '身份校验失败！';
					shuwdownLink(wrongResult, ws);
				} else {
					ws.on('pong', function(){
						this.isAlive = true;
					});
					//登陆成功
					console.log('user-login:' + result['utype'] + '=' + result['uid']);
					//用户身份标志
					result.user_idenity = result['utype'] + result['uid'];
					if (connection.hasOwnProperty(result.user_idenity)) {
						wrongResult.error.message = '此账户已经连接';
						wrongResult.no = 60;
						shuwdownLink(wrongResult, ws);
					} else {
						//用户身份信息
						ws.user_type = result;
						ws.isAlive = true;
						ws.count = 0;
						ws.lastReceivce = (new Date()).valueOf();
						//保存用户链接
						connection[result.user_idenity] = ws;
						
						//连接过的用户数 运行状态参数
						dataQuery.runtimeMsg('runtime:connection:successs');
						dataQuery.runtimeMsg('runtime:connection:' + result['utype']);
						dataQuery.maxNumber('runtime:online:all', wss.clients.size, blankFunc);
						ws.on('message', function(message){
							//总共收到的消息数量
							dataQuery.runtimeMsg('runtime:msgcount:all');
							// 所有端口 只允许每秒一次的传递频率

							let msg = isJSON(message);
							// 收到message 文本 图片 产品
							if (msg == false || !msg.hasOwnProperty('type')) {
								//错误消息
								dataQuery.runtimeMsg('runtime:msgcount:errtype');
								wrongResult.error.message = '收到的消息格式错误';
								wrongResult.no = 0;
								delete connection[ws.user_type.user_idenity];
								shuwdownLink(wrongResult, ws);
							} else if (msg['type'] == 'read') {
								//已读信息
								dataQuery.runtimeMsg('runtime:msgcount:read');
								let successUpdate = function(err, saveres) {
									if (err) {
										wrongResult.error.message = '数据异常';
										wrongResult.no = 10;
										shuwdownLink(wrongResult, ws);
									} else {
										//原路返回告诉他收到已读的消息
										successResult['content']= msg[saveres];
										successResult['msg'] = '已读成功';
										successResult['no']  = 3;
										if (ws.readyState == 1 && ws.isAlive) {
											//已读反馈
											dataQuery.runtimeMsg('runtime:sendcount:readback');
											ws.send(JSON.stringify(successResult));
										}

										//检测 要发送的用户是否在线
										//要发送的用户的类型 键值
										let send_to_type = result['utype'] == 'biz' ? 'user' : 'biz';
										let send_to_fd = send_to_type + msg[saveres];
										if (connection.hasOwnProperty(send_to_fd) 
											&& connection[send_to_fd].isAlive
											&& connection[send_to_fd].readyState == 1) {
											successResult['content'] = result['uid'];
											successResult['msg'] = '已被阅读';
											successResult['no'] = 4;
											connection[send_to_fd].send(JSON.stringify(successResult));
											//已读通知
											dataQuery.runtimeMsg('runtime:sendcount:read');
										}
									}
								}
								dataQuery.read(result, msg, successUpdate);
							} else if (msg['type'] == 'text' || msg['type'] == 'item' || msg['type'] == 'image') {
								let currentTime = Date.now();
								if (currentTime - ws.lastReceivce < 1500) {
									wrongResult.error.message = '消息发送过于频繁';
									wrongResult.no = 600;
									ws.send(JSON.stringify(wrongResult), {}, function(){
										delete connection[ws.user_type.user_idenity];
										shuwdownLink(wrongResult, ws);
									});
								} else {
									ws.lastReceivce = currentTime;
									//其它信息
									dataQuery.runtimeMsg('runtime:msgcount:' + msg['type']);
									//对数据
									msg = handleMsg(msg, result);
									let msgSave = function(err, insertID){
										if (err) {
											wrongResult.error.message = '数据格式错误';
											wrongResult.no = 20;
											shuwdownLink(wrongResult, ws);
										} else {
											msg['message_id'] = insertID
											 //原路返回告诉他消息发送成功
											let s_id_key = result['utype'] == 'biz' ? 'user_id' : 'biz_id';
											successResult['content'] = {time_create: msg['time_create'], message_id: insertID};
											successResult['content'][s_id_key] = msg[s_id_key]
											successResult['msg'] = '成功收到消息';
											successResult['no']  = 1;
											if (ws.readyState == 1) {
												//收到反馈
												dataQuery.runtimeMsg('runtime:sendcount:receive');
												ws.send(JSON.stringify(successResult));
											}

											//检测 要发送的用户是否在线
											let send_to_type = result['utype'] == 'biz' ? 'user' : 'biz';
											let send_to_fd = send_to_type + msg[send_to_type + "_id"];
											if (connection.hasOwnProperty(send_to_fd) 
												&& connection[send_to_fd].isAlive
												&& connection[send_to_fd].readyState == 1) {
												let newMsg = formatMsg(result, msg);
												successResult['content'] = [newMsg];
												successResult['msg'] = '新的消息';
												successResult['no']  = 2;
												connection[send_to_fd].send(JSON.stringify(successResult));
												//消息投递
												dataQuery.runtimeMsg('runtime:sendcount:post');
											}
										}
									}  //end msgSave

									// 只有user需要设置最大发送数量
									if (result['utype'] == 'user') {
										let allowReceive = function(err, amount) {
											if (err || amount >= 600) {
												wrongResult.error.message = '每小时最多600条';
												wrongResult.no = 50;
												shuwdownLink(wrongResult, ws);
											} else {
												dataQuery.save(result['utype'], msg, msgSave);
											}
										}
										dataQuery.addReceiveCount(result['utype'] + result['uid'], allowReceive);
									} else { //biz不检测
										dataQuery.save(result['utype'], msg, msgSave);
									}
								}
							} else {
								wrongResult.error.message = '未知的消息类型';
								wrongResult.no = 30;
								shuwdownLink(wrongResult, ws);
							} // msg
						}); // END on message
					} // end if 检查连接
					
				} // END  if verify check
			} //identityCheck

			//身份校验
			dataQuery.checkverify(token, identityCheck);
		}
	}); // end dataQuery currentServerIsRun
	ws.on('close', function(code, err) {
		if (ws.hasOwnProperty('user_type') && connection.hasOwnProperty(ws.user_type.user_idenity)) {
			console.log(ws.user_type.user_idenity);
			console.log(ws.user_type.user_idenity + ' is closed');
			delete connection[ws.user_type.user_idenity];
		}
		ws.terminate();
	});
	ws.on('error', function(err) {
		console.log('ws is on error');
		try {
			ws.terminate();
		} catch (exc) {
			console.log(exc);
		}
	});
});
process.on('uncaughtException', uncaughtExceptionHandler);
function uncaughtExceptionHandler(err){
	console.log(err.code)
    if(err && err.code == 'ECONNREFUSED'){
        //do someting
        console.log(err.code)
    } else {
    	console.log(err)
        // process.exit(1);
    }
}

const heartBeatCheck = setInterval(function check(){
	wss.clients.forEach(function each(ws) {
		if (ws.isAlive == false) {
			delete connection[ws.user_type.user_idenity];
			ws.terminate();
		} else {
			ws.isAlive = false;
			ws.ping(function() {

			});
		}
	});
	let ms = process.memoryUsage();
	dataQuery.addTimeLong('runtime:inservice:start', blankFunc);
	dataQuery.runtimeMemory('runtime:memoryusage', ms.rss, blankFunc);
	dataQuery.currentOnline('runtime:online:current', wss.clients.size, blankFunc);
	dataQuery.maxNumber('runtime:online:all', wss.clients.size, blankFunc);
}, 30000)