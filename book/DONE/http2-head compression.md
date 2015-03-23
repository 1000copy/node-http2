如今每个浏览器发起的请求都需要携带请求元数据，其中有用户代理串，缓存指令，cookie等等。没有压缩的http head 经常需要几K字节来承载才可以。

为了降低这个开销，做了如下的改进

  * 定义一个头表（head table），在客户端和服务器两端都有，并用于跟踪每次传递的键值对。
  * 在整个连接期间，head table都持续存在，增量更新
  * 每个键值对要么添加到存在的表内，要么修改之前的值

这样做了之后，发送方就可以把当前发送的Request head和head table（上次的request head）对比，获知两者的差异，并且发送差异；接收方获得差异，和自己方的head table比对，拼出完整的请求头。

来个例子。

假设上次传递的http head：
```
 method:get
 path:/1
 scheme:https
 user-agent: curl/7.28.1
 host: www.gravatar.com
 Accept: */*
```
本次传递的http head：
```
 method:get
 path:/2
 scheme:https
 user-agent: curl/7.28.1
 host: www.gravatar.com
 Accept: */*
```

那么，在服务器和客户端都在head table 中记录了第一个请求的情况下，第二次请求只要发送一个单独的path，两端就可以解析出它本来的http head。

优化的效果下来，特别是对于公用的、在整个连接期间很少变化的键值对（user-agent,accept header..)只要传递一次。如果头键值对在请求之间无修改，那么传递的开销为0字节。

这就是http2引入head table的目的


----------
对于某些应用来说，这些开销会成为瓶颈，比如api驱动的web应用：


visit：

	http://ip.jsontest.com/?callback=showMyIP
Requst header

	GET http://ip.jsontest.com/?callback=showMyIP HTTP/1.1
	Host: ip.jsontest.com
	Proxy-Connection: keep-alive
	Cache-Control: max-age=0
	Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
	User-Agent: Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2272.89 Safari/537.36
	Accept-Encoding: gzip, deflate, sdch
	Accept-Language: en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4,zh-TW;q=0.2
	RA-Ver: 2.8.9
	RA-Sid: DDED9CF3-20140806-053044-2b1b59-a2635f
query string:

	callback=showMyIP
Response head：

	HTTP/1.1 200 OK
	Access-Control-Allow-Origin: *
	Content-Type: application/javascript; charset=ISO-8859-1
	Content-Encoding: gzip
	Vary: Accept-Encoding
	Date: Mon, 23 Mar 2015 07:44:50 GMT
	Server: Google Frontend
	Cache-Control: private
	Content-Length: 52
	Alternate-Protocol: 80:quic,p=0.5,80:quic,p=0.5
Respone：

	showMyIP({"ip": "45.56.92.8"});


作为Respone的json比起Header来说要小得多。

这就是额外开销的不易被察觉的惊人之处。

