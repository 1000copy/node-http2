http/2 协议刚刚发布不久，http1.1的服务器和客户端依然大量存在，新老协议必定长期共存一段时间。这样，浏览器和服务器就需要协商使用何种协议进行通讯。

主流的方法是使用ALPN或者NPN来做协商。

Next Protocol Negotiation (NPN)是一个使SPDY在TLS服务器上对使用何种应用层协议进行协商的协议。IETF（h2的标准化组织）拿到这个，肯定要改改，然后盖个章，把它变成标准。名字也改了叫ALPN（Application Layer Protocol Negotiation）。

区别是有的。就在于谁持有会话协议的决定权。ALPN是由客户端给服务器发送一个协议清单，由服务器来最终选择一个。而NPN则正好相反。

Node 已经在tls模块内实现了NPN支持。只要创建tls服务器(createServer)，在options参数内传递服务器支持的协议清单NPNProtocols，在客户端连接（connect)传递NPNProtocols，这样建立连接后，就可以在socket.npnProtocol内得到协商的结果。

参考 ：

     node: [tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback)
     node: [tls.createServer](https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener)
词条对两个函数的说明。

请看mocha测试用例：

```
describe('tls', function() {
    it('npn', function() {      
     var fs = require('fs');
        var path = require('path');
        var tls = require('tls');
        tls.createServer({
          key: fs.readFileSync("example/localhost.key"),// 私有键
          cert: fs.readFileSync("example/localhost.crt"),// 证书
          NPNProtocols: ['h2', 'http 1.1','http 1.0'] // 服务器支持协议清单
        }, function(socket) {
          console.log("s1:"+socket.npnProtocol);// 协商结果
        }).listen(1111);
        //client
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      tls.connect({ port: 1111 }, function() {
      });
      tls.connect({ port: 1111 ,NPNProtocols: ['h2'] }, function() {     
      });
      tls.connect({ port: 1111, NPNProtocols: ['http 1.1'] }, function() {
      });      
      tls.connect({ port: 1111, NPNProtocols: ['http 1.0'] }, function() {
      });
    })
  })
```

输出结果
```
  my.js
    scenario
      tls
        √ npn (279ms)
s1:http/1.1
s1:h2
s1:http 1.1
s1:http 1.0

```

程序员的代码常常气死写文字的人——因为一堆艰涩文字，变成代码常常简单无比。

理论上来说，http/2 可以架构在tls（加密通道）上，也可以架构在tcp（平文本）上。协议文本也确实没有限定或者强制使用tls信道。但是，h2的前身是spdy，而spdy是在tls之上的；spdy的主人家google的浏览器，chrome也只支持tls;另外一家主流浏览器firefox也跟进。这就让架构于tls之上就成为http/2的事实上的标准。所有协商协议也都支持NPN（tls的一个扩展）。

两家浏览器厂商的做法，其实并非强梁，而是基于现实考量：
1. 大量现存的代理、中介软件，都假设80端口上跑的是http1.1，并且基于这个假设，对流经它们的流量做出修改。如果h2继续使用80，很可能和这些修改发生冲突。使用tls（默认为443端口）就避开了这个冲突的可能性
2. 加密化信道（相比http1.x）对用户隐私是更好的保护


通过http 1.1 以平文本（plain text)升级协议到http/2依然是可能的。采用的是现存的http1.1的升级机制。

```
GET /page HTTP/1.1
Host: server.example.com
Connection: Upgrade, HTTP2-Settings
Upgrade: h2c 
HTTP2-Settings: (SETTINGS payload) 

HTTP/1.1 200 OK 
Content-length: 243
Content-type: text/html

(... HTTP/1.1 response ...)

          (or)

HTTP/1.1 101 Switching Protocols 
Connection: Upgrade
Upgrade: h2c

(... HTTP/2 response ...)
```

由 Upgrade指定升级目标协议, HTTP2-Settings传递base64后的settings。如果服务器为1.1的，那么返回1.1的响应。否则，就发101 Switching Protocols ，随后升级为h2。

因为这个做法比NPN要做一个网络往返，这个做法(101 Switching Protocols )被很多实现忽略。比如，node-http2就没有实现（请脑补标准机构的脸色：）。在程序员友好，客户友好的柔情面纱下面，遇到核心的性能问题，依然是一片丛林景象。

尽管node-http2代码内，把ALPN的协议协商也有，并且堂而皇之的也和NPN一样：
```
    options.ALPNProtocols = supportedProtocols;
    options.NPNProtocols = supportedProtocols;
    ...
    this._server = https.createServer(options);
```
但是经过测试，node还没有支持ALPN，有测试用例为证：


```
describe('tls', function() {
    it('alpn', function() {      
     var fs = require('fs');
        var path = require('path');
        var tls = require('tls');
        tls.createServer({
          key: fs.readFileSync("example/localhost.key"),
          cert: fs.readFileSync("example/localhost.crt"),
          ALPNProtocols: ['h2', 'http 1.1','http 1.0']
        }, function(socket) {
          console.log("s1:"+socket.npnProtocol);
        }).listen(1111);
        //client
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      tls.connect({ port: 1111 }, function() {          
      });
      tls.connect({ port: 1111 ,ALPNProtocols: ['h2'] }, function() {
               
      });
      tls.connect({ port: 1111, ALPNProtocols: ['http 1.1'] }, function() {
          
      });      
      tls.connect({ port: 1111, ALPNProtocols: ['http 1.0'] }, function() {
          
      });
    })
  })
```
根本就没有协商，怎么样都是http/1.1 ！

```
  my.js
    scenario
      tls
        √ alpn (307ms)
s1:http/1.1
s1:http/1.1
s1:http/1.1
s1:http/1.1

```
关于Node对alpn的支持，文档也没有提及，但是在issue内有提到，它们正在等待openssl实现并且稳定。稳！定！openssl这几年出的糗还少吗，什么时候能弄稳定呢。


