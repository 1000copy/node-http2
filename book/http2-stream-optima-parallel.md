
##  流并发

 
对等端可以使用设置帧里面的SETTINGS_MAX_CONCURRENT_STREAMS参数来限制对等端流的并发量。

此设置仅适用于终端并且只对接收到此设置的对等端有效。

处于“打开”或者两种“半封闭”状态的流均计入终端SETTINGS_MAX_CONCURRENT_STREAMS 允许启动的流次数中。两种“保留”状态下的流不计入流打开次数中。

终端绝对不能超过对等端设定的设置。终端接收到报头帧导致他们广播的并发流超过限制的必须将这作为流