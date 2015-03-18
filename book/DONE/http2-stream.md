流是一个独立的，客户端和服务端在HTTP/2连接下交换帧的双向序列集。

http2在端点之间建立连接后，以Frame为基本单位交换数据。Stream为一组共享同一StreamID的Frame集合。

Connection,Stream,Frame 构成了这样的关系：Connection 和 Stream 是一对多的关系，Stream 和Frame也是一对多的关系。

这样，就可以允许来自多个Stream 的多个Frame 交错发送，在一个Connection上执行多播通信 （multiplexed communication）

并且，客户端也可以在一个TCP Connection 上发送多个请求。在同一个Connection上的请求现在可以不按次序给出响应——服务端可以根据QoS（服务质量）规则来决定响应内容的次序。

## 流标识 （StreamID)

Stream 由31位字节的无符号整数标识。

客户端发起的StreamID必须是奇数；服务器发起的StreamID必须是偶数。

0(0x0)标识连接控制消息。

1(0x1)标识也有使用限定。发起升级请求的客户端（从HTTP/1.1升级到HTTP/2）将收到一个StreamID 等于 1(0x1)的流的响应。升级完成后，0x1流将对客户端处于“半封闭(本地)”状态。因此，升级而来的客户端不能使用0x1作为一个新流的标识符。

一个新建立的StreamID必须数值大于任何终端已经打开或者保留的StreamID。规则适用于使用HEADER Frame 打开的流以及使用推送承诺帧保留的流。终端收到不规范的流标识符必须响应协议错误(PROTOCOL_ERROR)。

新的StreamID第一次使用时，将关闭所有比自己的ID小的、处于“空闲”状态下的Stream。例如，一个客户端发送一个流7的报头帧，那么在流7发送或者接收帧后从没有发送帧的流5将转换为“关闭”状态。

StreamID不能被重复使用。

如果连接的StreamID在可用范围被耗尽，那么客户端可以使用新连接，服务可以发送超时帧(GOAWAY)强制客户端对新流使用新连接。

## Stream States 流状态

请注意该图仅展示了流状态的转换和帧对这些转换的影响。


```
                             +--------+
                     send PP |        | recv PP
                    ,--------|  idle  |--------.
                   /         |        |         \
                  v          +--------+          v
           +----------+          |           +----------+
           |          |          | send H /  |          |
    ,------| reserved |          | recv H    | reserved |------.
    |      | (local)  |          |           | (remote) |      |
    |      +----------+          v           +----------+      |
    |          |             +--------+             |          |
    |          |     recv ES |        | send ES     |          |
    |   send H |     ,-------|  open  |-------.     | recv H   |
    |          |    /        |        |        \    |          |
    |          v   v         +--------+         v   v          |
    |      +----------+          |           +----------+      |
    |      |   half   |          |           |   half   |      |
    |      |  closed  |          | send R /  |  closed  |      |
    |      | (remote) |          | recv R    | (local)  |      |
    |      +----------+          |           +----------+      |
    |           |                |                 |           |
    |           | send ES /      |       recv ES / |           |
    |           | send R /       v        send R / |           |
    |           | recv R     +--------+   recv R   |           |
    | send R /  `----------->|        |<-----------'  send R / |
    | recv R                 | closed |               recv R   |
    `----------------------->|        |<----------------------'
                             +--------+

       send:   endpoint sends this frame
       recv:   endpoint receives this frame

       H:  HEADERS frame (with implied CONTINUATIONs)
       PP: PUSH_PROMISE frame (with implied CONTINUATIONs)
       ES: END_STREAM flag
       R:  RST_STREAM frame

```
HEADERS frame (with implied CONTINUATIONs)稍有些费解。意思是说，如果HEADERS帧的END_STREAM 已经设置，就可以直接导致状态变迁；否则就意味着要收齐后面的CONTINUATION，保证HEADER内容的完整之后再做状态迁移。


流有以下状态：

**idle** :

所有流以“空闲”状态开始。在这种状态下，没有任何帧的交换。

下列传输在这种状态下是有效的：

 - 发送或者接收一个报头帧(HEADERS)导致流变成“打开”。这个报头帧(带有END_STREAM标志)同样可能导致流立即变成“半关闭”状态。
 - 发送一个推送承诺帧(PUSH_PROMISE)标记相关的流后续再使用。此相关的流状态将转换为“reserverd(local)”。
 - 接收一个推送承诺帧(PUSH_PROMISE)标记相关的流为远程端点预留的流。此相关的流状态将转换为“reserved (remote)”
 

###reserved (local) 

在此状态的流，是已经被承诺发送PUSH_PROMISE的流。一个 PUSH_PROMISE 帧通过使一个流与一个由远端对等端初始化的打开的流相关联来保留一个空闲流。 

