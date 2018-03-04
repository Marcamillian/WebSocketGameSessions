/* global fetch, Websocket, location */

let exposedFunctions = (()=>{
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
    let lobbyReadyButton = document.querySelector('#lobby-ready')
    let privateInfoDisplay = document.querySelector('#private-info')
    let gameRefDisplay = document.querySelector('#game-ref-display')
    let playerNameDisplay = document.querySelector('#name-display')
    let voteYesButton = document.querySelector('#ingame-vote #yes')
    let voteNoButton = document.querySelector('#ingame-vote #no')
    let policyPickDisplay = document.querySelector('#ingame-policy-pick')

    
    let ws;

    // game session variables
    let currentGameRef;
    let gamePhase;

    // DisplayModule
    let displayModule = function displayModule(){

        let getSomeHTML = ()=>{
            return "Something"
        }

        const generatePlayerCard =({
            playerName = 'playerName',
            president = false,
            chancellor = false,
            ready = false,
            prevGov = false,
            proposedChancellor = false,
            voteCast = undefined} = {})=>{
                
                let divPlayerCard = document.createElement('div');
                let paraPlayerName = document.createElement('p')
                let imagePlayerState = document.createElement('img');
                let imagePlayerAction = document.createElement('img');

                divPlayerCard.classList.add('player-card');
                if (president) divPlayerCard.classList.add('president');
                if (chancellor) divPlayerCard.classList.add('chancellor');
                if (ready) divPlayerCard.classList.add('ready');
                if (prevGov) divPlayerCard.classList.add('prev-gov')
                if (proposedChancellor) divPlayerCard.classList.add('proposed-chancellor');
                if (voteCast) divPlayerCard.classList.add('vote-cast')

                paraPlayerName.innerText = playerName;

                divPlayerCard.appendChild(imagePlayerState);
                divPlayerCard.appendChild(paraPlayerName);
                divPlayerCard.appendChild(imagePlayerAction);

                return divPlayerCard
        }

        const generateVoteCard = (cardText)=>{
            let divVoteCard = document.createElement('div')
            let paraCardText = document.createElement('p')

            divVoteCard.classList.add('vote-card');
            paraCardText.innerText = cardText;

            divVoteCard.appendChild(paraCardText)

            return divVoteCard;
        }

        const generateEnvelopeContents = ({
            character = "<Character not defined>",
            alignment = "<Alignment not defined>"})=>{

            let divFlipContainer = document.createElement('div');
            let divCardFront = document.createElement('div');
            let divCardBack = document.createElement('div');
            
            divFlipContainer.classList.add('flip-card','horizontal')

            divCardFront.classList.add('front')
            divCardFront.innerHTML = alignment;
            
            divCardBack.classList.add('back');
            divCardBack.innerHTML = character;

            divFlipContainer.appendChild(divCardFront);
            divFlipContainer.appendChild(divCardBack);

            return divFlipContainer
        }

        return {
            getSomeHTML,
            generatePlayerCard,
            generateVoteCard,
            generateEnvelopeContents
        }
    }()

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

        displayBody.classList.remove("connect", "join-game", "lobby", "in-game", "proposal", "election", "legislative")

        console.log(`GAME PHASE: ${gamePhase}`)

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
            case "proposal":
                displayBody.classList.add("proposal")
                displayBody.classList.add("in-game")
            break
            case "election":
                displayBody.classList.add("election")
                displayBody.classList.add("in-game")
            break
            case "legislative":
                displayBody.classList.add("legislative")
                displayBody.classList.add("in-game")
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
        ws.onmessage = handleWsMessage;

    }

    const handleWsMessage = ( messageString )=>{
        let message = JSON.parse(messageString.data)
        
        if(message.result != 'OK'){
            console.error(`${message.type} : ERROR - ${message.data.errorMessage}`)
        }

        switch(message.type){
            case "gameCreate":
                console.log(`Created & joined game ${message.data.gameRef}`)
            break
            case "updateGameState":
                let gameRef = message.gameRef;
                let gameState = message.gameState ;
                let privateInfo = message.privateInfo;
                let presList = gameState.players.filter((player)=>{return player.president})[0]
                let isPresident = (presList != undefined) ? presList.playerName == privateInfo.playerName : false

                if(!currentGameRef) currentGameRef = gameRef // set the gameRef if not already
                showGameRef(gameRef)                    //  put the gameRef in the display element
                showPlayerName(privateInfo.playerName)  // put the playerName in the display element
                gameStateDisplay(gameState.gamePhase)       // update the class to hide/display elements
                showPlayers(gameState.players, gameState.gamePhase, isPresident )  // put the list of players in the display element
                showPrivateInfo(message.privateInfo)// show the privateInfo

            break
            default:
                console.log(`Message Type ${message.type} : Unexpected type`)
            break
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

    const showPlayers = (playerArray, gamePhase, extraOptions)=>{
        
        // 1-  remove the elements from the list
        while(playerDisplay.children.length > 0){
            playerDisplay.children[0].remove()
        }

        // 2- add the new names to the list
        playerArray.forEach((playerObject)=>{

            let addEl = document.createElement('li');
            addEl.innerText = playerObject["playerName"]

            switch(gamePhase){
                case "lobby":
                    if(playerObject['ready']) {
                        addEl.classList.add('ready')
                    }
                break;
                case "proposal":
                    if(extraOptions && !playerObject.president && !playerObject.prevGov){
                        let electButton = document.createElement('button')
                        electButton.addEventListener('click',()=>{playerSelect(playerObject["playerName"])})
                        electButton.innerText = "Select Player"
                        
                        addEl.appendChild(electButton)
                    }
                break;
            }
            

            // add classes
            if(playerObject['president']) addEl.classList.add("president")
            if(playerObject['proposedChancellor']) addEl.classList.add("proposed-chancellor")

            playerDisplay.appendChild(addEl)
        }) 
    }

    const getPlayerNameInput =()=>{
        return playerNameInput.value
    }

    const getGameRefInput = ()=>{
        return gameRefInput.value
    }

    const showPrivateInfo = (privateInfo)=>{

        let teamTitle, teamEl,
         allignmentEl, characterEl,
         policyPickTitle, policyButtons;

        clearElement(privateInfoDisplay)
        clearElement(policyPickDisplay)

        allignmentEl = document.createElement('p')
        allignmentEl.innerText = `Allignment: ${privateInfo.allignment}`;

        characterEl = document.createElement('p')
        characterEl.innerText = `Character: ${privateInfo.character}`;

        if(privateInfo.teamMates){
            teamEl = document.createElement('ul')
            teamTitle = document.createElement('p')
            teamTitle.innerText = "Team mates"

            privateInfo.teamMates.forEach((teamMateName)=>{
                teamMateEl = document.createElement('li')
                teamMateEl.innerText = teamMateName;
                teamEl.appendChild(teamMateEl)
            })
        }

        // -- policy display handling
        if(privateInfo.policyHand){
            console.log(privateInfo.policyHand)

            policyPickTitle = document.createElement('p')
            policyPickTitle.innerHTML = `<b> Discard a policy </b>`

            policyButtons = document.createElement('div');
            privateInfo.policyHand.forEach((policy)=>{
                let policyButton = document.createElement('button')
                policyButton.innerText = `${policy}`;
                policyButton.addEventListener('click', ()=>{discardPolicy(policy)})

                policyButtons.appendChild(policyButton)
            })
        }

        // TODO: if there is a policyHand attached - show the policyHand in the voting things

        privateInfoDisplay.appendChild(allignmentEl)
        privateInfoDisplay.appendChild(characterEl)
        if (teamTitle) {privateInfoDisplay.appendChild(teamTitle); privateInfoDisplay.appendChild(teamEl)}
        if (policyButtons) { policyPickDisplay.appendChild(policyPickTitle); policyPickDisplay.appendChild(policyButtons)}
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

    const playerSelect = (playerName)=>{
        fetch(`gameinstance/${currentGameRef}/players/${playerName}`, {method:'PUT', credentials:'same-origin'})
            .then(handleResponse)
            .then(showMessage)
            .catch((err)=>{showMessage(err.message)})
    }

    const castVote = (vote)=>{
        fetch(`gameinstance/${currentGameRef}/elect/${vote}`,{method:'PUT', credentials: 'same-origin'})
            .then(handleResponse)
            .then(showMessage)
            .catch((err)=>{showMessage(err.message)})
    }

    const discardPolicy = (policyAllignment)=>{
        
        fetch(`/gameInstance/${currentGameRef}/policyDiscard/${policyAllignment}`, {method:'PUT', credentials: 'same-origin'})
            .then(handleResponse)
            .then(showMessage)
            .catch((err)=>{ showMessage(err.message) })
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

    voteYesButton.onclick = ()=>{castVote(true); }
    voteNoButton.onclick = ()=>{castVote(false)}

    return{
        displayModule
    }

})();