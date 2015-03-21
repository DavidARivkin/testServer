'use strict'
var os      = require('os');
var fs      = require("fs");
var es6shim = require('es6-shim');
var restify = require('restify');
var address = 3080;
var prefix ="/api/";
var userDataPath = "./userData/";

var server  = restify.createServer();
server.pre(restify.pre.sanitizePath());
server.use(restify.CORS());

var superParams = "";
server.use(restify.bodyParser({
    maxBodySize: 0,
    mapParams: true,
    mapFiles: false,
    overrideParams: false,
    /*multipartHandler: function(part) {
      console.log("multipartHandler", part );
        part.on('data', function(data) {
                console.log("multipartHandler", data );
          superParams = data;
        });
    },
    multipartFileHandler: function(part) {
      console.log("multipartFileHandler", part );
        part.on('data', function(data) {
        });
    },*/
    keepExtensions: true,
    uploadDir: "./uploads",//os.path.absPath(os.tmpdir(),
    multiples: true
 }));
 
 //for static files
 //server.get(/\/api\/designs\/?.*/, restify.serveStatic({
 // directory: './userData/designs/demo-design/',
 //}));


////////////////////
function send(req, res, next) {
   res.send('hello ' + req.params.name);
   return next();
}

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
  next();
}
/*server.post(prefix+'hello', function create(req, res, next) {
 res.send(201, Math.random().toString(36).substr(3, 8));
 return next();
});
server.put(prefix+'hello', send);
server.head(prefix+'hello/:name', send);
server.del(prefix+'hello/:name', function rm(req, res, next) {
 res.send(204);
 return next();
});*/

var designs = [];
var assemblies = {
  "RobotoMaging":[
  ]
}

//FIXME: obviously would not be stored like this
designs = require(userDataPath+"designs.json");

function writeDesigns(){
  var strDesigns = JSON.stringify( designs );
  fs.writeFileSync( userDataPath+"designs.json", strDesigns );
}

////////////
server.get('/api', function (req, res, next) {
  res.send('welcome to the jam api!');
});


//designs
server.get(prefix+'designs', function (req, res, next) {
  res.send(designs);
});

server.post(prefix+'designs', function (req, res, next) {

  var params = req.params;
  var DEFAULTS = {
    "name":"RobotoMaging",
    "description":"such a great design",
    "version": "0.0.0",
    "licenses":[
    ],
    "meta":{
      "state":"design",
    },
    //not part of json files
    "documentsUri":"./documents",
    "assembliesUri":"./assemblies",
    "annotations": "./annotations"
  };
  var reqFields = ["name", "title"];
  
  if (! reqFields.every(function(x) { return x in params; }) )
  {
    res.send(400, "not all required fields were provided");
    return;
  }
  var name = params.name;
  name = name.replace(" ","");//TODO: validation NO spaces in design names
  params.name = name ;
  
  //CHECK for pre-existing design wih the same name
  var sameNames = designs.filter( function( design ){
    return design.name === name;
  });
  
  sameNames = ( sameNames.length > 0 );
  if( sameNames ){
    res.send(409 , "there is already a design called '"+name+"'");
    return;
  }
  
  var design = Object.assign({}, DEFAULTS, params); 
  console.log("design", design);
  designs.push( design );
  
  //FIXME : just for testing?
  fs.mkdirSync(userDataPath+"designs/"+name);
  writeDesigns();
  
  res.send(designs);
});

server.get(prefix+'designs/:name', function (req, res, next) {
  var design = designs.filter( function ( design ){
    return design.name === req.params.name;
  });
  //console.log("sending back this one", design, req.params.name);
  if( design.length === 0 ){
    res.send(404);
  }
  else{res.send(design[0]);}
});

server.patch(prefix+'designs/:_name', function (req, res, next) {
  
  var design = designs.filter( function ( design ){
    return design.name === req.params._name;
  });
  //console.log("sending back this one", design, req.params.name);
  if( design.length === 0 ){
    res.send(404);
    return;
  }
  console.log("PATCHING ", req.params._name,req.params);
  //update design
  var design = design[0];
  var params = req.params;
  //delete params[_name];
  //TODO: actual validation needed
  var validFields = ["name", "title","description","version","authors","tags","licences","meta"];
  for(var pName in params ){
    if( pName == "name") continue;//TODO: not sure: in this case, cannot change design name...
    //format
    var value = params[pName];
    if( pName === "tags" || pName ==="licences" )
    {
      value = JSON.parse(value);
    }
    if( validFields.indexOf(pName) > -1) design[pName] = value; 
  } 
  
  writeDesigns();
  
  res.send(design);
});

