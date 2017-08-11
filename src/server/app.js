`use strict`;

const session = require('express-session')
const express = require('express');
const http = require('http');
const uuid = require('uuid')

const WebSocket = require('ws');
 
const app = express();

// we need the same instance of the session parser in express and websocket servers

const sessionParser = session({
    saveUninitialized: false,
    secret: 'passOpen',
    resave: false
})

// serve files from the right folder
app.use(express.static('./../client'));
app.use(sessionParser);

app.post('/login', (req, res)=>{
    // "Log in" user and set userId to session
    const id= uuid.v4();

    console.log(`Updating session for user ${id}`);
    req.session.userId = id;
    res.send({result:"OK", message: 'Session updated '})
})

app.delete('/logout', (request, response) => {
  console.log('Destroying session');
  request.session.destroy();
  response.send({ result: 'OK', message: 'Session destroyed' });
});

app.post('/gameinstance', (req,res)=>{
    if(req.session.gameinstance){ // if already has a game instance
        res.send({result:"OK", message: `In game ${req.session.gameinstance}`}) // send back what game they are in
    }else{
        req.session.gameinstance = "Game 1";
        res.send({result: "OK", message: `Joined game ${req.session.gameinstance}`})
    }
})

// create the http server ourselves
const server = http.createServer(app)

const wss = new WebSocket.Server({
    verifyClient: (info, done)=>{
        console.log('Parsing session from request....')
        sessionParser(info.req, {}, ()=>{
            console.log(`Session is parsed for user: ${info.req.session.userId}`)

            // we can reject the connection by returning false to done(). For example, reject here is uses is unknown
            done(info.req.session.userId)
        })
    },
    server
})

wss.on('connection', (ws,req)=>{
    ws.on('message', (message)=>{
        // Here we can now use session parameters

        console.log(`WS message ${message} from user ${req.session.userId}`)
    })
});


// Start the server
server.listen(8080, ()=> console.log('Listening on http://localhost:8080'))