// const twilio = require('twilio');
const express = require('express');
const socket = require('socket.io');
const cors = require("cors");
const { ExpressPeerServer } = require('peer');
const groupCallHandler = require('./groupCallHandler');
const { v4: uuidv4 } = require('uuid');

// 호스트에 접속할 포트번호 지정
const PORT = 5000;

// express 사용법 상용구
const app = express();

app.use(cors());

app.get('/', (req, res) => {
  res.send({ api: 'video-talker-api' });
});

// app.get('/api/get-turn-credentials', (req, res) => {
//   const accountSid = '';
//   const authToken = '';
//   const client = twilio();

//   client.tokens.create().then(token => res.send({ token }));
// });

// 서버 동작시키는 상용구 
const server = app.listen(PORT, () => {
  console.log(`server is listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

const peerServer = ExpressPeerServer(server, {
  debug: true,
});

app.use('/peerjs', peerServer);

groupCallHandler.createPeerServerListeners(peerServer);


// socket.io를 사용하기위한 소켓 설정
const io = socket(server, {
  // cors옵션을 따로해줌
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

let peers = [];
let groupCallRooms = [];

const broadcastEventTypes = {
  ACTIVE_USERS: 'ACTIVE_USERS',
  GROUP_CALL_ROOMS: 'GROUP_CALL_ROOMS',
};


// io connection은 클라이언트와 연결관계가 이어지면 자동으로 실행됨
io.on('connection', socket => {
  socket.emit('connection', null);
  console.log('new user connected');
  console.log(socket.id);

  socket.on('register-new-user', data => {
    peers.push({
      username: data.username,
      socketId: data.socketId,
    });
    console.log('registered new user');
    console.log(peers);

    io.sockets.emit('broadcast', {
      event: broadcastEventTypes.ACTIVE_USERS,
      activeUsers: peers,
    });

    io.sockets.emit('broadcast', {
      event: broadcastEventTypes.GROUP_CALL_ROOMS,
      groupCallRooms,
    });
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    peers = peers.filter(peer => peer.socketId !== socket.id);
    io.sockets.emit('broadcast', {
      event: broadcastEventTypes.ACTIVE_USERS,
      activeUsers: peers,
    });

    groupCallRooms = groupCallRooms.filter(room => room.socketId !== socket.id);
    io.sockets.emit('broadcast', {
      event: broadcastEventTypes.GROUP_CALL_ROOMS,
      groupCallRooms,
    });
  });

  // listeners related with direct call

  socket.on('pre-offer', data => {
    console.log('pre-offer handled');
    io.to(data.callee.socketId).emit('pre-offer', {
      callerUsername: data.caller.username,
      callerSocketId: socket.id,
    });
  });

  socket.on('pre-offer-answer', data => {
    console.log('handling pre offer answer');
    io.to(data.callerSocketId).emit('pre-offer-answer', {
      answer: data.answer,
    });
  });

  socket.on('webRTC-offer', data => {
    console.log('handling webRTC offer');
    io.to(data.calleeSocketId).emit('webRTC-offer', {
      offer: data.offer,
    });
  });

  socket.on('webRTC-answer', data => {
    console.log('handling webRTC answer');
    io.to(data.callerSocketId).emit('webRTC-answer', {
      answer: data.answer,
    });
  });

  socket.on('webRTC-candidate', data => {
    console.log('handling ice candidate');
    io.to(data.connectedUserSocketId).emit('webRTC-candidate', {
      candidate: data.candidate,
    });
  });

  socket.on('user-hanged-up', data => {
    console.log('handling user hanged up');
    io.to(data.connectedUserSocketId).emit('user-hanged-up');
  });

  // listeners related with group call
  socket.on('group-call-register', data => {
    // create unique Id with uuid
    const roomId = uuidv4();
    socket.join(roomId);

    const newGroupCallRoom = {
      peerId: data.peerId,
      hostName: data.username,
      socketId: socket.id,
      roomId: roomId,
    };

    groupCallRooms = [...groupCallRooms, newGroupCallRoom];
    io.sockets.emit('broadcast', {
      event: broadcastEventTypes.GROUP_CALL_ROOMS,
      groupCallRooms,
    });
  });

  socket.on('group-call-join-request', data => {
    io.to(data.roomId).emit('group-call-join-request', {
      peerId: data.peerId,
      streamId: data.streamId,
    });

    socket.join(data.roomId);
  });

  socket.on('group-call-user-left', data => {
    socket.leave(data.roomId);

    io.to(data.roomId).emit('group-call-user-left', {
      streamId: data.streamId,
    });
  });

  socket.on('group-call-closed-by-host', data => {
    groupCallRooms = groupCallRooms.filter(room => room.peerId !== data.peerId);

    io.sockets.emit('broadcast', {
      event: broadcastEventTypes.GROUP_CALL_ROOMS,
      groupCallRooms,
    });
  });
});
