const html = require('choo/html');


const imageStyleView = (state, emit) => {
    let img = state.getEditedObject();
    let changeHandler = event => emit("propertyChange", event);

    return html`<form>
      <table>
          <tr>
              <td>${fieldFor("top", "Top")}</td>
              <td>${fieldFor("left", "Left")}</td>
          </tr>
          <tr>
              <td>${fieldFor("height", "Height")}</td>
              <td>${fieldFor("width", "Width")}</td>
          </tr>
      </table>
      ${fieldFor("class", "Class")}

      <div style="text-align:center">
        <button onclick=${deleteHandler}>Delete Image</button>
      </div>
    </form>`;

    function fieldFor(attName, displayName) {
        return html`<p><label for="${attName}">${displayName}</label><br />
            <input type="text"
              onchange=${changeHandler}
              name="${attName}"
              value="${img[attName] || ""}" />
        </p>`;
    }

    function deleteHandler() {
        if (window.confirm("Seriously? (There's no Undo yet)")) {
            emit("deleteImage");
        }
        return false;
    }
};


module.exports = imageStyleView;
