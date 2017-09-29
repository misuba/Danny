const html = require('choo/html');

const {selectOption} = require('../util');


function playSound(state, emit, behav, path) {
    emit('ensureStaticFileLists');

    const yourBasicHandler = (e) =>
        emit('setBehaviorObj', [path, {'playSound': e.target.value}]);

    return html`<div>
        <section>
            <small>(put a WAV, MP3, or OGG in the <code>/img</code> folder for now, sorry)</small><br />
            <select onchange=${yourBasicHandler} name="playSound">
                ${selectOption(null, '-', behav.playSound)}
                ${state.staticFiles.map((filename) =>
                    selectOption(filename, behav.playSound))}
            </select>
        </section>
    </div>`;
}

module.exports = playSound;
