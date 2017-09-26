(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// const arc = new DatArchive(window.location.toString());

// const config = JSON.parse(await arc.readFile('config.json'));

// const {render} = require('lib/util.js');
//
// render(card1, arc);

const choo = require('choo');

const mainView = require('./lib/appView');


let app = choo();

app.use(require('./lib/store/appStore'));
app.use(require('./lib/store/bgStore'));
app.use(require('./lib/store/cardStore'));
app.use(require('./lib/store/elementStore'));
app.use(require('./lib/store/fieldStore'));
app.use(require('./lib/store/editBarStore'));
app.use(require('./lib/store/editModalStore'));
app.use(require('./lib/store/imageStore'));

app.route('/', mainView);
// app.route('/card/:which', function(state, emit) {
//     return mainView(state, emit);
// })

app.mount('main');

},{"./lib/appView":2,"./lib/store/appStore":28,"./lib/store/bgStore":29,"./lib/store/cardStore":30,"./lib/store/editBarStore":31,"./lib/store/editModalStore":32,"./lib/store/elementStore":33,"./lib/store/fieldStore":34,"./lib/store/imageStore":35,"choo":39}],2:[function(require,module,exports){
const html = require('choo/html');

const background = require('./bgView');
const card = require('./cardView');
const editBar = require('./editBarView');
const editModal = require('./editModalView');

const {color} = require('./util');

const mainView = function(state, emit) {
    const currentColor = color(state);
    return html`<main class="${state.editMode || ""}"
        style="${currentColor ? "background-color:" + currentColor : ""}">
      ${!!state.editMode ? editBar(state, emit) : null}
      ${background(state, emit)}
      ${card(state, emit)}
      ${state.editingPath ? editModal(state, emit) : null}
    </main>`;
};

module.exports = mainView;

},{"./bgView":4,"./cardView":5,"./editBarView":6,"./editModalView":7,"./util":36,"choo/html":38}],3:[function(require,module,exports){
const html = require('choo/html');
const uuid = require('uuid/v1');

const {selectOption, checkBox, getPath} = require('./util');
const {condition} = require('./form/ifComponents');

const behaviorObjs = {
    'jumpTo': {'jumpTo': null},
    'if': {'if': {
        "condition": [],
        "action": null,
        "else": null
    }},
    'setTruth': {'setTruth': ''},
    'removeTruth': {'removeTruth': ''},
    'goToNextCard': {'goToNextCard': 'stack', 'wrap': true},
    'goToPreviousCard': {'goToPreviousCard': 'stack', 'wrap': true},
    'linkTo': {'linkTo': ''}
};

const behaviorOperations = {
    'jumpTo': function(state, emit, behavObj) {
        let whereTo = parseInt(behavObj.jumpTo);
        if (Number.isInteger(whereTo)) {
            state.nextCard = whereTo;
        } else {
            whereTo = state.cards.findIndex(
                (cd) => cd.name === behavObj.jumpTo
            );
            if (whereTo >= 0) {
                state.nextCard = whereTo;
            }
        }
        setTimeout(() => emit('goto'), 1);
    },
    'setTruth': function(state, emit, behavObj) {
        state.truths[behavObj.setTruth] = true;
        setTimeout(() => {
            emit('render');
            emit('save');
        }, 1);
    },
    'removeTruth': function(state, emit, behavObj) {
        delete state.truths[behavObj.removeTruth];
        setTimeout(() => {
            emit('render');
            emit('save');
        }, 1);
    },
    'goToNextCard': function(state, emit, behavObj) {
        if (behavObj.goToNextCard == 'bg') {
            let withIndex = state.cards.map((cd, ind) => Object.assign({}, cd, {index: ind}));
            let samesies = withIndex.filter((cd) =>
                cd.index > state.currentCard &&
                    cd.background === state.cards[state.currentCard].background
            );
            if (!samesies.length && behavObj.wrap) {
                samesies = withIndex.filter((cd) =>
                    cd.index < state.currentCard &&
                        cd.background === state.cards[state.currentCard].background
                );
            }
            if (samesies.length) {
                state.nextCard = samesies[0].index;
                setTimeout(() => emit('goto'), 1);
            }
        } else {
            setTimeout(() => emit('gotoNextCard', !!behavObj.wrap), 1);
        }
    },
    'goToPreviousCard': function(state, emit, behavObj) {
        if (behavObj.goToPreviousCard == 'bg') {
            let withIndex = state.cards.map((cd, ind) => Object.assign({}, cd, {index: ind}));
            let samesies = withIndex.filter((cd) =>
                cd.index < state.currentCard && cd.background === state.card.background
            );
            if (!samesies.length && behavObj.wrap) {
                samesies = withIndex.filter((cd) =>
                    cd.index > state.currentCard && cd.background === state.card.background
                );
            }
            if (samesies.length) {
                state.nextCard = samesies[samesies.length - 1].index;
                setTimeout(() => emit('goto'), 1);
            }
        } else {
            setTimeout(() => emit('gotoPrevCard', !!behavObj.wrap), 1);
        }
    },
    'linkTo': function(state, emit, behavObj) {
        try {
            const linkypoo = new URL(behavObj.linkTo);
            if (['http:','https:','dat:'].includes(linkypoo.protocol)) {
                setTimeout(() => window.location = linkypoo.href, 1);
            }
        } catch(e) {
            // not a url yay
        }
    }
};

const behaviorComponents = require('./form/behaviorsToComponents');

/*
Given a behavArr that looks something like: [
    {
        "setTruth": "hasTestedOtherField"
    },
    {
        "if": {
            "condition": [{"otherField": "yes"}],
            "action": {"jumpTo": 1},
            "else": {"jumpTo": 0}
        }
    },
    {
        "jumpTo": 0
    },
    {
        "destroyTruth": "hasTestedOtherField"
    },
    {
        "url": "dat://32a...44e" // or http, that's not the point
    }
]
parseAndRunBehaviors will take each in order, read them to see how it should alter
a given state hash, and then do so, sometimes by firing events with a given emit
function.

Some more hairs on the behavArr object syntax:

if: {
    condition: ['nameOfATruth', 'nameOfAnotherTruth'],
    condition: ['truth1', {'otherField': 'yes'}, 'truth2'],
    condition: ['truth3', {'otherField': {gt: 5, lte: 30}}, {'fifthField': {contains: 'o'}}],
    // all work

    condition: {"or": [{'name': 'dave'}, {'job': 'janitor'}]} // goes off for all daves and janitors
    condition: {"or": [{'name': 'dave'}, {'name': 'jim'}]}, // both names
    condition: {"or": ['truth1', 'truth2']} // either truth. you can still mix an obj in, too
}

Also you can jumpTo a card by name: { 'jumpTo': 'arthur' }
 */
const {evalCondition} = require('./form/ifLogic');

const parseAndRunBehaviors = function(state, emit, behavArr) {

    const doBehavior = (behavObj) => {
        if (behavObj['if']) {
            if (evalCondition(state, behavObj['if'].condition)) {
                doBehavior(behavObj['if'].action);
            } else {
                if (behavObj['if']['else']) {
                    doBehavior(behavObj['if']['else']);
                }
            }
        } else {
            const magicKey = Object.keys(behaviorOperations).find((key) =>
                Object.keys(behavObj).includes(key)
            );
            behaviorOperations[magicKey].call(null, state, emit, behavObj);
        }
    };

    behavArr.forEach(doBehavior);
}

const behavior = function(state, emit, path) {
    const safetyPath = [].concat(path);
    const behav = getPath(state, safetyPath);

    let behavType;

    if (typeof behav === 'undefined' || behav == null) {
        behavType = null;
    } else {
        const whatWeGot = Object.keys(behav);
        if (!whatWeGot.length) {
            behavType = null;
        }
        const types = Object.keys(behaviorComponents);
        types.forEach((type) => {
            if (whatWeGot.includes(type)) {
                behavType = type;
            }
        });
    }

    const menu = behavTypeMenu(behavType, safetyPath, setBehaviorType);
    return html`<div class="behavior ${'behav-' + behavType}">
        ${menu}
        ${behavType === 'if'
            ? ifShell(state, emit, behav, safetyPath)
            : (behavType !== null
                ? behaviorComponents[behavType].call(null, state, emit, behav, safetyPath)
                : null)}
    </div>`;

    function setBehaviorType(path, value) {
        emit('setBehaviorObj', [path, behaviorObjs[value]]);
    }
};

function ifShell(state, emit, behav, path) {
    return html`<div>
        <div>
            ${condition(state, emit, behav['if'].condition, path.concat(['if', 'condition']))}
        </div>
        <ul class="behaviors">
            <li>Do the behavior:
                ${behavior(state, emit, path.concat(['if', 'action']))}
            </li>
            <li>Otherwise, do:
                ${behavior(state, emit, path.concat(['if', 'else']))}
            </li>
        </ul>
    </div>`;
}

function behaviorList(state, emit, behaviors, path) {
    const ret = html`<ul class="behaviors">
        ${behaviors.map((behav, ind) => {
            return html`<li>
              ${behavior(state, emit, path.concat([ind]))}
            </li>`;
        })}
        <button class="add-behavior" onclick=${addHandler}>+</button>
    </ul>`;
    return ret;

    function addHandler() {
        emit('setBehaviorObj', [path, behaviors.concat([null])]);
        return false;
    }
}

function behavTypeMenu(selectType, path, handler) {
    let opts = [selectOption(null, '-', selectType)];
    for (const behaviorKey of Object.keys(behaviorComponents)) {
        opts.push(selectOption(behaviorKey, selectType));
    }
    return html`<select data-realvalue="${selectType}" name="${name}" onchange=${(e) => handler(path, e.target.value)}>
        ${opts}
    </select>`;
}

module.exports = {parseAndRunBehaviors, behavior, behavTypeMenu, behaviorList};

},{"./form/behaviorsToComponents":10,"./form/ifComponents":18,"./form/ifLogic":19,"./util":36,"choo/html":38,"uuid/v1":58}],4:[function(require,module,exports){
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

},{"./elementView.js":8,"./fieldView.js":9,"./graphicView.js":26,"./imageView.js":27,"choo/html":38}],5:[function(require,module,exports){
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

},{"./elementView.js":8,"./fieldView.js":9,"./graphicView.js":26,"./imageView.js":27,"choo/html":38}],6:[function(require,module,exports){
const html = require("choo/html");

const editBarView = (state, emit) => {
    const ecks = html`<a href="#" onclick=${() => emit('turnOffEditMode')}></a>`;
    ecks.innerHTML = '&times;';

    return html`<nav id="editbar">
      <aside class="readout">
        Danny 0.1 👦🏾<br />
        ${state.editMode === 'bgEdit'
            ? html`<span>Bg ${state.currentBackground} of ${state.backgrounds.length}</span>`
            : html`<span>Card ${state.currentCard} of ${state.cards.length}</span>`
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

},{"choo/html":38}],7:[function(require,module,exports){
const html = require("choo/html");

const elementStyleView = require("./form/elementStyleView.js");
const imageStyleView = require("./form/imageStyleView.js");
const fieldStyleView = require("./form/fieldStyleView.js");
const editBehaviorView = require("./form/editBehaviorView.js");
const fieldBehaviorView = require("./form/editBehaviorView.js");

const cardStyleView = require("./form/cardStyleView.js");
const bgStyleView = require("./form/bgStyleView.js");

const stackComboView = require("./form/stackComboView.js");

const whichViewMatrix = {
    style: {
        element: elementStyleView,
        field: fieldStyleView,
        image: imageStyleView,
        card: cardStyleView,
        bg: bgStyleView,
        stack: stackComboView
    },
    function: {
        element: editBehaviorView,
        field: fieldBehaviorView,
        image: editBehaviorView,
        card: editBehaviorView,
        bg: editBehaviorView,
        stack: stackComboView
    }
};

const editModalView = (state, emit) => {
    let which;
    if (state.editingElement) {
        which = "element";
    } else if (state.editingField) {
        which = "field";
    } else if (state.editingImage) {
        which = "image";
    } else {
        if (state.editingPath[0] == 'cards') {
            which = "card";
        } else if (state.editingPath[0] == 'backgrounds') {
            which = "bg";
        } else if (state.editingPath[0] == 'stack') {
            which = "stack";
        }
    }

    const ecks = html`<a class="close" href="#" onclick=${() => emit('closeEdit')}></a>`;
    ecks.innerHTML = '&times;';

    return html`<section id="editmodal">
      ${ecks}

      ${which == 'stack'
        ? null
        : html`<ul id="editModalTabs">
            <li class="${state.editingFunction ? "" : "hilited"}"
                onclick=${() => toggleFunctionEdit('style')}>
                Style
            </li><li class="${state.editingFunction ? "hilited" : ""}"
                onclick=${() => toggleFunctionEdit()}>
                Behavior
            </li>
          </ul>`}

      ${state.editingFunction
          ? whichViewMatrix.function[which].call(null, state, emit)
          : whichViewMatrix.style[which].call(null, state, emit)}
    </section>`;

    function toggleFunctionEdit(where = 'function') {
        const isiton = state.editingFunction;
        if ((isiton && where == 'style') || (!isiton && where == 'function')) {
            emit('toggleFunctionEdit');
        } // i don't know, is that dumb?
    }
};

module.exports = editModalView;

},{"./form/bgStyleView.js":11,"./form/cardStyleView.js":12,"./form/editBehaviorView.js":13,"./form/elementStyleView.js":14,"./form/fieldStyleView.js":15,"./form/imageStyleView.js":20,"./form/stackComboView.js":25,"choo/html":38}],8:[function(require,module,exports){
const html = require('choo/html');

const {parseAndRunBehaviors} = require('./behavior.js');


const ensureStylePixels = (val) => {
    return typeof val == 'number' ? val + 'px' : val;
}

const elementView = (element, index, state, emit, isCard) => {
    let elementIsBasic = !element.style && element.text;
    let attrs = {
        height: ensureStylePixels(element.height),
        width: ensureStylePixels(element.width),
        top: ensureStylePixels(element.top),
        left: ensureStylePixels(element.left),
        'background-color': element.color,
        'font-family': element.font,
        'font-size': element.size,
        'font-style': element.style,
        color: element.textColor
    }; // this data munge step may belong in a store?
    let elementStyles = Object.keys(attrs).map((key) => (key + ':' + attrs[key] + ';')).join('');
    if (element.style) {
        elementStyles += element.style;
    }

    let clickHandler = function(event) {
        if (event.altKey ||
            (state.editMode === 'editMode' && isCard) ||
            (state.editMode === 'bgEdit' && !isCard)
        ) {
            editElement();
        } else if (element.behavior && element.behavior.length) {
            parseAndRunBehaviors(state, emit, element.behavior);
        }
    };

    if (isDraggable()) {
        return html`<div class="element movable ${elementClasses()}"
            onclick=${(e) => editModeClick(e)}
            onmousedown=${(e) => mouseDown(e)}
            onmouseleave=${(e) => mouseLeave(e)}
            onmouseup=${(e) => mouseUp(e)}
            style="${elementStyles}">${element.text}</div>`;
    }
    return html`<div class="element ${elementClasses()}"
      onclick=${clickHandler}
      style="${elementStyles}">${element.text}</div>`;
    // possible we need two sep. components?

    function elementClasses() {
        let klass = elementIsBasic ? ['basic'] : [];
        if (element.transparent) {
            klass.push('transparent');
        }
        if (element.behavior && element.behavior.length && !state.editMode) {
            klass.push('behaves-on-click');
        }
        klass.push(element.class);
        return klass.join(' ');
    }

    function editElement() {
        emit('editElement', [element, index, isCard]);
        setTimeout(() => emit('render'), 1);
    }

    function isDraggable() {
        if (isCard) {
            return state.editMode === 'editMode';
        }
        return state.editMode === 'bgEdit';
    }

    function editModeClick(evt) {
        const [startX, startY] = state.mouseDown;
        if (Math.abs(evt.screenX - startX) < 10 && Math.abs(evt.screenY - startY) < 10) {
            editElement();
        }
        state.dragInfo = null;
        state.resizeInfo = null;
    }

    function mouseDown(evt) {
        emit('startDrag', [evt.screenX, evt.screenY, evt.offsetX, evt.offsetY, evt.target]);
    }

    function mouseLeave(evt) {
        if (state.dragInfo || state.resizeInfo) {
            const yerInfo = state.dragInfo ? state.dragInfo : state.resizeInfo;
            if (yerInfo.target == evt.target) {
                state.dragInfo = null;
                state.resizeInfo = null;
            }
        }
    }

    function mouseUp(evt) {
        emit('finishDrag', [
            state.dragInfo ? 'moveElement' : 'resizeElement',
            evt.screenX, evt.screenY,
            state.dragInfo ? evt.target.style.left : evt.target.style.width,
            state.dragInfo ? evt.target.style.top : evt.target.style.height,
            index
        ]);
    }
};

module.exports = elementView;

},{"./behavior.js":3,"choo/html":38}],9:[function(require,module,exports){
const html = require('choo/html');

const {toPx} = require('./util');


const fieldView = (field, name, state, emit, isCard) => {
    let fld;
    if (field.type == 'select') {
        fld = html`<select name="${field.name}"
            onchange="${(evt) => emit('fieldchange', evt, field)}"
            ${field.options.map((opt) => {
                let selected = opt === field.value;
                return '<option value="' + opt + '"' +
                    (selected ? ' selected="selected"' : '') +
                    '>' + opt + '</option>'
            })}
        </select>`;
    } else if (field.type == 'radio' || field.type == 'checkbox') {
        // nothing right now mr. herman
    } else if (field.type == 'textarea' || toPx(field.height) > Math.max(field.size, 15)) {
        fld = html`<textarea name="${field.name}"
            wrap="virtual"
            onkeydown=""
            onkeyup=${(evt) => {emit('fieldKeyUp', [evt, field])}}
            onkeypress=""
            onchange="${(evt) => emit('fieldchange', [evt, field])}"
            style="${fieldStyles()}">${field.value}</textarea>`;
    } else {
        fld = html`<input type="${field.type ? field.type : 'text'}"
            name="${field.name}"
            placeholder="${field.placeholder}"
            value="${field.value}"
            onkeydown=${(evt) => emit('fieldKeyDown', [evt, field])}
            onkeyup=${(evt) => emit('fieldKeyUp', [evt, field])}
            onkeypress=${(evt) => emit('fieldKeyPress', [evt, field])}
            onchange="${(evt) => emit('fieldchange', [evt, field])}"
            style="${fieldStyles()}" />
        `;
    }
    if (state.editMode) {
        return html`<div class="fieldshim ${isDraggable() ? 'movable' : ''}"
                style="${fieldStyles()}"
                onclick=${(e) => editModeClick(e)}
                onmousedown=${(e) => mouseDown(e)}
                onmouseleave=${(e) => mouseLeave(e)}
                onmouseup=${(e) => mouseUp(e)}>
            <p>${field.name}</p>
            <aside>Value: <span>${field.value}</span></aside>
        </div>`;
    }
    return fld;

    function clickHandler(evt) {
        if (evt.altKey || (state.editMode && isDraggable())) {
            emit('editField', [field, name, isCard]);
        }
    }

    function isDraggable() {
        if (isCard) {
            return state.editMode === 'editMode';
        }
        return state.editMode === 'bgEdit';
    }

    function fieldStyles() {
        let steez = {
            top: field.top,
            left: field.left,
            height: field.height,
            width: field.width,
            'background-color': field.color,
            'font-family': field.font,
            'font-size': field.size,
            'font-style': field.style,
            color: field.textColor
        };
        if (state.editMode) {
            steez.height = toPx(field.height) >= 40 ? steez.height : '40px';
            steez.width = toPx(field.width) >= 40 ? steez.width : '40px';
            if (!steez['background-color']) {
                steez['background-color'] = '#ddd';
            }
        }
        return Object.keys(steez).map((key) => (key + ':' + steez[key] + ';')).join('');
    }

    function editModeClick(evt) {
        const [startX, startY] = state.mouseDown;
        if (Math.abs(evt.screenX - startX) < 10 && Math.abs(evt.screenY - startY) < 10) {
            emit('editField', [field, name, isCard]);
        }
        state.dragInfo = null;
        state.resizeInfo = null;
    }

    function mouseDown(evt) {
        emit('startDrag', [evt.screenX, evt.screenY, evt.offsetX, evt.offsetY, evt.target]);
    }

    function mouseLeave(evt) {
        if (state.dragInfo || state.resizeInfo) {
            const yerInfo = state.dragInfo ? state.dragInfo : state.resizeInfo;
            if (yerInfo.target == evt.target) {
                state.dragInfo = null;
                state.resizeInfo = null;
            }
        }
    }

    function mouseUp(evt) {
        emit('finishDrag', [
            state.dragInfo ? 'moveField' : 'resizeField',
            evt.screenX, evt.screenY,
            state.dragInfo ? evt.target.style.left : evt.target.style.width,
            state.dragInfo ? evt.target.style.top : evt.target.style.height,
            name
        ]);
    }
};


module.exports = fieldView;

},{"./util":36,"choo/html":38}],10:[function(require,module,exports){
module.exports = {
    goToNextCard: require('./goToNextCardComponent'),
    goToPreviousCard: require('./goToPreviousCardComponent'),
    'if': null, // here to be counted, but not actually handled by a sep. component
    jumpTo: require('./jumpToComponent'),
    removeTruth: require('./removeTruthComponent'),
    setTruth: require('./setTruthComponent'),
    linkTo: require('./linkToComponent')
};

},{"./goToNextCardComponent":16,"./goToPreviousCardComponent":17,"./jumpToComponent":21,"./linkToComponent":22,"./removeTruthComponent":23,"./setTruthComponent":24}],11:[function(require,module,exports){
const html = require('choo/html');


const cardStyleView = (state, emit) => {
  let bg = state.backgrounds[state.currentBackground];
  let changeHandler = (event) => emit('envPropertyChange', event);

  return html`<form>
      ${fieldFor('name','Name')}
      <p><label for="color">Color</label><br />
        <input type="color"
          onchange=${changeHandler}
          name="color"
          value="${bg.color || '#FFFFFF'}" />
        <button onclick=${() => {
            emit('envPropertyChange', {target: {name: 'color', value: ''}});
            return false;
        }}>
          Clear
        </button>
      </p>
    </form>`;

  function fieldFor(attName, displayName) {
    return html`<p><label for="${attName}">${displayName}</label><br />
    <input type="text"
      onchange=${changeHandler}
      name="${attName}"
      value="${bg[attName]}" />
    </p>`;
  }

};

module.exports = cardStyleView;

},{"choo/html":38}],12:[function(require,module,exports){
const html = require('choo/html');


const cardStyleView = (state, emit) => {
  let card = state.cards[state.currentCard];
  let changeHandler = (event) => emit('envPropertyChange', event);

  return html`<form>
      ${fieldFor('name','Name')}
      <p><label for="color">Color</label><br />
         <input type="color"
           onchange=${changeHandler}
           name="color"
           value="${card.color || '#FFFFFF'}" />
       <button onclick=${() => {
           emit('envPropertyChange', {target: {name: 'color', value: ''}});
           return false;
       }}>
         Clear
       </button>
      </p>

      <div style="text-align:center">
        <button onclick=${deleteHandler}>Delete Card</button>
      </div>
    </form>`;

  function fieldFor(attName, displayName) {
    return html`<p><label for="${attName}">${displayName}</label><br />
    <input type="text"
      onchange=${changeHandler}
      name="${attName}"
      value="${card[attName]}" />
    </p>`;
  }

  function deleteHandler() {
      if (window.confirm("Seriously? (There's no Undo yet)")) {
          emit('deleteCard');
      }
      return false;
  }

};

module.exports = cardStyleView;

},{"choo/html":38}],13:[function(require,module,exports){
const html = require('choo/html');

const {parseAndRunBehaviors, behaviorList, behavior} = require('../behavior');
const {getPath} = require('../util');


const editBehaviorView = (state, emit) => {
  const thing = getPath(state, state.editingPath);
  const kickoffDescriptor = state.editingPath.length > 2 ? 'click' : 'arrival';

  return html`<form>
    <div>On ${kickoffDescriptor},

    ${thing.behavior && thing.behavior.length
        ? behaviorList(state, emit, thing.behavior, state.editingPath.concat(['behavior']))
        : html`<ul class="behaviors">
            <li>${behavior(state, emit, state.editingPath.concat(['behavior', 0]))}</li>
        </ul>`
    }

    </div>
    <div style="color: red; font-family: Helvetica,sans">
      Current truths:
      <ul>
        ${Object.keys(state.truths).map((th) => html`<li>${th}</li>`)}
      </ul>
      <button onclick=${() => {parseAndRunBehaviors(state, emit, thing.behavior);return false}}>Test behavior</button>
    </div>
  </form>`;

};

module.exports = editBehaviorView;

},{"../behavior":3,"../util":36,"choo/html":38}],14:[function(require,module,exports){
const html = require('choo/html');

const {selectOption} = require('../util');


const elementStyleView = (state, emit) => {
  let elm = state.editingElement;
  let changeHandler = (event) => emit('propertyChange', event);

  return html`<form>
      <table>
        <tr>
            <td>${fieldFor('top','Top')}</td>
            <td>${fieldFor('left','Left')}</td>
        </tr>
        <tr>
            <td>${fieldFor('height','Height')}</td>
            <td>${fieldFor('width','Width')}</td>
        </tr>
    </table>
      <p><label for="color">Color</label><br />
      <input type="color"
        onchange=${changeHandler}
        name="color"
        value="${elm.color || '#333333'}" />
        <button onclick=${clearHandlerFor('color')}>
          Clear
        </button>
      </p>
      <p><label for="text">Text</label><br />
      <textarea style="width:98%;height:4rem;" wrap="virtual"
        onchange=${changeHandler}
        name="text">${elm.text || ''}</textarea>
      </p>
      ${fieldFor('font','Font')}
      ${fieldFor('size','Size')}
      <p><label for="style">Style</label><br />
      <select name="style" onchange=${changeHandler}>
        ${selectOption('Regular', elm.style)}
        ${selectOption('Italic', elm.style)}
      </select>
      </p>
      <p><label for="textColor">Text Color</label><br />
      <input type="color"
        onchange=${changeHandler}
        name="textColor"
        value="${elm.textColor || '#000000'}" />
        <button onclick=${clearHandlerFor('textColor')}>
           Clear
         </button>
      </p>
      ${fieldFor('class','Class')}

      <div style="text-align:center">
        <button onclick=${deleteHandler}>Delete Element</button>
      </div>
    </form>`;

  function fieldFor(attName, displayName) {
    return html`<p><label for="${attName}">${displayName}</label><br />
    <input type="text"
      onchange=${changeHandler}
      name="${attName}"
      value="${elm[attName]}" />
    </p>`;
  }

  function clearHandlerFor(propName, buttony = true) {
    return function() {
      emit('propertyChange', {target: {name: propName, value: ''}});
      if (buttony) {
        return false;
      }
    }
  }

  function deleteHandler() {
      if (window.confirm("Seriously? (There's no Undo yet)")) {
          emit('deleteElement');
      }
      return false;
  }
};

module.exports = elementStyleView;

},{"../util":36,"choo/html":38}],15:[function(require,module,exports){
const html = require('choo/html');

const {selectOption} = require('../util');


const fieldStyleView = (state, emit) => {
  let fld = state.editingField;
  let changeHandler = (event) => emit('propertyChange', event);

  return html`<form>
      ${fieldFor('name','Name')}
      <table>
        <tr>
            <td>${fieldFor('top','Top')}</td>
            <td>${fieldFor('left','Left')}</td>
        </tr>
        <tr>
            <td>${fieldFor('height','Height')}</td>
            <td>${fieldFor('width','Width')}</td>
        </tr>
    </table>
      <p><label for="type">Type</label><br />
        <select name="type" onchange=${changeHandler}>
            ${selectOption('Text', fld.type)}
            ${selectOption('Menu', fld.type)}
        </select>
      </p>
      ${fld.type==='Text' ? fieldFor('height','Height') : null}
      ${fld.type==='Text' ? fieldFor('width','Width') : null}
      ${fld.type==='Menu' ? optionsField() : null}
      ${fieldFor('class','Class')}

      <div style="text-align:center">
        <button onclick=${deleteHandler}>Delete Field</button>
      </div>
    </form>`;

  function fieldFor(attName, displayName) {
    return html`<p><label for="${attName}">${displayName}</label><br />
    <input type="text"
      onchange=${changeHandler}
      name="${attName}"
      value="${fld[attName] || ''}" />
    </p>`;

  }

  function deleteHandler() {
      if (window.confirm("Seriously? (There's no Undo yet)")) {
          emit('deleteField');
      }
      return false;
  }

  function optionsField() {
    return html`<p><label for="options">Options</label><br />
      <textarea name="options" onchange=${optionHandler}>${fld.options.join("\n")}</textarea>
    </p>`;

    function optionHandler(e) {
      const options = e.target.value.split("\n").map((line) => line.trim());
      emit('setFieldOptions', options);
    }
  }
};

module.exports = fieldStyleView;

},{"../util":36,"choo/html":38}],16:[function(require,module,exports){
const html = require('choo/html');
const {selectOption, checkBox} = require('../util');


function goToNextCard(state, emit, behav, path) {
    return html`<div>
        <section>
            <select name="goToNextCard"
                onchange=${(e) => emit('setBehaviorObj', [path,
                    {'goToNextCard': e.target.value, 'wrap': behav.wrap ? true : false}
                ])}>
                ${selectOption('stack', 'in the stack', behav.goToNextCard)}
                ${selectOption('bg', 'in this background', behav.goToNextCard)}
            </select>
            ${checkBox('wrap around', behav.wrap, (e) => emit('setBehaviorObj', [path,
                {'goToNextCard': behav.goToNextCard, 'wrap': e.target.checked}
            ]))}
        </section>
    </div>`;
}

module.exports = goToNextCard;

},{"../util":36,"choo/html":38}],17:[function(require,module,exports){
const html = require('choo/html');
const {selectOption, checkBox} = require('../util');


function goToPreviousCard(state, emit, behav, path) {
    return html`<div>
        <section>
            <select name="goToNextCard"
                onchange=${(e) => emit('setBehaviorObj', [path,
                    {'goToNextCard': e.target.value, 'wrap': behav.wrap ? true : false}
                ])}>
                ${selectOption('stack', 'in the stack', behav.goToPreviousCard)}
                ${selectOption('bg', 'in this background', behav.goToPreviousCard)}
            </select>
            ${checkBox('wrap around', behav.wrap, (e) => emit('setBehaviorObj', [path,
                {'goToNextCard': behav.goToNextCard, 'wrap': e.target.checked}
            ]))}
        </section>
    </div>`;
}

module.exports = goToPreviousCard;

},{"../util":36,"choo/html":38}],18:[function(require,module,exports){
const html = require('choo/html');

const {selectOption, checkBox, getPath, fieldsWithValues} = require('../util');


function condition(state, emit, cond, path) {
    let conjunction = 'and';
    if (path[path.length - 1] == 'or') {
        conjunction = 'or';
    }

    let clauses;
    if (cond.length) {
        clauses = cond.map((clause, index) =>
            html`<div>
                ${index === 0 ? '' : html`<aside>${conjunction}</aside>`}
                ${conditionClause(state, emit, clause, path.concat([index]))}
            </div>`
        );
    } else {
        clauses = html`<div>
            ${conditionClause(state, emit, null, path.concat([0]))}
        </div>`;
    }
    return html`<div>
        ${clauses}
        <button onclick=${addClauseHandler}>+</button>
    </div>`;

    function addClauseHandler() {
        emit('setBehaviorObj', [path, cond.concat([null])]);
        return false;
    }
}

const clauseObjs = {
    truth: '',
    field: {},
    or: {'or': []}
};

function conditionClause(state, emit, clause, path) {
    const index = path[path.length - 1];

    const subjectHandler = (e) => {
        emit('setBehaviorObj', [path, clauseObjs[e.target.value]]);
    }

    const valueHandler = (e) => {
        emit('setBehaviorObj', [path, e.target.value]);
    }

    const isNull = clause === null;
    const isTruth = typeof clause === 'string';
    const isField = typeof clause === 'object' && clause !== null && typeof clause.or == 'undefined';
    const orIsThere = clause !== null && typeof clause == 'object' && typeof clause.or != 'undefined';
    const unifiedCompareValue = isNull ? null : (isTruth ? 'truth' : (isField ? 'field' : 'or'));

    return html`<section>
        <select data-realvalue="${unifiedCompareValue}" onchange=${subjectHandler}>
            ${selectOption(null, '-', unifiedCompareValue)}
            ${selectOption('truth', 'there is a Truth named', unifiedCompareValue)}
            ${selectOption('field', 'the field named', unifiedCompareValue)}
            ${selectOption('or', 'either', unifiedCompareValue)}
        </select>
        ${isTruth
            ? html`<input type="text" onchange=${valueHandler} value="${clause}" />`
            : null}
        ${isField
            ? fieldClause(state, emit, clause, path)
            : null}
        ${orIsThere
            ? condition(state, emit, clause.or, path.concat(['or']))
            : null}
        ${index > 0
            ? html`<button onclick=${(e) => {removeClause(index);return false;}} class="remove-clause">-</button>`
            : null}
    </section>`;

    function removeClause(index) {
        const conditionPath = path.slice(0, path.length - 1);
        const condition = getPath(state, conditionPath);
        condition.splice(path[path.length - 1], 1);
        emit('setBehaviorObj', [conditionPath, condition]);
        // see this kinda thing should be in a store
    }
}

function fieldClause(state, emit, clause, path) {
    let firstKey = null;
    let compareObj = null;
    let comparator = null;
    let compareValue = null;
    if (Object.keys(clause).length) {
        firstKey = Object.keys(clause)[0];
        compareObj = clause[firstKey];
        comparator = compareObj === null
            ? null
            : Object.keys(compareObj)[0];
        compareValue = compareObj === null
            ? null
            : (comparator === null
                ? null
                : compareObj[comparator]);
    }

    const fieldNameHandler = (e) => {
        const fieldObj = {};
        fieldObj[e.target.value] = compareObj;
        emit('setBehaviorObj', [path, fieldObj]);
    };
    const fieldCompareHandler = (e) => {
        const newCompareObj = {};
        newCompareObj[e.target.value] = compareValue;
        clause[firstKey] = newCompareObj;
        emit('setBehaviorObj', [path, clause]);
    };
    const fieldValueHandler = (e) => {
        compareObj[comparator] = e.target.value;
        clause[firstKey] = compareObj;
        emit('setBehaviorObj', [path, clause]);
    };

    const fields = Object.keys(fieldsWithValues(state));
    const valueForInteract = (!!compareValue || compareValue === 0) ? compareValue : '';

    return html`<span>
        <select data-realvalue="${firstKey}" onchange=${fieldNameHandler}>
            ${selectOption(null, '-', firstKey)}
            ${fields.map((fld) => selectOption(fld, firstKey))}
        </select>
        <select data-realvalue="${comparator}" onchange=${fieldCompareHandler}>
            ${selectOption(null, '-', comparator)}
            ${selectOption('eq', 'equals', comparator)}
            ${selectOption('lt', 'is less than', comparator)}
            ${selectOption('gt', 'is greater than', comparator)}
            ${selectOption('lte', 'is less than or equal to', comparator)}
            ${selectOption('gte', 'is greater than or equal to', comparator)}
            ${selectOption('contains', comparator)}
        </select>
        ${(compareObj && comparator)
            ? html`<input type="text" onchange=${fieldValueHandler} value="${valueForInteract}" />`
            : null}
    </span>`;
}

module.exports = {condition};

},{"../util":36,"choo/html":38}],19:[function(require,module,exports){
const {fieldsWithValues} = require('../util');


const separateArray = function(arr) {
    let others = arr.filter((item) => typeof item !== 'string');
    return [arr.filter((item) => typeof item === 'string'), others];
};

const evalTruths = function(state, truthArr, orr = false) {
    if (!truthArr.length) {
        return true;
    }
    if (orr) {
        return truthArr.some((truth) => typeof state.truths[truth] !== 'undefined');
    }
    return truthArr.every((truth) => typeof state.truths[truth] !== 'undefined');
};

const evalField = function(state, fieldName, comparedTo) {
    const value = fieldsWithValues(state)[fieldName];
    if (Object.keys(comparedTo).length === 0) {
        return true;
    }
    const key = Object.keys(comparedTo)[0];
    if (key === 'gt') {
        return value > comparedTo[key];
    }
    if (key === 'gte') {
        return value >= comparedTo[key];
    }
    if (key === 'lt') {
        return value < comparedTo[key];
    }
    if (key === 'lte') {
        return value <= comparedTo[key];
    }
    if (key === 'eq') {
        return value == comparedTo[key];
    }
    if (key === 'contains') {
        return value.includes(comparedTo[key]);
    }
};

const evalClause = function(state, condObj) {
    // now it's on
    if (condObj === null) {
        return true; // i guess??? maybe flag it somewhere to the user
    }
    return Object.keys(condObj).every((key) => {
        if (key === 'or') {
            let [strings, others] = separateArray(condObj.or);
            if (others.length) {
                return evalTruths(state, strings, true) || others.some((item) => evalClause(state, item));
            } else {
                return evalTruths(state, strings, true);
            }
        }
        let clauseResult = evalField(state, key, condObj[key]);
        return clauseResult;
    });
}

const evalCondition = function(state, condObj, any = false) {
    if (Array.isArray(condObj)) {
        let [strings, others] = separateArray(condObj);
        if (others.length) {
            return evalTruths(state, strings) && others.every((item) => evalClause(state, item));
        } else {
            return evalTruths(state, condObj);
        }
    }
};

module.exports = {evalCondition};

},{"../util":36}],20:[function(require,module,exports){
const html = require('choo/html');


const imageStyleView = (state, emit) => {
    let img = state.editingImage;
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

},{"choo/html":38}],21:[function(require,module,exports){
const html = require('choo/html');
const {selectOption} = require('../util');


function jumpTo(state, emit, behav, path) {
    // normalizing the crazy of html options a little
    if (Number.isInteger(parseInt(behav.jumpTo))) {
        behav.jumpTo = parseInt(behav.jumpTo);
    }
    if (typeof behav.jumpTo == 'string' && behav.jumpTo == 'null') {
        behav.jumpTo = null;
    }

    return html`<div>
        <section>the card named or numbered
            <select name="jumpToWhat"
                    onchange=${(e) => emit('setBehaviorObj', [path, {'jumpTo': e.target.value}])}>
                ${selectOption(null, '-', behav.jumpTo === null, -1)}
                ${state.cards.map((cd, index) => {
                    let jumpToVal = cd.name || index;
                    if (Number.isInteger(parseInt(jumpToVal))) {
                        jumpToVal = parseInt(jumpToVal);
                    }
                    return selectOption(jumpToVal,
                        (cd.name ? index + " - " + cd.name : index),
                        behav.jumpTo === jumpToVal,
                        index
                    );
                })}
            </select>
        </section>
    </div>`;
}

module.exports = jumpTo;

},{"../util":36,"choo/html":38}],22:[function(require,module,exports){
const html = require('choo/html');


function linkTo(state, emit, behav, path) {
    return html`<div>
        <section>the URL
            <input name="linkToWhat"
                    onchange=${(e) => emit('setBehaviorObj', [path, {'linkTo': e.target.value}])}
                    value="${behav.linkTo}" />
        </section>
    </div>`;
}

module.exports = linkTo;

},{"choo/html":38}],23:[function(require,module,exports){
const html = require('choo/html');


function removeTruth(state, emit, behav, path) {
    return html`<div>
        <section>remove the Truth named
        <input type="text" name="whatTruth" value="${behav.removeTruth}"
            onchange=${(e) => emit('setBehaviorObj', [path, {'removeTruth': e.target.value}])} />
        </section>
    </div>`;
}

module.exports = removeTruth;

},{"choo/html":38}],24:[function(require,module,exports){
const html = require('choo/html');


function setTruth(state, emit, behav, path) {
    return html`<div>
        <section>set a Truth named
        <input type="text" name="whatTruth" value="${behav.setTruth}"
            onchange=${(e) => emit('setBehaviorObj', [path, {'setTruth': e.target.value}])} />
        </section>
    </div>`;
}

module.exports = setTruth;

},{"choo/html":38}],25:[function(require,module,exports){
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

},{"choo/html":38}],26:[function(require,module,exports){
const html = require('choo/html');


module.exports = function(element, index, state, emit, isCard) {
    let attrs = {
        height: element.height,
        width: element.width,
        top: element.top,
        left: element.left,
        'background-color': element.color,
        'font-family': element.font,
        'font-size': element.size,
        'font-style': element.style,
        color: element.textColor
    }; // this data munge step may belong in a store?
    let style = Object.keys(attrs).map((key) => (key + ':' + attrs[key] + ';')).join('');
    return html`<div
        class="graphic ${element.class}"
        style="${style}"
    >${element.text}</div>`;
};

},{"choo/html":38}],27:[function(require,module,exports){
const html = require('choo/html');

const {parseAndRunBehaviors} = require('./behavior.js');


const IMAGE_ROTATION = {
    3: 'rotate(180deg)',
    6: 'rotate(90deg)',
    8: 'rotate(270deg)'
}

module.exports = function(element, index, state, emit, isCard) {
    if (isDraggable()) {
        return html`<img class="movable"
            onclick=${editModeClick}
            onmousedown=${(e) => mouseDown(e)}
            onmouseleave=${(e) => mouseLeave(e)}
            onmouseup=${(e) => mouseUp(e)}
            src="${element.src}"
            alt="${element.alt ? element.alt : ''}"
            height="${element.height ? element.height : ''}"
            width="${element.width ? element.width : ''}"
            style="top:${element.top};left:${element.left};${inlineStyles()}"
        />`;
    }
    return html`<img class="${imageClasses()}"
        onclick=${clickHandler}
        src="${element.src}"
        alt="${element.alt ? element.alt : ''}"
        height="${element.height ? element.height : ''}"
        width="${element.width ? element.width : ''}"
        style="top:${element.top};left:${element.left};${inlineStyles()}"
    />`;

    function clickHandler() {
        if (event.altKey) {
            emit('editImage', [element, index, isCard]);
        } else if (element.behavior && element.behavior.length) {
            parseAndRunBehaviors(state, emit, element.behavior);
        }
    }

    function inlineStyles() {
        let out = "";
        if (element.style) {
            out += element.style;
        }
        if (element.orientation && element.orientation !== 1) {
            out += "transform: " + IMAGE_ROTATION[element.orientation];
        }
        return out;
    }

    function imageClasses() {
        if (element.behavior && element.behavior.length) {
            return 'behaves-on-click';
        }
        return '';
    }

    function editImage() {
        emit('editImage', [element, index, isCard]);
        setTimeout(() => emit('render'), 1);
    }

    function isDraggable() {
        if (isCard) {
            return state.editMode === 'editMode';
        }
        return state.editMode === 'bgEdit';
    }

    function editModeClick(evt) {
        const [startX, startY] = state.mouseDown;
        if (Math.abs(evt.screenX - startX) < 10 && Math.abs(evt.screenY - startY) < 10) {
            editImage();
        }
        state.dragInfo = null;
        state.resizeInfo = null;
    }

    function mouseDown(evt) {
        evt.stopPropagation();
        evt.preventDefault();
        emit('startDrag', [evt.screenX, evt.screenY, evt.offsetX, evt.offsetY, evt.target]);
    }

    function mouseLeave(evt) {
        if (state.dragInfo || state.resizeInfo) {
            const yerInfo = state.dragInfo ? state.dragInfo : state.resizeInfo;
            if (yerInfo.target == evt.target) {
                state.dragInfo = null;
                state.resizeInfo = null;
            }
        }
    }

    function mouseUp(evt) {
        evt.stopPropagation();
        evt.preventDefault();

        emit('finishDrag', [
            state.dragInfo ? 'moveImage' : 'resizeImage',
            evt.screenX, evt.screenY,
            state.dragInfo ? evt.target.style.left : evt.target.clientWidth,
            state.dragInfo ? evt.target.style.top : evt.target.clientHeight,
            index
        ]);
    }
};

},{"./behavior.js":3,"choo/html":38}],28:[function(require,module,exports){
const {modPath, getPath} = require('../util');


const AppStore = async function(state, emitter) {
    const poke = modPath(state, emitter);

    const localArc = new DatArchive(window.location.toString());
    const rawState = JSON.parse(await localArc.readFile('stack.json'));
    Object.keys(rawState).forEach((key) => {
        state[key] = rawState[key];
    });

    state.getCards = () => {
        return state.cards;
    };
    state.getCardCount = () => {
        return state.cards.length;
    }
    state.setNextCard = (num) => {
        state.nextCard = num;
    };
    state.getCurrentCardIndex = () => {
        return state.currentCard;
    };
    state.getCurrentCard = () => {
        return state.cards[state.currentCard];
    };
    state.getCurrentBackgroundIndex = () => {
        return state.currentBackground;
    };
    state.getCurrentBackground = () => {
        return state.backgrounds[state.currentBackground];
    };
    state.getBackgroundForCard = (card) => {
        return state.backgrounds[card.background];
    }
    state.getCardsInCurrentBackground = () => {
        return state.cards.map((cd, ind) => Object.assign({}, cd, {index: ind}))
            .filter((cd) => cd.background === state.currentBackground);
    };

    state.setPropertyAtPath = (pathArray, value) => {
        poke(pathArray, value);
    }
    state.getPropertyAtPath = (pathArray) => {
        return getPath(state, pathArray);
    };

    state.editObject = (objectPath) => {
        // this just means switch on the edit modal?
        // what is 'env' here and maybe we ignore it?
        if (!state.editing()) {
            return false;
        }
        let lePath = state.editingCard()
            ? ['cards', state.getCurrentCardIndex()]
            : ['backgrounds', state.getCurrentBackgroundIndex()];
        state.editingPath = lePath.concat(objectPath);
        // so I guess that's what those arguments are
        switch (objectPath[0]) {
            case 'elements':
                state.editingElement = state.getPropertyAtPath(state.editingPath);
                break;
            case 'images':
                state.editingImage = state.getPropertyAtPath(state.editingPath);
                break;
            case 'fields':
                state.editingField = state.getPropertyAtPath(state.editingPath);
                break;
            case 'cards':
            case 'backgrounds':
            case 'stack':
                // oh actually
                state.editingPath = objectPath;
                break;
        }
    };

    state.setEditMode = (toWhat) => {
        if (['editMode','bgEdit', ''].includes(toWhat)) {
            state.editMode = toWhat;
        }
        if (toWhat === null || toWhat == undefined) {
            state.editMode = '';
        }
    }
    state.editing = () => {
        return !!state.editMode;
    };
    state.editingCard = () => {
        return state.editMode === 'editMode';
    };
    state.editingBackground = () => {
        return state.editMode === 'bgEdit';
    };

    // what about dragging
    // maybe dragging stays how it is because it shouldn't hit the disk ever

    state.saveField = function(event, field, state) {
        let newValue = event.target.value;
        if (state.card.fields[field.name]) {
            state.card.fields[field.name].value = newValue;
            state.cards[state.currentCard].fields[field.name].value = newValue;
        } else {
            state.card.values[field.name] = newValue;
            state.cards[state.currentCard].values[field.name] = newValue;
        }
    };

    emitter.on('goto', async function(force = false) {
        if (state.params && state.params.which) {
            if (Number.isNaN(parseInt(state.params.which)) && Array.isArray(state.cards)) {
                state.setNextCard(state.getCards().findIndex((cd) => cd.name == state.params.which));
                state.setNextCard(Math.max(state.nextCard, 0)); // in case of 404
            } else {
                state.setNextCard(state.params.which);
            }
            delete state.params.which;
        }

        if (typeof state.nextCard !== 'undefined' &&
                   (state.nextCard !== state.currentCard || force === true)) {
            let num = state.nextCard;
            state.card = Object.assign({}, state.cards[num]);
            state.currentCard = num;
            if (!state.background || state.card.background !== state.currentBackground) {
                state.background = Object.assign({}, state.getBackgroundForCard(state.card));
                await asyncEmit('backgroundLoaded');
            }

            await asyncEmit('cardLoaded');
            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    });
    emitter.on('gotoNextCard', async function(wrap = true) {
        const currentCard = state.getCurrentCardIndex();
        state.setNextCard((currentCard + 1 >= state.getCardCount())
            ? (wrap ? 0 : currentCard)
            : currentCard + 1);
        await asyncEmit('goto');
    });
    emitter.on('gotoPrevCard', async function(wrap = true) {
        const currentCard = state.getCurrentCardIndex();
        state.setNextCard((currentCard - 1 < 0)
            ? (wrap ? state.getCardCount() - 1 : 0)
            : currentCard - 1);
        await asyncEmit('goto');
    });

    emitter.on('save', async function() {
        let savedState = Object.assign({}, state);
        delete savedState.card;
        delete savedState.background;
        delete savedState.editMode;
        delete savedState.editingPath;
        delete savedState.params;
        delete savedState.styleCache;
        for (let key of Object.keys(savedState)) {
            if (typeof savedState[key] === 'function') {
                delete savedState[key];
            }
        }
        // delete savedState.query;
        // delete savedState.href; // more choo builtins
        await localArc.writeFile('stack.json',
            JSON.stringify(savedState));
        window.testState = savedState;
    });

    if (!state.card || !state.background || Object.keys(state.card).length === 0) {
        state.setNextCard(state.currentCard);
        await asyncEmit('goto', true);
    } else {
        await asyncEmit('render');
    }

    const styleSheet = await localArc.readFile('stack.css');
    state.styleCache = styleSheet;

    emitter.on('setStyles', async function(styleText) {
        await localArc.writeFile('stack.css', styleText);

        state.styleCache = styleText;
        await asyncEmit('render');
    });

    let altKeyReadied = false;

    document.addEventListener('keydown', function(event) {
        if (/^Alt/.test(event.code)) {
            altKeyReadied = true;
        } else {
            if (altKeyReadied) {
                switch (event.code) {
                    case 'Enter': emitter.emit('toggleEditMode'); break;
                    case 'ArrowRight': emitter.emit('gotoNextCard'); break;
                    case 'ArrowLeft': emitter.emit('gotoPrevCard'); break;
                    case 'KeyN': emitter.emit('newCard'); break;
                }
            }
            if (event.code === "Escape") {
                altKeyReadied = false;
                if (state.editingPath) {
                    emitter.emit('closeEdit');
                } else if (state.editMode) {
                    emitter.emit('turnOffEditMode');
                }
            }
        }
    });
    document.addEventListener('keyup', function(event) {
        if (/^Alt/.test(event.code) && altKeyReadied) {
            altKeyReadied = false;
        }
    });

    emitter.on('render', function() {
        setTimeout(function() {
            const badGuys = document.querySelectorAll('select');
            // so named only because this is to fix what we experience as a bug!
            // WHATCHA GONNA DO WHEN THEY COME FOR YOU
            if (badGuys.length) {
                badGuys.forEach((guy) => {
                    if (guy.hasAttribute('data-realvalue')) {
                        guy.querySelectorAll('option').forEach((opt, index) => {
                            if (opt.value == guy.getAttribute('data-realvalue')) {
                                guy.selectedIndex = index;
                            }
                        });
                    } else {
                        guy.querySelectorAll('option').forEach((opt, index) => {
                            if (opt.hasAttribute('selected')) {
                                guy.selectedIndex = index;
                            }
                        });
                    }
                });
            }
        }, 10);
    });

    function asyncEmit() {
        let args = [...arguments];
        return new Promise((resolve, reject) => {
            emitter.emit.apply(emitter, args);
            setTimeout(resolve, 1);
        });
    }
};

module.exports = AppStore;

},{"../util":36}],29:[function(require,module,exports){
const {parseAndRunBehaviors} = require('../behavior.js');


const BgStore = (state, emitter) => {
    emitter.on('backgroundLoaded', function() {
        if (state.background.behavior && state.background.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), state.background.behavior);
        }
    });

    emitter.on('cardLoaded', function() {
        let values = state.card.values;
        if (values) {
            Object.keys(values).forEach((fieldName) => {
                if (state.background.fields[fieldName]) {
                    state.background.fields[fieldName].value = values[fieldName];
                }
            });
        }
    });

    const blankBg = {
        name: '',
        images: [],
        elements: [],
        fields: {},
        behavior: []
    };

    emitter.on('newBg', function() {
        state.backgrounds.push(Object.assign({}, blankBg));
        // then go there?
    });

    emitter.on('editBg', function() {
        state.editingPath = ['backgrounds', state.currentBackground];
        state.editingImage = state.editingField = state.editingElement = null;
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('envPropertyChange', function(event) {
        if (state.editingPath && state.editingPath[0] === 'backgrounds') {
            const propName = event.target.name;
            const newValue = event.target.value;

            state.backgrounds[state.currentBackground][propName] = newValue;
            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    });
};

module.exports = BgStore;

},{"../behavior.js":3}],30:[function(require,module,exports){
const {parseAndRunBehaviors} = require('../behavior.js');


const CardStore = (state, emitter) => {
    emitter.on('newCard', ([stuff = {}]) => {
        let newCard = Object.assign({}, state.card, {
            name: '',
            values: {},
            images: [],
            elements: [],
            fields: {},
            behavior: []
        }, stuff);
        state.cards.splice(state.currentCard + 1, 0, newCard);
        state.nextCard = state.currentCard + 1;
        setTimeout(() => {
            emitter.emit('goto');
            emitter.emit('save');
        }, 1);
    });

    emitter.on('cardLoaded', function() {
        if (state.card.behavior && state.card.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), state.card.behavior);
        }
    });

    emitter.on('editCard', function() {
        state.editingPath = ['cards', state.currentCard];
        state.editingImage = state.editingField = state.editingElement = null;
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('deleteCard', function() {
        if (state.cards.length === 1) {
            return false;
        }
        state.cards.splice(state.currentCard, 1);
        // something with the background if it is now cardless?
        if (state.currentCard > 0) {
            state.currentCard--;
        }
        state.card = state.cards[state.currentCard];
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('envPropertyChange', function(event) {
        if (state.editingPath && state.editingPath[0] === 'cards') {
            const propName = event.target.name;
            const newValue = event.target.value;
            state.cards[state.currentCard][propName] = newValue;
            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    });
};

module.exports = CardStore;

},{"../behavior.js":3}],31:[function(require,module,exports){
const {toPx} = require('../util');

const EditStore = (state, emitter) => {
    emitter.on('toggleEditMode', function(isCardLevelEvent = true) {
        if (state.editMode) {
            emitter.emit('turnOffEditMode');
        } else {
            state.editMode = isCardLevelEvent ? 'editMode' : 'bgEdit';
            setTimeout(() => emitter.emit('render'), 1);
        }
    });
    emitter.on('editBgMode', function() {
        if (state.editMode === 'editMode') {
            state.editMode = 'bgEdit';
        } else {
            state.editMode = 'editMode';
        }
        emitter.emit('closeEdit'); // that'll render for us
    });
    emitter.on('turnOffEditMode', function() {
        state.editMode = '';
        state.editingPath = null;
        state.editingImage = state.editingElement = state.editingField = null;
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('newImage', function() {
        state.addingImage = true;
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('startDrag', function([screenX, screenY, offsetX, offsetY, target]) {
        state.mouseDown = [screenX, screenY];
        if (Math.abs(target.clientHeight - offsetY) < 10) {
            state.resizeInfo = {
                target,
                height: document.querySelector('#editbar').clientHeight
            };
        } else if (Math.abs(target.clientWidth - offsetX) < 10) {
            state.resizeInfo = {
                target,
                width: true
            };
        } else {
            state.dragInfo = {
                offsetX,
                offsetY: offsetY + document.querySelector('#editbar').clientHeight,
                target
            };
        }
    });

    emitter.on('finishDrag', function([followOnAction, screenX, screenY, x, y, ident]) {
        const [startX, startY] = state.mouseDown;
        if (Math.abs(screenX - startX) >= 10 || Math.abs(screenY - startY) >= 10) {
            emitter.emit(followOnAction, [ident, x, y]);
        }
    });

    document.body.addEventListener('mousemove', function(evt) {
        if (!state.editMode) {
            return;
        }

        if (evt.target.className.includes('movable')) {
            if (evt.target.nodeName == 'IMG') {
                evt.stopPropagation();
                evt.preventDefault();
            }

            if (state.dragInfo) {
                evt.target.style.top = (evt.pageY - state.dragInfo.offsetY) + 'px';
                evt.target.style.left = (evt.pageX - state.dragInfo.offsetX) + 'px';
            } else if (state.resizeInfo) {
                if (state.resizeInfo.width) {
                    evt.target.style.width = (evt.pageX - toPx(evt.target.style.left)
                        - toPx(evt.target.style.paddingLeft)
                        - toPx(evt.target.style.paddingRight)) + 'px';
                } else {
                    evt.target.style.height = (evt.pageY - state.resizeInfo.height // the editbar!
                        - toPx(evt.target.style.top)
                        - toPx(evt.target.style.paddingTop)
                        - toPx(evt.target.style.paddingBottom)) + 'px';
                }
            } else {
                evt.target.style.cursor =
                    evt.target.clientHeight - evt.offsetY < 10
                        ? 'ns-resize'
                        : (evt.target.clientWidth - evt.offsetX < 10
                            ? 'ew-resize'
                            : '');
            }
        }
    });
};

module.exports = EditStore;

},{"../util":36}],32:[function(require,module,exports){
const EditModalStore = (state, emitter) => {
    emitter.on('closeEdit', function() {
        state.editingPath = null;
        state.editingElement = null;
        state.editingField = null;
        state.editingImage = null;
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('toggleFunctionEdit', function() {
        state.editingFunction = state.editingFunction ? false : true;
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('propertyChange', function(event) {
        let propName = event.target.name;
        let newValue = event.target.value;
        let editPath = state.editingPath;

        state[editPath[0]][editPath[1]][editPath[2]][editPath[3]][propName] = newValue;
        if (editPath[0] === 'cards') {
            state.card = state[editPath[0]][editPath[1]];
        } else {
            state.background = state[editPath[0]][editPath[1]];
        }

        if (state.editingElement) {
            state.editingElement = state[editPath[0]][editPath[1]][editPath[2]][editPath[3]];
        } else if (state.editingField) {
            state.editingField = state[editPath[0]][editPath[1]][editPath[2]][editPath[3]];
        } else {
            state.editingImage = state[editPath[0]][editPath[1]][editPath[2]][editPath[3]];
        } // hmm do we need a refactor? MAAAAYYYYYBE

        setTimeout(() => {
            emitter.emit('render');
            emitter.emit('save');
        }, 1);
    });

    emitter.on('editStack', function() {
        state.editingElement = state.editingField = state.editingImage = null;
        state.editingPath = ['stack'];
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('stackPropertyChange', function(event) {
        if (state.editingPath && state.editingPath[0] === 'stack') {
            const propName = event.target.name;
            const newValue = event.target.value;

            if (['color'].includes(propName)) { // list will expand in future, obvs
                state[propName] = newValue;
            }

            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    })
};

module.exports = EditModalStore;

},{}],33:[function(require,module,exports){
const {modEnv, modPath} = require('../util');


const ElementStore = (state, emitter) => {
    const change = modEnv(state, emitter);
    const poke = modPath(state, emitter);

    const blankElement = {
        "top": "300px",
        "left": "300px",
        "height": "35px",
        "width": "100px",
        "color": "#ddd",
        "text": "",
        "font": "",
        "size": "1.6rem",
        "style": "",
        "textColor": "#333",
        "class": "",
        "behavior": []
    };

    emitter.on('newElement', function() {
        change((card) => {
            card.elements.push(Object.assign({}, blankElement));
            return card;
        });
    });

    emitter.on('editElement', async function([element, index, isCard = false]) {
        if (!state.editMode) {
            await asyncEmit('toggleEditMode', isCard);
        }

        let path = isCard ? ['cards'] : ['backgrounds'];
        path.push(isCard ? state.currentCard : state.currentBackground);
        path = path.concat(['elements', index]);

        state.editingPath = path;
        state.editingImage = state.editingField = null;
        state.editingElement = element;

        await asyncEmit('render');
    });

    emitter.on('moveElement', function([index, x, y]) {
        change((card) => {
            Object.assign(card.elements[index],
                {top: y, left: x});
            return card;
        });
    });

    emitter.on('resizeElement', function([index, x, y]) {
        change((card) => {
            Object.assign(card.elements[index],
                {height: y, width: x});
            return card;
        });
    });

    emitter.on('setBehaviorObj', function([path, value]) {
        poke(path, value);
        // redundantly rendering because select elements are the worst
        setTimeout(() => emitter.emit('render'), 1);
    });

    function asyncEmit() {
        let args = [...arguments];
        return new Promise((resolve, reject) => {
            emitter.emit.apply(emitter, args);
            setTimeout(resolve, 1);
        });
    }

    emitter.on('deleteElement', function() {
        const index = state.editingPath[state.editingPath.length - 1];
        change((card) => {
            card.elements.splice(index, 1);
            return card;
        });
        emitter.emit('closeEdit');
    });
};

module.exports = ElementStore;

},{"../util":36}],34:[function(require,module,exports){
const {modEnv, modPath} = require('../util');


const saveFieldToState = function(event, field, state) {
    let newValue = event.target.value;
    if (state.card.fields[field.name]) {
        state.card.fields[field.name].value = newValue;
        state.cards[state.currentCard].fields[field.name].value = newValue;
    } else {
        console.log("background field?");
        state.card.values[field.name] = newValue;
        state.cards[state.currentCard].values[field.name] = newValue;
    }
};

const FieldStore = (state, emitter) => {
    emitter.on("fieldchange", function([event, field]) {
        saveFieldToState(event, field, state);
        setTimeout(() => {
            emitter.emit("render");
            emitter.emit("save");
        }, 1);
    });
    emitter.on("fieldKeyUp", ([event, field]) => {
        saveFieldToState(event, field, state);
        setTimeout(() => emitter.emit("save"), 1);
    });

    const blankField = {
        name: "",
        top: "300px",
        left: "300px",
        height: "14px",
        width: "180px",
        color: "",
        font: "",
        size: "",
        style: "",
        textColor: "",
        fieldType: "text",
        value: "",
        options: [],
        placeholder: "",
        behavior: []
    };
    const uniqueFieldName = function() {
        const location =
            state.editMode === "bgEdit" ? state.background : state.card;
        let trynum = 1;
        let tryAName = "newField" + trynum;
        while (typeof location[tryAName] != "undefined") {
            tryAName = "newField" + ++trynum;
        }
        return tryAName;
    };

    const change = modEnv(state, emitter);

    emitter.on("newField", function() {
        let fieldName = uniqueFieldName();
        change((card) => {
            card.fields[fieldName] = Object.assign({}, blankField, {
                name: fieldName
            });
            return card;
        });
    });

    emitter.on("moveField", function([fieldName, x, y]) {
        change((card) => {
            Object.assign(card.fields[fieldName],
                {top: y, left: x});
            return card;
        });
    });

    emitter.on("resizeField", function([fieldName, x, y]) {
        change((card) => {
            Object.assign(card.fields[fieldName],
                {height: y, width: x});
            return card;
        });
    });

    emitter.on('editField', function([field, name, isCard = false]) {
        if (state.editMode === '') {
            emitter.emit('toggleEditMode');
        }
        if ((state.editMode === 'bgEdit' && !isCard) ||
            (state.editMode === 'editMode' && isCard))
        {
            let path = isCard ? ['cards'] : ['backgrounds'];
            path.push(isCard ? state.currentCard : state.currentBackground);
            path = path.concat(['fields', name]);

            state.editingPath = path;
            state.editingImage = state.editingElement = null;
            state.editingField = field;

            setTimeout(() => emitter.emit('render'), 1);
        }
    });

    emitter.on('setFieldOptions', function(options) {
        const index = state.editingPath[state.editingPath.length - 1];
        change((card) => {
            card.fields[index].options = options;
            return card;
        })
    });

    emitter.on('deleteField', function() {
        const index = state.editingPath[state.editingPath.length - 1];
        change((card) => {
            delete card.fields[index];
            return card;
        });
        emitter.emit('closeEdit');
    });
};

module.exports = FieldStore;

},{"../util":36}],35:[function(require,module,exports){
const {modEnv} = require('../util');


const ImageStore = (state, emitter) => {
    emitter.on('addImage', function([event]) {
        // copped and modified from @taravancil's dat-photo-app
        if (event.target.files) {
            const {files} = event.target;
            const archive = new DatArchive(window.location);

            for (let i = 0; i < files.length; i += 1) {
                const reader = new FileReader();
                const file = files[i];

                reader.onload = async function() {
                    const path = `/img/${file.name}`;
                    const orientation = readOrientationMetadata(reader.result);

                    try {
                        const stat = await archive.stat(path);
                        if (stat) {
                            const complaint =
                                `Image with the name "${file.name}" already exists. Replace it?`;
                            if (window.confirm(complaint)) {
                                await archive.writeFile(path, reader.result);
                                await archive.commit();
                                addImageObject(path, orientation);
                            }
                        }
                    } catch (e) {
                        await archive.writeFile(path, reader.result);
                        await archive.commit();
                        addImageObject(path, orientation);
                    }

                    state.addingImage = false;
                    setTimeout(() => {
                        emitter.emit('render');
                        emitter.emit('save');
                    }, 1);
                }

                reader.readAsArrayBuffer(file);
            }
        }

    });

    function addImageObject(path, orientation = 1) {
        const newguy = {
            top: '300px',
            left: '300px',
            src: path,
            orientation,
            behavior: []
        };
        if (state.editMode === 'bgEdit') {
            state.backgrounds[state.currentBackground].images.push(newguy);
        } else {
            state.cards[state.currentCard].images.push(newguy);
        }
    }

    // also cribbed from dat-photo-app and not even modified because I am not smart
    function readOrientationMetadata (buf) {
        const scanner = new DataView(buf);
        let idx = 0;
        let value = 1; // Non-rotated is the default

        if (buf.length < 2 || scanner.getUint16(idx) != 0xFFD8) {
          // not a JPEG
          return;
        }

        idx += 2;

        let maxBytes = scanner.byteLength;
        while(idx < maxBytes - 2) {
          let uint16 = scanner.getUint16(idx);
          idx += 2;
          switch(uint16) {
            case 0xFFE1: // Start of EXIF
              var exifLength = scanner.getUint16(idx);
              maxBytes = exifLength - idx;
              idx += 2;
              break;
            case 0x0112: // Orientation tag
              // Read the value, its 6 bytes further out
              // See page 102 at the following URL
              // http://www.kodak.com/global/plugins/acrobat/en/service/digCam/exifStandard2.pdf
              value = scanner.getUint16(idx + 6, false);
              maxBytes = 0; // Stop scanning
              break;
          }
        }
        return value;
    }

    emitter.on('editImage', function([image, index, isCard = false]) {
        console.log('editImage', state.editMode);
        if (!state.editMode) {
            emitter.emit('toggleEditMode');
        }

        let path = isCard ? ['cards'] : ['backgrounds'];
        path.push(isCard ? state.currentCard : state.currentBackground);
        path = path.concat(['images', index]);

        state.editingPath = path;
        state.editingElement = state.editingField = null;
        state.editingImage = image;

        setTimeout(() => emitter.emit('render'), 1);
    });

    const change = modEnv(state, emitter);

    emitter.on('moveImage', function([index, x, y]) {
        change((card) => {
            Object.assign(card.images[index], {top: y, left: x});
            return card;
        });
    });

    emitter.on('resizeImage', function([index, x, y]) {
        change((card) => {
            Object.assign(card.images[index], {height: y, width: x});
            return card;
        });
    });

    emitter.on('deleteImage', function() {
        const index = state.editingPath[state.editingPath.length - 1];
        change((card) => {
            card.images.splice(index, 1);
            return card;
        });
        emitter.emit('closeEdit');
    });
};

module.exports = ImageStore;

},{"../util":36}],36:[function(require,module,exports){
const html = require('choo/html');
const uuid = require('uuid/v1');


function modEnv(state, emitter) {
    return function(how) {
        if (state.editMode === 'bgEdit') {
            let newBgState = Object.assign({}, state.backgrounds[state.currentBackground]);
            newBgState = how(newBgState);
            state.backgrounds[state.currentBackground] = state.background = newBgState;
        } else if (state.editMode === 'editMode') {
            let newCardState = Object.assign({}, state.cards[state.currentCard]);
            newCardState = how(newCardState);
            state.cards[state.currentCard] = state.card = newCardState;
        }
        setTimeout(() => {
            emitter.emit('render');
            emitter.emit('save');
        }, 1);
    }
}

// if state gets big this might seriously mess us up. let's see
function modPath(state, emitter) {
    const getAndReplacePath = function(path, value, inWhat) {
        let currTarget;
        if (path.length > 1) {
            currTarget = path.shift();
            inWhat[currTarget] =
                getAndReplacePath(path, value,
                    Array.isArray(inWhat[currTarget])
                        ? [].concat(inWhat[currTarget])
                        : Object.assign({}, inWhat[currTarget]));
        } else {
            inWhat[path[0]] = value;
        }
        return inWhat;
    }

    return function(path, value) {
        state = getAndReplacePath([].concat(path), value, state);
        state.card = state.cards[state.currentCard];
        state.background = state.backgrounds[state.currentBackground];
        setTimeout(() => {
            emitter.emit('render');
            emitter.emit('save');
        }, 1);
    }
}

function getPath(state, path) {
    const consumeThisPath = [].concat(path);
    let returned = state[consumeThisPath.shift()];
    while (consumeThisPath.length) {
        returned = returned[consumeThisPath.shift()];
    }
    return returned;
}

function toPx(strVal) {
    const tryaval = parseInt(strVal.substring(0, strVal.indexOf('px')));
    return Number.isNaN(tryaval) ? 0 : tryaval;
}

function selectOption(val, label, compareVal, reactKey) {
    if (typeof compareVal === 'undefined') {
        compareVal = label;
        label = val;
    }
    const opts = [
        html`<option id="${reactKey || ''}" value="${val}" selected="selected">${label}</option>`,
        html`<option id="${reactKey || ''}" value="${val}">${label}</option>`
    ];
    // always re-render options
    opts[0].isSameNode = opts[1].isSameNode = () => false;

    if (typeof compareVal === 'boolean') {
        return compareVal ? opts[0] : opts[1];
    }
    return compareVal == val ? opts[0] : opts[1];
}

function checkBox(label, checkd, handler) {
    const myId = uuid();
    const opts = [
        html`<input type="checkbox" onchange=${handler} checked="checked" name="${myId}" />`,
        html`<input type="checkbox" onchange=${handler} name="${myId}" />`
    ];
    return html`<span class="checkbox">
        ${checkd ? opts[0] : opts[1]}
        <label for="${myId}">${label}</label>
    </span>`;
}

function fieldsWithValues(state) {
    const leCard = Object.assign({}, state.cards[state.currentCard]);
    const leBg = Object.assign({}, state.backgrounds[state.currentBackground]);
    const fieldsWithValues = Object.keys(leCard.fields).reduce((obj, fld) => {
        obj[fld] = leCard.fields[fld].value;
        return obj;
    }, {});
    Object.assign(fieldsWithValues, leCard.values);
    // oh god fields will need the concept of default values, for radios
    // at least when first created
    return fieldsWithValues;
}

function color(state) {
    if (state.card && state.card.color) {
        return state.card.color;
    }
    if (state.background && state.background.color) {
        return state.background.color;
    }
    if (state.color) {
        return state.color;
    }
    return 'inherit';
}

module.exports = {modEnv, modPath, getPath, toPx, selectOption, checkBox, fieldsWithValues, color};

},{"choo/html":38,"uuid/v1":58}],37:[function(require,module,exports){
var document = require('global/document')
var hyperx = require('hyperx')
var onload = require('on-load')

var SVGNS = 'http://www.w3.org/2000/svg'
var XLINKNS = 'http://www.w3.org/1999/xlink'

var BOOL_PROPS = {
  autofocus: 1,
  checked: 1,
  defaultchecked: 1,
  disabled: 1,
  formnovalidate: 1,
  indeterminate: 1,
  readonly: 1,
  required: 1,
  selected: 1,
  willvalidate: 1
}
var COMMENT_TAG = '!--'
var SVG_TAGS = [
  'svg',
  'altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate', 'animateColor',
  'animateMotion', 'animateTransform', 'circle', 'clipPath', 'color-profile',
  'cursor', 'defs', 'desc', 'ellipse', 'feBlend', 'feColorMatrix',
  'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting',
  'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB',
  'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode',
  'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting',
  'feSpotLight', 'feTile', 'feTurbulence', 'filter', 'font', 'font-face',
  'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri',
  'foreignObject', 'g', 'glyph', 'glyphRef', 'hkern', 'image', 'line',
  'linearGradient', 'marker', 'mask', 'metadata', 'missing-glyph', 'mpath',
  'path', 'pattern', 'polygon', 'polyline', 'radialGradient', 'rect',
  'set', 'stop', 'switch', 'symbol', 'text', 'textPath', 'title', 'tref',
  'tspan', 'use', 'view', 'vkern'
]

function belCreateElement (tag, props, children) {
  var el

  // If an svg tag, it needs a namespace
  if (SVG_TAGS.indexOf(tag) !== -1) {
    props.namespace = SVGNS
  }

  // If we are using a namespace
  var ns = false
  if (props.namespace) {
    ns = props.namespace
    delete props.namespace
  }

  // Create the element
  if (ns) {
    el = document.createElementNS(ns, tag)
  } else if (tag === COMMENT_TAG) {
    return document.createComment(props.comment)
  } else {
    el = document.createElement(tag)
  }

  // If adding onload events
  if (props.onload || props.onunload) {
    var load = props.onload || function () {}
    var unload = props.onunload || function () {}
    onload(el, function belOnload () {
      load(el)
    }, function belOnunload () {
      unload(el)
    },
    // We have to use non-standard `caller` to find who invokes `belCreateElement`
    belCreateElement.caller.caller.caller)
    delete props.onload
    delete props.onunload
  }

  // Create the properties
  for (var p in props) {
    if (props.hasOwnProperty(p)) {
      var key = p.toLowerCase()
      var val = props[p]
      // Normalize className
      if (key === 'classname') {
        key = 'class'
        p = 'class'
      }
      // The for attribute gets transformed to htmlFor, but we just set as for
      if (p === 'htmlFor') {
        p = 'for'
      }
      // If a property is boolean, set itself to the key
      if (BOOL_PROPS[key]) {
        if (val === 'true') val = key
        else if (val === 'false') continue
      }
      // If a property prefers being set directly vs setAttribute
      if (key.slice(0, 2) === 'on') {
        el[p] = val
      } else {
        if (ns) {
          if (p === 'xlink:href') {
            el.setAttributeNS(XLINKNS, p, val)
          } else if (/^xmlns($|:)/i.test(p)) {
            // skip xmlns definitions
          } else {
            el.setAttributeNS(null, p, val)
          }
        } else {
          el.setAttribute(p, val)
        }
      }
    }
  }

  function appendChild (childs) {
    if (!Array.isArray(childs)) return
    for (var i = 0; i < childs.length; i++) {
      var node = childs[i]
      if (Array.isArray(node)) {
        appendChild(node)
        continue
      }

      if (typeof node === 'number' ||
        typeof node === 'boolean' ||
        typeof node === 'function' ||
        node instanceof Date ||
        node instanceof RegExp) {
        node = node.toString()
      }

      if (typeof node === 'string') {
        if (el.lastChild && el.lastChild.nodeName === '#text') {
          el.lastChild.nodeValue += node
          continue
        }
        node = document.createTextNode(node)
      }

      if (node && node.nodeType) {
        el.appendChild(node)
      }
    }
  }
  appendChild(children)

  return el
}

module.exports = hyperx(belCreateElement, {comments: true})
module.exports.default = module.exports
module.exports.createElement = belCreateElement

},{"global/document":41,"hyperx":44,"on-load":55}],38:[function(require,module,exports){
module.exports = require('bel')

},{"bel":37}],39:[function(require,module,exports){
var documentReady = require('document-ready')
var nanohistory = require('nanohistory')
var nanorouter = require('nanorouter')
var nanomount = require('nanomount')
var nanomorph = require('nanomorph')
var nanohref = require('nanohref')
var nanoraf = require('nanoraf')
var nanobus = require('nanobus')
var assert = require('assert')

module.exports = Choo

function Choo (opts) {
  opts = opts || {}

  var routerOpts = {
    default: opts.defaultRoute || '/404',
    curry: true
  }

  var timingEnabled = opts.timing === undefined ? true : opts.timing
  var hasWindow = typeof window !== 'undefined'
  var hasPerformance = hasWindow && window.performance && window.performance.mark
  var router = nanorouter(routerOpts)
  var bus = nanobus()
  var rerender = null
  var tree = null
  var state = {}

  return {
    toString: toString,
    use: register,
    mount: mount,
    router: router,
    route: route,
    start: start
  }

  function route (route, handler) {
    router.on(route, function (params) {
      return function () {
        state.params = params
        return handler(state, emit)
      }
    })
  }

  function register (cb) {
    cb(state, bus)
  }

  function start () {
    if (opts.history !== false) {
      nanohistory(function (href) {
        bus.emit('pushState')
      })

      bus.prependListener('pushState', updateHistory.bind(null, 'push'))
      bus.prependListener('replaceState', updateHistory.bind(null, 'replace'))

      if (opts.href !== false) {
        nanohref(function (location) {
          var href = location.href
          var currHref = window.location.href
          if (href === currHref) return
          bus.emit('pushState', href)
        })
      }
    }

    function updateHistory (mode, href) {
      if (href) window.history[mode + 'State']({}, null, href)
      bus.emit('render')
      setTimeout(function () {
        scrollIntoView()
      }, 0)
    }

    rerender = nanoraf(function () {
      if (hasPerformance && timingEnabled) {
        window.performance.mark('choo:renderStart')
      }
      var newTree = router(createLocation())
      tree = nanomorph(tree, newTree)
      assert.notEqual(tree, newTree, 'choo.start: a different node type was returned as the root node on a rerender. Make sure that the root node is always the same type to prevent the application from being unmounted.')
      if (hasPerformance && timingEnabled) {
        window.performance.mark('choo:renderEnd')
        window.performance.measure('choo:render', 'choo:renderStart', 'choo:renderEnd')
      }
    })

    bus.prependListener('render', rerender)

    documentReady(function () {
      bus.emit('DOMContentLoaded')
    })

    tree = router(createLocation())

    return tree
  }

  function emit (eventName, data) {
    bus.emit(eventName, data)
  }

  function mount (selector) {
    var newTree = start()
    documentReady(function () {
      var root = document.querySelector(selector)
      assert.ok(root, 'choo.mount: could not query selector: ' + selector)
      nanomount(root, newTree)
      tree = root
    })
  }

  function toString (location, _state) {
    state = _state || {}
    var html = router(location)
    return html.toString()
  }
}

function scrollIntoView () {
  var hash = window.location.hash
  if (hash) {
    try {
      var el = document.querySelector(hash)
      if (el) el.scrollIntoView(true)
    } catch (e) {}
  }
}

function createLocation () {
  var pathname = window.location.pathname.replace(/\/$/, '')
  var hash = window.location.hash.replace(/^#/, '/')
  return pathname + hash
}

},{"assert":63,"document-ready":40,"nanobus":45,"nanohistory":46,"nanohref":47,"nanomorph":48,"nanomount":51,"nanoraf":52,"nanorouter":53}],40:[function(require,module,exports){
'use strict'

var assert = require('assert')

module.exports = ready

function ready (callback) {
  assert.notEqual(typeof document, 'undefined', 'document-ready only runs in the browser')
  var state = document.readyState
  if (state === 'complete' || state === 'interactive') {
    return setTimeout(callback, 0)
  }

  document.addEventListener('DOMContentLoaded', function onLoad () {
    callback()
  })
}

},{"assert":63}],41:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

var doccy;

if (typeof document !== 'undefined') {
    doccy = document;
} else {
    doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }
}

module.exports = doccy;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"min-document":64}],42:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],43:[function(require,module,exports){
module.exports = attributeToProperty

var transform = {
  'class': 'className',
  'for': 'htmlFor',
  'http-equiv': 'httpEquiv'
}

function attributeToProperty (h) {
  return function (tagName, attrs, children) {
    for (var attr in attrs) {
      if (attr in transform) {
        attrs[transform[attr]] = attrs[attr]
        delete attrs[attr]
      }
    }
    return h(tagName, attrs, children)
  }
}

},{}],44:[function(require,module,exports){
var attrToProp = require('hyperscript-attribute-to-property')

var VAR = 0, TEXT = 1, OPEN = 2, CLOSE = 3, ATTR = 4
var ATTR_KEY = 5, ATTR_KEY_W = 6
var ATTR_VALUE_W = 7, ATTR_VALUE = 8
var ATTR_VALUE_SQ = 9, ATTR_VALUE_DQ = 10
var ATTR_EQ = 11, ATTR_BREAK = 12
var COMMENT = 13

module.exports = function (h, opts) {
  if (!opts) opts = {}
  var concat = opts.concat || function (a, b) {
    return String(a) + String(b)
  }
  if (opts.attrToProp !== false) {
    h = attrToProp(h)
  }

  return function (strings) {
    var state = TEXT, reg = ''
    var arglen = arguments.length
    var parts = []

    for (var i = 0; i < strings.length; i++) {
      if (i < arglen - 1) {
        var arg = arguments[i+1]
        var p = parse(strings[i])
        var xstate = state
        if (xstate === ATTR_VALUE_DQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_SQ) xstate = ATTR_VALUE
        if (xstate === ATTR_VALUE_W) xstate = ATTR_VALUE
        if (xstate === ATTR) xstate = ATTR_KEY
        p.push([ VAR, xstate, arg ])
        parts.push.apply(parts, p)
      } else parts.push.apply(parts, parse(strings[i]))
    }

    var tree = [null,{},[]]
    var stack = [[tree,-1]]
    for (var i = 0; i < parts.length; i++) {
      var cur = stack[stack.length-1][0]
      var p = parts[i], s = p[0]
      if (s === OPEN && /^\//.test(p[1])) {
        var ix = stack[stack.length-1][1]
        if (stack.length > 1) {
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === OPEN) {
        var c = [p[1],{},[]]
        cur[2].push(c)
        stack.push([c,cur[2].length-1])
      } else if (s === ATTR_KEY || (s === VAR && p[1] === ATTR_KEY)) {
        var key = ''
        var copyKey
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_KEY) {
            key = concat(key, parts[i][1])
          } else if (parts[i][0] === VAR && parts[i][1] === ATTR_KEY) {
            if (typeof parts[i][2] === 'object' && !key) {
              for (copyKey in parts[i][2]) {
                if (parts[i][2].hasOwnProperty(copyKey) && !cur[1][copyKey]) {
                  cur[1][copyKey] = parts[i][2][copyKey]
                }
              }
            } else {
              key = concat(key, parts[i][2])
            }
          } else break
        }
        if (parts[i][0] === ATTR_EQ) i++
        var j = i
        for (; i < parts.length; i++) {
          if (parts[i][0] === ATTR_VALUE || parts[i][0] === ATTR_KEY) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][1])
            else cur[1][key] = concat(cur[1][key], parts[i][1])
          } else if (parts[i][0] === VAR
          && (parts[i][1] === ATTR_VALUE || parts[i][1] === ATTR_KEY)) {
            if (!cur[1][key]) cur[1][key] = strfn(parts[i][2])
            else cur[1][key] = concat(cur[1][key], parts[i][2])
          } else {
            if (key.length && !cur[1][key] && i === j
            && (parts[i][0] === CLOSE || parts[i][0] === ATTR_BREAK)) {
              // https://html.spec.whatwg.org/multipage/infrastructure.html#boolean-attributes
              // empty string is falsy, not well behaved value in browser
              cur[1][key] = key.toLowerCase()
            }
            break
          }
        }
      } else if (s === ATTR_KEY) {
        cur[1][p[1]] = true
      } else if (s === VAR && p[1] === ATTR_KEY) {
        cur[1][p[2]] = true
      } else if (s === CLOSE) {
        if (selfClosing(cur[0]) && stack.length) {
          var ix = stack[stack.length-1][1]
          stack.pop()
          stack[stack.length-1][0][2][ix] = h(
            cur[0], cur[1], cur[2].length ? cur[2] : undefined
          )
        }
      } else if (s === VAR && p[1] === TEXT) {
        if (p[2] === undefined || p[2] === null) p[2] = ''
        else if (!p[2]) p[2] = concat('', p[2])
        if (Array.isArray(p[2][0])) {
          cur[2].push.apply(cur[2], p[2])
        } else {
          cur[2].push(p[2])
        }
      } else if (s === TEXT) {
        cur[2].push(p[1])
      } else if (s === ATTR_EQ || s === ATTR_BREAK) {
        // no-op
      } else {
        throw new Error('unhandled: ' + s)
      }
    }

    if (tree[2].length > 1 && /^\s*$/.test(tree[2][0])) {
      tree[2].shift()
    }

    if (tree[2].length > 2
    || (tree[2].length === 2 && /\S/.test(tree[2][1]))) {
      throw new Error(
        'multiple root elements must be wrapped in an enclosing tag'
      )
    }
    if (Array.isArray(tree[2][0]) && typeof tree[2][0][0] === 'string'
    && Array.isArray(tree[2][0][2])) {
      tree[2][0] = h(tree[2][0][0], tree[2][0][1], tree[2][0][2])
    }
    return tree[2][0]

    function parse (str) {
      var res = []
      if (state === ATTR_VALUE_W) state = ATTR
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i)
        if (state === TEXT && c === '<') {
          if (reg.length) res.push([TEXT, reg])
          reg = ''
          state = OPEN
        } else if (c === '>' && !quot(state) && state !== COMMENT) {
          if (state === OPEN) {
            res.push([OPEN,reg])
          } else if (state === ATTR_KEY) {
            res.push([ATTR_KEY,reg])
          } else if (state === ATTR_VALUE && reg.length) {
            res.push([ATTR_VALUE,reg])
          }
          res.push([CLOSE])
          reg = ''
          state = TEXT
        } else if (state === COMMENT && /-$/.test(reg) && c === '-') {
          if (opts.comments) {
            res.push([ATTR_VALUE,reg.substr(0, reg.length - 1)],[CLOSE])
          }
          reg = ''
          state = TEXT
        } else if (state === OPEN && /^!--$/.test(reg)) {
          if (opts.comments) {
            res.push([OPEN, reg],[ATTR_KEY,'comment'],[ATTR_EQ])
          }
          reg = c
          state = COMMENT
        } else if (state === TEXT || state === COMMENT) {
          reg += c
        } else if (state === OPEN && /\s/.test(c)) {
          res.push([OPEN, reg])
          reg = ''
          state = ATTR
        } else if (state === OPEN) {
          reg += c
        } else if (state === ATTR && /[^\s"'=/]/.test(c)) {
          state = ATTR_KEY
          reg = c
        } else if (state === ATTR && /\s/.test(c)) {
          if (reg.length) res.push([ATTR_KEY,reg])
          res.push([ATTR_BREAK])
        } else if (state === ATTR_KEY && /\s/.test(c)) {
          res.push([ATTR_KEY,reg])
          reg = ''
          state = ATTR_KEY_W
        } else if (state === ATTR_KEY && c === '=') {
          res.push([ATTR_KEY,reg],[ATTR_EQ])
          reg = ''
          state = ATTR_VALUE_W
        } else if (state === ATTR_KEY) {
          reg += c
        } else if ((state === ATTR_KEY_W || state === ATTR) && c === '=') {
          res.push([ATTR_EQ])
          state = ATTR_VALUE_W
        } else if ((state === ATTR_KEY_W || state === ATTR) && !/\s/.test(c)) {
          res.push([ATTR_BREAK])
          if (/[\w-]/.test(c)) {
            reg += c
            state = ATTR_KEY
          } else state = ATTR
        } else if (state === ATTR_VALUE_W && c === '"') {
          state = ATTR_VALUE_DQ
        } else if (state === ATTR_VALUE_W && c === "'") {
          state = ATTR_VALUE_SQ
        } else if (state === ATTR_VALUE_DQ && c === '"') {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_SQ && c === "'") {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE_W && !/\s/.test(c)) {
          state = ATTR_VALUE
          i--
        } else if (state === ATTR_VALUE && /\s/.test(c)) {
          res.push([ATTR_VALUE,reg],[ATTR_BREAK])
          reg = ''
          state = ATTR
        } else if (state === ATTR_VALUE || state === ATTR_VALUE_SQ
        || state === ATTR_VALUE_DQ) {
          reg += c
        }
      }
      if (state === TEXT && reg.length) {
        res.push([TEXT,reg])
        reg = ''
      } else if (state === ATTR_VALUE && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_DQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_VALUE_SQ && reg.length) {
        res.push([ATTR_VALUE,reg])
        reg = ''
      } else if (state === ATTR_KEY) {
        res.push([ATTR_KEY,reg])
        reg = ''
      }
      return res
    }
  }

  function strfn (x) {
    if (typeof x === 'function') return x
    else if (typeof x === 'string') return x
    else if (x && typeof x === 'object') return x
    else return concat('', x)
  }
}

function quot (state) {
  return state === ATTR_VALUE_SQ || state === ATTR_VALUE_DQ
}

var hasOwn = Object.prototype.hasOwnProperty
function has (obj, key) { return hasOwn.call(obj, key) }

var closeRE = RegExp('^(' + [
  'area', 'base', 'basefont', 'bgsound', 'br', 'col', 'command', 'embed',
  'frame', 'hr', 'img', 'input', 'isindex', 'keygen', 'link', 'meta', 'param',
  'source', 'track', 'wbr', '!--',
  // SVG TAGS
  'animate', 'animateTransform', 'circle', 'cursor', 'desc', 'ellipse',
  'feBlend', 'feColorMatrix', 'feComposite',
  'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile',
  'feTurbulence', 'font-face-format', 'font-face-name', 'font-face-uri',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'missing-glyph', 'mpath',
  'path', 'polygon', 'polyline', 'rect', 'set', 'stop', 'tref', 'use', 'view',
  'vkern'
].join('|') + ')(?:[\.#][a-zA-Z0-9\u007F-\uFFFF_:-]+)*$')
function selfClosing (tag) { return closeRE.test(tag) }

},{"hyperscript-attribute-to-property":43}],45:[function(require,module,exports){
var nanotiming = require('nanotiming')
var assert = require('assert')

module.exports = Nanobus

function Nanobus (name) {
  if (!(this instanceof Nanobus)) return new Nanobus(name)

  this._name = name || 'nanobus'
  this._starListeners = []
  this._listeners = {}

  this._timing = nanotiming(this._name)
}

Nanobus.prototype.emit = function (eventName, data) {
  assert.equal(typeof eventName, 'string', 'nanobus.emit: eventName should be type string')

  this._timing.start(eventName)
  var listeners = this._listeners[eventName]
  if (listeners && listeners.length > 0) {
    this._emit(this._listeners[eventName], data)
  }

  if (this._starListeners.length > 0) {
    this._emit(this._starListeners, eventName, data)
  }
  this._timing.end(eventName)

  return this
}

Nanobus.prototype.on = Nanobus.prototype.addListener = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.on: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.on: listener should be type function')

  if (eventName === '*') {
    this._starListeners.push(listener)
  } else {
    if (!this._listeners[eventName]) this._listeners[eventName] = []
    this._listeners[eventName].push(listener)
  }
  return this
}

Nanobus.prototype.prependListener = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.prependListener: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.prependListener: listener should be type function')

  if (eventName === '*') {
    this._starListeners.unshift(listener)
  } else {
    if (!this._listeners[eventName]) this._listeners[eventName] = []
    this._listeners[eventName].unshift(listener)
  }
  return this
}

Nanobus.prototype.once = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.once: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.once: listener should be type function')

  var self = this
  this.on(eventName, once)
  function once () {
    listener.apply(self, arguments)
    self.removeListener(eventName, once)
  }
  return this
}

Nanobus.prototype.prependOnceListener = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.prependOnceListener: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.prependOnceListener: listener should be type function')

  var self = this
  this.prependListener(eventName, once)
  function once () {
    listener.apply(self, arguments)
    self.removeListener(eventName, once)
  }
  return this
}

Nanobus.prototype.removeListener = function (eventName, listener) {
  assert.equal(typeof eventName, 'string', 'nanobus.removeListener: eventName should be type string')
  assert.equal(typeof listener, 'function', 'nanobus.removeListener: listener should be type function')

  if (eventName === '*') {
    this._starListeners = this._starListeners.slice()
    return remove(this._starListeners, listener)
  } else {
    if (typeof this._listeners[eventName] !== 'undefined') {
      this._listeners[eventName] = this._listeners[eventName].slice()
    }

    return remove(this._listeners[eventName], listener)
  }

  function remove (arr, listener) {
    if (!arr) return
    var index = arr.indexOf(listener)
    if (index !== -1) {
      arr.splice(index, 1)
      return true
    }
  }
}

Nanobus.prototype.removeAllListeners = function (eventName) {
  if (eventName) {
    if (eventName === '*') {
      this._starListeners = []
    } else {
      this._listeners[eventName] = []
    }
  } else {
    this._starListeners = []
    this._listeners = {}
  }
  return this
}

Nanobus.prototype.listeners = function (eventName) {
  var listeners = (eventName !== '*') ? this._listeners[eventName] : this._starListeners
  var ret = []
  if (listeners) {
    var ilength = listeners.length
    for (var i = 0; i < ilength; i++) ret.push(listeners[i])
  }
  return ret
}

Nanobus.prototype._emit = function (arr, eventName, data) {
  if (typeof arr === 'undefined') return
  if (!data) {
    data = eventName
    eventName = null
  }
  var length = arr.length
  for (var i = 0; i < length; i++) {
    var listener = arr[i]
    if (eventName) listener(eventName, data)
    else listener(data)
  }
}

},{"assert":63,"nanotiming":54}],46:[function(require,module,exports){
var assert = require('assert')

module.exports = history

// listen to html5 pushstate events
// and update router accordingly
function history (cb) {
  assert.equal(typeof cb, 'function', 'nanohistory: cb must be type function')
  window.onpopstate = function () {
    cb(document.location)
  }
}

},{"assert":63}],47:[function(require,module,exports){
var assert = require('assert')

module.exports = href

var noRoutingAttrName = 'data-no-routing'

// handle a click if is anchor tag with an href
// and url lives on the same domain. Replaces
// trailing '#' so empty links work as expected.
// (fn(str), obj?) -> undefined
function href (cb, root) {
  assert.equal(typeof cb, 'function', 'nanohref: cb must be type function')
  root = root || window.document

  window.onclick = function (e) {
    if ((e.button && e.button !== 0) || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return

    var node = (function traverse (node) {
      if (!node || node === root) return
      if (node.localName !== 'a') return traverse(node.parentNode)
      if (node.href === undefined) return traverse(node.parentNode)
      if (window.location.host !== node.host) return traverse(node.parentNode)
      return node
    })(e.target)

    if (!node) return

    var isRoutingDisabled = node.hasAttribute(noRoutingAttrName)
    if (isRoutingDisabled) return

    e.preventDefault()
    cb(node)
  }
}

},{"assert":63}],48:[function(require,module,exports){
var assert = require('assert')
var morph = require('./lib/morph')
var rootLabelRegex = /^data-onloadid/

var ELEMENT_NODE = 1

module.exports = nanomorph

// morph one tree into another tree
// (obj, obj) -> obj
// no parent
//   -> same: diff and walk children
//   -> not same: replace and return
// old node doesn't exist
//   -> insert new node
// new node doesn't exist
//   -> delete old node
// nodes are not the same
//   -> diff nodes and apply patch to old node
// nodes are the same
//   -> walk all child nodes and append to old node
function nanomorph (oldTree, newTree) {
  assert.equal(typeof oldTree, 'object', 'nanomorph: oldTree should be an object')
  assert.equal(typeof newTree, 'object', 'nanomorph: newTree should be an object')

  persistStatefulRoot(newTree, oldTree)
  var tree = walk(newTree, oldTree)
  return tree
}

// walk and morph a dom tree
// (obj, obj) -> obj
function walk (newNode, oldNode) {
  if (!oldNode) {
    return newNode
  } else if (!newNode) {
    return null
  } else if (newNode.isSameNode && newNode.isSameNode(oldNode)) {
    return oldNode
  } else if (newNode.tagName !== oldNode.tagName) {
    return newNode
  } else {
    morph(newNode, oldNode)
    updateChildren(newNode, oldNode)
    return oldNode
  }
}

// update the children of elements
// (obj, obj) -> null
function updateChildren (newNode, oldNode) {
  if (!newNode.childNodes || !oldNode.childNodes) return

  var newLength = newNode.childNodes.length
  var oldLength = oldNode.childNodes.length
  var length = Math.max(oldLength, newLength)

  var iNew = 0
  var iOld = 0
  for (var i = 0; i < length; i++, iNew++, iOld++) {
    var newChildNode = newNode.childNodes[iNew]
    var oldChildNode = oldNode.childNodes[iOld]
    var retChildNode = walk(newChildNode, oldChildNode)
    if (!retChildNode) {
      if (oldChildNode) {
        oldNode.removeChild(oldChildNode)
        iOld--
      }
    } else if (!oldChildNode) {
      if (retChildNode) {
        oldNode.appendChild(retChildNode)
        iNew--
      }
    } else if (retChildNode !== oldChildNode) {
      oldNode.replaceChild(retChildNode, oldChildNode)
      iNew--
    }
  }
}

function persistStatefulRoot (newNode, oldNode) {
  if (!newNode || !oldNode || oldNode.nodeType !== ELEMENT_NODE || newNode.nodeType !== ELEMENT_NODE) return
  var oldAttrs = oldNode.attributes
  var attr, name
  for (var i = 0, len = oldAttrs.length; i < len; i++) {
    attr = oldAttrs[i]
    name = attr.name
    if (rootLabelRegex.test(name)) {
      newNode.setAttribute(name, attr.value)
      break
    }
  }
}

},{"./lib/morph":50,"assert":63}],49:[function(require,module,exports){
module.exports = [
  // attribute events (can be set with attributes)
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmousemove',
  'onmouseout',
  'onmouseenter',
  'onmouseleave',
  'ondragstart',
  'ondrag',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondrop',
  'ondragend',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onunload',
  'onabort',
  'onerror',
  'onresize',
  'onscroll',
  'onselect',
  'onchange',
  'onsubmit',
  'onreset',
  'onfocus',
  'onblur',
  'oninput',
  // other common events
  'oncontextmenu',
  'onfocusin',
  'onfocusout'
]

},{}],50:[function(require,module,exports){
var events = require('./events')
var eventsLength = events.length

var ELEMENT_NODE = 1
var TEXT_NODE = 3
var COMMENT_NODE = 8

module.exports = morph

// diff elements and apply the resulting patch to the old node
// (obj, obj) -> null
function morph (newNode, oldNode) {
  var nodeType = newNode.nodeType
  var nodeName = newNode.nodeName

  if (nodeType === ELEMENT_NODE) {
    copyAttrs(newNode, oldNode)
  }

  if (nodeType === TEXT_NODE || nodeType === COMMENT_NODE) {
    oldNode.nodeValue = newNode.nodeValue
  }

  // Some DOM nodes are weird
  // https://github.com/patrick-steele-idem/morphdom/blob/master/src/specialElHandlers.js
  if (nodeName === 'INPUT') updateInput(newNode, oldNode)
  else if (nodeName === 'OPTION') updateOption(newNode, oldNode)
  else if (nodeName === 'TEXTAREA') updateTextarea(newNode, oldNode)
  else if (nodeName === 'SELECT') updateSelect(newNode, oldNode)

  copyEvents(newNode, oldNode)
}

function copyAttrs (newNode, oldNode) {
  var oldAttrs = oldNode.attributes
  var newAttrs = newNode.attributes
  var attrNamespaceURI = null
  var attrValue = null
  var fromValue = null
  var attrName = null
  var attr = null

  for (var i = newAttrs.length - 1; i >= 0; --i) {
    attr = newAttrs[i]
    attrName = attr.name
    attrNamespaceURI = attr.namespaceURI
    attrValue = attr.value

    if (attrNamespaceURI) {
      attrName = attr.localName || attrName
      fromValue = oldNode.getAttributeNS(attrNamespaceURI, attrName)

      if (fromValue !== attrValue) {
        oldNode.setAttributeNS(attrNamespaceURI, attrName, attrValue)
      }
    } else {
      fromValue = oldNode.getAttribute(attrName)

      if (fromValue !== attrValue) {
        // apparently values are always cast to strings, ah well
        if (attrValue === 'null' || attrValue === 'undefined') {
          oldNode.removeAttribute(attrName)
        } else {
          oldNode.setAttribute(attrName, attrValue)
        }
      }
    }
  }

  // Remove any extra attributes found on the original DOM element that
  // weren't found on the target element.
  for (var j = oldAttrs.length - 1; j >= 0; --j) {
    attr = oldAttrs[j]
    if (attr.specified !== false) {
      attrName = attr.name
      attrNamespaceURI = attr.namespaceURI

      if (attrNamespaceURI) {
        attrName = attr.localName || attrName
        if (!newNode.hasAttributeNS(attrNamespaceURI, attrName)) {
          oldNode.removeAttributeNS(attrNamespaceURI, attrName)
        }
      } else {
        if (!newNode.hasAttributeNS(null, attrName)) {
          oldNode.removeAttribute(attrName)
        }
      }
    }
  }
}

function copyEvents (newNode, oldNode) {
  for (var i = 0; i < eventsLength; i++) {
    var ev = events[i]
    if (newNode[ev]) {           // if new element has a whitelisted attribute
      oldNode[ev] = newNode[ev]  // update existing element
    } else if (oldNode[ev]) {    // if existing element has it and new one doesnt
      oldNode[ev] = undefined    // remove it from existing element
    }
  }
}

function updateOption (newNode, oldNode) {
  updateAttribute(newNode, oldNode, 'selected')
}

// The "value" attribute is special for the <input> element since it sets the
// initial value. Changing the "value" attribute without changing the "value"
// property will have no effect since it is only used to the set the initial
// value. Similar for the "checked" attribute, and "disabled".
function updateInput (newNode, oldNode) {
  var newValue = newNode.value
  var oldValue = oldNode.value

  updateAttribute(newNode, oldNode, 'checked')
  updateAttribute(newNode, oldNode, 'disabled')

  if (!newNode.hasAttributeNS(null, 'value') || newValue === 'null') {
    oldNode.value = ''
    oldNode.removeAttribute('value')
  } else if (newValue !== oldValue) {
    oldNode.setAttribute('value', newValue)
    oldNode.value = newValue
  } else if (oldNode.type === 'range') {
    // this is so elements like slider move their UI thingy
    oldNode.value = newValue
  }
}

function updateTextarea (newNode, oldNode) {
  var newValue = newNode.value
  if (newValue !== oldNode.value) {
    oldNode.value = newValue
  }

  if (oldNode.firstChild) {
    // Needed for IE. Apparently IE sets the placeholder as the
    // node value and vise versa. This ignores an empty update.
    if (newValue === '' && oldNode.firstChild.nodeValue === oldNode.placeholder) {
      return
    }

    oldNode.firstChild.nodeValue = newValue
  }
}

function updateSelect (newNode, oldNode) {
  if (!oldNode.hasAttributeNS(null, 'multiple')) {
    var i = 0
    var curChild = oldNode.firstChild
    while (curChild) {
      var nodeName = curChild.nodeName
      if (nodeName && nodeName.toUpperCase() === 'OPTION') {
        if (curChild.hasAttributeNS(null, 'selected')) break
        i++
      }
      curChild = curChild.nextSibling
    }

    newNode.selectedIndex = i
  }
}

function updateAttribute (newNode, oldNode, name) {
  if (newNode[name] !== oldNode[name]) {
    oldNode[name] = newNode[name]
    if (newNode[name]) {
      oldNode.setAttribute(name, '')
    } else {
      oldNode.removeAttribute(name, '')
    }
  }
}

},{"./events":49}],51:[function(require,module,exports){
var nanomorph = require('nanomorph')
var assert = require('assert')

module.exports = nanomount

function nanomount (target, newTree) {
  if (target.nodeName === 'BODY') {
    var children = target.childNodes
    for (var i = 0; i < children.length; i++) {
      if (children[i].nodeName === 'SCRIPT') {
        newTree.appendChild(children[i].cloneNode(true))
      }
    }
  }

  var tree = nanomorph(target, newTree)
  assert.equal(tree, target, 'nanomount: The target node ' +
    tree.outerHTML.nodeName + ' is not the same type as the new node ' +
    target.outerHTML.nodeName + '.')
}

},{"assert":63,"nanomorph":48}],52:[function(require,module,exports){
'use strict'

var assert = require('assert')

module.exports = nanoraf

// Only call RAF when needed
// (fn, fn?) -> fn
function nanoraf (render, raf) {
  assert.equal(typeof render, 'function', 'nanoraf: render should be a function')
  assert.ok(typeof raf === 'function' || typeof raf === 'undefined', 'nanoraf: raf should be a function or undefined')

  if (!raf) raf = window.requestAnimationFrame
  var redrawScheduled = false
  var args = null

  return function frame () {
    if (args === null && !redrawScheduled) {
      redrawScheduled = true

      raf(function redraw () {
        redrawScheduled = false

        var length = args.length
        var _args = new Array(length)
        for (var i = 0; i < length; i++) _args[i] = args[i]

        render.apply(render, _args)
        args = null
      })
    }

    args = arguments
  }
}

},{"assert":63}],53:[function(require,module,exports){
var wayfarer = require('wayfarer')

var isLocalFile = (/file:\/\//.test(typeof window === 'object' &&
  window.location && window.location.origin)) // electron support

/* eslint-disable no-useless-escape */
var electron = '^(file:\/\/|\/)(.*\.html?\/?)?'
var protocol = '^(http(s)?(:\/\/))?(www\.)?'
var domain = '[a-zA-Z0-9-_\.]+(:[0-9]{1,5})?(\/{1})?'
var qs = '[\?].*$'
/* eslint-enable no-useless-escape */

var stripElectron = new RegExp(electron)
var prefix = new RegExp(protocol + domain)
var normalize = new RegExp('#')
var suffix = new RegExp(qs)

module.exports = Nanorouter

function Nanorouter (opts) {
  opts = opts || {}

  var router = wayfarer(opts.default || '/404')
  var curry = opts.curry || false
  var prevCallback = null
  var prevRoute = null

  emit.router = router
  emit.on = on
  return emit

  function on (routename, listener) {
    routename = routename.replace(/^[#/]/, '')
    router.on(routename, listener)
  }

  function emit (route) {
    if (!curry) {
      return router(route)
    } else {
      route = pathname(route, isLocalFile)
      if (route === prevRoute) {
        return prevCallback()
      } else {
        prevRoute = route
        prevCallback = router(route)
        return prevCallback()
      }
    }
  }
}

// replace everything in a route but the pathname and hash
function pathname (route, isElectron) {
  if (isElectron) route = route.replace(stripElectron, '')
  else route = route.replace(prefix, '')
  return route.replace(suffix, '').replace(normalize, '/')
}

},{"wayfarer":59}],54:[function(require,module,exports){
var assert = require('assert')

module.exports = Nanotiming

function Nanotiming (name) {
  if (!(this instanceof Nanotiming)) return new Nanotiming(name)
  assert.equal(typeof name, 'string', 'Nanotiming: name should be type string')
  this._name = name
  this._enabled = typeof window !== 'undefined' &&
    window.performance && window.performance.mark
}

Nanotiming.prototype.start = function (partial) {
  if (!this._enabled) return
  var name = partial ? this._name + ':' + partial : this._name
  window.performance.mark(name + '-start')
}

Nanotiming.prototype.end = function (partial) {
  if (!this._enabled) return
  var name = partial ? this._name + ':' + partial : this._name
  window.performance.mark(name + '-end')
  window.performance.measure(name, name + '-start', name + '-end')
}

},{"assert":63}],55:[function(require,module,exports){
/* global MutationObserver */
var document = require('global/document')
var window = require('global/window')
var watch = Object.create(null)
var KEY_ID = 'onloadid' + (new Date() % 9e6).toString(36)
var KEY_ATTR = 'data-' + KEY_ID
var INDEX = 0

if (window && window.MutationObserver) {
  var observer = new MutationObserver(function (mutations) {
    if (Object.keys(watch).length < 1) return
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === KEY_ATTR) {
        eachAttr(mutations[i], turnon, turnoff)
        continue
      }
      eachMutation(mutations[i].removedNodes, turnoff)
      eachMutation(mutations[i].addedNodes, turnon)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: [KEY_ATTR]
  })
}

module.exports = function onload (el, on, off, caller) {
  on = on || function () {}
  off = off || function () {}
  el.setAttribute(KEY_ATTR, 'o' + INDEX)
  watch['o' + INDEX] = [on, off, 0, caller || onload.caller]
  INDEX += 1
  return el
}

function turnon (index, el) {
  if (watch[index][0] && watch[index][2] === 0) {
    watch[index][0](el)
    watch[index][2] = 1
  }
}

function turnoff (index, el) {
  if (watch[index][1] && watch[index][2] === 1) {
    watch[index][1](el)
    watch[index][2] = 0
  }
}

function eachAttr (mutation, on, off) {
  var newValue = mutation.target.getAttribute(KEY_ATTR)
  if (sameOrigin(mutation.oldValue, newValue)) {
    watch[newValue] = watch[mutation.oldValue]
    return
  }
  if (watch[mutation.oldValue]) {
    off(mutation.oldValue, mutation.target)
  }
  if (watch[newValue]) {
    on(newValue, mutation.target)
  }
}

function sameOrigin (oldValue, newValue) {
  if (!oldValue || !newValue) return false
  return watch[oldValue][3] === watch[newValue][3]
}

function eachMutation (nodes, fn) {
  var keys = Object.keys(watch)
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i] && nodes[i].getAttribute && nodes[i].getAttribute(KEY_ATTR)) {
      var onloadid = nodes[i].getAttribute(KEY_ATTR)
      keys.forEach(function (k) {
        if (onloadid === k) {
          fn(k, nodes[i])
        }
      })
    }
    if (nodes[i].childNodes.length > 0) {
      eachMutation(nodes[i].childNodes, fn)
    }
  }
}

},{"global/document":41,"global/window":42}],56:[function(require,module,exports){
/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

module.exports = bytesToUuid;

},{}],57:[function(require,module,exports){
(function (global){
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection
var rng;

var crypto = global.crypto || global.msCrypto; // for IE 11
if (crypto && crypto.getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef
  rng = function whatwgRNG() {
    crypto.getRandomValues(rnds8);
    return rnds8;
  };
}

if (!rng) {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);
  rng = function() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}

module.exports = rng;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],58:[function(require,module,exports){
var rng = require('./lib/rng');
var bytesToUuid = require('./lib/bytesToUuid');

// **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

// random #'s we need to init node and clockseq
var _seedBytes = rng();

// Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
var _nodeId = [
  _seedBytes[0] | 0x01,
  _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
];

// Per 4.2.2, randomize (14 bit) clockseq
var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

// Previous uuid creation time
var _lastMSecs = 0, _lastNSecs = 0;

// See https://github.com/broofa/node-uuid for API details
function v1(options, buf, offset) {
  var i = buf && offset || 0;
  var b = buf || [];

  options = options || {};

  var clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq;

  // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
  var msecs = options.msecs !== undefined ? options.msecs : new Date().getTime();

  // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock
  var nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1;

  // Time since last uuid creation (in msecs)
  var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

  // Per 4.2.1.2, Bump clockseq on clock regression
  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  }

  // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  }

  // Per 4.2.1.2 Throw error if too many uuids are requested
  if (nsecs >= 10000) {
    throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;

  // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
  msecs += 12219292800000;

  // `time_low`
  var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff;

  // `time_mid`
  var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff;

  // `time_high_and_version`
  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
  b[i++] = tmh >>> 16 & 0xff;

  // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
  b[i++] = clockseq >>> 8 | 0x80;

  // `clock_seq_low`
  b[i++] = clockseq & 0xff;

  // `node`
  var node = options.node || _nodeId;
  for (var n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf ? buf : bytesToUuid(b);
}

module.exports = v1;

},{"./lib/bytesToUuid":56,"./lib/rng":57}],59:[function(require,module,exports){
var assert = require('assert')
var trie = require('./trie')

module.exports = Wayfarer

// create a router
// str -> obj
function Wayfarer (dft) {
  if (!(this instanceof Wayfarer)) return new Wayfarer(dft)

  var _default = (dft || '').replace(/^\//, '')
  var _trie = trie()

  emit._trie = _trie
  emit.emit = emit
  emit.on = on
  emit._wayfarer = true

  return emit

  // define a route
  // (str, fn) -> obj
  function on (route, cb) {
    assert.equal(typeof route, 'string')
    assert.equal(typeof cb, 'function')

    route = route || '/'
    cb.route = route

    if (cb && cb._wayfarer && cb._trie) {
      _trie.mount(route, cb._trie.trie)
    } else {
      var node = _trie.create(route)
      node.cb = cb
    }

    return emit
  }

  // match and call a route
  // (str, obj?) -> null
  function emit (route) {
    assert.notEqual(route, undefined, "'route' must be defined")
    var args = new Array(arguments.length)
    for (var i = 1; i < args.length; i++) {
      args[i] = arguments[i]
    }

    var node = _trie.match(route)
    if (node && node.cb) {
      args[0] = node.params
      var cb = node.cb
      return cb.apply(cb, args)
    }

    var dft = _trie.match(_default)
    if (dft && dft.cb) {
      args[0] = dft.params
      var dftcb = dft.cb
      return dftcb.apply(dftcb, args)
    }

    throw new Error("route '" + route + "' did not match")
  }
}

},{"./trie":60,"assert":63}],60:[function(require,module,exports){
var mutate = require('xtend/mutable')
var assert = require('assert')
var xtend = require('xtend')

module.exports = Trie

// create a new trie
// null -> obj
function Trie () {
  if (!(this instanceof Trie)) return new Trie()
  this.trie = { nodes: {} }
}

// create a node on the trie at route
// and return a node
// str -> null
Trie.prototype.create = function (route) {
  assert.equal(typeof route, 'string', 'route should be a string')
  // strip leading '/' and split routes
  var routes = route.replace(/^\//, '').split('/')

  function createNode (index, trie) {
    var thisRoute = (routes.hasOwnProperty(index) && routes[index])
    if (thisRoute === false) return trie

    var node = null
    if (/^:|^\*/.test(thisRoute)) {
      // if node is a name match, set name and append to ':' node
      if (!trie.nodes.hasOwnProperty('$$')) {
        node = { nodes: {} }
        trie.nodes['$$'] = node
      } else {
        node = trie.nodes['$$']
      }

      if (thisRoute[0] === '*') {
        trie.wildcard = true
      }

      trie.name = thisRoute.replace(/^:|^\*/, '')
    } else if (!trie.nodes.hasOwnProperty(thisRoute)) {
      node = { nodes: {} }
      trie.nodes[thisRoute] = node
    } else {
      node = trie.nodes[thisRoute]
    }

    // we must recurse deeper
    return createNode(index + 1, node)
  }

  return createNode(0, this.trie)
}

// match a route on the trie
// and return the node
// str -> obj
Trie.prototype.match = function (route) {
  assert.equal(typeof route, 'string', 'route should be a string')

  var routes = route.replace(/^\//, '').split('/')
  var params = {}

  function search (index, trie) {
    // either there's no match, or we're done searching
    if (trie === undefined) return undefined
    var thisRoute = routes[index]
    if (thisRoute === undefined) return trie

    if (trie.nodes.hasOwnProperty(thisRoute)) {
      // match regular routes first
      return search(index + 1, trie.nodes[thisRoute])
    } else if (trie.name) {
      // match named routes
      try {
        params[trie.name] = decodeURIComponent(thisRoute)
      } catch (e) {
        return search(index, undefined)
      }
      return search(index + 1, trie.nodes['$$'])
    } else if (trie.wildcard) {
      // match wildcards
      try {
        params['wildcard'] = decodeURIComponent(routes.slice(index).join('/'))
      } catch (e) {
        return search(index, undefined)
      }
      // return early, or else search may keep recursing through the wildcard
      return trie.nodes['$$']
    } else {
      // no matches found
      return search(index + 1)
    }
  }

  var node = search(0, this.trie)

  if (!node) return undefined
  node = xtend(node)
  node.params = params
  return node
}

// mount a trie onto a node at route
// (str, obj) -> null
Trie.prototype.mount = function (route, trie) {
  assert.equal(typeof route, 'string', 'route should be a string')
  assert.equal(typeof trie, 'object', 'trie should be a object')

  var split = route.replace(/^\//, '').split('/')
  var node = null
  var key = null

  if (split.length === 1) {
    key = split[0]
    node = this.create(key)
  } else {
    var headArr = split.splice(0, split.length - 1)
    var head = headArr.join('/')
    key = split[0]
    node = this.create(head)
  }

  mutate(node.nodes, trie.nodes)
  if (trie.name) node.name = trie.name

  // delegate properties from '/' to the new node
  // '/' cannot be reached once mounted
  if (node.nodes['']) {
    Object.keys(node.nodes['']).forEach(function (key) {
      if (key === 'nodes') return
      node[key] = node.nodes[''][key]
    })
    mutate(node.nodes, node.nodes[''].nodes)
    delete node.nodes[''].nodes
  }
}

},{"assert":63,"xtend":61,"xtend/mutable":62}],61:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],62:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],63:[function(require,module,exports){
(function (global){
'use strict';

// compare and isBuffer taken from https://github.com/feross/buffer/blob/680e9e5e488f22aac27599a57dc844a6315928dd/index.js
// original notice:

/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
function compare(a, b) {
  if (a === b) {
    return 0;
  }

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) {
    return -1;
  }
  if (y < x) {
    return 1;
  }
  return 0;
}
function isBuffer(b) {
  if (global.Buffer && typeof global.Buffer.isBuffer === 'function') {
    return global.Buffer.isBuffer(b);
  }
  return !!(b != null && b._isBuffer);
}

// based on node assert, original notice:

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var util = require('util/');
var hasOwn = Object.prototype.hasOwnProperty;
var pSlice = Array.prototype.slice;
var functionsHaveNames = (function () {
  return function foo() {}.name === 'foo';
}());
function pToString (obj) {
  return Object.prototype.toString.call(obj);
}
function isView(arrbuf) {
  if (isBuffer(arrbuf)) {
    return false;
  }
  if (typeof global.ArrayBuffer !== 'function') {
    return false;
  }
  if (typeof ArrayBuffer.isView === 'function') {
    return ArrayBuffer.isView(arrbuf);
  }
  if (!arrbuf) {
    return false;
  }
  if (arrbuf instanceof DataView) {
    return true;
  }
  if (arrbuf.buffer && arrbuf.buffer instanceof ArrayBuffer) {
    return true;
  }
  return false;
}
// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

var regex = /\s*function\s+([^\(\s]*)\s*/;
// based on https://github.com/ljharb/function.prototype.name/blob/adeeeec8bfcc6068b187d7d9fb3d5bb1d3a30899/implementation.js
function getName(func) {
  if (!util.isFunction(func)) {
    return;
  }
  if (functionsHaveNames) {
    return func.name;
  }
  var str = func.toString();
  var match = str.match(regex);
  return match && match[1];
}
assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = getName(stackStartFunction);
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function truncate(s, n) {
  if (typeof s === 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}
function inspect(something) {
  if (functionsHaveNames || !util.isFunction(something)) {
    return util.inspect(something);
  }
  var rawname = getName(something);
  var name = rawname ? ': ' + rawname : '';
  return '[Function' +  name + ']';
}
function getMessage(self) {
  return truncate(inspect(self.actual), 128) + ' ' +
         self.operator + ' ' +
         truncate(inspect(self.expected), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

assert.deepStrictEqual = function deepStrictEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'deepStrictEqual', assert.deepStrictEqual);
  }
};

function _deepEqual(actual, expected, strict, memos) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;
  } else if (isBuffer(actual) && isBuffer(expected)) {
    return compare(actual, expected) === 0;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if ((actual === null || typeof actual !== 'object') &&
             (expected === null || typeof expected !== 'object')) {
    return strict ? actual === expected : actual == expected;

  // If both values are instances of typed arrays, wrap their underlying
  // ArrayBuffers in a Buffer each to increase performance
  // This optimization requires the arrays to have the same type as checked by
  // Object.prototype.toString (aka pToString). Never perform binary
  // comparisons for Float*Arrays, though, since e.g. +0 === -0 but their
  // bit patterns are not identical.
  } else if (isView(actual) && isView(expected) &&
             pToString(actual) === pToString(expected) &&
             !(actual instanceof Float32Array ||
               actual instanceof Float64Array)) {
    return compare(new Uint8Array(actual.buffer),
                   new Uint8Array(expected.buffer)) === 0;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else if (isBuffer(actual) !== isBuffer(expected)) {
    return false;
  } else {
    memos = memos || {actual: [], expected: []};

    var actualIndex = memos.actual.indexOf(actual);
    if (actualIndex !== -1) {
      if (actualIndex === memos.expected.indexOf(expected)) {
        return true;
      }
    }

    memos.actual.push(actual);
    memos.expected.push(expected);

    return objEquiv(actual, expected, strict, memos);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b, strict, actualVisitedObjects) {
  if (a === null || a === undefined || b === null || b === undefined)
    return false;
  // if one is a primitive, the other must be same
  if (util.isPrimitive(a) || util.isPrimitive(b))
    return a === b;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b))
    return false;
  var aIsArgs = isArguments(a);
  var bIsArgs = isArguments(b);
  if ((aIsArgs && !bIsArgs) || (!aIsArgs && bIsArgs))
    return false;
  if (aIsArgs) {
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b, strict);
  }
  var ka = objectKeys(a);
  var kb = objectKeys(b);
  var key, i;
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length !== kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] !== kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key], strict, actualVisitedObjects))
      return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, false)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

assert.notDeepStrictEqual = notDeepStrictEqual;
function notDeepStrictEqual(actual, expected, message) {
  if (_deepEqual(actual, expected, true)) {
    fail(actual, expected, message, 'notDeepStrictEqual', notDeepStrictEqual);
  }
}


// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  }

  try {
    if (actual instanceof expected) {
      return true;
    }
  } catch (e) {
    // Ignore.  The instanceof check doesn't work for arrow functions.
  }

  if (Error.isPrototypeOf(expected)) {
    return false;
  }

  return expected.call({}, actual) === true;
}

function _tryBlock(block) {
  var error;
  try {
    block();
  } catch (e) {
    error = e;
  }
  return error;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof block !== 'function') {
    throw new TypeError('"block" argument must be a function');
  }

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  actual = _tryBlock(block);

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  var userProvidedMessage = typeof message === 'string';
  var isUnwantedException = !shouldThrow && util.isError(actual);
  var isUnexpectedException = !shouldThrow && actual && !expected;

  if ((isUnwantedException &&
      userProvidedMessage &&
      expectedException(actual, expected)) ||
      isUnexpectedException) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws(true, block, error, message);
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws(false, block, error, message);
};

assert.ifError = function(err) { if (err) throw err; };

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"util/":68}],64:[function(require,module,exports){

},{}],65:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],66:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],67:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],68:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":67,"_process":65,"inherits":66}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9hcHBWaWV3LmpzIiwibGliL2JlaGF2aW9yLmpzIiwibGliL2JnVmlldy5qcyIsImxpYi9jYXJkVmlldy5qcyIsImxpYi9lZGl0QmFyVmlldy5qcyIsImxpYi9lZGl0TW9kYWxWaWV3LmpzIiwibGliL2VsZW1lbnRWaWV3LmpzIiwibGliL2ZpZWxkVmlldy5qcyIsImxpYi9mb3JtL2JlaGF2aW9yc1RvQ29tcG9uZW50cy5qcyIsImxpYi9mb3JtL2JnU3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vY2FyZFN0eWxlVmlldy5qcyIsImxpYi9mb3JtL2VkaXRCZWhhdmlvclZpZXcuanMiLCJsaWIvZm9ybS9lbGVtZW50U3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vZmllbGRTdHlsZVZpZXcuanMiLCJsaWIvZm9ybS9nb1RvTmV4dENhcmRDb21wb25lbnQuanMiLCJsaWIvZm9ybS9nb1RvUHJldmlvdXNDYXJkQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vaWZDb21wb25lbnRzLmpzIiwibGliL2Zvcm0vaWZMb2dpYy5qcyIsImxpYi9mb3JtL2ltYWdlU3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vanVtcFRvQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vbGlua1RvQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vcmVtb3ZlVHJ1dGhDb21wb25lbnQuanMiLCJsaWIvZm9ybS9zZXRUcnV0aENvbXBvbmVudC5qcyIsImxpYi9mb3JtL3N0YWNrQ29tYm9WaWV3LmpzIiwibGliL2dyYXBoaWNWaWV3LmpzIiwibGliL2ltYWdlVmlldy5qcyIsImxpYi9zdG9yZS9hcHBTdG9yZS5qcyIsImxpYi9zdG9yZS9iZ1N0b3JlLmpzIiwibGliL3N0b3JlL2NhcmRTdG9yZS5qcyIsImxpYi9zdG9yZS9lZGl0QmFyU3RvcmUuanMiLCJsaWIvc3RvcmUvZWRpdE1vZGFsU3RvcmUuanMiLCJsaWIvc3RvcmUvZWxlbWVudFN0b3JlLmpzIiwibGliL3N0b3JlL2ZpZWxkU3RvcmUuanMiLCJsaWIvc3RvcmUvaW1hZ2VTdG9yZS5qcyIsImxpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2JlbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jaG9vL2h0bWwuanMiLCJub2RlX21vZHVsZXMvY2hvby9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kb2N1bWVudC1yZWFkeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nbG9iYWwvZG9jdW1lbnQuanMiLCJub2RlX21vZHVsZXMvZ2xvYmFsL3dpbmRvdy5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC1hdHRyaWJ1dGUtdG8tcHJvcGVydHkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHlwZXJ4L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9idXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub2hpc3RvcnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub2hyZWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub21vcnBoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9tb3JwaC9saWIvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL25hbm9tb3JwaC9saWIvbW9ycGguanMiLCJub2RlX21vZHVsZXMvbmFub21vdW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9yYWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub3JvdXRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vdGltaW5nL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29uLWxvYWQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvYnl0ZXNUb1V1aWQuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvcm5nLWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC92MS5qcyIsIm5vZGVfbW9kdWxlcy93YXlmYXJlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy93YXlmYXJlci90cmllLmpzIiwibm9kZV9tb2R1bGVzL3h0ZW5kL2ltbXV0YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy94dGVuZC9tdXRhYmxlLmpzIiwiLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Fzc2VydC9hc3NlcnQuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwiLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy91dGlsL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9QQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFlQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBjb25zdCBhcmMgPSBuZXcgRGF0QXJjaGl2ZSh3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKSk7XG5cbi8vIGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UoYXdhaXQgYXJjLnJlYWRGaWxlKCdjb25maWcuanNvbicpKTtcblxuLy8gY29uc3Qge3JlbmRlcn0gPSByZXF1aXJlKCdsaWIvdXRpbC5qcycpO1xuLy9cbi8vIHJlbmRlcihjYXJkMSwgYXJjKTtcblxuY29uc3QgY2hvbyA9IHJlcXVpcmUoJ2Nob28nKTtcblxuY29uc3QgbWFpblZpZXcgPSByZXF1aXJlKCcuL2xpYi9hcHBWaWV3Jyk7XG5cblxubGV0IGFwcCA9IGNob28oKTtcblxuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9hcHBTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvYmdTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvY2FyZFN0b3JlJykpO1xuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9lbGVtZW50U3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2ZpZWxkU3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2VkaXRCYXJTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvZWRpdE1vZGFsU3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2ltYWdlU3RvcmUnKSk7XG5cbmFwcC5yb3V0ZSgnLycsIG1haW5WaWV3KTtcbi8vIGFwcC5yb3V0ZSgnL2NhcmQvOndoaWNoJywgZnVuY3Rpb24oc3RhdGUsIGVtaXQpIHtcbi8vICAgICByZXR1cm4gbWFpblZpZXcoc3RhdGUsIGVtaXQpO1xuLy8gfSlcblxuYXBwLm1vdW50KCdtYWluJyk7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IGJhY2tncm91bmQgPSByZXF1aXJlKCcuL2JnVmlldycpO1xuY29uc3QgY2FyZCA9IHJlcXVpcmUoJy4vY2FyZFZpZXcnKTtcbmNvbnN0IGVkaXRCYXIgPSByZXF1aXJlKCcuL2VkaXRCYXJWaWV3Jyk7XG5jb25zdCBlZGl0TW9kYWwgPSByZXF1aXJlKCcuL2VkaXRNb2RhbFZpZXcnKTtcblxuY29uc3Qge2NvbG9yfSA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5jb25zdCBtYWluVmlldyA9IGZ1bmN0aW9uKHN0YXRlLCBlbWl0KSB7XG4gICAgY29uc3QgY3VycmVudENvbG9yID0gY29sb3Ioc3RhdGUpO1xuICAgIHJldHVybiBodG1sYDxtYWluIGNsYXNzPVwiJHtzdGF0ZS5lZGl0TW9kZSB8fCBcIlwifVwiXG4gICAgICAgIHN0eWxlPVwiJHtjdXJyZW50Q29sb3IgPyBcImJhY2tncm91bmQtY29sb3I6XCIgKyBjdXJyZW50Q29sb3IgOiBcIlwifVwiPlxuICAgICAgJHshIXN0YXRlLmVkaXRNb2RlID8gZWRpdEJhcihzdGF0ZSwgZW1pdCkgOiBudWxsfVxuICAgICAgJHtiYWNrZ3JvdW5kKHN0YXRlLCBlbWl0KX1cbiAgICAgICR7Y2FyZChzdGF0ZSwgZW1pdCl9XG4gICAgICAke3N0YXRlLmVkaXRpbmdQYXRoID8gZWRpdE1vZGFsKHN0YXRlLCBlbWl0KSA6IG51bGx9XG4gICAgPC9tYWluPmA7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1haW5WaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuY29uc3QgdXVpZCA9IHJlcXVpcmUoJ3V1aWQvdjEnKTtcblxuY29uc3Qge3NlbGVjdE9wdGlvbiwgY2hlY2tCb3gsIGdldFBhdGh9ID0gcmVxdWlyZSgnLi91dGlsJyk7XG5jb25zdCB7Y29uZGl0aW9ufSA9IHJlcXVpcmUoJy4vZm9ybS9pZkNvbXBvbmVudHMnKTtcblxuY29uc3QgYmVoYXZpb3JPYmpzID0ge1xuICAgICdqdW1wVG8nOiB7J2p1bXBUbyc6IG51bGx9LFxuICAgICdpZic6IHsnaWYnOiB7XG4gICAgICAgIFwiY29uZGl0aW9uXCI6IFtdLFxuICAgICAgICBcImFjdGlvblwiOiBudWxsLFxuICAgICAgICBcImVsc2VcIjogbnVsbFxuICAgIH19LFxuICAgICdzZXRUcnV0aCc6IHsnc2V0VHJ1dGgnOiAnJ30sXG4gICAgJ3JlbW92ZVRydXRoJzogeydyZW1vdmVUcnV0aCc6ICcnfSxcbiAgICAnZ29Ub05leHRDYXJkJzogeydnb1RvTmV4dENhcmQnOiAnc3RhY2snLCAnd3JhcCc6IHRydWV9LFxuICAgICdnb1RvUHJldmlvdXNDYXJkJzogeydnb1RvUHJldmlvdXNDYXJkJzogJ3N0YWNrJywgJ3dyYXAnOiB0cnVlfSxcbiAgICAnbGlua1RvJzogeydsaW5rVG8nOiAnJ31cbn07XG5cbmNvbnN0IGJlaGF2aW9yT3BlcmF0aW9ucyA9IHtcbiAgICAnanVtcFRvJzogZnVuY3Rpb24oc3RhdGUsIGVtaXQsIGJlaGF2T2JqKSB7XG4gICAgICAgIGxldCB3aGVyZVRvID0gcGFyc2VJbnQoYmVoYXZPYmouanVtcFRvKTtcbiAgICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIod2hlcmVUbykpIHtcbiAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gd2hlcmVUbztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoZXJlVG8gPSBzdGF0ZS5jYXJkcy5maW5kSW5kZXgoXG4gICAgICAgICAgICAgICAgKGNkKSA9PiBjZC5uYW1lID09PSBiZWhhdk9iai5qdW1wVG9cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAod2hlcmVUbyA+PSAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUubmV4dENhcmQgPSB3aGVyZVRvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdCgnZ290bycpLCAxKTtcbiAgICB9LFxuICAgICdzZXRUcnV0aCc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBzdGF0ZS50cnV0aHNbYmVoYXZPYmouc2V0VHJ1dGhdID0gdHJ1ZTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgIGVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSxcbiAgICAncmVtb3ZlVHJ1dGgnOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgZGVsZXRlIHN0YXRlLnRydXRoc1tiZWhhdk9iai5yZW1vdmVUcnV0aF07XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICBlbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH0sXG4gICAgJ2dvVG9OZXh0Q2FyZCc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBpZiAoYmVoYXZPYmouZ29Ub05leHRDYXJkID09ICdiZycpIHtcbiAgICAgICAgICAgIGxldCB3aXRoSW5kZXggPSBzdGF0ZS5jYXJkcy5tYXAoKGNkLCBpbmQpID0+IE9iamVjdC5hc3NpZ24oe30sIGNkLCB7aW5kZXg6IGluZH0pKTtcbiAgICAgICAgICAgIGxldCBzYW1lc2llcyA9IHdpdGhJbmRleC5maWx0ZXIoKGNkKSA9PlxuICAgICAgICAgICAgICAgIGNkLmluZGV4ID4gc3RhdGUuY3VycmVudENhcmQgJiZcbiAgICAgICAgICAgICAgICAgICAgY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdLmJhY2tncm91bmRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoIXNhbWVzaWVzLmxlbmd0aCAmJiBiZWhhdk9iai53cmFwKSB7XG4gICAgICAgICAgICAgICAgc2FtZXNpZXMgPSB3aXRoSW5kZXguZmlsdGVyKChjZCkgPT5cbiAgICAgICAgICAgICAgICAgICAgY2QuaW5kZXggPCBzdGF0ZS5jdXJyZW50Q2FyZCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdLmJhY2tncm91bmRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNhbWVzaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gc2FtZXNpZXNbMF0uaW5kZXg7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvTmV4dENhcmQnLCAhIWJlaGF2T2JqLndyYXApLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2dvVG9QcmV2aW91c0NhcmQnOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgaWYgKGJlaGF2T2JqLmdvVG9QcmV2aW91c0NhcmQgPT0gJ2JnJykge1xuICAgICAgICAgICAgbGV0IHdpdGhJbmRleCA9IHN0YXRlLmNhcmRzLm1hcCgoY2QsIGluZCkgPT4gT2JqZWN0LmFzc2lnbih7fSwgY2QsIHtpbmRleDogaW5kfSkpO1xuICAgICAgICAgICAgbGV0IHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgY2QuaW5kZXggPCBzdGF0ZS5jdXJyZW50Q2FyZCAmJiBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5jYXJkLmJhY2tncm91bmRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoIXNhbWVzaWVzLmxlbmd0aCAmJiBiZWhhdk9iai53cmFwKSB7XG4gICAgICAgICAgICAgICAgc2FtZXNpZXMgPSB3aXRoSW5kZXguZmlsdGVyKChjZCkgPT5cbiAgICAgICAgICAgICAgICAgICAgY2QuaW5kZXggPiBzdGF0ZS5jdXJyZW50Q2FyZCAmJiBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5jYXJkLmJhY2tncm91bmRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNhbWVzaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gc2FtZXNpZXNbc2FtZXNpZXMubGVuZ3RoIC0gMV0uaW5kZXg7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvUHJldkNhcmQnLCAhIWJlaGF2T2JqLndyYXApLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2xpbmtUbyc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGlua3lwb28gPSBuZXcgVVJMKGJlaGF2T2JqLmxpbmtUbyk7XG4gICAgICAgICAgICBpZiAoWydodHRwOicsJ2h0dHBzOicsJ2RhdDonXS5pbmNsdWRlcyhsaW5reXBvby5wcm90b2NvbCkpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHdpbmRvdy5sb2NhdGlvbiA9IGxpbmt5cG9vLmhyZWYsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIC8vIG5vdCBhIHVybCB5YXlcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbmNvbnN0IGJlaGF2aW9yQ29tcG9uZW50cyA9IHJlcXVpcmUoJy4vZm9ybS9iZWhhdmlvcnNUb0NvbXBvbmVudHMnKTtcblxuLypcbkdpdmVuIGEgYmVoYXZBcnIgdGhhdCBsb29rcyBzb21ldGhpbmcgbGlrZTogW1xuICAgIHtcbiAgICAgICAgXCJzZXRUcnV0aFwiOiBcImhhc1Rlc3RlZE90aGVyRmllbGRcIlxuICAgIH0sXG4gICAge1xuICAgICAgICBcImlmXCI6IHtcbiAgICAgICAgICAgIFwiY29uZGl0aW9uXCI6IFt7XCJvdGhlckZpZWxkXCI6IFwieWVzXCJ9XSxcbiAgICAgICAgICAgIFwiYWN0aW9uXCI6IHtcImp1bXBUb1wiOiAxfSxcbiAgICAgICAgICAgIFwiZWxzZVwiOiB7XCJqdW1wVG9cIjogMH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAge1xuICAgICAgICBcImp1bXBUb1wiOiAwXG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwiZGVzdHJveVRydXRoXCI6IFwiaGFzVGVzdGVkT3RoZXJGaWVsZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwidXJsXCI6IFwiZGF0Oi8vMzJhLi4uNDRlXCIgLy8gb3IgaHR0cCwgdGhhdCdzIG5vdCB0aGUgcG9pbnRcbiAgICB9XG5dXG5wYXJzZUFuZFJ1bkJlaGF2aW9ycyB3aWxsIHRha2UgZWFjaCBpbiBvcmRlciwgcmVhZCB0aGVtIHRvIHNlZSBob3cgaXQgc2hvdWxkIGFsdGVyXG5hIGdpdmVuIHN0YXRlIGhhc2gsIGFuZCB0aGVuIGRvIHNvLCBzb21ldGltZXMgYnkgZmlyaW5nIGV2ZW50cyB3aXRoIGEgZ2l2ZW4gZW1pdFxuZnVuY3Rpb24uXG5cblNvbWUgbW9yZSBoYWlycyBvbiB0aGUgYmVoYXZBcnIgb2JqZWN0IHN5bnRheDpcblxuaWY6IHtcbiAgICBjb25kaXRpb246IFsnbmFtZU9mQVRydXRoJywgJ25hbWVPZkFub3RoZXJUcnV0aCddLFxuICAgIGNvbmRpdGlvbjogWyd0cnV0aDEnLCB7J290aGVyRmllbGQnOiAneWVzJ30sICd0cnV0aDInXSxcbiAgICBjb25kaXRpb246IFsndHJ1dGgzJywgeydvdGhlckZpZWxkJzoge2d0OiA1LCBsdGU6IDMwfX0sIHsnZmlmdGhGaWVsZCc6IHtjb250YWluczogJ28nfX1dLFxuICAgIC8vIGFsbCB3b3JrXG5cbiAgICBjb25kaXRpb246IHtcIm9yXCI6IFt7J25hbWUnOiAnZGF2ZSd9LCB7J2pvYic6ICdqYW5pdG9yJ31dfSAvLyBnb2VzIG9mZiBmb3IgYWxsIGRhdmVzIGFuZCBqYW5pdG9yc1xuICAgIGNvbmRpdGlvbjoge1wib3JcIjogW3snbmFtZSc6ICdkYXZlJ30sIHsnbmFtZSc6ICdqaW0nfV19LCAvLyBib3RoIG5hbWVzXG4gICAgY29uZGl0aW9uOiB7XCJvclwiOiBbJ3RydXRoMScsICd0cnV0aDInXX0gLy8gZWl0aGVyIHRydXRoLiB5b3UgY2FuIHN0aWxsIG1peCBhbiBvYmogaW4sIHRvb1xufVxuXG5BbHNvIHlvdSBjYW4ganVtcFRvIGEgY2FyZCBieSBuYW1lOiB7ICdqdW1wVG8nOiAnYXJ0aHVyJyB9XG4gKi9cbmNvbnN0IHtldmFsQ29uZGl0aW9ufSA9IHJlcXVpcmUoJy4vZm9ybS9pZkxvZ2ljJyk7XG5cbmNvbnN0IHBhcnNlQW5kUnVuQmVoYXZpb3JzID0gZnVuY3Rpb24oc3RhdGUsIGVtaXQsIGJlaGF2QXJyKSB7XG5cbiAgICBjb25zdCBkb0JlaGF2aW9yID0gKGJlaGF2T2JqKSA9PiB7XG4gICAgICAgIGlmIChiZWhhdk9ialsnaWYnXSkge1xuICAgICAgICAgICAgaWYgKGV2YWxDb25kaXRpb24oc3RhdGUsIGJlaGF2T2JqWydpZiddLmNvbmRpdGlvbikpIHtcbiAgICAgICAgICAgICAgICBkb0JlaGF2aW9yKGJlaGF2T2JqWydpZiddLmFjdGlvbik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChiZWhhdk9ialsnaWYnXVsnZWxzZSddKSB7XG4gICAgICAgICAgICAgICAgICAgIGRvQmVoYXZpb3IoYmVoYXZPYmpbJ2lmJ11bJ2Vsc2UnXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgbWFnaWNLZXkgPSBPYmplY3Qua2V5cyhiZWhhdmlvck9wZXJhdGlvbnMpLmZpbmQoKGtleSkgPT5cbiAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyhiZWhhdk9iaikuaW5jbHVkZXMoa2V5KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGJlaGF2aW9yT3BlcmF0aW9uc1ttYWdpY0tleV0uY2FsbChudWxsLCBzdGF0ZSwgZW1pdCwgYmVoYXZPYmopO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGJlaGF2QXJyLmZvckVhY2goZG9CZWhhdmlvcik7XG59XG5cbmNvbnN0IGJlaGF2aW9yID0gZnVuY3Rpb24oc3RhdGUsIGVtaXQsIHBhdGgpIHtcbiAgICBjb25zdCBzYWZldHlQYXRoID0gW10uY29uY2F0KHBhdGgpO1xuICAgIGNvbnN0IGJlaGF2ID0gZ2V0UGF0aChzdGF0ZSwgc2FmZXR5UGF0aCk7XG5cbiAgICBsZXQgYmVoYXZUeXBlO1xuXG4gICAgaWYgKHR5cGVvZiBiZWhhdiA9PT0gJ3VuZGVmaW5lZCcgfHwgYmVoYXYgPT0gbnVsbCkge1xuICAgICAgICBiZWhhdlR5cGUgPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHdoYXRXZUdvdCA9IE9iamVjdC5rZXlzKGJlaGF2KTtcbiAgICAgICAgaWYgKCF3aGF0V2VHb3QubGVuZ3RoKSB7XG4gICAgICAgICAgICBiZWhhdlR5cGUgPSBudWxsO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHR5cGVzID0gT2JqZWN0LmtleXMoYmVoYXZpb3JDb21wb25lbnRzKTtcbiAgICAgICAgdHlwZXMuZm9yRWFjaCgodHlwZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHdoYXRXZUdvdC5pbmNsdWRlcyh0eXBlKSkge1xuICAgICAgICAgICAgICAgIGJlaGF2VHlwZSA9IHR5cGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IG1lbnUgPSBiZWhhdlR5cGVNZW51KGJlaGF2VHlwZSwgc2FmZXR5UGF0aCwgc2V0QmVoYXZpb3JUeXBlKTtcbiAgICByZXR1cm4gaHRtbGA8ZGl2IGNsYXNzPVwiYmVoYXZpb3IgJHsnYmVoYXYtJyArIGJlaGF2VHlwZX1cIj5cbiAgICAgICAgJHttZW51fVxuICAgICAgICAke2JlaGF2VHlwZSA9PT0gJ2lmJ1xuICAgICAgICAgICAgPyBpZlNoZWxsKHN0YXRlLCBlbWl0LCBiZWhhdiwgc2FmZXR5UGF0aClcbiAgICAgICAgICAgIDogKGJlaGF2VHlwZSAhPT0gbnVsbFxuICAgICAgICAgICAgICAgID8gYmVoYXZpb3JDb21wb25lbnRzW2JlaGF2VHlwZV0uY2FsbChudWxsLCBzdGF0ZSwgZW1pdCwgYmVoYXYsIHNhZmV0eVBhdGgpXG4gICAgICAgICAgICAgICAgOiBudWxsKX1cbiAgICA8L2Rpdj5gO1xuXG4gICAgZnVuY3Rpb24gc2V0QmVoYXZpb3JUeXBlKHBhdGgsIHZhbHVlKSB7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGJlaGF2aW9yT2Jqc1t2YWx1ZV1dKTtcbiAgICB9XG59O1xuXG5mdW5jdGlvbiBpZlNoZWxsKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIHJldHVybiBodG1sYDxkaXY+XG4gICAgICAgIDxkaXY+XG4gICAgICAgICAgICAke2NvbmRpdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZbJ2lmJ10uY29uZGl0aW9uLCBwYXRoLmNvbmNhdChbJ2lmJywgJ2NvbmRpdGlvbiddKSl9XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8dWwgY2xhc3M9XCJiZWhhdmlvcnNcIj5cbiAgICAgICAgICAgIDxsaT5EbyB0aGUgYmVoYXZpb3I6XG4gICAgICAgICAgICAgICAgJHtiZWhhdmlvcihzdGF0ZSwgZW1pdCwgcGF0aC5jb25jYXQoWydpZicsICdhY3Rpb24nXSkpfVxuICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICAgIDxsaT5PdGhlcndpc2UsIGRvOlxuICAgICAgICAgICAgICAgICR7YmVoYXZpb3Ioc3RhdGUsIGVtaXQsIHBhdGguY29uY2F0KFsnaWYnLCAnZWxzZSddKSl9XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICA8L3VsPlxuICAgIDwvZGl2PmA7XG59XG5cbmZ1bmN0aW9uIGJlaGF2aW9yTGlzdChzdGF0ZSwgZW1pdCwgYmVoYXZpb3JzLCBwYXRoKSB7XG4gICAgY29uc3QgcmV0ID0gaHRtbGA8dWwgY2xhc3M9XCJiZWhhdmlvcnNcIj5cbiAgICAgICAgJHtiZWhhdmlvcnMubWFwKChiZWhhdiwgaW5kKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gaHRtbGA8bGk+XG4gICAgICAgICAgICAgICR7YmVoYXZpb3Ioc3RhdGUsIGVtaXQsIHBhdGguY29uY2F0KFtpbmRdKSl9XG4gICAgICAgICAgICA8L2xpPmA7XG4gICAgICAgIH0pfVxuICAgICAgICA8YnV0dG9uIGNsYXNzPVwiYWRkLWJlaGF2aW9yXCIgb25jbGljaz0ke2FkZEhhbmRsZXJ9Pis8L2J1dHRvbj5cbiAgICA8L3VsPmA7XG4gICAgcmV0dXJuIHJldDtcblxuICAgIGZ1bmN0aW9uIGFkZEhhbmRsZXIoKSB7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGJlaGF2aW9ycy5jb25jYXQoW251bGxdKV0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBiZWhhdlR5cGVNZW51KHNlbGVjdFR5cGUsIHBhdGgsIGhhbmRsZXIpIHtcbiAgICBsZXQgb3B0cyA9IFtzZWxlY3RPcHRpb24obnVsbCwgJy0nLCBzZWxlY3RUeXBlKV07XG4gICAgZm9yIChjb25zdCBiZWhhdmlvcktleSBvZiBPYmplY3Qua2V5cyhiZWhhdmlvckNvbXBvbmVudHMpKSB7XG4gICAgICAgIG9wdHMucHVzaChzZWxlY3RPcHRpb24oYmVoYXZpb3JLZXksIHNlbGVjdFR5cGUpKTtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPHNlbGVjdCBkYXRhLXJlYWx2YWx1ZT1cIiR7c2VsZWN0VHlwZX1cIiBuYW1lPVwiJHtuYW1lfVwiIG9uY2hhbmdlPSR7KGUpID0+IGhhbmRsZXIocGF0aCwgZS50YXJnZXQudmFsdWUpfT5cbiAgICAgICAgJHtvcHRzfVxuICAgIDwvc2VsZWN0PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge3BhcnNlQW5kUnVuQmVoYXZpb3JzLCBiZWhhdmlvciwgYmVoYXZUeXBlTWVudSwgYmVoYXZpb3JMaXN0fTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3QgSW1hZ2UgPSByZXF1aXJlKCcuL2ltYWdlVmlldy5qcycpO1xuY29uc3QgR3JhcGhpY0VsZW1lbnQgPSByZXF1aXJlKCcuL2dyYXBoaWNWaWV3LmpzJyk7XG5jb25zdCBFbGVtZW50ID0gcmVxdWlyZSgnLi9lbGVtZW50Vmlldy5qcycpO1xuY29uc3QgRmllbGQgPSByZXF1aXJlKCcuL2ZpZWxkVmlldy5qcycpO1xuXG5cbmNvbnN0IGJnVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICByZXR1cm4gaHRtbGA8c2VjdGlvbiBpZD1cImJnXCI+XG4gICAgICAke2RyYXdJbWFnZXMoKX1cbiAgICAgICR7ZHJhd0VsZW1lbnRzKCl9XG4gICAgICAke2RyYXdGaWVsZHMoKX1cbiAgICA8L3NlY3Rpb24+YDtcblxuICBmdW5jdGlvbiBkcmF3SW1hZ2VzKCkge1xuICAgIGlmIChzdGF0ZS5iYWNrZ3JvdW5kICYmIHN0YXRlLmJhY2tncm91bmQuaW1hZ2VzKSB7XG4gICAgICByZXR1cm4gc3RhdGUuYmFja2dyb3VuZC5pbWFnZXMubWFwKChlbG0sIGluZCkgPT5cbiAgICAgICAgICAgIEltYWdlKGVsbSwgaW5kLCBzdGF0ZSwgZW1pdClcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPGRpdiBpZD1cImJnLW5vLWltYWdlc1wiPjwvZGl2PmA7XG4gIH1cblxuICBmdW5jdGlvbiBkcmF3RWxlbWVudHMoKSB7XG4gICAgaWYgKHN0YXRlLmJhY2tncm91bmQgJiYgc3RhdGUuYmFja2dyb3VuZC5lbGVtZW50cykge1xuICAgICAgcmV0dXJuIHN0YXRlLmJhY2tncm91bmQuZWxlbWVudHMubWFwKChidXQsIGluZCkgPT5cbiAgICAgICAgICBFbGVtZW50KGJ1dCwgaW5kLCBzdGF0ZSwgZW1pdClcbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBodG1sYDxzcGFuIGNsYXNzPVwiYmctbm8tZWxlbWVudHNcIj48L3NwYW4+YDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRyYXdGaWVsZHMoKSB7XG4gICAgaWYgKHN0YXRlLmJhY2tncm91bmQgJiYgc3RhdGUuYmFja2dyb3VuZC5maWVsZHMpIHtcbiAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZS5iYWNrZ3JvdW5kLmZpZWxkcykubWFwKChmbGROYW1lKSA9PiB7XG4gICAgICAgICAgbGV0IGZpZWxkV2l0aFZhbHVlTWF5YmUgPSBPYmplY3QuYXNzaWduKHt9LFxuICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZC5maWVsZHNbZmxkTmFtZV0sXG4gICAgICAgICAgICB7dmFsdWU6IHN0YXRlLmNhcmQudmFsdWVzW2ZsZE5hbWVdIHx8ICcnfVxuICAgICAgICAgICk7XG4gICAgICAgICAgcmV0dXJuIEZpZWxkKGZpZWxkV2l0aFZhbHVlTWF5YmUsIGZsZE5hbWUsIHN0YXRlLCBlbWl0KTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPHNwYW4gY2xhc3M9XCJiZy1uby1maWVsZHNcIj48L3NwYW4+YDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBiZ1ZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IEltYWdlID0gcmVxdWlyZSgnLi9pbWFnZVZpZXcuanMnKTtcbmNvbnN0IEdyYXBoaWNFbGVtZW50ID0gcmVxdWlyZSgnLi9ncmFwaGljVmlldy5qcycpO1xuY29uc3QgRWxlbWVudCA9IHJlcXVpcmUoJy4vZWxlbWVudFZpZXcuanMnKTtcbmNvbnN0IEZpZWxkID0gcmVxdWlyZSgnLi9maWVsZFZpZXcuanMnKTtcblxuXG5jb25zdCBjYXJkVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICByZXR1cm4gaHRtbGBcbiAgICA8YXJ0aWNsZSBpZD1cImNhcmRcIj5cbiAgICAgICR7ZHJhd0ltYWdlcygpfVxuICAgICAgJHtkcmF3RWxlbWVudHMoKX1cbiAgICAgICR7ZHJhd0ZpZWxkcygpfVxuICAgIDwvYXJ0aWNsZT5cbiAgYDtcblxuICBmdW5jdGlvbiBkcmF3SW1hZ2VzKCkge1xuICAgIGlmIChzdGF0ZS5jYXJkICYmIHN0YXRlLmNhcmQuaW1hZ2VzKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkLmltYWdlcy5tYXAoKGVsbSwgaW5kKSA9PlxuICAgICAgICAgICAgSW1hZ2UoZWxtLCBpbmQsIHN0YXRlLCBlbWl0LCB0cnVlKVxuICAgICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gaHRtbGA8ZGl2IGlkPVwiY2FyZC1uby1pbWFnZXNcIj48L2Rpdj5gXG4gIH1cblxuICBmdW5jdGlvbiBkcmF3RWxlbWVudHMoKSB7XG4gICAgICBpZiAoc3RhdGUuY2FyZCAmJiBzdGF0ZS5jYXJkLmVsZW1lbnRzKSB7XG4gICAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmQuZWxlbWVudHMubWFwKChidXQsIGluZCkgPT5cbiAgICAgICAgICAgICAgRWxlbWVudChidXQsIGluZCwgc3RhdGUsIGVtaXQsIHRydWUpXG4gICAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBodG1sYDxzcGFuIGlkPVwiY2FyZC1uby1lbGVtZW50c1wiPjwvc3Bhbj5gXG4gIH1cblxuICBmdW5jdGlvbiBkcmF3RmllbGRzKCkge1xuICAgICAgaWYgKHN0YXRlLmNhcmQgJiYgc3RhdGUuY2FyZC5maWVsZHMpIHtcbiAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGUuY2FyZC5maWVsZHMpLm1hcCgoZmxkTmFtZSkgPT5cbiAgICAgICAgICAgICAgRmllbGQoc3RhdGUuY2FyZC5maWVsZHNbZmxkTmFtZV0sIGZsZE5hbWUsIHN0YXRlLCBlbWl0LCB0cnVlKVxuICAgICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaHRtbGA8c3BhbiBpZD1cImNhcmQtbm8tZmllbGRzXCI+PC9zcGFuPmBcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjYXJkVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKFwiY2hvby9odG1sXCIpO1xuXG5jb25zdCBlZGl0QmFyVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICAgIGNvbnN0IGVja3MgPSBodG1sYDxhIGhyZWY9XCIjXCIgb25jbGljaz0keygpID0+IGVtaXQoJ3R1cm5PZmZFZGl0TW9kZScpfT48L2E+YDtcbiAgICBlY2tzLmlubmVySFRNTCA9ICcmdGltZXM7JztcblxuICAgIHJldHVybiBodG1sYDxuYXYgaWQ9XCJlZGl0YmFyXCI+XG4gICAgICA8YXNpZGUgY2xhc3M9XCJyZWFkb3V0XCI+XG4gICAgICAgIERhbm55IDAuMSDwn5Gm8J+PvjxiciAvPlxuICAgICAgICAke3N0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0J1xuICAgICAgICAgICAgPyBodG1sYDxzcGFuPkJnICR7c3RhdGUuY3VycmVudEJhY2tncm91bmR9IG9mICR7c3RhdGUuYmFja2dyb3VuZHMubGVuZ3RofTwvc3Bhbj5gXG4gICAgICAgICAgICA6IGh0bWxgPHNwYW4+Q2FyZCAke3N0YXRlLmN1cnJlbnRDYXJkfSBvZiAke3N0YXRlLmNhcmRzLmxlbmd0aH08L3NwYW4+YFxuICAgICAgICB9XG4gICAgICA8L2FzaWRlPlxuXG4gICAgICA8dWw+XG4gICAgICAgIDxsaT5DcmVhdGUgbmV3OlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3RWxlbWVudCcpO3JldHVybiBmYWxzZX19PkVsZW1lbnQ8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge2VtaXQoJ25ld0ltYWdlJyk7cmV0dXJuIGZhbHNlfX0+SW1hZ2U8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge2VtaXQoJ25ld0ZpZWxkJyk7cmV0dXJuIGZhbHNlfX0+RmllbGQ8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge2VtaXQoJ25ld0JnJyk7cmV0dXJuIGZhbHNlfX0+QmFja2dyb3VuZDwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3Q2FyZCcpO3JldHVybiBmYWxzZX19PkNhcmQ8L2J1dHRvbj48L2xpPlxuICAgICAgICA8bGkgY2xhc3M9XCJiZ21vZGVcIj48YSBocmVmPVwiI1wiIG9uY2xpY2s9JHsoKSA9PiBlbWl0KFwiZWRpdEJnTW9kZVwiKX0+XG4gICAgICAgICAgICAke3N0YXRlLmVkaXRNb2RlID09ICdiZ0VkaXQnID8gJ0NhcmQnIDogJ0JhY2tncm91bmQnfSBtb2RlXG4gICAgICAgIDwvYT48L2xpPlxuICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIiBvbmNsaWNrPSR7KCkgPT4gZW1pdChzdGF0ZS5lZGl0TW9kZSA9PSAnYmdFZGl0JyA/ICdlZGl0QmcnIDonZWRpdENhcmQnKX0+XG4gICAgICAgICAgICBFZGl0ICR7c3RhdGUuZWRpdE1vZGUgPT0gJ2JnRWRpdCcgPyAnYmFja2dyb3VuZCcgOiAnY2FyZCd9XG4gICAgICAgIDwvYT48L2xpPlxuICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIiBvbmNsaWNrPSR7KCkgPT4gZW1pdChcImVkaXRTdGFja1wiKX0+RWRpdCBzdGFjazwvYT48L2xpPlxuICAgICAgICA8bGkgY2xhc3M9XCJjbG9zZVwiPiR7ZWNrc308L2xpPlxuICAgICAgPC91bD5cbiAgICAgICR7c3RhdGUuYWRkaW5nSW1hZ2UgPyBkcm9wSW1hZ2UoKSA6IFwiXCJ9XG4gICAgPC9uYXY+YDtcblxuICAgIGZ1bmN0aW9uIGRyb3BJbWFnZSgpIHtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGZvcm0gaWQ9XCJhZGRpbWFnZVwiPlxuICAgICAgICAgICAgQ2hvb3NlIG9yIGRyb3A6IDxpbnB1dCB0eXBlPVwiZmlsZVwiXG4gICAgICAgICAgICAgIG9uY2hhbmdlPSR7ZSA9PiBjaGFuZ2VIYW5kbGVyKGUpfVxuICAgICAgICAgICAgICBjbGFzcz1cIiR7c3RhdGUuaG92ZXJpbmdJbWFnZSA/IFwiZHJvcGhvdmVyXCIgOiBcIlwifVwiIC8+XG4gICAgICAgICAgICBPciBzZWxlY3QgZXhpc3Rpbmc6XG4gICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJleGlzdGluZ0ltYWdlXCI+XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgb25jbGljaz0ke2NhbmNlbEltYWdlfSBzdHlsZT1cInBhZGRpbmctbGVmdDoxMnJlbTtjb2xvcjpyZWQ7XCI+Q2FuY2VsPC9hPlxuICAgICAgICA8L2Zvcm0+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjaGFuZ2VIYW5kbGVyKGV2ZW50KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiY2hhbmdlSGFuZGxlclwiKTtcbiAgICAgICAgZW1pdChcImFkZEltYWdlXCIsIFtldmVudF0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhbmNlbEltYWdlKCkge1xuICAgICAgICBzdGF0ZS5hZGRpbmdJbWFnZSA9IGZhbHNlO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXQoXCJyZW5kZXJcIiksIDEpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZWRpdEJhclZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZShcImNob28vaHRtbFwiKTtcblxuY29uc3QgZWxlbWVudFN0eWxlVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vZWxlbWVudFN0eWxlVmlldy5qc1wiKTtcbmNvbnN0IGltYWdlU3R5bGVWaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9pbWFnZVN0eWxlVmlldy5qc1wiKTtcbmNvbnN0IGZpZWxkU3R5bGVWaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9maWVsZFN0eWxlVmlldy5qc1wiKTtcbmNvbnN0IGVkaXRCZWhhdmlvclZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2VkaXRCZWhhdmlvclZpZXcuanNcIik7XG5jb25zdCBmaWVsZEJlaGF2aW9yVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vZWRpdEJlaGF2aW9yVmlldy5qc1wiKTtcblxuY29uc3QgY2FyZFN0eWxlVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vY2FyZFN0eWxlVmlldy5qc1wiKTtcbmNvbnN0IGJnU3R5bGVWaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9iZ1N0eWxlVmlldy5qc1wiKTtcblxuY29uc3Qgc3RhY2tDb21ib1ZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL3N0YWNrQ29tYm9WaWV3LmpzXCIpO1xuXG5jb25zdCB3aGljaFZpZXdNYXRyaXggPSB7XG4gICAgc3R5bGU6IHtcbiAgICAgICAgZWxlbWVudDogZWxlbWVudFN0eWxlVmlldyxcbiAgICAgICAgZmllbGQ6IGZpZWxkU3R5bGVWaWV3LFxuICAgICAgICBpbWFnZTogaW1hZ2VTdHlsZVZpZXcsXG4gICAgICAgIGNhcmQ6IGNhcmRTdHlsZVZpZXcsXG4gICAgICAgIGJnOiBiZ1N0eWxlVmlldyxcbiAgICAgICAgc3RhY2s6IHN0YWNrQ29tYm9WaWV3XG4gICAgfSxcbiAgICBmdW5jdGlvbjoge1xuICAgICAgICBlbGVtZW50OiBlZGl0QmVoYXZpb3JWaWV3LFxuICAgICAgICBmaWVsZDogZmllbGRCZWhhdmlvclZpZXcsXG4gICAgICAgIGltYWdlOiBlZGl0QmVoYXZpb3JWaWV3LFxuICAgICAgICBjYXJkOiBlZGl0QmVoYXZpb3JWaWV3LFxuICAgICAgICBiZzogZWRpdEJlaGF2aW9yVmlldyxcbiAgICAgICAgc3RhY2s6IHN0YWNrQ29tYm9WaWV3XG4gICAgfVxufTtcblxuY29uc3QgZWRpdE1vZGFsVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICAgIGxldCB3aGljaDtcbiAgICBpZiAoc3RhdGUuZWRpdGluZ0VsZW1lbnQpIHtcbiAgICAgICAgd2hpY2ggPSBcImVsZW1lbnRcIjtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmVkaXRpbmdGaWVsZCkge1xuICAgICAgICB3aGljaCA9IFwiZmllbGRcIjtcbiAgICB9IGVsc2UgaWYgKHN0YXRlLmVkaXRpbmdJbWFnZSkge1xuICAgICAgICB3aGljaCA9IFwiaW1hZ2VcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT0gJ2NhcmRzJykge1xuICAgICAgICAgICAgd2hpY2ggPSBcImNhcmRcIjtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5lZGl0aW5nUGF0aFswXSA9PSAnYmFja2dyb3VuZHMnKSB7XG4gICAgICAgICAgICB3aGljaCA9IFwiYmdcIjtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5lZGl0aW5nUGF0aFswXSA9PSAnc3RhY2snKSB7XG4gICAgICAgICAgICB3aGljaCA9IFwic3RhY2tcIjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IGVja3MgPSBodG1sYDxhIGNsYXNzPVwiY2xvc2VcIiBocmVmPVwiI1wiIG9uY2xpY2s9JHsoKSA9PiBlbWl0KCdjbG9zZUVkaXQnKX0+PC9hPmA7XG4gICAgZWNrcy5pbm5lckhUTUwgPSAnJnRpbWVzOyc7XG5cbiAgICByZXR1cm4gaHRtbGA8c2VjdGlvbiBpZD1cImVkaXRtb2RhbFwiPlxuICAgICAgJHtlY2tzfVxuXG4gICAgICAke3doaWNoID09ICdzdGFjaydcbiAgICAgICAgPyBudWxsXG4gICAgICAgIDogaHRtbGA8dWwgaWQ9XCJlZGl0TW9kYWxUYWJzXCI+XG4gICAgICAgICAgICA8bGkgY2xhc3M9XCIke3N0YXRlLmVkaXRpbmdGdW5jdGlvbiA/IFwiXCIgOiBcImhpbGl0ZWRcIn1cIlxuICAgICAgICAgICAgICAgIG9uY2xpY2s9JHsoKSA9PiB0b2dnbGVGdW5jdGlvbkVkaXQoJ3N0eWxlJyl9PlxuICAgICAgICAgICAgICAgIFN0eWxlXG4gICAgICAgICAgICA8L2xpPjxsaSBjbGFzcz1cIiR7c3RhdGUuZWRpdGluZ0Z1bmN0aW9uID8gXCJoaWxpdGVkXCIgOiBcIlwifVwiXG4gICAgICAgICAgICAgICAgb25jbGljaz0keygpID0+IHRvZ2dsZUZ1bmN0aW9uRWRpdCgpfT5cbiAgICAgICAgICAgICAgICBCZWhhdmlvclxuICAgICAgICAgICAgPC9saT5cbiAgICAgICAgICA8L3VsPmB9XG5cbiAgICAgICR7c3RhdGUuZWRpdGluZ0Z1bmN0aW9uXG4gICAgICAgICAgPyB3aGljaFZpZXdNYXRyaXguZnVuY3Rpb25bd2hpY2hdLmNhbGwobnVsbCwgc3RhdGUsIGVtaXQpXG4gICAgICAgICAgOiB3aGljaFZpZXdNYXRyaXguc3R5bGVbd2hpY2hdLmNhbGwobnVsbCwgc3RhdGUsIGVtaXQpfVxuICAgIDwvc2VjdGlvbj5gO1xuXG4gICAgZnVuY3Rpb24gdG9nZ2xlRnVuY3Rpb25FZGl0KHdoZXJlID0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb25zdCBpc2l0b24gPSBzdGF0ZS5lZGl0aW5nRnVuY3Rpb247XG4gICAgICAgIGlmICgoaXNpdG9uICYmIHdoZXJlID09ICdzdHlsZScpIHx8ICghaXNpdG9uICYmIHdoZXJlID09ICdmdW5jdGlvbicpKSB7XG4gICAgICAgICAgICBlbWl0KCd0b2dnbGVGdW5jdGlvbkVkaXQnKTtcbiAgICAgICAgfSAvLyBpIGRvbid0IGtub3csIGlzIHRoYXQgZHVtYj9cbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVkaXRNb2RhbFZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9yc30gPSByZXF1aXJlKCcuL2JlaGF2aW9yLmpzJyk7XG5cblxuY29uc3QgZW5zdXJlU3R5bGVQaXhlbHMgPSAodmFsKSA9PiB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT0gJ251bWJlcicgPyB2YWwgKyAncHgnIDogdmFsO1xufVxuXG5jb25zdCBlbGVtZW50VmlldyA9IChlbGVtZW50LCBpbmRleCwgc3RhdGUsIGVtaXQsIGlzQ2FyZCkgPT4ge1xuICAgIGxldCBlbGVtZW50SXNCYXNpYyA9ICFlbGVtZW50LnN0eWxlICYmIGVsZW1lbnQudGV4dDtcbiAgICBsZXQgYXR0cnMgPSB7XG4gICAgICAgIGhlaWdodDogZW5zdXJlU3R5bGVQaXhlbHMoZWxlbWVudC5oZWlnaHQpLFxuICAgICAgICB3aWR0aDogZW5zdXJlU3R5bGVQaXhlbHMoZWxlbWVudC53aWR0aCksXG4gICAgICAgIHRvcDogZW5zdXJlU3R5bGVQaXhlbHMoZWxlbWVudC50b3ApLFxuICAgICAgICBsZWZ0OiBlbnN1cmVTdHlsZVBpeGVscyhlbGVtZW50LmxlZnQpLFxuICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IGVsZW1lbnQuY29sb3IsXG4gICAgICAgICdmb250LWZhbWlseSc6IGVsZW1lbnQuZm9udCxcbiAgICAgICAgJ2ZvbnQtc2l6ZSc6IGVsZW1lbnQuc2l6ZSxcbiAgICAgICAgJ2ZvbnQtc3R5bGUnOiBlbGVtZW50LnN0eWxlLFxuICAgICAgICBjb2xvcjogZWxlbWVudC50ZXh0Q29sb3JcbiAgICB9OyAvLyB0aGlzIGRhdGEgbXVuZ2Ugc3RlcCBtYXkgYmVsb25nIGluIGEgc3RvcmU/XG4gICAgbGV0IGVsZW1lbnRTdHlsZXMgPSBPYmplY3Qua2V5cyhhdHRycykubWFwKChrZXkpID0+IChrZXkgKyAnOicgKyBhdHRyc1trZXldICsgJzsnKSkuam9pbignJyk7XG4gICAgaWYgKGVsZW1lbnQuc3R5bGUpIHtcbiAgICAgICAgZWxlbWVudFN0eWxlcyArPSBlbGVtZW50LnN0eWxlO1xuICAgIH1cblxuICAgIGxldCBjbGlja0hhbmRsZXIgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoZXZlbnQuYWx0S2V5IHx8XG4gICAgICAgICAgICAoc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZScgJiYgaXNDYXJkKSB8fFxuICAgICAgICAgICAgKHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JyAmJiAhaXNDYXJkKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIGVkaXRFbGVtZW50KCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5iZWhhdmlvciAmJiBlbGVtZW50LmJlaGF2aW9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFyc2VBbmRSdW5CZWhhdmlvcnMoc3RhdGUsIGVtaXQsIGVsZW1lbnQuYmVoYXZpb3IpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGlmIChpc0RyYWdnYWJsZSgpKSB7XG4gICAgICAgIHJldHVybiBodG1sYDxkaXYgY2xhc3M9XCJlbGVtZW50IG1vdmFibGUgJHtlbGVtZW50Q2xhc3NlcygpfVwiXG4gICAgICAgICAgICBvbmNsaWNrPSR7KGUpID0+IGVkaXRNb2RlQ2xpY2soZSl9XG4gICAgICAgICAgICBvbm1vdXNlZG93bj0keyhlKSA9PiBtb3VzZURvd24oZSl9XG4gICAgICAgICAgICBvbm1vdXNlbGVhdmU9JHsoZSkgPT4gbW91c2VMZWF2ZShlKX1cbiAgICAgICAgICAgIG9ubW91c2V1cD0keyhlKSA9PiBtb3VzZVVwKGUpfVxuICAgICAgICAgICAgc3R5bGU9XCIke2VsZW1lbnRTdHlsZXN9XCI+JHtlbGVtZW50LnRleHR9PC9kaXY+YDtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPGRpdiBjbGFzcz1cImVsZW1lbnQgJHtlbGVtZW50Q2xhc3NlcygpfVwiXG4gICAgICBvbmNsaWNrPSR7Y2xpY2tIYW5kbGVyfVxuICAgICAgc3R5bGU9XCIke2VsZW1lbnRTdHlsZXN9XCI+JHtlbGVtZW50LnRleHR9PC9kaXY+YDtcbiAgICAvLyBwb3NzaWJsZSB3ZSBuZWVkIHR3byBzZXAuIGNvbXBvbmVudHM/XG5cbiAgICBmdW5jdGlvbiBlbGVtZW50Q2xhc3NlcygpIHtcbiAgICAgICAgbGV0IGtsYXNzID0gZWxlbWVudElzQmFzaWMgPyBbJ2Jhc2ljJ10gOiBbXTtcbiAgICAgICAgaWYgKGVsZW1lbnQudHJhbnNwYXJlbnQpIHtcbiAgICAgICAgICAgIGtsYXNzLnB1c2goJ3RyYW5zcGFyZW50Jyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQuYmVoYXZpb3IgJiYgZWxlbWVudC5iZWhhdmlvci5sZW5ndGggJiYgIXN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBrbGFzcy5wdXNoKCdiZWhhdmVzLW9uLWNsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAga2xhc3MucHVzaChlbGVtZW50LmNsYXNzKTtcbiAgICAgICAgcmV0dXJuIGtsYXNzLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0RWxlbWVudCgpIHtcbiAgICAgICAgZW1pdCgnZWRpdEVsZW1lbnQnLCBbZWxlbWVudCwgaW5kZXgsIGlzQ2FyZF0pO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RyYWdnYWJsZSgpIHtcbiAgICAgICAgaWYgKGlzQ2FyZCkge1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZS5lZGl0TW9kZSA9PT0gJ2JnRWRpdCc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZWRpdE1vZGVDbGljayhldnQpIHtcbiAgICAgICAgY29uc3QgW3N0YXJ0WCwgc3RhcnRZXSA9IHN0YXRlLm1vdXNlRG93bjtcbiAgICAgICAgaWYgKE1hdGguYWJzKGV2dC5zY3JlZW5YIC0gc3RhcnRYKSA8IDEwICYmIE1hdGguYWJzKGV2dC5zY3JlZW5ZIC0gc3RhcnRZKSA8IDEwKSB7XG4gICAgICAgICAgICBlZGl0RWxlbWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VEb3duKGV2dCkge1xuICAgICAgICBlbWl0KCdzdGFydERyYWcnLCBbZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLCBldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFksIGV2dC50YXJnZXRdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZUxlYXZlKGV2dCkge1xuICAgICAgICBpZiAoc3RhdGUuZHJhZ0luZm8gfHwgc3RhdGUucmVzaXplSW5mbykge1xuICAgICAgICAgICAgY29uc3QgeWVySW5mbyA9IHN0YXRlLmRyYWdJbmZvID8gc3RhdGUuZHJhZ0luZm8gOiBzdGF0ZS5yZXNpemVJbmZvO1xuICAgICAgICAgICAgaWYgKHllckluZm8udGFyZ2V0ID09IGV2dC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZVVwKGV2dCkge1xuICAgICAgICBlbWl0KCdmaW5pc2hEcmFnJywgW1xuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyAnbW92ZUVsZW1lbnQnIDogJ3Jlc2l6ZUVsZW1lbnQnLFxuICAgICAgICAgICAgZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLmxlZnQgOiBldnQudGFyZ2V0LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLnRvcCA6IGV2dC50YXJnZXQuc3R5bGUuaGVpZ2h0LFxuICAgICAgICAgICAgaW5kZXhcbiAgICAgICAgXSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50VmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3RvUHh9ID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxuY29uc3QgZmllbGRWaWV3ID0gKGZpZWxkLCBuYW1lLCBzdGF0ZSwgZW1pdCwgaXNDYXJkKSA9PiB7XG4gICAgbGV0IGZsZDtcbiAgICBpZiAoZmllbGQudHlwZSA9PSAnc2VsZWN0Jykge1xuICAgICAgICBmbGQgPSBodG1sYDxzZWxlY3QgbmFtZT1cIiR7ZmllbGQubmFtZX1cIlxuICAgICAgICAgICAgb25jaGFuZ2U9XCIkeyhldnQpID0+IGVtaXQoJ2ZpZWxkY2hhbmdlJywgZXZ0LCBmaWVsZCl9XCJcbiAgICAgICAgICAgICR7ZmllbGQub3B0aW9ucy5tYXAoKG9wdCkgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBzZWxlY3RlZCA9IG9wdCA9PT0gZmllbGQudmFsdWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc8b3B0aW9uIHZhbHVlPVwiJyArIG9wdCArICdcIicgK1xuICAgICAgICAgICAgICAgICAgICAoc2VsZWN0ZWQgPyAnIHNlbGVjdGVkPVwic2VsZWN0ZWRcIicgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAnPicgKyBvcHQgKyAnPC9vcHRpb24+J1xuICAgICAgICAgICAgfSl9XG4gICAgICAgIDwvc2VsZWN0PmA7XG4gICAgfSBlbHNlIGlmIChmaWVsZC50eXBlID09ICdyYWRpbycgfHwgZmllbGQudHlwZSA9PSAnY2hlY2tib3gnKSB7XG4gICAgICAgIC8vIG5vdGhpbmcgcmlnaHQgbm93IG1yLiBoZXJtYW5cbiAgICB9IGVsc2UgaWYgKGZpZWxkLnR5cGUgPT0gJ3RleHRhcmVhJyB8fCB0b1B4KGZpZWxkLmhlaWdodCkgPiBNYXRoLm1heChmaWVsZC5zaXplLCAxNSkpIHtcbiAgICAgICAgZmxkID0gaHRtbGA8dGV4dGFyZWEgbmFtZT1cIiR7ZmllbGQubmFtZX1cIlxuICAgICAgICAgICAgd3JhcD1cInZpcnR1YWxcIlxuICAgICAgICAgICAgb25rZXlkb3duPVwiXCJcbiAgICAgICAgICAgIG9ua2V5dXA9JHsoZXZ0KSA9PiB7ZW1pdCgnZmllbGRLZXlVcCcsIFtldnQsIGZpZWxkXSl9fVxuICAgICAgICAgICAgb25rZXlwcmVzcz1cIlwiXG4gICAgICAgICAgICBvbmNoYW5nZT1cIiR7KGV2dCkgPT4gZW1pdCgnZmllbGRjaGFuZ2UnLCBbZXZ0LCBmaWVsZF0pfVwiXG4gICAgICAgICAgICBzdHlsZT1cIiR7ZmllbGRTdHlsZXMoKX1cIj4ke2ZpZWxkLnZhbHVlfTwvdGV4dGFyZWE+YDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBmbGQgPSBodG1sYDxpbnB1dCB0eXBlPVwiJHtmaWVsZC50eXBlID8gZmllbGQudHlwZSA6ICd0ZXh0J31cIlxuICAgICAgICAgICAgbmFtZT1cIiR7ZmllbGQubmFtZX1cIlxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCIke2ZpZWxkLnBsYWNlaG9sZGVyfVwiXG4gICAgICAgICAgICB2YWx1ZT1cIiR7ZmllbGQudmFsdWV9XCJcbiAgICAgICAgICAgIG9ua2V5ZG93bj0keyhldnQpID0+IGVtaXQoJ2ZpZWxkS2V5RG93bicsIFtldnQsIGZpZWxkXSl9XG4gICAgICAgICAgICBvbmtleXVwPSR7KGV2dCkgPT4gZW1pdCgnZmllbGRLZXlVcCcsIFtldnQsIGZpZWxkXSl9XG4gICAgICAgICAgICBvbmtleXByZXNzPSR7KGV2dCkgPT4gZW1pdCgnZmllbGRLZXlQcmVzcycsIFtldnQsIGZpZWxkXSl9XG4gICAgICAgICAgICBvbmNoYW5nZT1cIiR7KGV2dCkgPT4gZW1pdCgnZmllbGRjaGFuZ2UnLCBbZXZ0LCBmaWVsZF0pfVwiXG4gICAgICAgICAgICBzdHlsZT1cIiR7ZmllbGRTdHlsZXMoKX1cIiAvPlxuICAgICAgICBgO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuZWRpdE1vZGUpIHtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGRpdiBjbGFzcz1cImZpZWxkc2hpbSAke2lzRHJhZ2dhYmxlKCkgPyAnbW92YWJsZScgOiAnJ31cIlxuICAgICAgICAgICAgICAgIHN0eWxlPVwiJHtmaWVsZFN0eWxlcygpfVwiXG4gICAgICAgICAgICAgICAgb25jbGljaz0keyhlKSA9PiBlZGl0TW9kZUNsaWNrKGUpfVxuICAgICAgICAgICAgICAgIG9ubW91c2Vkb3duPSR7KGUpID0+IG1vdXNlRG93bihlKX1cbiAgICAgICAgICAgICAgICBvbm1vdXNlbGVhdmU9JHsoZSkgPT4gbW91c2VMZWF2ZShlKX1cbiAgICAgICAgICAgICAgICBvbm1vdXNldXA9JHsoZSkgPT4gbW91c2VVcChlKX0+XG4gICAgICAgICAgICA8cD4ke2ZpZWxkLm5hbWV9PC9wPlxuICAgICAgICAgICAgPGFzaWRlPlZhbHVlOiA8c3Bhbj4ke2ZpZWxkLnZhbHVlfTwvc3Bhbj48L2FzaWRlPlxuICAgICAgICA8L2Rpdj5gO1xuICAgIH1cbiAgICByZXR1cm4gZmxkO1xuXG4gICAgZnVuY3Rpb24gY2xpY2tIYW5kbGVyKGV2dCkge1xuICAgICAgICBpZiAoZXZ0LmFsdEtleSB8fCAoc3RhdGUuZWRpdE1vZGUgJiYgaXNEcmFnZ2FibGUoKSkpIHtcbiAgICAgICAgICAgIGVtaXQoJ2VkaXRGaWVsZCcsIFtmaWVsZCwgbmFtZSwgaXNDYXJkXSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RyYWdnYWJsZSgpIHtcbiAgICAgICAgaWYgKGlzQ2FyZCkge1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZS5lZGl0TW9kZSA9PT0gJ2JnRWRpdCc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmllbGRTdHlsZXMoKSB7XG4gICAgICAgIGxldCBzdGVleiA9IHtcbiAgICAgICAgICAgIHRvcDogZmllbGQudG9wLFxuICAgICAgICAgICAgbGVmdDogZmllbGQubGVmdCxcbiAgICAgICAgICAgIGhlaWdodDogZmllbGQuaGVpZ2h0LFxuICAgICAgICAgICAgd2lkdGg6IGZpZWxkLndpZHRoLFxuICAgICAgICAgICAgJ2JhY2tncm91bmQtY29sb3InOiBmaWVsZC5jb2xvcixcbiAgICAgICAgICAgICdmb250LWZhbWlseSc6IGZpZWxkLmZvbnQsXG4gICAgICAgICAgICAnZm9udC1zaXplJzogZmllbGQuc2l6ZSxcbiAgICAgICAgICAgICdmb250LXN0eWxlJzogZmllbGQuc3R5bGUsXG4gICAgICAgICAgICBjb2xvcjogZmllbGQudGV4dENvbG9yXG4gICAgICAgIH07XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0TW9kZSkge1xuICAgICAgICAgICAgc3RlZXouaGVpZ2h0ID0gdG9QeChmaWVsZC5oZWlnaHQpID49IDQwID8gc3RlZXouaGVpZ2h0IDogJzQwcHgnO1xuICAgICAgICAgICAgc3RlZXoud2lkdGggPSB0b1B4KGZpZWxkLndpZHRoKSA+PSA0MCA/IHN0ZWV6LndpZHRoIDogJzQwcHgnO1xuICAgICAgICAgICAgaWYgKCFzdGVlelsnYmFja2dyb3VuZC1jb2xvciddKSB7XG4gICAgICAgICAgICAgICAgc3RlZXpbJ2JhY2tncm91bmQtY29sb3InXSA9ICcjZGRkJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RlZXopLm1hcCgoa2V5KSA9PiAoa2V5ICsgJzonICsgc3RlZXpba2V5XSArICc7JykpLmpvaW4oJycpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVkaXRNb2RlQ2xpY2soZXZ0KSB7XG4gICAgICAgIGNvbnN0IFtzdGFydFgsIHN0YXJ0WV0gPSBzdGF0ZS5tb3VzZURvd247XG4gICAgICAgIGlmIChNYXRoLmFicyhldnQuc2NyZWVuWCAtIHN0YXJ0WCkgPCAxMCAmJiBNYXRoLmFicyhldnQuc2NyZWVuWSAtIHN0YXJ0WSkgPCAxMCkge1xuICAgICAgICAgICAgZW1pdCgnZWRpdEZpZWxkJywgW2ZpZWxkLCBuYW1lLCBpc0NhcmRdKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdXNlRG93bihldnQpIHtcbiAgICAgICAgZW1pdCgnc3RhcnREcmFnJywgW2V2dC5zY3JlZW5YLCBldnQuc2NyZWVuWSwgZXZ0Lm9mZnNldFgsIGV2dC5vZmZzZXRZLCBldnQudGFyZ2V0XSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VMZWF2ZShldnQpIHtcbiAgICAgICAgaWYgKHN0YXRlLmRyYWdJbmZvIHx8IHN0YXRlLnJlc2l6ZUluZm8pIHtcbiAgICAgICAgICAgIGNvbnN0IHllckluZm8gPSBzdGF0ZS5kcmFnSW5mbyA/IHN0YXRlLmRyYWdJbmZvIDogc3RhdGUucmVzaXplSW5mbztcbiAgICAgICAgICAgIGlmICh5ZXJJbmZvLnRhcmdldCA9PSBldnQudGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPSBudWxsO1xuICAgICAgICAgICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VVcChldnQpIHtcbiAgICAgICAgZW1pdCgnZmluaXNoRHJhZycsIFtcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gJ21vdmVGaWVsZCcgOiAncmVzaXplRmllbGQnLFxuICAgICAgICAgICAgZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLmxlZnQgOiBldnQudGFyZ2V0LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLnRvcCA6IGV2dC50YXJnZXQuc3R5bGUuaGVpZ2h0LFxuICAgICAgICAgICAgbmFtZVxuICAgICAgICBdKTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZmllbGRWaWV3O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ29Ub05leHRDYXJkOiByZXF1aXJlKCcuL2dvVG9OZXh0Q2FyZENvbXBvbmVudCcpLFxuICAgIGdvVG9QcmV2aW91c0NhcmQ6IHJlcXVpcmUoJy4vZ29Ub1ByZXZpb3VzQ2FyZENvbXBvbmVudCcpLFxuICAgICdpZic6IG51bGwsIC8vIGhlcmUgdG8gYmUgY291bnRlZCwgYnV0IG5vdCBhY3R1YWxseSBoYW5kbGVkIGJ5IGEgc2VwLiBjb21wb25lbnRcbiAgICBqdW1wVG86IHJlcXVpcmUoJy4vanVtcFRvQ29tcG9uZW50JyksXG4gICAgcmVtb3ZlVHJ1dGg6IHJlcXVpcmUoJy4vcmVtb3ZlVHJ1dGhDb21wb25lbnQnKSxcbiAgICBzZXRUcnV0aDogcmVxdWlyZSgnLi9zZXRUcnV0aENvbXBvbmVudCcpLFxuICAgIGxpbmtUbzogcmVxdWlyZSgnLi9saW5rVG9Db21wb25lbnQnKVxufTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5jb25zdCBjYXJkU3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBiZyA9IHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXTtcbiAgbGV0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ2VudlByb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgJHtmaWVsZEZvcignbmFtZScsJ05hbWUnKX1cbiAgICAgIDxwPjxsYWJlbCBmb3I9XCJjb2xvclwiPkNvbG9yPC9sYWJlbD48YnIgLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgIG5hbWU9XCJjb2xvclwiXG4gICAgICAgICAgdmFsdWU9XCIke2JnLmNvbG9yIHx8ICcjRkZGRkZGJ31cIiAvPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7XG4gICAgICAgICAgICBlbWl0KCdlbnZQcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiAnY29sb3InLCB2YWx1ZTogJyd9fSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH19PlxuICAgICAgICAgIENsZWFyXG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9wPlxuICAgIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIiR7YXR0TmFtZX1cIj4ke2Rpc3BsYXlOYW1lfTwvbGFiZWw+PGJyIC8+XG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgIG5hbWU9XCIke2F0dE5hbWV9XCJcbiAgICAgIHZhbHVlPVwiJHtiZ1thdHROYW1lXX1cIiAvPlxuICAgIDwvcD5gO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2FyZFN0eWxlVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5jb25zdCBjYXJkU3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBjYXJkID0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdO1xuICBsZXQgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgnZW52UHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgICAke2ZpZWxkRm9yKCduYW1lJywnTmFtZScpfVxuICAgICAgPHA+PGxhYmVsIGZvcj1cImNvbG9yXCI+Q29sb3I8L2xhYmVsPjxiciAvPlxuICAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgICAgbmFtZT1cImNvbG9yXCJcbiAgICAgICAgICAgdmFsdWU9XCIke2NhcmQuY29sb3IgfHwgJyNGRkZGRkYnfVwiIC8+XG4gICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge1xuICAgICAgICAgICBlbWl0KCdlbnZQcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiAnY29sb3InLCB2YWx1ZTogJyd9fSk7XG4gICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICB9fT5cbiAgICAgICAgIENsZWFyXG4gICAgICAgPC9idXR0b24+XG4gICAgICA8L3A+XG5cbiAgICAgIDxkaXYgc3R5bGU9XCJ0ZXh0LWFsaWduOmNlbnRlclwiPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHtkZWxldGVIYW5kbGVyfT5EZWxldGUgQ2FyZDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9mb3JtPmA7XG5cbiAgZnVuY3Rpb24gZmllbGRGb3IoYXR0TmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICByZXR1cm4gaHRtbGA8cD48bGFiZWwgZm9yPVwiJHthdHROYW1lfVwiPiR7ZGlzcGxheU5hbWV9PC9sYWJlbD48YnIgLz5cbiAgICA8aW5wdXQgdHlwZT1cInRleHRcIlxuICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgbmFtZT1cIiR7YXR0TmFtZX1cIlxuICAgICAgdmFsdWU9XCIke2NhcmRbYXR0TmFtZV19XCIgLz5cbiAgICA8L3A+YDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUNhcmQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNhcmRTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9ycywgYmVoYXZpb3JMaXN0LCBiZWhhdmlvcn0gPSByZXF1aXJlKCcuLi9iZWhhdmlvcicpO1xuY29uc3Qge2dldFBhdGh9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmNvbnN0IGVkaXRCZWhhdmlvclZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgY29uc3QgdGhpbmcgPSBnZXRQYXRoKHN0YXRlLCBzdGF0ZS5lZGl0aW5nUGF0aCk7XG4gIGNvbnN0IGtpY2tvZmZEZXNjcmlwdG9yID0gc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoID4gMiA/ICdjbGljaycgOiAnYXJyaXZhbCc7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgPGRpdj5PbiAke2tpY2tvZmZEZXNjcmlwdG9yfSxcblxuICAgICR7dGhpbmcuYmVoYXZpb3IgJiYgdGhpbmcuYmVoYXZpb3IubGVuZ3RoXG4gICAgICAgID8gYmVoYXZpb3JMaXN0KHN0YXRlLCBlbWl0LCB0aGluZy5iZWhhdmlvciwgc3RhdGUuZWRpdGluZ1BhdGguY29uY2F0KFsnYmVoYXZpb3InXSkpXG4gICAgICAgIDogaHRtbGA8dWwgY2xhc3M9XCJiZWhhdmlvcnNcIj5cbiAgICAgICAgICAgIDxsaT4ke2JlaGF2aW9yKHN0YXRlLCBlbWl0LCBzdGF0ZS5lZGl0aW5nUGF0aC5jb25jYXQoWydiZWhhdmlvcicsIDBdKSl9PC9saT5cbiAgICAgICAgPC91bD5gXG4gICAgfVxuXG4gICAgPC9kaXY+XG4gICAgPGRpdiBzdHlsZT1cImNvbG9yOiByZWQ7IGZvbnQtZmFtaWx5OiBIZWx2ZXRpY2Esc2Fuc1wiPlxuICAgICAgQ3VycmVudCB0cnV0aHM6XG4gICAgICA8dWw+XG4gICAgICAgICR7T2JqZWN0LmtleXMoc3RhdGUudHJ1dGhzKS5tYXAoKHRoKSA9PiBodG1sYDxsaT4ke3RofTwvbGk+YCl9XG4gICAgICA8L3VsPlxuICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge3BhcnNlQW5kUnVuQmVoYXZpb3JzKHN0YXRlLCBlbWl0LCB0aGluZy5iZWhhdmlvcik7cmV0dXJuIGZhbHNlfX0+VGVzdCBiZWhhdmlvcjwvYnV0dG9uPlxuICAgIDwvZGl2PlxuICA8L2Zvcm0+YDtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlZGl0QmVoYXZpb3JWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBlbGVtZW50U3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBlbG0gPSBzdGF0ZS5lZGl0aW5nRWxlbWVudDtcbiAgbGV0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ3Byb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcigndG9wJywnVG9wJyl9PC90ZD5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdsZWZ0JywnTGVmdCcpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdoZWlnaHQnLCdIZWlnaHQnKX08L3RkPlxuICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ3dpZHRoJywnV2lkdGgnKX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgIDwvdGFibGU+XG4gICAgICA8cD48bGFiZWwgZm9yPVwiY29sb3JcIj5Db2xvcjwvbGFiZWw+PGJyIC8+XG4gICAgICA8aW5wdXQgdHlwZT1cImNvbG9yXCJcbiAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICBuYW1lPVwiY29sb3JcIlxuICAgICAgICB2YWx1ZT1cIiR7ZWxtLmNvbG9yIHx8ICcjMzMzMzMzJ31cIiAvPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHtjbGVhckhhbmRsZXJGb3IoJ2NvbG9yJyl9PlxuICAgICAgICAgIENsZWFyXG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9wPlxuICAgICAgPHA+PGxhYmVsIGZvcj1cInRleHRcIj5UZXh0PC9sYWJlbD48YnIgLz5cbiAgICAgIDx0ZXh0YXJlYSBzdHlsZT1cIndpZHRoOjk4JTtoZWlnaHQ6NHJlbTtcIiB3cmFwPVwidmlydHVhbFwiXG4gICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgbmFtZT1cInRleHRcIj4ke2VsbS50ZXh0IHx8ICcnfTwvdGV4dGFyZWE+XG4gICAgICA8L3A+XG4gICAgICAke2ZpZWxkRm9yKCdmb250JywnRm9udCcpfVxuICAgICAgJHtmaWVsZEZvcignc2l6ZScsJ1NpemUnKX1cbiAgICAgIDxwPjxsYWJlbCBmb3I9XCJzdHlsZVwiPlN0eWxlPC9sYWJlbD48YnIgLz5cbiAgICAgIDxzZWxlY3QgbmFtZT1cInN0eWxlXCIgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfT5cbiAgICAgICAgJHtzZWxlY3RPcHRpb24oJ1JlZ3VsYXInLCBlbG0uc3R5bGUpfVxuICAgICAgICAke3NlbGVjdE9wdGlvbignSXRhbGljJywgZWxtLnN0eWxlKX1cbiAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9wPlxuICAgICAgPHA+PGxhYmVsIGZvcj1cInRleHRDb2xvclwiPlRleHQgQ29sb3I8L2xhYmVsPjxiciAvPlxuICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgbmFtZT1cInRleHRDb2xvclwiXG4gICAgICAgIHZhbHVlPVwiJHtlbG0udGV4dENvbG9yIHx8ICcjMDAwMDAwJ31cIiAvPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHtjbGVhckhhbmRsZXJGb3IoJ3RleHRDb2xvcicpfT5cbiAgICAgICAgICAgQ2xlYXJcbiAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9wPlxuICAgICAgJHtmaWVsZEZvcignY2xhc3MnLCdDbGFzcycpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEVsZW1lbnQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIiR7YXR0TmFtZX1cIj4ke2Rpc3BsYXlOYW1lfTwvbGFiZWw+PGJyIC8+XG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgIG5hbWU9XCIke2F0dE5hbWV9XCJcbiAgICAgIHZhbHVlPVwiJHtlbG1bYXR0TmFtZV19XCIgLz5cbiAgICA8L3A+YDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFySGFuZGxlckZvcihwcm9wTmFtZSwgYnV0dG9ueSA9IHRydWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0KCdwcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiBwcm9wTmFtZSwgdmFsdWU6ICcnfX0pO1xuICAgICAgaWYgKGJ1dHRvbnkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUVsZW1lbnQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50U3R5bGVWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBmaWVsZFN0eWxlVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICBsZXQgZmxkID0gc3RhdGUuZWRpdGluZ0ZpZWxkO1xuICBsZXQgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgncHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgICAke2ZpZWxkRm9yKCduYW1lJywnTmFtZScpfVxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcigndG9wJywnVG9wJyl9PC90ZD5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdsZWZ0JywnTGVmdCcpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdoZWlnaHQnLCdIZWlnaHQnKX08L3RkPlxuICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ3dpZHRoJywnV2lkdGgnKX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgIDwvdGFibGU+XG4gICAgICA8cD48bGFiZWwgZm9yPVwidHlwZVwiPlR5cGU8L2xhYmVsPjxiciAvPlxuICAgICAgICA8c2VsZWN0IG5hbWU9XCJ0eXBlXCIgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfT5cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdUZXh0JywgZmxkLnR5cGUpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ01lbnUnLCBmbGQudHlwZSl9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9wPlxuICAgICAgJHtmbGQudHlwZT09PSdUZXh0JyA/IGZpZWxkRm9yKCdoZWlnaHQnLCdIZWlnaHQnKSA6IG51bGx9XG4gICAgICAke2ZsZC50eXBlPT09J1RleHQnID8gZmllbGRGb3IoJ3dpZHRoJywnV2lkdGgnKSA6IG51bGx9XG4gICAgICAke2ZsZC50eXBlPT09J01lbnUnID8gb3B0aW9uc0ZpZWxkKCkgOiBudWxsfVxuICAgICAgJHtmaWVsZEZvcignY2xhc3MnLCdDbGFzcycpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEZpZWxkPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Zvcm0+YDtcblxuICBmdW5jdGlvbiBmaWVsZEZvcihhdHROYW1lLCBkaXNwbGF5TmFtZSkge1xuICAgIHJldHVybiBodG1sYDxwPjxsYWJlbCBmb3I9XCIke2F0dE5hbWV9XCI+JHtkaXNwbGF5TmFtZX08L2xhYmVsPjxiciAvPlxuICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiXG4gICAgICBvbmNoYW5nZT0ke2NoYW5nZUhhbmRsZXJ9XG4gICAgICBuYW1lPVwiJHthdHROYW1lfVwiXG4gICAgICB2YWx1ZT1cIiR7ZmxkW2F0dE5hbWVdIHx8ICcnfVwiIC8+XG4gICAgPC9wPmA7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUZpZWxkJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBvcHRpb25zRmllbGQoKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIm9wdGlvbnNcIj5PcHRpb25zPC9sYWJlbD48YnIgLz5cbiAgICAgIDx0ZXh0YXJlYSBuYW1lPVwib3B0aW9uc1wiIG9uY2hhbmdlPSR7b3B0aW9uSGFuZGxlcn0+JHtmbGQub3B0aW9ucy5qb2luKFwiXFxuXCIpfTwvdGV4dGFyZWE+XG4gICAgPC9wPmA7XG5cbiAgICBmdW5jdGlvbiBvcHRpb25IYW5kbGVyKGUpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBlLnRhcmdldC52YWx1ZS5zcGxpdChcIlxcblwiKS5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKTtcbiAgICAgIGVtaXQoJ3NldEZpZWxkT3B0aW9ucycsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmaWVsZFN0eWxlVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IHtzZWxlY3RPcHRpb24sIGNoZWNrQm94fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBnb1RvTmV4dENhcmQoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+XG4gICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJnb1RvTmV4dENhcmRcIlxuICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsXG4gICAgICAgICAgICAgICAgICAgIHsnZ29Ub05leHRDYXJkJzogZS50YXJnZXQudmFsdWUsICd3cmFwJzogYmVoYXYud3JhcCA/IHRydWUgOiBmYWxzZX1cbiAgICAgICAgICAgICAgICBdKX0+XG4gICAgICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ3N0YWNrJywgJ2luIHRoZSBzdGFjaycsIGJlaGF2LmdvVG9OZXh0Q2FyZCl9XG4gICAgICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2JnJywgJ2luIHRoaXMgYmFja2dyb3VuZCcsIGJlaGF2LmdvVG9OZXh0Q2FyZCl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICR7Y2hlY2tCb3goJ3dyYXAgYXJvdW5kJywgYmVoYXYud3JhcCwgKGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsXG4gICAgICAgICAgICAgICAgeydnb1RvTmV4dENhcmQnOiBiZWhhdi5nb1RvTmV4dENhcmQsICd3cmFwJzogZS50YXJnZXQuY2hlY2tlZH1cbiAgICAgICAgICAgIF0pKX1cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ29Ub05leHRDYXJkO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuY29uc3Qge3NlbGVjdE9wdGlvbiwgY2hlY2tCb3h9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmZ1bmN0aW9uIGdvVG9QcmV2aW91c0NhcmQoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+XG4gICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJnb1RvTmV4dENhcmRcIlxuICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsXG4gICAgICAgICAgICAgICAgICAgIHsnZ29Ub05leHRDYXJkJzogZS50YXJnZXQudmFsdWUsICd3cmFwJzogYmVoYXYud3JhcCA/IHRydWUgOiBmYWxzZX1cbiAgICAgICAgICAgICAgICBdKX0+XG4gICAgICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ3N0YWNrJywgJ2luIHRoZSBzdGFjaycsIGJlaGF2LmdvVG9QcmV2aW91c0NhcmQpfVxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdiZycsICdpbiB0aGlzIGJhY2tncm91bmQnLCBiZWhhdi5nb1RvUHJldmlvdXNDYXJkKX1cbiAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgJHtjaGVja0JveCgnd3JhcCBhcm91bmQnLCBiZWhhdi53cmFwLCAoZSkgPT4gZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCxcbiAgICAgICAgICAgICAgICB7J2dvVG9OZXh0Q2FyZCc6IGJlaGF2LmdvVG9OZXh0Q2FyZCwgJ3dyYXAnOiBlLnRhcmdldC5jaGVja2VkfVxuICAgICAgICAgICAgXSkpfVxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgPC9kaXY+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnb1RvUHJldmlvdXNDYXJkO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9uLCBjaGVja0JveCwgZ2V0UGF0aCwgZmllbGRzV2l0aFZhbHVlc30gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuZnVuY3Rpb24gY29uZGl0aW9uKHN0YXRlLCBlbWl0LCBjb25kLCBwYXRoKSB7XG4gICAgbGV0IGNvbmp1bmN0aW9uID0gJ2FuZCc7XG4gICAgaWYgKHBhdGhbcGF0aC5sZW5ndGggLSAxXSA9PSAnb3InKSB7XG4gICAgICAgIGNvbmp1bmN0aW9uID0gJ29yJztcbiAgICB9XG5cbiAgICBsZXQgY2xhdXNlcztcbiAgICBpZiAoY29uZC5sZW5ndGgpIHtcbiAgICAgICAgY2xhdXNlcyA9IGNvbmQubWFwKChjbGF1c2UsIGluZGV4KSA9PlxuICAgICAgICAgICAgaHRtbGA8ZGl2PlxuICAgICAgICAgICAgICAgICR7aW5kZXggPT09IDAgPyAnJyA6IGh0bWxgPGFzaWRlPiR7Y29uanVuY3Rpb259PC9hc2lkZT5gfVxuICAgICAgICAgICAgICAgICR7Y29uZGl0aW9uQ2xhdXNlKHN0YXRlLCBlbWl0LCBjbGF1c2UsIHBhdGguY29uY2F0KFtpbmRleF0pKX1cbiAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjbGF1c2VzID0gaHRtbGA8ZGl2PlxuICAgICAgICAgICAgJHtjb25kaXRpb25DbGF1c2Uoc3RhdGUsIGVtaXQsIG51bGwsIHBhdGguY29uY2F0KFswXSkpfVxuICAgICAgICA8L2Rpdj5gO1xuICAgIH1cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICAke2NsYXVzZXN9XG4gICAgICAgIDxidXR0b24gb25jbGljaz0ke2FkZENsYXVzZUhhbmRsZXJ9Pis8L2J1dHRvbj5cbiAgICA8L2Rpdj5gO1xuXG4gICAgZnVuY3Rpb24gYWRkQ2xhdXNlSGFuZGxlcigpIHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgY29uZC5jb25jYXQoW251bGxdKV0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5jb25zdCBjbGF1c2VPYmpzID0ge1xuICAgIHRydXRoOiAnJyxcbiAgICBmaWVsZDoge30sXG4gICAgb3I6IHsnb3InOiBbXX1cbn07XG5cbmZ1bmN0aW9uIGNvbmRpdGlvbkNsYXVzZShzdGF0ZSwgZW1pdCwgY2xhdXNlLCBwYXRoKSB7XG4gICAgY29uc3QgaW5kZXggPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG5cbiAgICBjb25zdCBzdWJqZWN0SGFuZGxlciA9IChlKSA9PiB7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGNsYXVzZU9ianNbZS50YXJnZXQudmFsdWVdXSk7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWVIYW5kbGVyID0gKGUpID0+IHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgZS50YXJnZXQudmFsdWVdKTtcbiAgICB9XG5cbiAgICBjb25zdCBpc051bGwgPSBjbGF1c2UgPT09IG51bGw7XG4gICAgY29uc3QgaXNUcnV0aCA9IHR5cGVvZiBjbGF1c2UgPT09ICdzdHJpbmcnO1xuICAgIGNvbnN0IGlzRmllbGQgPSB0eXBlb2YgY2xhdXNlID09PSAnb2JqZWN0JyAmJiBjbGF1c2UgIT09IG51bGwgJiYgdHlwZW9mIGNsYXVzZS5vciA9PSAndW5kZWZpbmVkJztcbiAgICBjb25zdCBvcklzVGhlcmUgPSBjbGF1c2UgIT09IG51bGwgJiYgdHlwZW9mIGNsYXVzZSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgY2xhdXNlLm9yICE9ICd1bmRlZmluZWQnO1xuICAgIGNvbnN0IHVuaWZpZWRDb21wYXJlVmFsdWUgPSBpc051bGwgPyBudWxsIDogKGlzVHJ1dGggPyAndHJ1dGgnIDogKGlzRmllbGQgPyAnZmllbGQnIDogJ29yJykpO1xuXG4gICAgcmV0dXJuIGh0bWxgPHNlY3Rpb24+XG4gICAgICAgIDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke3VuaWZpZWRDb21wYXJlVmFsdWV9XCIgb25jaGFuZ2U9JHtzdWJqZWN0SGFuZGxlcn0+XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIHVuaWZpZWRDb21wYXJlVmFsdWUpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ3RydXRoJywgJ3RoZXJlIGlzIGEgVHJ1dGggbmFtZWQnLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdmaWVsZCcsICd0aGUgZmllbGQgbmFtZWQnLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdvcicsICdlaXRoZXInLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICR7aXNUcnV0aFxuICAgICAgICAgICAgPyBodG1sYDxpbnB1dCB0eXBlPVwidGV4dFwiIG9uY2hhbmdlPSR7dmFsdWVIYW5kbGVyfSB2YWx1ZT1cIiR7Y2xhdXNlfVwiIC8+YFxuICAgICAgICAgICAgOiBudWxsfVxuICAgICAgICAke2lzRmllbGRcbiAgICAgICAgICAgID8gZmllbGRDbGF1c2Uoc3RhdGUsIGVtaXQsIGNsYXVzZSwgcGF0aClcbiAgICAgICAgICAgIDogbnVsbH1cbiAgICAgICAgJHtvcklzVGhlcmVcbiAgICAgICAgICAgID8gY29uZGl0aW9uKHN0YXRlLCBlbWl0LCBjbGF1c2Uub3IsIHBhdGguY29uY2F0KFsnb3InXSkpXG4gICAgICAgICAgICA6IG51bGx9XG4gICAgICAgICR7aW5kZXggPiAwXG4gICAgICAgICAgICA/IGh0bWxgPGJ1dHRvbiBvbmNsaWNrPSR7KGUpID0+IHtyZW1vdmVDbGF1c2UoaW5kZXgpO3JldHVybiBmYWxzZTt9fSBjbGFzcz1cInJlbW92ZS1jbGF1c2VcIj4tPC9idXR0b24+YFxuICAgICAgICAgICAgOiBudWxsfVxuICAgIDwvc2VjdGlvbj5gO1xuXG4gICAgZnVuY3Rpb24gcmVtb3ZlQ2xhdXNlKGluZGV4KSB7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvblBhdGggPSBwYXRoLnNsaWNlKDAsIHBhdGgubGVuZ3RoIC0gMSk7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGdldFBhdGgoc3RhdGUsIGNvbmRpdGlvblBhdGgpO1xuICAgICAgICBjb25kaXRpb24uc3BsaWNlKHBhdGhbcGF0aC5sZW5ndGggLSAxXSwgMSk7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW2NvbmRpdGlvblBhdGgsIGNvbmRpdGlvbl0pO1xuICAgICAgICAvLyBzZWUgdGhpcyBraW5kYSB0aGluZyBzaG91bGQgYmUgaW4gYSBzdG9yZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmllbGRDbGF1c2Uoc3RhdGUsIGVtaXQsIGNsYXVzZSwgcGF0aCkge1xuICAgIGxldCBmaXJzdEtleSA9IG51bGw7XG4gICAgbGV0IGNvbXBhcmVPYmogPSBudWxsO1xuICAgIGxldCBjb21wYXJhdG9yID0gbnVsbDtcbiAgICBsZXQgY29tcGFyZVZhbHVlID0gbnVsbDtcbiAgICBpZiAoT2JqZWN0LmtleXMoY2xhdXNlKS5sZW5ndGgpIHtcbiAgICAgICAgZmlyc3RLZXkgPSBPYmplY3Qua2V5cyhjbGF1c2UpWzBdO1xuICAgICAgICBjb21wYXJlT2JqID0gY2xhdXNlW2ZpcnN0S2V5XTtcbiAgICAgICAgY29tcGFyYXRvciA9IGNvbXBhcmVPYmogPT09IG51bGxcbiAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgOiBPYmplY3Qua2V5cyhjb21wYXJlT2JqKVswXTtcbiAgICAgICAgY29tcGFyZVZhbHVlID0gY29tcGFyZU9iaiA9PT0gbnVsbFxuICAgICAgICAgICAgPyBudWxsXG4gICAgICAgICAgICA6IChjb21wYXJhdG9yID09PSBudWxsXG4gICAgICAgICAgICAgICAgPyBudWxsXG4gICAgICAgICAgICAgICAgOiBjb21wYXJlT2JqW2NvbXBhcmF0b3JdKTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWVsZE5hbWVIYW5kbGVyID0gKGUpID0+IHtcbiAgICAgICAgY29uc3QgZmllbGRPYmogPSB7fTtcbiAgICAgICAgZmllbGRPYmpbZS50YXJnZXQudmFsdWVdID0gY29tcGFyZU9iajtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgZmllbGRPYmpdKTtcbiAgICB9O1xuICAgIGNvbnN0IGZpZWxkQ29tcGFyZUhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBuZXdDb21wYXJlT2JqID0ge307XG4gICAgICAgIG5ld0NvbXBhcmVPYmpbZS50YXJnZXQudmFsdWVdID0gY29tcGFyZVZhbHVlO1xuICAgICAgICBjbGF1c2VbZmlyc3RLZXldID0gbmV3Q29tcGFyZU9iajtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgY2xhdXNlXSk7XG4gICAgfTtcbiAgICBjb25zdCBmaWVsZFZhbHVlSGFuZGxlciA9IChlKSA9PiB7XG4gICAgICAgIGNvbXBhcmVPYmpbY29tcGFyYXRvcl0gPSBlLnRhcmdldC52YWx1ZTtcbiAgICAgICAgY2xhdXNlW2ZpcnN0S2V5XSA9IGNvbXBhcmVPYmo7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGNsYXVzZV0pO1xuICAgIH07XG5cbiAgICBjb25zdCBmaWVsZHMgPSBPYmplY3Qua2V5cyhmaWVsZHNXaXRoVmFsdWVzKHN0YXRlKSk7XG4gICAgY29uc3QgdmFsdWVGb3JJbnRlcmFjdCA9ICghIWNvbXBhcmVWYWx1ZSB8fCBjb21wYXJlVmFsdWUgPT09IDApID8gY29tcGFyZVZhbHVlIDogJyc7XG5cbiAgICByZXR1cm4gaHRtbGA8c3Bhbj5cbiAgICAgICAgPHNlbGVjdCBkYXRhLXJlYWx2YWx1ZT1cIiR7Zmlyc3RLZXl9XCIgb25jaGFuZ2U9JHtmaWVsZE5hbWVIYW5kbGVyfT5cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgZmlyc3RLZXkpfVxuICAgICAgICAgICAgJHtmaWVsZHMubWFwKChmbGQpID0+IHNlbGVjdE9wdGlvbihmbGQsIGZpcnN0S2V5KSl9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgICA8c2VsZWN0IGRhdGEtcmVhbHZhbHVlPVwiJHtjb21wYXJhdG9yfVwiIG9uY2hhbmdlPSR7ZmllbGRDb21wYXJlSGFuZGxlcn0+XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2VxJywgJ2VxdWFscycsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2x0JywgJ2lzIGxlc3MgdGhhbicsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2d0JywgJ2lzIGdyZWF0ZXIgdGhhbicsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2x0ZScsICdpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdndGUnLCAnaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvJywgY29tcGFyYXRvcil9XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbignY29udGFpbnMnLCBjb21wYXJhdG9yKX1cbiAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICR7KGNvbXBhcmVPYmogJiYgY29tcGFyYXRvcilcbiAgICAgICAgICAgID8gaHRtbGA8aW5wdXQgdHlwZT1cInRleHRcIiBvbmNoYW5nZT0ke2ZpZWxkVmFsdWVIYW5kbGVyfSB2YWx1ZT1cIiR7dmFsdWVGb3JJbnRlcmFjdH1cIiAvPmBcbiAgICAgICAgICAgIDogbnVsbH1cbiAgICA8L3NwYW4+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y29uZGl0aW9ufTtcbiIsImNvbnN0IHtmaWVsZHNXaXRoVmFsdWVzfSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBzZXBhcmF0ZUFycmF5ID0gZnVuY3Rpb24oYXJyKSB7XG4gICAgbGV0IG90aGVycyA9IGFyci5maWx0ZXIoKGl0ZW0pID0+IHR5cGVvZiBpdGVtICE9PSAnc3RyaW5nJyk7XG4gICAgcmV0dXJuIFthcnIuZmlsdGVyKChpdGVtKSA9PiB0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpLCBvdGhlcnNdO1xufTtcblxuY29uc3QgZXZhbFRydXRocyA9IGZ1bmN0aW9uKHN0YXRlLCB0cnV0aEFyciwgb3JyID0gZmFsc2UpIHtcbiAgICBpZiAoIXRydXRoQXJyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG9ycikge1xuICAgICAgICByZXR1cm4gdHJ1dGhBcnIuc29tZSgodHJ1dGgpID0+IHR5cGVvZiBzdGF0ZS50cnV0aHNbdHJ1dGhdICE9PSAndW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIHJldHVybiB0cnV0aEFyci5ldmVyeSgodHJ1dGgpID0+IHR5cGVvZiBzdGF0ZS50cnV0aHNbdHJ1dGhdICE9PSAndW5kZWZpbmVkJyk7XG59O1xuXG5jb25zdCBldmFsRmllbGQgPSBmdW5jdGlvbihzdGF0ZSwgZmllbGROYW1lLCBjb21wYXJlZFRvKSB7XG4gICAgY29uc3QgdmFsdWUgPSBmaWVsZHNXaXRoVmFsdWVzKHN0YXRlKVtmaWVsZE5hbWVdO1xuICAgIGlmIChPYmplY3Qua2V5cyhjb21wYXJlZFRvKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnN0IGtleSA9IE9iamVjdC5rZXlzKGNvbXBhcmVkVG8pWzBdO1xuICAgIGlmIChrZXkgPT09ICdndCcpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlID4gY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnZ3RlJykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPj0gY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnbHQnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA8IGNvbXBhcmVkVG9ba2V5XTtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2x0ZScpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlIDw9IGNvbXBhcmVkVG9ba2V5XTtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2VxJykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPT0gY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnY29udGFpbnMnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5pbmNsdWRlcyhjb21wYXJlZFRvW2tleV0pO1xuICAgIH1cbn07XG5cbmNvbnN0IGV2YWxDbGF1c2UgPSBmdW5jdGlvbihzdGF0ZSwgY29uZE9iaikge1xuICAgIC8vIG5vdyBpdCdzIG9uXG4gICAgaWYgKGNvbmRPYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGkgZ3Vlc3M/Pz8gbWF5YmUgZmxhZyBpdCBzb21ld2hlcmUgdG8gdGhlIHVzZXJcbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbmRPYmopLmV2ZXJ5KChrZXkpID0+IHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ29yJykge1xuICAgICAgICAgICAgbGV0IFtzdHJpbmdzLCBvdGhlcnNdID0gc2VwYXJhdGVBcnJheShjb25kT2JqLm9yKTtcbiAgICAgICAgICAgIGlmIChvdGhlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2YWxUcnV0aHMoc3RhdGUsIHN0cmluZ3MsIHRydWUpIHx8IG90aGVycy5zb21lKChpdGVtKSA9PiBldmFsQ2xhdXNlKHN0YXRlLCBpdGVtKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBldmFsVHJ1dGhzKHN0YXRlLCBzdHJpbmdzLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgY2xhdXNlUmVzdWx0ID0gZXZhbEZpZWxkKHN0YXRlLCBrZXksIGNvbmRPYmpba2V5XSk7XG4gICAgICAgIHJldHVybiBjbGF1c2VSZXN1bHQ7XG4gICAgfSk7XG59XG5cbmNvbnN0IGV2YWxDb25kaXRpb24gPSBmdW5jdGlvbihzdGF0ZSwgY29uZE9iaiwgYW55ID0gZmFsc2UpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShjb25kT2JqKSkge1xuICAgICAgICBsZXQgW3N0cmluZ3MsIG90aGVyc10gPSBzZXBhcmF0ZUFycmF5KGNvbmRPYmopO1xuICAgICAgICBpZiAob3RoZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGV2YWxUcnV0aHMoc3RhdGUsIHN0cmluZ3MpICYmIG90aGVycy5ldmVyeSgoaXRlbSkgPT4gZXZhbENsYXVzZShzdGF0ZSwgaXRlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGV2YWxUcnV0aHMoc3RhdGUsIGNvbmRPYmopO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7ZXZhbENvbmRpdGlvbn07XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuY29uc3QgaW1hZ2VTdHlsZVZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBsZXQgaW1nID0gc3RhdGUuZWRpdGluZ0ltYWdlO1xuICAgIGxldCBjaGFuZ2VIYW5kbGVyID0gZXZlbnQgPT4gZW1pdChcInByb3BlcnR5Q2hhbmdlXCIsIGV2ZW50KTtcblxuICAgIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgPHRhYmxlPlxuICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoXCJ0b3BcIiwgXCJUb3BcIil9PC90ZD5cbiAgICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoXCJsZWZ0XCIsIFwiTGVmdFwiKX08L3RkPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcihcImhlaWdodFwiLCBcIkhlaWdodFwiKX08L3RkPlxuICAgICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcihcIndpZHRoXCIsIFwiV2lkdGhcIil9PC90ZD5cbiAgICAgICAgICA8L3RyPlxuICAgICAgPC90YWJsZT5cbiAgICAgICR7ZmllbGRGb3IoXCJjbGFzc1wiLCBcIkNsYXNzXCIpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEltYWdlPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Zvcm0+YDtcblxuICAgIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHJldHVybiBodG1sYDxwPjxsYWJlbCBmb3I9XCIke2F0dE5hbWV9XCI+JHtkaXNwbGF5TmFtZX08L2xhYmVsPjxiciAvPlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgICAgICBuYW1lPVwiJHthdHROYW1lfVwiXG4gICAgICAgICAgICAgIHZhbHVlPVwiJHtpbWdbYXR0TmFtZV0gfHwgXCJcIn1cIiAvPlxuICAgICAgICA8L3A+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWxldGVIYW5kbGVyKCkge1xuICAgICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgICAgZW1pdChcImRlbGV0ZUltYWdlXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gaW1hZ2VTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBqdW1wVG8oc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgLy8gbm9ybWFsaXppbmcgdGhlIGNyYXp5IG9mIGh0bWwgb3B0aW9ucyBhIGxpdHRsZVxuICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlSW50KGJlaGF2Lmp1bXBUbykpKSB7XG4gICAgICAgIGJlaGF2Lmp1bXBUbyA9IHBhcnNlSW50KGJlaGF2Lmp1bXBUbyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYmVoYXYuanVtcFRvID09ICdzdHJpbmcnICYmIGJlaGF2Lmp1bXBUbyA9PSAnbnVsbCcpIHtcbiAgICAgICAgYmVoYXYuanVtcFRvID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj50aGUgY2FyZCBuYW1lZCBvciBudW1iZXJlZFxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwianVtcFRvV2hhdFwiXG4gICAgICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIHsnanVtcFRvJzogZS50YXJnZXQudmFsdWV9XSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgYmVoYXYuanVtcFRvID09PSBudWxsLCAtMSl9XG4gICAgICAgICAgICAgICAgJHtzdGF0ZS5jYXJkcy5tYXAoKGNkLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQganVtcFRvVmFsID0gY2QubmFtZSB8fCBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIocGFyc2VJbnQoanVtcFRvVmFsKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGp1bXBUb1ZhbCA9IHBhcnNlSW50KGp1bXBUb1ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGVjdE9wdGlvbihqdW1wVG9WYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2QubmFtZSA/IGluZGV4ICsgXCIgLSBcIiArIGNkLm5hbWUgOiBpbmRleCksXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWhhdi5qdW1wVG8gPT09IGp1bXBUb1ZhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ganVtcFRvO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbmZ1bmN0aW9uIGxpbmtUbyhzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj50aGUgVVJMXG4gICAgICAgICAgICA8aW5wdXQgbmFtZT1cImxpbmtUb1doYXRcIlxuICAgICAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J2xpbmtUbyc6IGUudGFyZ2V0LnZhbHVlfV0pfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT1cIiR7YmVoYXYubGlua1RvfVwiIC8+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxpbmtUbztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5mdW5jdGlvbiByZW1vdmVUcnV0aChzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj5yZW1vdmUgdGhlIFRydXRoIG5hbWVkXG4gICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ3aGF0VHJ1dGhcIiB2YWx1ZT1cIiR7YmVoYXYucmVtb3ZlVHJ1dGh9XCJcbiAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIHsncmVtb3ZlVHJ1dGgnOiBlLnRhcmdldC52YWx1ZX1dKX0gLz5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlVHJ1dGg7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuZnVuY3Rpb24gc2V0VHJ1dGgoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+c2V0IGEgVHJ1dGggbmFtZWRcbiAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIndoYXRUcnV0aFwiIHZhbHVlPVwiJHtiZWhhdi5zZXRUcnV0aH1cIlxuICAgICAgICAgICAgb25jaGFuZ2U9JHsoZSkgPT4gZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgeydzZXRUcnV0aCc6IGUudGFyZ2V0LnZhbHVlfV0pfSAvPlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgPC9kaXY+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXRUcnV0aDtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5jb25zdCBzdGFja0NvbWJvVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICBjb25zdCBjaGFuZ2VIYW5kbGVyID0gKGV2ZW50KSA9PiBlbWl0KCdzdGFja1Byb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuICBjb25zdCBzdHlsZUNvbnRhaW5lciA9IGh0bWxgPHRleHRhcmVhIHdyYXA9XCJ2aXJ0dWFsXCJcbiAgICBjbGFzcz1cInN0eWxlc2hlZXRcIlxuICAgIG9uY2hhbmdlPSR7KGUpID0+IHNldFN0eWxlcyhlLnRhcmdldC52YWx1ZSl9PiR7c3RhdGUuc3R5bGVDYWNoZX08L3RleHRhcmVhPmA7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgPHA+PGxhYmVsIGZvcj1cImNvbG9yXCI+Q29sb3I8L2xhYmVsPjxiciAvPlxuICAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgICAgbmFtZT1cImNvbG9yXCJcbiAgICAgICAgICAgdmFsdWU9XCIke3N0YXRlLmNvbG9yIHx8ICcjRkZGRkZGJ31cIiAvPlxuICAgICAgIDxidXR0b24gb25jbGljaz0keygpID0+IHtcbiAgICAgICAgICAgZW1pdCgnc3RhY2tQcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiAnY29sb3InLCB2YWx1ZTogJyd9fSk7XG4gICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICB9fT5cbiAgICAgICAgIENsZWFyXG4gICAgICAgPC9idXR0b24+XG4gICAgPC9wPlxuICAgIDxwPjxsYWJlbCBmb3I9XCJzdHlsZXNcIj5TdHlsZXM8L2xhYmVsPjxiciAvPlxuICAgICR7c3R5bGVDb250YWluZXJ9XG4gICAgPC9wPlxuICA8L2Zvcm0+YDtcblxuICBmdW5jdGlvbiBzZXRTdHlsZXModmFsKSB7XG4gICAgICBlbWl0KCdzZXRTdHlsZXMnLCB2YWwpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YWNrQ29tYm9WaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgsIHN0YXRlLCBlbWl0LCBpc0NhcmQpIHtcbiAgICBsZXQgYXR0cnMgPSB7XG4gICAgICAgIGhlaWdodDogZWxlbWVudC5oZWlnaHQsXG4gICAgICAgIHdpZHRoOiBlbGVtZW50LndpZHRoLFxuICAgICAgICB0b3A6IGVsZW1lbnQudG9wLFxuICAgICAgICBsZWZ0OiBlbGVtZW50LmxlZnQsXG4gICAgICAgICdiYWNrZ3JvdW5kLWNvbG9yJzogZWxlbWVudC5jb2xvcixcbiAgICAgICAgJ2ZvbnQtZmFtaWx5JzogZWxlbWVudC5mb250LFxuICAgICAgICAnZm9udC1zaXplJzogZWxlbWVudC5zaXplLFxuICAgICAgICAnZm9udC1zdHlsZSc6IGVsZW1lbnQuc3R5bGUsXG4gICAgICAgIGNvbG9yOiBlbGVtZW50LnRleHRDb2xvclxuICAgIH07IC8vIHRoaXMgZGF0YSBtdW5nZSBzdGVwIG1heSBiZWxvbmcgaW4gYSBzdG9yZT9cbiAgICBsZXQgc3R5bGUgPSBPYmplY3Qua2V5cyhhdHRycykubWFwKChrZXkpID0+IChrZXkgKyAnOicgKyBhdHRyc1trZXldICsgJzsnKSkuam9pbignJyk7XG4gICAgcmV0dXJuIGh0bWxgPGRpdlxuICAgICAgICBjbGFzcz1cImdyYXBoaWMgJHtlbGVtZW50LmNsYXNzfVwiXG4gICAgICAgIHN0eWxlPVwiJHtzdHlsZX1cIlxuICAgID4ke2VsZW1lbnQudGV4dH08L2Rpdj5gO1xufTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3BhcnNlQW5kUnVuQmVoYXZpb3JzfSA9IHJlcXVpcmUoJy4vYmVoYXZpb3IuanMnKTtcblxuXG5jb25zdCBJTUFHRV9ST1RBVElPTiA9IHtcbiAgICAzOiAncm90YXRlKDE4MGRlZyknLFxuICAgIDY6ICdyb3RhdGUoOTBkZWcpJyxcbiAgICA4OiAncm90YXRlKDI3MGRlZyknXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgsIHN0YXRlLCBlbWl0LCBpc0NhcmQpIHtcbiAgICBpZiAoaXNEcmFnZ2FibGUoKSkge1xuICAgICAgICByZXR1cm4gaHRtbGA8aW1nIGNsYXNzPVwibW92YWJsZVwiXG4gICAgICAgICAgICBvbmNsaWNrPSR7ZWRpdE1vZGVDbGlja31cbiAgICAgICAgICAgIG9ubW91c2Vkb3duPSR7KGUpID0+IG1vdXNlRG93bihlKX1cbiAgICAgICAgICAgIG9ubW91c2VsZWF2ZT0keyhlKSA9PiBtb3VzZUxlYXZlKGUpfVxuICAgICAgICAgICAgb25tb3VzZXVwPSR7KGUpID0+IG1vdXNlVXAoZSl9XG4gICAgICAgICAgICBzcmM9XCIke2VsZW1lbnQuc3JjfVwiXG4gICAgICAgICAgICBhbHQ9XCIke2VsZW1lbnQuYWx0ID8gZWxlbWVudC5hbHQgOiAnJ31cIlxuICAgICAgICAgICAgaGVpZ2h0PVwiJHtlbGVtZW50LmhlaWdodCA/IGVsZW1lbnQuaGVpZ2h0IDogJyd9XCJcbiAgICAgICAgICAgIHdpZHRoPVwiJHtlbGVtZW50LndpZHRoID8gZWxlbWVudC53aWR0aCA6ICcnfVwiXG4gICAgICAgICAgICBzdHlsZT1cInRvcDoke2VsZW1lbnQudG9wfTtsZWZ0OiR7ZWxlbWVudC5sZWZ0fTske2lubGluZVN0eWxlcygpfVwiXG4gICAgICAgIC8+YDtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPGltZyBjbGFzcz1cIiR7aW1hZ2VDbGFzc2VzKCl9XCJcbiAgICAgICAgb25jbGljaz0ke2NsaWNrSGFuZGxlcn1cbiAgICAgICAgc3JjPVwiJHtlbGVtZW50LnNyY31cIlxuICAgICAgICBhbHQ9XCIke2VsZW1lbnQuYWx0ID8gZWxlbWVudC5hbHQgOiAnJ31cIlxuICAgICAgICBoZWlnaHQ9XCIke2VsZW1lbnQuaGVpZ2h0ID8gZWxlbWVudC5oZWlnaHQgOiAnJ31cIlxuICAgICAgICB3aWR0aD1cIiR7ZWxlbWVudC53aWR0aCA/IGVsZW1lbnQud2lkdGggOiAnJ31cIlxuICAgICAgICBzdHlsZT1cInRvcDoke2VsZW1lbnQudG9wfTtsZWZ0OiR7ZWxlbWVudC5sZWZ0fTske2lubGluZVN0eWxlcygpfVwiXG4gICAgLz5gO1xuXG4gICAgZnVuY3Rpb24gY2xpY2tIYW5kbGVyKCkge1xuICAgICAgICBpZiAoZXZlbnQuYWx0S2V5KSB7XG4gICAgICAgICAgICBlbWl0KCdlZGl0SW1hZ2UnLCBbZWxlbWVudCwgaW5kZXgsIGlzQ2FyZF0pO1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYmVoYXZpb3IgJiYgZWxlbWVudC5iZWhhdmlvci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcnNlQW5kUnVuQmVoYXZpb3JzKHN0YXRlLCBlbWl0LCBlbGVtZW50LmJlaGF2aW9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlubGluZVN0eWxlcygpIHtcbiAgICAgICAgbGV0IG91dCA9IFwiXCI7XG4gICAgICAgIGlmIChlbGVtZW50LnN0eWxlKSB7XG4gICAgICAgICAgICBvdXQgKz0gZWxlbWVudC5zdHlsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC5vcmllbnRhdGlvbiAmJiBlbGVtZW50Lm9yaWVudGF0aW9uICE9PSAxKSB7XG4gICAgICAgICAgICBvdXQgKz0gXCJ0cmFuc2Zvcm06IFwiICsgSU1BR0VfUk9UQVRJT05bZWxlbWVudC5vcmllbnRhdGlvbl07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbWFnZUNsYXNzZXMoKSB7XG4gICAgICAgIGlmIChlbGVtZW50LmJlaGF2aW9yICYmIGVsZW1lbnQuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2JlaGF2ZXMtb24tY2xpY2snO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0SW1hZ2UoKSB7XG4gICAgICAgIGVtaXQoJ2VkaXRJbWFnZScsIFtlbGVtZW50LCBpbmRleCwgaXNDYXJkXSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKCkge1xuICAgICAgICBpZiAoaXNDYXJkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0TW9kZUNsaWNrKGV2dCkge1xuICAgICAgICBjb25zdCBbc3RhcnRYLCBzdGFydFldID0gc3RhdGUubW91c2VEb3duO1xuICAgICAgICBpZiAoTWF0aC5hYnMoZXZ0LnNjcmVlblggLSBzdGFydFgpIDwgMTAgJiYgTWF0aC5hYnMoZXZ0LnNjcmVlblkgLSBzdGFydFkpIDwgMTApIHtcbiAgICAgICAgICAgIGVkaXRJbWFnZSgpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VEb3duKGV2dCkge1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlbWl0KCdzdGFydERyYWcnLCBbZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLCBldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFksIGV2dC50YXJnZXRdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZUxlYXZlKGV2dCkge1xuICAgICAgICBpZiAoc3RhdGUuZHJhZ0luZm8gfHwgc3RhdGUucmVzaXplSW5mbykge1xuICAgICAgICAgICAgY29uc3QgeWVySW5mbyA9IHN0YXRlLmRyYWdJbmZvID8gc3RhdGUuZHJhZ0luZm8gOiBzdGF0ZS5yZXNpemVJbmZvO1xuICAgICAgICAgICAgaWYgKHllckluZm8udGFyZ2V0ID09IGV2dC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZVVwKGV2dCkge1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIGVtaXQoJ2ZpbmlzaERyYWcnLCBbXG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA/ICdtb3ZlSW1hZ2UnIDogJ3Jlc2l6ZUltYWdlJyxcbiAgICAgICAgICAgIGV2dC5zY3JlZW5YLCBldnQuc2NyZWVuWSxcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gZXZ0LnRhcmdldC5zdHlsZS5sZWZ0IDogZXZ0LnRhcmdldC5jbGllbnRXaWR0aCxcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gZXZ0LnRhcmdldC5zdHlsZS50b3AgOiBldnQudGFyZ2V0LmNsaWVudEhlaWdodCxcbiAgICAgICAgICAgIGluZGV4XG4gICAgICAgIF0pO1xuICAgIH1cbn07XG4iLCJjb25zdCB7bW9kUGF0aCwgZ2V0UGF0aH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgQXBwU3RvcmUgPSBhc3luYyBmdW5jdGlvbihzdGF0ZSwgZW1pdHRlcikge1xuICAgIGNvbnN0IHBva2UgPSBtb2RQYXRoKHN0YXRlLCBlbWl0dGVyKTtcblxuICAgIGNvbnN0IGxvY2FsQXJjID0gbmV3IERhdEFyY2hpdmUod2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKCkpO1xuICAgIGNvbnN0IHJhd1N0YXRlID0gSlNPTi5wYXJzZShhd2FpdCBsb2NhbEFyYy5yZWFkRmlsZSgnc3RhY2suanNvbicpKTtcbiAgICBPYmplY3Qua2V5cyhyYXdTdGF0ZSkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIHN0YXRlW2tleV0gPSByYXdTdGF0ZVtrZXldO1xuICAgIH0pO1xuXG4gICAgc3RhdGUuZ2V0Q2FyZHMgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkcztcbiAgICB9O1xuICAgIHN0YXRlLmdldENhcmRDb3VudCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmRzLmxlbmd0aDtcbiAgICB9XG4gICAgc3RhdGUuc2V0TmV4dENhcmQgPSAobnVtKSA9PiB7XG4gICAgICAgIHN0YXRlLm5leHRDYXJkID0gbnVtO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmN1cnJlbnRDYXJkO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0Q3VycmVudENhcmQgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF07XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4ID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuY3VycmVudEJhY2tncm91bmQ7XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXTtcbiAgICB9O1xuICAgIHN0YXRlLmdldEJhY2tncm91bmRGb3JDYXJkID0gKGNhcmQpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmJhY2tncm91bmRzW2NhcmQuYmFja2dyb3VuZF07XG4gICAgfVxuICAgIHN0YXRlLmdldENhcmRzSW5DdXJyZW50QmFja2dyb3VuZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmRzLm1hcCgoY2QsIGluZCkgPT4gT2JqZWN0LmFzc2lnbih7fSwgY2QsIHtpbmRleDogaW5kfSkpXG4gICAgICAgICAgICAuZmlsdGVyKChjZCkgPT4gY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuY3VycmVudEJhY2tncm91bmQpO1xuICAgIH07XG5cbiAgICBzdGF0ZS5zZXRQcm9wZXJ0eUF0UGF0aCA9IChwYXRoQXJyYXksIHZhbHVlKSA9PiB7XG4gICAgICAgIHBva2UocGF0aEFycmF5LCB2YWx1ZSk7XG4gICAgfVxuICAgIHN0YXRlLmdldFByb3BlcnR5QXRQYXRoID0gKHBhdGhBcnJheSkgPT4ge1xuICAgICAgICByZXR1cm4gZ2V0UGF0aChzdGF0ZSwgcGF0aEFycmF5KTtcbiAgICB9O1xuXG4gICAgc3RhdGUuZWRpdE9iamVjdCA9IChvYmplY3RQYXRoKSA9PiB7XG4gICAgICAgIC8vIHRoaXMganVzdCBtZWFucyBzd2l0Y2ggb24gdGhlIGVkaXQgbW9kYWw/XG4gICAgICAgIC8vIHdoYXQgaXMgJ2VudicgaGVyZSBhbmQgbWF5YmUgd2UgaWdub3JlIGl0P1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRpbmcoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBsZVBhdGggPSBzdGF0ZS5lZGl0aW5nQ2FyZCgpXG4gICAgICAgICAgICA/IFsnY2FyZHMnLCBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCldXG4gICAgICAgICAgICA6IFsnYmFja2dyb3VuZHMnLCBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KCldO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IGxlUGF0aC5jb25jYXQob2JqZWN0UGF0aCk7XG4gICAgICAgIC8vIHNvIEkgZ3Vlc3MgdGhhdCdzIHdoYXQgdGhvc2UgYXJndW1lbnRzIGFyZVxuICAgICAgICBzd2l0Y2ggKG9iamVjdFBhdGhbMF0pIHtcbiAgICAgICAgICAgIGNhc2UgJ2VsZW1lbnRzJzpcbiAgICAgICAgICAgICAgICBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IHN0YXRlLmdldFByb3BlcnR5QXRQYXRoKHN0YXRlLmVkaXRpbmdQYXRoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ltYWdlcyc6XG4gICAgICAgICAgICAgICAgc3RhdGUuZWRpdGluZ0ltYWdlID0gc3RhdGUuZ2V0UHJvcGVydHlBdFBhdGgoc3RhdGUuZWRpdGluZ1BhdGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZmllbGRzJzpcbiAgICAgICAgICAgICAgICBzdGF0ZS5lZGl0aW5nRmllbGQgPSBzdGF0ZS5nZXRQcm9wZXJ0eUF0UGF0aChzdGF0ZS5lZGl0aW5nUGF0aCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjYXJkcyc6XG4gICAgICAgICAgICBjYXNlICdiYWNrZ3JvdW5kcyc6XG4gICAgICAgICAgICBjYXNlICdzdGFjayc6XG4gICAgICAgICAgICAgICAgLy8gb2ggYWN0dWFsbHlcbiAgICAgICAgICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IG9iamVjdFBhdGg7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgc3RhdGUuc2V0RWRpdE1vZGUgPSAodG9XaGF0KSA9PiB7XG4gICAgICAgIGlmIChbJ2VkaXRNb2RlJywnYmdFZGl0JywgJyddLmluY2x1ZGVzKHRvV2hhdCkpIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRNb2RlID0gdG9XaGF0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b1doYXQgPT09IG51bGwgfHwgdG9XaGF0ID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPSAnJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0ZS5lZGl0aW5nID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gISFzdGF0ZS5lZGl0TW9kZTtcbiAgICB9O1xuICAgIHN0YXRlLmVkaXRpbmdDYXJkID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgfTtcbiAgICBzdGF0ZS5lZGl0aW5nQmFja2dyb3VuZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9O1xuXG4gICAgLy8gd2hhdCBhYm91dCBkcmFnZ2luZ1xuICAgIC8vIG1heWJlIGRyYWdnaW5nIHN0YXlzIGhvdyBpdCBpcyBiZWNhdXNlIGl0IHNob3VsZG4ndCBoaXQgdGhlIGRpc2sgZXZlclxuXG4gICAgc3RhdGUuc2F2ZUZpZWxkID0gZnVuY3Rpb24oZXZlbnQsIGZpZWxkLCBzdGF0ZSkge1xuICAgICAgICBsZXQgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgICAgIGlmIChzdGF0ZS5jYXJkLmZpZWxkc1tmaWVsZC5uYW1lXSkge1xuICAgICAgICAgICAgc3RhdGUuY2FyZC5maWVsZHNbZmllbGQubmFtZV0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXS5maWVsZHNbZmllbGQubmFtZV0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlLmNhcmQudmFsdWVzW2ZpZWxkLm5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF0udmFsdWVzW2ZpZWxkLm5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZW1pdHRlci5vbignZ290bycsIGFzeW5jIGZ1bmN0aW9uKGZvcmNlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHN0YXRlLnBhcmFtcyAmJiBzdGF0ZS5wYXJhbXMud2hpY2gpIHtcbiAgICAgICAgICAgIGlmIChOdW1iZXIuaXNOYU4ocGFyc2VJbnQoc3RhdGUucGFyYW1zLndoaWNoKSkgJiYgQXJyYXkuaXNBcnJheShzdGF0ZS5jYXJkcykpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZChzdGF0ZS5nZXRDYXJkcygpLmZpbmRJbmRleCgoY2QpID0+IGNkLm5hbWUgPT0gc3RhdGUucGFyYW1zLndoaWNoKSk7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoTWF0aC5tYXgoc3RhdGUubmV4dENhcmQsIDApKTsgLy8gaW4gY2FzZSBvZiA0MDRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoc3RhdGUucGFyYW1zLndoaWNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5wYXJhbXMud2hpY2g7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHN0YXRlLm5leHRDYXJkICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgICAgICAgICAgIChzdGF0ZS5uZXh0Q2FyZCAhPT0gc3RhdGUuY3VycmVudENhcmQgfHwgZm9yY2UgPT09IHRydWUpKSB7XG4gICAgICAgICAgICBsZXQgbnVtID0gc3RhdGUubmV4dENhcmQ7XG4gICAgICAgICAgICBzdGF0ZS5jYXJkID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuY2FyZHNbbnVtXSk7XG4gICAgICAgICAgICBzdGF0ZS5jdXJyZW50Q2FyZCA9IG51bTtcbiAgICAgICAgICAgIGlmICghc3RhdGUuYmFja2dyb3VuZCB8fCBzdGF0ZS5jYXJkLmJhY2tncm91bmQgIT09IHN0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZCA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmdldEJhY2tncm91bmRGb3JDYXJkKHN0YXRlLmNhcmQpKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ2JhY2tncm91bmRMb2FkZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdjYXJkTG9hZGVkJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBlbWl0dGVyLm9uKCdnb3RvTmV4dENhcmQnLCBhc3luYyBmdW5jdGlvbih3cmFwID0gdHJ1ZSkge1xuICAgICAgICBjb25zdCBjdXJyZW50Q2FyZCA9IHN0YXRlLmdldEN1cnJlbnRDYXJkSW5kZXgoKTtcbiAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoKGN1cnJlbnRDYXJkICsgMSA+PSBzdGF0ZS5nZXRDYXJkQ291bnQoKSlcbiAgICAgICAgICAgID8gKHdyYXAgPyAwIDogY3VycmVudENhcmQpXG4gICAgICAgICAgICA6IGN1cnJlbnRDYXJkICsgMSk7XG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgnZ290bycpO1xuICAgIH0pO1xuICAgIGVtaXR0ZXIub24oJ2dvdG9QcmV2Q2FyZCcsIGFzeW5jIGZ1bmN0aW9uKHdyYXAgPSB0cnVlKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRDYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpO1xuICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZCgoY3VycmVudENhcmQgLSAxIDwgMClcbiAgICAgICAgICAgID8gKHdyYXAgPyBzdGF0ZS5nZXRDYXJkQ291bnQoKSAtIDEgOiAwKVxuICAgICAgICAgICAgOiBjdXJyZW50Q2FyZCAtIDEpO1xuICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ2dvdG8nKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3NhdmUnLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IHNhdmVkU3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmNhcmQ7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmJhY2tncm91bmQ7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmVkaXRNb2RlO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5lZGl0aW5nUGF0aDtcbiAgICAgICAgZGVsZXRlIHNhdmVkU3RhdGUucGFyYW1zO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5zdHlsZUNhY2hlO1xuICAgICAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoc2F2ZWRTdGF0ZSkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2F2ZWRTdGF0ZVtrZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVkU3RhdGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBkZWxldGUgc2F2ZWRTdGF0ZS5xdWVyeTtcbiAgICAgICAgLy8gZGVsZXRlIHNhdmVkU3RhdGUuaHJlZjsgLy8gbW9yZSBjaG9vIGJ1aWx0aW5zXG4gICAgICAgIGF3YWl0IGxvY2FsQXJjLndyaXRlRmlsZSgnc3RhY2suanNvbicsXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeShzYXZlZFN0YXRlKSk7XG4gICAgICAgIHdpbmRvdy50ZXN0U3RhdGUgPSBzYXZlZFN0YXRlO1xuICAgIH0pO1xuXG4gICAgaWYgKCFzdGF0ZS5jYXJkIHx8ICFzdGF0ZS5iYWNrZ3JvdW5kIHx8IE9iamVjdC5rZXlzKHN0YXRlLmNhcmQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZChzdGF0ZS5jdXJyZW50Q2FyZCk7XG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgnZ290bycsIHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgncmVuZGVyJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3R5bGVTaGVldCA9IGF3YWl0IGxvY2FsQXJjLnJlYWRGaWxlKCdzdGFjay5jc3MnKTtcbiAgICBzdGF0ZS5zdHlsZUNhY2hlID0gc3R5bGVTaGVldDtcblxuICAgIGVtaXR0ZXIub24oJ3NldFN0eWxlcycsIGFzeW5jIGZ1bmN0aW9uKHN0eWxlVGV4dCkge1xuICAgICAgICBhd2FpdCBsb2NhbEFyYy53cml0ZUZpbGUoJ3N0YWNrLmNzcycsIHN0eWxlVGV4dCk7XG5cbiAgICAgICAgc3RhdGUuc3R5bGVDYWNoZSA9IHN0eWxlVGV4dDtcbiAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdyZW5kZXInKTtcbiAgICB9KTtcblxuICAgIGxldCBhbHRLZXlSZWFkaWVkID0gZmFsc2U7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXlkb3duJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKC9eQWx0Ly50ZXN0KGV2ZW50LmNvZGUpKSB7XG4gICAgICAgICAgICBhbHRLZXlSZWFkaWVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChhbHRLZXlSZWFkaWVkKSB7XG4gICAgICAgICAgICAgICAgc3dpdGNoIChldmVudC5jb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0VudGVyJzogZW1pdHRlci5lbWl0KCd0b2dnbGVFZGl0TW9kZScpOyBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQXJyb3dSaWdodCc6IGVtaXR0ZXIuZW1pdCgnZ290b05leHRDYXJkJyk7IGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdBcnJvd0xlZnQnOiBlbWl0dGVyLmVtaXQoJ2dvdG9QcmV2Q2FyZCcpOyBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnS2V5Tic6IGVtaXR0ZXIuZW1pdCgnbmV3Q2FyZCcpOyBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZXZlbnQuY29kZSA9PT0gXCJFc2NhcGVcIikge1xuICAgICAgICAgICAgICAgIGFsdEtleVJlYWRpZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ1BhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdjbG9zZUVkaXQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgndHVybk9mZkVkaXRNb2RlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoL15BbHQvLnRlc3QoZXZlbnQuY29kZSkgJiYgYWx0S2V5UmVhZGllZCkge1xuICAgICAgICAgICAgYWx0S2V5UmVhZGllZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdyZW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhZEd1eXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzZWxlY3QnKTtcbiAgICAgICAgICAgIC8vIHNvIG5hbWVkIG9ubHkgYmVjYXVzZSB0aGlzIGlzIHRvIGZpeCB3aGF0IHdlIGV4cGVyaWVuY2UgYXMgYSBidWchXG4gICAgICAgICAgICAvLyBXSEFUQ0hBIEdPTk5BIERPIFdIRU4gVEhFWSBDT01FIEZPUiBZT1VcbiAgICAgICAgICAgIGlmIChiYWRHdXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGJhZEd1eXMuZm9yRWFjaCgoZ3V5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChndXkuaGFzQXR0cmlidXRlKCdkYXRhLXJlYWx2YWx1ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBndXkucXVlcnlTZWxlY3RvckFsbCgnb3B0aW9uJykuZm9yRWFjaCgob3B0LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHQudmFsdWUgPT0gZ3V5LmdldEF0dHJpYnV0ZSgnZGF0YS1yZWFsdmFsdWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBndXkuc2VsZWN0ZWRJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3V5LnF1ZXJ5U2VsZWN0b3JBbGwoJ29wdGlvbicpLmZvckVhY2goKG9wdCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0Lmhhc0F0dHJpYnV0ZSgnc2VsZWN0ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBndXkuc2VsZWN0ZWRJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEwKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGFzeW5jRW1pdCgpIHtcbiAgICAgICAgbGV0IGFyZ3MgPSBbLi4uYXJndW1lbnRzXTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdC5hcHBseShlbWl0dGVyLCBhcmdzKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocmVzb2x2ZSwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQXBwU3RvcmU7XG4iLCJjb25zdCB7cGFyc2VBbmRSdW5CZWhhdmlvcnN9ID0gcmVxdWlyZSgnLi4vYmVoYXZpb3IuanMnKTtcblxuXG5jb25zdCBCZ1N0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbignYmFja2dyb3VuZExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc3RhdGUuYmFja2dyb3VuZC5iZWhhdmlvciAmJiBzdGF0ZS5iYWNrZ3JvdW5kLmJlaGF2aW9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFyc2VBbmRSdW5CZWhhdmlvcnMoc3RhdGUsIGVtaXR0ZXIuZW1pdC5iaW5kKGVtaXR0ZXIpLCBzdGF0ZS5iYWNrZ3JvdW5kLmJlaGF2aW9yKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignY2FyZExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBsZXQgdmFsdWVzID0gc3RhdGUuY2FyZC52YWx1ZXM7XG4gICAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHZhbHVlcykuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLmJhY2tncm91bmQuZmllbGRzW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZC5maWVsZHNbZmllbGROYW1lXS52YWx1ZSA9IHZhbHVlc1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBibGFua0JnID0ge1xuICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgaW1hZ2VzOiBbXSxcbiAgICAgICAgZWxlbWVudHM6IFtdLFxuICAgICAgICBmaWVsZHM6IHt9LFxuICAgICAgICBiZWhhdmlvcjogW11cbiAgICB9O1xuXG4gICAgZW1pdHRlci5vbignbmV3QmcnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuYmFja2dyb3VuZHMucHVzaChPYmplY3QuYXNzaWduKHt9LCBibGFua0JnKSk7XG4gICAgICAgIC8vIHRoZW4gZ28gdGhlcmU/XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdlZGl0QmcnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBbJ2JhY2tncm91bmRzJywgc3RhdGUuY3VycmVudEJhY2tncm91bmRdO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZS5lZGl0aW5nRmllbGQgPSBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IG51bGw7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdlbnZQcm9wZXJ0eUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nUGF0aCAmJiBzdGF0ZS5lZGl0aW5nUGF0aFswXSA9PT0gJ2JhY2tncm91bmRzJykge1xuICAgICAgICAgICAgY29uc3QgcHJvcE5hbWUgPSBldmVudC50YXJnZXQubmFtZTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kc1tzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF1bcHJvcE5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQmdTdG9yZTtcbiIsImNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9yc30gPSByZXF1aXJlKCcuLi9iZWhhdmlvci5qcycpO1xuXG5cbmNvbnN0IENhcmRTdG9yZSA9IChzdGF0ZSwgZW1pdHRlcikgPT4ge1xuICAgIGVtaXR0ZXIub24oJ25ld0NhcmQnLCAoW3N0dWZmID0ge31dKSA9PiB7XG4gICAgICAgIGxldCBuZXdDYXJkID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuY2FyZCwge1xuICAgICAgICAgICAgbmFtZTogJycsXG4gICAgICAgICAgICB2YWx1ZXM6IHt9LFxuICAgICAgICAgICAgaW1hZ2VzOiBbXSxcbiAgICAgICAgICAgIGVsZW1lbnRzOiBbXSxcbiAgICAgICAgICAgIGZpZWxkczoge30sXG4gICAgICAgICAgICBiZWhhdmlvcjogW11cbiAgICAgICAgfSwgc3R1ZmYpO1xuICAgICAgICBzdGF0ZS5jYXJkcy5zcGxpY2Uoc3RhdGUuY3VycmVudENhcmQgKyAxLCAwLCBuZXdDYXJkKTtcbiAgICAgICAgc3RhdGUubmV4dENhcmQgPSBzdGF0ZS5jdXJyZW50Q2FyZCArIDE7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdnb3RvJyk7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdjYXJkTG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChzdGF0ZS5jYXJkLmJlaGF2aW9yICYmIHN0YXRlLmNhcmQuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJzZUFuZFJ1bkJlaGF2aW9ycyhzdGF0ZSwgZW1pdHRlci5lbWl0LmJpbmQoZW1pdHRlciksIHN0YXRlLmNhcmQuYmVoYXZpb3IpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdlZGl0Q2FyZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IFsnY2FyZHMnLCBzdGF0ZS5jdXJyZW50Q2FyZF07XG4gICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmVkaXRpbmdGaWVsZCA9IHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2RlbGV0ZUNhcmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHN0YXRlLmNhcmRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmNhcmRzLnNwbGljZShzdGF0ZS5jdXJyZW50Q2FyZCwgMSk7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3aXRoIHRoZSBiYWNrZ3JvdW5kIGlmIGl0IGlzIG5vdyBjYXJkbGVzcz9cbiAgICAgICAgaWYgKHN0YXRlLmN1cnJlbnRDYXJkID4gMCkge1xuICAgICAgICAgICAgc3RhdGUuY3VycmVudENhcmQtLTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5jYXJkID0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZW52UHJvcGVydHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ1BhdGggJiYgc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT09ICdjYXJkcycpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZXZlbnQudGFyZ2V0Lm5hbWU7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXVtwcm9wTmFtZV0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkU3RvcmU7XG4iLCJjb25zdCB7dG9QeH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbmNvbnN0IEVkaXRTdG9yZSA9IChzdGF0ZSwgZW1pdHRlcikgPT4ge1xuICAgIGVtaXR0ZXIub24oJ3RvZ2dsZUVkaXRNb2RlJywgZnVuY3Rpb24oaXNDYXJkTGV2ZWxFdmVudCA9IHRydWUpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3R1cm5PZmZFZGl0TW9kZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPSBpc0NhcmRMZXZlbEV2ZW50ID8gJ2VkaXRNb2RlJyA6ICdiZ0VkaXQnO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGVtaXR0ZXIub24oJ2VkaXRCZ01vZGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnKSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0TW9kZSA9ICdiZ0VkaXQnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPSAnZWRpdE1vZGUnO1xuICAgICAgICB9XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgnY2xvc2VFZGl0Jyk7IC8vIHRoYXQnbGwgcmVuZGVyIGZvciB1c1xuICAgIH0pO1xuICAgIGVtaXR0ZXIub24oJ3R1cm5PZmZFZGl0TW9kZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5lZGl0TW9kZSA9ICcnO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IG51bGw7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gc3RhdGUuZWRpdGluZ0ZpZWxkID0gbnVsbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ25ld0ltYWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmFkZGluZ0ltYWdlID0gdHJ1ZTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3N0YXJ0RHJhZycsIGZ1bmN0aW9uKFtzY3JlZW5YLCBzY3JlZW5ZLCBvZmZzZXRYLCBvZmZzZXRZLCB0YXJnZXRdKSB7XG4gICAgICAgIHN0YXRlLm1vdXNlRG93biA9IFtzY3JlZW5YLCBzY3JlZW5ZXTtcbiAgICAgICAgaWYgKE1hdGguYWJzKHRhcmdldC5jbGllbnRIZWlnaHQgLSBvZmZzZXRZKSA8IDEwKSB7XG4gICAgICAgICAgICBzdGF0ZS5yZXNpemVJbmZvID0ge1xuICAgICAgICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNlZGl0YmFyJykuY2xpZW50SGVpZ2h0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKE1hdGguYWJzKHRhcmdldC5jbGllbnRXaWR0aCAtIG9mZnNldFgpIDwgMTApIHtcbiAgICAgICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgICAgICAgIHdpZHRoOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPSB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0WCxcbiAgICAgICAgICAgICAgICBvZmZzZXRZOiBvZmZzZXRZICsgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2VkaXRiYXInKS5jbGllbnRIZWlnaHQsXG4gICAgICAgICAgICAgICAgdGFyZ2V0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdmaW5pc2hEcmFnJywgZnVuY3Rpb24oW2ZvbGxvd09uQWN0aW9uLCBzY3JlZW5YLCBzY3JlZW5ZLCB4LCB5LCBpZGVudF0pIHtcbiAgICAgICAgY29uc3QgW3N0YXJ0WCwgc3RhcnRZXSA9IHN0YXRlLm1vdXNlRG93bjtcbiAgICAgICAgaWYgKE1hdGguYWJzKHNjcmVlblggLSBzdGFydFgpID49IDEwIHx8IE1hdGguYWJzKHNjcmVlblkgLSBzdGFydFkpID49IDEwKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoZm9sbG93T25BY3Rpb24sIFtpZGVudCwgeCwgeV0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXZ0LnRhcmdldC5jbGFzc05hbWUuaW5jbHVkZXMoJ21vdmFibGUnKSkge1xuICAgICAgICAgICAgaWYgKGV2dC50YXJnZXQubm9kZU5hbWUgPT0gJ0lNRycpIHtcbiAgICAgICAgICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZS5kcmFnSW5mbykge1xuICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuc3R5bGUudG9wID0gKGV2dC5wYWdlWSAtIHN0YXRlLmRyYWdJbmZvLm9mZnNldFkpICsgJ3B4JztcbiAgICAgICAgICAgICAgICBldnQudGFyZ2V0LnN0eWxlLmxlZnQgPSAoZXZ0LnBhZ2VYIC0gc3RhdGUuZHJhZ0luZm8ub2Zmc2V0WCkgKyAncHgnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5yZXNpemVJbmZvKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnJlc2l6ZUluZm8ud2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5zdHlsZS53aWR0aCA9IChldnQucGFnZVggLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUubGVmdClcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gdG9QeChldnQudGFyZ2V0LnN0eWxlLnBhZGRpbmdMZWZ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUucGFkZGluZ1JpZ2h0KSkgKyAncHgnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuc3R5bGUuaGVpZ2h0ID0gKGV2dC5wYWdlWSAtIHN0YXRlLnJlc2l6ZUluZm8uaGVpZ2h0IC8vIHRoZSBlZGl0YmFyIVxuICAgICAgICAgICAgICAgICAgICAgICAgLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUudG9wKVxuICAgICAgICAgICAgICAgICAgICAgICAgLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUucGFkZGluZ1RvcClcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gdG9QeChldnQudGFyZ2V0LnN0eWxlLnBhZGRpbmdCb3R0b20pKSArICdweCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBldnQudGFyZ2V0LnN0eWxlLmN1cnNvciA9XG4gICAgICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuY2xpZW50SGVpZ2h0IC0gZXZ0Lm9mZnNldFkgPCAxMFxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnbnMtcmVzaXplJ1xuICAgICAgICAgICAgICAgICAgICAgICAgOiAoZXZ0LnRhcmdldC5jbGllbnRXaWR0aCAtIGV2dC5vZmZzZXRYIDwgMTBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdldy1yZXNpemUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdFN0b3JlO1xuIiwiY29uc3QgRWRpdE1vZGFsU3RvcmUgPSAoc3RhdGUsIGVtaXR0ZXIpID0+IHtcbiAgICBlbWl0dGVyLm9uKCdjbG9zZUVkaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBudWxsO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IG51bGw7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdGaWVsZCA9IG51bGw7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IG51bGw7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCd0b2dnbGVGdW5jdGlvbkVkaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuZWRpdGluZ0Z1bmN0aW9uID0gc3RhdGUuZWRpdGluZ0Z1bmN0aW9uID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbigncHJvcGVydHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBsZXQgcHJvcE5hbWUgPSBldmVudC50YXJnZXQubmFtZTtcbiAgICAgICAgbGV0IG5ld1ZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgICBsZXQgZWRpdFBhdGggPSBzdGF0ZS5lZGl0aW5nUGF0aDtcblxuICAgICAgICBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV1bcHJvcE5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgIGlmIChlZGl0UGF0aFswXSA9PT0gJ2NhcmRzJykge1xuICAgICAgICAgICAgc3RhdGUuY2FyZCA9IHN0YXRlW2VkaXRQYXRoWzBdXVtlZGl0UGF0aFsxXV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kID0gc3RhdGVbZWRpdFBhdGhbMF1dW2VkaXRQYXRoWzFdXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nRWxlbWVudCkge1xuICAgICAgICAgICAgc3RhdGUuZWRpdGluZ0VsZW1lbnQgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ0ZpZWxkKSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nRmllbGQgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gLy8gaG1tIGRvIHdlIG5lZWQgYSByZWZhY3Rvcj8gTUFBQUFZWVlZWUJFXG5cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdFN0YWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gc3RhdGUuZWRpdGluZ0ZpZWxkID0gc3RhdGUuZWRpdGluZ0ltYWdlID0gbnVsbDtcbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBbJ3N0YWNrJ107XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzdGFja1Byb3BlcnR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdQYXRoICYmIHN0YXRlLmVkaXRpbmdQYXRoWzBdID09PSAnc3RhY2snKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGV2ZW50LnRhcmdldC5uYW1lO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG5cbiAgICAgICAgICAgIGlmIChbJ2NvbG9yJ10uaW5jbHVkZXMocHJvcE5hbWUpKSB7IC8vIGxpc3Qgd2lsbCBleHBhbmQgaW4gZnV0dXJlLCBvYnZzXG4gICAgICAgICAgICAgICAgc3RhdGVbcHJvcE5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRNb2RhbFN0b3JlO1xuIiwiY29uc3Qge21vZEVudiwgbW9kUGF0aH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgRWxlbWVudFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgY29uc3QgY2hhbmdlID0gbW9kRW52KHN0YXRlLCBlbWl0dGVyKTtcbiAgICBjb25zdCBwb2tlID0gbW9kUGF0aChzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBjb25zdCBibGFua0VsZW1lbnQgPSB7XG4gICAgICAgIFwidG9wXCI6IFwiMzAwcHhcIixcbiAgICAgICAgXCJsZWZ0XCI6IFwiMzAwcHhcIixcbiAgICAgICAgXCJoZWlnaHRcIjogXCIzNXB4XCIsXG4gICAgICAgIFwid2lkdGhcIjogXCIxMDBweFwiLFxuICAgICAgICBcImNvbG9yXCI6IFwiI2RkZFwiLFxuICAgICAgICBcInRleHRcIjogXCJcIixcbiAgICAgICAgXCJmb250XCI6IFwiXCIsXG4gICAgICAgIFwic2l6ZVwiOiBcIjEuNnJlbVwiLFxuICAgICAgICBcInN0eWxlXCI6IFwiXCIsXG4gICAgICAgIFwidGV4dENvbG9yXCI6IFwiIzMzM1wiLFxuICAgICAgICBcImNsYXNzXCI6IFwiXCIsXG4gICAgICAgIFwiYmVoYXZpb3JcIjogW11cbiAgICB9O1xuXG4gICAgZW1pdHRlci5vbignbmV3RWxlbWVudCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuZWxlbWVudHMucHVzaChPYmplY3QuYXNzaWduKHt9LCBibGFua0VsZW1lbnQpKTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2VkaXRFbGVtZW50JywgYXN5bmMgZnVuY3Rpb24oW2VsZW1lbnQsIGluZGV4LCBpc0NhcmQgPSBmYWxzZV0pIHtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0TW9kZSkge1xuICAgICAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCd0b2dnbGVFZGl0TW9kZScsIGlzQ2FyZCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcGF0aCA9IGlzQ2FyZCA/IFsnY2FyZHMnXSA6IFsnYmFja2dyb3VuZHMnXTtcbiAgICAgICAgcGF0aC5wdXNoKGlzQ2FyZCA/IHN0YXRlLmN1cnJlbnRDYXJkIDogc3RhdGUuY3VycmVudEJhY2tncm91bmQpO1xuICAgICAgICBwYXRoID0gcGF0aC5jb25jYXQoWydlbGVtZW50cycsIGluZGV4XSk7XG5cbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBwYXRoO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZS5lZGl0aW5nRmllbGQgPSBudWxsO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IGVsZW1lbnQ7XG5cbiAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdyZW5kZXInKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ21vdmVFbGVtZW50JywgZnVuY3Rpb24oW2luZGV4LCB4LCB5XSkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2FyZC5lbGVtZW50c1tpbmRleF0sXG4gICAgICAgICAgICAgICAge3RvcDogeSwgbGVmdDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbigncmVzaXplRWxlbWVudCcsIGZ1bmN0aW9uKFtpbmRleCwgeCwgeV0pIHtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKGNhcmQuZWxlbWVudHNbaW5kZXhdLFxuICAgICAgICAgICAgICAgIHtoZWlnaHQ6IHksIHdpZHRoOiB4fSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzZXRCZWhhdmlvck9iaicsIGZ1bmN0aW9uKFtwYXRoLCB2YWx1ZV0pIHtcbiAgICAgICAgcG9rZShwYXRoLCB2YWx1ZSk7XG4gICAgICAgIC8vIHJlZHVuZGFudGx5IHJlbmRlcmluZyBiZWNhdXNlIHNlbGVjdCBlbGVtZW50cyBhcmUgdGhlIHdvcnN0XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBhc3luY0VtaXQoKSB7XG4gICAgICAgIGxldCBhcmdzID0gWy4uLmFyZ3VtZW50c107XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQuYXBwbHkoZW1pdHRlciwgYXJncyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmUsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBlbWl0dGVyLm9uKCdkZWxldGVFbGVtZW50JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3RhdGUuZWRpdGluZ1BhdGhbc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoIC0gMV07XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgY2FyZC5lbGVtZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ2Nsb3NlRWRpdCcpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbGVtZW50U3RvcmU7XG4iLCJjb25zdCB7bW9kRW52LCBtb2RQYXRofSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBzYXZlRmllbGRUb1N0YXRlID0gZnVuY3Rpb24oZXZlbnQsIGZpZWxkLCBzdGF0ZSkge1xuICAgIGxldCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICBpZiAoc3RhdGUuY2FyZC5maWVsZHNbZmllbGQubmFtZV0pIHtcbiAgICAgICAgc3RhdGUuY2FyZC5maWVsZHNbZmllbGQubmFtZV0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdLmZpZWxkc1tmaWVsZC5uYW1lXS52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYmFja2dyb3VuZCBmaWVsZD9cIik7XG4gICAgICAgIHN0YXRlLmNhcmQudmFsdWVzW2ZpZWxkLm5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXS52YWx1ZXNbZmllbGQubmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG59O1xuXG5jb25zdCBGaWVsZFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbihcImZpZWxkY2hhbmdlXCIsIGZ1bmN0aW9uKFtldmVudCwgZmllbGRdKSB7XG4gICAgICAgIHNhdmVGaWVsZFRvU3RhdGUoZXZlbnQsIGZpZWxkLCBzdGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KFwicmVuZGVyXCIpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KFwic2F2ZVwiKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSk7XG4gICAgZW1pdHRlci5vbihcImZpZWxkS2V5VXBcIiwgKFtldmVudCwgZmllbGRdKSA9PiB7XG4gICAgICAgIHNhdmVGaWVsZFRvU3RhdGUoZXZlbnQsIGZpZWxkLCBzdGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KFwic2F2ZVwiKSwgMSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBibGFua0ZpZWxkID0ge1xuICAgICAgICBuYW1lOiBcIlwiLFxuICAgICAgICB0b3A6IFwiMzAwcHhcIixcbiAgICAgICAgbGVmdDogXCIzMDBweFwiLFxuICAgICAgICBoZWlnaHQ6IFwiMTRweFwiLFxuICAgICAgICB3aWR0aDogXCIxODBweFwiLFxuICAgICAgICBjb2xvcjogXCJcIixcbiAgICAgICAgZm9udDogXCJcIixcbiAgICAgICAgc2l6ZTogXCJcIixcbiAgICAgICAgc3R5bGU6IFwiXCIsXG4gICAgICAgIHRleHRDb2xvcjogXCJcIixcbiAgICAgICAgZmllbGRUeXBlOiBcInRleHRcIixcbiAgICAgICAgdmFsdWU6IFwiXCIsXG4gICAgICAgIG9wdGlvbnM6IFtdLFxuICAgICAgICBwbGFjZWhvbGRlcjogXCJcIixcbiAgICAgICAgYmVoYXZpb3I6IFtdXG4gICAgfTtcbiAgICBjb25zdCB1bmlxdWVGaWVsZE5hbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPVxuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPT09IFwiYmdFZGl0XCIgPyBzdGF0ZS5iYWNrZ3JvdW5kIDogc3RhdGUuY2FyZDtcbiAgICAgICAgbGV0IHRyeW51bSA9IDE7XG4gICAgICAgIGxldCB0cnlBTmFtZSA9IFwibmV3RmllbGRcIiArIHRyeW51bTtcbiAgICAgICAgd2hpbGUgKHR5cGVvZiBsb2NhdGlvblt0cnlBTmFtZV0gIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdHJ5QU5hbWUgPSBcIm5ld0ZpZWxkXCIgKyArK3RyeW51bTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ5QU5hbWU7XG4gICAgfTtcblxuICAgIGNvbnN0IGNoYW5nZSA9IG1vZEVudihzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBlbWl0dGVyLm9uKFwibmV3RmllbGRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBmaWVsZE5hbWUgPSB1bmlxdWVGaWVsZE5hbWUoKTtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBjYXJkLmZpZWxkc1tmaWVsZE5hbWVdID0gT2JqZWN0LmFzc2lnbih7fSwgYmxhbmtGaWVsZCwge1xuICAgICAgICAgICAgICAgIG5hbWU6IGZpZWxkTmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKFwibW92ZUZpZWxkXCIsIGZ1bmN0aW9uKFtmaWVsZE5hbWUsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmZpZWxkc1tmaWVsZE5hbWVdLFxuICAgICAgICAgICAgICAgIHt0b3A6IHksIGxlZnQ6IHh9KTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oXCJyZXNpemVGaWVsZFwiLCBmdW5jdGlvbihbZmllbGROYW1lLCB4LCB5XSkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2FyZC5maWVsZHNbZmllbGROYW1lXSxcbiAgICAgICAgICAgICAgICB7aGVpZ2h0OiB5LCB3aWR0aDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdEZpZWxkJywgZnVuY3Rpb24oW2ZpZWxkLCBuYW1lLCBpc0NhcmQgPSBmYWxzZV0pIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnJykge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCd0b2dnbGVFZGl0TW9kZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoc3RhdGUuZWRpdE1vZGUgPT09ICdiZ0VkaXQnICYmICFpc0NhcmQpIHx8XG4gICAgICAgICAgICAoc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZScgJiYgaXNDYXJkKSlcbiAgICAgICAge1xuICAgICAgICAgICAgbGV0IHBhdGggPSBpc0NhcmQgPyBbJ2NhcmRzJ10gOiBbJ2JhY2tncm91bmRzJ107XG4gICAgICAgICAgICBwYXRoLnB1c2goaXNDYXJkID8gc3RhdGUuY3VycmVudENhcmQgOiBzdGF0ZS5jdXJyZW50QmFja2dyb3VuZCk7XG4gICAgICAgICAgICBwYXRoID0gcGF0aC5jb25jYXQoWydmaWVsZHMnLCBuYW1lXSk7XG5cbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdQYXRoID0gcGF0aDtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdGaWVsZCA9IGZpZWxkO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzZXRGaWVsZE9wdGlvbnMnLCBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3RhdGUuZWRpdGluZ1BhdGhbc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoIC0gMV07XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgY2FyZC5maWVsZHNbaW5kZXhdLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pXG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdkZWxldGVGaWVsZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHN0YXRlLmVkaXRpbmdQYXRoW3N0YXRlLmVkaXRpbmdQYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBjYXJkLmZpZWxkc1tpbmRleF07XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgnY2xvc2VFZGl0Jyk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpZWxkU3RvcmU7XG4iLCJjb25zdCB7bW9kRW52fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBJbWFnZVN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbignYWRkSW1hZ2UnLCBmdW5jdGlvbihbZXZlbnRdKSB7XG4gICAgICAgIC8vIGNvcHBlZCBhbmQgbW9kaWZpZWQgZnJvbSBAdGFyYXZhbmNpbCdzIGRhdC1waG90by1hcHBcbiAgICAgICAgaWYgKGV2ZW50LnRhcmdldC5maWxlcykge1xuICAgICAgICAgICAgY29uc3Qge2ZpbGVzfSA9IGV2ZW50LnRhcmdldDtcbiAgICAgICAgICAgIGNvbnN0IGFyY2hpdmUgPSBuZXcgRGF0QXJjaGl2ZSh3aW5kb3cubG9jYXRpb24pO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gZmlsZXNbaV07XG5cbiAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgL2ltZy8ke2ZpbGUubmFtZX1gO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IHJlYWRPcmllbnRhdGlvbk1ldGFkYXRhKHJlYWRlci5yZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gYXdhaXQgYXJjaGl2ZS5zdGF0KHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wbGFpbnQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgSW1hZ2Ugd2l0aCB0aGUgbmFtZSBcIiR7ZmlsZS5uYW1lfVwiIGFscmVhZHkgZXhpc3RzLiBSZXBsYWNlIGl0P2A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpbmRvdy5jb25maXJtKGNvbXBsYWludCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgYXJjaGl2ZS53cml0ZUZpbGUocGF0aCwgcmVhZGVyLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGFyY2hpdmUuY29tbWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEltYWdlT2JqZWN0KHBhdGgsIG9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGFyY2hpdmUud3JpdGVGaWxlKHBhdGgsIHJlYWRlci5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgYXJjaGl2ZS5jb21taXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEltYWdlT2JqZWN0KHBhdGgsIG9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmFkZGluZ0ltYWdlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gYWRkSW1hZ2VPYmplY3QocGF0aCwgb3JpZW50YXRpb24gPSAxKSB7XG4gICAgICAgIGNvbnN0IG5ld2d1eSA9IHtcbiAgICAgICAgICAgIHRvcDogJzMwMHB4JyxcbiAgICAgICAgICAgIGxlZnQ6ICczMDBweCcsXG4gICAgICAgICAgICBzcmM6IHBhdGgsXG4gICAgICAgICAgICBvcmllbnRhdGlvbixcbiAgICAgICAgICAgIGJlaGF2aW9yOiBbXVxuICAgICAgICB9O1xuICAgICAgICBpZiAoc3RhdGUuZWRpdE1vZGUgPT09ICdiZ0VkaXQnKSB7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kc1tzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF0uaW1hZ2VzLnB1c2gobmV3Z3V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXS5pbWFnZXMucHVzaChuZXdndXkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gYWxzbyBjcmliYmVkIGZyb20gZGF0LXBob3RvLWFwcCBhbmQgbm90IGV2ZW4gbW9kaWZpZWQgYmVjYXVzZSBJIGFtIG5vdCBzbWFydFxuICAgIGZ1bmN0aW9uIHJlYWRPcmllbnRhdGlvbk1ldGFkYXRhIChidWYpIHtcbiAgICAgICAgY29uc3Qgc2Nhbm5lciA9IG5ldyBEYXRhVmlldyhidWYpO1xuICAgICAgICBsZXQgaWR4ID0gMDtcbiAgICAgICAgbGV0IHZhbHVlID0gMTsgLy8gTm9uLXJvdGF0ZWQgaXMgdGhlIGRlZmF1bHRcblxuICAgICAgICBpZiAoYnVmLmxlbmd0aCA8IDIgfHwgc2Nhbm5lci5nZXRVaW50MTYoaWR4KSAhPSAweEZGRDgpIHtcbiAgICAgICAgICAvLyBub3QgYSBKUEVHXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWR4ICs9IDI7XG5cbiAgICAgICAgbGV0IG1heEJ5dGVzID0gc2Nhbm5lci5ieXRlTGVuZ3RoO1xuICAgICAgICB3aGlsZShpZHggPCBtYXhCeXRlcyAtIDIpIHtcbiAgICAgICAgICBsZXQgdWludDE2ID0gc2Nhbm5lci5nZXRVaW50MTYoaWR4KTtcbiAgICAgICAgICBpZHggKz0gMjtcbiAgICAgICAgICBzd2l0Y2godWludDE2KSB7XG4gICAgICAgICAgICBjYXNlIDB4RkZFMTogLy8gU3RhcnQgb2YgRVhJRlxuICAgICAgICAgICAgICB2YXIgZXhpZkxlbmd0aCA9IHNjYW5uZXIuZ2V0VWludDE2KGlkeCk7XG4gICAgICAgICAgICAgIG1heEJ5dGVzID0gZXhpZkxlbmd0aCAtIGlkeDtcbiAgICAgICAgICAgICAgaWR4ICs9IDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAweDAxMTI6IC8vIE9yaWVudGF0aW9uIHRhZ1xuICAgICAgICAgICAgICAvLyBSZWFkIHRoZSB2YWx1ZSwgaXRzIDYgYnl0ZXMgZnVydGhlciBvdXRcbiAgICAgICAgICAgICAgLy8gU2VlIHBhZ2UgMTAyIGF0IHRoZSBmb2xsb3dpbmcgVVJMXG4gICAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cua29kYWsuY29tL2dsb2JhbC9wbHVnaW5zL2Fjcm9iYXQvZW4vc2VydmljZS9kaWdDYW0vZXhpZlN0YW5kYXJkMi5wZGZcbiAgICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLmdldFVpbnQxNihpZHggKyA2LCBmYWxzZSk7XG4gICAgICAgICAgICAgIG1heEJ5dGVzID0gMDsgLy8gU3RvcCBzY2FubmluZ1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGVtaXR0ZXIub24oJ2VkaXRJbWFnZScsIGZ1bmN0aW9uKFtpbWFnZSwgaW5kZXgsIGlzQ2FyZCA9IGZhbHNlXSkge1xuICAgICAgICBjb25zb2xlLmxvZygnZWRpdEltYWdlJywgc3RhdGUuZWRpdE1vZGUpO1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3RvZ2dsZUVkaXRNb2RlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcGF0aCA9IGlzQ2FyZCA/IFsnY2FyZHMnXSA6IFsnYmFja2dyb3VuZHMnXTtcbiAgICAgICAgcGF0aC5wdXNoKGlzQ2FyZCA/IHN0YXRlLmN1cnJlbnRDYXJkIDogc3RhdGUuY3VycmVudEJhY2tncm91bmQpO1xuICAgICAgICBwYXRoID0gcGF0aC5jb25jYXQoWydpbWFnZXMnLCBpbmRleF0pO1xuXG4gICAgICAgIHN0YXRlLmVkaXRpbmdQYXRoID0gcGF0aDtcbiAgICAgICAgc3RhdGUuZWRpdGluZ0VsZW1lbnQgPSBzdGF0ZS5lZGl0aW5nRmllbGQgPSBudWxsO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBpbWFnZTtcblxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgY29uc3QgY2hhbmdlID0gbW9kRW52KHN0YXRlLCBlbWl0dGVyKTtcblxuICAgIGVtaXR0ZXIub24oJ21vdmVJbWFnZScsIGZ1bmN0aW9uKFtpbmRleCwgeCwgeV0pIHtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKGNhcmQuaW1hZ2VzW2luZGV4XSwge3RvcDogeSwgbGVmdDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbigncmVzaXplSW1hZ2UnLCBmdW5jdGlvbihbaW5kZXgsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmltYWdlc1tpbmRleF0sIHtoZWlnaHQ6IHksIHdpZHRoOiB4fSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdkZWxldGVJbWFnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHN0YXRlLmVkaXRpbmdQYXRoW3N0YXRlLmVkaXRpbmdQYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuaW1hZ2VzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgnY2xvc2VFZGl0Jyk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEltYWdlU3RvcmU7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5jb25zdCB1dWlkID0gcmVxdWlyZSgndXVpZC92MScpO1xuXG5cbmZ1bmN0aW9uIG1vZEVudihzdGF0ZSwgZW1pdHRlcikge1xuICAgIHJldHVybiBmdW5jdGlvbihob3cpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0Jykge1xuICAgICAgICAgICAgbGV0IG5ld0JnU3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZS5iYWNrZ3JvdW5kc1tzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF0pO1xuICAgICAgICAgICAgbmV3QmdTdGF0ZSA9IGhvdyhuZXdCZ1N0YXRlKTtcbiAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXSA9IHN0YXRlLmJhY2tncm91bmQgPSBuZXdCZ1N0YXRlO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnKSB7XG4gICAgICAgICAgICBsZXQgbmV3Q2FyZFN0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdKTtcbiAgICAgICAgICAgIG5ld0NhcmRTdGF0ZSA9IGhvdyhuZXdDYXJkU3RhdGUpO1xuICAgICAgICAgICAgc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdID0gc3RhdGUuY2FyZCA9IG5ld0NhcmRTdGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfVxufVxuXG4vLyBpZiBzdGF0ZSBnZXRzIGJpZyB0aGlzIG1pZ2h0IHNlcmlvdXNseSBtZXNzIHVzIHVwLiBsZXQncyBzZWVcbmZ1bmN0aW9uIG1vZFBhdGgoc3RhdGUsIGVtaXR0ZXIpIHtcbiAgICBjb25zdCBnZXRBbmRSZXBsYWNlUGF0aCA9IGZ1bmN0aW9uKHBhdGgsIHZhbHVlLCBpbldoYXQpIHtcbiAgICAgICAgbGV0IGN1cnJUYXJnZXQ7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGN1cnJUYXJnZXQgPSBwYXRoLnNoaWZ0KCk7XG4gICAgICAgICAgICBpbldoYXRbY3VyclRhcmdldF0gPVxuICAgICAgICAgICAgICAgIGdldEFuZFJlcGxhY2VQYXRoKHBhdGgsIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBBcnJheS5pc0FycmF5KGluV2hhdFtjdXJyVGFyZ2V0XSlcbiAgICAgICAgICAgICAgICAgICAgICAgID8gW10uY29uY2F0KGluV2hhdFtjdXJyVGFyZ2V0XSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogT2JqZWN0LmFzc2lnbih7fSwgaW5XaGF0W2N1cnJUYXJnZXRdKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbldoYXRbcGF0aFswXV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5XaGF0O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbihwYXRoLCB2YWx1ZSkge1xuICAgICAgICBzdGF0ZSA9IGdldEFuZFJlcGxhY2VQYXRoKFtdLmNvbmNhdChwYXRoKSwgdmFsdWUsIHN0YXRlKTtcbiAgICAgICAgc3RhdGUuY2FyZCA9IHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXTtcbiAgICAgICAgc3RhdGUuYmFja2dyb3VuZCA9IHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UGF0aChzdGF0ZSwgcGF0aCkge1xuICAgIGNvbnN0IGNvbnN1bWVUaGlzUGF0aCA9IFtdLmNvbmNhdChwYXRoKTtcbiAgICBsZXQgcmV0dXJuZWQgPSBzdGF0ZVtjb25zdW1lVGhpc1BhdGguc2hpZnQoKV07XG4gICAgd2hpbGUgKGNvbnN1bWVUaGlzUGF0aC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuZWQgPSByZXR1cm5lZFtjb25zdW1lVGhpc1BhdGguc2hpZnQoKV07XG4gICAgfVxuICAgIHJldHVybiByZXR1cm5lZDtcbn1cblxuZnVuY3Rpb24gdG9QeChzdHJWYWwpIHtcbiAgICBjb25zdCB0cnlhdmFsID0gcGFyc2VJbnQoc3RyVmFsLnN1YnN0cmluZygwLCBzdHJWYWwuaW5kZXhPZigncHgnKSkpO1xuICAgIHJldHVybiBOdW1iZXIuaXNOYU4odHJ5YXZhbCkgPyAwIDogdHJ5YXZhbDtcbn1cblxuZnVuY3Rpb24gc2VsZWN0T3B0aW9uKHZhbCwgbGFiZWwsIGNvbXBhcmVWYWwsIHJlYWN0S2V5KSB7XG4gICAgaWYgKHR5cGVvZiBjb21wYXJlVmFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBjb21wYXJlVmFsID0gbGFiZWw7XG4gICAgICAgIGxhYmVsID0gdmFsO1xuICAgIH1cbiAgICBjb25zdCBvcHRzID0gW1xuICAgICAgICBodG1sYDxvcHRpb24gaWQ9XCIke3JlYWN0S2V5IHx8ICcnfVwiIHZhbHVlPVwiJHt2YWx9XCIgc2VsZWN0ZWQ9XCJzZWxlY3RlZFwiPiR7bGFiZWx9PC9vcHRpb24+YCxcbiAgICAgICAgaHRtbGA8b3B0aW9uIGlkPVwiJHtyZWFjdEtleSB8fCAnJ31cIiB2YWx1ZT1cIiR7dmFsfVwiPiR7bGFiZWx9PC9vcHRpb24+YFxuICAgIF07XG4gICAgLy8gYWx3YXlzIHJlLXJlbmRlciBvcHRpb25zXG4gICAgb3B0c1swXS5pc1NhbWVOb2RlID0gb3B0c1sxXS5pc1NhbWVOb2RlID0gKCkgPT4gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIGNvbXBhcmVWYWwgPT09ICdib29sZWFuJykge1xuICAgICAgICByZXR1cm4gY29tcGFyZVZhbCA/IG9wdHNbMF0gOiBvcHRzWzFdO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGFyZVZhbCA9PSB2YWwgPyBvcHRzWzBdIDogb3B0c1sxXTtcbn1cblxuZnVuY3Rpb24gY2hlY2tCb3gobGFiZWwsIGNoZWNrZCwgaGFuZGxlcikge1xuICAgIGNvbnN0IG15SWQgPSB1dWlkKCk7XG4gICAgY29uc3Qgb3B0cyA9IFtcbiAgICAgICAgaHRtbGA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgb25jaGFuZ2U9JHtoYW5kbGVyfSBjaGVja2VkPVwiY2hlY2tlZFwiIG5hbWU9XCIke215SWR9XCIgLz5gLFxuICAgICAgICBodG1sYDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBvbmNoYW5nZT0ke2hhbmRsZXJ9IG5hbWU9XCIke215SWR9XCIgLz5gXG4gICAgXTtcbiAgICByZXR1cm4gaHRtbGA8c3BhbiBjbGFzcz1cImNoZWNrYm94XCI+XG4gICAgICAgICR7Y2hlY2tkID8gb3B0c1swXSA6IG9wdHNbMV19XG4gICAgICAgIDxsYWJlbCBmb3I9XCIke215SWR9XCI+JHtsYWJlbH08L2xhYmVsPlxuICAgIDwvc3Bhbj5gO1xufVxuXG5mdW5jdGlvbiBmaWVsZHNXaXRoVmFsdWVzKHN0YXRlKSB7XG4gICAgY29uc3QgbGVDYXJkID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdKTtcbiAgICBjb25zdCBsZUJnID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuYmFja2dyb3VuZHNbc3RhdGUuY3VycmVudEJhY2tncm91bmRdKTtcbiAgICBjb25zdCBmaWVsZHNXaXRoVmFsdWVzID0gT2JqZWN0LmtleXMobGVDYXJkLmZpZWxkcykucmVkdWNlKChvYmosIGZsZCkgPT4ge1xuICAgICAgICBvYmpbZmxkXSA9IGxlQ2FyZC5maWVsZHNbZmxkXS52YWx1ZTtcbiAgICAgICAgcmV0dXJuIG9iajtcbiAgICB9LCB7fSk7XG4gICAgT2JqZWN0LmFzc2lnbihmaWVsZHNXaXRoVmFsdWVzLCBsZUNhcmQudmFsdWVzKTtcbiAgICAvLyBvaCBnb2QgZmllbGRzIHdpbGwgbmVlZCB0aGUgY29uY2VwdCBvZiBkZWZhdWx0IHZhbHVlcywgZm9yIHJhZGlvc1xuICAgIC8vIGF0IGxlYXN0IHdoZW4gZmlyc3QgY3JlYXRlZFxuICAgIHJldHVybiBmaWVsZHNXaXRoVmFsdWVzO1xufVxuXG5mdW5jdGlvbiBjb2xvcihzdGF0ZSkge1xuICAgIGlmIChzdGF0ZS5jYXJkICYmIHN0YXRlLmNhcmQuY29sb3IpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmQuY29sb3I7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5iYWNrZ3JvdW5kICYmIHN0YXRlLmJhY2tncm91bmQuY29sb3IpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmJhY2tncm91bmQuY29sb3I7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5jb2xvcikge1xuICAgICAgICByZXR1cm4gc3RhdGUuY29sb3I7XG4gICAgfVxuICAgIHJldHVybiAnaW5oZXJpdCc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge21vZEVudiwgbW9kUGF0aCwgZ2V0UGF0aCwgdG9QeCwgc2VsZWN0T3B0aW9uLCBjaGVja0JveCwgZmllbGRzV2l0aFZhbHVlcywgY29sb3J9O1xuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZSgnZ2xvYmFsL2RvY3VtZW50JylcbnZhciBoeXBlcnggPSByZXF1aXJlKCdoeXBlcngnKVxudmFyIG9ubG9hZCA9IHJlcXVpcmUoJ29uLWxvYWQnKVxuXG52YXIgU1ZHTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnXG52YXIgWExJTktOUyA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJ1xuXG52YXIgQk9PTF9QUk9QUyA9IHtcbiAgYXV0b2ZvY3VzOiAxLFxuICBjaGVja2VkOiAxLFxuICBkZWZhdWx0Y2hlY2tlZDogMSxcbiAgZGlzYWJsZWQ6IDEsXG4gIGZvcm1ub3ZhbGlkYXRlOiAxLFxuICBpbmRldGVybWluYXRlOiAxLFxuICByZWFkb25seTogMSxcbiAgcmVxdWlyZWQ6IDEsXG4gIHNlbGVjdGVkOiAxLFxuICB3aWxsdmFsaWRhdGU6IDFcbn1cbnZhciBDT01NRU5UX1RBRyA9ICchLS0nXG52YXIgU1ZHX1RBR1MgPSBbXG4gICdzdmcnLFxuICAnYWx0R2x5cGgnLCAnYWx0R2x5cGhEZWYnLCAnYWx0R2x5cGhJdGVtJywgJ2FuaW1hdGUnLCAnYW5pbWF0ZUNvbG9yJyxcbiAgJ2FuaW1hdGVNb3Rpb24nLCAnYW5pbWF0ZVRyYW5zZm9ybScsICdjaXJjbGUnLCAnY2xpcFBhdGgnLCAnY29sb3ItcHJvZmlsZScsXG4gICdjdXJzb3InLCAnZGVmcycsICdkZXNjJywgJ2VsbGlwc2UnLCAnZmVCbGVuZCcsICdmZUNvbG9yTWF0cml4JyxcbiAgJ2ZlQ29tcG9uZW50VHJhbnNmZXInLCAnZmVDb21wb3NpdGUnLCAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsXG4gICdmZURpc3BsYWNlbWVudE1hcCcsICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsXG4gICdmZUZ1bmNHJywgJ2ZlRnVuY1InLCAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlJywgJ2ZlTWVyZ2VOb2RlJyxcbiAgJ2ZlTW9ycGhvbG9neScsICdmZU9mZnNldCcsICdmZVBvaW50TGlnaHQnLCAnZmVTcGVjdWxhckxpZ2h0aW5nJyxcbiAgJ2ZlU3BvdExpZ2h0JywgJ2ZlVGlsZScsICdmZVR1cmJ1bGVuY2UnLCAnZmlsdGVyJywgJ2ZvbnQnLCAnZm9udC1mYWNlJyxcbiAgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXNyYycsICdmb250LWZhY2UtdXJpJyxcbiAgJ2ZvcmVpZ25PYmplY3QnLCAnZycsICdnbHlwaCcsICdnbHlwaFJlZicsICdoa2VybicsICdpbWFnZScsICdsaW5lJyxcbiAgJ2xpbmVhckdyYWRpZW50JywgJ21hcmtlcicsICdtYXNrJywgJ21ldGFkYXRhJywgJ21pc3NpbmctZ2x5cGgnLCAnbXBhdGgnLFxuICAncGF0aCcsICdwYXR0ZXJuJywgJ3BvbHlnb24nLCAncG9seWxpbmUnLCAncmFkaWFsR3JhZGllbnQnLCAncmVjdCcsXG4gICdzZXQnLCAnc3RvcCcsICdzd2l0Y2gnLCAnc3ltYm9sJywgJ3RleHQnLCAndGV4dFBhdGgnLCAndGl0bGUnLCAndHJlZicsXG4gICd0c3BhbicsICd1c2UnLCAndmlldycsICd2a2Vybidcbl1cblxuZnVuY3Rpb24gYmVsQ3JlYXRlRWxlbWVudCAodGFnLCBwcm9wcywgY2hpbGRyZW4pIHtcbiAgdmFyIGVsXG5cbiAgLy8gSWYgYW4gc3ZnIHRhZywgaXQgbmVlZHMgYSBuYW1lc3BhY2VcbiAgaWYgKFNWR19UQUdTLmluZGV4T2YodGFnKSAhPT0gLTEpIHtcbiAgICBwcm9wcy5uYW1lc3BhY2UgPSBTVkdOU1xuICB9XG5cbiAgLy8gSWYgd2UgYXJlIHVzaW5nIGEgbmFtZXNwYWNlXG4gIHZhciBucyA9IGZhbHNlXG4gIGlmIChwcm9wcy5uYW1lc3BhY2UpIHtcbiAgICBucyA9IHByb3BzLm5hbWVzcGFjZVxuICAgIGRlbGV0ZSBwcm9wcy5uYW1lc3BhY2VcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgZWxlbWVudFxuICBpZiAobnMpIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgdGFnKVxuICB9IGVsc2UgaWYgKHRhZyA9PT0gQ09NTUVOVF9UQUcpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChwcm9wcy5jb21tZW50KVxuICB9IGVsc2Uge1xuICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWcpXG4gIH1cblxuICAvLyBJZiBhZGRpbmcgb25sb2FkIGV2ZW50c1xuICBpZiAocHJvcHMub25sb2FkIHx8IHByb3BzLm9udW5sb2FkKSB7XG4gICAgdmFyIGxvYWQgPSBwcm9wcy5vbmxvYWQgfHwgZnVuY3Rpb24gKCkge31cbiAgICB2YXIgdW5sb2FkID0gcHJvcHMub251bmxvYWQgfHwgZnVuY3Rpb24gKCkge31cbiAgICBvbmxvYWQoZWwsIGZ1bmN0aW9uIGJlbE9ubG9hZCAoKSB7XG4gICAgICBsb2FkKGVsKVxuICAgIH0sIGZ1bmN0aW9uIGJlbE9udW5sb2FkICgpIHtcbiAgICAgIHVubG9hZChlbClcbiAgICB9LFxuICAgIC8vIFdlIGhhdmUgdG8gdXNlIG5vbi1zdGFuZGFyZCBgY2FsbGVyYCB0byBmaW5kIHdobyBpbnZva2VzIGBiZWxDcmVhdGVFbGVtZW50YFxuICAgIGJlbENyZWF0ZUVsZW1lbnQuY2FsbGVyLmNhbGxlci5jYWxsZXIpXG4gICAgZGVsZXRlIHByb3BzLm9ubG9hZFxuICAgIGRlbGV0ZSBwcm9wcy5vbnVubG9hZFxuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSBwcm9wZXJ0aWVzXG4gIGZvciAodmFyIHAgaW4gcHJvcHMpIHtcbiAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgIHZhciBrZXkgPSBwLnRvTG93ZXJDYXNlKClcbiAgICAgIHZhciB2YWwgPSBwcm9wc1twXVxuICAgICAgLy8gTm9ybWFsaXplIGNsYXNzTmFtZVxuICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzbmFtZScpIHtcbiAgICAgICAga2V5ID0gJ2NsYXNzJ1xuICAgICAgICBwID0gJ2NsYXNzJ1xuICAgICAgfVxuICAgICAgLy8gVGhlIGZvciBhdHRyaWJ1dGUgZ2V0cyB0cmFuc2Zvcm1lZCB0byBodG1sRm9yLCBidXQgd2UganVzdCBzZXQgYXMgZm9yXG4gICAgICBpZiAocCA9PT0gJ2h0bWxGb3InKSB7XG4gICAgICAgIHAgPSAnZm9yJ1xuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBpcyBib29sZWFuLCBzZXQgaXRzZWxmIHRvIHRoZSBrZXlcbiAgICAgIGlmIChCT09MX1BST1BTW2tleV0pIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gJ3RydWUnKSB2YWwgPSBrZXlcbiAgICAgICAgZWxzZSBpZiAodmFsID09PSAnZmFsc2UnKSBjb250aW51ZVxuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBwcmVmZXJzIGJlaW5nIHNldCBkaXJlY3RseSB2cyBzZXRBdHRyaWJ1dGVcbiAgICAgIGlmIChrZXkuc2xpY2UoMCwgMikgPT09ICdvbicpIHtcbiAgICAgICAgZWxbcF0gPSB2YWxcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChucykge1xuICAgICAgICAgIGlmIChwID09PSAneGxpbms6aHJlZicpIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKFhMSU5LTlMsIHAsIHZhbClcbiAgICAgICAgICB9IGVsc2UgaWYgKC9eeG1sbnMoJHw6KS9pLnRlc3QocCkpIHtcbiAgICAgICAgICAgIC8vIHNraXAgeG1sbnMgZGVmaW5pdGlvbnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlTlMobnVsbCwgcCwgdmFsKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUocCwgdmFsKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXBwZW5kQ2hpbGQgKGNoaWxkcykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShjaGlsZHMpKSByZXR1cm5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHNbaV1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICAgIGFwcGVuZENoaWxkKG5vZGUpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgdHlwZW9mIG5vZGUgPT09ICdib29sZWFuJyB8fFxuICAgICAgICB0eXBlb2Ygbm9kZSA9PT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICBub2RlIGluc3RhbmNlb2YgRGF0ZSB8fFxuICAgICAgICBub2RlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLnRvU3RyaW5nKClcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoZWwubGFzdENoaWxkICYmIGVsLmxhc3RDaGlsZC5ub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICAgIGVsLmxhc3RDaGlsZC5ub2RlVmFsdWUgKz0gbm9kZVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpXG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlICYmIG5vZGUubm9kZVR5cGUpIHtcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYXBwZW5kQ2hpbGQoY2hpbGRyZW4pXG5cbiAgcmV0dXJuIGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaHlwZXJ4KGJlbENyZWF0ZUVsZW1lbnQsIHtjb21tZW50czogdHJ1ZX0pXG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlLmV4cG9ydHNcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUVsZW1lbnQgPSBiZWxDcmVhdGVFbGVtZW50XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ2JlbCcpXG4iLCJ2YXIgZG9jdW1lbnRSZWFkeSA9IHJlcXVpcmUoJ2RvY3VtZW50LXJlYWR5JylcbnZhciBuYW5vaGlzdG9yeSA9IHJlcXVpcmUoJ25hbm9oaXN0b3J5JylcbnZhciBuYW5vcm91dGVyID0gcmVxdWlyZSgnbmFub3JvdXRlcicpXG52YXIgbmFub21vdW50ID0gcmVxdWlyZSgnbmFub21vdW50JylcbnZhciBuYW5vbW9ycGggPSByZXF1aXJlKCduYW5vbW9ycGgnKVxudmFyIG5hbm9ocmVmID0gcmVxdWlyZSgnbmFub2hyZWYnKVxudmFyIG5hbm9yYWYgPSByZXF1aXJlKCduYW5vcmFmJylcbnZhciBuYW5vYnVzID0gcmVxdWlyZSgnbmFub2J1cycpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBDaG9vXG5cbmZ1bmN0aW9uIENob28gKG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge31cblxuICB2YXIgcm91dGVyT3B0cyA9IHtcbiAgICBkZWZhdWx0OiBvcHRzLmRlZmF1bHRSb3V0ZSB8fCAnLzQwNCcsXG4gICAgY3Vycnk6IHRydWVcbiAgfVxuXG4gIHZhciB0aW1pbmdFbmFibGVkID0gb3B0cy50aW1pbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBvcHRzLnRpbWluZ1xuICB2YXIgaGFzV2luZG93ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgdmFyIGhhc1BlcmZvcm1hbmNlID0gaGFzV2luZG93ICYmIHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB3aW5kb3cucGVyZm9ybWFuY2UubWFya1xuICB2YXIgcm91dGVyID0gbmFub3JvdXRlcihyb3V0ZXJPcHRzKVxuICB2YXIgYnVzID0gbmFub2J1cygpXG4gIHZhciByZXJlbmRlciA9IG51bGxcbiAgdmFyIHRyZWUgPSBudWxsXG4gIHZhciBzdGF0ZSA9IHt9XG5cbiAgcmV0dXJuIHtcbiAgICB0b1N0cmluZzogdG9TdHJpbmcsXG4gICAgdXNlOiByZWdpc3RlcixcbiAgICBtb3VudDogbW91bnQsXG4gICAgcm91dGVyOiByb3V0ZXIsXG4gICAgcm91dGU6IHJvdXRlLFxuICAgIHN0YXJ0OiBzdGFydFxuICB9XG5cbiAgZnVuY3Rpb24gcm91dGUgKHJvdXRlLCBoYW5kbGVyKSB7XG4gICAgcm91dGVyLm9uKHJvdXRlLCBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBzdGF0ZS5wYXJhbXMgPSBwYXJhbXNcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIoc3RhdGUsIGVtaXQpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyIChjYikge1xuICAgIGNiKHN0YXRlLCBidXMpXG4gIH1cblxuICBmdW5jdGlvbiBzdGFydCAoKSB7XG4gICAgaWYgKG9wdHMuaGlzdG9yeSAhPT0gZmFsc2UpIHtcbiAgICAgIG5hbm9oaXN0b3J5KGZ1bmN0aW9uIChocmVmKSB7XG4gICAgICAgIGJ1cy5lbWl0KCdwdXNoU3RhdGUnKVxuICAgICAgfSlcblxuICAgICAgYnVzLnByZXBlbmRMaXN0ZW5lcigncHVzaFN0YXRlJywgdXBkYXRlSGlzdG9yeS5iaW5kKG51bGwsICdwdXNoJykpXG4gICAgICBidXMucHJlcGVuZExpc3RlbmVyKCdyZXBsYWNlU3RhdGUnLCB1cGRhdGVIaXN0b3J5LmJpbmQobnVsbCwgJ3JlcGxhY2UnKSlcblxuICAgICAgaWYgKG9wdHMuaHJlZiAhPT0gZmFsc2UpIHtcbiAgICAgICAgbmFub2hyZWYoZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gICAgICAgICAgdmFyIGhyZWYgPSBsb2NhdGlvbi5ocmVmXG4gICAgICAgICAgdmFyIGN1cnJIcmVmID0gd2luZG93LmxvY2F0aW9uLmhyZWZcbiAgICAgICAgICBpZiAoaHJlZiA9PT0gY3VyckhyZWYpIHJldHVyblxuICAgICAgICAgIGJ1cy5lbWl0KCdwdXNoU3RhdGUnLCBocmVmKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUhpc3RvcnkgKG1vZGUsIGhyZWYpIHtcbiAgICAgIGlmIChocmVmKSB3aW5kb3cuaGlzdG9yeVttb2RlICsgJ1N0YXRlJ10oe30sIG51bGwsIGhyZWYpXG4gICAgICBidXMuZW1pdCgncmVuZGVyJylcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBzY3JvbGxJbnRvVmlldygpXG4gICAgICB9LCAwKVxuICAgIH1cblxuICAgIHJlcmVuZGVyID0gbmFub3JhZihmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoaGFzUGVyZm9ybWFuY2UgJiYgdGltaW5nRW5hYmxlZCkge1xuICAgICAgICB3aW5kb3cucGVyZm9ybWFuY2UubWFyaygnY2hvbzpyZW5kZXJTdGFydCcpXG4gICAgICB9XG4gICAgICB2YXIgbmV3VHJlZSA9IHJvdXRlcihjcmVhdGVMb2NhdGlvbigpKVxuICAgICAgdHJlZSA9IG5hbm9tb3JwaCh0cmVlLCBuZXdUcmVlKVxuICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHRyZWUsIG5ld1RyZWUsICdjaG9vLnN0YXJ0OiBhIGRpZmZlcmVudCBub2RlIHR5cGUgd2FzIHJldHVybmVkIGFzIHRoZSByb290IG5vZGUgb24gYSByZXJlbmRlci4gTWFrZSBzdXJlIHRoYXQgdGhlIHJvb3Qgbm9kZSBpcyBhbHdheXMgdGhlIHNhbWUgdHlwZSB0byBwcmV2ZW50IHRoZSBhcHBsaWNhdGlvbiBmcm9tIGJlaW5nIHVubW91bnRlZC4nKVxuICAgICAgaWYgKGhhc1BlcmZvcm1hbmNlICYmIHRpbWluZ0VuYWJsZWQpIHtcbiAgICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsoJ2Nob286cmVuZGVyRW5kJylcbiAgICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1lYXN1cmUoJ2Nob286cmVuZGVyJywgJ2Nob286cmVuZGVyU3RhcnQnLCAnY2hvbzpyZW5kZXJFbmQnKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBidXMucHJlcGVuZExpc3RlbmVyKCdyZW5kZXInLCByZXJlbmRlcilcblxuICAgIGRvY3VtZW50UmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgYnVzLmVtaXQoJ0RPTUNvbnRlbnRMb2FkZWQnKVxuICAgIH0pXG5cbiAgICB0cmVlID0gcm91dGVyKGNyZWF0ZUxvY2F0aW9uKCkpXG5cbiAgICByZXR1cm4gdHJlZVxuICB9XG5cbiAgZnVuY3Rpb24gZW1pdCAoZXZlbnROYW1lLCBkYXRhKSB7XG4gICAgYnVzLmVtaXQoZXZlbnROYW1lLCBkYXRhKVxuICB9XG5cbiAgZnVuY3Rpb24gbW91bnQgKHNlbGVjdG9yKSB7XG4gICAgdmFyIG5ld1RyZWUgPSBzdGFydCgpXG4gICAgZG9jdW1lbnRSZWFkeShmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcm9vdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgICBhc3NlcnQub2socm9vdCwgJ2Nob28ubW91bnQ6IGNvdWxkIG5vdCBxdWVyeSBzZWxlY3RvcjogJyArIHNlbGVjdG9yKVxuICAgICAgbmFub21vdW50KHJvb3QsIG5ld1RyZWUpXG4gICAgICB0cmVlID0gcm9vdFxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyAobG9jYXRpb24sIF9zdGF0ZSkge1xuICAgIHN0YXRlID0gX3N0YXRlIHx8IHt9XG4gICAgdmFyIGh0bWwgPSByb3V0ZXIobG9jYXRpb24pXG4gICAgcmV0dXJuIGh0bWwudG9TdHJpbmcoKVxuICB9XG59XG5cbmZ1bmN0aW9uIHNjcm9sbEludG9WaWV3ICgpIHtcbiAgdmFyIGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaFxuICBpZiAoaGFzaCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGhhc2gpXG4gICAgICBpZiAoZWwpIGVsLnNjcm9sbEludG9WaWV3KHRydWUpXG4gICAgfSBjYXRjaCAoZSkge31cbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVMb2NhdGlvbiAoKSB7XG4gIHZhciBwYXRobmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8kLywgJycpXG4gIHZhciBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2gucmVwbGFjZSgvXiMvLCAnLycpXG4gIHJldHVybiBwYXRobmFtZSArIGhhc2hcbn1cbiIsIid1c2Ugc3RyaWN0J1xuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSByZWFkeVxuXG5mdW5jdGlvbiByZWFkeSAoY2FsbGJhY2spIHtcbiAgYXNzZXJ0Lm5vdEVxdWFsKHR5cGVvZiBkb2N1bWVudCwgJ3VuZGVmaW5lZCcsICdkb2N1bWVudC1yZWFkeSBvbmx5IHJ1bnMgaW4gdGhlIGJyb3dzZXInKVxuICB2YXIgc3RhdGUgPSBkb2N1bWVudC5yZWFkeVN0YXRlXG4gIGlmIChzdGF0ZSA9PT0gJ2NvbXBsZXRlJyB8fCBzdGF0ZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGNhbGxiYWNrLCAwKVxuICB9XG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uIG9uTG9hZCAoKSB7XG4gICAgY2FsbGJhY2soKVxuICB9KVxufVxuIiwidmFyIHRvcExldmVsID0gdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOlxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDoge31cbnZhciBtaW5Eb2MgPSByZXF1aXJlKCdtaW4tZG9jdW1lbnQnKTtcblxudmFyIGRvY2N5O1xuXG5pZiAodHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGRvY2N5ID0gZG9jdW1lbnQ7XG59IGVsc2Uge1xuICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXTtcblxuICAgIGlmICghZG9jY3kpIHtcbiAgICAgICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddID0gbWluRG9jO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkb2NjeTtcbiIsInZhciB3aW47XG5cbmlmICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgd2luID0gd2luZG93O1xufSBlbHNlIGlmICh0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgd2luID0gZ2xvYmFsO1xufSBlbHNlIGlmICh0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIil7XG4gICAgd2luID0gc2VsZjtcbn0gZWxzZSB7XG4gICAgd2luID0ge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gd2luO1xuIiwibW9kdWxlLmV4cG9ydHMgPSBhdHRyaWJ1dGVUb1Byb3BlcnR5XG5cbnZhciB0cmFuc2Zvcm0gPSB7XG4gICdjbGFzcyc6ICdjbGFzc05hbWUnLFxuICAnZm9yJzogJ2h0bWxGb3InLFxuICAnaHR0cC1lcXVpdic6ICdodHRwRXF1aXYnXG59XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZVRvUHJvcGVydHkgKGgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh0YWdOYW1lLCBhdHRycywgY2hpbGRyZW4pIHtcbiAgICBmb3IgKHZhciBhdHRyIGluIGF0dHJzKSB7XG4gICAgICBpZiAoYXR0ciBpbiB0cmFuc2Zvcm0pIHtcbiAgICAgICAgYXR0cnNbdHJhbnNmb3JtW2F0dHJdXSA9IGF0dHJzW2F0dHJdXG4gICAgICAgIGRlbGV0ZSBhdHRyc1thdHRyXVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaCh0YWdOYW1lLCBhdHRycywgY2hpbGRyZW4pXG4gIH1cbn1cbiIsInZhciBhdHRyVG9Qcm9wID0gcmVxdWlyZSgnaHlwZXJzY3JpcHQtYXR0cmlidXRlLXRvLXByb3BlcnR5JylcblxudmFyIFZBUiA9IDAsIFRFWFQgPSAxLCBPUEVOID0gMiwgQ0xPU0UgPSAzLCBBVFRSID0gNFxudmFyIEFUVFJfS0VZID0gNSwgQVRUUl9LRVlfVyA9IDZcbnZhciBBVFRSX1ZBTFVFX1cgPSA3LCBBVFRSX1ZBTFVFID0gOFxudmFyIEFUVFJfVkFMVUVfU1EgPSA5LCBBVFRSX1ZBTFVFX0RRID0gMTBcbnZhciBBVFRSX0VRID0gMTEsIEFUVFJfQlJFQUsgPSAxMlxudmFyIENPTU1FTlQgPSAxM1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChoLCBvcHRzKSB7XG4gIGlmICghb3B0cykgb3B0cyA9IHt9XG4gIHZhciBjb25jYXQgPSBvcHRzLmNvbmNhdCB8fCBmdW5jdGlvbiAoYSwgYikge1xuICAgIHJldHVybiBTdHJpbmcoYSkgKyBTdHJpbmcoYilcbiAgfVxuICBpZiAob3B0cy5hdHRyVG9Qcm9wICE9PSBmYWxzZSkge1xuICAgIGggPSBhdHRyVG9Qcm9wKGgpXG4gIH1cblxuICByZXR1cm4gZnVuY3Rpb24gKHN0cmluZ3MpIHtcbiAgICB2YXIgc3RhdGUgPSBURVhULCByZWcgPSAnJ1xuICAgIHZhciBhcmdsZW4gPSBhcmd1bWVudHMubGVuZ3RoXG4gICAgdmFyIHBhcnRzID0gW11cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5ncy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGkgPCBhcmdsZW4gLSAxKSB7XG4gICAgICAgIHZhciBhcmcgPSBhcmd1bWVudHNbaSsxXVxuICAgICAgICB2YXIgcCA9IHBhcnNlKHN0cmluZ3NbaV0pXG4gICAgICAgIHZhciB4c3RhdGUgPSBzdGF0ZVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfU1EpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFIpIHhzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgIHAucHVzaChbIFZBUiwgeHN0YXRlLCBhcmcgXSlcbiAgICAgICAgcGFydHMucHVzaC5hcHBseShwYXJ0cywgcClcbiAgICAgIH0gZWxzZSBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwYXJzZShzdHJpbmdzW2ldKSlcbiAgICB9XG5cbiAgICB2YXIgdHJlZSA9IFtudWxsLHt9LFtdXVxuICAgIHZhciBzdGFjayA9IFtbdHJlZSwtMV1dXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGN1ciA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVxuICAgICAgdmFyIHAgPSBwYXJ0c1tpXSwgcyA9IHBbMF1cbiAgICAgIGlmIChzID09PSBPUEVOICYmIC9eXFwvLy50ZXN0KHBbMV0pKSB7XG4gICAgICAgIHZhciBpeCA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVsxXVxuICAgICAgICBpZiAoc3RhY2subGVuZ3RoID4gMSkge1xuICAgICAgICAgIHN0YWNrLnBvcCgpXG4gICAgICAgICAgc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdWzJdW2l4XSA9IGgoXG4gICAgICAgICAgICBjdXJbMF0sIGN1clsxXSwgY3VyWzJdLmxlbmd0aCA/IGN1clsyXSA6IHVuZGVmaW5lZFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBPUEVOKSB7XG4gICAgICAgIHZhciBjID0gW3BbMV0se30sW11dXG4gICAgICAgIGN1clsyXS5wdXNoKGMpXG4gICAgICAgIHN0YWNrLnB1c2goW2MsY3VyWzJdLmxlbmd0aC0xXSlcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9LRVkgfHwgKHMgPT09IFZBUiAmJiBwWzFdID09PSBBVFRSX0tFWSkpIHtcbiAgICAgICAgdmFyIGtleSA9ICcnXG4gICAgICAgIHZhciBjb3B5S2V5XG4gICAgICAgIGZvciAoOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBrZXkgPSBjb25jYXQoa2V5LCBwYXJ0c1tpXVsxXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcnRzW2ldWzBdID09PSBWQVIgJiYgcGFydHNbaV1bMV0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhcnRzW2ldWzJdID09PSAnb2JqZWN0JyAmJiAha2V5KSB7XG4gICAgICAgICAgICAgIGZvciAoY29weUtleSBpbiBwYXJ0c1tpXVsyXSkge1xuICAgICAgICAgICAgICAgIGlmIChwYXJ0c1tpXVsyXS5oYXNPd25Qcm9wZXJ0eShjb3B5S2V5KSAmJiAhY3VyWzFdW2NvcHlLZXldKSB7XG4gICAgICAgICAgICAgICAgICBjdXJbMV1bY29weUtleV0gPSBwYXJ0c1tpXVsyXVtjb3B5S2V5XVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAga2V5ID0gY29uY2F0KGtleSwgcGFydHNbaV1bMl0pXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGJyZWFrXG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX0VRKSBpKytcbiAgICAgICAgdmFyIGogPSBpXG4gICAgICAgIGZvciAoOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfVkFMVUUgfHwgcGFydHNbaV1bMF0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICBpZiAoIWN1clsxXVtrZXldKSBjdXJbMV1ba2V5XSA9IHN0cmZuKHBhcnRzW2ldWzFdKVxuICAgICAgICAgICAgZWxzZSBjdXJbMV1ba2V5XSA9IGNvbmNhdChjdXJbMV1ba2V5XSwgcGFydHNbaV1bMV0pXG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXVswXSA9PT0gVkFSXG4gICAgICAgICAgJiYgKHBhcnRzW2ldWzFdID09PSBBVFRSX1ZBTFVFIHx8IHBhcnRzW2ldWzFdID09PSBBVFRSX0tFWSkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMl0pXG4gICAgICAgICAgICBlbHNlIGN1clsxXVtrZXldID0gY29uY2F0KGN1clsxXVtrZXldLCBwYXJ0c1tpXVsyXSlcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGtleS5sZW5ndGggJiYgIWN1clsxXVtrZXldICYmIGkgPT09IGpcbiAgICAgICAgICAgICYmIChwYXJ0c1tpXVswXSA9PT0gQ0xPU0UgfHwgcGFydHNbaV1bMF0gPT09IEFUVFJfQlJFQUspKSB7XG4gICAgICAgICAgICAgIC8vIGh0dHBzOi8vaHRtbC5zcGVjLndoYXR3Zy5vcmcvbXVsdGlwYWdlL2luZnJhc3RydWN0dXJlLmh0bWwjYm9vbGVhbi1hdHRyaWJ1dGVzXG4gICAgICAgICAgICAgIC8vIGVtcHR5IHN0cmluZyBpcyBmYWxzeSwgbm90IHdlbGwgYmVoYXZlZCB2YWx1ZSBpbiBicm93c2VyXG4gICAgICAgICAgICAgIGN1clsxXVtrZXldID0ga2V5LnRvTG93ZXJDYXNlKClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIGN1clsxXVtwWzFdXSA9IHRydWVcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVkFSICYmIHBbMV0gPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIGN1clsxXVtwWzJdXSA9IHRydWVcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQ0xPU0UpIHtcbiAgICAgICAgaWYgKHNlbGZDbG9zaW5nKGN1clswXSkgJiYgc3RhY2subGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIGl4ID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzFdXG4gICAgICAgICAgc3RhY2sucG9wKClcbiAgICAgICAgICBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1bMl1baXhdID0gaChcbiAgICAgICAgICAgIGN1clswXSwgY3VyWzFdLCBjdXJbMl0ubGVuZ3RoID8gY3VyWzJdIDogdW5kZWZpbmVkXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFZBUiAmJiBwWzFdID09PSBURVhUKSB7XG4gICAgICAgIGlmIChwWzJdID09PSB1bmRlZmluZWQgfHwgcFsyXSA9PT0gbnVsbCkgcFsyXSA9ICcnXG4gICAgICAgIGVsc2UgaWYgKCFwWzJdKSBwWzJdID0gY29uY2F0KCcnLCBwWzJdKVxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwWzJdWzBdKSkge1xuICAgICAgICAgIGN1clsyXS5wdXNoLmFwcGx5KGN1clsyXSwgcFsyXSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdXJbMl0ucHVzaChwWzJdKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFRFWFQpIHtcbiAgICAgICAgY3VyWzJdLnB1c2gocFsxXSlcbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9FUSB8fCBzID09PSBBVFRSX0JSRUFLKSB7XG4gICAgICAgIC8vIG5vLW9wXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3VuaGFuZGxlZDogJyArIHMpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHRyZWVbMl0ubGVuZ3RoID4gMSAmJiAvXlxccyokLy50ZXN0KHRyZWVbMl1bMF0pKSB7XG4gICAgICB0cmVlWzJdLnNoaWZ0KClcbiAgICB9XG5cbiAgICBpZiAodHJlZVsyXS5sZW5ndGggPiAyXG4gICAgfHwgKHRyZWVbMl0ubGVuZ3RoID09PSAyICYmIC9cXFMvLnRlc3QodHJlZVsyXVsxXSkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICdtdWx0aXBsZSByb290IGVsZW1lbnRzIG11c3QgYmUgd3JhcHBlZCBpbiBhbiBlbmNsb3NpbmcgdGFnJ1xuICAgICAgKVxuICAgIH1cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh0cmVlWzJdWzBdKSAmJiB0eXBlb2YgdHJlZVsyXVswXVswXSA9PT0gJ3N0cmluZydcbiAgICAmJiBBcnJheS5pc0FycmF5KHRyZWVbMl1bMF1bMl0pKSB7XG4gICAgICB0cmVlWzJdWzBdID0gaCh0cmVlWzJdWzBdWzBdLCB0cmVlWzJdWzBdWzFdLCB0cmVlWzJdWzBdWzJdKVxuICAgIH1cbiAgICByZXR1cm4gdHJlZVsyXVswXVxuXG4gICAgZnVuY3Rpb24gcGFyc2UgKHN0cikge1xuICAgICAgdmFyIHJlcyA9IFtdXG4gICAgICBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVykgc3RhdGUgPSBBVFRSXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYyA9IHN0ci5jaGFyQXQoaSlcbiAgICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIGMgPT09ICc8Jykge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSByZXMucHVzaChbVEVYVCwgcmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gT1BFTlxuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICc+JyAmJiAhcXVvdChzdGF0ZSkgJiYgc3RhdGUgIT09IENPTU1FTlQpIHtcbiAgICAgICAgICBpZiAoc3RhdGUgPT09IE9QRU4pIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtPUEVOLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzLnB1c2goW0NMT1NFXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gVEVYVFxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBDT01NRU5UICYmIC8tJC8udGVzdChyZWcpICYmIGMgPT09ICctJykge1xuICAgICAgICAgIGlmIChvcHRzLmNvbW1lbnRzKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWcuc3Vic3RyKDAsIHJlZy5sZW5ndGggLSAxKV0sW0NMT1NFXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IFRFWFRcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTiAmJiAvXiEtLSQvLnRlc3QocmVnKSkge1xuICAgICAgICAgIGlmIChvcHRzLmNvbW1lbnRzKSB7XG4gICAgICAgICAgICByZXMucHVzaChbT1BFTiwgcmVnXSxbQVRUUl9LRVksJ2NvbW1lbnQnXSxbQVRUUl9FUV0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZyA9IGNcbiAgICAgICAgICBzdGF0ZSA9IENPTU1FTlRcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gVEVYVCB8fCBzdGF0ZSA9PT0gQ09NTUVOVCkge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4gJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtPUEVOLCByZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4pIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSICYmIC9bXlxcc1wiJz0vXS8udGVzdChjKSkge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgICByZWcgPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFIgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIGlmIChyZWcubGVuZ3RoKSByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9CUkVBS10pXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlfV1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSAmJiBjID09PSAnPScpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSxbQVRUUl9FUV0pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfV1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoKHN0YXRlID09PSBBVFRSX0tFWV9XIHx8IHN0YXRlID09PSBBVFRSKSAmJiBjID09PSAnPScpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9FUV0pXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1dcbiAgICAgICAgfSBlbHNlIGlmICgoc3RhdGUgPT09IEFUVFJfS0VZX1cgfHwgc3RhdGUgPT09IEFUVFIpICYmICEvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIGlmICgvW1xcdy1dLy50ZXN0KGMpKSB7XG4gICAgICAgICAgICByZWcgKz0gY1xuICAgICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICAgIH0gZWxzZSBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmIGMgPT09ICdcIicpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfRFFcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmIGMgPT09IFwiJ1wiKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1NRXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgJiYgYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgIS9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgICBpLS1cbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUVxuICAgICAgICB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSkge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChzdGF0ZSA9PT0gVEVYVCAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtURVhULHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzdHJmbiAoeCkge1xuICAgIGlmICh0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh0eXBlb2YgeCA9PT0gJ3N0cmluZycpIHJldHVybiB4XG4gICAgZWxzZSBpZiAoeCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcpIHJldHVybiB4XG4gICAgZWxzZSByZXR1cm4gY29uY2F0KCcnLCB4KVxuICB9XG59XG5cbmZ1bmN0aW9uIHF1b3QgKHN0YXRlKSB7XG4gIHJldHVybiBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSB8fCBzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUVxufVxuXG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eVxuZnVuY3Rpb24gaGFzIChvYmosIGtleSkgeyByZXR1cm4gaGFzT3duLmNhbGwob2JqLCBrZXkpIH1cblxudmFyIGNsb3NlUkUgPSBSZWdFeHAoJ14oJyArIFtcbiAgJ2FyZWEnLCAnYmFzZScsICdiYXNlZm9udCcsICdiZ3NvdW5kJywgJ2JyJywgJ2NvbCcsICdjb21tYW5kJywgJ2VtYmVkJyxcbiAgJ2ZyYW1lJywgJ2hyJywgJ2ltZycsICdpbnB1dCcsICdpc2luZGV4JywgJ2tleWdlbicsICdsaW5rJywgJ21ldGEnLCAncGFyYW0nLFxuICAnc291cmNlJywgJ3RyYWNrJywgJ3dicicsICchLS0nLFxuICAvLyBTVkcgVEFHU1xuICAnYW5pbWF0ZScsICdhbmltYXRlVHJhbnNmb3JtJywgJ2NpcmNsZScsICdjdXJzb3InLCAnZGVzYycsICdlbGxpcHNlJyxcbiAgJ2ZlQmxlbmQnLCAnZmVDb2xvck1hdHJpeCcsICdmZUNvbXBvc2l0ZScsXG4gICdmZUNvbnZvbHZlTWF0cml4JywgJ2ZlRGlmZnVzZUxpZ2h0aW5nJywgJ2ZlRGlzcGxhY2VtZW50TWFwJyxcbiAgJ2ZlRGlzdGFudExpZ2h0JywgJ2ZlRmxvb2QnLCAnZmVGdW5jQScsICdmZUZ1bmNCJywgJ2ZlRnVuY0cnLCAnZmVGdW5jUicsXG4gICdmZUdhdXNzaWFuQmx1cicsICdmZUltYWdlJywgJ2ZlTWVyZ2VOb2RlJywgJ2ZlTW9ycGhvbG9neScsXG4gICdmZU9mZnNldCcsICdmZVBvaW50TGlnaHQnLCAnZmVTcGVjdWxhckxpZ2h0aW5nJywgJ2ZlU3BvdExpZ2h0JywgJ2ZlVGlsZScsXG4gICdmZVR1cmJ1bGVuY2UnLCAnZm9udC1mYWNlLWZvcm1hdCcsICdmb250LWZhY2UtbmFtZScsICdmb250LWZhY2UtdXJpJyxcbiAgJ2dseXBoJywgJ2dseXBoUmVmJywgJ2hrZXJuJywgJ2ltYWdlJywgJ2xpbmUnLCAnbWlzc2luZy1nbHlwaCcsICdtcGF0aCcsXG4gICdwYXRoJywgJ3BvbHlnb24nLCAncG9seWxpbmUnLCAncmVjdCcsICdzZXQnLCAnc3RvcCcsICd0cmVmJywgJ3VzZScsICd2aWV3JyxcbiAgJ3ZrZXJuJ1xuXS5qb2luKCd8JykgKyAnKSg/OltcXC4jXVthLXpBLVowLTlcXHUwMDdGLVxcdUZGRkZfOi1dKykqJCcpXG5mdW5jdGlvbiBzZWxmQ2xvc2luZyAodGFnKSB7IHJldHVybiBjbG9zZVJFLnRlc3QodGFnKSB9XG4iLCJ2YXIgbmFub3RpbWluZyA9IHJlcXVpcmUoJ25hbm90aW1pbmcnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gTmFub2J1c1xuXG5mdW5jdGlvbiBOYW5vYnVzIChuYW1lKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBOYW5vYnVzKSkgcmV0dXJuIG5ldyBOYW5vYnVzKG5hbWUpXG5cbiAgdGhpcy5fbmFtZSA9IG5hbWUgfHwgJ25hbm9idXMnXG4gIHRoaXMuX3N0YXJMaXN0ZW5lcnMgPSBbXVxuICB0aGlzLl9saXN0ZW5lcnMgPSB7fVxuXG4gIHRoaXMuX3RpbWluZyA9IG5hbm90aW1pbmcodGhpcy5fbmFtZSlcbn1cblxuTmFub2J1cy5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5lbWl0OiBldmVudE5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcblxuICB0aGlzLl90aW1pbmcuc3RhcnQoZXZlbnROYW1lKVxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV1cbiAgaWYgKGxpc3RlbmVycyAmJiBsaXN0ZW5lcnMubGVuZ3RoID4gMCkge1xuICAgIHRoaXMuX2VtaXQodGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0sIGRhdGEpXG4gIH1cblxuICBpZiAodGhpcy5fc3Rhckxpc3RlbmVycy5sZW5ndGggPiAwKSB7XG4gICAgdGhpcy5fZW1pdCh0aGlzLl9zdGFyTGlzdGVuZXJzLCBldmVudE5hbWUsIGRhdGEpXG4gIH1cbiAgdGhpcy5fdGltaW5nLmVuZChldmVudE5hbWUpXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTmFub2J1cy5wcm90b3R5cGUub24gPSBOYW5vYnVzLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgZXZlbnROYW1lLCAnc3RyaW5nJywgJ25hbm9idXMub246IGV2ZW50TmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIGxpc3RlbmVyLCAnZnVuY3Rpb24nLCAnbmFub2J1cy5vbjogbGlzdGVuZXIgc2hvdWxkIGJlIHR5cGUgZnVuY3Rpb24nKVxuXG4gIGlmIChldmVudE5hbWUgPT09ICcqJykge1xuICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcilcbiAgfSBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdKSB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdXG4gICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0ucHVzaChsaXN0ZW5lcilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGV2ZW50TmFtZSwgJ3N0cmluZycsICduYW5vYnVzLnByZXBlbmRMaXN0ZW5lcjogZXZlbnROYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbGlzdGVuZXIsICdmdW5jdGlvbicsICduYW5vYnVzLnByZXBlbmRMaXN0ZW5lcjogbGlzdGVuZXIgc2hvdWxkIGJlIHR5cGUgZnVuY3Rpb24nKVxuXG4gIGlmIChldmVudE5hbWUgPT09ICcqJykge1xuICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMudW5zaGlmdChsaXN0ZW5lcilcbiAgfSBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdKSB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdXG4gICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0udW5zaGlmdChsaXN0ZW5lcilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5vbmNlOiBldmVudE5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBsaXN0ZW5lciwgJ2Z1bmN0aW9uJywgJ25hbm9idXMub25jZTogbGlzdGVuZXIgc2hvdWxkIGJlIHR5cGUgZnVuY3Rpb24nKVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLm9uKGV2ZW50TmFtZSwgb25jZSlcbiAgZnVuY3Rpb24gb25jZSAoKSB7XG4gICAgbGlzdGVuZXIuYXBwbHkoc2VsZiwgYXJndW1lbnRzKVxuICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIoZXZlbnROYW1lLCBvbmNlKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbk5hbm9idXMucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGV2ZW50TmFtZSwgJ3N0cmluZycsICduYW5vYnVzLnByZXBlbmRPbmNlTGlzdGVuZXI6IGV2ZW50TmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIGxpc3RlbmVyLCAnZnVuY3Rpb24nLCAnbmFub2J1cy5wcmVwZW5kT25jZUxpc3RlbmVyOiBsaXN0ZW5lciBzaG91bGQgYmUgdHlwZSBmdW5jdGlvbicpXG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMucHJlcGVuZExpc3RlbmVyKGV2ZW50TmFtZSwgb25jZSlcbiAgZnVuY3Rpb24gb25jZSAoKSB7XG4gICAgbGlzdGVuZXIuYXBwbHkoc2VsZiwgYXJndW1lbnRzKVxuICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIoZXZlbnROYW1lLCBvbmNlKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbk5hbm9idXMucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5yZW1vdmVMaXN0ZW5lcjogZXZlbnROYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbGlzdGVuZXIsICdmdW5jdGlvbicsICduYW5vYnVzLnJlbW92ZUxpc3RlbmVyOiBsaXN0ZW5lciBzaG91bGQgYmUgdHlwZSBmdW5jdGlvbicpXG5cbiAgaWYgKGV2ZW50TmFtZSA9PT0gJyonKSB7XG4gICAgdGhpcy5fc3Rhckxpc3RlbmVycyA9IHRoaXMuX3N0YXJMaXN0ZW5lcnMuc2xpY2UoKVxuICAgIHJldHVybiByZW1vdmUodGhpcy5fc3Rhckxpc3RlbmVycywgbGlzdGVuZXIpXG4gIH0gZWxzZSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0uc2xpY2UoKVxuICAgIH1cblxuICAgIHJldHVybiByZW1vdmUodGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0sIGxpc3RlbmVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlIChhcnIsIGxpc3RlbmVyKSB7XG4gICAgaWYgKCFhcnIpIHJldHVyblxuICAgIHZhciBpbmRleCA9IGFyci5pbmRleE9mKGxpc3RlbmVyKVxuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiAoZXZlbnROYW1lKSB7XG4gIGlmIChldmVudE5hbWUpIHtcbiAgICBpZiAoZXZlbnROYW1lID09PSAnKicpIHtcbiAgICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMgPSBbXVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMgPSBbXVxuICAgIHRoaXMuX2xpc3RlbmVycyA9IHt9XG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuTmFub2J1cy5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50TmFtZSkge1xuICB2YXIgbGlzdGVuZXJzID0gKGV2ZW50TmFtZSAhPT0gJyonKSA/IHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdIDogdGhpcy5fc3Rhckxpc3RlbmVyc1xuICB2YXIgcmV0ID0gW11cbiAgaWYgKGxpc3RlbmVycykge1xuICAgIHZhciBpbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWxlbmd0aDsgaSsrKSByZXQucHVzaChsaXN0ZW5lcnNbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5fZW1pdCA9IGZ1bmN0aW9uIChhcnIsIGV2ZW50TmFtZSwgZGF0YSkge1xuICBpZiAodHlwZW9mIGFyciA9PT0gJ3VuZGVmaW5lZCcpIHJldHVyblxuICBpZiAoIWRhdGEpIHtcbiAgICBkYXRhID0gZXZlbnROYW1lXG4gICAgZXZlbnROYW1lID0gbnVsbFxuICB9XG4gIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBhcnJbaV1cbiAgICBpZiAoZXZlbnROYW1lKSBsaXN0ZW5lcihldmVudE5hbWUsIGRhdGEpXG4gICAgZWxzZSBsaXN0ZW5lcihkYXRhKVxuICB9XG59XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBoaXN0b3J5XG5cbi8vIGxpc3RlbiB0byBodG1sNSBwdXNoc3RhdGUgZXZlbnRzXG4vLyBhbmQgdXBkYXRlIHJvdXRlciBhY2NvcmRpbmdseVxuZnVuY3Rpb24gaGlzdG9yeSAoY2IpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjYiwgJ2Z1bmN0aW9uJywgJ25hbm9oaXN0b3J5OiBjYiBtdXN0IGJlIHR5cGUgZnVuY3Rpb24nKVxuICB3aW5kb3cub25wb3BzdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjYihkb2N1bWVudC5sb2NhdGlvbilcbiAgfVxufVxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gaHJlZlxuXG52YXIgbm9Sb3V0aW5nQXR0ck5hbWUgPSAnZGF0YS1uby1yb3V0aW5nJ1xuXG4vLyBoYW5kbGUgYSBjbGljayBpZiBpcyBhbmNob3IgdGFnIHdpdGggYW4gaHJlZlxuLy8gYW5kIHVybCBsaXZlcyBvbiB0aGUgc2FtZSBkb21haW4uIFJlcGxhY2VzXG4vLyB0cmFpbGluZyAnIycgc28gZW1wdHkgbGlua3Mgd29yayBhcyBleHBlY3RlZC5cbi8vIChmbihzdHIpLCBvYmo/KSAtPiB1bmRlZmluZWRcbmZ1bmN0aW9uIGhyZWYgKGNiLCByb290KSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgY2IsICdmdW5jdGlvbicsICduYW5vaHJlZjogY2IgbXVzdCBiZSB0eXBlIGZ1bmN0aW9uJylcbiAgcm9vdCA9IHJvb3QgfHwgd2luZG93LmRvY3VtZW50XG5cbiAgd2luZG93Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmICgoZS5idXR0b24gJiYgZS5idXR0b24gIT09IDApIHx8IGUuY3RybEtleSB8fCBlLm1ldGFLZXkgfHwgZS5hbHRLZXkgfHwgZS5zaGlmdEtleSkgcmV0dXJuXG5cbiAgICB2YXIgbm9kZSA9IChmdW5jdGlvbiB0cmF2ZXJzZSAobm9kZSkge1xuICAgICAgaWYgKCFub2RlIHx8IG5vZGUgPT09IHJvb3QpIHJldHVyblxuICAgICAgaWYgKG5vZGUubG9jYWxOYW1lICE9PSAnYScpIHJldHVybiB0cmF2ZXJzZShub2RlLnBhcmVudE5vZGUpXG4gICAgICBpZiAobm9kZS5ocmVmID09PSB1bmRlZmluZWQpIHJldHVybiB0cmF2ZXJzZShub2RlLnBhcmVudE5vZGUpXG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhvc3QgIT09IG5vZGUuaG9zdCkgcmV0dXJuIHRyYXZlcnNlKG5vZGUucGFyZW50Tm9kZSlcbiAgICAgIHJldHVybiBub2RlXG4gICAgfSkoZS50YXJnZXQpXG5cbiAgICBpZiAoIW5vZGUpIHJldHVyblxuXG4gICAgdmFyIGlzUm91dGluZ0Rpc2FibGVkID0gbm9kZS5oYXNBdHRyaWJ1dGUobm9Sb3V0aW5nQXR0ck5hbWUpXG4gICAgaWYgKGlzUm91dGluZ0Rpc2FibGVkKSByZXR1cm5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIGNiKG5vZGUpXG4gIH1cbn1cbiIsInZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxudmFyIG1vcnBoID0gcmVxdWlyZSgnLi9saWIvbW9ycGgnKVxudmFyIHJvb3RMYWJlbFJlZ2V4ID0gL15kYXRhLW9ubG9hZGlkL1xuXG52YXIgRUxFTUVOVF9OT0RFID0gMVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5hbm9tb3JwaFxuXG4vLyBtb3JwaCBvbmUgdHJlZSBpbnRvIGFub3RoZXIgdHJlZVxuLy8gKG9iaiwgb2JqKSAtPiBvYmpcbi8vIG5vIHBhcmVudFxuLy8gICAtPiBzYW1lOiBkaWZmIGFuZCB3YWxrIGNoaWxkcmVuXG4vLyAgIC0+IG5vdCBzYW1lOiByZXBsYWNlIGFuZCByZXR1cm5cbi8vIG9sZCBub2RlIGRvZXNuJ3QgZXhpc3Rcbi8vICAgLT4gaW5zZXJ0IG5ldyBub2RlXG4vLyBuZXcgbm9kZSBkb2Vzbid0IGV4aXN0XG4vLyAgIC0+IGRlbGV0ZSBvbGQgbm9kZVxuLy8gbm9kZXMgYXJlIG5vdCB0aGUgc2FtZVxuLy8gICAtPiBkaWZmIG5vZGVzIGFuZCBhcHBseSBwYXRjaCB0byBvbGQgbm9kZVxuLy8gbm9kZXMgYXJlIHRoZSBzYW1lXG4vLyAgIC0+IHdhbGsgYWxsIGNoaWxkIG5vZGVzIGFuZCBhcHBlbmQgdG8gb2xkIG5vZGVcbmZ1bmN0aW9uIG5hbm9tb3JwaCAob2xkVHJlZSwgbmV3VHJlZSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIG9sZFRyZWUsICdvYmplY3QnLCAnbmFub21vcnBoOiBvbGRUcmVlIHNob3VsZCBiZSBhbiBvYmplY3QnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIG5ld1RyZWUsICdvYmplY3QnLCAnbmFub21vcnBoOiBuZXdUcmVlIHNob3VsZCBiZSBhbiBvYmplY3QnKVxuXG4gIHBlcnNpc3RTdGF0ZWZ1bFJvb3QobmV3VHJlZSwgb2xkVHJlZSlcbiAgdmFyIHRyZWUgPSB3YWxrKG5ld1RyZWUsIG9sZFRyZWUpXG4gIHJldHVybiB0cmVlXG59XG5cbi8vIHdhbGsgYW5kIG1vcnBoIGEgZG9tIHRyZWVcbi8vIChvYmosIG9iaikgLT4gb2JqXG5mdW5jdGlvbiB3YWxrIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIGlmICghb2xkTm9kZSkge1xuICAgIHJldHVybiBuZXdOb2RlXG4gIH0gZWxzZSBpZiAoIW5ld05vZGUpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9IGVsc2UgaWYgKG5ld05vZGUuaXNTYW1lTm9kZSAmJiBuZXdOb2RlLmlzU2FtZU5vZGUob2xkTm9kZSkpIHtcbiAgICByZXR1cm4gb2xkTm9kZVxuICB9IGVsc2UgaWYgKG5ld05vZGUudGFnTmFtZSAhPT0gb2xkTm9kZS50YWdOYW1lKSB7XG4gICAgcmV0dXJuIG5ld05vZGVcbiAgfSBlbHNlIHtcbiAgICBtb3JwaChuZXdOb2RlLCBvbGROb2RlKVxuICAgIHVwZGF0ZUNoaWxkcmVuKG5ld05vZGUsIG9sZE5vZGUpXG4gICAgcmV0dXJuIG9sZE5vZGVcbiAgfVxufVxuXG4vLyB1cGRhdGUgdGhlIGNoaWxkcmVuIG9mIGVsZW1lbnRzXG4vLyAob2JqLCBvYmopIC0+IG51bGxcbmZ1bmN0aW9uIHVwZGF0ZUNoaWxkcmVuIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIGlmICghbmV3Tm9kZS5jaGlsZE5vZGVzIHx8ICFvbGROb2RlLmNoaWxkTm9kZXMpIHJldHVyblxuXG4gIHZhciBuZXdMZW5ndGggPSBuZXdOb2RlLmNoaWxkTm9kZXMubGVuZ3RoXG4gIHZhciBvbGRMZW5ndGggPSBvbGROb2RlLmNoaWxkTm9kZXMubGVuZ3RoXG4gIHZhciBsZW5ndGggPSBNYXRoLm1heChvbGRMZW5ndGgsIG5ld0xlbmd0aClcblxuICB2YXIgaU5ldyA9IDBcbiAgdmFyIGlPbGQgPSAwXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGlOZXcrKywgaU9sZCsrKSB7XG4gICAgdmFyIG5ld0NoaWxkTm9kZSA9IG5ld05vZGUuY2hpbGROb2Rlc1tpTmV3XVxuICAgIHZhciBvbGRDaGlsZE5vZGUgPSBvbGROb2RlLmNoaWxkTm9kZXNbaU9sZF1cbiAgICB2YXIgcmV0Q2hpbGROb2RlID0gd2FsayhuZXdDaGlsZE5vZGUsIG9sZENoaWxkTm9kZSlcbiAgICBpZiAoIXJldENoaWxkTm9kZSkge1xuICAgICAgaWYgKG9sZENoaWxkTm9kZSkge1xuICAgICAgICBvbGROb2RlLnJlbW92ZUNoaWxkKG9sZENoaWxkTm9kZSlcbiAgICAgICAgaU9sZC0tXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghb2xkQ2hpbGROb2RlKSB7XG4gICAgICBpZiAocmV0Q2hpbGROb2RlKSB7XG4gICAgICAgIG9sZE5vZGUuYXBwZW5kQ2hpbGQocmV0Q2hpbGROb2RlKVxuICAgICAgICBpTmV3LS1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJldENoaWxkTm9kZSAhPT0gb2xkQ2hpbGROb2RlKSB7XG4gICAgICBvbGROb2RlLnJlcGxhY2VDaGlsZChyZXRDaGlsZE5vZGUsIG9sZENoaWxkTm9kZSlcbiAgICAgIGlOZXctLVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwZXJzaXN0U3RhdGVmdWxSb290IChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIGlmICghbmV3Tm9kZSB8fCAhb2xkTm9kZSB8fCBvbGROb2RlLm5vZGVUeXBlICE9PSBFTEVNRU5UX05PREUgfHwgbmV3Tm9kZS5ub2RlVHlwZSAhPT0gRUxFTUVOVF9OT0RFKSByZXR1cm5cbiAgdmFyIG9sZEF0dHJzID0gb2xkTm9kZS5hdHRyaWJ1dGVzXG4gIHZhciBhdHRyLCBuYW1lXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBvbGRBdHRycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGF0dHIgPSBvbGRBdHRyc1tpXVxuICAgIG5hbWUgPSBhdHRyLm5hbWVcbiAgICBpZiAocm9vdExhYmVsUmVnZXgudGVzdChuYW1lKSkge1xuICAgICAgbmV3Tm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgYXR0ci52YWx1ZSlcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFtcbiAgLy8gYXR0cmlidXRlIGV2ZW50cyAoY2FuIGJlIHNldCB3aXRoIGF0dHJpYnV0ZXMpXG4gICdvbmNsaWNrJyxcbiAgJ29uZGJsY2xpY2snLFxuICAnb25tb3VzZWRvd24nLFxuICAnb25tb3VzZXVwJyxcbiAgJ29ubW91c2VvdmVyJyxcbiAgJ29ubW91c2Vtb3ZlJyxcbiAgJ29ubW91c2VvdXQnLFxuICAnb25tb3VzZWVudGVyJyxcbiAgJ29ubW91c2VsZWF2ZScsXG4gICdvbmRyYWdzdGFydCcsXG4gICdvbmRyYWcnLFxuICAnb25kcmFnZW50ZXInLFxuICAnb25kcmFnbGVhdmUnLFxuICAnb25kcmFnb3ZlcicsXG4gICdvbmRyb3AnLFxuICAnb25kcmFnZW5kJyxcbiAgJ29ua2V5ZG93bicsXG4gICdvbmtleXByZXNzJyxcbiAgJ29ua2V5dXAnLFxuICAnb251bmxvYWQnLFxuICAnb25hYm9ydCcsXG4gICdvbmVycm9yJyxcbiAgJ29ucmVzaXplJyxcbiAgJ29uc2Nyb2xsJyxcbiAgJ29uc2VsZWN0JyxcbiAgJ29uY2hhbmdlJyxcbiAgJ29uc3VibWl0JyxcbiAgJ29ucmVzZXQnLFxuICAnb25mb2N1cycsXG4gICdvbmJsdXInLFxuICAnb25pbnB1dCcsXG4gIC8vIG90aGVyIGNvbW1vbiBldmVudHNcbiAgJ29uY29udGV4dG1lbnUnLFxuICAnb25mb2N1c2luJyxcbiAgJ29uZm9jdXNvdXQnXG5dXG4iLCJ2YXIgZXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxudmFyIGV2ZW50c0xlbmd0aCA9IGV2ZW50cy5sZW5ndGhcblxudmFyIEVMRU1FTlRfTk9ERSA9IDFcbnZhciBURVhUX05PREUgPSAzXG52YXIgQ09NTUVOVF9OT0RFID0gOFxuXG5tb2R1bGUuZXhwb3J0cyA9IG1vcnBoXG5cbi8vIGRpZmYgZWxlbWVudHMgYW5kIGFwcGx5IHRoZSByZXN1bHRpbmcgcGF0Y2ggdG8gdGhlIG9sZCBub2RlXG4vLyAob2JqLCBvYmopIC0+IG51bGxcbmZ1bmN0aW9uIG1vcnBoIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIHZhciBub2RlVHlwZSA9IG5ld05vZGUubm9kZVR5cGVcbiAgdmFyIG5vZGVOYW1lID0gbmV3Tm9kZS5ub2RlTmFtZVxuXG4gIGlmIChub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgY29weUF0dHJzKG5ld05vZGUsIG9sZE5vZGUpXG4gIH1cblxuICBpZiAobm9kZVR5cGUgPT09IFRFWFRfTk9ERSB8fCBub2RlVHlwZSA9PT0gQ09NTUVOVF9OT0RFKSB7XG4gICAgb2xkTm9kZS5ub2RlVmFsdWUgPSBuZXdOb2RlLm5vZGVWYWx1ZVxuICB9XG5cbiAgLy8gU29tZSBET00gbm9kZXMgYXJlIHdlaXJkXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXRyaWNrLXN0ZWVsZS1pZGVtL21vcnBoZG9tL2Jsb2IvbWFzdGVyL3NyYy9zcGVjaWFsRWxIYW5kbGVycy5qc1xuICBpZiAobm9kZU5hbWUgPT09ICdJTlBVVCcpIHVwZGF0ZUlucHV0KG5ld05vZGUsIG9sZE5vZGUpXG4gIGVsc2UgaWYgKG5vZGVOYW1lID09PSAnT1BUSU9OJykgdXBkYXRlT3B0aW9uKG5ld05vZGUsIG9sZE5vZGUpXG4gIGVsc2UgaWYgKG5vZGVOYW1lID09PSAnVEVYVEFSRUEnKSB1cGRhdGVUZXh0YXJlYShuZXdOb2RlLCBvbGROb2RlKVxuICBlbHNlIGlmIChub2RlTmFtZSA9PT0gJ1NFTEVDVCcpIHVwZGF0ZVNlbGVjdChuZXdOb2RlLCBvbGROb2RlKVxuXG4gIGNvcHlFdmVudHMobmV3Tm9kZSwgb2xkTm9kZSlcbn1cblxuZnVuY3Rpb24gY29weUF0dHJzIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIHZhciBvbGRBdHRycyA9IG9sZE5vZGUuYXR0cmlidXRlc1xuICB2YXIgbmV3QXR0cnMgPSBuZXdOb2RlLmF0dHJpYnV0ZXNcbiAgdmFyIGF0dHJOYW1lc3BhY2VVUkkgPSBudWxsXG4gIHZhciBhdHRyVmFsdWUgPSBudWxsXG4gIHZhciBmcm9tVmFsdWUgPSBudWxsXG4gIHZhciBhdHRyTmFtZSA9IG51bGxcbiAgdmFyIGF0dHIgPSBudWxsXG5cbiAgZm9yICh2YXIgaSA9IG5ld0F0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgYXR0ciA9IG5ld0F0dHJzW2ldXG4gICAgYXR0ck5hbWUgPSBhdHRyLm5hbWVcbiAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUklcbiAgICBhdHRyVmFsdWUgPSBhdHRyLnZhbHVlXG5cbiAgICBpZiAoYXR0ck5hbWVzcGFjZVVSSSkge1xuICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZVxuICAgICAgZnJvbVZhbHVlID0gb2xkTm9kZS5nZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSlcblxuICAgICAgaWYgKGZyb21WYWx1ZSAhPT0gYXR0clZhbHVlKSB7XG4gICAgICAgIG9sZE5vZGUuc2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZnJvbVZhbHVlID0gb2xkTm9kZS5nZXRBdHRyaWJ1dGUoYXR0ck5hbWUpXG5cbiAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAvLyBhcHBhcmVudGx5IHZhbHVlcyBhcmUgYWx3YXlzIGNhc3QgdG8gc3RyaW5ncywgYWggd2VsbFxuICAgICAgICBpZiAoYXR0clZhbHVlID09PSAnbnVsbCcgfHwgYXR0clZhbHVlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIG9sZE5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9sZE5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgYW55IGV4dHJhIGF0dHJpYnV0ZXMgZm91bmQgb24gdGhlIG9yaWdpbmFsIERPTSBlbGVtZW50IHRoYXRcbiAgLy8gd2VyZW4ndCBmb3VuZCBvbiB0aGUgdGFyZ2V0IGVsZW1lbnQuXG4gIGZvciAodmFyIGogPSBvbGRBdHRycy5sZW5ndGggLSAxOyBqID49IDA7IC0taikge1xuICAgIGF0dHIgPSBvbGRBdHRyc1tqXVxuICAgIGlmIChhdHRyLnNwZWNpZmllZCAhPT0gZmFsc2UpIHtcbiAgICAgIGF0dHJOYW1lID0gYXR0ci5uYW1lXG4gICAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUklcblxuICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZVxuICAgICAgICBpZiAoIW5ld05vZGUuaGFzQXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpKSB7XG4gICAgICAgICAgb2xkTm9kZS5yZW1vdmVBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSlcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFuZXdOb2RlLmhhc0F0dHJpYnV0ZU5TKG51bGwsIGF0dHJOYW1lKSkge1xuICAgICAgICAgIG9sZE5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvcHlFdmVudHMgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHNMZW5ndGg7IGkrKykge1xuICAgIHZhciBldiA9IGV2ZW50c1tpXVxuICAgIGlmIChuZXdOb2RlW2V2XSkgeyAgICAgICAgICAgLy8gaWYgbmV3IGVsZW1lbnQgaGFzIGEgd2hpdGVsaXN0ZWQgYXR0cmlidXRlXG4gICAgICBvbGROb2RlW2V2XSA9IG5ld05vZGVbZXZdICAvLyB1cGRhdGUgZXhpc3RpbmcgZWxlbWVudFxuICAgIH0gZWxzZSBpZiAob2xkTm9kZVtldl0pIHsgICAgLy8gaWYgZXhpc3RpbmcgZWxlbWVudCBoYXMgaXQgYW5kIG5ldyBvbmUgZG9lc250XG4gICAgICBvbGROb2RlW2V2XSA9IHVuZGVmaW5lZCAgICAvLyByZW1vdmUgaXQgZnJvbSBleGlzdGluZyBlbGVtZW50XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZU9wdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICB1cGRhdGVBdHRyaWJ1dGUobmV3Tm9kZSwgb2xkTm9kZSwgJ3NlbGVjdGVkJylcbn1cblxuLy8gVGhlIFwidmFsdWVcIiBhdHRyaWJ1dGUgaXMgc3BlY2lhbCBmb3IgdGhlIDxpbnB1dD4gZWxlbWVudCBzaW5jZSBpdCBzZXRzIHRoZVxuLy8gaW5pdGlhbCB2YWx1ZS4gQ2hhbmdpbmcgdGhlIFwidmFsdWVcIiBhdHRyaWJ1dGUgd2l0aG91dCBjaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiXG4vLyBwcm9wZXJ0eSB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IGlzIG9ubHkgdXNlZCB0byB0aGUgc2V0IHRoZSBpbml0aWFsXG4vLyB2YWx1ZS4gU2ltaWxhciBmb3IgdGhlIFwiY2hlY2tlZFwiIGF0dHJpYnV0ZSwgYW5kIFwiZGlzYWJsZWRcIi5cbmZ1bmN0aW9uIHVwZGF0ZUlucHV0IChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIHZhciBuZXdWYWx1ZSA9IG5ld05vZGUudmFsdWVcbiAgdmFyIG9sZFZhbHVlID0gb2xkTm9kZS52YWx1ZVxuXG4gIHVwZGF0ZUF0dHJpYnV0ZShuZXdOb2RlLCBvbGROb2RlLCAnY2hlY2tlZCcpXG4gIHVwZGF0ZUF0dHJpYnV0ZShuZXdOb2RlLCBvbGROb2RlLCAnZGlzYWJsZWQnKVxuXG4gIGlmICghbmV3Tm9kZS5oYXNBdHRyaWJ1dGVOUyhudWxsLCAndmFsdWUnKSB8fCBuZXdWYWx1ZSA9PT0gJ251bGwnKSB7XG4gICAgb2xkTm9kZS52YWx1ZSA9ICcnXG4gICAgb2xkTm9kZS5yZW1vdmVBdHRyaWJ1dGUoJ3ZhbHVlJylcbiAgfSBlbHNlIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICBvbGROb2RlLnNldEF0dHJpYnV0ZSgndmFsdWUnLCBuZXdWYWx1ZSlcbiAgICBvbGROb2RlLnZhbHVlID0gbmV3VmFsdWVcbiAgfSBlbHNlIGlmIChvbGROb2RlLnR5cGUgPT09ICdyYW5nZScpIHtcbiAgICAvLyB0aGlzIGlzIHNvIGVsZW1lbnRzIGxpa2Ugc2xpZGVyIG1vdmUgdGhlaXIgVUkgdGhpbmd5XG4gICAgb2xkTm9kZS52YWx1ZSA9IG5ld1ZhbHVlXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlVGV4dGFyZWEgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgdmFyIG5ld1ZhbHVlID0gbmV3Tm9kZS52YWx1ZVxuICBpZiAobmV3VmFsdWUgIT09IG9sZE5vZGUudmFsdWUpIHtcbiAgICBvbGROb2RlLnZhbHVlID0gbmV3VmFsdWVcbiAgfVxuXG4gIGlmIChvbGROb2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAvLyBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIHNldHMgdGhlIHBsYWNlaG9sZGVyIGFzIHRoZVxuICAgIC8vIG5vZGUgdmFsdWUgYW5kIHZpc2UgdmVyc2EuIFRoaXMgaWdub3JlcyBhbiBlbXB0eSB1cGRhdGUuXG4gICAgaWYgKG5ld1ZhbHVlID09PSAnJyAmJiBvbGROb2RlLmZpcnN0Q2hpbGQubm9kZVZhbHVlID09PSBvbGROb2RlLnBsYWNlaG9sZGVyKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBvbGROb2RlLmZpcnN0Q2hpbGQubm9kZVZhbHVlID0gbmV3VmFsdWVcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVTZWxlY3QgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgaWYgKCFvbGROb2RlLmhhc0F0dHJpYnV0ZU5TKG51bGwsICdtdWx0aXBsZScpKSB7XG4gICAgdmFyIGkgPSAwXG4gICAgdmFyIGN1ckNoaWxkID0gb2xkTm9kZS5maXJzdENoaWxkXG4gICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICB2YXIgbm9kZU5hbWUgPSBjdXJDaGlsZC5ub2RlTmFtZVxuICAgICAgaWYgKG5vZGVOYW1lICYmIG5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdPUFRJT04nKSB7XG4gICAgICAgIGlmIChjdXJDaGlsZC5oYXNBdHRyaWJ1dGVOUyhudWxsLCAnc2VsZWN0ZWQnKSkgYnJlYWtcbiAgICAgICAgaSsrXG4gICAgICB9XG4gICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nXG4gICAgfVxuXG4gICAgbmV3Tm9kZS5zZWxlY3RlZEluZGV4ID0gaVxuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUF0dHJpYnV0ZSAobmV3Tm9kZSwgb2xkTm9kZSwgbmFtZSkge1xuICBpZiAobmV3Tm9kZVtuYW1lXSAhPT0gb2xkTm9kZVtuYW1lXSkge1xuICAgIG9sZE5vZGVbbmFtZV0gPSBuZXdOb2RlW25hbWVdXG4gICAgaWYgKG5ld05vZGVbbmFtZV0pIHtcbiAgICAgIG9sZE5vZGUuc2V0QXR0cmlidXRlKG5hbWUsICcnKVxuICAgIH0gZWxzZSB7XG4gICAgICBvbGROb2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lLCAnJylcbiAgICB9XG4gIH1cbn1cbiIsInZhciBuYW5vbW9ycGggPSByZXF1aXJlKCduYW5vbW9ycGgnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gbmFub21vdW50XG5cbmZ1bmN0aW9uIG5hbm9tb3VudCAodGFyZ2V0LCBuZXdUcmVlKSB7XG4gIGlmICh0YXJnZXQubm9kZU5hbWUgPT09ICdCT0RZJykge1xuICAgIHZhciBjaGlsZHJlbiA9IHRhcmdldC5jaGlsZE5vZGVzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNoaWxkcmVuW2ldLm5vZGVOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICBuZXdUcmVlLmFwcGVuZENoaWxkKGNoaWxkcmVuW2ldLmNsb25lTm9kZSh0cnVlKSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB2YXIgdHJlZSA9IG5hbm9tb3JwaCh0YXJnZXQsIG5ld1RyZWUpXG4gIGFzc2VydC5lcXVhbCh0cmVlLCB0YXJnZXQsICduYW5vbW91bnQ6IFRoZSB0YXJnZXQgbm9kZSAnICtcbiAgICB0cmVlLm91dGVySFRNTC5ub2RlTmFtZSArICcgaXMgbm90IHRoZSBzYW1lIHR5cGUgYXMgdGhlIG5ldyBub2RlICcgK1xuICAgIHRhcmdldC5vdXRlckhUTUwubm9kZU5hbWUgKyAnLicpXG59XG4iLCIndXNlIHN0cmljdCdcblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gbmFub3JhZlxuXG4vLyBPbmx5IGNhbGwgUkFGIHdoZW4gbmVlZGVkXG4vLyAoZm4sIGZuPykgLT4gZm5cbmZ1bmN0aW9uIG5hbm9yYWYgKHJlbmRlciwgcmFmKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVuZGVyLCAnZnVuY3Rpb24nLCAnbmFub3JhZjogcmVuZGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uJylcbiAgYXNzZXJ0Lm9rKHR5cGVvZiByYWYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHJhZiA9PT0gJ3VuZGVmaW5lZCcsICduYW5vcmFmOiByYWYgc2hvdWxkIGJlIGEgZnVuY3Rpb24gb3IgdW5kZWZpbmVkJylcblxuICBpZiAoIXJhZikgcmFmID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB2YXIgcmVkcmF3U2NoZWR1bGVkID0gZmFsc2VcbiAgdmFyIGFyZ3MgPSBudWxsXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGZyYW1lICgpIHtcbiAgICBpZiAoYXJncyA9PT0gbnVsbCAmJiAhcmVkcmF3U2NoZWR1bGVkKSB7XG4gICAgICByZWRyYXdTY2hlZHVsZWQgPSB0cnVlXG5cbiAgICAgIHJhZihmdW5jdGlvbiByZWRyYXcgKCkge1xuICAgICAgICByZWRyYXdTY2hlZHVsZWQgPSBmYWxzZVxuXG4gICAgICAgIHZhciBsZW5ndGggPSBhcmdzLmxlbmd0aFxuICAgICAgICB2YXIgX2FyZ3MgPSBuZXcgQXJyYXkobGVuZ3RoKVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSBfYXJnc1tpXSA9IGFyZ3NbaV1cblxuICAgICAgICByZW5kZXIuYXBwbHkocmVuZGVyLCBfYXJncylcbiAgICAgICAgYXJncyA9IG51bGxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgYXJncyA9IGFyZ3VtZW50c1xuICB9XG59XG4iLCJ2YXIgd2F5ZmFyZXIgPSByZXF1aXJlKCd3YXlmYXJlcicpXG5cbnZhciBpc0xvY2FsRmlsZSA9ICgvZmlsZTpcXC9cXC8vLnRlc3QodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiZcbiAgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pKSAvLyBlbGVjdHJvbiBzdXBwb3J0XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLXVzZWxlc3MtZXNjYXBlICovXG52YXIgZWxlY3Ryb24gPSAnXihmaWxlOlxcL1xcL3xcXC8pKC4qXFwuaHRtbD9cXC8/KT8nXG52YXIgcHJvdG9jb2wgPSAnXihodHRwKHMpPyg6XFwvXFwvKSk/KHd3d1xcLik/J1xudmFyIGRvbWFpbiA9ICdbYS16QS1aMC05LV9cXC5dKyg6WzAtOV17MSw1fSk/KFxcL3sxfSk/J1xudmFyIHFzID0gJ1tcXD9dLiokJ1xuLyogZXNsaW50LWVuYWJsZSBuby11c2VsZXNzLWVzY2FwZSAqL1xuXG52YXIgc3RyaXBFbGVjdHJvbiA9IG5ldyBSZWdFeHAoZWxlY3Ryb24pXG52YXIgcHJlZml4ID0gbmV3IFJlZ0V4cChwcm90b2NvbCArIGRvbWFpbilcbnZhciBub3JtYWxpemUgPSBuZXcgUmVnRXhwKCcjJylcbnZhciBzdWZmaXggPSBuZXcgUmVnRXhwKHFzKVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5hbm9yb3V0ZXJcblxuZnVuY3Rpb24gTmFub3JvdXRlciAob3B0cykge1xuICBvcHRzID0gb3B0cyB8fCB7fVxuXG4gIHZhciByb3V0ZXIgPSB3YXlmYXJlcihvcHRzLmRlZmF1bHQgfHwgJy80MDQnKVxuICB2YXIgY3VycnkgPSBvcHRzLmN1cnJ5IHx8IGZhbHNlXG4gIHZhciBwcmV2Q2FsbGJhY2sgPSBudWxsXG4gIHZhciBwcmV2Um91dGUgPSBudWxsXG5cbiAgZW1pdC5yb3V0ZXIgPSByb3V0ZXJcbiAgZW1pdC5vbiA9IG9uXG4gIHJldHVybiBlbWl0XG5cbiAgZnVuY3Rpb24gb24gKHJvdXRlbmFtZSwgbGlzdGVuZXIpIHtcbiAgICByb3V0ZW5hbWUgPSByb3V0ZW5hbWUucmVwbGFjZSgvXlsjL10vLCAnJylcbiAgICByb3V0ZXIub24ocm91dGVuYW1lLCBsaXN0ZW5lcilcbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXQgKHJvdXRlKSB7XG4gICAgaWYgKCFjdXJyeSkge1xuICAgICAgcmV0dXJuIHJvdXRlcihyb3V0ZSlcbiAgICB9IGVsc2Uge1xuICAgICAgcm91dGUgPSBwYXRobmFtZShyb3V0ZSwgaXNMb2NhbEZpbGUpXG4gICAgICBpZiAocm91dGUgPT09IHByZXZSb3V0ZSkge1xuICAgICAgICByZXR1cm4gcHJldkNhbGxiYWNrKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByZXZSb3V0ZSA9IHJvdXRlXG4gICAgICAgIHByZXZDYWxsYmFjayA9IHJvdXRlcihyb3V0ZSlcbiAgICAgICAgcmV0dXJuIHByZXZDYWxsYmFjaygpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIHJlcGxhY2UgZXZlcnl0aGluZyBpbiBhIHJvdXRlIGJ1dCB0aGUgcGF0aG5hbWUgYW5kIGhhc2hcbmZ1bmN0aW9uIHBhdGhuYW1lIChyb3V0ZSwgaXNFbGVjdHJvbikge1xuICBpZiAoaXNFbGVjdHJvbikgcm91dGUgPSByb3V0ZS5yZXBsYWNlKHN0cmlwRWxlY3Ryb24sICcnKVxuICBlbHNlIHJvdXRlID0gcm91dGUucmVwbGFjZShwcmVmaXgsICcnKVxuICByZXR1cm4gcm91dGUucmVwbGFjZShzdWZmaXgsICcnKS5yZXBsYWNlKG5vcm1hbGl6ZSwgJy8nKVxufVxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gTmFub3RpbWluZ1xuXG5mdW5jdGlvbiBOYW5vdGltaW5nIChuYW1lKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBOYW5vdGltaW5nKSkgcmV0dXJuIG5ldyBOYW5vdGltaW5nKG5hbWUpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbmFtZSwgJ3N0cmluZycsICdOYW5vdGltaW5nOiBuYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIHRoaXMuX25hbWUgPSBuYW1lXG4gIHRoaXMuX2VuYWJsZWQgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB3aW5kb3cucGVyZm9ybWFuY2UubWFya1xufVxuXG5OYW5vdGltaW5nLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uIChwYXJ0aWFsKSB7XG4gIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuXG4gIHZhciBuYW1lID0gcGFydGlhbCA/IHRoaXMuX25hbWUgKyAnOicgKyBwYXJ0aWFsIDogdGhpcy5fbmFtZVxuICB3aW5kb3cucGVyZm9ybWFuY2UubWFyayhuYW1lICsgJy1zdGFydCcpXG59XG5cbk5hbm90aW1pbmcucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChwYXJ0aWFsKSB7XG4gIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuXG4gIHZhciBuYW1lID0gcGFydGlhbCA/IHRoaXMuX25hbWUgKyAnOicgKyBwYXJ0aWFsIDogdGhpcy5fbmFtZVxuICB3aW5kb3cucGVyZm9ybWFuY2UubWFyayhuYW1lICsgJy1lbmQnKVxuICB3aW5kb3cucGVyZm9ybWFuY2UubWVhc3VyZShuYW1lLCBuYW1lICsgJy1zdGFydCcsIG5hbWUgKyAnLWVuZCcpXG59XG4iLCIvKiBnbG9iYWwgTXV0YXRpb25PYnNlcnZlciAqL1xudmFyIGRvY3VtZW50ID0gcmVxdWlyZSgnZ2xvYmFsL2RvY3VtZW50JylcbnZhciB3aW5kb3cgPSByZXF1aXJlKCdnbG9iYWwvd2luZG93JylcbnZhciB3YXRjaCA9IE9iamVjdC5jcmVhdGUobnVsbClcbnZhciBLRVlfSUQgPSAnb25sb2FkaWQnICsgKG5ldyBEYXRlKCkgJSA5ZTYpLnRvU3RyaW5nKDM2KVxudmFyIEtFWV9BVFRSID0gJ2RhdGEtJyArIEtFWV9JRFxudmFyIElOREVYID0gMFxuXG5pZiAod2luZG93ICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyKSB7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uIChtdXRhdGlvbnMpIHtcbiAgICBpZiAoT2JqZWN0LmtleXMod2F0Y2gpLmxlbmd0aCA8IDEpIHJldHVyblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbXV0YXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobXV0YXRpb25zW2ldLmF0dHJpYnV0ZU5hbWUgPT09IEtFWV9BVFRSKSB7XG4gICAgICAgIGVhY2hBdHRyKG11dGF0aW9uc1tpXSwgdHVybm9uLCB0dXJub2ZmKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgZWFjaE11dGF0aW9uKG11dGF0aW9uc1tpXS5yZW1vdmVkTm9kZXMsIHR1cm5vZmYpXG4gICAgICBlYWNoTXV0YXRpb24obXV0YXRpb25zW2ldLmFkZGVkTm9kZXMsIHR1cm5vbilcbiAgICB9XG4gIH0pXG4gIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwge1xuICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICBzdWJ0cmVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgYXR0cmlidXRlT2xkVmFsdWU6IHRydWUsXG4gICAgYXR0cmlidXRlRmlsdGVyOiBbS0VZX0FUVFJdXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gb25sb2FkIChlbCwgb24sIG9mZiwgY2FsbGVyKSB7XG4gIG9uID0gb24gfHwgZnVuY3Rpb24gKCkge31cbiAgb2ZmID0gb2ZmIHx8IGZ1bmN0aW9uICgpIHt9XG4gIGVsLnNldEF0dHJpYnV0ZShLRVlfQVRUUiwgJ28nICsgSU5ERVgpXG4gIHdhdGNoWydvJyArIElOREVYXSA9IFtvbiwgb2ZmLCAwLCBjYWxsZXIgfHwgb25sb2FkLmNhbGxlcl1cbiAgSU5ERVggKz0gMVxuICByZXR1cm4gZWxcbn1cblxuZnVuY3Rpb24gdHVybm9uIChpbmRleCwgZWwpIHtcbiAgaWYgKHdhdGNoW2luZGV4XVswXSAmJiB3YXRjaFtpbmRleF1bMl0gPT09IDApIHtcbiAgICB3YXRjaFtpbmRleF1bMF0oZWwpXG4gICAgd2F0Y2hbaW5kZXhdWzJdID0gMVxuICB9XG59XG5cbmZ1bmN0aW9uIHR1cm5vZmYgKGluZGV4LCBlbCkge1xuICBpZiAod2F0Y2hbaW5kZXhdWzFdICYmIHdhdGNoW2luZGV4XVsyXSA9PT0gMSkge1xuICAgIHdhdGNoW2luZGV4XVsxXShlbClcbiAgICB3YXRjaFtpbmRleF1bMl0gPSAwXG4gIH1cbn1cblxuZnVuY3Rpb24gZWFjaEF0dHIgKG11dGF0aW9uLCBvbiwgb2ZmKSB7XG4gIHZhciBuZXdWYWx1ZSA9IG11dGF0aW9uLnRhcmdldC5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpXG4gIGlmIChzYW1lT3JpZ2luKG11dGF0aW9uLm9sZFZhbHVlLCBuZXdWYWx1ZSkpIHtcbiAgICB3YXRjaFtuZXdWYWx1ZV0gPSB3YXRjaFttdXRhdGlvbi5vbGRWYWx1ZV1cbiAgICByZXR1cm5cbiAgfVxuICBpZiAod2F0Y2hbbXV0YXRpb24ub2xkVmFsdWVdKSB7XG4gICAgb2ZmKG11dGF0aW9uLm9sZFZhbHVlLCBtdXRhdGlvbi50YXJnZXQpXG4gIH1cbiAgaWYgKHdhdGNoW25ld1ZhbHVlXSkge1xuICAgIG9uKG5ld1ZhbHVlLCBtdXRhdGlvbi50YXJnZXQpXG4gIH1cbn1cblxuZnVuY3Rpb24gc2FtZU9yaWdpbiAob2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gIGlmICghb2xkVmFsdWUgfHwgIW5ld1ZhbHVlKSByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIHdhdGNoW29sZFZhbHVlXVszXSA9PT0gd2F0Y2hbbmV3VmFsdWVdWzNdXG59XG5cbmZ1bmN0aW9uIGVhY2hNdXRhdGlvbiAobm9kZXMsIGZuKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMod2F0Y2gpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobm9kZXNbaV0gJiYgbm9kZXNbaV0uZ2V0QXR0cmlidXRlICYmIG5vZGVzW2ldLmdldEF0dHJpYnV0ZShLRVlfQVRUUikpIHtcbiAgICAgIHZhciBvbmxvYWRpZCA9IG5vZGVzW2ldLmdldEF0dHJpYnV0ZShLRVlfQVRUUilcbiAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICBpZiAob25sb2FkaWQgPT09IGspIHtcbiAgICAgICAgICBmbihrLCBub2Rlc1tpXSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgaWYgKG5vZGVzW2ldLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgZWFjaE11dGF0aW9uKG5vZGVzW2ldLmNoaWxkTm9kZXMsIGZuKVxuICAgIH1cbiAgfVxufVxuIiwiLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG52YXIgYnl0ZVRvSGV4ID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG59XG5cbmZ1bmN0aW9uIGJ5dGVzVG9VdWlkKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDA7XG4gIHZhciBidGggPSBieXRlVG9IZXg7XG4gIHJldHVybiBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnl0ZXNUb1V1aWQ7XG4iLCIvLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxudmFyIHJuZztcblxudmFyIGNyeXB0byA9IGdsb2JhbC5jcnlwdG8gfHwgZ2xvYmFsLm1zQ3J5cHRvOyAvLyBmb3IgSUUgMTFcbmlmIChjcnlwdG8gJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcykge1xuICAvLyBXSEFUV0cgY3J5cHRvIFJORyAtIGh0dHA6Ly93aWtpLndoYXR3Zy5vcmcvd2lraS9DcnlwdG9cbiAgdmFyIHJuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmXG4gIHJuZyA9IGZ1bmN0aW9uIHdoYXR3Z1JORygpIHtcbiAgICBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHJuZHM4KTtcbiAgICByZXR1cm4gcm5kczg7XG4gIH07XG59XG5cbmlmICghcm5nKSB7XG4gIC8vIE1hdGgucmFuZG9tKCktYmFzZWQgKFJORylcbiAgLy9cbiAgLy8gSWYgYWxsIGVsc2UgZmFpbHMsIHVzZSBNYXRoLnJhbmRvbSgpLiAgSXQncyBmYXN0LCBidXQgaXMgb2YgdW5zcGVjaWZpZWRcbiAgLy8gcXVhbGl0eS5cbiAgdmFyIHJuZHMgPSBuZXcgQXJyYXkoMTYpO1xuICBybmcgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgcjsgaSA8IDE2OyBpKyspIHtcbiAgICAgIGlmICgoaSAmIDB4MDMpID09PSAwKSByID0gTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMDAwO1xuICAgICAgcm5kc1tpXSA9IHIgPj4+ICgoaSAmIDB4MDMpIDw8IDMpICYgMHhmZjtcbiAgICB9XG5cbiAgICByZXR1cm4gcm5kcztcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBybmc7XG4iLCJ2YXIgcm5nID0gcmVxdWlyZSgnLi9saWIvcm5nJyk7XG52YXIgYnl0ZXNUb1V1aWQgPSByZXF1aXJlKCcuL2xpYi9ieXRlc1RvVXVpZCcpO1xuXG4vLyAqKmB2MSgpYCAtIEdlbmVyYXRlIHRpbWUtYmFzZWQgVVVJRCoqXG4vL1xuLy8gSW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL0xpb3NLL1VVSUQuanNcbi8vIGFuZCBodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvdXVpZC5odG1sXG5cbi8vIHJhbmRvbSAjJ3Mgd2UgbmVlZCB0byBpbml0IG5vZGUgYW5kIGNsb2Nrc2VxXG52YXIgX3NlZWRCeXRlcyA9IHJuZygpO1xuXG4vLyBQZXIgNC41LCBjcmVhdGUgYW5kIDQ4LWJpdCBub2RlIGlkLCAoNDcgcmFuZG9tIGJpdHMgKyBtdWx0aWNhc3QgYml0ID0gMSlcbnZhciBfbm9kZUlkID0gW1xuICBfc2VlZEJ5dGVzWzBdIHwgMHgwMSxcbiAgX3NlZWRCeXRlc1sxXSwgX3NlZWRCeXRlc1syXSwgX3NlZWRCeXRlc1szXSwgX3NlZWRCeXRlc1s0XSwgX3NlZWRCeXRlc1s1XVxuXTtcblxuLy8gUGVyIDQuMi4yLCByYW5kb21pemUgKDE0IGJpdCkgY2xvY2tzZXFcbnZhciBfY2xvY2tzZXEgPSAoX3NlZWRCeXRlc1s2XSA8PCA4IHwgX3NlZWRCeXRlc1s3XSkgJiAweDNmZmY7XG5cbi8vIFByZXZpb3VzIHV1aWQgY3JlYXRpb24gdGltZVxudmFyIF9sYXN0TVNlY3MgPSAwLCBfbGFzdE5TZWNzID0gMDtcblxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9icm9vZmEvbm9kZS11dWlkIGZvciBBUEkgZGV0YWlsc1xuZnVuY3Rpb24gdjEob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG4gIHZhciBiID0gYnVmIHx8IFtdO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBjbG9ja3NlcSA9IG9wdGlvbnMuY2xvY2tzZXEgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuY2xvY2tzZXEgOiBfY2xvY2tzZXE7XG5cbiAgLy8gVVVJRCB0aW1lc3RhbXBzIGFyZSAxMDAgbmFuby1zZWNvbmQgdW5pdHMgc2luY2UgdGhlIEdyZWdvcmlhbiBlcG9jaCxcbiAgLy8gKDE1ODItMTAtMTUgMDA6MDApLiAgSlNOdW1iZXJzIGFyZW4ndCBwcmVjaXNlIGVub3VnaCBmb3IgdGhpcywgc29cbiAgLy8gdGltZSBpcyBoYW5kbGVkIGludGVybmFsbHkgYXMgJ21zZWNzJyAoaW50ZWdlciBtaWxsaXNlY29uZHMpIGFuZCAnbnNlY3MnXG4gIC8vICgxMDAtbmFub3NlY29uZHMgb2Zmc2V0IGZyb20gbXNlY3MpIHNpbmNlIHVuaXggZXBvY2gsIDE5NzAtMDEtMDEgMDA6MDAuXG4gIHZhciBtc2VjcyA9IG9wdGlvbnMubXNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubXNlY3MgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAvLyBQZXIgNC4yLjEuMiwgdXNlIGNvdW50IG9mIHV1aWQncyBnZW5lcmF0ZWQgZHVyaW5nIHRoZSBjdXJyZW50IGNsb2NrXG4gIC8vIGN5Y2xlIHRvIHNpbXVsYXRlIGhpZ2hlciByZXNvbHV0aW9uIGNsb2NrXG4gIHZhciBuc2VjcyA9IG9wdGlvbnMubnNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNlY3MgOiBfbGFzdE5TZWNzICsgMTtcblxuICAvLyBUaW1lIHNpbmNlIGxhc3QgdXVpZCBjcmVhdGlvbiAoaW4gbXNlY3MpXG4gIHZhciBkdCA9IChtc2VjcyAtIF9sYXN0TVNlY3MpICsgKG5zZWNzIC0gX2xhc3ROU2VjcykvMTAwMDA7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIEJ1bXAgY2xvY2tzZXEgb24gY2xvY2sgcmVncmVzc2lvblxuICBpZiAoZHQgPCAwICYmIG9wdGlvbnMuY2xvY2tzZXEgPT09IHVuZGVmaW5lZCkge1xuICAgIGNsb2Nrc2VxID0gY2xvY2tzZXEgKyAxICYgMHgzZmZmO1xuICB9XG5cbiAgLy8gUmVzZXQgbnNlY3MgaWYgY2xvY2sgcmVncmVzc2VzIChuZXcgY2xvY2tzZXEpIG9yIHdlJ3ZlIG1vdmVkIG9udG8gYSBuZXdcbiAgLy8gdGltZSBpbnRlcnZhbFxuICBpZiAoKGR0IDwgMCB8fCBtc2VjcyA+IF9sYXN0TVNlY3MpICYmIG9wdGlvbnMubnNlY3MgPT09IHVuZGVmaW5lZCkge1xuICAgIG5zZWNzID0gMDtcbiAgfVxuXG4gIC8vIFBlciA0LjIuMS4yIFRocm93IGVycm9yIGlmIHRvbyBtYW55IHV1aWRzIGFyZSByZXF1ZXN0ZWRcbiAgaWYgKG5zZWNzID49IDEwMDAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1dWlkLnYxKCk6IENhblxcJ3QgY3JlYXRlIG1vcmUgdGhhbiAxME0gdXVpZHMvc2VjJyk7XG4gIH1cblxuICBfbGFzdE1TZWNzID0gbXNlY3M7XG4gIF9sYXN0TlNlY3MgPSBuc2VjcztcbiAgX2Nsb2Nrc2VxID0gY2xvY2tzZXE7XG5cbiAgLy8gUGVyIDQuMS40IC0gQ29udmVydCBmcm9tIHVuaXggZXBvY2ggdG8gR3JlZ29yaWFuIGVwb2NoXG4gIG1zZWNzICs9IDEyMjE5MjkyODAwMDAwO1xuXG4gIC8vIGB0aW1lX2xvd2BcbiAgdmFyIHRsID0gKChtc2VjcyAmIDB4ZmZmZmZmZikgKiAxMDAwMCArIG5zZWNzKSAlIDB4MTAwMDAwMDAwO1xuICBiW2krK10gPSB0bCA+Pj4gMjQgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gMTYgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsICYgMHhmZjtcblxuICAvLyBgdGltZV9taWRgXG4gIHZhciB0bWggPSAobXNlY3MgLyAweDEwMDAwMDAwMCAqIDEwMDAwKSAmIDB4ZmZmZmZmZjtcbiAgYltpKytdID0gdG1oID4+PiA4ICYgMHhmZjtcbiAgYltpKytdID0gdG1oICYgMHhmZjtcblxuICAvLyBgdGltZV9oaWdoX2FuZF92ZXJzaW9uYFxuICBiW2krK10gPSB0bWggPj4+IDI0ICYgMHhmIHwgMHgxMDsgLy8gaW5jbHVkZSB2ZXJzaW9uXG4gIGJbaSsrXSA9IHRtaCA+Pj4gMTYgJiAweGZmO1xuXG4gIC8vIGBjbG9ja19zZXFfaGlfYW5kX3Jlc2VydmVkYCAoUGVyIDQuMi4yIC0gaW5jbHVkZSB2YXJpYW50KVxuICBiW2krK10gPSBjbG9ja3NlcSA+Pj4gOCB8IDB4ODA7XG5cbiAgLy8gYGNsb2NrX3NlcV9sb3dgXG4gIGJbaSsrXSA9IGNsb2Nrc2VxICYgMHhmZjtcblxuICAvLyBgbm9kZWBcbiAgdmFyIG5vZGUgPSBvcHRpb25zLm5vZGUgfHwgX25vZGVJZDtcbiAgZm9yICh2YXIgbiA9IDA7IG4gPCA2OyArK24pIHtcbiAgICBiW2kgKyBuXSA9IG5vZGVbbl07XG4gIH1cblxuICByZXR1cm4gYnVmID8gYnVmIDogYnl0ZXNUb1V1aWQoYik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdjE7XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbnZhciB0cmllID0gcmVxdWlyZSgnLi90cmllJylcblxubW9kdWxlLmV4cG9ydHMgPSBXYXlmYXJlclxuXG4vLyBjcmVhdGUgYSByb3V0ZXJcbi8vIHN0ciAtPiBvYmpcbmZ1bmN0aW9uIFdheWZhcmVyIChkZnQpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdheWZhcmVyKSkgcmV0dXJuIG5ldyBXYXlmYXJlcihkZnQpXG5cbiAgdmFyIF9kZWZhdWx0ID0gKGRmdCB8fCAnJykucmVwbGFjZSgvXlxcLy8sICcnKVxuICB2YXIgX3RyaWUgPSB0cmllKClcblxuICBlbWl0Ll90cmllID0gX3RyaWVcbiAgZW1pdC5lbWl0ID0gZW1pdFxuICBlbWl0Lm9uID0gb25cbiAgZW1pdC5fd2F5ZmFyZXIgPSB0cnVlXG5cbiAgcmV0dXJuIGVtaXRcblxuICAvLyBkZWZpbmUgYSByb3V0ZVxuICAvLyAoc3RyLCBmbikgLT4gb2JqXG4gIGZ1bmN0aW9uIG9uIChyb3V0ZSwgY2IpIHtcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHJvdXRlLCAnc3RyaW5nJylcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIGNiLCAnZnVuY3Rpb24nKVxuXG4gICAgcm91dGUgPSByb3V0ZSB8fCAnLydcbiAgICBjYi5yb3V0ZSA9IHJvdXRlXG5cbiAgICBpZiAoY2IgJiYgY2IuX3dheWZhcmVyICYmIGNiLl90cmllKSB7XG4gICAgICBfdHJpZS5tb3VudChyb3V0ZSwgY2IuX3RyaWUudHJpZSlcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIG5vZGUgPSBfdHJpZS5jcmVhdGUocm91dGUpXG4gICAgICBub2RlLmNiID0gY2JcbiAgICB9XG5cbiAgICByZXR1cm4gZW1pdFxuICB9XG5cbiAgLy8gbWF0Y2ggYW5kIGNhbGwgYSByb3V0ZVxuICAvLyAoc3RyLCBvYmo/KSAtPiBudWxsXG4gIGZ1bmN0aW9uIGVtaXQgKHJvdXRlKSB7XG4gICAgYXNzZXJ0Lm5vdEVxdWFsKHJvdXRlLCB1bmRlZmluZWQsIFwiJ3JvdXRlJyBtdXN0IGJlIGRlZmluZWRcIilcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKVxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXVxuICAgIH1cblxuICAgIHZhciBub2RlID0gX3RyaWUubWF0Y2gocm91dGUpXG4gICAgaWYgKG5vZGUgJiYgbm9kZS5jYikge1xuICAgICAgYXJnc1swXSA9IG5vZGUucGFyYW1zXG4gICAgICB2YXIgY2IgPSBub2RlLmNiXG4gICAgICByZXR1cm4gY2IuYXBwbHkoY2IsIGFyZ3MpXG4gICAgfVxuXG4gICAgdmFyIGRmdCA9IF90cmllLm1hdGNoKF9kZWZhdWx0KVxuICAgIGlmIChkZnQgJiYgZGZ0LmNiKSB7XG4gICAgICBhcmdzWzBdID0gZGZ0LnBhcmFtc1xuICAgICAgdmFyIGRmdGNiID0gZGZ0LmNiXG4gICAgICByZXR1cm4gZGZ0Y2IuYXBwbHkoZGZ0Y2IsIGFyZ3MpXG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwicm91dGUgJ1wiICsgcm91dGUgKyBcIicgZGlkIG5vdCBtYXRjaFwiKVxuICB9XG59XG4iLCJ2YXIgbXV0YXRlID0gcmVxdWlyZSgneHRlbmQvbXV0YWJsZScpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbnZhciB4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJylcblxubW9kdWxlLmV4cG9ydHMgPSBUcmllXG5cbi8vIGNyZWF0ZSBhIG5ldyB0cmllXG4vLyBudWxsIC0+IG9ialxuZnVuY3Rpb24gVHJpZSAoKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUcmllKSkgcmV0dXJuIG5ldyBUcmllKClcbiAgdGhpcy50cmllID0geyBub2Rlczoge30gfVxufVxuXG4vLyBjcmVhdGUgYSBub2RlIG9uIHRoZSB0cmllIGF0IHJvdXRlXG4vLyBhbmQgcmV0dXJuIGEgbm9kZVxuLy8gc3RyIC0+IG51bGxcblRyaWUucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uIChyb3V0ZSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJvdXRlLCAnc3RyaW5nJywgJ3JvdXRlIHNob3VsZCBiZSBhIHN0cmluZycpXG4gIC8vIHN0cmlwIGxlYWRpbmcgJy8nIGFuZCBzcGxpdCByb3V0ZXNcbiAgdmFyIHJvdXRlcyA9IHJvdXRlLnJlcGxhY2UoL15cXC8vLCAnJykuc3BsaXQoJy8nKVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU5vZGUgKGluZGV4LCB0cmllKSB7XG4gICAgdmFyIHRoaXNSb3V0ZSA9IChyb3V0ZXMuaGFzT3duUHJvcGVydHkoaW5kZXgpICYmIHJvdXRlc1tpbmRleF0pXG4gICAgaWYgKHRoaXNSb3V0ZSA9PT0gZmFsc2UpIHJldHVybiB0cmllXG5cbiAgICB2YXIgbm9kZSA9IG51bGxcbiAgICBpZiAoL146fF5cXCovLnRlc3QodGhpc1JvdXRlKSkge1xuICAgICAgLy8gaWYgbm9kZSBpcyBhIG5hbWUgbWF0Y2gsIHNldCBuYW1lIGFuZCBhcHBlbmQgdG8gJzonIG5vZGVcbiAgICAgIGlmICghdHJpZS5ub2Rlcy5oYXNPd25Qcm9wZXJ0eSgnJCQnKSkge1xuICAgICAgICBub2RlID0geyBub2Rlczoge30gfVxuICAgICAgICB0cmllLm5vZGVzWyckJCddID0gbm9kZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZSA9IHRyaWUubm9kZXNbJyQkJ11cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXNSb3V0ZVswXSA9PT0gJyonKSB7XG4gICAgICAgIHRyaWUud2lsZGNhcmQgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIHRyaWUubmFtZSA9IHRoaXNSb3V0ZS5yZXBsYWNlKC9eOnxeXFwqLywgJycpXG4gICAgfSBlbHNlIGlmICghdHJpZS5ub2Rlcy5oYXNPd25Qcm9wZXJ0eSh0aGlzUm91dGUpKSB7XG4gICAgICBub2RlID0geyBub2Rlczoge30gfVxuICAgICAgdHJpZS5ub2Rlc1t0aGlzUm91dGVdID0gbm9kZVxuICAgIH0gZWxzZSB7XG4gICAgICBub2RlID0gdHJpZS5ub2Rlc1t0aGlzUm91dGVdXG4gICAgfVxuXG4gICAgLy8gd2UgbXVzdCByZWN1cnNlIGRlZXBlclxuICAgIHJldHVybiBjcmVhdGVOb2RlKGluZGV4ICsgMSwgbm9kZSlcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVOb2RlKDAsIHRoaXMudHJpZSlcbn1cblxuLy8gbWF0Y2ggYSByb3V0ZSBvbiB0aGUgdHJpZVxuLy8gYW5kIHJldHVybiB0aGUgbm9kZVxuLy8gc3RyIC0+IG9ialxuVHJpZS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiAocm91dGUpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiByb3V0ZSwgJ3N0cmluZycsICdyb3V0ZSBzaG91bGQgYmUgYSBzdHJpbmcnKVxuXG4gIHZhciByb3V0ZXMgPSByb3V0ZS5yZXBsYWNlKC9eXFwvLywgJycpLnNwbGl0KCcvJylcbiAgdmFyIHBhcmFtcyA9IHt9XG5cbiAgZnVuY3Rpb24gc2VhcmNoIChpbmRleCwgdHJpZSkge1xuICAgIC8vIGVpdGhlciB0aGVyZSdzIG5vIG1hdGNoLCBvciB3ZSdyZSBkb25lIHNlYXJjaGluZ1xuICAgIGlmICh0cmllID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWRcbiAgICB2YXIgdGhpc1JvdXRlID0gcm91dGVzW2luZGV4XVxuICAgIGlmICh0aGlzUm91dGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRyaWVcblxuICAgIGlmICh0cmllLm5vZGVzLmhhc093blByb3BlcnR5KHRoaXNSb3V0ZSkpIHtcbiAgICAgIC8vIG1hdGNoIHJlZ3VsYXIgcm91dGVzIGZpcnN0XG4gICAgICByZXR1cm4gc2VhcmNoKGluZGV4ICsgMSwgdHJpZS5ub2Rlc1t0aGlzUm91dGVdKVxuICAgIH0gZWxzZSBpZiAodHJpZS5uYW1lKSB7XG4gICAgICAvLyBtYXRjaCBuYW1lZCByb3V0ZXNcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhcmFtc1t0cmllLm5hbWVdID0gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXNSb3V0ZSlcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHNlYXJjaChpbmRleCwgdW5kZWZpbmVkKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHNlYXJjaChpbmRleCArIDEsIHRyaWUubm9kZXNbJyQkJ10pXG4gICAgfSBlbHNlIGlmICh0cmllLndpbGRjYXJkKSB7XG4gICAgICAvLyBtYXRjaCB3aWxkY2FyZHNcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhcmFtc1snd2lsZGNhcmQnXSA9IGRlY29kZVVSSUNvbXBvbmVudChyb3V0ZXMuc2xpY2UoaW5kZXgpLmpvaW4oJy8nKSlcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHNlYXJjaChpbmRleCwgdW5kZWZpbmVkKVxuICAgICAgfVxuICAgICAgLy8gcmV0dXJuIGVhcmx5LCBvciBlbHNlIHNlYXJjaCBtYXkga2VlcCByZWN1cnNpbmcgdGhyb3VnaCB0aGUgd2lsZGNhcmRcbiAgICAgIHJldHVybiB0cmllLm5vZGVzWyckJCddXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vIG1hdGNoZXMgZm91bmRcbiAgICAgIHJldHVybiBzZWFyY2goaW5kZXggKyAxKVxuICAgIH1cbiAgfVxuXG4gIHZhciBub2RlID0gc2VhcmNoKDAsIHRoaXMudHJpZSlcblxuICBpZiAoIW5vZGUpIHJldHVybiB1bmRlZmluZWRcbiAgbm9kZSA9IHh0ZW5kKG5vZGUpXG4gIG5vZGUucGFyYW1zID0gcGFyYW1zXG4gIHJldHVybiBub2RlXG59XG5cbi8vIG1vdW50IGEgdHJpZSBvbnRvIGEgbm9kZSBhdCByb3V0ZVxuLy8gKHN0ciwgb2JqKSAtPiBudWxsXG5UcmllLnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChyb3V0ZSwgdHJpZSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJvdXRlLCAnc3RyaW5nJywgJ3JvdXRlIHNob3VsZCBiZSBhIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgdHJpZSwgJ29iamVjdCcsICd0cmllIHNob3VsZCBiZSBhIG9iamVjdCcpXG5cbiAgdmFyIHNwbGl0ID0gcm91dGUucmVwbGFjZSgvXlxcLy8sICcnKS5zcGxpdCgnLycpXG4gIHZhciBub2RlID0gbnVsbFxuICB2YXIga2V5ID0gbnVsbFxuXG4gIGlmIChzcGxpdC5sZW5ndGggPT09IDEpIHtcbiAgICBrZXkgPSBzcGxpdFswXVxuICAgIG5vZGUgPSB0aGlzLmNyZWF0ZShrZXkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIGhlYWRBcnIgPSBzcGxpdC5zcGxpY2UoMCwgc3BsaXQubGVuZ3RoIC0gMSlcbiAgICB2YXIgaGVhZCA9IGhlYWRBcnIuam9pbignLycpXG4gICAga2V5ID0gc3BsaXRbMF1cbiAgICBub2RlID0gdGhpcy5jcmVhdGUoaGVhZClcbiAgfVxuXG4gIG11dGF0ZShub2RlLm5vZGVzLCB0cmllLm5vZGVzKVxuICBpZiAodHJpZS5uYW1lKSBub2RlLm5hbWUgPSB0cmllLm5hbWVcblxuICAvLyBkZWxlZ2F0ZSBwcm9wZXJ0aWVzIGZyb20gJy8nIHRvIHRoZSBuZXcgbm9kZVxuICAvLyAnLycgY2Fubm90IGJlIHJlYWNoZWQgb25jZSBtb3VudGVkXG4gIGlmIChub2RlLm5vZGVzWycnXSkge1xuICAgIE9iamVjdC5rZXlzKG5vZGUubm9kZXNbJyddKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIGlmIChrZXkgPT09ICdub2RlcycpIHJldHVyblxuICAgICAgbm9kZVtrZXldID0gbm9kZS5ub2Rlc1snJ11ba2V5XVxuICAgIH0pXG4gICAgbXV0YXRlKG5vZGUubm9kZXMsIG5vZGUubm9kZXNbJyddLm5vZGVzKVxuICAgIGRlbGV0ZSBub2RlLm5vZGVzWycnXS5ub2Rlc1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG4gICAgdmFyIHRhcmdldCA9IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGNvbXBhcmUgYW5kIGlzQnVmZmVyIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvYmxvYi82ODBlOWU1ZTQ4OGYyMmFhYzI3NTk5YTU3ZGM4NDRhNjMxNTkyOGRkL2luZGV4LmpzXG4vLyBvcmlnaW5hbCBub3RpY2U6XG5cbi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuICBpZiAoYSA9PT0gYikge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgdmFyIHggPSBhLmxlbmd0aDtcbiAgdmFyIHkgPSBiLmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXTtcbiAgICAgIHkgPSBiW2ldO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSB7XG4gICAgcmV0dXJuIC0xO1xuICB9XG4gIGlmICh5IDwgeCkge1xuICAgIHJldHVybiAxO1xuICB9XG4gIHJldHVybiAwO1xufVxuZnVuY3Rpb24gaXNCdWZmZXIoYikge1xuICBpZiAoZ2xvYmFsLkJ1ZmZlciAmJiB0eXBlb2YgZ2xvYmFsLkJ1ZmZlci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBnbG9iYWwuQnVmZmVyLmlzQnVmZmVyKGIpO1xuICB9XG4gIHJldHVybiAhIShiICE9IG51bGwgJiYgYi5faXNCdWZmZXIpO1xufVxuXG4vLyBiYXNlZCBvbiBub2RlIGFzc2VydCwgb3JpZ2luYWwgbm90aWNlOlxuXG4vLyBodHRwOi8vd2lraS5jb21tb25qcy5vcmcvd2lraS9Vbml0X1Rlc3RpbmcvMS4wXG4vL1xuLy8gVEhJUyBJUyBOT1QgVEVTVEVEIE5PUiBMSUtFTFkgVE8gV09SSyBPVVRTSURFIFY4IVxuLy9cbi8vIE9yaWdpbmFsbHkgZnJvbSBuYXJ3aGFsLmpzIChodHRwOi8vbmFyd2hhbGpzLm9yZylcbi8vIENvcHlyaWdodCAoYykgMjAwOSBUaG9tYXMgUm9iaW5zb24gPDI4MG5vcnRoLmNvbT5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSAnU29mdHdhcmUnKSwgdG9cbi8vIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlXG4vLyByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Jcbi8vIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgJ0FTIElTJywgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4vLyBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OXG4vLyBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsLycpO1xudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGZ1bmN0aW9uc0hhdmVOYW1lcyA9IChmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbiBmb28oKSB7fS5uYW1lID09PSAnZm9vJztcbn0oKSk7XG5mdW5jdGlvbiBwVG9TdHJpbmcgKG9iaikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaik7XG59XG5mdW5jdGlvbiBpc1ZpZXcoYXJyYnVmKSB7XG4gIGlmIChpc0J1ZmZlcihhcnJidWYpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh0eXBlb2YgZ2xvYmFsLkFycmF5QnVmZmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIEFycmF5QnVmZmVyLmlzVmlldyhhcnJidWYpO1xuICB9XG4gIGlmICghYXJyYnVmKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChhcnJidWYgaW5zdGFuY2VvZiBEYXRhVmlldykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChhcnJidWYuYnVmZmVyICYmIGFycmJ1Zi5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbi8vIDEuIFRoZSBhc3NlcnQgbW9kdWxlIHByb3ZpZGVzIGZ1bmN0aW9ucyB0aGF0IHRocm93XG4vLyBBc3NlcnRpb25FcnJvcidzIHdoZW4gcGFydGljdWxhciBjb25kaXRpb25zIGFyZSBub3QgbWV0LiBUaGVcbi8vIGFzc2VydCBtb2R1bGUgbXVzdCBjb25mb3JtIHRvIHRoZSBmb2xsb3dpbmcgaW50ZXJmYWNlLlxuXG52YXIgYXNzZXJ0ID0gbW9kdWxlLmV4cG9ydHMgPSBvaztcblxuLy8gMi4gVGhlIEFzc2VydGlvbkVycm9yIGlzIGRlZmluZWQgaW4gYXNzZXJ0LlxuLy8gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7IG1lc3NhZ2U6IG1lc3NhZ2UsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsOiBhY3R1YWwsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkIH0pXG5cbnZhciByZWdleCA9IC9cXHMqZnVuY3Rpb25cXHMrKFteXFwoXFxzXSopXFxzKi87XG4vLyBiYXNlZCBvbiBodHRwczovL2dpdGh1Yi5jb20vbGpoYXJiL2Z1bmN0aW9uLnByb3RvdHlwZS5uYW1lL2Jsb2IvYWRlZWVlYzhiZmNjNjA2OGIxODdkN2Q5ZmIzZDViYjFkM2EzMDg5OS9pbXBsZW1lbnRhdGlvbi5qc1xuZnVuY3Rpb24gZ2V0TmFtZShmdW5jKSB7XG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChmdW5jdGlvbnNIYXZlTmFtZXMpIHtcbiAgICByZXR1cm4gZnVuYy5uYW1lO1xuICB9XG4gIHZhciBzdHIgPSBmdW5jLnRvU3RyaW5nKCk7XG4gIHZhciBtYXRjaCA9IHN0ci5tYXRjaChyZWdleCk7XG4gIHJldHVybiBtYXRjaCAmJiBtYXRjaFsxXTtcbn1cbmFzc2VydC5Bc3NlcnRpb25FcnJvciA9IGZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpIHtcbiAgdGhpcy5uYW1lID0gJ0Fzc2VydGlvbkVycm9yJztcbiAgdGhpcy5hY3R1YWwgPSBvcHRpb25zLmFjdHVhbDtcbiAgdGhpcy5leHBlY3RlZCA9IG9wdGlvbnMuZXhwZWN0ZWQ7XG4gIHRoaXMub3BlcmF0b3IgPSBvcHRpb25zLm9wZXJhdG9yO1xuICBpZiAob3B0aW9ucy5tZXNzYWdlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gb3B0aW9ucy5tZXNzYWdlO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubWVzc2FnZSA9IGdldE1lc3NhZ2UodGhpcyk7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gdHJ1ZTtcbiAgfVxuICB2YXIgc3RhY2tTdGFydEZ1bmN0aW9uID0gb3B0aW9ucy5zdGFja1N0YXJ0RnVuY3Rpb24gfHwgZmFpbDtcbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgc3RhY2tTdGFydEZ1bmN0aW9uKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBub24gdjggYnJvd3NlcnMgc28gd2UgY2FuIGhhdmUgYSBzdGFja3RyYWNlXG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgIHZhciBvdXQgPSBlcnIuc3RhY2s7XG5cbiAgICAgIC8vIHRyeSB0byBzdHJpcCB1c2VsZXNzIGZyYW1lc1xuICAgICAgdmFyIGZuX25hbWUgPSBnZXROYW1lKHN0YWNrU3RhcnRGdW5jdGlvbik7XG4gICAgICB2YXIgaWR4ID0gb3V0LmluZGV4T2YoJ1xcbicgKyBmbl9uYW1lKTtcbiAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAvLyBvbmNlIHdlIGhhdmUgbG9jYXRlZCB0aGUgZnVuY3Rpb24gZnJhbWVcbiAgICAgICAgLy8gd2UgbmVlZCB0byBzdHJpcCBvdXQgZXZlcnl0aGluZyBiZWZvcmUgaXQgKGFuZCBpdHMgbGluZSlcbiAgICAgICAgdmFyIG5leHRfbGluZSA9IG91dC5pbmRleE9mKCdcXG4nLCBpZHggKyAxKTtcbiAgICAgICAgb3V0ID0gb3V0LnN1YnN0cmluZyhuZXh0X2xpbmUgKyAxKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zdGFjayA9IG91dDtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGFzc2VydC5Bc3NlcnRpb25FcnJvciBpbnN0YW5jZW9mIEVycm9yXG51dGlsLmluaGVyaXRzKGFzc2VydC5Bc3NlcnRpb25FcnJvciwgRXJyb3IpO1xuXG5mdW5jdGlvbiB0cnVuY2F0ZShzLCBuKSB7XG4gIGlmICh0eXBlb2YgcyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gcy5sZW5ndGggPCBuID8gcyA6IHMuc2xpY2UoMCwgbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHM7XG4gIH1cbn1cbmZ1bmN0aW9uIGluc3BlY3Qoc29tZXRoaW5nKSB7XG4gIGlmIChmdW5jdGlvbnNIYXZlTmFtZXMgfHwgIXV0aWwuaXNGdW5jdGlvbihzb21ldGhpbmcpKSB7XG4gICAgcmV0dXJuIHV0aWwuaW5zcGVjdChzb21ldGhpbmcpO1xuICB9XG4gIHZhciByYXduYW1lID0gZ2V0TmFtZShzb21ldGhpbmcpO1xuICB2YXIgbmFtZSA9IHJhd25hbWUgPyAnOiAnICsgcmF3bmFtZSA6ICcnO1xuICByZXR1cm4gJ1tGdW5jdGlvbicgKyAgbmFtZSArICddJztcbn1cbmZ1bmN0aW9uIGdldE1lc3NhZ2Uoc2VsZikge1xuICByZXR1cm4gdHJ1bmNhdGUoaW5zcGVjdChzZWxmLmFjdHVhbCksIDEyOCkgKyAnICcgK1xuICAgICAgICAgc2VsZi5vcGVyYXRvciArICcgJyArXG4gICAgICAgICB0cnVuY2F0ZShpbnNwZWN0KHNlbGYuZXhwZWN0ZWQpLCAxMjgpO1xufVxuXG4vLyBBdCBwcmVzZW50IG9ubHkgdGhlIHRocmVlIGtleXMgbWVudGlvbmVkIGFib3ZlIGFyZSB1c2VkIGFuZFxuLy8gdW5kZXJzdG9vZCBieSB0aGUgc3BlYy4gSW1wbGVtZW50YXRpb25zIG9yIHN1YiBtb2R1bGVzIGNhbiBwYXNzXG4vLyBvdGhlciBrZXlzIHRvIHRoZSBBc3NlcnRpb25FcnJvcidzIGNvbnN0cnVjdG9yIC0gdGhleSB3aWxsIGJlXG4vLyBpZ25vcmVkLlxuXG4vLyAzLiBBbGwgb2YgdGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgbXVzdCB0aHJvdyBhbiBBc3NlcnRpb25FcnJvclxuLy8gd2hlbiBhIGNvcnJlc3BvbmRpbmcgY29uZGl0aW9uIGlzIG5vdCBtZXQsIHdpdGggYSBtZXNzYWdlIHRoYXRcbi8vIG1heSBiZSB1bmRlZmluZWQgaWYgbm90IHByb3ZpZGVkLiAgQWxsIGFzc2VydGlvbiBtZXRob2RzIHByb3ZpZGVcbi8vIGJvdGggdGhlIGFjdHVhbCBhbmQgZXhwZWN0ZWQgdmFsdWVzIHRvIHRoZSBhc3NlcnRpb24gZXJyb3IgZm9yXG4vLyBkaXNwbGF5IHB1cnBvc2VzLlxuXG5mdW5jdGlvbiBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG9wZXJhdG9yLCBzdGFja1N0YXJ0RnVuY3Rpb24pIHtcbiAgdGhyb3cgbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7XG4gICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICBhY3R1YWw6IGFjdHVhbCxcbiAgICBleHBlY3RlZDogZXhwZWN0ZWQsXG4gICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxuICAgIHN0YWNrU3RhcnRGdW5jdGlvbjogc3RhY2tTdGFydEZ1bmN0aW9uXG4gIH0pO1xufVxuXG4vLyBFWFRFTlNJT04hIGFsbG93cyBmb3Igd2VsbCBiZWhhdmVkIGVycm9ycyBkZWZpbmVkIGVsc2V3aGVyZS5cbmFzc2VydC5mYWlsID0gZmFpbDtcblxuLy8gNC4gUHVyZSBhc3NlcnRpb24gdGVzdHMgd2hldGhlciBhIHZhbHVlIGlzIHRydXRoeSwgYXMgZGV0ZXJtaW5lZFxuLy8gYnkgISFndWFyZC5cbi8vIGFzc2VydC5vayhndWFyZCwgbWVzc2FnZV9vcHQpO1xuLy8gVGhpcyBzdGF0ZW1lbnQgaXMgZXF1aXZhbGVudCB0byBhc3NlcnQuZXF1YWwodHJ1ZSwgISFndWFyZCxcbi8vIG1lc3NhZ2Vfb3B0KTsuIFRvIHRlc3Qgc3RyaWN0bHkgZm9yIHRoZSB2YWx1ZSB0cnVlLCB1c2Vcbi8vIGFzc2VydC5zdHJpY3RFcXVhbCh0cnVlLCBndWFyZCwgbWVzc2FnZV9vcHQpOy5cblxuZnVuY3Rpb24gb2sodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKCF2YWx1ZSkgZmFpbCh2YWx1ZSwgdHJ1ZSwgbWVzc2FnZSwgJz09JywgYXNzZXJ0Lm9rKTtcbn1cbmFzc2VydC5vayA9IG9rO1xuXG4vLyA1LiBUaGUgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHNoYWxsb3csIGNvZXJjaXZlIGVxdWFsaXR5IHdpdGhcbi8vID09LlxuLy8gYXNzZXJ0LmVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmVxdWFsID0gZnVuY3Rpb24gZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9IGV4cGVjdGVkKSBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5lcXVhbCk7XG59O1xuXG4vLyA2LiBUaGUgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igd2hldGhlciB0d28gb2JqZWN0cyBhcmUgbm90IGVxdWFsXG4vLyB3aXRoICE9IGFzc2VydC5ub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RFcXVhbCA9IGZ1bmN0aW9uIG5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9JywgYXNzZXJ0Lm5vdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gNy4gVGhlIGVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBhIGRlZXAgZXF1YWxpdHkgcmVsYXRpb24uXG4vLyBhc3NlcnQuZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmICghX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBmYWxzZSkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdkZWVwRXF1YWwnLCBhc3NlcnQuZGVlcEVxdWFsKTtcbiAgfVxufTtcblxuYXNzZXJ0LmRlZXBTdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIGRlZXBTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmICghX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCB0cnVlKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ2RlZXBTdHJpY3RFcXVhbCcsIGFzc2VydC5kZWVwU3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIHN0cmljdCwgbWVtb3MpIHtcbiAgLy8gNy4xLiBBbGwgaWRlbnRpY2FsIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNCdWZmZXIoYWN0dWFsKSAmJiBpc0J1ZmZlcihleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gY29tcGFyZShhY3R1YWwsIGV4cGVjdGVkKSA9PT0gMDtcblxuICAvLyA3LjIuIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIERhdGUgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIERhdGUgb2JqZWN0IHRoYXQgcmVmZXJzIHRvIHRoZSBzYW1lIHRpbWUuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0RhdGUoYWN0dWFsKSAmJiB1dGlsLmlzRGF0ZShleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMyBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBSZWdFeHAgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIFJlZ0V4cCBvYmplY3Qgd2l0aCB0aGUgc2FtZSBzb3VyY2UgYW5kXG4gIC8vIHByb3BlcnRpZXMgKGBnbG9iYWxgLCBgbXVsdGlsaW5lYCwgYGxhc3RJbmRleGAsIGBpZ25vcmVDYXNlYCkuXG4gIH0gZWxzZSBpZiAodXRpbC5pc1JlZ0V4cChhY3R1YWwpICYmIHV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5zb3VyY2UgPT09IGV4cGVjdGVkLnNvdXJjZSAmJlxuICAgICAgICAgICBhY3R1YWwuZ2xvYmFsID09PSBleHBlY3RlZC5nbG9iYWwgJiZcbiAgICAgICAgICAgYWN0dWFsLm11bHRpbGluZSA9PT0gZXhwZWN0ZWQubXVsdGlsaW5lICYmXG4gICAgICAgICAgIGFjdHVhbC5sYXN0SW5kZXggPT09IGV4cGVjdGVkLmxhc3RJbmRleCAmJlxuICAgICAgICAgICBhY3R1YWwuaWdub3JlQ2FzZSA9PT0gZXhwZWN0ZWQuaWdub3JlQ2FzZTtcblxuICAvLyA3LjQuIE90aGVyIHBhaXJzIHRoYXQgZG8gbm90IGJvdGggcGFzcyB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcsXG4gIC8vIGVxdWl2YWxlbmNlIGlzIGRldGVybWluZWQgYnkgPT0uXG4gIH0gZWxzZSBpZiAoKGFjdHVhbCA9PT0gbnVsbCB8fCB0eXBlb2YgYWN0dWFsICE9PSAnb2JqZWN0JykgJiZcbiAgICAgICAgICAgICAoZXhwZWN0ZWQgPT09IG51bGwgfHwgdHlwZW9mIGV4cGVjdGVkICE9PSAnb2JqZWN0JykpIHtcbiAgICByZXR1cm4gc3RyaWN0ID8gYWN0dWFsID09PSBleHBlY3RlZCA6IGFjdHVhbCA9PSBleHBlY3RlZDtcblxuICAvLyBJZiBib3RoIHZhbHVlcyBhcmUgaW5zdGFuY2VzIG9mIHR5cGVkIGFycmF5cywgd3JhcCB0aGVpciB1bmRlcmx5aW5nXG4gIC8vIEFycmF5QnVmZmVycyBpbiBhIEJ1ZmZlciBlYWNoIHRvIGluY3JlYXNlIHBlcmZvcm1hbmNlXG4gIC8vIFRoaXMgb3B0aW1pemF0aW9uIHJlcXVpcmVzIHRoZSBhcnJheXMgdG8gaGF2ZSB0aGUgc2FtZSB0eXBlIGFzIGNoZWNrZWQgYnlcbiAgLy8gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyAoYWthIHBUb1N0cmluZykuIE5ldmVyIHBlcmZvcm0gYmluYXJ5XG4gIC8vIGNvbXBhcmlzb25zIGZvciBGbG9hdCpBcnJheXMsIHRob3VnaCwgc2luY2UgZS5nLiArMCA9PT0gLTAgYnV0IHRoZWlyXG4gIC8vIGJpdCBwYXR0ZXJucyBhcmUgbm90IGlkZW50aWNhbC5cbiAgfSBlbHNlIGlmIChpc1ZpZXcoYWN0dWFsKSAmJiBpc1ZpZXcoZXhwZWN0ZWQpICYmXG4gICAgICAgICAgICAgcFRvU3RyaW5nKGFjdHVhbCkgPT09IHBUb1N0cmluZyhleHBlY3RlZCkgJiZcbiAgICAgICAgICAgICAhKGFjdHVhbCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSB8fFxuICAgICAgICAgICAgICAgYWN0dWFsIGluc3RhbmNlb2YgRmxvYXQ2NEFycmF5KSkge1xuICAgIHJldHVybiBjb21wYXJlKG5ldyBVaW50OEFycmF5KGFjdHVhbC5idWZmZXIpLFxuICAgICAgICAgICAgICAgICAgIG5ldyBVaW50OEFycmF5KGV4cGVjdGVkLmJ1ZmZlcikpID09PSAwO1xuXG4gIC8vIDcuNSBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSBpZiAoaXNCdWZmZXIoYWN0dWFsKSAhPT0gaXNCdWZmZXIoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIG1lbW9zID0gbWVtb3MgfHwge2FjdHVhbDogW10sIGV4cGVjdGVkOiBbXX07XG5cbiAgICB2YXIgYWN0dWFsSW5kZXggPSBtZW1vcy5hY3R1YWwuaW5kZXhPZihhY3R1YWwpO1xuICAgIGlmIChhY3R1YWxJbmRleCAhPT0gLTEpIHtcbiAgICAgIGlmIChhY3R1YWxJbmRleCA9PT0gbWVtb3MuZXhwZWN0ZWQuaW5kZXhPZihleHBlY3RlZCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbWVtb3MuYWN0dWFsLnB1c2goYWN0dWFsKTtcbiAgICBtZW1vcy5leHBlY3RlZC5wdXNoKGV4cGVjdGVkKTtcblxuICAgIHJldHVybiBvYmpFcXVpdihhY3R1YWwsIGV4cGVjdGVkLCBzdHJpY3QsIG1lbW9zKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0FyZ3VtZW50cyhvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xufVxuXG5mdW5jdGlvbiBvYmpFcXVpdihhLCBiLCBzdHJpY3QsIGFjdHVhbFZpc2l0ZWRPYmplY3RzKSB7XG4gIGlmIChhID09PSBudWxsIHx8IGEgPT09IHVuZGVmaW5lZCB8fCBiID09PSBudWxsIHx8IGIgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vIGlmIG9uZSBpcyBhIHByaW1pdGl2ZSwgdGhlIG90aGVyIG11c3QgYmUgc2FtZVxuICBpZiAodXRpbC5pc1ByaW1pdGl2ZShhKSB8fCB1dGlsLmlzUHJpbWl0aXZlKGIpKVxuICAgIHJldHVybiBhID09PSBiO1xuICBpZiAoc3RyaWN0ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihhKSAhPT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgdmFyIGFJc0FyZ3MgPSBpc0FyZ3VtZW50cyhhKTtcbiAgdmFyIGJJc0FyZ3MgPSBpc0FyZ3VtZW50cyhiKTtcbiAgaWYgKChhSXNBcmdzICYmICFiSXNBcmdzKSB8fCAoIWFJc0FyZ3MgJiYgYklzQXJncykpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBpZiAoYUlzQXJncykge1xuICAgIGEgPSBwU2xpY2UuY2FsbChhKTtcbiAgICBiID0gcFNsaWNlLmNhbGwoYik7XG4gICAgcmV0dXJuIF9kZWVwRXF1YWwoYSwgYiwgc3RyaWN0KTtcbiAgfVxuICB2YXIga2EgPSBvYmplY3RLZXlzKGEpO1xuICB2YXIga2IgPSBvYmplY3RLZXlzKGIpO1xuICB2YXIga2V5LCBpO1xuICAvLyBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGtleXMgaW5jb3Jwb3JhdGVzXG4gIC8vIGhhc093blByb3BlcnR5KVxuICBpZiAoa2EubGVuZ3RoICE9PSBrYi5sZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvL3RoZSBzYW1lIHNldCBvZiBrZXlzIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLFxuICBrYS5zb3J0KCk7XG4gIGtiLnNvcnQoKTtcbiAgLy9+fn5jaGVhcCBrZXkgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChrYVtpXSAhPT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIV9kZWVwRXF1YWwoYVtrZXldLCBiW2tleV0sIHN0cmljdCwgYWN0dWFsVmlzaXRlZE9iamVjdHMpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyA4LiBUaGUgbm9uLWVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBmb3IgYW55IGRlZXAgaW5lcXVhbGl0eS5cbi8vIGFzc2VydC5ub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RGVlcEVxdWFsID0gZnVuY3Rpb24gbm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgZmFsc2UpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnbm90RGVlcEVxdWFsJywgYXNzZXJ0Lm5vdERlZXBFcXVhbCk7XG4gIH1cbn07XG5cbmFzc2VydC5ub3REZWVwU3RyaWN0RXF1YWwgPSBub3REZWVwU3RyaWN0RXF1YWw7XG5mdW5jdGlvbiBub3REZWVwU3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCB0cnVlKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ25vdERlZXBTdHJpY3RFcXVhbCcsIG5vdERlZXBTdHJpY3RFcXVhbCk7XG4gIH1cbn1cblxuXG4vLyA5LiBUaGUgc3RyaWN0IGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzdHJpY3QgZXF1YWxpdHksIGFzIGRldGVybWluZWQgYnkgPT09LlxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnN0cmljdEVxdWFsID0gZnVuY3Rpb24gc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09PScsIGFzc2VydC5zdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDEwLiBUaGUgc3RyaWN0IG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHN0cmljdCBpbmVxdWFsaXR5LCBhc1xuLy8gZGV0ZXJtaW5lZCBieSAhPT0uICBhc3NlcnQubm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90U3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT09JywgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkge1xuICBpZiAoIWFjdHVhbCB8fCAhZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGV4cGVjdGVkKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgIHJldHVybiBleHBlY3RlZC50ZXN0KGFjdHVhbCk7XG4gIH1cblxuICB0cnkge1xuICAgIGlmIChhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gSWdub3JlLiAgVGhlIGluc3RhbmNlb2YgY2hlY2sgZG9lc24ndCB3b3JrIGZvciBhcnJvdyBmdW5jdGlvbnMuXG4gIH1cblxuICBpZiAoRXJyb3IuaXNQcm90b3R5cGVPZihleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gZXhwZWN0ZWQuY2FsbCh7fSwgYWN0dWFsKSA9PT0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gX3RyeUJsb2NrKGJsb2NrKSB7XG4gIHZhciBlcnJvcjtcbiAgdHJ5IHtcbiAgICBibG9jaygpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgZXJyb3IgPSBlO1xuICB9XG4gIHJldHVybiBlcnJvcjtcbn1cblxuZnVuY3Rpb24gX3Rocm93cyhzaG91bGRUaHJvdywgYmxvY2ssIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIHZhciBhY3R1YWw7XG5cbiAgaWYgKHR5cGVvZiBibG9jayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYmxvY2tcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZXhwZWN0ZWQgPT09ICdzdHJpbmcnKSB7XG4gICAgbWVzc2FnZSA9IGV4cGVjdGVkO1xuICAgIGV4cGVjdGVkID0gbnVsbDtcbiAgfVxuXG4gIGFjdHVhbCA9IF90cnlCbG9jayhibG9jayk7XG5cbiAgbWVzc2FnZSA9IChleHBlY3RlZCAmJiBleHBlY3RlZC5uYW1lID8gJyAoJyArIGV4cGVjdGVkLm5hbWUgKyAnKS4nIDogJy4nKSArXG4gICAgICAgICAgICAobWVzc2FnZSA/ICcgJyArIG1lc3NhZ2UgOiAnLicpO1xuXG4gIGlmIChzaG91bGRUaHJvdyAmJiAhYWN0dWFsKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnTWlzc2luZyBleHBlY3RlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICB2YXIgdXNlclByb3ZpZGVkTWVzc2FnZSA9IHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJztcbiAgdmFyIGlzVW53YW50ZWRFeGNlcHRpb24gPSAhc2hvdWxkVGhyb3cgJiYgdXRpbC5pc0Vycm9yKGFjdHVhbCk7XG4gIHZhciBpc1VuZXhwZWN0ZWRFeGNlcHRpb24gPSAhc2hvdWxkVGhyb3cgJiYgYWN0dWFsICYmICFleHBlY3RlZDtcblxuICBpZiAoKGlzVW53YW50ZWRFeGNlcHRpb24gJiZcbiAgICAgIHVzZXJQcm92aWRlZE1lc3NhZ2UgJiZcbiAgICAgIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB8fFxuICAgICAgaXNVbmV4cGVjdGVkRXhjZXB0aW9uKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnR290IHVud2FudGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICgoc2hvdWxkVGhyb3cgJiYgYWN0dWFsICYmIGV4cGVjdGVkICYmXG4gICAgICAhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHx8ICghc2hvdWxkVGhyb3cgJiYgYWN0dWFsKSkge1xuICAgIHRocm93IGFjdHVhbDtcbiAgfVxufVxuXG4vLyAxMS4gRXhwZWN0ZWQgdG8gdGhyb3cgYW4gZXJyb3I6XG4vLyBhc3NlcnQudGhyb3dzKGJsb2NrLCBFcnJvcl9vcHQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnRocm93cyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9lcnJvciwgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzKHRydWUsIGJsb2NrLCBlcnJvciwgbWVzc2FnZSk7XG59O1xuXG4vLyBFWFRFTlNJT04hIFRoaXMgaXMgYW5ub3lpbmcgdG8gd3JpdGUgb3V0c2lkZSB0aGlzIG1vZHVsZS5cbmFzc2VydC5kb2VzTm90VGhyb3cgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovZXJyb3IsIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cyhmYWxzZSwgYmxvY2ssIGVycm9yLCBtZXNzYWdlKTtcbn07XG5cbmFzc2VydC5pZkVycm9yID0gZnVuY3Rpb24oZXJyKSB7IGlmIChlcnIpIHRocm93IGVycjsgfTtcblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgfVxuICByZXR1cm4ga2V5cztcbn07XG4iLCIiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIl19
