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
    let lobbyReadyButton = document.querySelector('#lobby-ready')
    let privateInfoDisplay = document.querySelector('#private-info')
    let gameRefDisplay = document.querySelector('#game-ref-display')
    let playerNameDisplay = document.querySelector('#name-display')
    let ws;

    // game session variables
    let currentGameRef;
    let gamePhase;

    // utility funtions
    const showMessage = (message)=>{
        console.log(message)
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
            case "proposal":
                displayBody.classList.add("proposal")
            break
            default:
                throw new Error(`gamePhase not recognised: ${gamePhase}`)
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
                case "updateGameState":
                    let gameRef = message.gameRef;
                    let gameState = message.gameState ;
                    let privateInfo = message.privateInfo;

                    if(!currentGameRef) currentGameRef = gameRef // set the gameRef if not already
                    showGameRef(gameRef)
                    showPlayerName(privateInfo.playerName)

                    gameStateDisplay(gameState.gamePhase)       // change the displayMode based on the gamePhase
                    showPlayers(gameState.players)  // show the players

                    if(gameState.gamePhase == 'proposal'){
                        showPrivateInfo(message.privateInfo)// show the privateInfo
                    }
                break
                default:
                    console.log(`Message Type ${message.type} : Unexpected type`)
                break
            }


            

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

    const showPlayers = (playerArray)=>{
        
        // 1-  remove the elements from the list
        while(playerDisplay.children.length > 0){
            playerDisplay.children[0].remove()
        }

        // 2- add the new names to the list
        playerArray.forEach((playerObject)=>{

            let addEl = document.createElement('li');
            addEl.innerText = playerObject["playerName"]
            
            if(playerObject['ready']) {
                addEl.classList.add('highlight')
            }

            if(playerObject['president']) addEl.classList.add("president")

            playerDisplay.appendChild(addEl)
        }) 
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

    const showPrivateInfo = (privateInfo)=>{

        clearElement(privateInfoDisplay)

        let allignmentEl = document.createElement('p')
        allignmentEl.innerText = `Allignment: ${privateInfo.allignment}`;

        let characterEl = document.createElement('p')
        characterEl.innerText = `Character: ${privateInfo.character}`;

        let teamEl = document.createElement('ul')
        let teamTitle = document.createElement('p')
        teamTitle.innerText = "Team mates"

        privateInfo.teamMates.forEach((teamMateName)=>{
            let teamMateEl = document.createElement('li')
            teamMateEl.innerText = teamMateName;
            teamEl.appendChild(teamMateEl)
        })

        privateInfoDisplay.appendChild(allignmentEl)
        privateInfoDisplay.appendChild(characterEl)
        privateInfoDisplay.appendChild(teamTitle)
        privateInfoDisplay.appendChild(teamEl)
    }

    const clearElement = (element)=>{
        while(element.children.length > 0){
            element.children[0].remove()
        }

        return element
    }

    const showGameRef = (gameRef)=>{
        clearElement(gameRefDisplay)
        let el = document.createElement('p')
        el.innerText = gameRef;
        gameRefDisplay.appendChild(el)
    }

    const showPlayerName = (playerName)=>{
        clearElement(playerNameDisplay)
        let el = document.createElement('p')
        el.innerText = playerName;
        playerNameDisplay.appendChild(el)
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
            .then(showMessage)
            //.then(()=>{gameStateDisplay('lobby')})
            .catch( (err)=>{ showMessage(err.message) })
    }

    lobbyReadyButton.onclick = ()=>{
        fetch(`gameinstance/${currentGameRef}/players/ready`, {method:'POST', credentials:'same-origin'})
            .then(handleResponse)
            .then(showMessage)
            .catch((err)=>{showMessage(err.message)})
    }



})();