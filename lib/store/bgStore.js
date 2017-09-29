const {parseAndRunBehaviors} = require('../behavior.js');


const BgStore = (state, emitter) => {
    emitter.on('backgroundLoaded', function() {
        if (state.background.behavior && state.background.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), state.background.behavior);
        }
        if (state.editingPath && state.editingPath.length == 2 && state.editingPath[0] == 'backgrounds') {
            // already in bg-editing mode, so update the path
            state.editingPath[1] = state.currentBackground;
        }
    });

    emitter.on('cardLoaded', function() {
        let values = state.card.values;
        if (values) {
            Object.keys(values).forEach((fieldName) => {
                if (state.background.fields[fieldName]) {
                    state.background.fields[fieldName].value = values[fieldName];
                }
            });
        }
    });

    const blankBg = {
        name: '',
        images: [],
        elements: [],
        fields: {},
        behavior: []
    };

    emitter.on('newBg', function() {
        state.backgrounds.push(Object.assign({}, blankBg));
        // then go there?
    });

    emitter.on('editBg', function() {
        state.editingPath = ['backgrounds', state.currentBackground];
        state.editingImage = state.editingField = state.editingElement = null;
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('envPropertyChange', function(event) {
        if (state.editingPath && state.editingPath[0] === 'backgrounds') {
            const propName = event.target.name;
            const newValue = event.target.value;

            state.backgrounds[state.currentBackground][propName] = newValue;
            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    });
};

module.exports = BgStore;
