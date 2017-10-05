const {parseAndRunBehaviors} = require('../behavior.js');


const CardStore = (state, emitter) => {
    emitter.on('newCard', (stuff) => {
        if (Array.isArray(stuff)) {
            stuff = stuff[0];
        }
        if (!stuff) {
            stuff = {};
        }
        let newCard = Object.assign({}, state.card, {
            name: '',
            values: {},
            images: [],
            elements: [],
            fields: {},
            behavior: []
        }, stuff);
        const nextIndex = state.getCurrentCardIndex() + 1;
        state.cards.splice(nextIndex, 0, newCard);
        state.setNextCard(nextIndex);
        setTimeout(() => {
            emitter.emit('goto');
            emitter.emit('save');
        }, 1);
    });

    emitter.on('cardLoaded', function() {
        if (state.card.behavior && state.card.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), state.card.behavior);
        }
        if (state.editingPath && state.editingPath.length == 2 && state.editingPath[0] == 'cards') {
            // already in card-editing mode, so update the path
            state.editingPath[1] = state.currentCard;
        }
    });

    emitter.on('editCard', function() {
        state.editingPath = ['cards', state.currentCard];
        state.editingImage = state.editingField = state.editingElement = null;
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('deleteCard', function() {
        if (state.cards.length === 1) {
            return false;
        }
        state.cards.splice(state.currentCard, 1);
        // something with the background if it is now cardless?
        if (state.currentCard > 0) {
            state.currentCard--;
        }
        state.card = state.cards[state.currentCard];
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('envPropertyChange', function(event) {
        if (state.editingPath && state.editingPath[0] === 'cards') {
            const propName = event.target.name;
            const newValue = event.target.value;
            state.setPropertyAtPath(['cards', state.getCurrentCardIndex(), propName], newValue)
            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    });
};

module.exports = CardStore;
