const html = require('choo/html');


function linkTo(state, emit, behav, path) {
    return html`<div>
        <section>the URL
            <input name="linkToWhat"
                    onchange=${(e) => emit('setBehaviorObj', [path, {'linkTo': e.target.value}])}
                    value="${behav.linkTo}" />
        </section>
    </div>`;
}

module.exports = linkTo;
