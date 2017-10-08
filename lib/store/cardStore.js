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
        const card = state.getCurrentCard();
        if (card.behavior && card.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), card.behavior);
        }
        if (state.editing() && state.getEditedObjectType() == 'card') {
            // already in card-editing mode, so update the path
            state.editObject(['cards', state.getCurrentCardIndex()]);
        }
    });

    emitter.on('editCard', function() {
        state.editObject(['cards', state.getCurrentCardIndex()]);
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('deleteCard', function() {
        if (state.getCardCount() === 1) {
            return false;
        }
        const currentCard = state.getCurrentCardIndex();
        state.cards.splice(currentCard, 1);
        // something with the background if it is now cardless?
        if (currentCard > 0) {
            state.setNextCard(--currentCard);
            setTimeout(() => emitter.emit('goto'), 1);
        }
        state.card = state.getCurrentCard();
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