server.del(prefix+'designs/:name', function (req, res, next) {
  var design = designs.filter( function ( design ){
    return design.name === req.params.name;
  });
  //console.log("sending back this one", design, req.params.name);
  if( design.length === 0 ){
    res.send(404);
    return
  }
  
  //delete design
  var design = design[0];
  designs.splice( designs.indexOf( design ), 1);
  
  writeDesigns();
  fs.rmdirSync(userDataPath+"designs/"+name);
  
  res.send(200);
});



///documents
server.get(prefix+'designs/:name/documents', function (req, res, next) {
  console.log("returning documents of",req.params.name);
  
  //FIXME ermm really ??
  var docsPath = userDataPath+"designs/"+req.params.name;
  var fsEntries = fs.readdirSync( docsPath );
  fsEntries = fsEntries.filter( function( fsEntry ){
    var fsEntryPath = docsPath +"/"+fsEntry;
    return ( fs.lstatSync( fsEntryPath ).isFile( ) );
  })
  
  /*.map( function( fsEntry ){
    return docsPath +"/"+fsEntry;
  });*/
  
  console.log("documents", fsEntries);
  res.send(fsEntries);
});

server.post(prefix+'designs/:name/documents', function (req, res, next) {
  console.log("posting documents of",req.params.name);
  //req.files.data.name;
  //req.files.data.path;
  (Object.keys( req.files )).map( function( fileName ){
    var file = req.files[ fileName ];
    console.log("here",file);
    var filePath = file.path;
    var fileName = file.name;
    console.log("gn", filePath, fileName);
    var destPath = userDataPath+"designs/"+req.params.name+"/"+fileName;
    //var upload = fs.readFileSync( req.files.data.path,'utf8' );
    console.log("moving from", filePath ,"to", destPath);
    fs.renameSync( filePath, destPath);  
  });
  
  res.send(200);
});


server.get(prefix+'designs/:_name/documents/:_docName', function (req, res, next) {
  var params = req.params;
  var designName = params._name;
  var docName = params._docName;
  
  var destPath = userDataPath+"designs/"+designName+"/"+docName;
  console.log("geting document",docName);
  try{
    var file = fs.readFileSync( destPath );
  }
  catch(error){
    res.send(404);
    return;
  }
  
  res.writeHead(200, {
    //'Content-Length': Buffer.byteLength(file),
    //'Content-Type': 'text/plain'
  });
  res.write(file);
  res.end();
});

//assemblies
server.get(prefix+'designs/:name/assemblies', function (req, res, next) {
  var designName = req.params.name;
  console.log("returning assemblies of",designName);
  res.send( assemblies[ designName ] );
});

server.post(prefix+'designs/:_name/assemblies', function (req, res, next) {
  var designName = req.params._name;
  console.log("returning assemblies of",designName, req.params, req.files);
  
  if( req.files ){
    var fPath = req.files.data.path;
    var _assemblies = fs.readFileSync( req.files.data.path,'utf8' );
    _assemblies = JSON.parse(_assemblies); 
    assemblies[ designName ] = _assemblies;
    fs.unlinkSync( fPath );
  }
  //assemblies.push( 
  res.send( assemblies[ designName ] );
});

server.get(prefix+'designs/:_name/assemblies/:assemblyId', function (req, res, next) {
  var designName = req.params._name;
  var assemblyId = parseInt(req.params.assemblyId);
  console.log("returning assembly of",designName,assemblyId);
  
  //TODO deal with multiple assemblies
  var fileName = "assemblies.json";
  var destPath = userDataPath+"designs/"+designName+"/"+fileName;
  var assembly = fs.readFileSync( destPath, "utf8");
  assembly = JSON.parse( assembly );
  res.send( assembly );
  //res.send( assemblies[ designName ][assemblyId] );
});

server.post(prefix+'designs/:_name/assemblies/:assemblyId', function (req, res, next) {
  var designName = req.params._name;
  var assemblyId = parseInt(req.params.assemblyId);
  var assemblyData = req.params.assembly;
  console.log("assemblyData", assemblyData);
  
  if( assemblyData ) assemblyData = JSON.stringify( assemblyData );
  console.log("assemblyData2", assemblyData);
  //TODO deal with multiple assemblies
  var fileName = "assemblies.json";
  var destPath = userDataPath+"designs/"+designName+"/"+fileName;
  fs.writeFileSync( destPath, assemblyData );
  //console.log("posting assembly of",designName, assemblyId);
  console.log("data recived", req.params );
  res.send( "ok");//assemblies[ designName ][assemblyId] );
});


////////////start it up !
server.listen(address, function() {
  console.log('%s listening at %s', server.name, server.url);
});


