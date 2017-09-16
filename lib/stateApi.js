const {modPath, getPath} = require('./util');
const poke = modPath(state, emitter);


state.getCards = () => {
    return state.cards;
};
state.setNextCard = (num) => {
    state.nextCard = num;
};
state.getCurrentCardIndex = () => {
    return state.currentCard;
};
state.getCurrentCard = () => {
    return state.cards[state.currentCard];
};
state.getCurrentBackgroundIndex = () => {
    return state.currentBackground;
};
state.getCurrentBackground = () => {
    return state.backgrounds[state.currentBackground];
};
state.getCardsInCurrentBackground = () => {
    return state.cards.map((cd, ind) => Object.assign({}, cd, {index: ind}))
        .filter((cd) => cd.background === state.currentBackground);
};

state.setPropertyAtPath = (pathArray, value) => {
    poke(pathArray, value);
}
state.getPropertyAtPath = (pathArray) => {
    return getPath(state, pathArray);
};

// okay so, path is reasonable because injest doesnt do relationships at all
// so we will just have card docs and bg docs

state.editObject = (objectPath) => {
    // this just means switch on the edit modal?
    // what is 'env' here and maybe we ignore it?
    if (!state.editing()) {
        return false;
    }
    let lePath = state.editingCard()
        ? ['cards', state.currentCard]
        : ['backgrounds', state.currentBackground];
    state.editingPath = lePath.concat(objectPath);
    // so I guess that's what those arguments are
    switch (objectPath[0]) {
        case 'elements':
            state.editingElement = state.getPropertyAtPath(state.editingPath);
            break;
        case 'images':
            state.editingImage = state.getPropertyAtPath(state.editingPath);
            break;
        case 'fields':
            state.editingField = state.getPropertyAtPath(state.editingPath);
            break;
        case 'cards':
        case 'backgrounds':
        case 'stack':
            // oh actually
            state.editingPath = objectPath;
            break;
    }
};

state.setEditMode = (toWhat) => {
    if (['editMode','bgEdit', ''].includes(toWhat)) {
        state.editMode = toWhat;
    }
    if (toWhat === null || toWhat == undefined) {
        state.editMode = '';
    }
}
state.editing = () => {
    return !!state.editMode;
};
state.editingCard = () => {
    return state.editMode === 'editMode';
};
state.editingBackground = () => {
    return state.editMode === 'bgEdit';
};

// what about dragging
// maybe dragging stays how it is because it shouldn't hit the disk ever

state.saveField = function(event, field, state) {
    let newValue = event.target.value;
    if (state.card.fields[field.name]) {
        state.card.fields[field.name].value = newValue;
        state.cards[state.currentCard].fields[field.name].value = newValue;
    } else {
        state.card.values[field.name] = newValue;
        state.cards[state.currentCard].values[field.name] = newValue;
    }
};
