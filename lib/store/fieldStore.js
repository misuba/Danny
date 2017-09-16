const {modEnv, modPath} = require('../util');


const saveFieldToState = function(event, field, state) {
    let newValue = event.target.value;
    if (state.card.fields[field.name]) {
        state.card.fields[field.name].value = newValue;
        state.cards[state.currentCard].fields[field.name].value = newValue;
    } else {
        console.log("background field?");
        state.card.values[field.name] = newValue;
        state.cards[state.currentCard].values[field.name] = newValue;
    }
};

const FieldStore = (state, emitter) => {
    emitter.on("fieldchange", function([event, field]) {
        saveFieldToState(event, field, state);
        setTimeout(() => {
            emitter.emit("render");
            emitter.emit("save");
        }, 1);
    });
    emitter.on("fieldKeyUp", ([event, field]) => {
        saveFieldToState(event, field, state);
        setTimeout(() => emitter.emit("save"), 1);
    });

    const blankField = {
        name: "",
        top: "300px",
        left: "300px",
        height: "14px",
        width: "180px",
        color: "",
        font: "",
        size: "",
        style: "",
        textColor: "",
        fieldType: "text",
        value: "",
        options: [],
        placeholder: "",
        behavior: []
    };
    const uniqueFieldName = function() {
        const location =
            state.editMode === "bgEdit" ? state.background : state.card;
        let trynum = 1;
        let tryAName = "newField" + trynum;
        while (typeof location[tryAName] != "undefined") {
            tryAName = "newField" + ++trynum;
        }
        return tryAName;
    };

    const change = modEnv(state, emitter);

    emitter.on("newField", function() {
        let fieldName = uniqueFieldName();
        change((card) => {
            card.fields[fieldName] = Object.assign({}, blankField, {
                name: fieldName
            });
            return card;
        });
    });

    emitter.on("moveField", function([fieldName, x, y]) {
        change((card) => {
            Object.assign(card.fields[fieldName],
                {top: y, left: x});
            return card;
        });
    });

    emitter.on("resizeField", function([fieldName, x, y]) {
        change((card) => {
            Object.assign(card.fields[fieldName],
                {height: y, width: x});
            return card;
        });
    });

    emitter.on('editField', function([field, name, isCard = false]) {
        if (state.editMode === '') {
            emitter.emit('toggleEditMode');
        }
        if ((state.editMode === 'bgEdit' && !isCard) ||
            (state.editMode === 'editMode' && isCard))
        {
            let path = isCard ? ['cards'] : ['backgrounds'];
            path.push(isCard ? state.currentCard : state.currentBackground);
            path = path.concat(['fields', name]);

            state.editingPath = path;
            state.editingImage = state.editingElement = null;
            state.editingField = field;

            setTimeout(() => emitter.emit('render'), 1);
        }
    });

    emitter.on('setFieldOptions', function(options) {
        const index = state.editingPath[state.editingPath.length - 1];
        change((card) => {
            card.fields[index].options = options;
            return card;
        })
    });

    emitter.on('deleteField', function() {
        const index = state.editingPath[state.editingPath.length - 1];
        change((card) => {
            delete card.fields[index];
            return card;
        });
        emitter.emit('closeEdit');
    });
};

module.exports = FieldStore;
