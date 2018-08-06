module.exports = function(msg, curentclient){
		//统一处理
		msg['s_' + curentclient['utype'] + '_id'] = curentclient['uid'];
		msg['sender_type'] = curentclient['utype'];
		msg['receiver_type'] = curentclient['utype'] == 'biz' ? 'user' : 'biz';
		msg['creator_id'] = curentclient['uid'];
		return msg;
}