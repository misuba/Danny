const {parseAndRunBehaviors} = require('../behavior.js');
const {uniqueName} = require('../util');


const BgStore = (state, emitter) => {
    emitter.on('backgroundLoaded', function() {
        const bg = state.getCurrentBackground();
        if (bg.behavior && bg.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), bg.behavior);
        }
        if (state.editingPath && state.editingPath.length == 2 && state.editingPath[0] == 'backgrounds') {
            // already in bg-editing mode, so update the path
            state.editingPath[1] = state.getCurrentBackgroundIndex();
        }
    });

    emitter.on('cardLoaded', function() {
        const bg = state.getCurrentBackground();
        const values = state.getCurrentCard().values;
        if (values) {
            Object.keys(values).forEach((fieldName) => {
                if (bg.fields[fieldName]) {
                    state.setCurrentBackgroundProperty(['fields', fieldName, 'value'],
                        values[fieldName]
                    );
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

    emitter.on('newBg', function(name) {
        if (name === null || typeof name == 'undefined') {
            name = uniqueName(['backgrounds'], 'newBg');
        }
        state.backgrounds[name] = Object.assign({}, blankBg);
        // then go there?
    });

    emitter.on('editBg', function() {
        state.editObject(['backgrounds', state.getCurrentBackgroundIndex()]);
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('envPropertyChange', function(event) {
        if (state.editing() && state.editingPath[0] === 'backgrounds') {
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
