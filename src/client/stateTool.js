/* DEFINE CONSTANTS */

const allPlayerOptions = document.querySelector('.all-player-options');

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
        // TODO: this is not setting the radiobutton as checked
          // because they have the same name - only the last is set

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

  const optionDefault =  {
    alignment : {value:'liberal', formName:'alignment'},
    character :{value:'liberal', formName:'character'},
    president : {value:'false', formName:'president'},
    ready : {value:'true', formName:'ready'},
    prevGov : {value:'false', formName:'prev-gov'},
    proposedChancellor : {value:'false', formName:'proposed-chancellor'},
    voteCast : {value:'undefined', formName:'vote-cast'}
  }

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





