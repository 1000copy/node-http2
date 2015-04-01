https://docs.google.com/document/d/1pNj2op5Y4r1AdnsG8bapS79b11iWDCStjCNHo3AWD0g/edit#

h2load - HTTP/2 benchmarking tool - HOW-TO — nghttp2 0.7.9-DEV documentation - https://nghttp2.org/documentation/h2load-howto.html

错误处理。终端希望将SETTINGS_MAX_CONCURRENT_STREAMS的值减少到比当前打开的流更小时可以关闭超过新的设置值的流或者允许流结束。

## 流量控制

复用流的引入，会导致TCP连接的竞争，引发流阻塞。流量控制方案确保同一连接上的流相互之间不会造成破坏性的干扰。

流量控制在单个流及整个连接过程中使用。

HTTP/2 通过使用WINDOW_UPDATE帧类型来提供流量控制

SPDY Protocol - Draft 3 - The Chromium Projects - http://www.chromium.org/spdy/spdy-protocol/spdy-protocol-draft3#TOC-2.6.8-WINDOW_UPDATE

The WINDOW_UPDATE control frame is used to implement per stream flow control in SPDY. 

实现方法是这样的。发送端为每一个流记录一个数据传输窗口的变量，类型为uint32，指示发送端可以发送的字节数，初始值为65535。这个变量指示接收端的缓冲能力，发送端不能发送长度超过这个值的数据帧，每次发出一个数据帧，发送方都要把数据帧大小累减到此变量上。当它小于等于0时，发送端必须暂停发送数据帧。流的另外一端的接收方发送WINDOW_UPDATE，通知发送方数据消耗完毕，已经腾好空间可以接受更多数据。

流控是逐跳的，就是说，仅仅存在于两个端点之间，如果在服务器和客户机之间有一个或者多个中介，流控指令不会被中介转发的。





### 流量控制规则

HTTP/2 流量控制目标在于允许不需要协议改动的情况下改进流量控制算法。HTTP/2中的流量控制有以下特点：

 1. 流量控制是逐跳的(hop-by-hop)，而不是端到端(end-to-end)连接的。
 2. 流量控制是基于窗口更新帧(WINDOW_UPDATE)的。接收端广播自己准备在流及整个连接过程中接收的字节大小。这是一个信用为基础的方案。
 3. 流量控制是有方向性的，由接收端全权掌握。接收端可以选择针对流及整个连接设置任意的窗口大小。发送端必须遵守接收端的流量控制限制。客户端、服务端及中端代理作为接收者时都独立的向外广播他们各自的流量控制窗口，作为发送者时遵守接收端的限制。
 4. 每个新的流及整个连接的流量控制窗口初始值是65,535字节。
 5. 帧类型决定了是否适用流量控制规则。本文档定义的帧中，只有DATA帧受流量控制；所有其他的帧不受广播的流量控制窗口影响。这保证了重要的控制帧不因流量控制所阻塞。
 6. 流量控制不能被禁用。

HTTP/2只标准化WINDOW_UPDATE帧格式。它没有规定接收端是何时发送帧或者发送什么值，也没有规定发送端如何选择发送包。具体实现可以选择任何满足需求的算法。具体实现还负责管理请求和响应是如何基于优先级发送的；如何避免请求头阻塞以及管理新流的创建。这些算法能够与任何流量控制算法相互作用。
with http1.1 browsers held back requests ..not with http/2
get index.html ,style.css,hero.jpg,other.jpg,more.jpg
    + critical-----------+----------low priority----+



don't hold back all image bytes...send the first ~kb
allow  the browser to decode the image header and get dimensions 
allow the browser to minimize reflows during layout
critical resources shound be pre-empt ( 先发优势) others 
spdy/2 implementation in nginx did not respect prioritization ,and performance suffered ...test your server

Prioritization Is Critical To SPDY - Insouciant - https://insouciant.org/tech/prioritization-is-critical-to-spdy/

stream flow control enables find-grained resource control between stream .eg 
i am willing to receive 4kb of kittens.jpg
i am willing to receive 500kb of critical.jpg
i am ok ,now send the reminder of kittens.jpg 
HTTP 2.0 - Tokyo - Google幻灯片 - https://docs.google.com/presentation/d/1l9c9ROjLTD8clOL0yFufAOMbxNC0D-19zCiXMgqtY-M/present?slide=id.g40fbe7d8c_0168