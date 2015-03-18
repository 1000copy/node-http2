以往的HTTP，我们习惯了和head /body 打交道。而在HTTP2，取而代之的是幀（Frame）。它将会成为协议中的最小通讯单位——所有的数据，head，body都会打包到Frame内发送。Frame 有很多类型，比如 header frame, data frame （以后...，不本文就会继续讲到）。

通过Frame 好处多多（还有后面要提到的流），一起可以完成多播和次序交错的通讯——很大的新特性。

开门见山，看看幀格式(头 9 字节是幀头部，后面的都是有效载荷)：

```
 +-----------------------------------------------+
 |                 Length (24)                   |
 +---------------+---------------+---------------+
 |   Type (8)    |   Flags (8)   |
 +-+-------------+---------------+-------------------------------+
 |R|                 Stream Identifier (31)                      |
 +=+=============================================================+
 |                   Frame Payload (0...)                      ...
 +---------------------------------------------------------------+
```

Frame 构成定义：
```
 - **Length** :帧主体长度。24 bits unsigned int
 - **Type** ： 类型(8 bits)。
 - **Flags** ： 特定的Type，有一组特定的flag，以便对type做更多约定
 - **R** : 保留(1bit)。语义未设置并且必须在发送的时候设置为 0 
 - **Stream Identifier** : 流标识符(31 bytes）。
```
每次看到报文格式定义中‘保留’字样我就乐不可支。我太喜欢标准定义者的作派了。

因为，‘保留’就是，可以不看不了解它。所以这样看起来，其实Frame Head就3条有意义的字段，分别指明： Frame的类型、Frame的内容长度、Frame 所属的流。世界清净了。至于‘长度’，当然重要，可是不写程序码之前，也可以不看。


###细化类型Type

差不多就是照抄下规范了 ：）

```
Frame Type	    Code	
DATA	        0x0	
HEADERS	        0x1	
PRIORITY	    0x2	
RST_STREAM	    0x3	
SETTINGS	    0x4	
PUSH_PROMISE    0x5	
PING	        0x6	
GOAWAY	        0x7	
WINDOW_UPDATE	0x8	
CONTINUATION	0x9	
```

###细化length
Length是指有效载荷（Payload）的长度。不包括Frame Header的长度（是啊，没有必要嘛）。比如我们要发送一个16进制的‘12345678’ 给对方，Length 就是 4 ，不是 8+ 4 = 12 。

### 细化Stream

为什么说需要标示流呢？ 因为HTTP2场景下，TCP Connection不再只有一对请求+响应了——可以有多个响应。这些响应打包到多个Frame，在一个 Connection 上混合交错的发。接收方必须知道每个Frame属于那个Response，这就是流所标示的了。

有点不清不楚，不过，我会上代码的。语言停止之处，代码发生。

###案例

我们要发送 0x12345678，流编号为 10 ，类型为DATA，那么这个Frame的16进制表达就是：

    '000004' + '00' + '00' + '0000000A' +   '12345678'

### Testcase 

如下为go语言的代码testcase，对一个数据Frame做编码和解码，双向验证一个 frame的生成过程。[代码来自][1]:

    func TestWriteData(t *testing.T) {
    	fr, buf := testFramer()
    	var streamID uint32 = 1<<24 + 2<<16 + 3<<8 + 4
    	data := []byte("ABC")
    	fr.WriteData(streamID, true, data)
    	const wantEnc = "\x00\x00\x03\x00\x01\x01\x02\x03\x04ABC"
    	if buf.String() != wantEnc {
    		t.Errorf("encoded as %q; want %q", buf.Bytes(), wantEnc)
    	}
    	f, err := fr.ReadFrame()
    	if err != nil {
    		t.Fatal(err)
    	}
    	df, ok := f.(*DataFrame)
    	if !ok {
    		t.Fatalf("got %T; want *DataFrame", f)
    	}
    	if !bytes.Equal(df.Data(), data) {
    		t.Errorf("got %q; want %q", df.Data(), data)
    	}
    	if f.Header().Flags&1 == 0 {
    		t.Errorf("didn't see END_STREAM flag")
    	}
    }

### 细化Flag
上面提到了特定的Type，有不同的Flag，到底有什么？（TODO: 看了代码来补充细节：）

![图片描述][2]
图来自于：http://search.cpan.org/~crux/Protocol-HTTP2-0.14/lib/Protocol/HTTP2/Frame.pm

Ref：

1. [一个github的repo，内有丰富的Frame种类和编码后的字节结果][3]
2. [go 写的http2库，作者说以后会变成标准库。所以，特别值得看，比1还容易懂][4]


  [1]: https://github.com/bradfitz/http2/blob/master/frame_test.go
  [2]: /img/bVk09F
  [3]: https://github.com/http2jp/http2-frame-test-case
  [4]: https://github.com/bradfitz/http2/blob/master/frame.go

###疑问（已解决,文字已经更改）

标准提到的Frame Header是 8字节。但是 [4] 代码中，header长度为 9 ；node-http2 内的lib/framer.js 内func commonHeader也是长度9的header。看起来和标准是矛盾的？我哪里没有弄明白呢。

