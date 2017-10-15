const {modPath, getPath} = require('./util');


module.exports = function(state, emitter) {
    const poke = modPath(state, emitter);

    state.getCards = () => {
        return state.cards;
    };
    state.getCardCount = () => {
        return state.cards.length;
    }
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
        if (state.currentBackground) {
            return state.currentBackground;
        };
        return state.getCurrentCard().background;
    };
    state.getCurrentBackground = () => {
        return state.backgrounds[state.currentBackground];
    };
    state.getBackgroundForCard = (card) => {
        return state.backgrounds[card.background];
    }
    state.getCardsInCurrentBackground = () => {
        return state.cards.map((cd, ind) => Object.assign({}, cd, {index: ind}))
            .filter((cd) => cd.background === state.currentBackground);
    };
    state.getBackgroundCount = () => {
        return Object.keys(state.backgrounds).length;
    };

    state.setPropertyAtPath = (pathArray, value) => {
        poke(pathArray, value);
    }
    state.getPropertyAtPath = (pathArray) => {
        return getPath(state, pathArray);
    };

    state.setCurrentCardProperty = (pathArray, value) => {
        state.setPropertyAtPath(
            ['cards', state.getCurrentCardIndex()].concat(pathArray),
            value
        );
    };
    state.setCurrentBackgroundProperty = (pathArray, value) => {
        state.setPropertyAtPath(
            ['backgrounds', state.getCurrentBackgroundIndex()].concat(pathArray),
            value
        );
    }

    state.editObject = (objectPath) => {
        // this just means switch on the edit modal?
        // what is 'env' here and maybe we ignore it?
        if (!state.editing()) {
            return false;
        }
        let lePath = state.editingCard()
            ? ['cards', state.getCurrentCardIndex()]
            : ['backgrounds', state.getCurrentBackgroundIndex()];
        state.editingPath = lePath.concat(objectPath);
        // so I guess that's what those arguments are

        state.editingImage = state.editingElement = state.editingField = null;
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

    state.getEditedObjectIndex = () => {
        return state.editingPath[state.editingPath.length - 1];
    }
    state.editingObject = () => !!state.editingPath;
    state.getEditedObject = () => {
        if (!state.editingObject()) {
            return null;
        }
        return state.getPropertyAtPath(state.editingPath);
    };
    state.getEditedObjectType = () => {
        if (!state.editingObject()) {
            return null;
        }
        return state.editingPath.includes('elements')
            ? 'element'
            : (state.editingPath.includes('images')
                ? 'image'
                : (state.editingPath.includes('fields')
                    ? 'field'
                    : (state.editingPath.includes('stack')
                        ? 'stack'
                        : (state.editingPath.includes('backgrounds')
                            ? 'background'
                            : 'card')))); // maybe a better way to do this :-/
    };

    state.setEditMode = (toWhat) => {
        if (typeof toWhat === 'boolean') {
            // isCardLevel and the like
            toWhat = toWhat ? 'editMode' : 'bgEdit';
        }
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
    state.getEditScopePath = () => {
        if (!state.editing()) {
            return null;
        }
        return state.editingBackground()
            ? ['backgrounds', state.getCurrentBackgroundIndex()]
            : ['cards', state.getCurrentCardIndex()];
    }

    // what about dragging
    // maybe dragging stays how it is because it shouldn't hit the disk ever

    state.saveField = function(event, field, state) {
        const newValue = event.target.value;
        const card = state.getCurrentCard();
        if (card.fields[field.name]) {
            state.setCurrentCardProperty(['fields', field.name, 'value'], newValue);
        } else {
            state.setCurrentCardProperty(['values', field.name], newValue);
        }
    };

    return state;
};
