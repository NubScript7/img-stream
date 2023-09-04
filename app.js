const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000
const livePorts = {};
const subscribedIds = {};
const peers = {};
const subscribedPeers = {};

app.set('view engine','ejs');
app.use(express.json());

function generateId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 5;
  let id = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    id += characters.charAt(randomIndex);
  }

  return id;
}
app.get('/direct',(req,res)=>{
  res.render('direct')
})

app.get('/peer',(req,res)=>{
  res.render('peer')
})

app.get('/streamer',(req,res)=>{
  res.render('streamer')
})

app.get('/receiver',(req,res)=>{
  res.render('receiver')
})

io.on('connection',socket=>{

  socket.on('request-live',name=>{
    let id = generateId();
    console.log(id)
    livePorts[id]={
      sid: socket.id,
      id: id,
      name: name,
      views: 0,
      frame: ''
    }
    io.to(socket.id).emit('live-config',livePorts[id])
  })

  socket.on('img-stream',(id,imgData)=>{
    livePorts[id].frame=imgData;
    Object.keys(subscribedIds).forEach(e=>{
      io.to(e).emit('requested-frame',livePorts[subscribedIds[e]].frame)
    })
  })
  socket.on('subscribe',id=>{
    console.log(socket.id+' subscribed to '+id)
    subscribedIds[socket.id]=id;
    livePorts[id].views+=1;
    io.to(livePorts[id].sid).emit('views-update',livePorts[id].views)
  })
  socket.on('direct-stream',frame=>{
	socket.broadcast.emit('direct-stream',frame)
  })
  socket.on('recon-notice',id=>{
    console.log(socket.id+' sent a recon notice to '+livePorts[id].sid);
    io.to(livePorts[id].sid).emit('force-rest');
  })
  socket.on('req-peers',()=>{
    let id = generateId();
    peers[id]={
      id: id,
      sid: socket.id,
      frame: ''
    }
    io.to(socket.id).emit('peer-config',peers[id])
  })
  socket.on('peer-frame',(id,imgData)=>{
    peers[id].frame=imgData;
    Object.keys(subscribedPeers).forEach(e=>{
      io.to(peers[e].sid).emit('peer-frame',peers[subscribedPeers[e]].frame)
    })
  })
  socket.on('peer-connect',(p1id,p2id)=>{
    subscribedPeers[p1id]=p2id;
  })
  socket.on('disconnect',()=>{
    console.log(socket.id+' disconnected');
    delete subscribedIds[socket.id]
  })

})



server.listen(PORT,()=>{
  console.log('server listening at port '+PORT)
})
