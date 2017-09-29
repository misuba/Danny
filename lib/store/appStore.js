const {modPath, getPath} = require('../util');


const AppStore = async function(state, emitter) {
    const poke = modPath(state, emitter);

    const localArc = new DatArchive(window.location.toString());
    const rawState = JSON.parse(await localArc.readFile('stack.json'));
    Object.keys(rawState).forEach((key) => {
        state[key] = rawState[key];
    });

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
        return state.currentBackground;
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

    state.setPropertyAtPath = (pathArray, value) => {
        poke(pathArray, value);
    }
    state.getPropertyAtPath = (pathArray) => {
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
                   (state.nextCard !== state.currentCard || force === true)) {
            let num = state.nextCard;
            state.card = Object.assign({}, state.cards[num]);
            state.currentCard = num;
            if (!state.background || state.card.background !== state.currentBackground) {
                state.background = Object.assign({}, state.getBackgroundForCard(state.card));
                await asyncEmit('backgroundLoaded');
            }

            await asyncEmit('cardLoaded');
            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    });
    emitter.on('gotoNextCard', async function(wrap = true) {
        const currentCard = state.getCurrentCardIndex();
        state.setNextCard((currentCard + 1 >= state.getCardCount())
            ? (wrap ? 0 : currentCard)
            : currentCard + 1);
        await asyncEmit('goto');
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
        delete savedState.styleCache;
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


    const styleSheet = await localArc.readFile('stack.css');
    state.styleCache = styleSheet;

    emitter.on('setStyles', async function(styleText) {
        await localArc.writeFile('stack.css', styleText);

        state.styleCache = styleText;
        await asyncEmit('render');
    });


    emitter.on('ensureStaticFileLists', async function() {
        const needsFirstRender = !(state.staticFiles && state.staticFiles.length);
        const statics = await localArc.readdir('/img', {recursive: true});
        state.staticFiles = statics;
        if (needsFirstRender) {
            await asyncEmit('render');
        }
    });

    const maintainListsHandler = ({path}) => emitter.emit('ensureStaticFileLists');
    const staticsMonitor = localArc.createFileActivityStream('/img/*');
    staticsMonitor.addEventListener('invalidated', maintainListsHandler);
    staticsMonitor.addEventListener('changed', maintainListsHandler);


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
                    if (guy.hasAttribute('data-realvalue')) {
                        guy.querySelectorAll('option').forEach((opt, index) => {
                            if (opt.value == guy.getAttribute('data-realvalue')) {
                                guy.selectedIndex = index;
                            }
                        });
                    } else {
                        guy.querySelectorAll('option').forEach((opt, index) => {
                            if (opt.hasAttribute('selected')) {
                                guy.selectedIndex = index;
                            }
                        });
                    }
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
