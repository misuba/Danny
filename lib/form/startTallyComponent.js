const html = require('choo/html');


function startTally(state, emit, behav, path) {
    const tallyName = behav.startTally || '';
    const tallyVal = behav.value || 0;

    const nameHandler = (e) => emit('setBehaviorObj',
        [path, {startTally: e.target.value, value: tallyVal}]);
    const valueHandler = (e) => emit('setBehaviorObj',
        [path, {startTally: tallyName, value: parseInt(e.target.value, 10)}]);

    return html`<div>
        <section>start a Tally named
        <input type="text" name="whatTally" value="${behav.startTally}"
            onchange=${nameHandler} />
        at the number
        <input type="" name="tallyValue" value="${behav.value}"
            onchange=${valueHandler} />
        </section>
    </div>`;
}

module.exports = startTally;
