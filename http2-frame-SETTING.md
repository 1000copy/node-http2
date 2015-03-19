### 6.5 SETTINGS 设置帧

The SETTINGS frame (type=0x4) conveys configuration parameters that affect how endpoints communicate, such as preferences and constraints on peer behavior. The SETTINGS frame is also used to acknowledge the receipt of those parameters. Individually, a SETTINGS parameter can also be referred to as a "setting".

设置帧(type=0x4)包含影响如何与终端通信的设置参数(例如偏好设置以及对等端的行为约束)，并且用来确认这些参数的接收。单个的设置参数也可以被认为是“设置”。

SETTINGS parameters are not negotiated; they describe characteristics of the sending peer, which are used by the receiving peer. Different values for the same parameter can be advertised by each peer. For example, a client might set a high initial flow control window, whereas a server might set a lower value to conserve resources.

设置参数不是通过协商确定的；它们描述发送端的特点，并被接收端使用。相同的参数对不同的对等端设置可能不同。例如，一个客户端可能设置一个较高的流量控制窗口，而服务器为了保存资源可能设置一个较低的值。

A SETTINGS frame MUST be sent by both endpoints at the start of a connection, and MAY be sent at any other time by either endpoint over the lifetime of the connection. Implementations MUST support all of the parameters defined by this specification.

设置帧必须由两个终端在连接开始的时候发送，并且可以由各个终端在连接生存期的任意时间发送。具体实现必须支持本规范定义的所有参数。

Each parameter in a SETTINGS frame replaces any existing value for that parameter. Parameters are processed in the order in which they appear, and a receiver of a SETTINGS frame does not need to maintain any state other than the current value of its parameters. Therefore, the value of a SETTINGS parameter is the last value that is seen by a receiver.

设置帧的所有参数将替换参数中现有值。参数由他们出现的顺序来处理，而且接收设置帧并不需要保存当前值以外的任何状态。因此，设置参数的值是接收端接收到的最后一个值。

SETTINGS parameters are acknowledged by the receiving peer. To enable this, the SETTINGS frame defines the following flag:

设置参数是被接收端公认的。为了实现这个，设置帧定义了以下标记：

	
  **ACK (0x1)** ： Bit 1 being set indicates that this frame acknowledges receipt and application of the peer's SETTINGS frame. When this bit is set, the payload of the SETTINGS frame MUST be empty. Receipt of a SETTINGS frame with the ACK flag set and a length field value other than 0 MUST be treated as a connection error (Section 5.4.1) of type FRAME_SIZE_ERROR. For more info, see Settings Synchronization (Section 6.5.3).

 **ACK (0x1)** ： 位1表示设置帧已被接收端接收并应用。如果这个位设置了，设置帧的载体必须为空。接收到字段长度不是0的带有ACK标记的设置帧必须作为类型为帧大小错误的连接错误(章节5.4.1)处理，更多信息，见同步设置(章节6.5.3)。

SETTINGS frames always apply to a connection, never a single stream. The stream identifier for a SETTINGS frame MUST be zero (0x0). If an endpoint receives a SETTINGS frame whose stream identifier field is anything other than 0x0, the endpoint MUST respond with a connection error (Section 5.4.1) of type PROTOCOL_ERROR.

设置帧总是应用于连接，而不是一个单独的流。流的设置帧标识必须为0.如果终端接收到流设置帧标识不是0的设置帧，必须响应一个类型为协议错误的连接错误(章节5.4.1)。

The SETTINGS frame affects connection state. A badly formed or incomplete SETTINGS frame MUST be treated as a connection error (Section 5.4.1) of type PROTOCOL_ERROR.

设置帧影响连接状态。格式错误或者未完成的设置帧必须作为类型为协议错误的连接错误处理。

#### 6.5.1 SettingFormat 设置帧格式

The payload of a SETTINGS frame consists of zero or more parameters, each consisting of an unsigned 16-bit setting identifier and an unsigned 32-bit value.

设置帧载体包含0个或多个参数，每个包含一个无符号的16位标识以及一个无符号的32位值。

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |Identifier (8) |                 Value (32)                  ...
 +---------------+-----------------------------------------------+
 ...Value        |
 +---------------+
