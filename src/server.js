const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const app = express();
const bodyParser = require('body-parser')
const cv = require('opencv4nodejs');
const server = app.listen(5000);
const io = require('socket.io').listen(server);
const cors = require('cors')
const DIR = './uploads';
let rects = []

app.use(bodyParser.json({limit: '100mb'}));
app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(DIR));
app.use(cors)

let fileNameRes;
let fileType;
let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR);
    if(!fs.existsSync(DIR))
    {
      fs.mkdirSync(DIR);
    }
  },
  filename: (req, file, cb) => {
    fileNameRes = file.fieldname + "-" +
                  Date.now() + "." + 
                  path.extname(file.originalname);
    // console.log("fs process")
    fileType = file.mimetype;
    cb(null, fileNameRes);
  }
});

app.get('/test', function(req, res) {
  res.sendFile('public/index.html', {root: __dirname })
});

console.log("acsseses set headers") 

// app.get('/api', function (req, res) {
//   res.end('file catcher example');
// });

sessionList = []; 
let upload = multer({storage: storage});
app.post('/api/upload',upload.single('photo'), function (req, res) {
 	if (!req.file) {
    // console.log("No file received");
    return res.send({
      success: false
    });
  } else {
    sessionList.push({key:"req.sessionKey"})
    if(req.sessionKey != undefined) {
      return res.send({
        video:"sessionList.video",
        rects:"sessionList.rects"
      });
    }
    // console.log('file received');
    // console.log("file type ====" + fileType.split("/") );	
    // console.log(fileNameRes);
    return res.send({
      success: true,
      filename: fileNameRes,
      filetype: fileType.split("/")[0]
    });
  }
});
 
function memorySizeOf(obj) {
  var bytes = 0;

  function sizeOf(obj) {
      if(obj !== null && obj !== undefined) {
          switch(typeof obj) {
          case 'number':
              bytes += 8;
              break;
          case 'string':
              bytes += obj.length * 2;
              break;
          case 'boolean':
              bytes += 4;
              break;
          case 'object':
              var objClass = Object.prototype.toString.call(obj).slice(8, -1);
              if(objClass === 'Object' || objClass === 'Array') {
                  for(var key in obj) {
                      if(!obj.hasOwnProperty(key)) continue;
                      sizeOf(obj[key]);
                  }
              } else bytes += obj.toString().length * 2;
              break;
          }
      }
      return bytes;
  };

  function formatByteSize(bytes) {
      if(bytes < 1024) return bytes + " bytes";
      else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
      else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
      else return(bytes / 1073741824).toFixed(3) + " GiB";
  };
  return formatByteSize(sizeOf(obj));
};

io.on('connection', (socket) => {
  console.log('data connected');
  socket.on('disconnect', function(){
    console.log('data disconnected');
  });
  
  socket.on('add-data', (message) => {
    console.log("message", message)
    rects = message;
    // io.emit('data', {data:"data"});    
  });
});

app.post('/track', function(req, res){
  let dataCollector = []
  Object.keys(req.body.data.charData).forEach(function(k) {
    dataCollector.push(req.body.data.charData[k])
  });
  Object.keys(req.body.data).forEach(function(k) {
    // console.log("keys", k)
  });
  // console.warn("rects", req.body.data.rects)
  const matFromArray = new cv.Mat(Buffer.from(dataCollector), req.body.data.rows, req.body.data.cols, 24);
  const dst = matFromArray.cvtColor(cv.COLOR_BGRA2RGBA);
  cv.imwrite("./test.png", dst)
  const outBase64 = cv.imencode('.jpg', dst).toString('base64'); // Perform base64 encoding
  imageData = {rows:req.body.data.rows, cols:req.body.data.cols, imencode:outBase64, rects:rects}
  console.log("run")
  var spawn = require('child_process').spawn,
    py   = spawn('python', ['main.py']),
    data = imageData,
    dataString = '';
  py.stdout.on('data', function(data){
    dataString += data.toString();
  });
  py.stdout.on('end', function(){
    // console.log('Sum of numbers=');
    console.log("data", dataString)
  });
  py.stdin.write(JSON.stringify(data));
  py.stdin.end();

  // res.send(Object.keys(req.body))
});

const PORT = process.env.PORT || 5000;
 
// app.listen(PORT, function () {
//   console.log('Node.js server is running on port ' + PORT);
// });


