const html = require('choo/html');

const Image = require('./imageView.js');
const GraphicElement = require('./graphicView.js');
const Element = require('./elementView.js');
const Field = require('./fieldView.js');


const cardView = (state, emit) => {
  return html`
    <article id="card">
      ${drawImages()}
      ${drawElements()}
      ${drawFields()}
    </article>
  `;

  function drawImages() {
    if (state.card && state.card.images) {
        return state.card.images.map((elm, ind) =>
            Image(elm, ind, state, emit, true)
        );
    }
    return html`<div id="card-no-images"></div>`
  }

  function drawElements() {
      if (state.card && state.card.elements) {
          return state.card.elements.map((but, ind) =>
              Element(but, ind, state, emit, true)
          );
      }
      return html`<span id="card-no-elements"></span>`
  }

  function drawFields() {
      if (state.card && state.card.fields) {
          return Object.keys(state.card.fields).map((fldName) =>
              Field(state.card.fields[fldName], fldName, state, emit, true)
          );
      }
      return html`<span id="card-no-fields"></span>`
  }
};

module.exports = cardView;
