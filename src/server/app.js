`use strict`;
// npm imports
const session = require('express-session')
const express = require('express');
const http = require('http');
const uuid = require('uuid')
const WebSocket = require('ws');
 
const GameStateManager = require('./GameStateManager')

// game objects
var app = express();  // express app - for handelling routes
var sessionParser;   // for handelling sessions
var server;           // http server
var wss;              // websocket server
var stateManager = GameStateManager()   


// we need the same instance of the session parser in express and websocket servers
sessionParser = session({
    saveUninitialized: false,
    secret: 'passOpen',
    resave: false
})

// CONFIGURE EXPRESS APP - serve files from the right folder
app.use(express.static('./src/client'));
app.use(sessionParser);


// ===  EXPRESS APP - ROUTING TRIGGERS == 

// login to the game
app.post('/login', (req, res)=>{
    // "Log in" user and set userId to session
    const id= uuid.v4();

    console.log(`Updating session for user ${id}`);
    req.session.userId = id;
    res.send({result:"OK", message: 'Session updated '})
})

// remove your login session
app.delete('/logout', (request, response) => {
  console.log('Destroying session');
  request.session.destroy();
  response.send({ result: 'OK', message: 'Session destroyed' });
});

// create a new game session
app.put('/gameinstance', (req, res)=>{
    let gameRef = stateManager.createNewGame() // create the session - returns the ref

    res.send({'result':"OK", 'gameRef': gameRef})
    
})

// join a game session
app.post('/gameinstance', (req,res)=>{  
    if(req.session.gameinstance){ // if already has a game instance
        res.send({result:"OK", message: `In game ${req.session.gameinstance}`}) // send back what game they are in
    }else{
        req.session.gameinstance = "Game 1";
        res.send({result: "OK", message: `Joined game ${req.session.gameinstance}`})
    }
})

// get the gamestate for the session with the reference in the URL
app.get('/gameinstance/:gameRef', (req, res)=>{
    let gameState = stateManager.getGameState(req.params.gameRef)
    console.log(gameState)
    res.send({result: 'OK', gameState: gameState})
})

// joiningGame via URL
app.put('/gameinstance/:gameRef', (req, res)=>{
    let gameRef = req.params.gameRef
    console.log(`trying to join game ${gameRef}`)
    console.log(`Req session ${req.session.userId}`)
    stateManager.joinGame(gameRef, req.session.userId)
    console.log(stateManager.getGameState(gameRef))
    res.send({result:'OK'})
})



// CREATE THE HTTP SERVER
server = http.createServer(app)


// CREATE THE WEBSOCKET SERVER
wss = new WebSocket.Server({
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
// CONFIGURE WEBSOCKET SERVER
wss.on('connection', (ws,req)=>{
    ws.on('message', (messageString)=>{

        // get a list of the connected clients - wss.clients

        let message = JSON.parse(messageString)

        switch(message.type){
            case 'joinGame':
                try{
                    let response = {
                        "result": "OK",
                        "type": "joinGame",
                        "data":{
                            "gameRef": message.data.gameRef
                        }
                    }
                    
                    stateManager.getGameState(message.data.gameRef)
                    ws.send(JSON.stringify(response))
                }catch(e){
                    console.error(e)
                    
                    let response = {
                        "result": "Failed",
                        "type": "joinGame",
                        "data": {
                            "errorMessage": `Couldn't find gameRef ${message.gameRef}`
                        }
                    }

                    ws.send(JSON.stringify(response))
                }
            
            break
            case 'createGame':

                let response = {
                    "result":"OK",
                    "type":"gameCreate",
                    "data": {
                        "gameRef": stateManager.createNewGame()
                    }
                }

                console.log(`New game created ${response.data.gameRef}`)
                ws.send(JSON.stringify(response)) // create a new game and return the reference
            break;
            default:
                console.log("some message sent without a type", message)
            break;

        }

    })
    
});

// START THE SERVER
server.listen(8080, ()=> console.log('Listening on http://localhost:8080'))