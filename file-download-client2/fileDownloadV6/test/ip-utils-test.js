var assert = require("assert")
var ip = require("../ipUtils")

describe('ip-utils', function(){
  describe('#isPrivate(ip)', function(){
    it('should check if an address is localhost', function() {
      assert.equal(ip.isPrivate('127.0.0.1'), true);
    });

    it('should check if an address is from a 192.168.x.x network', function() {
      assert.equal(ip.isPrivate('192.168.0.123'), true);
      assert.equal(ip.isPrivate('192.168.122.123'), true);
      assert.equal(ip.isPrivate('192.162.1.2'), false);
    });

    it('should check if an address is from a 172.16.x.x network', function() {
      assert.equal(ip.isPrivate('172.16.0.5'), true);
      assert.equal(ip.isPrivate('172.16.123.254'), true);
      assert.equal(ip.isPrivate('171.16.0.5'), false);
      assert.equal(ip.isPrivate('172.25.232.15'), true);
      assert.equal(ip.isPrivate('172.15.0.5'), false);
      assert.equal(ip.isPrivate('172.32.0.5'), false);
    });

    it('should check if an address is from a 169.254.x.x network', function() {
      assert.equal(ip.isPrivate('169.254.2.3'), true);
      assert.equal(ip.isPrivate('169.254.221.9'), true);
      assert.equal(ip.isPrivate('168.254.2.3'), false);
    });

    it('should check if an address is from a 10.x.x.x network', function() {
      assert.equal(ip.isPrivate('10.0.2.3'), true);
      assert.equal(ip.isPrivate('10.1.23.45'), true);
      assert.equal(ip.isPrivate('12.1.2.3'), false);
    });

    it('should check if an address is from a private IPv6 network', function() {
      assert.equal(ip.isPrivate('fe80::f2de:f1ff:fe3f:307e'), true);
    });

    it('should check if an address is from the internet', function() {
      assert.equal(ip.isPrivate('165.225.132.33'), false); // joyent.com
    });
  })


  describe('#address(name,family)', function () {
    describe('private IPv4', function () {
      it('should respond with a private ip', function () {
        ip.address('private','IPv4').forEach(function (address){
          assert.ok(ip.isPrivate(address));
        });
      });
    });

    describe('private', function () {
      ['IPv4', 'IPv6'].forEach(function (family) {
        describe(family, function () {
          it('should respond with a private ip:'+family, function () {
            ip.address('private', family).forEach(function (address){
              assert.ok(ip.isPrivate(address));
            });
          });
        });
      });
    });
  });

})
