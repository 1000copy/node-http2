var expect = require('chai').expect;
var util = require('./util');

var framer = require('../lib/protocol/framer');
var Serializer = framer.Serializer;
var Deserializer = framer.Deserializer;

describe('my.js', function() {
  describe('scenario', function() {
    describe('connection setup', function() {
      it('should work as expected', function(done) {
       expect(1).to.be.equal(1);
       // console.log(1)
       done();
      });
    });
  });
  describe('scenario', function() {  
    it('should work as expected', function(done) {
     expect(1).to.be.equal(1);
     // console.log(1)
     done();
    });
  });
  describe('scenario', function() {  
    it('should work as expected', function(done) {
      var Transform = require('stream').Transform;
      var Stream = require('stream');
      var stream = new Stream();

      stream.pipe = function(dest) {
        dest.write('abc');
        return dest;
      };
      function createParser () {
          var parser = new Transform();
          parser._transform = function(data, encoding, done) {
              // data is Buffer object 
              this.push(data.slice(0,1));
              done();
          };
          return parser;
      }
      //  a transformer ,transmit abc to a
      var p = createParser();
      stream.pipe(p).pipe(process.stdout); 
      expect('a').to.be.equal('a');
      // console.log(1)
      done();
    });
      describe('1000copy:ping frame construct', function() {
      it('frame cons.', function() {
        var f =  {
            type: 'PING',
            flags: { ACK: false },
            stream: 15,

            data: new Buffer('1234567887654321', 'hex')
          };
        var r = new Buffer('000008' + '06' + '00' + '0000000F' +   '1234567887654321', 'hex');
        
        var frame = {};
        Deserializer.commonHeader(r.slice(0,9), frame);
        expect(frame).to.deep.equal({
          type:   f.type,
          flags:  f.flags,
          stream: f.stream
        });
        var test = f ;
        var buffers = [r.slice(9)];
        var header_buffer = r.slice(0,9);
        Serializer.commonHeader(test, buffers);
        expect(buffers[0]).to.deep.equal(header_buffer);
        // console.log(f)
        // console.log(buffers);
        // console.log(header_buffer);
      });
      });
     describe('1000copy:ping frame wire to object ', function() {
          it('frame cons.', function() {
            
              // length,type,flags,stream id
            var r = new Buffer('000008' + '06' + '00' + '0000000F' +   '1234567887654321', 'hex');        
            var frame = {};
            Deserializer.commonHeader(r, frame);
            expect(frame.type ,'PING');
            expect(frame.flags.ACK ,false);
            expect(frame.stream).to.deep.equal(0x0f);
          });
      });
     describe('1000copy:ping frame object to wire ', function() {
          it('frame cons.', function() {
            
              // length,type,flags,stream id
            var r = new Buffer('000008' + '06' + '00' + '0000000F' +   '1234567887654321', 'hex');                
            var f =  {
                type: 'PING',
                flags: { ACK: false },
                stream: 15,
                data: new Buffer('1234567887654321', 'hex')
              };

            var buffers = [f.data]; // pay load as buffer        
            Serializer.commonHeader(f, buffers);
            expect(buffers[0]).to.deep.equal(r.slice(0,9));        
          });
      });
     //

  describe('strerristty', function() {
    it('strerristty', function() {
      console.log("VIP abunt")
      if (process.stderr.isTTY) {
        console.log("VIP abunt")
        var path = require('path');                
        var fs = require('fs');
        var spawn = require('child_process').spawn;
        console.log(path.dirname(require.resolve('bunyan')))
        var bin = path.resolve(path.dirname(require.resolve('bunyan')), '..', 'bin', 'bunyan');

        if(bin && fs.existsSync(bin)) {
          console.log(bin)
          logOutput = spawn(bin, ['-o', 'short'], {
            stdio: [null, process.stderr, process.stderr]
          }).stdin;
        }
      }
    })
  })
  describe('tls', function() {
    it('tls', function() {      
     var fs = require('fs');
        var path = require('path');
        var tls = require('tls');
        tls.createServer({
          key: fs.readFileSync("example/localhost.key"),
          cert: fs.readFileSync("example/localhost.crt"),
          NPNProtocols: ['h2', 'http 1.1','http 1.0']
        }, function(socket) {
          console.log("s1:"+socket.npnProtocol);
        }).listen(1111);
        //client
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      tls.connect({ port: 1111 }, function() {
          // console.log(this.npnProtocol);
      });
      tls.connect({ port: 1111 ,NPNProtocols: ['h2'] }, function() {
          // console.log(this.npnProtocol);        
      });
      tls.connect({ port: 1111, NPNProtocols: ['http 1.1'] }, function() {
          // console.log(this.npnProtocol);          
      });      
      tls.connect({ port: 1111, NPNProtocols: ['http 1.0'] }, function() {
          // console.log(this.npnProtocol);
      });
    })
  })

  

    describe('parse', function() {
      it('urlparse', function() {
          var url = require('url');
          var options = "https://localhost:8080/server.js"
          if (typeof options === "string") {
            options = url.parse(options);
            expect(options.hostname).to.be.equal("localhost")
            expect(options.port).to.be.equal("8080")
          }   
      });
    });
    // http://stackoverflow.com/questions/5055746/cloning-an-object-in-node-js
    describe('cloneobject by util._extend', function() {
      it('failure', function() {
            var obj1 = {x: 5, y:5};
            var obj2 = obj1;
            obj2.x = 6;
            expect(obj1.x).to.be.equal(6); 

      });
      it('itwork', function() {
            var util = require('util');
            var obj1 = {x: 5, y:5};
            var obj2 = util._extend({},obj1);
            obj2.x = 6;
            expect(obj1.x).to.be.equal(5); 
      });
      it('!!', function() {
            expect(!!false).to.be.equal(false); 
      });
    });

    


    //
    describe('callNTimes', function() {
          it('callNTimes2', function() {
            // // callNTimes 指定 done 函数在第limit此调用后，才真的执行。有点费解。
            function callNTimes(limit, done) {
              if (limit === 0) {
                done();
              } else {
                var i = 0;
                return function() {
                  i += 1;
                  if (i === limit) {
                    done();
                  }
                };
              }
            };
            function inviteVIP ()         {
              console.log("VIP abunt")
            }
            inviteVIP = callNTimes(3,inviteVIP);
            inviteVIP();// 什么也不做，只是累记
            inviteVIP();// 什么也不做，只是累记
            inviteVIP();// 累计到3，执行原函数             
          });
      });
  });
});


        