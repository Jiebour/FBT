function isPrivate(addr) {
  return addr.match(/^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^192\.168\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^169\.254\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^fc00:/) != null || addr.match(/^fe80:/) != null;
};

function isPublic(addr) {
  return !isPrivate(addr);
}

function isLoopback(addr) {
  return /^127\.0\.0\.1/.test(addr)
    || /^fe80::1/.test(addr)
    || /^::1/.test(addr);
};

function loopback(family) {
  family = family.toLowerCase();
  if (family !== 'ipv4' && family !== 'ipv6') {
    throw new Error('family must be ipv4 or ipv6');
  }

  return family === 'ipv4'
    ? '127.0.0.1'
    : 'fe80::1';
};

function address(name, family) {
    if (family !== 'IPv4' && family !== 'IPv6') {
      throw new Error('family must be IPv4 or IPv6');
    }
    if (name !== 'public' && name !== 'private') {
      throw new Error('name must be private or pubic');
    }
    
    var ipAddresses = [];
  
    var interfaces = require('os').networkInterfaces();
    for (var devName in interfaces) {
        var iface = interfaces[devName];
        for (var i = 0; i < iface.length; i++) {
            var alias = iface[i];
            if (alias.family == family && !alias.internal && !isLoopback(alias.address)){//NO loopback!NO internal address!
              if(name == 'public' && isPublic(alias.address)){
                ipAddresses.push(alias.address);
              } else if(name == 'private' && isPrivate(alias.address)) {
                ipAddresses.push(alias.address);
              }
            }
        }
    }

    return ipAddresses;
}

exports.address = address;
exports.isPrivate = isPrivate;
exports.isPublic = isPublic;
