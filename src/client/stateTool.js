/* DEFINE CONSTANTS */

const allPlayerOptions = document.querySelector('.all-player-options');
// player option defaults
const optionDefault =  {
  alignment : {value:'liberal', formName:'alignment'},
  character :{value:'liberal', formName:'character'},
  president : {value:'false', formName:'president'},
  chancellor: {value: 'false', formName:'chancellor'},
  ready : {value:'true', formName:'ready'},
  prevGov : {value:'false', formName:'prev-gov'},
  proposedChancellor : {value:'false', formName:'proposed-chancellor'},
  voteCast : {value:'undefined', formName:'vote-cast'}
}

const gameStateTemplate = {
    gamePhase: 'lobby',     // 'lobby' || 'proposal' || 'election' || 'legislative' || 'power' || 'endgame'
    players:[], // collection of player objects
    policyDeck:[], // collection of card objects to be drawn
    policyDiscardPile:[], // collection of card objects discarded
    policyHand:[],  // hand of cards for the govornment to pick
    voteFailTrack:[false, false, false],  // prevent repeated failed elections
    policyTrackFascist:[false, false, false, false, false, false], // 6 long - policies played
    policyTrackLiberal:[false, false, false, false, false],  // 5 long - policies played
    powerTarget: undefined  // target of the power 
}

const playerTemplate = {
  playerRef: undefined, // string to link req.session
  playerName: undefined, // string for display name

  alignment: undefined, // string to show what side they are on
  character: undefined, // if they are fascist/hitler/liberal

  president: false,   // currently govornment
  chancellor: false,  // currently govornment
  // lobby phase
  ready: false,           // ready to start the game
  // proposal phase
  prevGov: false,       // if they were in the last successful gov
  proposedChancellor: false,
  // vote phase
  voteCast: undefined
}

const policyDeckNumbers = {fascist: 11, liberal:6}

/* GENERATE HTML ELEMENTS */    

const genPlayerFormEl = (playerNumber)=>{
    const playerContainer = document.createElement('fieldset');
    playerContainer.classList.add('player-options')

    playerContainer.appendChild(createLabel(`playerName`))
    playerContainer.appendChild(createTextInput(`p${playerNumber}_player-name`));
    
    playerContainer.appendChild(createLabel('playerRef'));
    playerContainer.appendChild(createTextInput(`p${playerNumber}_player-ref`));

    playerContainer.appendChild(createLabel('alignment'));
    playerContainer.appendChild(createRadiogroup(`p${playerNumber}_alignment`, ['liberal', 'fascist'], 'liberal'))

    playerContainer.appendChild(createLabel('character'))
    playerContainer.appendChild(createRadiogroup(`p${playerNumber}_character`, ['liberal', 'fascist', 'hitler'],'liberal'))

    playerContainer.appendChild(createLabel('president'));
    playerContainer.appendChild(createRadiogroup(`p${playerNumber}_president`, ['true','false'],'false'));

    playerContainer.appendChild(createLabel('chancellor'));
    playerContainer.appendChild(createRadiogroup(`p${playerNumber}_chancellor`, ['true','false'],'false'));

    playerContainer.appendChild(createLabel('ready'))
    playerContainer.appendChild(createRadiogroup(`p${playerNumber}_ready`, ['true', 'false'],'true'));

    playerContainer.appendChild(createLabel('prevGov'));
    playerContainer.appendChild(createRadiogroup(`p${playerNumber}_prev-gov`, ['true', 'false'],'false'));

    playerContainer.appendChild(createLabel('proposedChancellor'));
    playerContainer.appendChild(createRadiogroup(`p${playerNumber}_proposed-chancellor`, ['true', 'false'],'false'))

    playerContainer.appendChild(createLabel('voteCast'));
    playerContainer.appendChild(createRadiogroup(`p${playerNumber}_vote-cast`, ['true', 'false', 'undefined'],'undefined'));
 
    return playerContainer;
}

const createLabel = (labelName = "SomeName")=>{
    const label = document.createElement('label')
    label.innerText = labelName;
    return label;
}

const createTextInput = (labelName = "SomeName")=>{
    const inputBox = document.createElement('input')
    inputBox.setAttribute('type', 'input')
    inputBox.setAttribute('name',  labelName)
    inputBox.classList.add(labelName)
    return inputBox
}

const createDropDown = (labelName = "SomeName", options = ["someString"])=>{
    const dropDown = document.createElement('select');
    dropDown.classList.add(labelName);

    options.forEach((option)=>{
        const optionEl = document.createElement('option')
        optionEl.classList.add(option);
        optionEl.innerText = option;
        optionEl.value = option;
        dropDown.appendChild(optionEl)
    })

    return dropDown;
}

const createRadiogroup = (labelName, options = [], checkedValue)=>{
    const container = document.createElement('div');

    options.forEach((option)=>{
        const button = document.createElement('input');
        const label = document.createElement('label')
        button.setAttribute('type', 'radio');
        button.setAttribute('name', labelName);
        button.setAttribute('value', option)

        label.innerText = option;

        container.appendChild(button)
        container.appendChild(label)
    })

    return container;
}

const emptyElement = (el)=>{
    while (el.children.length > 0){
        el.children[0].remove();
    }
    return el;
}

/* CHANGING AND RETRIEVING FORM VALUES */

