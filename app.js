const ip = require("./ip");
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000
const livePorts = {};
const subscribedIds = {};
const peers = {};
const constStream = {};
const cModeSub = {};

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

function staticFile(app,fileName){
  let fws = "/" + fileName;
  app.get(fws,(req,res)=>{
    res.sendFile(__dirname + fws)
  })
}

//expose required client files
staticFile(app,'lz-string.min.js')

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
app.get('/const',(req,res)=>{
  res.render('const')
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
    if(!livePorts[id])return;
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
  
  socket.on('peer-call',()=>{
  	let id = generateId();
  	peers[id]={
  		recon: false,
      id: id,
      sid: socket.id,
      callee: {
      	recon: false,
      	sid: '',
      	frame: ''
      },
      frame: ''
    }
  	io.to(socket.id).emit('peer-config',peers[id])
  })
  
  socket.on('peer-answer',id=>{
  	peers[id].callee.sid = socket.id;
  	io.to(peers[id].sid).emit('peer-answer',peers[id])
  })
  
  socket.on('peer-frame',(id,imgData,role)=>{
  	if(role === 'callee'){
  		peers[id].callee.frame = imgData;
  		io.to(peers[id].sid).emit('peer-frame',imgData);
  	}else if(role === 'caller'){
  		peers[id].frame = imgData;
  		io.to(peers[id].callee.sid).emit('peer-frame',imgData);
  	}
  })
  
  socket.on('peer-reconnect',config=>{
  	if(config.id in peers !== true)return io.to(socket.id).emit('peer-cancelled');
  	peers[config.id].recon = true;
  	peers[config.id].sid = socket.id;
  })
  
  socket.on('c-mode_recon',id=>{
    constStream[id]={
      cid: id,
      sid: socket.id,
      frame: ''
    }
  })
  
  socket.on('c-mode_stream',(id,imgData)=>{
    constStream[id].frame=imgData;
    Object.keys(cModeSub).forEach(e=>{
      io.to(e).emit('requested-cframe',constStream[cModeSub[e]].frame)
    })
  })
  
  socket.on('req_c-stream',id=>{
    cModeSub[socket.id]=id
  })
  
	socket.on('disconnect',()=>{
		console.log(socket.id+' disconnected');
		if(socket.id in subscribedIds){
			delete subscribedIds[socket.id]
		}


		setTimeout(()=>{
			Object.keys(peers).forEach(e=>{
				if(e.sid === socket.id){
					if(e.recon)return;
					e.callee.sid!==''?
					io.to(e.callee.sid).emit('peer-disconnect'):
					false;
					delete peers[e]
				}
			})
		},10000)
	})

})



server.listen(PORT,()=>{
  console.log('server listening at port '+PORT);
  console.log('ip domain: '+ip.address());
})
	
