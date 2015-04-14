var expect = require('chai').expect;
var util = require('./util');

var stream = require('../lib/protocol/stream');
var Stream = stream.Stream;

function createStream() {
  var log = require('bunyan').createLogger({
      name: "name",
      stream: process.stderr,
      // level: process.env.HTTP2_LOG,
      level:'debug',
      serializers: require('../lib/http').serializers
    })
  // log.debug('dafad')
  var stream = new Stream(log, null);
  // var stream = new Stream(util.log, null);
  stream.upstream._window = Infinity;
  return stream;
}

// test command :  mocha -g mysend
describe('mystream.js', function() {
    describe('mysend', function() {
      it('trigger the appropriate state transitions', function(done) {
        var stream = createStream();
        // 当对象从stream流入时，在upstream一端变成FRAME
        // 反之，从upstream流入对象，从stream流出的就是FRAME
        //header 
        stream.headers({ ':path': '/' });
        var frame = stream.upstream.read() 
        expect(frame.type).to.be.equal('HEADERS')
        expect(stream.state).to.be.equal('OPEN')
        // end stream
        stream.end()
        expect(stream.state).to.be.equal('HALF_CLOSED_LOCAL')
        var frame = stream.upstream.read() 
        expect(frame.type).to.be.equal('DATA')
        expect(frame.flags.END_STREAM).to.be.equal(true)
        // incoming
 
        var activeCount = 0;
        function count_change(change) {
          activeCount += change;        
        }
        // stream.on('headers',function(headers){console.log(headers)})
        // stream.on('readable',function(){console.log('waiting you more time')})
        incoming = { type: 'HEADERS', flags: { }, headers: { ':status': 200 } }
        incoming.count_change = count_change;
        stream.upstream.write(incoming );
        data = { type: 'DATA'   , flags: { END_STREAM: true  }, data: new Buffer(5) } 
        data.count_change = count_change;
        stream.upstream.write(data);
        expect(stream.state).to.be.equal('CLOSED')
        // stream.log.info('bunyun')
        done();
      });
    });   
     describe('t0', function() {
      it('t00', function(done) {        
        done();
      });
    });   
});
