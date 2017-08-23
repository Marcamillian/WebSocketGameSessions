/* global fetch, Websocket, location */

(()=>{
    const messages = document.querySelector('#messages');
    const wsButton = document.querySelector('#wsButton');
    const logout = document.querySelector('#logout');
    const login = document.querySelector('#login');
    const createGame = document.querySelector('#createGame')
    const leaveGame = document.querySelector('#leaveGame')

    const playerNameInput = document.querySelector('#player_name')
    const gameRefInput = document.querySelector('#game_ref')
    let playerDisplay = document.querySelector('#player-display')
    let scoreDisplay = document.querySelector('#score-display')
    let ws;

    // game session variables
    let currentGameRef;

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
    
    // display functions
    const hideElements = ( gamePhase )=>{
        if(ws){ // if we are logged in
            wsButton.classList.add("hide")
        }else{
            wsButton.classList.remove('hide')
        }
        if(currentGameRef){
            createGame.classList.add("hide")
            leaveGame.classList.remove("hide")
        }else{
            createGame.classList.remove("hide")
            leaveGame.classList.add("hide")
        }
    }

    // geme functions
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
            .then(hideElements)
            .catch((err)=> showMessage(err.message) )
    };

    logout.onclick = () =>{
        fetch('/logout', {method: 'DELETE', credentials: 'same-origin'})
            .then(handleResponse)
            .then(stringifyObject)
            .then(showMessage)
            .then(hideElements)
            .catch((err)=> showMessage(err.message) )
    }
 
    wsButton.onclick = ()=>{
        if(ws){
            ws.onerror = ws.onopen = ws.onclose = null;
            ws.close()
        }

        ws = new WebSocket(`ws://${location.host}`)
        ws.onerror = ()=> showMessage('WebSocket error')
        ws.onopen = ()=> showMessage(' Websocket connection established')
        ws.onclose = ()=> showMessage('WebSocket connection closed')

        hideElements()
        
    }

    createGame.onclick = ()=>{

        console.log("playerNameInput ", getPlayerNameInput())
        console.log("gameRef Input ", getGameRefInput())

        fetch('/gameinstance', {method:'PUT', credentials:'same-origin'} ) // returns the reference key of the game you made
            .then(handleResponse)
            .then(processGameRef)
            .then(setGameRef)
            .then(getGameState)
            .then(hideElements)
            .catch((err)=> showMessage(err.message))

    }

    leaveGame.onclick = ()=>{
        currentGameRef = undefined;
        hideElements()
    }

})();