### 推送承诺帧

推送承诺帧(type=0x5)用来在发送者准备初始化流之前告知对等端。推送承诺帧包含了发送端准备创建的流的31位无符号标记以及提供附加上下文的报头的集合。


```
  +---------------+
    |Pad Length? (8)|
    +-+-------------+-----------------------------------------------+
    |R|                  Promised Stream ID (31)                    |
    +-+-----------------------------+-------------------------------+
    |                   Header Block Fragment (*)                 ...
    +---------------------------------------------------------------+
    |                           Padding (*)                       ...
    +---------------------------------------------------------------+
```

报头帧载体包含以下字段：

 - **Pad Length** : 填充位大小。
 - **R** : 单独的保留位。
 - **Promised Stream ID** : 表示终端准备发送的Stream ID。
 - **Header Block Fragment** : 包含请求头字段的报头区块碎片
 - **Padding** : 填充字节。


推送承诺帧定义了以下标记：

 - **END_HEADERS (0x4)** : 位3 表明帧包含了整个报头区块。不带有END_HEADERS标记的推送承诺帧在同个流后面必须跟着延续帧。否则，作为类型为协议错误处理。
 - **PADDED (0x8)** : 位4 表明Pad长度字段是已设置。

推送承诺帧必须与现有的由对等端初始化的流相关联。如果流标识字段为0x0，接收端必须响应协议错误

被承诺的流并不需要以被承诺的顺序使用。推送承诺只保留接下来会使用的流标识符。

如果对等端的SETTINGS_ENABLE_PUSH设置是0那么推送承诺绝对不能发送。终端已经设置了禁止推送承诺并且收到确认的,如果接收到推送承诺帧，必须作为类型为协议错误处理

推送承诺的接收端可以选择给推送承诺的发送端返回一个与被承诺的流标识符相关的RST_STREAM标记来拒绝接收承诺流。

A PUSH_PROMISE frame modifies the connection state in two ways. The inclusion of a header block (Section 4.3) potentially modifies the state maintained for header compression. PUSH_PROMISE also reserves a stream for later use, causing the promised stream to enter the "reserved" state. A sender MUST NOT send a PUSH_PROMISE on a stream unless that stream is either "open" or "half closed (remote)"; the sender MUST ensure that the promised stream is a valid choice for a new stream identifier (Section 5.1.1) (that is, the promised stream MUST be in the "idle" state).

PUSH_PROMISE通过两种方式修改连接状态。这包括一个报头区块(章节4.3)可能修改压缩状态。PUSH_PROMISE同样保留流后续使用，导致被推送的流进入到“保留”状态。发送端绝对不能在流上发送PUSH_PROMISE除非流是“打开”或者“半封闭(远程)”状态；发送端绝对要保证被承诺的流对于新的流标示(章节5.1.1)来说是一个有效的选择(就是说，被承诺的流必须进入"空闲"状态)。

Since PUSH_PROMISE reserves a stream, ignoring a PUSH_PROMISE frame causes the stream state to become indeterminate. A receiver MUST treat the receipt of a PUSH_PROMISE on a stream that is neither "open" nor "half closed (local)" as a connection error (Section 5.4.1) of type PROTOCOL_ERROR. Similarly, a receiver MUST treat the receipt of a PUSH_PROMISE that promises an illegal stream identifier (Section 5.1.1) (that is, an identifier for a stream that is not currently in the "idle" state) as a connection error (Section 5.4.1) of type PROTOCOL_ERROR.

由于PUSH_PROMISE保留了一个流、忽略一个PUSH_PROMISE 帧都会导致流状态变得不确定。接收端接收到流状态不是“打开”或者“半封闭(本地)”的流的推送承诺帧必须作为类型为协议错误的连接错误(章节5.4.1)处理。相似的，接收端必须对在一个非法标示(章节5.1.1)的流(即流的标识当前不在空闲状态)上建立的推送承诺作为类型为协议错误的连接错误(章节5.4.1)处理。

The PUSH_PROMISE frame includes optional padding. Padding fields and flags are identical to those defined for DATA frames (Section 6.1).

PUSH_PROMISE帧填充是可选的。填充字段及标记同数据帧(章节6.1)中定义。