```

#### 6.5.2 Defined SETTINGS Parameters 设置帧参数

The following parameters are defined:

 - SETTINGS_HEADER_TABLE_SIZE (0x1):Allows the sender to inform the remote endpoint of the maximum size of the header compression table used to decode header blocks. The encoder can select any size equal to or less than this value by using signaling specific to the header compression format inside a header block. The initial value is 4,096 bytes.
 - SETTINGS_ENABLE_PUSH (0x2):This setting can be use to disable server push (Section 8.2). An endpoint MUST NOT send a PUSH_PROMISE frame if it receives this parameter set to a value of 0. An endpoint that has both set this parameter to 0 and had it acknowledged MUST treat the receipt of a PUSH_PROMISE frame as a connection error (Section 5.4.1) of type PROTOCOL_ERROR.
 The initial value is 1, which indicates that server push is permitted. Any value other than 0 or 1 MUST be treated as a connection error (Section 5.4.1) of type PROTOCOL_ERROR.
 - SETTINGS_MAX_CONCURRENT_STREAMS (0x3):Indicates the maximum number of concurrent streams that the sender will allow. This limit is directional: it applies to the number of streams that the sender permits the receiver to create. Initially there is no limit to this value. It is recommended that this value be no smaller than 100, so as to not unnecessarily limit parallelism.
 A value of 0 for SETTINGS_MAX_CONCURRENT_STREAMS SHOULD NOT be treated as special by endpoints. A zero value does prevent the creation of new streams, however this can also happen for any limit that is exhausted with active streams. Servers SHOULD only set a zero value for short durations; if a server does not wish to accept requests, closing the connection could be preferable.
 - SETTINGS_INITIAL_WINDOW_SIZE (0x4):Indicates the sender's initial window size (in bytes) for stream level flow control. The initial value is 65,535.
 This setting affects the window size of all streams, including existing streams, see Section 6.9.2.
 Values above the maximum flow control window size of 231 - 1 MUST be treated as a connection error (Section 5.4.1) of type FLOW_CONTROL_ERROR.

定义了以下参数：

 - **SETTINGS_HEADER_TABLE_SIZE (1)** : 允许发送端通知远端终端解码报头区块的报头压缩表的最大承载量。这个编码器可以选择在报头区块中使用特定信号来减少报头压缩的大小（？？？）。初始值是4,096个字节。
 - **SETTINGS_ENABLE_PUSH (2)** : 这个参数可以用来关闭服务器推送。终端在接收到此参数为0的情况下绝对不能发送服务器推送承诺帧。终端在已经设置此参数为0并且承认的情况下必须对接收到的服务器推送作为类型为协议错误的连接错误处理。
初始值是1，表示推送是许可的。任何不是0或1的值必须作为类型为协议错误的连接错误处理。
 - **SETTINGS_MAX_CONCURRENT_STREAMS (3)** : 标明发送者允许的最大并发流。此限制是定向的：它适用于发送端允许接收端创建的最大并发流的数量。初始化时这个值没有限制。建议值不要大于100,以免不必要的限制并行。
此设置为0的值不应该被终端认为是特殊的。0的值阻止了新的流的创建，另外它也适用于被激活的流用尽的任何限制。对于短连接不应该设置此参数为0；如果服务端不希望接收任何请求，最佳的做法是关闭连接。
 - **SETTINGS_INITIAL_WINDOW_SIZE (4)** : 表示发送端对流层流量控制的初始窗口大小(字节单位)。初始值是65,535。
这个参数影响了所有流的窗口大小，包括现有的流。见章节6.9.2.
流量控制窗口大小值大于2的31次方-1的必须被作为流量控制错误的连接错误处理。

An endpoint that receives a SETTINGS frame with any unknown or unsupported identifier MUST ignore that setting.

终端收到其他标记的设置帧必须作为类型为协议错误的连接错误处理。

#### 6.5.3 Settings Synchronization 设置同步

Most values in SETTINGS benefit from or require an understanding of when the peer has received and applied the changed the communicated parameter values. In order to provide such synchronization timepoints, the recipient of a SETTINGS frame in which the ACK flag is not set MUST apply the updated parameters as soon as possible upon receipt.

大部分设置值收益于或者需要了解对等端接收到并且改变了通信过的参数的值的时机。为了提供这样一种同步的时间点，接收到没有设置ACK标记的设置帧必须尽快将更新过的参数适用于接收端上。

The values in the SETTINGS frame MUST be applied in the order they appear, with no other frame processing between values. Once all values have been applied, the recipient MUST immediately emit a SETTINGS frame with the ACK flag set. Upon receiving a SETTINGS frame with the ACK flag set, the sender of the altered parameters can rely upon their application.

设置帧的值必须按照它们出现的顺序被使用，在处理值中间不能处理其他帧。一旦所有的值被应用，接收端必须马上发送一个带有ACK标记的设置帧。在接收到带有ACK标记的设置帧后，修改参数的发送端可以认为修改已生效。

If the sender of a SETTINGS frame does not receive an acknowledgement within a reasonable amount of time, it MAY issue a connection error (Section 5.4.1) of type SETTINGS_TIMEOUT.

如果设置参数的发送端没有在一定时间内收到确认响应，它可以发出一个类型为设置超时的连接错误(章节5.4.1)。