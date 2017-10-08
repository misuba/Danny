const {modEnv, modPath, uniqueName} = require('../util');


const saveFieldToState = function(event, field, state) {
    const newValue = event.target.value;

    if (state.getCurrentCard().fields[field.name]) {
        state.setCurrentCardProperty(['fields', field.name, 'value'], newValue);
    } else {
        state.setCurrentCardProperty(['values', field.name], newValue);
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

    const change = modEnv(state, emitter);

    emitter.on("newField", function() {
        let fieldName = uniqueName(
            state.getEditScopePath().concat(['fields']),
            'newField'
        );
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
        if (!state.editing()) {
            emitter.emit('toggleEditMode');
        }
        if ((state.editingBackground() && !isCard) ||
            (state.editingCard() && isCard))
        {
            state.editObject(['fields', name]);
            setTimeout(() => emitter.emit('render'), 1);
        }
    });

    emitter.on('setFieldOptions', function(options) {
        const index = state.getEditedObjectIndex();
        change((card) => {
            card.fields[index].options = options;
            return card;
        })
    });

    emitter.on('deleteField', function() {
        const index = state.getEditedObjectIndex();
        change((card) => {
            delete card.fields[index];
            return card;
        });
        emitter.emit('closeEdit');
    });
};

module.exports = FieldStore;
