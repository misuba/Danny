const html = require('choo/html');


const stackComboView = (state, emit) => {
  const changeHandler = (event) => emit('stackPropertyChange', event);
  const styleContainer = html`<textarea wrap="virtual"
    class="stylesheet"
    onchange=${(e) => setStyles(e.target.value)}>${state.styleCache}</textarea>`;

  return html`<form>
    <p><label for="color">Color</label><br />
         <input type="color"
           onchange=${changeHandler}
           name="color"
           value="${state.color || '#FFFFFF'}" />
       <button onclick=${() => {
           emit('stackPropertyChange', {target: {name: 'color', value: ''}});
           return false;
       }}>
         Clear
       </button>
    </p>
    <p><label for="styles">Styles</label><br />
    ${styleContainer}
    </p>
  </form>`;

  function setStyles(val) {
      emit('setStyles', val);
  }
};

module.exports = stackComboView;
