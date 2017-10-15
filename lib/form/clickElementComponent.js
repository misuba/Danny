const html = require('choo/html');

const {selectOption} = require('../util');


function clickElement(state, emit, behav, path) {
    const card = state.getCurrentCard();
    const bg = state.getCurrentBackground();

    const namedElms = elmsWithName(card).concat(elmsWithName(bg));

    return html`<div>
        <section>do the Behavior of the element named
            <select name="elementToClick"
                    onchange=${(e) => emit('setBehaviorObj', [path, {'clickElement': e.target.value}])}>
                ${selectOption(null, '-', behav.clickElement === null, -1)}
                ${namedElms.map((name) =>
                    selectOption(name, behav.clickElement)
                )}
            </select>
        </section>
    </div>`;

    function elmsWithName(env) {
        return env.elements.filter((elm) =>
            typeof elm.name !== 'undefined' && elm.name !== ''
        ).map((elm) => elm.name);
    }
}

module.exports = clickElement;
