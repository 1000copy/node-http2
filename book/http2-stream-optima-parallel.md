
##  流并发

 
对等端可以使用设置帧里面的SETTINGS_MAX_CONCURRENT_STREAMS参数来限制对等端流的并发量。

此设置仅适用于终端并且只对接收到此设置的对等端有效。

处于“打开”或者两种“半封闭”状态的流均计入终端SETTINGS_MAX_CONCURRENT_STREAMS 允许启动的流次数中。两种“保留”状态下的流不计入流打开次数中。

终端绝对不能超过对等端设定的设置。终端接收到报头帧导致他们广播的并发流超过限制的必须将这作为流

这个别扭的stream，终于有点适应了。
call write表示写入这模块管道，就是等于说来数据了呃。
call read 表示调用者需要数据，你准备去。
		  

再看这个图，就比较容易懂。buffer是stream本身提供的，不可见。_read是流本来就调用的，l_send

// Outgoing frames - sending procedure
// -----------------------------------

//                                         flow
//                +-------------------------------------------------+
//                |                                                 |
//                +--------+           +---------+                  |
//        read()  | output |  _read()  | flow    |  _send()         |
//     <----------|        |<----------| control |<-------------    |
//                | buffer |           | buffer  |                  |
//                +--------+           +---------+                  |
//                | input  |                                        |
//     ---------->|        |----------------------------------->    |
//       write()  | buffer |  _write()              _receive()      |
//                +--------+                                        |
//                |                                                 |
//                +-------------------------------------------------+

Upgrading to HTTP/2

https://
ALPN TLS extension
Client: “I prefer h2, h2-14”
Server: “I prefer h2-14”
They pick “h2-14” (If no agreement: http/1.1)
Client: “PRI * HTTP/2.0\r\n\r\nSM\r\n\r\n” + SETTINGS frame
Server: SETTING frame.
http://
spec defines a way (~politics)
Arguments against:
doesn't work in the wild (yay proxies!)
it's time to encrypt
Google, Firefox, Go et al not implementing
