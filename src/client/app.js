/* global fetch, Websocket, location */

(()=>{
    const messages = document.querySelector('#messages .content');
    const wsButton = document.querySelector('#wsButton');
    const logout = document.querySelector('#logout');
    const login = document.querySelector('#login');
    const createGame = document.querySelector('#createGame')
    const leaveGame = document.querySelector('#leaveGame')
    const displayBody = document.querySelector('body');
    const urlJoinGame = document.querySelector('#url-join')


    const playerNameInput = document.querySelector('#player_name')
    const gameRefInput = document.querySelector('#game_ref')
    let playerDisplay = document.querySelector('#player-list .content')
    let scoreDisplay = document.querySelector('#score-display .content')
    let ws;

    // game session variables
    let currentGameRef;
    let gamePhase;

    // utility funtions
    const showMessage = (message)=>{
        console.log(message)
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
        ws.onmessage = ( messageString )=>{
            let message = JSON.parse(messageString.data)
            
            if(message.result != 'OK'){
                console.error(`${message.type} : ERROR - ${message.data.errorMessage}`)
            }

            switch(message.type){
                case "gameCreate":
                    console.log(`Created & joined game ${message.data.gameRef}`)
                break
                case "joinGame":
                    console.log(`Joined game ${message.data.gameRef}`)
                break
                case "updateGameState":
                    console.log(message.data)
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

    const processJoinState = ( serverResponse )=>{
        
        // 1-  remove the elements from the list
        while(playerDisplay.children.length > 0){
            playerDisplay.children[0].remove()
        }
        // 2- add the new names to the list
        serverResponse.gameState.players.forEach((playerName)=>{
            let addEl = document.createElement('li')
            addEl.innerText = playerName

            playerDisplay.appendChild(addEl)
        }) 

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
        
        let response = {
            'type':'createGame',
            'data': {}
        }

        ws.send(JSON.stringify(response))

    }

    leaveGame.onclick = ()=>{

        fetch(`/gameinstance/${currentGameRef}/players`, {method: 'DELETE', credentials:'same-origin'})
            .then(handleResponse)
            .then(stringifyObject)
            .then(showMessage)
            .then(()=>{ gameStateDisplay('joinGame') })
            .catch( (err)=>{ showMessage(err.message) } )
            
    }

    urlJoinGame.onclick = ()=>{
        let gameRef = getGameRefInput()
        let myHeaders = new Headers({
            "Player-Name": getPlayerNameInput()
        })
        currentGameRef = gameRef

        fetch(`/gameinstance/${gameRef}/players`, { method: 'POST', credentials:'same-origin', headers: myHeaders })
            .then(handleResponse)
            .then(processJoinState)
            .then(()=>{gameStateDisplay('lobby')})
            .catch( (err)=>{ showMessage(err.message) })
    }

})();