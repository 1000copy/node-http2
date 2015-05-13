TODO 2

GOAWAY(type=0x7)通知远端对等端停止在这个连接上建立新流。

GOAWAY可以由客户端或者服务端发送。一旦发送，发动端将忽略当前连接上新的和标示符大于上一个流的帧的发送。接收端接收到GOAWAY后绝对不能在这个连接上打开新的流，但是可以针对新的流创建一个新的连接。

这个帧的目的是允许终端优雅的停止接收新的流(比如在Stream ID已经耗尽的情况下)，但仍可以继续完成之前已经建立的流的处理。


todo 在终端启动新的流及远端发送GOAWAY之间有一个内在的竞争条件。为了处理这种情况，GOAWAY带有当前连接中发送终端处理的最后一个流的标识。如果超时帧的接收端使用了比指定的流更新的流，它们将不会被发送端处理，而且接收端可以认为这些流根本没有被创建。(There is an inherent race condition between an endpoint starting new streams and the remote sending a GOAWAY frame. To deal with this case, the GOAWAY contains the stream identifier of the last stream which was or might be processed on the sending endpoint in this connection. If the receiver of the GOAWAY has sent data on streams with a higher stream identifier than what is indicated in the GOAWAY frame, those streams are not or will not be processed. The receiver of the GOAWAY frame can treat the streams as though they had never been created at all, thereby allowing those streams to be retried later on a new connection.
)

终端在关闭一个连接之前总是应当发送一个超时帧，这样远端就能知道一个流是否已被部分处理。例如，如果一个HTTP客户端在服务端关闭连接的时候发送了一个POST请求，如果服务端不发送一个指示它在哪里停止工作的GOAWAY，客户端将不知道这个POST请求是否已开始被处理。对于不规范的对等端，终端可以选择不发送GOAWAY的情况下关闭连接。


```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 |X|                  Last-Stream-ID (31)                        |
 +-+-------------------------------------------------------------+
 |                      Error Code (32)                          |
 +---------------------------------------------------------------+
 |                  Additional Debug Data (*)                    |
 +---------------------------------------------------------------+
```

###标志

（无）

超时帧适用于连接而不是特定的流。终端接收到流标识符不是0x0的超时帧必须作为协议错误处理

超时帧中最后一个流的标识包含了接收端接收到并可能已经进行某些处理的流的标识的最大值。所有小于或等于此指定标识符的流都可能通过某种方式被处理。如果没有流被处理，最后流的标识符设置为0。

`注意`：这个案例中，“已处理”表示流中的某些数据已经被传到软件的更高的层并可能被进行某些处理。

如果连接在没有GOAWAY的情况下终止，最后一个流的标识符最有可能是最大的流标识符。

TODO :连接关闭前小于或等于标识符上的流没有完全关闭的，重试请求，交换，或者任何协议活动都是不可能的(例如HTTP GET,PUT,或者删除等等幂行为例外)。任何使用更高的流数值的协议行为可以在新的连接上安全地重试。（On streams with lower or equal numbered identifiers that were not closed completely prior to the connection being closed, re-attempting requests, transactions, or any protocol activity is not possible, with the exception of idempotent actions like HTTP GET, PUT, or DELETE. Any protocol activity that uses higher numbered streams can be safely retried using a new connection.）

小于或等于最后流标识符上的流的活动可能被成功完成。因此，GOAWAY的发送端可以通过发送超时帧优雅地关闭了连接（不马上关闭），保持连接在打开状态直到正在处理的流全部处理完成。


如果环境改变终端可能发送多个超时帧。例如，终端发送带有NO_ERROR标记的GOAWAY来优雅关闭时，却发现有了新的情况，需要立即终止连接（从本来的优雅关闭，要需要立即强制关闭）。从最后一个GOAWAY接收到的最后的流标识符标识表示这些流可能已经被处理了。终端绝对不能增加他们最后发送的流标识的值（the last stream id .被用于生成下一个streamid的一个变量），因为对等端可能已经有在其他连接上未处理的重试请求。

服务端关闭连接时，终端无法重试请求的将丢失所有正在发送的请求。尤其是针对中介端无法使用HTTP/2服务客户端的时候。无负担尝试优雅关闭连接时应当发送一个携带2^{31} -1 大小的流标识符和一个错误码的初始超时帧。这个信号对客户端来说意味着即将关闭连接并且不能建立更多请求了。在等待至少一个RTT时间之后，服务端能发送另外一个带有更新后的最终流标识符超时帧。这个确保了连接能彻底的关闭而不用丢失请求。

在发送超时帧后，发送端能丢弃流标识符大于最终流标识的流的帧。然而，任何修改流状态的帧不能被全部忽略。例如，报头帧、推送承诺帧和延续帧必须被最低限度的处理来保证维持的报头压缩是连续的;类似的数据帧必须被计入连接流程控制窗口中。这些处理失败可能导致流量控制或者报头压缩状态不同步。


GOAWAY同样包含一个32位的错误码（章节7），里面包含了关闭连接的原因。


终端可以在GOAWAY载体上附加透明数据（协议本身不关心的数据，随便什么都行）。额外的调试数据仅用来诊断。调试信息可以包含安全或者隐私敏感的数据。登录或者其他持续存储的数据必须有足够的保障措施，以防止未经授权的访问。


For servers to shut down gracefully

Server: “I’ve seen Stream ID 17.”

Client: (Oh phew, that POST with my credit card details to purchase that plane ticket with Stream ID 19 was ignored, even if it made it to the server!)
…. starts new TCP connection, resends 19 (as 1, probably)
