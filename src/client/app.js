/* global fetch, Websocket, location */

let exposedFunctions = (()=>{
    const messages = document.querySelector('#messages .content');
    const wsButton = document.querySelector('#ws-button');
    const logout = document.querySelector('#logout');
    const login = document.querySelector('#login');
    const createGame = document.querySelector('#create-game');
    const leaveGame = document.querySelector('#leave-game');
    const displayBody = document.querySelector('body');
    const urlJoinGame = document.querySelector('#url-join');
    const spectatorJoin = document.querySelector('#spectator-join')

    const playerNameInput = document.querySelector('#player-name');
    const gameRefInput = document.querySelector('#game-ref');
    let playerDisplay = document.querySelector('.player-list');

    let privateInfoDisplay = document.querySelector('#private-info');
    let gameRefDisplay = document.querySelector('.gref-block .code');
    let playerNameDisplay = document.querySelector('#name-display');
    let cardAreaDisplay = document.querySelector('.card-area');

    let lobbyReadyButton = document.querySelector('#ready-button');
    let voteYesButton = document.querySelector('#ingame-vote #yes');
    let voteNoButton = document.querySelector('#ingame-vote #no');
    
    let envelope = document.querySelector('.envelope');
    let envelopeFlap = document.querySelector('.envelope .flap');
    let envelopeContents = document.querySelector(".envelope .env-contents");

    let powerNameDisplay = document.querySelector('.power-name');
    let powerInstructionDisplay = document.querySelector('.power-instruction');
    
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
            voteCast = undefined} = {} )=>{
                
                let divPlayerCard = document.createElement('div');
                let paraPlayerName = document.createElement('p')
                let imagePlayerState = document.createElement('img');
                let imagePlayerAction = document.createElement('img');

                divPlayerCard.classList.add('player-card');
                if (president) divPlayerCard.classList.add('president');
                if (chancellor) divPlayerCard.classList.add('chancellor');
                if (ready) divPlayerCard.classList.add('ready');
                if (prevGov) divPlayerCard.classList.add('prev-gov');
                if (proposedChancellor) divPlayerCard.classList.add('proposed-chancellor');
                if (voteCast != undefined) divPlayerCard.classList.add('vote-cast');

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

        const generateEnvelopeContents = (character, alignment)=>{

            let divFlipContainer = document.createElement('div');
            let divCardFront = document.createElement('div');
            let divCardBack = document.createElement('div');
            
            divFlipContainer.classList.add('env-card','flip-card','horizontal')
            divFlipContainer.addEventListener('click', ()=>{toggleClass(divFlipContainer, 'flipped')});

            divCardFront.classList.add('front')
            divCardFront.innerText = `Alignment ---  ${alignment}`;
            
            divCardBack.classList.add('back');
            divCardBack.innerText = `Role --- ${character}`;

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

        displayBody.classList.remove("connect", "join-game", "lobby", "in-game", "proposal", "election", "legislative", "power")

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
            case "power":
                displayBody.classList.add('power', 'in-game');
            break;
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
            const {gameRef, gameState, privateInfo} = data;
            
            let thisPlayerObject = gameState.players.filter((player)=>{ return player.playerName == privateInfo.playerName})[0];

            if(!currentGameRef) currentGameRef = gameRef; // set the gameRef if not already set
            showGameRef(gameRef); // update the code in the game ref block
            gameStateDisplay(gameState.gamePhase) // change the class on the body element to show phase elements
            showPlayers(gameState.players,gameState, thisPlayerObject) // show all of the players
            powerDisplay({gameState, playerObject: thisPlayerObject, privateInfo});
            showCards(gameState, thisPlayerObject, privateInfo);
            showPrivateInfo(privateInfo)
        })

        ws.on("updateSpectator", ({result, type, data})=>{
            let {gameRef, gameState} = data;
            
            if(!currentGameRef) currentGameRef = gameRef
            showGameRef(gameRef)
            gameStateDisplay(gameState.gamePhase)
            showPlayers(gameState.players, gameState, {president:false})
            showCards(gameState, {president:false}, undefined)
            
            console.log("updated the spectator");
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
            //gameStateDisplay("lobby")
            console.log(`Joined game ${data.gameRef}`)
        })

        ws.on("spectatorJoined", ({result, type, data})=>{
            if(result != "OK"){ console.log(data.errorMessage); return }
            const gameRef = data.gameRef;
            //gameStateDisplay("lobby")
            console.log(`Spectating game : ${gameRef}`)
        })

        ws.on("gameLeft", ({result, type, data})=>{
            if(result !='OK'){ console.log(data.errorMessage); return }
            gameStateDisplay("joinGame")
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

    const getSelectedPlayer = ()=>{
        return document.querySelector('.player-card.selected p').innerText;
    }

    const showPlayers = (playerArray, gameState, thisPlayerObject)=>{
        
        let callback  = undefined;
        let isPresident = thisPlayerObject.president;
        let gamePhase = gameState.gamePhase

        // 1-  remove the elements from the list
        playerDisplay = displayModule.emptyElement(playerDisplay)

        // 2- add the new names to the list
        playerArray.forEach((playerObject)=>{

            let playerCard = displayModule.generatePlayerCard(playerObject);


            if( isPresident){
                switch(gamePhase){
                    case "proposal":
                        if( !playerObject.prevGov && !playerObject.president){ //if this specific player in the array is clickable
                            playerCard.addEventListener('click', ()=>{
                                document.querySelectorAll('.player-card').forEach((el)=>{el.classList.remove('selected')});
                                toggleClass(playerCard, 'selected');
                            })
                        }else{
                            playerCard.classList.add('not-selectable');
                        }
                    break;
                    case "power":

                        switch(gameState.powerActive){
                            case "kill":
                                // add a click event to mark players as selected
                                playerCard.addEventListener('click',()=>{ markPlayerCardAsSelected(playerCard) })
                            break;
                            case "investigate":
                                // TODO - remove the select click function BUT retain th highlighting of the investigated user
                                // if the investigation hasn't already gone through (if not in privateInfo)
                                // add a click event to mark players as selected
                                playerCard.addEventListener('click',()=>{ markPlayerCardAsSelected(playerCard) })
                            break;
                            case "special-election":
                                // add a click event to mark players as selected
                                playerCard.addEventListener('click',()=>{ markPlayerCardAsSelected(playerCard) })
                            break;
                        }
                    break;
                }
            }
            
            playerDisplay.appendChild(playerCard);
        }) 
    }

    const showCards = ( gameState, thisPlayerObject, privateInfo)=>{
        
        let gamePhase = gameState.gamePhase;
        let {topPolicyCards, investigationResult, policyHand, voteCast} = privateInfo;

        // 1- remove the cards from the list
        cardAreaDisplay = displayModule.emptyElement(cardAreaDisplay);

        // 2 - add the new cards
        switch(gamePhase){
            case 'proposal':
                if(thisPlayerObject.president == true){
                    let acceptCard = document.createElement('button');
                    acceptCard.innerText = "Propose Chancellor";
                    acceptCard.addEventListener('click',()=>{
                        playerSelect(getSelectedPlayer());
                    })
                    cardAreaDisplay.appendChild(acceptCard);
                }
            break;
            case 'election':
                [true, false].forEach((voteBool)=>{
                    let cardText = (voteBool) ? 'Yes' : 'No'
                    let voteCard = displayModule.generateVoteCard(cardText);

                    // set one of the cards to selected if they are
                    if(voteCast == true && voteBool){ voteCard.classList.add('selected') }
                    else if(voteCast === false && !voteBool){ voteCard.classList.add('selected') } 

                    voteCard.addEventListener('click', ()=>{
                        castVote(voteBool);
                    });
                    cardAreaDisplay.appendChild(voteCard);
                })
            break;
            case 'legislative':
                cardArray.forEach((cardName)=>{
                    let policyCard = displayModule.generateVoteCard(cardName);
                    policyCard.addEventListener('click',()=>{
                        discardPolicy(cardName);
                    })
                    cardAreaDisplay.appendChild(policyCard);
                })
            break;
            case 'power':
                if(thisPlayerObject.president == true){
                    switch (gameState.powerActive){
                        case "top-3-cards":
                            // show top 3 cards
                            privateInfo.topPolicyCards.forEach((policyType)=>{
                                cardAreaDisplay.appendChild(displayModule.generateVoteCard(policyType))
                            })
                            // show ready button
                            let confirmButton = document.createElement('button');
                            confirmButton.innerText = 'Confirm'
                            confirmButton.addEventListener('click', ()=>{
                                ws.emit('readyUp')
                            })
                            cardAreaDisplay.appendChild(confirmButton);
                        break;
                        case "kill":
                            // show confirm kill button
                            let confirmKillButton = document.createElement('button');
                            confirmKillButton.innerText = "Confirm Kill";
                            confirmKillButton.addEventListener('click',()=>{
                                playerSelect(getSelectedPlayer());
                            })
                            cardAreaDisplay.appendChild(confirmKillButton);
                        break;
                        case "investigate":
                            let confirmInvestigationTargetButton = document.createElement('button');
                            
                            if(privateInfo.investigationResult == undefined){ // targetting the player for investigation
                                confirmInvestigationTargetButton.innerText = 'Confirm target';
                                confirmInvestigationTargetButton.addEventListener('click', ()=>{
                                    playerSelect(getSelectedPlayer());
                                })
                            }else{ // confirm that you have seen the alignment

                                // show the result as a card
                                cardAreaDisplay.appendChild(displayModule.generateVoteCard(privateInfo.investigationResult.alignment));

                                confirmInvestigationTargetButton.innerText = 'Confirm';
                                confirmInvestigationTargetButton.addEventListener('click',()=>{
                                    ws.emit('readyUp');
                                })
                            }

                            cardAreaDisplay.appendChild(confirmInvestigationTargetButton);
                        break;
                        case "special-election":
                            // show confirm pesident selection button
                            let confirmTargetButton = document.createElement('button');
                            confirmTargetButton.innerText = "Confirm Special President";
                            confirmTargetButton.addEventListener('click', ()=>{
                                playerSelect(getSelectedPlayer());
                            })
                            cardAreaDisplay.appendChild(confirmTargetButton);
                        break;
                    }
                
                }
            break;
        }

        return true;
    }

    const getPlayerNameInput =()=>{
        return playerNameInput.value
    }

    const getGameRefInput = ()=>{
        return gameRefInput.value
    }

    const showPrivateInfo = ({
        playerName = "<No name given>",
        character = "<No charater>",
        alignment = "<No Alignment>",
        teamMates = ["No team mates"],
        policyHand =  ["No cards"]}={} )=>{

        // set the name on the envelope
        playerNameDisplay.innerText = playerName;
        // empty old costumes
        envelopeContents = displayModule.emptyElement(envelopeContents);
        // generate the cards
        envelopeContents.appendChild(displayModule.generateEnvelopeContents(character, alignment));

        return 

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

    const toggleEnvelopeOpen = ()=>{
        if(!envelope.classList.contains('open')){
            toggleClass(envelopeFlap, "flipped")
            window.setTimeout(()=>{toggleClass(envelope, "open")}, 999)
            window.setTimeout(()=>{toggleClass(envelope, "show-card")}, 1000)
        }else{
            toggleClass(envelope, "show-card")
            window.setTimeout(()=>{toggleClass(envelope, "open")}, 999)
            window.setTimeout(()=>{toggleClass(envelopeFlap, "flipped")}, 1000)
        }
    }

    const toggleClass = (element, tag)=>{
        element.classList.toggle(tag);
    }

    const gamePhaseDisplay = ({gameState})=>{
        switch(gameState.gamePhase){
            case 'power':
                powerDisplay({gameState})
        }
    }

    // upate the power heading block
    const powerDisplay = ({gameState, playerObject, privateInfo})=>{

        switch(gameState.powerActive){
            case undefined:
                break;
            case 'top-3-cards':
                powerNameDisplay.innerText = "Top 3 Cards";
                if (playerObject.president == true){
                    powerInstructionDisplay.innerText = "Look at the cards and confirm when ready";
                }else{
                    powerInstructionDisplay.innerText = "Wait for president";
                } 
                
                break;
            case 'kill':
                powerNameDisplay.innerText = "Assasination";

                if(playerObject.president == true){
                    powerInstructionDisplay.innerText = "Select a player to kill and confirm"
                }else{
                    powerInstructionDisplay.innerText = "Wait for president"
                }
                
                break;
            case 'investigate':
                powerNameDisplay.innerText = "Alignment Investigation";

                if (playerObject.president == true){
                    powerInstructionDisplay.innerText = "Select a player to investigate and confirm when done"
                }else{
                    powerInstructionDisplay.innerText = "Wait for president";
                }
                // highlight the player that is investigated
                break;
            case 'special-election':
                powerNameDisplay.innerText = "Special Election";

                if(playerObject.president == true){
                    powerInstructionDisplay.innerText = "Select a player to be president next and confirm"
                }else{
                    powerInstructionDisplay.innerText = "Wait for president";
                }
                // add a select click event to the players (not yourself)
                break;
            default:
                console.error(`Unknown power: ${gameState.power}`)
                break;
        }
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

    spectatorJoin.onclick = ()=>{
        ws.emit("joinSpectator", {gameRef: getGameRefInput()})
    }

    lobbyReadyButton.onclick = ()=>{ 
        ws.emit("readyUp")
        
    }
    
    envelopeFlap.addEventListener("click", ()=>{
        toggleEnvelopeOpen()
    })

    // UTILITY FUNCTIONS
    const markPlayerCardAsSelected = (playerCard)=>{
        // remove all other selected playerCards
        document.querySelectorAll('.player-card').forEach((el)=>{el.classList.remove('selected')});
        // add the selected class to playerCard
        toggleClass(playerCard, 'selected');

    }

    return{
        displayModule,
        getSelectedPlayer
    }

})();