const retrievePlayerSetting = (playerNumber = 0, optionName)=>{
    const playerOptionEl = document.querySelectorAll('.player-options')[playerNumber]

    return playerOptionEl.querySelector(`input[name=p${playerNumber}_${optionName}]:checked`).value
}

const setPlayerDefault = (playerHtml,options={}, playerNumber=0)=>{

  playerHtml.querySelector(`input[name=p${playerNumber}_player-name]`).value = `player_${playerNumber}`;
  playerHtml.querySelector(`input[name=p${playerNumber}_player-ref]`).value = `p${playerNumber}`;

  Object.keys(optionDefault).forEach((optionName)=>{
    // let provided options override default if included
    options[optionName] = (options[optionName] == undefined) ? optionDefault[optionName].value : options[optionName];
    // set the value of the radio button
    setPlayerSetting(playerHtml, `p${playerNumber}_${optionDefault[optionName].formName}`, options[optionName])
  })

  return options
}

const setPlayerSetting = (playerHtml, formName, value )=>{
  return playerHtml.querySelector(`input[name=${formName}][value=${value}]`).checked = true;
}

const setAllPlayersDefault = ()=>{
    // querySelectorAll returns a non-live version of the thing
    document.querySelectorAll('.all-player-options .player-options').forEach((playerHtml, index)=>{
        setPlayerDefault(playerHtml, undefined, index);
    })
    return true;
}

const getAllPlayerSettings = ()=>{
    let playerSettings = [];

    document.querySelectorAll('.player-options').forEach((playerOptionsEl, index)=>{

        let player = Object.assign({},playerTemplate);

        player['playerName'] = playerOptionsEl.querySelector(`input[name=p${index}_player-name]`).value;
        player['playerRef'] = playerOptionsEl.querySelector(`input[name=p${index}_player-ref]`).value;
        player['alignment'] = playerOptionsEl.querySelector(`input[name=p${index}_alignment]`).value;
        player['character'] = playerOptionsEl.querySelector(`input[name=p${index}_character]`).value;
        player['president'] = playerOptionsEl.querySelector(`input[name=p${index}_president]`).value;
        player['chancellor'] = playerOptionsEl.querySelector(`input[name=p${index}_chancellor]`).value;
        player['ready'] = playerOptionsEl.querySelector(`input[name=p${index}_ready]`).value;
        player['prevGov'] = playerOptionsEl.querySelector(`input[name=p${index}_prev-gov]`).value;
        player['proposedChancellor'] = playerOptionsEl.querySelector(`input[name=p${index}_proposed-chancellor]`).value;
        player['voteCast'] = playerOptionsEl.querySelector(`input[name=p${index}_vote-cast]`).value;

        playerSettings.push(player);
    })

    return playerSettings;
}

const getCreatedGameState = ()=>{
    let gameState = Object.assign({},gameStateTemplate);

    gameState.players = getAllPlayerSettings()

    return gameState;
}

// TODO: check that card numbers are right
const checkCardNumbers = ()=>{
  let policyHand = {
    fascist: Number(document.querySelector('.card-info .policy-hand.fascist').value),
    liberal: Number(document.querySelector('.card-info .policy-hand.liberal').value)  
  }

  let policyDiscard = {
    fascist: Number(document.querySelector('.card-info .policy-discard.fascist').value),
    liberal: Number(document.querySelector('.card-info .policy-discard.liberal').value)
  }

  let policyDeckElements = {
    fascist: document.querySelector('.card-info .policy-deck.fascist'),
    liberal: document.querySelector('.card-info .policy-deck.liberal')
  }
  
  if(policyHand.fascist + policyHand.liberal > 3) throw new Error(`Too many cards in hand | ${policyHand.fascist + policyHand.liberal}`);

  let notInDeck = {
      liberal: policyHand.liberal + policyDiscard.liberal,
      fascist: policyHand.fascist + policyDiscard.fascist
  }

  if (notInDeck.liberal > policyDeckNumbers.liberal) throw new Error(`Too many liberal cards in play - ${notInDeck.liberal} is bigger than the max in deck: ${policyDeckNumbers.liberal}`);
  if (notInDeck.liberal > policyDeckNumbers.liberal) throw new Error(`Too many fascist cards in play - ${notInDeck.fascist} is bigger than the max in deck: ${policyDeckNumbers.fascist}`);

  return {
      liberal: policyDeckNumbers.liberal - notInDeck.liberal,
      fascist: policyDeckNumbers.fascist - notInDeck.fascist
  }
}

const setDeckNumbers = ()=>{
    let deck = checkCardNumbers();
    
    document.querySelector('.policy-deck.fascist').innerHTML = deck.fascist;
    document.querySelector('.policy-deck.liberal').innerHTML = deck.liberal;
}

/* ==== SET UP EVENT LISTENERS */

document.querySelector('.player-number').addEventListener('change',(event)=>{
    emptyElement(allPlayerOptions);
    let playerNumber = document.querySelector('.player-number').value;

    for(var i = 0; i< playerNumber; i++){
        allPlayerOptions.appendChild(genPlayerFormEl(i));
        let playerHtml = document.querySelectorAll('.all-player-options .player-options')[i]
    }

    setAllPlayersDefault();
})

/* INIT IMPLEMENTATION DETAILS */

// set the 5 players initially
for(var i=0; i<5; i++){
    allPlayerOptions.appendChild(genPlayerFormEl(i));
}
setAllPlayersDefault();





