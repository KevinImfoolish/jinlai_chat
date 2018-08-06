var ws = new WebSocket("ws://127.0.0.1:2989?token=5d265742b6367563a6643567630004b441b0af81")
                
ws.onopen = function(){
   //is biz 2
   console.log('链接打开267')
}
 
ws.onmessage = function (evt) { 
   //var received_msg = evt.data;
   console.log(evt.data)
};

ws.onclose = function(){ 
   console.log('close')
}
