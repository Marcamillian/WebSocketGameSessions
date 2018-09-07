# WebSocketGame Sessions (Secret Hitler)

As a project to learn websockets and client/server architecture I recreated the hidden role game Secret Hitler as a web app.

The game uses node to maintain a game state on the server end with clients connecting through socketIO websockets to facilitate multiplayer gameplay.

### Design Notes
- Node server to perform all gameplay logic and interaction
- SocketIO - Server/Client communitation through websockets
- Express Sessions used for player rejoin
- Express server with REST Endpoints (prior to websocket API)
- CSS grid used in the client
- unit testing using tape

## Installation
- Clone repository
- Navigate to project directory in the command line
- run 'npm install'
- run 'npm start'

## Implementation Notes


### API Reference
The app was designed to interface through any web socket - as such a collaborator has developed a client application in Unity in addition to the web interface included here.

As a result of this the Wiki feature of GitHub was used to provide an API reference - https://github.com/Marcamillian/WebSocketGameSessions/wiki

### Player Rejoin
Throughout testing the issue of players disconnecting and rejoining (creating a new websocket) was problematic. Due to this I implemented the express-socket.io-session library to expose express session data to the websocket and enable players to be dropped back into the game they were previously in.

### Unit Testing
Extensive Unit testing was used throughout the server development to ensure no breaking changes were introduced.

### GameState tool
Testing the client application became quite a chore as the game was required to be 

