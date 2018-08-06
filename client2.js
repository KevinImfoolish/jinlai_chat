var ws = new WebSocket("wss://biz.517ybang.com/jinlai_chat?token=b0489d0fc4dc77ef4262c2fbe1309d631842a5de")
                
ws.onopen = function(){
   //is biz 2
   console.log('链接打开')
}
 
ws.onmessage = function (evt) { 
   //var received_msg = evt.data;
   console.log(evt)
};

ws.onclose = function(){ 
   console.log('close')
}
