const html = require('choo/html');

const background = require('./bgView');
const card = require('./cardView');
const editBar = require('./editBarView');
const editModal = require('./editModalView');

const {color} = require('./util');

const mainView = function(state, emit) {
    if (typeof state.editing != 'function') {
        setTimeout(() => emit('render'), 1);
        return html`<main id="hanzo"></main>`;
    }

    const currentColor = color(state);
    return html`<main class="${state.editMode || ""}"
        style="${currentColor ? "background-color:" + currentColor : ""}">
      ${state.editing() ? editBar(state, emit) : null}
      ${background(state, emit)}
      ${card(state, emit)}
      ${state.editingObject() ? editModal(state, emit) : null}
    </main>`;
};

module.exports = mainView;
