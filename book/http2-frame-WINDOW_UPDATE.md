FROM http://get.jobdeer.com/1166.get

node-http2 class Flow 做的就是这个工作。Flow = Flow Control 
---
HTTP/2流流量控制目标在于允许不需要协议改动的情况下改进流量控制算法。HTTP/2中的流量控制有以下特点：

- 流量控制是逐跳的(hop-by-hop)，而不是端到端（end-to-end)连接的。
-  流量控制是基于窗口更新帧(Frame Window-update)的。接收端广播自己准备在流及整个连接过程中接收的字节大小。这是一个信用为基础的方案。
- 流量控制是有方向性的，由接收端全权掌握。接收端可以选择针对流及整个连接设置任意的窗口大小。
- 发送端必须遵守接收端的流量控制限制。客户端、服务端及中端代理作为接收者时都独立的向外广播他们各自的流量控制窗口，作为发送者时遵守接收端的限制。
- 每个新的流及整个连接的流量控制窗口初始值是65,535字节。
- 帧类型决定了是否适用流量控制规则。本文档定义的帧中，只有DATA帧受流量控制；所有其他的帧不受广播的流量控制窗口影响。这保证了重要的控制帧不因流量控制所阻塞。
- 流量控制不能被禁用。
- HTTP/2只标准化WINDOW_UPDATE帧格式(WINDOW_UPDATE)。它没有规定接收端是何时发送帧或者发送什么值，也没有规定发送端如何选择发送包。具体实现可以选择任何满足需求的算法。

具体实现还负责管理请求和响应是如何基于优先级发送的；如何避免请求头阻塞以及管理新流的创建。这些算法能够与任何流量控制算法相互作用。

----

6.9 WINDOW_UPDATE 窗口更新帧

WINDOW_UPDATE帧(type=0x8)用来实现流量控制；

流量控制在两种层面上操作：每个单独的流或者整个连接。



所有类型的流量控制都是逐跳的；就是说，只在两个端点（EndPoint）之间作用。中介端不在依赖的连接上转发WINDOW_UPDATE帧。不过，接收端对数据的节流措施（流控措施）可以直接导致流量控制信息的传播转到原始发送端（而不是仅仅限于最近的中介）。

Flow control only applies to frames that are identified as being subject to flow control. Of the frame types defined in this document, this includes only DATA frames. Frames that are exempt from flow control MUST be accepted and processed, unless the receiver is unable to assign resources to handling the frame. A receiver MAY respond with a stream error (Section 5.4.2) or connection error (Section 5.4.1) of type FLOW_CONTROL_ERROR if it is unable to accept a frame.

流量控制只适用于标示为需要受流量控制影响的帧集合。文档中定义的帧类型中，只包括数据帧。不受流量控制的帧必须被接收和处理，除非接收端无法为帧分配资源。接收端如果无法接收帧，可以响应一个流错误或者类型为流量控制错误的连接错误
```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |X|              Window Size Increment (31)                     |
 +-+-------------------------------------------------------------+
```
WINDOW_UPDATE帧的载体是一个保留字节，加上一个无符号31为整数表明发送端除了现有的流量控制窗口可以发送的字节数。留空控制窗口有效的增量范围是$1 至 2^{31}-1$(0x7fffffff) 字节。


WINDOW_UPDATE帧没有定义任何标记。

WINDOW_UPDATE可以专指某个流或者整个连接。在前者的情况下，帧的流标识符指的是被影响的流；在后者情况下，值"0"表示整个连接都受这个帧的影响。

WINDOW_UPDATE可以由一个已经发送带有END_STREAM标记的帧的对等端来发送。这意味着接收端可以在“半封闭(远程)”或者“关闭”的流上接收WINDOW_UPDATE帧。接收端绝对不能作为错误处理 

接收端收到受流量控制的帧必须总是计算流量对整个连接流量控制的影响量，除非接收端将这作为连接错误处理。即使帧出错这也是必须的。因为发送端将这个帧计入了流量控制窗口，如果接收端没有这样做，发送端和接收端的流量控制会不相同。

6.9.1 The Flow Control Window 流量控制窗口

HTTP/2中流量控制是通过每个发送端在每个流上携带一个窗口来实现的。流量控制窗口是一个简单的整数值，指示发送端被允许传输的字节数；因此，它的大小是接收端的缓存能力的衡量。

流量控制窗口对流和连接的流量控制窗口都适用。发送端绝对不能发送超出接收端广播的流量控制窗口大小的可用空间长度的受流量控制影响的帧。在各个流量控制窗口中没有可用空间时，可以发送带有END_STREAM标记的长度为0的帧(例如，空数据帧)。


流量控制计算中，8字节的帧报头不被计入。

在发送一个流量控制帧后，发送端在各个窗口中可用空间中减去发送的帧长度。


接收端发送一个WINDOW_UPDATE帧当它接受信息并释放了流量控制窗口的空间。单独的WINDOW_UPDATE帧用于流及连接层面的流量控制窗口中。

