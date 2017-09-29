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

},{"./lib/appView":2,"./lib/store/appStore":29,"./lib/store/bgStore":30,"./lib/store/cardStore":31,"./lib/store/editBarStore":32,"./lib/store/editModalStore":33,"./lib/store/elementStore":34,"./lib/store/fieldStore":35,"./lib/store/imageStore":36,"choo":40}],2:[function(require,module,exports){
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

},{"./bgView":4,"./cardView":5,"./editBarView":6,"./editModalView":7,"./util":37,"choo/html":39}],3:[function(require,module,exports){
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
    'linkTo': {'linkTo': ''},
    'playSound': {'playSound': ''},
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
    },
    'playSound': function(state, emit, behavObj) {
        const shouting = html`<audio src="/img/${behavObj.playSound}" autoplay />`;
        shouting.addEventListener('ended', () => {
            shouting.parentNode.removeChild(shouting);
        });
        document.body.appendChild(shouting);
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
        if (behavObj === null) {
            return null;
        }
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

},{"./form/behaviorsToComponents":10,"./form/ifComponents":18,"./form/ifLogic":19,"./util":37,"choo/html":39,"uuid/v1":59}],4:[function(require,module,exports){
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

},{"./elementView.js":8,"./fieldView.js":9,"./graphicView.js":27,"./imageView.js":28,"choo/html":39}],5:[function(require,module,exports){
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

},{"./elementView.js":8,"./fieldView.js":9,"./graphicView.js":27,"./imageView.js":28,"choo/html":39}],6:[function(require,module,exports){
const html = require("choo/html");

const {selectOption} = require('./util');


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
        emit('ensureStaticFileLists');
        return html`<form id="addimage">
            Choose or drop: <input type="file"
              onchange=${e => emit("addImage", e)}
              class="${state.hoveringImage ? "drophover" : ""}" />
            Or select existing:
            <select name="existingImage" onchange=${(e) => emit("addImage", e)}>
                ${selectOption(null, '-', null)}
                ${state.staticFiles && state.staticFiles.map((file) => selectOption(file))}
            </select>
            <a href="#" onclick=${cancelImage} style="padding-left:12rem;color:red;">Cancel</a>
        </form>`;
    }

    function cancelImage() {
        state.addingImage = false;
        setTimeout(() => emit("render"), 1);
    }
};

module.exports = editBarView;

},{"./util":37,"choo/html":39}],7:[function(require,module,exports){
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

},{"./form/bgStyleView.js":11,"./form/cardStyleView.js":12,"./form/editBehaviorView.js":13,"./form/elementStyleView.js":14,"./form/fieldStyleView.js":15,"./form/imageStyleView.js":20,"./form/stackComboView.js":26,"choo/html":39}],8:[function(require,module,exports){
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

},{"./behavior.js":3,"choo/html":39}],9:[function(require,module,exports){
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

},{"./util":37,"choo/html":39}],10:[function(require,module,exports){
module.exports = {
    goToNextCard: require('./goToNextCardComponent'),
    goToPreviousCard: require('./goToPreviousCardComponent'),
    'if': null, // here to be counted, but not actually handled by a sep. component
    jumpTo: require('./jumpToComponent'),
    removeTruth: require('./removeTruthComponent'),
    setTruth: require('./setTruthComponent'),
    linkTo: require('./linkToComponent'),
    playSound: require('./playSoundComponent')
};

},{"./goToNextCardComponent":16,"./goToPreviousCardComponent":17,"./jumpToComponent":21,"./linkToComponent":22,"./playSoundComponent":23,"./removeTruthComponent":24,"./setTruthComponent":25}],11:[function(require,module,exports){
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

},{"choo/html":39}],12:[function(require,module,exports){
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

},{"choo/html":39}],13:[function(require,module,exports){
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

},{"../behavior":3,"../util":37,"choo/html":39}],14:[function(require,module,exports){
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

},{"../util":37,"choo/html":39}],15:[function(require,module,exports){
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

},{"../util":37,"choo/html":39}],16:[function(require,module,exports){
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

},{"../util":37,"choo/html":39}],17:[function(require,module,exports){
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

},{"../util":37,"choo/html":39}],18:[function(require,module,exports){
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

},{"../util":37,"choo/html":39}],19:[function(require,module,exports){
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

},{"../util":37}],20:[function(require,module,exports){
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

},{"choo/html":39}],21:[function(require,module,exports){
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

},{"../util":37,"choo/html":39}],22:[function(require,module,exports){
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

},{"choo/html":39}],23:[function(require,module,exports){
const html = require('choo/html');

const {selectOption} = require('../util');


function playSound(state, emit, behav, path) {
    emit('ensureStaticFileLists');

    const yourBasicHandler = (e) =>
        emit('setBehaviorObj', [path, {'playSound': e.target.value}]);

    return html`<div>
        <section>
            <small>(put a WAV, MP3, or OGG in the <code>/img</code> folder for now, sorry)</small><br />
            <select onchange=${yourBasicHandler} name="playSound">
                ${selectOption(null, '-', behav.playSound)}
                ${state.staticFiles.map((filename) =>
                    selectOption(filename, behav.playSound))}
            </select>
        </section>
    </div>`;
}

module.exports = playSound;

},{"../util":37,"choo/html":39}],24:[function(require,module,exports){
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

},{"choo/html":39}],25:[function(require,module,exports){
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

},{"choo/html":39}],26:[function(require,module,exports){
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

},{"choo/html":39}],27:[function(require,module,exports){
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

},{"choo/html":39}],28:[function(require,module,exports){
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

},{"./behavior.js":3,"choo/html":39}],29:[function(require,module,exports){
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


    emitter.on('ensureStaticFileLists', async function() {
        const needsFirstRender = !(state.staticFiles && state.staticFiles.length);
        const statics = await localArc.readdir('/img', {recursive: true});
        state.staticFiles = statics;
        if (needsFirstRender) {
            await asyncEmit('render');
        }
    });

    const maintainListsHandler = ({path}) => emitter.emit('ensureStaticFileLists');
    const staticsMonitor = localArc.createFileActivityStream('/img/*');
    staticsMonitor.addEventListener('invalidated', maintainListsHandler);
    staticsMonitor.addEventListener('changed', maintainListsHandler);


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

},{"../util":37}],30:[function(require,module,exports){
const {parseAndRunBehaviors} = require('../behavior.js');


const BgStore = (state, emitter) => {
    emitter.on('backgroundLoaded', function() {
        if (state.background.behavior && state.background.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), state.background.behavior);
        }
        if (state.editingPath && state.editingPath.length == 2 && state.editingPath[0] == 'backgrounds') {
            // already in bg-editing mode, so update the path
            state.editingPath[1] = state.currentBackground;
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

},{"../behavior.js":3}],31:[function(require,module,exports){
const {parseAndRunBehaviors} = require('../behavior.js');


const CardStore = (state, emitter) => {
    emitter.on('newCard', (stuff) => {
        if (Array.isArray(stuff)) {
            stuff = stuff[0];
        }
        if (!stuff) {
            stuff = {};
        }
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
        if (state.editingPath && state.editingPath.length == 2 && state.editingPath[0] == 'cards') {
            // already in card-editing mode, so update the path
            state.editingPath[1] = state.currentCard;
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

},{"../behavior.js":3}],32:[function(require,module,exports){
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

},{"../util":37}],33:[function(require,module,exports){
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

},{}],34:[function(require,module,exports){
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

},{"../util":37}],35:[function(require,module,exports){
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

},{"../util":37}],36:[function(require,module,exports){
const {modEnv} = require('../util');


const ImageStore = (state, emitter) => {
    emitter.on('addImage', function(event) {
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
        } else {
            // assuming a filename from the menu of existing files
            if (event.target.value !== null && event.target.value != 'null') { // *sigh*
                addImageObject(`/img/${event.target.value}`);
                state.addingImage = false;
                setTimeout(() => {
                    emitter.emit('render');
                    emitter.emit('save');
                }, 1);
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

},{"../util":37}],37:[function(require,module,exports){
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

},{"choo/html":39,"uuid/v1":59}],38:[function(require,module,exports){
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

},{"global/document":42,"hyperx":45,"on-load":56}],39:[function(require,module,exports){
module.exports = require('bel')

},{"bel":38}],40:[function(require,module,exports){
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

},{"assert":64,"document-ready":41,"nanobus":46,"nanohistory":47,"nanohref":48,"nanomorph":49,"nanomount":52,"nanoraf":53,"nanorouter":54}],41:[function(require,module,exports){
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

},{"assert":64}],42:[function(require,module,exports){
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

},{"min-document":65}],43:[function(require,module,exports){
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

},{}],44:[function(require,module,exports){
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

},{}],45:[function(require,module,exports){
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

},{"hyperscript-attribute-to-property":44}],46:[function(require,module,exports){
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

},{"assert":64,"nanotiming":55}],47:[function(require,module,exports){
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

},{"assert":64}],48:[function(require,module,exports){
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

},{"assert":64}],49:[function(require,module,exports){
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

},{"./lib/morph":51,"assert":64}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
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

},{"./events":50}],52:[function(require,module,exports){
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

},{"assert":64,"nanomorph":49}],53:[function(require,module,exports){
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

},{"assert":64}],54:[function(require,module,exports){
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

},{"wayfarer":60}],55:[function(require,module,exports){
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

},{"assert":64}],56:[function(require,module,exports){
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

},{"global/document":42,"global/window":43}],57:[function(require,module,exports){
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

},{}],58:[function(require,module,exports){
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

},{}],59:[function(require,module,exports){
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

},{"./lib/bytesToUuid":57,"./lib/rng":58}],60:[function(require,module,exports){
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

},{"./trie":61,"assert":64}],61:[function(require,module,exports){
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

},{"assert":64,"xtend":62,"xtend/mutable":63}],62:[function(require,module,exports){
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

},{}],63:[function(require,module,exports){
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

},{}],64:[function(require,module,exports){
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

},{"util/":69}],65:[function(require,module,exports){

},{}],66:[function(require,module,exports){
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

},{}],67:[function(require,module,exports){
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

},{}],68:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],69:[function(require,module,exports){
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

},{"./support/isBuffer":68,"_process":66,"inherits":67}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9hcHBWaWV3LmpzIiwibGliL2JlaGF2aW9yLmpzIiwibGliL2JnVmlldy5qcyIsImxpYi9jYXJkVmlldy5qcyIsImxpYi9lZGl0QmFyVmlldy5qcyIsImxpYi9lZGl0TW9kYWxWaWV3LmpzIiwibGliL2VsZW1lbnRWaWV3LmpzIiwibGliL2ZpZWxkVmlldy5qcyIsImxpYi9mb3JtL2JlaGF2aW9yc1RvQ29tcG9uZW50cy5qcyIsImxpYi9mb3JtL2JnU3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vY2FyZFN0eWxlVmlldy5qcyIsImxpYi9mb3JtL2VkaXRCZWhhdmlvclZpZXcuanMiLCJsaWIvZm9ybS9lbGVtZW50U3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vZmllbGRTdHlsZVZpZXcuanMiLCJsaWIvZm9ybS9nb1RvTmV4dENhcmRDb21wb25lbnQuanMiLCJsaWIvZm9ybS9nb1RvUHJldmlvdXNDYXJkQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vaWZDb21wb25lbnRzLmpzIiwibGliL2Zvcm0vaWZMb2dpYy5qcyIsImxpYi9mb3JtL2ltYWdlU3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vanVtcFRvQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vbGlua1RvQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vcGxheVNvdW5kQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vcmVtb3ZlVHJ1dGhDb21wb25lbnQuanMiLCJsaWIvZm9ybS9zZXRUcnV0aENvbXBvbmVudC5qcyIsImxpYi9mb3JtL3N0YWNrQ29tYm9WaWV3LmpzIiwibGliL2dyYXBoaWNWaWV3LmpzIiwibGliL2ltYWdlVmlldy5qcyIsImxpYi9zdG9yZS9hcHBTdG9yZS5qcyIsImxpYi9zdG9yZS9iZ1N0b3JlLmpzIiwibGliL3N0b3JlL2NhcmRTdG9yZS5qcyIsImxpYi9zdG9yZS9lZGl0QmFyU3RvcmUuanMiLCJsaWIvc3RvcmUvZWRpdE1vZGFsU3RvcmUuanMiLCJsaWIvc3RvcmUvZWxlbWVudFN0b3JlLmpzIiwibGliL3N0b3JlL2ZpZWxkU3RvcmUuanMiLCJsaWIvc3RvcmUvaW1hZ2VTdG9yZS5qcyIsImxpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2JlbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jaG9vL2h0bWwuanMiLCJub2RlX21vZHVsZXMvY2hvby9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kb2N1bWVudC1yZWFkeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9nbG9iYWwvZG9jdW1lbnQuanMiLCJub2RlX21vZHVsZXMvZ2xvYmFsL3dpbmRvdy5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcnNjcmlwdC1hdHRyaWJ1dGUtdG8tcHJvcGVydHkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvaHlwZXJ4L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9idXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub2hpc3RvcnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub2hyZWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub21vcnBoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9tb3JwaC9saWIvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL25hbm9tb3JwaC9saWIvbW9ycGguanMiLCJub2RlX21vZHVsZXMvbmFub21vdW50L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9yYWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub3JvdXRlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vdGltaW5nL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29uLWxvYWQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvYnl0ZXNUb1V1aWQuanMiLCJub2RlX21vZHVsZXMvdXVpZC9saWIvcm5nLWJyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvdXVpZC92MS5qcyIsIm5vZGVfbW9kdWxlcy93YXlmYXJlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy93YXlmYXJlci90cmllLmpzIiwibm9kZV9tb2R1bGVzL3h0ZW5kL2ltbXV0YWJsZS5qcyIsIm5vZGVfbW9kdWxlcy94dGVuZC9tdXRhYmxlLmpzIiwiLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Fzc2VydC9hc3NlcnQuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwiLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy91dGlsL25vZGVfbW9kdWxlcy9pbmhlcml0cy9pbmhlcml0c19icm93c2VyLmpzIiwiLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL3V0aWwvc3VwcG9ydC9pc0J1ZmZlckJyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvdXRpbC91dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25RQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxZUE7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gY29uc3QgYXJjID0gbmV3IERhdEFyY2hpdmUod2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKCkpO1xuXG4vLyBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKGF3YWl0IGFyYy5yZWFkRmlsZSgnY29uZmlnLmpzb24nKSk7XG5cbi8vIGNvbnN0IHtyZW5kZXJ9ID0gcmVxdWlyZSgnbGliL3V0aWwuanMnKTtcbi8vXG4vLyByZW5kZXIoY2FyZDEsIGFyYyk7XG5cbmNvbnN0IGNob28gPSByZXF1aXJlKCdjaG9vJyk7XG5cbmNvbnN0IG1haW5WaWV3ID0gcmVxdWlyZSgnLi9saWIvYXBwVmlldycpO1xuXG5cbmxldCBhcHAgPSBjaG9vKCk7XG5cbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvYXBwU3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2JnU3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2NhcmRTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvZWxlbWVudFN0b3JlJykpO1xuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9maWVsZFN0b3JlJykpO1xuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9lZGl0QmFyU3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2VkaXRNb2RhbFN0b3JlJykpO1xuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9pbWFnZVN0b3JlJykpO1xuXG5hcHAucm91dGUoJy8nLCBtYWluVmlldyk7XG4vLyBhcHAucm91dGUoJy9jYXJkLzp3aGljaCcsIGZ1bmN0aW9uKHN0YXRlLCBlbWl0KSB7XG4vLyAgICAgcmV0dXJuIG1haW5WaWV3KHN0YXRlLCBlbWl0KTtcbi8vIH0pXG5cbmFwcC5tb3VudCgnbWFpbicpO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCBiYWNrZ3JvdW5kID0gcmVxdWlyZSgnLi9iZ1ZpZXcnKTtcbmNvbnN0IGNhcmQgPSByZXF1aXJlKCcuL2NhcmRWaWV3Jyk7XG5jb25zdCBlZGl0QmFyID0gcmVxdWlyZSgnLi9lZGl0QmFyVmlldycpO1xuY29uc3QgZWRpdE1vZGFsID0gcmVxdWlyZSgnLi9lZGl0TW9kYWxWaWV3Jyk7XG5cbmNvbnN0IHtjb2xvcn0gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuY29uc3QgbWFpblZpZXcgPSBmdW5jdGlvbihzdGF0ZSwgZW1pdCkge1xuICAgIGNvbnN0IGN1cnJlbnRDb2xvciA9IGNvbG9yKHN0YXRlKTtcbiAgICByZXR1cm4gaHRtbGA8bWFpbiBjbGFzcz1cIiR7c3RhdGUuZWRpdE1vZGUgfHwgXCJcIn1cIlxuICAgICAgICBzdHlsZT1cIiR7Y3VycmVudENvbG9yID8gXCJiYWNrZ3JvdW5kLWNvbG9yOlwiICsgY3VycmVudENvbG9yIDogXCJcIn1cIj5cbiAgICAgICR7ISFzdGF0ZS5lZGl0TW9kZSA/IGVkaXRCYXIoc3RhdGUsIGVtaXQpIDogbnVsbH1cbiAgICAgICR7YmFja2dyb3VuZChzdGF0ZSwgZW1pdCl9XG4gICAgICAke2NhcmQoc3RhdGUsIGVtaXQpfVxuICAgICAgJHtzdGF0ZS5lZGl0aW5nUGF0aCA/IGVkaXRNb2RhbChzdGF0ZSwgZW1pdCkgOiBudWxsfVxuICAgIDwvbWFpbj5gO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtYWluVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IHV1aWQgPSByZXF1aXJlKCd1dWlkL3YxJyk7XG5cbmNvbnN0IHtzZWxlY3RPcHRpb24sIGNoZWNrQm94LCBnZXRQYXRofSA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuY29uc3Qge2NvbmRpdGlvbn0gPSByZXF1aXJlKCcuL2Zvcm0vaWZDb21wb25lbnRzJyk7XG5cbmNvbnN0IGJlaGF2aW9yT2JqcyA9IHtcbiAgICAnanVtcFRvJzogeydqdW1wVG8nOiBudWxsfSxcbiAgICAnaWYnOiB7J2lmJzoge1xuICAgICAgICBcImNvbmRpdGlvblwiOiBbXSxcbiAgICAgICAgXCJhY3Rpb25cIjogbnVsbCxcbiAgICAgICAgXCJlbHNlXCI6IG51bGxcbiAgICB9fSxcbiAgICAnc2V0VHJ1dGgnOiB7J3NldFRydXRoJzogJyd9LFxuICAgICdyZW1vdmVUcnV0aCc6IHsncmVtb3ZlVHJ1dGgnOiAnJ30sXG4gICAgJ2dvVG9OZXh0Q2FyZCc6IHsnZ29Ub05leHRDYXJkJzogJ3N0YWNrJywgJ3dyYXAnOiB0cnVlfSxcbiAgICAnZ29Ub1ByZXZpb3VzQ2FyZCc6IHsnZ29Ub1ByZXZpb3VzQ2FyZCc6ICdzdGFjaycsICd3cmFwJzogdHJ1ZX0sXG4gICAgJ2xpbmtUbyc6IHsnbGlua1RvJzogJyd9LFxuICAgICdwbGF5U291bmQnOiB7J3BsYXlTb3VuZCc6ICcnfSxcbn07XG5cbmNvbnN0IGJlaGF2aW9yT3BlcmF0aW9ucyA9IHtcbiAgICAnanVtcFRvJzogZnVuY3Rpb24oc3RhdGUsIGVtaXQsIGJlaGF2T2JqKSB7XG4gICAgICAgIGxldCB3aGVyZVRvID0gcGFyc2VJbnQoYmVoYXZPYmouanVtcFRvKTtcbiAgICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIod2hlcmVUbykpIHtcbiAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gd2hlcmVUbztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHdoZXJlVG8gPSBzdGF0ZS5jYXJkcy5maW5kSW5kZXgoXG4gICAgICAgICAgICAgICAgKGNkKSA9PiBjZC5uYW1lID09PSBiZWhhdk9iai5qdW1wVG9cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAod2hlcmVUbyA+PSAwKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUubmV4dENhcmQgPSB3aGVyZVRvO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdCgnZ290bycpLCAxKTtcbiAgICB9LFxuICAgICdzZXRUcnV0aCc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBzdGF0ZS50cnV0aHNbYmVoYXZPYmouc2V0VHJ1dGhdID0gdHJ1ZTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgIGVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSxcbiAgICAncmVtb3ZlVHJ1dGgnOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgZGVsZXRlIHN0YXRlLnRydXRoc1tiZWhhdk9iai5yZW1vdmVUcnV0aF07XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICBlbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH0sXG4gICAgJ2dvVG9OZXh0Q2FyZCc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBpZiAoYmVoYXZPYmouZ29Ub05leHRDYXJkID09ICdiZycpIHtcbiAgICAgICAgICAgIGxldCB3aXRoSW5kZXggPSBzdGF0ZS5jYXJkcy5tYXAoKGNkLCBpbmQpID0+IE9iamVjdC5hc3NpZ24oe30sIGNkLCB7aW5kZXg6IGluZH0pKTtcbiAgICAgICAgICAgIGxldCBzYW1lc2llcyA9IHdpdGhJbmRleC5maWx0ZXIoKGNkKSA9PlxuICAgICAgICAgICAgICAgIGNkLmluZGV4ID4gc3RhdGUuY3VycmVudENhcmQgJiZcbiAgICAgICAgICAgICAgICAgICAgY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdLmJhY2tncm91bmRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoIXNhbWVzaWVzLmxlbmd0aCAmJiBiZWhhdk9iai53cmFwKSB7XG4gICAgICAgICAgICAgICAgc2FtZXNpZXMgPSB3aXRoSW5kZXguZmlsdGVyKChjZCkgPT5cbiAgICAgICAgICAgICAgICAgICAgY2QuaW5kZXggPCBzdGF0ZS5jdXJyZW50Q2FyZCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdLmJhY2tncm91bmRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNhbWVzaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gc2FtZXNpZXNbMF0uaW5kZXg7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvTmV4dENhcmQnLCAhIWJlaGF2T2JqLndyYXApLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2dvVG9QcmV2aW91c0NhcmQnOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgaWYgKGJlaGF2T2JqLmdvVG9QcmV2aW91c0NhcmQgPT0gJ2JnJykge1xuICAgICAgICAgICAgbGV0IHdpdGhJbmRleCA9IHN0YXRlLmNhcmRzLm1hcCgoY2QsIGluZCkgPT4gT2JqZWN0LmFzc2lnbih7fSwgY2QsIHtpbmRleDogaW5kfSkpO1xuICAgICAgICAgICAgbGV0IHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgY2QuaW5kZXggPCBzdGF0ZS5jdXJyZW50Q2FyZCAmJiBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5jYXJkLmJhY2tncm91bmRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoIXNhbWVzaWVzLmxlbmd0aCAmJiBiZWhhdk9iai53cmFwKSB7XG4gICAgICAgICAgICAgICAgc2FtZXNpZXMgPSB3aXRoSW5kZXguZmlsdGVyKChjZCkgPT5cbiAgICAgICAgICAgICAgICAgICAgY2QuaW5kZXggPiBzdGF0ZS5jdXJyZW50Q2FyZCAmJiBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5jYXJkLmJhY2tncm91bmRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNhbWVzaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gc2FtZXNpZXNbc2FtZXNpZXMubGVuZ3RoIC0gMV0uaW5kZXg7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvUHJldkNhcmQnLCAhIWJlaGF2T2JqLndyYXApLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2xpbmtUbyc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGlua3lwb28gPSBuZXcgVVJMKGJlaGF2T2JqLmxpbmtUbyk7XG4gICAgICAgICAgICBpZiAoWydodHRwOicsJ2h0dHBzOicsJ2RhdDonXS5pbmNsdWRlcyhsaW5reXBvby5wcm90b2NvbCkpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHdpbmRvdy5sb2NhdGlvbiA9IGxpbmt5cG9vLmhyZWYsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIC8vIG5vdCBhIHVybCB5YXlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXlTb3VuZCc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBjb25zdCBzaG91dGluZyA9IGh0bWxgPGF1ZGlvIHNyYz1cIi9pbWcvJHtiZWhhdk9iai5wbGF5U291bmR9XCIgYXV0b3BsYXkgLz5gO1xuICAgICAgICBzaG91dGluZy5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAgIHNob3V0aW5nLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2hvdXRpbmcpO1xuICAgICAgICB9KTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzaG91dGluZyk7XG4gICAgfVxufTtcblxuY29uc3QgYmVoYXZpb3JDb21wb25lbnRzID0gcmVxdWlyZSgnLi9mb3JtL2JlaGF2aW9yc1RvQ29tcG9uZW50cycpO1xuXG4vKlxuR2l2ZW4gYSBiZWhhdkFyciB0aGF0IGxvb2tzIHNvbWV0aGluZyBsaWtlOiBbXG4gICAge1xuICAgICAgICBcInNldFRydXRoXCI6IFwiaGFzVGVzdGVkT3RoZXJGaWVsZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwiaWZcIjoge1xuICAgICAgICAgICAgXCJjb25kaXRpb25cIjogW3tcIm90aGVyRmllbGRcIjogXCJ5ZXNcIn1dLFxuICAgICAgICAgICAgXCJhY3Rpb25cIjoge1wianVtcFRvXCI6IDF9LFxuICAgICAgICAgICAgXCJlbHNlXCI6IHtcImp1bXBUb1wiOiAwfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwianVtcFRvXCI6IDBcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJkZXN0cm95VHJ1dGhcIjogXCJoYXNUZXN0ZWRPdGhlckZpZWxkXCJcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJ1cmxcIjogXCJkYXQ6Ly8zMmEuLi40NGVcIiAvLyBvciBodHRwLCB0aGF0J3Mgbm90IHRoZSBwb2ludFxuICAgIH1cbl1cbnBhcnNlQW5kUnVuQmVoYXZpb3JzIHdpbGwgdGFrZSBlYWNoIGluIG9yZGVyLCByZWFkIHRoZW0gdG8gc2VlIGhvdyBpdCBzaG91bGQgYWx0ZXJcbmEgZ2l2ZW4gc3RhdGUgaGFzaCwgYW5kIHRoZW4gZG8gc28sIHNvbWV0aW1lcyBieSBmaXJpbmcgZXZlbnRzIHdpdGggYSBnaXZlbiBlbWl0XG5mdW5jdGlvbi5cblxuU29tZSBtb3JlIGhhaXJzIG9uIHRoZSBiZWhhdkFyciBvYmplY3Qgc3ludGF4OlxuXG5pZjoge1xuICAgIGNvbmRpdGlvbjogWyduYW1lT2ZBVHJ1dGgnLCAnbmFtZU9mQW5vdGhlclRydXRoJ10sXG4gICAgY29uZGl0aW9uOiBbJ3RydXRoMScsIHsnb3RoZXJGaWVsZCc6ICd5ZXMnfSwgJ3RydXRoMiddLFxuICAgIGNvbmRpdGlvbjogWyd0cnV0aDMnLCB7J290aGVyRmllbGQnOiB7Z3Q6IDUsIGx0ZTogMzB9fSwgeydmaWZ0aEZpZWxkJzoge2NvbnRhaW5zOiAnbyd9fV0sXG4gICAgLy8gYWxsIHdvcmtcblxuICAgIGNvbmRpdGlvbjoge1wib3JcIjogW3snbmFtZSc6ICdkYXZlJ30sIHsnam9iJzogJ2phbml0b3InfV19IC8vIGdvZXMgb2ZmIGZvciBhbGwgZGF2ZXMgYW5kIGphbml0b3JzXG4gICAgY29uZGl0aW9uOiB7XCJvclwiOiBbeyduYW1lJzogJ2RhdmUnfSwgeyduYW1lJzogJ2ppbSd9XX0sIC8vIGJvdGggbmFtZXNcbiAgICBjb25kaXRpb246IHtcIm9yXCI6IFsndHJ1dGgxJywgJ3RydXRoMiddfSAvLyBlaXRoZXIgdHJ1dGguIHlvdSBjYW4gc3RpbGwgbWl4IGFuIG9iaiBpbiwgdG9vXG59XG5cbkFsc28geW91IGNhbiBqdW1wVG8gYSBjYXJkIGJ5IG5hbWU6IHsgJ2p1bXBUbyc6ICdhcnRodXInIH1cbiAqL1xuY29uc3Qge2V2YWxDb25kaXRpb259ID0gcmVxdWlyZSgnLi9mb3JtL2lmTG9naWMnKTtcblxuY29uc3QgcGFyc2VBbmRSdW5CZWhhdmlvcnMgPSBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZBcnIpIHtcblxuICAgIGNvbnN0IGRvQmVoYXZpb3IgPSAoYmVoYXZPYmopID0+IHtcbiAgICAgICAgaWYgKGJlaGF2T2JqID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYmVoYXZPYmpbJ2lmJ10pIHtcbiAgICAgICAgICAgIGlmIChldmFsQ29uZGl0aW9uKHN0YXRlLCBiZWhhdk9ialsnaWYnXS5jb25kaXRpb24pKSB7XG4gICAgICAgICAgICAgICAgZG9CZWhhdmlvcihiZWhhdk9ialsnaWYnXS5hY3Rpb24pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYmVoYXZPYmpbJ2lmJ11bJ2Vsc2UnXSkge1xuICAgICAgICAgICAgICAgICAgICBkb0JlaGF2aW9yKGJlaGF2T2JqWydpZiddWydlbHNlJ10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG1hZ2ljS2V5ID0gT2JqZWN0LmtleXMoYmVoYXZpb3JPcGVyYXRpb25zKS5maW5kKChrZXkpID0+XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoYmVoYXZPYmopLmluY2x1ZGVzKGtleSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBiZWhhdmlvck9wZXJhdGlvbnNbbWFnaWNLZXldLmNhbGwobnVsbCwgc3RhdGUsIGVtaXQsIGJlaGF2T2JqKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBiZWhhdkFyci5mb3JFYWNoKGRvQmVoYXZpb3IpO1xufVxuXG5jb25zdCBiZWhhdmlvciA9IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBwYXRoKSB7XG4gICAgY29uc3Qgc2FmZXR5UGF0aCA9IFtdLmNvbmNhdChwYXRoKTtcbiAgICBjb25zdCBiZWhhdiA9IGdldFBhdGgoc3RhdGUsIHNhZmV0eVBhdGgpO1xuXG4gICAgbGV0IGJlaGF2VHlwZTtcblxuICAgIGlmICh0eXBlb2YgYmVoYXYgPT09ICd1bmRlZmluZWQnIHx8IGJlaGF2ID09IG51bGwpIHtcbiAgICAgICAgYmVoYXZUeXBlID0gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB3aGF0V2VHb3QgPSBPYmplY3Qua2V5cyhiZWhhdik7XG4gICAgICAgIGlmICghd2hhdFdlR290Lmxlbmd0aCkge1xuICAgICAgICAgICAgYmVoYXZUeXBlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0eXBlcyA9IE9iamVjdC5rZXlzKGJlaGF2aW9yQ29tcG9uZW50cyk7XG4gICAgICAgIHR5cGVzLmZvckVhY2goKHR5cGUpID0+IHtcbiAgICAgICAgICAgIGlmICh3aGF0V2VHb3QuaW5jbHVkZXModHlwZSkpIHtcbiAgICAgICAgICAgICAgICBiZWhhdlR5cGUgPSB0eXBlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBtZW51ID0gYmVoYXZUeXBlTWVudShiZWhhdlR5cGUsIHNhZmV0eVBhdGgsIHNldEJlaGF2aW9yVHlwZSk7XG4gICAgcmV0dXJuIGh0bWxgPGRpdiBjbGFzcz1cImJlaGF2aW9yICR7J2JlaGF2LScgKyBiZWhhdlR5cGV9XCI+XG4gICAgICAgICR7bWVudX1cbiAgICAgICAgJHtiZWhhdlR5cGUgPT09ICdpZidcbiAgICAgICAgICAgID8gaWZTaGVsbChzdGF0ZSwgZW1pdCwgYmVoYXYsIHNhZmV0eVBhdGgpXG4gICAgICAgICAgICA6IChiZWhhdlR5cGUgIT09IG51bGxcbiAgICAgICAgICAgICAgICA/IGJlaGF2aW9yQ29tcG9uZW50c1tiZWhhdlR5cGVdLmNhbGwobnVsbCwgc3RhdGUsIGVtaXQsIGJlaGF2LCBzYWZldHlQYXRoKVxuICAgICAgICAgICAgICAgIDogbnVsbCl9XG4gICAgPC9kaXY+YDtcblxuICAgIGZ1bmN0aW9uIHNldEJlaGF2aW9yVHlwZShwYXRoLCB2YWx1ZSkge1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBiZWhhdmlvck9ianNbdmFsdWVdXSk7XG4gICAgfVxufTtcblxuZnVuY3Rpb24gaWZTaGVsbChzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8ZGl2PlxuICAgICAgICAgICAgJHtjb25kaXRpb24oc3RhdGUsIGVtaXQsIGJlaGF2WydpZiddLmNvbmRpdGlvbiwgcGF0aC5jb25jYXQoWydpZicsICdjb25kaXRpb24nXSkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHVsIGNsYXNzPVwiYmVoYXZpb3JzXCI+XG4gICAgICAgICAgICA8bGk+RG8gdGhlIGJlaGF2aW9yOlxuICAgICAgICAgICAgICAgICR7YmVoYXZpb3Ioc3RhdGUsIGVtaXQsIHBhdGguY29uY2F0KFsnaWYnLCAnYWN0aW9uJ10pKX1cbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgICA8bGk+T3RoZXJ3aXNlLCBkbzpcbiAgICAgICAgICAgICAgICAke2JlaGF2aW9yKHN0YXRlLCBlbWl0LCBwYXRoLmNvbmNhdChbJ2lmJywgJ2Vsc2UnXSkpfVxuICAgICAgICAgICAgPC9saT5cbiAgICAgICAgPC91bD5cbiAgICA8L2Rpdj5gO1xufVxuXG5mdW5jdGlvbiBiZWhhdmlvckxpc3Qoc3RhdGUsIGVtaXQsIGJlaGF2aW9ycywgcGF0aCkge1xuICAgIGNvbnN0IHJldCA9IGh0bWxgPHVsIGNsYXNzPVwiYmVoYXZpb3JzXCI+XG4gICAgICAgICR7YmVoYXZpb3JzLm1hcCgoYmVoYXYsIGluZCkgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGh0bWxgPGxpPlxuICAgICAgICAgICAgICAke2JlaGF2aW9yKHN0YXRlLCBlbWl0LCBwYXRoLmNvbmNhdChbaW5kXSkpfVxuICAgICAgICAgICAgPC9saT5gO1xuICAgICAgICB9KX1cbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cImFkZC1iZWhhdmlvclwiIG9uY2xpY2s9JHthZGRIYW5kbGVyfT4rPC9idXR0b24+XG4gICAgPC91bD5gO1xuICAgIHJldHVybiByZXQ7XG5cbiAgICBmdW5jdGlvbiBhZGRIYW5kbGVyKCkge1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBiZWhhdmlvcnMuY29uY2F0KFtudWxsXSldKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gYmVoYXZUeXBlTWVudShzZWxlY3RUeXBlLCBwYXRoLCBoYW5kbGVyKSB7XG4gICAgbGV0IG9wdHMgPSBbc2VsZWN0T3B0aW9uKG51bGwsICctJywgc2VsZWN0VHlwZSldO1xuICAgIGZvciAoY29uc3QgYmVoYXZpb3JLZXkgb2YgT2JqZWN0LmtleXMoYmVoYXZpb3JDb21wb25lbnRzKSkge1xuICAgICAgICBvcHRzLnB1c2goc2VsZWN0T3B0aW9uKGJlaGF2aW9yS2V5LCBzZWxlY3RUeXBlKSk7XG4gICAgfVxuICAgIHJldHVybiBodG1sYDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke3NlbGVjdFR5cGV9XCIgbmFtZT1cIiR7bmFtZX1cIiBvbmNoYW5nZT0keyhlKSA9PiBoYW5kbGVyKHBhdGgsIGUudGFyZ2V0LnZhbHVlKX0+XG4gICAgICAgICR7b3B0c31cbiAgICA8L3NlbGVjdD5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtwYXJzZUFuZFJ1bkJlaGF2aW9ycywgYmVoYXZpb3IsIGJlaGF2VHlwZU1lbnUsIGJlaGF2aW9yTGlzdH07XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IEltYWdlID0gcmVxdWlyZSgnLi9pbWFnZVZpZXcuanMnKTtcbmNvbnN0IEdyYXBoaWNFbGVtZW50ID0gcmVxdWlyZSgnLi9ncmFwaGljVmlldy5qcycpO1xuY29uc3QgRWxlbWVudCA9IHJlcXVpcmUoJy4vZWxlbWVudFZpZXcuanMnKTtcbmNvbnN0IEZpZWxkID0gcmVxdWlyZSgnLi9maWVsZFZpZXcuanMnKTtcblxuXG5jb25zdCBiZ1ZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgcmV0dXJuIGh0bWxgPHNlY3Rpb24gaWQ9XCJiZ1wiPlxuICAgICAgJHtkcmF3SW1hZ2VzKCl9XG4gICAgICAke2RyYXdFbGVtZW50cygpfVxuICAgICAgJHtkcmF3RmllbGRzKCl9XG4gICAgPC9zZWN0aW9uPmA7XG5cbiAgZnVuY3Rpb24gZHJhd0ltYWdlcygpIHtcbiAgICBpZiAoc3RhdGUuYmFja2dyb3VuZCAmJiBzdGF0ZS5iYWNrZ3JvdW5kLmltYWdlcykge1xuICAgICAgcmV0dXJuIHN0YXRlLmJhY2tncm91bmQuaW1hZ2VzLm1hcCgoZWxtLCBpbmQpID0+XG4gICAgICAgICAgICBJbWFnZShlbG0sIGluZCwgc3RhdGUsIGVtaXQpXG4gICAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBodG1sYDxkaXYgaWQ9XCJiZy1uby1pbWFnZXNcIj48L2Rpdj5gO1xuICB9XG5cbiAgZnVuY3Rpb24gZHJhd0VsZW1lbnRzKCkge1xuICAgIGlmIChzdGF0ZS5iYWNrZ3JvdW5kICYmIHN0YXRlLmJhY2tncm91bmQuZWxlbWVudHMpIHtcbiAgICAgIHJldHVybiBzdGF0ZS5iYWNrZ3JvdW5kLmVsZW1lbnRzLm1hcCgoYnV0LCBpbmQpID0+XG4gICAgICAgICAgRWxlbWVudChidXQsIGluZCwgc3RhdGUsIGVtaXQpXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gaHRtbGA8c3BhbiBjbGFzcz1cImJnLW5vLWVsZW1lbnRzXCI+PC9zcGFuPmA7XG4gIH1cblxuICBmdW5jdGlvbiBkcmF3RmllbGRzKCkge1xuICAgIGlmIChzdGF0ZS5iYWNrZ3JvdW5kICYmIHN0YXRlLmJhY2tncm91bmQuZmllbGRzKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LmtleXMoc3RhdGUuYmFja2dyb3VuZC5maWVsZHMpLm1hcCgoZmxkTmFtZSkgPT4ge1xuICAgICAgICAgIGxldCBmaWVsZFdpdGhWYWx1ZU1heWJlID0gT2JqZWN0LmFzc2lnbih7fSxcbiAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmQuZmllbGRzW2ZsZE5hbWVdLFxuICAgICAgICAgICAge3ZhbHVlOiBzdGF0ZS5jYXJkLnZhbHVlc1tmbGROYW1lXSB8fCAnJ31cbiAgICAgICAgICApO1xuICAgICAgICAgIHJldHVybiBGaWVsZChmaWVsZFdpdGhWYWx1ZU1heWJlLCBmbGROYW1lLCBzdGF0ZSwgZW1pdCk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiBodG1sYDxzcGFuIGNsYXNzPVwiYmctbm8tZmllbGRzXCI+PC9zcGFuPmA7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYmdWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCBJbWFnZSA9IHJlcXVpcmUoJy4vaW1hZ2VWaWV3LmpzJyk7XG5jb25zdCBHcmFwaGljRWxlbWVudCA9IHJlcXVpcmUoJy4vZ3JhcGhpY1ZpZXcuanMnKTtcbmNvbnN0IEVsZW1lbnQgPSByZXF1aXJlKCcuL2VsZW1lbnRWaWV3LmpzJyk7XG5jb25zdCBGaWVsZCA9IHJlcXVpcmUoJy4vZmllbGRWaWV3LmpzJyk7XG5cblxuY29uc3QgY2FyZFZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgcmV0dXJuIGh0bWxgXG4gICAgPGFydGljbGUgaWQ9XCJjYXJkXCI+XG4gICAgICAke2RyYXdJbWFnZXMoKX1cbiAgICAgICR7ZHJhd0VsZW1lbnRzKCl9XG4gICAgICAke2RyYXdGaWVsZHMoKX1cbiAgICA8L2FydGljbGU+XG4gIGA7XG5cbiAgZnVuY3Rpb24gZHJhd0ltYWdlcygpIHtcbiAgICBpZiAoc3RhdGUuY2FyZCAmJiBzdGF0ZS5jYXJkLmltYWdlcykge1xuICAgICAgICByZXR1cm4gc3RhdGUuY2FyZC5pbWFnZXMubWFwKChlbG0sIGluZCkgPT5cbiAgICAgICAgICAgIEltYWdlKGVsbSwgaW5kLCBzdGF0ZSwgZW1pdCwgdHJ1ZSlcbiAgICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPGRpdiBpZD1cImNhcmQtbm8taW1hZ2VzXCI+PC9kaXY+YFxuICB9XG5cbiAgZnVuY3Rpb24gZHJhd0VsZW1lbnRzKCkge1xuICAgICAgaWYgKHN0YXRlLmNhcmQgJiYgc3RhdGUuY2FyZC5lbGVtZW50cykge1xuICAgICAgICAgIHJldHVybiBzdGF0ZS5jYXJkLmVsZW1lbnRzLm1hcCgoYnV0LCBpbmQpID0+XG4gICAgICAgICAgICAgIEVsZW1lbnQoYnV0LCBpbmQsIHN0YXRlLCBlbWl0LCB0cnVlKVxuICAgICAgICAgICk7XG4gICAgICB9XG4gICAgICByZXR1cm4gaHRtbGA8c3BhbiBpZD1cImNhcmQtbm8tZWxlbWVudHNcIj48L3NwYW4+YFxuICB9XG5cbiAgZnVuY3Rpb24gZHJhd0ZpZWxkcygpIHtcbiAgICAgIGlmIChzdGF0ZS5jYXJkICYmIHN0YXRlLmNhcmQuZmllbGRzKSB7XG4gICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlLmNhcmQuZmllbGRzKS5tYXAoKGZsZE5hbWUpID0+XG4gICAgICAgICAgICAgIEZpZWxkKHN0YXRlLmNhcmQuZmllbGRzW2ZsZE5hbWVdLCBmbGROYW1lLCBzdGF0ZSwgZW1pdCwgdHJ1ZSlcbiAgICAgICAgICApO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGh0bWxgPHNwYW4gaWQ9XCJjYXJkLW5vLWZpZWxkc1wiPjwvc3Bhbj5gXG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2FyZFZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZShcImNob28vaHRtbFwiKTtcblxuY29uc3Qge3NlbGVjdE9wdGlvbn0gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG5jb25zdCBlZGl0QmFyVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICAgIGNvbnN0IGVja3MgPSBodG1sYDxhIGhyZWY9XCIjXCIgb25jbGljaz0keygpID0+IGVtaXQoJ3R1cm5PZmZFZGl0TW9kZScpfT48L2E+YDtcbiAgICBlY2tzLmlubmVySFRNTCA9ICcmdGltZXM7JztcblxuICAgIHJldHVybiBodG1sYDxuYXYgaWQ9XCJlZGl0YmFyXCI+XG4gICAgICA8YXNpZGUgY2xhc3M9XCJyZWFkb3V0XCI+XG4gICAgICAgIERhbm55IDAuMSDwn5Gm8J+PvjxiciAvPlxuICAgICAgICAke3N0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0J1xuICAgICAgICAgICAgPyBodG1sYDxzcGFuPkJnICR7c3RhdGUuY3VycmVudEJhY2tncm91bmR9IG9mICR7c3RhdGUuYmFja2dyb3VuZHMubGVuZ3RofTwvc3Bhbj5gXG4gICAgICAgICAgICA6IGh0bWxgPHNwYW4+Q2FyZCAke3N0YXRlLmN1cnJlbnRDYXJkfSBvZiAke3N0YXRlLmNhcmRzLmxlbmd0aH08L3NwYW4+YFxuICAgICAgICB9XG4gICAgICA8L2FzaWRlPlxuXG4gICAgICA8dWw+XG4gICAgICAgIDxsaT5DcmVhdGUgbmV3OlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3RWxlbWVudCcpO3JldHVybiBmYWxzZX19PkVsZW1lbnQ8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge2VtaXQoJ25ld0ltYWdlJyk7cmV0dXJuIGZhbHNlfX0+SW1hZ2U8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge2VtaXQoJ25ld0ZpZWxkJyk7cmV0dXJuIGZhbHNlfX0+RmllbGQ8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge2VtaXQoJ25ld0JnJyk7cmV0dXJuIGZhbHNlfX0+QmFja2dyb3VuZDwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3Q2FyZCcpO3JldHVybiBmYWxzZX19PkNhcmQ8L2J1dHRvbj48L2xpPlxuICAgICAgICA8bGkgY2xhc3M9XCJiZ21vZGVcIj48YSBocmVmPVwiI1wiIG9uY2xpY2s9JHsoKSA9PiBlbWl0KFwiZWRpdEJnTW9kZVwiKX0+XG4gICAgICAgICAgICAke3N0YXRlLmVkaXRNb2RlID09ICdiZ0VkaXQnID8gJ0NhcmQnIDogJ0JhY2tncm91bmQnfSBtb2RlXG4gICAgICAgIDwvYT48L2xpPlxuICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIiBvbmNsaWNrPSR7KCkgPT4gZW1pdChzdGF0ZS5lZGl0TW9kZSA9PSAnYmdFZGl0JyA/ICdlZGl0QmcnIDonZWRpdENhcmQnKX0+XG4gICAgICAgICAgICBFZGl0ICR7c3RhdGUuZWRpdE1vZGUgPT0gJ2JnRWRpdCcgPyAnYmFja2dyb3VuZCcgOiAnY2FyZCd9XG4gICAgICAgIDwvYT48L2xpPlxuICAgICAgICA8bGk+PGEgaHJlZj1cIiNcIiBvbmNsaWNrPSR7KCkgPT4gZW1pdChcImVkaXRTdGFja1wiKX0+RWRpdCBzdGFjazwvYT48L2xpPlxuICAgICAgICA8bGkgY2xhc3M9XCJjbG9zZVwiPiR7ZWNrc308L2xpPlxuICAgICAgPC91bD5cbiAgICAgICR7c3RhdGUuYWRkaW5nSW1hZ2UgPyBkcm9wSW1hZ2UoKSA6IFwiXCJ9XG4gICAgPC9uYXY+YDtcblxuICAgIGZ1bmN0aW9uIGRyb3BJbWFnZSgpIHtcbiAgICAgICAgZW1pdCgnZW5zdXJlU3RhdGljRmlsZUxpc3RzJyk7XG4gICAgICAgIHJldHVybiBodG1sYDxmb3JtIGlkPVwiYWRkaW1hZ2VcIj5cbiAgICAgICAgICAgIENob29zZSBvciBkcm9wOiA8aW5wdXQgdHlwZT1cImZpbGVcIlxuICAgICAgICAgICAgICBvbmNoYW5nZT0ke2UgPT4gZW1pdChcImFkZEltYWdlXCIsIGUpfVxuICAgICAgICAgICAgICBjbGFzcz1cIiR7c3RhdGUuaG92ZXJpbmdJbWFnZSA/IFwiZHJvcGhvdmVyXCIgOiBcIlwifVwiIC8+XG4gICAgICAgICAgICBPciBzZWxlY3QgZXhpc3Rpbmc6XG4gICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJleGlzdGluZ0ltYWdlXCIgb25jaGFuZ2U9JHsoZSkgPT4gZW1pdChcImFkZEltYWdlXCIsIGUpfT5cbiAgICAgICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIG51bGwpfVxuICAgICAgICAgICAgICAgICR7c3RhdGUuc3RhdGljRmlsZXMgJiYgc3RhdGUuc3RhdGljRmlsZXMubWFwKChmaWxlKSA9PiBzZWxlY3RPcHRpb24oZmlsZSkpfVxuICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICA8YSBocmVmPVwiI1wiIG9uY2xpY2s9JHtjYW5jZWxJbWFnZX0gc3R5bGU9XCJwYWRkaW5nLWxlZnQ6MTJyZW07Y29sb3I6cmVkO1wiPkNhbmNlbDwvYT5cbiAgICAgICAgPC9mb3JtPmA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2FuY2VsSW1hZ2UoKSB7XG4gICAgICAgIHN0YXRlLmFkZGluZ0ltYWdlID0gZmFsc2U7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdChcInJlbmRlclwiKSwgMSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlZGl0QmFyVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKFwiY2hvby9odG1sXCIpO1xuXG5jb25zdCBlbGVtZW50U3R5bGVWaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9lbGVtZW50U3R5bGVWaWV3LmpzXCIpO1xuY29uc3QgaW1hZ2VTdHlsZVZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2ltYWdlU3R5bGVWaWV3LmpzXCIpO1xuY29uc3QgZmllbGRTdHlsZVZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2ZpZWxkU3R5bGVWaWV3LmpzXCIpO1xuY29uc3QgZWRpdEJlaGF2aW9yVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vZWRpdEJlaGF2aW9yVmlldy5qc1wiKTtcbmNvbnN0IGZpZWxkQmVoYXZpb3JWaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9lZGl0QmVoYXZpb3JWaWV3LmpzXCIpO1xuXG5jb25zdCBjYXJkU3R5bGVWaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9jYXJkU3R5bGVWaWV3LmpzXCIpO1xuY29uc3QgYmdTdHlsZVZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2JnU3R5bGVWaWV3LmpzXCIpO1xuXG5jb25zdCBzdGFja0NvbWJvVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vc3RhY2tDb21ib1ZpZXcuanNcIik7XG5cbmNvbnN0IHdoaWNoVmlld01hdHJpeCA9IHtcbiAgICBzdHlsZToge1xuICAgICAgICBlbGVtZW50OiBlbGVtZW50U3R5bGVWaWV3LFxuICAgICAgICBmaWVsZDogZmllbGRTdHlsZVZpZXcsXG4gICAgICAgIGltYWdlOiBpbWFnZVN0eWxlVmlldyxcbiAgICAgICAgY2FyZDogY2FyZFN0eWxlVmlldyxcbiAgICAgICAgYmc6IGJnU3R5bGVWaWV3LFxuICAgICAgICBzdGFjazogc3RhY2tDb21ib1ZpZXdcbiAgICB9LFxuICAgIGZ1bmN0aW9uOiB7XG4gICAgICAgIGVsZW1lbnQ6IGVkaXRCZWhhdmlvclZpZXcsXG4gICAgICAgIGZpZWxkOiBmaWVsZEJlaGF2aW9yVmlldyxcbiAgICAgICAgaW1hZ2U6IGVkaXRCZWhhdmlvclZpZXcsXG4gICAgICAgIGNhcmQ6IGVkaXRCZWhhdmlvclZpZXcsXG4gICAgICAgIGJnOiBlZGl0QmVoYXZpb3JWaWV3LFxuICAgICAgICBzdGFjazogc3RhY2tDb21ib1ZpZXdcbiAgICB9XG59O1xuXG5jb25zdCBlZGl0TW9kYWxWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gICAgbGV0IHdoaWNoO1xuICAgIGlmIChzdGF0ZS5lZGl0aW5nRWxlbWVudCkge1xuICAgICAgICB3aGljaCA9IFwiZWxlbWVudFwiO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ0ZpZWxkKSB7XG4gICAgICAgIHdoaWNoID0gXCJmaWVsZFwiO1xuICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ0ltYWdlKSB7XG4gICAgICAgIHdoaWNoID0gXCJpbWFnZVwiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nUGF0aFswXSA9PSAnY2FyZHMnKSB7XG4gICAgICAgICAgICB3aGljaCA9IFwiY2FyZFwiO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmVkaXRpbmdQYXRoWzBdID09ICdiYWNrZ3JvdW5kcycpIHtcbiAgICAgICAgICAgIHdoaWNoID0gXCJiZ1wiO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmVkaXRpbmdQYXRoWzBdID09ICdzdGFjaycpIHtcbiAgICAgICAgICAgIHdoaWNoID0gXCJzdGFja1wiO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgY29uc3QgZWNrcyA9IGh0bWxgPGEgY2xhc3M9XCJjbG9zZVwiIGhyZWY9XCIjXCIgb25jbGljaz0keygpID0+IGVtaXQoJ2Nsb3NlRWRpdCcpfT48L2E+YDtcbiAgICBlY2tzLmlubmVySFRNTCA9ICcmdGltZXM7JztcblxuICAgIHJldHVybiBodG1sYDxzZWN0aW9uIGlkPVwiZWRpdG1vZGFsXCI+XG4gICAgICAke2Vja3N9XG5cbiAgICAgICR7d2hpY2ggPT0gJ3N0YWNrJ1xuICAgICAgICA/IG51bGxcbiAgICAgICAgOiBodG1sYDx1bCBpZD1cImVkaXRNb2RhbFRhYnNcIj5cbiAgICAgICAgICAgIDxsaSBjbGFzcz1cIiR7c3RhdGUuZWRpdGluZ0Z1bmN0aW9uID8gXCJcIiA6IFwiaGlsaXRlZFwifVwiXG4gICAgICAgICAgICAgICAgb25jbGljaz0keygpID0+IHRvZ2dsZUZ1bmN0aW9uRWRpdCgnc3R5bGUnKX0+XG4gICAgICAgICAgICAgICAgU3R5bGVcbiAgICAgICAgICAgIDwvbGk+PGxpIGNsYXNzPVwiJHtzdGF0ZS5lZGl0aW5nRnVuY3Rpb24gPyBcImhpbGl0ZWRcIiA6IFwiXCJ9XCJcbiAgICAgICAgICAgICAgICBvbmNsaWNrPSR7KCkgPT4gdG9nZ2xlRnVuY3Rpb25FZGl0KCl9PlxuICAgICAgICAgICAgICAgIEJlaGF2aW9yXG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICAgIDwvdWw+YH1cblxuICAgICAgJHtzdGF0ZS5lZGl0aW5nRnVuY3Rpb25cbiAgICAgICAgICA/IHdoaWNoVmlld01hdHJpeC5mdW5jdGlvblt3aGljaF0uY2FsbChudWxsLCBzdGF0ZSwgZW1pdClcbiAgICAgICAgICA6IHdoaWNoVmlld01hdHJpeC5zdHlsZVt3aGljaF0uY2FsbChudWxsLCBzdGF0ZSwgZW1pdCl9XG4gICAgPC9zZWN0aW9uPmA7XG5cbiAgICBmdW5jdGlvbiB0b2dnbGVGdW5jdGlvbkVkaXQod2hlcmUgPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IGlzaXRvbiA9IHN0YXRlLmVkaXRpbmdGdW5jdGlvbjtcbiAgICAgICAgaWYgKChpc2l0b24gJiYgd2hlcmUgPT0gJ3N0eWxlJykgfHwgKCFpc2l0b24gJiYgd2hlcmUgPT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgIGVtaXQoJ3RvZ2dsZUZ1bmN0aW9uRWRpdCcpO1xuICAgICAgICB9IC8vIGkgZG9uJ3Qga25vdywgaXMgdGhhdCBkdW1iP1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZWRpdE1vZGFsVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3BhcnNlQW5kUnVuQmVoYXZpb3JzfSA9IHJlcXVpcmUoJy4vYmVoYXZpb3IuanMnKTtcblxuXG5jb25zdCBlbnN1cmVTdHlsZVBpeGVscyA9ICh2YWwpID0+IHtcbiAgICByZXR1cm4gdHlwZW9mIHZhbCA9PSAnbnVtYmVyJyA/IHZhbCArICdweCcgOiB2YWw7XG59XG5cbmNvbnN0IGVsZW1lbnRWaWV3ID0gKGVsZW1lbnQsIGluZGV4LCBzdGF0ZSwgZW1pdCwgaXNDYXJkKSA9PiB7XG4gICAgbGV0IGVsZW1lbnRJc0Jhc2ljID0gIWVsZW1lbnQuc3R5bGUgJiYgZWxlbWVudC50ZXh0O1xuICAgIGxldCBhdHRycyA9IHtcbiAgICAgICAgaGVpZ2h0OiBlbnN1cmVTdHlsZVBpeGVscyhlbGVtZW50LmhlaWdodCksXG4gICAgICAgIHdpZHRoOiBlbnN1cmVTdHlsZVBpeGVscyhlbGVtZW50LndpZHRoKSxcbiAgICAgICAgdG9wOiBlbnN1cmVTdHlsZVBpeGVscyhlbGVtZW50LnRvcCksXG4gICAgICAgIGxlZnQ6IGVuc3VyZVN0eWxlUGl4ZWxzKGVsZW1lbnQubGVmdCksXG4gICAgICAgICdiYWNrZ3JvdW5kLWNvbG9yJzogZWxlbWVudC5jb2xvcixcbiAgICAgICAgJ2ZvbnQtZmFtaWx5JzogZWxlbWVudC5mb250LFxuICAgICAgICAnZm9udC1zaXplJzogZWxlbWVudC5zaXplLFxuICAgICAgICAnZm9udC1zdHlsZSc6IGVsZW1lbnQuc3R5bGUsXG4gICAgICAgIGNvbG9yOiBlbGVtZW50LnRleHRDb2xvclxuICAgIH07IC8vIHRoaXMgZGF0YSBtdW5nZSBzdGVwIG1heSBiZWxvbmcgaW4gYSBzdG9yZT9cbiAgICBsZXQgZWxlbWVudFN0eWxlcyA9IE9iamVjdC5rZXlzKGF0dHJzKS5tYXAoKGtleSkgPT4gKGtleSArICc6JyArIGF0dHJzW2tleV0gKyAnOycpKS5qb2luKCcnKTtcbiAgICBpZiAoZWxlbWVudC5zdHlsZSkge1xuICAgICAgICBlbGVtZW50U3R5bGVzICs9IGVsZW1lbnQuc3R5bGU7XG4gICAgfVxuXG4gICAgbGV0IGNsaWNrSGFuZGxlciA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5hbHRLZXkgfHxcbiAgICAgICAgICAgIChzdGF0ZS5lZGl0TW9kZSA9PT0gJ2VkaXRNb2RlJyAmJiBpc0NhcmQpIHx8XG4gICAgICAgICAgICAoc3RhdGUuZWRpdE1vZGUgPT09ICdiZ0VkaXQnICYmICFpc0NhcmQpXG4gICAgICAgICkge1xuICAgICAgICAgICAgZWRpdEVsZW1lbnQoKTtcbiAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50LmJlaGF2aW9yICYmIGVsZW1lbnQuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJzZUFuZFJ1bkJlaGF2aW9ycyhzdGF0ZSwgZW1pdCwgZWxlbWVudC5iZWhhdmlvcik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgaWYgKGlzRHJhZ2dhYmxlKCkpIHtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGRpdiBjbGFzcz1cImVsZW1lbnQgbW92YWJsZSAke2VsZW1lbnRDbGFzc2VzKCl9XCJcbiAgICAgICAgICAgIG9uY2xpY2s9JHsoZSkgPT4gZWRpdE1vZGVDbGljayhlKX1cbiAgICAgICAgICAgIG9ubW91c2Vkb3duPSR7KGUpID0+IG1vdXNlRG93bihlKX1cbiAgICAgICAgICAgIG9ubW91c2VsZWF2ZT0keyhlKSA9PiBtb3VzZUxlYXZlKGUpfVxuICAgICAgICAgICAgb25tb3VzZXVwPSR7KGUpID0+IG1vdXNlVXAoZSl9XG4gICAgICAgICAgICBzdHlsZT1cIiR7ZWxlbWVudFN0eWxlc31cIj4ke2VsZW1lbnQudGV4dH08L2Rpdj5gO1xuICAgIH1cbiAgICByZXR1cm4gaHRtbGA8ZGl2IGNsYXNzPVwiZWxlbWVudCAke2VsZW1lbnRDbGFzc2VzKCl9XCJcbiAgICAgIG9uY2xpY2s9JHtjbGlja0hhbmRsZXJ9XG4gICAgICBzdHlsZT1cIiR7ZWxlbWVudFN0eWxlc31cIj4ke2VsZW1lbnQudGV4dH08L2Rpdj5gO1xuICAgIC8vIHBvc3NpYmxlIHdlIG5lZWQgdHdvIHNlcC4gY29tcG9uZW50cz9cblxuICAgIGZ1bmN0aW9uIGVsZW1lbnRDbGFzc2VzKCkge1xuICAgICAgICBsZXQga2xhc3MgPSBlbGVtZW50SXNCYXNpYyA/IFsnYmFzaWMnXSA6IFtdO1xuICAgICAgICBpZiAoZWxlbWVudC50cmFuc3BhcmVudCkge1xuICAgICAgICAgICAga2xhc3MucHVzaCgndHJhbnNwYXJlbnQnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC5iZWhhdmlvciAmJiBlbGVtZW50LmJlaGF2aW9yLmxlbmd0aCAmJiAhc3RhdGUuZWRpdE1vZGUpIHtcbiAgICAgICAgICAgIGtsYXNzLnB1c2goJ2JlaGF2ZXMtb24tY2xpY2snKTtcbiAgICAgICAgfVxuICAgICAgICBrbGFzcy5wdXNoKGVsZW1lbnQuY2xhc3MpO1xuICAgICAgICByZXR1cm4ga2xhc3Muam9pbignICcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVkaXRFbGVtZW50KCkge1xuICAgICAgICBlbWl0KCdlZGl0RWxlbWVudCcsIFtlbGVtZW50LCBpbmRleCwgaXNDYXJkXSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKCkge1xuICAgICAgICBpZiAoaXNDYXJkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0TW9kZUNsaWNrKGV2dCkge1xuICAgICAgICBjb25zdCBbc3RhcnRYLCBzdGFydFldID0gc3RhdGUubW91c2VEb3duO1xuICAgICAgICBpZiAoTWF0aC5hYnMoZXZ0LnNjcmVlblggLSBzdGFydFgpIDwgMTAgJiYgTWF0aC5hYnMoZXZ0LnNjcmVlblkgLSBzdGFydFkpIDwgMTApIHtcbiAgICAgICAgICAgIGVkaXRFbGVtZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuZHJhZ0luZm8gPSBudWxsO1xuICAgICAgICBzdGF0ZS5yZXNpemVJbmZvID0gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZURvd24oZXZ0KSB7XG4gICAgICAgIGVtaXQoJ3N0YXJ0RHJhZycsIFtldnQuc2NyZWVuWCwgZXZ0LnNjcmVlblksIGV2dC5vZmZzZXRYLCBldnQub2Zmc2V0WSwgZXZ0LnRhcmdldF0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdXNlTGVhdmUoZXZ0KSB7XG4gICAgICAgIGlmIChzdGF0ZS5kcmFnSW5mbyB8fCBzdGF0ZS5yZXNpemVJbmZvKSB7XG4gICAgICAgICAgICBjb25zdCB5ZXJJbmZvID0gc3RhdGUuZHJhZ0luZm8gPyBzdGF0ZS5kcmFnSW5mbyA6IHN0YXRlLnJlc2l6ZUluZm87XG4gICAgICAgICAgICBpZiAoeWVySW5mby50YXJnZXQgPT0gZXZ0LnRhcmdldCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgICAgICAgICBzdGF0ZS5yZXNpemVJbmZvID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdXNlVXAoZXZ0KSB7XG4gICAgICAgIGVtaXQoJ2ZpbmlzaERyYWcnLCBbXG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA/ICdtb3ZlRWxlbWVudCcgOiAncmVzaXplRWxlbWVudCcsXG4gICAgICAgICAgICBldnQuc2NyZWVuWCwgZXZ0LnNjcmVlblksXG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA/IGV2dC50YXJnZXQuc3R5bGUubGVmdCA6IGV2dC50YXJnZXQuc3R5bGUud2lkdGgsXG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA/IGV2dC50YXJnZXQuc3R5bGUudG9wIDogZXZ0LnRhcmdldC5zdHlsZS5oZWlnaHQsXG4gICAgICAgICAgICBpbmRleFxuICAgICAgICBdKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVsZW1lbnRWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7dG9QeH0gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG5jb25zdCBmaWVsZFZpZXcgPSAoZmllbGQsIG5hbWUsIHN0YXRlLCBlbWl0LCBpc0NhcmQpID0+IHtcbiAgICBsZXQgZmxkO1xuICAgIGlmIChmaWVsZC50eXBlID09ICdzZWxlY3QnKSB7XG4gICAgICAgIGZsZCA9IGh0bWxgPHNlbGVjdCBuYW1lPVwiJHtmaWVsZC5uYW1lfVwiXG4gICAgICAgICAgICBvbmNoYW5nZT1cIiR7KGV2dCkgPT4gZW1pdCgnZmllbGRjaGFuZ2UnLCBldnQsIGZpZWxkKX1cIlxuICAgICAgICAgICAgJHtmaWVsZC5vcHRpb25zLm1hcCgob3B0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGVkID0gb3B0ID09PSBmaWVsZC52YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJzxvcHRpb24gdmFsdWU9XCInICsgb3B0ICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgIChzZWxlY3RlZCA/ICcgc2VsZWN0ZWQ9XCJzZWxlY3RlZFwiJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICc+JyArIG9wdCArICc8L29wdGlvbj4nXG4gICAgICAgICAgICB9KX1cbiAgICAgICAgPC9zZWxlY3Q+YDtcbiAgICB9IGVsc2UgaWYgKGZpZWxkLnR5cGUgPT0gJ3JhZGlvJyB8fCBmaWVsZC50eXBlID09ICdjaGVja2JveCcpIHtcbiAgICAgICAgLy8gbm90aGluZyByaWdodCBub3cgbXIuIGhlcm1hblxuICAgIH0gZWxzZSBpZiAoZmllbGQudHlwZSA9PSAndGV4dGFyZWEnIHx8IHRvUHgoZmllbGQuaGVpZ2h0KSA+IE1hdGgubWF4KGZpZWxkLnNpemUsIDE1KSkge1xuICAgICAgICBmbGQgPSBodG1sYDx0ZXh0YXJlYSBuYW1lPVwiJHtmaWVsZC5uYW1lfVwiXG4gICAgICAgICAgICB3cmFwPVwidmlydHVhbFwiXG4gICAgICAgICAgICBvbmtleWRvd249XCJcIlxuICAgICAgICAgICAgb25rZXl1cD0keyhldnQpID0+IHtlbWl0KCdmaWVsZEtleVVwJywgW2V2dCwgZmllbGRdKX19XG4gICAgICAgICAgICBvbmtleXByZXNzPVwiXCJcbiAgICAgICAgICAgIG9uY2hhbmdlPVwiJHsoZXZ0KSA9PiBlbWl0KCdmaWVsZGNoYW5nZScsIFtldnQsIGZpZWxkXSl9XCJcbiAgICAgICAgICAgIHN0eWxlPVwiJHtmaWVsZFN0eWxlcygpfVwiPiR7ZmllbGQudmFsdWV9PC90ZXh0YXJlYT5gO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGZsZCA9IGh0bWxgPGlucHV0IHR5cGU9XCIke2ZpZWxkLnR5cGUgPyBmaWVsZC50eXBlIDogJ3RleHQnfVwiXG4gICAgICAgICAgICBuYW1lPVwiJHtmaWVsZC5uYW1lfVwiXG4gICAgICAgICAgICBwbGFjZWhvbGRlcj1cIiR7ZmllbGQucGxhY2Vob2xkZXJ9XCJcbiAgICAgICAgICAgIHZhbHVlPVwiJHtmaWVsZC52YWx1ZX1cIlxuICAgICAgICAgICAgb25rZXlkb3duPSR7KGV2dCkgPT4gZW1pdCgnZmllbGRLZXlEb3duJywgW2V2dCwgZmllbGRdKX1cbiAgICAgICAgICAgIG9ua2V5dXA9JHsoZXZ0KSA9PiBlbWl0KCdmaWVsZEtleVVwJywgW2V2dCwgZmllbGRdKX1cbiAgICAgICAgICAgIG9ua2V5cHJlc3M9JHsoZXZ0KSA9PiBlbWl0KCdmaWVsZEtleVByZXNzJywgW2V2dCwgZmllbGRdKX1cbiAgICAgICAgICAgIG9uY2hhbmdlPVwiJHsoZXZ0KSA9PiBlbWl0KCdmaWVsZGNoYW5nZScsIFtldnQsIGZpZWxkXSl9XCJcbiAgICAgICAgICAgIHN0eWxlPVwiJHtmaWVsZFN0eWxlcygpfVwiIC8+XG4gICAgICAgIGA7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5lZGl0TW9kZSkge1xuICAgICAgICByZXR1cm4gaHRtbGA8ZGl2IGNsYXNzPVwiZmllbGRzaGltICR7aXNEcmFnZ2FibGUoKSA/ICdtb3ZhYmxlJyA6ICcnfVwiXG4gICAgICAgICAgICAgICAgc3R5bGU9XCIke2ZpZWxkU3R5bGVzKCl9XCJcbiAgICAgICAgICAgICAgICBvbmNsaWNrPSR7KGUpID0+IGVkaXRNb2RlQ2xpY2soZSl9XG4gICAgICAgICAgICAgICAgb25tb3VzZWRvd249JHsoZSkgPT4gbW91c2VEb3duKGUpfVxuICAgICAgICAgICAgICAgIG9ubW91c2VsZWF2ZT0keyhlKSA9PiBtb3VzZUxlYXZlKGUpfVxuICAgICAgICAgICAgICAgIG9ubW91c2V1cD0keyhlKSA9PiBtb3VzZVVwKGUpfT5cbiAgICAgICAgICAgIDxwPiR7ZmllbGQubmFtZX08L3A+XG4gICAgICAgICAgICA8YXNpZGU+VmFsdWU6IDxzcGFuPiR7ZmllbGQudmFsdWV9PC9zcGFuPjwvYXNpZGU+XG4gICAgICAgIDwvZGl2PmA7XG4gICAgfVxuICAgIHJldHVybiBmbGQ7XG5cbiAgICBmdW5jdGlvbiBjbGlja0hhbmRsZXIoZXZ0KSB7XG4gICAgICAgIGlmIChldnQuYWx0S2V5IHx8IChzdGF0ZS5lZGl0TW9kZSAmJiBpc0RyYWdnYWJsZSgpKSkge1xuICAgICAgICAgICAgZW1pdCgnZWRpdEZpZWxkJywgW2ZpZWxkLCBuYW1lLCBpc0NhcmRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKCkge1xuICAgICAgICBpZiAoaXNDYXJkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWVsZFN0eWxlcygpIHtcbiAgICAgICAgbGV0IHN0ZWV6ID0ge1xuICAgICAgICAgICAgdG9wOiBmaWVsZC50b3AsXG4gICAgICAgICAgICBsZWZ0OiBmaWVsZC5sZWZ0LFxuICAgICAgICAgICAgaGVpZ2h0OiBmaWVsZC5oZWlnaHQsXG4gICAgICAgICAgICB3aWR0aDogZmllbGQud2lkdGgsXG4gICAgICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IGZpZWxkLmNvbG9yLFxuICAgICAgICAgICAgJ2ZvbnQtZmFtaWx5JzogZmllbGQuZm9udCxcbiAgICAgICAgICAgICdmb250LXNpemUnOiBmaWVsZC5zaXplLFxuICAgICAgICAgICAgJ2ZvbnQtc3R5bGUnOiBmaWVsZC5zdHlsZSxcbiAgICAgICAgICAgIGNvbG9yOiBmaWVsZC50ZXh0Q29sb3JcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBzdGVlei5oZWlnaHQgPSB0b1B4KGZpZWxkLmhlaWdodCkgPj0gNDAgPyBzdGVlei5oZWlnaHQgOiAnNDBweCc7XG4gICAgICAgICAgICBzdGVlei53aWR0aCA9IHRvUHgoZmllbGQud2lkdGgpID49IDQwID8gc3RlZXoud2lkdGggOiAnNDBweCc7XG4gICAgICAgICAgICBpZiAoIXN0ZWV6WydiYWNrZ3JvdW5kLWNvbG9yJ10pIHtcbiAgICAgICAgICAgICAgICBzdGVlelsnYmFja2dyb3VuZC1jb2xvciddID0gJyNkZGQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGVleikubWFwKChrZXkpID0+IChrZXkgKyAnOicgKyBzdGVleltrZXldICsgJzsnKSkuam9pbignJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZWRpdE1vZGVDbGljayhldnQpIHtcbiAgICAgICAgY29uc3QgW3N0YXJ0WCwgc3RhcnRZXSA9IHN0YXRlLm1vdXNlRG93bjtcbiAgICAgICAgaWYgKE1hdGguYWJzKGV2dC5zY3JlZW5YIC0gc3RhcnRYKSA8IDEwICYmIE1hdGguYWJzKGV2dC5zY3JlZW5ZIC0gc3RhcnRZKSA8IDEwKSB7XG4gICAgICAgICAgICBlbWl0KCdlZGl0RmllbGQnLCBbZmllbGQsIG5hbWUsIGlzQ2FyZF0pO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VEb3duKGV2dCkge1xuICAgICAgICBlbWl0KCdzdGFydERyYWcnLCBbZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLCBldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFksIGV2dC50YXJnZXRdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZUxlYXZlKGV2dCkge1xuICAgICAgICBpZiAoc3RhdGUuZHJhZ0luZm8gfHwgc3RhdGUucmVzaXplSW5mbykge1xuICAgICAgICAgICAgY29uc3QgeWVySW5mbyA9IHN0YXRlLmRyYWdJbmZvID8gc3RhdGUuZHJhZ0luZm8gOiBzdGF0ZS5yZXNpemVJbmZvO1xuICAgICAgICAgICAgaWYgKHllckluZm8udGFyZ2V0ID09IGV2dC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZVVwKGV2dCkge1xuICAgICAgICBlbWl0KCdmaW5pc2hEcmFnJywgW1xuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyAnbW92ZUZpZWxkJyA6ICdyZXNpemVGaWVsZCcsXG4gICAgICAgICAgICBldnQuc2NyZWVuWCwgZXZ0LnNjcmVlblksXG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA/IGV2dC50YXJnZXQuc3R5bGUubGVmdCA6IGV2dC50YXJnZXQuc3R5bGUud2lkdGgsXG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA/IGV2dC50YXJnZXQuc3R5bGUudG9wIDogZXZ0LnRhcmdldC5zdHlsZS5oZWlnaHQsXG4gICAgICAgICAgICBuYW1lXG4gICAgICAgIF0pO1xuICAgIH1cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBmaWVsZFZpZXc7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBnb1RvTmV4dENhcmQ6IHJlcXVpcmUoJy4vZ29Ub05leHRDYXJkQ29tcG9uZW50JyksXG4gICAgZ29Ub1ByZXZpb3VzQ2FyZDogcmVxdWlyZSgnLi9nb1RvUHJldmlvdXNDYXJkQ29tcG9uZW50JyksXG4gICAgJ2lmJzogbnVsbCwgLy8gaGVyZSB0byBiZSBjb3VudGVkLCBidXQgbm90IGFjdHVhbGx5IGhhbmRsZWQgYnkgYSBzZXAuIGNvbXBvbmVudFxuICAgIGp1bXBUbzogcmVxdWlyZSgnLi9qdW1wVG9Db21wb25lbnQnKSxcbiAgICByZW1vdmVUcnV0aDogcmVxdWlyZSgnLi9yZW1vdmVUcnV0aENvbXBvbmVudCcpLFxuICAgIHNldFRydXRoOiByZXF1aXJlKCcuL3NldFRydXRoQ29tcG9uZW50JyksXG4gICAgbGlua1RvOiByZXF1aXJlKCcuL2xpbmtUb0NvbXBvbmVudCcpLFxuICAgIHBsYXlTb3VuZDogcmVxdWlyZSgnLi9wbGF5U291bmRDb21wb25lbnQnKVxufTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5jb25zdCBjYXJkU3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBiZyA9IHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXTtcbiAgbGV0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ2VudlByb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgJHtmaWVsZEZvcignbmFtZScsJ05hbWUnKX1cbiAgICAgIDxwPjxsYWJlbCBmb3I9XCJjb2xvclwiPkNvbG9yPC9sYWJlbD48YnIgLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgIG5hbWU9XCJjb2xvclwiXG4gICAgICAgICAgdmFsdWU9XCIke2JnLmNvbG9yIHx8ICcjRkZGRkZGJ31cIiAvPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7XG4gICAgICAgICAgICBlbWl0KCdlbnZQcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiAnY29sb3InLCB2YWx1ZTogJyd9fSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH19PlxuICAgICAgICAgIENsZWFyXG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9wPlxuICAgIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIiR7YXR0TmFtZX1cIj4ke2Rpc3BsYXlOYW1lfTwvbGFiZWw+PGJyIC8+XG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgIG5hbWU9XCIke2F0dE5hbWV9XCJcbiAgICAgIHZhbHVlPVwiJHtiZ1thdHROYW1lXX1cIiAvPlxuICAgIDwvcD5gO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2FyZFN0eWxlVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5jb25zdCBjYXJkU3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBjYXJkID0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdO1xuICBsZXQgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgnZW52UHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgICAke2ZpZWxkRm9yKCduYW1lJywnTmFtZScpfVxuICAgICAgPHA+PGxhYmVsIGZvcj1cImNvbG9yXCI+Q29sb3I8L2xhYmVsPjxiciAvPlxuICAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgICAgbmFtZT1cImNvbG9yXCJcbiAgICAgICAgICAgdmFsdWU9XCIke2NhcmQuY29sb3IgfHwgJyNGRkZGRkYnfVwiIC8+XG4gICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge1xuICAgICAgICAgICBlbWl0KCdlbnZQcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiAnY29sb3InLCB2YWx1ZTogJyd9fSk7XG4gICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICB9fT5cbiAgICAgICAgIENsZWFyXG4gICAgICAgPC9idXR0b24+XG4gICAgICA8L3A+XG5cbiAgICAgIDxkaXYgc3R5bGU9XCJ0ZXh0LWFsaWduOmNlbnRlclwiPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHtkZWxldGVIYW5kbGVyfT5EZWxldGUgQ2FyZDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9mb3JtPmA7XG5cbiAgZnVuY3Rpb24gZmllbGRGb3IoYXR0TmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICByZXR1cm4gaHRtbGA8cD48bGFiZWwgZm9yPVwiJHthdHROYW1lfVwiPiR7ZGlzcGxheU5hbWV9PC9sYWJlbD48YnIgLz5cbiAgICA8aW5wdXQgdHlwZT1cInRleHRcIlxuICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgbmFtZT1cIiR7YXR0TmFtZX1cIlxuICAgICAgdmFsdWU9XCIke2NhcmRbYXR0TmFtZV19XCIgLz5cbiAgICA8L3A+YDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUNhcmQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNhcmRTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9ycywgYmVoYXZpb3JMaXN0LCBiZWhhdmlvcn0gPSByZXF1aXJlKCcuLi9iZWhhdmlvcicpO1xuY29uc3Qge2dldFBhdGh9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmNvbnN0IGVkaXRCZWhhdmlvclZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgY29uc3QgdGhpbmcgPSBnZXRQYXRoKHN0YXRlLCBzdGF0ZS5lZGl0aW5nUGF0aCk7XG4gIGNvbnN0IGtpY2tvZmZEZXNjcmlwdG9yID0gc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoID4gMiA/ICdjbGljaycgOiAnYXJyaXZhbCc7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgPGRpdj5PbiAke2tpY2tvZmZEZXNjcmlwdG9yfSxcblxuICAgICR7dGhpbmcuYmVoYXZpb3IgJiYgdGhpbmcuYmVoYXZpb3IubGVuZ3RoXG4gICAgICAgID8gYmVoYXZpb3JMaXN0KHN0YXRlLCBlbWl0LCB0aGluZy5iZWhhdmlvciwgc3RhdGUuZWRpdGluZ1BhdGguY29uY2F0KFsnYmVoYXZpb3InXSkpXG4gICAgICAgIDogaHRtbGA8dWwgY2xhc3M9XCJiZWhhdmlvcnNcIj5cbiAgICAgICAgICAgIDxsaT4ke2JlaGF2aW9yKHN0YXRlLCBlbWl0LCBzdGF0ZS5lZGl0aW5nUGF0aC5jb25jYXQoWydiZWhhdmlvcicsIDBdKSl9PC9saT5cbiAgICAgICAgPC91bD5gXG4gICAgfVxuXG4gICAgPC9kaXY+XG4gICAgPGRpdiBzdHlsZT1cImNvbG9yOiByZWQ7IGZvbnQtZmFtaWx5OiBIZWx2ZXRpY2Esc2Fuc1wiPlxuICAgICAgQ3VycmVudCB0cnV0aHM6XG4gICAgICA8dWw+XG4gICAgICAgICR7T2JqZWN0LmtleXMoc3RhdGUudHJ1dGhzKS5tYXAoKHRoKSA9PiBodG1sYDxsaT4ke3RofTwvbGk+YCl9XG4gICAgICA8L3VsPlxuICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge3BhcnNlQW5kUnVuQmVoYXZpb3JzKHN0YXRlLCBlbWl0LCB0aGluZy5iZWhhdmlvcik7cmV0dXJuIGZhbHNlfX0+VGVzdCBiZWhhdmlvcjwvYnV0dG9uPlxuICAgIDwvZGl2PlxuICA8L2Zvcm0+YDtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlZGl0QmVoYXZpb3JWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBlbGVtZW50U3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBlbG0gPSBzdGF0ZS5lZGl0aW5nRWxlbWVudDtcbiAgbGV0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ3Byb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcigndG9wJywnVG9wJyl9PC90ZD5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdsZWZ0JywnTGVmdCcpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdoZWlnaHQnLCdIZWlnaHQnKX08L3RkPlxuICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ3dpZHRoJywnV2lkdGgnKX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgIDwvdGFibGU+XG4gICAgICA8cD48bGFiZWwgZm9yPVwiY29sb3JcIj5Db2xvcjwvbGFiZWw+PGJyIC8+XG4gICAgICA8aW5wdXQgdHlwZT1cImNvbG9yXCJcbiAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICBuYW1lPVwiY29sb3JcIlxuICAgICAgICB2YWx1ZT1cIiR7ZWxtLmNvbG9yIHx8ICcjMzMzMzMzJ31cIiAvPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHtjbGVhckhhbmRsZXJGb3IoJ2NvbG9yJyl9PlxuICAgICAgICAgIENsZWFyXG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9wPlxuICAgICAgPHA+PGxhYmVsIGZvcj1cInRleHRcIj5UZXh0PC9sYWJlbD48YnIgLz5cbiAgICAgIDx0ZXh0YXJlYSBzdHlsZT1cIndpZHRoOjk4JTtoZWlnaHQ6NHJlbTtcIiB3cmFwPVwidmlydHVhbFwiXG4gICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgbmFtZT1cInRleHRcIj4ke2VsbS50ZXh0IHx8ICcnfTwvdGV4dGFyZWE+XG4gICAgICA8L3A+XG4gICAgICAke2ZpZWxkRm9yKCdmb250JywnRm9udCcpfVxuICAgICAgJHtmaWVsZEZvcignc2l6ZScsJ1NpemUnKX1cbiAgICAgIDxwPjxsYWJlbCBmb3I9XCJzdHlsZVwiPlN0eWxlPC9sYWJlbD48YnIgLz5cbiAgICAgIDxzZWxlY3QgbmFtZT1cInN0eWxlXCIgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfT5cbiAgICAgICAgJHtzZWxlY3RPcHRpb24oJ1JlZ3VsYXInLCBlbG0uc3R5bGUpfVxuICAgICAgICAke3NlbGVjdE9wdGlvbignSXRhbGljJywgZWxtLnN0eWxlKX1cbiAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9wPlxuICAgICAgPHA+PGxhYmVsIGZvcj1cInRleHRDb2xvclwiPlRleHQgQ29sb3I8L2xhYmVsPjxiciAvPlxuICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgbmFtZT1cInRleHRDb2xvclwiXG4gICAgICAgIHZhbHVlPVwiJHtlbG0udGV4dENvbG9yIHx8ICcjMDAwMDAwJ31cIiAvPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHtjbGVhckhhbmRsZXJGb3IoJ3RleHRDb2xvcicpfT5cbiAgICAgICAgICAgQ2xlYXJcbiAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9wPlxuICAgICAgJHtmaWVsZEZvcignY2xhc3MnLCdDbGFzcycpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEVsZW1lbnQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIiR7YXR0TmFtZX1cIj4ke2Rpc3BsYXlOYW1lfTwvbGFiZWw+PGJyIC8+XG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgIG5hbWU9XCIke2F0dE5hbWV9XCJcbiAgICAgIHZhbHVlPVwiJHtlbG1bYXR0TmFtZV19XCIgLz5cbiAgICA8L3A+YDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFySGFuZGxlckZvcihwcm9wTmFtZSwgYnV0dG9ueSA9IHRydWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0KCdwcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiBwcm9wTmFtZSwgdmFsdWU6ICcnfX0pO1xuICAgICAgaWYgKGJ1dHRvbnkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUVsZW1lbnQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50U3R5bGVWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBmaWVsZFN0eWxlVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICBsZXQgZmxkID0gc3RhdGUuZWRpdGluZ0ZpZWxkO1xuICBsZXQgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgncHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgICAke2ZpZWxkRm9yKCduYW1lJywnTmFtZScpfVxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcigndG9wJywnVG9wJyl9PC90ZD5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdsZWZ0JywnTGVmdCcpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdoZWlnaHQnLCdIZWlnaHQnKX08L3RkPlxuICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ3dpZHRoJywnV2lkdGgnKX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgIDwvdGFibGU+XG4gICAgICA8cD48bGFiZWwgZm9yPVwidHlwZVwiPlR5cGU8L2xhYmVsPjxiciAvPlxuICAgICAgICA8c2VsZWN0IG5hbWU9XCJ0eXBlXCIgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfT5cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdUZXh0JywgZmxkLnR5cGUpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ01lbnUnLCBmbGQudHlwZSl9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9wPlxuICAgICAgJHtmbGQudHlwZT09PSdUZXh0JyA/IGZpZWxkRm9yKCdoZWlnaHQnLCdIZWlnaHQnKSA6IG51bGx9XG4gICAgICAke2ZsZC50eXBlPT09J1RleHQnID8gZmllbGRGb3IoJ3dpZHRoJywnV2lkdGgnKSA6IG51bGx9XG4gICAgICAke2ZsZC50eXBlPT09J01lbnUnID8gb3B0aW9uc0ZpZWxkKCkgOiBudWxsfVxuICAgICAgJHtmaWVsZEZvcignY2xhc3MnLCdDbGFzcycpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEZpZWxkPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Zvcm0+YDtcblxuICBmdW5jdGlvbiBmaWVsZEZvcihhdHROYW1lLCBkaXNwbGF5TmFtZSkge1xuICAgIHJldHVybiBodG1sYDxwPjxsYWJlbCBmb3I9XCIke2F0dE5hbWV9XCI+JHtkaXNwbGF5TmFtZX08L2xhYmVsPjxiciAvPlxuICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiXG4gICAgICBvbmNoYW5nZT0ke2NoYW5nZUhhbmRsZXJ9XG4gICAgICBuYW1lPVwiJHthdHROYW1lfVwiXG4gICAgICB2YWx1ZT1cIiR7ZmxkW2F0dE5hbWVdIHx8ICcnfVwiIC8+XG4gICAgPC9wPmA7XG5cbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUZpZWxkJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBmdW5jdGlvbiBvcHRpb25zRmllbGQoKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIm9wdGlvbnNcIj5PcHRpb25zPC9sYWJlbD48YnIgLz5cbiAgICAgIDx0ZXh0YXJlYSBuYW1lPVwib3B0aW9uc1wiIG9uY2hhbmdlPSR7b3B0aW9uSGFuZGxlcn0+JHtmbGQub3B0aW9ucy5qb2luKFwiXFxuXCIpfTwvdGV4dGFyZWE+XG4gICAgPC9wPmA7XG5cbiAgICBmdW5jdGlvbiBvcHRpb25IYW5kbGVyKGUpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBlLnRhcmdldC52YWx1ZS5zcGxpdChcIlxcblwiKS5tYXAoKGxpbmUpID0+IGxpbmUudHJpbSgpKTtcbiAgICAgIGVtaXQoJ3NldEZpZWxkT3B0aW9ucycsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmaWVsZFN0eWxlVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IHtzZWxlY3RPcHRpb24sIGNoZWNrQm94fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBnb1RvTmV4dENhcmQoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+XG4gICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJnb1RvTmV4dENhcmRcIlxuICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsXG4gICAgICAgICAgICAgICAgICAgIHsnZ29Ub05leHRDYXJkJzogZS50YXJnZXQudmFsdWUsICd3cmFwJzogYmVoYXYud3JhcCA/IHRydWUgOiBmYWxzZX1cbiAgICAgICAgICAgICAgICBdKX0+XG4gICAgICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ3N0YWNrJywgJ2luIHRoZSBzdGFjaycsIGJlaGF2LmdvVG9OZXh0Q2FyZCl9XG4gICAgICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2JnJywgJ2luIHRoaXMgYmFja2dyb3VuZCcsIGJlaGF2LmdvVG9OZXh0Q2FyZCl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICR7Y2hlY2tCb3goJ3dyYXAgYXJvdW5kJywgYmVoYXYud3JhcCwgKGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsXG4gICAgICAgICAgICAgICAgeydnb1RvTmV4dENhcmQnOiBiZWhhdi5nb1RvTmV4dENhcmQsICd3cmFwJzogZS50YXJnZXQuY2hlY2tlZH1cbiAgICAgICAgICAgIF0pKX1cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ29Ub05leHRDYXJkO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuY29uc3Qge3NlbGVjdE9wdGlvbiwgY2hlY2tCb3h9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmZ1bmN0aW9uIGdvVG9QcmV2aW91c0NhcmQoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+XG4gICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJnb1RvTmV4dENhcmRcIlxuICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsXG4gICAgICAgICAgICAgICAgICAgIHsnZ29Ub05leHRDYXJkJzogZS50YXJnZXQudmFsdWUsICd3cmFwJzogYmVoYXYud3JhcCA/IHRydWUgOiBmYWxzZX1cbiAgICAgICAgICAgICAgICBdKX0+XG4gICAgICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ3N0YWNrJywgJ2luIHRoZSBzdGFjaycsIGJlaGF2LmdvVG9QcmV2aW91c0NhcmQpfVxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdiZycsICdpbiB0aGlzIGJhY2tncm91bmQnLCBiZWhhdi5nb1RvUHJldmlvdXNDYXJkKX1cbiAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAgICAgJHtjaGVja0JveCgnd3JhcCBhcm91bmQnLCBiZWhhdi53cmFwLCAoZSkgPT4gZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCxcbiAgICAgICAgICAgICAgICB7J2dvVG9OZXh0Q2FyZCc6IGJlaGF2LmdvVG9OZXh0Q2FyZCwgJ3dyYXAnOiBlLnRhcmdldC5jaGVja2VkfVxuICAgICAgICAgICAgXSkpfVxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgPC9kaXY+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBnb1RvUHJldmlvdXNDYXJkO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9uLCBjaGVja0JveCwgZ2V0UGF0aCwgZmllbGRzV2l0aFZhbHVlc30gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuZnVuY3Rpb24gY29uZGl0aW9uKHN0YXRlLCBlbWl0LCBjb25kLCBwYXRoKSB7XG4gICAgbGV0IGNvbmp1bmN0aW9uID0gJ2FuZCc7XG4gICAgaWYgKHBhdGhbcGF0aC5sZW5ndGggLSAxXSA9PSAnb3InKSB7XG4gICAgICAgIGNvbmp1bmN0aW9uID0gJ29yJztcbiAgICB9XG5cbiAgICBsZXQgY2xhdXNlcztcbiAgICBpZiAoY29uZC5sZW5ndGgpIHtcbiAgICAgICAgY2xhdXNlcyA9IGNvbmQubWFwKChjbGF1c2UsIGluZGV4KSA9PlxuICAgICAgICAgICAgaHRtbGA8ZGl2PlxuICAgICAgICAgICAgICAgICR7aW5kZXggPT09IDAgPyAnJyA6IGh0bWxgPGFzaWRlPiR7Y29uanVuY3Rpb259PC9hc2lkZT5gfVxuICAgICAgICAgICAgICAgICR7Y29uZGl0aW9uQ2xhdXNlKHN0YXRlLCBlbWl0LCBjbGF1c2UsIHBhdGguY29uY2F0KFtpbmRleF0pKX1cbiAgICAgICAgICAgIDwvZGl2PmBcbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjbGF1c2VzID0gaHRtbGA8ZGl2PlxuICAgICAgICAgICAgJHtjb25kaXRpb25DbGF1c2Uoc3RhdGUsIGVtaXQsIG51bGwsIHBhdGguY29uY2F0KFswXSkpfVxuICAgICAgICA8L2Rpdj5gO1xuICAgIH1cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICAke2NsYXVzZXN9XG4gICAgICAgIDxidXR0b24gb25jbGljaz0ke2FkZENsYXVzZUhhbmRsZXJ9Pis8L2J1dHRvbj5cbiAgICA8L2Rpdj5gO1xuXG4gICAgZnVuY3Rpb24gYWRkQ2xhdXNlSGFuZGxlcigpIHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgY29uZC5jb25jYXQoW251bGxdKV0pO1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuXG5jb25zdCBjbGF1c2VPYmpzID0ge1xuICAgIHRydXRoOiAnJyxcbiAgICBmaWVsZDoge30sXG4gICAgb3I6IHsnb3InOiBbXX1cbn07XG5cbmZ1bmN0aW9uIGNvbmRpdGlvbkNsYXVzZShzdGF0ZSwgZW1pdCwgY2xhdXNlLCBwYXRoKSB7XG4gICAgY29uc3QgaW5kZXggPSBwYXRoW3BhdGgubGVuZ3RoIC0gMV07XG5cbiAgICBjb25zdCBzdWJqZWN0SGFuZGxlciA9IChlKSA9PiB7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGNsYXVzZU9ianNbZS50YXJnZXQudmFsdWVdXSk7XG4gICAgfVxuXG4gICAgY29uc3QgdmFsdWVIYW5kbGVyID0gKGUpID0+IHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgZS50YXJnZXQudmFsdWVdKTtcbiAgICB9XG5cbiAgICBjb25zdCBpc051bGwgPSBjbGF1c2UgPT09IG51bGw7XG4gICAgY29uc3QgaXNUcnV0aCA9IHR5cGVvZiBjbGF1c2UgPT09ICdzdHJpbmcnO1xuICAgIGNvbnN0IGlzRmllbGQgPSB0eXBlb2YgY2xhdXNlID09PSAnb2JqZWN0JyAmJiBjbGF1c2UgIT09IG51bGwgJiYgdHlwZW9mIGNsYXVzZS5vciA9PSAndW5kZWZpbmVkJztcbiAgICBjb25zdCBvcklzVGhlcmUgPSBjbGF1c2UgIT09IG51bGwgJiYgdHlwZW9mIGNsYXVzZSA9PSAnb2JqZWN0JyAmJiB0eXBlb2YgY2xhdXNlLm9yICE9ICd1bmRlZmluZWQnO1xuICAgIGNvbnN0IHVuaWZpZWRDb21wYXJlVmFsdWUgPSBpc051bGwgPyBudWxsIDogKGlzVHJ1dGggPyAndHJ1dGgnIDogKGlzRmllbGQgPyAnZmllbGQnIDogJ29yJykpO1xuXG4gICAgcmV0dXJuIGh0bWxgPHNlY3Rpb24+XG4gICAgICAgIDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke3VuaWZpZWRDb21wYXJlVmFsdWV9XCIgb25jaGFuZ2U9JHtzdWJqZWN0SGFuZGxlcn0+XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIHVuaWZpZWRDb21wYXJlVmFsdWUpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ3RydXRoJywgJ3RoZXJlIGlzIGEgVHJ1dGggbmFtZWQnLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdmaWVsZCcsICd0aGUgZmllbGQgbmFtZWQnLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdvcicsICdlaXRoZXInLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICR7aXNUcnV0aFxuICAgICAgICAgICAgPyBodG1sYDxpbnB1dCB0eXBlPVwidGV4dFwiIG9uY2hhbmdlPSR7dmFsdWVIYW5kbGVyfSB2YWx1ZT1cIiR7Y2xhdXNlfVwiIC8+YFxuICAgICAgICAgICAgOiBudWxsfVxuICAgICAgICAke2lzRmllbGRcbiAgICAgICAgICAgID8gZmllbGRDbGF1c2Uoc3RhdGUsIGVtaXQsIGNsYXVzZSwgcGF0aClcbiAgICAgICAgICAgIDogbnVsbH1cbiAgICAgICAgJHtvcklzVGhlcmVcbiAgICAgICAgICAgID8gY29uZGl0aW9uKHN0YXRlLCBlbWl0LCBjbGF1c2Uub3IsIHBhdGguY29uY2F0KFsnb3InXSkpXG4gICAgICAgICAgICA6IG51bGx9XG4gICAgICAgICR7aW5kZXggPiAwXG4gICAgICAgICAgICA/IGh0bWxgPGJ1dHRvbiBvbmNsaWNrPSR7KGUpID0+IHtyZW1vdmVDbGF1c2UoaW5kZXgpO3JldHVybiBmYWxzZTt9fSBjbGFzcz1cInJlbW92ZS1jbGF1c2VcIj4tPC9idXR0b24+YFxuICAgICAgICAgICAgOiBudWxsfVxuICAgIDwvc2VjdGlvbj5gO1xuXG4gICAgZnVuY3Rpb24gcmVtb3ZlQ2xhdXNlKGluZGV4KSB7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvblBhdGggPSBwYXRoLnNsaWNlKDAsIHBhdGgubGVuZ3RoIC0gMSk7XG4gICAgICAgIGNvbnN0IGNvbmRpdGlvbiA9IGdldFBhdGgoc3RhdGUsIGNvbmRpdGlvblBhdGgpO1xuICAgICAgICBjb25kaXRpb24uc3BsaWNlKHBhdGhbcGF0aC5sZW5ndGggLSAxXSwgMSk7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW2NvbmRpdGlvblBhdGgsIGNvbmRpdGlvbl0pO1xuICAgICAgICAvLyBzZWUgdGhpcyBraW5kYSB0aGluZyBzaG91bGQgYmUgaW4gYSBzdG9yZVxuICAgIH1cbn1cblxuZnVuY3Rpb24gZmllbGRDbGF1c2Uoc3RhdGUsIGVtaXQsIGNsYXVzZSwgcGF0aCkge1xuICAgIGxldCBmaXJzdEtleSA9IG51bGw7XG4gICAgbGV0IGNvbXBhcmVPYmogPSBudWxsO1xuICAgIGxldCBjb21wYXJhdG9yID0gbnVsbDtcbiAgICBsZXQgY29tcGFyZVZhbHVlID0gbnVsbDtcbiAgICBpZiAoT2JqZWN0LmtleXMoY2xhdXNlKS5sZW5ndGgpIHtcbiAgICAgICAgZmlyc3RLZXkgPSBPYmplY3Qua2V5cyhjbGF1c2UpWzBdO1xuICAgICAgICBjb21wYXJlT2JqID0gY2xhdXNlW2ZpcnN0S2V5XTtcbiAgICAgICAgY29tcGFyYXRvciA9IGNvbXBhcmVPYmogPT09IG51bGxcbiAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgOiBPYmplY3Qua2V5cyhjb21wYXJlT2JqKVswXTtcbiAgICAgICAgY29tcGFyZVZhbHVlID0gY29tcGFyZU9iaiA9PT0gbnVsbFxuICAgICAgICAgICAgPyBudWxsXG4gICAgICAgICAgICA6IChjb21wYXJhdG9yID09PSBudWxsXG4gICAgICAgICAgICAgICAgPyBudWxsXG4gICAgICAgICAgICAgICAgOiBjb21wYXJlT2JqW2NvbXBhcmF0b3JdKTtcbiAgICB9XG5cbiAgICBjb25zdCBmaWVsZE5hbWVIYW5kbGVyID0gKGUpID0+IHtcbiAgICAgICAgY29uc3QgZmllbGRPYmogPSB7fTtcbiAgICAgICAgZmllbGRPYmpbZS50YXJnZXQudmFsdWVdID0gY29tcGFyZU9iajtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgZmllbGRPYmpdKTtcbiAgICB9O1xuICAgIGNvbnN0IGZpZWxkQ29tcGFyZUhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBuZXdDb21wYXJlT2JqID0ge307XG4gICAgICAgIG5ld0NvbXBhcmVPYmpbZS50YXJnZXQudmFsdWVdID0gY29tcGFyZVZhbHVlO1xuICAgICAgICBjbGF1c2VbZmlyc3RLZXldID0gbmV3Q29tcGFyZU9iajtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgY2xhdXNlXSk7XG4gICAgfTtcbiAgICBjb25zdCBmaWVsZFZhbHVlSGFuZGxlciA9IChlKSA9PiB7XG4gICAgICAgIGNvbXBhcmVPYmpbY29tcGFyYXRvcl0gPSBlLnRhcmdldC52YWx1ZTtcbiAgICAgICAgY2xhdXNlW2ZpcnN0S2V5XSA9IGNvbXBhcmVPYmo7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGNsYXVzZV0pO1xuICAgIH07XG5cbiAgICBjb25zdCBmaWVsZHMgPSBPYmplY3Qua2V5cyhmaWVsZHNXaXRoVmFsdWVzKHN0YXRlKSk7XG4gICAgY29uc3QgdmFsdWVGb3JJbnRlcmFjdCA9ICghIWNvbXBhcmVWYWx1ZSB8fCBjb21wYXJlVmFsdWUgPT09IDApID8gY29tcGFyZVZhbHVlIDogJyc7XG5cbiAgICByZXR1cm4gaHRtbGA8c3Bhbj5cbiAgICAgICAgPHNlbGVjdCBkYXRhLXJlYWx2YWx1ZT1cIiR7Zmlyc3RLZXl9XCIgb25jaGFuZ2U9JHtmaWVsZE5hbWVIYW5kbGVyfT5cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgZmlyc3RLZXkpfVxuICAgICAgICAgICAgJHtmaWVsZHMubWFwKChmbGQpID0+IHNlbGVjdE9wdGlvbihmbGQsIGZpcnN0S2V5KSl9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgICA8c2VsZWN0IGRhdGEtcmVhbHZhbHVlPVwiJHtjb21wYXJhdG9yfVwiIG9uY2hhbmdlPSR7ZmllbGRDb21wYXJlSGFuZGxlcn0+XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2VxJywgJ2VxdWFscycsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2x0JywgJ2lzIGxlc3MgdGhhbicsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2d0JywgJ2lzIGdyZWF0ZXIgdGhhbicsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2x0ZScsICdpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdndGUnLCAnaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvJywgY29tcGFyYXRvcil9XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbignY29udGFpbnMnLCBjb21wYXJhdG9yKX1cbiAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICR7KGNvbXBhcmVPYmogJiYgY29tcGFyYXRvcilcbiAgICAgICAgICAgID8gaHRtbGA8aW5wdXQgdHlwZT1cInRleHRcIiBvbmNoYW5nZT0ke2ZpZWxkVmFsdWVIYW5kbGVyfSB2YWx1ZT1cIiR7dmFsdWVGb3JJbnRlcmFjdH1cIiAvPmBcbiAgICAgICAgICAgIDogbnVsbH1cbiAgICA8L3NwYW4+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7Y29uZGl0aW9ufTtcbiIsImNvbnN0IHtmaWVsZHNXaXRoVmFsdWVzfSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBzZXBhcmF0ZUFycmF5ID0gZnVuY3Rpb24oYXJyKSB7XG4gICAgbGV0IG90aGVycyA9IGFyci5maWx0ZXIoKGl0ZW0pID0+IHR5cGVvZiBpdGVtICE9PSAnc3RyaW5nJyk7XG4gICAgcmV0dXJuIFthcnIuZmlsdGVyKChpdGVtKSA9PiB0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpLCBvdGhlcnNdO1xufTtcblxuY29uc3QgZXZhbFRydXRocyA9IGZ1bmN0aW9uKHN0YXRlLCB0cnV0aEFyciwgb3JyID0gZmFsc2UpIHtcbiAgICBpZiAoIXRydXRoQXJyLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKG9ycikge1xuICAgICAgICByZXR1cm4gdHJ1dGhBcnIuc29tZSgodHJ1dGgpID0+IHR5cGVvZiBzdGF0ZS50cnV0aHNbdHJ1dGhdICE9PSAndW5kZWZpbmVkJyk7XG4gICAgfVxuICAgIHJldHVybiB0cnV0aEFyci5ldmVyeSgodHJ1dGgpID0+IHR5cGVvZiBzdGF0ZS50cnV0aHNbdHJ1dGhdICE9PSAndW5kZWZpbmVkJyk7XG59O1xuXG5jb25zdCBldmFsRmllbGQgPSBmdW5jdGlvbihzdGF0ZSwgZmllbGROYW1lLCBjb21wYXJlZFRvKSB7XG4gICAgY29uc3QgdmFsdWUgPSBmaWVsZHNXaXRoVmFsdWVzKHN0YXRlKVtmaWVsZE5hbWVdO1xuICAgIGlmIChPYmplY3Qua2V5cyhjb21wYXJlZFRvKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGNvbnN0IGtleSA9IE9iamVjdC5rZXlzKGNvbXBhcmVkVG8pWzBdO1xuICAgIGlmIChrZXkgPT09ICdndCcpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlID4gY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnZ3RlJykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPj0gY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnbHQnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA8IGNvbXBhcmVkVG9ba2V5XTtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2x0ZScpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlIDw9IGNvbXBhcmVkVG9ba2V5XTtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2VxJykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPT0gY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnY29udGFpbnMnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZS5pbmNsdWRlcyhjb21wYXJlZFRvW2tleV0pO1xuICAgIH1cbn07XG5cbmNvbnN0IGV2YWxDbGF1c2UgPSBmdW5jdGlvbihzdGF0ZSwgY29uZE9iaikge1xuICAgIC8vIG5vdyBpdCdzIG9uXG4gICAgaWYgKGNvbmRPYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGkgZ3Vlc3M/Pz8gbWF5YmUgZmxhZyBpdCBzb21ld2hlcmUgdG8gdGhlIHVzZXJcbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbmRPYmopLmV2ZXJ5KChrZXkpID0+IHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ29yJykge1xuICAgICAgICAgICAgbGV0IFtzdHJpbmdzLCBvdGhlcnNdID0gc2VwYXJhdGVBcnJheShjb25kT2JqLm9yKTtcbiAgICAgICAgICAgIGlmIChvdGhlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2YWxUcnV0aHMoc3RhdGUsIHN0cmluZ3MsIHRydWUpIHx8IG90aGVycy5zb21lKChpdGVtKSA9PiBldmFsQ2xhdXNlKHN0YXRlLCBpdGVtKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBldmFsVHJ1dGhzKHN0YXRlLCBzdHJpbmdzLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBsZXQgY2xhdXNlUmVzdWx0ID0gZXZhbEZpZWxkKHN0YXRlLCBrZXksIGNvbmRPYmpba2V5XSk7XG4gICAgICAgIHJldHVybiBjbGF1c2VSZXN1bHQ7XG4gICAgfSk7XG59XG5cbmNvbnN0IGV2YWxDb25kaXRpb24gPSBmdW5jdGlvbihzdGF0ZSwgY29uZE9iaiwgYW55ID0gZmFsc2UpIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShjb25kT2JqKSkge1xuICAgICAgICBsZXQgW3N0cmluZ3MsIG90aGVyc10gPSBzZXBhcmF0ZUFycmF5KGNvbmRPYmopO1xuICAgICAgICBpZiAob3RoZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuIGV2YWxUcnV0aHMoc3RhdGUsIHN0cmluZ3MpICYmIG90aGVycy5ldmVyeSgoaXRlbSkgPT4gZXZhbENsYXVzZShzdGF0ZSwgaXRlbSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGV2YWxUcnV0aHMoc3RhdGUsIGNvbmRPYmopO1xuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7ZXZhbENvbmRpdGlvbn07XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuY29uc3QgaW1hZ2VTdHlsZVZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBsZXQgaW1nID0gc3RhdGUuZWRpdGluZ0ltYWdlO1xuICAgIGxldCBjaGFuZ2VIYW5kbGVyID0gZXZlbnQgPT4gZW1pdChcInByb3BlcnR5Q2hhbmdlXCIsIGV2ZW50KTtcblxuICAgIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgPHRhYmxlPlxuICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoXCJ0b3BcIiwgXCJUb3BcIil9PC90ZD5cbiAgICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoXCJsZWZ0XCIsIFwiTGVmdFwiKX08L3RkPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcihcImhlaWdodFwiLCBcIkhlaWdodFwiKX08L3RkPlxuICAgICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcihcIndpZHRoXCIsIFwiV2lkdGhcIil9PC90ZD5cbiAgICAgICAgICA8L3RyPlxuICAgICAgPC90YWJsZT5cbiAgICAgICR7ZmllbGRGb3IoXCJjbGFzc1wiLCBcIkNsYXNzXCIpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEltYWdlPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Zvcm0+YDtcblxuICAgIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHJldHVybiBodG1sYDxwPjxsYWJlbCBmb3I9XCIke2F0dE5hbWV9XCI+JHtkaXNwbGF5TmFtZX08L2xhYmVsPjxiciAvPlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgICAgICBuYW1lPVwiJHthdHROYW1lfVwiXG4gICAgICAgICAgICAgIHZhbHVlPVwiJHtpbWdbYXR0TmFtZV0gfHwgXCJcIn1cIiAvPlxuICAgICAgICA8L3A+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWxldGVIYW5kbGVyKCkge1xuICAgICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgICAgZW1pdChcImRlbGV0ZUltYWdlXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gaW1hZ2VTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBqdW1wVG8oc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgLy8gbm9ybWFsaXppbmcgdGhlIGNyYXp5IG9mIGh0bWwgb3B0aW9ucyBhIGxpdHRsZVxuICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlSW50KGJlaGF2Lmp1bXBUbykpKSB7XG4gICAgICAgIGJlaGF2Lmp1bXBUbyA9IHBhcnNlSW50KGJlaGF2Lmp1bXBUbyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYmVoYXYuanVtcFRvID09ICdzdHJpbmcnICYmIGJlaGF2Lmp1bXBUbyA9PSAnbnVsbCcpIHtcbiAgICAgICAgYmVoYXYuanVtcFRvID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj50aGUgY2FyZCBuYW1lZCBvciBudW1iZXJlZFxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwianVtcFRvV2hhdFwiXG4gICAgICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIHsnanVtcFRvJzogZS50YXJnZXQudmFsdWV9XSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgYmVoYXYuanVtcFRvID09PSBudWxsLCAtMSl9XG4gICAgICAgICAgICAgICAgJHtzdGF0ZS5jYXJkcy5tYXAoKGNkLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQganVtcFRvVmFsID0gY2QubmFtZSB8fCBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIocGFyc2VJbnQoanVtcFRvVmFsKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGp1bXBUb1ZhbCA9IHBhcnNlSW50KGp1bXBUb1ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGVjdE9wdGlvbihqdW1wVG9WYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2QubmFtZSA/IGluZGV4ICsgXCIgLSBcIiArIGNkLm5hbWUgOiBpbmRleCksXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWhhdi5qdW1wVG8gPT09IGp1bXBUb1ZhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ganVtcFRvO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbmZ1bmN0aW9uIGxpbmtUbyhzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj50aGUgVVJMXG4gICAgICAgICAgICA8aW5wdXQgbmFtZT1cImxpbmtUb1doYXRcIlxuICAgICAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J2xpbmtUbyc6IGUudGFyZ2V0LnZhbHVlfV0pfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT1cIiR7YmVoYXYubGlua1RvfVwiIC8+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxpbmtUbztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3NlbGVjdE9wdGlvbn0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuZnVuY3Rpb24gcGxheVNvdW5kKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIGVtaXQoJ2Vuc3VyZVN0YXRpY0ZpbGVMaXN0cycpO1xuXG4gICAgY29uc3QgeW91ckJhc2ljSGFuZGxlciA9IChlKSA9PlxuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J3BsYXlTb3VuZCc6IGUudGFyZ2V0LnZhbHVlfV0pO1xuXG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+XG4gICAgICAgICAgICA8c21hbGw+KHB1dCBhIFdBViwgTVAzLCBvciBPR0cgaW4gdGhlIDxjb2RlPi9pbWc8L2NvZGU+IGZvbGRlciBmb3Igbm93LCBzb3JyeSk8L3NtYWxsPjxiciAvPlxuICAgICAgICAgICAgPHNlbGVjdCBvbmNoYW5nZT0ke3lvdXJCYXNpY0hhbmRsZXJ9IG5hbWU9XCJwbGF5U291bmRcIj5cbiAgICAgICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIGJlaGF2LnBsYXlTb3VuZCl9XG4gICAgICAgICAgICAgICAgJHtzdGF0ZS5zdGF0aWNGaWxlcy5tYXAoKGZpbGVuYW1lKSA9PlxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RPcHRpb24oZmlsZW5hbWUsIGJlaGF2LnBsYXlTb3VuZCkpfVxuICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHBsYXlTb3VuZDtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5mdW5jdGlvbiByZW1vdmVUcnV0aChzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj5yZW1vdmUgdGhlIFRydXRoIG5hbWVkXG4gICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ3aGF0VHJ1dGhcIiB2YWx1ZT1cIiR7YmVoYXYucmVtb3ZlVHJ1dGh9XCJcbiAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIHsncmVtb3ZlVHJ1dGgnOiBlLnRhcmdldC52YWx1ZX1dKX0gLz5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVtb3ZlVHJ1dGg7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuZnVuY3Rpb24gc2V0VHJ1dGgoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+c2V0IGEgVHJ1dGggbmFtZWRcbiAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIndoYXRUcnV0aFwiIHZhbHVlPVwiJHtiZWhhdi5zZXRUcnV0aH1cIlxuICAgICAgICAgICAgb25jaGFuZ2U9JHsoZSkgPT4gZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgeydzZXRUcnV0aCc6IGUudGFyZ2V0LnZhbHVlfV0pfSAvPlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgPC9kaXY+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXRUcnV0aDtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5jb25zdCBzdGFja0NvbWJvVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICBjb25zdCBjaGFuZ2VIYW5kbGVyID0gKGV2ZW50KSA9PiBlbWl0KCdzdGFja1Byb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuICBjb25zdCBzdHlsZUNvbnRhaW5lciA9IGh0bWxgPHRleHRhcmVhIHdyYXA9XCJ2aXJ0dWFsXCJcbiAgICBjbGFzcz1cInN0eWxlc2hlZXRcIlxuICAgIG9uY2hhbmdlPSR7KGUpID0+IHNldFN0eWxlcyhlLnRhcmdldC52YWx1ZSl9PiR7c3RhdGUuc3R5bGVDYWNoZX08L3RleHRhcmVhPmA7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgPHA+PGxhYmVsIGZvcj1cImNvbG9yXCI+Q29sb3I8L2xhYmVsPjxiciAvPlxuICAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgICAgbmFtZT1cImNvbG9yXCJcbiAgICAgICAgICAgdmFsdWU9XCIke3N0YXRlLmNvbG9yIHx8ICcjRkZGRkZGJ31cIiAvPlxuICAgICAgIDxidXR0b24gb25jbGljaz0keygpID0+IHtcbiAgICAgICAgICAgZW1pdCgnc3RhY2tQcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiAnY29sb3InLCB2YWx1ZTogJyd9fSk7XG4gICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICB9fT5cbiAgICAgICAgIENsZWFyXG4gICAgICAgPC9idXR0b24+XG4gICAgPC9wPlxuICAgIDxwPjxsYWJlbCBmb3I9XCJzdHlsZXNcIj5TdHlsZXM8L2xhYmVsPjxiciAvPlxuICAgICR7c3R5bGVDb250YWluZXJ9XG4gICAgPC9wPlxuICA8L2Zvcm0+YDtcblxuICBmdW5jdGlvbiBzZXRTdHlsZXModmFsKSB7XG4gICAgICBlbWl0KCdzZXRTdHlsZXMnLCB2YWwpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHN0YWNrQ29tYm9WaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgsIHN0YXRlLCBlbWl0LCBpc0NhcmQpIHtcbiAgICBsZXQgYXR0cnMgPSB7XG4gICAgICAgIGhlaWdodDogZWxlbWVudC5oZWlnaHQsXG4gICAgICAgIHdpZHRoOiBlbGVtZW50LndpZHRoLFxuICAgICAgICB0b3A6IGVsZW1lbnQudG9wLFxuICAgICAgICBsZWZ0OiBlbGVtZW50LmxlZnQsXG4gICAgICAgICdiYWNrZ3JvdW5kLWNvbG9yJzogZWxlbWVudC5jb2xvcixcbiAgICAgICAgJ2ZvbnQtZmFtaWx5JzogZWxlbWVudC5mb250LFxuICAgICAgICAnZm9udC1zaXplJzogZWxlbWVudC5zaXplLFxuICAgICAgICAnZm9udC1zdHlsZSc6IGVsZW1lbnQuc3R5bGUsXG4gICAgICAgIGNvbG9yOiBlbGVtZW50LnRleHRDb2xvclxuICAgIH07IC8vIHRoaXMgZGF0YSBtdW5nZSBzdGVwIG1heSBiZWxvbmcgaW4gYSBzdG9yZT9cbiAgICBsZXQgc3R5bGUgPSBPYmplY3Qua2V5cyhhdHRycykubWFwKChrZXkpID0+IChrZXkgKyAnOicgKyBhdHRyc1trZXldICsgJzsnKSkuam9pbignJyk7XG4gICAgcmV0dXJuIGh0bWxgPGRpdlxuICAgICAgICBjbGFzcz1cImdyYXBoaWMgJHtlbGVtZW50LmNsYXNzfVwiXG4gICAgICAgIHN0eWxlPVwiJHtzdHlsZX1cIlxuICAgID4ke2VsZW1lbnQudGV4dH08L2Rpdj5gO1xufTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3BhcnNlQW5kUnVuQmVoYXZpb3JzfSA9IHJlcXVpcmUoJy4vYmVoYXZpb3IuanMnKTtcblxuXG5jb25zdCBJTUFHRV9ST1RBVElPTiA9IHtcbiAgICAzOiAncm90YXRlKDE4MGRlZyknLFxuICAgIDY6ICdyb3RhdGUoOTBkZWcpJyxcbiAgICA4OiAncm90YXRlKDI3MGRlZyknXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgsIHN0YXRlLCBlbWl0LCBpc0NhcmQpIHtcbiAgICBpZiAoaXNEcmFnZ2FibGUoKSkge1xuICAgICAgICByZXR1cm4gaHRtbGA8aW1nIGNsYXNzPVwibW92YWJsZVwiXG4gICAgICAgICAgICBvbmNsaWNrPSR7ZWRpdE1vZGVDbGlja31cbiAgICAgICAgICAgIG9ubW91c2Vkb3duPSR7KGUpID0+IG1vdXNlRG93bihlKX1cbiAgICAgICAgICAgIG9ubW91c2VsZWF2ZT0keyhlKSA9PiBtb3VzZUxlYXZlKGUpfVxuICAgICAgICAgICAgb25tb3VzZXVwPSR7KGUpID0+IG1vdXNlVXAoZSl9XG4gICAgICAgICAgICBzcmM9XCIke2VsZW1lbnQuc3JjfVwiXG4gICAgICAgICAgICBhbHQ9XCIke2VsZW1lbnQuYWx0ID8gZWxlbWVudC5hbHQgOiAnJ31cIlxuICAgICAgICAgICAgaGVpZ2h0PVwiJHtlbGVtZW50LmhlaWdodCA/IGVsZW1lbnQuaGVpZ2h0IDogJyd9XCJcbiAgICAgICAgICAgIHdpZHRoPVwiJHtlbGVtZW50LndpZHRoID8gZWxlbWVudC53aWR0aCA6ICcnfVwiXG4gICAgICAgICAgICBzdHlsZT1cInRvcDoke2VsZW1lbnQudG9wfTtsZWZ0OiR7ZWxlbWVudC5sZWZ0fTske2lubGluZVN0eWxlcygpfVwiXG4gICAgICAgIC8+YDtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPGltZyBjbGFzcz1cIiR7aW1hZ2VDbGFzc2VzKCl9XCJcbiAgICAgICAgb25jbGljaz0ke2NsaWNrSGFuZGxlcn1cbiAgICAgICAgc3JjPVwiJHtlbGVtZW50LnNyY31cIlxuICAgICAgICBhbHQ9XCIke2VsZW1lbnQuYWx0ID8gZWxlbWVudC5hbHQgOiAnJ31cIlxuICAgICAgICBoZWlnaHQ9XCIke2VsZW1lbnQuaGVpZ2h0ID8gZWxlbWVudC5oZWlnaHQgOiAnJ31cIlxuICAgICAgICB3aWR0aD1cIiR7ZWxlbWVudC53aWR0aCA/IGVsZW1lbnQud2lkdGggOiAnJ31cIlxuICAgICAgICBzdHlsZT1cInRvcDoke2VsZW1lbnQudG9wfTtsZWZ0OiR7ZWxlbWVudC5sZWZ0fTske2lubGluZVN0eWxlcygpfVwiXG4gICAgLz5gO1xuXG4gICAgZnVuY3Rpb24gY2xpY2tIYW5kbGVyKCkge1xuICAgICAgICBpZiAoZXZlbnQuYWx0S2V5KSB7XG4gICAgICAgICAgICBlbWl0KCdlZGl0SW1hZ2UnLCBbZWxlbWVudCwgaW5kZXgsIGlzQ2FyZF0pO1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYmVoYXZpb3IgJiYgZWxlbWVudC5iZWhhdmlvci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcnNlQW5kUnVuQmVoYXZpb3JzKHN0YXRlLCBlbWl0LCBlbGVtZW50LmJlaGF2aW9yKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlubGluZVN0eWxlcygpIHtcbiAgICAgICAgbGV0IG91dCA9IFwiXCI7XG4gICAgICAgIGlmIChlbGVtZW50LnN0eWxlKSB7XG4gICAgICAgICAgICBvdXQgKz0gZWxlbWVudC5zdHlsZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC5vcmllbnRhdGlvbiAmJiBlbGVtZW50Lm9yaWVudGF0aW9uICE9PSAxKSB7XG4gICAgICAgICAgICBvdXQgKz0gXCJ0cmFuc2Zvcm06IFwiICsgSU1BR0VfUk9UQVRJT05bZWxlbWVudC5vcmllbnRhdGlvbl07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbWFnZUNsYXNzZXMoKSB7XG4gICAgICAgIGlmIChlbGVtZW50LmJlaGF2aW9yICYmIGVsZW1lbnQuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2JlaGF2ZXMtb24tY2xpY2snO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0SW1hZ2UoKSB7XG4gICAgICAgIGVtaXQoJ2VkaXRJbWFnZScsIFtlbGVtZW50LCBpbmRleCwgaXNDYXJkXSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKCkge1xuICAgICAgICBpZiAoaXNDYXJkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0TW9kZUNsaWNrKGV2dCkge1xuICAgICAgICBjb25zdCBbc3RhcnRYLCBzdGFydFldID0gc3RhdGUubW91c2VEb3duO1xuICAgICAgICBpZiAoTWF0aC5hYnMoZXZ0LnNjcmVlblggLSBzdGFydFgpIDwgMTAgJiYgTWF0aC5hYnMoZXZ0LnNjcmVlblkgLSBzdGFydFkpIDwgMTApIHtcbiAgICAgICAgICAgIGVkaXRJbWFnZSgpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VEb3duKGV2dCkge1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlbWl0KCdzdGFydERyYWcnLCBbZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLCBldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFksIGV2dC50YXJnZXRdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZUxlYXZlKGV2dCkge1xuICAgICAgICBpZiAoc3RhdGUuZHJhZ0luZm8gfHwgc3RhdGUucmVzaXplSW5mbykge1xuICAgICAgICAgICAgY29uc3QgeWVySW5mbyA9IHN0YXRlLmRyYWdJbmZvID8gc3RhdGUuZHJhZ0luZm8gOiBzdGF0ZS5yZXNpemVJbmZvO1xuICAgICAgICAgICAgaWYgKHllckluZm8udGFyZ2V0ID09IGV2dC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZVVwKGV2dCkge1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIGVtaXQoJ2ZpbmlzaERyYWcnLCBbXG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA/ICdtb3ZlSW1hZ2UnIDogJ3Jlc2l6ZUltYWdlJyxcbiAgICAgICAgICAgIGV2dC5zY3JlZW5YLCBldnQuc2NyZWVuWSxcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gZXZ0LnRhcmdldC5zdHlsZS5sZWZ0IDogZXZ0LnRhcmdldC5jbGllbnRXaWR0aCxcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gZXZ0LnRhcmdldC5zdHlsZS50b3AgOiBldnQudGFyZ2V0LmNsaWVudEhlaWdodCxcbiAgICAgICAgICAgIGluZGV4XG4gICAgICAgIF0pO1xuICAgIH1cbn07XG4iLCJjb25zdCB7bW9kUGF0aCwgZ2V0UGF0aH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgQXBwU3RvcmUgPSBhc3luYyBmdW5jdGlvbihzdGF0ZSwgZW1pdHRlcikge1xuICAgIGNvbnN0IHBva2UgPSBtb2RQYXRoKHN0YXRlLCBlbWl0dGVyKTtcblxuICAgIGNvbnN0IGxvY2FsQXJjID0gbmV3IERhdEFyY2hpdmUod2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKCkpO1xuICAgIGNvbnN0IHJhd1N0YXRlID0gSlNPTi5wYXJzZShhd2FpdCBsb2NhbEFyYy5yZWFkRmlsZSgnc3RhY2suanNvbicpKTtcbiAgICBPYmplY3Qua2V5cyhyYXdTdGF0ZSkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIHN0YXRlW2tleV0gPSByYXdTdGF0ZVtrZXldO1xuICAgIH0pO1xuXG4gICAgc3RhdGUuZ2V0Q2FyZHMgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkcztcbiAgICB9O1xuICAgIHN0YXRlLmdldENhcmRDb3VudCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmRzLmxlbmd0aDtcbiAgICB9XG4gICAgc3RhdGUuc2V0TmV4dENhcmQgPSAobnVtKSA9PiB7XG4gICAgICAgIHN0YXRlLm5leHRDYXJkID0gbnVtO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmN1cnJlbnRDYXJkO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0Q3VycmVudENhcmQgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF07XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4ID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuY3VycmVudEJhY2tncm91bmQ7XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXTtcbiAgICB9O1xuICAgIHN0YXRlLmdldEJhY2tncm91bmRGb3JDYXJkID0gKGNhcmQpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmJhY2tncm91bmRzW2NhcmQuYmFja2dyb3VuZF07XG4gICAgfVxuICAgIHN0YXRlLmdldENhcmRzSW5DdXJyZW50QmFja2dyb3VuZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmRzLm1hcCgoY2QsIGluZCkgPT4gT2JqZWN0LmFzc2lnbih7fSwgY2QsIHtpbmRleDogaW5kfSkpXG4gICAgICAgICAgICAuZmlsdGVyKChjZCkgPT4gY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuY3VycmVudEJhY2tncm91bmQpO1xuICAgIH07XG5cbiAgICBzdGF0ZS5zZXRQcm9wZXJ0eUF0UGF0aCA9IChwYXRoQXJyYXksIHZhbHVlKSA9PiB7XG4gICAgICAgIHBva2UocGF0aEFycmF5LCB2YWx1ZSk7XG4gICAgfVxuICAgIHN0YXRlLmdldFByb3BlcnR5QXRQYXRoID0gKHBhdGhBcnJheSkgPT4ge1xuICAgICAgICByZXR1cm4gZ2V0UGF0aChzdGF0ZSwgcGF0aEFycmF5KTtcbiAgICB9O1xuXG4gICAgc3RhdGUuZWRpdE9iamVjdCA9IChvYmplY3RQYXRoKSA9PiB7XG4gICAgICAgIC8vIHRoaXMganVzdCBtZWFucyBzd2l0Y2ggb24gdGhlIGVkaXQgbW9kYWw/XG4gICAgICAgIC8vIHdoYXQgaXMgJ2VudicgaGVyZSBhbmQgbWF5YmUgd2UgaWdub3JlIGl0P1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRpbmcoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBsZVBhdGggPSBzdGF0ZS5lZGl0aW5nQ2FyZCgpXG4gICAgICAgICAgICA/IFsnY2FyZHMnLCBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCldXG4gICAgICAgICAgICA6IFsnYmFja2dyb3VuZHMnLCBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KCldO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IGxlUGF0aC5jb25jYXQob2JqZWN0UGF0aCk7XG4gICAgICAgIC8vIHNvIEkgZ3Vlc3MgdGhhdCdzIHdoYXQgdGhvc2UgYXJndW1lbnRzIGFyZVxuICAgICAgICBzd2l0Y2ggKG9iamVjdFBhdGhbMF0pIHtcbiAgICAgICAgICAgIGNhc2UgJ2VsZW1lbnRzJzpcbiAgICAgICAgICAgICAgICBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IHN0YXRlLmdldFByb3BlcnR5QXRQYXRoKHN0YXRlLmVkaXRpbmdQYXRoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ltYWdlcyc6XG4gICAgICAgICAgICAgICAgc3RhdGUuZWRpdGluZ0ltYWdlID0gc3RhdGUuZ2V0UHJvcGVydHlBdFBhdGgoc3RhdGUuZWRpdGluZ1BhdGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZmllbGRzJzpcbiAgICAgICAgICAgICAgICBzdGF0ZS5lZGl0aW5nRmllbGQgPSBzdGF0ZS5nZXRQcm9wZXJ0eUF0UGF0aChzdGF0ZS5lZGl0aW5nUGF0aCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjYXJkcyc6XG4gICAgICAgICAgICBjYXNlICdiYWNrZ3JvdW5kcyc6XG4gICAgICAgICAgICBjYXNlICdzdGFjayc6XG4gICAgICAgICAgICAgICAgLy8gb2ggYWN0dWFsbHlcbiAgICAgICAgICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IG9iamVjdFBhdGg7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgc3RhdGUuc2V0RWRpdE1vZGUgPSAodG9XaGF0KSA9PiB7XG4gICAgICAgIGlmIChbJ2VkaXRNb2RlJywnYmdFZGl0JywgJyddLmluY2x1ZGVzKHRvV2hhdCkpIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRNb2RlID0gdG9XaGF0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b1doYXQgPT09IG51bGwgfHwgdG9XaGF0ID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPSAnJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0ZS5lZGl0aW5nID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gISFzdGF0ZS5lZGl0TW9kZTtcbiAgICB9O1xuICAgIHN0YXRlLmVkaXRpbmdDYXJkID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgfTtcbiAgICBzdGF0ZS5lZGl0aW5nQmFja2dyb3VuZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9O1xuXG4gICAgLy8gd2hhdCBhYm91dCBkcmFnZ2luZ1xuICAgIC8vIG1heWJlIGRyYWdnaW5nIHN0YXlzIGhvdyBpdCBpcyBiZWNhdXNlIGl0IHNob3VsZG4ndCBoaXQgdGhlIGRpc2sgZXZlclxuXG4gICAgc3RhdGUuc2F2ZUZpZWxkID0gZnVuY3Rpb24oZXZlbnQsIGZpZWxkLCBzdGF0ZSkge1xuICAgICAgICBsZXQgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgICAgIGlmIChzdGF0ZS5jYXJkLmZpZWxkc1tmaWVsZC5uYW1lXSkge1xuICAgICAgICAgICAgc3RhdGUuY2FyZC5maWVsZHNbZmllbGQubmFtZV0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXS5maWVsZHNbZmllbGQubmFtZV0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlLmNhcmQudmFsdWVzW2ZpZWxkLm5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF0udmFsdWVzW2ZpZWxkLm5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZW1pdHRlci5vbignZ290bycsIGFzeW5jIGZ1bmN0aW9uKGZvcmNlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHN0YXRlLnBhcmFtcyAmJiBzdGF0ZS5wYXJhbXMud2hpY2gpIHtcbiAgICAgICAgICAgIGlmIChOdW1iZXIuaXNOYU4ocGFyc2VJbnQoc3RhdGUucGFyYW1zLndoaWNoKSkgJiYgQXJyYXkuaXNBcnJheShzdGF0ZS5jYXJkcykpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZChzdGF0ZS5nZXRDYXJkcygpLmZpbmRJbmRleCgoY2QpID0+IGNkLm5hbWUgPT0gc3RhdGUucGFyYW1zLndoaWNoKSk7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoTWF0aC5tYXgoc3RhdGUubmV4dENhcmQsIDApKTsgLy8gaW4gY2FzZSBvZiA0MDRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoc3RhdGUucGFyYW1zLndoaWNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5wYXJhbXMud2hpY2g7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHN0YXRlLm5leHRDYXJkICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgICAgICAgICAgIChzdGF0ZS5uZXh0Q2FyZCAhPT0gc3RhdGUuY3VycmVudENhcmQgfHwgZm9yY2UgPT09IHRydWUpKSB7XG4gICAgICAgICAgICBsZXQgbnVtID0gc3RhdGUubmV4dENhcmQ7XG4gICAgICAgICAgICBzdGF0ZS5jYXJkID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuY2FyZHNbbnVtXSk7XG4gICAgICAgICAgICBzdGF0ZS5jdXJyZW50Q2FyZCA9IG51bTtcbiAgICAgICAgICAgIGlmICghc3RhdGUuYmFja2dyb3VuZCB8fCBzdGF0ZS5jYXJkLmJhY2tncm91bmQgIT09IHN0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kKSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZCA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmdldEJhY2tncm91bmRGb3JDYXJkKHN0YXRlLmNhcmQpKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ2JhY2tncm91bmRMb2FkZWQnKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdjYXJkTG9hZGVkJyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBlbWl0dGVyLm9uKCdnb3RvTmV4dENhcmQnLCBhc3luYyBmdW5jdGlvbih3cmFwID0gdHJ1ZSkge1xuICAgICAgICBjb25zdCBjdXJyZW50Q2FyZCA9IHN0YXRlLmdldEN1cnJlbnRDYXJkSW5kZXgoKTtcbiAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoKGN1cnJlbnRDYXJkICsgMSA+PSBzdGF0ZS5nZXRDYXJkQ291bnQoKSlcbiAgICAgICAgICAgID8gKHdyYXAgPyAwIDogY3VycmVudENhcmQpXG4gICAgICAgICAgICA6IGN1cnJlbnRDYXJkICsgMSk7XG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgnZ290bycpO1xuICAgIH0pO1xuICAgIGVtaXR0ZXIub24oJ2dvdG9QcmV2Q2FyZCcsIGFzeW5jIGZ1bmN0aW9uKHdyYXAgPSB0cnVlKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRDYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpO1xuICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZCgoY3VycmVudENhcmQgLSAxIDwgMClcbiAgICAgICAgICAgID8gKHdyYXAgPyBzdGF0ZS5nZXRDYXJkQ291bnQoKSAtIDEgOiAwKVxuICAgICAgICAgICAgOiBjdXJyZW50Q2FyZCAtIDEpO1xuICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ2dvdG8nKTtcbiAgICB9KTtcbiAgICBcblxuICAgIGVtaXR0ZXIub24oJ3NhdmUnLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IHNhdmVkU3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmNhcmQ7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmJhY2tncm91bmQ7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmVkaXRNb2RlO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5lZGl0aW5nUGF0aDtcbiAgICAgICAgZGVsZXRlIHNhdmVkU3RhdGUucGFyYW1zO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5zdHlsZUNhY2hlO1xuICAgICAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoc2F2ZWRTdGF0ZSkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2F2ZWRTdGF0ZVtrZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVkU3RhdGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBkZWxldGUgc2F2ZWRTdGF0ZS5xdWVyeTtcbiAgICAgICAgLy8gZGVsZXRlIHNhdmVkU3RhdGUuaHJlZjsgLy8gbW9yZSBjaG9vIGJ1aWx0aW5zXG4gICAgICAgIGF3YWl0IGxvY2FsQXJjLndyaXRlRmlsZSgnc3RhY2suanNvbicsXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeShzYXZlZFN0YXRlKSk7XG4gICAgICAgIHdpbmRvdy50ZXN0U3RhdGUgPSBzYXZlZFN0YXRlO1xuICAgIH0pO1xuXG4gICAgaWYgKCFzdGF0ZS5jYXJkIHx8ICFzdGF0ZS5iYWNrZ3JvdW5kIHx8IE9iamVjdC5rZXlzKHN0YXRlLmNhcmQpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZChzdGF0ZS5jdXJyZW50Q2FyZCk7XG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgnZ290bycsIHRydWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgncmVuZGVyJyk7XG4gICAgfVxuXG5cbiAgICBjb25zdCBzdHlsZVNoZWV0ID0gYXdhaXQgbG9jYWxBcmMucmVhZEZpbGUoJ3N0YWNrLmNzcycpO1xuICAgIHN0YXRlLnN0eWxlQ2FjaGUgPSBzdHlsZVNoZWV0O1xuXG4gICAgZW1pdHRlci5vbignc2V0U3R5bGVzJywgYXN5bmMgZnVuY3Rpb24oc3R5bGVUZXh0KSB7XG4gICAgICAgIGF3YWl0IGxvY2FsQXJjLndyaXRlRmlsZSgnc3RhY2suY3NzJywgc3R5bGVUZXh0KTtcblxuICAgICAgICBzdGF0ZS5zdHlsZUNhY2hlID0gc3R5bGVUZXh0O1xuICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ3JlbmRlcicpO1xuICAgIH0pO1xuXG5cbiAgICBlbWl0dGVyLm9uKCdlbnN1cmVTdGF0aWNGaWxlTGlzdHMnLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgbmVlZHNGaXJzdFJlbmRlciA9ICEoc3RhdGUuc3RhdGljRmlsZXMgJiYgc3RhdGUuc3RhdGljRmlsZXMubGVuZ3RoKTtcbiAgICAgICAgY29uc3Qgc3RhdGljcyA9IGF3YWl0IGxvY2FsQXJjLnJlYWRkaXIoJy9pbWcnLCB7cmVjdXJzaXZlOiB0cnVlfSk7XG4gICAgICAgIHN0YXRlLnN0YXRpY0ZpbGVzID0gc3RhdGljcztcbiAgICAgICAgaWYgKG5lZWRzRmlyc3RSZW5kZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IGFzeW5jRW1pdCgncmVuZGVyJyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IG1haW50YWluTGlzdHNIYW5kbGVyID0gKHtwYXRofSkgPT4gZW1pdHRlci5lbWl0KCdlbnN1cmVTdGF0aWNGaWxlTGlzdHMnKTtcbiAgICBjb25zdCBzdGF0aWNzTW9uaXRvciA9IGxvY2FsQXJjLmNyZWF0ZUZpbGVBY3Rpdml0eVN0cmVhbSgnL2ltZy8qJyk7XG4gICAgc3RhdGljc01vbml0b3IuYWRkRXZlbnRMaXN0ZW5lcignaW52YWxpZGF0ZWQnLCBtYWludGFpbkxpc3RzSGFuZGxlcik7XG4gICAgc3RhdGljc01vbml0b3IuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlZCcsIG1haW50YWluTGlzdHNIYW5kbGVyKTtcblxuXG4gICAgbGV0IGFsdEtleVJlYWRpZWQgPSBmYWxzZTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoL15BbHQvLnRlc3QoZXZlbnQuY29kZSkpIHtcbiAgICAgICAgICAgIGFsdEtleVJlYWRpZWQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGFsdEtleVJlYWRpZWQpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGV2ZW50LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnRW50ZXInOiBlbWl0dGVyLmVtaXQoJ3RvZ2dsZUVkaXRNb2RlJyk7IGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdBcnJvd1JpZ2h0JzogZW1pdHRlci5lbWl0KCdnb3RvTmV4dENhcmQnKTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0Fycm93TGVmdCc6IGVtaXR0ZXIuZW1pdCgnZ290b1ByZXZDYXJkJyk7IGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdLZXlOJzogZW1pdHRlci5lbWl0KCduZXdDYXJkJyk7IGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChldmVudC5jb2RlID09PSBcIkVzY2FwZVwiKSB7XG4gICAgICAgICAgICAgICAgYWx0S2V5UmVhZGllZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nUGF0aCkge1xuICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2Nsb3NlRWRpdCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdE1vZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCd0dXJuT2ZmRWRpdE1vZGUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdrZXl1cCcsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICgvXkFsdC8udGVzdChldmVudC5jb2RlKSAmJiBhbHRLZXlSZWFkaWVkKSB7XG4gICAgICAgICAgICBhbHRLZXlSZWFkaWVkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3JlbmRlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgYmFkR3V5cyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3NlbGVjdCcpO1xuICAgICAgICAgICAgLy8gc28gbmFtZWQgb25seSBiZWNhdXNlIHRoaXMgaXMgdG8gZml4IHdoYXQgd2UgZXhwZXJpZW5jZSBhcyBhIGJ1ZyFcbiAgICAgICAgICAgIC8vIFdIQVRDSEEgR09OTkEgRE8gV0hFTiBUSEVZIENPTUUgRk9SIFlPVVxuICAgICAgICAgICAgaWYgKGJhZEd1eXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgYmFkR3V5cy5mb3JFYWNoKChndXkpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGd1eS5oYXNBdHRyaWJ1dGUoJ2RhdGEtcmVhbHZhbHVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGd1eS5xdWVyeVNlbGVjdG9yQWxsKCdvcHRpb24nKS5mb3JFYWNoKChvcHQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdC52YWx1ZSA9PSBndXkuZ2V0QXR0cmlidXRlKCdkYXRhLXJlYWx2YWx1ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGd1eS5zZWxlY3RlZEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBndXkucXVlcnlTZWxlY3RvckFsbCgnb3B0aW9uJykuZm9yRWFjaCgob3B0LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHQuaGFzQXR0cmlidXRlKCdzZWxlY3RlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGd1eS5zZWxlY3RlZEluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgMTApO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gYXN5bmNFbWl0KCkge1xuICAgICAgICBsZXQgYXJncyA9IFsuLi5hcmd1bWVudHNdO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0LmFwcGx5KGVtaXR0ZXIsIGFyZ3MpO1xuICAgICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBTdG9yZTtcbiIsImNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9yc30gPSByZXF1aXJlKCcuLi9iZWhhdmlvci5qcycpO1xuXG5cbmNvbnN0IEJnU3RvcmUgPSAoc3RhdGUsIGVtaXR0ZXIpID0+IHtcbiAgICBlbWl0dGVyLm9uKCdiYWNrZ3JvdW5kTG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChzdGF0ZS5iYWNrZ3JvdW5kLmJlaGF2aW9yICYmIHN0YXRlLmJhY2tncm91bmQuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJzZUFuZFJ1bkJlaGF2aW9ycyhzdGF0ZSwgZW1pdHRlci5lbWl0LmJpbmQoZW1pdHRlciksIHN0YXRlLmJhY2tncm91bmQuYmVoYXZpb3IpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nUGF0aCAmJiBzdGF0ZS5lZGl0aW5nUGF0aC5sZW5ndGggPT0gMiAmJiBzdGF0ZS5lZGl0aW5nUGF0aFswXSA9PSAnYmFja2dyb3VuZHMnKSB7XG4gICAgICAgICAgICAvLyBhbHJlYWR5IGluIGJnLWVkaXRpbmcgbW9kZSwgc28gdXBkYXRlIHRoZSBwYXRoXG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aFsxXSA9IHN0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdjYXJkTG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCB2YWx1ZXMgPSBzdGF0ZS5jYXJkLnZhbHVlcztcbiAgICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXModmFsdWVzKS5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUuYmFja2dyb3VuZC5maWVsZHNbZmllbGROYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kLmZpZWxkc1tmaWVsZE5hbWVdLnZhbHVlID0gdmFsdWVzW2ZpZWxkTmFtZV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGJsYW5rQmcgPSB7XG4gICAgICAgIG5hbWU6ICcnLFxuICAgICAgICBpbWFnZXM6IFtdLFxuICAgICAgICBlbGVtZW50czogW10sXG4gICAgICAgIGZpZWxkczoge30sXG4gICAgICAgIGJlaGF2aW9yOiBbXVxuICAgIH07XG5cbiAgICBlbWl0dGVyLm9uKCduZXdCZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kcy5wdXNoKE9iamVjdC5hc3NpZ24oe30sIGJsYW5rQmcpKTtcbiAgICAgICAgLy8gdGhlbiBnbyB0aGVyZT9cbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2VkaXRCZycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IFsnYmFja2dyb3VuZHMnLCBzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF07XG4gICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmVkaXRpbmdGaWVsZCA9IHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2VudlByb3BlcnR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdQYXRoICYmIHN0YXRlLmVkaXRpbmdQYXRoWzBdID09PSAnYmFja2dyb3VuZHMnKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGV2ZW50LnRhcmdldC5uYW1lO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG5cbiAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXVtwcm9wTmFtZV0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCZ1N0b3JlO1xuIiwiY29uc3Qge3BhcnNlQW5kUnVuQmVoYXZpb3JzfSA9IHJlcXVpcmUoJy4uL2JlaGF2aW9yLmpzJyk7XG5cblxuY29uc3QgQ2FyZFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbignbmV3Q2FyZCcsIChzdHVmZikgPT4ge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzdHVmZikpIHtcbiAgICAgICAgICAgIHN0dWZmID0gc3R1ZmZbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzdHVmZikge1xuICAgICAgICAgICAgc3R1ZmYgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgbmV3Q2FyZCA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmNhcmQsIHtcbiAgICAgICAgICAgIG5hbWU6ICcnLFxuICAgICAgICAgICAgdmFsdWVzOiB7fSxcbiAgICAgICAgICAgIGltYWdlczogW10sXG4gICAgICAgICAgICBlbGVtZW50czogW10sXG4gICAgICAgICAgICBmaWVsZHM6IHt9LFxuICAgICAgICAgICAgYmVoYXZpb3I6IFtdXG4gICAgICAgIH0sIHN0dWZmKTtcbiAgICAgICAgc3RhdGUuY2FyZHMuc3BsaWNlKHN0YXRlLmN1cnJlbnRDYXJkICsgMSwgMCwgbmV3Q2FyZCk7XG4gICAgICAgIHN0YXRlLm5leHRDYXJkID0gc3RhdGUuY3VycmVudENhcmQgKyAxO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnZ290bycpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignY2FyZExvYWRlZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc3RhdGUuY2FyZC5iZWhhdmlvciAmJiBzdGF0ZS5jYXJkLmJlaGF2aW9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFyc2VBbmRSdW5CZWhhdmlvcnMoc3RhdGUsIGVtaXR0ZXIuZW1pdC5iaW5kKGVtaXR0ZXIpLCBzdGF0ZS5jYXJkLmJlaGF2aW9yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ1BhdGggJiYgc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoID09IDIgJiYgc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT0gJ2NhcmRzJykge1xuICAgICAgICAgICAgLy8gYWxyZWFkeSBpbiBjYXJkLWVkaXRpbmcgbW9kZSwgc28gdXBkYXRlIHRoZSBwYXRoXG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aFsxXSA9IHN0YXRlLmN1cnJlbnRDYXJkO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdlZGl0Q2FyZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IFsnY2FyZHMnLCBzdGF0ZS5jdXJyZW50Q2FyZF07XG4gICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmVkaXRpbmdGaWVsZCA9IHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2RlbGV0ZUNhcmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHN0YXRlLmNhcmRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmNhcmRzLnNwbGljZShzdGF0ZS5jdXJyZW50Q2FyZCwgMSk7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3aXRoIHRoZSBiYWNrZ3JvdW5kIGlmIGl0IGlzIG5vdyBjYXJkbGVzcz9cbiAgICAgICAgaWYgKHN0YXRlLmN1cnJlbnRDYXJkID4gMCkge1xuICAgICAgICAgICAgc3RhdGUuY3VycmVudENhcmQtLTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5jYXJkID0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZW52UHJvcGVydHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ1BhdGggJiYgc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT09ICdjYXJkcycpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZXZlbnQudGFyZ2V0Lm5hbWU7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXVtwcm9wTmFtZV0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYXJkU3RvcmU7XG4iLCJjb25zdCB7dG9QeH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cbmNvbnN0IEVkaXRTdG9yZSA9IChzdGF0ZSwgZW1pdHRlcikgPT4ge1xuICAgIGVtaXR0ZXIub24oJ3RvZ2dsZUVkaXRNb2RlJywgZnVuY3Rpb24oaXNDYXJkTGV2ZWxFdmVudCA9IHRydWUpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3R1cm5PZmZFZGl0TW9kZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPSBpc0NhcmRMZXZlbEV2ZW50ID8gJ2VkaXRNb2RlJyA6ICdiZ0VkaXQnO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGVtaXR0ZXIub24oJ2VkaXRCZ01vZGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnKSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0TW9kZSA9ICdiZ0VkaXQnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPSAnZWRpdE1vZGUnO1xuICAgICAgICB9XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgnY2xvc2VFZGl0Jyk7IC8vIHRoYXQnbGwgcmVuZGVyIGZvciB1c1xuICAgIH0pO1xuICAgIGVtaXR0ZXIub24oJ3R1cm5PZmZFZGl0TW9kZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5lZGl0TW9kZSA9ICcnO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IG51bGw7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gc3RhdGUuZWRpdGluZ0ZpZWxkID0gbnVsbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ25ld0ltYWdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmFkZGluZ0ltYWdlID0gdHJ1ZTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3N0YXJ0RHJhZycsIGZ1bmN0aW9uKFtzY3JlZW5YLCBzY3JlZW5ZLCBvZmZzZXRYLCBvZmZzZXRZLCB0YXJnZXRdKSB7XG4gICAgICAgIHN0YXRlLm1vdXNlRG93biA9IFtzY3JlZW5YLCBzY3JlZW5ZXTtcbiAgICAgICAgaWYgKE1hdGguYWJzKHRhcmdldC5jbGllbnRIZWlnaHQgLSBvZmZzZXRZKSA8IDEwKSB7XG4gICAgICAgICAgICBzdGF0ZS5yZXNpemVJbmZvID0ge1xuICAgICAgICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICAgICAgICBoZWlnaHQ6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNlZGl0YmFyJykuY2xpZW50SGVpZ2h0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2UgaWYgKE1hdGguYWJzKHRhcmdldC5jbGllbnRXaWR0aCAtIG9mZnNldFgpIDwgMTApIHtcbiAgICAgICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgICAgICAgIHdpZHRoOiB0cnVlXG4gICAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPSB7XG4gICAgICAgICAgICAgICAgb2Zmc2V0WCxcbiAgICAgICAgICAgICAgICBvZmZzZXRZOiBvZmZzZXRZICsgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2VkaXRiYXInKS5jbGllbnRIZWlnaHQsXG4gICAgICAgICAgICAgICAgdGFyZ2V0XG4gICAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdmaW5pc2hEcmFnJywgZnVuY3Rpb24oW2ZvbGxvd09uQWN0aW9uLCBzY3JlZW5YLCBzY3JlZW5ZLCB4LCB5LCBpZGVudF0pIHtcbiAgICAgICAgY29uc3QgW3N0YXJ0WCwgc3RhcnRZXSA9IHN0YXRlLm1vdXNlRG93bjtcbiAgICAgICAgaWYgKE1hdGguYWJzKHNjcmVlblggLSBzdGFydFgpID49IDEwIHx8IE1hdGguYWJzKHNjcmVlblkgLSBzdGFydFkpID49IDEwKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoZm9sbG93T25BY3Rpb24sIFtpZGVudCwgeCwgeV0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZXZ0LnRhcmdldC5jbGFzc05hbWUuaW5jbHVkZXMoJ21vdmFibGUnKSkge1xuICAgICAgICAgICAgaWYgKGV2dC50YXJnZXQubm9kZU5hbWUgPT0gJ0lNRycpIHtcbiAgICAgICAgICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdGF0ZS5kcmFnSW5mbykge1xuICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuc3R5bGUudG9wID0gKGV2dC5wYWdlWSAtIHN0YXRlLmRyYWdJbmZvLm9mZnNldFkpICsgJ3B4JztcbiAgICAgICAgICAgICAgICBldnQudGFyZ2V0LnN0eWxlLmxlZnQgPSAoZXZ0LnBhZ2VYIC0gc3RhdGUuZHJhZ0luZm8ub2Zmc2V0WCkgKyAncHgnO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5yZXNpemVJbmZvKSB7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLnJlc2l6ZUluZm8ud2lkdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5zdHlsZS53aWR0aCA9IChldnQucGFnZVggLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUubGVmdClcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gdG9QeChldnQudGFyZ2V0LnN0eWxlLnBhZGRpbmdMZWZ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUucGFkZGluZ1JpZ2h0KSkgKyAncHgnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuc3R5bGUuaGVpZ2h0ID0gKGV2dC5wYWdlWSAtIHN0YXRlLnJlc2l6ZUluZm8uaGVpZ2h0IC8vIHRoZSBlZGl0YmFyIVxuICAgICAgICAgICAgICAgICAgICAgICAgLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUudG9wKVxuICAgICAgICAgICAgICAgICAgICAgICAgLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUucGFkZGluZ1RvcClcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gdG9QeChldnQudGFyZ2V0LnN0eWxlLnBhZGRpbmdCb3R0b20pKSArICdweCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBldnQudGFyZ2V0LnN0eWxlLmN1cnNvciA9XG4gICAgICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuY2xpZW50SGVpZ2h0IC0gZXZ0Lm9mZnNldFkgPCAxMFxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnbnMtcmVzaXplJ1xuICAgICAgICAgICAgICAgICAgICAgICAgOiAoZXZ0LnRhcmdldC5jbGllbnRXaWR0aCAtIGV2dC5vZmZzZXRYIDwgMTBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdldy1yZXNpemUnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdFN0b3JlO1xuIiwiY29uc3QgRWRpdE1vZGFsU3RvcmUgPSAoc3RhdGUsIGVtaXR0ZXIpID0+IHtcbiAgICBlbWl0dGVyLm9uKCdjbG9zZUVkaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBudWxsO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IG51bGw7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdGaWVsZCA9IG51bGw7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IG51bGw7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCd0b2dnbGVGdW5jdGlvbkVkaXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuZWRpdGluZ0Z1bmN0aW9uID0gc3RhdGUuZWRpdGluZ0Z1bmN0aW9uID8gZmFsc2UgOiB0cnVlO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbigncHJvcGVydHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBsZXQgcHJvcE5hbWUgPSBldmVudC50YXJnZXQubmFtZTtcbiAgICAgICAgbGV0IG5ld1ZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgICBsZXQgZWRpdFBhdGggPSBzdGF0ZS5lZGl0aW5nUGF0aDtcblxuICAgICAgICBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV1bcHJvcE5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgIGlmIChlZGl0UGF0aFswXSA9PT0gJ2NhcmRzJykge1xuICAgICAgICAgICAgc3RhdGUuY2FyZCA9IHN0YXRlW2VkaXRQYXRoWzBdXVtlZGl0UGF0aFsxXV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kID0gc3RhdGVbZWRpdFBhdGhbMF1dW2VkaXRQYXRoWzFdXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nRWxlbWVudCkge1xuICAgICAgICAgICAgc3RhdGUuZWRpdGluZ0VsZW1lbnQgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ0ZpZWxkKSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nRmllbGQgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gLy8gaG1tIGRvIHdlIG5lZWQgYSByZWZhY3Rvcj8gTUFBQUFZWVlZWUJFXG5cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdFN0YWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gc3RhdGUuZWRpdGluZ0ZpZWxkID0gc3RhdGUuZWRpdGluZ0ltYWdlID0gbnVsbDtcbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBbJ3N0YWNrJ107XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzdGFja1Byb3BlcnR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdQYXRoICYmIHN0YXRlLmVkaXRpbmdQYXRoWzBdID09PSAnc3RhY2snKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGV2ZW50LnRhcmdldC5uYW1lO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG5cbiAgICAgICAgICAgIGlmIChbJ2NvbG9yJ10uaW5jbHVkZXMocHJvcE5hbWUpKSB7IC8vIGxpc3Qgd2lsbCBleHBhbmQgaW4gZnV0dXJlLCBvYnZzXG4gICAgICAgICAgICAgICAgc3RhdGVbcHJvcE5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRNb2RhbFN0b3JlO1xuIiwiY29uc3Qge21vZEVudiwgbW9kUGF0aH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgRWxlbWVudFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgY29uc3QgY2hhbmdlID0gbW9kRW52KHN0YXRlLCBlbWl0dGVyKTtcbiAgICBjb25zdCBwb2tlID0gbW9kUGF0aChzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBjb25zdCBibGFua0VsZW1lbnQgPSB7XG4gICAgICAgIFwidG9wXCI6IFwiMzAwcHhcIixcbiAgICAgICAgXCJsZWZ0XCI6IFwiMzAwcHhcIixcbiAgICAgICAgXCJoZWlnaHRcIjogXCIzNXB4XCIsXG4gICAgICAgIFwid2lkdGhcIjogXCIxMDBweFwiLFxuICAgICAgICBcImNvbG9yXCI6IFwiI2RkZFwiLFxuICAgICAgICBcInRleHRcIjogXCJcIixcbiAgICAgICAgXCJmb250XCI6IFwiXCIsXG4gICAgICAgIFwic2l6ZVwiOiBcIjEuNnJlbVwiLFxuICAgICAgICBcInN0eWxlXCI6IFwiXCIsXG4gICAgICAgIFwidGV4dENvbG9yXCI6IFwiIzMzM1wiLFxuICAgICAgICBcImNsYXNzXCI6IFwiXCIsXG4gICAgICAgIFwiYmVoYXZpb3JcIjogW11cbiAgICB9O1xuXG4gICAgZW1pdHRlci5vbignbmV3RWxlbWVudCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuZWxlbWVudHMucHVzaChPYmplY3QuYXNzaWduKHt9LCBibGFua0VsZW1lbnQpKTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2VkaXRFbGVtZW50JywgYXN5bmMgZnVuY3Rpb24oW2VsZW1lbnQsIGluZGV4LCBpc0NhcmQgPSBmYWxzZV0pIHtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0TW9kZSkge1xuICAgICAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCd0b2dnbGVFZGl0TW9kZScsIGlzQ2FyZCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgcGF0aCA9IGlzQ2FyZCA/IFsnY2FyZHMnXSA6IFsnYmFja2dyb3VuZHMnXTtcbiAgICAgICAgcGF0aC5wdXNoKGlzQ2FyZCA/IHN0YXRlLmN1cnJlbnRDYXJkIDogc3RhdGUuY3VycmVudEJhY2tncm91bmQpO1xuICAgICAgICBwYXRoID0gcGF0aC5jb25jYXQoWydlbGVtZW50cycsIGluZGV4XSk7XG5cbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBwYXRoO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZS5lZGl0aW5nRmllbGQgPSBudWxsO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IGVsZW1lbnQ7XG5cbiAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdyZW5kZXInKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ21vdmVFbGVtZW50JywgZnVuY3Rpb24oW2luZGV4LCB4LCB5XSkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2FyZC5lbGVtZW50c1tpbmRleF0sXG4gICAgICAgICAgICAgICAge3RvcDogeSwgbGVmdDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbigncmVzaXplRWxlbWVudCcsIGZ1bmN0aW9uKFtpbmRleCwgeCwgeV0pIHtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKGNhcmQuZWxlbWVudHNbaW5kZXhdLFxuICAgICAgICAgICAgICAgIHtoZWlnaHQ6IHksIHdpZHRoOiB4fSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzZXRCZWhhdmlvck9iaicsIGZ1bmN0aW9uKFtwYXRoLCB2YWx1ZV0pIHtcbiAgICAgICAgcG9rZShwYXRoLCB2YWx1ZSk7XG4gICAgICAgIC8vIHJlZHVuZGFudGx5IHJlbmRlcmluZyBiZWNhdXNlIHNlbGVjdCBlbGVtZW50cyBhcmUgdGhlIHdvcnN0XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBhc3luY0VtaXQoKSB7XG4gICAgICAgIGxldCBhcmdzID0gWy4uLmFyZ3VtZW50c107XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQuYXBwbHkoZW1pdHRlciwgYXJncyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmUsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBlbWl0dGVyLm9uKCdkZWxldGVFbGVtZW50JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3RhdGUuZWRpdGluZ1BhdGhbc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoIC0gMV07XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgY2FyZC5lbGVtZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ2Nsb3NlRWRpdCcpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbGVtZW50U3RvcmU7XG4iLCJjb25zdCB7bW9kRW52LCBtb2RQYXRofSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBzYXZlRmllbGRUb1N0YXRlID0gZnVuY3Rpb24oZXZlbnQsIGZpZWxkLCBzdGF0ZSkge1xuICAgIGxldCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICBpZiAoc3RhdGUuY2FyZC5maWVsZHNbZmllbGQubmFtZV0pIHtcbiAgICAgICAgc3RhdGUuY2FyZC5maWVsZHNbZmllbGQubmFtZV0udmFsdWUgPSBuZXdWYWx1ZTtcbiAgICAgICAgc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdLmZpZWxkc1tmaWVsZC5uYW1lXS52YWx1ZSA9IG5ld1ZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUubG9nKFwiYmFja2dyb3VuZCBmaWVsZD9cIik7XG4gICAgICAgIHN0YXRlLmNhcmQudmFsdWVzW2ZpZWxkLm5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXS52YWx1ZXNbZmllbGQubmFtZV0gPSBuZXdWYWx1ZTtcbiAgICB9XG59O1xuXG5jb25zdCBGaWVsZFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbihcImZpZWxkY2hhbmdlXCIsIGZ1bmN0aW9uKFtldmVudCwgZmllbGRdKSB7XG4gICAgICAgIHNhdmVGaWVsZFRvU3RhdGUoZXZlbnQsIGZpZWxkLCBzdGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KFwicmVuZGVyXCIpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KFwic2F2ZVwiKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSk7XG4gICAgZW1pdHRlci5vbihcImZpZWxkS2V5VXBcIiwgKFtldmVudCwgZmllbGRdKSA9PiB7XG4gICAgICAgIHNhdmVGaWVsZFRvU3RhdGUoZXZlbnQsIGZpZWxkLCBzdGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KFwic2F2ZVwiKSwgMSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBibGFua0ZpZWxkID0ge1xuICAgICAgICBuYW1lOiBcIlwiLFxuICAgICAgICB0b3A6IFwiMzAwcHhcIixcbiAgICAgICAgbGVmdDogXCIzMDBweFwiLFxuICAgICAgICBoZWlnaHQ6IFwiMTRweFwiLFxuICAgICAgICB3aWR0aDogXCIxODBweFwiLFxuICAgICAgICBjb2xvcjogXCJcIixcbiAgICAgICAgZm9udDogXCJcIixcbiAgICAgICAgc2l6ZTogXCJcIixcbiAgICAgICAgc3R5bGU6IFwiXCIsXG4gICAgICAgIHRleHRDb2xvcjogXCJcIixcbiAgICAgICAgZmllbGRUeXBlOiBcInRleHRcIixcbiAgICAgICAgdmFsdWU6IFwiXCIsXG4gICAgICAgIG9wdGlvbnM6IFtdLFxuICAgICAgICBwbGFjZWhvbGRlcjogXCJcIixcbiAgICAgICAgYmVoYXZpb3I6IFtdXG4gICAgfTtcbiAgICBjb25zdCB1bmlxdWVGaWVsZE5hbWUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgbG9jYXRpb24gPVxuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPT09IFwiYmdFZGl0XCIgPyBzdGF0ZS5iYWNrZ3JvdW5kIDogc3RhdGUuY2FyZDtcbiAgICAgICAgbGV0IHRyeW51bSA9IDE7XG4gICAgICAgIGxldCB0cnlBTmFtZSA9IFwibmV3RmllbGRcIiArIHRyeW51bTtcbiAgICAgICAgd2hpbGUgKHR5cGVvZiBsb2NhdGlvblt0cnlBTmFtZV0gIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgICAgdHJ5QU5hbWUgPSBcIm5ld0ZpZWxkXCIgKyArK3RyeW51bTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ5QU5hbWU7XG4gICAgfTtcblxuICAgIGNvbnN0IGNoYW5nZSA9IG1vZEVudihzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBlbWl0dGVyLm9uKFwibmV3RmllbGRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBmaWVsZE5hbWUgPSB1bmlxdWVGaWVsZE5hbWUoKTtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBjYXJkLmZpZWxkc1tmaWVsZE5hbWVdID0gT2JqZWN0LmFzc2lnbih7fSwgYmxhbmtGaWVsZCwge1xuICAgICAgICAgICAgICAgIG5hbWU6IGZpZWxkTmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKFwibW92ZUZpZWxkXCIsIGZ1bmN0aW9uKFtmaWVsZE5hbWUsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmZpZWxkc1tmaWVsZE5hbWVdLFxuICAgICAgICAgICAgICAgIHt0b3A6IHksIGxlZnQ6IHh9KTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oXCJyZXNpemVGaWVsZFwiLCBmdW5jdGlvbihbZmllbGROYW1lLCB4LCB5XSkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2FyZC5maWVsZHNbZmllbGROYW1lXSxcbiAgICAgICAgICAgICAgICB7aGVpZ2h0OiB5LCB3aWR0aDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdEZpZWxkJywgZnVuY3Rpb24oW2ZpZWxkLCBuYW1lLCBpc0NhcmQgPSBmYWxzZV0pIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnJykge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCd0b2dnbGVFZGl0TW9kZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoc3RhdGUuZWRpdE1vZGUgPT09ICdiZ0VkaXQnICYmICFpc0NhcmQpIHx8XG4gICAgICAgICAgICAoc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZScgJiYgaXNDYXJkKSlcbiAgICAgICAge1xuICAgICAgICAgICAgbGV0IHBhdGggPSBpc0NhcmQgPyBbJ2NhcmRzJ10gOiBbJ2JhY2tncm91bmRzJ107XG4gICAgICAgICAgICBwYXRoLnB1c2goaXNDYXJkID8gc3RhdGUuY3VycmVudENhcmQgOiBzdGF0ZS5jdXJyZW50QmFja2dyb3VuZCk7XG4gICAgICAgICAgICBwYXRoID0gcGF0aC5jb25jYXQoWydmaWVsZHMnLCBuYW1lXSk7XG5cbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdQYXRoID0gcGF0aDtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdGaWVsZCA9IGZpZWxkO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzZXRGaWVsZE9wdGlvbnMnLCBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3RhdGUuZWRpdGluZ1BhdGhbc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoIC0gMV07XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgY2FyZC5maWVsZHNbaW5kZXhdLm9wdGlvbnMgPSBvcHRpb25zO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pXG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdkZWxldGVGaWVsZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHN0YXRlLmVkaXRpbmdQYXRoW3N0YXRlLmVkaXRpbmdQYXRoLmxlbmd0aCAtIDFdO1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBjYXJkLmZpZWxkc1tpbmRleF07XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgnY2xvc2VFZGl0Jyk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpZWxkU3RvcmU7XG4iLCJjb25zdCB7bW9kRW52fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBJbWFnZVN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbignYWRkSW1hZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAvLyBjb3BwZWQgYW5kIG1vZGlmaWVkIGZyb20gQHRhcmF2YW5jaWwncyBkYXQtcGhvdG8tYXBwXG4gICAgICAgIGlmIChldmVudC50YXJnZXQuZmlsZXMpIHtcbiAgICAgICAgICAgIGNvbnN0IHtmaWxlc30gPSBldmVudC50YXJnZXQ7XG4gICAgICAgICAgICBjb25zdCBhcmNoaXZlID0gbmV3IERhdEFyY2hpdmUod2luZG93LmxvY2F0aW9uKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmaWxlcy5sZW5ndGg7IGkgKz0gMSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IGZpbGVzW2ldO1xuXG4gICAgICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYC9pbWcvJHtmaWxlLm5hbWV9YDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3JpZW50YXRpb24gPSByZWFkT3JpZW50YXRpb25NZXRhZGF0YShyZWFkZXIucmVzdWx0KTtcblxuICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdCA9IGF3YWl0IGFyY2hpdmUuc3RhdChwYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzdGF0KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcGxhaW50ID1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYEltYWdlIHdpdGggdGhlIG5hbWUgXCIke2ZpbGUubmFtZX1cIiBhbHJlYWR5IGV4aXN0cy4gUmVwbGFjZSBpdD9gO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh3aW5kb3cuY29uZmlybShjb21wbGFpbnQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGFyY2hpdmUud3JpdGVGaWxlKHBhdGgsIHJlYWRlci5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBhcmNoaXZlLmNvbW1pdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRJbWFnZU9iamVjdChwYXRoLCBvcmllbnRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBhcmNoaXZlLndyaXRlRmlsZShwYXRoLCByZWFkZXIucmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGFyY2hpdmUuY29tbWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRJbWFnZU9iamVjdChwYXRoLCBvcmllbnRhdGlvbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5hZGRpbmdJbWFnZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKGZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gYXNzdW1pbmcgYSBmaWxlbmFtZSBmcm9tIHRoZSBtZW51IG9mIGV4aXN0aW5nIGZpbGVzXG4gICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnZhbHVlICE9PSBudWxsICYmIGV2ZW50LnRhcmdldC52YWx1ZSAhPSAnbnVsbCcpIHsgLy8gKnNpZ2gqXG4gICAgICAgICAgICAgICAgYWRkSW1hZ2VPYmplY3QoYC9pbWcvJHtldmVudC50YXJnZXQudmFsdWV9YCk7XG4gICAgICAgICAgICAgICAgc3RhdGUuYWRkaW5nSW1hZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGFkZEltYWdlT2JqZWN0KHBhdGgsIG9yaWVudGF0aW9uID0gMSkge1xuICAgICAgICBjb25zdCBuZXdndXkgPSB7XG4gICAgICAgICAgICB0b3A6ICczMDBweCcsXG4gICAgICAgICAgICBsZWZ0OiAnMzAwcHgnLFxuICAgICAgICAgICAgc3JjOiBwYXRoLFxuICAgICAgICAgICAgb3JpZW50YXRpb24sXG4gICAgICAgICAgICBiZWhhdmlvcjogW11cbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0Jykge1xuICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZHNbc3RhdGUuY3VycmVudEJhY2tncm91bmRdLmltYWdlcy5wdXNoKG5ld2d1eSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF0uaW1hZ2VzLnB1c2gobmV3Z3V5KTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIGFsc28gY3JpYmJlZCBmcm9tIGRhdC1waG90by1hcHAgYW5kIG5vdCBldmVuIG1vZGlmaWVkIGJlY2F1c2UgSSBhbSBub3Qgc21hcnRcbiAgICBmdW5jdGlvbiByZWFkT3JpZW50YXRpb25NZXRhZGF0YSAoYnVmKSB7XG4gICAgICAgIGNvbnN0IHNjYW5uZXIgPSBuZXcgRGF0YVZpZXcoYnVmKTtcbiAgICAgICAgbGV0IGlkeCA9IDA7XG4gICAgICAgIGxldCB2YWx1ZSA9IDE7IC8vIE5vbi1yb3RhdGVkIGlzIHRoZSBkZWZhdWx0XG5cbiAgICAgICAgaWYgKGJ1Zi5sZW5ndGggPCAyIHx8IHNjYW5uZXIuZ2V0VWludDE2KGlkeCkgIT0gMHhGRkQ4KSB7XG4gICAgICAgICAgLy8gbm90IGEgSlBFR1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlkeCArPSAyO1xuXG4gICAgICAgIGxldCBtYXhCeXRlcyA9IHNjYW5uZXIuYnl0ZUxlbmd0aDtcbiAgICAgICAgd2hpbGUoaWR4IDwgbWF4Qnl0ZXMgLSAyKSB7XG4gICAgICAgICAgbGV0IHVpbnQxNiA9IHNjYW5uZXIuZ2V0VWludDE2KGlkeCk7XG4gICAgICAgICAgaWR4ICs9IDI7XG4gICAgICAgICAgc3dpdGNoKHVpbnQxNikge1xuICAgICAgICAgICAgY2FzZSAweEZGRTE6IC8vIFN0YXJ0IG9mIEVYSUZcbiAgICAgICAgICAgICAgdmFyIGV4aWZMZW5ndGggPSBzY2FubmVyLmdldFVpbnQxNihpZHgpO1xuICAgICAgICAgICAgICBtYXhCeXRlcyA9IGV4aWZMZW5ndGggLSBpZHg7XG4gICAgICAgICAgICAgIGlkeCArPSAyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMHgwMTEyOiAvLyBPcmllbnRhdGlvbiB0YWdcbiAgICAgICAgICAgICAgLy8gUmVhZCB0aGUgdmFsdWUsIGl0cyA2IGJ5dGVzIGZ1cnRoZXIgb3V0XG4gICAgICAgICAgICAgIC8vIFNlZSBwYWdlIDEwMiBhdCB0aGUgZm9sbG93aW5nIFVSTFxuICAgICAgICAgICAgICAvLyBodHRwOi8vd3d3LmtvZGFrLmNvbS9nbG9iYWwvcGx1Z2lucy9hY3JvYmF0L2VuL3NlcnZpY2UvZGlnQ2FtL2V4aWZTdGFuZGFyZDIucGRmXG4gICAgICAgICAgICAgIHZhbHVlID0gc2Nhbm5lci5nZXRVaW50MTYoaWR4ICsgNiwgZmFsc2UpO1xuICAgICAgICAgICAgICBtYXhCeXRlcyA9IDA7IC8vIFN0b3Agc2Nhbm5pbmdcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBlbWl0dGVyLm9uKCdlZGl0SW1hZ2UnLCBmdW5jdGlvbihbaW1hZ2UsIGluZGV4LCBpc0NhcmQgPSBmYWxzZV0pIHtcbiAgICAgICAgY29uc29sZS5sb2coJ2VkaXRJbWFnZScsIHN0YXRlLmVkaXRNb2RlKTtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0TW9kZSkge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCd0b2dnbGVFZGl0TW9kZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IHBhdGggPSBpc0NhcmQgPyBbJ2NhcmRzJ10gOiBbJ2JhY2tncm91bmRzJ107XG4gICAgICAgIHBhdGgucHVzaChpc0NhcmQgPyBzdGF0ZS5jdXJyZW50Q2FyZCA6IHN0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kKTtcbiAgICAgICAgcGF0aCA9IHBhdGguY29uY2F0KFsnaW1hZ2VzJywgaW5kZXhdKTtcblxuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IHBhdGg7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gc3RhdGUuZWRpdGluZ0ZpZWxkID0gbnVsbDtcbiAgICAgICAgc3RhdGUuZWRpdGluZ0ltYWdlID0gaW1hZ2U7XG5cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGNoYW5nZSA9IG1vZEVudihzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBlbWl0dGVyLm9uKCdtb3ZlSW1hZ2UnLCBmdW5jdGlvbihbaW5kZXgsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmltYWdlc1tpbmRleF0sIHt0b3A6IHksIGxlZnQ6IHh9KTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3Jlc2l6ZUltYWdlJywgZnVuY3Rpb24oW2luZGV4LCB4LCB5XSkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2FyZC5pbWFnZXNbaW5kZXhdLCB7aGVpZ2h0OiB5LCB3aWR0aDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZGVsZXRlSW1hZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBzdGF0ZS5lZGl0aW5nUGF0aFtzdGF0ZS5lZGl0aW5nUGF0aC5sZW5ndGggLSAxXTtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBjYXJkLmltYWdlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ2Nsb3NlRWRpdCcpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbWFnZVN0b3JlO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuY29uc3QgdXVpZCA9IHJlcXVpcmUoJ3V1aWQvdjEnKTtcblxuXG5mdW5jdGlvbiBtb2RFbnYoc3RhdGUsIGVtaXR0ZXIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oaG93KSB7XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0TW9kZSA9PT0gJ2JnRWRpdCcpIHtcbiAgICAgICAgICAgIGxldCBuZXdCZ1N0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuYmFja2dyb3VuZHNbc3RhdGUuY3VycmVudEJhY2tncm91bmRdKTtcbiAgICAgICAgICAgIG5ld0JnU3RhdGUgPSBob3cobmV3QmdTdGF0ZSk7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kc1tzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF0gPSBzdGF0ZS5iYWNrZ3JvdW5kID0gbmV3QmdTdGF0ZTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5lZGl0TW9kZSA9PT0gJ2VkaXRNb2RlJykge1xuICAgICAgICAgICAgbGV0IG5ld0NhcmRTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXSk7XG4gICAgICAgICAgICBuZXdDYXJkU3RhdGUgPSBob3cobmV3Q2FyZFN0YXRlKTtcbiAgICAgICAgICAgIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXSA9IHN0YXRlLmNhcmQgPSBuZXdDYXJkU3RhdGU7XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH1cbn1cblxuLy8gaWYgc3RhdGUgZ2V0cyBiaWcgdGhpcyBtaWdodCBzZXJpb3VzbHkgbWVzcyB1cyB1cC4gbGV0J3Mgc2VlXG5mdW5jdGlvbiBtb2RQYXRoKHN0YXRlLCBlbWl0dGVyKSB7XG4gICAgY29uc3QgZ2V0QW5kUmVwbGFjZVBhdGggPSBmdW5jdGlvbihwYXRoLCB2YWx1ZSwgaW5XaGF0KSB7XG4gICAgICAgIGxldCBjdXJyVGFyZ2V0O1xuICAgICAgICBpZiAocGF0aC5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBjdXJyVGFyZ2V0ID0gcGF0aC5zaGlmdCgpO1xuICAgICAgICAgICAgaW5XaGF0W2N1cnJUYXJnZXRdID1cbiAgICAgICAgICAgICAgICBnZXRBbmRSZXBsYWNlUGF0aChwYXRoLCB2YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgQXJyYXkuaXNBcnJheShpbldoYXRbY3VyclRhcmdldF0pXG4gICAgICAgICAgICAgICAgICAgICAgICA/IFtdLmNvbmNhdChpbldoYXRbY3VyclRhcmdldF0pXG4gICAgICAgICAgICAgICAgICAgICAgICA6IE9iamVjdC5hc3NpZ24oe30sIGluV2hhdFtjdXJyVGFyZ2V0XSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaW5XaGF0W3BhdGhbMF1dID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluV2hhdDtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24ocGF0aCwgdmFsdWUpIHtcbiAgICAgICAgc3RhdGUgPSBnZXRBbmRSZXBsYWNlUGF0aChbXS5jb25jYXQocGF0aCksIHZhbHVlLCBzdGF0ZSk7XG4gICAgICAgIHN0YXRlLmNhcmQgPSBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF07XG4gICAgICAgIHN0YXRlLmJhY2tncm91bmQgPSBzdGF0ZS5iYWNrZ3JvdW5kc1tzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF07XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICB9LCAxKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGdldFBhdGgoc3RhdGUsIHBhdGgpIHtcbiAgICBjb25zdCBjb25zdW1lVGhpc1BhdGggPSBbXS5jb25jYXQocGF0aCk7XG4gICAgbGV0IHJldHVybmVkID0gc3RhdGVbY29uc3VtZVRoaXNQYXRoLnNoaWZ0KCldO1xuICAgIHdoaWxlIChjb25zdW1lVGhpc1BhdGgubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybmVkID0gcmV0dXJuZWRbY29uc3VtZVRoaXNQYXRoLnNoaWZ0KCldO1xuICAgIH1cbiAgICByZXR1cm4gcmV0dXJuZWQ7XG59XG5cbmZ1bmN0aW9uIHRvUHgoc3RyVmFsKSB7XG4gICAgY29uc3QgdHJ5YXZhbCA9IHBhcnNlSW50KHN0clZhbC5zdWJzdHJpbmcoMCwgc3RyVmFsLmluZGV4T2YoJ3B4JykpKTtcbiAgICByZXR1cm4gTnVtYmVyLmlzTmFOKHRyeWF2YWwpID8gMCA6IHRyeWF2YWw7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdE9wdGlvbih2YWwsIGxhYmVsLCBjb21wYXJlVmFsLCByZWFjdEtleSkge1xuICAgIGlmICh0eXBlb2YgY29tcGFyZVZhbCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgY29tcGFyZVZhbCA9IGxhYmVsO1xuICAgICAgICBsYWJlbCA9IHZhbDtcbiAgICB9XG4gICAgY29uc3Qgb3B0cyA9IFtcbiAgICAgICAgaHRtbGA8b3B0aW9uIGlkPVwiJHtyZWFjdEtleSB8fCAnJ31cIiB2YWx1ZT1cIiR7dmFsfVwiIHNlbGVjdGVkPVwic2VsZWN0ZWRcIj4ke2xhYmVsfTwvb3B0aW9uPmAsXG4gICAgICAgIGh0bWxgPG9wdGlvbiBpZD1cIiR7cmVhY3RLZXkgfHwgJyd9XCIgdmFsdWU9XCIke3ZhbH1cIj4ke2xhYmVsfTwvb3B0aW9uPmBcbiAgICBdO1xuICAgIC8vIGFsd2F5cyByZS1yZW5kZXIgb3B0aW9uc1xuICAgIG9wdHNbMF0uaXNTYW1lTm9kZSA9IG9wdHNbMV0uaXNTYW1lTm9kZSA9ICgpID0+IGZhbHNlO1xuXG4gICAgaWYgKHR5cGVvZiBjb21wYXJlVmFsID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgcmV0dXJuIGNvbXBhcmVWYWwgPyBvcHRzWzBdIDogb3B0c1sxXTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbXBhcmVWYWwgPT0gdmFsID8gb3B0c1swXSA6IG9wdHNbMV07XG59XG5cbmZ1bmN0aW9uIGNoZWNrQm94KGxhYmVsLCBjaGVja2QsIGhhbmRsZXIpIHtcbiAgICBjb25zdCBteUlkID0gdXVpZCgpO1xuICAgIGNvbnN0IG9wdHMgPSBbXG4gICAgICAgIGh0bWxgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG9uY2hhbmdlPSR7aGFuZGxlcn0gY2hlY2tlZD1cImNoZWNrZWRcIiBuYW1lPVwiJHtteUlkfVwiIC8+YCxcbiAgICAgICAgaHRtbGA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgb25jaGFuZ2U9JHtoYW5kbGVyfSBuYW1lPVwiJHtteUlkfVwiIC8+YFxuICAgIF07XG4gICAgcmV0dXJuIGh0bWxgPHNwYW4gY2xhc3M9XCJjaGVja2JveFwiPlxuICAgICAgICAke2NoZWNrZCA/IG9wdHNbMF0gOiBvcHRzWzFdfVxuICAgICAgICA8bGFiZWwgZm9yPVwiJHtteUlkfVwiPiR7bGFiZWx9PC9sYWJlbD5cbiAgICA8L3NwYW4+YDtcbn1cblxuZnVuY3Rpb24gZmllbGRzV2l0aFZhbHVlcyhzdGF0ZSkge1xuICAgIGNvbnN0IGxlQ2FyZCA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXSk7XG4gICAgY29uc3QgbGVCZyA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXSk7XG4gICAgY29uc3QgZmllbGRzV2l0aFZhbHVlcyA9IE9iamVjdC5rZXlzKGxlQ2FyZC5maWVsZHMpLnJlZHVjZSgob2JqLCBmbGQpID0+IHtcbiAgICAgICAgb2JqW2ZsZF0gPSBsZUNhcmQuZmllbGRzW2ZsZF0udmFsdWU7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfSwge30pO1xuICAgIE9iamVjdC5hc3NpZ24oZmllbGRzV2l0aFZhbHVlcywgbGVDYXJkLnZhbHVlcyk7XG4gICAgLy8gb2ggZ29kIGZpZWxkcyB3aWxsIG5lZWQgdGhlIGNvbmNlcHQgb2YgZGVmYXVsdCB2YWx1ZXMsIGZvciByYWRpb3NcbiAgICAvLyBhdCBsZWFzdCB3aGVuIGZpcnN0IGNyZWF0ZWRcbiAgICByZXR1cm4gZmllbGRzV2l0aFZhbHVlcztcbn1cblxuZnVuY3Rpb24gY29sb3Ioc3RhdGUpIHtcbiAgICBpZiAoc3RhdGUuY2FyZCAmJiBzdGF0ZS5jYXJkLmNvbG9yKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkLmNvbG9yO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuYmFja2dyb3VuZCAmJiBzdGF0ZS5iYWNrZ3JvdW5kLmNvbG9yKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5iYWNrZ3JvdW5kLmNvbG9yO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuY29sb3IpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNvbG9yO1xuICAgIH1cbiAgICByZXR1cm4gJ2luaGVyaXQnO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHttb2RFbnYsIG1vZFBhdGgsIGdldFBhdGgsIHRvUHgsIHNlbGVjdE9wdGlvbiwgY2hlY2tCb3gsIGZpZWxkc1dpdGhWYWx1ZXMsIGNvbG9yfTtcbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoJ2dsb2JhbC9kb2N1bWVudCcpXG52YXIgaHlwZXJ4ID0gcmVxdWlyZSgnaHlwZXJ4JylcbnZhciBvbmxvYWQgPSByZXF1aXJlKCdvbi1sb2FkJylcblxudmFyIFNWR05TID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJ1xudmFyIFhMSU5LTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaydcblxudmFyIEJPT0xfUFJPUFMgPSB7XG4gIGF1dG9mb2N1czogMSxcbiAgY2hlY2tlZDogMSxcbiAgZGVmYXVsdGNoZWNrZWQ6IDEsXG4gIGRpc2FibGVkOiAxLFxuICBmb3Jtbm92YWxpZGF0ZTogMSxcbiAgaW5kZXRlcm1pbmF0ZTogMSxcbiAgcmVhZG9ubHk6IDEsXG4gIHJlcXVpcmVkOiAxLFxuICBzZWxlY3RlZDogMSxcbiAgd2lsbHZhbGlkYXRlOiAxXG59XG52YXIgQ09NTUVOVF9UQUcgPSAnIS0tJ1xudmFyIFNWR19UQUdTID0gW1xuICAnc3ZnJyxcbiAgJ2FsdEdseXBoJywgJ2FsdEdseXBoRGVmJywgJ2FsdEdseXBoSXRlbScsICdhbmltYXRlJywgJ2FuaW1hdGVDb2xvcicsXG4gICdhbmltYXRlTW90aW9uJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2NsaXBQYXRoJywgJ2NvbG9yLXByb2ZpbGUnLFxuICAnY3Vyc29yJywgJ2RlZnMnLCAnZGVzYycsICdlbGxpcHNlJywgJ2ZlQmxlbmQnLCAnZmVDb2xvck1hdHJpeCcsXG4gICdmZUNvbXBvbmVudFRyYW5zZmVyJywgJ2ZlQ29tcG9zaXRlJywgJ2ZlQ29udm9sdmVNYXRyaXgnLCAnZmVEaWZmdXNlTGlnaHRpbmcnLFxuICAnZmVEaXNwbGFjZW1lbnRNYXAnLCAnZmVEaXN0YW50TGlnaHQnLCAnZmVGbG9vZCcsICdmZUZ1bmNBJywgJ2ZlRnVuY0InLFxuICAnZmVGdW5jRycsICdmZUZ1bmNSJywgJ2ZlR2F1c3NpYW5CbHVyJywgJ2ZlSW1hZ2UnLCAnZmVNZXJnZScsICdmZU1lcmdlTm9kZScsXG4gICdmZU1vcnBob2xvZ3knLCAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsXG4gICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLCAnZmVUdXJidWxlbmNlJywgJ2ZpbHRlcicsICdmb250JywgJ2ZvbnQtZmFjZScsXG4gICdmb250LWZhY2UtZm9ybWF0JywgJ2ZvbnQtZmFjZS1uYW1lJywgJ2ZvbnQtZmFjZS1zcmMnLCAnZm9udC1mYWNlLXVyaScsXG4gICdmb3JlaWduT2JqZWN0JywgJ2cnLCAnZ2x5cGgnLCAnZ2x5cGhSZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLCAnbGluZScsXG4gICdsaW5lYXJHcmFkaWVudCcsICdtYXJrZXInLCAnbWFzaycsICdtZXRhZGF0YScsICdtaXNzaW5nLWdseXBoJywgJ21wYXRoJyxcbiAgJ3BhdGgnLCAncGF0dGVybicsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JhZGlhbEdyYWRpZW50JywgJ3JlY3QnLFxuICAnc2V0JywgJ3N0b3AnLCAnc3dpdGNoJywgJ3N5bWJvbCcsICd0ZXh0JywgJ3RleHRQYXRoJywgJ3RpdGxlJywgJ3RyZWYnLFxuICAndHNwYW4nLCAndXNlJywgJ3ZpZXcnLCAndmtlcm4nXG5dXG5cbmZ1bmN0aW9uIGJlbENyZWF0ZUVsZW1lbnQgKHRhZywgcHJvcHMsIGNoaWxkcmVuKSB7XG4gIHZhciBlbFxuXG4gIC8vIElmIGFuIHN2ZyB0YWcsIGl0IG5lZWRzIGEgbmFtZXNwYWNlXG4gIGlmIChTVkdfVEFHUy5pbmRleE9mKHRhZykgIT09IC0xKSB7XG4gICAgcHJvcHMubmFtZXNwYWNlID0gU1ZHTlNcbiAgfVxuXG4gIC8vIElmIHdlIGFyZSB1c2luZyBhIG5hbWVzcGFjZVxuICB2YXIgbnMgPSBmYWxzZVxuICBpZiAocHJvcHMubmFtZXNwYWNlKSB7XG4gICAgbnMgPSBwcm9wcy5uYW1lc3BhY2VcbiAgICBkZWxldGUgcHJvcHMubmFtZXNwYWNlXG4gIH1cblxuICAvLyBDcmVhdGUgdGhlIGVsZW1lbnRcbiAgaWYgKG5zKSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsIHRhZylcbiAgfSBlbHNlIGlmICh0YWcgPT09IENPTU1FTlRfVEFHKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQocHJvcHMuY29tbWVudClcbiAgfSBlbHNlIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKVxuICB9XG5cbiAgLy8gSWYgYWRkaW5nIG9ubG9hZCBldmVudHNcbiAgaWYgKHByb3BzLm9ubG9hZCB8fCBwcm9wcy5vbnVubG9hZCkge1xuICAgIHZhciBsb2FkID0gcHJvcHMub25sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgdmFyIHVubG9hZCA9IHByb3BzLm9udW5sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgb25sb2FkKGVsLCBmdW5jdGlvbiBiZWxPbmxvYWQgKCkge1xuICAgICAgbG9hZChlbClcbiAgICB9LCBmdW5jdGlvbiBiZWxPbnVubG9hZCAoKSB7XG4gICAgICB1bmxvYWQoZWwpXG4gICAgfSxcbiAgICAvLyBXZSBoYXZlIHRvIHVzZSBub24tc3RhbmRhcmQgYGNhbGxlcmAgdG8gZmluZCB3aG8gaW52b2tlcyBgYmVsQ3JlYXRlRWxlbWVudGBcbiAgICBiZWxDcmVhdGVFbGVtZW50LmNhbGxlci5jYWxsZXIuY2FsbGVyKVxuICAgIGRlbGV0ZSBwcm9wcy5vbmxvYWRcbiAgICBkZWxldGUgcHJvcHMub251bmxvYWRcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgcHJvcGVydGllc1xuICBmb3IgKHZhciBwIGluIHByb3BzKSB7XG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICB2YXIga2V5ID0gcC50b0xvd2VyQ2FzZSgpXG4gICAgICB2YXIgdmFsID0gcHJvcHNbcF1cbiAgICAgIC8vIE5vcm1hbGl6ZSBjbGFzc05hbWVcbiAgICAgIGlmIChrZXkgPT09ICdjbGFzc25hbWUnKSB7XG4gICAgICAgIGtleSA9ICdjbGFzcydcbiAgICAgICAgcCA9ICdjbGFzcydcbiAgICAgIH1cbiAgICAgIC8vIFRoZSBmb3IgYXR0cmlidXRlIGdldHMgdHJhbnNmb3JtZWQgdG8gaHRtbEZvciwgYnV0IHdlIGp1c3Qgc2V0IGFzIGZvclxuICAgICAgaWYgKHAgPT09ICdodG1sRm9yJykge1xuICAgICAgICBwID0gJ2ZvcidcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgaXMgYm9vbGVhbiwgc2V0IGl0c2VsZiB0byB0aGUga2V5XG4gICAgICBpZiAoQk9PTF9QUk9QU1trZXldKSB7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgdmFsID0ga2V5XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgY29udGludWVcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgcHJlZmVycyBiZWluZyBzZXQgZGlyZWN0bHkgdnMgc2V0QXR0cmlidXRlXG4gICAgICBpZiAoa2V5LnNsaWNlKDAsIDIpID09PSAnb24nKSB7XG4gICAgICAgIGVsW3BdID0gdmFsXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobnMpIHtcbiAgICAgICAgICBpZiAocCA9PT0gJ3hsaW5rOmhyZWYnKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyhYTElOS05TLCBwLCB2YWwpXG4gICAgICAgICAgfSBlbHNlIGlmICgvXnhtbG5zKCR8OikvaS50ZXN0KHApKSB7XG4gICAgICAgICAgICAvLyBza2lwIHhtbG5zIGRlZmluaXRpb25zXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKG51bGwsIHAsIHZhbClcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWwuc2V0QXR0cmlidXRlKHAsIHZhbClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGVuZENoaWxkIChjaGlsZHMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2hpbGRzKSkgcmV0dXJuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gY2hpbGRzW2ldXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgICBhcHBlbmRDaGlsZChub2RlKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdudW1iZXInIHx8XG4gICAgICAgIHR5cGVvZiBub2RlID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgdHlwZW9mIG5vZGUgPT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgbm9kZSBpbnN0YW5jZW9mIERhdGUgfHxcbiAgICAgICAgbm9kZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICBub2RlID0gbm9kZS50b1N0cmluZygpXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKGVsLmxhc3RDaGlsZCAmJiBlbC5sYXN0Q2hpbGQubm9kZU5hbWUgPT09ICcjdGV4dCcpIHtcbiAgICAgICAgICBlbC5sYXN0Q2hpbGQubm9kZVZhbHVlICs9IG5vZGVcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShub2RlKVxuICAgICAgfVxuXG4gICAgICBpZiAobm9kZSAmJiBub2RlLm5vZGVUeXBlKSB7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpXG4gICAgICB9XG4gICAgfVxuICB9XG4gIGFwcGVuZENoaWxkKGNoaWxkcmVuKVxuXG4gIHJldHVybiBlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGh5cGVyeChiZWxDcmVhdGVFbGVtZW50LCB7Y29tbWVudHM6IHRydWV9KVxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IG1vZHVsZS5leHBvcnRzXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID0gYmVsQ3JlYXRlRWxlbWVudFxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdiZWwnKVxuIiwidmFyIGRvY3VtZW50UmVhZHkgPSByZXF1aXJlKCdkb2N1bWVudC1yZWFkeScpXG52YXIgbmFub2hpc3RvcnkgPSByZXF1aXJlKCduYW5vaGlzdG9yeScpXG52YXIgbmFub3JvdXRlciA9IHJlcXVpcmUoJ25hbm9yb3V0ZXInKVxudmFyIG5hbm9tb3VudCA9IHJlcXVpcmUoJ25hbm9tb3VudCcpXG52YXIgbmFub21vcnBoID0gcmVxdWlyZSgnbmFub21vcnBoJylcbnZhciBuYW5vaHJlZiA9IHJlcXVpcmUoJ25hbm9ocmVmJylcbnZhciBuYW5vcmFmID0gcmVxdWlyZSgnbmFub3JhZicpXG52YXIgbmFub2J1cyA9IHJlcXVpcmUoJ25hbm9idXMnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gQ2hvb1xuXG5mdW5jdGlvbiBDaG9vIChvcHRzKSB7XG4gIG9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgdmFyIHJvdXRlck9wdHMgPSB7XG4gICAgZGVmYXVsdDogb3B0cy5kZWZhdWx0Um91dGUgfHwgJy80MDQnLFxuICAgIGN1cnJ5OiB0cnVlXG4gIH1cblxuICB2YXIgdGltaW5nRW5hYmxlZCA9IG9wdHMudGltaW5nID09PSB1bmRlZmluZWQgPyB0cnVlIDogb3B0cy50aW1pbmdcbiAgdmFyIGhhc1dpbmRvdyA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gIHZhciBoYXNQZXJmb3JtYW5jZSA9IGhhc1dpbmRvdyAmJiB3aW5kb3cucGVyZm9ybWFuY2UgJiYgd2luZG93LnBlcmZvcm1hbmNlLm1hcmtcbiAgdmFyIHJvdXRlciA9IG5hbm9yb3V0ZXIocm91dGVyT3B0cylcbiAgdmFyIGJ1cyA9IG5hbm9idXMoKVxuICB2YXIgcmVyZW5kZXIgPSBudWxsXG4gIHZhciB0cmVlID0gbnVsbFxuICB2YXIgc3RhdGUgPSB7fVxuXG4gIHJldHVybiB7XG4gICAgdG9TdHJpbmc6IHRvU3RyaW5nLFxuICAgIHVzZTogcmVnaXN0ZXIsXG4gICAgbW91bnQ6IG1vdW50LFxuICAgIHJvdXRlcjogcm91dGVyLFxuICAgIHJvdXRlOiByb3V0ZSxcbiAgICBzdGFydDogc3RhcnRcbiAgfVxuXG4gIGZ1bmN0aW9uIHJvdXRlIChyb3V0ZSwgaGFuZGxlcikge1xuICAgIHJvdXRlci5vbihyb3V0ZSwgZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhdGUucGFyYW1zID0gcGFyYW1zXG4gICAgICAgIHJldHVybiBoYW5kbGVyKHN0YXRlLCBlbWl0KVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlciAoY2IpIHtcbiAgICBjYihzdGF0ZSwgYnVzKVxuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnQgKCkge1xuICAgIGlmIChvcHRzLmhpc3RvcnkgIT09IGZhbHNlKSB7XG4gICAgICBuYW5vaGlzdG9yeShmdW5jdGlvbiAoaHJlZikge1xuICAgICAgICBidXMuZW1pdCgncHVzaFN0YXRlJylcbiAgICAgIH0pXG5cbiAgICAgIGJ1cy5wcmVwZW5kTGlzdGVuZXIoJ3B1c2hTdGF0ZScsIHVwZGF0ZUhpc3RvcnkuYmluZChudWxsLCAncHVzaCcpKVxuICAgICAgYnVzLnByZXBlbmRMaXN0ZW5lcigncmVwbGFjZVN0YXRlJywgdXBkYXRlSGlzdG9yeS5iaW5kKG51bGwsICdyZXBsYWNlJykpXG5cbiAgICAgIGlmIChvcHRzLmhyZWYgIT09IGZhbHNlKSB7XG4gICAgICAgIG5hbm9ocmVmKGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAgICAgICAgIHZhciBocmVmID0gbG9jYXRpb24uaHJlZlxuICAgICAgICAgIHZhciBjdXJySHJlZiA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmXG4gICAgICAgICAgaWYgKGhyZWYgPT09IGN1cnJIcmVmKSByZXR1cm5cbiAgICAgICAgICBidXMuZW1pdCgncHVzaFN0YXRlJywgaHJlZilcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVIaXN0b3J5IChtb2RlLCBocmVmKSB7XG4gICAgICBpZiAoaHJlZikgd2luZG93Lmhpc3RvcnlbbW9kZSArICdTdGF0ZSddKHt9LCBudWxsLCBocmVmKVxuICAgICAgYnVzLmVtaXQoJ3JlbmRlcicpXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2Nyb2xsSW50b1ZpZXcoKVxuICAgICAgfSwgMClcbiAgICB9XG5cbiAgICByZXJlbmRlciA9IG5hbm9yYWYoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKGhhc1BlcmZvcm1hbmNlICYmIHRpbWluZ0VuYWJsZWQpIHtcbiAgICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsoJ2Nob286cmVuZGVyU3RhcnQnKVxuICAgICAgfVxuICAgICAgdmFyIG5ld1RyZWUgPSByb3V0ZXIoY3JlYXRlTG9jYXRpb24oKSlcbiAgICAgIHRyZWUgPSBuYW5vbW9ycGgodHJlZSwgbmV3VHJlZSlcbiAgICAgIGFzc2VydC5ub3RFcXVhbCh0cmVlLCBuZXdUcmVlLCAnY2hvby5zdGFydDogYSBkaWZmZXJlbnQgbm9kZSB0eXBlIHdhcyByZXR1cm5lZCBhcyB0aGUgcm9vdCBub2RlIG9uIGEgcmVyZW5kZXIuIE1ha2Ugc3VyZSB0aGF0IHRoZSByb290IG5vZGUgaXMgYWx3YXlzIHRoZSBzYW1lIHR5cGUgdG8gcHJldmVudCB0aGUgYXBwbGljYXRpb24gZnJvbSBiZWluZyB1bm1vdW50ZWQuJylcbiAgICAgIGlmIChoYXNQZXJmb3JtYW5jZSAmJiB0aW1pbmdFbmFibGVkKSB7XG4gICAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5tYXJrKCdjaG9vOnJlbmRlckVuZCcpXG4gICAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5tZWFzdXJlKCdjaG9vOnJlbmRlcicsICdjaG9vOnJlbmRlclN0YXJ0JywgJ2Nob286cmVuZGVyRW5kJylcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgYnVzLnByZXBlbmRMaXN0ZW5lcigncmVuZGVyJywgcmVyZW5kZXIpXG5cbiAgICBkb2N1bWVudFJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICAgIGJ1cy5lbWl0KCdET01Db250ZW50TG9hZGVkJylcbiAgICB9KVxuXG4gICAgdHJlZSA9IHJvdXRlcihjcmVhdGVMb2NhdGlvbigpKVxuXG4gICAgcmV0dXJuIHRyZWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXQgKGV2ZW50TmFtZSwgZGF0YSkge1xuICAgIGJ1cy5lbWl0KGV2ZW50TmFtZSwgZGF0YSlcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdW50IChzZWxlY3Rvcikge1xuICAgIHZhciBuZXdUcmVlID0gc3RhcnQoKVxuICAgIGRvY3VtZW50UmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHJvb3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKVxuICAgICAgYXNzZXJ0Lm9rKHJvb3QsICdjaG9vLm1vdW50OiBjb3VsZCBub3QgcXVlcnkgc2VsZWN0b3I6ICcgKyBzZWxlY3RvcilcbiAgICAgIG5hbm9tb3VudChyb290LCBuZXdUcmVlKVxuICAgICAgdHJlZSA9IHJvb3RcbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gdG9TdHJpbmcgKGxvY2F0aW9uLCBfc3RhdGUpIHtcbiAgICBzdGF0ZSA9IF9zdGF0ZSB8fCB7fVxuICAgIHZhciBodG1sID0gcm91dGVyKGxvY2F0aW9uKVxuICAgIHJldHVybiBodG1sLnRvU3RyaW5nKClcbiAgfVxufVxuXG5mdW5jdGlvbiBzY3JvbGxJbnRvVmlldyAoKSB7XG4gIHZhciBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2hcbiAgaWYgKGhhc2gpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihoYXNoKVxuICAgICAgaWYgKGVsKSBlbC5zY3JvbGxJbnRvVmlldyh0cnVlKVxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTG9jYXRpb24gKCkge1xuICB2YXIgcGF0aG5hbWUgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvJC8sICcnKVxuICB2YXIgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnJlcGxhY2UoL14jLywgJy8nKVxuICByZXR1cm4gcGF0aG5hbWUgKyBoYXNoXG59XG4iLCIndXNlIHN0cmljdCdcblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gcmVhZHlcblxuZnVuY3Rpb24gcmVhZHkgKGNhbGxiYWNrKSB7XG4gIGFzc2VydC5ub3RFcXVhbCh0eXBlb2YgZG9jdW1lbnQsICd1bmRlZmluZWQnLCAnZG9jdW1lbnQtcmVhZHkgb25seSBydW5zIGluIHRoZSBicm93c2VyJylcbiAgdmFyIHN0YXRlID0gZG9jdW1lbnQucmVhZHlTdGF0ZVxuICBpZiAoc3RhdGUgPT09ICdjb21wbGV0ZScgfHwgc3RhdGUgPT09ICdpbnRlcmFjdGl2ZScpIHtcbiAgICByZXR1cm4gc2V0VGltZW91dChjYWxsYmFjaywgMClcbiAgfVxuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBmdW5jdGlvbiBvbkxvYWQgKCkge1xuICAgIGNhbGxiYWNrKClcbiAgfSlcbn1cbiIsInZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbnZhciBkb2NjeTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBkb2NjeSA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG4iLCJ2YXIgd2luO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHdpbiA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHdpbiA9IGdsb2JhbDtcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpe1xuICAgIHdpbiA9IHNlbGY7XG59IGVsc2Uge1xuICAgIHdpbiA9IHt9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdpbjtcbiIsIm1vZHVsZS5leHBvcnRzID0gYXR0cmlidXRlVG9Qcm9wZXJ0eVxuXG52YXIgdHJhbnNmb3JtID0ge1xuICAnY2xhc3MnOiAnY2xhc3NOYW1lJyxcbiAgJ2Zvcic6ICdodG1sRm9yJyxcbiAgJ2h0dHAtZXF1aXYnOiAnaHR0cEVxdWl2J1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVUb1Byb3BlcnR5IChoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAodGFnTmFtZSwgYXR0cnMsIGNoaWxkcmVuKSB7XG4gICAgZm9yICh2YXIgYXR0ciBpbiBhdHRycykge1xuICAgICAgaWYgKGF0dHIgaW4gdHJhbnNmb3JtKSB7XG4gICAgICAgIGF0dHJzW3RyYW5zZm9ybVthdHRyXV0gPSBhdHRyc1thdHRyXVxuICAgICAgICBkZWxldGUgYXR0cnNbYXR0cl1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGgodGFnTmFtZSwgYXR0cnMsIGNoaWxkcmVuKVxuICB9XG59XG4iLCJ2YXIgYXR0clRvUHJvcCA9IHJlcXVpcmUoJ2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eScpXG5cbnZhciBWQVIgPSAwLCBURVhUID0gMSwgT1BFTiA9IDIsIENMT1NFID0gMywgQVRUUiA9IDRcbnZhciBBVFRSX0tFWSA9IDUsIEFUVFJfS0VZX1cgPSA2XG52YXIgQVRUUl9WQUxVRV9XID0gNywgQVRUUl9WQUxVRSA9IDhcbnZhciBBVFRSX1ZBTFVFX1NRID0gOSwgQVRUUl9WQUxVRV9EUSA9IDEwXG52YXIgQVRUUl9FUSA9IDExLCBBVFRSX0JSRUFLID0gMTJcbnZhciBDT01NRU5UID0gMTNcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaCwgb3B0cykge1xuICBpZiAoIW9wdHMpIG9wdHMgPSB7fVxuICB2YXIgY29uY2F0ID0gb3B0cy5jb25jYXQgfHwgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gU3RyaW5nKGEpICsgU3RyaW5nKGIpXG4gIH1cbiAgaWYgKG9wdHMuYXR0clRvUHJvcCAhPT0gZmFsc2UpIHtcbiAgICBoID0gYXR0clRvUHJvcChoKVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChzdHJpbmdzKSB7XG4gICAgdmFyIHN0YXRlID0gVEVYVCwgcmVnID0gJydcbiAgICB2YXIgYXJnbGVuID0gYXJndW1lbnRzLmxlbmd0aFxuICAgIHZhciBwYXJ0cyA9IFtdXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpIDwgYXJnbGVuIC0gMSkge1xuICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzW2krMV1cbiAgICAgICAgdmFyIHAgPSBwYXJzZShzdHJpbmdzW2ldKVxuICAgICAgICB2YXIgeHN0YXRlID0gc3RhdGVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSkgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfVykgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSKSB4c3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICBwLnB1c2goWyBWQVIsIHhzdGF0ZSwgYXJnIF0pXG4gICAgICAgIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHApXG4gICAgICB9IGVsc2UgcGFydHMucHVzaC5hcHBseShwYXJ0cywgcGFyc2Uoc3RyaW5nc1tpXSkpXG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSBbbnVsbCx7fSxbXV1cbiAgICB2YXIgc3RhY2sgPSBbW3RyZWUsLTFdXVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjdXIgPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1cbiAgICAgIHZhciBwID0gcGFydHNbaV0sIHMgPSBwWzBdXG4gICAgICBpZiAocyA9PT0gT1BFTiAmJiAvXlxcLy8udGVzdChwWzFdKSkge1xuICAgICAgICB2YXIgaXggPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMV1cbiAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBzdGFjay5wb3AoKVxuICAgICAgICAgIHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVsyXVtpeF0gPSBoKFxuICAgICAgICAgICAgY3VyWzBdLCBjdXJbMV0sIGN1clsyXS5sZW5ndGggPyBjdXJbMl0gOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gT1BFTikge1xuICAgICAgICB2YXIgYyA9IFtwWzFdLHt9LFtdXVxuICAgICAgICBjdXJbMl0ucHVzaChjKVxuICAgICAgICBzdGFjay5wdXNoKFtjLGN1clsyXS5sZW5ndGgtMV0pXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfS0VZIHx8IChzID09PSBWQVIgJiYgcFsxXSA9PT0gQVRUUl9LRVkpKSB7XG4gICAgICAgIHZhciBrZXkgPSAnJ1xuICAgICAgICB2YXIgY29weUtleVxuICAgICAgICBmb3IgKDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAga2V5ID0gY29uY2F0KGtleSwgcGFydHNbaV1bMV0pXG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXVswXSA9PT0gVkFSICYmIHBhcnRzW2ldWzFdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXJ0c1tpXVsyXSA9PT0gJ29iamVjdCcgJiYgIWtleSkge1xuICAgICAgICAgICAgICBmb3IgKGNvcHlLZXkgaW4gcGFydHNbaV1bMl0pIHtcbiAgICAgICAgICAgICAgICBpZiAocGFydHNbaV1bMl0uaGFzT3duUHJvcGVydHkoY29weUtleSkgJiYgIWN1clsxXVtjb3B5S2V5XSkge1xuICAgICAgICAgICAgICAgICAgY3VyWzFdW2NvcHlLZXldID0gcGFydHNbaV1bMl1bY29weUtleV1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGtleSA9IGNvbmNhdChrZXksIHBhcnRzW2ldWzJdKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBicmVha1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9FUSkgaSsrXG4gICAgICAgIHZhciBqID0gaVxuICAgICAgICBmb3IgKDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX1ZBTFVFIHx8IHBhcnRzW2ldWzBdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgaWYgKCFjdXJbMV1ba2V5XSkgY3VyWzFdW2tleV0gPSBzdHJmbihwYXJ0c1tpXVsxXSlcbiAgICAgICAgICAgIGVsc2UgY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzFdKVxuICAgICAgICAgIH0gZWxzZSBpZiAocGFydHNbaV1bMF0gPT09IFZBUlxuICAgICAgICAgICYmIChwYXJ0c1tpXVsxXSA9PT0gQVRUUl9WQUxVRSB8fCBwYXJ0c1tpXVsxXSA9PT0gQVRUUl9LRVkpKSB7XG4gICAgICAgICAgICBpZiAoIWN1clsxXVtrZXldKSBjdXJbMV1ba2V5XSA9IHN0cmZuKHBhcnRzW2ldWzJdKVxuICAgICAgICAgICAgZWxzZSBjdXJbMV1ba2V5XSA9IGNvbmNhdChjdXJbMV1ba2V5XSwgcGFydHNbaV1bMl0pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChrZXkubGVuZ3RoICYmICFjdXJbMV1ba2V5XSAmJiBpID09PSBqXG4gICAgICAgICAgICAmJiAocGFydHNbaV1bMF0gPT09IENMT1NFIHx8IHBhcnRzW2ldWzBdID09PSBBVFRSX0JSRUFLKSkge1xuICAgICAgICAgICAgICAvLyBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9pbmZyYXN0cnVjdHVyZS5odG1sI2Jvb2xlYW4tYXR0cmlidXRlc1xuICAgICAgICAgICAgICAvLyBlbXB0eSBzdHJpbmcgaXMgZmFsc3ksIG5vdCB3ZWxsIGJlaGF2ZWQgdmFsdWUgaW4gYnJvd3NlclxuICAgICAgICAgICAgICBjdXJbMV1ba2V5XSA9IGtleS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0tFWSkge1xuICAgICAgICBjdXJbMV1bcFsxXV0gPSB0cnVlXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFZBUiAmJiBwWzFdID09PSBBVFRSX0tFWSkge1xuICAgICAgICBjdXJbMV1bcFsyXV0gPSB0cnVlXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IENMT1NFKSB7XG4gICAgICAgIGlmIChzZWxmQ2xvc2luZyhjdXJbMF0pICYmIHN0YWNrLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBpeCA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVsxXVxuICAgICAgICAgIHN0YWNrLnBvcCgpXG4gICAgICAgICAgc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdWzJdW2l4XSA9IGgoXG4gICAgICAgICAgICBjdXJbMF0sIGN1clsxXSwgY3VyWzJdLmxlbmd0aCA/IGN1clsyXSA6IHVuZGVmaW5lZFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBWQVIgJiYgcFsxXSA9PT0gVEVYVCkge1xuICAgICAgICBpZiAocFsyXSA9PT0gdW5kZWZpbmVkIHx8IHBbMl0gPT09IG51bGwpIHBbMl0gPSAnJ1xuICAgICAgICBlbHNlIGlmICghcFsyXSkgcFsyXSA9IGNvbmNhdCgnJywgcFsyXSlcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocFsyXVswXSkpIHtcbiAgICAgICAgICBjdXJbMl0ucHVzaC5hcHBseShjdXJbMl0sIHBbMl0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3VyWzJdLnB1c2gocFsyXSlcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBURVhUKSB7XG4gICAgICAgIGN1clsyXS5wdXNoKHBbMV0pXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfRVEgfHwgcyA9PT0gQVRUUl9CUkVBSykge1xuICAgICAgICAvLyBuby1vcFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmhhbmRsZWQ6ICcgKyBzKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0cmVlWzJdLmxlbmd0aCA+IDEgJiYgL15cXHMqJC8udGVzdCh0cmVlWzJdWzBdKSkge1xuICAgICAgdHJlZVsyXS5zaGlmdCgpXG4gICAgfVxuXG4gICAgaWYgKHRyZWVbMl0ubGVuZ3RoID4gMlxuICAgIHx8ICh0cmVlWzJdLmxlbmd0aCA9PT0gMiAmJiAvXFxTLy50ZXN0KHRyZWVbMl1bMV0pKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnbXVsdGlwbGUgcm9vdCBlbGVtZW50cyBtdXN0IGJlIHdyYXBwZWQgaW4gYW4gZW5jbG9zaW5nIHRhZydcbiAgICAgIClcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodHJlZVsyXVswXSkgJiYgdHlwZW9mIHRyZWVbMl1bMF1bMF0gPT09ICdzdHJpbmcnXG4gICAgJiYgQXJyYXkuaXNBcnJheSh0cmVlWzJdWzBdWzJdKSkge1xuICAgICAgdHJlZVsyXVswXSA9IGgodHJlZVsyXVswXVswXSwgdHJlZVsyXVswXVsxXSwgdHJlZVsyXVswXVsyXSlcbiAgICB9XG4gICAgcmV0dXJuIHRyZWVbMl1bMF1cblxuICAgIGZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgICAgIHZhciByZXMgPSBbXVxuICAgICAgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHN0YXRlID0gQVRUUlxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGMgPSBzdHIuY2hhckF0KGkpXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gVEVYVCAmJiBjID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAocmVnLmxlbmd0aCkgcmVzLnB1c2goW1RFWFQsIHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IE9QRU5cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPicgJiYgIXF1b3Qoc3RhdGUpICYmIHN0YXRlICE9PSBDT01NRU5UKSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09PSBPUEVOKSB7XG4gICAgICAgICAgICByZXMucHVzaChbT1BFTixyZWddKVxuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlcy5wdXNoKFtDTE9TRV0pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IFRFWFRcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQ09NTUVOVCAmJiAvLSQvLnRlc3QocmVnKSAmJiBjID09PSAnLScpIHtcbiAgICAgICAgICBpZiAob3B0cy5jb21tZW50cykge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnLnN1YnN0cigwLCByZWcubGVuZ3RoIC0gMSldLFtDTE9TRV0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBURVhUXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4gJiYgL14hLS0kLy50ZXN0KHJlZykpIHtcbiAgICAgICAgICBpZiAob3B0cy5jb21tZW50cykge1xuICAgICAgICAgICAgcmVzLnB1c2goW09QRU4sIHJlZ10sW0FUVFJfS0VZLCdjb21tZW50J10sW0FUVFJfRVFdKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZWcgPSBjXG4gICAgICAgICAgc3RhdGUgPSBDT01NRU5UXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IFRFWFQgfHwgc3RhdGUgPT09IENPTU1FTlQpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbT1BFTiwgcmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvW15cXHNcIic9L10vLnRlc3QoYykpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgICAgcmVnID0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICBpZiAocmVnLmxlbmd0aCkgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfQlJFQUtdKVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZX1dcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkgJiYgYyA9PT0gJz0nKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10sW0FUVFJfRVFdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1dcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKChzdGF0ZSA9PT0gQVRUUl9LRVlfVyB8fCBzdGF0ZSA9PT0gQVRUUikgJiYgYyA9PT0gJz0nKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfRVFdKVxuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9XXG4gICAgICAgIH0gZWxzZSBpZiAoKHN0YXRlID09PSBBVFRSX0tFWV9XIHx8IHN0YXRlID09PSBBVFRSKSAmJiAhL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICBpZiAoL1tcXHctXS8udGVzdChjKSkge1xuICAgICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgICB9IGVsc2Ugc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX0RRXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiBjID09PSBcIidcIikge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9TUVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRICYmIGMgPT09ICdcIicpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRICYmIGMgPT09IFwiJ1wiKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmICEvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgICAgaS0tXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfU1FcbiAgICAgICAgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGUgPT09IFRFWFQgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbVEVYVCxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RyZm4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpIHJldHVybiB4XG4gICAgZWxzZSBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnKSByZXR1cm4geFxuICAgIGVsc2UgcmV0dXJuIGNvbmNhdCgnJywgeClcbiAgfVxufVxuXG5mdW5jdGlvbiBxdW90IChzdGF0ZSkge1xuICByZXR1cm4gc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfRFFcbn1cblxudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlcbmZ1bmN0aW9uIGhhcyAob2JqLCBrZXkpIHsgcmV0dXJuIGhhc093bi5jYWxsKG9iaiwga2V5KSB9XG5cbnZhciBjbG9zZVJFID0gUmVnRXhwKCdeKCcgKyBbXG4gICdhcmVhJywgJ2Jhc2UnLCAnYmFzZWZvbnQnLCAnYmdzb3VuZCcsICdicicsICdjb2wnLCAnY29tbWFuZCcsICdlbWJlZCcsXG4gICdmcmFtZScsICdocicsICdpbWcnLCAnaW5wdXQnLCAnaXNpbmRleCcsICdrZXlnZW4nLCAnbGluaycsICdtZXRhJywgJ3BhcmFtJyxcbiAgJ3NvdXJjZScsICd0cmFjaycsICd3YnInLCAnIS0tJyxcbiAgLy8gU1ZHIFRBR1NcbiAgJ2FuaW1hdGUnLCAnYW5pbWF0ZVRyYW5zZm9ybScsICdjaXJjbGUnLCAnY3Vyc29yJywgJ2Rlc2MnLCAnZWxsaXBzZScsXG4gICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLCAnZmVDb21wb3NpdGUnLFxuICAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsICdmZURpc3BsYWNlbWVudE1hcCcsXG4gICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsICdmZUZ1bmNHJywgJ2ZlRnVuY1InLFxuICAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlTm9kZScsICdmZU1vcnBob2xvZ3knLFxuICAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLFxuICAnZmVUdXJidWxlbmNlJywgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXVyaScsXG4gICdnbHlwaCcsICdnbHlwaFJlZicsICdoa2VybicsICdpbWFnZScsICdsaW5lJywgJ21pc3NpbmctZ2x5cGgnLCAnbXBhdGgnLFxuICAncGF0aCcsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JlY3QnLCAnc2V0JywgJ3N0b3AnLCAndHJlZicsICd1c2UnLCAndmlldycsXG4gICd2a2Vybidcbl0uam9pbignfCcpICsgJykoPzpbXFwuI11bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspKiQnKVxuZnVuY3Rpb24gc2VsZkNsb3NpbmcgKHRhZykgeyByZXR1cm4gY2xvc2VSRS50ZXN0KHRhZykgfVxuIiwidmFyIG5hbm90aW1pbmcgPSByZXF1aXJlKCduYW5vdGltaW5nJylcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5hbm9idXNcblxuZnVuY3Rpb24gTmFub2J1cyAobmFtZSkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTmFub2J1cykpIHJldHVybiBuZXcgTmFub2J1cyhuYW1lKVxuXG4gIHRoaXMuX25hbWUgPSBuYW1lIHx8ICduYW5vYnVzJ1xuICB0aGlzLl9zdGFyTGlzdGVuZXJzID0gW11cbiAgdGhpcy5fbGlzdGVuZXJzID0ge31cblxuICB0aGlzLl90aW1pbmcgPSBuYW5vdGltaW5nKHRoaXMuX25hbWUpXG59XG5cbk5hbm9idXMucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBkYXRhKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgZXZlbnROYW1lLCAnc3RyaW5nJywgJ25hbm9idXMuZW1pdDogZXZlbnROYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG5cbiAgdGhpcy5fdGltaW5nLnN0YXJ0KGV2ZW50TmFtZSlcbiAgdmFyIGxpc3RlbmVycyA9IHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdXG4gIGlmIChsaXN0ZW5lcnMgJiYgbGlzdGVuZXJzLmxlbmd0aCA+IDApIHtcbiAgICB0aGlzLl9lbWl0KHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdLCBkYXRhKVxuICB9XG5cbiAgaWYgKHRoaXMuX3N0YXJMaXN0ZW5lcnMubGVuZ3RoID4gMCkge1xuICAgIHRoaXMuX2VtaXQodGhpcy5fc3Rhckxpc3RlbmVycywgZXZlbnROYW1lLCBkYXRhKVxuICB9XG4gIHRoaXMuX3RpbWluZy5lbmQoZXZlbnROYW1lKVxuXG4gIHJldHVybiB0aGlzXG59XG5cbk5hbm9idXMucHJvdG90eXBlLm9uID0gTmFub2J1cy5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGV2ZW50TmFtZSwgJ3N0cmluZycsICduYW5vYnVzLm9uOiBldmVudE5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBsaXN0ZW5lciwgJ2Z1bmN0aW9uJywgJ25hbm9idXMub246IGxpc3RlbmVyIHNob3VsZCBiZSB0eXBlIGZ1bmN0aW9uJylcblxuICBpZiAoZXZlbnROYW1lID09PSAnKicpIHtcbiAgICB0aGlzLl9zdGFyTGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpXG4gIH0gZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSkgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBbXVxuICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdLnB1c2gobGlzdGVuZXIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuTmFub2J1cy5wcm90b3R5cGUucHJlcGVuZExpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5wcmVwZW5kTGlzdGVuZXI6IGV2ZW50TmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIGxpc3RlbmVyLCAnZnVuY3Rpb24nLCAnbmFub2J1cy5wcmVwZW5kTGlzdGVuZXI6IGxpc3RlbmVyIHNob3VsZCBiZSB0eXBlIGZ1bmN0aW9uJylcblxuICBpZiAoZXZlbnROYW1lID09PSAnKicpIHtcbiAgICB0aGlzLl9zdGFyTGlzdGVuZXJzLnVuc2hpZnQobGlzdGVuZXIpXG4gIH0gZWxzZSB7XG4gICAgaWYgKCF0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSkgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBbXVxuICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdLnVuc2hpZnQobGlzdGVuZXIpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuTmFub2J1cy5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgZXZlbnROYW1lLCAnc3RyaW5nJywgJ25hbm9idXMub25jZTogZXZlbnROYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbGlzdGVuZXIsICdmdW5jdGlvbicsICduYW5vYnVzLm9uY2U6IGxpc3RlbmVyIHNob3VsZCBiZSB0eXBlIGZ1bmN0aW9uJylcblxuICB2YXIgc2VsZiA9IHRoaXNcbiAgdGhpcy5vbihldmVudE5hbWUsIG9uY2UpXG4gIGZ1bmN0aW9uIG9uY2UgKCkge1xuICAgIGxpc3RlbmVyLmFwcGx5KHNlbGYsIGFyZ3VtZW50cylcbiAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKGV2ZW50TmFtZSwgb25jZSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5wcmVwZW5kT25jZUxpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5wcmVwZW5kT25jZUxpc3RlbmVyOiBldmVudE5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBsaXN0ZW5lciwgJ2Z1bmN0aW9uJywgJ25hbm9idXMucHJlcGVuZE9uY2VMaXN0ZW5lcjogbGlzdGVuZXIgc2hvdWxkIGJlIHR5cGUgZnVuY3Rpb24nKVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLnByZXBlbmRMaXN0ZW5lcihldmVudE5hbWUsIG9uY2UpXG4gIGZ1bmN0aW9uIG9uY2UgKCkge1xuICAgIGxpc3RlbmVyLmFwcGx5KHNlbGYsIGFyZ3VtZW50cylcbiAgICBzZWxmLnJlbW92ZUxpc3RlbmVyKGV2ZW50TmFtZSwgb25jZSlcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgZXZlbnROYW1lLCAnc3RyaW5nJywgJ25hbm9idXMucmVtb3ZlTGlzdGVuZXI6IGV2ZW50TmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIGxpc3RlbmVyLCAnZnVuY3Rpb24nLCAnbmFub2J1cy5yZW1vdmVMaXN0ZW5lcjogbGlzdGVuZXIgc2hvdWxkIGJlIHR5cGUgZnVuY3Rpb24nKVxuXG4gIGlmIChldmVudE5hbWUgPT09ICcqJykge1xuICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMgPSB0aGlzLl9zdGFyTGlzdGVuZXJzLnNsaWNlKClcbiAgICByZXR1cm4gcmVtb3ZlKHRoaXMuX3N0YXJMaXN0ZW5lcnMsIGxpc3RlbmVyKVxuICB9IGVsc2Uge1xuICAgIGlmICh0eXBlb2YgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSA9IHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdLnNsaWNlKClcbiAgICB9XG5cbiAgICByZXR1cm4gcmVtb3ZlKHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdLCBsaXN0ZW5lcilcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbW92ZSAoYXJyLCBsaXN0ZW5lcikge1xuICAgIGlmICghYXJyKSByZXR1cm5cbiAgICB2YXIgaW5kZXggPSBhcnIuaW5kZXhPZihsaXN0ZW5lcilcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICBhcnIuc3BsaWNlKGluZGV4LCAxKVxuICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gIH1cbn1cblxuTmFub2J1cy5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50TmFtZSkge1xuICBpZiAoZXZlbnROYW1lKSB7XG4gICAgaWYgKGV2ZW50TmFtZSA9PT0gJyonKSB7XG4gICAgICB0aGlzLl9zdGFyTGlzdGVuZXJzID0gW11cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0gPSBbXVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aGlzLl9zdGFyTGlzdGVuZXJzID0gW11cbiAgICB0aGlzLl9saXN0ZW5lcnMgPSB7fVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbk5hbm9idXMucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgdmFyIGxpc3RlbmVycyA9IChldmVudE5hbWUgIT09ICcqJykgPyB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSA6IHRoaXMuX3N0YXJMaXN0ZW5lcnNcbiAgdmFyIHJldCA9IFtdXG4gIGlmIChsaXN0ZW5lcnMpIHtcbiAgICB2YXIgaWxlbmd0aCA9IGxpc3RlbmVycy5sZW5ndGhcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlsZW5ndGg7IGkrKykgcmV0LnB1c2gobGlzdGVuZXJzW2ldKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuTmFub2J1cy5wcm90b3R5cGUuX2VtaXQgPSBmdW5jdGlvbiAoYXJyLCBldmVudE5hbWUsIGRhdGEpIHtcbiAgaWYgKHR5cGVvZiBhcnIgPT09ICd1bmRlZmluZWQnKSByZXR1cm5cbiAgaWYgKCFkYXRhKSB7XG4gICAgZGF0YSA9IGV2ZW50TmFtZVxuICAgIGV2ZW50TmFtZSA9IG51bGxcbiAgfVxuICB2YXIgbGVuZ3RoID0gYXJyLmxlbmd0aFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGxpc3RlbmVyID0gYXJyW2ldXG4gICAgaWYgKGV2ZW50TmFtZSkgbGlzdGVuZXIoZXZlbnROYW1lLCBkYXRhKVxuICAgIGVsc2UgbGlzdGVuZXIoZGF0YSlcbiAgfVxufVxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gaGlzdG9yeVxuXG4vLyBsaXN0ZW4gdG8gaHRtbDUgcHVzaHN0YXRlIGV2ZW50c1xuLy8gYW5kIHVwZGF0ZSByb3V0ZXIgYWNjb3JkaW5nbHlcbmZ1bmN0aW9uIGhpc3RvcnkgKGNiKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgY2IsICdmdW5jdGlvbicsICduYW5vaGlzdG9yeTogY2IgbXVzdCBiZSB0eXBlIGZ1bmN0aW9uJylcbiAgd2luZG93Lm9ucG9wc3RhdGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgY2IoZG9jdW1lbnQubG9jYXRpb24pXG4gIH1cbn1cbiIsInZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhyZWZcblxudmFyIG5vUm91dGluZ0F0dHJOYW1lID0gJ2RhdGEtbm8tcm91dGluZydcblxuLy8gaGFuZGxlIGEgY2xpY2sgaWYgaXMgYW5jaG9yIHRhZyB3aXRoIGFuIGhyZWZcbi8vIGFuZCB1cmwgbGl2ZXMgb24gdGhlIHNhbWUgZG9tYWluLiBSZXBsYWNlc1xuLy8gdHJhaWxpbmcgJyMnIHNvIGVtcHR5IGxpbmtzIHdvcmsgYXMgZXhwZWN0ZWQuXG4vLyAoZm4oc3RyKSwgb2JqPykgLT4gdW5kZWZpbmVkXG5mdW5jdGlvbiBocmVmIChjYiwgcm9vdCkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGNiLCAnZnVuY3Rpb24nLCAnbmFub2hyZWY6IGNiIG11c3QgYmUgdHlwZSBmdW5jdGlvbicpXG4gIHJvb3QgPSByb290IHx8IHdpbmRvdy5kb2N1bWVudFxuXG4gIHdpbmRvdy5vbmNsaWNrID0gZnVuY3Rpb24gKGUpIHtcbiAgICBpZiAoKGUuYnV0dG9uICYmIGUuYnV0dG9uICE9PSAwKSB8fCBlLmN0cmxLZXkgfHwgZS5tZXRhS2V5IHx8IGUuYWx0S2V5IHx8IGUuc2hpZnRLZXkpIHJldHVyblxuXG4gICAgdmFyIG5vZGUgPSAoZnVuY3Rpb24gdHJhdmVyc2UgKG5vZGUpIHtcbiAgICAgIGlmICghbm9kZSB8fCBub2RlID09PSByb290KSByZXR1cm5cbiAgICAgIGlmIChub2RlLmxvY2FsTmFtZSAhPT0gJ2EnKSByZXR1cm4gdHJhdmVyc2Uobm9kZS5wYXJlbnROb2RlKVxuICAgICAgaWYgKG5vZGUuaHJlZiA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdHJhdmVyc2Uobm9kZS5wYXJlbnROb2RlKVxuICAgICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5ob3N0ICE9PSBub2RlLmhvc3QpIHJldHVybiB0cmF2ZXJzZShub2RlLnBhcmVudE5vZGUpXG4gICAgICByZXR1cm4gbm9kZVxuICAgIH0pKGUudGFyZ2V0KVxuXG4gICAgaWYgKCFub2RlKSByZXR1cm5cblxuICAgIHZhciBpc1JvdXRpbmdEaXNhYmxlZCA9IG5vZGUuaGFzQXR0cmlidXRlKG5vUm91dGluZ0F0dHJOYW1lKVxuICAgIGlmIChpc1JvdXRpbmdEaXNhYmxlZCkgcmV0dXJuXG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBjYihub2RlKVxuICB9XG59XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbnZhciBtb3JwaCA9IHJlcXVpcmUoJy4vbGliL21vcnBoJylcbnZhciByb290TGFiZWxSZWdleCA9IC9eZGF0YS1vbmxvYWRpZC9cblxudmFyIEVMRU1FTlRfTk9ERSA9IDFcblxubW9kdWxlLmV4cG9ydHMgPSBuYW5vbW9ycGhcblxuLy8gbW9ycGggb25lIHRyZWUgaW50byBhbm90aGVyIHRyZWVcbi8vIChvYmosIG9iaikgLT4gb2JqXG4vLyBubyBwYXJlbnRcbi8vICAgLT4gc2FtZTogZGlmZiBhbmQgd2FsayBjaGlsZHJlblxuLy8gICAtPiBub3Qgc2FtZTogcmVwbGFjZSBhbmQgcmV0dXJuXG4vLyBvbGQgbm9kZSBkb2Vzbid0IGV4aXN0XG4vLyAgIC0+IGluc2VydCBuZXcgbm9kZVxuLy8gbmV3IG5vZGUgZG9lc24ndCBleGlzdFxuLy8gICAtPiBkZWxldGUgb2xkIG5vZGVcbi8vIG5vZGVzIGFyZSBub3QgdGhlIHNhbWVcbi8vICAgLT4gZGlmZiBub2RlcyBhbmQgYXBwbHkgcGF0Y2ggdG8gb2xkIG5vZGVcbi8vIG5vZGVzIGFyZSB0aGUgc2FtZVxuLy8gICAtPiB3YWxrIGFsbCBjaGlsZCBub2RlcyBhbmQgYXBwZW5kIHRvIG9sZCBub2RlXG5mdW5jdGlvbiBuYW5vbW9ycGggKG9sZFRyZWUsIG5ld1RyZWUpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBvbGRUcmVlLCAnb2JqZWN0JywgJ25hbm9tb3JwaDogb2xkVHJlZSBzaG91bGQgYmUgYW4gb2JqZWN0JylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBuZXdUcmVlLCAnb2JqZWN0JywgJ25hbm9tb3JwaDogbmV3VHJlZSBzaG91bGQgYmUgYW4gb2JqZWN0JylcblxuICBwZXJzaXN0U3RhdGVmdWxSb290KG5ld1RyZWUsIG9sZFRyZWUpXG4gIHZhciB0cmVlID0gd2FsayhuZXdUcmVlLCBvbGRUcmVlKVxuICByZXR1cm4gdHJlZVxufVxuXG4vLyB3YWxrIGFuZCBtb3JwaCBhIGRvbSB0cmVlXG4vLyAob2JqLCBvYmopIC0+IG9ialxuZnVuY3Rpb24gd2FsayAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICBpZiAoIW9sZE5vZGUpIHtcbiAgICByZXR1cm4gbmV3Tm9kZVxuICB9IGVsc2UgaWYgKCFuZXdOb2RlKSB7XG4gICAgcmV0dXJuIG51bGxcbiAgfSBlbHNlIGlmIChuZXdOb2RlLmlzU2FtZU5vZGUgJiYgbmV3Tm9kZS5pc1NhbWVOb2RlKG9sZE5vZGUpKSB7XG4gICAgcmV0dXJuIG9sZE5vZGVcbiAgfSBlbHNlIGlmIChuZXdOb2RlLnRhZ05hbWUgIT09IG9sZE5vZGUudGFnTmFtZSkge1xuICAgIHJldHVybiBuZXdOb2RlXG4gIH0gZWxzZSB7XG4gICAgbW9ycGgobmV3Tm9kZSwgb2xkTm9kZSlcbiAgICB1cGRhdGVDaGlsZHJlbihuZXdOb2RlLCBvbGROb2RlKVxuICAgIHJldHVybiBvbGROb2RlXG4gIH1cbn1cblxuLy8gdXBkYXRlIHRoZSBjaGlsZHJlbiBvZiBlbGVtZW50c1xuLy8gKG9iaiwgb2JqKSAtPiBudWxsXG5mdW5jdGlvbiB1cGRhdGVDaGlsZHJlbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICBpZiAoIW5ld05vZGUuY2hpbGROb2RlcyB8fCAhb2xkTm9kZS5jaGlsZE5vZGVzKSByZXR1cm5cblxuICB2YXIgbmV3TGVuZ3RoID0gbmV3Tm9kZS5jaGlsZE5vZGVzLmxlbmd0aFxuICB2YXIgb2xkTGVuZ3RoID0gb2xkTm9kZS5jaGlsZE5vZGVzLmxlbmd0aFxuICB2YXIgbGVuZ3RoID0gTWF0aC5tYXgob2xkTGVuZ3RoLCBuZXdMZW5ndGgpXG5cbiAgdmFyIGlOZXcgPSAwXG4gIHZhciBpT2xkID0gMFxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrLCBpTmV3KyssIGlPbGQrKykge1xuICAgIHZhciBuZXdDaGlsZE5vZGUgPSBuZXdOb2RlLmNoaWxkTm9kZXNbaU5ld11cbiAgICB2YXIgb2xkQ2hpbGROb2RlID0gb2xkTm9kZS5jaGlsZE5vZGVzW2lPbGRdXG4gICAgdmFyIHJldENoaWxkTm9kZSA9IHdhbGsobmV3Q2hpbGROb2RlLCBvbGRDaGlsZE5vZGUpXG4gICAgaWYgKCFyZXRDaGlsZE5vZGUpIHtcbiAgICAgIGlmIChvbGRDaGlsZE5vZGUpIHtcbiAgICAgICAgb2xkTm9kZS5yZW1vdmVDaGlsZChvbGRDaGlsZE5vZGUpXG4gICAgICAgIGlPbGQtLVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoIW9sZENoaWxkTm9kZSkge1xuICAgICAgaWYgKHJldENoaWxkTm9kZSkge1xuICAgICAgICBvbGROb2RlLmFwcGVuZENoaWxkKHJldENoaWxkTm9kZSlcbiAgICAgICAgaU5ldy0tXG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChyZXRDaGlsZE5vZGUgIT09IG9sZENoaWxkTm9kZSkge1xuICAgICAgb2xkTm9kZS5yZXBsYWNlQ2hpbGQocmV0Q2hpbGROb2RlLCBvbGRDaGlsZE5vZGUpXG4gICAgICBpTmV3LS1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcGVyc2lzdFN0YXRlZnVsUm9vdCAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICBpZiAoIW5ld05vZGUgfHwgIW9sZE5vZGUgfHwgb2xkTm9kZS5ub2RlVHlwZSAhPT0gRUxFTUVOVF9OT0RFIHx8IG5ld05vZGUubm9kZVR5cGUgIT09IEVMRU1FTlRfTk9ERSkgcmV0dXJuXG4gIHZhciBvbGRBdHRycyA9IG9sZE5vZGUuYXR0cmlidXRlc1xuICB2YXIgYXR0ciwgbmFtZVxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gb2xkQXR0cnMubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICBhdHRyID0gb2xkQXR0cnNbaV1cbiAgICBuYW1lID0gYXR0ci5uYW1lXG4gICAgaWYgKHJvb3RMYWJlbFJlZ2V4LnRlc3QobmFtZSkpIHtcbiAgICAgIG5ld05vZGUuc2V0QXR0cmlidXRlKG5hbWUsIGF0dHIudmFsdWUpXG4gICAgICBicmVha1xuICAgIH1cbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBbXG4gIC8vIGF0dHJpYnV0ZSBldmVudHMgKGNhbiBiZSBzZXQgd2l0aCBhdHRyaWJ1dGVzKVxuICAnb25jbGljaycsXG4gICdvbmRibGNsaWNrJyxcbiAgJ29ubW91c2Vkb3duJyxcbiAgJ29ubW91c2V1cCcsXG4gICdvbm1vdXNlb3ZlcicsXG4gICdvbm1vdXNlbW92ZScsXG4gICdvbm1vdXNlb3V0JyxcbiAgJ29ubW91c2VlbnRlcicsXG4gICdvbm1vdXNlbGVhdmUnLFxuICAnb25kcmFnc3RhcnQnLFxuICAnb25kcmFnJyxcbiAgJ29uZHJhZ2VudGVyJyxcbiAgJ29uZHJhZ2xlYXZlJyxcbiAgJ29uZHJhZ292ZXInLFxuICAnb25kcm9wJyxcbiAgJ29uZHJhZ2VuZCcsXG4gICdvbmtleWRvd24nLFxuICAnb25rZXlwcmVzcycsXG4gICdvbmtleXVwJyxcbiAgJ29udW5sb2FkJyxcbiAgJ29uYWJvcnQnLFxuICAnb25lcnJvcicsXG4gICdvbnJlc2l6ZScsXG4gICdvbnNjcm9sbCcsXG4gICdvbnNlbGVjdCcsXG4gICdvbmNoYW5nZScsXG4gICdvbnN1Ym1pdCcsXG4gICdvbnJlc2V0JyxcbiAgJ29uZm9jdXMnLFxuICAnb25ibHVyJyxcbiAgJ29uaW5wdXQnLFxuICAvLyBvdGhlciBjb21tb24gZXZlbnRzXG4gICdvbmNvbnRleHRtZW51JyxcbiAgJ29uZm9jdXNpbicsXG4gICdvbmZvY3Vzb3V0J1xuXVxuIiwidmFyIGV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbnZhciBldmVudHNMZW5ndGggPSBldmVudHMubGVuZ3RoXG5cbnZhciBFTEVNRU5UX05PREUgPSAxXG52YXIgVEVYVF9OT0RFID0gM1xudmFyIENPTU1FTlRfTk9ERSA9IDhcblxubW9kdWxlLmV4cG9ydHMgPSBtb3JwaFxuXG4vLyBkaWZmIGVsZW1lbnRzIGFuZCBhcHBseSB0aGUgcmVzdWx0aW5nIHBhdGNoIHRvIHRoZSBvbGQgbm9kZVxuLy8gKG9iaiwgb2JqKSAtPiBudWxsXG5mdW5jdGlvbiBtb3JwaCAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICB2YXIgbm9kZVR5cGUgPSBuZXdOb2RlLm5vZGVUeXBlXG4gIHZhciBub2RlTmFtZSA9IG5ld05vZGUubm9kZU5hbWVcblxuICBpZiAobm9kZVR5cGUgPT09IEVMRU1FTlRfTk9ERSkge1xuICAgIGNvcHlBdHRycyhuZXdOb2RlLCBvbGROb2RlKVxuICB9XG5cbiAgaWYgKG5vZGVUeXBlID09PSBURVhUX05PREUgfHwgbm9kZVR5cGUgPT09IENPTU1FTlRfTk9ERSkge1xuICAgIG9sZE5vZGUubm9kZVZhbHVlID0gbmV3Tm9kZS5ub2RlVmFsdWVcbiAgfVxuXG4gIC8vIFNvbWUgRE9NIG5vZGVzIGFyZSB3ZWlyZFxuICAvLyBodHRwczovL2dpdGh1Yi5jb20vcGF0cmljay1zdGVlbGUtaWRlbS9tb3JwaGRvbS9ibG9iL21hc3Rlci9zcmMvc3BlY2lhbEVsSGFuZGxlcnMuanNcbiAgaWYgKG5vZGVOYW1lID09PSAnSU5QVVQnKSB1cGRhdGVJbnB1dChuZXdOb2RlLCBvbGROb2RlKVxuICBlbHNlIGlmIChub2RlTmFtZSA9PT0gJ09QVElPTicpIHVwZGF0ZU9wdGlvbihuZXdOb2RlLCBvbGROb2RlKVxuICBlbHNlIGlmIChub2RlTmFtZSA9PT0gJ1RFWFRBUkVBJykgdXBkYXRlVGV4dGFyZWEobmV3Tm9kZSwgb2xkTm9kZSlcbiAgZWxzZSBpZiAobm9kZU5hbWUgPT09ICdTRUxFQ1QnKSB1cGRhdGVTZWxlY3QobmV3Tm9kZSwgb2xkTm9kZSlcblxuICBjb3B5RXZlbnRzKG5ld05vZGUsIG9sZE5vZGUpXG59XG5cbmZ1bmN0aW9uIGNvcHlBdHRycyAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICB2YXIgb2xkQXR0cnMgPSBvbGROb2RlLmF0dHJpYnV0ZXNcbiAgdmFyIG5ld0F0dHJzID0gbmV3Tm9kZS5hdHRyaWJ1dGVzXG4gIHZhciBhdHRyTmFtZXNwYWNlVVJJID0gbnVsbFxuICB2YXIgYXR0clZhbHVlID0gbnVsbFxuICB2YXIgZnJvbVZhbHVlID0gbnVsbFxuICB2YXIgYXR0ck5hbWUgPSBudWxsXG4gIHZhciBhdHRyID0gbnVsbFxuXG4gIGZvciAodmFyIGkgPSBuZXdBdHRycy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgIGF0dHIgPSBuZXdBdHRyc1tpXVxuICAgIGF0dHJOYW1lID0gYXR0ci5uYW1lXG4gICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJXG4gICAgYXR0clZhbHVlID0gYXR0ci52YWx1ZVxuXG4gICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgIGF0dHJOYW1lID0gYXR0ci5sb2NhbE5hbWUgfHwgYXR0ck5hbWVcbiAgICAgIGZyb21WYWx1ZSA9IG9sZE5vZGUuZ2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpXG5cbiAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICBvbGROb2RlLnNldEF0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lLCBhdHRyVmFsdWUpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZyb21WYWx1ZSA9IG9sZE5vZGUuZ2V0QXR0cmlidXRlKGF0dHJOYW1lKVxuXG4gICAgICBpZiAoZnJvbVZhbHVlICE9PSBhdHRyVmFsdWUpIHtcbiAgICAgICAgLy8gYXBwYXJlbnRseSB2YWx1ZXMgYXJlIGFsd2F5cyBjYXN0IHRvIHN0cmluZ3MsIGFoIHdlbGxcbiAgICAgICAgaWYgKGF0dHJWYWx1ZSA9PT0gJ251bGwnIHx8IGF0dHJWYWx1ZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICBvbGROb2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBvbGROb2RlLnNldEF0dHJpYnV0ZShhdHRyTmFtZSwgYXR0clZhbHVlKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gUmVtb3ZlIGFueSBleHRyYSBhdHRyaWJ1dGVzIGZvdW5kIG9uIHRoZSBvcmlnaW5hbCBET00gZWxlbWVudCB0aGF0XG4gIC8vIHdlcmVuJ3QgZm91bmQgb24gdGhlIHRhcmdldCBlbGVtZW50LlxuICBmb3IgKHZhciBqID0gb2xkQXR0cnMubGVuZ3RoIC0gMTsgaiA+PSAwOyAtLWopIHtcbiAgICBhdHRyID0gb2xkQXR0cnNbal1cbiAgICBpZiAoYXR0ci5zcGVjaWZpZWQgIT09IGZhbHNlKSB7XG4gICAgICBhdHRyTmFtZSA9IGF0dHIubmFtZVxuICAgICAgYXR0ck5hbWVzcGFjZVVSSSA9IGF0dHIubmFtZXNwYWNlVVJJXG5cbiAgICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICAgIGF0dHJOYW1lID0gYXR0ci5sb2NhbE5hbWUgfHwgYXR0ck5hbWVcbiAgICAgICAgaWYgKCFuZXdOb2RlLmhhc0F0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lKSkge1xuICAgICAgICAgIG9sZE5vZGUucmVtb3ZlQXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghbmV3Tm9kZS5oYXNBdHRyaWJ1dGVOUyhudWxsLCBhdHRyTmFtZSkpIHtcbiAgICAgICAgICBvbGROb2RlLnJlbW92ZUF0dHJpYnV0ZShhdHRyTmFtZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBjb3B5RXZlbnRzIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXZlbnRzTGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgZXYgPSBldmVudHNbaV1cbiAgICBpZiAobmV3Tm9kZVtldl0pIHsgICAgICAgICAgIC8vIGlmIG5ldyBlbGVtZW50IGhhcyBhIHdoaXRlbGlzdGVkIGF0dHJpYnV0ZVxuICAgICAgb2xkTm9kZVtldl0gPSBuZXdOb2RlW2V2XSAgLy8gdXBkYXRlIGV4aXN0aW5nIGVsZW1lbnRcbiAgICB9IGVsc2UgaWYgKG9sZE5vZGVbZXZdKSB7ICAgIC8vIGlmIGV4aXN0aW5nIGVsZW1lbnQgaGFzIGl0IGFuZCBuZXcgb25lIGRvZXNudFxuICAgICAgb2xkTm9kZVtldl0gPSB1bmRlZmluZWQgICAgLy8gcmVtb3ZlIGl0IGZyb20gZXhpc3RpbmcgZWxlbWVudFxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVPcHRpb24gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgdXBkYXRlQXR0cmlidXRlKG5ld05vZGUsIG9sZE5vZGUsICdzZWxlY3RlZCcpXG59XG5cbi8vIFRoZSBcInZhbHVlXCIgYXR0cmlidXRlIGlzIHNwZWNpYWwgZm9yIHRoZSA8aW5wdXQ+IGVsZW1lbnQgc2luY2UgaXQgc2V0cyB0aGVcbi8vIGluaXRpYWwgdmFsdWUuIENoYW5naW5nIHRoZSBcInZhbHVlXCIgYXR0cmlidXRlIHdpdGhvdXQgY2hhbmdpbmcgdGhlIFwidmFsdWVcIlxuLy8gcHJvcGVydHkgd2lsbCBoYXZlIG5vIGVmZmVjdCBzaW5jZSBpdCBpcyBvbmx5IHVzZWQgdG8gdGhlIHNldCB0aGUgaW5pdGlhbFxuLy8gdmFsdWUuIFNpbWlsYXIgZm9yIHRoZSBcImNoZWNrZWRcIiBhdHRyaWJ1dGUsIGFuZCBcImRpc2FibGVkXCIuXG5mdW5jdGlvbiB1cGRhdGVJbnB1dCAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICB2YXIgbmV3VmFsdWUgPSBuZXdOb2RlLnZhbHVlXG4gIHZhciBvbGRWYWx1ZSA9IG9sZE5vZGUudmFsdWVcblxuICB1cGRhdGVBdHRyaWJ1dGUobmV3Tm9kZSwgb2xkTm9kZSwgJ2NoZWNrZWQnKVxuICB1cGRhdGVBdHRyaWJ1dGUobmV3Tm9kZSwgb2xkTm9kZSwgJ2Rpc2FibGVkJylcblxuICBpZiAoIW5ld05vZGUuaGFzQXR0cmlidXRlTlMobnVsbCwgJ3ZhbHVlJykgfHwgbmV3VmFsdWUgPT09ICdudWxsJykge1xuICAgIG9sZE5vZGUudmFsdWUgPSAnJ1xuICAgIG9sZE5vZGUucmVtb3ZlQXR0cmlidXRlKCd2YWx1ZScpXG4gIH0gZWxzZSBpZiAobmV3VmFsdWUgIT09IG9sZFZhbHVlKSB7XG4gICAgb2xkTm9kZS5zZXRBdHRyaWJ1dGUoJ3ZhbHVlJywgbmV3VmFsdWUpXG4gICAgb2xkTm9kZS52YWx1ZSA9IG5ld1ZhbHVlXG4gIH0gZWxzZSBpZiAob2xkTm9kZS50eXBlID09PSAncmFuZ2UnKSB7XG4gICAgLy8gdGhpcyBpcyBzbyBlbGVtZW50cyBsaWtlIHNsaWRlciBtb3ZlIHRoZWlyIFVJIHRoaW5neVxuICAgIG9sZE5vZGUudmFsdWUgPSBuZXdWYWx1ZVxuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVRleHRhcmVhIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIHZhciBuZXdWYWx1ZSA9IG5ld05vZGUudmFsdWVcbiAgaWYgKG5ld1ZhbHVlICE9PSBvbGROb2RlLnZhbHVlKSB7XG4gICAgb2xkTm9kZS52YWx1ZSA9IG5ld1ZhbHVlXG4gIH1cblxuICBpZiAob2xkTm9kZS5maXJzdENoaWxkKSB7XG4gICAgLy8gTmVlZGVkIGZvciBJRS4gQXBwYXJlbnRseSBJRSBzZXRzIHRoZSBwbGFjZWhvbGRlciBhcyB0aGVcbiAgICAvLyBub2RlIHZhbHVlIGFuZCB2aXNlIHZlcnNhLiBUaGlzIGlnbm9yZXMgYW4gZW1wdHkgdXBkYXRlLlxuICAgIGlmIChuZXdWYWx1ZSA9PT0gJycgJiYgb2xkTm9kZS5maXJzdENoaWxkLm5vZGVWYWx1ZSA9PT0gb2xkTm9kZS5wbGFjZWhvbGRlcikge1xuICAgICAgcmV0dXJuXG4gICAgfVxuXG4gICAgb2xkTm9kZS5maXJzdENoaWxkLm5vZGVWYWx1ZSA9IG5ld1ZhbHVlXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlU2VsZWN0IChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIGlmICghb2xkTm9kZS5oYXNBdHRyaWJ1dGVOUyhudWxsLCAnbXVsdGlwbGUnKSkge1xuICAgIHZhciBpID0gMFxuICAgIHZhciBjdXJDaGlsZCA9IG9sZE5vZGUuZmlyc3RDaGlsZFxuICAgIHdoaWxlIChjdXJDaGlsZCkge1xuICAgICAgdmFyIG5vZGVOYW1lID0gY3VyQ2hpbGQubm9kZU5hbWVcbiAgICAgIGlmIChub2RlTmFtZSAmJiBub2RlTmFtZS50b1VwcGVyQ2FzZSgpID09PSAnT1BUSU9OJykge1xuICAgICAgICBpZiAoY3VyQ2hpbGQuaGFzQXR0cmlidXRlTlMobnVsbCwgJ3NlbGVjdGVkJykpIGJyZWFrXG4gICAgICAgIGkrK1xuICAgICAgfVxuICAgICAgY3VyQ2hpbGQgPSBjdXJDaGlsZC5uZXh0U2libGluZ1xuICAgIH1cblxuICAgIG5ld05vZGUuc2VsZWN0ZWRJbmRleCA9IGlcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVBdHRyaWJ1dGUgKG5ld05vZGUsIG9sZE5vZGUsIG5hbWUpIHtcbiAgaWYgKG5ld05vZGVbbmFtZV0gIT09IG9sZE5vZGVbbmFtZV0pIHtcbiAgICBvbGROb2RlW25hbWVdID0gbmV3Tm9kZVtuYW1lXVxuICAgIGlmIChuZXdOb2RlW25hbWVdKSB7XG4gICAgICBvbGROb2RlLnNldEF0dHJpYnV0ZShuYW1lLCAnJylcbiAgICB9IGVsc2Uge1xuICAgICAgb2xkTm9kZS5yZW1vdmVBdHRyaWJ1dGUobmFtZSwgJycpXG4gICAgfVxuICB9XG59XG4iLCJ2YXIgbmFub21vcnBoID0gcmVxdWlyZSgnbmFub21vcnBoJylcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5hbm9tb3VudFxuXG5mdW5jdGlvbiBuYW5vbW91bnQgKHRhcmdldCwgbmV3VHJlZSkge1xuICBpZiAodGFyZ2V0Lm5vZGVOYW1lID09PSAnQk9EWScpIHtcbiAgICB2YXIgY2hpbGRyZW4gPSB0YXJnZXQuY2hpbGROb2Rlc1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChjaGlsZHJlbltpXS5ub2RlTmFtZSA9PT0gJ1NDUklQVCcpIHtcbiAgICAgICAgbmV3VHJlZS5hcHBlbmRDaGlsZChjaGlsZHJlbltpXS5jbG9uZU5vZGUodHJ1ZSkpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdmFyIHRyZWUgPSBuYW5vbW9ycGgodGFyZ2V0LCBuZXdUcmVlKVxuICBhc3NlcnQuZXF1YWwodHJlZSwgdGFyZ2V0LCAnbmFub21vdW50OiBUaGUgdGFyZ2V0IG5vZGUgJyArXG4gICAgdHJlZS5vdXRlckhUTUwubm9kZU5hbWUgKyAnIGlzIG5vdCB0aGUgc2FtZSB0eXBlIGFzIHRoZSBuZXcgbm9kZSAnICtcbiAgICB0YXJnZXQub3V0ZXJIVE1MLm5vZGVOYW1lICsgJy4nKVxufVxuIiwiJ3VzZSBzdHJpY3QnXG5cbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5hbm9yYWZcblxuLy8gT25seSBjYWxsIFJBRiB3aGVuIG5lZWRlZFxuLy8gKGZuLCBmbj8pIC0+IGZuXG5mdW5jdGlvbiBuYW5vcmFmIChyZW5kZXIsIHJhZikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJlbmRlciwgJ2Z1bmN0aW9uJywgJ25hbm9yYWY6IHJlbmRlciBzaG91bGQgYmUgYSBmdW5jdGlvbicpXG4gIGFzc2VydC5vayh0eXBlb2YgcmFmID09PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiByYWYgPT09ICd1bmRlZmluZWQnLCAnbmFub3JhZjogcmFmIHNob3VsZCBiZSBhIGZ1bmN0aW9uIG9yIHVuZGVmaW5lZCcpXG5cbiAgaWYgKCFyYWYpIHJhZiA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgdmFyIHJlZHJhd1NjaGVkdWxlZCA9IGZhbHNlXG4gIHZhciBhcmdzID0gbnVsbFxuXG4gIHJldHVybiBmdW5jdGlvbiBmcmFtZSAoKSB7XG4gICAgaWYgKGFyZ3MgPT09IG51bGwgJiYgIXJlZHJhd1NjaGVkdWxlZCkge1xuICAgICAgcmVkcmF3U2NoZWR1bGVkID0gdHJ1ZVxuXG4gICAgICByYWYoZnVuY3Rpb24gcmVkcmF3ICgpIHtcbiAgICAgICAgcmVkcmF3U2NoZWR1bGVkID0gZmFsc2VcblxuICAgICAgICB2YXIgbGVuZ3RoID0gYXJncy5sZW5ndGhcbiAgICAgICAgdmFyIF9hcmdzID0gbmV3IEFycmF5KGxlbmd0aClcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykgX2FyZ3NbaV0gPSBhcmdzW2ldXG5cbiAgICAgICAgcmVuZGVyLmFwcGx5KHJlbmRlciwgX2FyZ3MpXG4gICAgICAgIGFyZ3MgPSBudWxsXG4gICAgICB9KVxuICAgIH1cblxuICAgIGFyZ3MgPSBhcmd1bWVudHNcbiAgfVxufVxuIiwidmFyIHdheWZhcmVyID0gcmVxdWlyZSgnd2F5ZmFyZXInKVxuXG52YXIgaXNMb2NhbEZpbGUgPSAoL2ZpbGU6XFwvXFwvLy50ZXN0KHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnICYmXG4gIHdpbmRvdy5sb2NhdGlvbiAmJiB3aW5kb3cubG9jYXRpb24ub3JpZ2luKSkgLy8gZWxlY3Ryb24gc3VwcG9ydFxuXG4vKiBlc2xpbnQtZGlzYWJsZSBuby11c2VsZXNzLWVzY2FwZSAqL1xudmFyIGVsZWN0cm9uID0gJ14oZmlsZTpcXC9cXC98XFwvKSguKlxcLmh0bWw/XFwvPyk/J1xudmFyIHByb3RvY29sID0gJ14oaHR0cChzKT8oOlxcL1xcLykpPyh3d3dcXC4pPydcbnZhciBkb21haW4gPSAnW2EtekEtWjAtOS1fXFwuXSsoOlswLTldezEsNX0pPyhcXC97MX0pPydcbnZhciBxcyA9ICdbXFw/XS4qJCdcbi8qIGVzbGludC1lbmFibGUgbm8tdXNlbGVzcy1lc2NhcGUgKi9cblxudmFyIHN0cmlwRWxlY3Ryb24gPSBuZXcgUmVnRXhwKGVsZWN0cm9uKVxudmFyIHByZWZpeCA9IG5ldyBSZWdFeHAocHJvdG9jb2wgKyBkb21haW4pXG52YXIgbm9ybWFsaXplID0gbmV3IFJlZ0V4cCgnIycpXG52YXIgc3VmZml4ID0gbmV3IFJlZ0V4cChxcylcblxubW9kdWxlLmV4cG9ydHMgPSBOYW5vcm91dGVyXG5cbmZ1bmN0aW9uIE5hbm9yb3V0ZXIgKG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge31cblxuICB2YXIgcm91dGVyID0gd2F5ZmFyZXIob3B0cy5kZWZhdWx0IHx8ICcvNDA0JylcbiAgdmFyIGN1cnJ5ID0gb3B0cy5jdXJyeSB8fCBmYWxzZVxuICB2YXIgcHJldkNhbGxiYWNrID0gbnVsbFxuICB2YXIgcHJldlJvdXRlID0gbnVsbFxuXG4gIGVtaXQucm91dGVyID0gcm91dGVyXG4gIGVtaXQub24gPSBvblxuICByZXR1cm4gZW1pdFxuXG4gIGZ1bmN0aW9uIG9uIChyb3V0ZW5hbWUsIGxpc3RlbmVyKSB7XG4gICAgcm91dGVuYW1lID0gcm91dGVuYW1lLnJlcGxhY2UoL15bIy9dLywgJycpXG4gICAgcm91dGVyLm9uKHJvdXRlbmFtZSwgbGlzdGVuZXIpXG4gIH1cblxuICBmdW5jdGlvbiBlbWl0IChyb3V0ZSkge1xuICAgIGlmICghY3VycnkpIHtcbiAgICAgIHJldHVybiByb3V0ZXIocm91dGUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJvdXRlID0gcGF0aG5hbWUocm91dGUsIGlzTG9jYWxGaWxlKVxuICAgICAgaWYgKHJvdXRlID09PSBwcmV2Um91dGUpIHtcbiAgICAgICAgcmV0dXJuIHByZXZDYWxsYmFjaygpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcmV2Um91dGUgPSByb3V0ZVxuICAgICAgICBwcmV2Q2FsbGJhY2sgPSByb3V0ZXIocm91dGUpXG4gICAgICAgIHJldHVybiBwcmV2Q2FsbGJhY2soKVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyByZXBsYWNlIGV2ZXJ5dGhpbmcgaW4gYSByb3V0ZSBidXQgdGhlIHBhdGhuYW1lIGFuZCBoYXNoXG5mdW5jdGlvbiBwYXRobmFtZSAocm91dGUsIGlzRWxlY3Ryb24pIHtcbiAgaWYgKGlzRWxlY3Ryb24pIHJvdXRlID0gcm91dGUucmVwbGFjZShzdHJpcEVsZWN0cm9uLCAnJylcbiAgZWxzZSByb3V0ZSA9IHJvdXRlLnJlcGxhY2UocHJlZml4LCAnJylcbiAgcmV0dXJuIHJvdXRlLnJlcGxhY2Uoc3VmZml4LCAnJykucmVwbGFjZShub3JtYWxpemUsICcvJylcbn1cbiIsInZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5hbm90aW1pbmdcblxuZnVuY3Rpb24gTmFub3RpbWluZyAobmFtZSkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgTmFub3RpbWluZykpIHJldHVybiBuZXcgTmFub3RpbWluZyhuYW1lKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIG5hbWUsICdzdHJpbmcnLCAnTmFub3RpbWluZzogbmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuICB0aGlzLl9uYW1lID0gbmFtZVxuICB0aGlzLl9lbmFibGVkID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB3aW5kb3cucGVyZm9ybWFuY2UgJiYgd2luZG93LnBlcmZvcm1hbmNlLm1hcmtcbn1cblxuTmFub3RpbWluZy5wcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAocGFydGlhbCkge1xuICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVyblxuICB2YXIgbmFtZSA9IHBhcnRpYWwgPyB0aGlzLl9uYW1lICsgJzonICsgcGFydGlhbCA6IHRoaXMuX25hbWVcbiAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsobmFtZSArICctc3RhcnQnKVxufVxuXG5OYW5vdGltaW5nLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbiAocGFydGlhbCkge1xuICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVyblxuICB2YXIgbmFtZSA9IHBhcnRpYWwgPyB0aGlzLl9uYW1lICsgJzonICsgcGFydGlhbCA6IHRoaXMuX25hbWVcbiAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsobmFtZSArICctZW5kJylcbiAgd2luZG93LnBlcmZvcm1hbmNlLm1lYXN1cmUobmFtZSwgbmFtZSArICctc3RhcnQnLCBuYW1lICsgJy1lbmQnKVxufVxuIiwiLyogZ2xvYmFsIE11dGF0aW9uT2JzZXJ2ZXIgKi9cbnZhciBkb2N1bWVudCA9IHJlcXVpcmUoJ2dsb2JhbC9kb2N1bWVudCcpXG52YXIgd2luZG93ID0gcmVxdWlyZSgnZ2xvYmFsL3dpbmRvdycpXG52YXIgd2F0Y2ggPSBPYmplY3QuY3JlYXRlKG51bGwpXG52YXIgS0VZX0lEID0gJ29ubG9hZGlkJyArIChuZXcgRGF0ZSgpICUgOWU2KS50b1N0cmluZygzNilcbnZhciBLRVlfQVRUUiA9ICdkYXRhLScgKyBLRVlfSURcbnZhciBJTkRFWCA9IDBcblxuaWYgKHdpbmRvdyAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcikge1xuICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAobXV0YXRpb25zKSB7XG4gICAgaWYgKE9iamVjdC5rZXlzKHdhdGNoKS5sZW5ndGggPCAxKSByZXR1cm5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG11dGF0aW9ucy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKG11dGF0aW9uc1tpXS5hdHRyaWJ1dGVOYW1lID09PSBLRVlfQVRUUikge1xuICAgICAgICBlYWNoQXR0cihtdXRhdGlvbnNbaV0sIHR1cm5vbiwgdHVybm9mZilcbiAgICAgICAgY29udGludWVcbiAgICAgIH1cbiAgICAgIGVhY2hNdXRhdGlvbihtdXRhdGlvbnNbaV0ucmVtb3ZlZE5vZGVzLCB0dXJub2ZmKVxuICAgICAgZWFjaE11dGF0aW9uKG11dGF0aW9uc1tpXS5hZGRlZE5vZGVzLCB0dXJub24pXG4gICAgfVxuICB9KVxuICBvYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHtcbiAgICBjaGlsZExpc3Q6IHRydWUsXG4gICAgc3VidHJlZTogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVzOiB0cnVlLFxuICAgIGF0dHJpYnV0ZU9sZFZhbHVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZUZpbHRlcjogW0tFWV9BVFRSXVxuICB9KVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG9ubG9hZCAoZWwsIG9uLCBvZmYsIGNhbGxlcikge1xuICBvbiA9IG9uIHx8IGZ1bmN0aW9uICgpIHt9XG4gIG9mZiA9IG9mZiB8fCBmdW5jdGlvbiAoKSB7fVxuICBlbC5zZXRBdHRyaWJ1dGUoS0VZX0FUVFIsICdvJyArIElOREVYKVxuICB3YXRjaFsnbycgKyBJTkRFWF0gPSBbb24sIG9mZiwgMCwgY2FsbGVyIHx8IG9ubG9hZC5jYWxsZXJdXG4gIElOREVYICs9IDFcbiAgcmV0dXJuIGVsXG59XG5cbmZ1bmN0aW9uIHR1cm5vbiAoaW5kZXgsIGVsKSB7XG4gIGlmICh3YXRjaFtpbmRleF1bMF0gJiYgd2F0Y2hbaW5kZXhdWzJdID09PSAwKSB7XG4gICAgd2F0Y2hbaW5kZXhdWzBdKGVsKVxuICAgIHdhdGNoW2luZGV4XVsyXSA9IDFcbiAgfVxufVxuXG5mdW5jdGlvbiB0dXJub2ZmIChpbmRleCwgZWwpIHtcbiAgaWYgKHdhdGNoW2luZGV4XVsxXSAmJiB3YXRjaFtpbmRleF1bMl0gPT09IDEpIHtcbiAgICB3YXRjaFtpbmRleF1bMV0oZWwpXG4gICAgd2F0Y2hbaW5kZXhdWzJdID0gMFxuICB9XG59XG5cbmZ1bmN0aW9uIGVhY2hBdHRyIChtdXRhdGlvbiwgb24sIG9mZikge1xuICB2YXIgbmV3VmFsdWUgPSBtdXRhdGlvbi50YXJnZXQuZ2V0QXR0cmlidXRlKEtFWV9BVFRSKVxuICBpZiAoc2FtZU9yaWdpbihtdXRhdGlvbi5vbGRWYWx1ZSwgbmV3VmFsdWUpKSB7XG4gICAgd2F0Y2hbbmV3VmFsdWVdID0gd2F0Y2hbbXV0YXRpb24ub2xkVmFsdWVdXG4gICAgcmV0dXJuXG4gIH1cbiAgaWYgKHdhdGNoW211dGF0aW9uLm9sZFZhbHVlXSkge1xuICAgIG9mZihtdXRhdGlvbi5vbGRWYWx1ZSwgbXV0YXRpb24udGFyZ2V0KVxuICB9XG4gIGlmICh3YXRjaFtuZXdWYWx1ZV0pIHtcbiAgICBvbihuZXdWYWx1ZSwgbXV0YXRpb24udGFyZ2V0KVxuICB9XG59XG5cbmZ1bmN0aW9uIHNhbWVPcmlnaW4gKG9sZFZhbHVlLCBuZXdWYWx1ZSkge1xuICBpZiAoIW9sZFZhbHVlIHx8ICFuZXdWYWx1ZSkgcmV0dXJuIGZhbHNlXG4gIHJldHVybiB3YXRjaFtvbGRWYWx1ZV1bM10gPT09IHdhdGNoW25ld1ZhbHVlXVszXVxufVxuXG5mdW5jdGlvbiBlYWNoTXV0YXRpb24gKG5vZGVzLCBmbikge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHdhdGNoKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKG5vZGVzW2ldICYmIG5vZGVzW2ldLmdldEF0dHJpYnV0ZSAmJiBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpKSB7XG4gICAgICB2YXIgb25sb2FkaWQgPSBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpXG4gICAgICBrZXlzLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgaWYgKG9ubG9hZGlkID09PSBrKSB7XG4gICAgICAgICAgZm4oaywgbm9kZXNbaV0pXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICAgIGlmIChub2Rlc1tpXS5jaGlsZE5vZGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIGVhY2hNdXRhdGlvbihub2Rlc1tpXS5jaGlsZE5vZGVzLCBmbilcbiAgICB9XG4gIH1cbn1cbiIsIi8qKlxuICogQ29udmVydCBhcnJheSBvZiAxNiBieXRlIHZhbHVlcyB0byBVVUlEIHN0cmluZyBmb3JtYXQgb2YgdGhlIGZvcm06XG4gKiBYWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFhcbiAqL1xudmFyIGJ5dGVUb0hleCA9IFtdO1xuZm9yICh2YXIgaSA9IDA7IGkgPCAyNTY7ICsraSkge1xuICBieXRlVG9IZXhbaV0gPSAoaSArIDB4MTAwKS50b1N0cmluZygxNikuc3Vic3RyKDEpO1xufVxuXG5mdW5jdGlvbiBieXRlc1RvVXVpZChidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IG9mZnNldCB8fCAwO1xuICB2YXIgYnRoID0gYnl0ZVRvSGV4O1xuICByZXR1cm4gYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJ5dGVzVG9VdWlkO1xuIiwiLy8gVW5pcXVlIElEIGNyZWF0aW9uIHJlcXVpcmVzIGEgaGlnaCBxdWFsaXR5IHJhbmRvbSAjIGdlbmVyYXRvci4gIEluIHRoZVxuLy8gYnJvd3NlciB0aGlzIGlzIGEgbGl0dGxlIGNvbXBsaWNhdGVkIGR1ZSB0byB1bmtub3duIHF1YWxpdHkgb2YgTWF0aC5yYW5kb20oKVxuLy8gYW5kIGluY29uc2lzdGVudCBzdXBwb3J0IGZvciB0aGUgYGNyeXB0b2AgQVBJLiAgV2UgZG8gdGhlIGJlc3Qgd2UgY2FuIHZpYVxuLy8gZmVhdHVyZS1kZXRlY3Rpb25cbnZhciBybmc7XG5cbnZhciBjcnlwdG8gPSBnbG9iYWwuY3J5cHRvIHx8IGdsb2JhbC5tc0NyeXB0bzsgLy8gZm9yIElFIDExXG5pZiAoY3J5cHRvICYmIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMpIHtcbiAgLy8gV0hBVFdHIGNyeXB0byBSTkcgLSBodHRwOi8vd2lraS53aGF0d2cub3JnL3dpa2kvQ3J5cHRvXG4gIHZhciBybmRzOCA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby11bmRlZlxuICBybmcgPSBmdW5jdGlvbiB3aGF0d2dSTkcoKSB7XG4gICAgY3J5cHRvLmdldFJhbmRvbVZhbHVlcyhybmRzOCk7XG4gICAgcmV0dXJuIHJuZHM4O1xuICB9O1xufVxuXG5pZiAoIXJuZykge1xuICAvLyBNYXRoLnJhbmRvbSgpLWJhc2VkIChSTkcpXG4gIC8vXG4gIC8vIElmIGFsbCBlbHNlIGZhaWxzLCB1c2UgTWF0aC5yYW5kb20oKS4gIEl0J3MgZmFzdCwgYnV0IGlzIG9mIHVuc3BlY2lmaWVkXG4gIC8vIHF1YWxpdHkuXG4gIHZhciBybmRzID0gbmV3IEFycmF5KDE2KTtcbiAgcm5nID0gZnVuY3Rpb24oKSB7XG4gICAgZm9yICh2YXIgaSA9IDAsIHI7IGkgPCAxNjsgaSsrKSB7XG4gICAgICBpZiAoKGkgJiAweDAzKSA9PT0gMCkgciA9IE1hdGgucmFuZG9tKCkgKiAweDEwMDAwMDAwMDtcbiAgICAgIHJuZHNbaV0gPSByID4+PiAoKGkgJiAweDAzKSA8PCAzKSAmIDB4ZmY7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJuZHM7XG4gIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcm5nO1xuIiwidmFyIHJuZyA9IHJlcXVpcmUoJy4vbGliL3JuZycpO1xudmFyIGJ5dGVzVG9VdWlkID0gcmVxdWlyZSgnLi9saWIvYnl0ZXNUb1V1aWQnKTtcblxuLy8gKipgdjEoKWAgLSBHZW5lcmF0ZSB0aW1lLWJhc2VkIFVVSUQqKlxuLy9cbi8vIEluc3BpcmVkIGJ5IGh0dHBzOi8vZ2l0aHViLmNvbS9MaW9zSy9VVUlELmpzXG4vLyBhbmQgaHR0cDovL2RvY3MucHl0aG9uLm9yZy9saWJyYXJ5L3V1aWQuaHRtbFxuXG4vLyByYW5kb20gIydzIHdlIG5lZWQgdG8gaW5pdCBub2RlIGFuZCBjbG9ja3NlcVxudmFyIF9zZWVkQnl0ZXMgPSBybmcoKTtcblxuLy8gUGVyIDQuNSwgY3JlYXRlIGFuZCA0OC1iaXQgbm9kZSBpZCwgKDQ3IHJhbmRvbSBiaXRzICsgbXVsdGljYXN0IGJpdCA9IDEpXG52YXIgX25vZGVJZCA9IFtcbiAgX3NlZWRCeXRlc1swXSB8IDB4MDEsXG4gIF9zZWVkQnl0ZXNbMV0sIF9zZWVkQnl0ZXNbMl0sIF9zZWVkQnl0ZXNbM10sIF9zZWVkQnl0ZXNbNF0sIF9zZWVkQnl0ZXNbNV1cbl07XG5cbi8vIFBlciA0LjIuMiwgcmFuZG9taXplICgxNCBiaXQpIGNsb2Nrc2VxXG52YXIgX2Nsb2Nrc2VxID0gKF9zZWVkQnl0ZXNbNl0gPDwgOCB8IF9zZWVkQnl0ZXNbN10pICYgMHgzZmZmO1xuXG4vLyBQcmV2aW91cyB1dWlkIGNyZWF0aW9uIHRpbWVcbnZhciBfbGFzdE1TZWNzID0gMCwgX2xhc3ROU2VjcyA9IDA7XG5cbi8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vYnJvb2ZhL25vZGUtdXVpZCBmb3IgQVBJIGRldGFpbHNcbmZ1bmN0aW9uIHYxKG9wdGlvbnMsIGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gYnVmICYmIG9mZnNldCB8fCAwO1xuICB2YXIgYiA9IGJ1ZiB8fCBbXTtcblxuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB2YXIgY2xvY2tzZXEgPSBvcHRpb25zLmNsb2Nrc2VxICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLmNsb2Nrc2VxIDogX2Nsb2Nrc2VxO1xuXG4gIC8vIFVVSUQgdGltZXN0YW1wcyBhcmUgMTAwIG5hbm8tc2Vjb25kIHVuaXRzIHNpbmNlIHRoZSBHcmVnb3JpYW4gZXBvY2gsXG4gIC8vICgxNTgyLTEwLTE1IDAwOjAwKS4gIEpTTnVtYmVycyBhcmVuJ3QgcHJlY2lzZSBlbm91Z2ggZm9yIHRoaXMsIHNvXG4gIC8vIHRpbWUgaXMgaGFuZGxlZCBpbnRlcm5hbGx5IGFzICdtc2VjcycgKGludGVnZXIgbWlsbGlzZWNvbmRzKSBhbmQgJ25zZWNzJ1xuICAvLyAoMTAwLW5hbm9zZWNvbmRzIG9mZnNldCBmcm9tIG1zZWNzKSBzaW5jZSB1bml4IGVwb2NoLCAxOTcwLTAxLTAxIDAwOjAwLlxuICB2YXIgbXNlY3MgPSBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIHVzZSBjb3VudCBvZiB1dWlkJ3MgZ2VuZXJhdGVkIGR1cmluZyB0aGUgY3VycmVudCBjbG9ja1xuICAvLyBjeWNsZSB0byBzaW11bGF0ZSBoaWdoZXIgcmVzb2x1dGlvbiBjbG9ja1xuICB2YXIgbnNlY3MgPSBvcHRpb25zLm5zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm5zZWNzIDogX2xhc3ROU2VjcyArIDE7XG5cbiAgLy8gVGltZSBzaW5jZSBsYXN0IHV1aWQgY3JlYXRpb24gKGluIG1zZWNzKVxuICB2YXIgZHQgPSAobXNlY3MgLSBfbGFzdE1TZWNzKSArIChuc2VjcyAtIF9sYXN0TlNlY3MpLzEwMDAwO1xuXG4gIC8vIFBlciA0LjIuMS4yLCBCdW1wIGNsb2Nrc2VxIG9uIGNsb2NrIHJlZ3Jlc3Npb25cbiAgaWYgKGR0IDwgMCAmJiBvcHRpb25zLmNsb2Nrc2VxID09PSB1bmRlZmluZWQpIHtcbiAgICBjbG9ja3NlcSA9IGNsb2Nrc2VxICsgMSAmIDB4M2ZmZjtcbiAgfVxuXG4gIC8vIFJlc2V0IG5zZWNzIGlmIGNsb2NrIHJlZ3Jlc3NlcyAobmV3IGNsb2Nrc2VxKSBvciB3ZSd2ZSBtb3ZlZCBvbnRvIGEgbmV3XG4gIC8vIHRpbWUgaW50ZXJ2YWxcbiAgaWYgKChkdCA8IDAgfHwgbXNlY3MgPiBfbGFzdE1TZWNzKSAmJiBvcHRpb25zLm5zZWNzID09PSB1bmRlZmluZWQpIHtcbiAgICBuc2VjcyA9IDA7XG4gIH1cblxuICAvLyBQZXIgNC4yLjEuMiBUaHJvdyBlcnJvciBpZiB0b28gbWFueSB1dWlkcyBhcmUgcmVxdWVzdGVkXG4gIGlmIChuc2VjcyA+PSAxMDAwMCkge1xuICAgIHRocm93IG5ldyBFcnJvcigndXVpZC52MSgpOiBDYW5cXCd0IGNyZWF0ZSBtb3JlIHRoYW4gMTBNIHV1aWRzL3NlYycpO1xuICB9XG5cbiAgX2xhc3RNU2VjcyA9IG1zZWNzO1xuICBfbGFzdE5TZWNzID0gbnNlY3M7XG4gIF9jbG9ja3NlcSA9IGNsb2Nrc2VxO1xuXG4gIC8vIFBlciA0LjEuNCAtIENvbnZlcnQgZnJvbSB1bml4IGVwb2NoIHRvIEdyZWdvcmlhbiBlcG9jaFxuICBtc2VjcyArPSAxMjIxOTI5MjgwMDAwMDtcblxuICAvLyBgdGltZV9sb3dgXG4gIHZhciB0bCA9ICgobXNlY3MgJiAweGZmZmZmZmYpICogMTAwMDAgKyBuc2VjcykgJSAweDEwMDAwMDAwMDtcbiAgYltpKytdID0gdGwgPj4+IDI0ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDE2ICYgMHhmZjtcbiAgYltpKytdID0gdGwgPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfbWlkYFxuICB2YXIgdG1oID0gKG1zZWNzIC8gMHgxMDAwMDAwMDAgKiAxMDAwMCkgJiAweGZmZmZmZmY7XG4gIGJbaSsrXSA9IHRtaCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRtaCAmIDB4ZmY7XG5cbiAgLy8gYHRpbWVfaGlnaF9hbmRfdmVyc2lvbmBcbiAgYltpKytdID0gdG1oID4+PiAyNCAmIDB4ZiB8IDB4MTA7IC8vIGluY2x1ZGUgdmVyc2lvblxuICBiW2krK10gPSB0bWggPj4+IDE2ICYgMHhmZjtcblxuICAvLyBgY2xvY2tfc2VxX2hpX2FuZF9yZXNlcnZlZGAgKFBlciA0LjIuMiAtIGluY2x1ZGUgdmFyaWFudClcbiAgYltpKytdID0gY2xvY2tzZXEgPj4+IDggfCAweDgwO1xuXG4gIC8vIGBjbG9ja19zZXFfbG93YFxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7XG5cbiAgLy8gYG5vZGVgXG4gIHZhciBub2RlID0gb3B0aW9ucy5ub2RlIHx8IF9ub2RlSWQ7XG4gIGZvciAodmFyIG4gPSAwOyBuIDwgNjsgKytuKSB7XG4gICAgYltpICsgbl0gPSBub2RlW25dO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZiA/IGJ1ZiA6IGJ5dGVzVG9VdWlkKGIpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHYxO1xuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG52YXIgdHJpZSA9IHJlcXVpcmUoJy4vdHJpZScpXG5cbm1vZHVsZS5leHBvcnRzID0gV2F5ZmFyZXJcblxuLy8gY3JlYXRlIGEgcm91dGVyXG4vLyBzdHIgLT4gb2JqXG5mdW5jdGlvbiBXYXlmYXJlciAoZGZ0KSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBXYXlmYXJlcikpIHJldHVybiBuZXcgV2F5ZmFyZXIoZGZ0KVxuXG4gIHZhciBfZGVmYXVsdCA9IChkZnQgfHwgJycpLnJlcGxhY2UoL15cXC8vLCAnJylcbiAgdmFyIF90cmllID0gdHJpZSgpXG5cbiAgZW1pdC5fdHJpZSA9IF90cmllXG4gIGVtaXQuZW1pdCA9IGVtaXRcbiAgZW1pdC5vbiA9IG9uXG4gIGVtaXQuX3dheWZhcmVyID0gdHJ1ZVxuXG4gIHJldHVybiBlbWl0XG5cbiAgLy8gZGVmaW5lIGEgcm91dGVcbiAgLy8gKHN0ciwgZm4pIC0+IG9ialxuICBmdW5jdGlvbiBvbiAocm91dGUsIGNiKSB7XG4gICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiByb3V0ZSwgJ3N0cmluZycpXG4gICAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjYiwgJ2Z1bmN0aW9uJylcblxuICAgIHJvdXRlID0gcm91dGUgfHwgJy8nXG4gICAgY2Iucm91dGUgPSByb3V0ZVxuXG4gICAgaWYgKGNiICYmIGNiLl93YXlmYXJlciAmJiBjYi5fdHJpZSkge1xuICAgICAgX3RyaWUubW91bnQocm91dGUsIGNiLl90cmllLnRyaWUpXG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBub2RlID0gX3RyaWUuY3JlYXRlKHJvdXRlKVxuICAgICAgbm9kZS5jYiA9IGNiXG4gICAgfVxuXG4gICAgcmV0dXJuIGVtaXRcbiAgfVxuXG4gIC8vIG1hdGNoIGFuZCBjYWxsIGEgcm91dGVcbiAgLy8gKHN0ciwgb2JqPykgLT4gbnVsbFxuICBmdW5jdGlvbiBlbWl0IChyb3V0ZSkge1xuICAgIGFzc2VydC5ub3RFcXVhbChyb3V0ZSwgdW5kZWZpbmVkLCBcIidyb3V0ZScgbXVzdCBiZSBkZWZpbmVkXCIpXG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aClcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV1cbiAgICB9XG5cbiAgICB2YXIgbm9kZSA9IF90cmllLm1hdGNoKHJvdXRlKVxuICAgIGlmIChub2RlICYmIG5vZGUuY2IpIHtcbiAgICAgIGFyZ3NbMF0gPSBub2RlLnBhcmFtc1xuICAgICAgdmFyIGNiID0gbm9kZS5jYlxuICAgICAgcmV0dXJuIGNiLmFwcGx5KGNiLCBhcmdzKVxuICAgIH1cblxuICAgIHZhciBkZnQgPSBfdHJpZS5tYXRjaChfZGVmYXVsdClcbiAgICBpZiAoZGZ0ICYmIGRmdC5jYikge1xuICAgICAgYXJnc1swXSA9IGRmdC5wYXJhbXNcbiAgICAgIHZhciBkZnRjYiA9IGRmdC5jYlxuICAgICAgcmV0dXJuIGRmdGNiLmFwcGx5KGRmdGNiLCBhcmdzKVxuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcihcInJvdXRlICdcIiArIHJvdXRlICsgXCInIGRpZCBub3QgbWF0Y2hcIilcbiAgfVxufVxuIiwidmFyIG11dGF0ZSA9IHJlcXVpcmUoJ3h0ZW5kL211dGFibGUnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG52YXIgeHRlbmQgPSByZXF1aXJlKCd4dGVuZCcpXG5cbm1vZHVsZS5leHBvcnRzID0gVHJpZVxuXG4vLyBjcmVhdGUgYSBuZXcgdHJpZVxuLy8gbnVsbCAtPiBvYmpcbmZ1bmN0aW9uIFRyaWUgKCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgVHJpZSkpIHJldHVybiBuZXcgVHJpZSgpXG4gIHRoaXMudHJpZSA9IHsgbm9kZXM6IHt9IH1cbn1cblxuLy8gY3JlYXRlIGEgbm9kZSBvbiB0aGUgdHJpZSBhdCByb3V0ZVxuLy8gYW5kIHJldHVybiBhIG5vZGVcbi8vIHN0ciAtPiBudWxsXG5UcmllLnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAocm91dGUpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiByb3V0ZSwgJ3N0cmluZycsICdyb3V0ZSBzaG91bGQgYmUgYSBzdHJpbmcnKVxuICAvLyBzdHJpcCBsZWFkaW5nICcvJyBhbmQgc3BsaXQgcm91dGVzXG4gIHZhciByb3V0ZXMgPSByb3V0ZS5yZXBsYWNlKC9eXFwvLywgJycpLnNwbGl0KCcvJylcblxuICBmdW5jdGlvbiBjcmVhdGVOb2RlIChpbmRleCwgdHJpZSkge1xuICAgIHZhciB0aGlzUm91dGUgPSAocm91dGVzLmhhc093blByb3BlcnR5KGluZGV4KSAmJiByb3V0ZXNbaW5kZXhdKVxuICAgIGlmICh0aGlzUm91dGUgPT09IGZhbHNlKSByZXR1cm4gdHJpZVxuXG4gICAgdmFyIG5vZGUgPSBudWxsXG4gICAgaWYgKC9eOnxeXFwqLy50ZXN0KHRoaXNSb3V0ZSkpIHtcbiAgICAgIC8vIGlmIG5vZGUgaXMgYSBuYW1lIG1hdGNoLCBzZXQgbmFtZSBhbmQgYXBwZW5kIHRvICc6JyBub2RlXG4gICAgICBpZiAoIXRyaWUubm9kZXMuaGFzT3duUHJvcGVydHkoJyQkJykpIHtcbiAgICAgICAgbm9kZSA9IHsgbm9kZXM6IHt9IH1cbiAgICAgICAgdHJpZS5ub2Rlc1snJCQnXSA9IG5vZGVcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5vZGUgPSB0cmllLm5vZGVzWyckJCddXG4gICAgICB9XG5cbiAgICAgIGlmICh0aGlzUm91dGVbMF0gPT09ICcqJykge1xuICAgICAgICB0cmllLndpbGRjYXJkID0gdHJ1ZVxuICAgICAgfVxuXG4gICAgICB0cmllLm5hbWUgPSB0aGlzUm91dGUucmVwbGFjZSgvXjp8XlxcKi8sICcnKVxuICAgIH0gZWxzZSBpZiAoIXRyaWUubm9kZXMuaGFzT3duUHJvcGVydHkodGhpc1JvdXRlKSkge1xuICAgICAgbm9kZSA9IHsgbm9kZXM6IHt9IH1cbiAgICAgIHRyaWUubm9kZXNbdGhpc1JvdXRlXSA9IG5vZGVcbiAgICB9IGVsc2Uge1xuICAgICAgbm9kZSA9IHRyaWUubm9kZXNbdGhpc1JvdXRlXVxuICAgIH1cblxuICAgIC8vIHdlIG11c3QgcmVjdXJzZSBkZWVwZXJcbiAgICByZXR1cm4gY3JlYXRlTm9kZShpbmRleCArIDEsIG5vZGUpXG4gIH1cblxuICByZXR1cm4gY3JlYXRlTm9kZSgwLCB0aGlzLnRyaWUpXG59XG5cbi8vIG1hdGNoIGEgcm91dGUgb24gdGhlIHRyaWVcbi8vIGFuZCByZXR1cm4gdGhlIG5vZGVcbi8vIHN0ciAtPiBvYmpcblRyaWUucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24gKHJvdXRlKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2Ygcm91dGUsICdzdHJpbmcnLCAncm91dGUgc2hvdWxkIGJlIGEgc3RyaW5nJylcblxuICB2YXIgcm91dGVzID0gcm91dGUucmVwbGFjZSgvXlxcLy8sICcnKS5zcGxpdCgnLycpXG4gIHZhciBwYXJhbXMgPSB7fVxuXG4gIGZ1bmN0aW9uIHNlYXJjaCAoaW5kZXgsIHRyaWUpIHtcbiAgICAvLyBlaXRoZXIgdGhlcmUncyBubyBtYXRjaCwgb3Igd2UncmUgZG9uZSBzZWFyY2hpbmdcbiAgICBpZiAodHJpZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdW5kZWZpbmVkXG4gICAgdmFyIHRoaXNSb3V0ZSA9IHJvdXRlc1tpbmRleF1cbiAgICBpZiAodGhpc1JvdXRlID09PSB1bmRlZmluZWQpIHJldHVybiB0cmllXG5cbiAgICBpZiAodHJpZS5ub2Rlcy5oYXNPd25Qcm9wZXJ0eSh0aGlzUm91dGUpKSB7XG4gICAgICAvLyBtYXRjaCByZWd1bGFyIHJvdXRlcyBmaXJzdFxuICAgICAgcmV0dXJuIHNlYXJjaChpbmRleCArIDEsIHRyaWUubm9kZXNbdGhpc1JvdXRlXSlcbiAgICB9IGVsc2UgaWYgKHRyaWUubmFtZSkge1xuICAgICAgLy8gbWF0Y2ggbmFtZWQgcm91dGVzXG4gICAgICB0cnkge1xuICAgICAgICBwYXJhbXNbdHJpZS5uYW1lXSA9IGRlY29kZVVSSUNvbXBvbmVudCh0aGlzUm91dGUpXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBzZWFyY2goaW5kZXgsIHVuZGVmaW5lZClcbiAgICAgIH1cbiAgICAgIHJldHVybiBzZWFyY2goaW5kZXggKyAxLCB0cmllLm5vZGVzWyckJCddKVxuICAgIH0gZWxzZSBpZiAodHJpZS53aWxkY2FyZCkge1xuICAgICAgLy8gbWF0Y2ggd2lsZGNhcmRzXG4gICAgICB0cnkge1xuICAgICAgICBwYXJhbXNbJ3dpbGRjYXJkJ10gPSBkZWNvZGVVUklDb21wb25lbnQocm91dGVzLnNsaWNlKGluZGV4KS5qb2luKCcvJykpXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBzZWFyY2goaW5kZXgsIHVuZGVmaW5lZClcbiAgICAgIH1cbiAgICAgIC8vIHJldHVybiBlYXJseSwgb3IgZWxzZSBzZWFyY2ggbWF5IGtlZXAgcmVjdXJzaW5nIHRocm91Z2ggdGhlIHdpbGRjYXJkXG4gICAgICByZXR1cm4gdHJpZS5ub2Rlc1snJCQnXVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBubyBtYXRjaGVzIGZvdW5kXG4gICAgICByZXR1cm4gc2VhcmNoKGluZGV4ICsgMSlcbiAgICB9XG4gIH1cblxuICB2YXIgbm9kZSA9IHNlYXJjaCgwLCB0aGlzLnRyaWUpXG5cbiAgaWYgKCFub2RlKSByZXR1cm4gdW5kZWZpbmVkXG4gIG5vZGUgPSB4dGVuZChub2RlKVxuICBub2RlLnBhcmFtcyA9IHBhcmFtc1xuICByZXR1cm4gbm9kZVxufVxuXG4vLyBtb3VudCBhIHRyaWUgb250byBhIG5vZGUgYXQgcm91dGVcbi8vIChzdHIsIG9iaikgLT4gbnVsbFxuVHJpZS5wcm90b3R5cGUubW91bnQgPSBmdW5jdGlvbiAocm91dGUsIHRyaWUpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiByb3V0ZSwgJ3N0cmluZycsICdyb3V0ZSBzaG91bGQgYmUgYSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIHRyaWUsICdvYmplY3QnLCAndHJpZSBzaG91bGQgYmUgYSBvYmplY3QnKVxuXG4gIHZhciBzcGxpdCA9IHJvdXRlLnJlcGxhY2UoL15cXC8vLCAnJykuc3BsaXQoJy8nKVxuICB2YXIgbm9kZSA9IG51bGxcbiAgdmFyIGtleSA9IG51bGxcblxuICBpZiAoc3BsaXQubGVuZ3RoID09PSAxKSB7XG4gICAga2V5ID0gc3BsaXRbMF1cbiAgICBub2RlID0gdGhpcy5jcmVhdGUoa2V5KVxuICB9IGVsc2Uge1xuICAgIHZhciBoZWFkQXJyID0gc3BsaXQuc3BsaWNlKDAsIHNwbGl0Lmxlbmd0aCAtIDEpXG4gICAgdmFyIGhlYWQgPSBoZWFkQXJyLmpvaW4oJy8nKVxuICAgIGtleSA9IHNwbGl0WzBdXG4gICAgbm9kZSA9IHRoaXMuY3JlYXRlKGhlYWQpXG4gIH1cblxuICBtdXRhdGUobm9kZS5ub2RlcywgdHJpZS5ub2RlcylcbiAgaWYgKHRyaWUubmFtZSkgbm9kZS5uYW1lID0gdHJpZS5uYW1lXG5cbiAgLy8gZGVsZWdhdGUgcHJvcGVydGllcyBmcm9tICcvJyB0byB0aGUgbmV3IG5vZGVcbiAgLy8gJy8nIGNhbm5vdCBiZSByZWFjaGVkIG9uY2UgbW91bnRlZFxuICBpZiAobm9kZS5ub2Rlc1snJ10pIHtcbiAgICBPYmplY3Qua2V5cyhub2RlLm5vZGVzWycnXSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICBpZiAoa2V5ID09PSAnbm9kZXMnKSByZXR1cm5cbiAgICAgIG5vZGVba2V5XSA9IG5vZGUubm9kZXNbJyddW2tleV1cbiAgICB9KVxuICAgIG11dGF0ZShub2RlLm5vZGVzLCBub2RlLm5vZGVzWycnXS5ub2RlcylcbiAgICBkZWxldGUgbm9kZS5ub2Rlc1snJ10ubm9kZXNcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZnVuY3Rpb24gZXh0ZW5kKCkge1xuICAgIHZhciB0YXJnZXQgPSB7fVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBjb21wYXJlIGFuZCBpc0J1ZmZlciB0YWtlbiBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9mZXJvc3MvYnVmZmVyL2Jsb2IvNjgwZTllNWU0ODhmMjJhYWMyNzU5OWE1N2RjODQ0YTYzMTU5MjhkZC9pbmRleC5qc1xuLy8gb3JpZ2luYWwgbm90aWNlOlxuXG4vKiFcbiAqIFRoZSBidWZmZXIgbW9kdWxlIGZyb20gbm9kZS5qcywgZm9yIHRoZSBicm93c2VyLlxuICpcbiAqIEBhdXRob3IgICBGZXJvc3MgQWJvdWtoYWRpamVoIDxmZXJvc3NAZmVyb3NzLm9yZz4gPGh0dHA6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5mdW5jdGlvbiBjb21wYXJlKGEsIGIpIHtcbiAgaWYgKGEgPT09IGIpIHtcbiAgICByZXR1cm4gMDtcbiAgfVxuXG4gIHZhciB4ID0gYS5sZW5ndGg7XG4gIHZhciB5ID0gYi5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IE1hdGgubWluKHgsIHkpOyBpIDwgbGVuOyArK2kpIHtcbiAgICBpZiAoYVtpXSAhPT0gYltpXSkge1xuICAgICAgeCA9IGFbaV07XG4gICAgICB5ID0gYltpXTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIGlmICh4IDwgeSkge1xuICAgIHJldHVybiAtMTtcbiAgfVxuICBpZiAoeSA8IHgpIHtcbiAgICByZXR1cm4gMTtcbiAgfVxuICByZXR1cm4gMDtcbn1cbmZ1bmN0aW9uIGlzQnVmZmVyKGIpIHtcbiAgaWYgKGdsb2JhbC5CdWZmZXIgJiYgdHlwZW9mIGdsb2JhbC5CdWZmZXIuaXNCdWZmZXIgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZ2xvYmFsLkJ1ZmZlci5pc0J1ZmZlcihiKTtcbiAgfVxuICByZXR1cm4gISEoYiAhPSBudWxsICYmIGIuX2lzQnVmZmVyKTtcbn1cblxuLy8gYmFzZWQgb24gbm9kZSBhc3NlcnQsIG9yaWdpbmFsIG5vdGljZTpcblxuLy8gaHR0cDovL3dpa2kuY29tbW9uanMub3JnL3dpa2kvVW5pdF9UZXN0aW5nLzEuMFxuLy9cbi8vIFRISVMgSVMgTk9UIFRFU1RFRCBOT1IgTElLRUxZIFRPIFdPUksgT1VUU0lERSBWOCFcbi8vXG4vLyBPcmlnaW5hbGx5IGZyb20gbmFyd2hhbC5qcyAoaHR0cDovL25hcndoYWxqcy5vcmcpXG4vLyBDb3B5cmlnaHQgKGMpIDIwMDkgVGhvbWFzIFJvYmluc29uIDwyODBub3J0aC5jb20+XG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weVxuLy8gb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgJ1NvZnR3YXJlJyksIHRvXG4vLyBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZVxuLy8gcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yXG4vLyBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpc1xuLy8gZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZCBpblxuLy8gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEICdBUyBJUycsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1Jcbi8vIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLFxuLy8gRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFXG4vLyBBVVRIT1JTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTlxuLy8gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTlxuLy8gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbC8nKTtcbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xudmFyIHBTbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcbnZhciBmdW5jdGlvbnNIYXZlTmFtZXMgPSAoZnVuY3Rpb24gKCkge1xuICByZXR1cm4gZnVuY3Rpb24gZm9vKCkge30ubmFtZSA9PT0gJ2Zvbyc7XG59KCkpO1xuZnVuY3Rpb24gcFRvU3RyaW5nIChvYmopIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopO1xufVxuZnVuY3Rpb24gaXNWaWV3KGFycmJ1Zikge1xuICBpZiAoaXNCdWZmZXIoYXJyYnVmKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodHlwZW9mIGdsb2JhbC5BcnJheUJ1ZmZlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAodHlwZW9mIEFycmF5QnVmZmVyLmlzVmlldyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBBcnJheUJ1ZmZlci5pc1ZpZXcoYXJyYnVmKTtcbiAgfVxuICBpZiAoIWFycmJ1Zikge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoYXJyYnVmIGluc3RhbmNlb2YgRGF0YVZpZXcpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoYXJyYnVmLmJ1ZmZlciAmJiBhcnJidWYuYnVmZmVyIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG4vLyAxLiBUaGUgYXNzZXJ0IG1vZHVsZSBwcm92aWRlcyBmdW5jdGlvbnMgdGhhdCB0aHJvd1xuLy8gQXNzZXJ0aW9uRXJyb3IncyB3aGVuIHBhcnRpY3VsYXIgY29uZGl0aW9ucyBhcmUgbm90IG1ldC4gVGhlXG4vLyBhc3NlcnQgbW9kdWxlIG11c3QgY29uZm9ybSB0byB0aGUgZm9sbG93aW5nIGludGVyZmFjZS5cblxudmFyIGFzc2VydCA9IG1vZHVsZS5leHBvcnRzID0gb2s7XG5cbi8vIDIuIFRoZSBBc3NlcnRpb25FcnJvciBpcyBkZWZpbmVkIGluIGFzc2VydC5cbi8vIG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IoeyBtZXNzYWdlOiBtZXNzYWdlLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdHVhbDogYWN0dWFsLFxuLy8gICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkOiBleHBlY3RlZCB9KVxuXG52YXIgcmVnZXggPSAvXFxzKmZ1bmN0aW9uXFxzKyhbXlxcKFxcc10qKVxccyovO1xuLy8gYmFzZWQgb24gaHR0cHM6Ly9naXRodWIuY29tL2xqaGFyYi9mdW5jdGlvbi5wcm90b3R5cGUubmFtZS9ibG9iL2FkZWVlZWM4YmZjYzYwNjhiMTg3ZDdkOWZiM2Q1YmIxZDNhMzA4OTkvaW1wbGVtZW50YXRpb24uanNcbmZ1bmN0aW9uIGdldE5hbWUoZnVuYykge1xuICBpZiAoIXV0aWwuaXNGdW5jdGlvbihmdW5jKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoZnVuY3Rpb25zSGF2ZU5hbWVzKSB7XG4gICAgcmV0dXJuIGZ1bmMubmFtZTtcbiAgfVxuICB2YXIgc3RyID0gZnVuYy50b1N0cmluZygpO1xuICB2YXIgbWF0Y2ggPSBzdHIubWF0Y2gocmVnZXgpO1xuICByZXR1cm4gbWF0Y2ggJiYgbWF0Y2hbMV07XG59XG5hc3NlcnQuQXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbiBBc3NlcnRpb25FcnJvcihvcHRpb25zKSB7XG4gIHRoaXMubmFtZSA9ICdBc3NlcnRpb25FcnJvcic7XG4gIHRoaXMuYWN0dWFsID0gb3B0aW9ucy5hY3R1YWw7XG4gIHRoaXMuZXhwZWN0ZWQgPSBvcHRpb25zLmV4cGVjdGVkO1xuICB0aGlzLm9wZXJhdG9yID0gb3B0aW9ucy5vcGVyYXRvcjtcbiAgaWYgKG9wdGlvbnMubWVzc2FnZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IG9wdGlvbnMubWVzc2FnZTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBnZXRNZXNzYWdlKHRoaXMpO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IHRydWU7XG4gIH1cbiAgdmFyIHN0YWNrU3RhcnRGdW5jdGlvbiA9IG9wdGlvbnMuc3RhY2tTdGFydEZ1bmN0aW9uIHx8IGZhaWw7XG4gIGlmIChFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSkge1xuICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHN0YWNrU3RhcnRGdW5jdGlvbik7XG4gIH0gZWxzZSB7XG4gICAgLy8gbm9uIHY4IGJyb3dzZXJzIHNvIHdlIGNhbiBoYXZlIGEgc3RhY2t0cmFjZVxuICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoKTtcbiAgICBpZiAoZXJyLnN0YWNrKSB7XG4gICAgICB2YXIgb3V0ID0gZXJyLnN0YWNrO1xuXG4gICAgICAvLyB0cnkgdG8gc3RyaXAgdXNlbGVzcyBmcmFtZXNcbiAgICAgIHZhciBmbl9uYW1lID0gZ2V0TmFtZShzdGFja1N0YXJ0RnVuY3Rpb24pO1xuICAgICAgdmFyIGlkeCA9IG91dC5pbmRleE9mKCdcXG4nICsgZm5fbmFtZSk7XG4gICAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgICAgLy8gb25jZSB3ZSBoYXZlIGxvY2F0ZWQgdGhlIGZ1bmN0aW9uIGZyYW1lXG4gICAgICAgIC8vIHdlIG5lZWQgdG8gc3RyaXAgb3V0IGV2ZXJ5dGhpbmcgYmVmb3JlIGl0IChhbmQgaXRzIGxpbmUpXG4gICAgICAgIHZhciBuZXh0X2xpbmUgPSBvdXQuaW5kZXhPZignXFxuJywgaWR4ICsgMSk7XG4gICAgICAgIG91dCA9IG91dC5zdWJzdHJpbmcobmV4dF9saW5lICsgMSk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuc3RhY2sgPSBvdXQ7XG4gICAgfVxuICB9XG59O1xuXG4vLyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3IgaW5zdGFuY2VvZiBFcnJvclxudXRpbC5pbmhlcml0cyhhc3NlcnQuQXNzZXJ0aW9uRXJyb3IsIEVycm9yKTtcblxuZnVuY3Rpb24gdHJ1bmNhdGUocywgbikge1xuICBpZiAodHlwZW9mIHMgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHMubGVuZ3RoIDwgbiA/IHMgOiBzLnNsaWNlKDAsIG4pO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzO1xuICB9XG59XG5mdW5jdGlvbiBpbnNwZWN0KHNvbWV0aGluZykge1xuICBpZiAoZnVuY3Rpb25zSGF2ZU5hbWVzIHx8ICF1dGlsLmlzRnVuY3Rpb24oc29tZXRoaW5nKSkge1xuICAgIHJldHVybiB1dGlsLmluc3BlY3Qoc29tZXRoaW5nKTtcbiAgfVxuICB2YXIgcmF3bmFtZSA9IGdldE5hbWUoc29tZXRoaW5nKTtcbiAgdmFyIG5hbWUgPSByYXduYW1lID8gJzogJyArIHJhd25hbWUgOiAnJztcbiAgcmV0dXJuICdbRnVuY3Rpb24nICsgIG5hbWUgKyAnXSc7XG59XG5mdW5jdGlvbiBnZXRNZXNzYWdlKHNlbGYpIHtcbiAgcmV0dXJuIHRydW5jYXRlKGluc3BlY3Qoc2VsZi5hY3R1YWwpLCAxMjgpICsgJyAnICtcbiAgICAgICAgIHNlbGYub3BlcmF0b3IgKyAnICcgK1xuICAgICAgICAgdHJ1bmNhdGUoaW5zcGVjdChzZWxmLmV4cGVjdGVkKSwgMTI4KTtcbn1cblxuLy8gQXQgcHJlc2VudCBvbmx5IHRoZSB0aHJlZSBrZXlzIG1lbnRpb25lZCBhYm92ZSBhcmUgdXNlZCBhbmRcbi8vIHVuZGVyc3Rvb2QgYnkgdGhlIHNwZWMuIEltcGxlbWVudGF0aW9ucyBvciBzdWIgbW9kdWxlcyBjYW4gcGFzc1xuLy8gb3RoZXIga2V5cyB0byB0aGUgQXNzZXJ0aW9uRXJyb3IncyBjb25zdHJ1Y3RvciAtIHRoZXkgd2lsbCBiZVxuLy8gaWdub3JlZC5cblxuLy8gMy4gQWxsIG9mIHRoZSBmb2xsb3dpbmcgZnVuY3Rpb25zIG11c3QgdGhyb3cgYW4gQXNzZXJ0aW9uRXJyb3Jcbi8vIHdoZW4gYSBjb3JyZXNwb25kaW5nIGNvbmRpdGlvbiBpcyBub3QgbWV0LCB3aXRoIGEgbWVzc2FnZSB0aGF0XG4vLyBtYXkgYmUgdW5kZWZpbmVkIGlmIG5vdCBwcm92aWRlZC4gIEFsbCBhc3NlcnRpb24gbWV0aG9kcyBwcm92aWRlXG4vLyBib3RoIHRoZSBhY3R1YWwgYW5kIGV4cGVjdGVkIHZhbHVlcyB0byB0aGUgYXNzZXJ0aW9uIGVycm9yIGZvclxuLy8gZGlzcGxheSBwdXJwb3Nlcy5cblxuZnVuY3Rpb24gZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCBvcGVyYXRvciwgc3RhY2tTdGFydEZ1bmN0aW9uKSB7XG4gIHRocm93IG5ldyBhc3NlcnQuQXNzZXJ0aW9uRXJyb3Ioe1xuICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXG4gICAgYWN0dWFsOiBhY3R1YWwsXG4gICAgZXhwZWN0ZWQ6IGV4cGVjdGVkLFxuICAgIG9wZXJhdG9yOiBvcGVyYXRvcixcbiAgICBzdGFja1N0YXJ0RnVuY3Rpb246IHN0YWNrU3RhcnRGdW5jdGlvblxuICB9KTtcbn1cblxuLy8gRVhURU5TSU9OISBhbGxvd3MgZm9yIHdlbGwgYmVoYXZlZCBlcnJvcnMgZGVmaW5lZCBlbHNld2hlcmUuXG5hc3NlcnQuZmFpbCA9IGZhaWw7XG5cbi8vIDQuIFB1cmUgYXNzZXJ0aW9uIHRlc3RzIHdoZXRoZXIgYSB2YWx1ZSBpcyB0cnV0aHksIGFzIGRldGVybWluZWRcbi8vIGJ5ICEhZ3VhcmQuXG4vLyBhc3NlcnQub2soZ3VhcmQsIG1lc3NhZ2Vfb3B0KTtcbi8vIFRoaXMgc3RhdGVtZW50IGlzIGVxdWl2YWxlbnQgdG8gYXNzZXJ0LmVxdWFsKHRydWUsICEhZ3VhcmQsXG4vLyBtZXNzYWdlX29wdCk7LiBUbyB0ZXN0IHN0cmljdGx5IGZvciB0aGUgdmFsdWUgdHJ1ZSwgdXNlXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwodHJ1ZSwgZ3VhcmQsIG1lc3NhZ2Vfb3B0KTsuXG5cbmZ1bmN0aW9uIG9rKHZhbHVlLCBtZXNzYWdlKSB7XG4gIGlmICghdmFsdWUpIGZhaWwodmFsdWUsIHRydWUsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5vayk7XG59XG5hc3NlcnQub2sgPSBvaztcblxuLy8gNS4gVGhlIGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzaGFsbG93LCBjb2VyY2l2ZSBlcXVhbGl0eSB3aXRoXG4vLyA9PS5cbi8vIGFzc2VydC5lcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5lcXVhbCA9IGZ1bmN0aW9uIGVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPSBleHBlY3RlZCkgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQuZXF1YWwpO1xufTtcblxuLy8gNi4gVGhlIG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHdoZXRoZXIgdHdvIG9iamVjdHMgYXJlIG5vdCBlcXVhbFxuLy8gd2l0aCAhPSBhc3NlcnQubm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RXF1YWwgPSBmdW5jdGlvbiBub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPScsIGFzc2VydC5ub3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDcuIFRoZSBlcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgYSBkZWVwIGVxdWFsaXR5IHJlbGF0aW9uLlxuLy8gYXNzZXJ0LmRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5kZWVwRXF1YWwgPSBmdW5jdGlvbiBkZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoIV9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgZmFsc2UpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnZGVlcEVxdWFsJywgYXNzZXJ0LmRlZXBFcXVhbCk7XG4gIH1cbn07XG5cbmFzc2VydC5kZWVwU3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBkZWVwU3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoIV9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgdHJ1ZSkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdkZWVwU3RyaWN0RXF1YWwnLCBhc3NlcnQuZGVlcFN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBzdHJpY3QsIG1lbW9zKSB7XG4gIC8vIDcuMS4gQWxsIGlkZW50aWNhbCB2YWx1ZXMgYXJlIGVxdWl2YWxlbnQsIGFzIGRldGVybWluZWQgYnkgPT09LlxuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIHJldHVybiB0cnVlO1xuICB9IGVsc2UgaWYgKGlzQnVmZmVyKGFjdHVhbCkgJiYgaXNCdWZmZXIoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGNvbXBhcmUoYWN0dWFsLCBleHBlY3RlZCkgPT09IDA7XG5cbiAgLy8gNy4yLiBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBEYXRlIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBEYXRlIG9iamVjdCB0aGF0IHJlZmVycyB0byB0aGUgc2FtZSB0aW1lLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNEYXRlKGFjdHVhbCkgJiYgdXRpbC5pc0RhdGUoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5nZXRUaW1lKCkgPT09IGV4cGVjdGVkLmdldFRpbWUoKTtcblxuICAvLyA3LjMgSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgUmVnRXhwIG9iamVjdCwgdGhlIGFjdHVhbCB2YWx1ZSBpc1xuICAvLyBlcXVpdmFsZW50IGlmIGl0IGlzIGFsc28gYSBSZWdFeHAgb2JqZWN0IHdpdGggdGhlIHNhbWUgc291cmNlIGFuZFxuICAvLyBwcm9wZXJ0aWVzIChgZ2xvYmFsYCwgYG11bHRpbGluZWAsIGBsYXN0SW5kZXhgLCBgaWdub3JlQ2FzZWApLlxuICB9IGVsc2UgaWYgKHV0aWwuaXNSZWdFeHAoYWN0dWFsKSAmJiB1dGlsLmlzUmVnRXhwKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuc291cmNlID09PSBleHBlY3RlZC5zb3VyY2UgJiZcbiAgICAgICAgICAgYWN0dWFsLmdsb2JhbCA9PT0gZXhwZWN0ZWQuZ2xvYmFsICYmXG4gICAgICAgICAgIGFjdHVhbC5tdWx0aWxpbmUgPT09IGV4cGVjdGVkLm11bHRpbGluZSAmJlxuICAgICAgICAgICBhY3R1YWwubGFzdEluZGV4ID09PSBleHBlY3RlZC5sYXN0SW5kZXggJiZcbiAgICAgICAgICAgYWN0dWFsLmlnbm9yZUNhc2UgPT09IGV4cGVjdGVkLmlnbm9yZUNhc2U7XG5cbiAgLy8gNy40LiBPdGhlciBwYWlycyB0aGF0IGRvIG5vdCBib3RoIHBhc3MgdHlwZW9mIHZhbHVlID09ICdvYmplY3QnLFxuICAvLyBlcXVpdmFsZW5jZSBpcyBkZXRlcm1pbmVkIGJ5ID09LlxuICB9IGVsc2UgaWYgKChhY3R1YWwgPT09IG51bGwgfHwgdHlwZW9mIGFjdHVhbCAhPT0gJ29iamVjdCcpICYmXG4gICAgICAgICAgICAgKGV4cGVjdGVkID09PSBudWxsIHx8IHR5cGVvZiBleHBlY3RlZCAhPT0gJ29iamVjdCcpKSB7XG4gICAgcmV0dXJuIHN0cmljdCA/IGFjdHVhbCA9PT0gZXhwZWN0ZWQgOiBhY3R1YWwgPT0gZXhwZWN0ZWQ7XG5cbiAgLy8gSWYgYm90aCB2YWx1ZXMgYXJlIGluc3RhbmNlcyBvZiB0eXBlZCBhcnJheXMsIHdyYXAgdGhlaXIgdW5kZXJseWluZ1xuICAvLyBBcnJheUJ1ZmZlcnMgaW4gYSBCdWZmZXIgZWFjaCB0byBpbmNyZWFzZSBwZXJmb3JtYW5jZVxuICAvLyBUaGlzIG9wdGltaXphdGlvbiByZXF1aXJlcyB0aGUgYXJyYXlzIHRvIGhhdmUgdGhlIHNhbWUgdHlwZSBhcyBjaGVja2VkIGJ5XG4gIC8vIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcgKGFrYSBwVG9TdHJpbmcpLiBOZXZlciBwZXJmb3JtIGJpbmFyeVxuICAvLyBjb21wYXJpc29ucyBmb3IgRmxvYXQqQXJyYXlzLCB0aG91Z2gsIHNpbmNlIGUuZy4gKzAgPT09IC0wIGJ1dCB0aGVpclxuICAvLyBiaXQgcGF0dGVybnMgYXJlIG5vdCBpZGVudGljYWwuXG4gIH0gZWxzZSBpZiAoaXNWaWV3KGFjdHVhbCkgJiYgaXNWaWV3KGV4cGVjdGVkKSAmJlxuICAgICAgICAgICAgIHBUb1N0cmluZyhhY3R1YWwpID09PSBwVG9TdHJpbmcoZXhwZWN0ZWQpICYmXG4gICAgICAgICAgICAgIShhY3R1YWwgaW5zdGFuY2VvZiBGbG9hdDMyQXJyYXkgfHxcbiAgICAgICAgICAgICAgIGFjdHVhbCBpbnN0YW5jZW9mIEZsb2F0NjRBcnJheSkpIHtcbiAgICByZXR1cm4gY29tcGFyZShuZXcgVWludDhBcnJheShhY3R1YWwuYnVmZmVyKSxcbiAgICAgICAgICAgICAgICAgICBuZXcgVWludDhBcnJheShleHBlY3RlZC5idWZmZXIpKSA9PT0gMDtcblxuICAvLyA3LjUgRm9yIGFsbCBvdGhlciBPYmplY3QgcGFpcnMsIGluY2x1ZGluZyBBcnJheSBvYmplY3RzLCBlcXVpdmFsZW5jZSBpc1xuICAvLyBkZXRlcm1pbmVkIGJ5IGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoYXMgdmVyaWZpZWRcbiAgLy8gd2l0aCBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwpLCB0aGUgc2FtZSBzZXQgb2Yga2V5c1xuICAvLyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSwgZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5XG4gIC8vIGNvcnJlc3BvbmRpbmcga2V5LCBhbmQgYW4gaWRlbnRpY2FsICdwcm90b3R5cGUnIHByb3BlcnR5LiBOb3RlOiB0aGlzXG4gIC8vIGFjY291bnRzIGZvciBib3RoIG5hbWVkIGFuZCBpbmRleGVkIHByb3BlcnRpZXMgb24gQXJyYXlzLlxuICB9IGVsc2UgaWYgKGlzQnVmZmVyKGFjdHVhbCkgIT09IGlzQnVmZmVyKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIHtcbiAgICBtZW1vcyA9IG1lbW9zIHx8IHthY3R1YWw6IFtdLCBleHBlY3RlZDogW119O1xuXG4gICAgdmFyIGFjdHVhbEluZGV4ID0gbWVtb3MuYWN0dWFsLmluZGV4T2YoYWN0dWFsKTtcbiAgICBpZiAoYWN0dWFsSW5kZXggIT09IC0xKSB7XG4gICAgICBpZiAoYWN0dWFsSW5kZXggPT09IG1lbW9zLmV4cGVjdGVkLmluZGV4T2YoZXhwZWN0ZWQpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIG1lbW9zLmFjdHVhbC5wdXNoKGFjdHVhbCk7XG4gICAgbWVtb3MuZXhwZWN0ZWQucHVzaChleHBlY3RlZCk7XG5cbiAgICByZXR1cm4gb2JqRXF1aXYoYWN0dWFsLCBleHBlY3RlZCwgc3RyaWN0LCBtZW1vcyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNBcmd1bWVudHMob2JqZWN0KSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqZWN0KSA9PSAnW29iamVjdCBBcmd1bWVudHNdJztcbn1cblxuZnVuY3Rpb24gb2JqRXF1aXYoYSwgYiwgc3RyaWN0LCBhY3R1YWxWaXNpdGVkT2JqZWN0cykge1xuICBpZiAoYSA9PT0gbnVsbCB8fCBhID09PSB1bmRlZmluZWQgfHwgYiA9PT0gbnVsbCB8fCBiID09PSB1bmRlZmluZWQpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvLyBpZiBvbmUgaXMgYSBwcmltaXRpdmUsIHRoZSBvdGhlciBtdXN0IGJlIHNhbWVcbiAgaWYgKHV0aWwuaXNQcmltaXRpdmUoYSkgfHwgdXRpbC5pc1ByaW1pdGl2ZShiKSlcbiAgICByZXR1cm4gYSA9PT0gYjtcbiAgaWYgKHN0cmljdCAmJiBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYSkgIT09IE9iamVjdC5nZXRQcm90b3R5cGVPZihiKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIHZhciBhSXNBcmdzID0gaXNBcmd1bWVudHMoYSk7XG4gIHZhciBiSXNBcmdzID0gaXNBcmd1bWVudHMoYik7XG4gIGlmICgoYUlzQXJncyAmJiAhYklzQXJncykgfHwgKCFhSXNBcmdzICYmIGJJc0FyZ3MpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgaWYgKGFJc0FyZ3MpIHtcbiAgICBhID0gcFNsaWNlLmNhbGwoYSk7XG4gICAgYiA9IHBTbGljZS5jYWxsKGIpO1xuICAgIHJldHVybiBfZGVlcEVxdWFsKGEsIGIsIHN0cmljdCk7XG4gIH1cbiAgdmFyIGthID0gb2JqZWN0S2V5cyhhKTtcbiAgdmFyIGtiID0gb2JqZWN0S2V5cyhiKTtcbiAgdmFyIGtleSwgaTtcbiAgLy8gaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChrZXlzIGluY29ycG9yYXRlc1xuICAvLyBoYXNPd25Qcm9wZXJ0eSlcbiAgaWYgKGthLmxlbmd0aCAhPT0ga2IubGVuZ3RoKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy90aGUgc2FtZSBzZXQgb2Yga2V5cyAoYWx0aG91Z2ggbm90IG5lY2Vzc2FyaWx5IHRoZSBzYW1lIG9yZGVyKSxcbiAga2Euc29ydCgpO1xuICBrYi5zb3J0KCk7XG4gIC8vfn5+Y2hlYXAga2V5IHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBpZiAoa2FbaV0gIT09IGtiW2ldKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vZXF1aXZhbGVudCB2YWx1ZXMgZm9yIGV2ZXJ5IGNvcnJlc3BvbmRpbmcga2V5LCBhbmRcbiAgLy9+fn5wb3NzaWJseSBleHBlbnNpdmUgZGVlcCB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAga2V5ID0ga2FbaV07XG4gICAgaWYgKCFfZGVlcEVxdWFsKGFba2V5XSwgYltrZXldLCBzdHJpY3QsIGFjdHVhbFZpc2l0ZWRPYmplY3RzKSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gOC4gVGhlIG5vbi1lcXVpdmFsZW5jZSBhc3NlcnRpb24gdGVzdHMgZm9yIGFueSBkZWVwIGluZXF1YWxpdHkuXG4vLyBhc3NlcnQubm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdERlZXBFcXVhbCA9IGZ1bmN0aW9uIG5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIGZhbHNlKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ25vdERlZXBFcXVhbCcsIGFzc2VydC5ub3REZWVwRXF1YWwpO1xuICB9XG59O1xuXG5hc3NlcnQubm90RGVlcFN0cmljdEVxdWFsID0gbm90RGVlcFN0cmljdEVxdWFsO1xuZnVuY3Rpb24gbm90RGVlcFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgdHJ1ZSkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdub3REZWVwU3RyaWN0RXF1YWwnLCBub3REZWVwU3RyaWN0RXF1YWwpO1xuICB9XG59XG5cblxuLy8gOS4gVGhlIHN0cmljdCBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc3RyaWN0IGVxdWFsaXR5LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbi8vIGFzc2VydC5zdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5zdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIHN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PT0nLCBhc3NlcnQuc3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG4vLyAxMC4gVGhlIHN0cmljdCBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciBzdHJpY3QgaW5lcXVhbGl0eSwgYXNcbi8vIGRldGVybWluZWQgYnkgIT09LiAgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdFN0cmljdEVxdWFsID0gZnVuY3Rpb24gbm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9PScsIGFzc2VydC5ub3RTdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpIHtcbiAgaWYgKCFhY3R1YWwgfHwgIWV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChleHBlY3RlZCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICByZXR1cm4gZXhwZWN0ZWQudGVzdChhY3R1YWwpO1xuICB9XG5cbiAgdHJ5IHtcbiAgICBpZiAoYWN0dWFsIGluc3RhbmNlb2YgZXhwZWN0ZWQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIC8vIElnbm9yZS4gIFRoZSBpbnN0YW5jZW9mIGNoZWNrIGRvZXNuJ3Qgd29yayBmb3IgYXJyb3cgZnVuY3Rpb25zLlxuICB9XG5cbiAgaWYgKEVycm9yLmlzUHJvdG90eXBlT2YoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcmV0dXJuIGV4cGVjdGVkLmNhbGwoe30sIGFjdHVhbCkgPT09IHRydWU7XG59XG5cbmZ1bmN0aW9uIF90cnlCbG9jayhibG9jaykge1xuICB2YXIgZXJyb3I7XG4gIHRyeSB7XG4gICAgYmxvY2soKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGVycm9yID0gZTtcbiAgfVxuICByZXR1cm4gZXJyb3I7XG59XG5cbmZ1bmN0aW9uIF90aHJvd3Moc2hvdWxkVGhyb3csIGJsb2NrLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICB2YXIgYWN0dWFsO1xuXG4gIGlmICh0eXBlb2YgYmxvY2sgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcImJsb2NrXCIgYXJndW1lbnQgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gIH1cblxuICBpZiAodHlwZW9mIGV4cGVjdGVkID09PSAnc3RyaW5nJykge1xuICAgIG1lc3NhZ2UgPSBleHBlY3RlZDtcbiAgICBleHBlY3RlZCA9IG51bGw7XG4gIH1cblxuICBhY3R1YWwgPSBfdHJ5QmxvY2soYmxvY2spO1xuXG4gIG1lc3NhZ2UgPSAoZXhwZWN0ZWQgJiYgZXhwZWN0ZWQubmFtZSA/ICcgKCcgKyBleHBlY3RlZC5uYW1lICsgJykuJyA6ICcuJykgK1xuICAgICAgICAgICAgKG1lc3NhZ2UgPyAnICcgKyBtZXNzYWdlIDogJy4nKTtcblxuICBpZiAoc2hvdWxkVGhyb3cgJiYgIWFjdHVhbCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ01pc3NpbmcgZXhwZWN0ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgdmFyIHVzZXJQcm92aWRlZE1lc3NhZ2UgPSB0eXBlb2YgbWVzc2FnZSA9PT0gJ3N0cmluZyc7XG4gIHZhciBpc1Vud2FudGVkRXhjZXB0aW9uID0gIXNob3VsZFRocm93ICYmIHV0aWwuaXNFcnJvcihhY3R1YWwpO1xuICB2YXIgaXNVbmV4cGVjdGVkRXhjZXB0aW9uID0gIXNob3VsZFRocm93ICYmIGFjdHVhbCAmJiAhZXhwZWN0ZWQ7XG5cbiAgaWYgKChpc1Vud2FudGVkRXhjZXB0aW9uICYmXG4gICAgICB1c2VyUHJvdmlkZWRNZXNzYWdlICYmXG4gICAgICBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkgfHxcbiAgICAgIGlzVW5leHBlY3RlZEV4Y2VwdGlvbikge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgJ0dvdCB1bndhbnRlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICBpZiAoKHNob3VsZFRocm93ICYmIGFjdHVhbCAmJiBleHBlY3RlZCAmJlxuICAgICAgIWV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB8fCAoIXNob3VsZFRocm93ICYmIGFjdHVhbCkpIHtcbiAgICB0aHJvdyBhY3R1YWw7XG4gIH1cbn1cblxuLy8gMTEuIEV4cGVjdGVkIHRvIHRocm93IGFuIGVycm9yOlxuLy8gYXNzZXJ0LnRocm93cyhibG9jaywgRXJyb3Jfb3B0LCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC50aHJvd3MgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovZXJyb3IsIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cyh0cnVlLCBibG9jaywgZXJyb3IsIG1lc3NhZ2UpO1xufTtcblxuLy8gRVhURU5TSU9OISBUaGlzIGlzIGFubm95aW5nIHRvIHdyaXRlIG91dHNpZGUgdGhpcyBtb2R1bGUuXG5hc3NlcnQuZG9lc05vdFRocm93ID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL2Vycm9yLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3MoZmFsc2UsIGJsb2NrLCBlcnJvciwgbWVzc2FnZSk7XG59O1xuXG5hc3NlcnQuaWZFcnJvciA9IGZ1bmN0aW9uKGVycikgeyBpZiAoZXJyKSB0aHJvdyBlcnI7IH07XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICB2YXIga2V5cyA9IFtdO1xuICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgaWYgKGhhc093bi5jYWxsKG9iaiwga2V5KSkga2V5cy5wdXNoKGtleSk7XG4gIH1cbiAgcmV0dXJuIGtleXM7XG59O1xuIiwiIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiJdfQ==
