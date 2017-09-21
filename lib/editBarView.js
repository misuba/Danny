const html = require("choo/html");

const editBarView = (state, emit) => {
    const ecks = html`<a href="#" onclick=${() => emit('turnOffEditMode')}></a>`;
    ecks.innerHTML = '&times;';

    return html`<nav id="editbar">
      <aside class="readout">
        Danny 0.1 👦🏾<br />
        ${state.editMode === 'bgEdit'
            ? html`<span>Bg ${state.currentBackground} of ${state.backgrounds.length}</span>`
            : html`<span>Card ${state.getCurrentCardIndex()} of ${state.getCardCount()}</span>`
        }
      </aside>

      <ul>
        <li>Create new:
        <button onclick=${() => {emit('newElement');return false}}>Element</button>
        <button onclick=${() => {emit('newImage');return false}}>Image</button>
        <button onclick=${() => {emit('newField');return false}}>Field</button>
        <button onclick=${() => {emit('newBg');return false}}>Background</button>
        <button onclick=${() => {emit('newCard');return false}}>Card</button></li>
        <li class="bgmode"><a href="#" onclick=${() => emit("editBgMode")}>
            ${state.editMode == 'bgEdit' ? 'Card' : 'Background'} mode
        </a></li>
        <li><a href="#" onclick=${() => emit(state.editMode == 'bgEdit' ? 'editBg' :'editCard')}>
            Edit ${state.editMode == 'bgEdit' ? 'background' : 'card'}
        </a></li>
        <li><a href="#" onclick=${() => emit("editStack")}>Edit stack</a></li>
        <li class="close">${ecks}</li>
      </ul>
      ${state.addingImage ? dropImage() : ""}
    </nav>`;

    function dropImage() {
        return html`<form id="addimage">
            Choose or drop: <input type="file"
              onchange=${e => changeHandler(e)}
              class="${state.hoveringImage ? "drophover" : ""}" />
            Or select existing:
            <select name="existingImage">
            </select>
            <a href="#" onclick=${cancelImage} style="padding-left:12rem;color:red;">Cancel</a>
        </form>`;
    }

    function changeHandler(event) {
        console.log("changeHandler");
        emit("addImage", [event]);
    }

    function cancelImage() {
        state.addingImage = false;
        setTimeout(() => emit("render"), 1);
    }
};

module.exports = editBarView;
