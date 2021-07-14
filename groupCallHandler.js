const createPeerServerListeners = PeerServer => {
  PeerServer.on('connection', client => {
    console.log('successfully connecter to peer js server');
    console.log.og(client.id);
  });
};

module.exports = {
  createPeerServerListeners,
};
