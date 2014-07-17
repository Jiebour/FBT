var assert = require("assert")
describe('Array', function(){
  describe('#indexOf()', function(){
    it('should return -1 when the value is not present', function(){
      assert.equal(-1, [1,2,3].indexOf(5));
      assert.equal(-1, [1,2,3].indexOf(0));
    })
  })


  describe('#ayncTest()', function(){
    it('should not fail. this is a ansync test without error', function(done){
      setTimeout(function(){
        assert.ok(1==1);
        done();
      },100);
    })
  })
})
