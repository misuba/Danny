const html = require('choo/html');

const Image = require('./imageView.js');
const GraphicElement = require('./graphicView.js');
const Element = require('./elementView.js');
const Field = require('./fieldView.js');


const bgView = (state, emit) => {
    const bg = state.getCurrentBackground();
    return html`<section id="bg">
        ${drawImages()}
        ${drawElements()}
        ${drawFields()}
    </section>`;

    function drawImages() {
        if (bg && bg.images) {
            return bg.images.map((elm, ind) =>
                Image(elm, ind, state, emit)
            );
        }
        return html`<div id="bg-no-images"></div>`;
    }

    function drawElements() {
        if (bg && bg.elements) {
            return bg.elements.map((but, ind) =>
                Element(but, ind, state, emit)
            );
        }
        return html`<span class="bg-no-elements"></span>`;
    }

    function drawFields() {
        if (bg && bg.fields) {
            return Object.keys(bg.fields).map(fldName => {
                let fieldWithValueMaybe = Object.assign(
                    {},
                    bg.fields[fldName],
                    { value: state.getCurrentCard().values[fldName] || "" }
                );
                return Field(fieldWithValueMaybe, fldName, state, emit);
            });
        }
        return html`<span class="bg-no-fields"></span>`;
    }
};

module.exports = bgView;
