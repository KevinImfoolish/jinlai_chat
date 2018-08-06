module.exports = function(info, msg){
	let data = {}
	if (info['utype'] == 'biz') {
		data['biz_id'] = info['uid'];
		data['url_logo']  = info['uimg'];
		data['brief_name']  = info['uname'];
		
	}
	if (info['utype'] == 'user') {
		data['user_id'] = info['uid'];
		data['avatar']  = info['uimg'];
		data['nickname']  = info['uname'];
	}
	data['list'] = {
		message_id: msg['message_id'],
		content: msg['content'],
		type: msg['type'],
		time_create: msg['time_create'],
		chat: 'receive',
	};
	console.log(msg['create_time']);
	return data;
}