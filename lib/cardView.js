const html = require('choo/html');

const Image = require('./imageView.js');
const GraphicElement = require('./graphicView.js');
const Element = require('./elementView.js');
const Field = require('./fieldView.js');


const cardView = (state, emit) => {
    const card = state.getCurrentCard();
    return html`<article id="card">
        ${drawImages()}
        ${drawElements()}
        ${drawFields()}
    </article>`;

    function drawImages() {
        if (card && card.images) {
            return card.images.map((elm, ind) =>
                Image(elm, ind, state, emit, true)
            );
        }
        return html`<div id="card-no-images"></div>`
    }

    function drawElements() {
        if (card && card.elements) {
            return card.elements.map((but, ind) =>
                Element(but, ind, state, emit, true)
            );
        }
        return html`<span id="card-no-elements"></span>`
    }

    function drawFields() {
        if (card && card.fields) {
            return Object.keys(card.fields).map((fldName) =>
                Field(card.fields[fldName], fldName, state, emit, true)
            );
        }
        return html`<span id="card-no-fields"></span>`
    }
};

module.exports = cardView;
