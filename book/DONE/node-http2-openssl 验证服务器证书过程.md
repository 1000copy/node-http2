nodehttp2的example内有http/2服务器(server.js)和客户端(client.js)的的代码案例。其中的server.js 提供了一个简单的http/2服务器代码模板。

http/2的一个特点，就是流量走向了TLS，也就是走了加密信道。http 1.x都是明文的，文本化的，机器可读人也可读，调试和差错都比较容易，编码也不难。虽然大家一再说为了性能的提升，http2的[性能](https://http2.golang.org/gophertiles)也确实有很大的提升，然后走向TLS终究让很多人感到不快。

正如 微博网友 @Livid 说：

    越来越多的网络流量 TLS 化其实是一件挺悲哀的事情。就像现实生活中，如果越来越多的地方的入口
    （机场，地铁，甚至办公楼）需要安检，那其实并不是一件让人愉快的事情。
    1. 最早的一切互联网协议，都是由一群非常善良的人设计的。这些协议在一个完美的环境里可以完美工作。
    2. 但是这个世界是不完美的。非常不完美。于是，从某个时间点开始，进入到某种攻防游戏中。
    全网流量的 TLS 化是第一步。

理论上说，尽管http/2 可以在plain TCP上跑，但是无论chrome，还是firefox都仅仅选择实现了TLS的。抛开这些朦胧的伤感，TLS也是必然的现实，不如我们去面对它。

到底TLS过程是怎样的？我想用openssl，从外部来看node-http2这个黑盒。

###证书

TLS需要证书，这是一个显著的和前些版本的差别。正规的证书，需要第三方发布，并且是比较权威的第三方，期间的过程也需要有些纸质的证明文件的往来。当然也得缴费，且很可能价值不菲。这个东西是用来证明服务器身份的，在那个地方，是谁的等等。当然不能你自己所说就算的。

还好，CA们还是网开一面。如果只是测试，我们可以做自签名证书。特点就是证书内的Issuer（签署人），subject（被证明人）都是一个人。典型的做法，就是使用openssl来做（刚刚发现Windows7自带openssl：）。

    $ openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 101 -nodes
    Generating a 2048 bit RSA private key
    ...........+++
    ......+++
    writing new private key to 'key.pem'
    -----
    You are about to be asked to enter information that will be incorporated
    into your certificate request.
    What you are about to enter is what is called a Distinguished Name or a DN.
    There are quite a few fields but you can leave some blank
    For some fields there will be a default value,
    If you enter '.', the field will be left blank.
    -----
    Country Name (2 letter code) [AU]:CN // 国家码
    State or Province Name (full name) [Some-State]:SC//地区码
    Locality Name (eg, city) []:localcity// 本地码
    Organization Name (eg, company) [Internet Widgits Pty Ltd]:sanrex // 公司名称
    Organizational Unit Name (eg, section) []:trd // 部门
    Common Name (eg, YOUR name) []:samwise// 名字
    Email Address []:frodo@gmail.com //邮箱


###服务器端 

    $node example\server.js 
###客户端

    $openssl s_client -connect localhost:8080

###客户端输出 
```
    
    λ openssl s_client -connect localhost:8080
    CONNECTED(00000003)
    depth=0 /C=CN/ST=SC/L=localcity/O=sanrex/OU=trd/CN=samwise/emailAddress=frodo@gmail.com
    verify error:num=18:self signed certificate// 这里也指明了是自签名证书，是不被广大浏览器信任的
    verify return:1
    depth=0 /C=CN/ST=SC/L=localcity/O=sanrex/OU=trd/CN=samwise/emailAddress=frodo@gmail.com
    verify return:1
    ---
    Certificate chain // 自签名，当然s(subject),i(issuer)是一样的
     0 s:/C=CN/ST=SC/L=localcity/O=sanrex/OU=trd/CN=samwise/emailAddress=frodo@gmail.com
       i:/C=CN/ST=SC/L=localcity/O=sanrex/OU=trd/CN=samwise/emailAddress=frodo@gmail.com
    ---
    Server certificate// 这个证书，和我服务器生成的证书是一样的
    -----BEGIN CERTIFICATE-----
    MIIEejCCA2KgAwIBAgIJAMOercExD57pMA0GCSqGSIb3DQEBBQUAMIGEMQswCQYD
    VQQGEwJDTjELMAkGA1UECBMCU0MxEDAOBgNVBAcTB2NoZW5nZHUxDzANBgNVBAoT
    BnNhbnJleDEMMAoGA1UECxMDdHJkMRQwEgYDVQQDEwtsaXVjaHVhbmp1bjEhMB8G
    CSqGSIb3DQEJARYSMTAwMGNvcHlAZ21haWwuY29tMB4XDTE1MDQyMTAyMDQwN1oX
    DTE1MDczMTAyMDQwN1owgYQxCzAJBgNVBAYTAkNOMQswCQYDVQQIEwJTQzEQMA4G
    A1UEBxMHY2hlbmdkdTEPMA0GA1UEChMGc2FucmV4MQwwCgYDVQQLEwN0cmQxFDAS
    BgNVBAMTC2xpdWNodWFuanVuMSEwHwYJKoZIhvcNAQkBFhIxMDAwY29weUBnbWFp
    bC5jb20wggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDOkaP2DnPPRLUw
    wOFQNj4LIPkdha/kn5Aql8nauM8a5nneZO876fF3JT7q7Lq1jtgWhlQgljLywB40
    +/qrge6lrVLQN3r+BiKFoHJlTR0HFOhtb2fwUV3bA4mrvLIUJgGflvBGR4BSjTZ8
    CkSZYWlNAxztPDFi8wY6CpCJlSU3jaAoqYvBJdjT1lCnTvt5X5tPzs69PqSlPzcL
    AVOEcIehJ27LHMv6f73IMhi7BOK5tuphn8Aff0+VmE8SCesMi4Jy+OiRcXHiPJWp
    GPHVOMmnCCyzZZtSg81frBtqSPmnN3lcOpQgFeooIzRBpWZx210v8JDiLFebzz1F
    YTNebrXtAgMBAAGjgewwgekwHQYDVR0OBBYEFKCAOSe0ra1/SrzfFYLRpdvDVlur
    MIG5BgNVHSMEgbEwga6AFKCAOSe0ra1/SrzfFYLRpdvDVluroYGKpIGHMIGEMQsw
    CQYDVQQGEwJDTjELMAkGA1UECBMCU0MxEDAOBgNVBAcTB2NoZW5nZHUxDzANBgNV
    BAoTBnNhbnJleDEMMAoGA1UECxMDdHJkMRQwEgYDVQQDEwtsaXVjaHVhbmp1bjEh
    MB8GCSqGSIb3DQEJARYSMTAwMGNvcHlAZ21haWwuY29tggkAw56twTEPnukwDAYD
    VR0TBAUwAwEB/zANBgkqhkiG9w0BAQUFAAOCAQEAc/zjXC/HXcLeAc0zr+y6ERzO
    4HUitKzSFYa3j6OXn2K8X7X58hQOOsanfIuSI5eJjO8UrWoYoFdYBboIhGWHbEX9
    m3GxIAmWLgXGddVYo+MI9dcABo6GlGZCZFNEuWv1Mfe9/DHi+jf0gOiiSwFRiRFR
    HZ3K7sXTVqAssE1VdZOZBTbZUkTBkI8QMcBC9zLhI3CMYgXYqt95/5w4y4MCuZJ8
    4hZr1Swq+a4M7tzidQg6PD1Tacq8t9Be/IxCEvT1JJ+viulCDG2DDELMG1ZciZjb
    dygx46jLzSPlhorqsC38KcEIqMaUSQNwX686rLp2NVnvMeg3t8F7JlHamfd2YQ==
    -----END CERTIFICATE-----
    subject=/C=CN/ST=SC/L=localcity/O=sanrex/OU=trd/CN=samwise/emailAddress=frodo@gmail.com
    issuer=/C=CN/ST=SC/L=localcity/O=sanrex/OU=trd/CN=samwise/emailAddress=frodo@gmail.com
    ---
    No client certificate CA names sent
    ---
    SSL handshake has read 1312 bytes and written 444 bytes
    ---
    New, TLSv1/SSLv3, Cipher is AES128-SHA
    Server public key is 2048 bit
    Compression: NONE
    Expansion: NONE
    SSL-Session:
        Protocol  : TLSv1
        Cipher    : AES128-SHA
        Session-ID: 53D09139D2AF68CF254772FBA3C3133944C2F11CD451360E1C03ED54EDF5BAEA
        Session-ID-ctx:
        Master-Key: C19B36148B180EB26487873D575B73A0C4C763C1E07BD5571E9F35A7C5520C44AF423A5AEE4DE6F27D74C44CAC9D084C
        Key-Arg   : None
        Start Time: 1429581989
        Timeout   : 300 (sec)
        Verify return code: 18 (self signed certificate)
    ---
```

以上过程，说明server.js是支持TLS的，也可以做了证书的传递和TLS handshake的。而不是只能和自己的client.js 玩的，这是一个开放的玩伴。
