const html = require('choo/html');


const stackComboView = (state, emit) => {
  let changeHandler = (event) => emit('stackPropertyChange', event);

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
  </form>`;

};

module.exports = stackComboView;
