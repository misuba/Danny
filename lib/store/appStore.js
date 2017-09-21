const InjestDB = require('injestdb')

const {modPath, getPath} = require('../util');


const AppStore = async function(state, emitter) {
    const poke = modPath(state, emitter);

    // const localArc = new DatArchive(window.location.toString());
    // const rawState = JSON.parse(await localArc.readFile('stack.json'));
    // Object.keys(rawState).forEach((key) => {
    //     state[key] = rawState[key];
    // });
    const ourUrl = new URL(window.location.toString());
    const archiveUrl = `dat://${ourUrl.hostname}`;
    const datArchive = new DatArchive(archiveUrl);
    const info = await datArchive.getInfo();

    state.DB = new InjestDB(info.title);
    state.DB.schema(require('../schema'));
    await state.DB.open();
    await state.DB.addArchive(archiveUrl, {prepare: true});

    state.DB.config.get(archiveUrl).then(async config => {
        if (config) {
            config.cardSources.forEach(url => state.DB.addArchive(url));
        } else {
            const result = await state.DB.config.upsert(archiveUrl, {
                currentCard: 0,
                color: "",
                cardSources: []
            });
            // more init in cardStore and bgStore when we do this:
            emitter.emit('init');
            // see if that works
        }
    });



    state.getCards = async () => {
        return await state.DB.cards.get();
    };
    state.getBackgrounds = async () => {
        return await state.DB.backgrounds.get();
    };
    state.getCardCount = async () => {
        return await state.DB.cards.count();
    };
    state.setNextCard = (num) => {
        state.nextCard = num;
    };
    state.getCurrentCardIndex = async () => {
        const config = await state.DB.config.get(archiveUrl);
        return config.currentCard;
        // oh god how do we keep cards in a consistent order
    };
    state.getCurrentCard = async () => {
        const cards = await state.getCards();
        return cards[await state.getCurrentCardIndex()];
        // we'll do it that way for now in case we really can't depend on order
    };
    state.setCurrentCardIndex = async (ind) => {
        await state.DB.config.update(archiveUrl, {currentCard: ind});
    };
    state.getCurrentBackgroundIndex = async () => {
        //const config = await state.DB.config.get(archiveUrl);
        return await state.getCurrentCard().background;//config.currentBackground;
        // remember, all these currents have to get saved when they change
    };
    state.getCurrentBackground = async () => {
        const bgs = await state.getBackgrounds();
        return bgs[await state.getCurrentBackgroundIndex()];
    };
    state.getBackgroundForCard = async card => {
        const bgs = await state.getBackgrounds();
        return bgs[card.background];
        // if we go to name-indexing for bgs, this can just be a find
    }
    state.getCardsInCurrentBackground = async () => {
        // return state.cards.map((cd, ind) => Object.assign({}, cd, {index: ind}))
        //     .filter((cd) => cd.background === state.currentBackground);
        const bgIndex = await state.getCurrentBackgroundIndex();
        return await state.DB.cards.where('background').equals(bgIndex);
    };

    state.setPropertyAtPath = (pathArray, value) => {
        poke(pathArray, value);
    }
    state.getPropertyAtPath = (pathArray, obj) => {
        return getPath(state, pathArray);
    };

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

    emitter.on('goto', async function(force = false) {
        if (state.params && state.params.which) {
            if (Number.isNaN(parseInt(state.params.which)) && Array.isArray(state.cards)) {
                state.setNextCard(state.getCards().findIndex((cd) => cd.name == state.params.which));
                state.setNextCard(Math.max(state.nextCard, 0)); // in case of 404
            } else {
                state.setNextCard(state.params.which);
            }
            delete state.params.which;
        }

        if (typeof state.nextCard !== 'undefined' &&
                   (state.nextCard !== await state.getCurrentCardIndex() || force === true)) {
            const num = state.nextCard;
            // state.card = Object.assign({}, state.cards[num]);
            state.setCurrentCardIndex(num);

            const card = await state.getCurrentCard();
            if (card) {
                if (card.background !== await state.getCurrentBackgroundIndex()) {
                    // state.background = Object.assign({}, state.getBackgroundForCard(state.card));
                    await asyncEmit('backgroundLoaded');
                }

                await asyncEmit('cardLoaded');
                asyncEmit('render');
            }
        }
    });
    emitter.on('gotoNextCard', async function(wrap = true) {
        const currentCard = state.getCurrentCardIndex();
        state.setNextCard((currentCard + 1 >= state.getCardCount())
            ? (wrap ? 0 : currentCard)
            : currentCard + 1);
        asyncEmit('goto');
    });
    emitter.on('gotoPrevCard', async function(wrap = true) {
        const currentCard = state.getCurrentCardIndex();
        state.setNextCard((currentCard - 1 < 0)
            ? (wrap ? state.getCardCount() - 1 : 0)
            : currentCard - 1);
        await asyncEmit('goto');
    });

    emitter.on('save', async function() {
        let savedState = Object.assign({}, state);
        delete savedState.card;
        delete savedState.background;
        delete savedState.editMode;
        delete savedState.editingPath;
        delete savedState.params;
        for (let key of Object.keys(savedState)) {
            if (typeof savedState[key] === 'function') {
                delete savedState[key];
            }
        }
        // delete savedState.query;
        // delete savedState.href; // more choo builtins
        await localArc.writeFile('stack.json',
            JSON.stringify(savedState));
        window.testState = savedState;
    });

    if (!state.card || !state.background || Object.keys(state.card).length === 0) {
        state.setNextCard(state.currentCard);
        await asyncEmit('goto', true);
    } else {
        await asyncEmit('render');
    }

    let altKeyReadied = false;

    document.addEventListener('keydown', function(event) {
        if (/^Alt/.test(event.code)) {
            altKeyReadied = true;
        } else {
            if (altKeyReadied) {
                switch (event.code) {
                    case 'Enter': emitter.emit('toggleEditMode'); break;
                    case 'ArrowRight': emitter.emit('gotoNextCard'); break;
                    case 'ArrowLeft': emitter.emit('gotoPrevCard'); break;
                    case 'KeyN': emitter.emit('newCard'); break;
                }
            }
            if (event.code === "Escape") {
                altKeyReadied = false;
                if (state.editingPath) {
                    emitter.emit('closeEdit');
                } else if (state.editMode) {
                    emitter.emit('turnOffEditMode');
                }
            }
        }
    });
    document.addEventListener('keyup', function(event) {
        if (/^Alt/.test(event.code) && altKeyReadied) {
            altKeyReadied = false;
        }
    });

    emitter.on('render', function() {
        setTimeout(function() {
            const badGuys = document.querySelectorAll('select');
            // so named only because this is to fix what we experience as a bug!
            // WHATCHA GONNA DO WHEN THEY COME FOR YOU
            if (badGuys.length) {
                badGuys.forEach((guy) => {
                    guy.querySelectorAll('option').forEach((opt, index) => {
                        if (opt.hasAttribute('selected')) {
                            guy.selectedIndex = index;
                        }
                    });
                });
            }
        }, 10);
    });

    function asyncEmit() {
        let args = [...arguments];
        return new Promise((resolve, reject) => {
            emitter.emit.apply(emitter, args);
            setTimeout(resolve, 1);
        });
    }
};

module.exports = AppStore;
