// peerjs를 위한 connection
const createPeerServerListeners = PeerServer => {
  PeerServer.on('connection', client => {
    console.log('successfully connecter to peer js server');
    console.log(client.id);
  });
};

module.exports = {
  createPeerServerListeners,
};
