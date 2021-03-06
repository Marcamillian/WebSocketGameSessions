/* global fetch, Websocket, location */

let exposedFunctions = (()=>{
    const messages = document.querySelector('#messages .content');
    const wsButton = document.querySelector('#ws-button');
    const logout = document.querySelector('#logout');
    const login = document.querySelector('#login');
    const createGame = document.querySelector('#create-game')
    const leaveGame = document.querySelector('#leave-game')
    const displayBody = document.querySelector('body');
    const urlJoinGame = document.querySelector('#url-join')


    const playerNameInput = document.querySelector('#player-name')
    const gameRefInput = document.querySelector('#game-ref')
    let playerDisplay = document.querySelector('.player-list .content')
    let lobbyReadyButton = document.querySelector('#ready-button')
    let privateInfoDisplay = document.querySelector('#private-info')
    let gameRefDisplay = document.querySelector('.gref-block .code')
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

                imagePlayerState.classList.add('player-state');
                imagePlayerAction.classList.add('player-action');

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

        const emptyElement = (htmlElement)=>{
            while(htmlElement.children.length > 0){
                htmlElement.children[0].remove()
            }
            return htmlElement
        }

        return {
            getSomeHTML,
            generatePlayerCard,
            generateVoteCard,
            generateEnvelopeContents,
            emptyElement
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

        return new Promise(function(resolve, reject = showMessage){
            
            if(ws) resolve(ws)
            
            try{
                resolve(io())
            }catch(e){
                reject(e)
            }
        })

    }

    const addWsEventListeners = (ws)=>{
        
        ws.on("updateGameState", ({ result, type, data })=>{
            const gameRef = data.gameRef;
            const gameState = data.gameState;
            const privateInfo = data.privateInfo;
            let presList = gameState.players.filter((player)=>{return player.president})[0]
            let isPresident = (presList != undefined) ? presList.playerName == privateInfo.playerName : false;

            //!!!
            if(!currentGameRef) currentGameRef = gameRef; // set the gameRef if not already set
            showGameRef(gameRef); // update the code in the game ref block
            showPlayerName(privateInfo.playerName);
            gameStateDisplay(gameState.gamePhase); // change the class on the body element to show phase elements
            showPlayers(gameState.players, gameState.gamePhase, isPresident); // show al of the players
            showPrivateInfo(privateInfo);
        })
        
        ws.on("connectSuccess",()=>{
            gameStateDisplay('joinGame')
        })

        ws.on("gameCreated", ({ result, type, data })=>{
            console.log(`Game created: ${data.gameRef}`)
            gameRefInput.value = data.gameRef;
        })

        ws.on("gameJoined", ({result, type, data})=>{
            if(result !='OK'){ console.log(data.errorMessage); return }
            const gameRef = data.gameRef;
            const gameState = data.gameState;
            const errorMessage = data.errorMessage;
            gameStateDisplay("lobby")
            console.log(`Joined game ${data.gameRef}`)
        })

        ws.on("gameLeft", ({result, type, data})=>{
            if(result !='OK'){ console.log(data.errorMessage); return }
            console.log(data.message)
        })

        ws.on("playerReady", ({result, type, data})=>{
            if(result !='OK'){ console.log(data.errorMessage); return }
            console.log(data.message)
        })

        ws.on("playerSelected", ({result, type, data})=>{
            if(result !='OK'){ console.log(data.errorMessage); return }
            console.log(data.message)
        })

        ws.on("voteRegistered", ({result, type, data})=>{
            if(result !='OK'){ console.log(data.errorMessage); return }
            console.log(data.message)
        })

        ws.on("policyDiscarded", ({result, type, data})=>{
            if(result !='OK'){ console.log(data.errorMessage); return }
            console.log(data.message)
        })

        return ws
    }

    const setGameRef = ( gameRef )=>{
        currentGameRef = gameRef
        console.log(`new game ref set to ${currentGameRef}`)
        return gameRef
    }
/*
    const getGameState = (gameState)=>{
        fetch(`/gameinstance/${currentGameRef}`, {method:'GET', credentials:'same-origin'})
            .then(handleResponse)
            .then(updateGameState)
            .catch((err)=> showMessage(err.message))
    }*/

    const showPlayers = (playerArray, gamePhase, extraOptions)=>{
        
        // 1-  remove the elements from the list
        playerDisplay = displayModule.emptyElement(playerDisplay)

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
            
            playerDisplay.appendChild(addEl);
        })

        return playerDisplay;
    }

    const getPlayerNameInput =()=>{
        return playerNameInput.value
    }

    const getGameRefInput = ()=>{
        return gameRefInput.value
    }

    const showPrivateInfo = (privateInfo)=>{

        let teamTitle, teamEl,
         alignmentEl, characterEl,
         policyPickTitle, policyButtons;

        clearElement(privateInfoDisplay)
        clearElement(policyPickDisplay)

        alignmentEl = document.createElement('p')
        alignmentEl.innerText = `alignment: ${privateInfo.alignment}`;

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

        privateInfoDisplay.appendChild(alignmentEl)
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
        return gameRefDisplay.innerText = gameRef;
    }

    const showPlayerName = (playerName)=>{
        clearElement(playerNameDisplay)
        let el = document.createElement('p')
        el.innerText = playerName;
        playerNameDisplay.appendChild(el)
    }

    const playerSelect = (playerName)=>{
        ws.emit("selectPlayer",{targetPlayerName:playerName})
    }

    const castVote = (vote)=>{         
        ws.emit("castVote",{vote:vote})
    }

    const discardPolicy = (policyAlignment)=>{
        ws.emit("discardPolicy", {policyDiscard: policyAlignment})
    }

    // BUTTON CLICK FUNCTIONS
 
    wsButton.onclick = ()=>{

        setupWsSession()
        .then(addWsEventListeners)
        .then((socket)=>{
            ws = socket;
        })
        .catch((err)=>{
            console.log(err)
        })

    }

    createGame.onclick = ()=>{ 
        ws.emit('createGame')
    }

    leaveGame.onclick = ()=>{
        ws.emit("leaveGame")
    }   

    urlJoinGame.onclick = ()=>{
        ws.emit("joinGame", {playerName: getPlayerNameInput(), gameRef: getGameRefInput()})
    }

    lobbyReadyButton.onclick = ()=>{ 
        ws.emit("readyUp")
        
    }

    voteYesButton.onclick = ()=>{castVote(true); }
    voteNoButton.onclick = ()=>{castVote(false)}

    return{
        displayModule
    }

})();