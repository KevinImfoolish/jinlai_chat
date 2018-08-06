
var ws = new WebSocket("ws://localhost:2989?token=26a8b6234af1a0bbc16c6582d3811797b8da1310")
                
ws.onopen = function(){
   //is client
   console.log('链接打开')
}
 
ws.onmessage = function (evt) { 
   //var received_msg = evt.data;
   console.log(evt)
   console.log(evt.data)
};

ws.onclose = function(){ 
   console.log('close')
}