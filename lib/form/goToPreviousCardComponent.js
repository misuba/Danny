const html = require('choo/html');
const {selectOption, checkBox} = require('../util');


function goToPreviousCard(state, emit, behav, path) {
    return html`<div>
        <section>
            <select name="goToNextCard"
                onchange=${(e) => emit('setBehaviorObj', [path,
                    {'goToNextCard': e.target.value, 'wrap': behav.wrap ? true : false}
                ])}>
                ${selectOption('stack', 'in the stack', behav.goToPreviousCard)}
                ${selectOption('bg', 'in this background', behav.goToPreviousCard)}
            </select>
            ${checkBox('wrap around', behav.wrap, (e) => emit('setBehaviorObj', [path,
                {'goToNextCard': behav.goToNextCard, 'wrap': e.target.checked}
            ]))}
        </section>
    </div>`;
}

module.exports = goToPreviousCard;
