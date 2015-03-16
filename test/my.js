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
  });
});
