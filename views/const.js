<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CONSTANT MODE</title>
</head>
<body>
  <video id="videoEl"></video>
  <script src="socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    const id = localStorage.getItem('Stream-Constant-Identifier') || prompt('permanent id:');
    if(!id){
      location.reload()
    }else{
      localStorage.setItem('Stream-Constant-Identifier',id)
    }
    const videoEl = document.getElementById('videoEl');
    const imageEl = document.getElementById('animate_img');
    
    socket.emit('c-mode_recon',id)
    
    navigator.mediaDevices.getUserMedia({ video: {facingMode: {exact: 'environment'}} })
    .then((stream) => {

    videoEl.srcObject = stream;
    videoEl.play();
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frameRate = 30;

    function captureFrame() {
      canvas.width = videoEl.videoWidth;
      canvas.height = videoEl.videoHeight;
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      const frameUrl = canvas.toDataURL('image/jpeg');
      socket.emit('c-mode_stream',id,frameUrl)

      setTimeout(captureFrame, 1000 / frameRate);
    }
      captureFrame();
  })
  .catch((error) => {
    console.error('Error accessing the camera:', error);
  });

  </script>
</body>
</html>
  
