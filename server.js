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

io.on('connection', socket => {
  socket.emit('connection', null);
  console.log('new user connected');
  console.log(socket.id);
});
