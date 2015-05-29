// Intro to Streams2: New Node Streams (Part 1) – Cody A. Ray - http://codyaray.com/2013/04/intro-to-streams2-new-node-streams-part-1
var expect = require('chai').expect;
var util = require('util'),
  stream = require('stream');
// OBJECT ArrayStream
function ArrayStream(data) {
  var self = this;
 
  stream.Readable.call(self, { objectMode: true });
 
  self._read = function (size) {
    data.forEach(function(element) {
      self.push(element);
    });
    self.push(null);
  };
}
 
util.inherits(ArrayStream, stream.Readable);


var stream = require('stream')
 
describe("node stream", function () {
  it("readable:should stream one element at a time from the array", function (finish) {
    var array = [ 1,2,3 ],
      source = new ArrayStream(array),
      actual = [];
 
    source.on('data', function (data) {
        actual.push(data);
      })
    source.on('end', function () {
        expect(actual).to.deep.equal(array);
        finish();
      });
  });
}); // ArrayStream

// OBJECJT CsvPrepStream
function CsvPrepStream(fields) {
 var self = this;
 
 stream.Transform.call(self, { objectMode: true });
 
 self._transform = function (datapoint, encoding, callback) {
   var record = [];
   fields.forEach(function(field) {
     record.push(datapoint[field]);
   });
   self.push(record);
   callback();
 };
}   
util.inherits(CsvPrepStream, stream.Transform);
//  Passthrough + Transform

/* As you can see, PassThrough streams make great sources of data in testing! Just write some data into it in chunks,
   then end the stream. It’s that easy. If you’re writing anything other than strings or buffers, just remember that it must
   have objectMode=true. */
describe("Formatter: CsvPrepStream", function () { 

  it("transformstream:should emit records with correctly ordered fields", function (finish) {
    var data = [{
      key1: 1,
      key2: 2,
      key3: 3
    }, {
      key2: 22,
      key1: 11,
      key3: 33
    }]; 
    var fields = ["key1", "key2", "key3"]; 
    var prepper = new CsvPrepStream(fields),
      source = stream.PassThrough({ objectMode: true }),
      actual = []; 
    source.pipe(prepper);
    source.write(data[0]);
    source.write(data[1]);
    source.end();
 
    prepper
      .on('data', function (data) {
        actual.push(data);
      })
      .on('end', function () {
        expect(actual).to.deep.equal([ [1,2,3], [11,22,33] ]);
        finish();
      });
  });
 
}); // Formatter: CsvPrepStream