var expect = require('chai').expect;

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
  });
});
