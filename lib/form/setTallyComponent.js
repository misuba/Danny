const html = require('choo/html');

const {selectOption} = require('../util');


function setTally(state, emit, behav, path) {
    const tallyName = behav.setTally || '';
    const tallyValue = behav.upBy
        ? behav.upBy
        : (behav.downBy
            ? behav.downBy
            : (behav.to ? behav.to : 0));

    const nameHandler = (e) => emit('setBehaviorObj',
        [path, Object.assign(behav, {setTally: e.target.value})]);
    const howHandler = (e) => {
        const newBehavObj = {setTally: tallyName};
        newBehavObj[e.target.value] = tallyValue;
        emit('setBehaviorObj', [path, newBehavObj]);
    };
    const valueHandler = (e) => {
        const otherKey = Object.keys(behav).filter((key) => key != 'setTally')[0];
        const newBehavObj = {setTally: tallyName};
        newBehavObj[otherKey] = parseInt(e.target.value, 10);
        emit('setBehaviorObj', [path, newBehavObj]);
    };

    return html`<div>
        <section>Move the Tally
        <input type="text" name="whatTally" value="${tallyName}"
            onchange=${nameHandler} />
        <select name="howMoveIt" onchange=${howHandler}>
            ${selectOption('upBy', 'up by', typeof behav.upBy !== 'undefined')}
            ${selectOption('downBy', 'down by', typeof behav.downBy !== 'undefined')}
            ${selectOption('to', 'to the number', typeof behav.to !== 'undefined')}
        </select>
        <input type="" name="tallyValue" value="${tallyValue}"
            onchange=${valueHandler} />
        </section>
    </div>`;
}

module.exports = setTally;
