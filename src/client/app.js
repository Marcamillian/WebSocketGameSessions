/* global fetch, Websocket, location */

(()=>{
    const messages = document.querySelector('#messages .content');
    const wsButton = document.querySelector('#wsButton');
    const logout = document.querySelector('#logout');
    const login = document.querySelector('#login');
    const createGame = document.querySelector('#createGame')
    const leaveGame = document.querySelector('#leaveGame')
    const displayBody = document.querySelector('body');

    const playerNameInput = document.querySelector('#player_name')
    const gameRefInput = document.querySelector('#game_ref')
    let playerDisplay = document.querySelector('#player-display .content')
    let scoreDisplay = document.querySelector('#score-display .content')
    let ws;

    // game session variables
    let currentGameRef;
    let gamePhase;

    // utility funtions
    const showMessage = (message)=>{
        messages.textContent += `\n${message}`;
        messages.scrollTop = messages.scrollHeight;
    }

    const stringifyObject = (jsonMessage)=>{
        return JSON.stringify(jsonMessage,null,2)
    }

    const handleResponse = (response)=>{
        return response.ok
            ? response.json()
            : Promise.reject(new Error('Unexpected response'))
    }
    
    const gameStateDisplay = ( gamePhase ) =>{

        displayBody.classList.remove("connect", "join-game", "lobby", "in-game")

        switch( gamePhase ){
            case "connect":
                displayBody.classList.add("connect")
            break
            case "joinGame":
                displayBody.classList.add("join-game")
            break
            case "lobby":
                displayBody.classList.add("lobby")
            break
            case "inGame":
                displayBody.classList.add("in-game")
            break
        }
    }

    const setupWsSession = ()=>{
        if(ws){
            ws.onerror = ws.onopen = ws.onclose = null;
            ws.close()
        }

        ws = new WebSocket(`ws://${location.host}`)
        ws.onerror = ()=> showMessage('WebSocket error')
        ws.onopen = ()=> showMessage(' Websocket connection established')
        ws.onclose = ()=> showMessage('WebSocket connection closed')
        ws.onmessage = (messageString)=>{
            let message = JSON.parse(messageString.data)
            
            if(message.result != 'OK'){
                console.error(`${message.type} : ERROR - ${message.data.errorMessage}`)
            }

            switch(message.type){
                case "gameCreate":
                    console.log(`Created game ${message.data.gameRef}`)
                    currentGameRef = message.data.gameRef
                    
                    let response = {
                        'type':'joinGame',
                        'data': {
                            'gameRef': currentGameRef,
                            'playerName': "Something"
                        }
                    }
                    // request to join the server
                    ws.send(JSON.stringify(response))
                    
                    gameStateDisplay('lobby')
                break
                case "joinGame":
                    console.log(`Joined game ${message.data.gameRef}`)
                    currentGameRef = message.data.gameRef
                    gameStateDisplay('lobby')
                break
                case "updateGameState":
                    console.log(message.data)
                break
                default:
                    console.log(`Message from server of type ${message.type}`) 
                break
            }


            

        }

    }

    // game functions
    const processGameRef = (responseObject)=>{
        if (responseObject.gameRef){
            return responseObject.gameRef
        }else{
            throw new Error("No gamRef in response")
        }
    }

    const setGameRef = ( gameRef )=>{
        currentGameRef = gameRef
        console.log(`new game ref set to ${currentGameRef}`)
        return gameRef
    }

    const getGameState = (gameState)=>{
        fetch(`/gameinstance/${currentGameRef}`, {method:'GET', credentials:'same-origin'})
            .then(handleResponse)
            .then(updateGameState)
            .catch((err)=> showMessage(err.message))
    }

    const updateGameState = (response)=>{
        showScore(response.gameState)
    }

    const showPlayers = (gameState)=>{
    }

    const showScore = (gameState)=>{
        scoreDisplay.textContent = gameState.score
    }

    const getPlayerNameInput =()=>{
        return playerNameInput.value
    }

    const getGameRefInput = ()=>{
        return gameRefInput.value
    }

    // BUTTON CLICK FUNCTIONS

    login.onclick = ()=>{
        fetch('/login', {method: 'POST', credentials: 'same-origin'})
            .then(handleResponse)
            .then(stringifyObject)
            .then(showMessage)
            .catch((err)=> showMessage(err.message) )
    };

    logout.onclick = () =>{
        fetch('/logout', {method: 'DELETE', credentials: 'same-origin'})
            .then(handleResponse)
            .then(stringifyObject)
            .then(showMessage)
            .catch((err)=> showMessage(err.message) )
    }
 
    wsButton.onclick = ()=>{
        
        fetch('/login', {method: 'POST', credentials: 'same-origin'})
        .then(handleResponse)
        .then(stringifyObject)
        .then(showMessage)
        .then(setupWsSession)
        .then(()=>{ gameStateDisplay('joinGame') })
        .catch((err)=> showMessage(err.message) )
    }

    createGame.onclick = ()=>{
        
        let gameRef = getGameRefInput();
        if(gameRef == ""){
            let response = {
                'type':'createGame',
                'data': {}
            }

            ws.send(JSON.stringify(response))
        }else{
            let response = {
                'type':'joinGame',
                'data': {
                    'gameRef': gameRef,
                    'playerName': getPlayerNameInput()
                }
            }

            ws.send(JSON.stringify(response))
        }
        

        /*
        fetch('/gameinstance', {method:'PUT', credentials:'same-origin'} ) // returns the reference key of the game you made
            .then(handleResponse)
            .then(processGameRef)
            .then(setGameRef)
            .then(getGameState)
            .then(()=>{gameStateDisplay('lobby')})
            .catch((err)=> showMessage(err.message))
        */

    }

    leaveGame.onclick = ()=>{
        currentGameRef = undefined;
    }

})();