发送端收到WINDOW_UPDATE后按帧中指定的大小更新到正确的窗口。


发送端绝对不允许流量控制窗口超过2^{31}-1字节。如果发送端接收到WINDOW_UPDATE使得流量控制窗口超过这个最大值，它必须适当地终止这个流或者这个连接。对于流，发送端发送一个带有流量控制错误的错误码的ST_STREAM帧；对于连接，发送一个带有流量控制错误码的超时帧。

Flow controlled frames from the sender and WINDOW_UPDATE frames from the receiver are completely asynchronous with respect to each other. This property allows a receiver to aggressively update the window size kept by the sender to prevent streams from stalling.

发送端发送的受流量控制的帧以及接收端收到的WINDOW_UPDATE帧是完全相互异步的。这种属性让接收端积极的更新发送端携带的窗口大小来防止流停转。

6.9.2 Initial Flow Control Window Size 流量控制窗口初始值

HTTP/2连接初次建立时，新的流创建的初始化流量控制大小是65,535字节。连接的流量控制大小是65,535字节。两个终端都能通过在组成连接序言的设置帧中携带一个SETTINGS_INITIAL_WINDOW_SIZE设置调整新流的初始化窗口大小。连接的流量控制窗口只能被WINDOWS_UPDATE帧修改。

 
在收到设置帧指定SETTINGS_INITIAL_WINDOW_SIZE前，终端只能只有流量控制的默认窗口值。类似的，连接的流量控制窗口初始化时也是默认值知道收到WINDOW_UPDATE帧。

A SETTINGS frame can alter the initial flow control window size for all current streams. When the value of SETTINGS_INITIAL_WINDOW_SIZE changes, a receiver MUST adjust the size of all stream flow control windows that it maintains by the difference between the new value and the old value.

设置帧可以针对所有当前的流修改流量控制初始化大小。当SETTINGS_INITIAL_WINDOW_SIZE值改变时，接收端必须将根据新旧值调整其保留的所有流的窗口大小设置帧不能修改连接的流量控制窗口。

A change to SETTINGS_INITIAL_WINDOW_SIZE can cause the available space in a flow control window to become negative. A sender MUST track the negative flow control window, and MUST NOT send new flow controlled frames until it receives WINDOW_UPDATE frames that cause the flow control window to become positive.

SETTINGS_INITIAL_WINDOW_SIZE的修改可能导致流量控制窗口的可用空间为负数。发送端必须跟踪负数的流量控制窗口，并且绝对不能发送新的受流量控制的帧直到接收到窗口更新帧使得流量控制窗口变成正数。

For example, if the client sends 60KB immediately on connection establishment, and the server sets the initial window size to be 16KB, the client will recalculate the available flow control window to be -44KB on receipt of the SETTINGS frame. The client retains a negative flow control window until WINDOW_UPDATE frames restore the window to being positive, after which the client can resume sending.

例如，如果客户端在建立的连接上立即发送60KB的数据，而终端将初始的窗口大小设置成16KB,客户端将重新计算流量控制窗口的可用空间为-44KB。终端将保持一个负数的流量控制窗口直到窗口更新帧恢复窗口到正数，这个时候客户端才能恢复数据发送。

A SETTINGS frame cannot alter the connection flow control window.

设置帧不能修改链接流量控制窗口。

An endpoint MUST treat a change to SETTINGS_INITIAL_WINDOW_SIZE that causes any flow control window to exceed the maximum size as a connection error (Section 5.4.1) of type FLOW_CONTROL_ERROR.

终端必须将SETTINGS_INITIAL_WINDOW_SIZE的修改导致流量控制窗口超过最大值的情况作为类型为流量控制错误的连接错误(章节 5.4.1)处理。

6.9.3 Reducing the Stream Window Size 减少流量窗口大小
A receiver that wishes to use a smaller flow control window than the current size can send a new SETTINGS frame. However, the receiver MUST be prepared to receive data that exceeds this window size, since the sender might send data that exceeds the lower limit prior to processing the SETTINGS frame.

接收端希望使用比当前大小更小的流量控制窗口可以发送一个新的设置帧。然而，接收端必须准备好接收超过窗口大小的数据，因为发送端在处理设置帧之前发送了低于最低下限的数据。

After sending a SETTINGS frame that reduces the initial flow control window size, a receiver has two options for handling streams that exceed flow control limits:

在发送减小初始化流量控制窗口大小的设置帧后，接收端有两种选择处理流超过流量限制的情况：

The receiver can immediately send RST_STREAM with FLOW_CONTROL_ERROR error code for the affected streams.
The receiver can accept the streams and tolerate the resulting head of line blocking, sending WINDOW_UPDATE frames as it consumes data.

接收端可以针对受影响的流立即发送带有流量控制错误错误码的RST_STREAM帧。

接收端如果在消耗数据可以接受流并且忍受报头阻塞的结果，并发送WINDOW_UPDATE帧。