在这种状态下，只有下列传输是可能的：

 - 端点可以发送报头帧（HEADERS），致使流打开到“half close(remote)”状态。
 - 任意端点能发送一个RST_STREAM帧来使流变成“关闭”。这将释放流的保留。
 
在这种状态下,优先级帧(PRIORITY),WINDOW_UPDATE可以被接收。除此之外的帧，都将被认为是协议错误（PROTOCOL_ERROR）

**reserved (remote)**  

在“保留(远程)”状态下的流说明已经被远程对等端所保留。

在这种状态下，只有下列传输是可能的：

 - 接收一个报头HEADERS帧并致使流转换到“半封闭(本地)”状态。
 - 任意一个端点能发送一个RST_STREAM 帧来使流变成“关闭”。这将释放流的保留。
 - 可以发送一个优先级PRIORITY帧来变更保留流的优先级顺序。

除此之外的帧，都将被认为是协议错误（PROTOCOL_ERROR）

### **open** : 打开

 处于“打开”状态的流，可以收发任何类型的帧。 

在这种状态下,每个终端可以发送一个带有END_STREAM结束流标记的帧,来使流转换到其中一种“半关闭”状态：发送端发出此帧使流变成“half close(local)”状态；接收端收到此帧，使流变成“half close(remote)”状态。

这种状态下各个终端可以发送一个RST_STREAM帧来使流转换到"关闭"状态。

**half closed (local)** : 


“半封闭(本地)”状态下的,有窗口更新(WINDOW_UPDATE)、优先级(PRIORITY)和终止流(RST_STREAM)帧能发送。

 
这种状态下，当流接收到包含END_STREAM标记的帧或者某个终端发送了RST_STREAM帧，流转换到“关闭”状态。 

优先级(PRIORITY)帧可以接收,并用来对依赖当前流的流进行优先级重排序。

**half closed (remote)** : 半关闭（远程）

 
"半封闭(远程)"状态下的流不再被对等端用来发送帧。 

如果终端接收到处于这种状态下的流发送的额外的帧，除非是延续CONTINUATION帧，否则必须返回类型为流关闭STREAM_CLOSED的流错误 

这种状态下，当流发送一个带有终止流END_STREAM标记的帧或者某个终端发送了一个RST_STREAM帧，流将转换到“关闭”状态。

**closed** : 关闭

 
“关闭”状态是终止状态。

终端绝对不能通过关闭的流发送帧。终端在收到RST_STREAM后接收的任何帧必须作为流关闭STREAM_CLOSED错误处理。

相似的，终端接收到带有END_STREAM标记设置的数据DATA帧之后的任何帧，必须作为流关闭STREAM_CLOSED错误处理。

关闭的流上可以发送优先级帧用来对依赖当前关闭流的流进行优先级重排序。终端应该处理优先级帧。但当该流已经从依赖树中移除时可以忽略。

如果流在发送RST_STREAM帧后转换到这种状态，终端必须忽略从已经发送RST_STREAM帧的流接收到的帧。终端可以选择设置忽略帧的超时时间并在超过限制后作为错误处理。

在发送RST_STREAM之后收到的流量受限帧(如数据DATA帧)转向流量控制窗口连接处理。尽管这些帧可以被忽略，但发送端会认为这些帧与流量控制窗口不符。

终端可能在发送RST_STREAM之后接收PUSH_PROMISE帧。即便相关的流已经被重置，推送承诺帧也能使流变成“保留”状态。因此，需要RST_STREAM来关闭一个不想要的被承诺流。

发现协议中未明确之处，都应作为议错误来处理。

##状态转换实现(node-http )

