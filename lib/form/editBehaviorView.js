const html = require('choo/html');

const {parseAndRunBehaviors, behavior} = require('../behavior');
const {getPath} = require('../util');


const editBehaviorView = (state, emit) => {
  const thing = getPath(state, state.editingPath);

  return html`<form>
    <div>On click,
    <ul class="behaviors">
    ${thing.behavior && thing.behavior.length
        ? thing.behavior.map((behav, ind) => {
            return html`<li>
              ${behavior(state, emit, state.editingPath.concat(['behavior', ind]))}
            </li>`;
        })
        : html`<li>${behavior(state, emit, state.editingPath.concat(['behavior', 0]))}</li>`
    }
    </ul>
    </div>
    <div style="color: red; font-family: Helvetica,sans">
      Current truths:
      <ul>
        ${Object.keys(state.truths).map((th) => html`<li>${th}</li>`)}
      </ul>
      <button onclick=${() => {parseAndRunBehaviors(state, emit, thing.behavior);return false}}>SimClick</button>
    </div>
  </form>`;

};

module.exports = editBehaviorView;
