const html = require('choo/html');

const Image = require('./imageView.js');
const GraphicElement = require('./graphicView.js');
const Element = require('./elementView.js');
const Field = require('./fieldView.js');


const bgView = (state, emit) => {
  return html`<section id="bg">
      ${drawImages()}
      ${drawElements()}
      ${drawFields()}
    </section>`;

  function drawImages() {
    if (state.background && state.background.images) {
      return state.background.images.map((elm, ind) =>
            Image(elm, ind, state, emit)
        );
    }
    return html`<div id="bg-no-images"></div>`;
  }

  function drawElements() {
    if (state.background && state.background.elements) {
      return state.background.elements.map((but, ind) =>
          Element(but, ind, state, emit)
      );
    }
    return html`<span class="bg-no-elements"></span>`;
  }

  function drawFields() {
    if (state.background && state.background.fields) {
      return Object.keys(state.background.fields).map((fldName) => {
          let fieldWithValueMaybe = Object.assign({},
            state.background.fields[fldName],
            {value: state.card.values[fldName] || ''}
          );
          return Field(fieldWithValueMaybe, fldName, state, emit);
        }
      );
    }
    return html`<span class="bg-no-fields"></span>`;
  }
};

module.exports = bgView;