尽管状态迁移的协议文字说明极尽冗长，所幸代码实现其实并不复杂。可以对照阅读

    Stream.prototype._transition = function transition(sending, frame) {
      var receiving = !sending;
      var connectionError;
      var streamError;

      var DATA = false, HEADERS = false, PRIORITY = false, ALTSVC = false, BLOCKED = false;
      var RST_STREAM = false, PUSH_PROMISE = false, WINDOW_UPDATE = false;
      switch(frame.type) {
        case 'DATA'         : DATA          = true; break;
        case 'HEADERS'      : HEADERS       = true; break;
        case 'PRIORITY'     : PRIORITY      = true; break;
        case 'RST_STREAM'   : RST_STREAM    = true; break;
        case 'PUSH_PROMISE' : PUSH_PROMISE  = true; break;
        case 'WINDOW_UPDATE': WINDOW_UPDATE = true; break;
        case 'ALTSVC'       : ALTSVC        = true; break;
        case 'BLOCKED'      : BLOCKED       = true; break;
      }

      var previousState = this.state;

      switch (this.state) {
        case 'IDLE':
          if (HEADERS) {
            this._setState('OPEN');
            if (frame.flags.END_STREAM) {
              this._setState(sending ? 'HALF_CLOSED_LOCAL' : 'HALF_CLOSED_REMOTE');
            }
            this._initiated = sending;
          } else if (sending && RST_STREAM) {
            this._setState('CLOSED');
          } else if (PRIORITY) {
            /* No state change */
          } else {
            connectionError = 'PROTOCOL_ERROR';
          }
          break;
          case 'RESERVED_LOCAL':
          if (sending && HEADERS) {
            this._setState('HALF_CLOSED_REMOTE');
          } else if (RST_STREAM) {
            this._setState('CLOSED');
          } else if (PRIORITY) {
            /* No state change */
          } else {
            connectionError = 'PROTOCOL_ERROR';
          }
          break;

        case 'RESERVED_REMOTE':
          if (RST_STREAM) {
            this._setState('CLOSED');
          } else if (receiving && HEADERS) {
            this._setState('HALF_CLOSED_LOCAL');
          } else if (BLOCKED || PRIORITY) {
            /* No state change */
          } else {
            connectionError = 'PROTOCOL_ERROR';
          }
          break;
       
        case 'OPEN':
          if (frame.flags.END_STREAM) {
            this._setState(sending ? 'HALF_CLOSED_LOCAL' : 'HALF_CLOSED_REMOTE');
          } else if (RST_STREAM) {
            this._setState('CLOSED');
          } else {
            /* No state change */
          }
          break;
        
        case 'HALF_CLOSED_LOCAL':
          if (RST_STREAM || (receiving && frame.flags.END_STREAM)) {
            this._setState('CLOSED');
          } else if (BLOCKED || ALTSVC || receiving || PRIORITY || (sending && WINDOW_UPDATE)) {
            /* No state change */
          } else {
            connectionError = 'PROTOCOL_ERROR';
          }
          break;

        
        case 'HALF_CLOSED_REMOTE':
          if (RST_STREAM || (sending && frame.flags.END_STREAM)) {
            this._setState('CLOSED');
          } else if (BLOCKED || ALTSVC || sending || PRIORITY || (receiving && WINDOW_UPDATE)) {
            /* No state change */
          } else {
            connectionError = 'PROTOCOL_ERROR';
          }
          break;

      
        case 'CLOSED':
          if (PRIORITY || (sending && RST_STREAM) ||
              (receiving && this._closedByUs &&
               (this._closedWithRst || WINDOW_UPDATE || RST_STREAM || ALTSVC))) {
            /* No state change */
          } else {
            streamError = 'STREAM_CLOSED';
          }
          break;
      }

      // 特别留意连接被对等端关闭的情况。
      if ((this.state === 'CLOSED') && (previousState !== 'CLOSED')) {
        this._closedByUs = sending;
        this._closedWithRst = RST_STREAM;
      }

      // 收发推送承诺帧
      if (PUSH_PROMISE && !connectionError && !streamError) {
        assert(frame.promised_stream.state === 'IDLE', frame.promised_stream.state);
        frame.promised_stream._setState(sending ? 'RESERVED_LOCAL' : 'RESERVED_REMOTE');
        frame.promised_stream._initiated = sending;
      }

      // ...
    };


##  错误处理

HTTP/2框架允许两类错误：

 - 使整个连接不可用的错误。
 - 单个流中出现的错误。

 
###  连接错误处理

导致帧处理层无法更进一步处理的错误是连接错误；
破坏任何连接状态的错误也是连接错误。

发现连接错误的终端应当首先发送一个 GOAWAY （内附带有最近的一个成功从对等端接收帧的StreamID，且包括错误码指示连接中断的原因）。发送GOAWAY后，终端必须关闭TCP连接。

只要可能，终端在终止连接时应当发送一个GOAWAY帧。

GOAWAY 有可能没有被可靠的接收。在连接错误事件中，GOAWAY 只是尽力告知对等端连接终止的原因。


### 流错误处理
 

流错误是与特定流相关的错误，并且不会影响其他流的处理。

终端检测到流错误时，发送RST_STREAM帧（内附一个错误发生的StreamID，和错误码）。

RST_STREAM是终端在流上可以发送的最后一帧。发送RST_STREAM帧后，必须准备好接收任何由远端发送或者准备发送的帧。这些帧可以被忽略，除非连接状态被修改。

通常，终端不应该在任何流上发送多个RST_STREAM帧。但是，终端如果在一个关闭的流上超过rtt时间后收到帧，则可以发送的额外的RST_STREAM帧。这种做法是被允许用来处理这种非常规情况。

终端绝不能在收到RST_STREAM帧后响应一个RST_STREAM帧，避免死循环。

### 连接终止

如果且在流仍然保持打开或者半封闭状态下，TCP连接断开的话，那么终端必须假定这些流是异常中断的，且是不完整的。

[1]:http://en.wikipedia.org/wiki/Bandwidth-delay_product）