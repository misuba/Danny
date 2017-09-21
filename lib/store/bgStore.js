const BgStore = (state, emitter) => {
    const blankBg = {
        name: '',
        images: [],
        elements: [],
        fields: {},
        behavior: []
    };

    state.setCurrentBackground = async function() {
        const args = [...arguments];
        const newBg = Object.assign.apply(null, args);
        const bg = await state.getCurrentBackground();
        await state.DB.backgrounds.update(bg, newBg);
    };
    // well so but this is a problem
    // the current bg might not be ours
    // but we still have to pack the card values into it
    // 💩
    // so, rendering has to be independent of disk shit at that point

    emitter.on('init', function() {
        const ourUrl = new URL(window.location.toString());
        const archive = `dat://${ourUrl.hostname}`;
        state.DB.backgrounds.toArray().then(async backgrounds => {
            console.log(backgrounds);
            if (!backgrounds || backgrounds.length === 0) {
                const aUrl = await state.DB.backgrounds.upsert(archive,
                    Object.assign({}, blankBg, {name: 'default'}));
                // more init in appStore and cardStore
                console.log('bgstore init', aUrl);
            }
        });
    });

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
