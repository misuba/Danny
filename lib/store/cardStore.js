const CardStore = (state, emitter) => {
    const blankCard = {
        name: '',
        values: {},
        images: [],
        elements: [],
        fields: {},
        behavior: [],
        color: ''
    };

    emitter.on('init', function() {
        const ourUrl = new URL(window.location.toString());
        const archive = `dat://${ourUrl.hostname}`;
        state.DB.cards.toArray().then(async cards => {
            if (!cards || cards.length === 0) {
                await state.DB.cards.upsert(archive,
                    Object.assign({background: 'default'}, blankCard));
                // more init in appStore and bgStore
            }
        });
    });

    emitter.on('newCard', ([stuff = {}]) => {
        let newCard = Object.assign({}, blankCard, stuff);
        state.cards.splice(state.currentCard + 1, 0, newCard);
        state.nextCard = state.currentCard + 1;
        setTimeout(() => {
            emitter.emit('goto');
            emitter.emit('save');
        }, 1);
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
            state.cards[state.currentCard][propName] = newValue;
            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    });
};

module.exports = CardStore;
