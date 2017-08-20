let gameStateManager = function(){
    let gameStates = {}; // array of all the game states

    let createNewGame = ()=>{
        let sessionRef = createSessionKey(4)

        try{
            initGame(sessionRef)
        }catch(e){
            console.log(`Couldn't create new game: ${e.message}`)
        }

        return sessionRef // returns the reference to the session you have made
    }

    let initGame = (gameKey)=>{
        if(gameStates[gameKey]){ throw new Error(`Game session ${gameKey} already exists`)} // check that we arn't overwriting something

        gameStates[gameKey] = {
            players: [],
            score: 0
        }
    }

    let createSessionKey = (length)=>{
        return Math.random().toString(36).substring(2,2+length)
    }

    let getGameState = (sessionKey)=>{
        if(gameStates[sessionKey]){
            return gameStates[sessionKey]
        }else{
            throw new Error(`No game with the key ${sessionKey}`)
        }
    }

    let joinGame = (sessionKey, playerKey)=>{
        if(gameStates[sessionKey]){
            return gameStates[sessionKey].players.push(playerKey)
        }else{
            throw new Error( "session doesn't exist")
        }
    }

    return Object.create({
        createNewGame: createNewGame,
        getGameState: getGameState,
        initGame: initGame
    })

}


module.exports = gameStateManager