var util=require('util');

module.exports={
  'Test 1': function(test){
    test.expect(3);
    test.equal(true, 1==1);
    test.equal(1, 1);
    test.deepEqual([1,2,3], [1,2,3]);
    test.done();
  },
  'Test 2': function(test){
    test.expect(3);
    test.equal(true, 1==1);
    test.ok(1==1, 'equal');
    //test.ok(2==1, 'not equal');
    test.deepEqual([1,2,3], [1,2,3]);
    test.done();
  }

};
