const express = require('express');
const socket = require('socket.io');

const PORT = 5000;

const app = express();

const server = app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
  console.log(`http://localhost:${PORT}`);
});

app.get('/', (req, res) => res.send('Hello World!'));

const io = socket(server, {
  cors: {
    origin: '*',
    methids: ['GET', 'POST'],
  },
});

let peers = [];

const broadcastEventTypes = {
  ACTIVE_USERS: 'ACTIVE_USERS',
  GROUP_CALL_ROOMS: 'GROUP_CALL_ROOMS',
};

// user가 접속하면 발생하는 이벤트
io.on('connection', socket => {
  socket.emit('connection', null);
  console.log('new user connected');
  console.log(socket.id);

  // 새로운 user 등록시 로직
  socket.on('register-new-user', data => {
    // client로부터 data를 받아 peer현황에 추가해준다
    peers.push({
      username: data?.username,
      socketId: data?.socketId,
    });
    console.log('registered new user');
    console.log(peers);

    // 그다음 다시 해당방에 접속한 모든 클라이언트에게 broadcast로 전부 뿌려준다
    io.sockets.emit('broadcast', {
      // 이때 eventtype을 지정해줘서 어떤작업을 할지 클라이언트에게 알려줌
      // 이건 그냥 설계의 문제 딱히 어려울거 없음
      event: broadcastEventTypes.ACTIVE_USERS,
      activeUsers: peers,
    });
  });

  // user가 접속을 끊으면 발생하는 이벤트
  socket.on('disconnect', () => {
    console.log('userdisconnected');
    // user가 접속을 끊으면 해당 유저의 socket정보가 넘어온다
    // 접속을 끊은 유저를 peers list에서 제거 한후 최신화를 위해 broadcast를 하고 유저 최신화를 진행한다
    peers = peers.filter(peer => peer.socketId !== socket.id);

    // 그다음 다시 해당방에 접속한 모든 클라이언트에게 broadcast로 전부 뿌려준다
    io.sockets.emit('broadcast', {
      // 이때 eventtype을 지정해줘서 어떤작업을 할지 클라이언트에게 알려줌
      // 이건 그냥 설계의 문제 딱히 어려울거 없음
      event: broadcastEventTypes.ACTIVE_USERS,
      activeUsers: peers,
    });
  });

  // listners related with direct call
  // 전화를 걸거나 받을때 첫번째 단계를 구현
  socket.on('pre-offer', data => {
    console.log('pre-offer handled');
    // io.to 귓솔말 같은거임 해당 socketId로만 내용을 전달 하겠다(맨처음 누구에게 전화를 걸것인지 해당 유저에게 알려야 하니깐)
    io.to(data.callee.socketId).emit('pre-offer', {
      callerUsername: data.caller.username,
      // 지금 내용을 전달하라고 트리거를 건들인 socket의 id이다
      callerSocketId: socket.id,
    });
  });

  // 2단계에서 callee가 전화를 수락했는지 거절했는지에대한 정보를 caller에게 전달
  socket.on('pre-offer-answer', data => {
    io.to(data.callerSocketId).emit('pre-offer-answer', {
      answer: data.answer,
    });
  });
});
