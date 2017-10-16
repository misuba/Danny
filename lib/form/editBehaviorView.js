const html = require('choo/html');

const {parseAndRunBehaviors, behaviorList, behavior} = require('../behavior');
const {getPath} = require('../util');


const editBehaviorView = (state, emit) => {
  const thing = state.getEditedObject();
  const kickoffDescriptor = ['card','background'].includes(state.getEditedObjectType())
    ? 'arrival'
    : 'click';
  // this is bad but whatever

  return html`<form>
    <div>On ${kickoffDescriptor},

    ${thing.behavior && thing.behavior.length
        ? behaviorList(state, emit, thing.behavior, state.editingPath.concat(['behavior']))
        : html`<ul class="behaviors">
            <li>${behavior(state, emit, state.editingPath.concat(['behavior', 0]))}</li>
        </ul>`
    }

    </div>
    <div class="debug-readout">
    <table>
        <tr>
            <td>
                Current truths:
                <ul>
                  ${Object.keys(state.truths).map((th) => html`<li>${th}</li>`)}
                </ul>
            </td>
            ${state.tallies
              ? html`<td>
                Current tallies:
                <ul>
                  ${Object.keys(state.tallies).map((tl) => html`<li>${tl}: ${state.tallies[tl]}</li>`)}
                </ul>
              </td>`
              : null}
        </tr>
    </table>

      <button onclick=${() => {
        try {
          parseAndRunBehaviors(state, emit, thing.behavior);
        } catch(e) {
          console.error(e);
        } finally {
          return false;
        }}}>Test behavior</button>
    </div>
  </form>`;

};

module.exports = editBehaviorView;
