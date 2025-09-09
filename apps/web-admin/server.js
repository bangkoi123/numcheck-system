const http = require('http');
const PORT = process.env.PORT || 3002;
const srv = http.createServer((req,res)=>{
  if (req.url === '/healthz') {
    res.writeHead(200, {'Content-Type':'application/json'});
    return res.end(JSON.stringify({ok:true, service:'web-admin'}));
  }
  res.writeHead(200, {'Content-Type':'text/plain'});
  res.end('web-admin placeholder');
});
srv.listen(PORT, ()=>console.log('web-admin listening on', PORT));
