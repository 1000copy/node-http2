
// http://stackoverflow.com/questions/4012998/what-it-the-significance-of-the-javascript-constructor-property

function Base(p1) {
  this.p1 = p1;
}

Base.prototype.getP1 = function() {
  return this.p1;
}

function Heir(p2,p1){
	Base.call(this,p1);
	this.p2 = p2;
}


Heir.prototype = new Base();
Heir.prototype.getP2 =  function(){
	return this.p2
}

// Heir.prototype.constructor = Heir;

var expect = require('chai').expect;
var util = require('./util');

describe('impl_class.js', function() {
  it('hasOwnProperty', function(done) {
  	//base
  	var b = new Base ;
  	expect(b.hasOwnProperty("p1")).to.equal(true)  	
  	expect("getP1" in b).to.equal(true)
  	expect(b.hasOwnProperty("getP1")).to.equal(false)
  	expect(typeof b).to.equal("object")
  	expect(typeof Base).to.equal("function")
  	// heir
  	var h = new Heir;
  	expect(h.hasOwnProperty("p2")).to.equal(true)
  	expect("getP2" in h).to.equal(true)
  	expect("getP1" in h).to.equal(true)
  	expect("p1" in h).to.equal(true)
  	done();
  });
   it('heir', function(done) {
  	//base
  	var b = new Base ;
  	expect("p1" in Heir.prototype).to.equal(true)
  	expect("getP2" in Heir.prototype).to.equal(true)
  	expect("getP1" in Heir.prototype).to.equal(true)
  	console.log(Heir.prototype)
  	expect(typeof Heir.prototype).to.equal("object")
  	
  	expect(Object.keys(Heir.prototype).length).to.equal(2)  	
  	// why?
  	// 没有p2是可以理解的，因为Heir没有实例化。
  	// 有p1也是可以理解的，因为new Base了。
  	// 但是为何没有getp1?
  	expect(Object.keys(Heir.prototype).join()).to.equal("p1,getP2")  	

  	// heir
  	done();
  });
  it('should work as expected', function(done) {
  	var b = new Base('10');	
   	expect(b.getP1()).to.be.equal('10');
   	var c = new Heir('20','10');	
   	expect(c.getP1()).to.be.equal('10');
   	expect(c.getP2()).to.be.equal('20');
   	expect(Heir.prototype.constructor).to.equal(Base)
   	Heir.prototype.constructor = Heir;
   	expect(Heir.prototype.constructor).to.equal(Heir)   	

   	// expect(Heir).to.equal("Heir")   	
   	for(var propertyName in Heir.prototype) {
	   console.log(propertyName)
	}
	console.log("----------------")
	for(var propertyName in Base.prototype) {
	   console.log(propertyName)
	}

	console.log("----------------1")
	var b = new Base('10')
	expect(b.prototype).to.equal(undefined)
	var b = new Base
	expect(new Base).to.equal(Base.prototype)
	console.log("----------------")
	for(var propertyName in new Base('10')) {
	   console.log(propertyName)
	}
   	done();
  });
});

/*
Trying to bend by head around Javascript's take on OO...and, like many others, running into confusion about the constructor property. In particular, the significance of the constructor property, as I can't seem to make it have any effect. E.g.:

function Foo(age) {
    this.age = age;
}

function Bar() {
    this.name = "baz"; 
}

Bar.prototype = new Foo(42); 
var b = new Bar;    

alert(b.constructor); // "Foo". That's OK because we inherit `Foo`'s prototype.
alert(b.name);        // "baz". Shows that Bar() was called as constructor.
alert(b.age);         // "42", inherited from `Foo`.
In the above example, the object b seems to have had the right constructor called (Bar) – and it inherits the age property from Foo. So why do many people suggest this as a necessary step:

Bar.prototype.constructor = Bar;
Clearly, the right Bar constructor was called when constructing b, so what impact does this prototype property have? I am curious to know what practical difference it actually makes to have the constructor property set 'correctly'—as I can't see it having any affect on which constructor is actually called after an object is created.

*/