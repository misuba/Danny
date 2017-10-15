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

},{"./lib/appView":2,"./lib/store/appStore":31,"./lib/store/bgStore":32,"./lib/store/cardStore":33,"./lib/store/editBarStore":34,"./lib/store/editModalStore":35,"./lib/store/elementStore":36,"./lib/store/fieldStore":37,"./lib/store/imageStore":38,"choo":42}],2:[function(require,module,exports){
const html = require('choo/html');

const background = require('./bgView');
const card = require('./cardView');
const editBar = require('./editBarView');
const editModal = require('./editModalView');

const { color } = require('./util');

const mainView = function(state, emit) {
    if (typeof state.editing != 'function') {
        setTimeout(() => emit('render'), 1);
        return html`<main id="hanzo"></main>`;
    }

    const currentColor = color(state);
    return html`<main class="${state.editMode || ""}"
        style="${currentColor ? "background-color:" + currentColor : ""}">
      ${state.editing() ? editBar(state, emit) : null}
      ${background(state, emit)}
      ${card(state, emit)}
      ${state.editingObject() ? editModal(state, emit) : null}
    </main>`;
};

module.exports = mainView;

},{"./bgView":4,"./cardView":5,"./editBarView":6,"./editModalView":7,"./util":39,"choo/html":41}],3:[function(require,module,exports){
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
    'clickElement': {'clickElement': null},
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
                cd.index > state.getCurrentCardIndex() &&
                    cd.background === state.getCurrentBackgroundIndex()
            );
            if (!samesies.length && behavObj.wrap) {
                samesies = withIndex.filter((cd) =>
                    cd.index < state.getCurrentCardIndex() &&
                        cd.background === state.getCurrentBackgroundIndex()
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
                cd.index < state.getCurrentCardIndex() &&
                    cd.background === state.getCurrentBackgroundIndex()
            );
            if (!samesies.length && behavObj.wrap) {
                samesies = withIndex.filter((cd) =>
                    cd.index > state.getCurrentCardIndex() &&
                        cd.background === state.getCurrentBackgroundIndex()
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
        } else if (behavObj.schedule) {
            state.cardScheduled = setTimeout(
                () => behavObj.schedule.forEach(doBehavior),
                behavObj.seconds * 1000
            );
            // ah but we don't know this behavior is card-level
            // but anyway that's {schedule: [behav, behav...], seconds: num}
        } else if (behavObj.clickElement) {
            const name = behavObj.clickElement;
            const card = state.getCurrentCard();
            const anyOnCard = card.elements.filter((elm) => elm.name == name);
            if (anyOnCard.length) {
                anyOnCard[0].behavior.forEach(doBehavior);
            } else {
                const bg = state.getCurrentBackground();
                const anyOnBg = bg.elements.filter((elm) => elm.name == name);
                if (anyOnBg.length) {
                    anyOnBg[0].behavior.forEach(doBehavior);
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
    // Promise.each(behavArr,
    //  (behavObj, behavIndex) => doBehavior(behavObj, behavIndex)
    // )
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
    const opts = [selectOption(null, '-', selectType)];
    const behaviorKeys = Object.keys(behaviorComponents);

    for (const behaviorKey of behaviorKeys) {
        opts.push(selectOption(behaviorKey, selectType));
    }
    return html`<select data-realvalue="${selectType}" name="${name}" onchange=${(e) => handler(path, e.target.value)}>
        ${opts}
    </select>`;
}

module.exports = {parseAndRunBehaviors, behavior, behavTypeMenu, behaviorList};

},{"./form/behaviorsToComponents":10,"./form/ifComponents":19,"./form/ifLogic":20,"./util":39,"choo/html":41,"uuid/v1":82}],4:[function(require,module,exports){
const html = require('choo/html');

const Image = require('./imageView.js');
const GraphicElement = require('./graphicView.js');
const Element = require('./elementView.js');
const Field = require('./fieldView.js');


const bgView = (state, emit) => {
    const bg = state.getCurrentBackground();
    return html`<section id="bg">
        ${drawImages()}
        ${drawElements()}
        ${drawFields()}
    </section>`;

    function drawImages() {
        if (bg && bg.images) {
            return bg.images.map((elm, ind) =>
                Image(elm, ind, state, emit)
            );
        }
        return html`<div id="bg-no-images"></div>`;
    }

    function drawElements() {
        if (bg && bg.elements) {
            return bg.elements.map((but, ind) =>
                Element(but, ind, state, emit)
            );
        }
        return html`<span class="bg-no-elements"></span>`;
    }

    function drawFields() {
        if (bg && bg.fields) {
            return Object.keys(bg.fields).map(fldName => {
                let fieldWithValueMaybe = Object.assign(
                    {},
                    bg.fields[fldName],
                    { value: state.getCurrentCard().values[fldName] || "" }
                );
                return Field(fieldWithValueMaybe, fldName, state, emit);
            });
        }
        return html`<span class="bg-no-fields"></span>`;
    }
};

module.exports = bgView;

},{"./elementView.js":8,"./fieldView.js":9,"./graphicView.js":28,"./imageView.js":29,"choo/html":41}],5:[function(require,module,exports){
const html = require('choo/html');

const Image = require('./imageView.js');
const GraphicElement = require('./graphicView.js');
const Element = require('./elementView.js');
const Field = require('./fieldView.js');


const cardView = (state, emit) => {
    const card = state.getCurrentCard();
    return html`<article id="card">
        ${drawImages()}
        ${drawElements()}
        ${drawFields()}
    </article>`;

    function drawImages() {
        if (card && card.images) {
            return card.images.map((elm, ind) =>
                Image(elm, ind, state, emit, true)
            );
        }
        return html`<div id="card-no-images"></div>`
    }

    function drawElements() {
        if (card && card.elements) {
            return card.elements.map((but, ind) =>
                Element(but, ind, state, emit, true)
            );
        }
        return html`<span id="card-no-elements"></span>`
    }

    function drawFields() {
        if (card && card.fields) {
            return Object.keys(card.fields).map((fldName) =>
                Field(card.fields[fldName], fldName, state, emit, true)
            );
        }
        return html`<span id="card-no-fields"></span>`
    }
};

module.exports = cardView;

},{"./elementView.js":8,"./fieldView.js":9,"./graphicView.js":28,"./imageView.js":29,"choo/html":41}],6:[function(require,module,exports){
const html = require("choo/html");

const {selectOption} = require('./util');


const editBarView = (state, emit) => {
    const isBg = state.editingBackground();
    const ecks = html`<a href="#" onclick=${() => emit('turnOffEditMode')}></a>`;
    ecks.innerHTML = '&times;';

    return html`<nav id="editbar">
      <aside class="readout">
        Danny 0.1 👦🏾<br />
        ${isBg
            ? html`<span>Bg ${state.getCurrentBackgroundIndex()} of ${state.getBackgroundCount()}</span>`
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
            ${isBg ? 'Card' : 'Background'} mode
        </a></li>
        <li><a href="#" onclick=${() => emit(isBg ? 'editBg' :'editCard')}>
            Edit ${isBg ? 'background' : 'card'}
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

},{"./util":39,"choo/html":41}],7:[function(require,module,exports){
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

    const modal = html`<section id="editmodal"><div class="scrolly">
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
    </div></section>`;
    // setTimeout(() =>
    //     modal.querySelector('div.scrolly').style.height = modal.clientHeight + 'px',
    // 1);
    return modal;

    function toggleFunctionEdit(where = 'function') {
        const isiton = state.editingFunction;
        if ((isiton && where == 'style') || (!isiton && where == 'function')) {
            emit('toggleFunctionEdit');
        } // i don't know, is that dumb?
    }
};

module.exports = editModalView;

},{"./form/bgStyleView.js":11,"./form/cardStyleView.js":12,"./form/editBehaviorView.js":14,"./form/elementStyleView.js":15,"./form/fieldStyleView.js":16,"./form/imageStyleView.js":21,"./form/stackComboView.js":27,"choo/html":41}],8:[function(require,module,exports){
const html = require('choo/html');
const commonmark = require('commonmark');

const {parseAndRunBehaviors} = require('./behavior.js');


const ensureStylePixels = (val) => {
    return typeof val == 'number' ? val + 'px' : val;
}

const elementView = (element, index, state, emit, isCard) => {
    const attrs = {
        height: ensureStylePixels(element.height),
        width: ensureStylePixels(element.width),
        top: ensureStylePixels(element.top),
        left: ensureStylePixels(element.left),
        'background-color': element.color,
        'font-family': element.font,
        'font-size': element.size,
        color: element.textColor
    }; // this data munge step may belong in a store?
    let elementStyles = Object.keys(attrs).map((key) => (key + ':' + attrs[key] + ';')).join('');
    if (element.style) {
        elementStyles += element.style;
    }

    const clickHandler = function(event) {
        if (event.altKey ||
            (state.editMode === 'editMode' && isCard) ||
            (state.editMode === 'bgEdit' && !isCard)
        ) {
            editElement();
        } else if (element.behavior && element.behavior.length) {
            parseAndRunBehaviors(state, emit, element.behavior);
        }
    };

    let elm;
    if (isDraggable()) {
        elm = html`<div class="element movable ${elementClasses()}"
            onclick=${(e) => editModeClick(e)}
            onmousedown=${(e) => mouseDown(e)}
            onmouseleave=${(e) => mouseLeave(e)}
            onmouseup=${(e) => mouseUp(e)}
            style="${elementStyles}"></div>`;
    } else {
        elm = html`<div class="element ${elementClasses()}"
          onclick=${clickHandler}
          style="${elementStyles}"></div>`;
    }
    elm.innerHTML = renderMarkdown(element.text);
    if (isDraggable() || !element.hidden) {
        return elm;
    }
    return null;

    function elementClasses() {
        const klass = [];
        if (element.behavior && element.behavior.length && !state.editMode) {
            klass.push('behaves-on-click');
        }
        if (element.hidden) {
            klass.push('hidden');
        }
        klass.push(element.class);
        return klass.join(' ');
    }

    function renderMarkdown(txt) {
        const reader = new commonmark.Parser();
        const writer = new commonmark.HtmlRenderer({safe: true});
        return writer.render(reader.parse(txt));
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

},{"./behavior.js":3,"choo/html":41,"commonmark":46}],9:[function(require,module,exports){
const html = require('choo/html');

const {toPx} = require('./util');


const fieldView = (field, name, state, emit, isCard) => {
    let fld;
    if (field.type == 'select') {
        fld = html`<select name="${field.name}"
            onchange="${(evt) => emit('fieldchange', evt, field)}"
            class="${fieldClasses()}" />
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
            class="${fieldClasses()}"
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
            class="${fieldClasses()}"
            style="${fieldStyles()}" />
        `;
    }
    if (state.editMode) {
        return html`<div class="fieldshim ${fieldClasses()}"
                style="${fieldStyles()}"
                onclick=${(e) => editModeClick(e)}
                onmousedown=${(e) => mouseDown(e)}
                onmouseleave=${(e) => mouseLeave(e)}
                onmouseup=${(e) => mouseUp(e)}>
            <p>${field.name}</p>
            <aside>Value: <span>${field.value}</span></aside>
        </div>`;
    }
    if (isDraggable() || !field.hidden) {
        return fld;
    }
    return null;

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

    function fieldClasses() {
        const klass = [];
        if (isDraggable()) {
            klass.push('movable');
        }
        if (field.hidden) {
            klass.push('hidden');
        }
        klass.push(field['class']);
        return klass.join(' ');
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

},{"./util":39,"choo/html":41}],10:[function(require,module,exports){
module.exports = {
    goToNextCard: require('./goToNextCardComponent'),
    goToPreviousCard: require('./goToPreviousCardComponent'),
    'if': null, // here to be counted, but not actually handled by a sep. component
    clickElement: require('./clickElementComponent'),
    jumpTo: require('./jumpToComponent'),
    removeTruth: require('./removeTruthComponent'),
    setTruth: require('./setTruthComponent'),
    linkTo: require('./linkToComponent'),
    playSound: require('./playSoundComponent')
};

},{"./clickElementComponent":13,"./goToNextCardComponent":17,"./goToPreviousCardComponent":18,"./jumpToComponent":22,"./linkToComponent":23,"./playSoundComponent":24,"./removeTruthComponent":25,"./setTruthComponent":26}],11:[function(require,module,exports){
const html = require('choo/html');


const cardStyleView = (state, emit) => {
  let bg = state.getCurrentBackground();
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

},{"choo/html":41}],12:[function(require,module,exports){
const html = require('choo/html');


const cardStyleView = (state, emit) => {
  let card = state.getCurrentCard();
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

},{"choo/html":41}],13:[function(require,module,exports){
const html = require('choo/html');

const {selectOption} = require('../util');


function clickElement(state, emit, behav, path) {
    const card = state.getCurrentCard();
    const bg = state.getCurrentBackground();

    const namedElms = elmsWithName(card).concat(elmsWithName(bg));

    return html`<div>
        <section>do the Behavior of the element named
            <select name="elementToClick"
                    onchange=${(e) => emit('setBehaviorObj', [path, {'clickElement': e.target.value}])}>
                ${selectOption(null, '-', behav.clickElement === null, -1)}
                ${namedElms.map((name) =>
                    selectOption(name, behav.clickElement)
                )}
            </select>
        </section>
    </div>`;

    function elmsWithName(env) {
        return env.elements.filter((elm) =>
            typeof elm.name !== 'undefined' && elm.name !== ''
        ).map((elm) => elm.name);
    }
}

module.exports = clickElement;

},{"../util":39,"choo/html":41}],14:[function(require,module,exports){
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

},{"../behavior":3,"../util":39,"choo/html":41}],15:[function(require,module,exports){
const html = require('choo/html');

const {selectOption, checkBox} = require('../util');


const elementStyleView = (state, emit) => {
  let elm = state.getEditedObject();
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
        <tr>
            <td>
              <p><label for="color">Color</label><br />
              <input type="color"
                onchange=${changeHandler}
                name="color"
                value="${elm.color || '#333333'}" />
                <button onclick=${clearHandlerFor('color')}>
                  Clear
                </button>
              </p>
            </td>
            <td>
              <p><label for="textColor">Text Color</label><br />
              <input type="color"
                onchange=${changeHandler}
                name="textColor"
                value="${elm.textColor || '#000000'}" />
                <button onclick=${clearHandlerFor('textColor')}>
                   Clear
                 </button>
              </p>
            </td>
        </tr>
        <tr>
          <td>${fieldFor('font','Font')}</td>
          <td>${fieldFor('size','Font Size')}</td>
        </tr>
    </table>

      <p><label for="text">Text</label>
      (you can use most of <a target="_blank" href="http://commonmark.org/help/">Markdown</a>)<br />
      <textarea class="elmtext" wrap="virtual"
        onchange=${changeHandler}
        name="text">${elm.text || ''}</textarea>
      </p>

      ${checkBox('Hidden', elm.hidden,
        (e) => emit('propertyChange', {target:{name:'hidden',value: e.target.checked}}))}

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

},{"../util":39,"choo/html":41}],16:[function(require,module,exports){
const html = require('choo/html');

const {selectOption, checkBox} = require('../util');


const fieldStyleView = (state, emit) => {
  let fld = state.getEditedObject();
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
      ${fld.type==='Menu' ? optionsField() : null}

      ${checkBox('Hidden', fld.hidden,
        (e) => emit('propertyChange', {target:{name:'hidden',value: e.target.checked}}))}

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

},{"../util":39,"choo/html":41}],17:[function(require,module,exports){
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

},{"../util":39,"choo/html":41}],18:[function(require,module,exports){
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

},{"../util":39,"choo/html":41}],19:[function(require,module,exports){
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

},{"../util":39,"choo/html":41}],20:[function(require,module,exports){
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

},{"../util":39}],21:[function(require,module,exports){
const html = require('choo/html');

const {checkBox} = require('../util');


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

      ${checkBox('Hidden', img.hidden,
        (e) => emit('propertyChange', {target:{name:'hidden',value: e.target.checked}}))}

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

},{"../util":39,"choo/html":41}],22:[function(require,module,exports){
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

},{"../util":39,"choo/html":41}],23:[function(require,module,exports){
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

},{"choo/html":41}],24:[function(require,module,exports){
const html = require('choo/html');

const {selectOption} = require('../util');


function playSound(state, emit, behav, path) {
    emit('ensureStaticFileLists');

    const yourBasicHandler = (e) =>
        emit('setBehaviorObj', [path, {'playSound': e.target.value}]);
    const statics = state.staticFiles ? state.staticFiles : [];

    return html`<div>
        <section>
            <small>(put a WAV, MP3, or OGG in the <code>/img</code> folder for now, sorry)</small><br />
            <select onchange=${yourBasicHandler} name="playSound">
                ${selectOption(null, '-', behav.playSound)}
                ${statics.map((filename) =>
                    selectOption(filename, behav.playSound))}
            </select>
        </section>
    </div>`;
}

module.exports = playSound;

},{"../util":39,"choo/html":41}],25:[function(require,module,exports){
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

},{"choo/html":41}],26:[function(require,module,exports){
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

},{"choo/html":41}],27:[function(require,module,exports){
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

},{"choo/html":41}],28:[function(require,module,exports){
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

},{"choo/html":41}],29:[function(require,module,exports){
const html = require('choo/html');

const {parseAndRunBehaviors} = require('./behavior.js');


const IMAGE_ROTATION = {
    3: 'rotate(180deg)',
    6: 'rotate(90deg)',
    8: 'rotate(270deg)'
}

module.exports = function(element, index, state, emit, isCard) {
    if (isDraggable()) {
        return html`<img class="${imageClasses()}"
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
    if (isDraggable() || !element.hidden) {
        return html`<img class="${imageClasses()}"
            onclick=${clickHandler}
            src="${element.src}"
            alt="${element.alt ? element.alt : ''}"
            height="${element.height ? element.height : ''}"
            width="${element.width ? element.width : ''}"
            style="top:${element.top};left:${element.left};${inlineStyles()}"
        />`;
    }
    return null;

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
        const klass = [];
        if (isDraggable()) {
            klass.push('movable');
        }
        if (element.behavior && element.behavior.length) {
            klass.push('behaves-on-click');
        }
        if (element.hidden) {
            klass.push('hidden');
        }
        klass.push(element['class']);
        return klass.join(' ');
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

},{"./behavior.js":3,"choo/html":41}],30:[function(require,module,exports){
const {modPath, getPath} = require('./util');


module.exports = function(state, emitter) {
    const poke = modPath(state, emitter);

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
        if (state.currentBackground) {
            return state.currentBackground;
        };
        return state.getCurrentCard().background;
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
    state.getBackgroundCount = () => {
        return Object.keys(state.backgrounds).length;
    };

    state.setPropertyAtPath = (pathArray, value) => {
        poke(pathArray, value);
    }
    state.getPropertyAtPath = (pathArray) => {
        return getPath(state, pathArray);
    };

    state.setCurrentCardProperty = (pathArray, value) => {
        state.setPropertyAtPath(
            ['cards', state.getCurrentCardIndex()].concat(pathArray),
            value
        );
    };
    state.setCurrentBackgroundProperty = (pathArray, value) => {
        state.setPropertyAtPath(
            ['backgrounds', state.getCurrentBackgroundIndex()].concat(pathArray),
            value
        );
    }

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

        state.editingImage = state.editingElement = state.editingField = null;
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

    state.getEditedObjectIndex = () => {
        return state.editingPath[state.editingPath.length - 1];
    }
    state.editingObject = () => !!state.editingPath;
    state.getEditedObject = () => {
        if (!state.editingObject()) {
            return null;
        }
        return state.getPropertyAtPath(state.editingPath);
    };
    state.getEditedObjectType = () => {
        if (!state.editingObject()) {
            return null;
        }
        return state.editingPath.includes('elements')
            ? 'element'
            : (state.editingPath.includes('images')
                ? 'image'
                : (state.editingPath.includes('fields')
                    ? 'field'
                    : (state.editingPath.includes('stack')
                        ? 'stack'
                        : (state.editingPath.includes('backgrounds')
                            ? 'background'
                            : 'card')))); // maybe a better way to do this :-/
    };

    state.setEditMode = (toWhat) => {
        if (typeof toWhat === 'boolean') {
            // isCardLevel and the like
            toWhat = toWhat ? 'editMode' : 'bgEdit';
        }
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
    state.getEditScopePath = () => {
        if (!state.editing()) {
            return null;
        }
        return state.editingBackground()
            ? ['backgrounds', state.getCurrentBackgroundIndex()]
            : ['cards', state.getCurrentCardIndex()];
    }

    // what about dragging
    // maybe dragging stays how it is because it shouldn't hit the disk ever

    state.saveField = function(event, field, state) {
        const newValue = event.target.value;
        const card = state.getCurrentCard();
        if (card.fields[field.name]) {
            state.setCurrentCardProperty(['fields', field.name, 'value'], newValue);
        } else {
            state.setCurrentCardProperty(['values', field.name], newValue);
        }
    };

    return state;
};

},{"./util":39}],31:[function(require,module,exports){
const stateApi = require('../stateApi');


const AppStore = async function(state, emitter) {
    const localArc = new DatArchive(window.location.toString());
    const rawState = JSON.parse(await localArc.readFile('stack.json'));
    Object.keys(rawState).forEach((key) => {
        state[key] = rawState[key];
    });

    state = stateApi(state, emitter);

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
                   (state.nextCard !== state.getCurrentCardIndex() || force === true)) {
            let num = state.nextCard;
            state.card = Object.assign({}, state.cards[num]);
            state.currentCard = num;
            if (!state.background ||
                    state.getCurrentCard().background !== state.getCurrentBackgroundIndex()) {
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


    // // kick it off
    // if (state.getCurrentCard()) {
    //     state.setNextCard(state.getCurrentCardIndex());
    setTimeout(() => emitter.emit('render'), 1);
    // }


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
                if (state.editingObject()) {
                    emitter.emit('closeEdit');
                } else if (state.editing()) {
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

    function asyncEmit(...args) {
        return new Promise((resolve, reject) => {
            emitter.emit.apply(emitter, args);
            setTimeout(resolve, 1);
        });
    }
};

module.exports = AppStore;

},{"../stateApi":30}],32:[function(require,module,exports){
const {parseAndRunBehaviors} = require('../behavior.js');
const {uniqueName} = require('../util');


const BgStore = (state, emitter) => {
    emitter.on('backgroundLoaded', function() {
        const bg = state.getCurrentBackground();
        if (bg.behavior && bg.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), bg.behavior);
        }
        if (state.editingPath && state.editingPath.length == 2 && state.editingPath[0] == 'backgrounds') {
            // already in bg-editing mode, so update the path
            state.editingPath[1] = state.getCurrentBackgroundIndex();
        }
    });

    emitter.on('cardLoaded', function() {
        const bg = state.getCurrentBackground();
        const values = state.getCurrentCard().values;
        if (values) {
            Object.keys(values).forEach((fieldName) => {
                if (bg.fields[fieldName]) {
                    state.setCurrentBackgroundProperty(['fields', fieldName, 'value'],
                        values[fieldName]
                    );
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

    emitter.on('newBg', function(name) {
        if (name === null || typeof name == 'undefined') {
            name = uniqueName(['backgrounds'], 'newBg');
        }
        state.backgrounds[name] = Object.assign({}, blankBg);
        // then go there?
    });

    emitter.on('editBg', function() {
        state.editObject(['backgrounds', state.getCurrentBackgroundIndex()]);
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('envPropertyChange', function(event) {
        if (state.editing() && state.editingPath[0] === 'backgrounds') {
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

},{"../behavior.js":3,"../util":39}],33:[function(require,module,exports){
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
        const nextIndex = state.getCurrentCardIndex() + 1;
        state.cards.splice(nextIndex, 0, newCard);
        state.setNextCard(nextIndex);
        setTimeout(() => {
            emitter.emit('goto');
            emitter.emit('save');
        }, 1);
    });

    emitter.on('cardLoaded', function() {
        const card = state.getCurrentCard();
        if (card.behavior && card.behavior.length) {
            parseAndRunBehaviors(state, emitter.emit.bind(emitter), card.behavior);
        }
        if (state.editing() && state.getEditedObjectType() == 'card') {
            // already in card-editing mode, so update the path
            state.editObject(['cards', state.getCurrentCardIndex()]);
        }
    });

    emitter.on('editCard', function() {
        state.editObject(['cards', state.getCurrentCardIndex()]);
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('deleteCard', function() {
        if (state.getCardCount() === 1) {
            return false;
        }
        let currentCard = state.getCurrentCardIndex();
        state.cards.splice(currentCard, 1);
        // something with the background if it is now cardless?
        if (currentCard > 0) {
            state.setNextCard(--currentCard);
            setTimeout(() => emitter.emit('goto'), 1);
        }
        state.card = state.getCurrentCard();
        setTimeout(() => emitter.emit('render'), 1);
    });

    emitter.on('envPropertyChange', function(event) {
        if (state.editingPath && state.editingPath[0] === 'cards') {
            const propName = event.target.name;
            const newValue = event.target.value;
            state.setPropertyAtPath(['cards', state.getCurrentCardIndex(), propName], newValue)
            setTimeout(() => {
                emitter.emit('render');
                emitter.emit('save');
            }, 1);
        }
    });
};

module.exports = CardStore;

},{"../behavior.js":3}],34:[function(require,module,exports){
const {toPx} = require('../util');

const EditStore = (state, emitter) => {
    emitter.on('toggleEditMode', function(isCardLevelEvent = true) {
        if (state.editing()) {
            emitter.emit('turnOffEditMode');
        } else {
            state.setEditMode(isCardLevelEvent);
            setTimeout(() => emitter.emit('render'), 1);
        }
    });
    emitter.on('editBgMode', function() {
        if (state.editingCard()) {
            state.setEditMode('bgEdit');
        } else {
            state.setEditMode('editMode');
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

},{"../util":39}],35:[function(require,module,exports){
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

        state.setPropertyAtPath(editPath.concat([propName]), newValue)
        /* */
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
        /* */
        setTimeout(() => {
            emitter.emit('render');
            emitter.emit('save');
        }, 1);
    });

    emitter.on('editStack', function() {
        state.editObject(['stack']);
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

},{}],36:[function(require,module,exports){
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
        state.editObject(['elements', index])
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
        const index = state.getEditedObjectIndex();
        change((card) => {
            card.elements.splice(index, 1);
            return card;
        });
        emitter.emit('closeEdit');
    });
};

module.exports = ElementStore;

},{"../util":39}],37:[function(require,module,exports){
const {modEnv, modPath, uniqueName} = require('../util');


const saveFieldToState = function(event, field, state) {
    const newValue = event.target.value;

    if (state.getCurrentCard().fields[field.name]) {
        state.setCurrentCardProperty(['fields', field.name, 'value'], newValue);
    } else {
        state.setCurrentCardProperty(['values', field.name], newValue);
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

    const change = modEnv(state, emitter);

    emitter.on("newField", function() {
        let fieldName = uniqueName(
            state.getEditScopePath().concat(['fields']),
            'newField'
        );
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
        if (!state.editing()) {
            emitter.emit('toggleEditMode');
        }
        if ((state.editingBackground() && !isCard) ||
            (state.editingCard() && isCard))
        {
            state.editObject(['fields', name]);
            setTimeout(() => emitter.emit('render'), 1);
        }
    });

    emitter.on('setFieldOptions', function(options) {
        const index = state.getEditedObjectIndex();
        change((card) => {
            card.fields[index].options = options;
            return card;
        })
    });

    emitter.on('deleteField', function() {
        const index = state.getEditedObjectIndex();
        change((card) => {
            delete card.fields[index];
            return card;
        });
        emitter.emit('closeEdit');
    });
};

module.exports = FieldStore;

},{"../util":39}],38:[function(require,module,exports){
const {modEnv} = require('../util');


const ImageStore = (state, emitter) => {
    const change = modEnv(state, emitter);

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
        change((card) => {
            card.images.push(newguy);
        });
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

    emitter.on('editImage', function([image, index]) {
        if (!state.editing()) {
            emitter.emit('toggleEditMode');
        }
        state.editObject(['images', index]);
        setTimeout(() => emitter.emit('render'), 1);
    });

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
        const index = state.getEditedObjectIndex();
        change((card) => {
            card.images.splice(index, 1);
            return card;
        });
        emitter.emit('closeEdit');
    });
};

module.exports = ImageStore;

},{"../util":39}],39:[function(require,module,exports){
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

function checkBox(label, checkd, handler, name) {
    if (!name) {
        name = uuid();
    }
    const opts = [
        html`<input type="checkbox" onchange=${handler} checked="checked" name="${name}" />`,
        html`<input type="checkbox" onchange=${handler} name="${name}" />`
    ];
    return html`<span class="checkbox">
        ${checkd ? opts[0] : opts[1]}
        <label for="${name}">${label}</label>
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

function uniqueName(scopePath, nameStub = 'newGuy') {
    const location = state.getPropertyAtPath(scopePath);
    let trynum = 1;
    let tryAName = `${nameStub}${trynum}`;
    while (typeof location[tryAName] != "undefined") {
        tryAName = `${nameStub}${++trynum}`;
    }
    return tryAName;
};

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

module.exports = {modEnv, modPath, getPath, toPx, selectOption, checkBox, fieldsWithValues, uniqueName, color};

},{"choo/html":41,"uuid/v1":82}],40:[function(require,module,exports){
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

},{"global/document":62,"hyperx":65,"on-load":78}],41:[function(require,module,exports){
module.exports = require('bel')

},{"bel":40}],42:[function(require,module,exports){
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

},{"assert":87,"document-ready":53,"nanobus":68,"nanohistory":69,"nanohref":70,"nanomorph":71,"nanomount":74,"nanoraf":75,"nanorouter":76}],43:[function(require,module,exports){
"use strict";

var Node = require('./node');
var unescapeString = require('./common').unescapeString;
var OPENTAG = require('./common').OPENTAG;
var CLOSETAG = require('./common').CLOSETAG;

var CODE_INDENT = 4;

var C_TAB = 9;
var C_NEWLINE = 10;
var C_GREATERTHAN = 62;
var C_LESSTHAN = 60;
var C_SPACE = 32;
var C_OPEN_BRACKET = 91;

var InlineParser = require('./inlines');

var reHtmlBlockOpen = [
   /./, // dummy for 0
   /^<(?:script|pre|style)(?:\s|>|$)/i,
   /^<!--/,
   /^<[?]/,
   /^<![A-Z]/,
   /^<!\[CDATA\[/,
   /^<[/]?(?:address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[123456]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|section|source|title|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul)(?:\s|[/]?[>]|$)/i,
    new RegExp('^(?:' + OPENTAG + '|' + CLOSETAG + ')\\s*$', 'i')
];

var reHtmlBlockClose = [
   /./, // dummy for 0
   /<\/(?:script|pre|style)>/i,
   /-->/,
   /\?>/,
   />/,
   /\]\]>/
];

var reThematicBreak = /^(?:(?:\*[ \t]*){3,}|(?:_[ \t]*){3,}|(?:-[ \t]*){3,})[ \t]*$/;

var reMaybeSpecial = /^[#`~*+_=<>0-9-]/;

var reNonSpace = /[^ \t\f\v\r\n]/;

var reBulletListMarker = /^[*+-]/;

var reOrderedListMarker = /^(\d{1,9})([.)])/;

var reATXHeadingMarker = /^#{1,6}(?:[ \t]+|$)/;

var reCodeFence = /^`{3,}(?!.*`)|^~{3,}(?!.*~)/;

var reClosingCodeFence = /^(?:`{3,}|~{3,})(?= *$)/;

var reSetextHeadingLine = /^(?:=+|-+)[ \t]*$/;

var reLineEnding = /\r\n|\n|\r/;

// Returns true if string contains only space characters.
var isBlank = function(s) {
    return !(reNonSpace.test(s));
};

var isSpaceOrTab = function(c) {
    return c === C_SPACE || c === C_TAB;
};

var peek = function(ln, pos) {
    if (pos < ln.length) {
        return ln.charCodeAt(pos);
    } else {
        return -1;
    }
};

// DOC PARSER

// These are methods of a Parser object, defined below.

// Returns true if block ends with a blank line, descending if needed
// into lists and sublists.
var endsWithBlankLine = function(block) {
    while (block) {
        if (block._lastLineBlank) {
            return true;
        }
        var t = block.type;
        if (t === 'list' || t === 'item') {
            block = block._lastChild;
        } else {
            break;
        }
    }
    return false;
};

// Add a line to the block at the tip.  We assume the tip
// can accept lines -- that check should be done before calling this.
var addLine = function() {
    if (this.partiallyConsumedTab) {
      this.offset += 1; // skip over tab
      // add space characters:
      var charsToTab = 4 - (this.column % 4);
      this.tip._string_content += (' '.repeat(charsToTab));
    }
    this.tip._string_content += this.currentLine.slice(this.offset) + '\n';
};

// Add block of type tag as a child of the tip.  If the tip can't
// accept children, close and finalize it and try its parent,
// and so on til we find a block that can accept children.
var addChild = function(tag, offset) {
    while (!this.blocks[this.tip.type].canContain(tag)) {
        this.finalize(this.tip, this.lineNumber - 1);
    }

    var column_number = offset + 1; // offset 0 = column 1
    var newBlock = new Node(tag, [[this.lineNumber, column_number], [0, 0]]);
    newBlock._string_content = '';
    this.tip.appendChild(newBlock);
    this.tip = newBlock;
    return newBlock;
};

// Parse a list marker and return data on the marker (type,
// start, delimiter, bullet character, padding) or null.
var parseListMarker = function(parser, container) {
    var rest = parser.currentLine.slice(parser.nextNonspace);
    var match;
    var nextc;
    var spacesStartCol;
    var spacesStartOffset;
    var data = { type: null,
                 tight: true,  // lists are tight by default
                 bulletChar: null,
                 start: null,
                 delimiter: null,
                 padding: null,
                 markerOffset: parser.indent };
    if ((match = rest.match(reBulletListMarker))) {
        data.type = 'bullet';
        data.bulletChar = match[0][0];

    } else if ((match = rest.match(reOrderedListMarker)) &&
                (container.type !== 'paragraph' ||
                 match[1] === '1')) {
        data.type = 'ordered';
        data.start = parseInt(match[1]);
        data.delimiter = match[2];
    } else {
        return null;
    }
    // make sure we have spaces after
    nextc = peek(parser.currentLine, parser.nextNonspace + match[0].length);
    if (!(nextc === -1 || nextc === C_TAB || nextc === C_SPACE)) {
        return null;
    }

    // if it interrupts paragraph, make sure first line isn't blank
    if (container.type === 'paragraph' && !parser.currentLine.slice(parser.nextNonspace + match[0].length).match(reNonSpace)) {
        return null;
    }

    // we've got a match! advance offset and calculate padding
    parser.advanceNextNonspace(); // to start of marker
    parser.advanceOffset(match[0].length, true); // to end of marker
    spacesStartCol = parser.column;
    spacesStartOffset = parser.offset;
    do {
        parser.advanceOffset(1, true);
        nextc = peek(parser.currentLine, parser.offset);
    } while (parser.column - spacesStartCol < 5 &&
           isSpaceOrTab(nextc));
    var blank_item = peek(parser.currentLine, parser.offset) === -1;
    var spaces_after_marker = parser.column - spacesStartCol;
    if (spaces_after_marker >= 5 ||
        spaces_after_marker < 1 ||
        blank_item) {
        data.padding = match[0].length + 1;
        parser.column = spacesStartCol;
        parser.offset = spacesStartOffset;
        if (isSpaceOrTab(peek(parser.currentLine, parser.offset))) {
            parser.advanceOffset(1, true);
        }
    } else {
        data.padding = match[0].length + spaces_after_marker;
    }
    return data;
};

// Returns true if the two list items are of the same type,
// with the same delimiter and bullet character.  This is used
// in agglomerating list items into lists.
var listsMatch = function(list_data, item_data) {
    return (list_data.type === item_data.type &&
            list_data.delimiter === item_data.delimiter &&
            list_data.bulletChar === item_data.bulletChar);
};

// Finalize and close any unmatched blocks.
var closeUnmatchedBlocks = function() {
    if (!this.allClosed) {
        // finalize any blocks not matched
        while (this.oldtip !== this.lastMatchedContainer) {
            var parent = this.oldtip._parent;
            this.finalize(this.oldtip, this.lineNumber - 1);
            this.oldtip = parent;
        }
        this.allClosed = true;
    }
};

// 'finalize' is run when the block is closed.
// 'continue' is run to check whether the block is continuing
// at a certain line and offset (e.g. whether a block quote
// contains a `>`.  It returns 0 for matched, 1 for not matched,
// and 2 for "we've dealt with this line completely, go to next."
var blocks = {
    document: {
        continue: function() { return 0; },
        finalize: function() { return; },
        canContain: function(t) { return (t !== 'item'); },
        acceptsLines: false
    },
    list: {
        continue: function() { return 0; },
        finalize: function(parser, block) {
            var item = block._firstChild;
            while (item) {
                // check for non-final list item ending with blank line:
                if (endsWithBlankLine(item) && item._next) {
                    block._listData.tight = false;
                    break;
                }
                // recurse into children of list item, to see if there are
                // spaces between any of them:
                var subitem = item._firstChild;
                while (subitem) {
                    if (endsWithBlankLine(subitem) &&
                        (item._next || subitem._next)) {
                        block._listData.tight = false;
                        break;
                    }
                    subitem = subitem._next;
                }
                item = item._next;
            }
        },
        canContain: function(t) { return (t === 'item'); },
        acceptsLines: false
    },
    block_quote: {
        continue: function(parser) {
            var ln = parser.currentLine;
            if (!parser.indented &&
                peek(ln, parser.nextNonspace) === C_GREATERTHAN) {
                parser.advanceNextNonspace();
                parser.advanceOffset(1, false);
                if (isSpaceOrTab(peek(ln, parser.offset))) {
                    parser.advanceOffset(1, true);
                }
            } else {
                return 1;
            }
            return 0;
        },
        finalize: function() { return; },
        canContain: function(t) { return (t !== 'item'); },
        acceptsLines: false
    },
    item: {
        continue: function(parser, container) {
            if (parser.blank) {
                if (container._firstChild == null) {
                    // Blank line after empty list item
                    return 1;
                } else {
                    parser.advanceNextNonspace();
                }
            } else if (parser.indent >=
                       container._listData.markerOffset +
                       container._listData.padding) {
                parser.advanceOffset(container._listData.markerOffset +
                    container._listData.padding, true);
            } else {
                return 1;
            }
            return 0;
        },
        finalize: function() { return; },
        canContain: function(t) { return (t !== 'item'); },
        acceptsLines: false
    },
    heading: {
        continue: function() {
            // a heading can never container > 1 line, so fail to match:
            return 1;
        },
        finalize: function() { return; },
        canContain: function() { return false; },
        acceptsLines: false
    },
    thematic_break: {
        continue: function() {
            // a thematic break can never container > 1 line, so fail to match:
            return 1;
        },
        finalize: function() { return; },
        canContain: function() { return false; },
        acceptsLines: false
    },
    code_block: {
        continue: function(parser, container) {
            var ln = parser.currentLine;
            var indent = parser.indent;
            if (container._isFenced) { // fenced
                var match = (indent <= 3 &&
                    ln.charAt(parser.nextNonspace) === container._fenceChar &&
                    ln.slice(parser.nextNonspace).match(reClosingCodeFence));
                if (match && match[0].length >= container._fenceLength) {
                    // closing fence - we're at end of line, so we can return
                    parser.finalize(container, parser.lineNumber);
                    return 2;
                } else {
                    // skip optional spaces of fence offset
                    var i = container._fenceOffset;
                    while (i > 0 && isSpaceOrTab(peek(ln, parser.offset))) {
                        parser.advanceOffset(1, true);
                        i--;
                    }
                }
            } else { // indented
                if (indent >= CODE_INDENT) {
                    parser.advanceOffset(CODE_INDENT, true);
                } else if (parser.blank) {
                    parser.advanceNextNonspace();
                } else {
                    return 1;
                }
            }
            return 0;
        },
        finalize: function(parser, block) {
            if (block._isFenced) { // fenced
                // first line becomes info string
                var content = block._string_content;
                var newlinePos = content.indexOf('\n');
                var firstLine = content.slice(0, newlinePos);
                var rest = content.slice(newlinePos + 1);
                block.info = unescapeString(firstLine.trim());
                block._literal = rest;
            } else { // indented
                block._literal = block._string_content.replace(/(\n *)+$/, '\n');
            }
            block._string_content = null; // allow GC
        },
        canContain: function() { return false; },
        acceptsLines: true
    },
    html_block: {
        continue: function(parser, container) {
            return ((parser.blank &&
                     (container._htmlBlockType === 6 ||
                      container._htmlBlockType === 7)) ? 1 : 0);
        },
        finalize: function(parser, block) {
            block._literal = block._string_content.replace(/(\n *)+$/, '');
            block._string_content = null; // allow GC
        },
        canContain: function() { return false; },
        acceptsLines: true
    },
    paragraph: {
        continue: function(parser) {
            return (parser.blank ? 1 : 0);
        },
        finalize: function(parser, block) {
            var pos;
            var hasReferenceDefs = false;

            // try parsing the beginning as link reference definitions:
            while (peek(block._string_content, 0) === C_OPEN_BRACKET &&
                   (pos =
                    parser.inlineParser.parseReference(block._string_content,
                                                       parser.refmap))) {
                block._string_content = block._string_content.slice(pos);
                hasReferenceDefs = true;
            }
            if (hasReferenceDefs && isBlank(block._string_content)) {
                block.unlink();
            }
        },
        canContain: function() { return false; },
        acceptsLines: true
    }
};

// block start functions.  Return values:
// 0 = no match
// 1 = matched container, keep going
// 2 = matched leaf, no more block starts
var blockStarts = [
    // block quote
    function(parser) {
        if (!parser.indented &&
            peek(parser.currentLine, parser.nextNonspace) === C_GREATERTHAN) {
            parser.advanceNextNonspace();
            parser.advanceOffset(1, false);
            // optional following space
            if (isSpaceOrTab(peek(parser.currentLine, parser.offset))) {
                parser.advanceOffset(1, true);
            }
            parser.closeUnmatchedBlocks();
            parser.addChild('block_quote', parser.nextNonspace);
            return 1;
        } else {
            return 0;
        }
    },

    // ATX heading
    function(parser) {
        var match;
        if (!parser.indented &&
            (match = parser.currentLine.slice(parser.nextNonspace).match(reATXHeadingMarker))) {
            parser.advanceNextNonspace();
            parser.advanceOffset(match[0].length, false);
            parser.closeUnmatchedBlocks();
            var container = parser.addChild('heading', parser.nextNonspace);
            container.level = match[0].trim().length; // number of #s
            // remove trailing ###s:
            container._string_content =
                parser.currentLine.slice(parser.offset).replace(/^[ \t]*#+[ \t]*$/, '').replace(/[ \t]+#+[ \t]*$/, '');
            parser.advanceOffset(parser.currentLine.length - parser.offset);
            return 2;
        } else {
            return 0;
        }
    },

    // Fenced code block
    function(parser) {
        var match;
        if (!parser.indented &&
            (match = parser.currentLine.slice(parser.nextNonspace).match(reCodeFence))) {
            var fenceLength = match[0].length;
            parser.closeUnmatchedBlocks();
            var container = parser.addChild('code_block', parser.nextNonspace);
            container._isFenced = true;
            container._fenceLength = fenceLength;
            container._fenceChar = match[0][0];
            container._fenceOffset = parser.indent;
            parser.advanceNextNonspace();
            parser.advanceOffset(fenceLength, false);
            return 2;
        } else {
            return 0;
        }
    },

    // HTML block
    function(parser, container) {
        if (!parser.indented &&
            peek(parser.currentLine, parser.nextNonspace) === C_LESSTHAN) {
            var s = parser.currentLine.slice(parser.nextNonspace);
            var blockType;

            for (blockType = 1; blockType <= 7; blockType++) {
                if (reHtmlBlockOpen[blockType].test(s) &&
                    (blockType < 7 ||
                     container.type !== 'paragraph')) {
                    parser.closeUnmatchedBlocks();
                    // We don't adjust parser.offset;
                    // spaces are part of the HTML block:
                    var b = parser.addChild('html_block',
                                            parser.offset);
                    b._htmlBlockType = blockType;
                    return 2;
                }
            }
        }

        return 0;

    },

    // Setext heading
    function(parser, container) {
        var match;
        if (!parser.indented &&
            container.type === 'paragraph' &&
                   ((match = parser.currentLine.slice(parser.nextNonspace).match(reSetextHeadingLine)))) {
            parser.closeUnmatchedBlocks();
            var heading = new Node('heading', container.sourcepos);
            heading.level = match[0][0] === '=' ? 1 : 2;
            heading._string_content = container._string_content;
            container.insertAfter(heading);
            container.unlink();
            parser.tip = heading;
            parser.advanceOffset(parser.currentLine.length - parser.offset, false);
            return 2;
        } else {
            return 0;
        }
    },

    // thematic break
    function(parser) {
        if (!parser.indented &&
            reThematicBreak.test(parser.currentLine.slice(parser.nextNonspace))) {
            parser.closeUnmatchedBlocks();
            parser.addChild('thematic_break', parser.nextNonspace);
            parser.advanceOffset(parser.currentLine.length - parser.offset, false);
            return 2;
        } else {
            return 0;
        }
    },

    // list item
    function(parser, container) {
        var data;

        if ((!parser.indented || container.type === 'list')
                && (data = parseListMarker(parser, container))) {
            parser.closeUnmatchedBlocks();

            // add the list if needed
            if (parser.tip.type !== 'list' ||
                !(listsMatch(container._listData, data))) {
                container = parser.addChild('list', parser.nextNonspace);
                container._listData = data;
            }

            // add the list item
            container = parser.addChild('item', parser.nextNonspace);
            container._listData = data;
            return 1;
        } else {
            return 0;
        }
    },

    // indented code block
    function(parser) {
        if (parser.indented &&
            parser.tip.type !== 'paragraph' &&
            !parser.blank) {
            // indented code
            parser.advanceOffset(CODE_INDENT, true);
            parser.closeUnmatchedBlocks();
            parser.addChild('code_block', parser.offset);
            return 2;
        } else {
            return 0;
        }
     }

];

var advanceOffset = function(count, columns) {
    var currentLine = this.currentLine;
    var charsToTab, charsToAdvance;
    var c;
    while (count > 0 && (c = currentLine[this.offset])) {
        if (c === '\t') {
            charsToTab = 4 - (this.column % 4);
            if (columns) {
                this.partiallyConsumedTab = charsToTab > count;
                charsToAdvance = charsToTab > count ? count : charsToTab;
                this.column += charsToAdvance;
                this.offset += this.partiallyConsumedTab ? 0 : 1;
                count -= charsToAdvance;
            } else {
                this.partiallyConsumedTab = false;
                this.column += charsToTab;
                this.offset += 1;
                count -= 1;
            }
        } else {
            this.partiallyConsumedTab = false;
            this.offset += 1;
            this.column += 1; // assume ascii; block starts are ascii
            count -= 1;
        }
    }
};

var advanceNextNonspace = function() {
    this.offset = this.nextNonspace;
    this.column = this.nextNonspaceColumn;
    this.partiallyConsumedTab = false;
};

var findNextNonspace = function() {
    var currentLine = this.currentLine;
    var i = this.offset;
    var cols = this.column;
    var c;

    while ((c = currentLine.charAt(i)) !== '') {
        if (c === ' ') {
            i++;
            cols++;
        } else if (c === '\t') {
            i++;
            cols += (4 - (cols % 4));
        } else {
            break;
        }
    }
    this.blank = (c === '\n' || c === '\r' || c === '');
    this.nextNonspace = i;
    this.nextNonspaceColumn = cols;
    this.indent = this.nextNonspaceColumn - this.column;
    this.indented = this.indent >= CODE_INDENT;
};

// Analyze a line of text and update the document appropriately.
// We parse markdown text by calling this on each line of input,
// then finalizing the document.
var incorporateLine = function(ln) {
    var all_matched = true;
    var t;

    var container = this.doc;
    this.oldtip = this.tip;
    this.offset = 0;
    this.column = 0;
    this.blank = false;
    this.partiallyConsumedTab = false;
    this.lineNumber += 1;

    // replace NUL characters for security
    if (ln.indexOf('\u0000') !== -1) {
        ln = ln.replace(/\0/g, '\uFFFD');
    }

    this.currentLine = ln;

    // For each containing block, try to parse the associated line start.
    // Bail out on failure: container will point to the last matching block.
    // Set all_matched to false if not all containers match.
    var lastChild;
    while ((lastChild = container._lastChild) && lastChild._open) {
        container = lastChild;

        this.findNextNonspace();

        switch (this.blocks[container.type].continue(this, container)) {
        case 0: // we've matched, keep going
            break;
        case 1: // we've failed to match a block
            all_matched = false;
            break;
        case 2: // we've hit end of line for fenced code close and can return
            this.lastLineLength = ln.length;
            return;
        default:
            throw 'continue returned illegal value, must be 0, 1, or 2';
        }
        if (!all_matched) {
            container = container._parent; // back up to last matching block
            break;
        }
    }

    this.allClosed = (container === this.oldtip);
    this.lastMatchedContainer = container;

    var matchedLeaf = container.type !== 'paragraph' &&
            blocks[container.type].acceptsLines;
    var starts = this.blockStarts;
    var startsLen = starts.length;
    // Unless last matched container is a code block, try new container starts,
    // adding children to the last matched container:
    while (!matchedLeaf) {

        this.findNextNonspace();

        // this is a little performance optimization:
        if (!this.indented &&
            !reMaybeSpecial.test(ln.slice(this.nextNonspace))) {
            this.advanceNextNonspace();
            break;
        }

        var i = 0;
        while (i < startsLen) {
            var res = starts[i](this, container);
            if (res === 1) {
                container = this.tip;
                break;
            } else if (res === 2) {
                container = this.tip;
                matchedLeaf = true;
                break;
            } else {
                i++;
            }
        }

        if (i === startsLen) { // nothing matched
            this.advanceNextNonspace();
            break;
        }
    }

    // What remains at the offset is a text line.  Add the text to the
    // appropriate container.

   // First check for a lazy paragraph continuation:
    if (!this.allClosed && !this.blank &&
        this.tip.type === 'paragraph') {
        // lazy paragraph continuation
        this.addLine();

    } else { // not a lazy continuation

        // finalize any blocks not matched
        this.closeUnmatchedBlocks();
        if (this.blank && container.lastChild) {
            container.lastChild._lastLineBlank = true;
        }

        t = container.type;

        // Block quote lines are never blank as they start with >
        // and we don't count blanks in fenced code for purposes of tight/loose
        // lists or breaking out of lists.  We also don't set _lastLineBlank
        // on an empty list item, or if we just closed a fenced block.
        var lastLineBlank = this.blank &&
            !(t === 'block_quote' ||
              (t === 'code_block' && container._isFenced) ||
              (t === 'item' &&
               !container._firstChild &&
               container.sourcepos[0][0] === this.lineNumber));

        // propagate lastLineBlank up through parents:
        var cont = container;
        while (cont) {
            cont._lastLineBlank = lastLineBlank;
            cont = cont._parent;
        }

        if (this.blocks[t].acceptsLines) {
            this.addLine();
            // if HtmlBlock, check for end condition
            if (t === 'html_block' &&
                container._htmlBlockType >= 1 &&
                container._htmlBlockType <= 5 &&
                reHtmlBlockClose[container._htmlBlockType].test(this.currentLine.slice(this.offset))) {
                this.finalize(container, this.lineNumber);
            }

        } else if (this.offset < ln.length && !this.blank) {
            // create paragraph container for line
            container = this.addChild('paragraph', this.offset);
            this.advanceNextNonspace();
            this.addLine();
        }
    }
    this.lastLineLength = ln.length;
};

// Finalize a block.  Close it and do any necessary postprocessing,
// e.g. creating string_content from strings, setting the 'tight'
// or 'loose' status of a list, and parsing the beginnings
// of paragraphs for reference definitions.  Reset the tip to the
// parent of the closed block.
var finalize = function(block, lineNumber) {
    var above = block._parent;
    block._open = false;
    block.sourcepos[1] = [lineNumber, this.lastLineLength];

    this.blocks[block.type].finalize(this, block);

    this.tip = above;
};

// Walk through a block & children recursively, parsing string content
// into inline content where appropriate.
var processInlines = function(block) {
    var node, event, t;
    var walker = block.walker();
    this.inlineParser.refmap = this.refmap;
    this.inlineParser.options = this.options;
    while ((event = walker.next())) {
        node = event.node;
        t = node.type;
        if (!event.entering && (t === 'paragraph' || t === 'heading')) {
            this.inlineParser.parse(node);
        }
    }
};

var Document = function() {
    var doc = new Node('document', [[1, 1], [0, 0]]);
    return doc;
};

// The main parsing function.  Returns a parsed document AST.
var parse = function(input) {
    this.doc = new Document();
    this.tip = this.doc;
    this.refmap = {};
    this.lineNumber = 0;
    this.lastLineLength = 0;
    this.offset = 0;
    this.column = 0;
    this.lastMatchedContainer = this.doc;
    this.currentLine = "";
    if (this.options.time) { console.time("preparing input"); }
    var lines = input.split(reLineEnding);
    var len = lines.length;
    if (input.charCodeAt(input.length - 1) === C_NEWLINE) {
        // ignore last blank line created by final newline
        len -= 1;
    }
    if (this.options.time) { console.timeEnd("preparing input"); }
    if (this.options.time) { console.time("block parsing"); }
    for (var i = 0; i < len; i++) {
        this.incorporateLine(lines[i]);
    }
    while (this.tip) {
        this.finalize(this.tip, len);
    }
    if (this.options.time) { console.timeEnd("block parsing"); }
    if (this.options.time) { console.time("inline parsing"); }
    this.processInlines(this.doc);
    if (this.options.time) { console.timeEnd("inline parsing"); }
    return this.doc;
};


// The Parser object.
function Parser(options){
    return {
        doc: new Document(),
        blocks: blocks,
        blockStarts: blockStarts,
        tip: this.doc,
        oldtip: this.doc,
        currentLine: "",
        lineNumber: 0,
        offset: 0,
        column: 0,
        nextNonspace: 0,
        nextNonspaceColumn: 0,
        indent: 0,
        indented: false,
        blank: false,
        partiallyConsumedTab: false,
        allClosed: true,
        lastMatchedContainer: this.doc,
        refmap: {},
        lastLineLength: 0,
        inlineParser: new InlineParser(options),
        findNextNonspace: findNextNonspace,
        advanceOffset: advanceOffset,
        advanceNextNonspace: advanceNextNonspace,
        addLine: addLine,
        addChild: addChild,
        incorporateLine: incorporateLine,
        finalize: finalize,
        processInlines: processInlines,
        closeUnmatchedBlocks: closeUnmatchedBlocks,
        parse: parse,
        options: options || {}
    };
}

module.exports = Parser;

},{"./common":44,"./inlines":47,"./node":48}],44:[function(require,module,exports){
"use strict";

var encode = require('mdurl/encode');
var decode = require('mdurl/decode');

var C_BACKSLASH = 92;

var decodeHTML = require('entities').decodeHTML;

var ENTITY = "&(?:#x[a-f0-9]{1,8}|#[0-9]{1,8}|[a-z][a-z0-9]{1,31});";

var TAGNAME = '[A-Za-z][A-Za-z0-9-]*';
var ATTRIBUTENAME = '[a-zA-Z_:][a-zA-Z0-9:._-]*';
var UNQUOTEDVALUE = "[^\"'=<>`\\x00-\\x20]+";
var SINGLEQUOTEDVALUE = "'[^']*'";
var DOUBLEQUOTEDVALUE = '"[^"]*"';
var ATTRIBUTEVALUE = "(?:" + UNQUOTEDVALUE + "|" + SINGLEQUOTEDVALUE + "|" + DOUBLEQUOTEDVALUE + ")";
var ATTRIBUTEVALUESPEC = "(?:" + "\\s*=" + "\\s*" + ATTRIBUTEVALUE + ")";
var ATTRIBUTE = "(?:" + "\\s+" + ATTRIBUTENAME + ATTRIBUTEVALUESPEC + "?)";
var OPENTAG = "<" + TAGNAME + ATTRIBUTE + "*" + "\\s*/?>";
var CLOSETAG = "</" + TAGNAME + "\\s*[>]";
var HTMLCOMMENT = "<!---->|<!--(?:-?[^>-])(?:-?[^-])*-->";
var PROCESSINGINSTRUCTION = "[<][?].*?[?][>]";
var DECLARATION = "<![A-Z]+" + "\\s+[^>]*>";
var CDATA = "<!\\[CDATA\\[[\\s\\S]*?\\]\\]>";
var HTMLTAG = "(?:" + OPENTAG + "|" + CLOSETAG + "|" + HTMLCOMMENT + "|" +
        PROCESSINGINSTRUCTION + "|" + DECLARATION + "|" + CDATA + ")";
var reHtmlTag = new RegExp('^' + HTMLTAG, 'i');

var reBackslashOrAmp = /[\\&]/;

var ESCAPABLE = '[!"#$%&\'()*+,./:;<=>?@[\\\\\\]^_`{|}~-]';

var reEntityOrEscapedChar = new RegExp('\\\\' + ESCAPABLE + '|' + ENTITY, 'gi');

var XMLSPECIAL = '[&<>"]';

var reXmlSpecial = new RegExp(XMLSPECIAL, 'g');

var reXmlSpecialOrEntity = new RegExp(ENTITY + '|' + XMLSPECIAL, 'gi');

var unescapeChar = function(s) {
    if (s.charCodeAt(0) === C_BACKSLASH) {
        return s.charAt(1);
    } else {
        return decodeHTML(s);
    }
};

// Replace entities and backslash escapes with literal characters.
var unescapeString = function(s) {
    if (reBackslashOrAmp.test(s)) {
        return s.replace(reEntityOrEscapedChar, unescapeChar);
    } else {
        return s;
    }
};

var normalizeURI = function(uri) {
    try {
        return encode(decode(uri));
    }
    catch(err) {
        return uri;
    }
};

var replaceUnsafeChar = function(s) {
    switch (s) {
    case '&':
        return '&amp;';
    case '<':
        return '&lt;';
    case '>':
        return '&gt;';
    case '"':
        return '&quot;';
    default:
        return s;
    }
};

var escapeXml = function(s, preserve_entities) {
    if (reXmlSpecial.test(s)) {
        if (preserve_entities) {
            return s.replace(reXmlSpecialOrEntity, replaceUnsafeChar);
        } else {
            return s.replace(reXmlSpecial, replaceUnsafeChar);
        }
    } else {
        return s;
    }
};

module.exports = { unescapeString: unescapeString,
                   normalizeURI: normalizeURI,
                   escapeXml: escapeXml,
                   reHtmlTag: reHtmlTag,
                   OPENTAG: OPENTAG,
                   CLOSETAG: CLOSETAG,
                   ENTITY: ENTITY,
                   ESCAPABLE: ESCAPABLE
                 };

},{"entities":54,"mdurl/decode":66,"mdurl/encode":67}],45:[function(require,module,exports){
"use strict";

// derived from https://github.com/mathiasbynens/String.fromCodePoint
/*! http://mths.be/fromcodepoint v0.2.1 by @mathias */
if (String.fromCodePoint) {
    module.exports = function (_) {
        try {
            return String.fromCodePoint(_);
        } catch (e) {
            if (e instanceof RangeError) {
                return String.fromCharCode(0xFFFD);
            }
            throw e;
        }
    };

} else {

  var stringFromCharCode = String.fromCharCode;
  var floor = Math.floor;
  var fromCodePoint = function() {
      var MAX_SIZE = 0x4000;
      var codeUnits = [];
      var highSurrogate;
      var lowSurrogate;
      var index = -1;
      var length = arguments.length;
      if (!length) {
          return '';
      }
      var result = '';
      while (++index < length) {
          var codePoint = Number(arguments[index]);
          if (
              !isFinite(codePoint) || // `NaN`, `+Infinity`, or `-Infinity`
                  codePoint < 0 || // not a valid Unicode code point
                  codePoint > 0x10FFFF || // not a valid Unicode code point
                  floor(codePoint) !== codePoint // not an integer
          ) {
              return String.fromCharCode(0xFFFD);
          }
          if (codePoint <= 0xFFFF) { // BMP code point
              codeUnits.push(codePoint);
          } else { // Astral code point; split in surrogate halves
              // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
              codePoint -= 0x10000;
              highSurrogate = (codePoint >> 10) + 0xD800;
              lowSurrogate = (codePoint % 0x400) + 0xDC00;
              codeUnits.push(highSurrogate, lowSurrogate);
          }
          if (index + 1 === length || codeUnits.length > MAX_SIZE) {
              result += stringFromCharCode.apply(null, codeUnits);
              codeUnits.length = 0;
          }
      }
      return result;
  };
  module.exports = fromCodePoint;
}

},{}],46:[function(require,module,exports){
"use strict";

// commonmark.js - CommomMark in JavaScript
// Copyright (C) 2014 John MacFarlane
// License: BSD3.

// Basic usage:
//
// var commonmark = require('commonmark');
// var parser = new commonmark.Parser();
// var renderer = new commonmark.HtmlRenderer();
// console.log(renderer.render(parser.parse('Hello *world*')));

module.exports.Node = require('./node');
module.exports.Parser = require('./blocks');
module.exports.HtmlRenderer = require('./render/html');
module.exports.XmlRenderer = require('./render/xml');

},{"./blocks":43,"./node":48,"./render/html":50,"./render/xml":52}],47:[function(require,module,exports){
"use strict";

var Node = require('./node');
var common = require('./common');
var normalizeReference = require('./normalize-reference');

var normalizeURI = common.normalizeURI;
var unescapeString = common.unescapeString;
var fromCodePoint = require('./from-code-point.js');
var decodeHTML = require('entities').decodeHTML;
require('string.prototype.repeat'); // Polyfill for String.prototype.repeat

// Constants for character codes:

var C_NEWLINE = 10;
var C_ASTERISK = 42;
var C_UNDERSCORE = 95;
var C_BACKTICK = 96;
var C_OPEN_BRACKET = 91;
var C_CLOSE_BRACKET = 93;
var C_LESSTHAN = 60;
var C_BANG = 33;
var C_BACKSLASH = 92;
var C_AMPERSAND = 38;
var C_OPEN_PAREN = 40;
var C_CLOSE_PAREN = 41;
var C_COLON = 58;
var C_SINGLEQUOTE = 39;
var C_DOUBLEQUOTE = 34;

// Some regexps used in inline parser:

var ESCAPABLE = common.ESCAPABLE;
var ESCAPED_CHAR = '\\\\' + ESCAPABLE;

var ENTITY = common.ENTITY;
var reHtmlTag = common.reHtmlTag;

var rePunctuation = new RegExp(/[!"#$%&'()*+,\-./:;<=>?@\[\]^_`{|}~\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u0AF0\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166D\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E42\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC9\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDF3C-\uDF3E]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]/);

var reLinkTitle = new RegExp(
    '^(?:"(' + ESCAPED_CHAR + '|[^"\\x00])*"' +
        '|' +
        '\'(' + ESCAPED_CHAR + '|[^\'\\x00])*\'' +
        '|' +
        '\\((' + ESCAPED_CHAR + '|[^)\\x00])*\\))');

var reLinkDestinationBraces = new RegExp(
    '^(?:[<](?:[^ <>\\t\\n\\\\\\x00]' + '|' + ESCAPED_CHAR + '|' + '\\\\)*[>])');

var reEscapable = new RegExp('^' + ESCAPABLE);

var reEntityHere = new RegExp('^' + ENTITY, 'i');

var reTicks = /`+/;

var reTicksHere = /^`+/;

var reEllipses = /\.\.\./g;

var reDash = /--+/g;

var reEmailAutolink = /^<([a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/;

var reAutolink = /^<[A-Za-z][A-Za-z0-9.+-]{1,31}:[^<>\x00-\x20]*>/i;

var reSpnl = /^ *(?:\n *)?/;

var reWhitespaceChar = /^[ \t\n\x0b\x0c\x0d]/;

var reWhitespace = /[ \t\n\x0b\x0c\x0d]+/g;

var reUnicodeWhitespaceChar = /^\s/;

var reFinalSpace = / *$/;

var reInitialSpace = /^ */;

var reSpaceAtEndOfLine = /^ *(?:\n|$)/;

var reLinkLabel = new RegExp('^\\[(?:[^\\\\\\[\\]]|' + ESCAPED_CHAR +
  '|\\\\){0,1000}\\]');

// Matches a string of non-special characters.
var reMain = /^[^\n`\[\]\\!<&*_'"]+/m;

var text = function(s) {
    var node = new Node('text');
    node._literal = s;
    return node;
};

// INLINE PARSER

// These are methods of an InlineParser object, defined below.
// An InlineParser keeps track of a subject (a string to be
// parsed) and a position in that subject.

// If re matches at current position in the subject, advance
// position in subject and return the match; otherwise return null.
var match = function(re) {
    var m = re.exec(this.subject.slice(this.pos));
    if (m === null) {
        return null;
    } else {
        this.pos += m.index + m[0].length;
        return m[0];
    }
};

// Returns the code for the character at the current subject position, or -1
// there are no more characters.
var peek = function() {
    if (this.pos < this.subject.length) {
        return this.subject.charCodeAt(this.pos);
    } else {
        return -1;
    }
};

// Parse zero or more space characters, including at most one newline
var spnl = function() {
    this.match(reSpnl);
    return true;
};

// All of the parsers below try to match something at the current position
// in the subject.  If they succeed in matching anything, they
// return the inline matched, advancing the subject.

// Attempt to parse backticks, adding either a backtick code span or a
// literal sequence of backticks.
var parseBackticks = function(block) {
    var ticks = this.match(reTicksHere);
    if (ticks === null) {
        return false;
    }
    var afterOpenTicks = this.pos;
    var matched;
    var node;
    while ((matched = this.match(reTicks)) !== null) {
        if (matched === ticks) {
            node = new Node('code');
            node._literal = this.subject.slice(afterOpenTicks,
                                        this.pos - ticks.length)
                          .trim().replace(reWhitespace, ' ');
            block.appendChild(node);
            return true;
        }
    }
    // If we got here, we didn't match a closing backtick sequence.
    this.pos = afterOpenTicks;
    block.appendChild(text(ticks));
    return true;
};

// Parse a backslash-escaped special character, adding either the escaped
// character, a hard line break (if the backslash is followed by a newline),
// or a literal backslash to the block's children.  Assumes current character
// is a backslash.
var parseBackslash = function(block) {
    var subj = this.subject;
    var node;
    this.pos += 1;
    if (this.peek() === C_NEWLINE) {
        this.pos += 1;
        node = new Node('linebreak');
        block.appendChild(node);
    } else if (reEscapable.test(subj.charAt(this.pos))) {
        block.appendChild(text(subj.charAt(this.pos)));
        this.pos += 1;
    } else {
        block.appendChild(text('\\'));
    }
    return true;
};

// Attempt to parse an autolink (URL or email in pointy brackets).
var parseAutolink = function(block) {
    var m;
    var dest;
    var node;
    if ((m = this.match(reEmailAutolink))) {
        dest = m.slice(1, m.length - 1);
        node = new Node('link');
        node._destination = normalizeURI('mailto:' + dest);
        node._title = '';
        node.appendChild(text(dest));
        block.appendChild(node);
        return true;
    } else if ((m = this.match(reAutolink))) {
        dest = m.slice(1, m.length - 1);
        node = new Node('link');
        node._destination = normalizeURI(dest);
        node._title = '';
        node.appendChild(text(dest));
        block.appendChild(node);
        return true;
    } else {
        return false;
    }
};

// Attempt to parse a raw HTML tag.
var parseHtmlTag = function(block) {
    var m = this.match(reHtmlTag);
    if (m === null) {
        return false;
    } else {
        var node = new Node('html_inline');
        node._literal = m;
        block.appendChild(node);
        return true;
    }
};

// Scan a sequence of characters with code cc, and return information about
// the number of delimiters and whether they are positioned such that
// they can open and/or close emphasis or strong emphasis.  A utility
// function for strong/emph parsing.
var scanDelims = function(cc) {
    var numdelims = 0;
    var char_before, char_after, cc_after;
    var startpos = this.pos;
    var left_flanking, right_flanking, can_open, can_close;
    var after_is_whitespace, after_is_punctuation, before_is_whitespace, before_is_punctuation;

    if (cc === C_SINGLEQUOTE || cc === C_DOUBLEQUOTE) {
        numdelims++;
        this.pos++;
    } else {
        while (this.peek() === cc) {
            numdelims++;
            this.pos++;
        }
    }

    if (numdelims === 0) {
        return null;
    }

    char_before = startpos === 0 ? '\n' : this.subject.charAt(startpos - 1);

    cc_after = this.peek();
    if (cc_after === -1) {
        char_after = '\n';
    } else {
        char_after = fromCodePoint(cc_after);
    }

    after_is_whitespace = reUnicodeWhitespaceChar.test(char_after);
    after_is_punctuation = rePunctuation.test(char_after);
    before_is_whitespace = reUnicodeWhitespaceChar.test(char_before);
    before_is_punctuation = rePunctuation.test(char_before);

    left_flanking = !after_is_whitespace &&
            (!after_is_punctuation || before_is_whitespace || before_is_punctuation);
    right_flanking = !before_is_whitespace &&
            (!before_is_punctuation || after_is_whitespace || after_is_punctuation);
    if (cc === C_UNDERSCORE) {
        can_open = left_flanking &&
            (!right_flanking || before_is_punctuation);
        can_close = right_flanking &&
            (!left_flanking || after_is_punctuation);
    } else if (cc === C_SINGLEQUOTE || cc === C_DOUBLEQUOTE) {
        can_open = left_flanking && !right_flanking;
        can_close = right_flanking;
    } else {
        can_open = left_flanking;
        can_close = right_flanking;
    }
    this.pos = startpos;
    return { numdelims: numdelims,
             can_open: can_open,
             can_close: can_close };
};

// Handle a delimiter marker for emphasis or a quote.
var handleDelim = function(cc, block) {
    var res = this.scanDelims(cc);
    if (!res) {
        return false;
    }
    var numdelims = res.numdelims;
    var startpos = this.pos;
    var contents;

    this.pos += numdelims;
    if (cc === C_SINGLEQUOTE) {
        contents = "\u2019";
    } else if (cc === C_DOUBLEQUOTE) {
        contents = "\u201C";
    } else {
        contents = this.subject.slice(startpos, this.pos);
    }
    var node = text(contents);
    block.appendChild(node);

    // Add entry to stack for this opener
    this.delimiters = { cc: cc,
                        numdelims: numdelims,
                        origdelims: numdelims,
                        node: node,
                        previous: this.delimiters,
                        next: null,
                        can_open: res.can_open,
                        can_close: res.can_close };
    if (this.delimiters.previous !== null) {
        this.delimiters.previous.next = this.delimiters;
    }

    return true;

};

var removeDelimiter = function(delim) {
    if (delim.previous !== null) {
        delim.previous.next = delim.next;
    }
    if (delim.next === null) {
        // top of stack
        this.delimiters = delim.previous;
    } else {
        delim.next.previous = delim.previous;
    }
};

var removeDelimitersBetween = function(bottom, top) {
    if (bottom.next !== top) {
        bottom.next = top;
        top.previous = bottom;
    }
};

var processEmphasis = function(stack_bottom) {
    var opener, closer, old_closer;
    var opener_inl, closer_inl;
    var tempstack;
    var use_delims;
    var tmp, next;
    var opener_found;
    var openers_bottom = [];
    var odd_match = false;

    openers_bottom[C_UNDERSCORE] = stack_bottom;
    openers_bottom[C_ASTERISK] = stack_bottom;
    openers_bottom[C_SINGLEQUOTE] = stack_bottom;
    openers_bottom[C_DOUBLEQUOTE] = stack_bottom;

    // find first closer above stack_bottom:
    closer = this.delimiters;
    while (closer !== null && closer.previous !== stack_bottom) {
        closer = closer.previous;
    }
    // move forward, looking for closers, and handling each
    while (closer !== null) {
        var closercc = closer.cc;
        if (!closer.can_close) {
            closer = closer.next;
        } else {
            // found emphasis closer. now look back for first matching opener:
            opener = closer.previous;
            opener_found = false;
            while (opener !== null && opener !== stack_bottom &&
                   opener !== openers_bottom[closercc]) {
                odd_match = (closer.can_open || opener.can_close) &&
                    (opener.origdelims + closer.origdelims) % 3 === 0;
                if (opener.cc === closer.cc && opener.can_open && !odd_match) {
                    opener_found = true;
                    break;
                }
                opener = opener.previous;
            }
            old_closer = closer;

            if (closercc === C_ASTERISK || closercc === C_UNDERSCORE) {
                if (!opener_found) {
                    closer = closer.next;
                } else {
                    // calculate actual number of delimiters used from closer
                    use_delims =
                      (closer.numdelims >= 2 && opener.numdelims >= 2) ? 2 : 1;

                    opener_inl = opener.node;
                    closer_inl = closer.node;

                    // remove used delimiters from stack elts and inlines
                    opener.numdelims -= use_delims;
                    closer.numdelims -= use_delims;
                    opener_inl._literal =
                        opener_inl._literal.slice(0,
                                                  opener_inl._literal.length - use_delims);
                    closer_inl._literal =
                        closer_inl._literal.slice(0,
                                                  closer_inl._literal.length - use_delims);

                    // build contents for new emph element
                    var emph = new Node(use_delims === 1 ? 'emph' : 'strong');

                    tmp = opener_inl._next;
                    while (tmp && tmp !== closer_inl) {
                        next = tmp._next;
                        tmp.unlink();
                        emph.appendChild(tmp);
                        tmp = next;
                    }

                    opener_inl.insertAfter(emph);

                    // remove elts between opener and closer in delimiters stack
                    removeDelimitersBetween(opener, closer);

                    // if opener has 0 delims, remove it and the inline
                    if (opener.numdelims === 0) {
                        opener_inl.unlink();
                        this.removeDelimiter(opener);
                    }

                    if (closer.numdelims === 0) {
                        closer_inl.unlink();
                        tempstack = closer.next;
                        this.removeDelimiter(closer);
                        closer = tempstack;
                    }

                }

            } else if (closercc === C_SINGLEQUOTE) {
                closer.node._literal = "\u2019";
                if (opener_found) {
                    opener.node._literal = "\u2018";
                }
                closer = closer.next;

            } else if (closercc === C_DOUBLEQUOTE) {
                closer.node._literal = "\u201D";
                if (opener_found) {
                    opener.node.literal = "\u201C";
                }
                closer = closer.next;

            }
            if (!opener_found && !odd_match) {
                // Set lower bound for future searches for openers:
                // We don't do this with odd_match because a **
                // that doesn't match an earlier * might turn into
                // an opener, and the * might be matched by something
                // else.
                openers_bottom[closercc] = old_closer.previous;
                if (!old_closer.can_open) {
                    // We can remove a closer that can't be an opener,
                    // once we've seen there's no matching opener:
                    this.removeDelimiter(old_closer);
                }
            }
        }

    }

    // remove all delimiters
    while (this.delimiters !== null && this.delimiters !== stack_bottom) {
        this.removeDelimiter(this.delimiters);
    }
};

// Attempt to parse link title (sans quotes), returning the string
// or null if no match.
var parseLinkTitle = function() {
    var title = this.match(reLinkTitle);
    if (title === null) {
        return null;
    } else {
        // chop off quotes from title and unescape:
        return unescapeString(title.substr(1, title.length - 2));
    }
};

// Attempt to parse link destination, returning the string or
// null if no match.
var parseLinkDestination = function() {
    var res = this.match(reLinkDestinationBraces);
    if (res === null) {
        // TODO handrolled parser; res should be null or the string
        var savepos = this.pos;
        var openparens = 0;
        var c;
        while ((c = this.peek()) !== -1) {
            if (c === C_BACKSLASH) {
                this.pos += 1;
                if (this.peek() !== -1) {
                    this.pos += 1;
                }
            } else if (c === C_OPEN_PAREN) {
                this.pos += 1;
                openparens += 1;
            } else if (c === C_CLOSE_PAREN) {
                if (openparens < 1) {
                    break;
                } else {
                    this.pos += 1;
                    openparens -= 1;
                }
            } else if (reWhitespaceChar.exec(fromCodePoint(c)) !== null) {
                break;
            } else {
                this.pos += 1;
            }
        }
        res = this.subject.substr(savepos, this.pos - savepos);
        return normalizeURI(unescapeString(res));
    } else {  // chop off surrounding <..>:
        return normalizeURI(unescapeString(res.substr(1, res.length - 2)));
    }
};

// Attempt to parse a link label, returning number of characters parsed.
var parseLinkLabel = function() {
    var m = this.match(reLinkLabel);
    // Note:  our regex will allow something of form [..\];
    // we disallow it here rather than using lookahead in the regex:
    if (m === null || m.length > 1001 || /[^\\]\\\]$/.exec(m)) {
        return 0;
    } else {
        return m.length;
    }
};

// Add open bracket to delimiter stack and add a text node to block's children.
var parseOpenBracket = function(block) {
    var startpos = this.pos;
    this.pos += 1;

    var node = text('[');
    block.appendChild(node);

    // Add entry to stack for this opener
    this.addBracket(node, startpos, false);
    return true;
};

// IF next character is [, and ! delimiter to delimiter stack and
// add a text node to block's children.  Otherwise just add a text node.
var parseBang = function(block) {
    var startpos = this.pos;
    this.pos += 1;
    if (this.peek() === C_OPEN_BRACKET) {
        this.pos += 1;

        var node = text('![');
        block.appendChild(node);

        // Add entry to stack for this opener
        this.addBracket(node, startpos + 1, true);
    } else {
        block.appendChild(text('!'));
    }
    return true;
};

// Try to match close bracket against an opening in the delimiter
// stack.  Add either a link or image, or a plain [ character,
// to block's children.  If there is a matching delimiter,
// remove it from the delimiter stack.
var parseCloseBracket = function(block) {
    var startpos;
    var is_image;
    var dest;
    var title;
    var matched = false;
    var reflabel;
    var opener;

    this.pos += 1;
    startpos = this.pos;

    // get last [ or ![
    opener = this.brackets;

    if (opener === null) {
        // no matched opener, just return a literal
        block.appendChild(text(']'));
        return true;
    }

    if (!opener.active) {
        // no matched opener, just return a literal
        block.appendChild(text(']'));
        // take opener off brackets stack
        this.removeBracket();
        return true;
    }

    // If we got here, open is a potential opener
    is_image = opener.image;

    // Check to see if we have a link/image

    var savepos = this.pos;

    // Inline link?
    if (this.peek() === C_OPEN_PAREN) {
        this.pos++;
        if (this.spnl() &&
            ((dest = this.parseLinkDestination()) !== null) &&
            this.spnl() &&
            // make sure there's a space before the title:
            (reWhitespaceChar.test(this.subject.charAt(this.pos - 1)) &&
             (title = this.parseLinkTitle()) || true) &&
            this.spnl() &&
            this.peek() === C_CLOSE_PAREN) {
            this.pos += 1;
            matched = true;
        } else {
            this.pos = savepos;
        }
    }

    if (!matched) {

        // Next, see if there's a link label
        var beforelabel = this.pos;
        var n = this.parseLinkLabel();
        if (n > 2) {
            reflabel = this.subject.slice(beforelabel, beforelabel + n);
        } else if (!opener.bracketAfter) {
            // Empty or missing second label means to use the first label as the reference.
            // The reference must not contain a bracket. If we know there's a bracket, we don't even bother checking it.
            reflabel = this.subject.slice(opener.index, startpos);
        }
        if (n === 0) {
            // If shortcut reference link, rewind before spaces we skipped.
            this.pos = savepos;
        }

        if (reflabel) {
            // lookup rawlabel in refmap
            var link = this.refmap[normalizeReference(reflabel)];
            if (link) {
                dest = link.destination;
                title = link.title;
                matched = true;
            }
        }
    }

    if (matched) {
        var node = new Node(is_image ? 'image' : 'link');
        node._destination = dest;
        node._title = title || '';

        var tmp, next;
        tmp = opener.node._next;
        while (tmp) {
            next = tmp._next;
            tmp.unlink();
            node.appendChild(tmp);
            tmp = next;
        }
        block.appendChild(node);
        this.processEmphasis(opener.previousDelimiter);
        this.removeBracket();
        opener.node.unlink();

        // We remove this bracket and processEmphasis will remove later delimiters.
        // Now, for a link, we also deactivate earlier link openers.
        // (no links in links)
        if (!is_image) {
          opener = this.brackets;
          while (opener !== null) {
            if (!opener.image) {
                opener.active = false; // deactivate this opener
            }
            opener = opener.previous;
          }
        }

        return true;

    } else { // no match

        this.removeBracket();  // remove this opener from stack
        this.pos = startpos;
        block.appendChild(text(']'));
        return true;
    }

};

var addBracket = function(node, index, image) {
    if (this.brackets !== null) {
        this.brackets.bracketAfter = true;
    }
    this.brackets = { node: node,
                      previous: this.brackets,
                      previousDelimiter: this.delimiters,
                      index: index,
                      image: image,
                      active: true };
};

var removeBracket = function() {
    this.brackets = this.brackets.previous;
};

// Attempt to parse an entity.
var parseEntity = function(block) {
    var m;
    if ((m = this.match(reEntityHere))) {
        block.appendChild(text(decodeHTML(m)));
        return true;
    } else {
        return false;
    }
};

// Parse a run of ordinary characters, or a single character with
// a special meaning in markdown, as a plain string.
var parseString = function(block) {
    var m;
    if ((m = this.match(reMain))) {
        if (this.options.smart) {
            block.appendChild(text(
                m.replace(reEllipses, "\u2026")
                    .replace(reDash, function(chars) {
                        var enCount = 0;
                        var emCount = 0;
                        if (chars.length % 3 === 0) { // If divisible by 3, use all em dashes
                            emCount = chars.length / 3;
                        } else if (chars.length % 2 === 0) { // If divisible by 2, use all en dashes
                            enCount = chars.length / 2;
                        } else if (chars.length % 3 === 2) { // If 2 extra dashes, use en dash for last 2; em dashes for rest
                            enCount = 1;
                            emCount = (chars.length - 2) / 3;
                        } else { // Use en dashes for last 4 hyphens; em dashes for rest
                            enCount = 2;
                            emCount = (chars.length - 4) / 3;
                        }
                        return "\u2014".repeat(emCount) + "\u2013".repeat(enCount);
                    })));
        } else {
            block.appendChild(text(m));
        }
        return true;
    } else {
        return false;
    }
};

// Parse a newline.  If it was preceded by two spaces, return a hard
// line break; otherwise a soft line break.
var parseNewline = function(block) {
    this.pos += 1; // assume we're at a \n
    // check previous node for trailing spaces
    var lastc = block._lastChild;
    if (lastc && lastc.type === 'text' && lastc._literal[lastc._literal.length - 1] === ' ') {
        var hardbreak = lastc._literal[lastc._literal.length - 2] === ' ';
        lastc._literal = lastc._literal.replace(reFinalSpace, '');
        block.appendChild(new Node(hardbreak ? 'linebreak' : 'softbreak'));
    } else {
        block.appendChild(new Node('softbreak'));
    }
    this.match(reInitialSpace); // gobble leading spaces in next line
    return true;
};

// Attempt to parse a link reference, modifying refmap.
var parseReference = function(s, refmap) {
    this.subject = s;
    this.pos = 0;
    var rawlabel;
    var dest;
    var title;
    var matchChars;
    var startpos = this.pos;

    // label:
    matchChars = this.parseLinkLabel();
    if (matchChars === 0) {
        return 0;
    } else {
        rawlabel = this.subject.substr(0, matchChars);
    }

    // colon:
    if (this.peek() === C_COLON) {
        this.pos++;
    } else {
        this.pos = startpos;
        return 0;
    }

    //  link url
    this.spnl();

    dest = this.parseLinkDestination();
    if (dest === null || dest.length === 0) {
        this.pos = startpos;
        return 0;
    }

    var beforetitle = this.pos;
    this.spnl();
    title = this.parseLinkTitle();
    if (title === null) {
        title = '';
        // rewind before spaces
        this.pos = beforetitle;
    }

    // make sure we're at line end:
    var atLineEnd = true;
    if (this.match(reSpaceAtEndOfLine) === null) {
        if (title === '') {
            atLineEnd = false;
        } else {
            // the potential title we found is not at the line end,
            // but it could still be a legal link reference if we
            // discard the title
            title = '';
            // rewind before spaces
            this.pos = beforetitle;
            // and instead check if the link URL is at the line end
            atLineEnd = this.match(reSpaceAtEndOfLine) !== null;
        }
    }

    if (!atLineEnd) {
        this.pos = startpos;
        return 0;
    }

    var normlabel = normalizeReference(rawlabel);
    if (normlabel === '') {
        // label must contain non-whitespace characters
        this.pos = startpos;
        return 0;
    }

    if (!refmap[normlabel]) {
        refmap[normlabel] = { destination: dest, title: title };
    }
    return this.pos - startpos;
};

// Parse the next inline element in subject, advancing subject position.
// On success, add the result to block's children and return true.
// On failure, return false.
var parseInline = function(block) {
    var res = false;
    var c = this.peek();
    if (c === -1) {
        return false;
    }
    switch(c) {
    case C_NEWLINE:
        res = this.parseNewline(block);
        break;
    case C_BACKSLASH:
        res = this.parseBackslash(block);
        break;
    case C_BACKTICK:
        res = this.parseBackticks(block);
        break;
    case C_ASTERISK:
    case C_UNDERSCORE:
        res = this.handleDelim(c, block);
        break;
    case C_SINGLEQUOTE:
    case C_DOUBLEQUOTE:
        res = this.options.smart && this.handleDelim(c, block);
        break;
    case C_OPEN_BRACKET:
        res = this.parseOpenBracket(block);
        break;
    case C_BANG:
        res = this.parseBang(block);
        break;
    case C_CLOSE_BRACKET:
        res = this.parseCloseBracket(block);
        break;
    case C_LESSTHAN:
        res = this.parseAutolink(block) || this.parseHtmlTag(block);
        break;
    case C_AMPERSAND:
        res = this.parseEntity(block);
        break;
    default:
        res = this.parseString(block);
        break;
    }
    if (!res) {
        this.pos += 1;
        block.appendChild(text(fromCodePoint(c)));
    }

    return true;
};

// Parse string content in block into inline children,
// using refmap to resolve references.
var parseInlines = function(block) {
    this.subject = block._string_content.trim();
    this.pos = 0;
    this.delimiters = null;
    this.brackets = null;
    while (this.parseInline(block)) {
    }
    block._string_content = null; // allow raw string to be garbage collected
    this.processEmphasis(null);
};

// The InlineParser object.
function InlineParser(options){
    return {
        subject: '',
        delimiters: null,  // used by handleDelim method
        brackets: null,
        pos: 0,
        refmap: {},
        match: match,
        peek: peek,
        spnl: spnl,
        parseBackticks: parseBackticks,
        parseBackslash: parseBackslash,
        parseAutolink: parseAutolink,
        parseHtmlTag: parseHtmlTag,
        scanDelims: scanDelims,
        handleDelim: handleDelim,
        parseLinkTitle: parseLinkTitle,
        parseLinkDestination: parseLinkDestination,
        parseLinkLabel: parseLinkLabel,
        parseOpenBracket: parseOpenBracket,
        parseBang: parseBang,
        parseCloseBracket: parseCloseBracket,
        addBracket: addBracket,
        removeBracket: removeBracket,
        parseEntity: parseEntity,
        parseString: parseString,
        parseNewline: parseNewline,
        parseReference: parseReference,
        parseInline: parseInline,
        processEmphasis: processEmphasis,
        removeDelimiter: removeDelimiter,
        options: options || {},
        parse: parseInlines
    };
}

module.exports = InlineParser;

},{"./common":44,"./from-code-point.js":45,"./node":48,"./normalize-reference":49,"entities":54,"string.prototype.repeat":79}],48:[function(require,module,exports){
"use strict";

function isContainer(node) {
    switch (node._type) {
    case 'document':
    case 'block_quote':
    case 'list':
    case 'item':
    case 'paragraph':
    case 'heading':
    case 'emph':
    case 'strong':
    case 'link':
    case 'image':
    case 'custom_inline':
    case 'custom_block':
        return true;
    default:
        return false;
    }
}

var resumeAt = function(node, entering) {
    this.current = node;
    this.entering = (entering === true);
};

var next = function(){
    var cur = this.current;
    var entering = this.entering;

    if (cur === null) {
        return null;
    }

    var container = isContainer(cur);

    if (entering && container) {
        if (cur._firstChild) {
            this.current = cur._firstChild;
            this.entering = true;
        } else {
            // stay on node but exit
            this.entering = false;
        }

    } else if (cur === this.root) {
        this.current = null;

    } else if (cur._next === null) {
        this.current = cur._parent;
        this.entering = false;

    } else {
        this.current = cur._next;
        this.entering = true;
    }

    return {entering: entering, node: cur};
};

var NodeWalker = function(root) {
    return { current: root,
             root: root,
             entering: true,
             next: next,
             resumeAt: resumeAt };
};

var Node = function(nodeType, sourcepos) {
    this._type = nodeType;
    this._parent = null;
    this._firstChild = null;
    this._lastChild = null;
    this._prev = null;
    this._next = null;
    this._sourcepos = sourcepos;
    this._lastLineBlank = false;
    this._open = true;
    this._string_content = null;
    this._literal = null;
    this._listData = {};
    this._info = null;
    this._destination = null;
    this._title = null;
    this._isFenced = false;
    this._fenceChar = null;
    this._fenceLength = 0;
    this._fenceOffset = null;
    this._level = null;
    this._onEnter = null;
    this._onExit = null;
};

var proto = Node.prototype;

Object.defineProperty(proto, 'isContainer', {
    get: function () { return isContainer(this); }
});

Object.defineProperty(proto, 'type', {
    get: function() { return this._type; }
});

Object.defineProperty(proto, 'firstChild', {
    get: function() { return this._firstChild; }
});

Object.defineProperty(proto, 'lastChild', {
    get: function() { return this._lastChild; }
});

Object.defineProperty(proto, 'next', {
    get: function() { return this._next; }
});

Object.defineProperty(proto, 'prev', {
    get: function() { return this._prev; }
});

Object.defineProperty(proto, 'parent', {
    get: function() { return this._parent; }
});

Object.defineProperty(proto, 'sourcepos', {
    get: function() { return this._sourcepos; }
});

Object.defineProperty(proto, 'literal', {
    get: function() { return this._literal; },
    set: function(s) { this._literal = s; }
});

Object.defineProperty(proto, 'destination', {
    get: function() { return this._destination; },
    set: function(s) { this._destination = s; }
});

Object.defineProperty(proto, 'title', {
    get: function() { return this._title; },
    set: function(s) { this._title = s; }
});

Object.defineProperty(proto, 'info', {
    get: function() { return this._info; },
    set: function(s) { this._info = s; }
});

Object.defineProperty(proto, 'level', {
    get: function() { return this._level; },
    set: function(s) { this._level = s; }
});

Object.defineProperty(proto, 'listType', {
    get: function() { return this._listData.type; },
    set: function(t) { this._listData.type = t; }
});

Object.defineProperty(proto, 'listTight', {
    get: function() { return this._listData.tight; },
    set: function(t) { this._listData.tight = t; }
});

Object.defineProperty(proto, 'listStart', {
    get: function() { return this._listData.start; },
    set: function(n) { this._listData.start = n; }
});

Object.defineProperty(proto, 'listDelimiter', {
    get: function() { return this._listData.delimiter; },
    set: function(delim) { this._listData.delimiter = delim; }
});

Object.defineProperty(proto, 'onEnter', {
    get: function() { return this._onEnter; },
    set: function(s) { this._onEnter = s; }
});

Object.defineProperty(proto, 'onExit', {
    get: function() { return this._onExit; },
    set: function(s) { this._onExit = s; }
});

Node.prototype.appendChild = function(child) {
    child.unlink();
    child._parent = this;
    if (this._lastChild) {
        this._lastChild._next = child;
        child._prev = this._lastChild;
        this._lastChild = child;
    } else {
        this._firstChild = child;
        this._lastChild = child;
    }
};

Node.prototype.prependChild = function(child) {
    child.unlink();
    child._parent = this;
    if (this._firstChild) {
        this._firstChild._prev = child;
        child._next = this._firstChild;
        this._firstChild = child;
    } else {
        this._firstChild = child;
        this._lastChild = child;
    }
};

Node.prototype.unlink = function() {
    if (this._prev) {
        this._prev._next = this._next;
    } else if (this._parent) {
        this._parent._firstChild = this._next;
    }
    if (this._next) {
        this._next._prev = this._prev;
    } else if (this._parent) {
        this._parent._lastChild = this._prev;
    }
    this._parent = null;
    this._next = null;
    this._prev = null;
};

Node.prototype.insertAfter = function(sibling) {
    sibling.unlink();
    sibling._next = this._next;
    if (sibling._next) {
        sibling._next._prev = sibling;
    }
    sibling._prev = this;
    this._next = sibling;
    sibling._parent = this._parent;
    if (!sibling._next) {
        sibling._parent._lastChild = sibling;
    }
};

Node.prototype.insertBefore = function(sibling) {
    sibling.unlink();
    sibling._prev = this._prev;
    if (sibling._prev) {
        sibling._prev._next = sibling;
    }
    sibling._next = this;
    this._prev = sibling;
    sibling._parent = this._parent;
    if (!sibling._prev) {
        sibling._parent._firstChild = sibling;
    }
};

Node.prototype.walker = function() {
    var walker = new NodeWalker(this);
    return walker;
};

module.exports = Node;


/* Example of use of walker:

 var walker = w.walker();
 var event;

 while (event = walker.next()) {
 console.log(event.entering, event.node.type);
 }

 */

},{}],49:[function(require,module,exports){
"use strict";

/* The bulk of this code derives from https://github.com/dmoscrop/fold-case
But in addition to case-folding, we also normalize whitespace.

fold-case is Copyright Mathias Bynens <https://mathiasbynens.be/>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/*eslint-disable  key-spacing, comma-spacing */

var regex = /[ \t\r\n]+|[A-Z\xB5\xC0-\xD6\xD8-\xDF\u0100\u0102\u0104\u0106\u0108\u010A\u010C\u010E\u0110\u0112\u0114\u0116\u0118\u011A\u011C\u011E\u0120\u0122\u0124\u0126\u0128\u012A\u012C\u012E\u0130\u0132\u0134\u0136\u0139\u013B\u013D\u013F\u0141\u0143\u0145\u0147\u0149\u014A\u014C\u014E\u0150\u0152\u0154\u0156\u0158\u015A\u015C\u015E\u0160\u0162\u0164\u0166\u0168\u016A\u016C\u016E\u0170\u0172\u0174\u0176\u0178\u0179\u017B\u017D\u017F\u0181\u0182\u0184\u0186\u0187\u0189-\u018B\u018E-\u0191\u0193\u0194\u0196-\u0198\u019C\u019D\u019F\u01A0\u01A2\u01A4\u01A6\u01A7\u01A9\u01AC\u01AE\u01AF\u01B1-\u01B3\u01B5\u01B7\u01B8\u01BC\u01C4\u01C5\u01C7\u01C8\u01CA\u01CB\u01CD\u01CF\u01D1\u01D3\u01D5\u01D7\u01D9\u01DB\u01DE\u01E0\u01E2\u01E4\u01E6\u01E8\u01EA\u01EC\u01EE\u01F0-\u01F2\u01F4\u01F6-\u01F8\u01FA\u01FC\u01FE\u0200\u0202\u0204\u0206\u0208\u020A\u020C\u020E\u0210\u0212\u0214\u0216\u0218\u021A\u021C\u021E\u0220\u0222\u0224\u0226\u0228\u022A\u022C\u022E\u0230\u0232\u023A\u023B\u023D\u023E\u0241\u0243-\u0246\u0248\u024A\u024C\u024E\u0345\u0370\u0372\u0376\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03AB\u03B0\u03C2\u03CF-\u03D1\u03D5\u03D6\u03D8\u03DA\u03DC\u03DE\u03E0\u03E2\u03E4\u03E6\u03E8\u03EA\u03EC\u03EE\u03F0\u03F1\u03F4\u03F5\u03F7\u03F9\u03FA\u03FD-\u042F\u0460\u0462\u0464\u0466\u0468\u046A\u046C\u046E\u0470\u0472\u0474\u0476\u0478\u047A\u047C\u047E\u0480\u048A\u048C\u048E\u0490\u0492\u0494\u0496\u0498\u049A\u049C\u049E\u04A0\u04A2\u04A4\u04A6\u04A8\u04AA\u04AC\u04AE\u04B0\u04B2\u04B4\u04B6\u04B8\u04BA\u04BC\u04BE\u04C0\u04C1\u04C3\u04C5\u04C7\u04C9\u04CB\u04CD\u04D0\u04D2\u04D4\u04D6\u04D8\u04DA\u04DC\u04DE\u04E0\u04E2\u04E4\u04E6\u04E8\u04EA\u04EC\u04EE\u04F0\u04F2\u04F4\u04F6\u04F8\u04FA\u04FC\u04FE\u0500\u0502\u0504\u0506\u0508\u050A\u050C\u050E\u0510\u0512\u0514\u0516\u0518\u051A\u051C\u051E\u0520\u0522\u0524\u0526\u0528\u052A\u052C\u052E\u0531-\u0556\u0587\u10A0-\u10C5\u10C7\u10CD\u1E00\u1E02\u1E04\u1E06\u1E08\u1E0A\u1E0C\u1E0E\u1E10\u1E12\u1E14\u1E16\u1E18\u1E1A\u1E1C\u1E1E\u1E20\u1E22\u1E24\u1E26\u1E28\u1E2A\u1E2C\u1E2E\u1E30\u1E32\u1E34\u1E36\u1E38\u1E3A\u1E3C\u1E3E\u1E40\u1E42\u1E44\u1E46\u1E48\u1E4A\u1E4C\u1E4E\u1E50\u1E52\u1E54\u1E56\u1E58\u1E5A\u1E5C\u1E5E\u1E60\u1E62\u1E64\u1E66\u1E68\u1E6A\u1E6C\u1E6E\u1E70\u1E72\u1E74\u1E76\u1E78\u1E7A\u1E7C\u1E7E\u1E80\u1E82\u1E84\u1E86\u1E88\u1E8A\u1E8C\u1E8E\u1E90\u1E92\u1E94\u1E96-\u1E9B\u1E9E\u1EA0\u1EA2\u1EA4\u1EA6\u1EA8\u1EAA\u1EAC\u1EAE\u1EB0\u1EB2\u1EB4\u1EB6\u1EB8\u1EBA\u1EBC\u1EBE\u1EC0\u1EC2\u1EC4\u1EC6\u1EC8\u1ECA\u1ECC\u1ECE\u1ED0\u1ED2\u1ED4\u1ED6\u1ED8\u1EDA\u1EDC\u1EDE\u1EE0\u1EE2\u1EE4\u1EE6\u1EE8\u1EEA\u1EEC\u1EEE\u1EF0\u1EF2\u1EF4\u1EF6\u1EF8\u1EFA\u1EFC\u1EFE\u1F08-\u1F0F\u1F18-\u1F1D\u1F28-\u1F2F\u1F38-\u1F3F\u1F48-\u1F4D\u1F50\u1F52\u1F54\u1F56\u1F59\u1F5B\u1F5D\u1F5F\u1F68-\u1F6F\u1F80-\u1FAF\u1FB2-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD2\u1FD3\u1FD6-\u1FDB\u1FE2-\u1FE4\u1FE6-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2126\u212A\u212B\u2132\u2160-\u216F\u2183\u24B6-\u24CF\u2C00-\u2C2E\u2C60\u2C62-\u2C64\u2C67\u2C69\u2C6B\u2C6D-\u2C70\u2C72\u2C75\u2C7E-\u2C80\u2C82\u2C84\u2C86\u2C88\u2C8A\u2C8C\u2C8E\u2C90\u2C92\u2C94\u2C96\u2C98\u2C9A\u2C9C\u2C9E\u2CA0\u2CA2\u2CA4\u2CA6\u2CA8\u2CAA\u2CAC\u2CAE\u2CB0\u2CB2\u2CB4\u2CB6\u2CB8\u2CBA\u2CBC\u2CBE\u2CC0\u2CC2\u2CC4\u2CC6\u2CC8\u2CCA\u2CCC\u2CCE\u2CD0\u2CD2\u2CD4\u2CD6\u2CD8\u2CDA\u2CDC\u2CDE\u2CE0\u2CE2\u2CEB\u2CED\u2CF2\uA640\uA642\uA644\uA646\uA648\uA64A\uA64C\uA64E\uA650\uA652\uA654\uA656\uA658\uA65A\uA65C\uA65E\uA660\uA662\uA664\uA666\uA668\uA66A\uA66C\uA680\uA682\uA684\uA686\uA688\uA68A\uA68C\uA68E\uA690\uA692\uA694\uA696\uA698\uA69A\uA722\uA724\uA726\uA728\uA72A\uA72C\uA72E\uA732\uA734\uA736\uA738\uA73A\uA73C\uA73E\uA740\uA742\uA744\uA746\uA748\uA74A\uA74C\uA74E\uA750\uA752\uA754\uA756\uA758\uA75A\uA75C\uA75E\uA760\uA762\uA764\uA766\uA768\uA76A\uA76C\uA76E\uA779\uA77B\uA77D\uA77E\uA780\uA782\uA784\uA786\uA78B\uA78D\uA790\uA792\uA796\uA798\uA79A\uA79C\uA79E\uA7A0\uA7A2\uA7A4\uA7A6\uA7A8\uA7AA-\uA7AD\uA7B0\uA7B1\uFB00-\uFB06\uFB13-\uFB17\uFF21-\uFF3A]|\uD801[\uDC00-\uDC27]|\uD806[\uDCA0-\uDCBF]/g;

var map = {'A':'a','B':'b','C':'c','D':'d','E':'e','F':'f','G':'g','H':'h','I':'i','J':'j','K':'k','L':'l','M':'m','N':'n','O':'o','P':'p','Q':'q','R':'r','S':'s','T':'t','U':'u','V':'v','W':'w','X':'x','Y':'y','Z':'z','\xB5':'\u03BC','\xC0':'\xE0','\xC1':'\xE1','\xC2':'\xE2','\xC3':'\xE3','\xC4':'\xE4','\xC5':'\xE5','\xC6':'\xE6','\xC7':'\xE7','\xC8':'\xE8','\xC9':'\xE9','\xCA':'\xEA','\xCB':'\xEB','\xCC':'\xEC','\xCD':'\xED','\xCE':'\xEE','\xCF':'\xEF','\xD0':'\xF0','\xD1':'\xF1','\xD2':'\xF2','\xD3':'\xF3','\xD4':'\xF4','\xD5':'\xF5','\xD6':'\xF6','\xD8':'\xF8','\xD9':'\xF9','\xDA':'\xFA','\xDB':'\xFB','\xDC':'\xFC','\xDD':'\xFD','\xDE':'\xFE','\u0100':'\u0101','\u0102':'\u0103','\u0104':'\u0105','\u0106':'\u0107','\u0108':'\u0109','\u010A':'\u010B','\u010C':'\u010D','\u010E':'\u010F','\u0110':'\u0111','\u0112':'\u0113','\u0114':'\u0115','\u0116':'\u0117','\u0118':'\u0119','\u011A':'\u011B','\u011C':'\u011D','\u011E':'\u011F','\u0120':'\u0121','\u0122':'\u0123','\u0124':'\u0125','\u0126':'\u0127','\u0128':'\u0129','\u012A':'\u012B','\u012C':'\u012D','\u012E':'\u012F','\u0132':'\u0133','\u0134':'\u0135','\u0136':'\u0137','\u0139':'\u013A','\u013B':'\u013C','\u013D':'\u013E','\u013F':'\u0140','\u0141':'\u0142','\u0143':'\u0144','\u0145':'\u0146','\u0147':'\u0148','\u014A':'\u014B','\u014C':'\u014D','\u014E':'\u014F','\u0150':'\u0151','\u0152':'\u0153','\u0154':'\u0155','\u0156':'\u0157','\u0158':'\u0159','\u015A':'\u015B','\u015C':'\u015D','\u015E':'\u015F','\u0160':'\u0161','\u0162':'\u0163','\u0164':'\u0165','\u0166':'\u0167','\u0168':'\u0169','\u016A':'\u016B','\u016C':'\u016D','\u016E':'\u016F','\u0170':'\u0171','\u0172':'\u0173','\u0174':'\u0175','\u0176':'\u0177','\u0178':'\xFF','\u0179':'\u017A','\u017B':'\u017C','\u017D':'\u017E','\u017F':'s','\u0181':'\u0253','\u0182':'\u0183','\u0184':'\u0185','\u0186':'\u0254','\u0187':'\u0188','\u0189':'\u0256','\u018A':'\u0257','\u018B':'\u018C','\u018E':'\u01DD','\u018F':'\u0259','\u0190':'\u025B','\u0191':'\u0192','\u0193':'\u0260','\u0194':'\u0263','\u0196':'\u0269','\u0197':'\u0268','\u0198':'\u0199','\u019C':'\u026F','\u019D':'\u0272','\u019F':'\u0275','\u01A0':'\u01A1','\u01A2':'\u01A3','\u01A4':'\u01A5','\u01A6':'\u0280','\u01A7':'\u01A8','\u01A9':'\u0283','\u01AC':'\u01AD','\u01AE':'\u0288','\u01AF':'\u01B0','\u01B1':'\u028A','\u01B2':'\u028B','\u01B3':'\u01B4','\u01B5':'\u01B6','\u01B7':'\u0292','\u01B8':'\u01B9','\u01BC':'\u01BD','\u01C4':'\u01C6','\u01C5':'\u01C6','\u01C7':'\u01C9','\u01C8':'\u01C9','\u01CA':'\u01CC','\u01CB':'\u01CC','\u01CD':'\u01CE','\u01CF':'\u01D0','\u01D1':'\u01D2','\u01D3':'\u01D4','\u01D5':'\u01D6','\u01D7':'\u01D8','\u01D9':'\u01DA','\u01DB':'\u01DC','\u01DE':'\u01DF','\u01E0':'\u01E1','\u01E2':'\u01E3','\u01E4':'\u01E5','\u01E6':'\u01E7','\u01E8':'\u01E9','\u01EA':'\u01EB','\u01EC':'\u01ED','\u01EE':'\u01EF','\u01F1':'\u01F3','\u01F2':'\u01F3','\u01F4':'\u01F5','\u01F6':'\u0195','\u01F7':'\u01BF','\u01F8':'\u01F9','\u01FA':'\u01FB','\u01FC':'\u01FD','\u01FE':'\u01FF','\u0200':'\u0201','\u0202':'\u0203','\u0204':'\u0205','\u0206':'\u0207','\u0208':'\u0209','\u020A':'\u020B','\u020C':'\u020D','\u020E':'\u020F','\u0210':'\u0211','\u0212':'\u0213','\u0214':'\u0215','\u0216':'\u0217','\u0218':'\u0219','\u021A':'\u021B','\u021C':'\u021D','\u021E':'\u021F','\u0220':'\u019E','\u0222':'\u0223','\u0224':'\u0225','\u0226':'\u0227','\u0228':'\u0229','\u022A':'\u022B','\u022C':'\u022D','\u022E':'\u022F','\u0230':'\u0231','\u0232':'\u0233','\u023A':'\u2C65','\u023B':'\u023C','\u023D':'\u019A','\u023E':'\u2C66','\u0241':'\u0242','\u0243':'\u0180','\u0244':'\u0289','\u0245':'\u028C','\u0246':'\u0247','\u0248':'\u0249','\u024A':'\u024B','\u024C':'\u024D','\u024E':'\u024F','\u0345':'\u03B9','\u0370':'\u0371','\u0372':'\u0373','\u0376':'\u0377','\u037F':'\u03F3','\u0386':'\u03AC','\u0388':'\u03AD','\u0389':'\u03AE','\u038A':'\u03AF','\u038C':'\u03CC','\u038E':'\u03CD','\u038F':'\u03CE','\u0391':'\u03B1','\u0392':'\u03B2','\u0393':'\u03B3','\u0394':'\u03B4','\u0395':'\u03B5','\u0396':'\u03B6','\u0397':'\u03B7','\u0398':'\u03B8','\u0399':'\u03B9','\u039A':'\u03BA','\u039B':'\u03BB','\u039C':'\u03BC','\u039D':'\u03BD','\u039E':'\u03BE','\u039F':'\u03BF','\u03A0':'\u03C0','\u03A1':'\u03C1','\u03A3':'\u03C3','\u03A4':'\u03C4','\u03A5':'\u03C5','\u03A6':'\u03C6','\u03A7':'\u03C7','\u03A8':'\u03C8','\u03A9':'\u03C9','\u03AA':'\u03CA','\u03AB':'\u03CB','\u03C2':'\u03C3','\u03CF':'\u03D7','\u03D0':'\u03B2','\u03D1':'\u03B8','\u03D5':'\u03C6','\u03D6':'\u03C0','\u03D8':'\u03D9','\u03DA':'\u03DB','\u03DC':'\u03DD','\u03DE':'\u03DF','\u03E0':'\u03E1','\u03E2':'\u03E3','\u03E4':'\u03E5','\u03E6':'\u03E7','\u03E8':'\u03E9','\u03EA':'\u03EB','\u03EC':'\u03ED','\u03EE':'\u03EF','\u03F0':'\u03BA','\u03F1':'\u03C1','\u03F4':'\u03B8','\u03F5':'\u03B5','\u03F7':'\u03F8','\u03F9':'\u03F2','\u03FA':'\u03FB','\u03FD':'\u037B','\u03FE':'\u037C','\u03FF':'\u037D','\u0400':'\u0450','\u0401':'\u0451','\u0402':'\u0452','\u0403':'\u0453','\u0404':'\u0454','\u0405':'\u0455','\u0406':'\u0456','\u0407':'\u0457','\u0408':'\u0458','\u0409':'\u0459','\u040A':'\u045A','\u040B':'\u045B','\u040C':'\u045C','\u040D':'\u045D','\u040E':'\u045E','\u040F':'\u045F','\u0410':'\u0430','\u0411':'\u0431','\u0412':'\u0432','\u0413':'\u0433','\u0414':'\u0434','\u0415':'\u0435','\u0416':'\u0436','\u0417':'\u0437','\u0418':'\u0438','\u0419':'\u0439','\u041A':'\u043A','\u041B':'\u043B','\u041C':'\u043C','\u041D':'\u043D','\u041E':'\u043E','\u041F':'\u043F','\u0420':'\u0440','\u0421':'\u0441','\u0422':'\u0442','\u0423':'\u0443','\u0424':'\u0444','\u0425':'\u0445','\u0426':'\u0446','\u0427':'\u0447','\u0428':'\u0448','\u0429':'\u0449','\u042A':'\u044A','\u042B':'\u044B','\u042C':'\u044C','\u042D':'\u044D','\u042E':'\u044E','\u042F':'\u044F','\u0460':'\u0461','\u0462':'\u0463','\u0464':'\u0465','\u0466':'\u0467','\u0468':'\u0469','\u046A':'\u046B','\u046C':'\u046D','\u046E':'\u046F','\u0470':'\u0471','\u0472':'\u0473','\u0474':'\u0475','\u0476':'\u0477','\u0478':'\u0479','\u047A':'\u047B','\u047C':'\u047D','\u047E':'\u047F','\u0480':'\u0481','\u048A':'\u048B','\u048C':'\u048D','\u048E':'\u048F','\u0490':'\u0491','\u0492':'\u0493','\u0494':'\u0495','\u0496':'\u0497','\u0498':'\u0499','\u049A':'\u049B','\u049C':'\u049D','\u049E':'\u049F','\u04A0':'\u04A1','\u04A2':'\u04A3','\u04A4':'\u04A5','\u04A6':'\u04A7','\u04A8':'\u04A9','\u04AA':'\u04AB','\u04AC':'\u04AD','\u04AE':'\u04AF','\u04B0':'\u04B1','\u04B2':'\u04B3','\u04B4':'\u04B5','\u04B6':'\u04B7','\u04B8':'\u04B9','\u04BA':'\u04BB','\u04BC':'\u04BD','\u04BE':'\u04BF','\u04C0':'\u04CF','\u04C1':'\u04C2','\u04C3':'\u04C4','\u04C5':'\u04C6','\u04C7':'\u04C8','\u04C9':'\u04CA','\u04CB':'\u04CC','\u04CD':'\u04CE','\u04D0':'\u04D1','\u04D2':'\u04D3','\u04D4':'\u04D5','\u04D6':'\u04D7','\u04D8':'\u04D9','\u04DA':'\u04DB','\u04DC':'\u04DD','\u04DE':'\u04DF','\u04E0':'\u04E1','\u04E2':'\u04E3','\u04E4':'\u04E5','\u04E6':'\u04E7','\u04E8':'\u04E9','\u04EA':'\u04EB','\u04EC':'\u04ED','\u04EE':'\u04EF','\u04F0':'\u04F1','\u04F2':'\u04F3','\u04F4':'\u04F5','\u04F6':'\u04F7','\u04F8':'\u04F9','\u04FA':'\u04FB','\u04FC':'\u04FD','\u04FE':'\u04FF','\u0500':'\u0501','\u0502':'\u0503','\u0504':'\u0505','\u0506':'\u0507','\u0508':'\u0509','\u050A':'\u050B','\u050C':'\u050D','\u050E':'\u050F','\u0510':'\u0511','\u0512':'\u0513','\u0514':'\u0515','\u0516':'\u0517','\u0518':'\u0519','\u051A':'\u051B','\u051C':'\u051D','\u051E':'\u051F','\u0520':'\u0521','\u0522':'\u0523','\u0524':'\u0525','\u0526':'\u0527','\u0528':'\u0529','\u052A':'\u052B','\u052C':'\u052D','\u052E':'\u052F','\u0531':'\u0561','\u0532':'\u0562','\u0533':'\u0563','\u0534':'\u0564','\u0535':'\u0565','\u0536':'\u0566','\u0537':'\u0567','\u0538':'\u0568','\u0539':'\u0569','\u053A':'\u056A','\u053B':'\u056B','\u053C':'\u056C','\u053D':'\u056D','\u053E':'\u056E','\u053F':'\u056F','\u0540':'\u0570','\u0541':'\u0571','\u0542':'\u0572','\u0543':'\u0573','\u0544':'\u0574','\u0545':'\u0575','\u0546':'\u0576','\u0547':'\u0577','\u0548':'\u0578','\u0549':'\u0579','\u054A':'\u057A','\u054B':'\u057B','\u054C':'\u057C','\u054D':'\u057D','\u054E':'\u057E','\u054F':'\u057F','\u0550':'\u0580','\u0551':'\u0581','\u0552':'\u0582','\u0553':'\u0583','\u0554':'\u0584','\u0555':'\u0585','\u0556':'\u0586','\u10A0':'\u2D00','\u10A1':'\u2D01','\u10A2':'\u2D02','\u10A3':'\u2D03','\u10A4':'\u2D04','\u10A5':'\u2D05','\u10A6':'\u2D06','\u10A7':'\u2D07','\u10A8':'\u2D08','\u10A9':'\u2D09','\u10AA':'\u2D0A','\u10AB':'\u2D0B','\u10AC':'\u2D0C','\u10AD':'\u2D0D','\u10AE':'\u2D0E','\u10AF':'\u2D0F','\u10B0':'\u2D10','\u10B1':'\u2D11','\u10B2':'\u2D12','\u10B3':'\u2D13','\u10B4':'\u2D14','\u10B5':'\u2D15','\u10B6':'\u2D16','\u10B7':'\u2D17','\u10B8':'\u2D18','\u10B9':'\u2D19','\u10BA':'\u2D1A','\u10BB':'\u2D1B','\u10BC':'\u2D1C','\u10BD':'\u2D1D','\u10BE':'\u2D1E','\u10BF':'\u2D1F','\u10C0':'\u2D20','\u10C1':'\u2D21','\u10C2':'\u2D22','\u10C3':'\u2D23','\u10C4':'\u2D24','\u10C5':'\u2D25','\u10C7':'\u2D27','\u10CD':'\u2D2D','\u1E00':'\u1E01','\u1E02':'\u1E03','\u1E04':'\u1E05','\u1E06':'\u1E07','\u1E08':'\u1E09','\u1E0A':'\u1E0B','\u1E0C':'\u1E0D','\u1E0E':'\u1E0F','\u1E10':'\u1E11','\u1E12':'\u1E13','\u1E14':'\u1E15','\u1E16':'\u1E17','\u1E18':'\u1E19','\u1E1A':'\u1E1B','\u1E1C':'\u1E1D','\u1E1E':'\u1E1F','\u1E20':'\u1E21','\u1E22':'\u1E23','\u1E24':'\u1E25','\u1E26':'\u1E27','\u1E28':'\u1E29','\u1E2A':'\u1E2B','\u1E2C':'\u1E2D','\u1E2E':'\u1E2F','\u1E30':'\u1E31','\u1E32':'\u1E33','\u1E34':'\u1E35','\u1E36':'\u1E37','\u1E38':'\u1E39','\u1E3A':'\u1E3B','\u1E3C':'\u1E3D','\u1E3E':'\u1E3F','\u1E40':'\u1E41','\u1E42':'\u1E43','\u1E44':'\u1E45','\u1E46':'\u1E47','\u1E48':'\u1E49','\u1E4A':'\u1E4B','\u1E4C':'\u1E4D','\u1E4E':'\u1E4F','\u1E50':'\u1E51','\u1E52':'\u1E53','\u1E54':'\u1E55','\u1E56':'\u1E57','\u1E58':'\u1E59','\u1E5A':'\u1E5B','\u1E5C':'\u1E5D','\u1E5E':'\u1E5F','\u1E60':'\u1E61','\u1E62':'\u1E63','\u1E64':'\u1E65','\u1E66':'\u1E67','\u1E68':'\u1E69','\u1E6A':'\u1E6B','\u1E6C':'\u1E6D','\u1E6E':'\u1E6F','\u1E70':'\u1E71','\u1E72':'\u1E73','\u1E74':'\u1E75','\u1E76':'\u1E77','\u1E78':'\u1E79','\u1E7A':'\u1E7B','\u1E7C':'\u1E7D','\u1E7E':'\u1E7F','\u1E80':'\u1E81','\u1E82':'\u1E83','\u1E84':'\u1E85','\u1E86':'\u1E87','\u1E88':'\u1E89','\u1E8A':'\u1E8B','\u1E8C':'\u1E8D','\u1E8E':'\u1E8F','\u1E90':'\u1E91','\u1E92':'\u1E93','\u1E94':'\u1E95','\u1E9B':'\u1E61','\u1EA0':'\u1EA1','\u1EA2':'\u1EA3','\u1EA4':'\u1EA5','\u1EA6':'\u1EA7','\u1EA8':'\u1EA9','\u1EAA':'\u1EAB','\u1EAC':'\u1EAD','\u1EAE':'\u1EAF','\u1EB0':'\u1EB1','\u1EB2':'\u1EB3','\u1EB4':'\u1EB5','\u1EB6':'\u1EB7','\u1EB8':'\u1EB9','\u1EBA':'\u1EBB','\u1EBC':'\u1EBD','\u1EBE':'\u1EBF','\u1EC0':'\u1EC1','\u1EC2':'\u1EC3','\u1EC4':'\u1EC5','\u1EC6':'\u1EC7','\u1EC8':'\u1EC9','\u1ECA':'\u1ECB','\u1ECC':'\u1ECD','\u1ECE':'\u1ECF','\u1ED0':'\u1ED1','\u1ED2':'\u1ED3','\u1ED4':'\u1ED5','\u1ED6':'\u1ED7','\u1ED8':'\u1ED9','\u1EDA':'\u1EDB','\u1EDC':'\u1EDD','\u1EDE':'\u1EDF','\u1EE0':'\u1EE1','\u1EE2':'\u1EE3','\u1EE4':'\u1EE5','\u1EE6':'\u1EE7','\u1EE8':'\u1EE9','\u1EEA':'\u1EEB','\u1EEC':'\u1EED','\u1EEE':'\u1EEF','\u1EF0':'\u1EF1','\u1EF2':'\u1EF3','\u1EF4':'\u1EF5','\u1EF6':'\u1EF7','\u1EF8':'\u1EF9','\u1EFA':'\u1EFB','\u1EFC':'\u1EFD','\u1EFE':'\u1EFF','\u1F08':'\u1F00','\u1F09':'\u1F01','\u1F0A':'\u1F02','\u1F0B':'\u1F03','\u1F0C':'\u1F04','\u1F0D':'\u1F05','\u1F0E':'\u1F06','\u1F0F':'\u1F07','\u1F18':'\u1F10','\u1F19':'\u1F11','\u1F1A':'\u1F12','\u1F1B':'\u1F13','\u1F1C':'\u1F14','\u1F1D':'\u1F15','\u1F28':'\u1F20','\u1F29':'\u1F21','\u1F2A':'\u1F22','\u1F2B':'\u1F23','\u1F2C':'\u1F24','\u1F2D':'\u1F25','\u1F2E':'\u1F26','\u1F2F':'\u1F27','\u1F38':'\u1F30','\u1F39':'\u1F31','\u1F3A':'\u1F32','\u1F3B':'\u1F33','\u1F3C':'\u1F34','\u1F3D':'\u1F35','\u1F3E':'\u1F36','\u1F3F':'\u1F37','\u1F48':'\u1F40','\u1F49':'\u1F41','\u1F4A':'\u1F42','\u1F4B':'\u1F43','\u1F4C':'\u1F44','\u1F4D':'\u1F45','\u1F59':'\u1F51','\u1F5B':'\u1F53','\u1F5D':'\u1F55','\u1F5F':'\u1F57','\u1F68':'\u1F60','\u1F69':'\u1F61','\u1F6A':'\u1F62','\u1F6B':'\u1F63','\u1F6C':'\u1F64','\u1F6D':'\u1F65','\u1F6E':'\u1F66','\u1F6F':'\u1F67','\u1FB8':'\u1FB0','\u1FB9':'\u1FB1','\u1FBA':'\u1F70','\u1FBB':'\u1F71','\u1FBE':'\u03B9','\u1FC8':'\u1F72','\u1FC9':'\u1F73','\u1FCA':'\u1F74','\u1FCB':'\u1F75','\u1FD8':'\u1FD0','\u1FD9':'\u1FD1','\u1FDA':'\u1F76','\u1FDB':'\u1F77','\u1FE8':'\u1FE0','\u1FE9':'\u1FE1','\u1FEA':'\u1F7A','\u1FEB':'\u1F7B','\u1FEC':'\u1FE5','\u1FF8':'\u1F78','\u1FF9':'\u1F79','\u1FFA':'\u1F7C','\u1FFB':'\u1F7D','\u2126':'\u03C9','\u212A':'k','\u212B':'\xE5','\u2132':'\u214E','\u2160':'\u2170','\u2161':'\u2171','\u2162':'\u2172','\u2163':'\u2173','\u2164':'\u2174','\u2165':'\u2175','\u2166':'\u2176','\u2167':'\u2177','\u2168':'\u2178','\u2169':'\u2179','\u216A':'\u217A','\u216B':'\u217B','\u216C':'\u217C','\u216D':'\u217D','\u216E':'\u217E','\u216F':'\u217F','\u2183':'\u2184','\u24B6':'\u24D0','\u24B7':'\u24D1','\u24B8':'\u24D2','\u24B9':'\u24D3','\u24BA':'\u24D4','\u24BB':'\u24D5','\u24BC':'\u24D6','\u24BD':'\u24D7','\u24BE':'\u24D8','\u24BF':'\u24D9','\u24C0':'\u24DA','\u24C1':'\u24DB','\u24C2':'\u24DC','\u24C3':'\u24DD','\u24C4':'\u24DE','\u24C5':'\u24DF','\u24C6':'\u24E0','\u24C7':'\u24E1','\u24C8':'\u24E2','\u24C9':'\u24E3','\u24CA':'\u24E4','\u24CB':'\u24E5','\u24CC':'\u24E6','\u24CD':'\u24E7','\u24CE':'\u24E8','\u24CF':'\u24E9','\u2C00':'\u2C30','\u2C01':'\u2C31','\u2C02':'\u2C32','\u2C03':'\u2C33','\u2C04':'\u2C34','\u2C05':'\u2C35','\u2C06':'\u2C36','\u2C07':'\u2C37','\u2C08':'\u2C38','\u2C09':'\u2C39','\u2C0A':'\u2C3A','\u2C0B':'\u2C3B','\u2C0C':'\u2C3C','\u2C0D':'\u2C3D','\u2C0E':'\u2C3E','\u2C0F':'\u2C3F','\u2C10':'\u2C40','\u2C11':'\u2C41','\u2C12':'\u2C42','\u2C13':'\u2C43','\u2C14':'\u2C44','\u2C15':'\u2C45','\u2C16':'\u2C46','\u2C17':'\u2C47','\u2C18':'\u2C48','\u2C19':'\u2C49','\u2C1A':'\u2C4A','\u2C1B':'\u2C4B','\u2C1C':'\u2C4C','\u2C1D':'\u2C4D','\u2C1E':'\u2C4E','\u2C1F':'\u2C4F','\u2C20':'\u2C50','\u2C21':'\u2C51','\u2C22':'\u2C52','\u2C23':'\u2C53','\u2C24':'\u2C54','\u2C25':'\u2C55','\u2C26':'\u2C56','\u2C27':'\u2C57','\u2C28':'\u2C58','\u2C29':'\u2C59','\u2C2A':'\u2C5A','\u2C2B':'\u2C5B','\u2C2C':'\u2C5C','\u2C2D':'\u2C5D','\u2C2E':'\u2C5E','\u2C60':'\u2C61','\u2C62':'\u026B','\u2C63':'\u1D7D','\u2C64':'\u027D','\u2C67':'\u2C68','\u2C69':'\u2C6A','\u2C6B':'\u2C6C','\u2C6D':'\u0251','\u2C6E':'\u0271','\u2C6F':'\u0250','\u2C70':'\u0252','\u2C72':'\u2C73','\u2C75':'\u2C76','\u2C7E':'\u023F','\u2C7F':'\u0240','\u2C80':'\u2C81','\u2C82':'\u2C83','\u2C84':'\u2C85','\u2C86':'\u2C87','\u2C88':'\u2C89','\u2C8A':'\u2C8B','\u2C8C':'\u2C8D','\u2C8E':'\u2C8F','\u2C90':'\u2C91','\u2C92':'\u2C93','\u2C94':'\u2C95','\u2C96':'\u2C97','\u2C98':'\u2C99','\u2C9A':'\u2C9B','\u2C9C':'\u2C9D','\u2C9E':'\u2C9F','\u2CA0':'\u2CA1','\u2CA2':'\u2CA3','\u2CA4':'\u2CA5','\u2CA6':'\u2CA7','\u2CA8':'\u2CA9','\u2CAA':'\u2CAB','\u2CAC':'\u2CAD','\u2CAE':'\u2CAF','\u2CB0':'\u2CB1','\u2CB2':'\u2CB3','\u2CB4':'\u2CB5','\u2CB6':'\u2CB7','\u2CB8':'\u2CB9','\u2CBA':'\u2CBB','\u2CBC':'\u2CBD','\u2CBE':'\u2CBF','\u2CC0':'\u2CC1','\u2CC2':'\u2CC3','\u2CC4':'\u2CC5','\u2CC6':'\u2CC7','\u2CC8':'\u2CC9','\u2CCA':'\u2CCB','\u2CCC':'\u2CCD','\u2CCE':'\u2CCF','\u2CD0':'\u2CD1','\u2CD2':'\u2CD3','\u2CD4':'\u2CD5','\u2CD6':'\u2CD7','\u2CD8':'\u2CD9','\u2CDA':'\u2CDB','\u2CDC':'\u2CDD','\u2CDE':'\u2CDF','\u2CE0':'\u2CE1','\u2CE2':'\u2CE3','\u2CEB':'\u2CEC','\u2CED':'\u2CEE','\u2CF2':'\u2CF3','\uA640':'\uA641','\uA642':'\uA643','\uA644':'\uA645','\uA646':'\uA647','\uA648':'\uA649','\uA64A':'\uA64B','\uA64C':'\uA64D','\uA64E':'\uA64F','\uA650':'\uA651','\uA652':'\uA653','\uA654':'\uA655','\uA656':'\uA657','\uA658':'\uA659','\uA65A':'\uA65B','\uA65C':'\uA65D','\uA65E':'\uA65F','\uA660':'\uA661','\uA662':'\uA663','\uA664':'\uA665','\uA666':'\uA667','\uA668':'\uA669','\uA66A':'\uA66B','\uA66C':'\uA66D','\uA680':'\uA681','\uA682':'\uA683','\uA684':'\uA685','\uA686':'\uA687','\uA688':'\uA689','\uA68A':'\uA68B','\uA68C':'\uA68D','\uA68E':'\uA68F','\uA690':'\uA691','\uA692':'\uA693','\uA694':'\uA695','\uA696':'\uA697','\uA698':'\uA699','\uA69A':'\uA69B','\uA722':'\uA723','\uA724':'\uA725','\uA726':'\uA727','\uA728':'\uA729','\uA72A':'\uA72B','\uA72C':'\uA72D','\uA72E':'\uA72F','\uA732':'\uA733','\uA734':'\uA735','\uA736':'\uA737','\uA738':'\uA739','\uA73A':'\uA73B','\uA73C':'\uA73D','\uA73E':'\uA73F','\uA740':'\uA741','\uA742':'\uA743','\uA744':'\uA745','\uA746':'\uA747','\uA748':'\uA749','\uA74A':'\uA74B','\uA74C':'\uA74D','\uA74E':'\uA74F','\uA750':'\uA751','\uA752':'\uA753','\uA754':'\uA755','\uA756':'\uA757','\uA758':'\uA759','\uA75A':'\uA75B','\uA75C':'\uA75D','\uA75E':'\uA75F','\uA760':'\uA761','\uA762':'\uA763','\uA764':'\uA765','\uA766':'\uA767','\uA768':'\uA769','\uA76A':'\uA76B','\uA76C':'\uA76D','\uA76E':'\uA76F','\uA779':'\uA77A','\uA77B':'\uA77C','\uA77D':'\u1D79','\uA77E':'\uA77F','\uA780':'\uA781','\uA782':'\uA783','\uA784':'\uA785','\uA786':'\uA787','\uA78B':'\uA78C','\uA78D':'\u0265','\uA790':'\uA791','\uA792':'\uA793','\uA796':'\uA797','\uA798':'\uA799','\uA79A':'\uA79B','\uA79C':'\uA79D','\uA79E':'\uA79F','\uA7A0':'\uA7A1','\uA7A2':'\uA7A3','\uA7A4':'\uA7A5','\uA7A6':'\uA7A7','\uA7A8':'\uA7A9','\uA7AA':'\u0266','\uA7AB':'\u025C','\uA7AC':'\u0261','\uA7AD':'\u026C','\uA7B0':'\u029E','\uA7B1':'\u0287','\uFF21':'\uFF41','\uFF22':'\uFF42','\uFF23':'\uFF43','\uFF24':'\uFF44','\uFF25':'\uFF45','\uFF26':'\uFF46','\uFF27':'\uFF47','\uFF28':'\uFF48','\uFF29':'\uFF49','\uFF2A':'\uFF4A','\uFF2B':'\uFF4B','\uFF2C':'\uFF4C','\uFF2D':'\uFF4D','\uFF2E':'\uFF4E','\uFF2F':'\uFF4F','\uFF30':'\uFF50','\uFF31':'\uFF51','\uFF32':'\uFF52','\uFF33':'\uFF53','\uFF34':'\uFF54','\uFF35':'\uFF55','\uFF36':'\uFF56','\uFF37':'\uFF57','\uFF38':'\uFF58','\uFF39':'\uFF59','\uFF3A':'\uFF5A','\uD801\uDC00':'\uD801\uDC28','\uD801\uDC01':'\uD801\uDC29','\uD801\uDC02':'\uD801\uDC2A','\uD801\uDC03':'\uD801\uDC2B','\uD801\uDC04':'\uD801\uDC2C','\uD801\uDC05':'\uD801\uDC2D','\uD801\uDC06':'\uD801\uDC2E','\uD801\uDC07':'\uD801\uDC2F','\uD801\uDC08':'\uD801\uDC30','\uD801\uDC09':'\uD801\uDC31','\uD801\uDC0A':'\uD801\uDC32','\uD801\uDC0B':'\uD801\uDC33','\uD801\uDC0C':'\uD801\uDC34','\uD801\uDC0D':'\uD801\uDC35','\uD801\uDC0E':'\uD801\uDC36','\uD801\uDC0F':'\uD801\uDC37','\uD801\uDC10':'\uD801\uDC38','\uD801\uDC11':'\uD801\uDC39','\uD801\uDC12':'\uD801\uDC3A','\uD801\uDC13':'\uD801\uDC3B','\uD801\uDC14':'\uD801\uDC3C','\uD801\uDC15':'\uD801\uDC3D','\uD801\uDC16':'\uD801\uDC3E','\uD801\uDC17':'\uD801\uDC3F','\uD801\uDC18':'\uD801\uDC40','\uD801\uDC19':'\uD801\uDC41','\uD801\uDC1A':'\uD801\uDC42','\uD801\uDC1B':'\uD801\uDC43','\uD801\uDC1C':'\uD801\uDC44','\uD801\uDC1D':'\uD801\uDC45','\uD801\uDC1E':'\uD801\uDC46','\uD801\uDC1F':'\uD801\uDC47','\uD801\uDC20':'\uD801\uDC48','\uD801\uDC21':'\uD801\uDC49','\uD801\uDC22':'\uD801\uDC4A','\uD801\uDC23':'\uD801\uDC4B','\uD801\uDC24':'\uD801\uDC4C','\uD801\uDC25':'\uD801\uDC4D','\uD801\uDC26':'\uD801\uDC4E','\uD801\uDC27':'\uD801\uDC4F','\uD806\uDCA0':'\uD806\uDCC0','\uD806\uDCA1':'\uD806\uDCC1','\uD806\uDCA2':'\uD806\uDCC2','\uD806\uDCA3':'\uD806\uDCC3','\uD806\uDCA4':'\uD806\uDCC4','\uD806\uDCA5':'\uD806\uDCC5','\uD806\uDCA6':'\uD806\uDCC6','\uD806\uDCA7':'\uD806\uDCC7','\uD806\uDCA8':'\uD806\uDCC8','\uD806\uDCA9':'\uD806\uDCC9','\uD806\uDCAA':'\uD806\uDCCA','\uD806\uDCAB':'\uD806\uDCCB','\uD806\uDCAC':'\uD806\uDCCC','\uD806\uDCAD':'\uD806\uDCCD','\uD806\uDCAE':'\uD806\uDCCE','\uD806\uDCAF':'\uD806\uDCCF','\uD806\uDCB0':'\uD806\uDCD0','\uD806\uDCB1':'\uD806\uDCD1','\uD806\uDCB2':'\uD806\uDCD2','\uD806\uDCB3':'\uD806\uDCD3','\uD806\uDCB4':'\uD806\uDCD4','\uD806\uDCB5':'\uD806\uDCD5','\uD806\uDCB6':'\uD806\uDCD6','\uD806\uDCB7':'\uD806\uDCD7','\uD806\uDCB8':'\uD806\uDCD8','\uD806\uDCB9':'\uD806\uDCD9','\uD806\uDCBA':'\uD806\uDCDA','\uD806\uDCBB':'\uD806\uDCDB','\uD806\uDCBC':'\uD806\uDCDC','\uD806\uDCBD':'\uD806\uDCDD','\uD806\uDCBE':'\uD806\uDCDE','\uD806\uDCBF':'\uD806\uDCDF','\xDF':'ss','\u0130':'i\u0307','\u0149':'\u02BCn','\u01F0':'j\u030C','\u0390':'\u03B9\u0308\u0301','\u03B0':'\u03C5\u0308\u0301','\u0587':'\u0565\u0582','\u1E96':'h\u0331','\u1E97':'t\u0308','\u1E98':'w\u030A','\u1E99':'y\u030A','\u1E9A':'a\u02BE','\u1E9E':'ss','\u1F50':'\u03C5\u0313','\u1F52':'\u03C5\u0313\u0300','\u1F54':'\u03C5\u0313\u0301','\u1F56':'\u03C5\u0313\u0342','\u1F80':'\u1F00\u03B9','\u1F81':'\u1F01\u03B9','\u1F82':'\u1F02\u03B9','\u1F83':'\u1F03\u03B9','\u1F84':'\u1F04\u03B9','\u1F85':'\u1F05\u03B9','\u1F86':'\u1F06\u03B9','\u1F87':'\u1F07\u03B9','\u1F88':'\u1F00\u03B9','\u1F89':'\u1F01\u03B9','\u1F8A':'\u1F02\u03B9','\u1F8B':'\u1F03\u03B9','\u1F8C':'\u1F04\u03B9','\u1F8D':'\u1F05\u03B9','\u1F8E':'\u1F06\u03B9','\u1F8F':'\u1F07\u03B9','\u1F90':'\u1F20\u03B9','\u1F91':'\u1F21\u03B9','\u1F92':'\u1F22\u03B9','\u1F93':'\u1F23\u03B9','\u1F94':'\u1F24\u03B9','\u1F95':'\u1F25\u03B9','\u1F96':'\u1F26\u03B9','\u1F97':'\u1F27\u03B9','\u1F98':'\u1F20\u03B9','\u1F99':'\u1F21\u03B9','\u1F9A':'\u1F22\u03B9','\u1F9B':'\u1F23\u03B9','\u1F9C':'\u1F24\u03B9','\u1F9D':'\u1F25\u03B9','\u1F9E':'\u1F26\u03B9','\u1F9F':'\u1F27\u03B9','\u1FA0':'\u1F60\u03B9','\u1FA1':'\u1F61\u03B9','\u1FA2':'\u1F62\u03B9','\u1FA3':'\u1F63\u03B9','\u1FA4':'\u1F64\u03B9','\u1FA5':'\u1F65\u03B9','\u1FA6':'\u1F66\u03B9','\u1FA7':'\u1F67\u03B9','\u1FA8':'\u1F60\u03B9','\u1FA9':'\u1F61\u03B9','\u1FAA':'\u1F62\u03B9','\u1FAB':'\u1F63\u03B9','\u1FAC':'\u1F64\u03B9','\u1FAD':'\u1F65\u03B9','\u1FAE':'\u1F66\u03B9','\u1FAF':'\u1F67\u03B9','\u1FB2':'\u1F70\u03B9','\u1FB3':'\u03B1\u03B9','\u1FB4':'\u03AC\u03B9','\u1FB6':'\u03B1\u0342','\u1FB7':'\u03B1\u0342\u03B9','\u1FBC':'\u03B1\u03B9','\u1FC2':'\u1F74\u03B9','\u1FC3':'\u03B7\u03B9','\u1FC4':'\u03AE\u03B9','\u1FC6':'\u03B7\u0342','\u1FC7':'\u03B7\u0342\u03B9','\u1FCC':'\u03B7\u03B9','\u1FD2':'\u03B9\u0308\u0300','\u1FD3':'\u03B9\u0308\u0301','\u1FD6':'\u03B9\u0342','\u1FD7':'\u03B9\u0308\u0342','\u1FE2':'\u03C5\u0308\u0300','\u1FE3':'\u03C5\u0308\u0301','\u1FE4':'\u03C1\u0313','\u1FE6':'\u03C5\u0342','\u1FE7':'\u03C5\u0308\u0342','\u1FF2':'\u1F7C\u03B9','\u1FF3':'\u03C9\u03B9','\u1FF4':'\u03CE\u03B9','\u1FF6':'\u03C9\u0342','\u1FF7':'\u03C9\u0342\u03B9','\u1FFC':'\u03C9\u03B9','\uFB00':'ff','\uFB01':'fi','\uFB02':'fl','\uFB03':'ffi','\uFB04':'ffl','\uFB05':'st','\uFB06':'st','\uFB13':'\u0574\u0576','\uFB14':'\u0574\u0565','\uFB15':'\u0574\u056B','\uFB16':'\u057E\u0576','\uFB17':'\u0574\u056D'};

// Normalize reference label: collapse internal whitespace
// to single space, remove leading/trailing whitespace, case fold.
module.exports = function(string) {
    return string.slice(1, string.length - 1).trim().replace(regex, function($0) {
        // Note: there is no need to check `hasOwnProperty($0)` here.
        // If character not found in lookup table, it must be whitespace.
        return map[$0] || ' ';
    });
};

},{}],50:[function(require,module,exports){
"use strict";

var Renderer = require('./renderer');

var reUnsafeProtocol = /^javascript:|vbscript:|file:|data:/i;
var reSafeDataProtocol = /^data:image\/(?:png|gif|jpeg|webp)/i;

var potentiallyUnsafe = function(url) {
  return reUnsafeProtocol.test(url) &&
      !reSafeDataProtocol.test(url);
};

// Helper function to produce an HTML tag.
function tag(name, attrs, selfclosing) {
  if (this.disableTags > 0) {
    return;
  }
  this.buffer += ('<' + name);
  if (attrs && attrs.length > 0) {
    var i = 0;
    var attrib;
    while ((attrib = attrs[i]) !== undefined) {
      this.buffer += (' ' + attrib[0] + '="' + attrib[1] + '"');
      i++;
    }
  }
  if (selfclosing) {
    this.buffer += ' /';
  }
  this.buffer += '>';
  this.lastOut = '>';
}

function HtmlRenderer(options) {
  options = options || {};
  // by default, soft breaks are rendered as newlines in HTML
  options.softbreak = options.softbreak || '\n';
  // set to "<br />" to make them hard breaks
  // set to " " if you want to ignore line wrapping in source

  this.disableTags = 0;
  this.lastOut = "\n";
  this.options = options;
}

/* Node methods */

function text(node) {
  this.out(node.literal);
}

function softbreak() {
  this.lit(this.options.softbreak);
}

function linebreak() {
  this.tag('br', [], true);
  this.cr();
}

function link(node, entering) {
  var attrs = this.attrs(node);
  if (entering) {
    if (!(this.options.safe && potentiallyUnsafe(node.destination))) {
      attrs.push(['href', this.esc(node.destination, true)]);
    }
    if (node.title) {
      attrs.push(['title', this.esc(node.title, true)]);
    }
    this.tag('a', attrs);
  } else {
    this.tag('/a');
  }
}

function image(node, entering) {
  if (entering) {
    if (this.disableTags === 0) {
      if (this.options.safe && potentiallyUnsafe(node.destination)) {
        this.lit('<img src="" alt="');
      } else {
        this.lit('<img src="' + this.esc(node.destination, true) +
            '" alt="');
      }
    }
    this.disableTags += 1;
  } else {
    this.disableTags -= 1;
    if (this.disableTags === 0) {
      if (node.title) {
        this.lit('" title="' + this.esc(node.title, true));
      }
      this.lit('" />');
    }
  }
}

function emph(node, entering) {
  this.tag(entering ? 'em' : '/em');
}

function strong(node, entering) {
  this.tag(entering ? 'strong' : '/strong');
}

function paragraph(node, entering) {
  var grandparent = node.parent.parent
    , attrs = this.attrs(node);
  if (grandparent !== null &&
    grandparent.type === 'list') {
    if (grandparent.listTight) {
      return;
    }
  }
  if (entering) {
    this.cr();
    this.tag('p', attrs);
  } else {
    this.tag('/p');
    this.cr();
  }
}

function heading(node, entering) {
  var tagname = 'h' + node.level
    , attrs = this.attrs(node);
  if (entering) {
    this.cr();
    this.tag(tagname, attrs);
  } else {
    this.tag('/' + tagname);
    this.cr();
  }
}

function code(node) {
  this.tag('code');
  this.out(node.literal);
  this.tag('/code');
}

function code_block(node) {
  var info_words = node.info ? node.info.split(/\s+/) : []
    , attrs = this.attrs(node);
  if (info_words.length > 0 && info_words[0].length > 0) {
    attrs.push(['class', 'language-' + this.esc(info_words[0], true)]);
  }
  this.cr();
  this.tag('pre');
  this.tag('code', attrs);
  this.out(node.literal);
  this.tag('/code');
  this.tag('/pre');
  this.cr();
}

function thematic_break(node) {
  var attrs = this.attrs(node);
  this.cr();
  this.tag('hr', attrs, true);
  this.cr();
}

function block_quote(node, entering) {
  var attrs = this.attrs(node);
  if (entering) {
    this.cr();
    this.tag('blockquote', attrs);
    this.cr();
  } else {
    this.cr();
    this.tag('/blockquote');
    this.cr();
  }
}

function list(node, entering) {
  var tagname = node.listType === 'bullet' ? 'ul' : 'ol'
    , attrs = this.attrs(node);

  if (entering) {
    var start = node.listStart;
    if (start !== null && start !== 1) {
      attrs.push(['start', start.toString()]);
    }
    this.cr();
    this.tag(tagname, attrs);
    this.cr();
  } else {
    this.cr();
    this.tag('/' + tagname);
    this.cr();
  }
}

function item(node, entering) {
  var attrs = this.attrs(node);
  if (entering) {
    this.tag('li', attrs);
  } else {
    this.tag('/li');
    this.cr();
  }
}

function html_inline(node) {
  if (this.options.safe) {
    this.lit('<!-- raw HTML omitted -->');
  } else {
    this.lit(node.literal);
  }
}

function html_block(node) {
  this.cr();
  if (this.options.safe) {
    this.lit('<!-- raw HTML omitted -->');
  } else {
    this.lit(node.literal);
  }
  this.cr();
}

function custom_inline(node, entering) {
  if (entering && node.onEnter) {
    this.lit(node.onEnter);
  } else if (!entering && node.onExit) {
    this.lit(node.onExit);
  }
}

function custom_block(node, entering) {
  this.cr();
  if (entering && node.onEnter) {
    this.lit(node.onEnter);
  } else if (!entering && node.onExit) {
    this.lit(node.onExit);
  }
  this.cr();
}

/* Helper methods */

function out(s) {
  this.lit(this.esc(s, false));
}

function attrs (node) {
  var att = [];
  if (this.options.sourcepos) {
    var pos = node.sourcepos;
    if (pos) {
      att.push(['data-sourcepos', String(pos[0][0]) + ':' +
        String(pos[0][1]) + '-' + String(pos[1][0]) + ':' +
        String(pos[1][1])]);
    }
  }
  return att;
}

// quick browser-compatible inheritance
HtmlRenderer.prototype = Object.create(Renderer.prototype);

HtmlRenderer.prototype.text = text;
HtmlRenderer.prototype.html_inline = html_inline;
HtmlRenderer.prototype.html_block = html_block;
HtmlRenderer.prototype.softbreak = softbreak;
HtmlRenderer.prototype.linebreak = linebreak;
HtmlRenderer.prototype.link = link;
HtmlRenderer.prototype.image = image;
HtmlRenderer.prototype.emph = emph;
HtmlRenderer.prototype.strong = strong;
HtmlRenderer.prototype.paragraph = paragraph;
HtmlRenderer.prototype.heading = heading;
HtmlRenderer.prototype.code = code;
HtmlRenderer.prototype.code_block = code_block;
HtmlRenderer.prototype.thematic_break = thematic_break;
HtmlRenderer.prototype.block_quote = block_quote;
HtmlRenderer.prototype.list = list;
HtmlRenderer.prototype.item = item;
HtmlRenderer.prototype.custom_inline = custom_inline;
HtmlRenderer.prototype.custom_block = custom_block;

HtmlRenderer.prototype.esc = require('../common').escapeXml;

HtmlRenderer.prototype.out = out;
HtmlRenderer.prototype.tag = tag;
HtmlRenderer.prototype.attrs = attrs;

module.exports = HtmlRenderer;

},{"../common":44,"./renderer":51}],51:[function(require,module,exports){
"use strict";

function Renderer() {}

/**
 *  Walks the AST and calls member methods for each Node type.
 *
 *  @param ast {Node} The root of the abstract syntax tree.
 */
function render(ast) {
  var walker = ast.walker()
    , event
    , type;

  this.buffer = '';
  this.lastOut = '\n';

  while((event = walker.next())) {
    type = event.node.type;
    if (this[type]) {
      this[type](event.node, event.entering);
    }
  }
  return this.buffer;
}

/**
 *  Concatenate a literal string to the buffer.
 *
 *  @param str {String} The string to concatenate.
 */
function lit(str) {
  this.buffer += str;
  this.lastOut = str;
}

/**
 *  Output a newline to the buffer.
 */
function cr() {
  if (this.lastOut !== '\n') {
    this.lit('\n');
  }
}

/**
 *  Concatenate a string to the buffer possibly escaping the content.
 *
 *  Concrete renderer implementations should override this method.
 *
 *  @param str {String} The string to concatenate.
 */
function out(str) {
  this.lit(str);
}

/**
 *  Escape a string for the target renderer.
 *
 *  Abstract function that should be implemented by concrete 
 *  renderer implementations.
 *
 *  @param str {String} The string to escape.
 */
function esc(str) {
  return str;
}

Renderer.prototype.render = render;
Renderer.prototype.out = out;
Renderer.prototype.lit = lit;
Renderer.prototype.cr  = cr;
Renderer.prototype.esc  = esc;

module.exports = Renderer;

},{}],52:[function(require,module,exports){
"use strict";

var Renderer = require('./renderer');

var reXMLTag = /\<[^>]*\>/;

function toTagName(s) {
  return s.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function XmlRenderer(options) {
  options = options || {};

  this.disableTags = 0;
  this.lastOut = "\n";

  this.indentLevel = 0;
  this.indent = '  ';

  this.options = options;
}

function render(ast) {

  this.buffer = '';

  var attrs;
  var tagname;
  var walker = ast.walker();
  var event, node, entering;
  var container;
  var selfClosing;
  var nodetype;

  var options = this.options;

  if (options.time) { console.time("rendering"); }

  this.buffer += '<?xml version="1.0" encoding="UTF-8"?>\n';
  this.buffer += '<!DOCTYPE document SYSTEM "CommonMark.dtd">\n';

  while ((event = walker.next())) {
    entering = event.entering;
    node = event.node;
    nodetype = node.type;

    container = node.isContainer;

    selfClosing = nodetype === 'thematic_break'
      || nodetype === 'linebreak'
      || nodetype === 'softbreak';

    tagname = toTagName(nodetype);

    if (entering) {

        attrs = [];

        switch (nodetype) {
          case 'document':
            attrs.push(['xmlns', 'http://commonmark.org/xml/1.0']);
            break;
          case 'list':
            if (node.listType !== null) {
              attrs.push(['type', node.listType.toLowerCase()]);
            }
            if (node.listStart !== null) {
              attrs.push(['start', String(node.listStart)]);
            }
            if (node.listTight !== null) {
              attrs.push(['tight', (node.listTight ? 'true' : 'false')]);
            }
            var delim = node.listDelimiter;
            if (delim !== null) {
              var delimword = '';
              if (delim === '.') {
                delimword = 'period';
              } else {
                delimword = 'paren';
              }
              attrs.push(['delimiter', delimword]);
            }
            break;
          case 'code_block':
            if (node.info) {
              attrs.push(['info', node.info]);
            }
            break;
          case 'heading':
            attrs.push(['level', String(node.level)]);
            break;
          case 'link':
          case 'image':
            attrs.push(['destination', node.destination]);
            attrs.push(['title', node.title]);
            break;
          case 'custom_inline':
          case 'custom_block':
            attrs.push(['on_enter', node.onEnter]);
            attrs.push(['on_exit', node.onExit]);
            break;
          default:
            break;
        }
        if (options.sourcepos) {
          var pos = node.sourcepos;
          if (pos) {
            attrs.push(['sourcepos', String(pos[0][0]) + ':' +
              String(pos[0][1]) + '-' + String(pos[1][0]) + ':' +
              String(pos[1][1])]);
          }
        }

        this.cr();
        this.out(this.tag(tagname, attrs, selfClosing));
        if (container) {
          this.indentLevel += 1;
        } else if (!container && !selfClosing) {
          var lit = node.literal;
          if (lit) {
            this.out(this.esc(lit));
          }
          this.out(this.tag('/' + tagname));
        }
    } else {
      this.indentLevel -= 1;
      this.cr();
      this.out(this.tag('/' + tagname));
    }
  }
  if (options.time) { console.timeEnd("rendering"); }
  this.buffer += '\n';
  return this.buffer;
}

function out(s) {
  if(this.disableTags > 0) {
    this.buffer += s.replace(reXMLTag, '');
  }else{
    this.buffer += s;
  }
  this.lastOut = s;
}

function cr() {
  if(this.lastOut !== '\n') {
    this.buffer += '\n';
    this.lastOut = '\n';
    for(var i = this.indentLevel; i > 0; i--) {
      this.buffer += this.indent;
    }
  }
}

// Helper function to produce an XML tag.
function tag(name, attrs, selfclosing) {
  var result = '<' + name;
  if(attrs && attrs.length > 0) {
    var i = 0;
    var attrib;
    while ((attrib = attrs[i]) !== undefined) {
      result += ' ' + attrib[0] + '="' + this.esc(attrib[1]) + '"';
      i++;
    }
  }
  if(selfclosing) {
    result += ' /';
  }
  result += '>';
  return result;
}

// quick browser-compatible inheritance
XmlRenderer.prototype = Object.create(Renderer.prototype);

XmlRenderer.prototype.render = render;
XmlRenderer.prototype.out = out;
XmlRenderer.prototype.cr = cr;
XmlRenderer.prototype.tag = tag;
XmlRenderer.prototype.esc = require('../common').escapeXml;

module.exports = XmlRenderer;

},{"../common":44,"./renderer":51}],53:[function(require,module,exports){
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

},{"assert":87}],54:[function(require,module,exports){
var encode = require("./lib/encode.js"),
    decode = require("./lib/decode.js");

exports.decode = function(data, level){
	return (!level || level <= 0 ? decode.XML : decode.HTML)(data);
};

exports.decodeStrict = function(data, level){
	return (!level || level <= 0 ? decode.XML : decode.HTMLStrict)(data);
};

exports.encode = function(data, level){
	return (!level || level <= 0 ? encode.XML : encode.HTML)(data);
};

exports.encodeXML = encode.XML;

exports.encodeHTML4 =
exports.encodeHTML5 =
exports.encodeHTML  = encode.HTML;

exports.decodeXML =
exports.decodeXMLStrict = decode.XML;

exports.decodeHTML4 =
exports.decodeHTML5 =
exports.decodeHTML = decode.HTML;

exports.decodeHTML4Strict =
exports.decodeHTML5Strict =
exports.decodeHTMLStrict = decode.HTMLStrict;

exports.escape = encode.escape;

},{"./lib/decode.js":55,"./lib/encode.js":57}],55:[function(require,module,exports){
var entityMap = require("../maps/entities.json"),
    legacyMap = require("../maps/legacy.json"),
    xmlMap    = require("../maps/xml.json"),
    decodeCodePoint = require("./decode_codepoint.js");

var decodeXMLStrict  = getStrictDecoder(xmlMap),
    decodeHTMLStrict = getStrictDecoder(entityMap);

function getStrictDecoder(map){
	var keys = Object.keys(map).join("|"),
	    replace = getReplacer(map);

	keys += "|#[xX][\\da-fA-F]+|#\\d+";

	var re = new RegExp("&(?:" + keys + ");", "g");

	return function(str){
		return String(str).replace(re, replace);
	};
}

var decodeHTML = (function(){
	var legacy = Object.keys(legacyMap)
		.sort(sorter);

	var keys = Object.keys(entityMap)
		.sort(sorter);

	for(var i = 0, j = 0; i < keys.length; i++){
		if(legacy[j] === keys[i]){
			keys[i] += ";?";
			j++;
		} else {
			keys[i] += ";";
		}
	}

	var re = new RegExp("&(?:" + keys.join("|") + "|#[xX][\\da-fA-F]+;?|#\\d+;?)", "g"),
	    replace = getReplacer(entityMap);

	function replacer(str){
		if(str.substr(-1) !== ";") str += ";";
		return replace(str);
	}

	//TODO consider creating a merged map
	return function(str){
		return String(str).replace(re, replacer);
	};
}());

function sorter(a, b){
	return a < b ? 1 : -1;
}

function getReplacer(map){
	return function replace(str){
		if(str.charAt(1) === "#"){
			if(str.charAt(2) === "X" || str.charAt(2) === "x"){
				return decodeCodePoint(parseInt(str.substr(3), 16));
			}
			return decodeCodePoint(parseInt(str.substr(2), 10));
		}
		return map[str.slice(1, -1)];
	};
}

module.exports = {
	XML: decodeXMLStrict,
	HTML: decodeHTML,
	HTMLStrict: decodeHTMLStrict
};
},{"../maps/entities.json":59,"../maps/legacy.json":60,"../maps/xml.json":61,"./decode_codepoint.js":56}],56:[function(require,module,exports){
var decodeMap = require("../maps/decode.json");

module.exports = decodeCodePoint;

// modified version of https://github.com/mathiasbynens/he/blob/master/src/he.js#L94-L119
function decodeCodePoint(codePoint){

	if((codePoint >= 0xD800 && codePoint <= 0xDFFF) || codePoint > 0x10FFFF){
		return "\uFFFD";
	}

	if(codePoint in decodeMap){
		codePoint = decodeMap[codePoint];
	}

	var output = "";

	if(codePoint > 0xFFFF){
		codePoint -= 0x10000;
		output += String.fromCharCode(codePoint >>> 10 & 0x3FF | 0xD800);
		codePoint = 0xDC00 | codePoint & 0x3FF;
	}

	output += String.fromCharCode(codePoint);
	return output;
}

},{"../maps/decode.json":58}],57:[function(require,module,exports){
var inverseXML = getInverseObj(require("../maps/xml.json")),
    xmlReplacer = getInverseReplacer(inverseXML);

exports.XML = getInverse(inverseXML, xmlReplacer);

var inverseHTML = getInverseObj(require("../maps/entities.json")),
    htmlReplacer = getInverseReplacer(inverseHTML);

exports.HTML = getInverse(inverseHTML, htmlReplacer);

function getInverseObj(obj){
	return Object.keys(obj).sort().reduce(function(inverse, name){
		inverse[obj[name]] = "&" + name + ";";
		return inverse;
	}, {});
}

function getInverseReplacer(inverse){
	var single = [],
	    multiple = [];

	Object.keys(inverse).forEach(function(k){
		if(k.length === 1){
			single.push("\\" + k);
		} else {
			multiple.push(k);
		}
	});

	//TODO add ranges
	multiple.unshift("[" + single.join("") + "]");

	return new RegExp(multiple.join("|"), "g");
}

var re_nonASCII = /[^\0-\x7F]/g,
    re_astralSymbols = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

function singleCharReplacer(c){
	return "&#x" + c.charCodeAt(0).toString(16).toUpperCase() + ";";
}

function astralReplacer(c){
	// http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
	var high = c.charCodeAt(0);
	var low  = c.charCodeAt(1);
	var codePoint = (high - 0xD800) * 0x400 + low - 0xDC00 + 0x10000;
	return "&#x" + codePoint.toString(16).toUpperCase() + ";";
}

function getInverse(inverse, re){
	function func(name){
		return inverse[name];
	}

	return function(data){
		return data
				.replace(re, func)
				.replace(re_astralSymbols, astralReplacer)
				.replace(re_nonASCII, singleCharReplacer);
	};
}

var re_xmlChars = getInverseReplacer(inverseXML);

function escapeXML(data){
	return data
			.replace(re_xmlChars, singleCharReplacer)
			.replace(re_astralSymbols, astralReplacer)
			.replace(re_nonASCII, singleCharReplacer);
}

exports.escape = escapeXML;

},{"../maps/entities.json":59,"../maps/xml.json":61}],58:[function(require,module,exports){
module.exports={"0":65533,"128":8364,"130":8218,"131":402,"132":8222,"133":8230,"134":8224,"135":8225,"136":710,"137":8240,"138":352,"139":8249,"140":338,"142":381,"145":8216,"146":8217,"147":8220,"148":8221,"149":8226,"150":8211,"151":8212,"152":732,"153":8482,"154":353,"155":8250,"156":339,"158":382,"159":376}
},{}],59:[function(require,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Abreve":"\u0102","abreve":"\u0103","ac":"\u223E","acd":"\u223F","acE":"\u223E\u0333","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","Acy":"\u0410","acy":"\u0430","AElig":"\u00C6","aelig":"\u00E6","af":"\u2061","Afr":"\uD835\uDD04","afr":"\uD835\uDD1E","Agrave":"\u00C0","agrave":"\u00E0","alefsym":"\u2135","aleph":"\u2135","Alpha":"\u0391","alpha":"\u03B1","Amacr":"\u0100","amacr":"\u0101","amalg":"\u2A3F","amp":"&","AMP":"&","andand":"\u2A55","And":"\u2A53","and":"\u2227","andd":"\u2A5C","andslope":"\u2A58","andv":"\u2A5A","ang":"\u2220","ange":"\u29A4","angle":"\u2220","angmsdaa":"\u29A8","angmsdab":"\u29A9","angmsdac":"\u29AA","angmsdad":"\u29AB","angmsdae":"\u29AC","angmsdaf":"\u29AD","angmsdag":"\u29AE","angmsdah":"\u29AF","angmsd":"\u2221","angrt":"\u221F","angrtvb":"\u22BE","angrtvbd":"\u299D","angsph":"\u2222","angst":"\u00C5","angzarr":"\u237C","Aogon":"\u0104","aogon":"\u0105","Aopf":"\uD835\uDD38","aopf":"\uD835\uDD52","apacir":"\u2A6F","ap":"\u2248","apE":"\u2A70","ape":"\u224A","apid":"\u224B","apos":"'","ApplyFunction":"\u2061","approx":"\u2248","approxeq":"\u224A","Aring":"\u00C5","aring":"\u00E5","Ascr":"\uD835\uDC9C","ascr":"\uD835\uDCB6","Assign":"\u2254","ast":"*","asymp":"\u2248","asympeq":"\u224D","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","awconint":"\u2233","awint":"\u2A11","backcong":"\u224C","backepsilon":"\u03F6","backprime":"\u2035","backsim":"\u223D","backsimeq":"\u22CD","Backslash":"\u2216","Barv":"\u2AE7","barvee":"\u22BD","barwed":"\u2305","Barwed":"\u2306","barwedge":"\u2305","bbrk":"\u23B5","bbrktbrk":"\u23B6","bcong":"\u224C","Bcy":"\u0411","bcy":"\u0431","bdquo":"\u201E","becaus":"\u2235","because":"\u2235","Because":"\u2235","bemptyv":"\u29B0","bepsi":"\u03F6","bernou":"\u212C","Bernoullis":"\u212C","Beta":"\u0392","beta":"\u03B2","beth":"\u2136","between":"\u226C","Bfr":"\uD835\uDD05","bfr":"\uD835\uDD1F","bigcap":"\u22C2","bigcirc":"\u25EF","bigcup":"\u22C3","bigodot":"\u2A00","bigoplus":"\u2A01","bigotimes":"\u2A02","bigsqcup":"\u2A06","bigstar":"\u2605","bigtriangledown":"\u25BD","bigtriangleup":"\u25B3","biguplus":"\u2A04","bigvee":"\u22C1","bigwedge":"\u22C0","bkarow":"\u290D","blacklozenge":"\u29EB","blacksquare":"\u25AA","blacktriangle":"\u25B4","blacktriangledown":"\u25BE","blacktriangleleft":"\u25C2","blacktriangleright":"\u25B8","blank":"\u2423","blk12":"\u2592","blk14":"\u2591","blk34":"\u2593","block":"\u2588","bne":"=\u20E5","bnequiv":"\u2261\u20E5","bNot":"\u2AED","bnot":"\u2310","Bopf":"\uD835\uDD39","bopf":"\uD835\uDD53","bot":"\u22A5","bottom":"\u22A5","bowtie":"\u22C8","boxbox":"\u29C9","boxdl":"\u2510","boxdL":"\u2555","boxDl":"\u2556","boxDL":"\u2557","boxdr":"\u250C","boxdR":"\u2552","boxDr":"\u2553","boxDR":"\u2554","boxh":"\u2500","boxH":"\u2550","boxhd":"\u252C","boxHd":"\u2564","boxhD":"\u2565","boxHD":"\u2566","boxhu":"\u2534","boxHu":"\u2567","boxhU":"\u2568","boxHU":"\u2569","boxminus":"\u229F","boxplus":"\u229E","boxtimes":"\u22A0","boxul":"\u2518","boxuL":"\u255B","boxUl":"\u255C","boxUL":"\u255D","boxur":"\u2514","boxuR":"\u2558","boxUr":"\u2559","boxUR":"\u255A","boxv":"\u2502","boxV":"\u2551","boxvh":"\u253C","boxvH":"\u256A","boxVh":"\u256B","boxVH":"\u256C","boxvl":"\u2524","boxvL":"\u2561","boxVl":"\u2562","boxVL":"\u2563","boxvr":"\u251C","boxvR":"\u255E","boxVr":"\u255F","boxVR":"\u2560","bprime":"\u2035","breve":"\u02D8","Breve":"\u02D8","brvbar":"\u00A6","bscr":"\uD835\uDCB7","Bscr":"\u212C","bsemi":"\u204F","bsim":"\u223D","bsime":"\u22CD","bsolb":"\u29C5","bsol":"\\","bsolhsub":"\u27C8","bull":"\u2022","bullet":"\u2022","bump":"\u224E","bumpE":"\u2AAE","bumpe":"\u224F","Bumpeq":"\u224E","bumpeq":"\u224F","Cacute":"\u0106","cacute":"\u0107","capand":"\u2A44","capbrcup":"\u2A49","capcap":"\u2A4B","cap":"\u2229","Cap":"\u22D2","capcup":"\u2A47","capdot":"\u2A40","CapitalDifferentialD":"\u2145","caps":"\u2229\uFE00","caret":"\u2041","caron":"\u02C7","Cayleys":"\u212D","ccaps":"\u2A4D","Ccaron":"\u010C","ccaron":"\u010D","Ccedil":"\u00C7","ccedil":"\u00E7","Ccirc":"\u0108","ccirc":"\u0109","Cconint":"\u2230","ccups":"\u2A4C","ccupssm":"\u2A50","Cdot":"\u010A","cdot":"\u010B","cedil":"\u00B8","Cedilla":"\u00B8","cemptyv":"\u29B2","cent":"\u00A2","centerdot":"\u00B7","CenterDot":"\u00B7","cfr":"\uD835\uDD20","Cfr":"\u212D","CHcy":"\u0427","chcy":"\u0447","check":"\u2713","checkmark":"\u2713","Chi":"\u03A7","chi":"\u03C7","circ":"\u02C6","circeq":"\u2257","circlearrowleft":"\u21BA","circlearrowright":"\u21BB","circledast":"\u229B","circledcirc":"\u229A","circleddash":"\u229D","CircleDot":"\u2299","circledR":"\u00AE","circledS":"\u24C8","CircleMinus":"\u2296","CirclePlus":"\u2295","CircleTimes":"\u2297","cir":"\u25CB","cirE":"\u29C3","cire":"\u2257","cirfnint":"\u2A10","cirmid":"\u2AEF","cirscir":"\u29C2","ClockwiseContourIntegral":"\u2232","CloseCurlyDoubleQuote":"\u201D","CloseCurlyQuote":"\u2019","clubs":"\u2663","clubsuit":"\u2663","colon":":","Colon":"\u2237","Colone":"\u2A74","colone":"\u2254","coloneq":"\u2254","comma":",","commat":"@","comp":"\u2201","compfn":"\u2218","complement":"\u2201","complexes":"\u2102","cong":"\u2245","congdot":"\u2A6D","Congruent":"\u2261","conint":"\u222E","Conint":"\u222F","ContourIntegral":"\u222E","copf":"\uD835\uDD54","Copf":"\u2102","coprod":"\u2210","Coproduct":"\u2210","copy":"\u00A9","COPY":"\u00A9","copysr":"\u2117","CounterClockwiseContourIntegral":"\u2233","crarr":"\u21B5","cross":"\u2717","Cross":"\u2A2F","Cscr":"\uD835\uDC9E","cscr":"\uD835\uDCB8","csub":"\u2ACF","csube":"\u2AD1","csup":"\u2AD0","csupe":"\u2AD2","ctdot":"\u22EF","cudarrl":"\u2938","cudarrr":"\u2935","cuepr":"\u22DE","cuesc":"\u22DF","cularr":"\u21B6","cularrp":"\u293D","cupbrcap":"\u2A48","cupcap":"\u2A46","CupCap":"\u224D","cup":"\u222A","Cup":"\u22D3","cupcup":"\u2A4A","cupdot":"\u228D","cupor":"\u2A45","cups":"\u222A\uFE00","curarr":"\u21B7","curarrm":"\u293C","curlyeqprec":"\u22DE","curlyeqsucc":"\u22DF","curlyvee":"\u22CE","curlywedge":"\u22CF","curren":"\u00A4","curvearrowleft":"\u21B6","curvearrowright":"\u21B7","cuvee":"\u22CE","cuwed":"\u22CF","cwconint":"\u2232","cwint":"\u2231","cylcty":"\u232D","dagger":"\u2020","Dagger":"\u2021","daleth":"\u2138","darr":"\u2193","Darr":"\u21A1","dArr":"\u21D3","dash":"\u2010","Dashv":"\u2AE4","dashv":"\u22A3","dbkarow":"\u290F","dblac":"\u02DD","Dcaron":"\u010E","dcaron":"\u010F","Dcy":"\u0414","dcy":"\u0434","ddagger":"\u2021","ddarr":"\u21CA","DD":"\u2145","dd":"\u2146","DDotrahd":"\u2911","ddotseq":"\u2A77","deg":"\u00B0","Del":"\u2207","Delta":"\u0394","delta":"\u03B4","demptyv":"\u29B1","dfisht":"\u297F","Dfr":"\uD835\uDD07","dfr":"\uD835\uDD21","dHar":"\u2965","dharl":"\u21C3","dharr":"\u21C2","DiacriticalAcute":"\u00B4","DiacriticalDot":"\u02D9","DiacriticalDoubleAcute":"\u02DD","DiacriticalGrave":"`","DiacriticalTilde":"\u02DC","diam":"\u22C4","diamond":"\u22C4","Diamond":"\u22C4","diamondsuit":"\u2666","diams":"\u2666","die":"\u00A8","DifferentialD":"\u2146","digamma":"\u03DD","disin":"\u22F2","div":"\u00F7","divide":"\u00F7","divideontimes":"\u22C7","divonx":"\u22C7","DJcy":"\u0402","djcy":"\u0452","dlcorn":"\u231E","dlcrop":"\u230D","dollar":"$","Dopf":"\uD835\uDD3B","dopf":"\uD835\uDD55","Dot":"\u00A8","dot":"\u02D9","DotDot":"\u20DC","doteq":"\u2250","doteqdot":"\u2251","DotEqual":"\u2250","dotminus":"\u2238","dotplus":"\u2214","dotsquare":"\u22A1","doublebarwedge":"\u2306","DoubleContourIntegral":"\u222F","DoubleDot":"\u00A8","DoubleDownArrow":"\u21D3","DoubleLeftArrow":"\u21D0","DoubleLeftRightArrow":"\u21D4","DoubleLeftTee":"\u2AE4","DoubleLongLeftArrow":"\u27F8","DoubleLongLeftRightArrow":"\u27FA","DoubleLongRightArrow":"\u27F9","DoubleRightArrow":"\u21D2","DoubleRightTee":"\u22A8","DoubleUpArrow":"\u21D1","DoubleUpDownArrow":"\u21D5","DoubleVerticalBar":"\u2225","DownArrowBar":"\u2913","downarrow":"\u2193","DownArrow":"\u2193","Downarrow":"\u21D3","DownArrowUpArrow":"\u21F5","DownBreve":"\u0311","downdownarrows":"\u21CA","downharpoonleft":"\u21C3","downharpoonright":"\u21C2","DownLeftRightVector":"\u2950","DownLeftTeeVector":"\u295E","DownLeftVectorBar":"\u2956","DownLeftVector":"\u21BD","DownRightTeeVector":"\u295F","DownRightVectorBar":"\u2957","DownRightVector":"\u21C1","DownTeeArrow":"\u21A7","DownTee":"\u22A4","drbkarow":"\u2910","drcorn":"\u231F","drcrop":"\u230C","Dscr":"\uD835\uDC9F","dscr":"\uD835\uDCB9","DScy":"\u0405","dscy":"\u0455","dsol":"\u29F6","Dstrok":"\u0110","dstrok":"\u0111","dtdot":"\u22F1","dtri":"\u25BF","dtrif":"\u25BE","duarr":"\u21F5","duhar":"\u296F","dwangle":"\u29A6","DZcy":"\u040F","dzcy":"\u045F","dzigrarr":"\u27FF","Eacute":"\u00C9","eacute":"\u00E9","easter":"\u2A6E","Ecaron":"\u011A","ecaron":"\u011B","Ecirc":"\u00CA","ecirc":"\u00EA","ecir":"\u2256","ecolon":"\u2255","Ecy":"\u042D","ecy":"\u044D","eDDot":"\u2A77","Edot":"\u0116","edot":"\u0117","eDot":"\u2251","ee":"\u2147","efDot":"\u2252","Efr":"\uD835\uDD08","efr":"\uD835\uDD22","eg":"\u2A9A","Egrave":"\u00C8","egrave":"\u00E8","egs":"\u2A96","egsdot":"\u2A98","el":"\u2A99","Element":"\u2208","elinters":"\u23E7","ell":"\u2113","els":"\u2A95","elsdot":"\u2A97","Emacr":"\u0112","emacr":"\u0113","empty":"\u2205","emptyset":"\u2205","EmptySmallSquare":"\u25FB","emptyv":"\u2205","EmptyVerySmallSquare":"\u25AB","emsp13":"\u2004","emsp14":"\u2005","emsp":"\u2003","ENG":"\u014A","eng":"\u014B","ensp":"\u2002","Eogon":"\u0118","eogon":"\u0119","Eopf":"\uD835\uDD3C","eopf":"\uD835\uDD56","epar":"\u22D5","eparsl":"\u29E3","eplus":"\u2A71","epsi":"\u03B5","Epsilon":"\u0395","epsilon":"\u03B5","epsiv":"\u03F5","eqcirc":"\u2256","eqcolon":"\u2255","eqsim":"\u2242","eqslantgtr":"\u2A96","eqslantless":"\u2A95","Equal":"\u2A75","equals":"=","EqualTilde":"\u2242","equest":"\u225F","Equilibrium":"\u21CC","equiv":"\u2261","equivDD":"\u2A78","eqvparsl":"\u29E5","erarr":"\u2971","erDot":"\u2253","escr":"\u212F","Escr":"\u2130","esdot":"\u2250","Esim":"\u2A73","esim":"\u2242","Eta":"\u0397","eta":"\u03B7","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","euro":"\u20AC","excl":"!","exist":"\u2203","Exists":"\u2203","expectation":"\u2130","exponentiale":"\u2147","ExponentialE":"\u2147","fallingdotseq":"\u2252","Fcy":"\u0424","fcy":"\u0444","female":"\u2640","ffilig":"\uFB03","fflig":"\uFB00","ffllig":"\uFB04","Ffr":"\uD835\uDD09","ffr":"\uD835\uDD23","filig":"\uFB01","FilledSmallSquare":"\u25FC","FilledVerySmallSquare":"\u25AA","fjlig":"fj","flat":"\u266D","fllig":"\uFB02","fltns":"\u25B1","fnof":"\u0192","Fopf":"\uD835\uDD3D","fopf":"\uD835\uDD57","forall":"\u2200","ForAll":"\u2200","fork":"\u22D4","forkv":"\u2AD9","Fouriertrf":"\u2131","fpartint":"\u2A0D","frac12":"\u00BD","frac13":"\u2153","frac14":"\u00BC","frac15":"\u2155","frac16":"\u2159","frac18":"\u215B","frac23":"\u2154","frac25":"\u2156","frac34":"\u00BE","frac35":"\u2157","frac38":"\u215C","frac45":"\u2158","frac56":"\u215A","frac58":"\u215D","frac78":"\u215E","frasl":"\u2044","frown":"\u2322","fscr":"\uD835\uDCBB","Fscr":"\u2131","gacute":"\u01F5","Gamma":"\u0393","gamma":"\u03B3","Gammad":"\u03DC","gammad":"\u03DD","gap":"\u2A86","Gbreve":"\u011E","gbreve":"\u011F","Gcedil":"\u0122","Gcirc":"\u011C","gcirc":"\u011D","Gcy":"\u0413","gcy":"\u0433","Gdot":"\u0120","gdot":"\u0121","ge":"\u2265","gE":"\u2267","gEl":"\u2A8C","gel":"\u22DB","geq":"\u2265","geqq":"\u2267","geqslant":"\u2A7E","gescc":"\u2AA9","ges":"\u2A7E","gesdot":"\u2A80","gesdoto":"\u2A82","gesdotol":"\u2A84","gesl":"\u22DB\uFE00","gesles":"\u2A94","Gfr":"\uD835\uDD0A","gfr":"\uD835\uDD24","gg":"\u226B","Gg":"\u22D9","ggg":"\u22D9","gimel":"\u2137","GJcy":"\u0403","gjcy":"\u0453","gla":"\u2AA5","gl":"\u2277","glE":"\u2A92","glj":"\u2AA4","gnap":"\u2A8A","gnapprox":"\u2A8A","gne":"\u2A88","gnE":"\u2269","gneq":"\u2A88","gneqq":"\u2269","gnsim":"\u22E7","Gopf":"\uD835\uDD3E","gopf":"\uD835\uDD58","grave":"`","GreaterEqual":"\u2265","GreaterEqualLess":"\u22DB","GreaterFullEqual":"\u2267","GreaterGreater":"\u2AA2","GreaterLess":"\u2277","GreaterSlantEqual":"\u2A7E","GreaterTilde":"\u2273","Gscr":"\uD835\uDCA2","gscr":"\u210A","gsim":"\u2273","gsime":"\u2A8E","gsiml":"\u2A90","gtcc":"\u2AA7","gtcir":"\u2A7A","gt":">","GT":">","Gt":"\u226B","gtdot":"\u22D7","gtlPar":"\u2995","gtquest":"\u2A7C","gtrapprox":"\u2A86","gtrarr":"\u2978","gtrdot":"\u22D7","gtreqless":"\u22DB","gtreqqless":"\u2A8C","gtrless":"\u2277","gtrsim":"\u2273","gvertneqq":"\u2269\uFE00","gvnE":"\u2269\uFE00","Hacek":"\u02C7","hairsp":"\u200A","half":"\u00BD","hamilt":"\u210B","HARDcy":"\u042A","hardcy":"\u044A","harrcir":"\u2948","harr":"\u2194","hArr":"\u21D4","harrw":"\u21AD","Hat":"^","hbar":"\u210F","Hcirc":"\u0124","hcirc":"\u0125","hearts":"\u2665","heartsuit":"\u2665","hellip":"\u2026","hercon":"\u22B9","hfr":"\uD835\uDD25","Hfr":"\u210C","HilbertSpace":"\u210B","hksearow":"\u2925","hkswarow":"\u2926","hoarr":"\u21FF","homtht":"\u223B","hookleftarrow":"\u21A9","hookrightarrow":"\u21AA","hopf":"\uD835\uDD59","Hopf":"\u210D","horbar":"\u2015","HorizontalLine":"\u2500","hscr":"\uD835\uDCBD","Hscr":"\u210B","hslash":"\u210F","Hstrok":"\u0126","hstrok":"\u0127","HumpDownHump":"\u224E","HumpEqual":"\u224F","hybull":"\u2043","hyphen":"\u2010","Iacute":"\u00CD","iacute":"\u00ED","ic":"\u2063","Icirc":"\u00CE","icirc":"\u00EE","Icy":"\u0418","icy":"\u0438","Idot":"\u0130","IEcy":"\u0415","iecy":"\u0435","iexcl":"\u00A1","iff":"\u21D4","ifr":"\uD835\uDD26","Ifr":"\u2111","Igrave":"\u00CC","igrave":"\u00EC","ii":"\u2148","iiiint":"\u2A0C","iiint":"\u222D","iinfin":"\u29DC","iiota":"\u2129","IJlig":"\u0132","ijlig":"\u0133","Imacr":"\u012A","imacr":"\u012B","image":"\u2111","ImaginaryI":"\u2148","imagline":"\u2110","imagpart":"\u2111","imath":"\u0131","Im":"\u2111","imof":"\u22B7","imped":"\u01B5","Implies":"\u21D2","incare":"\u2105","in":"\u2208","infin":"\u221E","infintie":"\u29DD","inodot":"\u0131","intcal":"\u22BA","int":"\u222B","Int":"\u222C","integers":"\u2124","Integral":"\u222B","intercal":"\u22BA","Intersection":"\u22C2","intlarhk":"\u2A17","intprod":"\u2A3C","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","IOcy":"\u0401","iocy":"\u0451","Iogon":"\u012E","iogon":"\u012F","Iopf":"\uD835\uDD40","iopf":"\uD835\uDD5A","Iota":"\u0399","iota":"\u03B9","iprod":"\u2A3C","iquest":"\u00BF","iscr":"\uD835\uDCBE","Iscr":"\u2110","isin":"\u2208","isindot":"\u22F5","isinE":"\u22F9","isins":"\u22F4","isinsv":"\u22F3","isinv":"\u2208","it":"\u2062","Itilde":"\u0128","itilde":"\u0129","Iukcy":"\u0406","iukcy":"\u0456","Iuml":"\u00CF","iuml":"\u00EF","Jcirc":"\u0134","jcirc":"\u0135","Jcy":"\u0419","jcy":"\u0439","Jfr":"\uD835\uDD0D","jfr":"\uD835\uDD27","jmath":"\u0237","Jopf":"\uD835\uDD41","jopf":"\uD835\uDD5B","Jscr":"\uD835\uDCA5","jscr":"\uD835\uDCBF","Jsercy":"\u0408","jsercy":"\u0458","Jukcy":"\u0404","jukcy":"\u0454","Kappa":"\u039A","kappa":"\u03BA","kappav":"\u03F0","Kcedil":"\u0136","kcedil":"\u0137","Kcy":"\u041A","kcy":"\u043A","Kfr":"\uD835\uDD0E","kfr":"\uD835\uDD28","kgreen":"\u0138","KHcy":"\u0425","khcy":"\u0445","KJcy":"\u040C","kjcy":"\u045C","Kopf":"\uD835\uDD42","kopf":"\uD835\uDD5C","Kscr":"\uD835\uDCA6","kscr":"\uD835\uDCC0","lAarr":"\u21DA","Lacute":"\u0139","lacute":"\u013A","laemptyv":"\u29B4","lagran":"\u2112","Lambda":"\u039B","lambda":"\u03BB","lang":"\u27E8","Lang":"\u27EA","langd":"\u2991","langle":"\u27E8","lap":"\u2A85","Laplacetrf":"\u2112","laquo":"\u00AB","larrb":"\u21E4","larrbfs":"\u291F","larr":"\u2190","Larr":"\u219E","lArr":"\u21D0","larrfs":"\u291D","larrhk":"\u21A9","larrlp":"\u21AB","larrpl":"\u2939","larrsim":"\u2973","larrtl":"\u21A2","latail":"\u2919","lAtail":"\u291B","lat":"\u2AAB","late":"\u2AAD","lates":"\u2AAD\uFE00","lbarr":"\u290C","lBarr":"\u290E","lbbrk":"\u2772","lbrace":"{","lbrack":"[","lbrke":"\u298B","lbrksld":"\u298F","lbrkslu":"\u298D","Lcaron":"\u013D","lcaron":"\u013E","Lcedil":"\u013B","lcedil":"\u013C","lceil":"\u2308","lcub":"{","Lcy":"\u041B","lcy":"\u043B","ldca":"\u2936","ldquo":"\u201C","ldquor":"\u201E","ldrdhar":"\u2967","ldrushar":"\u294B","ldsh":"\u21B2","le":"\u2264","lE":"\u2266","LeftAngleBracket":"\u27E8","LeftArrowBar":"\u21E4","leftarrow":"\u2190","LeftArrow":"\u2190","Leftarrow":"\u21D0","LeftArrowRightArrow":"\u21C6","leftarrowtail":"\u21A2","LeftCeiling":"\u2308","LeftDoubleBracket":"\u27E6","LeftDownTeeVector":"\u2961","LeftDownVectorBar":"\u2959","LeftDownVector":"\u21C3","LeftFloor":"\u230A","leftharpoondown":"\u21BD","leftharpoonup":"\u21BC","leftleftarrows":"\u21C7","leftrightarrow":"\u2194","LeftRightArrow":"\u2194","Leftrightarrow":"\u21D4","leftrightarrows":"\u21C6","leftrightharpoons":"\u21CB","leftrightsquigarrow":"\u21AD","LeftRightVector":"\u294E","LeftTeeArrow":"\u21A4","LeftTee":"\u22A3","LeftTeeVector":"\u295A","leftthreetimes":"\u22CB","LeftTriangleBar":"\u29CF","LeftTriangle":"\u22B2","LeftTriangleEqual":"\u22B4","LeftUpDownVector":"\u2951","LeftUpTeeVector":"\u2960","LeftUpVectorBar":"\u2958","LeftUpVector":"\u21BF","LeftVectorBar":"\u2952","LeftVector":"\u21BC","lEg":"\u2A8B","leg":"\u22DA","leq":"\u2264","leqq":"\u2266","leqslant":"\u2A7D","lescc":"\u2AA8","les":"\u2A7D","lesdot":"\u2A7F","lesdoto":"\u2A81","lesdotor":"\u2A83","lesg":"\u22DA\uFE00","lesges":"\u2A93","lessapprox":"\u2A85","lessdot":"\u22D6","lesseqgtr":"\u22DA","lesseqqgtr":"\u2A8B","LessEqualGreater":"\u22DA","LessFullEqual":"\u2266","LessGreater":"\u2276","lessgtr":"\u2276","LessLess":"\u2AA1","lesssim":"\u2272","LessSlantEqual":"\u2A7D","LessTilde":"\u2272","lfisht":"\u297C","lfloor":"\u230A","Lfr":"\uD835\uDD0F","lfr":"\uD835\uDD29","lg":"\u2276","lgE":"\u2A91","lHar":"\u2962","lhard":"\u21BD","lharu":"\u21BC","lharul":"\u296A","lhblk":"\u2584","LJcy":"\u0409","ljcy":"\u0459","llarr":"\u21C7","ll":"\u226A","Ll":"\u22D8","llcorner":"\u231E","Lleftarrow":"\u21DA","llhard":"\u296B","lltri":"\u25FA","Lmidot":"\u013F","lmidot":"\u0140","lmoustache":"\u23B0","lmoust":"\u23B0","lnap":"\u2A89","lnapprox":"\u2A89","lne":"\u2A87","lnE":"\u2268","lneq":"\u2A87","lneqq":"\u2268","lnsim":"\u22E6","loang":"\u27EC","loarr":"\u21FD","lobrk":"\u27E6","longleftarrow":"\u27F5","LongLeftArrow":"\u27F5","Longleftarrow":"\u27F8","longleftrightarrow":"\u27F7","LongLeftRightArrow":"\u27F7","Longleftrightarrow":"\u27FA","longmapsto":"\u27FC","longrightarrow":"\u27F6","LongRightArrow":"\u27F6","Longrightarrow":"\u27F9","looparrowleft":"\u21AB","looparrowright":"\u21AC","lopar":"\u2985","Lopf":"\uD835\uDD43","lopf":"\uD835\uDD5D","loplus":"\u2A2D","lotimes":"\u2A34","lowast":"\u2217","lowbar":"_","LowerLeftArrow":"\u2199","LowerRightArrow":"\u2198","loz":"\u25CA","lozenge":"\u25CA","lozf":"\u29EB","lpar":"(","lparlt":"\u2993","lrarr":"\u21C6","lrcorner":"\u231F","lrhar":"\u21CB","lrhard":"\u296D","lrm":"\u200E","lrtri":"\u22BF","lsaquo":"\u2039","lscr":"\uD835\uDCC1","Lscr":"\u2112","lsh":"\u21B0","Lsh":"\u21B0","lsim":"\u2272","lsime":"\u2A8D","lsimg":"\u2A8F","lsqb":"[","lsquo":"\u2018","lsquor":"\u201A","Lstrok":"\u0141","lstrok":"\u0142","ltcc":"\u2AA6","ltcir":"\u2A79","lt":"<","LT":"<","Lt":"\u226A","ltdot":"\u22D6","lthree":"\u22CB","ltimes":"\u22C9","ltlarr":"\u2976","ltquest":"\u2A7B","ltri":"\u25C3","ltrie":"\u22B4","ltrif":"\u25C2","ltrPar":"\u2996","lurdshar":"\u294A","luruhar":"\u2966","lvertneqq":"\u2268\uFE00","lvnE":"\u2268\uFE00","macr":"\u00AF","male":"\u2642","malt":"\u2720","maltese":"\u2720","Map":"\u2905","map":"\u21A6","mapsto":"\u21A6","mapstodown":"\u21A7","mapstoleft":"\u21A4","mapstoup":"\u21A5","marker":"\u25AE","mcomma":"\u2A29","Mcy":"\u041C","mcy":"\u043C","mdash":"\u2014","mDDot":"\u223A","measuredangle":"\u2221","MediumSpace":"\u205F","Mellintrf":"\u2133","Mfr":"\uD835\uDD10","mfr":"\uD835\uDD2A","mho":"\u2127","micro":"\u00B5","midast":"*","midcir":"\u2AF0","mid":"\u2223","middot":"\u00B7","minusb":"\u229F","minus":"\u2212","minusd":"\u2238","minusdu":"\u2A2A","MinusPlus":"\u2213","mlcp":"\u2ADB","mldr":"\u2026","mnplus":"\u2213","models":"\u22A7","Mopf":"\uD835\uDD44","mopf":"\uD835\uDD5E","mp":"\u2213","mscr":"\uD835\uDCC2","Mscr":"\u2133","mstpos":"\u223E","Mu":"\u039C","mu":"\u03BC","multimap":"\u22B8","mumap":"\u22B8","nabla":"\u2207","Nacute":"\u0143","nacute":"\u0144","nang":"\u2220\u20D2","nap":"\u2249","napE":"\u2A70\u0338","napid":"\u224B\u0338","napos":"\u0149","napprox":"\u2249","natural":"\u266E","naturals":"\u2115","natur":"\u266E","nbsp":"\u00A0","nbump":"\u224E\u0338","nbumpe":"\u224F\u0338","ncap":"\u2A43","Ncaron":"\u0147","ncaron":"\u0148","Ncedil":"\u0145","ncedil":"\u0146","ncong":"\u2247","ncongdot":"\u2A6D\u0338","ncup":"\u2A42","Ncy":"\u041D","ncy":"\u043D","ndash":"\u2013","nearhk":"\u2924","nearr":"\u2197","neArr":"\u21D7","nearrow":"\u2197","ne":"\u2260","nedot":"\u2250\u0338","NegativeMediumSpace":"\u200B","NegativeThickSpace":"\u200B","NegativeThinSpace":"\u200B","NegativeVeryThinSpace":"\u200B","nequiv":"\u2262","nesear":"\u2928","nesim":"\u2242\u0338","NestedGreaterGreater":"\u226B","NestedLessLess":"\u226A","NewLine":"\n","nexist":"\u2204","nexists":"\u2204","Nfr":"\uD835\uDD11","nfr":"\uD835\uDD2B","ngE":"\u2267\u0338","nge":"\u2271","ngeq":"\u2271","ngeqq":"\u2267\u0338","ngeqslant":"\u2A7E\u0338","nges":"\u2A7E\u0338","nGg":"\u22D9\u0338","ngsim":"\u2275","nGt":"\u226B\u20D2","ngt":"\u226F","ngtr":"\u226F","nGtv":"\u226B\u0338","nharr":"\u21AE","nhArr":"\u21CE","nhpar":"\u2AF2","ni":"\u220B","nis":"\u22FC","nisd":"\u22FA","niv":"\u220B","NJcy":"\u040A","njcy":"\u045A","nlarr":"\u219A","nlArr":"\u21CD","nldr":"\u2025","nlE":"\u2266\u0338","nle":"\u2270","nleftarrow":"\u219A","nLeftarrow":"\u21CD","nleftrightarrow":"\u21AE","nLeftrightarrow":"\u21CE","nleq":"\u2270","nleqq":"\u2266\u0338","nleqslant":"\u2A7D\u0338","nles":"\u2A7D\u0338","nless":"\u226E","nLl":"\u22D8\u0338","nlsim":"\u2274","nLt":"\u226A\u20D2","nlt":"\u226E","nltri":"\u22EA","nltrie":"\u22EC","nLtv":"\u226A\u0338","nmid":"\u2224","NoBreak":"\u2060","NonBreakingSpace":"\u00A0","nopf":"\uD835\uDD5F","Nopf":"\u2115","Not":"\u2AEC","not":"\u00AC","NotCongruent":"\u2262","NotCupCap":"\u226D","NotDoubleVerticalBar":"\u2226","NotElement":"\u2209","NotEqual":"\u2260","NotEqualTilde":"\u2242\u0338","NotExists":"\u2204","NotGreater":"\u226F","NotGreaterEqual":"\u2271","NotGreaterFullEqual":"\u2267\u0338","NotGreaterGreater":"\u226B\u0338","NotGreaterLess":"\u2279","NotGreaterSlantEqual":"\u2A7E\u0338","NotGreaterTilde":"\u2275","NotHumpDownHump":"\u224E\u0338","NotHumpEqual":"\u224F\u0338","notin":"\u2209","notindot":"\u22F5\u0338","notinE":"\u22F9\u0338","notinva":"\u2209","notinvb":"\u22F7","notinvc":"\u22F6","NotLeftTriangleBar":"\u29CF\u0338","NotLeftTriangle":"\u22EA","NotLeftTriangleEqual":"\u22EC","NotLess":"\u226E","NotLessEqual":"\u2270","NotLessGreater":"\u2278","NotLessLess":"\u226A\u0338","NotLessSlantEqual":"\u2A7D\u0338","NotLessTilde":"\u2274","NotNestedGreaterGreater":"\u2AA2\u0338","NotNestedLessLess":"\u2AA1\u0338","notni":"\u220C","notniva":"\u220C","notnivb":"\u22FE","notnivc":"\u22FD","NotPrecedes":"\u2280","NotPrecedesEqual":"\u2AAF\u0338","NotPrecedesSlantEqual":"\u22E0","NotReverseElement":"\u220C","NotRightTriangleBar":"\u29D0\u0338","NotRightTriangle":"\u22EB","NotRightTriangleEqual":"\u22ED","NotSquareSubset":"\u228F\u0338","NotSquareSubsetEqual":"\u22E2","NotSquareSuperset":"\u2290\u0338","NotSquareSupersetEqual":"\u22E3","NotSubset":"\u2282\u20D2","NotSubsetEqual":"\u2288","NotSucceeds":"\u2281","NotSucceedsEqual":"\u2AB0\u0338","NotSucceedsSlantEqual":"\u22E1","NotSucceedsTilde":"\u227F\u0338","NotSuperset":"\u2283\u20D2","NotSupersetEqual":"\u2289","NotTilde":"\u2241","NotTildeEqual":"\u2244","NotTildeFullEqual":"\u2247","NotTildeTilde":"\u2249","NotVerticalBar":"\u2224","nparallel":"\u2226","npar":"\u2226","nparsl":"\u2AFD\u20E5","npart":"\u2202\u0338","npolint":"\u2A14","npr":"\u2280","nprcue":"\u22E0","nprec":"\u2280","npreceq":"\u2AAF\u0338","npre":"\u2AAF\u0338","nrarrc":"\u2933\u0338","nrarr":"\u219B","nrArr":"\u21CF","nrarrw":"\u219D\u0338","nrightarrow":"\u219B","nRightarrow":"\u21CF","nrtri":"\u22EB","nrtrie":"\u22ED","nsc":"\u2281","nsccue":"\u22E1","nsce":"\u2AB0\u0338","Nscr":"\uD835\uDCA9","nscr":"\uD835\uDCC3","nshortmid":"\u2224","nshortparallel":"\u2226","nsim":"\u2241","nsime":"\u2244","nsimeq":"\u2244","nsmid":"\u2224","nspar":"\u2226","nsqsube":"\u22E2","nsqsupe":"\u22E3","nsub":"\u2284","nsubE":"\u2AC5\u0338","nsube":"\u2288","nsubset":"\u2282\u20D2","nsubseteq":"\u2288","nsubseteqq":"\u2AC5\u0338","nsucc":"\u2281","nsucceq":"\u2AB0\u0338","nsup":"\u2285","nsupE":"\u2AC6\u0338","nsupe":"\u2289","nsupset":"\u2283\u20D2","nsupseteq":"\u2289","nsupseteqq":"\u2AC6\u0338","ntgl":"\u2279","Ntilde":"\u00D1","ntilde":"\u00F1","ntlg":"\u2278","ntriangleleft":"\u22EA","ntrianglelefteq":"\u22EC","ntriangleright":"\u22EB","ntrianglerighteq":"\u22ED","Nu":"\u039D","nu":"\u03BD","num":"#","numero":"\u2116","numsp":"\u2007","nvap":"\u224D\u20D2","nvdash":"\u22AC","nvDash":"\u22AD","nVdash":"\u22AE","nVDash":"\u22AF","nvge":"\u2265\u20D2","nvgt":">\u20D2","nvHarr":"\u2904","nvinfin":"\u29DE","nvlArr":"\u2902","nvle":"\u2264\u20D2","nvlt":"<\u20D2","nvltrie":"\u22B4\u20D2","nvrArr":"\u2903","nvrtrie":"\u22B5\u20D2","nvsim":"\u223C\u20D2","nwarhk":"\u2923","nwarr":"\u2196","nwArr":"\u21D6","nwarrow":"\u2196","nwnear":"\u2927","Oacute":"\u00D3","oacute":"\u00F3","oast":"\u229B","Ocirc":"\u00D4","ocirc":"\u00F4","ocir":"\u229A","Ocy":"\u041E","ocy":"\u043E","odash":"\u229D","Odblac":"\u0150","odblac":"\u0151","odiv":"\u2A38","odot":"\u2299","odsold":"\u29BC","OElig":"\u0152","oelig":"\u0153","ofcir":"\u29BF","Ofr":"\uD835\uDD12","ofr":"\uD835\uDD2C","ogon":"\u02DB","Ograve":"\u00D2","ograve":"\u00F2","ogt":"\u29C1","ohbar":"\u29B5","ohm":"\u03A9","oint":"\u222E","olarr":"\u21BA","olcir":"\u29BE","olcross":"\u29BB","oline":"\u203E","olt":"\u29C0","Omacr":"\u014C","omacr":"\u014D","Omega":"\u03A9","omega":"\u03C9","Omicron":"\u039F","omicron":"\u03BF","omid":"\u29B6","ominus":"\u2296","Oopf":"\uD835\uDD46","oopf":"\uD835\uDD60","opar":"\u29B7","OpenCurlyDoubleQuote":"\u201C","OpenCurlyQuote":"\u2018","operp":"\u29B9","oplus":"\u2295","orarr":"\u21BB","Or":"\u2A54","or":"\u2228","ord":"\u2A5D","order":"\u2134","orderof":"\u2134","ordf":"\u00AA","ordm":"\u00BA","origof":"\u22B6","oror":"\u2A56","orslope":"\u2A57","orv":"\u2A5B","oS":"\u24C8","Oscr":"\uD835\uDCAA","oscr":"\u2134","Oslash":"\u00D8","oslash":"\u00F8","osol":"\u2298","Otilde":"\u00D5","otilde":"\u00F5","otimesas":"\u2A36","Otimes":"\u2A37","otimes":"\u2297","Ouml":"\u00D6","ouml":"\u00F6","ovbar":"\u233D","OverBar":"\u203E","OverBrace":"\u23DE","OverBracket":"\u23B4","OverParenthesis":"\u23DC","para":"\u00B6","parallel":"\u2225","par":"\u2225","parsim":"\u2AF3","parsl":"\u2AFD","part":"\u2202","PartialD":"\u2202","Pcy":"\u041F","pcy":"\u043F","percnt":"%","period":".","permil":"\u2030","perp":"\u22A5","pertenk":"\u2031","Pfr":"\uD835\uDD13","pfr":"\uD835\uDD2D","Phi":"\u03A6","phi":"\u03C6","phiv":"\u03D5","phmmat":"\u2133","phone":"\u260E","Pi":"\u03A0","pi":"\u03C0","pitchfork":"\u22D4","piv":"\u03D6","planck":"\u210F","planckh":"\u210E","plankv":"\u210F","plusacir":"\u2A23","plusb":"\u229E","pluscir":"\u2A22","plus":"+","plusdo":"\u2214","plusdu":"\u2A25","pluse":"\u2A72","PlusMinus":"\u00B1","plusmn":"\u00B1","plussim":"\u2A26","plustwo":"\u2A27","pm":"\u00B1","Poincareplane":"\u210C","pointint":"\u2A15","popf":"\uD835\uDD61","Popf":"\u2119","pound":"\u00A3","prap":"\u2AB7","Pr":"\u2ABB","pr":"\u227A","prcue":"\u227C","precapprox":"\u2AB7","prec":"\u227A","preccurlyeq":"\u227C","Precedes":"\u227A","PrecedesEqual":"\u2AAF","PrecedesSlantEqual":"\u227C","PrecedesTilde":"\u227E","preceq":"\u2AAF","precnapprox":"\u2AB9","precneqq":"\u2AB5","precnsim":"\u22E8","pre":"\u2AAF","prE":"\u2AB3","precsim":"\u227E","prime":"\u2032","Prime":"\u2033","primes":"\u2119","prnap":"\u2AB9","prnE":"\u2AB5","prnsim":"\u22E8","prod":"\u220F","Product":"\u220F","profalar":"\u232E","profline":"\u2312","profsurf":"\u2313","prop":"\u221D","Proportional":"\u221D","Proportion":"\u2237","propto":"\u221D","prsim":"\u227E","prurel":"\u22B0","Pscr":"\uD835\uDCAB","pscr":"\uD835\uDCC5","Psi":"\u03A8","psi":"\u03C8","puncsp":"\u2008","Qfr":"\uD835\uDD14","qfr":"\uD835\uDD2E","qint":"\u2A0C","qopf":"\uD835\uDD62","Qopf":"\u211A","qprime":"\u2057","Qscr":"\uD835\uDCAC","qscr":"\uD835\uDCC6","quaternions":"\u210D","quatint":"\u2A16","quest":"?","questeq":"\u225F","quot":"\"","QUOT":"\"","rAarr":"\u21DB","race":"\u223D\u0331","Racute":"\u0154","racute":"\u0155","radic":"\u221A","raemptyv":"\u29B3","rang":"\u27E9","Rang":"\u27EB","rangd":"\u2992","range":"\u29A5","rangle":"\u27E9","raquo":"\u00BB","rarrap":"\u2975","rarrb":"\u21E5","rarrbfs":"\u2920","rarrc":"\u2933","rarr":"\u2192","Rarr":"\u21A0","rArr":"\u21D2","rarrfs":"\u291E","rarrhk":"\u21AA","rarrlp":"\u21AC","rarrpl":"\u2945","rarrsim":"\u2974","Rarrtl":"\u2916","rarrtl":"\u21A3","rarrw":"\u219D","ratail":"\u291A","rAtail":"\u291C","ratio":"\u2236","rationals":"\u211A","rbarr":"\u290D","rBarr":"\u290F","RBarr":"\u2910","rbbrk":"\u2773","rbrace":"}","rbrack":"]","rbrke":"\u298C","rbrksld":"\u298E","rbrkslu":"\u2990","Rcaron":"\u0158","rcaron":"\u0159","Rcedil":"\u0156","rcedil":"\u0157","rceil":"\u2309","rcub":"}","Rcy":"\u0420","rcy":"\u0440","rdca":"\u2937","rdldhar":"\u2969","rdquo":"\u201D","rdquor":"\u201D","rdsh":"\u21B3","real":"\u211C","realine":"\u211B","realpart":"\u211C","reals":"\u211D","Re":"\u211C","rect":"\u25AD","reg":"\u00AE","REG":"\u00AE","ReverseElement":"\u220B","ReverseEquilibrium":"\u21CB","ReverseUpEquilibrium":"\u296F","rfisht":"\u297D","rfloor":"\u230B","rfr":"\uD835\uDD2F","Rfr":"\u211C","rHar":"\u2964","rhard":"\u21C1","rharu":"\u21C0","rharul":"\u296C","Rho":"\u03A1","rho":"\u03C1","rhov":"\u03F1","RightAngleBracket":"\u27E9","RightArrowBar":"\u21E5","rightarrow":"\u2192","RightArrow":"\u2192","Rightarrow":"\u21D2","RightArrowLeftArrow":"\u21C4","rightarrowtail":"\u21A3","RightCeiling":"\u2309","RightDoubleBracket":"\u27E7","RightDownTeeVector":"\u295D","RightDownVectorBar":"\u2955","RightDownVector":"\u21C2","RightFloor":"\u230B","rightharpoondown":"\u21C1","rightharpoonup":"\u21C0","rightleftarrows":"\u21C4","rightleftharpoons":"\u21CC","rightrightarrows":"\u21C9","rightsquigarrow":"\u219D","RightTeeArrow":"\u21A6","RightTee":"\u22A2","RightTeeVector":"\u295B","rightthreetimes":"\u22CC","RightTriangleBar":"\u29D0","RightTriangle":"\u22B3","RightTriangleEqual":"\u22B5","RightUpDownVector":"\u294F","RightUpTeeVector":"\u295C","RightUpVectorBar":"\u2954","RightUpVector":"\u21BE","RightVectorBar":"\u2953","RightVector":"\u21C0","ring":"\u02DA","risingdotseq":"\u2253","rlarr":"\u21C4","rlhar":"\u21CC","rlm":"\u200F","rmoustache":"\u23B1","rmoust":"\u23B1","rnmid":"\u2AEE","roang":"\u27ED","roarr":"\u21FE","robrk":"\u27E7","ropar":"\u2986","ropf":"\uD835\uDD63","Ropf":"\u211D","roplus":"\u2A2E","rotimes":"\u2A35","RoundImplies":"\u2970","rpar":")","rpargt":"\u2994","rppolint":"\u2A12","rrarr":"\u21C9","Rrightarrow":"\u21DB","rsaquo":"\u203A","rscr":"\uD835\uDCC7","Rscr":"\u211B","rsh":"\u21B1","Rsh":"\u21B1","rsqb":"]","rsquo":"\u2019","rsquor":"\u2019","rthree":"\u22CC","rtimes":"\u22CA","rtri":"\u25B9","rtrie":"\u22B5","rtrif":"\u25B8","rtriltri":"\u29CE","RuleDelayed":"\u29F4","ruluhar":"\u2968","rx":"\u211E","Sacute":"\u015A","sacute":"\u015B","sbquo":"\u201A","scap":"\u2AB8","Scaron":"\u0160","scaron":"\u0161","Sc":"\u2ABC","sc":"\u227B","sccue":"\u227D","sce":"\u2AB0","scE":"\u2AB4","Scedil":"\u015E","scedil":"\u015F","Scirc":"\u015C","scirc":"\u015D","scnap":"\u2ABA","scnE":"\u2AB6","scnsim":"\u22E9","scpolint":"\u2A13","scsim":"\u227F","Scy":"\u0421","scy":"\u0441","sdotb":"\u22A1","sdot":"\u22C5","sdote":"\u2A66","searhk":"\u2925","searr":"\u2198","seArr":"\u21D8","searrow":"\u2198","sect":"\u00A7","semi":";","seswar":"\u2929","setminus":"\u2216","setmn":"\u2216","sext":"\u2736","Sfr":"\uD835\uDD16","sfr":"\uD835\uDD30","sfrown":"\u2322","sharp":"\u266F","SHCHcy":"\u0429","shchcy":"\u0449","SHcy":"\u0428","shcy":"\u0448","ShortDownArrow":"\u2193","ShortLeftArrow":"\u2190","shortmid":"\u2223","shortparallel":"\u2225","ShortRightArrow":"\u2192","ShortUpArrow":"\u2191","shy":"\u00AD","Sigma":"\u03A3","sigma":"\u03C3","sigmaf":"\u03C2","sigmav":"\u03C2","sim":"\u223C","simdot":"\u2A6A","sime":"\u2243","simeq":"\u2243","simg":"\u2A9E","simgE":"\u2AA0","siml":"\u2A9D","simlE":"\u2A9F","simne":"\u2246","simplus":"\u2A24","simrarr":"\u2972","slarr":"\u2190","SmallCircle":"\u2218","smallsetminus":"\u2216","smashp":"\u2A33","smeparsl":"\u29E4","smid":"\u2223","smile":"\u2323","smt":"\u2AAA","smte":"\u2AAC","smtes":"\u2AAC\uFE00","SOFTcy":"\u042C","softcy":"\u044C","solbar":"\u233F","solb":"\u29C4","sol":"/","Sopf":"\uD835\uDD4A","sopf":"\uD835\uDD64","spades":"\u2660","spadesuit":"\u2660","spar":"\u2225","sqcap":"\u2293","sqcaps":"\u2293\uFE00","sqcup":"\u2294","sqcups":"\u2294\uFE00","Sqrt":"\u221A","sqsub":"\u228F","sqsube":"\u2291","sqsubset":"\u228F","sqsubseteq":"\u2291","sqsup":"\u2290","sqsupe":"\u2292","sqsupset":"\u2290","sqsupseteq":"\u2292","square":"\u25A1","Square":"\u25A1","SquareIntersection":"\u2293","SquareSubset":"\u228F","SquareSubsetEqual":"\u2291","SquareSuperset":"\u2290","SquareSupersetEqual":"\u2292","SquareUnion":"\u2294","squarf":"\u25AA","squ":"\u25A1","squf":"\u25AA","srarr":"\u2192","Sscr":"\uD835\uDCAE","sscr":"\uD835\uDCC8","ssetmn":"\u2216","ssmile":"\u2323","sstarf":"\u22C6","Star":"\u22C6","star":"\u2606","starf":"\u2605","straightepsilon":"\u03F5","straightphi":"\u03D5","strns":"\u00AF","sub":"\u2282","Sub":"\u22D0","subdot":"\u2ABD","subE":"\u2AC5","sube":"\u2286","subedot":"\u2AC3","submult":"\u2AC1","subnE":"\u2ACB","subne":"\u228A","subplus":"\u2ABF","subrarr":"\u2979","subset":"\u2282","Subset":"\u22D0","subseteq":"\u2286","subseteqq":"\u2AC5","SubsetEqual":"\u2286","subsetneq":"\u228A","subsetneqq":"\u2ACB","subsim":"\u2AC7","subsub":"\u2AD5","subsup":"\u2AD3","succapprox":"\u2AB8","succ":"\u227B","succcurlyeq":"\u227D","Succeeds":"\u227B","SucceedsEqual":"\u2AB0","SucceedsSlantEqual":"\u227D","SucceedsTilde":"\u227F","succeq":"\u2AB0","succnapprox":"\u2ABA","succneqq":"\u2AB6","succnsim":"\u22E9","succsim":"\u227F","SuchThat":"\u220B","sum":"\u2211","Sum":"\u2211","sung":"\u266A","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","sup":"\u2283","Sup":"\u22D1","supdot":"\u2ABE","supdsub":"\u2AD8","supE":"\u2AC6","supe":"\u2287","supedot":"\u2AC4","Superset":"\u2283","SupersetEqual":"\u2287","suphsol":"\u27C9","suphsub":"\u2AD7","suplarr":"\u297B","supmult":"\u2AC2","supnE":"\u2ACC","supne":"\u228B","supplus":"\u2AC0","supset":"\u2283","Supset":"\u22D1","supseteq":"\u2287","supseteqq":"\u2AC6","supsetneq":"\u228B","supsetneqq":"\u2ACC","supsim":"\u2AC8","supsub":"\u2AD4","supsup":"\u2AD6","swarhk":"\u2926","swarr":"\u2199","swArr":"\u21D9","swarrow":"\u2199","swnwar":"\u292A","szlig":"\u00DF","Tab":"\t","target":"\u2316","Tau":"\u03A4","tau":"\u03C4","tbrk":"\u23B4","Tcaron":"\u0164","tcaron":"\u0165","Tcedil":"\u0162","tcedil":"\u0163","Tcy":"\u0422","tcy":"\u0442","tdot":"\u20DB","telrec":"\u2315","Tfr":"\uD835\uDD17","tfr":"\uD835\uDD31","there4":"\u2234","therefore":"\u2234","Therefore":"\u2234","Theta":"\u0398","theta":"\u03B8","thetasym":"\u03D1","thetav":"\u03D1","thickapprox":"\u2248","thicksim":"\u223C","ThickSpace":"\u205F\u200A","ThinSpace":"\u2009","thinsp":"\u2009","thkap":"\u2248","thksim":"\u223C","THORN":"\u00DE","thorn":"\u00FE","tilde":"\u02DC","Tilde":"\u223C","TildeEqual":"\u2243","TildeFullEqual":"\u2245","TildeTilde":"\u2248","timesbar":"\u2A31","timesb":"\u22A0","times":"\u00D7","timesd":"\u2A30","tint":"\u222D","toea":"\u2928","topbot":"\u2336","topcir":"\u2AF1","top":"\u22A4","Topf":"\uD835\uDD4B","topf":"\uD835\uDD65","topfork":"\u2ADA","tosa":"\u2929","tprime":"\u2034","trade":"\u2122","TRADE":"\u2122","triangle":"\u25B5","triangledown":"\u25BF","triangleleft":"\u25C3","trianglelefteq":"\u22B4","triangleq":"\u225C","triangleright":"\u25B9","trianglerighteq":"\u22B5","tridot":"\u25EC","trie":"\u225C","triminus":"\u2A3A","TripleDot":"\u20DB","triplus":"\u2A39","trisb":"\u29CD","tritime":"\u2A3B","trpezium":"\u23E2","Tscr":"\uD835\uDCAF","tscr":"\uD835\uDCC9","TScy":"\u0426","tscy":"\u0446","TSHcy":"\u040B","tshcy":"\u045B","Tstrok":"\u0166","tstrok":"\u0167","twixt":"\u226C","twoheadleftarrow":"\u219E","twoheadrightarrow":"\u21A0","Uacute":"\u00DA","uacute":"\u00FA","uarr":"\u2191","Uarr":"\u219F","uArr":"\u21D1","Uarrocir":"\u2949","Ubrcy":"\u040E","ubrcy":"\u045E","Ubreve":"\u016C","ubreve":"\u016D","Ucirc":"\u00DB","ucirc":"\u00FB","Ucy":"\u0423","ucy":"\u0443","udarr":"\u21C5","Udblac":"\u0170","udblac":"\u0171","udhar":"\u296E","ufisht":"\u297E","Ufr":"\uD835\uDD18","ufr":"\uD835\uDD32","Ugrave":"\u00D9","ugrave":"\u00F9","uHar":"\u2963","uharl":"\u21BF","uharr":"\u21BE","uhblk":"\u2580","ulcorn":"\u231C","ulcorner":"\u231C","ulcrop":"\u230F","ultri":"\u25F8","Umacr":"\u016A","umacr":"\u016B","uml":"\u00A8","UnderBar":"_","UnderBrace":"\u23DF","UnderBracket":"\u23B5","UnderParenthesis":"\u23DD","Union":"\u22C3","UnionPlus":"\u228E","Uogon":"\u0172","uogon":"\u0173","Uopf":"\uD835\uDD4C","uopf":"\uD835\uDD66","UpArrowBar":"\u2912","uparrow":"\u2191","UpArrow":"\u2191","Uparrow":"\u21D1","UpArrowDownArrow":"\u21C5","updownarrow":"\u2195","UpDownArrow":"\u2195","Updownarrow":"\u21D5","UpEquilibrium":"\u296E","upharpoonleft":"\u21BF","upharpoonright":"\u21BE","uplus":"\u228E","UpperLeftArrow":"\u2196","UpperRightArrow":"\u2197","upsi":"\u03C5","Upsi":"\u03D2","upsih":"\u03D2","Upsilon":"\u03A5","upsilon":"\u03C5","UpTeeArrow":"\u21A5","UpTee":"\u22A5","upuparrows":"\u21C8","urcorn":"\u231D","urcorner":"\u231D","urcrop":"\u230E","Uring":"\u016E","uring":"\u016F","urtri":"\u25F9","Uscr":"\uD835\uDCB0","uscr":"\uD835\uDCCA","utdot":"\u22F0","Utilde":"\u0168","utilde":"\u0169","utri":"\u25B5","utrif":"\u25B4","uuarr":"\u21C8","Uuml":"\u00DC","uuml":"\u00FC","uwangle":"\u29A7","vangrt":"\u299C","varepsilon":"\u03F5","varkappa":"\u03F0","varnothing":"\u2205","varphi":"\u03D5","varpi":"\u03D6","varpropto":"\u221D","varr":"\u2195","vArr":"\u21D5","varrho":"\u03F1","varsigma":"\u03C2","varsubsetneq":"\u228A\uFE00","varsubsetneqq":"\u2ACB\uFE00","varsupsetneq":"\u228B\uFE00","varsupsetneqq":"\u2ACC\uFE00","vartheta":"\u03D1","vartriangleleft":"\u22B2","vartriangleright":"\u22B3","vBar":"\u2AE8","Vbar":"\u2AEB","vBarv":"\u2AE9","Vcy":"\u0412","vcy":"\u0432","vdash":"\u22A2","vDash":"\u22A8","Vdash":"\u22A9","VDash":"\u22AB","Vdashl":"\u2AE6","veebar":"\u22BB","vee":"\u2228","Vee":"\u22C1","veeeq":"\u225A","vellip":"\u22EE","verbar":"|","Verbar":"\u2016","vert":"|","Vert":"\u2016","VerticalBar":"\u2223","VerticalLine":"|","VerticalSeparator":"\u2758","VerticalTilde":"\u2240","VeryThinSpace":"\u200A","Vfr":"\uD835\uDD19","vfr":"\uD835\uDD33","vltri":"\u22B2","vnsub":"\u2282\u20D2","vnsup":"\u2283\u20D2","Vopf":"\uD835\uDD4D","vopf":"\uD835\uDD67","vprop":"\u221D","vrtri":"\u22B3","Vscr":"\uD835\uDCB1","vscr":"\uD835\uDCCB","vsubnE":"\u2ACB\uFE00","vsubne":"\u228A\uFE00","vsupnE":"\u2ACC\uFE00","vsupne":"\u228B\uFE00","Vvdash":"\u22AA","vzigzag":"\u299A","Wcirc":"\u0174","wcirc":"\u0175","wedbar":"\u2A5F","wedge":"\u2227","Wedge":"\u22C0","wedgeq":"\u2259","weierp":"\u2118","Wfr":"\uD835\uDD1A","wfr":"\uD835\uDD34","Wopf":"\uD835\uDD4E","wopf":"\uD835\uDD68","wp":"\u2118","wr":"\u2240","wreath":"\u2240","Wscr":"\uD835\uDCB2","wscr":"\uD835\uDCCC","xcap":"\u22C2","xcirc":"\u25EF","xcup":"\u22C3","xdtri":"\u25BD","Xfr":"\uD835\uDD1B","xfr":"\uD835\uDD35","xharr":"\u27F7","xhArr":"\u27FA","Xi":"\u039E","xi":"\u03BE","xlarr":"\u27F5","xlArr":"\u27F8","xmap":"\u27FC","xnis":"\u22FB","xodot":"\u2A00","Xopf":"\uD835\uDD4F","xopf":"\uD835\uDD69","xoplus":"\u2A01","xotime":"\u2A02","xrarr":"\u27F6","xrArr":"\u27F9","Xscr":"\uD835\uDCB3","xscr":"\uD835\uDCCD","xsqcup":"\u2A06","xuplus":"\u2A04","xutri":"\u25B3","xvee":"\u22C1","xwedge":"\u22C0","Yacute":"\u00DD","yacute":"\u00FD","YAcy":"\u042F","yacy":"\u044F","Ycirc":"\u0176","ycirc":"\u0177","Ycy":"\u042B","ycy":"\u044B","yen":"\u00A5","Yfr":"\uD835\uDD1C","yfr":"\uD835\uDD36","YIcy":"\u0407","yicy":"\u0457","Yopf":"\uD835\uDD50","yopf":"\uD835\uDD6A","Yscr":"\uD835\uDCB4","yscr":"\uD835\uDCCE","YUcy":"\u042E","yucy":"\u044E","yuml":"\u00FF","Yuml":"\u0178","Zacute":"\u0179","zacute":"\u017A","Zcaron":"\u017D","zcaron":"\u017E","Zcy":"\u0417","zcy":"\u0437","Zdot":"\u017B","zdot":"\u017C","zeetrf":"\u2128","ZeroWidthSpace":"\u200B","Zeta":"\u0396","zeta":"\u03B6","zfr":"\uD835\uDD37","Zfr":"\u2128","ZHcy":"\u0416","zhcy":"\u0436","zigrarr":"\u21DD","zopf":"\uD835\uDD6B","Zopf":"\u2124","Zscr":"\uD835\uDCB5","zscr":"\uD835\uDCCF","zwj":"\u200D","zwnj":"\u200C"}
},{}],60:[function(require,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","AElig":"\u00C6","aelig":"\u00E6","Agrave":"\u00C0","agrave":"\u00E0","amp":"&","AMP":"&","Aring":"\u00C5","aring":"\u00E5","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","brvbar":"\u00A6","Ccedil":"\u00C7","ccedil":"\u00E7","cedil":"\u00B8","cent":"\u00A2","copy":"\u00A9","COPY":"\u00A9","curren":"\u00A4","deg":"\u00B0","divide":"\u00F7","Eacute":"\u00C9","eacute":"\u00E9","Ecirc":"\u00CA","ecirc":"\u00EA","Egrave":"\u00C8","egrave":"\u00E8","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","frac12":"\u00BD","frac14":"\u00BC","frac34":"\u00BE","gt":">","GT":">","Iacute":"\u00CD","iacute":"\u00ED","Icirc":"\u00CE","icirc":"\u00EE","iexcl":"\u00A1","Igrave":"\u00CC","igrave":"\u00EC","iquest":"\u00BF","Iuml":"\u00CF","iuml":"\u00EF","laquo":"\u00AB","lt":"<","LT":"<","macr":"\u00AF","micro":"\u00B5","middot":"\u00B7","nbsp":"\u00A0","not":"\u00AC","Ntilde":"\u00D1","ntilde":"\u00F1","Oacute":"\u00D3","oacute":"\u00F3","Ocirc":"\u00D4","ocirc":"\u00F4","Ograve":"\u00D2","ograve":"\u00F2","ordf":"\u00AA","ordm":"\u00BA","Oslash":"\u00D8","oslash":"\u00F8","Otilde":"\u00D5","otilde":"\u00F5","Ouml":"\u00D6","ouml":"\u00F6","para":"\u00B6","plusmn":"\u00B1","pound":"\u00A3","quot":"\"","QUOT":"\"","raquo":"\u00BB","reg":"\u00AE","REG":"\u00AE","sect":"\u00A7","shy":"\u00AD","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","szlig":"\u00DF","THORN":"\u00DE","thorn":"\u00FE","times":"\u00D7","Uacute":"\u00DA","uacute":"\u00FA","Ucirc":"\u00DB","ucirc":"\u00FB","Ugrave":"\u00D9","ugrave":"\u00F9","uml":"\u00A8","Uuml":"\u00DC","uuml":"\u00FC","Yacute":"\u00DD","yacute":"\u00FD","yen":"\u00A5","yuml":"\u00FF"}
},{}],61:[function(require,module,exports){
module.exports={"amp":"&","apos":"'","gt":">","lt":"<","quot":"\""}

},{}],62:[function(require,module,exports){
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

},{"min-document":88}],63:[function(require,module,exports){
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

},{}],64:[function(require,module,exports){
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

},{}],65:[function(require,module,exports){
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

},{"hyperscript-attribute-to-property":64}],66:[function(require,module,exports){

'use strict';


/* eslint-disable no-bitwise */

var decodeCache = {};

function getDecodeCache(exclude) {
  var i, ch, cache = decodeCache[exclude];
  if (cache) { return cache; }

  cache = decodeCache[exclude] = [];

  for (i = 0; i < 128; i++) {
    ch = String.fromCharCode(i);
    cache.push(ch);
  }

  for (i = 0; i < exclude.length; i++) {
    ch = exclude.charCodeAt(i);
    cache[ch] = '%' + ('0' + ch.toString(16).toUpperCase()).slice(-2);
  }

  return cache;
}


// Decode percent-encoded string.
//
function decode(string, exclude) {
  var cache;

  if (typeof exclude !== 'string') {
    exclude = decode.defaultChars;
  }

  cache = getDecodeCache(exclude);

  return string.replace(/(%[a-f0-9]{2})+/gi, function(seq) {
    var i, l, b1, b2, b3, b4, chr,
        result = '';

    for (i = 0, l = seq.length; i < l; i += 3) {
      b1 = parseInt(seq.slice(i + 1, i + 3), 16);

      if (b1 < 0x80) {
        result += cache[b1];
        continue;
      }

      if ((b1 & 0xE0) === 0xC0 && (i + 3 < l)) {
        // 110xxxxx 10xxxxxx
        b2 = parseInt(seq.slice(i + 4, i + 6), 16);

        if ((b2 & 0xC0) === 0x80) {
          chr = ((b1 << 6) & 0x7C0) | (b2 & 0x3F);

          if (chr < 0x80) {
            result += '\ufffd\ufffd';
          } else {
            result += String.fromCharCode(chr);
          }

          i += 3;
          continue;
        }
      }

      if ((b1 & 0xF0) === 0xE0 && (i + 6 < l)) {
        // 1110xxxx 10xxxxxx 10xxxxxx
        b2 = parseInt(seq.slice(i + 4, i + 6), 16);
        b3 = parseInt(seq.slice(i + 7, i + 9), 16);

        if ((b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80) {
          chr = ((b1 << 12) & 0xF000) | ((b2 << 6) & 0xFC0) | (b3 & 0x3F);

          if (chr < 0x800 || (chr >= 0xD800 && chr <= 0xDFFF)) {
            result += '\ufffd\ufffd\ufffd';
          } else {
            result += String.fromCharCode(chr);
          }

          i += 6;
          continue;
        }
      }

      if ((b1 & 0xF8) === 0xF0 && (i + 9 < l)) {
        // 111110xx 10xxxxxx 10xxxxxx 10xxxxxx
        b2 = parseInt(seq.slice(i + 4, i + 6), 16);
        b3 = parseInt(seq.slice(i + 7, i + 9), 16);
        b4 = parseInt(seq.slice(i + 10, i + 12), 16);

        if ((b2 & 0xC0) === 0x80 && (b3 & 0xC0) === 0x80 && (b4 & 0xC0) === 0x80) {
          chr = ((b1 << 18) & 0x1C0000) | ((b2 << 12) & 0x3F000) | ((b3 << 6) & 0xFC0) | (b4 & 0x3F);

          if (chr < 0x10000 || chr > 0x10FFFF) {
            result += '\ufffd\ufffd\ufffd\ufffd';
          } else {
            chr -= 0x10000;
            result += String.fromCharCode(0xD800 + (chr >> 10), 0xDC00 + (chr & 0x3FF));
          }

          i += 9;
          continue;
        }
      }

      result += '\ufffd';
    }

    return result;
  });
}


decode.defaultChars   = ';/?:@&=+$,#';
decode.componentChars = '';


module.exports = decode;

},{}],67:[function(require,module,exports){

'use strict';


var encodeCache = {};


// Create a lookup array where anything but characters in `chars` string
// and alphanumeric chars is percent-encoded.
//
function getEncodeCache(exclude) {
  var i, ch, cache = encodeCache[exclude];
  if (cache) { return cache; }

  cache = encodeCache[exclude] = [];

  for (i = 0; i < 128; i++) {
    ch = String.fromCharCode(i);

    if (/^[0-9a-z]$/i.test(ch)) {
      // always allow unencoded alphanumeric characters
      cache.push(ch);
    } else {
      cache.push('%' + ('0' + i.toString(16).toUpperCase()).slice(-2));
    }
  }

  for (i = 0; i < exclude.length; i++) {
    cache[exclude.charCodeAt(i)] = exclude[i];
  }

  return cache;
}


// Encode unsafe characters with percent-encoding, skipping already
// encoded sequences.
//
//  - string       - string to encode
//  - exclude      - list of characters to ignore (in addition to a-zA-Z0-9)
//  - keepEscaped  - don't encode '%' in a correct escape sequence (default: true)
//
function encode(string, exclude, keepEscaped) {
  var i, l, code, nextCode, cache,
      result = '';

  if (typeof exclude !== 'string') {
    // encode(string, keepEscaped)
    keepEscaped  = exclude;
    exclude = encode.defaultChars;
  }

  if (typeof keepEscaped === 'undefined') {
    keepEscaped = true;
  }

  cache = getEncodeCache(exclude);

  for (i = 0, l = string.length; i < l; i++) {
    code = string.charCodeAt(i);

    if (keepEscaped && code === 0x25 /* % */ && i + 2 < l) {
      if (/^[0-9a-f]{2}$/i.test(string.slice(i + 1, i + 3))) {
        result += string.slice(i, i + 3);
        i += 2;
        continue;
      }
    }

    if (code < 128) {
      result += cache[code];
      continue;
    }

    if (code >= 0xD800 && code <= 0xDFFF) {
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < l) {
        nextCode = string.charCodeAt(i + 1);
        if (nextCode >= 0xDC00 && nextCode <= 0xDFFF) {
          result += encodeURIComponent(string[i] + string[i + 1]);
          i++;
          continue;
        }
      }
      result += '%EF%BF%BD';
      continue;
    }

    result += encodeURIComponent(string[i]);
  }

  return result;
}

encode.defaultChars   = ";/?:@&=+$,-_.!~*'()#";
encode.componentChars = "-_.!~*'()";


module.exports = encode;

},{}],68:[function(require,module,exports){
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

},{"assert":87,"nanotiming":77}],69:[function(require,module,exports){
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

},{"assert":87}],70:[function(require,module,exports){
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

},{"assert":87}],71:[function(require,module,exports){
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

},{"./lib/morph":73,"assert":87}],72:[function(require,module,exports){
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

},{}],73:[function(require,module,exports){
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

},{"./events":72}],74:[function(require,module,exports){
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

},{"assert":87,"nanomorph":71}],75:[function(require,module,exports){
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

},{"assert":87}],76:[function(require,module,exports){
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

},{"wayfarer":83}],77:[function(require,module,exports){
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

},{"assert":87}],78:[function(require,module,exports){
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

},{"global/document":62,"global/window":63}],79:[function(require,module,exports){
/*! http://mths.be/repeat v0.2.0 by @mathias */
if (!String.prototype.repeat) {
	(function() {
		'use strict'; // needed to support `apply`/`call` with `undefined`/`null`
		var defineProperty = (function() {
			// IE 8 only supports `Object.defineProperty` on DOM elements
			try {
				var object = {};
				var $defineProperty = Object.defineProperty;
				var result = $defineProperty(object, object, object) && $defineProperty;
			} catch(error) {}
			return result;
		}());
		var repeat = function(count) {
			if (this == null) {
				throw TypeError();
			}
			var string = String(this);
			// `ToInteger`
			var n = count ? Number(count) : 0;
			if (n != n) { // better `isNaN`
				n = 0;
			}
			// Account for out-of-bounds indices
			if (n < 0 || n == Infinity) {
				throw RangeError();
			}
			var result = '';
			while (n) {
				if (n % 2 == 1) {
					result += string;
				}
				if (n > 1) {
					string += string;
				}
				n >>= 1;
			}
			return result;
		};
		if (defineProperty) {
			defineProperty(String.prototype, 'repeat', {
				'value': repeat,
				'configurable': true,
				'writable': true
			});
		} else {
			String.prototype.repeat = repeat;
		}
	}());
}

},{}],80:[function(require,module,exports){
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

},{}],81:[function(require,module,exports){
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

},{}],82:[function(require,module,exports){
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

},{"./lib/bytesToUuid":80,"./lib/rng":81}],83:[function(require,module,exports){
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

},{"./trie":84,"assert":87}],84:[function(require,module,exports){
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

},{"assert":87,"xtend":85,"xtend/mutable":86}],85:[function(require,module,exports){
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

},{}],86:[function(require,module,exports){
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

},{}],87:[function(require,module,exports){
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

},{"util/":92}],88:[function(require,module,exports){

},{}],89:[function(require,module,exports){
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

},{}],90:[function(require,module,exports){
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

},{}],91:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],92:[function(require,module,exports){
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

},{"./support/isBuffer":91,"_process":89,"inherits":90}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9hcHBWaWV3LmpzIiwibGliL2JlaGF2aW9yLmpzIiwibGliL2JnVmlldy5qcyIsImxpYi9jYXJkVmlldy5qcyIsImxpYi9lZGl0QmFyVmlldy5qcyIsImxpYi9lZGl0TW9kYWxWaWV3LmpzIiwibGliL2VsZW1lbnRWaWV3LmpzIiwibGliL2ZpZWxkVmlldy5qcyIsImxpYi9mb3JtL2JlaGF2aW9yc1RvQ29tcG9uZW50cy5qcyIsImxpYi9mb3JtL2JnU3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vY2FyZFN0eWxlVmlldy5qcyIsImxpYi9mb3JtL2NsaWNrRWxlbWVudENvbXBvbmVudC5qcyIsImxpYi9mb3JtL2VkaXRCZWhhdmlvclZpZXcuanMiLCJsaWIvZm9ybS9lbGVtZW50U3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vZmllbGRTdHlsZVZpZXcuanMiLCJsaWIvZm9ybS9nb1RvTmV4dENhcmRDb21wb25lbnQuanMiLCJsaWIvZm9ybS9nb1RvUHJldmlvdXNDYXJkQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vaWZDb21wb25lbnRzLmpzIiwibGliL2Zvcm0vaWZMb2dpYy5qcyIsImxpYi9mb3JtL2ltYWdlU3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vanVtcFRvQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vbGlua1RvQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vcGxheVNvdW5kQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vcmVtb3ZlVHJ1dGhDb21wb25lbnQuanMiLCJsaWIvZm9ybS9zZXRUcnV0aENvbXBvbmVudC5qcyIsImxpYi9mb3JtL3N0YWNrQ29tYm9WaWV3LmpzIiwibGliL2dyYXBoaWNWaWV3LmpzIiwibGliL2ltYWdlVmlldy5qcyIsImxpYi9zdGF0ZUFwaS5qcyIsImxpYi9zdG9yZS9hcHBTdG9yZS5qcyIsImxpYi9zdG9yZS9iZ1N0b3JlLmpzIiwibGliL3N0b3JlL2NhcmRTdG9yZS5qcyIsImxpYi9zdG9yZS9lZGl0QmFyU3RvcmUuanMiLCJsaWIvc3RvcmUvZWRpdE1vZGFsU3RvcmUuanMiLCJsaWIvc3RvcmUvZWxlbWVudFN0b3JlLmpzIiwibGliL3N0b3JlL2ZpZWxkU3RvcmUuanMiLCJsaWIvc3RvcmUvaW1hZ2VTdG9yZS5qcyIsImxpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2JlbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jaG9vL2h0bWwuanMiLCJub2RlX21vZHVsZXMvY2hvby9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9ibG9ja3MuanMiLCJub2RlX21vZHVsZXMvY29tbW9ubWFyay9saWIvY29tbW9uLmpzIiwibm9kZV9tb2R1bGVzL2NvbW1vbm1hcmsvbGliL2Zyb20tY29kZS1wb2ludC5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9pbmxpbmVzLmpzIiwibm9kZV9tb2R1bGVzL2NvbW1vbm1hcmsvbGliL25vZGUuanMiLCJub2RlX21vZHVsZXMvY29tbW9ubWFyay9saWIvbm9ybWFsaXplLXJlZmVyZW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9yZW5kZXIvaHRtbC5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9yZW5kZXIvcmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvY29tbW9ubWFyay9saWIvcmVuZGVyL3htbC5qcyIsIm5vZGVfbW9kdWxlcy9kb2N1bWVudC1yZWFkeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbnRpdGllcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbnRpdGllcy9saWIvZGVjb2RlLmpzIiwibm9kZV9tb2R1bGVzL2VudGl0aWVzL2xpYi9kZWNvZGVfY29kZXBvaW50LmpzIiwibm9kZV9tb2R1bGVzL2VudGl0aWVzL2xpYi9lbmNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50aXRpZXMvbWFwcy9kZWNvZGUuanNvbiIsIm5vZGVfbW9kdWxlcy9lbnRpdGllcy9tYXBzL2VudGl0aWVzLmpzb24iLCJub2RlX21vZHVsZXMvZW50aXRpZXMvbWFwcy9sZWdhY3kuanNvbiIsIm5vZGVfbW9kdWxlcy9lbnRpdGllcy9tYXBzL3htbC5qc29uIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy9nbG9iYWwvd2luZG93LmpzIiwibm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcngvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbWR1cmwvZGVjb2RlLmpzIiwibm9kZV9tb2R1bGVzL21kdXJsL2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vYnVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9oaXN0b3J5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9ocmVmL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9tb3JwaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vbW9ycGgvbGliL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vbW9ycGgvbGliL21vcnBoLmpzIiwibm9kZV9tb2R1bGVzL25hbm9tb3VudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vcmFmL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9yb3V0ZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub3RpbWluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vbi1sb2FkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3N0cmluZy5wcm90b3R5cGUucmVwZWF0L3JlcGVhdC5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL2xpYi9ieXRlc1RvVXVpZC5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL2xpYi9ybmctYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL3YxLmpzIiwibm9kZV9tb2R1bGVzL3dheWZhcmVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dheWZhcmVyL3RyaWUuanMiLCJub2RlX21vZHVsZXMveHRlbmQvaW1tdXRhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3h0ZW5kL211dGFibGUuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYXNzZXJ0L2Fzc2VydC5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL3V0aWwvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6MkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3I3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0TEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekVBOztBQ0FBOztBQ0FBOztBQ0FBO0FBQ0E7OztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMWVBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIGNvbnN0IGFyYyA9IG5ldyBEYXRBcmNoaXZlKHdpbmRvdy5sb2NhdGlvbi50b1N0cmluZygpKTtcblxuLy8gY29uc3QgY29uZmlnID0gSlNPTi5wYXJzZShhd2FpdCBhcmMucmVhZEZpbGUoJ2NvbmZpZy5qc29uJykpO1xuXG4vLyBjb25zdCB7cmVuZGVyfSA9IHJlcXVpcmUoJ2xpYi91dGlsLmpzJyk7XG4vL1xuLy8gcmVuZGVyKGNhcmQxLCBhcmMpO1xuXG5jb25zdCBjaG9vID0gcmVxdWlyZSgnY2hvbycpO1xuXG5jb25zdCBtYWluVmlldyA9IHJlcXVpcmUoJy4vbGliL2FwcFZpZXcnKTtcblxuXG5sZXQgYXBwID0gY2hvbygpO1xuXG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2FwcFN0b3JlJykpO1xuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9iZ1N0b3JlJykpO1xuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9jYXJkU3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2VsZW1lbnRTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvZmllbGRTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvZWRpdEJhclN0b3JlJykpO1xuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9lZGl0TW9kYWxTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvaW1hZ2VTdG9yZScpKTtcblxuYXBwLnJvdXRlKCcvJywgbWFpblZpZXcpO1xuLy8gYXBwLnJvdXRlKCcvY2FyZC86d2hpY2gnLCBmdW5jdGlvbihzdGF0ZSwgZW1pdCkge1xuLy8gICAgIHJldHVybiBtYWluVmlldyhzdGF0ZSwgZW1pdCk7XG4vLyB9KVxuXG5hcHAubW91bnQoJ21haW4nKTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3QgYmFja2dyb3VuZCA9IHJlcXVpcmUoJy4vYmdWaWV3Jyk7XG5jb25zdCBjYXJkID0gcmVxdWlyZSgnLi9jYXJkVmlldycpO1xuY29uc3QgZWRpdEJhciA9IHJlcXVpcmUoJy4vZWRpdEJhclZpZXcnKTtcbmNvbnN0IGVkaXRNb2RhbCA9IHJlcXVpcmUoJy4vZWRpdE1vZGFsVmlldycpO1xuXG5jb25zdCB7IGNvbG9yIH0gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuY29uc3QgbWFpblZpZXcgPSBmdW5jdGlvbihzdGF0ZSwgZW1pdCkge1xuICAgIGlmICh0eXBlb2Ygc3RhdGUuZWRpdGluZyAhPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdCgncmVuZGVyJyksIDEpO1xuICAgICAgICByZXR1cm4gaHRtbGA8bWFpbiBpZD1cImhhbnpvXCI+PC9tYWluPmA7XG4gICAgfVxuXG4gICAgY29uc3QgY3VycmVudENvbG9yID0gY29sb3Ioc3RhdGUpO1xuICAgIHJldHVybiBodG1sYDxtYWluIGNsYXNzPVwiJHtzdGF0ZS5lZGl0TW9kZSB8fCBcIlwifVwiXG4gICAgICAgIHN0eWxlPVwiJHtjdXJyZW50Q29sb3IgPyBcImJhY2tncm91bmQtY29sb3I6XCIgKyBjdXJyZW50Q29sb3IgOiBcIlwifVwiPlxuICAgICAgJHtzdGF0ZS5lZGl0aW5nKCkgPyBlZGl0QmFyKHN0YXRlLCBlbWl0KSA6IG51bGx9XG4gICAgICAke2JhY2tncm91bmQoc3RhdGUsIGVtaXQpfVxuICAgICAgJHtjYXJkKHN0YXRlLCBlbWl0KX1cbiAgICAgICR7c3RhdGUuZWRpdGluZ09iamVjdCgpID8gZWRpdE1vZGFsKHN0YXRlLCBlbWl0KSA6IG51bGx9XG4gICAgPC9tYWluPmA7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1haW5WaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuY29uc3QgdXVpZCA9IHJlcXVpcmUoJ3V1aWQvdjEnKTtcblxuY29uc3Qge3NlbGVjdE9wdGlvbiwgY2hlY2tCb3gsIGdldFBhdGh9ID0gcmVxdWlyZSgnLi91dGlsJyk7XG5jb25zdCB7Y29uZGl0aW9ufSA9IHJlcXVpcmUoJy4vZm9ybS9pZkNvbXBvbmVudHMnKTtcblxuY29uc3QgYmVoYXZpb3JPYmpzID0ge1xuICAgICdqdW1wVG8nOiB7J2p1bXBUbyc6IG51bGx9LFxuICAgICdpZic6IHsnaWYnOiB7XG4gICAgICAgIFwiY29uZGl0aW9uXCI6IFtdLFxuICAgICAgICBcImFjdGlvblwiOiBudWxsLFxuICAgICAgICBcImVsc2VcIjogbnVsbFxuICAgIH19LFxuICAgICdjbGlja0VsZW1lbnQnOiB7J2NsaWNrRWxlbWVudCc6IG51bGx9LFxuICAgICdzZXRUcnV0aCc6IHsnc2V0VHJ1dGgnOiAnJ30sXG4gICAgJ3JlbW92ZVRydXRoJzogeydyZW1vdmVUcnV0aCc6ICcnfSxcbiAgICAnZ29Ub05leHRDYXJkJzogeydnb1RvTmV4dENhcmQnOiAnc3RhY2snLCAnd3JhcCc6IHRydWV9LFxuICAgICdnb1RvUHJldmlvdXNDYXJkJzogeydnb1RvUHJldmlvdXNDYXJkJzogJ3N0YWNrJywgJ3dyYXAnOiB0cnVlfSxcbiAgICAnbGlua1RvJzogeydsaW5rVG8nOiAnJ30sXG4gICAgJ3BsYXlTb3VuZCc6IHsncGxheVNvdW5kJzogJyd9LFxufTtcblxuY29uc3QgYmVoYXZpb3JPcGVyYXRpb25zID0ge1xuICAgICdqdW1wVG8nOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgbGV0IHdoZXJlVG8gPSBwYXJzZUludChiZWhhdk9iai5qdW1wVG8pO1xuICAgICAgICBpZiAoTnVtYmVyLmlzSW50ZWdlcih3aGVyZVRvKSkge1xuICAgICAgICAgICAgc3RhdGUubmV4dENhcmQgPSB3aGVyZVRvO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2hlcmVUbyA9IHN0YXRlLmNhcmRzLmZpbmRJbmRleChcbiAgICAgICAgICAgICAgICAoY2QpID0+IGNkLm5hbWUgPT09IGJlaGF2T2JqLmp1bXBUb1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmICh3aGVyZVRvID49IDApIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5uZXh0Q2FyZCA9IHdoZXJlVG87XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgIH0sXG4gICAgJ3NldFRydXRoJzogZnVuY3Rpb24oc3RhdGUsIGVtaXQsIGJlaGF2T2JqKSB7XG4gICAgICAgIHN0YXRlLnRydXRoc1tiZWhhdk9iai5zZXRUcnV0aF0gPSB0cnVlO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgZW1pdCgnc2F2ZScpO1xuICAgICAgICB9LCAxKTtcbiAgICB9LFxuICAgICdyZW1vdmVUcnV0aCc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBkZWxldGUgc3RhdGUudHJ1dGhzW2JlaGF2T2JqLnJlbW92ZVRydXRoXTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgIGVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSxcbiAgICAnZ29Ub05leHRDYXJkJzogZnVuY3Rpb24oc3RhdGUsIGVtaXQsIGJlaGF2T2JqKSB7XG4gICAgICAgIGlmIChiZWhhdk9iai5nb1RvTmV4dENhcmQgPT0gJ2JnJykge1xuICAgICAgICAgICAgbGV0IHdpdGhJbmRleCA9IHN0YXRlLmNhcmRzLm1hcCgoY2QsIGluZCkgPT4gT2JqZWN0LmFzc2lnbih7fSwgY2QsIHtpbmRleDogaW5kfSkpO1xuICAgICAgICAgICAgbGV0IHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgY2QuaW5kZXggPiBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCkgJiZcbiAgICAgICAgICAgICAgICAgICAgY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKCFzYW1lc2llcy5sZW5ndGggJiYgYmVoYXZPYmoud3JhcCkge1xuICAgICAgICAgICAgICAgIHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgICAgIGNkLmluZGV4IDwgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNhbWVzaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gc2FtZXNpZXNbMF0uaW5kZXg7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvTmV4dENhcmQnLCAhIWJlaGF2T2JqLndyYXApLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2dvVG9QcmV2aW91c0NhcmQnOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgaWYgKGJlaGF2T2JqLmdvVG9QcmV2aW91c0NhcmQgPT0gJ2JnJykge1xuICAgICAgICAgICAgbGV0IHdpdGhJbmRleCA9IHN0YXRlLmNhcmRzLm1hcCgoY2QsIGluZCkgPT4gT2JqZWN0LmFzc2lnbih7fSwgY2QsIHtpbmRleDogaW5kfSkpO1xuICAgICAgICAgICAgbGV0IHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgY2QuaW5kZXggPCBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCkgJiZcbiAgICAgICAgICAgICAgICAgICAgY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKCFzYW1lc2llcy5sZW5ndGggJiYgYmVoYXZPYmoud3JhcCkge1xuICAgICAgICAgICAgICAgIHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgICAgIGNkLmluZGV4ID4gc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNhbWVzaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gc2FtZXNpZXNbc2FtZXNpZXMubGVuZ3RoIC0gMV0uaW5kZXg7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvUHJldkNhcmQnLCAhIWJlaGF2T2JqLndyYXApLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2xpbmtUbyc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGlua3lwb28gPSBuZXcgVVJMKGJlaGF2T2JqLmxpbmtUbyk7XG4gICAgICAgICAgICBpZiAoWydodHRwOicsJ2h0dHBzOicsJ2RhdDonXS5pbmNsdWRlcyhsaW5reXBvby5wcm90b2NvbCkpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHdpbmRvdy5sb2NhdGlvbiA9IGxpbmt5cG9vLmhyZWYsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIC8vIG5vdCBhIHVybCB5YXlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXlTb3VuZCc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBjb25zdCBzaG91dGluZyA9IGh0bWxgPGF1ZGlvIHNyYz1cIi9pbWcvJHtiZWhhdk9iai5wbGF5U291bmR9XCIgYXV0b3BsYXkgLz5gO1xuICAgICAgICBzaG91dGluZy5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAgIHNob3V0aW5nLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2hvdXRpbmcpO1xuICAgICAgICB9KTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzaG91dGluZyk7XG4gICAgfVxufTtcblxuY29uc3QgYmVoYXZpb3JDb21wb25lbnRzID0gcmVxdWlyZSgnLi9mb3JtL2JlaGF2aW9yc1RvQ29tcG9uZW50cycpO1xuXG4vKlxuR2l2ZW4gYSBiZWhhdkFyciB0aGF0IGxvb2tzIHNvbWV0aGluZyBsaWtlOiBbXG4gICAge1xuICAgICAgICBcInNldFRydXRoXCI6IFwiaGFzVGVzdGVkT3RoZXJGaWVsZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwiaWZcIjoge1xuICAgICAgICAgICAgXCJjb25kaXRpb25cIjogW3tcIm90aGVyRmllbGRcIjogXCJ5ZXNcIn1dLFxuICAgICAgICAgICAgXCJhY3Rpb25cIjoge1wianVtcFRvXCI6IDF9LFxuICAgICAgICAgICAgXCJlbHNlXCI6IHtcImp1bXBUb1wiOiAwfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwianVtcFRvXCI6IDBcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJkZXN0cm95VHJ1dGhcIjogXCJoYXNUZXN0ZWRPdGhlckZpZWxkXCJcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJ1cmxcIjogXCJkYXQ6Ly8zMmEuLi40NGVcIiAvLyBvciBodHRwLCB0aGF0J3Mgbm90IHRoZSBwb2ludFxuICAgIH1cbl1cbnBhcnNlQW5kUnVuQmVoYXZpb3JzIHdpbGwgdGFrZSBlYWNoIGluIG9yZGVyLCByZWFkIHRoZW0gdG8gc2VlIGhvdyBpdCBzaG91bGQgYWx0ZXJcbmEgZ2l2ZW4gc3RhdGUgaGFzaCwgYW5kIHRoZW4gZG8gc28sIHNvbWV0aW1lcyBieSBmaXJpbmcgZXZlbnRzIHdpdGggYSBnaXZlbiBlbWl0XG5mdW5jdGlvbi5cblxuU29tZSBtb3JlIGhhaXJzIG9uIHRoZSBiZWhhdkFyciBvYmplY3Qgc3ludGF4OlxuXG5pZjoge1xuICAgIGNvbmRpdGlvbjogWyduYW1lT2ZBVHJ1dGgnLCAnbmFtZU9mQW5vdGhlclRydXRoJ10sXG4gICAgY29uZGl0aW9uOiBbJ3RydXRoMScsIHsnb3RoZXJGaWVsZCc6ICd5ZXMnfSwgJ3RydXRoMiddLFxuICAgIGNvbmRpdGlvbjogWyd0cnV0aDMnLCB7J290aGVyRmllbGQnOiB7Z3Q6IDUsIGx0ZTogMzB9fSwgeydmaWZ0aEZpZWxkJzoge2NvbnRhaW5zOiAnbyd9fV0sXG4gICAgLy8gYWxsIHdvcmtcblxuICAgIGNvbmRpdGlvbjoge1wib3JcIjogW3snbmFtZSc6ICdkYXZlJ30sIHsnam9iJzogJ2phbml0b3InfV19IC8vIGdvZXMgb2ZmIGZvciBhbGwgZGF2ZXMgYW5kIGphbml0b3JzXG4gICAgY29uZGl0aW9uOiB7XCJvclwiOiBbeyduYW1lJzogJ2RhdmUnfSwgeyduYW1lJzogJ2ppbSd9XX0sIC8vIGJvdGggbmFtZXNcbiAgICBjb25kaXRpb246IHtcIm9yXCI6IFsndHJ1dGgxJywgJ3RydXRoMiddfSAvLyBlaXRoZXIgdHJ1dGguIHlvdSBjYW4gc3RpbGwgbWl4IGFuIG9iaiBpbiwgdG9vXG59XG5cbkFsc28geW91IGNhbiBqdW1wVG8gYSBjYXJkIGJ5IG5hbWU6IHsgJ2p1bXBUbyc6ICdhcnRodXInIH1cbiAqL1xuY29uc3Qge2V2YWxDb25kaXRpb259ID0gcmVxdWlyZSgnLi9mb3JtL2lmTG9naWMnKTtcblxuY29uc3QgcGFyc2VBbmRSdW5CZWhhdmlvcnMgPSBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZBcnIpIHtcblxuICAgIGNvbnN0IGRvQmVoYXZpb3IgPSAoYmVoYXZPYmopID0+IHtcbiAgICAgICAgaWYgKGJlaGF2T2JqID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYmVoYXZPYmpbJ2lmJ10pIHtcbiAgICAgICAgICAgIGlmIChldmFsQ29uZGl0aW9uKHN0YXRlLCBiZWhhdk9ialsnaWYnXS5jb25kaXRpb24pKSB7XG4gICAgICAgICAgICAgICAgZG9CZWhhdmlvcihiZWhhdk9ialsnaWYnXS5hY3Rpb24pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYmVoYXZPYmpbJ2lmJ11bJ2Vsc2UnXSkge1xuICAgICAgICAgICAgICAgICAgICBkb0JlaGF2aW9yKGJlaGF2T2JqWydpZiddWydlbHNlJ10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChiZWhhdk9iai5zY2hlZHVsZSkge1xuICAgICAgICAgICAgc3RhdGUuY2FyZFNjaGVkdWxlZCA9IHNldFRpbWVvdXQoXG4gICAgICAgICAgICAgICAgKCkgPT4gYmVoYXZPYmouc2NoZWR1bGUuZm9yRWFjaChkb0JlaGF2aW9yKSxcbiAgICAgICAgICAgICAgICBiZWhhdk9iai5zZWNvbmRzICogMTAwMFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIGFoIGJ1dCB3ZSBkb24ndCBrbm93IHRoaXMgYmVoYXZpb3IgaXMgY2FyZC1sZXZlbFxuICAgICAgICAgICAgLy8gYnV0IGFueXdheSB0aGF0J3Mge3NjaGVkdWxlOiBbYmVoYXYsIGJlaGF2Li4uXSwgc2Vjb25kczogbnVtfVxuICAgICAgICB9IGVsc2UgaWYgKGJlaGF2T2JqLmNsaWNrRWxlbWVudCkge1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGJlaGF2T2JqLmNsaWNrRWxlbWVudDtcbiAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpO1xuICAgICAgICAgICAgY29uc3QgYW55T25DYXJkID0gY2FyZC5lbGVtZW50cy5maWx0ZXIoKGVsbSkgPT4gZWxtLm5hbWUgPT0gbmFtZSk7XG4gICAgICAgICAgICBpZiAoYW55T25DYXJkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGFueU9uQ2FyZFswXS5iZWhhdmlvci5mb3JFYWNoKGRvQmVoYXZpb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiZyA9IHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYW55T25CZyA9IGJnLmVsZW1lbnRzLmZpbHRlcigoZWxtKSA9PiBlbG0ubmFtZSA9PSBuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoYW55T25CZy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgYW55T25CZ1swXS5iZWhhdmlvci5mb3JFYWNoKGRvQmVoYXZpb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG1hZ2ljS2V5ID0gT2JqZWN0LmtleXMoYmVoYXZpb3JPcGVyYXRpb25zKS5maW5kKChrZXkpID0+XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoYmVoYXZPYmopLmluY2x1ZGVzKGtleSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBiZWhhdmlvck9wZXJhdGlvbnNbbWFnaWNLZXldLmNhbGwobnVsbCwgc3RhdGUsIGVtaXQsIGJlaGF2T2JqKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBiZWhhdkFyci5mb3JFYWNoKGRvQmVoYXZpb3IpO1xuICAgIC8vIFByb21pc2UuZWFjaChiZWhhdkFycixcbiAgICAvLyAgKGJlaGF2T2JqLCBiZWhhdkluZGV4KSA9PiBkb0JlaGF2aW9yKGJlaGF2T2JqLCBiZWhhdkluZGV4KVxuICAgIC8vIClcbn1cblxuY29uc3QgYmVoYXZpb3IgPSBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgcGF0aCkge1xuICAgIGNvbnN0IHNhZmV0eVBhdGggPSBbXS5jb25jYXQocGF0aCk7XG4gICAgY29uc3QgYmVoYXYgPSBnZXRQYXRoKHN0YXRlLCBzYWZldHlQYXRoKTtcblxuICAgIGxldCBiZWhhdlR5cGU7XG5cbiAgICBpZiAodHlwZW9mIGJlaGF2ID09PSAndW5kZWZpbmVkJyB8fCBiZWhhdiA9PSBudWxsKSB7XG4gICAgICAgIGJlaGF2VHlwZSA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgd2hhdFdlR290ID0gT2JqZWN0LmtleXMoYmVoYXYpO1xuICAgICAgICBpZiAoIXdoYXRXZUdvdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGJlaGF2VHlwZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHlwZXMgPSBPYmplY3Qua2V5cyhiZWhhdmlvckNvbXBvbmVudHMpO1xuICAgICAgICB0eXBlcy5mb3JFYWNoKCh0eXBlKSA9PiB7XG4gICAgICAgICAgICBpZiAod2hhdFdlR290LmluY2x1ZGVzKHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgYmVoYXZUeXBlID0gdHlwZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWVudSA9IGJlaGF2VHlwZU1lbnUoYmVoYXZUeXBlLCBzYWZldHlQYXRoLCBzZXRCZWhhdmlvclR5cGUpO1xuICAgIHJldHVybiBodG1sYDxkaXYgY2xhc3M9XCJiZWhhdmlvciAkeydiZWhhdi0nICsgYmVoYXZUeXBlfVwiPlxuICAgICAgICAke21lbnV9XG4gICAgICAgICR7YmVoYXZUeXBlID09PSAnaWYnXG4gICAgICAgICAgICA/IGlmU2hlbGwoc3RhdGUsIGVtaXQsIGJlaGF2LCBzYWZldHlQYXRoKVxuICAgICAgICAgICAgOiAoYmVoYXZUeXBlICE9PSBudWxsXG4gICAgICAgICAgICAgICAgPyBiZWhhdmlvckNvbXBvbmVudHNbYmVoYXZUeXBlXS5jYWxsKG51bGwsIHN0YXRlLCBlbWl0LCBiZWhhdiwgc2FmZXR5UGF0aClcbiAgICAgICAgICAgICAgICA6IG51bGwpfVxuICAgIDwvZGl2PmA7XG5cbiAgICBmdW5jdGlvbiBzZXRCZWhhdmlvclR5cGUocGF0aCwgdmFsdWUpIHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgYmVoYXZpb3JPYmpzW3ZhbHVlXV0pO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGlmU2hlbGwoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICR7Y29uZGl0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdlsnaWYnXS5jb25kaXRpb24sIHBhdGguY29uY2F0KFsnaWYnLCAnY29uZGl0aW9uJ10pKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDx1bCBjbGFzcz1cImJlaGF2aW9yc1wiPlxuICAgICAgICAgICAgPGxpPkRvIHRoZSBiZWhhdmlvcjpcbiAgICAgICAgICAgICAgICAke2JlaGF2aW9yKHN0YXRlLCBlbWl0LCBwYXRoLmNvbmNhdChbJ2lmJywgJ2FjdGlvbiddKSl9XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgPGxpPk90aGVyd2lzZSwgZG86XG4gICAgICAgICAgICAgICAgJHtiZWhhdmlvcihzdGF0ZSwgZW1pdCwgcGF0aC5jb25jYXQoWydpZicsICdlbHNlJ10pKX1cbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgIDwvdWw+XG4gICAgPC9kaXY+YDtcbn1cblxuZnVuY3Rpb24gYmVoYXZpb3JMaXN0KHN0YXRlLCBlbWl0LCBiZWhhdmlvcnMsIHBhdGgpIHtcbiAgICBjb25zdCByZXQgPSBodG1sYDx1bCBjbGFzcz1cImJlaGF2aW9yc1wiPlxuICAgICAgICAke2JlaGF2aW9ycy5tYXAoKGJlaGF2LCBpbmQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBodG1sYDxsaT5cbiAgICAgICAgICAgICAgJHtiZWhhdmlvcihzdGF0ZSwgZW1pdCwgcGF0aC5jb25jYXQoW2luZF0pKX1cbiAgICAgICAgICAgIDwvbGk+YDtcbiAgICAgICAgfSl9XG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJhZGQtYmVoYXZpb3JcIiBvbmNsaWNrPSR7YWRkSGFuZGxlcn0+KzwvYnV0dG9uPlxuICAgIDwvdWw+YDtcbiAgICByZXR1cm4gcmV0O1xuXG4gICAgZnVuY3Rpb24gYWRkSGFuZGxlcigpIHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgYmVoYXZpb3JzLmNvbmNhdChbbnVsbF0pXSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJlaGF2VHlwZU1lbnUoc2VsZWN0VHlwZSwgcGF0aCwgaGFuZGxlcikge1xuICAgIGNvbnN0IG9wdHMgPSBbc2VsZWN0T3B0aW9uKG51bGwsICctJywgc2VsZWN0VHlwZSldO1xuICAgIGNvbnN0IGJlaGF2aW9yS2V5cyA9IE9iamVjdC5rZXlzKGJlaGF2aW9yQ29tcG9uZW50cyk7XG5cbiAgICBmb3IgKGNvbnN0IGJlaGF2aW9yS2V5IG9mIGJlaGF2aW9yS2V5cykge1xuICAgICAgICBvcHRzLnB1c2goc2VsZWN0T3B0aW9uKGJlaGF2aW9yS2V5LCBzZWxlY3RUeXBlKSk7XG4gICAgfVxuICAgIHJldHVybiBodG1sYDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke3NlbGVjdFR5cGV9XCIgbmFtZT1cIiR7bmFtZX1cIiBvbmNoYW5nZT0keyhlKSA9PiBoYW5kbGVyKHBhdGgsIGUudGFyZ2V0LnZhbHVlKX0+XG4gICAgICAgICR7b3B0c31cbiAgICA8L3NlbGVjdD5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtwYXJzZUFuZFJ1bkJlaGF2aW9ycywgYmVoYXZpb3IsIGJlaGF2VHlwZU1lbnUsIGJlaGF2aW9yTGlzdH07XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IEltYWdlID0gcmVxdWlyZSgnLi9pbWFnZVZpZXcuanMnKTtcbmNvbnN0IEdyYXBoaWNFbGVtZW50ID0gcmVxdWlyZSgnLi9ncmFwaGljVmlldy5qcycpO1xuY29uc3QgRWxlbWVudCA9IHJlcXVpcmUoJy4vZWxlbWVudFZpZXcuanMnKTtcbmNvbnN0IEZpZWxkID0gcmVxdWlyZSgnLi9maWVsZFZpZXcuanMnKTtcblxuXG5jb25zdCBiZ1ZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBjb25zdCBiZyA9IHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kKCk7XG4gICAgcmV0dXJuIGh0bWxgPHNlY3Rpb24gaWQ9XCJiZ1wiPlxuICAgICAgICAke2RyYXdJbWFnZXMoKX1cbiAgICAgICAgJHtkcmF3RWxlbWVudHMoKX1cbiAgICAgICAgJHtkcmF3RmllbGRzKCl9XG4gICAgPC9zZWN0aW9uPmA7XG5cbiAgICBmdW5jdGlvbiBkcmF3SW1hZ2VzKCkge1xuICAgICAgICBpZiAoYmcgJiYgYmcuaW1hZ2VzKSB7XG4gICAgICAgICAgICByZXR1cm4gYmcuaW1hZ2VzLm1hcCgoZWxtLCBpbmQpID0+XG4gICAgICAgICAgICAgICAgSW1hZ2UoZWxtLCBpbmQsIHN0YXRlLCBlbWl0KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHRtbGA8ZGl2IGlkPVwiYmctbm8taW1hZ2VzXCI+PC9kaXY+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3RWxlbWVudHMoKSB7XG4gICAgICAgIGlmIChiZyAmJiBiZy5lbGVtZW50cykge1xuICAgICAgICAgICAgcmV0dXJuIGJnLmVsZW1lbnRzLm1hcCgoYnV0LCBpbmQpID0+XG4gICAgICAgICAgICAgICAgRWxlbWVudChidXQsIGluZCwgc3RhdGUsIGVtaXQpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBodG1sYDxzcGFuIGNsYXNzPVwiYmctbm8tZWxlbWVudHNcIj48L3NwYW4+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3RmllbGRzKCkge1xuICAgICAgICBpZiAoYmcgJiYgYmcuZmllbGRzKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoYmcuZmllbGRzKS5tYXAoZmxkTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZpZWxkV2l0aFZhbHVlTWF5YmUgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICAgICAgICAgICAgICB7fSxcbiAgICAgICAgICAgICAgICAgICAgYmcuZmllbGRzW2ZsZE5hbWVdLFxuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpLnZhbHVlc1tmbGROYW1lXSB8fCBcIlwiIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiBGaWVsZChmaWVsZFdpdGhWYWx1ZU1heWJlLCBmbGROYW1lLCBzdGF0ZSwgZW1pdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHRtbGA8c3BhbiBjbGFzcz1cImJnLW5vLWZpZWxkc1wiPjwvc3Bhbj5gO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYmdWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCBJbWFnZSA9IHJlcXVpcmUoJy4vaW1hZ2VWaWV3LmpzJyk7XG5jb25zdCBHcmFwaGljRWxlbWVudCA9IHJlcXVpcmUoJy4vZ3JhcGhpY1ZpZXcuanMnKTtcbmNvbnN0IEVsZW1lbnQgPSByZXF1aXJlKCcuL2VsZW1lbnRWaWV3LmpzJyk7XG5jb25zdCBGaWVsZCA9IHJlcXVpcmUoJy4vZmllbGRWaWV3LmpzJyk7XG5cblxuY29uc3QgY2FyZFZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBjb25zdCBjYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmQoKTtcbiAgICByZXR1cm4gaHRtbGA8YXJ0aWNsZSBpZD1cImNhcmRcIj5cbiAgICAgICAgJHtkcmF3SW1hZ2VzKCl9XG4gICAgICAgICR7ZHJhd0VsZW1lbnRzKCl9XG4gICAgICAgICR7ZHJhd0ZpZWxkcygpfVxuICAgIDwvYXJ0aWNsZT5gO1xuXG4gICAgZnVuY3Rpb24gZHJhd0ltYWdlcygpIHtcbiAgICAgICAgaWYgKGNhcmQgJiYgY2FyZC5pbWFnZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBjYXJkLmltYWdlcy5tYXAoKGVsbSwgaW5kKSA9PlxuICAgICAgICAgICAgICAgIEltYWdlKGVsbSwgaW5kLCBzdGF0ZSwgZW1pdCwgdHJ1ZSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0bWxgPGRpdiBpZD1cImNhcmQtbm8taW1hZ2VzXCI+PC9kaXY+YFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYXdFbGVtZW50cygpIHtcbiAgICAgICAgaWYgKGNhcmQgJiYgY2FyZC5lbGVtZW50cykge1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQuZWxlbWVudHMubWFwKChidXQsIGluZCkgPT5cbiAgICAgICAgICAgICAgICBFbGVtZW50KGJ1dCwgaW5kLCBzdGF0ZSwgZW1pdCwgdHJ1ZSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0bWxgPHNwYW4gaWQ9XCJjYXJkLW5vLWVsZW1lbnRzXCI+PC9zcGFuPmBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3RmllbGRzKCkge1xuICAgICAgICBpZiAoY2FyZCAmJiBjYXJkLmZpZWxkcykge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNhcmQuZmllbGRzKS5tYXAoKGZsZE5hbWUpID0+XG4gICAgICAgICAgICAgICAgRmllbGQoY2FyZC5maWVsZHNbZmxkTmFtZV0sIGZsZE5hbWUsIHN0YXRlLCBlbWl0LCB0cnVlKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHRtbGA8c3BhbiBpZD1cImNhcmQtbm8tZmllbGRzXCI+PC9zcGFuPmBcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNhcmRWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoXCJjaG9vL2h0bWxcIik7XG5cbmNvbnN0IHtzZWxlY3RPcHRpb259ID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxuY29uc3QgZWRpdEJhclZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBjb25zdCBpc0JnID0gc3RhdGUuZWRpdGluZ0JhY2tncm91bmQoKTtcbiAgICBjb25zdCBlY2tzID0gaHRtbGA8YSBocmVmPVwiI1wiIG9uY2xpY2s9JHsoKSA9PiBlbWl0KCd0dXJuT2ZmRWRpdE1vZGUnKX0+PC9hPmA7XG4gICAgZWNrcy5pbm5lckhUTUwgPSAnJnRpbWVzOyc7XG5cbiAgICByZXR1cm4gaHRtbGA8bmF2IGlkPVwiZWRpdGJhclwiPlxuICAgICAgPGFzaWRlIGNsYXNzPVwicmVhZG91dFwiPlxuICAgICAgICBEYW5ueSAwLjEg8J+RpvCfj748YnIgLz5cbiAgICAgICAgJHtpc0JnXG4gICAgICAgICAgICA/IGh0bWxgPHNwYW4+QmcgJHtzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KCl9IG9mICR7c3RhdGUuZ2V0QmFja2dyb3VuZENvdW50KCl9PC9zcGFuPmBcbiAgICAgICAgICAgIDogaHRtbGA8c3Bhbj5DYXJkICR7c3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpfSBvZiAke3N0YXRlLmdldENhcmRDb3VudCgpfTwvc3Bhbj5gXG4gICAgICAgIH1cbiAgICAgIDwvYXNpZGU+XG5cbiAgICAgIDx1bD5cbiAgICAgICAgPGxpPkNyZWF0ZSBuZXc6XG4gICAgICAgIDxidXR0b24gb25jbGljaz0keygpID0+IHtlbWl0KCduZXdFbGVtZW50Jyk7cmV0dXJuIGZhbHNlfX0+RWxlbWVudDwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3SW1hZ2UnKTtyZXR1cm4gZmFsc2V9fT5JbWFnZTwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3RmllbGQnKTtyZXR1cm4gZmFsc2V9fT5GaWVsZDwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3QmcnKTtyZXR1cm4gZmFsc2V9fT5CYWNrZ3JvdW5kPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gb25jbGljaz0keygpID0+IHtlbWl0KCduZXdDYXJkJyk7cmV0dXJuIGZhbHNlfX0+Q2FyZDwvYnV0dG9uPjwvbGk+XG4gICAgICAgIDxsaSBjbGFzcz1cImJnbW9kZVwiPjxhIGhyZWY9XCIjXCIgb25jbGljaz0keygpID0+IGVtaXQoXCJlZGl0QmdNb2RlXCIpfT5cbiAgICAgICAgICAgICR7aXNCZyA/ICdDYXJkJyA6ICdCYWNrZ3JvdW5kJ30gbW9kZVxuICAgICAgICA8L2E+PC9saT5cbiAgICAgICAgPGxpPjxhIGhyZWY9XCIjXCIgb25jbGljaz0keygpID0+IGVtaXQoaXNCZyA/ICdlZGl0QmcnIDonZWRpdENhcmQnKX0+XG4gICAgICAgICAgICBFZGl0ICR7aXNCZyA/ICdiYWNrZ3JvdW5kJyA6ICdjYXJkJ31cbiAgICAgICAgPC9hPjwvbGk+XG4gICAgICAgIDxsaT48YSBocmVmPVwiI1wiIG9uY2xpY2s9JHsoKSA9PiBlbWl0KFwiZWRpdFN0YWNrXCIpfT5FZGl0IHN0YWNrPC9hPjwvbGk+XG4gICAgICAgIDxsaSBjbGFzcz1cImNsb3NlXCI+JHtlY2tzfTwvbGk+XG4gICAgICA8L3VsPlxuICAgICAgJHtzdGF0ZS5hZGRpbmdJbWFnZSA/IGRyb3BJbWFnZSgpIDogXCJcIn1cbiAgICA8L25hdj5gO1xuXG4gICAgZnVuY3Rpb24gZHJvcEltYWdlKCkge1xuICAgICAgICBlbWl0KCdlbnN1cmVTdGF0aWNGaWxlTGlzdHMnKTtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGZvcm0gaWQ9XCJhZGRpbWFnZVwiPlxuICAgICAgICAgICAgQ2hvb3NlIG9yIGRyb3A6IDxpbnB1dCB0eXBlPVwiZmlsZVwiXG4gICAgICAgICAgICAgIG9uY2hhbmdlPSR7ZSA9PiBlbWl0KFwiYWRkSW1hZ2VcIiwgZSl9XG4gICAgICAgICAgICAgIGNsYXNzPVwiJHtzdGF0ZS5ob3ZlcmluZ0ltYWdlID8gXCJkcm9waG92ZXJcIiA6IFwiXCJ9XCIgLz5cbiAgICAgICAgICAgIE9yIHNlbGVjdCBleGlzdGluZzpcbiAgICAgICAgICAgIDxzZWxlY3QgbmFtZT1cImV4aXN0aW5nSW1hZ2VcIiBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KFwiYWRkSW1hZ2VcIiwgZSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgbnVsbCl9XG4gICAgICAgICAgICAgICAgJHtzdGF0ZS5zdGF0aWNGaWxlcyAmJiBzdGF0ZS5zdGF0aWNGaWxlcy5tYXAoKGZpbGUpID0+IHNlbGVjdE9wdGlvbihmaWxlKSl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgb25jbGljaz0ke2NhbmNlbEltYWdlfSBzdHlsZT1cInBhZGRpbmctbGVmdDoxMnJlbTtjb2xvcjpyZWQ7XCI+Q2FuY2VsPC9hPlxuICAgICAgICA8L2Zvcm0+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYW5jZWxJbWFnZSgpIHtcbiAgICAgICAgc3RhdGUuYWRkaW5nSW1hZ2UgPSBmYWxzZTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KFwicmVuZGVyXCIpLCAxKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVkaXRCYXJWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoXCJjaG9vL2h0bWxcIik7XG5cbmNvbnN0IGVsZW1lbnRTdHlsZVZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2VsZW1lbnRTdHlsZVZpZXcuanNcIik7XG5jb25zdCBpbWFnZVN0eWxlVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vaW1hZ2VTdHlsZVZpZXcuanNcIik7XG5jb25zdCBmaWVsZFN0eWxlVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vZmllbGRTdHlsZVZpZXcuanNcIik7XG5jb25zdCBlZGl0QmVoYXZpb3JWaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9lZGl0QmVoYXZpb3JWaWV3LmpzXCIpO1xuY29uc3QgZmllbGRCZWhhdmlvclZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2VkaXRCZWhhdmlvclZpZXcuanNcIik7XG5cbmNvbnN0IGNhcmRTdHlsZVZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2NhcmRTdHlsZVZpZXcuanNcIik7XG5jb25zdCBiZ1N0eWxlVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vYmdTdHlsZVZpZXcuanNcIik7XG5cbmNvbnN0IHN0YWNrQ29tYm9WaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9zdGFja0NvbWJvVmlldy5qc1wiKTtcblxuY29uc3Qgd2hpY2hWaWV3TWF0cml4ID0ge1xuICAgIHN0eWxlOiB7XG4gICAgICAgIGVsZW1lbnQ6IGVsZW1lbnRTdHlsZVZpZXcsXG4gICAgICAgIGZpZWxkOiBmaWVsZFN0eWxlVmlldyxcbiAgICAgICAgaW1hZ2U6IGltYWdlU3R5bGVWaWV3LFxuICAgICAgICBjYXJkOiBjYXJkU3R5bGVWaWV3LFxuICAgICAgICBiZzogYmdTdHlsZVZpZXcsXG4gICAgICAgIHN0YWNrOiBzdGFja0NvbWJvVmlld1xuICAgIH0sXG4gICAgZnVuY3Rpb246IHtcbiAgICAgICAgZWxlbWVudDogZWRpdEJlaGF2aW9yVmlldyxcbiAgICAgICAgZmllbGQ6IGZpZWxkQmVoYXZpb3JWaWV3LFxuICAgICAgICBpbWFnZTogZWRpdEJlaGF2aW9yVmlldyxcbiAgICAgICAgY2FyZDogZWRpdEJlaGF2aW9yVmlldyxcbiAgICAgICAgYmc6IGVkaXRCZWhhdmlvclZpZXcsXG4gICAgICAgIHN0YWNrOiBzdGFja0NvbWJvVmlld1xuICAgIH1cbn07XG5cbmNvbnN0IGVkaXRNb2RhbFZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBsZXQgd2hpY2g7XG4gICAgaWYgKHN0YXRlLmVkaXRpbmdFbGVtZW50KSB7XG4gICAgICAgIHdoaWNoID0gXCJlbGVtZW50XCI7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5lZGl0aW5nRmllbGQpIHtcbiAgICAgICAgd2hpY2ggPSBcImZpZWxkXCI7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5lZGl0aW5nSW1hZ2UpIHtcbiAgICAgICAgd2hpY2ggPSBcImltYWdlXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdQYXRoWzBdID09ICdjYXJkcycpIHtcbiAgICAgICAgICAgIHdoaWNoID0gXCJjYXJkXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT0gJ2JhY2tncm91bmRzJykge1xuICAgICAgICAgICAgd2hpY2ggPSBcImJnXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT0gJ3N0YWNrJykge1xuICAgICAgICAgICAgd2hpY2ggPSBcInN0YWNrXCI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBlY2tzID0gaHRtbGA8YSBjbGFzcz1cImNsb3NlXCIgaHJlZj1cIiNcIiBvbmNsaWNrPSR7KCkgPT4gZW1pdCgnY2xvc2VFZGl0Jyl9PjwvYT5gO1xuICAgIGVja3MuaW5uZXJIVE1MID0gJyZ0aW1lczsnO1xuXG4gICAgY29uc3QgbW9kYWwgPSBodG1sYDxzZWN0aW9uIGlkPVwiZWRpdG1vZGFsXCI+PGRpdiBjbGFzcz1cInNjcm9sbHlcIj5cbiAgICAgICR7ZWNrc31cblxuICAgICAgJHt3aGljaCA9PSAnc3RhY2snXG4gICAgICAgID8gbnVsbFxuICAgICAgICA6IGh0bWxgPHVsIGlkPVwiZWRpdE1vZGFsVGFic1wiPlxuICAgICAgICAgICAgPGxpIGNsYXNzPVwiJHtzdGF0ZS5lZGl0aW5nRnVuY3Rpb24gPyBcIlwiIDogXCJoaWxpdGVkXCJ9XCJcbiAgICAgICAgICAgICAgICBvbmNsaWNrPSR7KCkgPT4gdG9nZ2xlRnVuY3Rpb25FZGl0KCdzdHlsZScpfT5cbiAgICAgICAgICAgICAgICBTdHlsZVxuICAgICAgICAgICAgPC9saT48bGkgY2xhc3M9XCIke3N0YXRlLmVkaXRpbmdGdW5jdGlvbiA/IFwiaGlsaXRlZFwiIDogXCJcIn1cIlxuICAgICAgICAgICAgICAgIG9uY2xpY2s9JHsoKSA9PiB0b2dnbGVGdW5jdGlvbkVkaXQoKX0+XG4gICAgICAgICAgICAgICAgQmVoYXZpb3JcbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgPC91bD5gfVxuXG4gICAgICAke3N0YXRlLmVkaXRpbmdGdW5jdGlvblxuICAgICAgICAgID8gd2hpY2hWaWV3TWF0cml4LmZ1bmN0aW9uW3doaWNoXS5jYWxsKG51bGwsIHN0YXRlLCBlbWl0KVxuICAgICAgICAgIDogd2hpY2hWaWV3TWF0cml4LnN0eWxlW3doaWNoXS5jYWxsKG51bGwsIHN0YXRlLCBlbWl0KX1cbiAgICA8L2Rpdj48L3NlY3Rpb24+YDtcbiAgICAvLyBzZXRUaW1lb3V0KCgpID0+XG4gICAgLy8gICAgIG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJ2Rpdi5zY3JvbGx5Jykuc3R5bGUuaGVpZ2h0ID0gbW9kYWwuY2xpZW50SGVpZ2h0ICsgJ3B4JyxcbiAgICAvLyAxKTtcbiAgICByZXR1cm4gbW9kYWw7XG5cbiAgICBmdW5jdGlvbiB0b2dnbGVGdW5jdGlvbkVkaXQod2hlcmUgPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IGlzaXRvbiA9IHN0YXRlLmVkaXRpbmdGdW5jdGlvbjtcbiAgICAgICAgaWYgKChpc2l0b24gJiYgd2hlcmUgPT0gJ3N0eWxlJykgfHwgKCFpc2l0b24gJiYgd2hlcmUgPT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgIGVtaXQoJ3RvZ2dsZUZ1bmN0aW9uRWRpdCcpO1xuICAgICAgICB9IC8vIGkgZG9uJ3Qga25vdywgaXMgdGhhdCBkdW1iP1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZWRpdE1vZGFsVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IGNvbW1vbm1hcmsgPSByZXF1aXJlKCdjb21tb25tYXJrJyk7XG5cbmNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9yc30gPSByZXF1aXJlKCcuL2JlaGF2aW9yLmpzJyk7XG5cblxuY29uc3QgZW5zdXJlU3R5bGVQaXhlbHMgPSAodmFsKSA9PiB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT0gJ251bWJlcicgPyB2YWwgKyAncHgnIDogdmFsO1xufVxuXG5jb25zdCBlbGVtZW50VmlldyA9IChlbGVtZW50LCBpbmRleCwgc3RhdGUsIGVtaXQsIGlzQ2FyZCkgPT4ge1xuICAgIGNvbnN0IGF0dHJzID0ge1xuICAgICAgICBoZWlnaHQ6IGVuc3VyZVN0eWxlUGl4ZWxzKGVsZW1lbnQuaGVpZ2h0KSxcbiAgICAgICAgd2lkdGg6IGVuc3VyZVN0eWxlUGl4ZWxzKGVsZW1lbnQud2lkdGgpLFxuICAgICAgICB0b3A6IGVuc3VyZVN0eWxlUGl4ZWxzKGVsZW1lbnQudG9wKSxcbiAgICAgICAgbGVmdDogZW5zdXJlU3R5bGVQaXhlbHMoZWxlbWVudC5sZWZ0KSxcbiAgICAgICAgJ2JhY2tncm91bmQtY29sb3InOiBlbGVtZW50LmNvbG9yLFxuICAgICAgICAnZm9udC1mYW1pbHknOiBlbGVtZW50LmZvbnQsXG4gICAgICAgICdmb250LXNpemUnOiBlbGVtZW50LnNpemUsXG4gICAgICAgIGNvbG9yOiBlbGVtZW50LnRleHRDb2xvclxuICAgIH07IC8vIHRoaXMgZGF0YSBtdW5nZSBzdGVwIG1heSBiZWxvbmcgaW4gYSBzdG9yZT9cbiAgICBsZXQgZWxlbWVudFN0eWxlcyA9IE9iamVjdC5rZXlzKGF0dHJzKS5tYXAoKGtleSkgPT4gKGtleSArICc6JyArIGF0dHJzW2tleV0gKyAnOycpKS5qb2luKCcnKTtcbiAgICBpZiAoZWxlbWVudC5zdHlsZSkge1xuICAgICAgICBlbGVtZW50U3R5bGVzICs9IGVsZW1lbnQuc3R5bGU7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50LmFsdEtleSB8fFxuICAgICAgICAgICAgKHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnICYmIGlzQ2FyZCkgfHxcbiAgICAgICAgICAgIChzdGF0ZS5lZGl0TW9kZSA9PT0gJ2JnRWRpdCcgJiYgIWlzQ2FyZClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBlZGl0RWxlbWVudCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYmVoYXZpb3IgJiYgZWxlbWVudC5iZWhhdmlvci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcnNlQW5kUnVuQmVoYXZpb3JzKHN0YXRlLCBlbWl0LCBlbGVtZW50LmJlaGF2aW9yKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBsZXQgZWxtO1xuICAgIGlmIChpc0RyYWdnYWJsZSgpKSB7XG4gICAgICAgIGVsbSA9IGh0bWxgPGRpdiBjbGFzcz1cImVsZW1lbnQgbW92YWJsZSAke2VsZW1lbnRDbGFzc2VzKCl9XCJcbiAgICAgICAgICAgIG9uY2xpY2s9JHsoZSkgPT4gZWRpdE1vZGVDbGljayhlKX1cbiAgICAgICAgICAgIG9ubW91c2Vkb3duPSR7KGUpID0+IG1vdXNlRG93bihlKX1cbiAgICAgICAgICAgIG9ubW91c2VsZWF2ZT0keyhlKSA9PiBtb3VzZUxlYXZlKGUpfVxuICAgICAgICAgICAgb25tb3VzZXVwPSR7KGUpID0+IG1vdXNlVXAoZSl9XG4gICAgICAgICAgICBzdHlsZT1cIiR7ZWxlbWVudFN0eWxlc31cIj48L2Rpdj5gO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsbSA9IGh0bWxgPGRpdiBjbGFzcz1cImVsZW1lbnQgJHtlbGVtZW50Q2xhc3NlcygpfVwiXG4gICAgICAgICAgb25jbGljaz0ke2NsaWNrSGFuZGxlcn1cbiAgICAgICAgICBzdHlsZT1cIiR7ZWxlbWVudFN0eWxlc31cIj48L2Rpdj5gO1xuICAgIH1cbiAgICBlbG0uaW5uZXJIVE1MID0gcmVuZGVyTWFya2Rvd24oZWxlbWVudC50ZXh0KTtcbiAgICBpZiAoaXNEcmFnZ2FibGUoKSB8fCAhZWxlbWVudC5oaWRkZW4pIHtcbiAgICAgICAgcmV0dXJuIGVsbTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG5cbiAgICBmdW5jdGlvbiBlbGVtZW50Q2xhc3NlcygpIHtcbiAgICAgICAgY29uc3Qga2xhc3MgPSBbXTtcbiAgICAgICAgaWYgKGVsZW1lbnQuYmVoYXZpb3IgJiYgZWxlbWVudC5iZWhhdmlvci5sZW5ndGggJiYgIXN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBrbGFzcy5wdXNoKCdiZWhhdmVzLW9uLWNsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQuaGlkZGVuKSB7XG4gICAgICAgICAgICBrbGFzcy5wdXNoKCdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgICAgICBrbGFzcy5wdXNoKGVsZW1lbnQuY2xhc3MpO1xuICAgICAgICByZXR1cm4ga2xhc3Muam9pbignICcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbmRlck1hcmtkb3duKHR4dCkge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgY29tbW9ubWFyay5QYXJzZXIoKTtcbiAgICAgICAgY29uc3Qgd3JpdGVyID0gbmV3IGNvbW1vbm1hcmsuSHRtbFJlbmRlcmVyKHtzYWZlOiB0cnVlfSk7XG4gICAgICAgIHJldHVybiB3cml0ZXIucmVuZGVyKHJlYWRlci5wYXJzZSh0eHQpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0RWxlbWVudCgpIHtcbiAgICAgICAgZW1pdCgnZWRpdEVsZW1lbnQnLCBbZWxlbWVudCwgaW5kZXgsIGlzQ2FyZF0pO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RyYWdnYWJsZSgpIHtcbiAgICAgICAgaWYgKGlzQ2FyZCkge1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZS5lZGl0TW9kZSA9PT0gJ2JnRWRpdCc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZWRpdE1vZGVDbGljayhldnQpIHtcbiAgICAgICAgY29uc3QgW3N0YXJ0WCwgc3RhcnRZXSA9IHN0YXRlLm1vdXNlRG93bjtcbiAgICAgICAgaWYgKE1hdGguYWJzKGV2dC5zY3JlZW5YIC0gc3RhcnRYKSA8IDEwICYmIE1hdGguYWJzKGV2dC5zY3JlZW5ZIC0gc3RhcnRZKSA8IDEwKSB7XG4gICAgICAgICAgICBlZGl0RWxlbWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VEb3duKGV2dCkge1xuICAgICAgICBlbWl0KCdzdGFydERyYWcnLCBbZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLCBldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFksIGV2dC50YXJnZXRdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZUxlYXZlKGV2dCkge1xuICAgICAgICBpZiAoc3RhdGUuZHJhZ0luZm8gfHwgc3RhdGUucmVzaXplSW5mbykge1xuICAgICAgICAgICAgY29uc3QgeWVySW5mbyA9IHN0YXRlLmRyYWdJbmZvID8gc3RhdGUuZHJhZ0luZm8gOiBzdGF0ZS5yZXNpemVJbmZvO1xuICAgICAgICAgICAgaWYgKHllckluZm8udGFyZ2V0ID09IGV2dC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZVVwKGV2dCkge1xuICAgICAgICBlbWl0KCdmaW5pc2hEcmFnJywgW1xuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyAnbW92ZUVsZW1lbnQnIDogJ3Jlc2l6ZUVsZW1lbnQnLFxuICAgICAgICAgICAgZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLmxlZnQgOiBldnQudGFyZ2V0LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLnRvcCA6IGV2dC50YXJnZXQuc3R5bGUuaGVpZ2h0LFxuICAgICAgICAgICAgaW5kZXhcbiAgICAgICAgXSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50VmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3RvUHh9ID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxuY29uc3QgZmllbGRWaWV3ID0gKGZpZWxkLCBuYW1lLCBzdGF0ZSwgZW1pdCwgaXNDYXJkKSA9PiB7XG4gICAgbGV0IGZsZDtcbiAgICBpZiAoZmllbGQudHlwZSA9PSAnc2VsZWN0Jykge1xuICAgICAgICBmbGQgPSBodG1sYDxzZWxlY3QgbmFtZT1cIiR7ZmllbGQubmFtZX1cIlxuICAgICAgICAgICAgb25jaGFuZ2U9XCIkeyhldnQpID0+IGVtaXQoJ2ZpZWxkY2hhbmdlJywgZXZ0LCBmaWVsZCl9XCJcbiAgICAgICAgICAgIGNsYXNzPVwiJHtmaWVsZENsYXNzZXMoKX1cIiAvPlxuICAgICAgICAgICAgJHtmaWVsZC5vcHRpb25zLm1hcCgob3B0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGVkID0gb3B0ID09PSBmaWVsZC52YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJzxvcHRpb24gdmFsdWU9XCInICsgb3B0ICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgIChzZWxlY3RlZCA/ICcgc2VsZWN0ZWQ9XCJzZWxlY3RlZFwiJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICc+JyArIG9wdCArICc8L29wdGlvbj4nXG4gICAgICAgICAgICB9KX1cbiAgICAgICAgPC9zZWxlY3Q+YDtcbiAgICB9IGVsc2UgaWYgKGZpZWxkLnR5cGUgPT0gJ3JhZGlvJyB8fCBmaWVsZC50eXBlID09ICdjaGVja2JveCcpIHtcbiAgICAgICAgLy8gbm90aGluZyByaWdodCBub3cgbXIuIGhlcm1hblxuICAgIH0gZWxzZSBpZiAoZmllbGQudHlwZSA9PSAndGV4dGFyZWEnIHx8IHRvUHgoZmllbGQuaGVpZ2h0KSA+IE1hdGgubWF4KGZpZWxkLnNpemUsIDE1KSkge1xuICAgICAgICBmbGQgPSBodG1sYDx0ZXh0YXJlYSBuYW1lPVwiJHtmaWVsZC5uYW1lfVwiXG4gICAgICAgICAgICB3cmFwPVwidmlydHVhbFwiXG4gICAgICAgICAgICBvbmtleWRvd249XCJcIlxuICAgICAgICAgICAgb25rZXl1cD0keyhldnQpID0+IHtlbWl0KCdmaWVsZEtleVVwJywgW2V2dCwgZmllbGRdKX19XG4gICAgICAgICAgICBvbmtleXByZXNzPVwiXCJcbiAgICAgICAgICAgIG9uY2hhbmdlPVwiJHsoZXZ0KSA9PiBlbWl0KCdmaWVsZGNoYW5nZScsIFtldnQsIGZpZWxkXSl9XCJcbiAgICAgICAgICAgIGNsYXNzPVwiJHtmaWVsZENsYXNzZXMoKX1cIlxuICAgICAgICAgICAgc3R5bGU9XCIke2ZpZWxkU3R5bGVzKCl9XCI+JHtmaWVsZC52YWx1ZX08L3RleHRhcmVhPmA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZmxkID0gaHRtbGA8aW5wdXQgdHlwZT1cIiR7ZmllbGQudHlwZSA/IGZpZWxkLnR5cGUgOiAndGV4dCd9XCJcbiAgICAgICAgICAgIG5hbWU9XCIke2ZpZWxkLm5hbWV9XCJcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiJHtmaWVsZC5wbGFjZWhvbGRlcn1cIlxuICAgICAgICAgICAgdmFsdWU9XCIke2ZpZWxkLnZhbHVlfVwiXG4gICAgICAgICAgICBvbmtleWRvd249JHsoZXZ0KSA9PiBlbWl0KCdmaWVsZEtleURvd24nLCBbZXZ0LCBmaWVsZF0pfVxuICAgICAgICAgICAgb25rZXl1cD0keyhldnQpID0+IGVtaXQoJ2ZpZWxkS2V5VXAnLCBbZXZ0LCBmaWVsZF0pfVxuICAgICAgICAgICAgb25rZXlwcmVzcz0keyhldnQpID0+IGVtaXQoJ2ZpZWxkS2V5UHJlc3MnLCBbZXZ0LCBmaWVsZF0pfVxuICAgICAgICAgICAgb25jaGFuZ2U9XCIkeyhldnQpID0+IGVtaXQoJ2ZpZWxkY2hhbmdlJywgW2V2dCwgZmllbGRdKX1cIlxuICAgICAgICAgICAgY2xhc3M9XCIke2ZpZWxkQ2xhc3NlcygpfVwiXG4gICAgICAgICAgICBzdHlsZT1cIiR7ZmllbGRTdHlsZXMoKX1cIiAvPlxuICAgICAgICBgO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuZWRpdE1vZGUpIHtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGRpdiBjbGFzcz1cImZpZWxkc2hpbSAke2ZpZWxkQ2xhc3NlcygpfVwiXG4gICAgICAgICAgICAgICAgc3R5bGU9XCIke2ZpZWxkU3R5bGVzKCl9XCJcbiAgICAgICAgICAgICAgICBvbmNsaWNrPSR7KGUpID0+IGVkaXRNb2RlQ2xpY2soZSl9XG4gICAgICAgICAgICAgICAgb25tb3VzZWRvd249JHsoZSkgPT4gbW91c2VEb3duKGUpfVxuICAgICAgICAgICAgICAgIG9ubW91c2VsZWF2ZT0keyhlKSA9PiBtb3VzZUxlYXZlKGUpfVxuICAgICAgICAgICAgICAgIG9ubW91c2V1cD0keyhlKSA9PiBtb3VzZVVwKGUpfT5cbiAgICAgICAgICAgIDxwPiR7ZmllbGQubmFtZX08L3A+XG4gICAgICAgICAgICA8YXNpZGU+VmFsdWU6IDxzcGFuPiR7ZmllbGQudmFsdWV9PC9zcGFuPjwvYXNpZGU+XG4gICAgICAgIDwvZGl2PmA7XG4gICAgfVxuICAgIGlmIChpc0RyYWdnYWJsZSgpIHx8ICFmaWVsZC5oaWRkZW4pIHtcbiAgICAgICAgcmV0dXJuIGZsZDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG5cbiAgICBmdW5jdGlvbiBjbGlja0hhbmRsZXIoZXZ0KSB7XG4gICAgICAgIGlmIChldnQuYWx0S2V5IHx8IChzdGF0ZS5lZGl0TW9kZSAmJiBpc0RyYWdnYWJsZSgpKSkge1xuICAgICAgICAgICAgZW1pdCgnZWRpdEZpZWxkJywgW2ZpZWxkLCBuYW1lLCBpc0NhcmRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKCkge1xuICAgICAgICBpZiAoaXNDYXJkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWVsZFN0eWxlcygpIHtcbiAgICAgICAgbGV0IHN0ZWV6ID0ge1xuICAgICAgICAgICAgdG9wOiBmaWVsZC50b3AsXG4gICAgICAgICAgICBsZWZ0OiBmaWVsZC5sZWZ0LFxuICAgICAgICAgICAgaGVpZ2h0OiBmaWVsZC5oZWlnaHQsXG4gICAgICAgICAgICB3aWR0aDogZmllbGQud2lkdGgsXG4gICAgICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IGZpZWxkLmNvbG9yLFxuICAgICAgICAgICAgJ2ZvbnQtZmFtaWx5JzogZmllbGQuZm9udCxcbiAgICAgICAgICAgICdmb250LXNpemUnOiBmaWVsZC5zaXplLFxuICAgICAgICAgICAgJ2ZvbnQtc3R5bGUnOiBmaWVsZC5zdHlsZSxcbiAgICAgICAgICAgIGNvbG9yOiBmaWVsZC50ZXh0Q29sb3JcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBzdGVlei5oZWlnaHQgPSB0b1B4KGZpZWxkLmhlaWdodCkgPj0gNDAgPyBzdGVlei5oZWlnaHQgOiAnNDBweCc7XG4gICAgICAgICAgICBzdGVlei53aWR0aCA9IHRvUHgoZmllbGQud2lkdGgpID49IDQwID8gc3RlZXoud2lkdGggOiAnNDBweCc7XG4gICAgICAgICAgICBpZiAoIXN0ZWV6WydiYWNrZ3JvdW5kLWNvbG9yJ10pIHtcbiAgICAgICAgICAgICAgICBzdGVlelsnYmFja2dyb3VuZC1jb2xvciddID0gJyNkZGQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGVleikubWFwKChrZXkpID0+IChrZXkgKyAnOicgKyBzdGVleltrZXldICsgJzsnKSkuam9pbignJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmllbGRDbGFzc2VzKCkge1xuICAgICAgICBjb25zdCBrbGFzcyA9IFtdO1xuICAgICAgICBpZiAoaXNEcmFnZ2FibGUoKSkge1xuICAgICAgICAgICAga2xhc3MucHVzaCgnbW92YWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaWVsZC5oaWRkZW4pIHtcbiAgICAgICAgICAgIGtsYXNzLnB1c2goJ2hpZGRlbicpO1xuICAgICAgICB9XG4gICAgICAgIGtsYXNzLnB1c2goZmllbGRbJ2NsYXNzJ10pO1xuICAgICAgICByZXR1cm4ga2xhc3Muam9pbignICcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVkaXRNb2RlQ2xpY2soZXZ0KSB7XG4gICAgICAgIGNvbnN0IFtzdGFydFgsIHN0YXJ0WV0gPSBzdGF0ZS5tb3VzZURvd247XG4gICAgICAgIGlmIChNYXRoLmFicyhldnQuc2NyZWVuWCAtIHN0YXJ0WCkgPCAxMCAmJiBNYXRoLmFicyhldnQuc2NyZWVuWSAtIHN0YXJ0WSkgPCAxMCkge1xuICAgICAgICAgICAgZW1pdCgnZWRpdEZpZWxkJywgW2ZpZWxkLCBuYW1lLCBpc0NhcmRdKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdXNlRG93bihldnQpIHtcbiAgICAgICAgZW1pdCgnc3RhcnREcmFnJywgW2V2dC5zY3JlZW5YLCBldnQuc2NyZWVuWSwgZXZ0Lm9mZnNldFgsIGV2dC5vZmZzZXRZLCBldnQudGFyZ2V0XSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VMZWF2ZShldnQpIHtcbiAgICAgICAgaWYgKHN0YXRlLmRyYWdJbmZvIHx8IHN0YXRlLnJlc2l6ZUluZm8pIHtcbiAgICAgICAgICAgIGNvbnN0IHllckluZm8gPSBzdGF0ZS5kcmFnSW5mbyA/IHN0YXRlLmRyYWdJbmZvIDogc3RhdGUucmVzaXplSW5mbztcbiAgICAgICAgICAgIGlmICh5ZXJJbmZvLnRhcmdldCA9PSBldnQudGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPSBudWxsO1xuICAgICAgICAgICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VVcChldnQpIHtcbiAgICAgICAgZW1pdCgnZmluaXNoRHJhZycsIFtcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gJ21vdmVGaWVsZCcgOiAncmVzaXplRmllbGQnLFxuICAgICAgICAgICAgZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLmxlZnQgOiBldnQudGFyZ2V0LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLnRvcCA6IGV2dC50YXJnZXQuc3R5bGUuaGVpZ2h0LFxuICAgICAgICAgICAgbmFtZVxuICAgICAgICBdKTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZmllbGRWaWV3O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ29Ub05leHRDYXJkOiByZXF1aXJlKCcuL2dvVG9OZXh0Q2FyZENvbXBvbmVudCcpLFxuICAgIGdvVG9QcmV2aW91c0NhcmQ6IHJlcXVpcmUoJy4vZ29Ub1ByZXZpb3VzQ2FyZENvbXBvbmVudCcpLFxuICAgICdpZic6IG51bGwsIC8vIGhlcmUgdG8gYmUgY291bnRlZCwgYnV0IG5vdCBhY3R1YWxseSBoYW5kbGVkIGJ5IGEgc2VwLiBjb21wb25lbnRcbiAgICBjbGlja0VsZW1lbnQ6IHJlcXVpcmUoJy4vY2xpY2tFbGVtZW50Q29tcG9uZW50JyksXG4gICAganVtcFRvOiByZXF1aXJlKCcuL2p1bXBUb0NvbXBvbmVudCcpLFxuICAgIHJlbW92ZVRydXRoOiByZXF1aXJlKCcuL3JlbW92ZVRydXRoQ29tcG9uZW50JyksXG4gICAgc2V0VHJ1dGg6IHJlcXVpcmUoJy4vc2V0VHJ1dGhDb21wb25lbnQnKSxcbiAgICBsaW5rVG86IHJlcXVpcmUoJy4vbGlua1RvQ29tcG9uZW50JyksXG4gICAgcGxheVNvdW5kOiByZXF1aXJlKCcuL3BsYXlTb3VuZENvbXBvbmVudCcpXG59O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbmNvbnN0IGNhcmRTdHlsZVZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgbGV0IGJnID0gc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmQoKTtcbiAgbGV0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ2VudlByb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgJHtmaWVsZEZvcignbmFtZScsJ05hbWUnKX1cbiAgICAgIDxwPjxsYWJlbCBmb3I9XCJjb2xvclwiPkNvbG9yPC9sYWJlbD48YnIgLz5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgIG5hbWU9XCJjb2xvclwiXG4gICAgICAgICAgdmFsdWU9XCIke2JnLmNvbG9yIHx8ICcjRkZGRkZGJ31cIiAvPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7XG4gICAgICAgICAgICBlbWl0KCdlbnZQcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiAnY29sb3InLCB2YWx1ZTogJyd9fSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH19PlxuICAgICAgICAgIENsZWFyXG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9wPlxuICAgIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIiR7YXR0TmFtZX1cIj4ke2Rpc3BsYXlOYW1lfTwvbGFiZWw+PGJyIC8+XG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgIG5hbWU9XCIke2F0dE5hbWV9XCJcbiAgICAgIHZhbHVlPVwiJHtiZ1thdHROYW1lXX1cIiAvPlxuICAgIDwvcD5gO1xuICB9XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY2FyZFN0eWxlVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5jb25zdCBjYXJkU3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBjYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmQoKTtcbiAgbGV0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ2VudlByb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgJHtmaWVsZEZvcignbmFtZScsJ05hbWUnKX1cbiAgICAgIDxwPjxsYWJlbCBmb3I9XCJjb2xvclwiPkNvbG9yPC9sYWJlbD48YnIgLz5cbiAgICAgICAgIDxpbnB1dCB0eXBlPVwiY29sb3JcIlxuICAgICAgICAgICBvbmNoYW5nZT0ke2NoYW5nZUhhbmRsZXJ9XG4gICAgICAgICAgIG5hbWU9XCJjb2xvclwiXG4gICAgICAgICAgIHZhbHVlPVwiJHtjYXJkLmNvbG9yIHx8ICcjRkZGRkZGJ31cIiAvPlxuICAgICAgIDxidXR0b24gb25jbGljaz0keygpID0+IHtcbiAgICAgICAgICAgZW1pdCgnZW52UHJvcGVydHlDaGFuZ2UnLCB7dGFyZ2V0OiB7bmFtZTogJ2NvbG9yJywgdmFsdWU6ICcnfX0pO1xuICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgfX0+XG4gICAgICAgICBDbGVhclxuICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9wPlxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIENhcmQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIiR7YXR0TmFtZX1cIj4ke2Rpc3BsYXlOYW1lfTwvbGFiZWw+PGJyIC8+XG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgIG5hbWU9XCIke2F0dE5hbWV9XCJcbiAgICAgIHZhbHVlPVwiJHtjYXJkW2F0dE5hbWVdfVwiIC8+XG4gICAgPC9wPmA7XG4gIH1cblxuICBmdW5jdGlvbiBkZWxldGVIYW5kbGVyKCkge1xuICAgICAgaWYgKHdpbmRvdy5jb25maXJtKFwiU2VyaW91c2x5PyAoVGhlcmUncyBubyBVbmRvIHlldClcIikpIHtcbiAgICAgICAgICBlbWl0KCdkZWxldGVDYXJkJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjYXJkU3R5bGVWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBjbGlja0VsZW1lbnQoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgY29uc3QgY2FyZCA9IHN0YXRlLmdldEN1cnJlbnRDYXJkKCk7XG4gICAgY29uc3QgYmcgPSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZCgpO1xuXG4gICAgY29uc3QgbmFtZWRFbG1zID0gZWxtc1dpdGhOYW1lKGNhcmQpLmNvbmNhdChlbG1zV2l0aE5hbWUoYmcpKTtcblxuICAgIHJldHVybiBodG1sYDxkaXY+XG4gICAgICAgIDxzZWN0aW9uPmRvIHRoZSBCZWhhdmlvciBvZiB0aGUgZWxlbWVudCBuYW1lZFxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwiZWxlbWVudFRvQ2xpY2tcIlxuICAgICAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J2NsaWNrRWxlbWVudCc6IGUudGFyZ2V0LnZhbHVlfV0pfT5cbiAgICAgICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIGJlaGF2LmNsaWNrRWxlbWVudCA9PT0gbnVsbCwgLTEpfVxuICAgICAgICAgICAgICAgICR7bmFtZWRFbG1zLm1hcCgobmFtZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0T3B0aW9uKG5hbWUsIGJlaGF2LmNsaWNrRWxlbWVudClcbiAgICAgICAgICAgICAgICApfVxuICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xuXG4gICAgZnVuY3Rpb24gZWxtc1dpdGhOYW1lKGVudikge1xuICAgICAgICByZXR1cm4gZW52LmVsZW1lbnRzLmZpbHRlcigoZWxtKSA9PlxuICAgICAgICAgICAgdHlwZW9mIGVsbS5uYW1lICE9PSAndW5kZWZpbmVkJyAmJiBlbG0ubmFtZSAhPT0gJydcbiAgICAgICAgKS5tYXAoKGVsbSkgPT4gZWxtLm5hbWUpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjbGlja0VsZW1lbnQ7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9ycywgYmVoYXZpb3JMaXN0LCBiZWhhdmlvcn0gPSByZXF1aXJlKCcuLi9iZWhhdmlvcicpO1xuY29uc3Qge2dldFBhdGh9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmNvbnN0IGVkaXRCZWhhdmlvclZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgY29uc3QgdGhpbmcgPSBzdGF0ZS5nZXRFZGl0ZWRPYmplY3QoKTtcbiAgY29uc3Qga2lja29mZkRlc2NyaXB0b3IgPSBbJ2NhcmQnLCdiYWNrZ3JvdW5kJ10uaW5jbHVkZXMoc3RhdGUuZ2V0RWRpdGVkT2JqZWN0VHlwZSgpKVxuICAgID8gJ2Fycml2YWwnXG4gICAgOiAnY2xpY2snO1xuICAvLyB0aGlzIGlzIGJhZCBidXQgd2hhdGV2ZXJcblxuICByZXR1cm4gaHRtbGA8Zm9ybT5cbiAgICA8ZGl2Pk9uICR7a2lja29mZkRlc2NyaXB0b3J9LFxuXG4gICAgJHt0aGluZy5iZWhhdmlvciAmJiB0aGluZy5iZWhhdmlvci5sZW5ndGhcbiAgICAgICAgPyBiZWhhdmlvckxpc3Qoc3RhdGUsIGVtaXQsIHRoaW5nLmJlaGF2aW9yLCBzdGF0ZS5lZGl0aW5nUGF0aC5jb25jYXQoWydiZWhhdmlvciddKSlcbiAgICAgICAgOiBodG1sYDx1bCBjbGFzcz1cImJlaGF2aW9yc1wiPlxuICAgICAgICAgICAgPGxpPiR7YmVoYXZpb3Ioc3RhdGUsIGVtaXQsIHN0YXRlLmVkaXRpbmdQYXRoLmNvbmNhdChbJ2JlaGF2aW9yJywgMF0pKX08L2xpPlxuICAgICAgICA8L3VsPmBcbiAgICB9XG5cbiAgICA8L2Rpdj5cbiAgICA8ZGl2IHN0eWxlPVwiY29sb3I6IHJlZDsgZm9udC1mYW1pbHk6IEhlbHZldGljYSxzYW5zXCI+XG4gICAgICBDdXJyZW50IHRydXRoczpcbiAgICAgIDx1bD5cbiAgICAgICAgJHtPYmplY3Qua2V5cyhzdGF0ZS50cnV0aHMpLm1hcCgodGgpID0+IGh0bWxgPGxpPiR7dGh9PC9saT5gKX1cbiAgICAgIDwvdWw+XG4gICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7cGFyc2VBbmRSdW5CZWhhdmlvcnMoc3RhdGUsIGVtaXQsIHRoaW5nLmJlaGF2aW9yKTtyZXR1cm4gZmFsc2V9fT5UZXN0IGJlaGF2aW9yPC9idXR0b24+XG4gICAgPC9kaXY+XG4gIDwvZm9ybT5gO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVkaXRCZWhhdmlvclZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IHtzZWxlY3RPcHRpb24sIGNoZWNrQm94fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBlbGVtZW50U3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBlbG0gPSBzdGF0ZS5nZXRFZGl0ZWRPYmplY3QoKTtcbiAgbGV0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ3Byb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgJHtmaWVsZEZvcignbmFtZScsJ05hbWUnKX1cbiAgICAgIDx0YWJsZT5cbiAgICAgICAgPHRyPlxuICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ3RvcCcsJ1RvcCcpfTwvdGQ+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcignbGVmdCcsJ0xlZnQnKX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcignaGVpZ2h0JywnSGVpZ2h0Jyl9PC90ZD5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCd3aWR0aCcsJ1dpZHRoJyl9PC90ZD5cbiAgICAgICAgPC90cj5cbiAgICAgICAgPHRyPlxuICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICA8cD48bGFiZWwgZm9yPVwiY29sb3JcIj5Db2xvcjwvbGFiZWw+PGJyIC8+XG4gICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY29sb3JcIlxuICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgICAgICAgICBuYW1lPVwiY29sb3JcIlxuICAgICAgICAgICAgICAgIHZhbHVlPVwiJHtlbG0uY29sb3IgfHwgJyMzMzMzMzMnfVwiIC8+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7Y2xlYXJIYW5kbGVyRm9yKCdjb2xvcicpfT5cbiAgICAgICAgICAgICAgICAgIENsZWFyXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgIDxwPjxsYWJlbCBmb3I9XCJ0ZXh0Q29sb3JcIj5UZXh0IENvbG9yPC9sYWJlbD48YnIgLz5cbiAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgICAgICAgIG5hbWU9XCJ0ZXh0Q29sb3JcIlxuICAgICAgICAgICAgICAgIHZhbHVlPVwiJHtlbG0udGV4dENvbG9yIHx8ICcjMDAwMDAwJ31cIiAvPlxuICAgICAgICAgICAgICAgIDxidXR0b24gb25jbGljaz0ke2NsZWFySGFuZGxlckZvcigndGV4dENvbG9yJyl9PlxuICAgICAgICAgICAgICAgICAgIENsZWFyXG4gICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8L3RkPlxuICAgICAgICA8L3RyPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ2ZvbnQnLCdGb250Jyl9PC90ZD5cbiAgICAgICAgICA8dGQ+JHtmaWVsZEZvcignc2l6ZScsJ0ZvbnQgU2l6ZScpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgPC90YWJsZT5cblxuICAgICAgPHA+PGxhYmVsIGZvcj1cInRleHRcIj5UZXh0PC9sYWJlbD5cbiAgICAgICh5b3UgY2FuIHVzZSBtb3N0IG9mIDxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwOi8vY29tbW9ubWFyay5vcmcvaGVscC9cIj5NYXJrZG93bjwvYT4pPGJyIC8+XG4gICAgICA8dGV4dGFyZWEgY2xhc3M9XCJlbG10ZXh0XCIgd3JhcD1cInZpcnR1YWxcIlxuICAgICAgICBvbmNoYW5nZT0ke2NoYW5nZUhhbmRsZXJ9XG4gICAgICAgIG5hbWU9XCJ0ZXh0XCI+JHtlbG0udGV4dCB8fCAnJ308L3RleHRhcmVhPlxuICAgICAgPC9wPlxuXG4gICAgICAke2NoZWNrQm94KCdIaWRkZW4nLCBlbG0uaGlkZGVuLFxuICAgICAgICAoZSkgPT4gZW1pdCgncHJvcGVydHlDaGFuZ2UnLCB7dGFyZ2V0OntuYW1lOidoaWRkZW4nLHZhbHVlOiBlLnRhcmdldC5jaGVja2VkfX0pKX1cblxuICAgICAgJHtmaWVsZEZvcignY2xhc3MnLCdDbGFzcycpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEVsZW1lbnQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIiR7YXR0TmFtZX1cIj4ke2Rpc3BsYXlOYW1lfTwvbGFiZWw+PGJyIC8+XG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgIG5hbWU9XCIke2F0dE5hbWV9XCJcbiAgICAgIHZhbHVlPVwiJHtlbG1bYXR0TmFtZV19XCIgLz5cbiAgICA8L3A+YDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFySGFuZGxlckZvcihwcm9wTmFtZSwgYnV0dG9ueSA9IHRydWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0KCdwcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiBwcm9wTmFtZSwgdmFsdWU6ICcnfX0pO1xuICAgICAgaWYgKGJ1dHRvbnkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUVsZW1lbnQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50U3R5bGVWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9uLCBjaGVja0JveH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgZmllbGRTdHlsZVZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgbGV0IGZsZCA9IHN0YXRlLmdldEVkaXRlZE9iamVjdCgpO1xuICBsZXQgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgncHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgICAke2ZpZWxkRm9yKCduYW1lJywnTmFtZScpfVxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcigndG9wJywnVG9wJyl9PC90ZD5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdsZWZ0JywnTGVmdCcpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdoZWlnaHQnLCdIZWlnaHQnKX08L3RkPlxuICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ3dpZHRoJywnV2lkdGgnKX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgIDwvdGFibGU+XG4gICAgICA8cD48bGFiZWwgZm9yPVwidHlwZVwiPlR5cGU8L2xhYmVsPjxiciAvPlxuICAgICAgICA8c2VsZWN0IG5hbWU9XCJ0eXBlXCIgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfT5cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdUZXh0JywgZmxkLnR5cGUpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ01lbnUnLCBmbGQudHlwZSl9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9wPlxuICAgICAgJHtmbGQudHlwZT09PSdNZW51JyA/IG9wdGlvbnNGaWVsZCgpIDogbnVsbH1cblxuICAgICAgJHtjaGVja0JveCgnSGlkZGVuJywgZmxkLmhpZGRlbixcbiAgICAgICAgKGUpID0+IGVtaXQoJ3Byb3BlcnR5Q2hhbmdlJywge3RhcmdldDp7bmFtZTonaGlkZGVuJyx2YWx1ZTogZS50YXJnZXQuY2hlY2tlZH19KSl9XG5cbiAgICAgICR7ZmllbGRGb3IoJ2NsYXNzJywnQ2xhc3MnKX1cblxuICAgICAgPGRpdiBzdHlsZT1cInRleHQtYWxpZ246Y2VudGVyXCI+XG4gICAgICAgIDxidXR0b24gb25jbGljaz0ke2RlbGV0ZUhhbmRsZXJ9PkRlbGV0ZSBGaWVsZDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9mb3JtPmA7XG5cbiAgZnVuY3Rpb24gZmllbGRGb3IoYXR0TmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICByZXR1cm4gaHRtbGA8cD48bGFiZWwgZm9yPVwiJHthdHROYW1lfVwiPiR7ZGlzcGxheU5hbWV9PC9sYWJlbD48YnIgLz5cbiAgICA8aW5wdXQgdHlwZT1cInRleHRcIlxuICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgbmFtZT1cIiR7YXR0TmFtZX1cIlxuICAgICAgdmFsdWU9XCIke2ZsZFthdHROYW1lXSB8fCAnJ31cIiAvPlxuICAgIDwvcD5gO1xuXG4gIH1cblxuICBmdW5jdGlvbiBkZWxldGVIYW5kbGVyKCkge1xuICAgICAgaWYgKHdpbmRvdy5jb25maXJtKFwiU2VyaW91c2x5PyAoVGhlcmUncyBubyBVbmRvIHlldClcIikpIHtcbiAgICAgICAgICBlbWl0KCdkZWxldGVGaWVsZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gb3B0aW9uc0ZpZWxkKCkge1xuICAgIHJldHVybiBodG1sYDxwPjxsYWJlbCBmb3I9XCJvcHRpb25zXCI+T3B0aW9uczwvbGFiZWw+PGJyIC8+XG4gICAgICA8dGV4dGFyZWEgbmFtZT1cIm9wdGlvbnNcIiBvbmNoYW5nZT0ke29wdGlvbkhhbmRsZXJ9PiR7ZmxkLm9wdGlvbnMuam9pbihcIlxcblwiKX08L3RleHRhcmVhPlxuICAgIDwvcD5gO1xuXG4gICAgZnVuY3Rpb24gb3B0aW9uSGFuZGxlcihlKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gZS50YXJnZXQudmFsdWUuc3BsaXQoXCJcXG5cIikubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSk7XG4gICAgICBlbWl0KCdzZXRGaWVsZE9wdGlvbnMnLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZmllbGRTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5jb25zdCB7c2VsZWN0T3B0aW9uLCBjaGVja0JveH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuZnVuY3Rpb24gZ29Ub05leHRDYXJkKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIHJldHVybiBodG1sYDxkaXY+XG4gICAgICAgIDxzZWN0aW9uPlxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwiZ29Ub05leHRDYXJkXCJcbiAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLFxuICAgICAgICAgICAgICAgICAgICB7J2dvVG9OZXh0Q2FyZCc6IGUudGFyZ2V0LnZhbHVlLCAnd3JhcCc6IGJlaGF2LndyYXAgPyB0cnVlIDogZmFsc2V9XG4gICAgICAgICAgICAgICAgXSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdzdGFjaycsICdpbiB0aGUgc3RhY2snLCBiZWhhdi5nb1RvTmV4dENhcmQpfVxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdiZycsICdpbiB0aGlzIGJhY2tncm91bmQnLCBiZWhhdi5nb1RvTmV4dENhcmQpfVxuICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAke2NoZWNrQm94KCd3cmFwIGFyb3VuZCcsIGJlaGF2LndyYXAsIChlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLFxuICAgICAgICAgICAgICAgIHsnZ29Ub05leHRDYXJkJzogYmVoYXYuZ29Ub05leHRDYXJkLCAnd3JhcCc6IGUudGFyZ2V0LmNoZWNrZWR9XG4gICAgICAgICAgICBdKSl9XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdvVG9OZXh0Q2FyZDtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IHtzZWxlY3RPcHRpb24sIGNoZWNrQm94fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBnb1RvUHJldmlvdXNDYXJkKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIHJldHVybiBodG1sYDxkaXY+XG4gICAgICAgIDxzZWN0aW9uPlxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwiZ29Ub05leHRDYXJkXCJcbiAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLFxuICAgICAgICAgICAgICAgICAgICB7J2dvVG9OZXh0Q2FyZCc6IGUudGFyZ2V0LnZhbHVlLCAnd3JhcCc6IGJlaGF2LndyYXAgPyB0cnVlIDogZmFsc2V9XG4gICAgICAgICAgICAgICAgXSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdzdGFjaycsICdpbiB0aGUgc3RhY2snLCBiZWhhdi5nb1RvUHJldmlvdXNDYXJkKX1cbiAgICAgICAgICAgICAgICAke3NlbGVjdE9wdGlvbignYmcnLCAnaW4gdGhpcyBiYWNrZ3JvdW5kJywgYmVoYXYuZ29Ub1ByZXZpb3VzQ2FyZCl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICR7Y2hlY2tCb3goJ3dyYXAgYXJvdW5kJywgYmVoYXYud3JhcCwgKGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsXG4gICAgICAgICAgICAgICAgeydnb1RvTmV4dENhcmQnOiBiZWhhdi5nb1RvTmV4dENhcmQsICd3cmFwJzogZS50YXJnZXQuY2hlY2tlZH1cbiAgICAgICAgICAgIF0pKX1cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ29Ub1ByZXZpb3VzQ2FyZDtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3NlbGVjdE9wdGlvbiwgY2hlY2tCb3gsIGdldFBhdGgsIGZpZWxkc1dpdGhWYWx1ZXN9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmZ1bmN0aW9uIGNvbmRpdGlvbihzdGF0ZSwgZW1pdCwgY29uZCwgcGF0aCkge1xuICAgIGxldCBjb25qdW5jdGlvbiA9ICdhbmQnO1xuICAgIGlmIChwYXRoW3BhdGgubGVuZ3RoIC0gMV0gPT0gJ29yJykge1xuICAgICAgICBjb25qdW5jdGlvbiA9ICdvcic7XG4gICAgfVxuXG4gICAgbGV0IGNsYXVzZXM7XG4gICAgaWYgKGNvbmQubGVuZ3RoKSB7XG4gICAgICAgIGNsYXVzZXMgPSBjb25kLm1hcCgoY2xhdXNlLCBpbmRleCkgPT5cbiAgICAgICAgICAgIGh0bWxgPGRpdj5cbiAgICAgICAgICAgICAgICAke2luZGV4ID09PSAwID8gJycgOiBodG1sYDxhc2lkZT4ke2Nvbmp1bmN0aW9ufTwvYXNpZGU+YH1cbiAgICAgICAgICAgICAgICAke2NvbmRpdGlvbkNsYXVzZShzdGF0ZSwgZW1pdCwgY2xhdXNlLCBwYXRoLmNvbmNhdChbaW5kZXhdKSl9XG4gICAgICAgICAgICA8L2Rpdj5gXG4gICAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2xhdXNlcyA9IGh0bWxgPGRpdj5cbiAgICAgICAgICAgICR7Y29uZGl0aW9uQ2xhdXNlKHN0YXRlLCBlbWl0LCBudWxsLCBwYXRoLmNvbmNhdChbMF0pKX1cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgJHtjbGF1c2VzfVxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHthZGRDbGF1c2VIYW5kbGVyfT4rPC9idXR0b24+XG4gICAgPC9kaXY+YDtcblxuICAgIGZ1bmN0aW9uIGFkZENsYXVzZUhhbmRsZXIoKSB7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGNvbmQuY29uY2F0KFtudWxsXSldKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuY29uc3QgY2xhdXNlT2JqcyA9IHtcbiAgICB0cnV0aDogJycsXG4gICAgZmllbGQ6IHt9LFxuICAgIG9yOiB7J29yJzogW119XG59O1xuXG5mdW5jdGlvbiBjb25kaXRpb25DbGF1c2Uoc3RhdGUsIGVtaXQsIGNsYXVzZSwgcGF0aCkge1xuICAgIGNvbnN0IGluZGV4ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xuXG4gICAgY29uc3Qgc3ViamVjdEhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBjbGF1c2VPYmpzW2UudGFyZ2V0LnZhbHVlXV0pO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlSGFuZGxlciA9IChlKSA9PiB7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGUudGFyZ2V0LnZhbHVlXSk7XG4gICAgfVxuXG4gICAgY29uc3QgaXNOdWxsID0gY2xhdXNlID09PSBudWxsO1xuICAgIGNvbnN0IGlzVHJ1dGggPSB0eXBlb2YgY2xhdXNlID09PSAnc3RyaW5nJztcbiAgICBjb25zdCBpc0ZpZWxkID0gdHlwZW9mIGNsYXVzZSA9PT0gJ29iamVjdCcgJiYgY2xhdXNlICE9PSBudWxsICYmIHR5cGVvZiBjbGF1c2Uub3IgPT0gJ3VuZGVmaW5lZCc7XG4gICAgY29uc3Qgb3JJc1RoZXJlID0gY2xhdXNlICE9PSBudWxsICYmIHR5cGVvZiBjbGF1c2UgPT0gJ29iamVjdCcgJiYgdHlwZW9mIGNsYXVzZS5vciAhPSAndW5kZWZpbmVkJztcbiAgICBjb25zdCB1bmlmaWVkQ29tcGFyZVZhbHVlID0gaXNOdWxsID8gbnVsbCA6IChpc1RydXRoID8gJ3RydXRoJyA6IChpc0ZpZWxkID8gJ2ZpZWxkJyA6ICdvcicpKTtcblxuICAgIHJldHVybiBodG1sYDxzZWN0aW9uPlxuICAgICAgICA8c2VsZWN0IGRhdGEtcmVhbHZhbHVlPVwiJHt1bmlmaWVkQ29tcGFyZVZhbHVlfVwiIG9uY2hhbmdlPSR7c3ViamVjdEhhbmRsZXJ9PlxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24obnVsbCwgJy0nLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCd0cnV0aCcsICd0aGVyZSBpcyBhIFRydXRoIG5hbWVkJywgdW5pZmllZENvbXBhcmVWYWx1ZSl9XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbignZmllbGQnLCAndGhlIGZpZWxkIG5hbWVkJywgdW5pZmllZENvbXBhcmVWYWx1ZSl9XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbignb3InLCAnZWl0aGVyJywgdW5pZmllZENvbXBhcmVWYWx1ZSl9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAke2lzVHJ1dGhcbiAgICAgICAgICAgID8gaHRtbGA8aW5wdXQgdHlwZT1cInRleHRcIiBvbmNoYW5nZT0ke3ZhbHVlSGFuZGxlcn0gdmFsdWU9XCIke2NsYXVzZX1cIiAvPmBcbiAgICAgICAgICAgIDogbnVsbH1cbiAgICAgICAgJHtpc0ZpZWxkXG4gICAgICAgICAgICA/IGZpZWxkQ2xhdXNlKHN0YXRlLCBlbWl0LCBjbGF1c2UsIHBhdGgpXG4gICAgICAgICAgICA6IG51bGx9XG4gICAgICAgICR7b3JJc1RoZXJlXG4gICAgICAgICAgICA/IGNvbmRpdGlvbihzdGF0ZSwgZW1pdCwgY2xhdXNlLm9yLCBwYXRoLmNvbmNhdChbJ29yJ10pKVxuICAgICAgICAgICAgOiBudWxsfVxuICAgICAgICAke2luZGV4ID4gMFxuICAgICAgICAgICAgPyBodG1sYDxidXR0b24gb25jbGljaz0keyhlKSA9PiB7cmVtb3ZlQ2xhdXNlKGluZGV4KTtyZXR1cm4gZmFsc2U7fX0gY2xhc3M9XCJyZW1vdmUtY2xhdXNlXCI+LTwvYnV0dG9uPmBcbiAgICAgICAgICAgIDogbnVsbH1cbiAgICA8L3NlY3Rpb24+YDtcblxuICAgIGZ1bmN0aW9uIHJlbW92ZUNsYXVzZShpbmRleCkge1xuICAgICAgICBjb25zdCBjb25kaXRpb25QYXRoID0gcGF0aC5zbGljZSgwLCBwYXRoLmxlbmd0aCAtIDEpO1xuICAgICAgICBjb25zdCBjb25kaXRpb24gPSBnZXRQYXRoKHN0YXRlLCBjb25kaXRpb25QYXRoKTtcbiAgICAgICAgY29uZGl0aW9uLnNwbGljZShwYXRoW3BhdGgubGVuZ3RoIC0gMV0sIDEpO1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtjb25kaXRpb25QYXRoLCBjb25kaXRpb25dKTtcbiAgICAgICAgLy8gc2VlIHRoaXMga2luZGEgdGhpbmcgc2hvdWxkIGJlIGluIGEgc3RvcmVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZpZWxkQ2xhdXNlKHN0YXRlLCBlbWl0LCBjbGF1c2UsIHBhdGgpIHtcbiAgICBsZXQgZmlyc3RLZXkgPSBudWxsO1xuICAgIGxldCBjb21wYXJlT2JqID0gbnVsbDtcbiAgICBsZXQgY29tcGFyYXRvciA9IG51bGw7XG4gICAgbGV0IGNvbXBhcmVWYWx1ZSA9IG51bGw7XG4gICAgaWYgKE9iamVjdC5rZXlzKGNsYXVzZSkubGVuZ3RoKSB7XG4gICAgICAgIGZpcnN0S2V5ID0gT2JqZWN0LmtleXMoY2xhdXNlKVswXTtcbiAgICAgICAgY29tcGFyZU9iaiA9IGNsYXVzZVtmaXJzdEtleV07XG4gICAgICAgIGNvbXBhcmF0b3IgPSBjb21wYXJlT2JqID09PSBudWxsXG4gICAgICAgICAgICA/IG51bGxcbiAgICAgICAgICAgIDogT2JqZWN0LmtleXMoY29tcGFyZU9iailbMF07XG4gICAgICAgIGNvbXBhcmVWYWx1ZSA9IGNvbXBhcmVPYmogPT09IG51bGxcbiAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgOiAoY29tcGFyYXRvciA9PT0gbnVsbFxuICAgICAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgICAgIDogY29tcGFyZU9ialtjb21wYXJhdG9yXSk7XG4gICAgfVxuXG4gICAgY29uc3QgZmllbGROYW1lSGFuZGxlciA9IChlKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpZWxkT2JqID0ge307XG4gICAgICAgIGZpZWxkT2JqW2UudGFyZ2V0LnZhbHVlXSA9IGNvbXBhcmVPYmo7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGZpZWxkT2JqXSk7XG4gICAgfTtcbiAgICBjb25zdCBmaWVsZENvbXBhcmVIYW5kbGVyID0gKGUpID0+IHtcbiAgICAgICAgY29uc3QgbmV3Q29tcGFyZU9iaiA9IHt9O1xuICAgICAgICBuZXdDb21wYXJlT2JqW2UudGFyZ2V0LnZhbHVlXSA9IGNvbXBhcmVWYWx1ZTtcbiAgICAgICAgY2xhdXNlW2ZpcnN0S2V5XSA9IG5ld0NvbXBhcmVPYmo7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGNsYXVzZV0pO1xuICAgIH07XG4gICAgY29uc3QgZmllbGRWYWx1ZUhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBjb21wYXJlT2JqW2NvbXBhcmF0b3JdID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgIGNsYXVzZVtmaXJzdEtleV0gPSBjb21wYXJlT2JqO1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBjbGF1c2VdKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZmllbGRzID0gT2JqZWN0LmtleXMoZmllbGRzV2l0aFZhbHVlcyhzdGF0ZSkpO1xuICAgIGNvbnN0IHZhbHVlRm9ySW50ZXJhY3QgPSAoISFjb21wYXJlVmFsdWUgfHwgY29tcGFyZVZhbHVlID09PSAwKSA/IGNvbXBhcmVWYWx1ZSA6ICcnO1xuXG4gICAgcmV0dXJuIGh0bWxgPHNwYW4+XG4gICAgICAgIDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke2ZpcnN0S2V5fVwiIG9uY2hhbmdlPSR7ZmllbGROYW1lSGFuZGxlcn0+XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIGZpcnN0S2V5KX1cbiAgICAgICAgICAgICR7ZmllbGRzLm1hcCgoZmxkKSA9PiBzZWxlY3RPcHRpb24oZmxkLCBmaXJzdEtleSkpfVxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPHNlbGVjdCBkYXRhLXJlYWx2YWx1ZT1cIiR7Y29tcGFyYXRvcn1cIiBvbmNoYW5nZT0ke2ZpZWxkQ29tcGFyZUhhbmRsZXJ9PlxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24obnVsbCwgJy0nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdlcScsICdlcXVhbHMnLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdsdCcsICdpcyBsZXNzIHRoYW4nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdndCcsICdpcyBncmVhdGVyIHRoYW4nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdsdGUnLCAnaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvJywgY29tcGFyYXRvcil9XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbignZ3RlJywgJ2lzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0bycsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2NvbnRhaW5zJywgY29tcGFyYXRvcil9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAkeyhjb21wYXJlT2JqICYmIGNvbXBhcmF0b3IpXG4gICAgICAgICAgICA/IGh0bWxgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgb25jaGFuZ2U9JHtmaWVsZFZhbHVlSGFuZGxlcn0gdmFsdWU9XCIke3ZhbHVlRm9ySW50ZXJhY3R9XCIgLz5gXG4gICAgICAgICAgICA6IG51bGx9XG4gICAgPC9zcGFuPmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge2NvbmRpdGlvbn07XG4iLCJjb25zdCB7ZmllbGRzV2l0aFZhbHVlc30gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3Qgc2VwYXJhdGVBcnJheSA9IGZ1bmN0aW9uKGFycikge1xuICAgIGxldCBvdGhlcnMgPSBhcnIuZmlsdGVyKChpdGVtKSA9PiB0eXBlb2YgaXRlbSAhPT0gJ3N0cmluZycpO1xuICAgIHJldHVybiBbYXJyLmZpbHRlcigoaXRlbSkgPT4gdHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSwgb3RoZXJzXTtcbn07XG5cbmNvbnN0IGV2YWxUcnV0aHMgPSBmdW5jdGlvbihzdGF0ZSwgdHJ1dGhBcnIsIG9yciA9IGZhbHNlKSB7XG4gICAgaWYgKCF0cnV0aEFyci5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChvcnIpIHtcbiAgICAgICAgcmV0dXJuIHRydXRoQXJyLnNvbWUoKHRydXRoKSA9PiB0eXBlb2Ygc3RhdGUudHJ1dGhzW3RydXRoXSAhPT0gJ3VuZGVmaW5lZCcpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1dGhBcnIuZXZlcnkoKHRydXRoKSA9PiB0eXBlb2Ygc3RhdGUudHJ1dGhzW3RydXRoXSAhPT0gJ3VuZGVmaW5lZCcpO1xufTtcblxuY29uc3QgZXZhbEZpZWxkID0gZnVuY3Rpb24oc3RhdGUsIGZpZWxkTmFtZSwgY29tcGFyZWRUbykge1xuICAgIGNvbnN0IHZhbHVlID0gZmllbGRzV2l0aFZhbHVlcyhzdGF0ZSlbZmllbGROYW1lXTtcbiAgICBpZiAoT2JqZWN0LmtleXMoY29tcGFyZWRUbykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBrZXkgPSBPYmplY3Qua2V5cyhjb21wYXJlZFRvKVswXTtcbiAgICBpZiAoa2V5ID09PSAnZ3QnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA+IGNvbXBhcmVkVG9ba2V5XTtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2d0ZScpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlID49IGNvbXBhcmVkVG9ba2V5XTtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2x0Jykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPCBjb21wYXJlZFRvW2tleV07XG4gICAgfVxuICAgIGlmIChrZXkgPT09ICdsdGUnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA8PSBjb21wYXJlZFRvW2tleV07XG4gICAgfVxuICAgIGlmIChrZXkgPT09ICdlcScpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlID09IGNvbXBhcmVkVG9ba2V5XTtcbiAgICB9XG4gICAgaWYgKGtleSA9PT0gJ2NvbnRhaW5zJykge1xuICAgICAgICByZXR1cm4gdmFsdWUuaW5jbHVkZXMoY29tcGFyZWRUb1trZXldKTtcbiAgICB9XG59O1xuXG5jb25zdCBldmFsQ2xhdXNlID0gZnVuY3Rpb24oc3RhdGUsIGNvbmRPYmopIHtcbiAgICAvLyBub3cgaXQncyBvblxuICAgIGlmIChjb25kT2JqID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBpIGd1ZXNzPz8/IG1heWJlIGZsYWcgaXQgc29tZXdoZXJlIHRvIHRoZSB1c2VyXG4gICAgfVxuICAgIHJldHVybiBPYmplY3Qua2V5cyhjb25kT2JqKS5ldmVyeSgoa2V5KSA9PiB7XG4gICAgICAgIGlmIChrZXkgPT09ICdvcicpIHtcbiAgICAgICAgICAgIGxldCBbc3RyaW5ncywgb3RoZXJzXSA9IHNlcGFyYXRlQXJyYXkoY29uZE9iai5vcik7XG4gICAgICAgICAgICBpZiAob3RoZXJzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBldmFsVHJ1dGhzKHN0YXRlLCBzdHJpbmdzLCB0cnVlKSB8fCBvdGhlcnMuc29tZSgoaXRlbSkgPT4gZXZhbENsYXVzZShzdGF0ZSwgaXRlbSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZXZhbFRydXRocyhzdGF0ZSwgc3RyaW5ncywgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGNsYXVzZVJlc3VsdCA9IGV2YWxGaWVsZChzdGF0ZSwga2V5LCBjb25kT2JqW2tleV0pO1xuICAgICAgICByZXR1cm4gY2xhdXNlUmVzdWx0O1xuICAgIH0pO1xufVxuXG5jb25zdCBldmFsQ29uZGl0aW9uID0gZnVuY3Rpb24oc3RhdGUsIGNvbmRPYmosIGFueSA9IGZhbHNlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoY29uZE9iaikpIHtcbiAgICAgICAgbGV0IFtzdHJpbmdzLCBvdGhlcnNdID0gc2VwYXJhdGVBcnJheShjb25kT2JqKTtcbiAgICAgICAgaWYgKG90aGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBldmFsVHJ1dGhzKHN0YXRlLCBzdHJpbmdzKSAmJiBvdGhlcnMuZXZlcnkoKGl0ZW0pID0+IGV2YWxDbGF1c2Uoc3RhdGUsIGl0ZW0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBldmFsVHJ1dGhzKHN0YXRlLCBjb25kT2JqKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge2V2YWxDb25kaXRpb259O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7Y2hlY2tCb3h9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmNvbnN0IGltYWdlU3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gICAgbGV0IGltZyA9IHN0YXRlLmdldEVkaXRlZE9iamVjdCgpO1xuICAgIGxldCBjaGFuZ2VIYW5kbGVyID0gZXZlbnQgPT4gZW1pdChcInByb3BlcnR5Q2hhbmdlXCIsIGV2ZW50KTtcblxuICAgIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgPHRhYmxlPlxuICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoXCJ0b3BcIiwgXCJUb3BcIil9PC90ZD5cbiAgICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoXCJsZWZ0XCIsIFwiTGVmdFwiKX08L3RkPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcihcImhlaWdodFwiLCBcIkhlaWdodFwiKX08L3RkPlxuICAgICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcihcIndpZHRoXCIsIFwiV2lkdGhcIil9PC90ZD5cbiAgICAgICAgICA8L3RyPlxuICAgICAgPC90YWJsZT5cblxuICAgICAgJHtjaGVja0JveCgnSGlkZGVuJywgaW1nLmhpZGRlbixcbiAgICAgICAgKGUpID0+IGVtaXQoJ3Byb3BlcnR5Q2hhbmdlJywge3RhcmdldDp7bmFtZTonaGlkZGVuJyx2YWx1ZTogZS50YXJnZXQuY2hlY2tlZH19KSl9XG5cbiAgICAgICR7ZmllbGRGb3IoXCJjbGFzc1wiLCBcIkNsYXNzXCIpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEltYWdlPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Zvcm0+YDtcblxuICAgIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHJldHVybiBodG1sYDxwPjxsYWJlbCBmb3I9XCIke2F0dE5hbWV9XCI+JHtkaXNwbGF5TmFtZX08L2xhYmVsPjxiciAvPlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgICAgICBuYW1lPVwiJHthdHROYW1lfVwiXG4gICAgICAgICAgICAgIHZhbHVlPVwiJHtpbWdbYXR0TmFtZV0gfHwgXCJcIn1cIiAvPlxuICAgICAgICA8L3A+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWxldGVIYW5kbGVyKCkge1xuICAgICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgICAgZW1pdChcImRlbGV0ZUltYWdlXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gaW1hZ2VTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBqdW1wVG8oc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgLy8gbm9ybWFsaXppbmcgdGhlIGNyYXp5IG9mIGh0bWwgb3B0aW9ucyBhIGxpdHRsZVxuICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlSW50KGJlaGF2Lmp1bXBUbykpKSB7XG4gICAgICAgIGJlaGF2Lmp1bXBUbyA9IHBhcnNlSW50KGJlaGF2Lmp1bXBUbyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYmVoYXYuanVtcFRvID09ICdzdHJpbmcnICYmIGJlaGF2Lmp1bXBUbyA9PSAnbnVsbCcpIHtcbiAgICAgICAgYmVoYXYuanVtcFRvID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj50aGUgY2FyZCBuYW1lZCBvciBudW1iZXJlZFxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwianVtcFRvV2hhdFwiXG4gICAgICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIHsnanVtcFRvJzogZS50YXJnZXQudmFsdWV9XSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgYmVoYXYuanVtcFRvID09PSBudWxsLCAtMSl9XG4gICAgICAgICAgICAgICAgJHtzdGF0ZS5jYXJkcy5tYXAoKGNkLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQganVtcFRvVmFsID0gY2QubmFtZSB8fCBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIocGFyc2VJbnQoanVtcFRvVmFsKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGp1bXBUb1ZhbCA9IHBhcnNlSW50KGp1bXBUb1ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGVjdE9wdGlvbihqdW1wVG9WYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2QubmFtZSA/IGluZGV4ICsgXCIgLSBcIiArIGNkLm5hbWUgOiBpbmRleCksXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWhhdi5qdW1wVG8gPT09IGp1bXBUb1ZhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ganVtcFRvO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbmZ1bmN0aW9uIGxpbmtUbyhzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj50aGUgVVJMXG4gICAgICAgICAgICA8aW5wdXQgbmFtZT1cImxpbmtUb1doYXRcIlxuICAgICAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J2xpbmtUbyc6IGUudGFyZ2V0LnZhbHVlfV0pfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT1cIiR7YmVoYXYubGlua1RvfVwiIC8+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxpbmtUbztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3NlbGVjdE9wdGlvbn0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuZnVuY3Rpb24gcGxheVNvdW5kKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIGVtaXQoJ2Vuc3VyZVN0YXRpY0ZpbGVMaXN0cycpO1xuXG4gICAgY29uc3QgeW91ckJhc2ljSGFuZGxlciA9IChlKSA9PlxuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J3BsYXlTb3VuZCc6IGUudGFyZ2V0LnZhbHVlfV0pO1xuICAgIGNvbnN0IHN0YXRpY3MgPSBzdGF0ZS5zdGF0aWNGaWxlcyA/IHN0YXRlLnN0YXRpY0ZpbGVzIDogW107XG5cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj5cbiAgICAgICAgICAgIDxzbWFsbD4ocHV0IGEgV0FWLCBNUDMsIG9yIE9HRyBpbiB0aGUgPGNvZGU+L2ltZzwvY29kZT4gZm9sZGVyIGZvciBub3csIHNvcnJ5KTwvc21hbGw+PGJyIC8+XG4gICAgICAgICAgICA8c2VsZWN0IG9uY2hhbmdlPSR7eW91ckJhc2ljSGFuZGxlcn0gbmFtZT1cInBsYXlTb3VuZFwiPlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgYmVoYXYucGxheVNvdW5kKX1cbiAgICAgICAgICAgICAgICAke3N0YXRpY3MubWFwKChmaWxlbmFtZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0T3B0aW9uKGZpbGVuYW1lLCBiZWhhdi5wbGF5U291bmQpKX1cbiAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgPC9kaXY+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwbGF5U291bmQ7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuZnVuY3Rpb24gcmVtb3ZlVHJ1dGgoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+cmVtb3ZlIHRoZSBUcnV0aCBuYW1lZFxuICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwid2hhdFRydXRoXCIgdmFsdWU9XCIke2JlaGF2LnJlbW92ZVRydXRofVwiXG4gICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J3JlbW92ZVRydXRoJzogZS50YXJnZXQudmFsdWV9XSl9IC8+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlbW92ZVRydXRoO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbmZ1bmN0aW9uIHNldFRydXRoKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIHJldHVybiBodG1sYDxkaXY+XG4gICAgICAgIDxzZWN0aW9uPnNldCBhIFRydXRoIG5hbWVkXG4gICAgICAgIDxpbnB1dCB0eXBlPVwidGV4dFwiIG5hbWU9XCJ3aGF0VHJ1dGhcIiB2YWx1ZT1cIiR7YmVoYXYuc2V0VHJ1dGh9XCJcbiAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIHsnc2V0VHJ1dGgnOiBlLnRhcmdldC52YWx1ZX1dKX0gLz5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0VHJ1dGg7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuY29uc3Qgc3RhY2tDb21ib1ZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgY29uc3QgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgnc3RhY2tQcm9wZXJ0eUNoYW5nZScsIGV2ZW50KTtcbiAgY29uc3Qgc3R5bGVDb250YWluZXIgPSBodG1sYDx0ZXh0YXJlYSB3cmFwPVwidmlydHVhbFwiXG4gICAgY2xhc3M9XCJzdHlsZXNoZWV0XCJcbiAgICBvbmNoYW5nZT0keyhlKSA9PiBzZXRTdHlsZXMoZS50YXJnZXQudmFsdWUpfT4ke3N0YXRlLnN0eWxlQ2FjaGV9PC90ZXh0YXJlYT5gO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgIDxwPjxsYWJlbCBmb3I9XCJjb2xvclwiPkNvbG9yPC9sYWJlbD48YnIgLz5cbiAgICAgICAgIDxpbnB1dCB0eXBlPVwiY29sb3JcIlxuICAgICAgICAgICBvbmNoYW5nZT0ke2NoYW5nZUhhbmRsZXJ9XG4gICAgICAgICAgIG5hbWU9XCJjb2xvclwiXG4gICAgICAgICAgIHZhbHVlPVwiJHtzdGF0ZS5jb2xvciB8fCAnI0ZGRkZGRid9XCIgLz5cbiAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7XG4gICAgICAgICAgIGVtaXQoJ3N0YWNrUHJvcGVydHlDaGFuZ2UnLCB7dGFyZ2V0OiB7bmFtZTogJ2NvbG9yJywgdmFsdWU6ICcnfX0pO1xuICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgfX0+XG4gICAgICAgICBDbGVhclxuICAgICAgIDwvYnV0dG9uPlxuICAgIDwvcD5cbiAgICA8cD48bGFiZWwgZm9yPVwic3R5bGVzXCI+U3R5bGVzPC9sYWJlbD48YnIgLz5cbiAgICAke3N0eWxlQ29udGFpbmVyfVxuICAgIDwvcD5cbiAgPC9mb3JtPmA7XG5cbiAgZnVuY3Rpb24gc2V0U3R5bGVzKHZhbCkge1xuICAgICAgZW1pdCgnc2V0U3R5bGVzJywgdmFsKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGFja0NvbWJvVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGluZGV4LCBzdGF0ZSwgZW1pdCwgaXNDYXJkKSB7XG4gICAgbGV0IGF0dHJzID0ge1xuICAgICAgICBoZWlnaHQ6IGVsZW1lbnQuaGVpZ2h0LFxuICAgICAgICB3aWR0aDogZWxlbWVudC53aWR0aCxcbiAgICAgICAgdG9wOiBlbGVtZW50LnRvcCxcbiAgICAgICAgbGVmdDogZWxlbWVudC5sZWZ0LFxuICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IGVsZW1lbnQuY29sb3IsXG4gICAgICAgICdmb250LWZhbWlseSc6IGVsZW1lbnQuZm9udCxcbiAgICAgICAgJ2ZvbnQtc2l6ZSc6IGVsZW1lbnQuc2l6ZSxcbiAgICAgICAgJ2ZvbnQtc3R5bGUnOiBlbGVtZW50LnN0eWxlLFxuICAgICAgICBjb2xvcjogZWxlbWVudC50ZXh0Q29sb3JcbiAgICB9OyAvLyB0aGlzIGRhdGEgbXVuZ2Ugc3RlcCBtYXkgYmVsb25nIGluIGEgc3RvcmU/XG4gICAgbGV0IHN0eWxlID0gT2JqZWN0LmtleXMoYXR0cnMpLm1hcCgoa2V5KSA9PiAoa2V5ICsgJzonICsgYXR0cnNba2V5XSArICc7JykpLmpvaW4oJycpO1xuICAgIHJldHVybiBodG1sYDxkaXZcbiAgICAgICAgY2xhc3M9XCJncmFwaGljICR7ZWxlbWVudC5jbGFzc31cIlxuICAgICAgICBzdHlsZT1cIiR7c3R5bGV9XCJcbiAgICA+JHtlbGVtZW50LnRleHR9PC9kaXY+YDtcbn07XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9yc30gPSByZXF1aXJlKCcuL2JlaGF2aW9yLmpzJyk7XG5cblxuY29uc3QgSU1BR0VfUk9UQVRJT04gPSB7XG4gICAgMzogJ3JvdGF0ZSgxODBkZWcpJyxcbiAgICA2OiAncm90YXRlKDkwZGVnKScsXG4gICAgODogJ3JvdGF0ZSgyNzBkZWcpJ1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGVsZW1lbnQsIGluZGV4LCBzdGF0ZSwgZW1pdCwgaXNDYXJkKSB7XG4gICAgaWYgKGlzRHJhZ2dhYmxlKCkpIHtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGltZyBjbGFzcz1cIiR7aW1hZ2VDbGFzc2VzKCl9XCJcbiAgICAgICAgICAgIG9uY2xpY2s9JHtlZGl0TW9kZUNsaWNrfVxuICAgICAgICAgICAgb25tb3VzZWRvd249JHsoZSkgPT4gbW91c2VEb3duKGUpfVxuICAgICAgICAgICAgb25tb3VzZWxlYXZlPSR7KGUpID0+IG1vdXNlTGVhdmUoZSl9XG4gICAgICAgICAgICBvbm1vdXNldXA9JHsoZSkgPT4gbW91c2VVcChlKX1cbiAgICAgICAgICAgIHNyYz1cIiR7ZWxlbWVudC5zcmN9XCJcbiAgICAgICAgICAgIGFsdD1cIiR7ZWxlbWVudC5hbHQgPyBlbGVtZW50LmFsdCA6ICcnfVwiXG4gICAgICAgICAgICBoZWlnaHQ9XCIke2VsZW1lbnQuaGVpZ2h0ID8gZWxlbWVudC5oZWlnaHQgOiAnJ31cIlxuICAgICAgICAgICAgd2lkdGg9XCIke2VsZW1lbnQud2lkdGggPyBlbGVtZW50LndpZHRoIDogJyd9XCJcbiAgICAgICAgICAgIHN0eWxlPVwidG9wOiR7ZWxlbWVudC50b3B9O2xlZnQ6JHtlbGVtZW50LmxlZnR9OyR7aW5saW5lU3R5bGVzKCl9XCJcbiAgICAgICAgLz5gO1xuICAgIH1cbiAgICBpZiAoaXNEcmFnZ2FibGUoKSB8fCAhZWxlbWVudC5oaWRkZW4pIHtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGltZyBjbGFzcz1cIiR7aW1hZ2VDbGFzc2VzKCl9XCJcbiAgICAgICAgICAgIG9uY2xpY2s9JHtjbGlja0hhbmRsZXJ9XG4gICAgICAgICAgICBzcmM9XCIke2VsZW1lbnQuc3JjfVwiXG4gICAgICAgICAgICBhbHQ9XCIke2VsZW1lbnQuYWx0ID8gZWxlbWVudC5hbHQgOiAnJ31cIlxuICAgICAgICAgICAgaGVpZ2h0PVwiJHtlbGVtZW50LmhlaWdodCA/IGVsZW1lbnQuaGVpZ2h0IDogJyd9XCJcbiAgICAgICAgICAgIHdpZHRoPVwiJHtlbGVtZW50LndpZHRoID8gZWxlbWVudC53aWR0aCA6ICcnfVwiXG4gICAgICAgICAgICBzdHlsZT1cInRvcDoke2VsZW1lbnQudG9wfTtsZWZ0OiR7ZWxlbWVudC5sZWZ0fTske2lubGluZVN0eWxlcygpfVwiXG4gICAgICAgIC8+YDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG5cbiAgICBmdW5jdGlvbiBjbGlja0hhbmRsZXIoKSB7XG4gICAgICAgIGlmIChldmVudC5hbHRLZXkpIHtcbiAgICAgICAgICAgIGVtaXQoJ2VkaXRJbWFnZScsIFtlbGVtZW50LCBpbmRleCwgaXNDYXJkXSk7XG4gICAgICAgIH0gZWxzZSBpZiAoZWxlbWVudC5iZWhhdmlvciAmJiBlbGVtZW50LmJlaGF2aW9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFyc2VBbmRSdW5CZWhhdmlvcnMoc3RhdGUsIGVtaXQsIGVsZW1lbnQuYmVoYXZpb3IpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5saW5lU3R5bGVzKCkge1xuICAgICAgICBsZXQgb3V0ID0gXCJcIjtcbiAgICAgICAgaWYgKGVsZW1lbnQuc3R5bGUpIHtcbiAgICAgICAgICAgIG91dCArPSBlbGVtZW50LnN0eWxlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtZW50Lm9yaWVudGF0aW9uICYmIGVsZW1lbnQub3JpZW50YXRpb24gIT09IDEpIHtcbiAgICAgICAgICAgIG91dCArPSBcInRyYW5zZm9ybTogXCIgKyBJTUFHRV9ST1RBVElPTltlbGVtZW50Lm9yaWVudGF0aW9uXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGltYWdlQ2xhc3NlcygpIHtcbiAgICAgICAgY29uc3Qga2xhc3MgPSBbXTtcbiAgICAgICAgaWYgKGlzRHJhZ2dhYmxlKCkpIHtcbiAgICAgICAgICAgIGtsYXNzLnB1c2goJ21vdmFibGUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZWxlbWVudC5iZWhhdmlvciAmJiBlbGVtZW50LmJlaGF2aW9yLmxlbmd0aCkge1xuICAgICAgICAgICAga2xhc3MucHVzaCgnYmVoYXZlcy1vbi1jbGljaycpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtZW50LmhpZGRlbikge1xuICAgICAgICAgICAga2xhc3MucHVzaCgnaGlkZGVuJyk7XG4gICAgICAgIH1cbiAgICAgICAga2xhc3MucHVzaChlbGVtZW50WydjbGFzcyddKTtcbiAgICAgICAgcmV0dXJuIGtsYXNzLmpvaW4oJyAnKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0SW1hZ2UoKSB7XG4gICAgICAgIGVtaXQoJ2VkaXRJbWFnZScsIFtlbGVtZW50LCBpbmRleCwgaXNDYXJkXSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKCkge1xuICAgICAgICBpZiAoaXNDYXJkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0TW9kZUNsaWNrKGV2dCkge1xuICAgICAgICBjb25zdCBbc3RhcnRYLCBzdGFydFldID0gc3RhdGUubW91c2VEb3duO1xuICAgICAgICBpZiAoTWF0aC5hYnMoZXZ0LnNjcmVlblggLSBzdGFydFgpIDwgMTAgJiYgTWF0aC5hYnMoZXZ0LnNjcmVlblkgLSBzdGFydFkpIDwgMTApIHtcbiAgICAgICAgICAgIGVkaXRJbWFnZSgpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VEb3duKGV2dCkge1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBlbWl0KCdzdGFydERyYWcnLCBbZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLCBldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFksIGV2dC50YXJnZXRdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZUxlYXZlKGV2dCkge1xuICAgICAgICBpZiAoc3RhdGUuZHJhZ0luZm8gfHwgc3RhdGUucmVzaXplSW5mbykge1xuICAgICAgICAgICAgY29uc3QgeWVySW5mbyA9IHN0YXRlLmRyYWdJbmZvID8gc3RhdGUuZHJhZ0luZm8gOiBzdGF0ZS5yZXNpemVJbmZvO1xuICAgICAgICAgICAgaWYgKHllckluZm8udGFyZ2V0ID09IGV2dC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZVVwKGV2dCkge1xuICAgICAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIGVtaXQoJ2ZpbmlzaERyYWcnLCBbXG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA/ICdtb3ZlSW1hZ2UnIDogJ3Jlc2l6ZUltYWdlJyxcbiAgICAgICAgICAgIGV2dC5zY3JlZW5YLCBldnQuc2NyZWVuWSxcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gZXZ0LnRhcmdldC5zdHlsZS5sZWZ0IDogZXZ0LnRhcmdldC5jbGllbnRXaWR0aCxcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gZXZ0LnRhcmdldC5zdHlsZS50b3AgOiBldnQudGFyZ2V0LmNsaWVudEhlaWdodCxcbiAgICAgICAgICAgIGluZGV4XG4gICAgICAgIF0pO1xuICAgIH1cbn07XG4iLCJjb25zdCB7bW9kUGF0aCwgZ2V0UGF0aH0gPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0YXRlLCBlbWl0dGVyKSB7XG4gICAgY29uc3QgcG9rZSA9IG1vZFBhdGgoc3RhdGUsIGVtaXR0ZXIpO1xuXG4gICAgc3RhdGUuZ2V0Q2FyZHMgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkcztcbiAgICB9O1xuICAgIHN0YXRlLmdldENhcmRDb3VudCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmRzLmxlbmd0aDtcbiAgICB9XG4gICAgc3RhdGUuc2V0TmV4dENhcmQgPSAobnVtKSA9PiB7XG4gICAgICAgIHN0YXRlLm5leHRDYXJkID0gbnVtO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmN1cnJlbnRDYXJkO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0Q3VycmVudENhcmQgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF07XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4ID0gKCkgPT4ge1xuICAgICAgICBpZiAoc3RhdGUuY3VycmVudEJhY2tncm91bmQpIHtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS5jdXJyZW50QmFja2dyb3VuZDtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmdldEN1cnJlbnRDYXJkKCkuYmFja2dyb3VuZDtcbiAgICB9O1xuICAgIHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuYmFja2dyb3VuZHNbc3RhdGUuY3VycmVudEJhY2tncm91bmRdO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0QmFja2dyb3VuZEZvckNhcmQgPSAoY2FyZCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuYmFja2dyb3VuZHNbY2FyZC5iYWNrZ3JvdW5kXTtcbiAgICB9XG4gICAgc3RhdGUuZ2V0Q2FyZHNJbkN1cnJlbnRCYWNrZ3JvdW5kID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuY2FyZHMubWFwKChjZCwgaW5kKSA9PiBPYmplY3QuYXNzaWduKHt9LCBjZCwge2luZGV4OiBpbmR9KSlcbiAgICAgICAgICAgIC5maWx0ZXIoKGNkKSA9PiBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5jdXJyZW50QmFja2dyb3VuZCk7XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRCYWNrZ3JvdW5kQ291bnQgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGF0ZS5iYWNrZ3JvdW5kcykubGVuZ3RoO1xuICAgIH07XG5cbiAgICBzdGF0ZS5zZXRQcm9wZXJ0eUF0UGF0aCA9IChwYXRoQXJyYXksIHZhbHVlKSA9PiB7XG4gICAgICAgIHBva2UocGF0aEFycmF5LCB2YWx1ZSk7XG4gICAgfVxuICAgIHN0YXRlLmdldFByb3BlcnR5QXRQYXRoID0gKHBhdGhBcnJheSkgPT4ge1xuICAgICAgICByZXR1cm4gZ2V0UGF0aChzdGF0ZSwgcGF0aEFycmF5KTtcbiAgICB9O1xuXG4gICAgc3RhdGUuc2V0Q3VycmVudENhcmRQcm9wZXJ0eSA9IChwYXRoQXJyYXksIHZhbHVlKSA9PiB7XG4gICAgICAgIHN0YXRlLnNldFByb3BlcnR5QXRQYXRoKFxuICAgICAgICAgICAgWydjYXJkcycsIHN0YXRlLmdldEN1cnJlbnRDYXJkSW5kZXgoKV0uY29uY2F0KHBhdGhBcnJheSksXG4gICAgICAgICAgICB2YWx1ZVxuICAgICAgICApO1xuICAgIH07XG4gICAgc3RhdGUuc2V0Q3VycmVudEJhY2tncm91bmRQcm9wZXJ0eSA9IChwYXRoQXJyYXksIHZhbHVlKSA9PiB7XG4gICAgICAgIHN0YXRlLnNldFByb3BlcnR5QXRQYXRoKFxuICAgICAgICAgICAgWydiYWNrZ3JvdW5kcycsIHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kSW5kZXgoKV0uY29uY2F0KHBhdGhBcnJheSksXG4gICAgICAgICAgICB2YWx1ZVxuICAgICAgICApO1xuICAgIH1cblxuICAgIHN0YXRlLmVkaXRPYmplY3QgPSAob2JqZWN0UGF0aCkgPT4ge1xuICAgICAgICAvLyB0aGlzIGp1c3QgbWVhbnMgc3dpdGNoIG9uIHRoZSBlZGl0IG1vZGFsP1xuICAgICAgICAvLyB3aGF0IGlzICdlbnYnIGhlcmUgYW5kIG1heWJlIHdlIGlnbm9yZSBpdD9cbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0aW5nKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgbGVQYXRoID0gc3RhdGUuZWRpdGluZ0NhcmQoKVxuICAgICAgICAgICAgPyBbJ2NhcmRzJywgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpXVxuICAgICAgICAgICAgOiBbJ2JhY2tncm91bmRzJywgc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpXTtcbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBsZVBhdGguY29uY2F0KG9iamVjdFBhdGgpO1xuICAgICAgICAvLyBzbyBJIGd1ZXNzIHRoYXQncyB3aGF0IHRob3NlIGFyZ3VtZW50cyBhcmVcblxuICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IHN0YXRlLmVkaXRpbmdGaWVsZCA9IG51bGw7XG4gICAgICAgIHN3aXRjaCAob2JqZWN0UGF0aFswXSkge1xuICAgICAgICAgICAgY2FzZSAnZWxlbWVudHMnOlxuICAgICAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gc3RhdGUuZ2V0UHJvcGVydHlBdFBhdGgoc3RhdGUuZWRpdGluZ1BhdGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW1hZ2VzJzpcbiAgICAgICAgICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZS5nZXRQcm9wZXJ0eUF0UGF0aChzdGF0ZS5lZGl0aW5nUGF0aCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdmaWVsZHMnOlxuICAgICAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdGaWVsZCA9IHN0YXRlLmdldFByb3BlcnR5QXRQYXRoKHN0YXRlLmVkaXRpbmdQYXRoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2NhcmRzJzpcbiAgICAgICAgICAgIGNhc2UgJ2JhY2tncm91bmRzJzpcbiAgICAgICAgICAgIGNhc2UgJ3N0YWNrJzpcbiAgICAgICAgICAgICAgICAvLyBvaCBhY3R1YWxseVxuICAgICAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdQYXRoID0gb2JqZWN0UGF0aDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBzdGF0ZS5nZXRFZGl0ZWRPYmplY3RJbmRleCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRpbmdQYXRoW3N0YXRlLmVkaXRpbmdQYXRoLmxlbmd0aCAtIDFdO1xuICAgIH1cbiAgICBzdGF0ZS5lZGl0aW5nT2JqZWN0ID0gKCkgPT4gISFzdGF0ZS5lZGl0aW5nUGF0aDtcbiAgICBzdGF0ZS5nZXRFZGl0ZWRPYmplY3QgPSAoKSA9PiB7XG4gICAgICAgIGlmICghc3RhdGUuZWRpdGluZ09iamVjdCgpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGUuZ2V0UHJvcGVydHlBdFBhdGgoc3RhdGUuZWRpdGluZ1BhdGgpO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0RWRpdGVkT2JqZWN0VHlwZSA9ICgpID0+IHtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0aW5nT2JqZWN0KCkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZS5lZGl0aW5nUGF0aC5pbmNsdWRlcygnZWxlbWVudHMnKVxuICAgICAgICAgICAgPyAnZWxlbWVudCdcbiAgICAgICAgICAgIDogKHN0YXRlLmVkaXRpbmdQYXRoLmluY2x1ZGVzKCdpbWFnZXMnKVxuICAgICAgICAgICAgICAgID8gJ2ltYWdlJ1xuICAgICAgICAgICAgICAgIDogKHN0YXRlLmVkaXRpbmdQYXRoLmluY2x1ZGVzKCdmaWVsZHMnKVxuICAgICAgICAgICAgICAgICAgICA/ICdmaWVsZCdcbiAgICAgICAgICAgICAgICAgICAgOiAoc3RhdGUuZWRpdGluZ1BhdGguaW5jbHVkZXMoJ3N0YWNrJylcbiAgICAgICAgICAgICAgICAgICAgICAgID8gJ3N0YWNrJ1xuICAgICAgICAgICAgICAgICAgICAgICAgOiAoc3RhdGUuZWRpdGluZ1BhdGguaW5jbHVkZXMoJ2JhY2tncm91bmRzJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA/ICdiYWNrZ3JvdW5kJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJ2NhcmQnKSkpKTsgLy8gbWF5YmUgYSBiZXR0ZXIgd2F5IHRvIGRvIHRoaXMgOi0vXG4gICAgfTtcblxuICAgIHN0YXRlLnNldEVkaXRNb2RlID0gKHRvV2hhdCkgPT4ge1xuICAgICAgICBpZiAodHlwZW9mIHRvV2hhdCA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAvLyBpc0NhcmRMZXZlbCBhbmQgdGhlIGxpa2VcbiAgICAgICAgICAgIHRvV2hhdCA9IHRvV2hhdCA/ICdlZGl0TW9kZScgOiAnYmdFZGl0JztcbiAgICAgICAgfVxuICAgICAgICBpZiAoWydlZGl0TW9kZScsJ2JnRWRpdCcsICcnXS5pbmNsdWRlcyh0b1doYXQpKSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0TW9kZSA9IHRvV2hhdDtcbiAgICAgICAgfVxuICAgICAgICBpZiAodG9XaGF0ID09PSBudWxsIHx8IHRvV2hhdCA9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRNb2RlID0gJyc7XG4gICAgICAgIH1cbiAgICB9XG4gICAgc3RhdGUuZWRpdGluZyA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuICEhc3RhdGUuZWRpdE1vZGU7XG4gICAgfTtcbiAgICBzdGF0ZS5lZGl0aW5nQ2FyZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnO1xuICAgIH07XG4gICAgc3RhdGUuZWRpdGluZ0JhY2tncm91bmQgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5lZGl0TW9kZSA9PT0gJ2JnRWRpdCc7XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRFZGl0U2NvcGVQYXRoID0gKCkgPT4ge1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRpbmcoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRpbmdCYWNrZ3JvdW5kKClcbiAgICAgICAgICAgID8gWydiYWNrZ3JvdW5kcycsIHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kSW5kZXgoKV1cbiAgICAgICAgICAgIDogWydjYXJkcycsIHN0YXRlLmdldEN1cnJlbnRDYXJkSW5kZXgoKV07XG4gICAgfVxuXG4gICAgLy8gd2hhdCBhYm91dCBkcmFnZ2luZ1xuICAgIC8vIG1heWJlIGRyYWdnaW5nIHN0YXlzIGhvdyBpdCBpcyBiZWNhdXNlIGl0IHNob3VsZG4ndCBoaXQgdGhlIGRpc2sgZXZlclxuXG4gICAgc3RhdGUuc2F2ZUZpZWxkID0gZnVuY3Rpb24oZXZlbnQsIGZpZWxkLCBzdGF0ZSkge1xuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgICAgY29uc3QgY2FyZCA9IHN0YXRlLmdldEN1cnJlbnRDYXJkKCk7XG4gICAgICAgIGlmIChjYXJkLmZpZWxkc1tmaWVsZC5uYW1lXSkge1xuICAgICAgICAgICAgc3RhdGUuc2V0Q3VycmVudENhcmRQcm9wZXJ0eShbJ2ZpZWxkcycsIGZpZWxkLm5hbWUsICd2YWx1ZSddLCBuZXdWYWx1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5zZXRDdXJyZW50Q2FyZFByb3BlcnR5KFsndmFsdWVzJywgZmllbGQubmFtZV0sIG5ld1ZhbHVlKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICByZXR1cm4gc3RhdGU7XG59O1xuIiwiY29uc3Qgc3RhdGVBcGkgPSByZXF1aXJlKCcuLi9zdGF0ZUFwaScpO1xuXG5cbmNvbnN0IEFwcFN0b3JlID0gYXN5bmMgZnVuY3Rpb24oc3RhdGUsIGVtaXR0ZXIpIHtcbiAgICBjb25zdCBsb2NhbEFyYyA9IG5ldyBEYXRBcmNoaXZlKHdpbmRvdy5sb2NhdGlvbi50b1N0cmluZygpKTtcbiAgICBjb25zdCByYXdTdGF0ZSA9IEpTT04ucGFyc2UoYXdhaXQgbG9jYWxBcmMucmVhZEZpbGUoJ3N0YWNrLmpzb24nKSk7XG4gICAgT2JqZWN0LmtleXMocmF3U3RhdGUpLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgICBzdGF0ZVtrZXldID0gcmF3U3RhdGVba2V5XTtcbiAgICB9KTtcblxuICAgIHN0YXRlID0gc3RhdGVBcGkoc3RhdGUsIGVtaXR0ZXIpO1xuXG4gICAgZW1pdHRlci5vbignZ290bycsIGFzeW5jIGZ1bmN0aW9uKGZvcmNlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHN0YXRlLnBhcmFtcyAmJiBzdGF0ZS5wYXJhbXMud2hpY2gpIHtcbiAgICAgICAgICAgIGlmIChOdW1iZXIuaXNOYU4ocGFyc2VJbnQoc3RhdGUucGFyYW1zLndoaWNoKSkgJiYgQXJyYXkuaXNBcnJheShzdGF0ZS5jYXJkcykpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZChzdGF0ZS5nZXRDYXJkcygpLmZpbmRJbmRleCgoY2QpID0+IGNkLm5hbWUgPT0gc3RhdGUucGFyYW1zLndoaWNoKSk7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoTWF0aC5tYXgoc3RhdGUubmV4dENhcmQsIDApKTsgLy8gaW4gY2FzZSBvZiA0MDRcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoc3RhdGUucGFyYW1zLndoaWNoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBzdGF0ZS5wYXJhbXMud2hpY2g7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodHlwZW9mIHN0YXRlLm5leHRDYXJkICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgICAgICAgICAgIChzdGF0ZS5uZXh0Q2FyZCAhPT0gc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpIHx8IGZvcmNlID09PSB0cnVlKSkge1xuICAgICAgICAgICAgbGV0IG51bSA9IHN0YXRlLm5leHRDYXJkO1xuICAgICAgICAgICAgc3RhdGUuY2FyZCA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmNhcmRzW251bV0pO1xuICAgICAgICAgICAgc3RhdGUuY3VycmVudENhcmQgPSBudW07XG4gICAgICAgICAgICBpZiAoIXN0YXRlLmJhY2tncm91bmQgfHxcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuZ2V0Q3VycmVudENhcmQoKS5iYWNrZ3JvdW5kICE9PSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KCkpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuZ2V0QmFja2dyb3VuZEZvckNhcmQoc3RhdGUuY2FyZCkpO1xuICAgICAgICAgICAgICAgIGF3YWl0IGFzeW5jRW1pdCgnYmFja2dyb3VuZExvYWRlZCcpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ2NhcmRMb2FkZWQnKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGVtaXR0ZXIub24oJ2dvdG9OZXh0Q2FyZCcsIGFzeW5jIGZ1bmN0aW9uKHdyYXAgPSB0cnVlKSB7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRDYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpO1xuICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZCgoY3VycmVudENhcmQgKyAxID49IHN0YXRlLmdldENhcmRDb3VudCgpKVxuICAgICAgICAgICAgPyAod3JhcCA/IDAgOiBjdXJyZW50Q2FyZClcbiAgICAgICAgICAgIDogY3VycmVudENhcmQgKyAxKTtcbiAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdnb3RvJyk7XG4gICAgfSk7XG4gICAgZW1pdHRlci5vbignZ290b1ByZXZDYXJkJywgYXN5bmMgZnVuY3Rpb24od3JhcCA9IHRydWUpIHtcbiAgICAgICAgY29uc3QgY3VycmVudENhcmQgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCk7XG4gICAgICAgIHN0YXRlLnNldE5leHRDYXJkKChjdXJyZW50Q2FyZCAtIDEgPCAwKVxuICAgICAgICAgICAgPyAod3JhcCA/IHN0YXRlLmdldENhcmRDb3VudCgpIC0gMSA6IDApXG4gICAgICAgICAgICA6IGN1cnJlbnRDYXJkIC0gMSk7XG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgnZ290bycpO1xuICAgIH0pO1xuXG5cbiAgICBlbWl0dGVyLm9uKCdzYXZlJywgYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBzYXZlZFN0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUpO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5jYXJkO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5iYWNrZ3JvdW5kO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5lZGl0TW9kZTtcbiAgICAgICAgZGVsZXRlIHNhdmVkU3RhdGUuZWRpdGluZ1BhdGg7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLnBhcmFtcztcbiAgICAgICAgZGVsZXRlIHNhdmVkU3RhdGUuc3R5bGVDYWNoZTtcbiAgICAgICAgZm9yIChsZXQga2V5IG9mIE9iamVjdC5rZXlzKHNhdmVkU3RhdGUpKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHNhdmVkU3RhdGVba2V5XSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlW2tleV07XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gZGVsZXRlIHNhdmVkU3RhdGUucXVlcnk7XG4gICAgICAgIC8vIGRlbGV0ZSBzYXZlZFN0YXRlLmhyZWY7IC8vIG1vcmUgY2hvbyBidWlsdGluc1xuICAgICAgICBhd2FpdCBsb2NhbEFyYy53cml0ZUZpbGUoJ3N0YWNrLmpzb24nLFxuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2F2ZWRTdGF0ZSkpO1xuICAgICAgICB3aW5kb3cudGVzdFN0YXRlID0gc2F2ZWRTdGF0ZTtcbiAgICB9KTtcblxuXG4gICAgLy8gLy8ga2ljayBpdCBvZmZcbiAgICAvLyBpZiAoc3RhdGUuZ2V0Q3VycmVudENhcmQoKSkge1xuICAgIC8vICAgICBzdGF0ZS5zZXROZXh0Q2FyZChzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCkpO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgLy8gfVxuXG5cbiAgICBjb25zdCBzdHlsZVNoZWV0ID0gYXdhaXQgbG9jYWxBcmMucmVhZEZpbGUoJ3N0YWNrLmNzcycpO1xuICAgIHN0YXRlLnN0eWxlQ2FjaGUgPSBzdHlsZVNoZWV0O1xuXG4gICAgZW1pdHRlci5vbignc2V0U3R5bGVzJywgYXN5bmMgZnVuY3Rpb24oc3R5bGVUZXh0KSB7XG4gICAgICAgIGF3YWl0IGxvY2FsQXJjLndyaXRlRmlsZSgnc3RhY2suY3NzJywgc3R5bGVUZXh0KTtcblxuICAgICAgICBzdGF0ZS5zdHlsZUNhY2hlID0gc3R5bGVUZXh0O1xuICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ3JlbmRlcicpO1xuICAgIH0pO1xuXG5cbiAgICBlbWl0dGVyLm9uKCdlbnN1cmVTdGF0aWNGaWxlTGlzdHMnLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgbmVlZHNGaXJzdFJlbmRlciA9ICEoc3RhdGUuc3RhdGljRmlsZXMgJiYgc3RhdGUuc3RhdGljRmlsZXMubGVuZ3RoKTtcbiAgICAgICAgY29uc3Qgc3RhdGljcyA9IGF3YWl0IGxvY2FsQXJjLnJlYWRkaXIoJy9pbWcnLCB7cmVjdXJzaXZlOiB0cnVlfSk7XG4gICAgICAgIHN0YXRlLnN0YXRpY0ZpbGVzID0gc3RhdGljcztcbiAgICAgICAgaWYgKG5lZWRzRmlyc3RSZW5kZXIpIHtcbiAgICAgICAgICAgIGF3YWl0IGFzeW5jRW1pdCgncmVuZGVyJyk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IG1haW50YWluTGlzdHNIYW5kbGVyID0gKHtwYXRofSkgPT4gZW1pdHRlci5lbWl0KCdlbnN1cmVTdGF0aWNGaWxlTGlzdHMnKTtcbiAgICBjb25zdCBzdGF0aWNzTW9uaXRvciA9IGxvY2FsQXJjLmNyZWF0ZUZpbGVBY3Rpdml0eVN0cmVhbSgnL2ltZy8qJyk7XG4gICAgc3RhdGljc01vbml0b3IuYWRkRXZlbnRMaXN0ZW5lcignaW52YWxpZGF0ZWQnLCBtYWludGFpbkxpc3RzSGFuZGxlcik7XG4gICAgc3RhdGljc01vbml0b3IuYWRkRXZlbnRMaXN0ZW5lcignY2hhbmdlZCcsIG1haW50YWluTGlzdHNIYW5kbGVyKTtcblxuXG4gICAgbGV0IGFsdEtleVJlYWRpZWQgPSBmYWxzZTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoL15BbHQvLnRlc3QoZXZlbnQuY29kZSkpIHtcbiAgICAgICAgICAgIGFsdEtleVJlYWRpZWQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGFsdEtleVJlYWRpZWQpIHtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKGV2ZW50LmNvZGUpIHtcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnRW50ZXInOiBlbWl0dGVyLmVtaXQoJ3RvZ2dsZUVkaXRNb2RlJyk7IGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdBcnJvd1JpZ2h0JzogZW1pdHRlci5lbWl0KCdnb3RvTmV4dENhcmQnKTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0Fycm93TGVmdCc6IGVtaXR0ZXIuZW1pdCgnZ290b1ByZXZDYXJkJyk7IGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdLZXlOJzogZW1pdHRlci5lbWl0KCduZXdDYXJkJyk7IGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChldmVudC5jb2RlID09PSBcIkVzY2FwZVwiKSB7XG4gICAgICAgICAgICAgICAgYWx0S2V5UmVhZGllZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nT2JqZWN0KCkpIHtcbiAgICAgICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdjbG9zZUVkaXQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmVkaXRpbmcoKSkge1xuICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3R1cm5PZmZFZGl0TW9kZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleXVwJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKC9eQWx0Ly50ZXN0KGV2ZW50LmNvZGUpICYmIGFsdEtleVJlYWRpZWQpIHtcbiAgICAgICAgICAgIGFsdEtleVJlYWRpZWQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbigncmVuZGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBiYWRHdXlzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnc2VsZWN0Jyk7XG4gICAgICAgICAgICAvLyBzbyBuYW1lZCBvbmx5IGJlY2F1c2UgdGhpcyBpcyB0byBmaXggd2hhdCB3ZSBleHBlcmllbmNlIGFzIGEgYnVnIVxuICAgICAgICAgICAgLy8gV0hBVENIQSBHT05OQSBETyBXSEVOIFRIRVkgQ09NRSBGT1IgWU9VXG4gICAgICAgICAgICBpZiAoYmFkR3V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBiYWRHdXlzLmZvckVhY2goKGd1eSkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZ3V5Lmhhc0F0dHJpYnV0ZSgnZGF0YS1yZWFsdmFsdWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3V5LnF1ZXJ5U2VsZWN0b3JBbGwoJ29wdGlvbicpLmZvckVhY2goKG9wdCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0LnZhbHVlID09IGd1eS5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmVhbHZhbHVlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3V5LnNlbGVjdGVkSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGd1eS5xdWVyeVNlbGVjdG9yQWxsKCdvcHRpb24nKS5mb3JFYWNoKChvcHQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wdC5oYXNBdHRyaWJ1dGUoJ3NlbGVjdGVkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZ3V5LnNlbGVjdGVkSW5kZXggPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAxMCk7XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBhc3luY0VtaXQoLi4uYXJncykge1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0LmFwcGx5KGVtaXR0ZXIsIGFyZ3MpO1xuICAgICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBTdG9yZTtcbiIsImNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9yc30gPSByZXF1aXJlKCcuLi9iZWhhdmlvci5qcycpO1xuY29uc3Qge3VuaXF1ZU5hbWV9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmNvbnN0IEJnU3RvcmUgPSAoc3RhdGUsIGVtaXR0ZXIpID0+IHtcbiAgICBlbWl0dGVyLm9uKCdiYWNrZ3JvdW5kTG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGJnID0gc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmQoKTtcbiAgICAgICAgaWYgKGJnLmJlaGF2aW9yICYmIGJnLmJlaGF2aW9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFyc2VBbmRSdW5CZWhhdmlvcnMoc3RhdGUsIGVtaXR0ZXIuZW1pdC5iaW5kKGVtaXR0ZXIpLCBiZy5iZWhhdmlvcik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdQYXRoICYmIHN0YXRlLmVkaXRpbmdQYXRoLmxlbmd0aCA9PSAyICYmIHN0YXRlLmVkaXRpbmdQYXRoWzBdID09ICdiYWNrZ3JvdW5kcycpIHtcbiAgICAgICAgICAgIC8vIGFscmVhZHkgaW4gYmctZWRpdGluZyBtb2RlLCBzbyB1cGRhdGUgdGhlIHBhdGhcbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdQYXRoWzFdID0gc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdjYXJkTG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGJnID0gc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmQoKTtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gc3RhdGUuZ2V0Q3VycmVudENhcmQoKS52YWx1ZXM7XG4gICAgICAgIGlmICh2YWx1ZXMpIHtcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKHZhbHVlcykuZm9yRWFjaCgoZmllbGROYW1lKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGJnLmZpZWxkc1tmaWVsZE5hbWVdKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLnNldEN1cnJlbnRCYWNrZ3JvdW5kUHJvcGVydHkoWydmaWVsZHMnLCBmaWVsZE5hbWUsICd2YWx1ZSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWVzW2ZpZWxkTmFtZV1cbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgYmxhbmtCZyA9IHtcbiAgICAgICAgbmFtZTogJycsXG4gICAgICAgIGltYWdlczogW10sXG4gICAgICAgIGVsZW1lbnRzOiBbXSxcbiAgICAgICAgZmllbGRzOiB7fSxcbiAgICAgICAgYmVoYXZpb3I6IFtdXG4gICAgfTtcblxuICAgIGVtaXR0ZXIub24oJ25ld0JnJywgZnVuY3Rpb24obmFtZSkge1xuICAgICAgICBpZiAobmFtZSA9PT0gbnVsbCB8fCB0eXBlb2YgbmFtZSA9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgbmFtZSA9IHVuaXF1ZU5hbWUoWydiYWNrZ3JvdW5kcyddLCAnbmV3QmcnKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kc1tuYW1lXSA9IE9iamVjdC5hc3NpZ24oe30sIGJsYW5rQmcpO1xuICAgICAgICAvLyB0aGVuIGdvIHRoZXJlP1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdEJnJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmVkaXRPYmplY3QoWydiYWNrZ3JvdW5kcycsIHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kSW5kZXgoKV0pO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZW52UHJvcGVydHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZygpICYmIHN0YXRlLmVkaXRpbmdQYXRoWzBdID09PSAnYmFja2dyb3VuZHMnKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGV2ZW50LnRhcmdldC5uYW1lO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG5cbiAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXVtwcm9wTmFtZV0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCZ1N0b3JlO1xuIiwiY29uc3Qge3BhcnNlQW5kUnVuQmVoYXZpb3JzfSA9IHJlcXVpcmUoJy4uL2JlaGF2aW9yLmpzJyk7XG5cblxuY29uc3QgQ2FyZFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbignbmV3Q2FyZCcsIChzdHVmZikgPT4ge1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShzdHVmZikpIHtcbiAgICAgICAgICAgIHN0dWZmID0gc3R1ZmZbMF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzdHVmZikge1xuICAgICAgICAgICAgc3R1ZmYgPSB7fTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgbmV3Q2FyZCA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmNhcmQsIHtcbiAgICAgICAgICAgIG5hbWU6ICcnLFxuICAgICAgICAgICAgdmFsdWVzOiB7fSxcbiAgICAgICAgICAgIGltYWdlczogW10sXG4gICAgICAgICAgICBlbGVtZW50czogW10sXG4gICAgICAgICAgICBmaWVsZHM6IHt9LFxuICAgICAgICAgICAgYmVoYXZpb3I6IFtdXG4gICAgICAgIH0sIHN0dWZmKTtcbiAgICAgICAgY29uc3QgbmV4dEluZGV4ID0gc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpICsgMTtcbiAgICAgICAgc3RhdGUuY2FyZHMuc3BsaWNlKG5leHRJbmRleCwgMCwgbmV3Q2FyZCk7XG4gICAgICAgIHN0YXRlLnNldE5leHRDYXJkKG5leHRJbmRleCk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdnb3RvJyk7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdjYXJkTG9hZGVkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGNhcmQgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpO1xuICAgICAgICBpZiAoY2FyZC5iZWhhdmlvciAmJiBjYXJkLmJlaGF2aW9yLmxlbmd0aCkge1xuICAgICAgICAgICAgcGFyc2VBbmRSdW5CZWhhdmlvcnMoc3RhdGUsIGVtaXR0ZXIuZW1pdC5iaW5kKGVtaXR0ZXIpLCBjYXJkLmJlaGF2aW9yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZygpICYmIHN0YXRlLmdldEVkaXRlZE9iamVjdFR5cGUoKSA9PSAnY2FyZCcpIHtcbiAgICAgICAgICAgIC8vIGFscmVhZHkgaW4gY2FyZC1lZGl0aW5nIG1vZGUsIHNvIHVwZGF0ZSB0aGUgcGF0aFxuICAgICAgICAgICAgc3RhdGUuZWRpdE9iamVjdChbJ2NhcmRzJywgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpXSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2VkaXRDYXJkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmVkaXRPYmplY3QoWydjYXJkcycsIHN0YXRlLmdldEN1cnJlbnRDYXJkSW5kZXgoKV0pO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZGVsZXRlQ2FyZCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc3RhdGUuZ2V0Q2FyZENvdW50KCkgPT09IDEpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBsZXQgY3VycmVudENhcmQgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCk7XG4gICAgICAgIHN0YXRlLmNhcmRzLnNwbGljZShjdXJyZW50Q2FyZCwgMSk7XG4gICAgICAgIC8vIHNvbWV0aGluZyB3aXRoIHRoZSBiYWNrZ3JvdW5kIGlmIGl0IGlzIG5vdyBjYXJkbGVzcz9cbiAgICAgICAgaWYgKGN1cnJlbnRDYXJkID4gMCkge1xuICAgICAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoLS1jdXJyZW50Q2FyZCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgnZ290bycpLCAxKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5jYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmQoKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2VudlByb3BlcnR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdQYXRoICYmIHN0YXRlLmVkaXRpbmdQYXRoWzBdID09PSAnY2FyZHMnKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGV2ZW50LnRhcmdldC5uYW1lO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgICAgICAgICBzdGF0ZS5zZXRQcm9wZXJ0eUF0UGF0aChbJ2NhcmRzJywgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpLCBwcm9wTmFtZV0sIG5ld1ZhbHVlKVxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhcmRTdG9yZTtcbiIsImNvbnN0IHt0b1B4fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuY29uc3QgRWRpdFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbigndG9nZ2xlRWRpdE1vZGUnLCBmdW5jdGlvbihpc0NhcmRMZXZlbEV2ZW50ID0gdHJ1ZSkge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZygpKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3R1cm5PZmZFZGl0TW9kZScpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuc2V0RWRpdE1vZGUoaXNDYXJkTGV2ZWxFdmVudCk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZW1pdHRlci5vbignZWRpdEJnTW9kZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ0NhcmQoKSkge1xuICAgICAgICAgICAgc3RhdGUuc2V0RWRpdE1vZGUoJ2JnRWRpdCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3RhdGUuc2V0RWRpdE1vZGUoJ2VkaXRNb2RlJyk7XG4gICAgICAgIH1cbiAgICAgICAgZW1pdHRlci5lbWl0KCdjbG9zZUVkaXQnKTsgLy8gdGhhdCdsbCByZW5kZXIgZm9yIHVzXG4gICAgfSk7XG4gICAgZW1pdHRlci5vbigndHVybk9mZkVkaXRNb2RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmVkaXRNb2RlID0gJyc7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdQYXRoID0gbnVsbDtcbiAgICAgICAgc3RhdGUuZWRpdGluZ0ltYWdlID0gc3RhdGUuZWRpdGluZ0VsZW1lbnQgPSBzdGF0ZS5lZGl0aW5nRmllbGQgPSBudWxsO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignbmV3SW1hZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuYWRkaW5nSW1hZ2UgPSB0cnVlO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignc3RhcnREcmFnJywgZnVuY3Rpb24oW3NjcmVlblgsIHNjcmVlblksIG9mZnNldFgsIG9mZnNldFksIHRhcmdldF0pIHtcbiAgICAgICAgc3RhdGUubW91c2VEb3duID0gW3NjcmVlblgsIHNjcmVlblldO1xuICAgICAgICBpZiAoTWF0aC5hYnModGFyZ2V0LmNsaWVudEhlaWdodCAtIG9mZnNldFkpIDwgMTApIHtcbiAgICAgICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0LFxuICAgICAgICAgICAgICAgIGhlaWdodDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2VkaXRiYXInKS5jbGllbnRIZWlnaHRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSBpZiAoTWF0aC5hYnModGFyZ2V0LmNsaWVudFdpZHRoIC0gb2Zmc2V0WCkgPCAxMCkge1xuICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IHtcbiAgICAgICAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgICAgICAgd2lkdGg6IHRydWVcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IHtcbiAgICAgICAgICAgICAgICBvZmZzZXRYLFxuICAgICAgICAgICAgICAgIG9mZnNldFk6IG9mZnNldFkgKyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZWRpdGJhcicpLmNsaWVudEhlaWdodCxcbiAgICAgICAgICAgICAgICB0YXJnZXRcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2ZpbmlzaERyYWcnLCBmdW5jdGlvbihbZm9sbG93T25BY3Rpb24sIHNjcmVlblgsIHNjcmVlblksIHgsIHksIGlkZW50XSkge1xuICAgICAgICBjb25zdCBbc3RhcnRYLCBzdGFydFldID0gc3RhdGUubW91c2VEb3duO1xuICAgICAgICBpZiAoTWF0aC5hYnMoc2NyZWVuWCAtIHN0YXJ0WCkgPj0gMTAgfHwgTWF0aC5hYnMoc2NyZWVuWSAtIHN0YXJ0WSkgPj0gMTApIHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdChmb2xsb3dPbkFjdGlvbiwgW2lkZW50LCB4LCB5XSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgZnVuY3Rpb24oZXZ0KSB7XG4gICAgICAgIGlmICghc3RhdGUuZWRpdE1vZGUpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChldnQudGFyZ2V0LmNsYXNzTmFtZS5pbmNsdWRlcygnbW92YWJsZScpKSB7XG4gICAgICAgICAgICBpZiAoZXZ0LnRhcmdldC5ub2RlTmFtZSA9PSAnSU1HJykge1xuICAgICAgICAgICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBldnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHN0YXRlLmRyYWdJbmZvKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5zdHlsZS50b3AgPSAoZXZ0LnBhZ2VZIC0gc3RhdGUuZHJhZ0luZm8ub2Zmc2V0WSkgKyAncHgnO1xuICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuc3R5bGUubGVmdCA9IChldnQucGFnZVggLSBzdGF0ZS5kcmFnSW5mby5vZmZzZXRYKSArICdweCc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLnJlc2l6ZUluZm8pIHtcbiAgICAgICAgICAgICAgICBpZiAoc3RhdGUucmVzaXplSW5mby53aWR0aCkge1xuICAgICAgICAgICAgICAgICAgICBldnQudGFyZ2V0LnN0eWxlLndpZHRoID0gKGV2dC5wYWdlWCAtIHRvUHgoZXZ0LnRhcmdldC5zdHlsZS5sZWZ0KVxuICAgICAgICAgICAgICAgICAgICAgICAgLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUucGFkZGluZ0xlZnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAtIHRvUHgoZXZ0LnRhcmdldC5zdHlsZS5wYWRkaW5nUmlnaHQpKSArICdweCc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5zdHlsZS5oZWlnaHQgPSAoZXZ0LnBhZ2VZIC0gc3RhdGUucmVzaXplSW5mby5oZWlnaHQgLy8gdGhlIGVkaXRiYXIhXG4gICAgICAgICAgICAgICAgICAgICAgICAtIHRvUHgoZXZ0LnRhcmdldC5zdHlsZS50b3ApXG4gICAgICAgICAgICAgICAgICAgICAgICAtIHRvUHgoZXZ0LnRhcmdldC5zdHlsZS5wYWRkaW5nVG9wKVxuICAgICAgICAgICAgICAgICAgICAgICAgLSB0b1B4KGV2dC50YXJnZXQuc3R5bGUucGFkZGluZ0JvdHRvbSkpICsgJ3B4JztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuc3R5bGUuY3Vyc29yID1cbiAgICAgICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5jbGllbnRIZWlnaHQgLSBldnQub2Zmc2V0WSA8IDEwXG4gICAgICAgICAgICAgICAgICAgICAgICA/ICducy1yZXNpemUnXG4gICAgICAgICAgICAgICAgICAgICAgICA6IChldnQudGFyZ2V0LmNsaWVudFdpZHRoIC0gZXZ0Lm9mZnNldFggPCAxMFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gJ2V3LXJlc2l6ZSdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ICcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0U3RvcmU7XG4iLCJjb25zdCBFZGl0TW9kYWxTdG9yZSA9IChzdGF0ZSwgZW1pdHRlcikgPT4ge1xuICAgIGVtaXR0ZXIub24oJ2Nsb3NlRWRpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IG51bGw7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gbnVsbDtcbiAgICAgICAgc3RhdGUuZWRpdGluZ0ZpZWxkID0gbnVsbDtcbiAgICAgICAgc3RhdGUuZWRpdGluZ0ltYWdlID0gbnVsbDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3RvZ2dsZUZ1bmN0aW9uRWRpdCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5lZGl0aW5nRnVuY3Rpb24gPSBzdGF0ZS5lZGl0aW5nRnVuY3Rpb24gPyBmYWxzZSA6IHRydWU7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdwcm9wZXJ0eUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGxldCBwcm9wTmFtZSA9IGV2ZW50LnRhcmdldC5uYW1lO1xuICAgICAgICBsZXQgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG4gICAgICAgIGxldCBlZGl0UGF0aCA9IHN0YXRlLmVkaXRpbmdQYXRoO1xuXG4gICAgICAgIHN0YXRlLnNldFByb3BlcnR5QXRQYXRoKGVkaXRQYXRoLmNvbmNhdChbcHJvcE5hbWVdKSwgbmV3VmFsdWUpXG4gICAgICAgIC8qICovXG4gICAgICAgIGlmIChlZGl0UGF0aFswXSA9PT0gJ2NhcmRzJykge1xuICAgICAgICAgICAgc3RhdGUuY2FyZCA9IHN0YXRlW2VkaXRQYXRoWzBdXVtlZGl0UGF0aFsxXV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kID0gc3RhdGVbZWRpdFBhdGhbMF1dW2VkaXRQYXRoWzFdXTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nRWxlbWVudCkge1xuICAgICAgICAgICAgc3RhdGUuZWRpdGluZ0VsZW1lbnQgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ0ZpZWxkKSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nRmllbGQgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dW2VkaXRQYXRoWzJdXVtlZGl0UGF0aFszXV07XG4gICAgICAgIH0gLy8gaG1tIGRvIHdlIG5lZWQgYSByZWZhY3Rvcj8gTUFBQUFZWVlZWUJFXG4gICAgICAgIC8qICovXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICB9LCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2VkaXRTdGFjaycsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5lZGl0T2JqZWN0KFsnc3RhY2snXSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzdGFja1Byb3BlcnR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdQYXRoICYmIHN0YXRlLmVkaXRpbmdQYXRoWzBdID09PSAnc3RhY2snKSB7XG4gICAgICAgICAgICBjb25zdCBwcm9wTmFtZSA9IGV2ZW50LnRhcmdldC5uYW1lO1xuICAgICAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBldmVudC50YXJnZXQudmFsdWU7XG5cbiAgICAgICAgICAgIGlmIChbJ2NvbG9yJ10uaW5jbHVkZXMocHJvcE5hbWUpKSB7IC8vIGxpc3Qgd2lsbCBleHBhbmQgaW4gZnV0dXJlLCBvYnZzXG4gICAgICAgICAgICAgICAgc3RhdGVbcHJvcE5hbWVdID0gbmV3VmFsdWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgfVxuICAgIH0pXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRNb2RhbFN0b3JlO1xuIiwiY29uc3Qge21vZEVudiwgbW9kUGF0aH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgRWxlbWVudFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgY29uc3QgY2hhbmdlID0gbW9kRW52KHN0YXRlLCBlbWl0dGVyKTtcbiAgICBjb25zdCBwb2tlID0gbW9kUGF0aChzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBjb25zdCBibGFua0VsZW1lbnQgPSB7XG4gICAgICAgIFwidG9wXCI6IFwiMzAwcHhcIixcbiAgICAgICAgXCJsZWZ0XCI6IFwiMzAwcHhcIixcbiAgICAgICAgXCJoZWlnaHRcIjogXCIzNXB4XCIsXG4gICAgICAgIFwid2lkdGhcIjogXCIxMDBweFwiLFxuICAgICAgICBcImNvbG9yXCI6IFwiI2RkZFwiLFxuICAgICAgICBcInRleHRcIjogXCJcIixcbiAgICAgICAgXCJmb250XCI6IFwiXCIsXG4gICAgICAgIFwic2l6ZVwiOiBcIjEuNnJlbVwiLFxuICAgICAgICBcInN0eWxlXCI6IFwiXCIsXG4gICAgICAgIFwidGV4dENvbG9yXCI6IFwiIzMzM1wiLFxuICAgICAgICBcImNsYXNzXCI6IFwiXCIsXG4gICAgICAgIFwiYmVoYXZpb3JcIjogW11cbiAgICB9O1xuXG4gICAgZW1pdHRlci5vbignbmV3RWxlbWVudCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuZWxlbWVudHMucHVzaChPYmplY3QuYXNzaWduKHt9LCBibGFua0VsZW1lbnQpKTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2VkaXRFbGVtZW50JywgYXN5bmMgZnVuY3Rpb24oW2VsZW1lbnQsIGluZGV4LCBpc0NhcmQgPSBmYWxzZV0pIHtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0TW9kZSkge1xuICAgICAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCd0b2dnbGVFZGl0TW9kZScsIGlzQ2FyZCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuZWRpdE9iamVjdChbJ2VsZW1lbnRzJywgaW5kZXhdKVxuICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ3JlbmRlcicpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignbW92ZUVsZW1lbnQnLCBmdW5jdGlvbihbaW5kZXgsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmVsZW1lbnRzW2luZGV4XSxcbiAgICAgICAgICAgICAgICB7dG9wOiB5LCBsZWZ0OiB4fSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdyZXNpemVFbGVtZW50JywgZnVuY3Rpb24oW2luZGV4LCB4LCB5XSkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2FyZC5lbGVtZW50c1tpbmRleF0sXG4gICAgICAgICAgICAgICAge2hlaWdodDogeSwgd2lkdGg6IHh9KTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3NldEJlaGF2aW9yT2JqJywgZnVuY3Rpb24oW3BhdGgsIHZhbHVlXSkge1xuICAgICAgICBwb2tlKHBhdGgsIHZhbHVlKTtcbiAgICAgICAgLy8gcmVkdW5kYW50bHkgcmVuZGVyaW5nIGJlY2F1c2Ugc2VsZWN0IGVsZW1lbnRzIGFyZSB0aGUgd29yc3RcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGFzeW5jRW1pdCgpIHtcbiAgICAgICAgbGV0IGFyZ3MgPSBbLi4uYXJndW1lbnRzXTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdC5hcHBseShlbWl0dGVyLCBhcmdzKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocmVzb2x2ZSwgMSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGVtaXR0ZXIub24oJ2RlbGV0ZUVsZW1lbnQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBzdGF0ZS5nZXRFZGl0ZWRPYmplY3RJbmRleCgpO1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuZWxlbWVudHMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICAgICAgZW1pdHRlci5lbWl0KCdjbG9zZUVkaXQnKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWxlbWVudFN0b3JlO1xuIiwiY29uc3Qge21vZEVudiwgbW9kUGF0aCwgdW5pcXVlTmFtZX0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3Qgc2F2ZUZpZWxkVG9TdGF0ZSA9IGZ1bmN0aW9uKGV2ZW50LCBmaWVsZCwgc3RhdGUpIHtcbiAgICBjb25zdCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcblxuICAgIGlmIChzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpLmZpZWxkc1tmaWVsZC5uYW1lXSkge1xuICAgICAgICBzdGF0ZS5zZXRDdXJyZW50Q2FyZFByb3BlcnR5KFsnZmllbGRzJywgZmllbGQubmFtZSwgJ3ZhbHVlJ10sIG5ld1ZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdGF0ZS5zZXRDdXJyZW50Q2FyZFByb3BlcnR5KFsndmFsdWVzJywgZmllbGQubmFtZV0sIG5ld1ZhbHVlKTtcbiAgICB9XG59O1xuXG5jb25zdCBGaWVsZFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbihcImZpZWxkY2hhbmdlXCIsIGZ1bmN0aW9uKFtldmVudCwgZmllbGRdKSB7XG4gICAgICAgIHNhdmVGaWVsZFRvU3RhdGUoZXZlbnQsIGZpZWxkLCBzdGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KFwicmVuZGVyXCIpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KFwic2F2ZVwiKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSk7XG4gICAgZW1pdHRlci5vbihcImZpZWxkS2V5VXBcIiwgKFtldmVudCwgZmllbGRdKSA9PiB7XG4gICAgICAgIHNhdmVGaWVsZFRvU3RhdGUoZXZlbnQsIGZpZWxkLCBzdGF0ZSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KFwic2F2ZVwiKSwgMSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBibGFua0ZpZWxkID0ge1xuICAgICAgICBuYW1lOiBcIlwiLFxuICAgICAgICB0b3A6IFwiMzAwcHhcIixcbiAgICAgICAgbGVmdDogXCIzMDBweFwiLFxuICAgICAgICBoZWlnaHQ6IFwiMTRweFwiLFxuICAgICAgICB3aWR0aDogXCIxODBweFwiLFxuICAgICAgICBjb2xvcjogXCJcIixcbiAgICAgICAgZm9udDogXCJcIixcbiAgICAgICAgc2l6ZTogXCJcIixcbiAgICAgICAgc3R5bGU6IFwiXCIsXG4gICAgICAgIHRleHRDb2xvcjogXCJcIixcbiAgICAgICAgZmllbGRUeXBlOiBcInRleHRcIixcbiAgICAgICAgdmFsdWU6IFwiXCIsXG4gICAgICAgIG9wdGlvbnM6IFtdLFxuICAgICAgICBwbGFjZWhvbGRlcjogXCJcIixcbiAgICAgICAgYmVoYXZpb3I6IFtdXG4gICAgfTtcblxuICAgIGNvbnN0IGNoYW5nZSA9IG1vZEVudihzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBlbWl0dGVyLm9uKFwibmV3RmllbGRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgIGxldCBmaWVsZE5hbWUgPSB1bmlxdWVOYW1lKFxuICAgICAgICAgICAgc3RhdGUuZ2V0RWRpdFNjb3BlUGF0aCgpLmNvbmNhdChbJ2ZpZWxkcyddKSxcbiAgICAgICAgICAgICduZXdGaWVsZCdcbiAgICAgICAgKTtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBjYXJkLmZpZWxkc1tmaWVsZE5hbWVdID0gT2JqZWN0LmFzc2lnbih7fSwgYmxhbmtGaWVsZCwge1xuICAgICAgICAgICAgICAgIG5hbWU6IGZpZWxkTmFtZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKFwibW92ZUZpZWxkXCIsIGZ1bmN0aW9uKFtmaWVsZE5hbWUsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmZpZWxkc1tmaWVsZE5hbWVdLFxuICAgICAgICAgICAgICAgIHt0b3A6IHksIGxlZnQ6IHh9KTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oXCJyZXNpemVGaWVsZFwiLCBmdW5jdGlvbihbZmllbGROYW1lLCB4LCB5XSkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2FyZC5maWVsZHNbZmllbGROYW1lXSxcbiAgICAgICAgICAgICAgICB7aGVpZ2h0OiB5LCB3aWR0aDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdEZpZWxkJywgZnVuY3Rpb24oW2ZpZWxkLCBuYW1lLCBpc0NhcmQgPSBmYWxzZV0pIHtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0aW5nKCkpIHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgndG9nZ2xlRWRpdE1vZGUnKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoKHN0YXRlLmVkaXRpbmdCYWNrZ3JvdW5kKCkgJiYgIWlzQ2FyZCkgfHxcbiAgICAgICAgICAgIChzdGF0ZS5lZGl0aW5nQ2FyZCgpICYmIGlzQ2FyZCkpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRPYmplY3QoWydmaWVsZHMnLCBuYW1lXSk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzZXRGaWVsZE9wdGlvbnMnLCBmdW5jdGlvbihvcHRpb25zKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3RhdGUuZ2V0RWRpdGVkT2JqZWN0SW5kZXgoKTtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBjYXJkLmZpZWxkc1tpbmRleF0ub3B0aW9ucyA9IG9wdGlvbnM7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSlcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2RlbGV0ZUZpZWxkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNvbnN0IGluZGV4ID0gc3RhdGUuZ2V0RWRpdGVkT2JqZWN0SW5kZXgoKTtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBkZWxldGUgY2FyZC5maWVsZHNbaW5kZXhdO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ2Nsb3NlRWRpdCcpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBGaWVsZFN0b3JlO1xuIiwiY29uc3Qge21vZEVudn0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgSW1hZ2VTdG9yZSA9IChzdGF0ZSwgZW1pdHRlcikgPT4ge1xuICAgIGNvbnN0IGNoYW5nZSA9IG1vZEVudihzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBlbWl0dGVyLm9uKCdhZGRJbWFnZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIC8vIGNvcHBlZCBhbmQgbW9kaWZpZWQgZnJvbSBAdGFyYXZhbmNpbCdzIGRhdC1waG90by1hcHBcbiAgICAgICAgaWYgKGV2ZW50LnRhcmdldC5maWxlcykge1xuICAgICAgICAgICAgY29uc3Qge2ZpbGVzfSA9IGV2ZW50LnRhcmdldDtcbiAgICAgICAgICAgIGNvbnN0IGFyY2hpdmUgPSBuZXcgRGF0QXJjaGl2ZSh3aW5kb3cubG9jYXRpb24pO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpbGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gZmlsZXNbaV07XG5cbiAgICAgICAgICAgICAgICByZWFkZXIub25sb2FkID0gYXN5bmMgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgL2ltZy8ke2ZpbGUubmFtZX1gO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmllbnRhdGlvbiA9IHJlYWRPcmllbnRhdGlvbk1ldGFkYXRhKHJlYWRlci5yZXN1bHQpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gYXdhaXQgYXJjaGl2ZS5zdGF0KHBhdGgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb21wbGFpbnQgPVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgSW1hZ2Ugd2l0aCB0aGUgbmFtZSBcIiR7ZmlsZS5uYW1lfVwiIGFscmVhZHkgZXhpc3RzLiBSZXBsYWNlIGl0P2A7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHdpbmRvdy5jb25maXJtKGNvbXBsYWludCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgYXJjaGl2ZS53cml0ZUZpbGUocGF0aCwgcmVhZGVyLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGFyY2hpdmUuY29tbWl0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFkZEltYWdlT2JqZWN0KHBhdGgsIG9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IGFyY2hpdmUud3JpdGVGaWxlKHBhdGgsIHJlYWRlci5yZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgYXJjaGl2ZS5jb21taXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZEltYWdlT2JqZWN0KHBhdGgsIG9yaWVudGF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlLmFkZGluZ0ltYWdlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZWFkZXIucmVhZEFzQXJyYXlCdWZmZXIoZmlsZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBhc3N1bWluZyBhIGZpbGVuYW1lIGZyb20gdGhlIG1lbnUgb2YgZXhpc3RpbmcgZmlsZXNcbiAgICAgICAgICAgIGlmIChldmVudC50YXJnZXQudmFsdWUgIT09IG51bGwgJiYgZXZlbnQudGFyZ2V0LnZhbHVlICE9ICdudWxsJykgeyAvLyAqc2lnaCpcbiAgICAgICAgICAgICAgICBhZGRJbWFnZU9iamVjdChgL2ltZy8ke2V2ZW50LnRhcmdldC52YWx1ZX1gKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5hZGRpbmdJbWFnZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgICAgICAgICB9LCAxKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gYWRkSW1hZ2VPYmplY3QocGF0aCwgb3JpZW50YXRpb24gPSAxKSB7XG4gICAgICAgIGNvbnN0IG5ld2d1eSA9IHtcbiAgICAgICAgICAgIHRvcDogJzMwMHB4JyxcbiAgICAgICAgICAgIGxlZnQ6ICczMDBweCcsXG4gICAgICAgICAgICBzcmM6IHBhdGgsXG4gICAgICAgICAgICBvcmllbnRhdGlvbixcbiAgICAgICAgICAgIGJlaGF2aW9yOiBbXVxuICAgICAgICB9O1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuaW1hZ2VzLnB1c2gobmV3Z3V5KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gYWxzbyBjcmliYmVkIGZyb20gZGF0LXBob3RvLWFwcCBhbmQgbm90IGV2ZW4gbW9kaWZpZWQgYmVjYXVzZSBJIGFtIG5vdCBzbWFydFxuICAgIGZ1bmN0aW9uIHJlYWRPcmllbnRhdGlvbk1ldGFkYXRhIChidWYpIHtcbiAgICAgICAgY29uc3Qgc2Nhbm5lciA9IG5ldyBEYXRhVmlldyhidWYpO1xuICAgICAgICBsZXQgaWR4ID0gMDtcbiAgICAgICAgbGV0IHZhbHVlID0gMTsgLy8gTm9uLXJvdGF0ZWQgaXMgdGhlIGRlZmF1bHRcblxuICAgICAgICBpZiAoYnVmLmxlbmd0aCA8IDIgfHwgc2Nhbm5lci5nZXRVaW50MTYoaWR4KSAhPSAweEZGRDgpIHtcbiAgICAgICAgICAvLyBub3QgYSBKUEVHXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWR4ICs9IDI7XG5cbiAgICAgICAgbGV0IG1heEJ5dGVzID0gc2Nhbm5lci5ieXRlTGVuZ3RoO1xuICAgICAgICB3aGlsZShpZHggPCBtYXhCeXRlcyAtIDIpIHtcbiAgICAgICAgICBsZXQgdWludDE2ID0gc2Nhbm5lci5nZXRVaW50MTYoaWR4KTtcbiAgICAgICAgICBpZHggKz0gMjtcbiAgICAgICAgICBzd2l0Y2godWludDE2KSB7XG4gICAgICAgICAgICBjYXNlIDB4RkZFMTogLy8gU3RhcnQgb2YgRVhJRlxuICAgICAgICAgICAgICB2YXIgZXhpZkxlbmd0aCA9IHNjYW5uZXIuZ2V0VWludDE2KGlkeCk7XG4gICAgICAgICAgICAgIG1heEJ5dGVzID0gZXhpZkxlbmd0aCAtIGlkeDtcbiAgICAgICAgICAgICAgaWR4ICs9IDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAweDAxMTI6IC8vIE9yaWVudGF0aW9uIHRhZ1xuICAgICAgICAgICAgICAvLyBSZWFkIHRoZSB2YWx1ZSwgaXRzIDYgYnl0ZXMgZnVydGhlciBvdXRcbiAgICAgICAgICAgICAgLy8gU2VlIHBhZ2UgMTAyIGF0IHRoZSBmb2xsb3dpbmcgVVJMXG4gICAgICAgICAgICAgIC8vIGh0dHA6Ly93d3cua29kYWsuY29tL2dsb2JhbC9wbHVnaW5zL2Fjcm9iYXQvZW4vc2VydmljZS9kaWdDYW0vZXhpZlN0YW5kYXJkMi5wZGZcbiAgICAgICAgICAgICAgdmFsdWUgPSBzY2FubmVyLmdldFVpbnQxNihpZHggKyA2LCBmYWxzZSk7XG4gICAgICAgICAgICAgIG1heEJ5dGVzID0gMDsgLy8gU3RvcCBzY2FubmluZ1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIGVtaXR0ZXIub24oJ2VkaXRJbWFnZScsIGZ1bmN0aW9uKFtpbWFnZSwgaW5kZXhdKSB7XG4gICAgICAgIGlmICghc3RhdGUuZWRpdGluZygpKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3RvZ2dsZUVkaXRNb2RlJyk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuZWRpdE9iamVjdChbJ2ltYWdlcycsIGluZGV4XSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdtb3ZlSW1hZ2UnLCBmdW5jdGlvbihbaW5kZXgsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmltYWdlc1tpbmRleF0sIHt0b3A6IHksIGxlZnQ6IHh9KTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3Jlc2l6ZUltYWdlJywgZnVuY3Rpb24oW2luZGV4LCB4LCB5XSkge1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24oY2FyZC5pbWFnZXNbaW5kZXhdLCB7aGVpZ2h0OiB5LCB3aWR0aDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZGVsZXRlSW1hZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBzdGF0ZS5nZXRFZGl0ZWRPYmplY3RJbmRleCgpO1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuaW1hZ2VzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgnY2xvc2VFZGl0Jyk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEltYWdlU3RvcmU7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5jb25zdCB1dWlkID0gcmVxdWlyZSgndXVpZC92MScpO1xuXG5cbmZ1bmN0aW9uIG1vZEVudihzdGF0ZSwgZW1pdHRlcikge1xuICAgIHJldHVybiBmdW5jdGlvbihob3cpIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0Jykge1xuICAgICAgICAgICAgbGV0IG5ld0JnU3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZS5iYWNrZ3JvdW5kc1tzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF0pO1xuICAgICAgICAgICAgbmV3QmdTdGF0ZSA9IGhvdyhuZXdCZ1N0YXRlKTtcbiAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXSA9IHN0YXRlLmJhY2tncm91bmQgPSBuZXdCZ1N0YXRlO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnKSB7XG4gICAgICAgICAgICBsZXQgbmV3Q2FyZFN0YXRlID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdKTtcbiAgICAgICAgICAgIG5ld0NhcmRTdGF0ZSA9IGhvdyhuZXdDYXJkU3RhdGUpO1xuICAgICAgICAgICAgc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdID0gc3RhdGUuY2FyZCA9IG5ld0NhcmRTdGF0ZTtcbiAgICAgICAgfVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfVxufVxuXG4vLyBpZiBzdGF0ZSBnZXRzIGJpZyB0aGlzIG1pZ2h0IHNlcmlvdXNseSBtZXNzIHVzIHVwLiBsZXQncyBzZWVcbmZ1bmN0aW9uIG1vZFBhdGgoc3RhdGUsIGVtaXR0ZXIpIHtcbiAgICBjb25zdCBnZXRBbmRSZXBsYWNlUGF0aCA9IGZ1bmN0aW9uKHBhdGgsIHZhbHVlLCBpbldoYXQpIHtcbiAgICAgICAgbGV0IGN1cnJUYXJnZXQ7XG4gICAgICAgIGlmIChwYXRoLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGN1cnJUYXJnZXQgPSBwYXRoLnNoaWZ0KCk7XG4gICAgICAgICAgICBpbldoYXRbY3VyclRhcmdldF0gPVxuICAgICAgICAgICAgICAgIGdldEFuZFJlcGxhY2VQYXRoKHBhdGgsIHZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBBcnJheS5pc0FycmF5KGluV2hhdFtjdXJyVGFyZ2V0XSlcbiAgICAgICAgICAgICAgICAgICAgICAgID8gW10uY29uY2F0KGluV2hhdFtjdXJyVGFyZ2V0XSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogT2JqZWN0LmFzc2lnbih7fSwgaW5XaGF0W2N1cnJUYXJnZXRdKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpbldoYXRbcGF0aFswXV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaW5XaGF0O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbihwYXRoLCB2YWx1ZSkge1xuICAgICAgICBzdGF0ZSA9IGdldEFuZFJlcGxhY2VQYXRoKFtdLmNvbmNhdChwYXRoKSwgdmFsdWUsIHN0YXRlKTtcbiAgICAgICAgc3RhdGUuY2FyZCA9IHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXTtcbiAgICAgICAgc3RhdGUuYmFja2dyb3VuZCA9IHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZ2V0UGF0aChzdGF0ZSwgcGF0aCkge1xuICAgIGNvbnN0IGNvbnN1bWVUaGlzUGF0aCA9IFtdLmNvbmNhdChwYXRoKTtcbiAgICBsZXQgcmV0dXJuZWQgPSBzdGF0ZVtjb25zdW1lVGhpc1BhdGguc2hpZnQoKV07XG4gICAgd2hpbGUgKGNvbnN1bWVUaGlzUGF0aC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuZWQgPSByZXR1cm5lZFtjb25zdW1lVGhpc1BhdGguc2hpZnQoKV07XG4gICAgfVxuICAgIHJldHVybiByZXR1cm5lZDtcbn1cblxuZnVuY3Rpb24gdG9QeChzdHJWYWwpIHtcbiAgICBjb25zdCB0cnlhdmFsID0gcGFyc2VJbnQoc3RyVmFsLnN1YnN0cmluZygwLCBzdHJWYWwuaW5kZXhPZigncHgnKSkpO1xuICAgIHJldHVybiBOdW1iZXIuaXNOYU4odHJ5YXZhbCkgPyAwIDogdHJ5YXZhbDtcbn1cblxuZnVuY3Rpb24gc2VsZWN0T3B0aW9uKHZhbCwgbGFiZWwsIGNvbXBhcmVWYWwsIHJlYWN0S2V5KSB7XG4gICAgaWYgKHR5cGVvZiBjb21wYXJlVmFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBjb21wYXJlVmFsID0gbGFiZWw7XG4gICAgICAgIGxhYmVsID0gdmFsO1xuICAgIH1cbiAgICBjb25zdCBvcHRzID0gW1xuICAgICAgICBodG1sYDxvcHRpb24gaWQ9XCIke3JlYWN0S2V5IHx8ICcnfVwiIHZhbHVlPVwiJHt2YWx9XCIgc2VsZWN0ZWQ9XCJzZWxlY3RlZFwiPiR7bGFiZWx9PC9vcHRpb24+YCxcbiAgICAgICAgaHRtbGA8b3B0aW9uIGlkPVwiJHtyZWFjdEtleSB8fCAnJ31cIiB2YWx1ZT1cIiR7dmFsfVwiPiR7bGFiZWx9PC9vcHRpb24+YFxuICAgIF07XG4gICAgLy8gYWx3YXlzIHJlLXJlbmRlciBvcHRpb25zXG4gICAgb3B0c1swXS5pc1NhbWVOb2RlID0gb3B0c1sxXS5pc1NhbWVOb2RlID0gKCkgPT4gZmFsc2U7XG5cbiAgICBpZiAodHlwZW9mIGNvbXBhcmVWYWwgPT09ICdib29sZWFuJykge1xuICAgICAgICByZXR1cm4gY29tcGFyZVZhbCA/IG9wdHNbMF0gOiBvcHRzWzFdO1xuICAgIH1cbiAgICByZXR1cm4gY29tcGFyZVZhbCA9PSB2YWwgPyBvcHRzWzBdIDogb3B0c1sxXTtcbn1cblxuZnVuY3Rpb24gY2hlY2tCb3gobGFiZWwsIGNoZWNrZCwgaGFuZGxlciwgbmFtZSkge1xuICAgIGlmICghbmFtZSkge1xuICAgICAgICBuYW1lID0gdXVpZCgpO1xuICAgIH1cbiAgICBjb25zdCBvcHRzID0gW1xuICAgICAgICBodG1sYDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBvbmNoYW5nZT0ke2hhbmRsZXJ9IGNoZWNrZWQ9XCJjaGVja2VkXCIgbmFtZT1cIiR7bmFtZX1cIiAvPmAsXG4gICAgICAgIGh0bWxgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG9uY2hhbmdlPSR7aGFuZGxlcn0gbmFtZT1cIiR7bmFtZX1cIiAvPmBcbiAgICBdO1xuICAgIHJldHVybiBodG1sYDxzcGFuIGNsYXNzPVwiY2hlY2tib3hcIj5cbiAgICAgICAgJHtjaGVja2QgPyBvcHRzWzBdIDogb3B0c1sxXX1cbiAgICAgICAgPGxhYmVsIGZvcj1cIiR7bmFtZX1cIj4ke2xhYmVsfTwvbGFiZWw+XG4gICAgPC9zcGFuPmA7XG59XG5cbmZ1bmN0aW9uIGZpZWxkc1dpdGhWYWx1ZXMoc3RhdGUpIHtcbiAgICBjb25zdCBsZUNhcmQgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF0pO1xuICAgIGNvbnN0IGxlQmcgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZS5iYWNrZ3JvdW5kc1tzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF0pO1xuICAgIGNvbnN0IGZpZWxkc1dpdGhWYWx1ZXMgPSBPYmplY3Qua2V5cyhsZUNhcmQuZmllbGRzKS5yZWR1Y2UoKG9iaiwgZmxkKSA9PiB7XG4gICAgICAgIG9ialtmbGRdID0gbGVDYXJkLmZpZWxkc1tmbGRdLnZhbHVlO1xuICAgICAgICByZXR1cm4gb2JqO1xuICAgIH0sIHt9KTtcbiAgICBPYmplY3QuYXNzaWduKGZpZWxkc1dpdGhWYWx1ZXMsIGxlQ2FyZC52YWx1ZXMpO1xuICAgIC8vIG9oIGdvZCBmaWVsZHMgd2lsbCBuZWVkIHRoZSBjb25jZXB0IG9mIGRlZmF1bHQgdmFsdWVzLCBmb3IgcmFkaW9zXG4gICAgLy8gYXQgbGVhc3Qgd2hlbiBmaXJzdCBjcmVhdGVkXG4gICAgcmV0dXJuIGZpZWxkc1dpdGhWYWx1ZXM7XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZU5hbWUoc2NvcGVQYXRoLCBuYW1lU3R1YiA9ICduZXdHdXknKSB7XG4gICAgY29uc3QgbG9jYXRpb24gPSBzdGF0ZS5nZXRQcm9wZXJ0eUF0UGF0aChzY29wZVBhdGgpO1xuICAgIGxldCB0cnludW0gPSAxO1xuICAgIGxldCB0cnlBTmFtZSA9IGAke25hbWVTdHVifSR7dHJ5bnVtfWA7XG4gICAgd2hpbGUgKHR5cGVvZiBsb2NhdGlvblt0cnlBTmFtZV0gIT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICB0cnlBTmFtZSA9IGAke25hbWVTdHVifSR7Kyt0cnludW19YDtcbiAgICB9XG4gICAgcmV0dXJuIHRyeUFOYW1lO1xufTtcblxuZnVuY3Rpb24gY29sb3Ioc3RhdGUpIHtcbiAgICBpZiAoc3RhdGUuY2FyZCAmJiBzdGF0ZS5jYXJkLmNvbG9yKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkLmNvbG9yO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuYmFja2dyb3VuZCAmJiBzdGF0ZS5iYWNrZ3JvdW5kLmNvbG9yKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5iYWNrZ3JvdW5kLmNvbG9yO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuY29sb3IpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNvbG9yO1xuICAgIH1cbiAgICByZXR1cm4gJ2luaGVyaXQnO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHttb2RFbnYsIG1vZFBhdGgsIGdldFBhdGgsIHRvUHgsIHNlbGVjdE9wdGlvbiwgY2hlY2tCb3gsIGZpZWxkc1dpdGhWYWx1ZXMsIHVuaXF1ZU5hbWUsIGNvbG9yfTtcbiIsInZhciBkb2N1bWVudCA9IHJlcXVpcmUoJ2dsb2JhbC9kb2N1bWVudCcpXG52YXIgaHlwZXJ4ID0gcmVxdWlyZSgnaHlwZXJ4JylcbnZhciBvbmxvYWQgPSByZXF1aXJlKCdvbi1sb2FkJylcblxudmFyIFNWR05TID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJ1xudmFyIFhMSU5LTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluaydcblxudmFyIEJPT0xfUFJPUFMgPSB7XG4gIGF1dG9mb2N1czogMSxcbiAgY2hlY2tlZDogMSxcbiAgZGVmYXVsdGNoZWNrZWQ6IDEsXG4gIGRpc2FibGVkOiAxLFxuICBmb3Jtbm92YWxpZGF0ZTogMSxcbiAgaW5kZXRlcm1pbmF0ZTogMSxcbiAgcmVhZG9ubHk6IDEsXG4gIHJlcXVpcmVkOiAxLFxuICBzZWxlY3RlZDogMSxcbiAgd2lsbHZhbGlkYXRlOiAxXG59XG52YXIgQ09NTUVOVF9UQUcgPSAnIS0tJ1xudmFyIFNWR19UQUdTID0gW1xuICAnc3ZnJyxcbiAgJ2FsdEdseXBoJywgJ2FsdEdseXBoRGVmJywgJ2FsdEdseXBoSXRlbScsICdhbmltYXRlJywgJ2FuaW1hdGVDb2xvcicsXG4gICdhbmltYXRlTW90aW9uJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2NsaXBQYXRoJywgJ2NvbG9yLXByb2ZpbGUnLFxuICAnY3Vyc29yJywgJ2RlZnMnLCAnZGVzYycsICdlbGxpcHNlJywgJ2ZlQmxlbmQnLCAnZmVDb2xvck1hdHJpeCcsXG4gICdmZUNvbXBvbmVudFRyYW5zZmVyJywgJ2ZlQ29tcG9zaXRlJywgJ2ZlQ29udm9sdmVNYXRyaXgnLCAnZmVEaWZmdXNlTGlnaHRpbmcnLFxuICAnZmVEaXNwbGFjZW1lbnRNYXAnLCAnZmVEaXN0YW50TGlnaHQnLCAnZmVGbG9vZCcsICdmZUZ1bmNBJywgJ2ZlRnVuY0InLFxuICAnZmVGdW5jRycsICdmZUZ1bmNSJywgJ2ZlR2F1c3NpYW5CbHVyJywgJ2ZlSW1hZ2UnLCAnZmVNZXJnZScsICdmZU1lcmdlTm9kZScsXG4gICdmZU1vcnBob2xvZ3knLCAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsXG4gICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLCAnZmVUdXJidWxlbmNlJywgJ2ZpbHRlcicsICdmb250JywgJ2ZvbnQtZmFjZScsXG4gICdmb250LWZhY2UtZm9ybWF0JywgJ2ZvbnQtZmFjZS1uYW1lJywgJ2ZvbnQtZmFjZS1zcmMnLCAnZm9udC1mYWNlLXVyaScsXG4gICdmb3JlaWduT2JqZWN0JywgJ2cnLCAnZ2x5cGgnLCAnZ2x5cGhSZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLCAnbGluZScsXG4gICdsaW5lYXJHcmFkaWVudCcsICdtYXJrZXInLCAnbWFzaycsICdtZXRhZGF0YScsICdtaXNzaW5nLWdseXBoJywgJ21wYXRoJyxcbiAgJ3BhdGgnLCAncGF0dGVybicsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JhZGlhbEdyYWRpZW50JywgJ3JlY3QnLFxuICAnc2V0JywgJ3N0b3AnLCAnc3dpdGNoJywgJ3N5bWJvbCcsICd0ZXh0JywgJ3RleHRQYXRoJywgJ3RpdGxlJywgJ3RyZWYnLFxuICAndHNwYW4nLCAndXNlJywgJ3ZpZXcnLCAndmtlcm4nXG5dXG5cbmZ1bmN0aW9uIGJlbENyZWF0ZUVsZW1lbnQgKHRhZywgcHJvcHMsIGNoaWxkcmVuKSB7XG4gIHZhciBlbFxuXG4gIC8vIElmIGFuIHN2ZyB0YWcsIGl0IG5lZWRzIGEgbmFtZXNwYWNlXG4gIGlmIChTVkdfVEFHUy5pbmRleE9mKHRhZykgIT09IC0xKSB7XG4gICAgcHJvcHMubmFtZXNwYWNlID0gU1ZHTlNcbiAgfVxuXG4gIC8vIElmIHdlIGFyZSB1c2luZyBhIG5hbWVzcGFjZVxuICB2YXIgbnMgPSBmYWxzZVxuICBpZiAocHJvcHMubmFtZXNwYWNlKSB7XG4gICAgbnMgPSBwcm9wcy5uYW1lc3BhY2VcbiAgICBkZWxldGUgcHJvcHMubmFtZXNwYWNlXG4gIH1cblxuICAvLyBDcmVhdGUgdGhlIGVsZW1lbnRcbiAgaWYgKG5zKSB7XG4gICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMobnMsIHRhZylcbiAgfSBlbHNlIGlmICh0YWcgPT09IENPTU1FTlRfVEFHKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUNvbW1lbnQocHJvcHMuY29tbWVudClcbiAgfSBlbHNlIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKVxuICB9XG5cbiAgLy8gSWYgYWRkaW5nIG9ubG9hZCBldmVudHNcbiAgaWYgKHByb3BzLm9ubG9hZCB8fCBwcm9wcy5vbnVubG9hZCkge1xuICAgIHZhciBsb2FkID0gcHJvcHMub25sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgdmFyIHVubG9hZCA9IHByb3BzLm9udW5sb2FkIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgb25sb2FkKGVsLCBmdW5jdGlvbiBiZWxPbmxvYWQgKCkge1xuICAgICAgbG9hZChlbClcbiAgICB9LCBmdW5jdGlvbiBiZWxPbnVubG9hZCAoKSB7XG4gICAgICB1bmxvYWQoZWwpXG4gICAgfSxcbiAgICAvLyBXZSBoYXZlIHRvIHVzZSBub24tc3RhbmRhcmQgYGNhbGxlcmAgdG8gZmluZCB3aG8gaW52b2tlcyBgYmVsQ3JlYXRlRWxlbWVudGBcbiAgICBiZWxDcmVhdGVFbGVtZW50LmNhbGxlci5jYWxsZXIuY2FsbGVyKVxuICAgIGRlbGV0ZSBwcm9wcy5vbmxvYWRcbiAgICBkZWxldGUgcHJvcHMub251bmxvYWRcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgcHJvcGVydGllc1xuICBmb3IgKHZhciBwIGluIHByb3BzKSB7XG4gICAgaWYgKHByb3BzLmhhc093blByb3BlcnR5KHApKSB7XG4gICAgICB2YXIga2V5ID0gcC50b0xvd2VyQ2FzZSgpXG4gICAgICB2YXIgdmFsID0gcHJvcHNbcF1cbiAgICAgIC8vIE5vcm1hbGl6ZSBjbGFzc05hbWVcbiAgICAgIGlmIChrZXkgPT09ICdjbGFzc25hbWUnKSB7XG4gICAgICAgIGtleSA9ICdjbGFzcydcbiAgICAgICAgcCA9ICdjbGFzcydcbiAgICAgIH1cbiAgICAgIC8vIFRoZSBmb3IgYXR0cmlidXRlIGdldHMgdHJhbnNmb3JtZWQgdG8gaHRtbEZvciwgYnV0IHdlIGp1c3Qgc2V0IGFzIGZvclxuICAgICAgaWYgKHAgPT09ICdodG1sRm9yJykge1xuICAgICAgICBwID0gJ2ZvcidcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgaXMgYm9vbGVhbiwgc2V0IGl0c2VsZiB0byB0aGUga2V5XG4gICAgICBpZiAoQk9PTF9QUk9QU1trZXldKSB7XG4gICAgICAgIGlmICh2YWwgPT09ICd0cnVlJykgdmFsID0ga2V5XG4gICAgICAgIGVsc2UgaWYgKHZhbCA9PT0gJ2ZhbHNlJykgY29udGludWVcbiAgICAgIH1cbiAgICAgIC8vIElmIGEgcHJvcGVydHkgcHJlZmVycyBiZWluZyBzZXQgZGlyZWN0bHkgdnMgc2V0QXR0cmlidXRlXG4gICAgICBpZiAoa2V5LnNsaWNlKDAsIDIpID09PSAnb24nKSB7XG4gICAgICAgIGVsW3BdID0gdmFsXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAobnMpIHtcbiAgICAgICAgICBpZiAocCA9PT0gJ3hsaW5rOmhyZWYnKSB7XG4gICAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGVOUyhYTElOS05TLCBwLCB2YWwpXG4gICAgICAgICAgfSBlbHNlIGlmICgvXnhtbG5zKCR8OikvaS50ZXN0KHApKSB7XG4gICAgICAgICAgICAvLyBza2lwIHhtbG5zIGRlZmluaXRpb25zXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKG51bGwsIHAsIHZhbClcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWwuc2V0QXR0cmlidXRlKHAsIHZhbClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGFwcGVuZENoaWxkIChjaGlsZHMpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoY2hpbGRzKSkgcmV0dXJuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBub2RlID0gY2hpbGRzW2ldXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShub2RlKSkge1xuICAgICAgICBhcHBlbmRDaGlsZChub2RlKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdudW1iZXInIHx8XG4gICAgICAgIHR5cGVvZiBub2RlID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgdHlwZW9mIG5vZGUgPT09ICdmdW5jdGlvbicgfHxcbiAgICAgICAgbm9kZSBpbnN0YW5jZW9mIERhdGUgfHxcbiAgICAgICAgbm9kZSBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICBub2RlID0gbm9kZS50b1N0cmluZygpXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgaWYgKGVsLmxhc3RDaGlsZCAmJiBlbC5sYXN0Q2hpbGQubm9kZU5hbWUgPT09ICcjdGV4dCcpIHtcbiAgICAgICAgICBlbC5sYXN0Q2hpbGQubm9kZVZhbHVlICs9IG5vZGVcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICB9XG4gICAgICAgIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShub2RlKVxuICAgICAgfVxuXG4gICAgICBpZiAobm9kZSAmJiBub2RlLm5vZGVUeXBlKSB7XG4gICAgICAgIGVsLmFwcGVuZENoaWxkKG5vZGUpXG4gICAgICB9XG4gICAgfVxuICB9XG4gIGFwcGVuZENoaWxkKGNoaWxkcmVuKVxuXG4gIHJldHVybiBlbFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGh5cGVyeChiZWxDcmVhdGVFbGVtZW50LCB7Y29tbWVudHM6IHRydWV9KVxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IG1vZHVsZS5leHBvcnRzXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID0gYmVsQ3JlYXRlRWxlbWVudFxuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCdiZWwnKVxuIiwidmFyIGRvY3VtZW50UmVhZHkgPSByZXF1aXJlKCdkb2N1bWVudC1yZWFkeScpXG52YXIgbmFub2hpc3RvcnkgPSByZXF1aXJlKCduYW5vaGlzdG9yeScpXG52YXIgbmFub3JvdXRlciA9IHJlcXVpcmUoJ25hbm9yb3V0ZXInKVxudmFyIG5hbm9tb3VudCA9IHJlcXVpcmUoJ25hbm9tb3VudCcpXG52YXIgbmFub21vcnBoID0gcmVxdWlyZSgnbmFub21vcnBoJylcbnZhciBuYW5vaHJlZiA9IHJlcXVpcmUoJ25hbm9ocmVmJylcbnZhciBuYW5vcmFmID0gcmVxdWlyZSgnbmFub3JhZicpXG52YXIgbmFub2J1cyA9IHJlcXVpcmUoJ25hbm9idXMnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gQ2hvb1xuXG5mdW5jdGlvbiBDaG9vIChvcHRzKSB7XG4gIG9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgdmFyIHJvdXRlck9wdHMgPSB7XG4gICAgZGVmYXVsdDogb3B0cy5kZWZhdWx0Um91dGUgfHwgJy80MDQnLFxuICAgIGN1cnJ5OiB0cnVlXG4gIH1cblxuICB2YXIgdGltaW5nRW5hYmxlZCA9IG9wdHMudGltaW5nID09PSB1bmRlZmluZWQgPyB0cnVlIDogb3B0cy50aW1pbmdcbiAgdmFyIGhhc1dpbmRvdyA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gIHZhciBoYXNQZXJmb3JtYW5jZSA9IGhhc1dpbmRvdyAmJiB3aW5kb3cucGVyZm9ybWFuY2UgJiYgd2luZG93LnBlcmZvcm1hbmNlLm1hcmtcbiAgdmFyIHJvdXRlciA9IG5hbm9yb3V0ZXIocm91dGVyT3B0cylcbiAgdmFyIGJ1cyA9IG5hbm9idXMoKVxuICB2YXIgcmVyZW5kZXIgPSBudWxsXG4gIHZhciB0cmVlID0gbnVsbFxuICB2YXIgc3RhdGUgPSB7fVxuXG4gIHJldHVybiB7XG4gICAgdG9TdHJpbmc6IHRvU3RyaW5nLFxuICAgIHVzZTogcmVnaXN0ZXIsXG4gICAgbW91bnQ6IG1vdW50LFxuICAgIHJvdXRlcjogcm91dGVyLFxuICAgIHJvdXRlOiByb3V0ZSxcbiAgICBzdGFydDogc3RhcnRcbiAgfVxuXG4gIGZ1bmN0aW9uIHJvdXRlIChyb3V0ZSwgaGFuZGxlcikge1xuICAgIHJvdXRlci5vbihyb3V0ZSwgZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RhdGUucGFyYW1zID0gcGFyYW1zXG4gICAgICAgIHJldHVybiBoYW5kbGVyKHN0YXRlLCBlbWl0KVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiByZWdpc3RlciAoY2IpIHtcbiAgICBjYihzdGF0ZSwgYnVzKVxuICB9XG5cbiAgZnVuY3Rpb24gc3RhcnQgKCkge1xuICAgIGlmIChvcHRzLmhpc3RvcnkgIT09IGZhbHNlKSB7XG4gICAgICBuYW5vaGlzdG9yeShmdW5jdGlvbiAoaHJlZikge1xuICAgICAgICBidXMuZW1pdCgncHVzaFN0YXRlJylcbiAgICAgIH0pXG5cbiAgICAgIGJ1cy5wcmVwZW5kTGlzdGVuZXIoJ3B1c2hTdGF0ZScsIHVwZGF0ZUhpc3RvcnkuYmluZChudWxsLCAncHVzaCcpKVxuICAgICAgYnVzLnByZXBlbmRMaXN0ZW5lcigncmVwbGFjZVN0YXRlJywgdXBkYXRlSGlzdG9yeS5iaW5kKG51bGwsICdyZXBsYWNlJykpXG5cbiAgICAgIGlmIChvcHRzLmhyZWYgIT09IGZhbHNlKSB7XG4gICAgICAgIG5hbm9ocmVmKGZ1bmN0aW9uIChsb2NhdGlvbikge1xuICAgICAgICAgIHZhciBocmVmID0gbG9jYXRpb24uaHJlZlxuICAgICAgICAgIHZhciBjdXJySHJlZiA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmXG4gICAgICAgICAgaWYgKGhyZWYgPT09IGN1cnJIcmVmKSByZXR1cm5cbiAgICAgICAgICBidXMuZW1pdCgncHVzaFN0YXRlJywgaHJlZilcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiB1cGRhdGVIaXN0b3J5IChtb2RlLCBocmVmKSB7XG4gICAgICBpZiAoaHJlZikgd2luZG93Lmhpc3RvcnlbbW9kZSArICdTdGF0ZSddKHt9LCBudWxsLCBocmVmKVxuICAgICAgYnVzLmVtaXQoJ3JlbmRlcicpXG4gICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2Nyb2xsSW50b1ZpZXcoKVxuICAgICAgfSwgMClcbiAgICB9XG5cbiAgICByZXJlbmRlciA9IG5hbm9yYWYoZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKGhhc1BlcmZvcm1hbmNlICYmIHRpbWluZ0VuYWJsZWQpIHtcbiAgICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsoJ2Nob286cmVuZGVyU3RhcnQnKVxuICAgICAgfVxuICAgICAgdmFyIG5ld1RyZWUgPSByb3V0ZXIoY3JlYXRlTG9jYXRpb24oKSlcbiAgICAgIHRyZWUgPSBuYW5vbW9ycGgodHJlZSwgbmV3VHJlZSlcbiAgICAgIGFzc2VydC5ub3RFcXVhbCh0cmVlLCBuZXdUcmVlLCAnY2hvby5zdGFydDogYSBkaWZmZXJlbnQgbm9kZSB0eXBlIHdhcyByZXR1cm5lZCBhcyB0aGUgcm9vdCBub2RlIG9uIGEgcmVyZW5kZXIuIE1ha2Ugc3VyZSB0aGF0IHRoZSByb290IG5vZGUgaXMgYWx3YXlzIHRoZSBzYW1lIHR5cGUgdG8gcHJldmVudCB0aGUgYXBwbGljYXRpb24gZnJvbSBiZWluZyB1bm1vdW50ZWQuJylcbiAgICAgIGlmIChoYXNQZXJmb3JtYW5jZSAmJiB0aW1pbmdFbmFibGVkKSB7XG4gICAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5tYXJrKCdjaG9vOnJlbmRlckVuZCcpXG4gICAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5tZWFzdXJlKCdjaG9vOnJlbmRlcicsICdjaG9vOnJlbmRlclN0YXJ0JywgJ2Nob286cmVuZGVyRW5kJylcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgYnVzLnByZXBlbmRMaXN0ZW5lcigncmVuZGVyJywgcmVyZW5kZXIpXG5cbiAgICBkb2N1bWVudFJlYWR5KGZ1bmN0aW9uICgpIHtcbiAgICAgIGJ1cy5lbWl0KCdET01Db250ZW50TG9hZGVkJylcbiAgICB9KVxuXG4gICAgdHJlZSA9IHJvdXRlcihjcmVhdGVMb2NhdGlvbigpKVxuXG4gICAgcmV0dXJuIHRyZWVcbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXQgKGV2ZW50TmFtZSwgZGF0YSkge1xuICAgIGJ1cy5lbWl0KGV2ZW50TmFtZSwgZGF0YSlcbiAgfVxuXG4gIGZ1bmN0aW9uIG1vdW50IChzZWxlY3Rvcikge1xuICAgIHZhciBuZXdUcmVlID0gc3RhcnQoKVxuICAgIGRvY3VtZW50UmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIHJvb3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKVxuICAgICAgYXNzZXJ0Lm9rKHJvb3QsICdjaG9vLm1vdW50OiBjb3VsZCBub3QgcXVlcnkgc2VsZWN0b3I6ICcgKyBzZWxlY3RvcilcbiAgICAgIG5hbm9tb3VudChyb290LCBuZXdUcmVlKVxuICAgICAgdHJlZSA9IHJvb3RcbiAgICB9KVxuICB9XG5cbiAgZnVuY3Rpb24gdG9TdHJpbmcgKGxvY2F0aW9uLCBfc3RhdGUpIHtcbiAgICBzdGF0ZSA9IF9zdGF0ZSB8fCB7fVxuICAgIHZhciBodG1sID0gcm91dGVyKGxvY2F0aW9uKVxuICAgIHJldHVybiBodG1sLnRvU3RyaW5nKClcbiAgfVxufVxuXG5mdW5jdGlvbiBzY3JvbGxJbnRvVmlldyAoKSB7XG4gIHZhciBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2hcbiAgaWYgKGhhc2gpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIGVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihoYXNoKVxuICAgICAgaWYgKGVsKSBlbC5zY3JvbGxJbnRvVmlldyh0cnVlKVxuICAgIH0gY2F0Y2ggKGUpIHt9XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTG9jYXRpb24gKCkge1xuICB2YXIgcGF0aG5hbWUgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUucmVwbGFjZSgvXFwvJC8sICcnKVxuICB2YXIgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoLnJlcGxhY2UoL14jLywgJy8nKVxuICByZXR1cm4gcGF0aG5hbWUgKyBoYXNoXG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIE5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcbnZhciB1bmVzY2FwZVN0cmluZyA9IHJlcXVpcmUoJy4vY29tbW9uJykudW5lc2NhcGVTdHJpbmc7XG52YXIgT1BFTlRBRyA9IHJlcXVpcmUoJy4vY29tbW9uJykuT1BFTlRBRztcbnZhciBDTE9TRVRBRyA9IHJlcXVpcmUoJy4vY29tbW9uJykuQ0xPU0VUQUc7XG5cbnZhciBDT0RFX0lOREVOVCA9IDQ7XG5cbnZhciBDX1RBQiA9IDk7XG52YXIgQ19ORVdMSU5FID0gMTA7XG52YXIgQ19HUkVBVEVSVEhBTiA9IDYyO1xudmFyIENfTEVTU1RIQU4gPSA2MDtcbnZhciBDX1NQQUNFID0gMzI7XG52YXIgQ19PUEVOX0JSQUNLRVQgPSA5MTtcblxudmFyIElubGluZVBhcnNlciA9IHJlcXVpcmUoJy4vaW5saW5lcycpO1xuXG52YXIgcmVIdG1sQmxvY2tPcGVuID0gW1xuICAgLy4vLCAvLyBkdW1teSBmb3IgMFxuICAgL148KD86c2NyaXB0fHByZXxzdHlsZSkoPzpcXHN8PnwkKS9pLFxuICAgL148IS0tLyxcbiAgIC9ePFs/XS8sXG4gICAvXjwhW0EtWl0vLFxuICAgL148IVxcW0NEQVRBXFxbLyxcbiAgIC9ePFsvXT8oPzphZGRyZXNzfGFydGljbGV8YXNpZGV8YmFzZXxiYXNlZm9udHxibG9ja3F1b3RlfGJvZHl8Y2FwdGlvbnxjZW50ZXJ8Y29sfGNvbGdyb3VwfGRkfGRldGFpbHN8ZGlhbG9nfGRpcnxkaXZ8ZGx8ZHR8ZmllbGRzZXR8ZmlnY2FwdGlvbnxmaWd1cmV8Zm9vdGVyfGZvcm18ZnJhbWV8ZnJhbWVzZXR8aFsxMjM0NTZdfGhlYWR8aGVhZGVyfGhyfGh0bWx8aWZyYW1lfGxlZ2VuZHxsaXxsaW5rfG1haW58bWVudXxtZW51aXRlbXxtZXRhfG5hdnxub2ZyYW1lc3xvbHxvcHRncm91cHxvcHRpb258cHxwYXJhbXxzZWN0aW9ufHNvdXJjZXx0aXRsZXxzdW1tYXJ5fHRhYmxlfHRib2R5fHRkfHRmb290fHRofHRoZWFkfHRpdGxlfHRyfHRyYWNrfHVsKSg/Olxcc3xbL10/Wz5dfCQpL2ksXG4gICAgbmV3IFJlZ0V4cCgnXig/OicgKyBPUEVOVEFHICsgJ3wnICsgQ0xPU0VUQUcgKyAnKVxcXFxzKiQnLCAnaScpXG5dO1xuXG52YXIgcmVIdG1sQmxvY2tDbG9zZSA9IFtcbiAgIC8uLywgLy8gZHVtbXkgZm9yIDBcbiAgIC88XFwvKD86c2NyaXB0fHByZXxzdHlsZSk+L2ksXG4gICAvLS0+LyxcbiAgIC9cXD8+LyxcbiAgIC8+LyxcbiAgIC9cXF1cXF0+L1xuXTtcblxudmFyIHJlVGhlbWF0aWNCcmVhayA9IC9eKD86KD86XFwqWyBcXHRdKil7Myx9fCg/Ol9bIFxcdF0qKXszLH18KD86LVsgXFx0XSopezMsfSlbIFxcdF0qJC87XG5cbnZhciByZU1heWJlU3BlY2lhbCA9IC9eWyNgfiorXz08PjAtOS1dLztcblxudmFyIHJlTm9uU3BhY2UgPSAvW14gXFx0XFxmXFx2XFxyXFxuXS87XG5cbnZhciByZUJ1bGxldExpc3RNYXJrZXIgPSAvXlsqKy1dLztcblxudmFyIHJlT3JkZXJlZExpc3RNYXJrZXIgPSAvXihcXGR7MSw5fSkoWy4pXSkvO1xuXG52YXIgcmVBVFhIZWFkaW5nTWFya2VyID0gL14jezEsNn0oPzpbIFxcdF0rfCQpLztcblxudmFyIHJlQ29kZUZlbmNlID0gL15gezMsfSg/IS4qYCl8Xn57Myx9KD8hLip+KS87XG5cbnZhciByZUNsb3NpbmdDb2RlRmVuY2UgPSAvXig/OmB7Myx9fH57Myx9KSg/PSAqJCkvO1xuXG52YXIgcmVTZXRleHRIZWFkaW5nTGluZSA9IC9eKD86PSt8LSspWyBcXHRdKiQvO1xuXG52YXIgcmVMaW5lRW5kaW5nID0gL1xcclxcbnxcXG58XFxyLztcblxuLy8gUmV0dXJucyB0cnVlIGlmIHN0cmluZyBjb250YWlucyBvbmx5IHNwYWNlIGNoYXJhY3RlcnMuXG52YXIgaXNCbGFuayA9IGZ1bmN0aW9uKHMpIHtcbiAgICByZXR1cm4gIShyZU5vblNwYWNlLnRlc3QocykpO1xufTtcblxudmFyIGlzU3BhY2VPclRhYiA9IGZ1bmN0aW9uKGMpIHtcbiAgICByZXR1cm4gYyA9PT0gQ19TUEFDRSB8fCBjID09PSBDX1RBQjtcbn07XG5cbnZhciBwZWVrID0gZnVuY3Rpb24obG4sIHBvcykge1xuICAgIGlmIChwb3MgPCBsbi5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGxuLmNoYXJDb2RlQXQocG9zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgfVxufTtcblxuLy8gRE9DIFBBUlNFUlxuXG4vLyBUaGVzZSBhcmUgbWV0aG9kcyBvZiBhIFBhcnNlciBvYmplY3QsIGRlZmluZWQgYmVsb3cuXG5cbi8vIFJldHVybnMgdHJ1ZSBpZiBibG9jayBlbmRzIHdpdGggYSBibGFuayBsaW5lLCBkZXNjZW5kaW5nIGlmIG5lZWRlZFxuLy8gaW50byBsaXN0cyBhbmQgc3VibGlzdHMuXG52YXIgZW5kc1dpdGhCbGFua0xpbmUgPSBmdW5jdGlvbihibG9jaykge1xuICAgIHdoaWxlIChibG9jaykge1xuICAgICAgICBpZiAoYmxvY2suX2xhc3RMaW5lQmxhbmspIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciB0ID0gYmxvY2sudHlwZTtcbiAgICAgICAgaWYgKHQgPT09ICdsaXN0JyB8fCB0ID09PSAnaXRlbScpIHtcbiAgICAgICAgICAgIGJsb2NrID0gYmxvY2suX2xhc3RDaGlsZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbn07XG5cbi8vIEFkZCBhIGxpbmUgdG8gdGhlIGJsb2NrIGF0IHRoZSB0aXAuICBXZSBhc3N1bWUgdGhlIHRpcFxuLy8gY2FuIGFjY2VwdCBsaW5lcyAtLSB0aGF0IGNoZWNrIHNob3VsZCBiZSBkb25lIGJlZm9yZSBjYWxsaW5nIHRoaXMuXG52YXIgYWRkTGluZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLnBhcnRpYWxseUNvbnN1bWVkVGFiKSB7XG4gICAgICB0aGlzLm9mZnNldCArPSAxOyAvLyBza2lwIG92ZXIgdGFiXG4gICAgICAvLyBhZGQgc3BhY2UgY2hhcmFjdGVyczpcbiAgICAgIHZhciBjaGFyc1RvVGFiID0gNCAtICh0aGlzLmNvbHVtbiAlIDQpO1xuICAgICAgdGhpcy50aXAuX3N0cmluZ19jb250ZW50ICs9ICgnICcucmVwZWF0KGNoYXJzVG9UYWIpKTtcbiAgICB9XG4gICAgdGhpcy50aXAuX3N0cmluZ19jb250ZW50ICs9IHRoaXMuY3VycmVudExpbmUuc2xpY2UodGhpcy5vZmZzZXQpICsgJ1xcbic7XG59O1xuXG4vLyBBZGQgYmxvY2sgb2YgdHlwZSB0YWcgYXMgYSBjaGlsZCBvZiB0aGUgdGlwLiAgSWYgdGhlIHRpcCBjYW4ndFxuLy8gYWNjZXB0IGNoaWxkcmVuLCBjbG9zZSBhbmQgZmluYWxpemUgaXQgYW5kIHRyeSBpdHMgcGFyZW50LFxuLy8gYW5kIHNvIG9uIHRpbCB3ZSBmaW5kIGEgYmxvY2sgdGhhdCBjYW4gYWNjZXB0IGNoaWxkcmVuLlxudmFyIGFkZENoaWxkID0gZnVuY3Rpb24odGFnLCBvZmZzZXQpIHtcbiAgICB3aGlsZSAoIXRoaXMuYmxvY2tzW3RoaXMudGlwLnR5cGVdLmNhbkNvbnRhaW4odGFnKSkge1xuICAgICAgICB0aGlzLmZpbmFsaXplKHRoaXMudGlwLCB0aGlzLmxpbmVOdW1iZXIgLSAxKTtcbiAgICB9XG5cbiAgICB2YXIgY29sdW1uX251bWJlciA9IG9mZnNldCArIDE7IC8vIG9mZnNldCAwID0gY29sdW1uIDFcbiAgICB2YXIgbmV3QmxvY2sgPSBuZXcgTm9kZSh0YWcsIFtbdGhpcy5saW5lTnVtYmVyLCBjb2x1bW5fbnVtYmVyXSwgWzAsIDBdXSk7XG4gICAgbmV3QmxvY2suX3N0cmluZ19jb250ZW50ID0gJyc7XG4gICAgdGhpcy50aXAuYXBwZW5kQ2hpbGQobmV3QmxvY2spO1xuICAgIHRoaXMudGlwID0gbmV3QmxvY2s7XG4gICAgcmV0dXJuIG5ld0Jsb2NrO1xufTtcblxuLy8gUGFyc2UgYSBsaXN0IG1hcmtlciBhbmQgcmV0dXJuIGRhdGEgb24gdGhlIG1hcmtlciAodHlwZSxcbi8vIHN0YXJ0LCBkZWxpbWl0ZXIsIGJ1bGxldCBjaGFyYWN0ZXIsIHBhZGRpbmcpIG9yIG51bGwuXG52YXIgcGFyc2VMaXN0TWFya2VyID0gZnVuY3Rpb24ocGFyc2VyLCBjb250YWluZXIpIHtcbiAgICB2YXIgcmVzdCA9IHBhcnNlci5jdXJyZW50TGluZS5zbGljZShwYXJzZXIubmV4dE5vbnNwYWNlKTtcbiAgICB2YXIgbWF0Y2g7XG4gICAgdmFyIG5leHRjO1xuICAgIHZhciBzcGFjZXNTdGFydENvbDtcbiAgICB2YXIgc3BhY2VzU3RhcnRPZmZzZXQ7XG4gICAgdmFyIGRhdGEgPSB7IHR5cGU6IG51bGwsXG4gICAgICAgICAgICAgICAgIHRpZ2h0OiB0cnVlLCAgLy8gbGlzdHMgYXJlIHRpZ2h0IGJ5IGRlZmF1bHRcbiAgICAgICAgICAgICAgICAgYnVsbGV0Q2hhcjogbnVsbCxcbiAgICAgICAgICAgICAgICAgc3RhcnQ6IG51bGwsXG4gICAgICAgICAgICAgICAgIGRlbGltaXRlcjogbnVsbCxcbiAgICAgICAgICAgICAgICAgcGFkZGluZzogbnVsbCxcbiAgICAgICAgICAgICAgICAgbWFya2VyT2Zmc2V0OiBwYXJzZXIuaW5kZW50IH07XG4gICAgaWYgKChtYXRjaCA9IHJlc3QubWF0Y2gocmVCdWxsZXRMaXN0TWFya2VyKSkpIHtcbiAgICAgICAgZGF0YS50eXBlID0gJ2J1bGxldCc7XG4gICAgICAgIGRhdGEuYnVsbGV0Q2hhciA9IG1hdGNoWzBdWzBdO1xuXG4gICAgfSBlbHNlIGlmICgobWF0Y2ggPSByZXN0Lm1hdGNoKHJlT3JkZXJlZExpc3RNYXJrZXIpKSAmJlxuICAgICAgICAgICAgICAgIChjb250YWluZXIudHlwZSAhPT0gJ3BhcmFncmFwaCcgfHxcbiAgICAgICAgICAgICAgICAgbWF0Y2hbMV0gPT09ICcxJykpIHtcbiAgICAgICAgZGF0YS50eXBlID0gJ29yZGVyZWQnO1xuICAgICAgICBkYXRhLnN0YXJ0ID0gcGFyc2VJbnQobWF0Y2hbMV0pO1xuICAgICAgICBkYXRhLmRlbGltaXRlciA9IG1hdGNoWzJdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICAvLyBtYWtlIHN1cmUgd2UgaGF2ZSBzcGFjZXMgYWZ0ZXJcbiAgICBuZXh0YyA9IHBlZWsocGFyc2VyLmN1cnJlbnRMaW5lLCBwYXJzZXIubmV4dE5vbnNwYWNlICsgbWF0Y2hbMF0ubGVuZ3RoKTtcbiAgICBpZiAoIShuZXh0YyA9PT0gLTEgfHwgbmV4dGMgPT09IENfVEFCIHx8IG5leHRjID09PSBDX1NQQUNFKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyBpZiBpdCBpbnRlcnJ1cHRzIHBhcmFncmFwaCwgbWFrZSBzdXJlIGZpcnN0IGxpbmUgaXNuJ3QgYmxhbmtcbiAgICBpZiAoY29udGFpbmVyLnR5cGUgPT09ICdwYXJhZ3JhcGgnICYmICFwYXJzZXIuY3VycmVudExpbmUuc2xpY2UocGFyc2VyLm5leHROb25zcGFjZSArIG1hdGNoWzBdLmxlbmd0aCkubWF0Y2gocmVOb25TcGFjZSkpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgLy8gd2UndmUgZ290IGEgbWF0Y2ghIGFkdmFuY2Ugb2Zmc2V0IGFuZCBjYWxjdWxhdGUgcGFkZGluZ1xuICAgIHBhcnNlci5hZHZhbmNlTmV4dE5vbnNwYWNlKCk7IC8vIHRvIHN0YXJ0IG9mIG1hcmtlclxuICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KG1hdGNoWzBdLmxlbmd0aCwgdHJ1ZSk7IC8vIHRvIGVuZCBvZiBtYXJrZXJcbiAgICBzcGFjZXNTdGFydENvbCA9IHBhcnNlci5jb2x1bW47XG4gICAgc3BhY2VzU3RhcnRPZmZzZXQgPSBwYXJzZXIub2Zmc2V0O1xuICAgIGRvIHtcbiAgICAgICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQoMSwgdHJ1ZSk7XG4gICAgICAgIG5leHRjID0gcGVlayhwYXJzZXIuY3VycmVudExpbmUsIHBhcnNlci5vZmZzZXQpO1xuICAgIH0gd2hpbGUgKHBhcnNlci5jb2x1bW4gLSBzcGFjZXNTdGFydENvbCA8IDUgJiZcbiAgICAgICAgICAgaXNTcGFjZU9yVGFiKG5leHRjKSk7XG4gICAgdmFyIGJsYW5rX2l0ZW0gPSBwZWVrKHBhcnNlci5jdXJyZW50TGluZSwgcGFyc2VyLm9mZnNldCkgPT09IC0xO1xuICAgIHZhciBzcGFjZXNfYWZ0ZXJfbWFya2VyID0gcGFyc2VyLmNvbHVtbiAtIHNwYWNlc1N0YXJ0Q29sO1xuICAgIGlmIChzcGFjZXNfYWZ0ZXJfbWFya2VyID49IDUgfHxcbiAgICAgICAgc3BhY2VzX2FmdGVyX21hcmtlciA8IDEgfHxcbiAgICAgICAgYmxhbmtfaXRlbSkge1xuICAgICAgICBkYXRhLnBhZGRpbmcgPSBtYXRjaFswXS5sZW5ndGggKyAxO1xuICAgICAgICBwYXJzZXIuY29sdW1uID0gc3BhY2VzU3RhcnRDb2w7XG4gICAgICAgIHBhcnNlci5vZmZzZXQgPSBzcGFjZXNTdGFydE9mZnNldDtcbiAgICAgICAgaWYgKGlzU3BhY2VPclRhYihwZWVrKHBhcnNlci5jdXJyZW50TGluZSwgcGFyc2VyLm9mZnNldCkpKSB7XG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldCgxLCB0cnVlKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGRhdGEucGFkZGluZyA9IG1hdGNoWzBdLmxlbmd0aCArIHNwYWNlc19hZnRlcl9tYXJrZXI7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xufTtcblxuLy8gUmV0dXJucyB0cnVlIGlmIHRoZSB0d28gbGlzdCBpdGVtcyBhcmUgb2YgdGhlIHNhbWUgdHlwZSxcbi8vIHdpdGggdGhlIHNhbWUgZGVsaW1pdGVyIGFuZCBidWxsZXQgY2hhcmFjdGVyLiAgVGhpcyBpcyB1c2VkXG4vLyBpbiBhZ2dsb21lcmF0aW5nIGxpc3QgaXRlbXMgaW50byBsaXN0cy5cbnZhciBsaXN0c01hdGNoID0gZnVuY3Rpb24obGlzdF9kYXRhLCBpdGVtX2RhdGEpIHtcbiAgICByZXR1cm4gKGxpc3RfZGF0YS50eXBlID09PSBpdGVtX2RhdGEudHlwZSAmJlxuICAgICAgICAgICAgbGlzdF9kYXRhLmRlbGltaXRlciA9PT0gaXRlbV9kYXRhLmRlbGltaXRlciAmJlxuICAgICAgICAgICAgbGlzdF9kYXRhLmJ1bGxldENoYXIgPT09IGl0ZW1fZGF0YS5idWxsZXRDaGFyKTtcbn07XG5cbi8vIEZpbmFsaXplIGFuZCBjbG9zZSBhbnkgdW5tYXRjaGVkIGJsb2Nrcy5cbnZhciBjbG9zZVVubWF0Y2hlZEJsb2NrcyA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5hbGxDbG9zZWQpIHtcbiAgICAgICAgLy8gZmluYWxpemUgYW55IGJsb2NrcyBub3QgbWF0Y2hlZFxuICAgICAgICB3aGlsZSAodGhpcy5vbGR0aXAgIT09IHRoaXMubGFzdE1hdGNoZWRDb250YWluZXIpIHtcbiAgICAgICAgICAgIHZhciBwYXJlbnQgPSB0aGlzLm9sZHRpcC5fcGFyZW50O1xuICAgICAgICAgICAgdGhpcy5maW5hbGl6ZSh0aGlzLm9sZHRpcCwgdGhpcy5saW5lTnVtYmVyIC0gMSk7XG4gICAgICAgICAgICB0aGlzLm9sZHRpcCA9IHBhcmVudDtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmFsbENsb3NlZCA9IHRydWU7XG4gICAgfVxufTtcblxuLy8gJ2ZpbmFsaXplJyBpcyBydW4gd2hlbiB0aGUgYmxvY2sgaXMgY2xvc2VkLlxuLy8gJ2NvbnRpbnVlJyBpcyBydW4gdG8gY2hlY2sgd2hldGhlciB0aGUgYmxvY2sgaXMgY29udGludWluZ1xuLy8gYXQgYSBjZXJ0YWluIGxpbmUgYW5kIG9mZnNldCAoZS5nLiB3aGV0aGVyIGEgYmxvY2sgcXVvdGVcbi8vIGNvbnRhaW5zIGEgYD5gLiAgSXQgcmV0dXJucyAwIGZvciBtYXRjaGVkLCAxIGZvciBub3QgbWF0Y2hlZCxcbi8vIGFuZCAyIGZvciBcIndlJ3ZlIGRlYWx0IHdpdGggdGhpcyBsaW5lIGNvbXBsZXRlbHksIGdvIHRvIG5leHQuXCJcbnZhciBibG9ja3MgPSB7XG4gICAgZG9jdW1lbnQ6IHtcbiAgICAgICAgY29udGludWU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfSxcbiAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG4gICAgICAgIGNhbkNvbnRhaW46IGZ1bmN0aW9uKHQpIHsgcmV0dXJuICh0ICE9PSAnaXRlbScpOyB9LFxuICAgICAgICBhY2NlcHRzTGluZXM6IGZhbHNlXG4gICAgfSxcbiAgICBsaXN0OiB7XG4gICAgICAgIGNvbnRpbnVlOiBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH0sXG4gICAgICAgIGZpbmFsaXplOiBmdW5jdGlvbihwYXJzZXIsIGJsb2NrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IGJsb2NrLl9maXJzdENoaWxkO1xuICAgICAgICAgICAgd2hpbGUgKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICAvLyBjaGVjayBmb3Igbm9uLWZpbmFsIGxpc3QgaXRlbSBlbmRpbmcgd2l0aCBibGFuayBsaW5lOlxuICAgICAgICAgICAgICAgIGlmIChlbmRzV2l0aEJsYW5rTGluZShpdGVtKSAmJiBpdGVtLl9uZXh0KSB7XG4gICAgICAgICAgICAgICAgICAgIGJsb2NrLl9saXN0RGF0YS50aWdodCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gcmVjdXJzZSBpbnRvIGNoaWxkcmVuIG9mIGxpc3QgaXRlbSwgdG8gc2VlIGlmIHRoZXJlIGFyZVxuICAgICAgICAgICAgICAgIC8vIHNwYWNlcyBiZXR3ZWVuIGFueSBvZiB0aGVtOlxuICAgICAgICAgICAgICAgIHZhciBzdWJpdGVtID0gaXRlbS5fZmlyc3RDaGlsZDtcbiAgICAgICAgICAgICAgICB3aGlsZSAoc3ViaXRlbSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW5kc1dpdGhCbGFua0xpbmUoc3ViaXRlbSkgJiZcbiAgICAgICAgICAgICAgICAgICAgICAgIChpdGVtLl9uZXh0IHx8IHN1Yml0ZW0uX25leHQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBibG9jay5fbGlzdERhdGEudGlnaHQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHN1Yml0ZW0gPSBzdWJpdGVtLl9uZXh0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpdGVtID0gaXRlbS5fbmV4dDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgY2FuQ29udGFpbjogZnVuY3Rpb24odCkgeyByZXR1cm4gKHQgPT09ICdpdGVtJyk7IH0sXG4gICAgICAgIGFjY2VwdHNMaW5lczogZmFsc2VcbiAgICB9LFxuICAgIGJsb2NrX3F1b3RlOiB7XG4gICAgICAgIGNvbnRpbnVlOiBmdW5jdGlvbihwYXJzZXIpIHtcbiAgICAgICAgICAgIHZhciBsbiA9IHBhcnNlci5jdXJyZW50TGluZTtcbiAgICAgICAgICAgIGlmICghcGFyc2VyLmluZGVudGVkICYmXG4gICAgICAgICAgICAgICAgcGVlayhsbiwgcGFyc2VyLm5leHROb25zcGFjZSkgPT09IENfR1JFQVRFUlRIQU4pIHtcbiAgICAgICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU5leHROb25zcGFjZSgpO1xuICAgICAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KDEsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBpZiAoaXNTcGFjZU9yVGFiKHBlZWsobG4sIHBhcnNlci5vZmZzZXQpKSkge1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldCgxLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmFsaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuOyB9LFxuICAgICAgICBjYW5Db250YWluOiBmdW5jdGlvbih0KSB7IHJldHVybiAodCAhPT0gJ2l0ZW0nKTsgfSxcbiAgICAgICAgYWNjZXB0c0xpbmVzOiBmYWxzZVxuICAgIH0sXG4gICAgaXRlbToge1xuICAgICAgICBjb250aW51ZTogZnVuY3Rpb24ocGFyc2VyLCBjb250YWluZXIpIHtcbiAgICAgICAgICAgIGlmIChwYXJzZXIuYmxhbmspIHtcbiAgICAgICAgICAgICAgICBpZiAoY29udGFpbmVyLl9maXJzdENoaWxkID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gQmxhbmsgbGluZSBhZnRlciBlbXB0eSBsaXN0IGl0ZW1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VOZXh0Tm9uc3BhY2UoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnNlci5pbmRlbnQgPj1cbiAgICAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLl9saXN0RGF0YS5tYXJrZXJPZmZzZXQgK1xuICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuX2xpc3REYXRhLnBhZGRpbmcpIHtcbiAgICAgICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldChjb250YWluZXIuX2xpc3REYXRhLm1hcmtlck9mZnNldCArXG4gICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5fbGlzdERhdGEucGFkZGluZywgdHJ1ZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmFsaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuOyB9LFxuICAgICAgICBjYW5Db250YWluOiBmdW5jdGlvbih0KSB7IHJldHVybiAodCAhPT0gJ2l0ZW0nKTsgfSxcbiAgICAgICAgYWNjZXB0c0xpbmVzOiBmYWxzZVxuICAgIH0sXG4gICAgaGVhZGluZzoge1xuICAgICAgICBjb250aW51ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBhIGhlYWRpbmcgY2FuIG5ldmVyIGNvbnRhaW5lciA+IDEgbGluZSwgc28gZmFpbCB0byBtYXRjaDpcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9LFxuICAgICAgICBmaW5hbGl6ZTogZnVuY3Rpb24oKSB7IHJldHVybjsgfSxcbiAgICAgICAgY2FuQ29udGFpbjogZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfSxcbiAgICAgICAgYWNjZXB0c0xpbmVzOiBmYWxzZVxuICAgIH0sXG4gICAgdGhlbWF0aWNfYnJlYWs6IHtcbiAgICAgICAgY29udGludWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gYSB0aGVtYXRpYyBicmVhayBjYW4gbmV2ZXIgY29udGFpbmVyID4gMSBsaW5lLCBzbyBmYWlsIHRvIG1hdGNoOlxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmFsaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuOyB9LFxuICAgICAgICBjYW5Db250YWluOiBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9LFxuICAgICAgICBhY2NlcHRzTGluZXM6IGZhbHNlXG4gICAgfSxcbiAgICBjb2RlX2Jsb2NrOiB7XG4gICAgICAgIGNvbnRpbnVlOiBmdW5jdGlvbihwYXJzZXIsIGNvbnRhaW5lcikge1xuICAgICAgICAgICAgdmFyIGxuID0gcGFyc2VyLmN1cnJlbnRMaW5lO1xuICAgICAgICAgICAgdmFyIGluZGVudCA9IHBhcnNlci5pbmRlbnQ7XG4gICAgICAgICAgICBpZiAoY29udGFpbmVyLl9pc0ZlbmNlZCkgeyAvLyBmZW5jZWRcbiAgICAgICAgICAgICAgICB2YXIgbWF0Y2ggPSAoaW5kZW50IDw9IDMgJiZcbiAgICAgICAgICAgICAgICAgICAgbG4uY2hhckF0KHBhcnNlci5uZXh0Tm9uc3BhY2UpID09PSBjb250YWluZXIuX2ZlbmNlQ2hhciAmJlxuICAgICAgICAgICAgICAgICAgICBsbi5zbGljZShwYXJzZXIubmV4dE5vbnNwYWNlKS5tYXRjaChyZUNsb3NpbmdDb2RlRmVuY2UpKTtcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2ggJiYgbWF0Y2hbMF0ubGVuZ3RoID49IGNvbnRhaW5lci5fZmVuY2VMZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2xvc2luZyBmZW5jZSAtIHdlJ3JlIGF0IGVuZCBvZiBsaW5lLCBzbyB3ZSBjYW4gcmV0dXJuXG4gICAgICAgICAgICAgICAgICAgIHBhcnNlci5maW5hbGl6ZShjb250YWluZXIsIHBhcnNlci5saW5lTnVtYmVyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gc2tpcCBvcHRpb25hbCBzcGFjZXMgb2YgZmVuY2Ugb2Zmc2V0XG4gICAgICAgICAgICAgICAgICAgIHZhciBpID0gY29udGFpbmVyLl9mZW5jZU9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKGkgPiAwICYmIGlzU3BhY2VPclRhYihwZWVrKGxuLCBwYXJzZXIub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KDEsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaS0tO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHsgLy8gaW5kZW50ZWRcbiAgICAgICAgICAgICAgICBpZiAoaW5kZW50ID49IENPREVfSU5ERU5UKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KENPREVfSU5ERU5ULCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHBhcnNlci5ibGFuaykge1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU5leHROb25zcGFjZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9LFxuICAgICAgICBmaW5hbGl6ZTogZnVuY3Rpb24ocGFyc2VyLCBibG9jaykge1xuICAgICAgICAgICAgaWYgKGJsb2NrLl9pc0ZlbmNlZCkgeyAvLyBmZW5jZWRcbiAgICAgICAgICAgICAgICAvLyBmaXJzdCBsaW5lIGJlY29tZXMgaW5mbyBzdHJpbmdcbiAgICAgICAgICAgICAgICB2YXIgY29udGVudCA9IGJsb2NrLl9zdHJpbmdfY29udGVudDtcbiAgICAgICAgICAgICAgICB2YXIgbmV3bGluZVBvcyA9IGNvbnRlbnQuaW5kZXhPZignXFxuJyk7XG4gICAgICAgICAgICAgICAgdmFyIGZpcnN0TGluZSA9IGNvbnRlbnQuc2xpY2UoMCwgbmV3bGluZVBvcyk7XG4gICAgICAgICAgICAgICAgdmFyIHJlc3QgPSBjb250ZW50LnNsaWNlKG5ld2xpbmVQb3MgKyAxKTtcbiAgICAgICAgICAgICAgICBibG9jay5pbmZvID0gdW5lc2NhcGVTdHJpbmcoZmlyc3RMaW5lLnRyaW0oKSk7XG4gICAgICAgICAgICAgICAgYmxvY2suX2xpdGVyYWwgPSByZXN0O1xuICAgICAgICAgICAgfSBlbHNlIHsgLy8gaW5kZW50ZWRcbiAgICAgICAgICAgICAgICBibG9jay5fbGl0ZXJhbCA9IGJsb2NrLl9zdHJpbmdfY29udGVudC5yZXBsYWNlKC8oXFxuICopKyQvLCAnXFxuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBibG9jay5fc3RyaW5nX2NvbnRlbnQgPSBudWxsOyAvLyBhbGxvdyBHQ1xuICAgICAgICB9LFxuICAgICAgICBjYW5Db250YWluOiBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9LFxuICAgICAgICBhY2NlcHRzTGluZXM6IHRydWVcbiAgICB9LFxuICAgIGh0bWxfYmxvY2s6IHtcbiAgICAgICAgY29udGludWU6IGZ1bmN0aW9uKHBhcnNlciwgY29udGFpbmVyKSB7XG4gICAgICAgICAgICByZXR1cm4gKChwYXJzZXIuYmxhbmsgJiZcbiAgICAgICAgICAgICAgICAgICAgIChjb250YWluZXIuX2h0bWxCbG9ja1R5cGUgPT09IDYgfHxcbiAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuX2h0bWxCbG9ja1R5cGUgPT09IDcpKSA/IDEgOiAwKTtcbiAgICAgICAgfSxcbiAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uKHBhcnNlciwgYmxvY2spIHtcbiAgICAgICAgICAgIGJsb2NrLl9saXRlcmFsID0gYmxvY2suX3N0cmluZ19jb250ZW50LnJlcGxhY2UoLyhcXG4gKikrJC8sICcnKTtcbiAgICAgICAgICAgIGJsb2NrLl9zdHJpbmdfY29udGVudCA9IG51bGw7IC8vIGFsbG93IEdDXG4gICAgICAgIH0sXG4gICAgICAgIGNhbkNvbnRhaW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH0sXG4gICAgICAgIGFjY2VwdHNMaW5lczogdHJ1ZVxuICAgIH0sXG4gICAgcGFyYWdyYXBoOiB7XG4gICAgICAgIGNvbnRpbnVlOiBmdW5jdGlvbihwYXJzZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAocGFyc2VyLmJsYW5rID8gMSA6IDApO1xuICAgICAgICB9LFxuICAgICAgICBmaW5hbGl6ZTogZnVuY3Rpb24ocGFyc2VyLCBibG9jaykge1xuICAgICAgICAgICAgdmFyIHBvcztcbiAgICAgICAgICAgIHZhciBoYXNSZWZlcmVuY2VEZWZzID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIHRyeSBwYXJzaW5nIHRoZSBiZWdpbm5pbmcgYXMgbGluayByZWZlcmVuY2UgZGVmaW5pdGlvbnM6XG4gICAgICAgICAgICB3aGlsZSAocGVlayhibG9jay5fc3RyaW5nX2NvbnRlbnQsIDApID09PSBDX09QRU5fQlJBQ0tFVCAmJlxuICAgICAgICAgICAgICAgICAgIChwb3MgPVxuICAgICAgICAgICAgICAgICAgICBwYXJzZXIuaW5saW5lUGFyc2VyLnBhcnNlUmVmZXJlbmNlKGJsb2NrLl9zdHJpbmdfY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXIucmVmbWFwKSkpIHtcbiAgICAgICAgICAgICAgICBibG9jay5fc3RyaW5nX2NvbnRlbnQgPSBibG9jay5fc3RyaW5nX2NvbnRlbnQuc2xpY2UocG9zKTtcbiAgICAgICAgICAgICAgICBoYXNSZWZlcmVuY2VEZWZzID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChoYXNSZWZlcmVuY2VEZWZzICYmIGlzQmxhbmsoYmxvY2suX3N0cmluZ19jb250ZW50KSkge1xuICAgICAgICAgICAgICAgIGJsb2NrLnVubGluaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjYW5Db250YWluOiBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9LFxuICAgICAgICBhY2NlcHRzTGluZXM6IHRydWVcbiAgICB9XG59O1xuXG4vLyBibG9jayBzdGFydCBmdW5jdGlvbnMuICBSZXR1cm4gdmFsdWVzOlxuLy8gMCA9IG5vIG1hdGNoXG4vLyAxID0gbWF0Y2hlZCBjb250YWluZXIsIGtlZXAgZ29pbmdcbi8vIDIgPSBtYXRjaGVkIGxlYWYsIG5vIG1vcmUgYmxvY2sgc3RhcnRzXG52YXIgYmxvY2tTdGFydHMgPSBbXG4gICAgLy8gYmxvY2sgcXVvdGVcbiAgICBmdW5jdGlvbihwYXJzZXIpIHtcbiAgICAgICAgaWYgKCFwYXJzZXIuaW5kZW50ZWQgJiZcbiAgICAgICAgICAgIHBlZWsocGFyc2VyLmN1cnJlbnRMaW5lLCBwYXJzZXIubmV4dE5vbnNwYWNlKSA9PT0gQ19HUkVBVEVSVEhBTikge1xuICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VOZXh0Tm9uc3BhY2UoKTtcbiAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KDEsIGZhbHNlKTtcbiAgICAgICAgICAgIC8vIG9wdGlvbmFsIGZvbGxvd2luZyBzcGFjZVxuICAgICAgICAgICAgaWYgKGlzU3BhY2VPclRhYihwZWVrKHBhcnNlci5jdXJyZW50TGluZSwgcGFyc2VyLm9mZnNldCkpKSB7XG4gICAgICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQoMSwgdHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwYXJzZXIuY2xvc2VVbm1hdGNoZWRCbG9ja3MoKTtcbiAgICAgICAgICAgIHBhcnNlci5hZGRDaGlsZCgnYmxvY2tfcXVvdGUnLCBwYXJzZXIubmV4dE5vbnNwYWNlKTtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gQVRYIGhlYWRpbmdcbiAgICBmdW5jdGlvbihwYXJzZXIpIHtcbiAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICBpZiAoIXBhcnNlci5pbmRlbnRlZCAmJlxuICAgICAgICAgICAgKG1hdGNoID0gcGFyc2VyLmN1cnJlbnRMaW5lLnNsaWNlKHBhcnNlci5uZXh0Tm9uc3BhY2UpLm1hdGNoKHJlQVRYSGVhZGluZ01hcmtlcikpKSB7XG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU5leHROb25zcGFjZSgpO1xuICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQobWF0Y2hbMF0ubGVuZ3RoLCBmYWxzZSk7XG4gICAgICAgICAgICBwYXJzZXIuY2xvc2VVbm1hdGNoZWRCbG9ja3MoKTtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBwYXJzZXIuYWRkQ2hpbGQoJ2hlYWRpbmcnLCBwYXJzZXIubmV4dE5vbnNwYWNlKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5sZXZlbCA9IG1hdGNoWzBdLnRyaW0oKS5sZW5ndGg7IC8vIG51bWJlciBvZiAjc1xuICAgICAgICAgICAgLy8gcmVtb3ZlIHRyYWlsaW5nICMjI3M6XG4gICAgICAgICAgICBjb250YWluZXIuX3N0cmluZ19jb250ZW50ID1cbiAgICAgICAgICAgICAgICBwYXJzZXIuY3VycmVudExpbmUuc2xpY2UocGFyc2VyLm9mZnNldCkucmVwbGFjZSgvXlsgXFx0XSojK1sgXFx0XSokLywgJycpLnJlcGxhY2UoL1sgXFx0XSsjK1sgXFx0XSokLywgJycpO1xuICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQocGFyc2VyLmN1cnJlbnRMaW5lLmxlbmd0aCAtIHBhcnNlci5vZmZzZXQpO1xuICAgICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBGZW5jZWQgY29kZSBibG9ja1xuICAgIGZ1bmN0aW9uKHBhcnNlcikge1xuICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgIGlmICghcGFyc2VyLmluZGVudGVkICYmXG4gICAgICAgICAgICAobWF0Y2ggPSBwYXJzZXIuY3VycmVudExpbmUuc2xpY2UocGFyc2VyLm5leHROb25zcGFjZSkubWF0Y2gocmVDb2RlRmVuY2UpKSkge1xuICAgICAgICAgICAgdmFyIGZlbmNlTGVuZ3RoID0gbWF0Y2hbMF0ubGVuZ3RoO1xuICAgICAgICAgICAgcGFyc2VyLmNsb3NlVW5tYXRjaGVkQmxvY2tzKCk7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gcGFyc2VyLmFkZENoaWxkKCdjb2RlX2Jsb2NrJywgcGFyc2VyLm5leHROb25zcGFjZSk7XG4gICAgICAgICAgICBjb250YWluZXIuX2lzRmVuY2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5fZmVuY2VMZW5ndGggPSBmZW5jZUxlbmd0aDtcbiAgICAgICAgICAgIGNvbnRhaW5lci5fZmVuY2VDaGFyID0gbWF0Y2hbMF1bMF07XG4gICAgICAgICAgICBjb250YWluZXIuX2ZlbmNlT2Zmc2V0ID0gcGFyc2VyLmluZGVudDtcbiAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlTmV4dE5vbnNwYWNlKCk7XG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldChmZW5jZUxlbmd0aCwgZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBIVE1MIGJsb2NrXG4gICAgZnVuY3Rpb24ocGFyc2VyLCBjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFwYXJzZXIuaW5kZW50ZWQgJiZcbiAgICAgICAgICAgIHBlZWsocGFyc2VyLmN1cnJlbnRMaW5lLCBwYXJzZXIubmV4dE5vbnNwYWNlKSA9PT0gQ19MRVNTVEhBTikge1xuICAgICAgICAgICAgdmFyIHMgPSBwYXJzZXIuY3VycmVudExpbmUuc2xpY2UocGFyc2VyLm5leHROb25zcGFjZSk7XG4gICAgICAgICAgICB2YXIgYmxvY2tUeXBlO1xuXG4gICAgICAgICAgICBmb3IgKGJsb2NrVHlwZSA9IDE7IGJsb2NrVHlwZSA8PSA3OyBibG9ja1R5cGUrKykge1xuICAgICAgICAgICAgICAgIGlmIChyZUh0bWxCbG9ja09wZW5bYmxvY2tUeXBlXS50ZXN0KHMpICYmXG4gICAgICAgICAgICAgICAgICAgIChibG9ja1R5cGUgPCA3IHx8XG4gICAgICAgICAgICAgICAgICAgICBjb250YWluZXIudHlwZSAhPT0gJ3BhcmFncmFwaCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlci5jbG9zZVVubWF0Y2hlZEJsb2NrcygpO1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBkb24ndCBhZGp1c3QgcGFyc2VyLm9mZnNldDtcbiAgICAgICAgICAgICAgICAgICAgLy8gc3BhY2VzIGFyZSBwYXJ0IG9mIHRoZSBIVE1MIGJsb2NrOlxuICAgICAgICAgICAgICAgICAgICB2YXIgYiA9IHBhcnNlci5hZGRDaGlsZCgnaHRtbF9ibG9jaycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlci5vZmZzZXQpO1xuICAgICAgICAgICAgICAgICAgICBiLl9odG1sQmxvY2tUeXBlID0gYmxvY2tUeXBlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gMDtcblxuICAgIH0sXG5cbiAgICAvLyBTZXRleHQgaGVhZGluZ1xuICAgIGZ1bmN0aW9uKHBhcnNlciwgY29udGFpbmVyKSB7XG4gICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgaWYgKCFwYXJzZXIuaW5kZW50ZWQgJiZcbiAgICAgICAgICAgIGNvbnRhaW5lci50eXBlID09PSAncGFyYWdyYXBoJyAmJlxuICAgICAgICAgICAgICAgICAgICgobWF0Y2ggPSBwYXJzZXIuY3VycmVudExpbmUuc2xpY2UocGFyc2VyLm5leHROb25zcGFjZSkubWF0Y2gocmVTZXRleHRIZWFkaW5nTGluZSkpKSkge1xuICAgICAgICAgICAgcGFyc2VyLmNsb3NlVW5tYXRjaGVkQmxvY2tzKCk7XG4gICAgICAgICAgICB2YXIgaGVhZGluZyA9IG5ldyBOb2RlKCdoZWFkaW5nJywgY29udGFpbmVyLnNvdXJjZXBvcyk7XG4gICAgICAgICAgICBoZWFkaW5nLmxldmVsID0gbWF0Y2hbMF1bMF0gPT09ICc9JyA/IDEgOiAyO1xuICAgICAgICAgICAgaGVhZGluZy5fc3RyaW5nX2NvbnRlbnQgPSBjb250YWluZXIuX3N0cmluZ19jb250ZW50O1xuICAgICAgICAgICAgY29udGFpbmVyLmluc2VydEFmdGVyKGhlYWRpbmcpO1xuICAgICAgICAgICAgY29udGFpbmVyLnVubGluaygpO1xuICAgICAgICAgICAgcGFyc2VyLnRpcCA9IGhlYWRpbmc7XG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldChwYXJzZXIuY3VycmVudExpbmUubGVuZ3RoIC0gcGFyc2VyLm9mZnNldCwgZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyB0aGVtYXRpYyBicmVha1xuICAgIGZ1bmN0aW9uKHBhcnNlcikge1xuICAgICAgICBpZiAoIXBhcnNlci5pbmRlbnRlZCAmJlxuICAgICAgICAgICAgcmVUaGVtYXRpY0JyZWFrLnRlc3QocGFyc2VyLmN1cnJlbnRMaW5lLnNsaWNlKHBhcnNlci5uZXh0Tm9uc3BhY2UpKSkge1xuICAgICAgICAgICAgcGFyc2VyLmNsb3NlVW5tYXRjaGVkQmxvY2tzKCk7XG4gICAgICAgICAgICBwYXJzZXIuYWRkQ2hpbGQoJ3RoZW1hdGljX2JyZWFrJywgcGFyc2VyLm5leHROb25zcGFjZSk7XG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldChwYXJzZXIuY3VycmVudExpbmUubGVuZ3RoIC0gcGFyc2VyLm9mZnNldCwgZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBsaXN0IGl0ZW1cbiAgICBmdW5jdGlvbihwYXJzZXIsIGNvbnRhaW5lcikge1xuICAgICAgICB2YXIgZGF0YTtcblxuICAgICAgICBpZiAoKCFwYXJzZXIuaW5kZW50ZWQgfHwgY29udGFpbmVyLnR5cGUgPT09ICdsaXN0JylcbiAgICAgICAgICAgICAgICAmJiAoZGF0YSA9IHBhcnNlTGlzdE1hcmtlcihwYXJzZXIsIGNvbnRhaW5lcikpKSB7XG4gICAgICAgICAgICBwYXJzZXIuY2xvc2VVbm1hdGNoZWRCbG9ja3MoKTtcblxuICAgICAgICAgICAgLy8gYWRkIHRoZSBsaXN0IGlmIG5lZWRlZFxuICAgICAgICAgICAgaWYgKHBhcnNlci50aXAudHlwZSAhPT0gJ2xpc3QnIHx8XG4gICAgICAgICAgICAgICAgIShsaXN0c01hdGNoKGNvbnRhaW5lci5fbGlzdERhdGEsIGRhdGEpKSkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lciA9IHBhcnNlci5hZGRDaGlsZCgnbGlzdCcsIHBhcnNlci5uZXh0Tm9uc3BhY2UpO1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5fbGlzdERhdGEgPSBkYXRhO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBhZGQgdGhlIGxpc3QgaXRlbVxuICAgICAgICAgICAgY29udGFpbmVyID0gcGFyc2VyLmFkZENoaWxkKCdpdGVtJywgcGFyc2VyLm5leHROb25zcGFjZSk7XG4gICAgICAgICAgICBjb250YWluZXIuX2xpc3REYXRhID0gZGF0YTtcbiAgICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLy8gaW5kZW50ZWQgY29kZSBibG9ja1xuICAgIGZ1bmN0aW9uKHBhcnNlcikge1xuICAgICAgICBpZiAocGFyc2VyLmluZGVudGVkICYmXG4gICAgICAgICAgICBwYXJzZXIudGlwLnR5cGUgIT09ICdwYXJhZ3JhcGgnICYmXG4gICAgICAgICAgICAhcGFyc2VyLmJsYW5rKSB7XG4gICAgICAgICAgICAvLyBpbmRlbnRlZCBjb2RlXG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldChDT0RFX0lOREVOVCwgdHJ1ZSk7XG4gICAgICAgICAgICBwYXJzZXIuY2xvc2VVbm1hdGNoZWRCbG9ja3MoKTtcbiAgICAgICAgICAgIHBhcnNlci5hZGRDaGlsZCgnY29kZV9ibG9jaycsIHBhcnNlci5vZmZzZXQpO1xuICAgICAgICAgICAgcmV0dXJuIDI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgICB9XG5cbl07XG5cbnZhciBhZHZhbmNlT2Zmc2V0ID0gZnVuY3Rpb24oY291bnQsIGNvbHVtbnMpIHtcbiAgICB2YXIgY3VycmVudExpbmUgPSB0aGlzLmN1cnJlbnRMaW5lO1xuICAgIHZhciBjaGFyc1RvVGFiLCBjaGFyc1RvQWR2YW5jZTtcbiAgICB2YXIgYztcbiAgICB3aGlsZSAoY291bnQgPiAwICYmIChjID0gY3VycmVudExpbmVbdGhpcy5vZmZzZXRdKSkge1xuICAgICAgICBpZiAoYyA9PT0gJ1xcdCcpIHtcbiAgICAgICAgICAgIGNoYXJzVG9UYWIgPSA0IC0gKHRoaXMuY29sdW1uICUgNCk7XG4gICAgICAgICAgICBpZiAoY29sdW1ucykge1xuICAgICAgICAgICAgICAgIHRoaXMucGFydGlhbGx5Q29uc3VtZWRUYWIgPSBjaGFyc1RvVGFiID4gY291bnQ7XG4gICAgICAgICAgICAgICAgY2hhcnNUb0FkdmFuY2UgPSBjaGFyc1RvVGFiID4gY291bnQgPyBjb3VudCA6IGNoYXJzVG9UYWI7XG4gICAgICAgICAgICAgICAgdGhpcy5jb2x1bW4gKz0gY2hhcnNUb0FkdmFuY2U7XG4gICAgICAgICAgICAgICAgdGhpcy5vZmZzZXQgKz0gdGhpcy5wYXJ0aWFsbHlDb25zdW1lZFRhYiA/IDAgOiAxO1xuICAgICAgICAgICAgICAgIGNvdW50IC09IGNoYXJzVG9BZHZhbmNlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBhcnRpYWxseUNvbnN1bWVkVGFiID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5jb2x1bW4gKz0gY2hhcnNUb1RhYjtcbiAgICAgICAgICAgICAgICB0aGlzLm9mZnNldCArPSAxO1xuICAgICAgICAgICAgICAgIGNvdW50IC09IDE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBhcnRpYWxseUNvbnN1bWVkVGFiID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLm9mZnNldCArPSAxO1xuICAgICAgICAgICAgdGhpcy5jb2x1bW4gKz0gMTsgLy8gYXNzdW1lIGFzY2lpOyBibG9jayBzdGFydHMgYXJlIGFzY2lpXG4gICAgICAgICAgICBjb3VudCAtPSAxO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIGFkdmFuY2VOZXh0Tm9uc3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm9mZnNldCA9IHRoaXMubmV4dE5vbnNwYWNlO1xuICAgIHRoaXMuY29sdW1uID0gdGhpcy5uZXh0Tm9uc3BhY2VDb2x1bW47XG4gICAgdGhpcy5wYXJ0aWFsbHlDb25zdW1lZFRhYiA9IGZhbHNlO1xufTtcblxudmFyIGZpbmROZXh0Tm9uc3BhY2UgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY3VycmVudExpbmUgPSB0aGlzLmN1cnJlbnRMaW5lO1xuICAgIHZhciBpID0gdGhpcy5vZmZzZXQ7XG4gICAgdmFyIGNvbHMgPSB0aGlzLmNvbHVtbjtcbiAgICB2YXIgYztcblxuICAgIHdoaWxlICgoYyA9IGN1cnJlbnRMaW5lLmNoYXJBdChpKSkgIT09ICcnKSB7XG4gICAgICAgIGlmIChjID09PSAnICcpIHtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIGNvbHMrKztcbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnXFx0Jykge1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgY29scyArPSAoNCAtIChjb2xzICUgNCkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5ibGFuayA9IChjID09PSAnXFxuJyB8fCBjID09PSAnXFxyJyB8fCBjID09PSAnJyk7XG4gICAgdGhpcy5uZXh0Tm9uc3BhY2UgPSBpO1xuICAgIHRoaXMubmV4dE5vbnNwYWNlQ29sdW1uID0gY29scztcbiAgICB0aGlzLmluZGVudCA9IHRoaXMubmV4dE5vbnNwYWNlQ29sdW1uIC0gdGhpcy5jb2x1bW47XG4gICAgdGhpcy5pbmRlbnRlZCA9IHRoaXMuaW5kZW50ID49IENPREVfSU5ERU5UO1xufTtcblxuLy8gQW5hbHl6ZSBhIGxpbmUgb2YgdGV4dCBhbmQgdXBkYXRlIHRoZSBkb2N1bWVudCBhcHByb3ByaWF0ZWx5LlxuLy8gV2UgcGFyc2UgbWFya2Rvd24gdGV4dCBieSBjYWxsaW5nIHRoaXMgb24gZWFjaCBsaW5lIG9mIGlucHV0LFxuLy8gdGhlbiBmaW5hbGl6aW5nIHRoZSBkb2N1bWVudC5cbnZhciBpbmNvcnBvcmF0ZUxpbmUgPSBmdW5jdGlvbihsbikge1xuICAgIHZhciBhbGxfbWF0Y2hlZCA9IHRydWU7XG4gICAgdmFyIHQ7XG5cbiAgICB2YXIgY29udGFpbmVyID0gdGhpcy5kb2M7XG4gICAgdGhpcy5vbGR0aXAgPSB0aGlzLnRpcDtcbiAgICB0aGlzLm9mZnNldCA9IDA7XG4gICAgdGhpcy5jb2x1bW4gPSAwO1xuICAgIHRoaXMuYmxhbmsgPSBmYWxzZTtcbiAgICB0aGlzLnBhcnRpYWxseUNvbnN1bWVkVGFiID0gZmFsc2U7XG4gICAgdGhpcy5saW5lTnVtYmVyICs9IDE7XG5cbiAgICAvLyByZXBsYWNlIE5VTCBjaGFyYWN0ZXJzIGZvciBzZWN1cml0eVxuICAgIGlmIChsbi5pbmRleE9mKCdcXHUwMDAwJykgIT09IC0xKSB7XG4gICAgICAgIGxuID0gbG4ucmVwbGFjZSgvXFwwL2csICdcXHVGRkZEJyk7XG4gICAgfVxuXG4gICAgdGhpcy5jdXJyZW50TGluZSA9IGxuO1xuXG4gICAgLy8gRm9yIGVhY2ggY29udGFpbmluZyBibG9jaywgdHJ5IHRvIHBhcnNlIHRoZSBhc3NvY2lhdGVkIGxpbmUgc3RhcnQuXG4gICAgLy8gQmFpbCBvdXQgb24gZmFpbHVyZTogY29udGFpbmVyIHdpbGwgcG9pbnQgdG8gdGhlIGxhc3QgbWF0Y2hpbmcgYmxvY2suXG4gICAgLy8gU2V0IGFsbF9tYXRjaGVkIHRvIGZhbHNlIGlmIG5vdCBhbGwgY29udGFpbmVycyBtYXRjaC5cbiAgICB2YXIgbGFzdENoaWxkO1xuICAgIHdoaWxlICgobGFzdENoaWxkID0gY29udGFpbmVyLl9sYXN0Q2hpbGQpICYmIGxhc3RDaGlsZC5fb3Blbikge1xuICAgICAgICBjb250YWluZXIgPSBsYXN0Q2hpbGQ7XG5cbiAgICAgICAgdGhpcy5maW5kTmV4dE5vbnNwYWNlKCk7XG5cbiAgICAgICAgc3dpdGNoICh0aGlzLmJsb2Nrc1tjb250YWluZXIudHlwZV0uY29udGludWUodGhpcywgY29udGFpbmVyKSkge1xuICAgICAgICBjYXNlIDA6IC8vIHdlJ3ZlIG1hdGNoZWQsIGtlZXAgZ29pbmdcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIDE6IC8vIHdlJ3ZlIGZhaWxlZCB0byBtYXRjaCBhIGJsb2NrXG4gICAgICAgICAgICBhbGxfbWF0Y2hlZCA9IGZhbHNlO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMjogLy8gd2UndmUgaGl0IGVuZCBvZiBsaW5lIGZvciBmZW5jZWQgY29kZSBjbG9zZSBhbmQgY2FuIHJldHVyblxuICAgICAgICAgICAgdGhpcy5sYXN0TGluZUxlbmd0aCA9IGxuLmxlbmd0aDtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHRocm93ICdjb250aW51ZSByZXR1cm5lZCBpbGxlZ2FsIHZhbHVlLCBtdXN0IGJlIDAsIDEsIG9yIDInO1xuICAgICAgICB9XG4gICAgICAgIGlmICghYWxsX21hdGNoZWQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IGNvbnRhaW5lci5fcGFyZW50OyAvLyBiYWNrIHVwIHRvIGxhc3QgbWF0Y2hpbmcgYmxvY2tcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgdGhpcy5hbGxDbG9zZWQgPSAoY29udGFpbmVyID09PSB0aGlzLm9sZHRpcCk7XG4gICAgdGhpcy5sYXN0TWF0Y2hlZENvbnRhaW5lciA9IGNvbnRhaW5lcjtcblxuICAgIHZhciBtYXRjaGVkTGVhZiA9IGNvbnRhaW5lci50eXBlICE9PSAncGFyYWdyYXBoJyAmJlxuICAgICAgICAgICAgYmxvY2tzW2NvbnRhaW5lci50eXBlXS5hY2NlcHRzTGluZXM7XG4gICAgdmFyIHN0YXJ0cyA9IHRoaXMuYmxvY2tTdGFydHM7XG4gICAgdmFyIHN0YXJ0c0xlbiA9IHN0YXJ0cy5sZW5ndGg7XG4gICAgLy8gVW5sZXNzIGxhc3QgbWF0Y2hlZCBjb250YWluZXIgaXMgYSBjb2RlIGJsb2NrLCB0cnkgbmV3IGNvbnRhaW5lciBzdGFydHMsXG4gICAgLy8gYWRkaW5nIGNoaWxkcmVuIHRvIHRoZSBsYXN0IG1hdGNoZWQgY29udGFpbmVyOlxuICAgIHdoaWxlICghbWF0Y2hlZExlYWYpIHtcblxuICAgICAgICB0aGlzLmZpbmROZXh0Tm9uc3BhY2UoKTtcblxuICAgICAgICAvLyB0aGlzIGlzIGEgbGl0dGxlIHBlcmZvcm1hbmNlIG9wdGltaXphdGlvbjpcbiAgICAgICAgaWYgKCF0aGlzLmluZGVudGVkICYmXG4gICAgICAgICAgICAhcmVNYXliZVNwZWNpYWwudGVzdChsbi5zbGljZSh0aGlzLm5leHROb25zcGFjZSkpKSB7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2VOZXh0Tm9uc3BhY2UoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIGkgPSAwO1xuICAgICAgICB3aGlsZSAoaSA8IHN0YXJ0c0xlbikge1xuICAgICAgICAgICAgdmFyIHJlcyA9IHN0YXJ0c1tpXSh0aGlzLCBjb250YWluZXIpO1xuICAgICAgICAgICAgaWYgKHJlcyA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lciA9IHRoaXMudGlwO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXMgPT09IDIpIHtcbiAgICAgICAgICAgICAgICBjb250YWluZXIgPSB0aGlzLnRpcDtcbiAgICAgICAgICAgICAgICBtYXRjaGVkTGVhZiA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGkrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChpID09PSBzdGFydHNMZW4pIHsgLy8gbm90aGluZyBtYXRjaGVkXG4gICAgICAgICAgICB0aGlzLmFkdmFuY2VOZXh0Tm9uc3BhY2UoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gV2hhdCByZW1haW5zIGF0IHRoZSBvZmZzZXQgaXMgYSB0ZXh0IGxpbmUuICBBZGQgdGhlIHRleHQgdG8gdGhlXG4gICAgLy8gYXBwcm9wcmlhdGUgY29udGFpbmVyLlxuXG4gICAvLyBGaXJzdCBjaGVjayBmb3IgYSBsYXp5IHBhcmFncmFwaCBjb250aW51YXRpb246XG4gICAgaWYgKCF0aGlzLmFsbENsb3NlZCAmJiAhdGhpcy5ibGFuayAmJlxuICAgICAgICB0aGlzLnRpcC50eXBlID09PSAncGFyYWdyYXBoJykge1xuICAgICAgICAvLyBsYXp5IHBhcmFncmFwaCBjb250aW51YXRpb25cbiAgICAgICAgdGhpcy5hZGRMaW5lKCk7XG5cbiAgICB9IGVsc2UgeyAvLyBub3QgYSBsYXp5IGNvbnRpbnVhdGlvblxuXG4gICAgICAgIC8vIGZpbmFsaXplIGFueSBibG9ja3Mgbm90IG1hdGNoZWRcbiAgICAgICAgdGhpcy5jbG9zZVVubWF0Y2hlZEJsb2NrcygpO1xuICAgICAgICBpZiAodGhpcy5ibGFuayAmJiBjb250YWluZXIubGFzdENoaWxkKSB7XG4gICAgICAgICAgICBjb250YWluZXIubGFzdENoaWxkLl9sYXN0TGluZUJsYW5rID0gdHJ1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHQgPSBjb250YWluZXIudHlwZTtcblxuICAgICAgICAvLyBCbG9jayBxdW90ZSBsaW5lcyBhcmUgbmV2ZXIgYmxhbmsgYXMgdGhleSBzdGFydCB3aXRoID5cbiAgICAgICAgLy8gYW5kIHdlIGRvbid0IGNvdW50IGJsYW5rcyBpbiBmZW5jZWQgY29kZSBmb3IgcHVycG9zZXMgb2YgdGlnaHQvbG9vc2VcbiAgICAgICAgLy8gbGlzdHMgb3IgYnJlYWtpbmcgb3V0IG9mIGxpc3RzLiAgV2UgYWxzbyBkb24ndCBzZXQgX2xhc3RMaW5lQmxhbmtcbiAgICAgICAgLy8gb24gYW4gZW1wdHkgbGlzdCBpdGVtLCBvciBpZiB3ZSBqdXN0IGNsb3NlZCBhIGZlbmNlZCBibG9jay5cbiAgICAgICAgdmFyIGxhc3RMaW5lQmxhbmsgPSB0aGlzLmJsYW5rICYmXG4gICAgICAgICAgICAhKHQgPT09ICdibG9ja19xdW90ZScgfHxcbiAgICAgICAgICAgICAgKHQgPT09ICdjb2RlX2Jsb2NrJyAmJiBjb250YWluZXIuX2lzRmVuY2VkKSB8fFxuICAgICAgICAgICAgICAodCA9PT0gJ2l0ZW0nICYmXG4gICAgICAgICAgICAgICAhY29udGFpbmVyLl9maXJzdENoaWxkICYmXG4gICAgICAgICAgICAgICBjb250YWluZXIuc291cmNlcG9zWzBdWzBdID09PSB0aGlzLmxpbmVOdW1iZXIpKTtcblxuICAgICAgICAvLyBwcm9wYWdhdGUgbGFzdExpbmVCbGFuayB1cCB0aHJvdWdoIHBhcmVudHM6XG4gICAgICAgIHZhciBjb250ID0gY29udGFpbmVyO1xuICAgICAgICB3aGlsZSAoY29udCkge1xuICAgICAgICAgICAgY29udC5fbGFzdExpbmVCbGFuayA9IGxhc3RMaW5lQmxhbms7XG4gICAgICAgICAgICBjb250ID0gY29udC5fcGFyZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuYmxvY2tzW3RdLmFjY2VwdHNMaW5lcykge1xuICAgICAgICAgICAgdGhpcy5hZGRMaW5lKCk7XG4gICAgICAgICAgICAvLyBpZiBIdG1sQmxvY2ssIGNoZWNrIGZvciBlbmQgY29uZGl0aW9uXG4gICAgICAgICAgICBpZiAodCA9PT0gJ2h0bWxfYmxvY2snICYmXG4gICAgICAgICAgICAgICAgY29udGFpbmVyLl9odG1sQmxvY2tUeXBlID49IDEgJiZcbiAgICAgICAgICAgICAgICBjb250YWluZXIuX2h0bWxCbG9ja1R5cGUgPD0gNSAmJlxuICAgICAgICAgICAgICAgIHJlSHRtbEJsb2NrQ2xvc2VbY29udGFpbmVyLl9odG1sQmxvY2tUeXBlXS50ZXN0KHRoaXMuY3VycmVudExpbmUuc2xpY2UodGhpcy5vZmZzZXQpKSkge1xuICAgICAgICAgICAgICAgIHRoaXMuZmluYWxpemUoY29udGFpbmVyLCB0aGlzLmxpbmVOdW1iZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgIH0gZWxzZSBpZiAodGhpcy5vZmZzZXQgPCBsbi5sZW5ndGggJiYgIXRoaXMuYmxhbmspIHtcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBwYXJhZ3JhcGggY29udGFpbmVyIGZvciBsaW5lXG4gICAgICAgICAgICBjb250YWluZXIgPSB0aGlzLmFkZENoaWxkKCdwYXJhZ3JhcGgnLCB0aGlzLm9mZnNldCk7XG4gICAgICAgICAgICB0aGlzLmFkdmFuY2VOZXh0Tm9uc3BhY2UoKTtcbiAgICAgICAgICAgIHRoaXMuYWRkTGluZSgpO1xuICAgICAgICB9XG4gICAgfVxuICAgIHRoaXMubGFzdExpbmVMZW5ndGggPSBsbi5sZW5ndGg7XG59O1xuXG4vLyBGaW5hbGl6ZSBhIGJsb2NrLiAgQ2xvc2UgaXQgYW5kIGRvIGFueSBuZWNlc3NhcnkgcG9zdHByb2Nlc3NpbmcsXG4vLyBlLmcuIGNyZWF0aW5nIHN0cmluZ19jb250ZW50IGZyb20gc3RyaW5ncywgc2V0dGluZyB0aGUgJ3RpZ2h0J1xuLy8gb3IgJ2xvb3NlJyBzdGF0dXMgb2YgYSBsaXN0LCBhbmQgcGFyc2luZyB0aGUgYmVnaW5uaW5nc1xuLy8gb2YgcGFyYWdyYXBocyBmb3IgcmVmZXJlbmNlIGRlZmluaXRpb25zLiAgUmVzZXQgdGhlIHRpcCB0byB0aGVcbi8vIHBhcmVudCBvZiB0aGUgY2xvc2VkIGJsb2NrLlxudmFyIGZpbmFsaXplID0gZnVuY3Rpb24oYmxvY2ssIGxpbmVOdW1iZXIpIHtcbiAgICB2YXIgYWJvdmUgPSBibG9jay5fcGFyZW50O1xuICAgIGJsb2NrLl9vcGVuID0gZmFsc2U7XG4gICAgYmxvY2suc291cmNlcG9zWzFdID0gW2xpbmVOdW1iZXIsIHRoaXMubGFzdExpbmVMZW5ndGhdO1xuXG4gICAgdGhpcy5ibG9ja3NbYmxvY2sudHlwZV0uZmluYWxpemUodGhpcywgYmxvY2spO1xuXG4gICAgdGhpcy50aXAgPSBhYm92ZTtcbn07XG5cbi8vIFdhbGsgdGhyb3VnaCBhIGJsb2NrICYgY2hpbGRyZW4gcmVjdXJzaXZlbHksIHBhcnNpbmcgc3RyaW5nIGNvbnRlbnRcbi8vIGludG8gaW5saW5lIGNvbnRlbnQgd2hlcmUgYXBwcm9wcmlhdGUuXG52YXIgcHJvY2Vzc0lubGluZXMgPSBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBub2RlLCBldmVudCwgdDtcbiAgICB2YXIgd2Fsa2VyID0gYmxvY2sud2Fsa2VyKCk7XG4gICAgdGhpcy5pbmxpbmVQYXJzZXIucmVmbWFwID0gdGhpcy5yZWZtYXA7XG4gICAgdGhpcy5pbmxpbmVQYXJzZXIub3B0aW9ucyA9IHRoaXMub3B0aW9ucztcbiAgICB3aGlsZSAoKGV2ZW50ID0gd2Fsa2VyLm5leHQoKSkpIHtcbiAgICAgICAgbm9kZSA9IGV2ZW50Lm5vZGU7XG4gICAgICAgIHQgPSBub2RlLnR5cGU7XG4gICAgICAgIGlmICghZXZlbnQuZW50ZXJpbmcgJiYgKHQgPT09ICdwYXJhZ3JhcGgnIHx8IHQgPT09ICdoZWFkaW5nJykpIHtcbiAgICAgICAgICAgIHRoaXMuaW5saW5lUGFyc2VyLnBhcnNlKG5vZGUpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxudmFyIERvY3VtZW50ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIGRvYyA9IG5ldyBOb2RlKCdkb2N1bWVudCcsIFtbMSwgMV0sIFswLCAwXV0pO1xuICAgIHJldHVybiBkb2M7XG59O1xuXG4vLyBUaGUgbWFpbiBwYXJzaW5nIGZ1bmN0aW9uLiAgUmV0dXJucyBhIHBhcnNlZCBkb2N1bWVudCBBU1QuXG52YXIgcGFyc2UgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgIHRoaXMuZG9jID0gbmV3IERvY3VtZW50KCk7XG4gICAgdGhpcy50aXAgPSB0aGlzLmRvYztcbiAgICB0aGlzLnJlZm1hcCA9IHt9O1xuICAgIHRoaXMubGluZU51bWJlciA9IDA7XG4gICAgdGhpcy5sYXN0TGluZUxlbmd0aCA9IDA7XG4gICAgdGhpcy5vZmZzZXQgPSAwO1xuICAgIHRoaXMuY29sdW1uID0gMDtcbiAgICB0aGlzLmxhc3RNYXRjaGVkQ29udGFpbmVyID0gdGhpcy5kb2M7XG4gICAgdGhpcy5jdXJyZW50TGluZSA9IFwiXCI7XG4gICAgaWYgKHRoaXMub3B0aW9ucy50aW1lKSB7IGNvbnNvbGUudGltZShcInByZXBhcmluZyBpbnB1dFwiKTsgfVxuICAgIHZhciBsaW5lcyA9IGlucHV0LnNwbGl0KHJlTGluZUVuZGluZyk7XG4gICAgdmFyIGxlbiA9IGxpbmVzLmxlbmd0aDtcbiAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChpbnB1dC5sZW5ndGggLSAxKSA9PT0gQ19ORVdMSU5FKSB7XG4gICAgICAgIC8vIGlnbm9yZSBsYXN0IGJsYW5rIGxpbmUgY3JlYXRlZCBieSBmaW5hbCBuZXdsaW5lXG4gICAgICAgIGxlbiAtPSAxO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWUpIHsgY29uc29sZS50aW1lRW5kKFwicHJlcGFyaW5nIGlucHV0XCIpOyB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50aW1lKSB7IGNvbnNvbGUudGltZShcImJsb2NrIHBhcnNpbmdcIik7IH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICAgIHRoaXMuaW5jb3Jwb3JhdGVMaW5lKGxpbmVzW2ldKTtcbiAgICB9XG4gICAgd2hpbGUgKHRoaXMudGlwKSB7XG4gICAgICAgIHRoaXMuZmluYWxpemUodGhpcy50aXAsIGxlbik7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudGltZSkgeyBjb25zb2xlLnRpbWVFbmQoXCJibG9jayBwYXJzaW5nXCIpOyB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50aW1lKSB7IGNvbnNvbGUudGltZShcImlubGluZSBwYXJzaW5nXCIpOyB9XG4gICAgdGhpcy5wcm9jZXNzSW5saW5lcyh0aGlzLmRvYyk7XG4gICAgaWYgKHRoaXMub3B0aW9ucy50aW1lKSB7IGNvbnNvbGUudGltZUVuZChcImlubGluZSBwYXJzaW5nXCIpOyB9XG4gICAgcmV0dXJuIHRoaXMuZG9jO1xufTtcblxuXG4vLyBUaGUgUGFyc2VyIG9iamVjdC5cbmZ1bmN0aW9uIFBhcnNlcihvcHRpb25zKXtcbiAgICByZXR1cm4ge1xuICAgICAgICBkb2M6IG5ldyBEb2N1bWVudCgpLFxuICAgICAgICBibG9ja3M6IGJsb2NrcyxcbiAgICAgICAgYmxvY2tTdGFydHM6IGJsb2NrU3RhcnRzLFxuICAgICAgICB0aXA6IHRoaXMuZG9jLFxuICAgICAgICBvbGR0aXA6IHRoaXMuZG9jLFxuICAgICAgICBjdXJyZW50TGluZTogXCJcIixcbiAgICAgICAgbGluZU51bWJlcjogMCxcbiAgICAgICAgb2Zmc2V0OiAwLFxuICAgICAgICBjb2x1bW46IDAsXG4gICAgICAgIG5leHROb25zcGFjZTogMCxcbiAgICAgICAgbmV4dE5vbnNwYWNlQ29sdW1uOiAwLFxuICAgICAgICBpbmRlbnQ6IDAsXG4gICAgICAgIGluZGVudGVkOiBmYWxzZSxcbiAgICAgICAgYmxhbms6IGZhbHNlLFxuICAgICAgICBwYXJ0aWFsbHlDb25zdW1lZFRhYjogZmFsc2UsXG4gICAgICAgIGFsbENsb3NlZDogdHJ1ZSxcbiAgICAgICAgbGFzdE1hdGNoZWRDb250YWluZXI6IHRoaXMuZG9jLFxuICAgICAgICByZWZtYXA6IHt9LFxuICAgICAgICBsYXN0TGluZUxlbmd0aDogMCxcbiAgICAgICAgaW5saW5lUGFyc2VyOiBuZXcgSW5saW5lUGFyc2VyKG9wdGlvbnMpLFxuICAgICAgICBmaW5kTmV4dE5vbnNwYWNlOiBmaW5kTmV4dE5vbnNwYWNlLFxuICAgICAgICBhZHZhbmNlT2Zmc2V0OiBhZHZhbmNlT2Zmc2V0LFxuICAgICAgICBhZHZhbmNlTmV4dE5vbnNwYWNlOiBhZHZhbmNlTmV4dE5vbnNwYWNlLFxuICAgICAgICBhZGRMaW5lOiBhZGRMaW5lLFxuICAgICAgICBhZGRDaGlsZDogYWRkQ2hpbGQsXG4gICAgICAgIGluY29ycG9yYXRlTGluZTogaW5jb3Jwb3JhdGVMaW5lLFxuICAgICAgICBmaW5hbGl6ZTogZmluYWxpemUsXG4gICAgICAgIHByb2Nlc3NJbmxpbmVzOiBwcm9jZXNzSW5saW5lcyxcbiAgICAgICAgY2xvc2VVbm1hdGNoZWRCbG9ja3M6IGNsb3NlVW5tYXRjaGVkQmxvY2tzLFxuICAgICAgICBwYXJzZTogcGFyc2UsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMgfHwge31cbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFBhcnNlcjtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgZW5jb2RlID0gcmVxdWlyZSgnbWR1cmwvZW5jb2RlJyk7XG52YXIgZGVjb2RlID0gcmVxdWlyZSgnbWR1cmwvZGVjb2RlJyk7XG5cbnZhciBDX0JBQ0tTTEFTSCA9IDkyO1xuXG52YXIgZGVjb2RlSFRNTCA9IHJlcXVpcmUoJ2VudGl0aWVzJykuZGVjb2RlSFRNTDtcblxudmFyIEVOVElUWSA9IFwiJig/OiN4W2EtZjAtOV17MSw4fXwjWzAtOV17MSw4fXxbYS16XVthLXowLTldezEsMzF9KTtcIjtcblxudmFyIFRBR05BTUUgPSAnW0EtWmEtel1bQS1aYS16MC05LV0qJztcbnZhciBBVFRSSUJVVEVOQU1FID0gJ1thLXpBLVpfOl1bYS16QS1aMC05Oi5fLV0qJztcbnZhciBVTlFVT1RFRFZBTFVFID0gXCJbXlxcXCInPTw+YFxcXFx4MDAtXFxcXHgyMF0rXCI7XG52YXIgU0lOR0xFUVVPVEVEVkFMVUUgPSBcIidbXiddKidcIjtcbnZhciBET1VCTEVRVU9URURWQUxVRSA9ICdcIlteXCJdKlwiJztcbnZhciBBVFRSSUJVVEVWQUxVRSA9IFwiKD86XCIgKyBVTlFVT1RFRFZBTFVFICsgXCJ8XCIgKyBTSU5HTEVRVU9URURWQUxVRSArIFwifFwiICsgRE9VQkxFUVVPVEVEVkFMVUUgKyBcIilcIjtcbnZhciBBVFRSSUJVVEVWQUxVRVNQRUMgPSBcIig/OlwiICsgXCJcXFxccyo9XCIgKyBcIlxcXFxzKlwiICsgQVRUUklCVVRFVkFMVUUgKyBcIilcIjtcbnZhciBBVFRSSUJVVEUgPSBcIig/OlwiICsgXCJcXFxccytcIiArIEFUVFJJQlVURU5BTUUgKyBBVFRSSUJVVEVWQUxVRVNQRUMgKyBcIj8pXCI7XG52YXIgT1BFTlRBRyA9IFwiPFwiICsgVEFHTkFNRSArIEFUVFJJQlVURSArIFwiKlwiICsgXCJcXFxccyovPz5cIjtcbnZhciBDTE9TRVRBRyA9IFwiPC9cIiArIFRBR05BTUUgKyBcIlxcXFxzKls+XVwiO1xudmFyIEhUTUxDT01NRU5UID0gXCI8IS0tLS0+fDwhLS0oPzotP1tePi1dKSg/Oi0/W14tXSkqLS0+XCI7XG52YXIgUFJPQ0VTU0lOR0lOU1RSVUNUSU9OID0gXCJbPF1bP10uKj9bP11bPl1cIjtcbnZhciBERUNMQVJBVElPTiA9IFwiPCFbQS1aXStcIiArIFwiXFxcXHMrW14+XSo+XCI7XG52YXIgQ0RBVEEgPSBcIjwhXFxcXFtDREFUQVxcXFxbW1xcXFxzXFxcXFNdKj9cXFxcXVxcXFxdPlwiO1xudmFyIEhUTUxUQUcgPSBcIig/OlwiICsgT1BFTlRBRyArIFwifFwiICsgQ0xPU0VUQUcgKyBcInxcIiArIEhUTUxDT01NRU5UICsgXCJ8XCIgK1xuICAgICAgICBQUk9DRVNTSU5HSU5TVFJVQ1RJT04gKyBcInxcIiArIERFQ0xBUkFUSU9OICsgXCJ8XCIgKyBDREFUQSArIFwiKVwiO1xudmFyIHJlSHRtbFRhZyA9IG5ldyBSZWdFeHAoJ14nICsgSFRNTFRBRywgJ2knKTtcblxudmFyIHJlQmFja3NsYXNoT3JBbXAgPSAvW1xcXFwmXS87XG5cbnZhciBFU0NBUEFCTEUgPSAnWyFcIiMkJSZcXCcoKSorLC4vOjs8PT4/QFtcXFxcXFxcXFxcXFxdXl9ge3x9fi1dJztcblxudmFyIHJlRW50aXR5T3JFc2NhcGVkQ2hhciA9IG5ldyBSZWdFeHAoJ1xcXFxcXFxcJyArIEVTQ0FQQUJMRSArICd8JyArIEVOVElUWSwgJ2dpJyk7XG5cbnZhciBYTUxTUEVDSUFMID0gJ1smPD5cIl0nO1xuXG52YXIgcmVYbWxTcGVjaWFsID0gbmV3IFJlZ0V4cChYTUxTUEVDSUFMLCAnZycpO1xuXG52YXIgcmVYbWxTcGVjaWFsT3JFbnRpdHkgPSBuZXcgUmVnRXhwKEVOVElUWSArICd8JyArIFhNTFNQRUNJQUwsICdnaScpO1xuXG52YXIgdW5lc2NhcGVDaGFyID0gZnVuY3Rpb24ocykge1xuICAgIGlmIChzLmNoYXJDb2RlQXQoMCkgPT09IENfQkFDS1NMQVNIKSB7XG4gICAgICAgIHJldHVybiBzLmNoYXJBdCgxKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZGVjb2RlSFRNTChzKTtcbiAgICB9XG59O1xuXG4vLyBSZXBsYWNlIGVudGl0aWVzIGFuZCBiYWNrc2xhc2ggZXNjYXBlcyB3aXRoIGxpdGVyYWwgY2hhcmFjdGVycy5cbnZhciB1bmVzY2FwZVN0cmluZyA9IGZ1bmN0aW9uKHMpIHtcbiAgICBpZiAocmVCYWNrc2xhc2hPckFtcC50ZXN0KHMpKSB7XG4gICAgICAgIHJldHVybiBzLnJlcGxhY2UocmVFbnRpdHlPckVzY2FwZWRDaGFyLCB1bmVzY2FwZUNoYXIpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBzO1xuICAgIH1cbn07XG5cbnZhciBub3JtYWxpemVVUkkgPSBmdW5jdGlvbih1cmkpIHtcbiAgICB0cnkge1xuICAgICAgICByZXR1cm4gZW5jb2RlKGRlY29kZSh1cmkpKTtcbiAgICB9XG4gICAgY2F0Y2goZXJyKSB7XG4gICAgICAgIHJldHVybiB1cmk7XG4gICAgfVxufTtcblxudmFyIHJlcGxhY2VVbnNhZmVDaGFyID0gZnVuY3Rpb24ocykge1xuICAgIHN3aXRjaCAocykge1xuICAgIGNhc2UgJyYnOlxuICAgICAgICByZXR1cm4gJyZhbXA7JztcbiAgICBjYXNlICc8JzpcbiAgICAgICAgcmV0dXJuICcmbHQ7JztcbiAgICBjYXNlICc+JzpcbiAgICAgICAgcmV0dXJuICcmZ3Q7JztcbiAgICBjYXNlICdcIic6XG4gICAgICAgIHJldHVybiAnJnF1b3Q7JztcbiAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gcztcbiAgICB9XG59O1xuXG52YXIgZXNjYXBlWG1sID0gZnVuY3Rpb24ocywgcHJlc2VydmVfZW50aXRpZXMpIHtcbiAgICBpZiAocmVYbWxTcGVjaWFsLnRlc3QocykpIHtcbiAgICAgICAgaWYgKHByZXNlcnZlX2VudGl0aWVzKSB7XG4gICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKHJlWG1sU3BlY2lhbE9yRW50aXR5LCByZXBsYWNlVW5zYWZlQ2hhcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gcy5yZXBsYWNlKHJlWG1sU3BlY2lhbCwgcmVwbGFjZVVuc2FmZUNoYXIpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7IHVuZXNjYXBlU3RyaW5nOiB1bmVzY2FwZVN0cmluZyxcbiAgICAgICAgICAgICAgICAgICBub3JtYWxpemVVUkk6IG5vcm1hbGl6ZVVSSSxcbiAgICAgICAgICAgICAgICAgICBlc2NhcGVYbWw6IGVzY2FwZVhtbCxcbiAgICAgICAgICAgICAgICAgICByZUh0bWxUYWc6IHJlSHRtbFRhZyxcbiAgICAgICAgICAgICAgICAgICBPUEVOVEFHOiBPUEVOVEFHLFxuICAgICAgICAgICAgICAgICAgIENMT1NFVEFHOiBDTE9TRVRBRyxcbiAgICAgICAgICAgICAgICAgICBFTlRJVFk6IEVOVElUWSxcbiAgICAgICAgICAgICAgICAgICBFU0NBUEFCTEU6IEVTQ0FQQUJMRVxuICAgICAgICAgICAgICAgICB9O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8vIGRlcml2ZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vbWF0aGlhc2J5bmVucy9TdHJpbmcuZnJvbUNvZGVQb2ludFxuLyohIGh0dHA6Ly9tdGhzLmJlL2Zyb21jb2RlcG9pbnQgdjAuMi4xIGJ5IEBtYXRoaWFzICovXG5pZiAoU3RyaW5nLmZyb21Db2RlUG9pbnQpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChfKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQoXyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGlmIChlIGluc3RhbmNlb2YgUmFuZ2VFcnJvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICB9XG4gICAgfTtcblxufSBlbHNlIHtcblxuICB2YXIgc3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZTtcbiAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgdmFyIGZyb21Db2RlUG9pbnQgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBNQVhfU0laRSA9IDB4NDAwMDtcbiAgICAgIHZhciBjb2RlVW5pdHMgPSBbXTtcbiAgICAgIHZhciBoaWdoU3Vycm9nYXRlO1xuICAgICAgdmFyIGxvd1N1cnJvZ2F0ZTtcbiAgICAgIHZhciBpbmRleCA9IC0xO1xuICAgICAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICBpZiAoIWxlbmd0aCkge1xuICAgICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cbiAgICAgIHZhciByZXN1bHQgPSAnJztcbiAgICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgdmFyIGNvZGVQb2ludCA9IE51bWJlcihhcmd1bWVudHNbaW5kZXhdKTtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICFpc0Zpbml0ZShjb2RlUG9pbnQpIHx8IC8vIGBOYU5gLCBgK0luZmluaXR5YCwgb3IgYC1JbmZpbml0eWBcbiAgICAgICAgICAgICAgICAgIGNvZGVQb2ludCA8IDAgfHwgLy8gbm90IGEgdmFsaWQgVW5pY29kZSBjb2RlIHBvaW50XG4gICAgICAgICAgICAgICAgICBjb2RlUG9pbnQgPiAweDEwRkZGRiB8fCAvLyBub3QgYSB2YWxpZCBVbmljb2RlIGNvZGUgcG9pbnRcbiAgICAgICAgICAgICAgICAgIGZsb29yKGNvZGVQb2ludCkgIT09IGNvZGVQb2ludCAvLyBub3QgYW4gaW50ZWdlclxuICAgICAgICAgICkge1xuICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZSgweEZGRkQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoY29kZVBvaW50IDw9IDB4RkZGRikgeyAvLyBCTVAgY29kZSBwb2ludFxuICAgICAgICAgICAgICBjb2RlVW5pdHMucHVzaChjb2RlUG9pbnQpO1xuICAgICAgICAgIH0gZWxzZSB7IC8vIEFzdHJhbCBjb2RlIHBvaW50OyBzcGxpdCBpbiBzdXJyb2dhdGUgaGFsdmVzXG4gICAgICAgICAgICAgIC8vIGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmcjc3Vycm9nYXRlLWZvcm11bGFlXG4gICAgICAgICAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwO1xuICAgICAgICAgICAgICBoaWdoU3Vycm9nYXRlID0gKGNvZGVQb2ludCA+PiAxMCkgKyAweEQ4MDA7XG4gICAgICAgICAgICAgIGxvd1N1cnJvZ2F0ZSA9IChjb2RlUG9pbnQgJSAweDQwMCkgKyAweERDMDA7XG4gICAgICAgICAgICAgIGNvZGVVbml0cy5wdXNoKGhpZ2hTdXJyb2dhdGUsIGxvd1N1cnJvZ2F0ZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChpbmRleCArIDEgPT09IGxlbmd0aCB8fCBjb2RlVW5pdHMubGVuZ3RoID4gTUFYX1NJWkUpIHtcbiAgICAgICAgICAgICAgcmVzdWx0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZS5hcHBseShudWxsLCBjb2RlVW5pdHMpO1xuICAgICAgICAgICAgICBjb2RlVW5pdHMubGVuZ3RoID0gMDtcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICBtb2R1bGUuZXhwb3J0cyA9IGZyb21Db2RlUG9pbnQ7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gY29tbW9ubWFyay5qcyAtIENvbW1vbU1hcmsgaW4gSmF2YVNjcmlwdFxuLy8gQ29weXJpZ2h0IChDKSAyMDE0IEpvaG4gTWFjRmFybGFuZVxuLy8gTGljZW5zZTogQlNEMy5cblxuLy8gQmFzaWMgdXNhZ2U6XG4vL1xuLy8gdmFyIGNvbW1vbm1hcmsgPSByZXF1aXJlKCdjb21tb25tYXJrJyk7XG4vLyB2YXIgcGFyc2VyID0gbmV3IGNvbW1vbm1hcmsuUGFyc2VyKCk7XG4vLyB2YXIgcmVuZGVyZXIgPSBuZXcgY29tbW9ubWFyay5IdG1sUmVuZGVyZXIoKTtcbi8vIGNvbnNvbGUubG9nKHJlbmRlcmVyLnJlbmRlcihwYXJzZXIucGFyc2UoJ0hlbGxvICp3b3JsZConKSkpO1xuXG5tb2R1bGUuZXhwb3J0cy5Ob2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG5tb2R1bGUuZXhwb3J0cy5QYXJzZXIgPSByZXF1aXJlKCcuL2Jsb2NrcycpO1xubW9kdWxlLmV4cG9ydHMuSHRtbFJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXIvaHRtbCcpO1xubW9kdWxlLmV4cG9ydHMuWG1sUmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlci94bWwnKTtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xudmFyIGNvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgbm9ybWFsaXplUmVmZXJlbmNlID0gcmVxdWlyZSgnLi9ub3JtYWxpemUtcmVmZXJlbmNlJyk7XG5cbnZhciBub3JtYWxpemVVUkkgPSBjb21tb24ubm9ybWFsaXplVVJJO1xudmFyIHVuZXNjYXBlU3RyaW5nID0gY29tbW9uLnVuZXNjYXBlU3RyaW5nO1xudmFyIGZyb21Db2RlUG9pbnQgPSByZXF1aXJlKCcuL2Zyb20tY29kZS1wb2ludC5qcycpO1xudmFyIGRlY29kZUhUTUwgPSByZXF1aXJlKCdlbnRpdGllcycpLmRlY29kZUhUTUw7XG5yZXF1aXJlKCdzdHJpbmcucHJvdG90eXBlLnJlcGVhdCcpOyAvLyBQb2x5ZmlsbCBmb3IgU3RyaW5nLnByb3RvdHlwZS5yZXBlYXRcblxuLy8gQ29uc3RhbnRzIGZvciBjaGFyYWN0ZXIgY29kZXM6XG5cbnZhciBDX05FV0xJTkUgPSAxMDtcbnZhciBDX0FTVEVSSVNLID0gNDI7XG52YXIgQ19VTkRFUlNDT1JFID0gOTU7XG52YXIgQ19CQUNLVElDSyA9IDk2O1xudmFyIENfT1BFTl9CUkFDS0VUID0gOTE7XG52YXIgQ19DTE9TRV9CUkFDS0VUID0gOTM7XG52YXIgQ19MRVNTVEhBTiA9IDYwO1xudmFyIENfQkFORyA9IDMzO1xudmFyIENfQkFDS1NMQVNIID0gOTI7XG52YXIgQ19BTVBFUlNBTkQgPSAzODtcbnZhciBDX09QRU5fUEFSRU4gPSA0MDtcbnZhciBDX0NMT1NFX1BBUkVOID0gNDE7XG52YXIgQ19DT0xPTiA9IDU4O1xudmFyIENfU0lOR0xFUVVPVEUgPSAzOTtcbnZhciBDX0RPVUJMRVFVT1RFID0gMzQ7XG5cbi8vIFNvbWUgcmVnZXhwcyB1c2VkIGluIGlubGluZSBwYXJzZXI6XG5cbnZhciBFU0NBUEFCTEUgPSBjb21tb24uRVNDQVBBQkxFO1xudmFyIEVTQ0FQRURfQ0hBUiA9ICdcXFxcXFxcXCcgKyBFU0NBUEFCTEU7XG5cbnZhciBFTlRJVFkgPSBjb21tb24uRU5USVRZO1xudmFyIHJlSHRtbFRhZyA9IGNvbW1vbi5yZUh0bWxUYWc7XG5cbnZhciByZVB1bmN0dWF0aW9uID0gbmV3IFJlZ0V4cCgvWyFcIiMkJSYnKCkqKyxcXC0uLzo7PD0+P0BcXFtcXF1eX2B7fH1+XFx4QTFcXHhBN1xceEFCXFx4QjZcXHhCN1xceEJCXFx4QkZcXHUwMzdFXFx1MDM4N1xcdTA1NUEtXFx1MDU1RlxcdTA1ODlcXHUwNThBXFx1MDVCRVxcdTA1QzBcXHUwNUMzXFx1MDVDNlxcdTA1RjNcXHUwNUY0XFx1MDYwOVxcdTA2MEFcXHUwNjBDXFx1MDYwRFxcdTA2MUJcXHUwNjFFXFx1MDYxRlxcdTA2NkEtXFx1MDY2RFxcdTA2RDRcXHUwNzAwLVxcdTA3MERcXHUwN0Y3LVxcdTA3RjlcXHUwODMwLVxcdTA4M0VcXHUwODVFXFx1MDk2NFxcdTA5NjVcXHUwOTcwXFx1MEFGMFxcdTBERjRcXHUwRTRGXFx1MEU1QVxcdTBFNUJcXHUwRjA0LVxcdTBGMTJcXHUwRjE0XFx1MEYzQS1cXHUwRjNEXFx1MEY4NVxcdTBGRDAtXFx1MEZENFxcdTBGRDlcXHUwRkRBXFx1MTA0QS1cXHUxMDRGXFx1MTBGQlxcdTEzNjAtXFx1MTM2OFxcdTE0MDBcXHUxNjZEXFx1MTY2RVxcdTE2OUJcXHUxNjlDXFx1MTZFQi1cXHUxNkVEXFx1MTczNVxcdTE3MzZcXHUxN0Q0LVxcdTE3RDZcXHUxN0Q4LVxcdTE3REFcXHUxODAwLVxcdTE4MEFcXHUxOTQ0XFx1MTk0NVxcdTFBMUVcXHUxQTFGXFx1MUFBMC1cXHUxQUE2XFx1MUFBOC1cXHUxQUFEXFx1MUI1QS1cXHUxQjYwXFx1MUJGQy1cXHUxQkZGXFx1MUMzQi1cXHUxQzNGXFx1MUM3RVxcdTFDN0ZcXHUxQ0MwLVxcdTFDQzdcXHUxQ0QzXFx1MjAxMC1cXHUyMDI3XFx1MjAzMC1cXHUyMDQzXFx1MjA0NS1cXHUyMDUxXFx1MjA1My1cXHUyMDVFXFx1MjA3RFxcdTIwN0VcXHUyMDhEXFx1MjA4RVxcdTIzMDgtXFx1MjMwQlxcdTIzMjlcXHUyMzJBXFx1Mjc2OC1cXHUyNzc1XFx1MjdDNVxcdTI3QzZcXHUyN0U2LVxcdTI3RUZcXHUyOTgzLVxcdTI5OThcXHUyOUQ4LVxcdTI5REJcXHUyOUZDXFx1MjlGRFxcdTJDRjktXFx1MkNGQ1xcdTJDRkVcXHUyQ0ZGXFx1MkQ3MFxcdTJFMDAtXFx1MkUyRVxcdTJFMzAtXFx1MkU0MlxcdTMwMDEtXFx1MzAwM1xcdTMwMDgtXFx1MzAxMVxcdTMwMTQtXFx1MzAxRlxcdTMwMzBcXHUzMDNEXFx1MzBBMFxcdTMwRkJcXHVBNEZFXFx1QTRGRlxcdUE2MEQtXFx1QTYwRlxcdUE2NzNcXHVBNjdFXFx1QTZGMi1cXHVBNkY3XFx1QTg3NC1cXHVBODc3XFx1QThDRVxcdUE4Q0ZcXHVBOEY4LVxcdUE4RkFcXHVBOEZDXFx1QTkyRVxcdUE5MkZcXHVBOTVGXFx1QTlDMS1cXHVBOUNEXFx1QTlERVxcdUE5REZcXHVBQTVDLVxcdUFBNUZcXHVBQURFXFx1QUFERlxcdUFBRjBcXHVBQUYxXFx1QUJFQlxcdUZEM0VcXHVGRDNGXFx1RkUxMC1cXHVGRTE5XFx1RkUzMC1cXHVGRTUyXFx1RkU1NC1cXHVGRTYxXFx1RkU2M1xcdUZFNjhcXHVGRTZBXFx1RkU2QlxcdUZGMDEtXFx1RkYwM1xcdUZGMDUtXFx1RkYwQVxcdUZGMEMtXFx1RkYwRlxcdUZGMUFcXHVGRjFCXFx1RkYxRlxcdUZGMjBcXHVGRjNCLVxcdUZGM0RcXHVGRjNGXFx1RkY1QlxcdUZGNURcXHVGRjVGLVxcdUZGNjVdfFxcdUQ4MDBbXFx1REQwMC1cXHVERDAyXFx1REY5RlxcdURGRDBdfFxcdUQ4MDFcXHVERDZGfFxcdUQ4MDJbXFx1REM1N1xcdUREMUZcXHVERDNGXFx1REU1MC1cXHVERTU4XFx1REU3RlxcdURFRjAtXFx1REVGNlxcdURGMzktXFx1REYzRlxcdURGOTktXFx1REY5Q118XFx1RDgwNFtcXHVEQzQ3LVxcdURDNERcXHVEQ0JCXFx1RENCQ1xcdURDQkUtXFx1RENDMVxcdURENDAtXFx1REQ0M1xcdURENzRcXHVERDc1XFx1RERDNS1cXHVEREM5XFx1RERDRFxcdUREREJcXHVERERELVxcdUREREZcXHVERTM4LVxcdURFM0RcXHVERUE5XXxcXHVEODA1W1xcdURDQzZcXHVEREMxLVxcdURERDdcXHVERTQxLVxcdURFNDNcXHVERjNDLVxcdURGM0VdfFxcdUQ4MDlbXFx1REM3MC1cXHVEQzc0XXxcXHVEODFBW1xcdURFNkVcXHVERTZGXFx1REVGNVxcdURGMzctXFx1REYzQlxcdURGNDRdfFxcdUQ4MkZcXHVEQzlGfFxcdUQ4MzZbXFx1REU4Ny1cXHVERThCXS8pO1xuXG52YXIgcmVMaW5rVGl0bGUgPSBuZXcgUmVnRXhwKFxuICAgICdeKD86XCIoJyArIEVTQ0FQRURfQ0hBUiArICd8W15cIlxcXFx4MDBdKSpcIicgK1xuICAgICAgICAnfCcgK1xuICAgICAgICAnXFwnKCcgKyBFU0NBUEVEX0NIQVIgKyAnfFteXFwnXFxcXHgwMF0pKlxcJycgK1xuICAgICAgICAnfCcgK1xuICAgICAgICAnXFxcXCgoJyArIEVTQ0FQRURfQ0hBUiArICd8W14pXFxcXHgwMF0pKlxcXFwpKScpO1xuXG52YXIgcmVMaW5rRGVzdGluYXRpb25CcmFjZXMgPSBuZXcgUmVnRXhwKFxuICAgICdeKD86WzxdKD86W14gPD5cXFxcdFxcXFxuXFxcXFxcXFxcXFxceDAwXScgKyAnfCcgKyBFU0NBUEVEX0NIQVIgKyAnfCcgKyAnXFxcXFxcXFwpKls+XSknKTtcblxudmFyIHJlRXNjYXBhYmxlID0gbmV3IFJlZ0V4cCgnXicgKyBFU0NBUEFCTEUpO1xuXG52YXIgcmVFbnRpdHlIZXJlID0gbmV3IFJlZ0V4cCgnXicgKyBFTlRJVFksICdpJyk7XG5cbnZhciByZVRpY2tzID0gL2ArLztcblxudmFyIHJlVGlja3NIZXJlID0gL15gKy87XG5cbnZhciByZUVsbGlwc2VzID0gL1xcLlxcLlxcLi9nO1xuXG52YXIgcmVEYXNoID0gLy0tKy9nO1xuXG52YXIgcmVFbWFpbEF1dG9saW5rID0gL148KFthLXpBLVowLTkuISMkJSYnKitcXC89P15fYHt8fX4tXStAW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KD86XFwuW2EtekEtWjAtOV0oPzpbYS16QS1aMC05LV17MCw2MX1bYS16QS1aMC05XSk/KSopPi87XG5cbnZhciByZUF1dG9saW5rID0gL148W0EtWmEtel1bQS1aYS16MC05ListXXsxLDMxfTpbXjw+XFx4MDAtXFx4MjBdKj4vaTtcblxudmFyIHJlU3BubCA9IC9eICooPzpcXG4gKik/LztcblxudmFyIHJlV2hpdGVzcGFjZUNoYXIgPSAvXlsgXFx0XFxuXFx4MGJcXHgwY1xceDBkXS87XG5cbnZhciByZVdoaXRlc3BhY2UgPSAvWyBcXHRcXG5cXHgwYlxceDBjXFx4MGRdKy9nO1xuXG52YXIgcmVVbmljb2RlV2hpdGVzcGFjZUNoYXIgPSAvXlxccy87XG5cbnZhciByZUZpbmFsU3BhY2UgPSAvICokLztcblxudmFyIHJlSW5pdGlhbFNwYWNlID0gL14gKi87XG5cbnZhciByZVNwYWNlQXRFbmRPZkxpbmUgPSAvXiAqKD86XFxufCQpLztcblxudmFyIHJlTGlua0xhYmVsID0gbmV3IFJlZ0V4cCgnXlxcXFxbKD86W15cXFxcXFxcXFxcXFxbXFxcXF1dfCcgKyBFU0NBUEVEX0NIQVIgK1xuICAnfFxcXFxcXFxcKXswLDEwMDB9XFxcXF0nKTtcblxuLy8gTWF0Y2hlcyBhIHN0cmluZyBvZiBub24tc3BlY2lhbCBjaGFyYWN0ZXJzLlxudmFyIHJlTWFpbiA9IC9eW15cXG5gXFxbXFxdXFxcXCE8JipfJ1wiXSsvbTtcblxudmFyIHRleHQgPSBmdW5jdGlvbihzKSB7XG4gICAgdmFyIG5vZGUgPSBuZXcgTm9kZSgndGV4dCcpO1xuICAgIG5vZGUuX2xpdGVyYWwgPSBzO1xuICAgIHJldHVybiBub2RlO1xufTtcblxuLy8gSU5MSU5FIFBBUlNFUlxuXG4vLyBUaGVzZSBhcmUgbWV0aG9kcyBvZiBhbiBJbmxpbmVQYXJzZXIgb2JqZWN0LCBkZWZpbmVkIGJlbG93LlxuLy8gQW4gSW5saW5lUGFyc2VyIGtlZXBzIHRyYWNrIG9mIGEgc3ViamVjdCAoYSBzdHJpbmcgdG8gYmVcbi8vIHBhcnNlZCkgYW5kIGEgcG9zaXRpb24gaW4gdGhhdCBzdWJqZWN0LlxuXG4vLyBJZiByZSBtYXRjaGVzIGF0IGN1cnJlbnQgcG9zaXRpb24gaW4gdGhlIHN1YmplY3QsIGFkdmFuY2Vcbi8vIHBvc2l0aW9uIGluIHN1YmplY3QgYW5kIHJldHVybiB0aGUgbWF0Y2g7IG90aGVyd2lzZSByZXR1cm4gbnVsbC5cbnZhciBtYXRjaCA9IGZ1bmN0aW9uKHJlKSB7XG4gICAgdmFyIG0gPSByZS5leGVjKHRoaXMuc3ViamVjdC5zbGljZSh0aGlzLnBvcykpO1xuICAgIGlmIChtID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMucG9zICs9IG0uaW5kZXggKyBtWzBdLmxlbmd0aDtcbiAgICAgICAgcmV0dXJuIG1bMF07XG4gICAgfVxufTtcblxuLy8gUmV0dXJucyB0aGUgY29kZSBmb3IgdGhlIGNoYXJhY3RlciBhdCB0aGUgY3VycmVudCBzdWJqZWN0IHBvc2l0aW9uLCBvciAtMVxuLy8gdGhlcmUgYXJlIG5vIG1vcmUgY2hhcmFjdGVycy5cbnZhciBwZWVrID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucG9zIDwgdGhpcy5zdWJqZWN0Lmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zdWJqZWN0LmNoYXJDb2RlQXQodGhpcy5wb3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG59O1xuXG4vLyBQYXJzZSB6ZXJvIG9yIG1vcmUgc3BhY2UgY2hhcmFjdGVycywgaW5jbHVkaW5nIGF0IG1vc3Qgb25lIG5ld2xpbmVcbnZhciBzcG5sID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5tYXRjaChyZVNwbmwpO1xuICAgIHJldHVybiB0cnVlO1xufTtcblxuLy8gQWxsIG9mIHRoZSBwYXJzZXJzIGJlbG93IHRyeSB0byBtYXRjaCBzb21ldGhpbmcgYXQgdGhlIGN1cnJlbnQgcG9zaXRpb25cbi8vIGluIHRoZSBzdWJqZWN0LiAgSWYgdGhleSBzdWNjZWVkIGluIG1hdGNoaW5nIGFueXRoaW5nLCB0aGV5XG4vLyByZXR1cm4gdGhlIGlubGluZSBtYXRjaGVkLCBhZHZhbmNpbmcgdGhlIHN1YmplY3QuXG5cbi8vIEF0dGVtcHQgdG8gcGFyc2UgYmFja3RpY2tzLCBhZGRpbmcgZWl0aGVyIGEgYmFja3RpY2sgY29kZSBzcGFuIG9yIGFcbi8vIGxpdGVyYWwgc2VxdWVuY2Ugb2YgYmFja3RpY2tzLlxudmFyIHBhcnNlQmFja3RpY2tzID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgdGlja3MgPSB0aGlzLm1hdGNoKHJlVGlja3NIZXJlKTtcbiAgICBpZiAodGlja3MgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgYWZ0ZXJPcGVuVGlja3MgPSB0aGlzLnBvcztcbiAgICB2YXIgbWF0Y2hlZDtcbiAgICB2YXIgbm9kZTtcbiAgICB3aGlsZSAoKG1hdGNoZWQgPSB0aGlzLm1hdGNoKHJlVGlja3MpKSAhPT0gbnVsbCkge1xuICAgICAgICBpZiAobWF0Y2hlZCA9PT0gdGlja3MpIHtcbiAgICAgICAgICAgIG5vZGUgPSBuZXcgTm9kZSgnY29kZScpO1xuICAgICAgICAgICAgbm9kZS5fbGl0ZXJhbCA9IHRoaXMuc3ViamVjdC5zbGljZShhZnRlck9wZW5UaWNrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcyAtIHRpY2tzLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLnRyaW0oKS5yZXBsYWNlKHJlV2hpdGVzcGFjZSwgJyAnKTtcbiAgICAgICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy8gSWYgd2UgZ290IGhlcmUsIHdlIGRpZG4ndCBtYXRjaCBhIGNsb3NpbmcgYmFja3RpY2sgc2VxdWVuY2UuXG4gICAgdGhpcy5wb3MgPSBhZnRlck9wZW5UaWNrcztcbiAgICBibG9jay5hcHBlbmRDaGlsZCh0ZXh0KHRpY2tzKSk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBQYXJzZSBhIGJhY2tzbGFzaC1lc2NhcGVkIHNwZWNpYWwgY2hhcmFjdGVyLCBhZGRpbmcgZWl0aGVyIHRoZSBlc2NhcGVkXG4vLyBjaGFyYWN0ZXIsIGEgaGFyZCBsaW5lIGJyZWFrIChpZiB0aGUgYmFja3NsYXNoIGlzIGZvbGxvd2VkIGJ5IGEgbmV3bGluZSksXG4vLyBvciBhIGxpdGVyYWwgYmFja3NsYXNoIHRvIHRoZSBibG9jaydzIGNoaWxkcmVuLiAgQXNzdW1lcyBjdXJyZW50IGNoYXJhY3RlclxuLy8gaXMgYSBiYWNrc2xhc2guXG52YXIgcGFyc2VCYWNrc2xhc2ggPSBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBzdWJqID0gdGhpcy5zdWJqZWN0O1xuICAgIHZhciBub2RlO1xuICAgIHRoaXMucG9zICs9IDE7XG4gICAgaWYgKHRoaXMucGVlaygpID09PSBDX05FV0xJTkUpIHtcbiAgICAgICAgdGhpcy5wb3MgKz0gMTtcbiAgICAgICAgbm9kZSA9IG5ldyBOb2RlKCdsaW5lYnJlYWsnKTtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgfSBlbHNlIGlmIChyZUVzY2FwYWJsZS50ZXN0KHN1YmouY2hhckF0KHRoaXMucG9zKSkpIHtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQodGV4dChzdWJqLmNoYXJBdCh0aGlzLnBvcykpKTtcbiAgICAgICAgdGhpcy5wb3MgKz0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBibG9jay5hcHBlbmRDaGlsZCh0ZXh0KCdcXFxcJykpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIEF0dGVtcHQgdG8gcGFyc2UgYW4gYXV0b2xpbmsgKFVSTCBvciBlbWFpbCBpbiBwb2ludHkgYnJhY2tldHMpLlxudmFyIHBhcnNlQXV0b2xpbmsgPSBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBtO1xuICAgIHZhciBkZXN0O1xuICAgIHZhciBub2RlO1xuICAgIGlmICgobSA9IHRoaXMubWF0Y2gocmVFbWFpbEF1dG9saW5rKSkpIHtcbiAgICAgICAgZGVzdCA9IG0uc2xpY2UoMSwgbS5sZW5ndGggLSAxKTtcbiAgICAgICAgbm9kZSA9IG5ldyBOb2RlKCdsaW5rJyk7XG4gICAgICAgIG5vZGUuX2Rlc3RpbmF0aW9uID0gbm9ybWFsaXplVVJJKCdtYWlsdG86JyArIGRlc3QpO1xuICAgICAgICBub2RlLl90aXRsZSA9ICcnO1xuICAgICAgICBub2RlLmFwcGVuZENoaWxkKHRleHQoZGVzdCkpO1xuICAgICAgICBibG9jay5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmICgobSA9IHRoaXMubWF0Y2gocmVBdXRvbGluaykpKSB7XG4gICAgICAgIGRlc3QgPSBtLnNsaWNlKDEsIG0ubGVuZ3RoIC0gMSk7XG4gICAgICAgIG5vZGUgPSBuZXcgTm9kZSgnbGluaycpO1xuICAgICAgICBub2RlLl9kZXN0aW5hdGlvbiA9IG5vcm1hbGl6ZVVSSShkZXN0KTtcbiAgICAgICAgbm9kZS5fdGl0bGUgPSAnJztcbiAgICAgICAgbm9kZS5hcHBlbmRDaGlsZCh0ZXh0KGRlc3QpKTtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vLyBBdHRlbXB0IHRvIHBhcnNlIGEgcmF3IEhUTUwgdGFnLlxudmFyIHBhcnNlSHRtbFRhZyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIG0gPSB0aGlzLm1hdGNoKHJlSHRtbFRhZyk7XG4gICAgaWYgKG0gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBub2RlID0gbmV3IE5vZGUoJ2h0bWxfaW5saW5lJyk7XG4gICAgICAgIG5vZGUuX2xpdGVyYWwgPSBtO1xuICAgICAgICBibG9jay5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxufTtcblxuLy8gU2NhbiBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgd2l0aCBjb2RlIGNjLCBhbmQgcmV0dXJuIGluZm9ybWF0aW9uIGFib3V0XG4vLyB0aGUgbnVtYmVyIG9mIGRlbGltaXRlcnMgYW5kIHdoZXRoZXIgdGhleSBhcmUgcG9zaXRpb25lZCBzdWNoIHRoYXRcbi8vIHRoZXkgY2FuIG9wZW4gYW5kL29yIGNsb3NlIGVtcGhhc2lzIG9yIHN0cm9uZyBlbXBoYXNpcy4gIEEgdXRpbGl0eVxuLy8gZnVuY3Rpb24gZm9yIHN0cm9uZy9lbXBoIHBhcnNpbmcuXG52YXIgc2NhbkRlbGltcyA9IGZ1bmN0aW9uKGNjKSB7XG4gICAgdmFyIG51bWRlbGltcyA9IDA7XG4gICAgdmFyIGNoYXJfYmVmb3JlLCBjaGFyX2FmdGVyLCBjY19hZnRlcjtcbiAgICB2YXIgc3RhcnRwb3MgPSB0aGlzLnBvcztcbiAgICB2YXIgbGVmdF9mbGFua2luZywgcmlnaHRfZmxhbmtpbmcsIGNhbl9vcGVuLCBjYW5fY2xvc2U7XG4gICAgdmFyIGFmdGVyX2lzX3doaXRlc3BhY2UsIGFmdGVyX2lzX3B1bmN0dWF0aW9uLCBiZWZvcmVfaXNfd2hpdGVzcGFjZSwgYmVmb3JlX2lzX3B1bmN0dWF0aW9uO1xuXG4gICAgaWYgKGNjID09PSBDX1NJTkdMRVFVT1RFIHx8IGNjID09PSBDX0RPVUJMRVFVT1RFKSB7XG4gICAgICAgIG51bWRlbGltcysrO1xuICAgICAgICB0aGlzLnBvcysrO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHdoaWxlICh0aGlzLnBlZWsoKSA9PT0gY2MpIHtcbiAgICAgICAgICAgIG51bWRlbGltcysrO1xuICAgICAgICAgICAgdGhpcy5wb3MrKztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChudW1kZWxpbXMgPT09IDApIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY2hhcl9iZWZvcmUgPSBzdGFydHBvcyA9PT0gMCA/ICdcXG4nIDogdGhpcy5zdWJqZWN0LmNoYXJBdChzdGFydHBvcyAtIDEpO1xuXG4gICAgY2NfYWZ0ZXIgPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAoY2NfYWZ0ZXIgPT09IC0xKSB7XG4gICAgICAgIGNoYXJfYWZ0ZXIgPSAnXFxuJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBjaGFyX2FmdGVyID0gZnJvbUNvZGVQb2ludChjY19hZnRlcik7XG4gICAgfVxuXG4gICAgYWZ0ZXJfaXNfd2hpdGVzcGFjZSA9IHJlVW5pY29kZVdoaXRlc3BhY2VDaGFyLnRlc3QoY2hhcl9hZnRlcik7XG4gICAgYWZ0ZXJfaXNfcHVuY3R1YXRpb24gPSByZVB1bmN0dWF0aW9uLnRlc3QoY2hhcl9hZnRlcik7XG4gICAgYmVmb3JlX2lzX3doaXRlc3BhY2UgPSByZVVuaWNvZGVXaGl0ZXNwYWNlQ2hhci50ZXN0KGNoYXJfYmVmb3JlKTtcbiAgICBiZWZvcmVfaXNfcHVuY3R1YXRpb24gPSByZVB1bmN0dWF0aW9uLnRlc3QoY2hhcl9iZWZvcmUpO1xuXG4gICAgbGVmdF9mbGFua2luZyA9ICFhZnRlcl9pc193aGl0ZXNwYWNlICYmXG4gICAgICAgICAgICAoIWFmdGVyX2lzX3B1bmN0dWF0aW9uIHx8IGJlZm9yZV9pc193aGl0ZXNwYWNlIHx8IGJlZm9yZV9pc19wdW5jdHVhdGlvbik7XG4gICAgcmlnaHRfZmxhbmtpbmcgPSAhYmVmb3JlX2lzX3doaXRlc3BhY2UgJiZcbiAgICAgICAgICAgICghYmVmb3JlX2lzX3B1bmN0dWF0aW9uIHx8IGFmdGVyX2lzX3doaXRlc3BhY2UgfHwgYWZ0ZXJfaXNfcHVuY3R1YXRpb24pO1xuICAgIGlmIChjYyA9PT0gQ19VTkRFUlNDT1JFKSB7XG4gICAgICAgIGNhbl9vcGVuID0gbGVmdF9mbGFua2luZyAmJlxuICAgICAgICAgICAgKCFyaWdodF9mbGFua2luZyB8fCBiZWZvcmVfaXNfcHVuY3R1YXRpb24pO1xuICAgICAgICBjYW5fY2xvc2UgPSByaWdodF9mbGFua2luZyAmJlxuICAgICAgICAgICAgKCFsZWZ0X2ZsYW5raW5nIHx8IGFmdGVyX2lzX3B1bmN0dWF0aW9uKTtcbiAgICB9IGVsc2UgaWYgKGNjID09PSBDX1NJTkdMRVFVT1RFIHx8IGNjID09PSBDX0RPVUJMRVFVT1RFKSB7XG4gICAgICAgIGNhbl9vcGVuID0gbGVmdF9mbGFua2luZyAmJiAhcmlnaHRfZmxhbmtpbmc7XG4gICAgICAgIGNhbl9jbG9zZSA9IHJpZ2h0X2ZsYW5raW5nO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbl9vcGVuID0gbGVmdF9mbGFua2luZztcbiAgICAgICAgY2FuX2Nsb3NlID0gcmlnaHRfZmxhbmtpbmc7XG4gICAgfVxuICAgIHRoaXMucG9zID0gc3RhcnRwb3M7XG4gICAgcmV0dXJuIHsgbnVtZGVsaW1zOiBudW1kZWxpbXMsXG4gICAgICAgICAgICAgY2FuX29wZW46IGNhbl9vcGVuLFxuICAgICAgICAgICAgIGNhbl9jbG9zZTogY2FuX2Nsb3NlIH07XG59O1xuXG4vLyBIYW5kbGUgYSBkZWxpbWl0ZXIgbWFya2VyIGZvciBlbXBoYXNpcyBvciBhIHF1b3RlLlxudmFyIGhhbmRsZURlbGltID0gZnVuY3Rpb24oY2MsIGJsb2NrKSB7XG4gICAgdmFyIHJlcyA9IHRoaXMuc2NhbkRlbGltcyhjYyk7XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgbnVtZGVsaW1zID0gcmVzLm51bWRlbGltcztcbiAgICB2YXIgc3RhcnRwb3MgPSB0aGlzLnBvcztcbiAgICB2YXIgY29udGVudHM7XG5cbiAgICB0aGlzLnBvcyArPSBudW1kZWxpbXM7XG4gICAgaWYgKGNjID09PSBDX1NJTkdMRVFVT1RFKSB7XG4gICAgICAgIGNvbnRlbnRzID0gXCJcXHUyMDE5XCI7XG4gICAgfSBlbHNlIGlmIChjYyA9PT0gQ19ET1VCTEVRVU9URSkge1xuICAgICAgICBjb250ZW50cyA9IFwiXFx1MjAxQ1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnRlbnRzID0gdGhpcy5zdWJqZWN0LnNsaWNlKHN0YXJ0cG9zLCB0aGlzLnBvcyk7XG4gICAgfVxuICAgIHZhciBub2RlID0gdGV4dChjb250ZW50cyk7XG4gICAgYmxvY2suYXBwZW5kQ2hpbGQobm9kZSk7XG5cbiAgICAvLyBBZGQgZW50cnkgdG8gc3RhY2sgZm9yIHRoaXMgb3BlbmVyXG4gICAgdGhpcy5kZWxpbWl0ZXJzID0geyBjYzogY2MsXG4gICAgICAgICAgICAgICAgICAgICAgICBudW1kZWxpbXM6IG51bWRlbGltcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9yaWdkZWxpbXM6IG51bWRlbGltcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGU6IG5vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91czogdGhpcy5kZWxpbWl0ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dDogbnVsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbl9vcGVuOiByZXMuY2FuX29wZW4sXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5fY2xvc2U6IHJlcy5jYW5fY2xvc2UgfTtcbiAgICBpZiAodGhpcy5kZWxpbWl0ZXJzLnByZXZpb3VzICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuZGVsaW1pdGVycy5wcmV2aW91cy5uZXh0ID0gdGhpcy5kZWxpbWl0ZXJzO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuXG59O1xuXG52YXIgcmVtb3ZlRGVsaW1pdGVyID0gZnVuY3Rpb24oZGVsaW0pIHtcbiAgICBpZiAoZGVsaW0ucHJldmlvdXMgIT09IG51bGwpIHtcbiAgICAgICAgZGVsaW0ucHJldmlvdXMubmV4dCA9IGRlbGltLm5leHQ7XG4gICAgfVxuICAgIGlmIChkZWxpbS5uZXh0ID09PSBudWxsKSB7XG4gICAgICAgIC8vIHRvcCBvZiBzdGFja1xuICAgICAgICB0aGlzLmRlbGltaXRlcnMgPSBkZWxpbS5wcmV2aW91cztcbiAgICB9IGVsc2Uge1xuICAgICAgICBkZWxpbS5uZXh0LnByZXZpb3VzID0gZGVsaW0ucHJldmlvdXM7XG4gICAgfVxufTtcblxudmFyIHJlbW92ZURlbGltaXRlcnNCZXR3ZWVuID0gZnVuY3Rpb24oYm90dG9tLCB0b3ApIHtcbiAgICBpZiAoYm90dG9tLm5leHQgIT09IHRvcCkge1xuICAgICAgICBib3R0b20ubmV4dCA9IHRvcDtcbiAgICAgICAgdG9wLnByZXZpb3VzID0gYm90dG9tO1xuICAgIH1cbn07XG5cbnZhciBwcm9jZXNzRW1waGFzaXMgPSBmdW5jdGlvbihzdGFja19ib3R0b20pIHtcbiAgICB2YXIgb3BlbmVyLCBjbG9zZXIsIG9sZF9jbG9zZXI7XG4gICAgdmFyIG9wZW5lcl9pbmwsIGNsb3Nlcl9pbmw7XG4gICAgdmFyIHRlbXBzdGFjaztcbiAgICB2YXIgdXNlX2RlbGltcztcbiAgICB2YXIgdG1wLCBuZXh0O1xuICAgIHZhciBvcGVuZXJfZm91bmQ7XG4gICAgdmFyIG9wZW5lcnNfYm90dG9tID0gW107XG4gICAgdmFyIG9kZF9tYXRjaCA9IGZhbHNlO1xuXG4gICAgb3BlbmVyc19ib3R0b21bQ19VTkRFUlNDT1JFXSA9IHN0YWNrX2JvdHRvbTtcbiAgICBvcGVuZXJzX2JvdHRvbVtDX0FTVEVSSVNLXSA9IHN0YWNrX2JvdHRvbTtcbiAgICBvcGVuZXJzX2JvdHRvbVtDX1NJTkdMRVFVT1RFXSA9IHN0YWNrX2JvdHRvbTtcbiAgICBvcGVuZXJzX2JvdHRvbVtDX0RPVUJMRVFVT1RFXSA9IHN0YWNrX2JvdHRvbTtcblxuICAgIC8vIGZpbmQgZmlyc3QgY2xvc2VyIGFib3ZlIHN0YWNrX2JvdHRvbTpcbiAgICBjbG9zZXIgPSB0aGlzLmRlbGltaXRlcnM7XG4gICAgd2hpbGUgKGNsb3NlciAhPT0gbnVsbCAmJiBjbG9zZXIucHJldmlvdXMgIT09IHN0YWNrX2JvdHRvbSkge1xuICAgICAgICBjbG9zZXIgPSBjbG9zZXIucHJldmlvdXM7XG4gICAgfVxuICAgIC8vIG1vdmUgZm9yd2FyZCwgbG9va2luZyBmb3IgY2xvc2VycywgYW5kIGhhbmRsaW5nIGVhY2hcbiAgICB3aGlsZSAoY2xvc2VyICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBjbG9zZXJjYyA9IGNsb3Nlci5jYztcbiAgICAgICAgaWYgKCFjbG9zZXIuY2FuX2Nsb3NlKSB7XG4gICAgICAgICAgICBjbG9zZXIgPSBjbG9zZXIubmV4dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZvdW5kIGVtcGhhc2lzIGNsb3Nlci4gbm93IGxvb2sgYmFjayBmb3IgZmlyc3QgbWF0Y2hpbmcgb3BlbmVyOlxuICAgICAgICAgICAgb3BlbmVyID0gY2xvc2VyLnByZXZpb3VzO1xuICAgICAgICAgICAgb3BlbmVyX2ZvdW5kID0gZmFsc2U7XG4gICAgICAgICAgICB3aGlsZSAob3BlbmVyICE9PSBudWxsICYmIG9wZW5lciAhPT0gc3RhY2tfYm90dG9tICYmXG4gICAgICAgICAgICAgICAgICAgb3BlbmVyICE9PSBvcGVuZXJzX2JvdHRvbVtjbG9zZXJjY10pIHtcbiAgICAgICAgICAgICAgICBvZGRfbWF0Y2ggPSAoY2xvc2VyLmNhbl9vcGVuIHx8IG9wZW5lci5jYW5fY2xvc2UpICYmXG4gICAgICAgICAgICAgICAgICAgIChvcGVuZXIub3JpZ2RlbGltcyArIGNsb3Nlci5vcmlnZGVsaW1zKSAlIDMgPT09IDA7XG4gICAgICAgICAgICAgICAgaWYgKG9wZW5lci5jYyA9PT0gY2xvc2VyLmNjICYmIG9wZW5lci5jYW5fb3BlbiAmJiAhb2RkX21hdGNoKSB7XG4gICAgICAgICAgICAgICAgICAgIG9wZW5lcl9mb3VuZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvcGVuZXIgPSBvcGVuZXIucHJldmlvdXM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvbGRfY2xvc2VyID0gY2xvc2VyO1xuXG4gICAgICAgICAgICBpZiAoY2xvc2VyY2MgPT09IENfQVNURVJJU0sgfHwgY2xvc2VyY2MgPT09IENfVU5ERVJTQ09SRSkge1xuICAgICAgICAgICAgICAgIGlmICghb3BlbmVyX2ZvdW5kKSB7XG4gICAgICAgICAgICAgICAgICAgIGNsb3NlciA9IGNsb3Nlci5uZXh0O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGN1bGF0ZSBhY3R1YWwgbnVtYmVyIG9mIGRlbGltaXRlcnMgdXNlZCBmcm9tIGNsb3NlclxuICAgICAgICAgICAgICAgICAgICB1c2VfZGVsaW1zID1cbiAgICAgICAgICAgICAgICAgICAgICAoY2xvc2VyLm51bWRlbGltcyA+PSAyICYmIG9wZW5lci5udW1kZWxpbXMgPj0gMikgPyAyIDogMTtcblxuICAgICAgICAgICAgICAgICAgICBvcGVuZXJfaW5sID0gb3BlbmVyLm5vZGU7XG4gICAgICAgICAgICAgICAgICAgIGNsb3Nlcl9pbmwgPSBjbG9zZXIubm9kZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgdXNlZCBkZWxpbWl0ZXJzIGZyb20gc3RhY2sgZWx0cyBhbmQgaW5saW5lc1xuICAgICAgICAgICAgICAgICAgICBvcGVuZXIubnVtZGVsaW1zIC09IHVzZV9kZWxpbXM7XG4gICAgICAgICAgICAgICAgICAgIGNsb3Nlci5udW1kZWxpbXMgLT0gdXNlX2RlbGltcztcbiAgICAgICAgICAgICAgICAgICAgb3BlbmVyX2lubC5fbGl0ZXJhbCA9XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuZXJfaW5sLl9saXRlcmFsLnNsaWNlKDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5lcl9pbmwuX2xpdGVyYWwubGVuZ3RoIC0gdXNlX2RlbGltcyk7XG4gICAgICAgICAgICAgICAgICAgIGNsb3Nlcl9pbmwuX2xpdGVyYWwgPVxuICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2VyX2lubC5fbGl0ZXJhbC5zbGljZSgwLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXJfaW5sLl9saXRlcmFsLmxlbmd0aCAtIHVzZV9kZWxpbXMpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGJ1aWxkIGNvbnRlbnRzIGZvciBuZXcgZW1waCBlbGVtZW50XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbXBoID0gbmV3IE5vZGUodXNlX2RlbGltcyA9PT0gMSA/ICdlbXBoJyA6ICdzdHJvbmcnKTtcblxuICAgICAgICAgICAgICAgICAgICB0bXAgPSBvcGVuZXJfaW5sLl9uZXh0O1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAodG1wICYmIHRtcCAhPT0gY2xvc2VyX2lubCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dCA9IHRtcC5fbmV4dDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRtcC51bmxpbmsoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtcGguYXBwZW5kQ2hpbGQodG1wKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRtcCA9IG5leHQ7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBvcGVuZXJfaW5sLmluc2VydEFmdGVyKGVtcGgpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSBlbHRzIGJldHdlZW4gb3BlbmVyIGFuZCBjbG9zZXIgaW4gZGVsaW1pdGVycyBzdGFja1xuICAgICAgICAgICAgICAgICAgICByZW1vdmVEZWxpbWl0ZXJzQmV0d2VlbihvcGVuZXIsIGNsb3Nlcik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gaWYgb3BlbmVyIGhhcyAwIGRlbGltcywgcmVtb3ZlIGl0IGFuZCB0aGUgaW5saW5lXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcGVuZXIubnVtZGVsaW1zID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVuZXJfaW5sLnVubGluaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVEZWxpbWl0ZXIob3BlbmVyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChjbG9zZXIubnVtZGVsaW1zID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXJfaW5sLnVubGluaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVtcHN0YWNrID0gY2xvc2VyLm5leHQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZURlbGltaXRlcihjbG9zZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY2xvc2VyID0gdGVtcHN0YWNrO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xvc2VyY2MgPT09IENfU0lOR0xFUVVPVEUpIHtcbiAgICAgICAgICAgICAgICBjbG9zZXIubm9kZS5fbGl0ZXJhbCA9IFwiXFx1MjAxOVwiO1xuICAgICAgICAgICAgICAgIGlmIChvcGVuZXJfZm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3BlbmVyLm5vZGUuX2xpdGVyYWwgPSBcIlxcdTIwMThcIjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2xvc2VyID0gY2xvc2VyLm5leHQ7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoY2xvc2VyY2MgPT09IENfRE9VQkxFUVVPVEUpIHtcbiAgICAgICAgICAgICAgICBjbG9zZXIubm9kZS5fbGl0ZXJhbCA9IFwiXFx1MjAxRFwiO1xuICAgICAgICAgICAgICAgIGlmIChvcGVuZXJfZm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgb3BlbmVyLm5vZGUubGl0ZXJhbCA9IFwiXFx1MjAxQ1wiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjbG9zZXIgPSBjbG9zZXIubmV4dDtcblxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFvcGVuZXJfZm91bmQgJiYgIW9kZF9tYXRjaCkge1xuICAgICAgICAgICAgICAgIC8vIFNldCBsb3dlciBib3VuZCBmb3IgZnV0dXJlIHNlYXJjaGVzIGZvciBvcGVuZXJzOlxuICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IGRvIHRoaXMgd2l0aCBvZGRfbWF0Y2ggYmVjYXVzZSBhICoqXG4gICAgICAgICAgICAgICAgLy8gdGhhdCBkb2Vzbid0IG1hdGNoIGFuIGVhcmxpZXIgKiBtaWdodCB0dXJuIGludG9cbiAgICAgICAgICAgICAgICAvLyBhbiBvcGVuZXIsIGFuZCB0aGUgKiBtaWdodCBiZSBtYXRjaGVkIGJ5IHNvbWV0aGluZ1xuICAgICAgICAgICAgICAgIC8vIGVsc2UuXG4gICAgICAgICAgICAgICAgb3BlbmVyc19ib3R0b21bY2xvc2VyY2NdID0gb2xkX2Nsb3Nlci5wcmV2aW91cztcbiAgICAgICAgICAgICAgICBpZiAoIW9sZF9jbG9zZXIuY2FuX29wZW4pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgY2FuIHJlbW92ZSBhIGNsb3NlciB0aGF0IGNhbid0IGJlIGFuIG9wZW5lcixcbiAgICAgICAgICAgICAgICAgICAgLy8gb25jZSB3ZSd2ZSBzZWVuIHRoZXJlJ3Mgbm8gbWF0Y2hpbmcgb3BlbmVyOlxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZURlbGltaXRlcihvbGRfY2xvc2VyKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIH1cblxuICAgIC8vIHJlbW92ZSBhbGwgZGVsaW1pdGVyc1xuICAgIHdoaWxlICh0aGlzLmRlbGltaXRlcnMgIT09IG51bGwgJiYgdGhpcy5kZWxpbWl0ZXJzICE9PSBzdGFja19ib3R0b20pIHtcbiAgICAgICAgdGhpcy5yZW1vdmVEZWxpbWl0ZXIodGhpcy5kZWxpbWl0ZXJzKTtcbiAgICB9XG59O1xuXG4vLyBBdHRlbXB0IHRvIHBhcnNlIGxpbmsgdGl0bGUgKHNhbnMgcXVvdGVzKSwgcmV0dXJuaW5nIHRoZSBzdHJpbmdcbi8vIG9yIG51bGwgaWYgbm8gbWF0Y2guXG52YXIgcGFyc2VMaW5rVGl0bGUgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgdGl0bGUgPSB0aGlzLm1hdGNoKHJlTGlua1RpdGxlKTtcbiAgICBpZiAodGl0bGUgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY2hvcCBvZmYgcXVvdGVzIGZyb20gdGl0bGUgYW5kIHVuZXNjYXBlOlxuICAgICAgICByZXR1cm4gdW5lc2NhcGVTdHJpbmcodGl0bGUuc3Vic3RyKDEsIHRpdGxlLmxlbmd0aCAtIDIpKTtcbiAgICB9XG59O1xuXG4vLyBBdHRlbXB0IHRvIHBhcnNlIGxpbmsgZGVzdGluYXRpb24sIHJldHVybmluZyB0aGUgc3RyaW5nIG9yXG4vLyBudWxsIGlmIG5vIG1hdGNoLlxudmFyIHBhcnNlTGlua0Rlc3RpbmF0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJlcyA9IHRoaXMubWF0Y2gocmVMaW5rRGVzdGluYXRpb25CcmFjZXMpO1xuICAgIGlmIChyZXMgPT09IG51bGwpIHtcbiAgICAgICAgLy8gVE9ETyBoYW5kcm9sbGVkIHBhcnNlcjsgcmVzIHNob3VsZCBiZSBudWxsIG9yIHRoZSBzdHJpbmdcbiAgICAgICAgdmFyIHNhdmVwb3MgPSB0aGlzLnBvcztcbiAgICAgICAgdmFyIG9wZW5wYXJlbnMgPSAwO1xuICAgICAgICB2YXIgYztcbiAgICAgICAgd2hpbGUgKChjID0gdGhpcy5wZWVrKCkpICE9PSAtMSkge1xuICAgICAgICAgICAgaWYgKGMgPT09IENfQkFDS1NMQVNIKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5wZWVrKCkgIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zICs9IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChjID09PSBDX09QRU5fUEFSRU4pIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcyArPSAxO1xuICAgICAgICAgICAgICAgIG9wZW5wYXJlbnMgKz0gMTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gQ19DTE9TRV9QQVJFTikge1xuICAgICAgICAgICAgICAgIGlmIChvcGVucGFyZW5zIDwgMSkge1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnBvcyArPSAxO1xuICAgICAgICAgICAgICAgICAgICBvcGVucGFyZW5zIC09IDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZVdoaXRlc3BhY2VDaGFyLmV4ZWMoZnJvbUNvZGVQb2ludChjKSkgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wb3MgKz0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXMgPSB0aGlzLnN1YmplY3Quc3Vic3RyKHNhdmVwb3MsIHRoaXMucG9zIC0gc2F2ZXBvcyk7XG4gICAgICAgIHJldHVybiBub3JtYWxpemVVUkkodW5lc2NhcGVTdHJpbmcocmVzKSk7XG4gICAgfSBlbHNlIHsgIC8vIGNob3Agb2ZmIHN1cnJvdW5kaW5nIDwuLj46XG4gICAgICAgIHJldHVybiBub3JtYWxpemVVUkkodW5lc2NhcGVTdHJpbmcocmVzLnN1YnN0cigxLCByZXMubGVuZ3RoIC0gMikpKTtcbiAgICB9XG59O1xuXG4vLyBBdHRlbXB0IHRvIHBhcnNlIGEgbGluayBsYWJlbCwgcmV0dXJuaW5nIG51bWJlciBvZiBjaGFyYWN0ZXJzIHBhcnNlZC5cbnZhciBwYXJzZUxpbmtMYWJlbCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBtID0gdGhpcy5tYXRjaChyZUxpbmtMYWJlbCk7XG4gICAgLy8gTm90ZTogIG91ciByZWdleCB3aWxsIGFsbG93IHNvbWV0aGluZyBvZiBmb3JtIFsuLlxcXTtcbiAgICAvLyB3ZSBkaXNhbGxvdyBpdCBoZXJlIHJhdGhlciB0aGFuIHVzaW5nIGxvb2thaGVhZCBpbiB0aGUgcmVnZXg6XG4gICAgaWYgKG0gPT09IG51bGwgfHwgbS5sZW5ndGggPiAxMDAxIHx8IC9bXlxcXFxdXFxcXFxcXSQvLmV4ZWMobSkpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG0ubGVuZ3RoO1xuICAgIH1cbn07XG5cbi8vIEFkZCBvcGVuIGJyYWNrZXQgdG8gZGVsaW1pdGVyIHN0YWNrIGFuZCBhZGQgYSB0ZXh0IG5vZGUgdG8gYmxvY2sncyBjaGlsZHJlbi5cbnZhciBwYXJzZU9wZW5CcmFja2V0ID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgc3RhcnRwb3MgPSB0aGlzLnBvcztcbiAgICB0aGlzLnBvcyArPSAxO1xuXG4gICAgdmFyIG5vZGUgPSB0ZXh0KCdbJyk7XG4gICAgYmxvY2suYXBwZW5kQ2hpbGQobm9kZSk7XG5cbiAgICAvLyBBZGQgZW50cnkgdG8gc3RhY2sgZm9yIHRoaXMgb3BlbmVyXG4gICAgdGhpcy5hZGRCcmFja2V0KG5vZGUsIHN0YXJ0cG9zLCBmYWxzZSk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBJRiBuZXh0IGNoYXJhY3RlciBpcyBbLCBhbmQgISBkZWxpbWl0ZXIgdG8gZGVsaW1pdGVyIHN0YWNrIGFuZFxuLy8gYWRkIGEgdGV4dCBub2RlIHRvIGJsb2NrJ3MgY2hpbGRyZW4uICBPdGhlcndpc2UganVzdCBhZGQgYSB0ZXh0IG5vZGUuXG52YXIgcGFyc2VCYW5nID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgc3RhcnRwb3MgPSB0aGlzLnBvcztcbiAgICB0aGlzLnBvcyArPSAxO1xuICAgIGlmICh0aGlzLnBlZWsoKSA9PT0gQ19PUEVOX0JSQUNLRVQpIHtcbiAgICAgICAgdGhpcy5wb3MgKz0gMTtcblxuICAgICAgICB2YXIgbm9kZSA9IHRleHQoJyFbJyk7XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKG5vZGUpO1xuXG4gICAgICAgIC8vIEFkZCBlbnRyeSB0byBzdGFjayBmb3IgdGhpcyBvcGVuZXJcbiAgICAgICAgdGhpcy5hZGRCcmFja2V0KG5vZGUsIHN0YXJ0cG9zICsgMSwgdHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQodGV4dCgnIScpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBUcnkgdG8gbWF0Y2ggY2xvc2UgYnJhY2tldCBhZ2FpbnN0IGFuIG9wZW5pbmcgaW4gdGhlIGRlbGltaXRlclxuLy8gc3RhY2suICBBZGQgZWl0aGVyIGEgbGluayBvciBpbWFnZSwgb3IgYSBwbGFpbiBbIGNoYXJhY3Rlcixcbi8vIHRvIGJsb2NrJ3MgY2hpbGRyZW4uICBJZiB0aGVyZSBpcyBhIG1hdGNoaW5nIGRlbGltaXRlcixcbi8vIHJlbW92ZSBpdCBmcm9tIHRoZSBkZWxpbWl0ZXIgc3RhY2suXG52YXIgcGFyc2VDbG9zZUJyYWNrZXQgPSBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBzdGFydHBvcztcbiAgICB2YXIgaXNfaW1hZ2U7XG4gICAgdmFyIGRlc3Q7XG4gICAgdmFyIHRpdGxlO1xuICAgIHZhciBtYXRjaGVkID0gZmFsc2U7XG4gICAgdmFyIHJlZmxhYmVsO1xuICAgIHZhciBvcGVuZXI7XG5cbiAgICB0aGlzLnBvcyArPSAxO1xuICAgIHN0YXJ0cG9zID0gdGhpcy5wb3M7XG5cbiAgICAvLyBnZXQgbGFzdCBbIG9yICFbXG4gICAgb3BlbmVyID0gdGhpcy5icmFja2V0cztcblxuICAgIGlmIChvcGVuZXIgPT09IG51bGwpIHtcbiAgICAgICAgLy8gbm8gbWF0Y2hlZCBvcGVuZXIsIGp1c3QgcmV0dXJuIGEgbGl0ZXJhbFxuICAgICAgICBibG9jay5hcHBlbmRDaGlsZCh0ZXh0KCddJykpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAoIW9wZW5lci5hY3RpdmUpIHtcbiAgICAgICAgLy8gbm8gbWF0Y2hlZCBvcGVuZXIsIGp1c3QgcmV0dXJuIGEgbGl0ZXJhbFxuICAgICAgICBibG9jay5hcHBlbmRDaGlsZCh0ZXh0KCddJykpO1xuICAgICAgICAvLyB0YWtlIG9wZW5lciBvZmYgYnJhY2tldHMgc3RhY2tcbiAgICAgICAgdGhpcy5yZW1vdmVCcmFja2V0KCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIElmIHdlIGdvdCBoZXJlLCBvcGVuIGlzIGEgcG90ZW50aWFsIG9wZW5lclxuICAgIGlzX2ltYWdlID0gb3BlbmVyLmltYWdlO1xuXG4gICAgLy8gQ2hlY2sgdG8gc2VlIGlmIHdlIGhhdmUgYSBsaW5rL2ltYWdlXG5cbiAgICB2YXIgc2F2ZXBvcyA9IHRoaXMucG9zO1xuXG4gICAgLy8gSW5saW5lIGxpbms/XG4gICAgaWYgKHRoaXMucGVlaygpID09PSBDX09QRU5fUEFSRU4pIHtcbiAgICAgICAgdGhpcy5wb3MrKztcbiAgICAgICAgaWYgKHRoaXMuc3BubCgpICYmXG4gICAgICAgICAgICAoKGRlc3QgPSB0aGlzLnBhcnNlTGlua0Rlc3RpbmF0aW9uKCkpICE9PSBudWxsKSAmJlxuICAgICAgICAgICAgdGhpcy5zcG5sKCkgJiZcbiAgICAgICAgICAgIC8vIG1ha2Ugc3VyZSB0aGVyZSdzIGEgc3BhY2UgYmVmb3JlIHRoZSB0aXRsZTpcbiAgICAgICAgICAgIChyZVdoaXRlc3BhY2VDaGFyLnRlc3QodGhpcy5zdWJqZWN0LmNoYXJBdCh0aGlzLnBvcyAtIDEpKSAmJlxuICAgICAgICAgICAgICh0aXRsZSA9IHRoaXMucGFyc2VMaW5rVGl0bGUoKSkgfHwgdHJ1ZSkgJiZcbiAgICAgICAgICAgIHRoaXMuc3BubCgpICYmXG4gICAgICAgICAgICB0aGlzLnBlZWsoKSA9PT0gQ19DTE9TRV9QQVJFTikge1xuICAgICAgICAgICAgdGhpcy5wb3MgKz0gMTtcbiAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5wb3MgPSBzYXZlcG9zO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFtYXRjaGVkKSB7XG5cbiAgICAgICAgLy8gTmV4dCwgc2VlIGlmIHRoZXJlJ3MgYSBsaW5rIGxhYmVsXG4gICAgICAgIHZhciBiZWZvcmVsYWJlbCA9IHRoaXMucG9zO1xuICAgICAgICB2YXIgbiA9IHRoaXMucGFyc2VMaW5rTGFiZWwoKTtcbiAgICAgICAgaWYgKG4gPiAyKSB7XG4gICAgICAgICAgICByZWZsYWJlbCA9IHRoaXMuc3ViamVjdC5zbGljZShiZWZvcmVsYWJlbCwgYmVmb3JlbGFiZWwgKyBuKTtcbiAgICAgICAgfSBlbHNlIGlmICghb3BlbmVyLmJyYWNrZXRBZnRlcikge1xuICAgICAgICAgICAgLy8gRW1wdHkgb3IgbWlzc2luZyBzZWNvbmQgbGFiZWwgbWVhbnMgdG8gdXNlIHRoZSBmaXJzdCBsYWJlbCBhcyB0aGUgcmVmZXJlbmNlLlxuICAgICAgICAgICAgLy8gVGhlIHJlZmVyZW5jZSBtdXN0IG5vdCBjb250YWluIGEgYnJhY2tldC4gSWYgd2Uga25vdyB0aGVyZSdzIGEgYnJhY2tldCwgd2UgZG9uJ3QgZXZlbiBib3RoZXIgY2hlY2tpbmcgaXQuXG4gICAgICAgICAgICByZWZsYWJlbCA9IHRoaXMuc3ViamVjdC5zbGljZShvcGVuZXIuaW5kZXgsIHN0YXJ0cG9zKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAobiA9PT0gMCkge1xuICAgICAgICAgICAgLy8gSWYgc2hvcnRjdXQgcmVmZXJlbmNlIGxpbmssIHJld2luZCBiZWZvcmUgc3BhY2VzIHdlIHNraXBwZWQuXG4gICAgICAgICAgICB0aGlzLnBvcyA9IHNhdmVwb3M7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVmbGFiZWwpIHtcbiAgICAgICAgICAgIC8vIGxvb2t1cCByYXdsYWJlbCBpbiByZWZtYXBcbiAgICAgICAgICAgIHZhciBsaW5rID0gdGhpcy5yZWZtYXBbbm9ybWFsaXplUmVmZXJlbmNlKHJlZmxhYmVsKV07XG4gICAgICAgICAgICBpZiAobGluaykge1xuICAgICAgICAgICAgICAgIGRlc3QgPSBsaW5rLmRlc3RpbmF0aW9uO1xuICAgICAgICAgICAgICAgIHRpdGxlID0gbGluay50aXRsZTtcbiAgICAgICAgICAgICAgICBtYXRjaGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmIChtYXRjaGVkKSB7XG4gICAgICAgIHZhciBub2RlID0gbmV3IE5vZGUoaXNfaW1hZ2UgPyAnaW1hZ2UnIDogJ2xpbmsnKTtcbiAgICAgICAgbm9kZS5fZGVzdGluYXRpb24gPSBkZXN0O1xuICAgICAgICBub2RlLl90aXRsZSA9IHRpdGxlIHx8ICcnO1xuXG4gICAgICAgIHZhciB0bXAsIG5leHQ7XG4gICAgICAgIHRtcCA9IG9wZW5lci5ub2RlLl9uZXh0O1xuICAgICAgICB3aGlsZSAodG1wKSB7XG4gICAgICAgICAgICBuZXh0ID0gdG1wLl9uZXh0O1xuICAgICAgICAgICAgdG1wLnVubGluaygpO1xuICAgICAgICAgICAgbm9kZS5hcHBlbmRDaGlsZCh0bXApO1xuICAgICAgICAgICAgdG1wID0gbmV4dDtcbiAgICAgICAgfVxuICAgICAgICBibG9jay5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgdGhpcy5wcm9jZXNzRW1waGFzaXMob3BlbmVyLnByZXZpb3VzRGVsaW1pdGVyKTtcbiAgICAgICAgdGhpcy5yZW1vdmVCcmFja2V0KCk7XG4gICAgICAgIG9wZW5lci5ub2RlLnVubGluaygpO1xuXG4gICAgICAgIC8vIFdlIHJlbW92ZSB0aGlzIGJyYWNrZXQgYW5kIHByb2Nlc3NFbXBoYXNpcyB3aWxsIHJlbW92ZSBsYXRlciBkZWxpbWl0ZXJzLlxuICAgICAgICAvLyBOb3csIGZvciBhIGxpbmssIHdlIGFsc28gZGVhY3RpdmF0ZSBlYXJsaWVyIGxpbmsgb3BlbmVycy5cbiAgICAgICAgLy8gKG5vIGxpbmtzIGluIGxpbmtzKVxuICAgICAgICBpZiAoIWlzX2ltYWdlKSB7XG4gICAgICAgICAgb3BlbmVyID0gdGhpcy5icmFja2V0cztcbiAgICAgICAgICB3aGlsZSAob3BlbmVyICE9PSBudWxsKSB7XG4gICAgICAgICAgICBpZiAoIW9wZW5lci5pbWFnZSkge1xuICAgICAgICAgICAgICAgIG9wZW5lci5hY3RpdmUgPSBmYWxzZTsgLy8gZGVhY3RpdmF0ZSB0aGlzIG9wZW5lclxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgb3BlbmVyID0gb3BlbmVyLnByZXZpb3VzO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0cnVlO1xuXG4gICAgfSBlbHNlIHsgLy8gbm8gbWF0Y2hcblxuICAgICAgICB0aGlzLnJlbW92ZUJyYWNrZXQoKTsgIC8vIHJlbW92ZSB0aGlzIG9wZW5lciBmcm9tIHN0YWNrXG4gICAgICAgIHRoaXMucG9zID0gc3RhcnRwb3M7XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQoJ10nKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxufTtcblxudmFyIGFkZEJyYWNrZXQgPSBmdW5jdGlvbihub2RlLCBpbmRleCwgaW1hZ2UpIHtcbiAgICBpZiAodGhpcy5icmFja2V0cyAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLmJyYWNrZXRzLmJyYWNrZXRBZnRlciA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuYnJhY2tldHMgPSB7IG5vZGU6IG5vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXM6IHRoaXMuYnJhY2tldHMsXG4gICAgICAgICAgICAgICAgICAgICAgcHJldmlvdXNEZWxpbWl0ZXI6IHRoaXMuZGVsaW1pdGVycyxcbiAgICAgICAgICAgICAgICAgICAgICBpbmRleDogaW5kZXgsXG4gICAgICAgICAgICAgICAgICAgICAgaW1hZ2U6IGltYWdlLFxuICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZTogdHJ1ZSB9O1xufTtcblxudmFyIHJlbW92ZUJyYWNrZXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmJyYWNrZXRzID0gdGhpcy5icmFja2V0cy5wcmV2aW91cztcbn07XG5cbi8vIEF0dGVtcHQgdG8gcGFyc2UgYW4gZW50aXR5LlxudmFyIHBhcnNlRW50aXR5ID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoKG0gPSB0aGlzLm1hdGNoKHJlRW50aXR5SGVyZSkpKSB7XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQoZGVjb2RlSFRNTChtKSkpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLy8gUGFyc2UgYSBydW4gb2Ygb3JkaW5hcnkgY2hhcmFjdGVycywgb3IgYSBzaW5nbGUgY2hhcmFjdGVyIHdpdGhcbi8vIGEgc3BlY2lhbCBtZWFuaW5nIGluIG1hcmtkb3duLCBhcyBhIHBsYWluIHN0cmluZy5cbnZhciBwYXJzZVN0cmluZyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKChtID0gdGhpcy5tYXRjaChyZU1haW4pKSkge1xuICAgICAgICBpZiAodGhpcy5vcHRpb25zLnNtYXJ0KSB7XG4gICAgICAgICAgICBibG9jay5hcHBlbmRDaGlsZCh0ZXh0KFxuICAgICAgICAgICAgICAgIG0ucmVwbGFjZShyZUVsbGlwc2VzLCBcIlxcdTIwMjZcIilcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UocmVEYXNoLCBmdW5jdGlvbihjaGFycykge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVtQ291bnQgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNoYXJzLmxlbmd0aCAlIDMgPT09IDApIHsgLy8gSWYgZGl2aXNpYmxlIGJ5IDMsIHVzZSBhbGwgZW0gZGFzaGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1Db3VudCA9IGNoYXJzLmxlbmd0aCAvIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoYXJzLmxlbmd0aCAlIDIgPT09IDApIHsgLy8gSWYgZGl2aXNpYmxlIGJ5IDIsIHVzZSBhbGwgZW4gZGFzaGVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5Db3VudCA9IGNoYXJzLmxlbmd0aCAvIDI7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoYXJzLmxlbmd0aCAlIDMgPT09IDIpIHsgLy8gSWYgMiBleHRyYSBkYXNoZXMsIHVzZSBlbiBkYXNoIGZvciBsYXN0IDI7IGVtIGRhc2hlcyBmb3IgcmVzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuQ291bnQgPSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtQ291bnQgPSAoY2hhcnMubGVuZ3RoIC0gMikgLyAzO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHsgLy8gVXNlIGVuIGRhc2hlcyBmb3IgbGFzdCA0IGh5cGhlbnM7IGVtIGRhc2hlcyBmb3IgcmVzdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuQ291bnQgPSAyO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVtQ291bnQgPSAoY2hhcnMubGVuZ3RoIC0gNCkgLyAzO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiXFx1MjAxNFwiLnJlcGVhdChlbUNvdW50KSArIFwiXFx1MjAxM1wiLnJlcGVhdChlbkNvdW50KTtcbiAgICAgICAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQobSkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vLyBQYXJzZSBhIG5ld2xpbmUuICBJZiBpdCB3YXMgcHJlY2VkZWQgYnkgdHdvIHNwYWNlcywgcmV0dXJuIGEgaGFyZFxuLy8gbGluZSBicmVhazsgb3RoZXJ3aXNlIGEgc29mdCBsaW5lIGJyZWFrLlxudmFyIHBhcnNlTmV3bGluZSA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdGhpcy5wb3MgKz0gMTsgLy8gYXNzdW1lIHdlJ3JlIGF0IGEgXFxuXG4gICAgLy8gY2hlY2sgcHJldmlvdXMgbm9kZSBmb3IgdHJhaWxpbmcgc3BhY2VzXG4gICAgdmFyIGxhc3RjID0gYmxvY2suX2xhc3RDaGlsZDtcbiAgICBpZiAobGFzdGMgJiYgbGFzdGMudHlwZSA9PT0gJ3RleHQnICYmIGxhc3RjLl9saXRlcmFsW2xhc3RjLl9saXRlcmFsLmxlbmd0aCAtIDFdID09PSAnICcpIHtcbiAgICAgICAgdmFyIGhhcmRicmVhayA9IGxhc3RjLl9saXRlcmFsW2xhc3RjLl9saXRlcmFsLmxlbmd0aCAtIDJdID09PSAnICc7XG4gICAgICAgIGxhc3RjLl9saXRlcmFsID0gbGFzdGMuX2xpdGVyYWwucmVwbGFjZShyZUZpbmFsU3BhY2UsICcnKTtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQobmV3IE5vZGUoaGFyZGJyZWFrID8gJ2xpbmVicmVhaycgOiAnc29mdGJyZWFrJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKG5ldyBOb2RlKCdzb2Z0YnJlYWsnKSk7XG4gICAgfVxuICAgIHRoaXMubWF0Y2gocmVJbml0aWFsU3BhY2UpOyAvLyBnb2JibGUgbGVhZGluZyBzcGFjZXMgaW4gbmV4dCBsaW5lXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBBdHRlbXB0IHRvIHBhcnNlIGEgbGluayByZWZlcmVuY2UsIG1vZGlmeWluZyByZWZtYXAuXG52YXIgcGFyc2VSZWZlcmVuY2UgPSBmdW5jdGlvbihzLCByZWZtYXApIHtcbiAgICB0aGlzLnN1YmplY3QgPSBzO1xuICAgIHRoaXMucG9zID0gMDtcbiAgICB2YXIgcmF3bGFiZWw7XG4gICAgdmFyIGRlc3Q7XG4gICAgdmFyIHRpdGxlO1xuICAgIHZhciBtYXRjaENoYXJzO1xuICAgIHZhciBzdGFydHBvcyA9IHRoaXMucG9zO1xuXG4gICAgLy8gbGFiZWw6XG4gICAgbWF0Y2hDaGFycyA9IHRoaXMucGFyc2VMaW5rTGFiZWwoKTtcbiAgICBpZiAobWF0Y2hDaGFycyA9PT0gMCkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByYXdsYWJlbCA9IHRoaXMuc3ViamVjdC5zdWJzdHIoMCwgbWF0Y2hDaGFycyk7XG4gICAgfVxuXG4gICAgLy8gY29sb246XG4gICAgaWYgKHRoaXMucGVlaygpID09PSBDX0NPTE9OKSB7XG4gICAgICAgIHRoaXMucG9zKys7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wb3MgPSBzdGFydHBvcztcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgLy8gIGxpbmsgdXJsXG4gICAgdGhpcy5zcG5sKCk7XG5cbiAgICBkZXN0ID0gdGhpcy5wYXJzZUxpbmtEZXN0aW5hdGlvbigpO1xuICAgIGlmIChkZXN0ID09PSBudWxsIHx8IGRlc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRoaXMucG9zID0gc3RhcnRwb3M7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIHZhciBiZWZvcmV0aXRsZSA9IHRoaXMucG9zO1xuICAgIHRoaXMuc3BubCgpO1xuICAgIHRpdGxlID0gdGhpcy5wYXJzZUxpbmtUaXRsZSgpO1xuICAgIGlmICh0aXRsZSA9PT0gbnVsbCkge1xuICAgICAgICB0aXRsZSA9ICcnO1xuICAgICAgICAvLyByZXdpbmQgYmVmb3JlIHNwYWNlc1xuICAgICAgICB0aGlzLnBvcyA9IGJlZm9yZXRpdGxlO1xuICAgIH1cblxuICAgIC8vIG1ha2Ugc3VyZSB3ZSdyZSBhdCBsaW5lIGVuZDpcbiAgICB2YXIgYXRMaW5lRW5kID0gdHJ1ZTtcbiAgICBpZiAodGhpcy5tYXRjaChyZVNwYWNlQXRFbmRPZkxpbmUpID09PSBudWxsKSB7XG4gICAgICAgIGlmICh0aXRsZSA9PT0gJycpIHtcbiAgICAgICAgICAgIGF0TGluZUVuZCA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGhlIHBvdGVudGlhbCB0aXRsZSB3ZSBmb3VuZCBpcyBub3QgYXQgdGhlIGxpbmUgZW5kLFxuICAgICAgICAgICAgLy8gYnV0IGl0IGNvdWxkIHN0aWxsIGJlIGEgbGVnYWwgbGluayByZWZlcmVuY2UgaWYgd2VcbiAgICAgICAgICAgIC8vIGRpc2NhcmQgdGhlIHRpdGxlXG4gICAgICAgICAgICB0aXRsZSA9ICcnO1xuICAgICAgICAgICAgLy8gcmV3aW5kIGJlZm9yZSBzcGFjZXNcbiAgICAgICAgICAgIHRoaXMucG9zID0gYmVmb3JldGl0bGU7XG4gICAgICAgICAgICAvLyBhbmQgaW5zdGVhZCBjaGVjayBpZiB0aGUgbGluayBVUkwgaXMgYXQgdGhlIGxpbmUgZW5kXG4gICAgICAgICAgICBhdExpbmVFbmQgPSB0aGlzLm1hdGNoKHJlU3BhY2VBdEVuZE9mTGluZSkgIT09IG51bGw7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWF0TGluZUVuZCkge1xuICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0cG9zO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICB2YXIgbm9ybWxhYmVsID0gbm9ybWFsaXplUmVmZXJlbmNlKHJhd2xhYmVsKTtcbiAgICBpZiAobm9ybWxhYmVsID09PSAnJykge1xuICAgICAgICAvLyBsYWJlbCBtdXN0IGNvbnRhaW4gbm9uLXdoaXRlc3BhY2UgY2hhcmFjdGVyc1xuICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0cG9zO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICBpZiAoIXJlZm1hcFtub3JtbGFiZWxdKSB7XG4gICAgICAgIHJlZm1hcFtub3JtbGFiZWxdID0geyBkZXN0aW5hdGlvbjogZGVzdCwgdGl0bGU6IHRpdGxlIH07XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnBvcyAtIHN0YXJ0cG9zO1xufTtcblxuLy8gUGFyc2UgdGhlIG5leHQgaW5saW5lIGVsZW1lbnQgaW4gc3ViamVjdCwgYWR2YW5jaW5nIHN1YmplY3QgcG9zaXRpb24uXG4vLyBPbiBzdWNjZXNzLCBhZGQgdGhlIHJlc3VsdCB0byBibG9jaydzIGNoaWxkcmVuIGFuZCByZXR1cm4gdHJ1ZS5cbi8vIE9uIGZhaWx1cmUsIHJldHVybiBmYWxzZS5cbnZhciBwYXJzZUlubGluZSA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIHJlcyA9IGZhbHNlO1xuICAgIHZhciBjID0gdGhpcy5wZWVrKCk7XG4gICAgaWYgKGMgPT09IC0xKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgc3dpdGNoKGMpIHtcbiAgICBjYXNlIENfTkVXTElORTpcbiAgICAgICAgcmVzID0gdGhpcy5wYXJzZU5ld2xpbmUoYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIENfQkFDS1NMQVNIOlxuICAgICAgICByZXMgPSB0aGlzLnBhcnNlQmFja3NsYXNoKGJsb2NrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBDX0JBQ0tUSUNLOlxuICAgICAgICByZXMgPSB0aGlzLnBhcnNlQmFja3RpY2tzKGJsb2NrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBDX0FTVEVSSVNLOlxuICAgIGNhc2UgQ19VTkRFUlNDT1JFOlxuICAgICAgICByZXMgPSB0aGlzLmhhbmRsZURlbGltKGMsIGJsb2NrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBDX1NJTkdMRVFVT1RFOlxuICAgIGNhc2UgQ19ET1VCTEVRVU9URTpcbiAgICAgICAgcmVzID0gdGhpcy5vcHRpb25zLnNtYXJ0ICYmIHRoaXMuaGFuZGxlRGVsaW0oYywgYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIENfT1BFTl9CUkFDS0VUOlxuICAgICAgICByZXMgPSB0aGlzLnBhcnNlT3BlbkJyYWNrZXQoYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIENfQkFORzpcbiAgICAgICAgcmVzID0gdGhpcy5wYXJzZUJhbmcoYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIENfQ0xPU0VfQlJBQ0tFVDpcbiAgICAgICAgcmVzID0gdGhpcy5wYXJzZUNsb3NlQnJhY2tldChibG9jayk7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgQ19MRVNTVEhBTjpcbiAgICAgICAgcmVzID0gdGhpcy5wYXJzZUF1dG9saW5rKGJsb2NrKSB8fCB0aGlzLnBhcnNlSHRtbFRhZyhibG9jayk7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgQ19BTVBFUlNBTkQ6XG4gICAgICAgIHJlcyA9IHRoaXMucGFyc2VFbnRpdHkoYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgICByZXMgPSB0aGlzLnBhcnNlU3RyaW5nKGJsb2NrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGlmICghcmVzKSB7XG4gICAgICAgIHRoaXMucG9zICs9IDE7XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQoZnJvbUNvZGVQb2ludChjKSkpO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLy8gUGFyc2Ugc3RyaW5nIGNvbnRlbnQgaW4gYmxvY2sgaW50byBpbmxpbmUgY2hpbGRyZW4sXG4vLyB1c2luZyByZWZtYXAgdG8gcmVzb2x2ZSByZWZlcmVuY2VzLlxudmFyIHBhcnNlSW5saW5lcyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdGhpcy5zdWJqZWN0ID0gYmxvY2suX3N0cmluZ19jb250ZW50LnRyaW0oKTtcbiAgICB0aGlzLnBvcyA9IDA7XG4gICAgdGhpcy5kZWxpbWl0ZXJzID0gbnVsbDtcbiAgICB0aGlzLmJyYWNrZXRzID0gbnVsbDtcbiAgICB3aGlsZSAodGhpcy5wYXJzZUlubGluZShibG9jaykpIHtcbiAgICB9XG4gICAgYmxvY2suX3N0cmluZ19jb250ZW50ID0gbnVsbDsgLy8gYWxsb3cgcmF3IHN0cmluZyB0byBiZSBnYXJiYWdlIGNvbGxlY3RlZFxuICAgIHRoaXMucHJvY2Vzc0VtcGhhc2lzKG51bGwpO1xufTtcblxuLy8gVGhlIElubGluZVBhcnNlciBvYmplY3QuXG5mdW5jdGlvbiBJbmxpbmVQYXJzZXIob3B0aW9ucyl7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3ViamVjdDogJycsXG4gICAgICAgIGRlbGltaXRlcnM6IG51bGwsICAvLyB1c2VkIGJ5IGhhbmRsZURlbGltIG1ldGhvZFxuICAgICAgICBicmFja2V0czogbnVsbCxcbiAgICAgICAgcG9zOiAwLFxuICAgICAgICByZWZtYXA6IHt9LFxuICAgICAgICBtYXRjaDogbWF0Y2gsXG4gICAgICAgIHBlZWs6IHBlZWssXG4gICAgICAgIHNwbmw6IHNwbmwsXG4gICAgICAgIHBhcnNlQmFja3RpY2tzOiBwYXJzZUJhY2t0aWNrcyxcbiAgICAgICAgcGFyc2VCYWNrc2xhc2g6IHBhcnNlQmFja3NsYXNoLFxuICAgICAgICBwYXJzZUF1dG9saW5rOiBwYXJzZUF1dG9saW5rLFxuICAgICAgICBwYXJzZUh0bWxUYWc6IHBhcnNlSHRtbFRhZyxcbiAgICAgICAgc2NhbkRlbGltczogc2NhbkRlbGltcyxcbiAgICAgICAgaGFuZGxlRGVsaW06IGhhbmRsZURlbGltLFxuICAgICAgICBwYXJzZUxpbmtUaXRsZTogcGFyc2VMaW5rVGl0bGUsXG4gICAgICAgIHBhcnNlTGlua0Rlc3RpbmF0aW9uOiBwYXJzZUxpbmtEZXN0aW5hdGlvbixcbiAgICAgICAgcGFyc2VMaW5rTGFiZWw6IHBhcnNlTGlua0xhYmVsLFxuICAgICAgICBwYXJzZU9wZW5CcmFja2V0OiBwYXJzZU9wZW5CcmFja2V0LFxuICAgICAgICBwYXJzZUJhbmc6IHBhcnNlQmFuZyxcbiAgICAgICAgcGFyc2VDbG9zZUJyYWNrZXQ6IHBhcnNlQ2xvc2VCcmFja2V0LFxuICAgICAgICBhZGRCcmFja2V0OiBhZGRCcmFja2V0LFxuICAgICAgICByZW1vdmVCcmFja2V0OiByZW1vdmVCcmFja2V0LFxuICAgICAgICBwYXJzZUVudGl0eTogcGFyc2VFbnRpdHksXG4gICAgICAgIHBhcnNlU3RyaW5nOiBwYXJzZVN0cmluZyxcbiAgICAgICAgcGFyc2VOZXdsaW5lOiBwYXJzZU5ld2xpbmUsXG4gICAgICAgIHBhcnNlUmVmZXJlbmNlOiBwYXJzZVJlZmVyZW5jZSxcbiAgICAgICAgcGFyc2VJbmxpbmU6IHBhcnNlSW5saW5lLFxuICAgICAgICBwcm9jZXNzRW1waGFzaXM6IHByb2Nlc3NFbXBoYXNpcyxcbiAgICAgICAgcmVtb3ZlRGVsaW1pdGVyOiByZW1vdmVEZWxpbWl0ZXIsXG4gICAgICAgIG9wdGlvbnM6IG9wdGlvbnMgfHwge30sXG4gICAgICAgIHBhcnNlOiBwYXJzZUlubGluZXNcbiAgICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IElubGluZVBhcnNlcjtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBpc0NvbnRhaW5lcihub2RlKSB7XG4gICAgc3dpdGNoIChub2RlLl90eXBlKSB7XG4gICAgY2FzZSAnZG9jdW1lbnQnOlxuICAgIGNhc2UgJ2Jsb2NrX3F1b3RlJzpcbiAgICBjYXNlICdsaXN0JzpcbiAgICBjYXNlICdpdGVtJzpcbiAgICBjYXNlICdwYXJhZ3JhcGgnOlxuICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgIGNhc2UgJ2VtcGgnOlxuICAgIGNhc2UgJ3N0cm9uZyc6XG4gICAgY2FzZSAnbGluayc6XG4gICAgY2FzZSAnaW1hZ2UnOlxuICAgIGNhc2UgJ2N1c3RvbV9pbmxpbmUnOlxuICAgIGNhc2UgJ2N1c3RvbV9ibG9jayc6XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbnZhciByZXN1bWVBdCA9IGZ1bmN0aW9uKG5vZGUsIGVudGVyaW5nKSB7XG4gICAgdGhpcy5jdXJyZW50ID0gbm9kZTtcbiAgICB0aGlzLmVudGVyaW5nID0gKGVudGVyaW5nID09PSB0cnVlKTtcbn07XG5cbnZhciBuZXh0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY3VyID0gdGhpcy5jdXJyZW50O1xuICAgIHZhciBlbnRlcmluZyA9IHRoaXMuZW50ZXJpbmc7XG5cbiAgICBpZiAoY3VyID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHZhciBjb250YWluZXIgPSBpc0NvbnRhaW5lcihjdXIpO1xuXG4gICAgaWYgKGVudGVyaW5nICYmIGNvbnRhaW5lcikge1xuICAgICAgICBpZiAoY3VyLl9maXJzdENoaWxkKSB7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSBjdXIuX2ZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB0aGlzLmVudGVyaW5nID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHN0YXkgb24gbm9kZSBidXQgZXhpdFxuICAgICAgICAgICAgdGhpcy5lbnRlcmluZyA9IGZhbHNlO1xuICAgICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKGN1ciA9PT0gdGhpcy5yb290KSB7XG4gICAgICAgIHRoaXMuY3VycmVudCA9IG51bGw7XG5cbiAgICB9IGVsc2UgaWYgKGN1ci5fbmV4dCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLmN1cnJlbnQgPSBjdXIuX3BhcmVudDtcbiAgICAgICAgdGhpcy5lbnRlcmluZyA9IGZhbHNlO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gY3VyLl9uZXh0O1xuICAgICAgICB0aGlzLmVudGVyaW5nID0gdHJ1ZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge2VudGVyaW5nOiBlbnRlcmluZywgbm9kZTogY3VyfTtcbn07XG5cbnZhciBOb2RlV2Fsa2VyID0gZnVuY3Rpb24ocm9vdCkge1xuICAgIHJldHVybiB7IGN1cnJlbnQ6IHJvb3QsXG4gICAgICAgICAgICAgcm9vdDogcm9vdCxcbiAgICAgICAgICAgICBlbnRlcmluZzogdHJ1ZSxcbiAgICAgICAgICAgICBuZXh0OiBuZXh0LFxuICAgICAgICAgICAgIHJlc3VtZUF0OiByZXN1bWVBdCB9O1xufTtcblxudmFyIE5vZGUgPSBmdW5jdGlvbihub2RlVHlwZSwgc291cmNlcG9zKSB7XG4gICAgdGhpcy5fdHlwZSA9IG5vZGVUeXBlO1xuICAgIHRoaXMuX3BhcmVudCA9IG51bGw7XG4gICAgdGhpcy5fZmlyc3RDaGlsZCA9IG51bGw7XG4gICAgdGhpcy5fbGFzdENoaWxkID0gbnVsbDtcbiAgICB0aGlzLl9wcmV2ID0gbnVsbDtcbiAgICB0aGlzLl9uZXh0ID0gbnVsbDtcbiAgICB0aGlzLl9zb3VyY2Vwb3MgPSBzb3VyY2Vwb3M7XG4gICAgdGhpcy5fbGFzdExpbmVCbGFuayA9IGZhbHNlO1xuICAgIHRoaXMuX29wZW4gPSB0cnVlO1xuICAgIHRoaXMuX3N0cmluZ19jb250ZW50ID0gbnVsbDtcbiAgICB0aGlzLl9saXRlcmFsID0gbnVsbDtcbiAgICB0aGlzLl9saXN0RGF0YSA9IHt9O1xuICAgIHRoaXMuX2luZm8gPSBudWxsO1xuICAgIHRoaXMuX2Rlc3RpbmF0aW9uID0gbnVsbDtcbiAgICB0aGlzLl90aXRsZSA9IG51bGw7XG4gICAgdGhpcy5faXNGZW5jZWQgPSBmYWxzZTtcbiAgICB0aGlzLl9mZW5jZUNoYXIgPSBudWxsO1xuICAgIHRoaXMuX2ZlbmNlTGVuZ3RoID0gMDtcbiAgICB0aGlzLl9mZW5jZU9mZnNldCA9IG51bGw7XG4gICAgdGhpcy5fbGV2ZWwgPSBudWxsO1xuICAgIHRoaXMuX29uRW50ZXIgPSBudWxsO1xuICAgIHRoaXMuX29uRXhpdCA9IG51bGw7XG59O1xuXG52YXIgcHJvdG8gPSBOb2RlLnByb3RvdHlwZTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnaXNDb250YWluZXInLCB7XG4gICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBpc0NvbnRhaW5lcih0aGlzKTsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ3R5cGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX3R5cGU7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdmaXJzdENoaWxkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9maXJzdENoaWxkOyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnbGFzdENoaWxkJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9sYXN0Q2hpbGQ7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICduZXh0Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9uZXh0OyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncHJldicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fcHJldjsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ3BhcmVudCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fcGFyZW50OyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnc291cmNlcG9zJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9zb3VyY2Vwb3M7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdsaXRlcmFsJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9saXRlcmFsOyB9LFxuICAgIHNldDogZnVuY3Rpb24ocykgeyB0aGlzLl9saXRlcmFsID0gczsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ2Rlc3RpbmF0aW9uJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9kZXN0aW5hdGlvbjsgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHMpIHsgdGhpcy5fZGVzdGluYXRpb24gPSBzOyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAndGl0bGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX3RpdGxlOyB9LFxuICAgIHNldDogZnVuY3Rpb24ocykgeyB0aGlzLl90aXRsZSA9IHM7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdpbmZvJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9pbmZvOyB9LFxuICAgIHNldDogZnVuY3Rpb24ocykgeyB0aGlzLl9pbmZvID0gczsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ2xldmVsJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9sZXZlbDsgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHMpIHsgdGhpcy5fbGV2ZWwgPSBzOyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnbGlzdFR5cGUnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2xpc3REYXRhLnR5cGU7IH0sXG4gICAgc2V0OiBmdW5jdGlvbih0KSB7IHRoaXMuX2xpc3REYXRhLnR5cGUgPSB0OyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnbGlzdFRpZ2h0Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9saXN0RGF0YS50aWdodDsgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHQpIHsgdGhpcy5fbGlzdERhdGEudGlnaHQgPSB0OyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnbGlzdFN0YXJ0Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9saXN0RGF0YS5zdGFydDsgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKG4pIHsgdGhpcy5fbGlzdERhdGEuc3RhcnQgPSBuOyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnbGlzdERlbGltaXRlcicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fbGlzdERhdGEuZGVsaW1pdGVyOyB9LFxuICAgIHNldDogZnVuY3Rpb24oZGVsaW0pIHsgdGhpcy5fbGlzdERhdGEuZGVsaW1pdGVyID0gZGVsaW07IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdvbkVudGVyJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9vbkVudGVyOyB9LFxuICAgIHNldDogZnVuY3Rpb24ocykgeyB0aGlzLl9vbkVudGVyID0gczsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ29uRXhpdCcsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fb25FeGl0OyB9LFxuICAgIHNldDogZnVuY3Rpb24ocykgeyB0aGlzLl9vbkV4aXQgPSBzOyB9XG59KTtcblxuTm9kZS5wcm90b3R5cGUuYXBwZW5kQ2hpbGQgPSBmdW5jdGlvbihjaGlsZCkge1xuICAgIGNoaWxkLnVubGluaygpO1xuICAgIGNoaWxkLl9wYXJlbnQgPSB0aGlzO1xuICAgIGlmICh0aGlzLl9sYXN0Q2hpbGQpIHtcbiAgICAgICAgdGhpcy5fbGFzdENoaWxkLl9uZXh0ID0gY2hpbGQ7XG4gICAgICAgIGNoaWxkLl9wcmV2ID0gdGhpcy5fbGFzdENoaWxkO1xuICAgICAgICB0aGlzLl9sYXN0Q2hpbGQgPSBjaGlsZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9maXJzdENoaWxkID0gY2hpbGQ7XG4gICAgICAgIHRoaXMuX2xhc3RDaGlsZCA9IGNoaWxkO1xuICAgIH1cbn07XG5cbk5vZGUucHJvdG90eXBlLnByZXBlbmRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgY2hpbGQudW5saW5rKCk7XG4gICAgY2hpbGQuX3BhcmVudCA9IHRoaXM7XG4gICAgaWYgKHRoaXMuX2ZpcnN0Q2hpbGQpIHtcbiAgICAgICAgdGhpcy5fZmlyc3RDaGlsZC5fcHJldiA9IGNoaWxkO1xuICAgICAgICBjaGlsZC5fbmV4dCA9IHRoaXMuX2ZpcnN0Q2hpbGQ7XG4gICAgICAgIHRoaXMuX2ZpcnN0Q2hpbGQgPSBjaGlsZDtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9maXJzdENoaWxkID0gY2hpbGQ7XG4gICAgICAgIHRoaXMuX2xhc3RDaGlsZCA9IGNoaWxkO1xuICAgIH1cbn07XG5cbk5vZGUucHJvdG90eXBlLnVubGluayA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9wcmV2KSB7XG4gICAgICAgIHRoaXMuX3ByZXYuX25leHQgPSB0aGlzLl9uZXh0O1xuICAgIH0gZWxzZSBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgIHRoaXMuX3BhcmVudC5fZmlyc3RDaGlsZCA9IHRoaXMuX25leHQ7XG4gICAgfVxuICAgIGlmICh0aGlzLl9uZXh0KSB7XG4gICAgICAgIHRoaXMuX25leHQuX3ByZXYgPSB0aGlzLl9wcmV2O1xuICAgIH0gZWxzZSBpZiAodGhpcy5fcGFyZW50KSB7XG4gICAgICAgIHRoaXMuX3BhcmVudC5fbGFzdENoaWxkID0gdGhpcy5fcHJldjtcbiAgICB9XG4gICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcbiAgICB0aGlzLl9uZXh0ID0gbnVsbDtcbiAgICB0aGlzLl9wcmV2ID0gbnVsbDtcbn07XG5cbk5vZGUucHJvdG90eXBlLmluc2VydEFmdGVyID0gZnVuY3Rpb24oc2libGluZykge1xuICAgIHNpYmxpbmcudW5saW5rKCk7XG4gICAgc2libGluZy5fbmV4dCA9IHRoaXMuX25leHQ7XG4gICAgaWYgKHNpYmxpbmcuX25leHQpIHtcbiAgICAgICAgc2libGluZy5fbmV4dC5fcHJldiA9IHNpYmxpbmc7XG4gICAgfVxuICAgIHNpYmxpbmcuX3ByZXYgPSB0aGlzO1xuICAgIHRoaXMuX25leHQgPSBzaWJsaW5nO1xuICAgIHNpYmxpbmcuX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICBpZiAoIXNpYmxpbmcuX25leHQpIHtcbiAgICAgICAgc2libGluZy5fcGFyZW50Ll9sYXN0Q2hpbGQgPSBzaWJsaW5nO1xuICAgIH1cbn07XG5cbk5vZGUucHJvdG90eXBlLmluc2VydEJlZm9yZSA9IGZ1bmN0aW9uKHNpYmxpbmcpIHtcbiAgICBzaWJsaW5nLnVubGluaygpO1xuICAgIHNpYmxpbmcuX3ByZXYgPSB0aGlzLl9wcmV2O1xuICAgIGlmIChzaWJsaW5nLl9wcmV2KSB7XG4gICAgICAgIHNpYmxpbmcuX3ByZXYuX25leHQgPSBzaWJsaW5nO1xuICAgIH1cbiAgICBzaWJsaW5nLl9uZXh0ID0gdGhpcztcbiAgICB0aGlzLl9wcmV2ID0gc2libGluZztcbiAgICBzaWJsaW5nLl9wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4gICAgaWYgKCFzaWJsaW5nLl9wcmV2KSB7XG4gICAgICAgIHNpYmxpbmcuX3BhcmVudC5fZmlyc3RDaGlsZCA9IHNpYmxpbmc7XG4gICAgfVxufTtcblxuTm9kZS5wcm90b3R5cGUud2Fsa2VyID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHdhbGtlciA9IG5ldyBOb2RlV2Fsa2VyKHRoaXMpO1xuICAgIHJldHVybiB3YWxrZXI7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7XG5cblxuLyogRXhhbXBsZSBvZiB1c2Ugb2Ygd2Fsa2VyOlxuXG4gdmFyIHdhbGtlciA9IHcud2Fsa2VyKCk7XG4gdmFyIGV2ZW50O1xuXG4gd2hpbGUgKGV2ZW50ID0gd2Fsa2VyLm5leHQoKSkge1xuIGNvbnNvbGUubG9nKGV2ZW50LmVudGVyaW5nLCBldmVudC5ub2RlLnR5cGUpO1xuIH1cblxuICovXG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLyogVGhlIGJ1bGsgb2YgdGhpcyBjb2RlIGRlcml2ZXMgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZG1vc2Nyb3AvZm9sZC1jYXNlXG5CdXQgaW4gYWRkaXRpb24gdG8gY2FzZS1mb2xkaW5nLCB3ZSBhbHNvIG5vcm1hbGl6ZSB3aGl0ZXNwYWNlLlxuXG5mb2xkLWNhc2UgaXMgQ29weXJpZ2h0IE1hdGhpYXMgQnluZW5zIDxodHRwczovL21hdGhpYXNieW5lbnMuYmUvPlxuXG5QZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmdcbmEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG53aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG5kaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG9cbnBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0b1xudGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG5UaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZVxuaW5jbHVkZWQgaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG5cblRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsXG5FWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbk1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EXG5OT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFXG5MSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OXG5PRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbldJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuKi9cblxuLyplc2xpbnQtZGlzYWJsZSAga2V5LXNwYWNpbmcsIGNvbW1hLXNwYWNpbmcgKi9cblxudmFyIHJlZ2V4ID0gL1sgXFx0XFxyXFxuXSt8W0EtWlxceEI1XFx4QzAtXFx4RDZcXHhEOC1cXHhERlxcdTAxMDBcXHUwMTAyXFx1MDEwNFxcdTAxMDZcXHUwMTA4XFx1MDEwQVxcdTAxMENcXHUwMTBFXFx1MDExMFxcdTAxMTJcXHUwMTE0XFx1MDExNlxcdTAxMThcXHUwMTFBXFx1MDExQ1xcdTAxMUVcXHUwMTIwXFx1MDEyMlxcdTAxMjRcXHUwMTI2XFx1MDEyOFxcdTAxMkFcXHUwMTJDXFx1MDEyRVxcdTAxMzBcXHUwMTMyXFx1MDEzNFxcdTAxMzZcXHUwMTM5XFx1MDEzQlxcdTAxM0RcXHUwMTNGXFx1MDE0MVxcdTAxNDNcXHUwMTQ1XFx1MDE0N1xcdTAxNDlcXHUwMTRBXFx1MDE0Q1xcdTAxNEVcXHUwMTUwXFx1MDE1MlxcdTAxNTRcXHUwMTU2XFx1MDE1OFxcdTAxNUFcXHUwMTVDXFx1MDE1RVxcdTAxNjBcXHUwMTYyXFx1MDE2NFxcdTAxNjZcXHUwMTY4XFx1MDE2QVxcdTAxNkNcXHUwMTZFXFx1MDE3MFxcdTAxNzJcXHUwMTc0XFx1MDE3NlxcdTAxNzhcXHUwMTc5XFx1MDE3QlxcdTAxN0RcXHUwMTdGXFx1MDE4MVxcdTAxODJcXHUwMTg0XFx1MDE4NlxcdTAxODdcXHUwMTg5LVxcdTAxOEJcXHUwMThFLVxcdTAxOTFcXHUwMTkzXFx1MDE5NFxcdTAxOTYtXFx1MDE5OFxcdTAxOUNcXHUwMTlEXFx1MDE5RlxcdTAxQTBcXHUwMUEyXFx1MDFBNFxcdTAxQTZcXHUwMUE3XFx1MDFBOVxcdTAxQUNcXHUwMUFFXFx1MDFBRlxcdTAxQjEtXFx1MDFCM1xcdTAxQjVcXHUwMUI3XFx1MDFCOFxcdTAxQkNcXHUwMUM0XFx1MDFDNVxcdTAxQzdcXHUwMUM4XFx1MDFDQVxcdTAxQ0JcXHUwMUNEXFx1MDFDRlxcdTAxRDFcXHUwMUQzXFx1MDFENVxcdTAxRDdcXHUwMUQ5XFx1MDFEQlxcdTAxREVcXHUwMUUwXFx1MDFFMlxcdTAxRTRcXHUwMUU2XFx1MDFFOFxcdTAxRUFcXHUwMUVDXFx1MDFFRVxcdTAxRjAtXFx1MDFGMlxcdTAxRjRcXHUwMUY2LVxcdTAxRjhcXHUwMUZBXFx1MDFGQ1xcdTAxRkVcXHUwMjAwXFx1MDIwMlxcdTAyMDRcXHUwMjA2XFx1MDIwOFxcdTAyMEFcXHUwMjBDXFx1MDIwRVxcdTAyMTBcXHUwMjEyXFx1MDIxNFxcdTAyMTZcXHUwMjE4XFx1MDIxQVxcdTAyMUNcXHUwMjFFXFx1MDIyMFxcdTAyMjJcXHUwMjI0XFx1MDIyNlxcdTAyMjhcXHUwMjJBXFx1MDIyQ1xcdTAyMkVcXHUwMjMwXFx1MDIzMlxcdTAyM0FcXHUwMjNCXFx1MDIzRFxcdTAyM0VcXHUwMjQxXFx1MDI0My1cXHUwMjQ2XFx1MDI0OFxcdTAyNEFcXHUwMjRDXFx1MDI0RVxcdTAzNDVcXHUwMzcwXFx1MDM3MlxcdTAzNzZcXHUwMzdGXFx1MDM4NlxcdTAzODgtXFx1MDM4QVxcdTAzOENcXHUwMzhFLVxcdTAzQTFcXHUwM0EzLVxcdTAzQUJcXHUwM0IwXFx1MDNDMlxcdTAzQ0YtXFx1MDNEMVxcdTAzRDVcXHUwM0Q2XFx1MDNEOFxcdTAzREFcXHUwM0RDXFx1MDNERVxcdTAzRTBcXHUwM0UyXFx1MDNFNFxcdTAzRTZcXHUwM0U4XFx1MDNFQVxcdTAzRUNcXHUwM0VFXFx1MDNGMFxcdTAzRjFcXHUwM0Y0XFx1MDNGNVxcdTAzRjdcXHUwM0Y5XFx1MDNGQVxcdTAzRkQtXFx1MDQyRlxcdTA0NjBcXHUwNDYyXFx1MDQ2NFxcdTA0NjZcXHUwNDY4XFx1MDQ2QVxcdTA0NkNcXHUwNDZFXFx1MDQ3MFxcdTA0NzJcXHUwNDc0XFx1MDQ3NlxcdTA0NzhcXHUwNDdBXFx1MDQ3Q1xcdTA0N0VcXHUwNDgwXFx1MDQ4QVxcdTA0OENcXHUwNDhFXFx1MDQ5MFxcdTA0OTJcXHUwNDk0XFx1MDQ5NlxcdTA0OThcXHUwNDlBXFx1MDQ5Q1xcdTA0OUVcXHUwNEEwXFx1MDRBMlxcdTA0QTRcXHUwNEE2XFx1MDRBOFxcdTA0QUFcXHUwNEFDXFx1MDRBRVxcdTA0QjBcXHUwNEIyXFx1MDRCNFxcdTA0QjZcXHUwNEI4XFx1MDRCQVxcdTA0QkNcXHUwNEJFXFx1MDRDMFxcdTA0QzFcXHUwNEMzXFx1MDRDNVxcdTA0QzdcXHUwNEM5XFx1MDRDQlxcdTA0Q0RcXHUwNEQwXFx1MDREMlxcdTA0RDRcXHUwNEQ2XFx1MDREOFxcdTA0REFcXHUwNERDXFx1MDRERVxcdTA0RTBcXHUwNEUyXFx1MDRFNFxcdTA0RTZcXHUwNEU4XFx1MDRFQVxcdTA0RUNcXHUwNEVFXFx1MDRGMFxcdTA0RjJcXHUwNEY0XFx1MDRGNlxcdTA0RjhcXHUwNEZBXFx1MDRGQ1xcdTA0RkVcXHUwNTAwXFx1MDUwMlxcdTA1MDRcXHUwNTA2XFx1MDUwOFxcdTA1MEFcXHUwNTBDXFx1MDUwRVxcdTA1MTBcXHUwNTEyXFx1MDUxNFxcdTA1MTZcXHUwNTE4XFx1MDUxQVxcdTA1MUNcXHUwNTFFXFx1MDUyMFxcdTA1MjJcXHUwNTI0XFx1MDUyNlxcdTA1MjhcXHUwNTJBXFx1MDUyQ1xcdTA1MkVcXHUwNTMxLVxcdTA1NTZcXHUwNTg3XFx1MTBBMC1cXHUxMEM1XFx1MTBDN1xcdTEwQ0RcXHUxRTAwXFx1MUUwMlxcdTFFMDRcXHUxRTA2XFx1MUUwOFxcdTFFMEFcXHUxRTBDXFx1MUUwRVxcdTFFMTBcXHUxRTEyXFx1MUUxNFxcdTFFMTZcXHUxRTE4XFx1MUUxQVxcdTFFMUNcXHUxRTFFXFx1MUUyMFxcdTFFMjJcXHUxRTI0XFx1MUUyNlxcdTFFMjhcXHUxRTJBXFx1MUUyQ1xcdTFFMkVcXHUxRTMwXFx1MUUzMlxcdTFFMzRcXHUxRTM2XFx1MUUzOFxcdTFFM0FcXHUxRTNDXFx1MUUzRVxcdTFFNDBcXHUxRTQyXFx1MUU0NFxcdTFFNDZcXHUxRTQ4XFx1MUU0QVxcdTFFNENcXHUxRTRFXFx1MUU1MFxcdTFFNTJcXHUxRTU0XFx1MUU1NlxcdTFFNThcXHUxRTVBXFx1MUU1Q1xcdTFFNUVcXHUxRTYwXFx1MUU2MlxcdTFFNjRcXHUxRTY2XFx1MUU2OFxcdTFFNkFcXHUxRTZDXFx1MUU2RVxcdTFFNzBcXHUxRTcyXFx1MUU3NFxcdTFFNzZcXHUxRTc4XFx1MUU3QVxcdTFFN0NcXHUxRTdFXFx1MUU4MFxcdTFFODJcXHUxRTg0XFx1MUU4NlxcdTFFODhcXHUxRThBXFx1MUU4Q1xcdTFFOEVcXHUxRTkwXFx1MUU5MlxcdTFFOTRcXHUxRTk2LVxcdTFFOUJcXHUxRTlFXFx1MUVBMFxcdTFFQTJcXHUxRUE0XFx1MUVBNlxcdTFFQThcXHUxRUFBXFx1MUVBQ1xcdTFFQUVcXHUxRUIwXFx1MUVCMlxcdTFFQjRcXHUxRUI2XFx1MUVCOFxcdTFFQkFcXHUxRUJDXFx1MUVCRVxcdTFFQzBcXHUxRUMyXFx1MUVDNFxcdTFFQzZcXHUxRUM4XFx1MUVDQVxcdTFFQ0NcXHUxRUNFXFx1MUVEMFxcdTFFRDJcXHUxRUQ0XFx1MUVENlxcdTFFRDhcXHUxRURBXFx1MUVEQ1xcdTFFREVcXHUxRUUwXFx1MUVFMlxcdTFFRTRcXHUxRUU2XFx1MUVFOFxcdTFFRUFcXHUxRUVDXFx1MUVFRVxcdTFFRjBcXHUxRUYyXFx1MUVGNFxcdTFFRjZcXHUxRUY4XFx1MUVGQVxcdTFFRkNcXHUxRUZFXFx1MUYwOC1cXHUxRjBGXFx1MUYxOC1cXHUxRjFEXFx1MUYyOC1cXHUxRjJGXFx1MUYzOC1cXHUxRjNGXFx1MUY0OC1cXHUxRjREXFx1MUY1MFxcdTFGNTJcXHUxRjU0XFx1MUY1NlxcdTFGNTlcXHUxRjVCXFx1MUY1RFxcdTFGNUZcXHUxRjY4LVxcdTFGNkZcXHUxRjgwLVxcdTFGQUZcXHUxRkIyLVxcdTFGQjRcXHUxRkI2LVxcdTFGQkNcXHUxRkJFXFx1MUZDMi1cXHUxRkM0XFx1MUZDNi1cXHUxRkNDXFx1MUZEMlxcdTFGRDNcXHUxRkQ2LVxcdTFGREJcXHUxRkUyLVxcdTFGRTRcXHUxRkU2LVxcdTFGRUNcXHUxRkYyLVxcdTFGRjRcXHUxRkY2LVxcdTFGRkNcXHUyMTI2XFx1MjEyQVxcdTIxMkJcXHUyMTMyXFx1MjE2MC1cXHUyMTZGXFx1MjE4M1xcdTI0QjYtXFx1MjRDRlxcdTJDMDAtXFx1MkMyRVxcdTJDNjBcXHUyQzYyLVxcdTJDNjRcXHUyQzY3XFx1MkM2OVxcdTJDNkJcXHUyQzZELVxcdTJDNzBcXHUyQzcyXFx1MkM3NVxcdTJDN0UtXFx1MkM4MFxcdTJDODJcXHUyQzg0XFx1MkM4NlxcdTJDODhcXHUyQzhBXFx1MkM4Q1xcdTJDOEVcXHUyQzkwXFx1MkM5MlxcdTJDOTRcXHUyQzk2XFx1MkM5OFxcdTJDOUFcXHUyQzlDXFx1MkM5RVxcdTJDQTBcXHUyQ0EyXFx1MkNBNFxcdTJDQTZcXHUyQ0E4XFx1MkNBQVxcdTJDQUNcXHUyQ0FFXFx1MkNCMFxcdTJDQjJcXHUyQ0I0XFx1MkNCNlxcdTJDQjhcXHUyQ0JBXFx1MkNCQ1xcdTJDQkVcXHUyQ0MwXFx1MkNDMlxcdTJDQzRcXHUyQ0M2XFx1MkNDOFxcdTJDQ0FcXHUyQ0NDXFx1MkNDRVxcdTJDRDBcXHUyQ0QyXFx1MkNENFxcdTJDRDZcXHUyQ0Q4XFx1MkNEQVxcdTJDRENcXHUyQ0RFXFx1MkNFMFxcdTJDRTJcXHUyQ0VCXFx1MkNFRFxcdTJDRjJcXHVBNjQwXFx1QTY0MlxcdUE2NDRcXHVBNjQ2XFx1QTY0OFxcdUE2NEFcXHVBNjRDXFx1QTY0RVxcdUE2NTBcXHVBNjUyXFx1QTY1NFxcdUE2NTZcXHVBNjU4XFx1QTY1QVxcdUE2NUNcXHVBNjVFXFx1QTY2MFxcdUE2NjJcXHVBNjY0XFx1QTY2NlxcdUE2NjhcXHVBNjZBXFx1QTY2Q1xcdUE2ODBcXHVBNjgyXFx1QTY4NFxcdUE2ODZcXHVBNjg4XFx1QTY4QVxcdUE2OENcXHVBNjhFXFx1QTY5MFxcdUE2OTJcXHVBNjk0XFx1QTY5NlxcdUE2OThcXHVBNjlBXFx1QTcyMlxcdUE3MjRcXHVBNzI2XFx1QTcyOFxcdUE3MkFcXHVBNzJDXFx1QTcyRVxcdUE3MzJcXHVBNzM0XFx1QTczNlxcdUE3MzhcXHVBNzNBXFx1QTczQ1xcdUE3M0VcXHVBNzQwXFx1QTc0MlxcdUE3NDRcXHVBNzQ2XFx1QTc0OFxcdUE3NEFcXHVBNzRDXFx1QTc0RVxcdUE3NTBcXHVBNzUyXFx1QTc1NFxcdUE3NTZcXHVBNzU4XFx1QTc1QVxcdUE3NUNcXHVBNzVFXFx1QTc2MFxcdUE3NjJcXHVBNzY0XFx1QTc2NlxcdUE3NjhcXHVBNzZBXFx1QTc2Q1xcdUE3NkVcXHVBNzc5XFx1QTc3QlxcdUE3N0RcXHVBNzdFXFx1QTc4MFxcdUE3ODJcXHVBNzg0XFx1QTc4NlxcdUE3OEJcXHVBNzhEXFx1QTc5MFxcdUE3OTJcXHVBNzk2XFx1QTc5OFxcdUE3OUFcXHVBNzlDXFx1QTc5RVxcdUE3QTBcXHVBN0EyXFx1QTdBNFxcdUE3QTZcXHVBN0E4XFx1QTdBQS1cXHVBN0FEXFx1QTdCMFxcdUE3QjFcXHVGQjAwLVxcdUZCMDZcXHVGQjEzLVxcdUZCMTdcXHVGRjIxLVxcdUZGM0FdfFxcdUQ4MDFbXFx1REMwMC1cXHVEQzI3XXxcXHVEODA2W1xcdURDQTAtXFx1RENCRl0vZztcblxudmFyIG1hcCA9IHsnQSc6J2EnLCdCJzonYicsJ0MnOidjJywnRCc6J2QnLCdFJzonZScsJ0YnOidmJywnRyc6J2cnLCdIJzonaCcsJ0knOidpJywnSic6J2onLCdLJzonaycsJ0wnOidsJywnTSc6J20nLCdOJzonbicsJ08nOidvJywnUCc6J3AnLCdRJzoncScsJ1InOidyJywnUyc6J3MnLCdUJzondCcsJ1UnOid1JywnVic6J3YnLCdXJzondycsJ1gnOid4JywnWSc6J3knLCdaJzoneicsJ1xceEI1JzonXFx1MDNCQycsJ1xceEMwJzonXFx4RTAnLCdcXHhDMSc6J1xceEUxJywnXFx4QzInOidcXHhFMicsJ1xceEMzJzonXFx4RTMnLCdcXHhDNCc6J1xceEU0JywnXFx4QzUnOidcXHhFNScsJ1xceEM2JzonXFx4RTYnLCdcXHhDNyc6J1xceEU3JywnXFx4QzgnOidcXHhFOCcsJ1xceEM5JzonXFx4RTknLCdcXHhDQSc6J1xceEVBJywnXFx4Q0InOidcXHhFQicsJ1xceENDJzonXFx4RUMnLCdcXHhDRCc6J1xceEVEJywnXFx4Q0UnOidcXHhFRScsJ1xceENGJzonXFx4RUYnLCdcXHhEMCc6J1xceEYwJywnXFx4RDEnOidcXHhGMScsJ1xceEQyJzonXFx4RjInLCdcXHhEMyc6J1xceEYzJywnXFx4RDQnOidcXHhGNCcsJ1xceEQ1JzonXFx4RjUnLCdcXHhENic6J1xceEY2JywnXFx4RDgnOidcXHhGOCcsJ1xceEQ5JzonXFx4RjknLCdcXHhEQSc6J1xceEZBJywnXFx4REInOidcXHhGQicsJ1xceERDJzonXFx4RkMnLCdcXHhERCc6J1xceEZEJywnXFx4REUnOidcXHhGRScsJ1xcdTAxMDAnOidcXHUwMTAxJywnXFx1MDEwMic6J1xcdTAxMDMnLCdcXHUwMTA0JzonXFx1MDEwNScsJ1xcdTAxMDYnOidcXHUwMTA3JywnXFx1MDEwOCc6J1xcdTAxMDknLCdcXHUwMTBBJzonXFx1MDEwQicsJ1xcdTAxMEMnOidcXHUwMTBEJywnXFx1MDEwRSc6J1xcdTAxMEYnLCdcXHUwMTEwJzonXFx1MDExMScsJ1xcdTAxMTInOidcXHUwMTEzJywnXFx1MDExNCc6J1xcdTAxMTUnLCdcXHUwMTE2JzonXFx1MDExNycsJ1xcdTAxMTgnOidcXHUwMTE5JywnXFx1MDExQSc6J1xcdTAxMUInLCdcXHUwMTFDJzonXFx1MDExRCcsJ1xcdTAxMUUnOidcXHUwMTFGJywnXFx1MDEyMCc6J1xcdTAxMjEnLCdcXHUwMTIyJzonXFx1MDEyMycsJ1xcdTAxMjQnOidcXHUwMTI1JywnXFx1MDEyNic6J1xcdTAxMjcnLCdcXHUwMTI4JzonXFx1MDEyOScsJ1xcdTAxMkEnOidcXHUwMTJCJywnXFx1MDEyQyc6J1xcdTAxMkQnLCdcXHUwMTJFJzonXFx1MDEyRicsJ1xcdTAxMzInOidcXHUwMTMzJywnXFx1MDEzNCc6J1xcdTAxMzUnLCdcXHUwMTM2JzonXFx1MDEzNycsJ1xcdTAxMzknOidcXHUwMTNBJywnXFx1MDEzQic6J1xcdTAxM0MnLCdcXHUwMTNEJzonXFx1MDEzRScsJ1xcdTAxM0YnOidcXHUwMTQwJywnXFx1MDE0MSc6J1xcdTAxNDInLCdcXHUwMTQzJzonXFx1MDE0NCcsJ1xcdTAxNDUnOidcXHUwMTQ2JywnXFx1MDE0Nyc6J1xcdTAxNDgnLCdcXHUwMTRBJzonXFx1MDE0QicsJ1xcdTAxNEMnOidcXHUwMTREJywnXFx1MDE0RSc6J1xcdTAxNEYnLCdcXHUwMTUwJzonXFx1MDE1MScsJ1xcdTAxNTInOidcXHUwMTUzJywnXFx1MDE1NCc6J1xcdTAxNTUnLCdcXHUwMTU2JzonXFx1MDE1NycsJ1xcdTAxNTgnOidcXHUwMTU5JywnXFx1MDE1QSc6J1xcdTAxNUInLCdcXHUwMTVDJzonXFx1MDE1RCcsJ1xcdTAxNUUnOidcXHUwMTVGJywnXFx1MDE2MCc6J1xcdTAxNjEnLCdcXHUwMTYyJzonXFx1MDE2MycsJ1xcdTAxNjQnOidcXHUwMTY1JywnXFx1MDE2Nic6J1xcdTAxNjcnLCdcXHUwMTY4JzonXFx1MDE2OScsJ1xcdTAxNkEnOidcXHUwMTZCJywnXFx1MDE2Qyc6J1xcdTAxNkQnLCdcXHUwMTZFJzonXFx1MDE2RicsJ1xcdTAxNzAnOidcXHUwMTcxJywnXFx1MDE3Mic6J1xcdTAxNzMnLCdcXHUwMTc0JzonXFx1MDE3NScsJ1xcdTAxNzYnOidcXHUwMTc3JywnXFx1MDE3OCc6J1xceEZGJywnXFx1MDE3OSc6J1xcdTAxN0EnLCdcXHUwMTdCJzonXFx1MDE3QycsJ1xcdTAxN0QnOidcXHUwMTdFJywnXFx1MDE3Ric6J3MnLCdcXHUwMTgxJzonXFx1MDI1MycsJ1xcdTAxODInOidcXHUwMTgzJywnXFx1MDE4NCc6J1xcdTAxODUnLCdcXHUwMTg2JzonXFx1MDI1NCcsJ1xcdTAxODcnOidcXHUwMTg4JywnXFx1MDE4OSc6J1xcdTAyNTYnLCdcXHUwMThBJzonXFx1MDI1NycsJ1xcdTAxOEInOidcXHUwMThDJywnXFx1MDE4RSc6J1xcdTAxREQnLCdcXHUwMThGJzonXFx1MDI1OScsJ1xcdTAxOTAnOidcXHUwMjVCJywnXFx1MDE5MSc6J1xcdTAxOTInLCdcXHUwMTkzJzonXFx1MDI2MCcsJ1xcdTAxOTQnOidcXHUwMjYzJywnXFx1MDE5Nic6J1xcdTAyNjknLCdcXHUwMTk3JzonXFx1MDI2OCcsJ1xcdTAxOTgnOidcXHUwMTk5JywnXFx1MDE5Qyc6J1xcdTAyNkYnLCdcXHUwMTlEJzonXFx1MDI3MicsJ1xcdTAxOUYnOidcXHUwMjc1JywnXFx1MDFBMCc6J1xcdTAxQTEnLCdcXHUwMUEyJzonXFx1MDFBMycsJ1xcdTAxQTQnOidcXHUwMUE1JywnXFx1MDFBNic6J1xcdTAyODAnLCdcXHUwMUE3JzonXFx1MDFBOCcsJ1xcdTAxQTknOidcXHUwMjgzJywnXFx1MDFBQyc6J1xcdTAxQUQnLCdcXHUwMUFFJzonXFx1MDI4OCcsJ1xcdTAxQUYnOidcXHUwMUIwJywnXFx1MDFCMSc6J1xcdTAyOEEnLCdcXHUwMUIyJzonXFx1MDI4QicsJ1xcdTAxQjMnOidcXHUwMUI0JywnXFx1MDFCNSc6J1xcdTAxQjYnLCdcXHUwMUI3JzonXFx1MDI5MicsJ1xcdTAxQjgnOidcXHUwMUI5JywnXFx1MDFCQyc6J1xcdTAxQkQnLCdcXHUwMUM0JzonXFx1MDFDNicsJ1xcdTAxQzUnOidcXHUwMUM2JywnXFx1MDFDNyc6J1xcdTAxQzknLCdcXHUwMUM4JzonXFx1MDFDOScsJ1xcdTAxQ0EnOidcXHUwMUNDJywnXFx1MDFDQic6J1xcdTAxQ0MnLCdcXHUwMUNEJzonXFx1MDFDRScsJ1xcdTAxQ0YnOidcXHUwMUQwJywnXFx1MDFEMSc6J1xcdTAxRDInLCdcXHUwMUQzJzonXFx1MDFENCcsJ1xcdTAxRDUnOidcXHUwMUQ2JywnXFx1MDFENyc6J1xcdTAxRDgnLCdcXHUwMUQ5JzonXFx1MDFEQScsJ1xcdTAxREInOidcXHUwMURDJywnXFx1MDFERSc6J1xcdTAxREYnLCdcXHUwMUUwJzonXFx1MDFFMScsJ1xcdTAxRTInOidcXHUwMUUzJywnXFx1MDFFNCc6J1xcdTAxRTUnLCdcXHUwMUU2JzonXFx1MDFFNycsJ1xcdTAxRTgnOidcXHUwMUU5JywnXFx1MDFFQSc6J1xcdTAxRUInLCdcXHUwMUVDJzonXFx1MDFFRCcsJ1xcdTAxRUUnOidcXHUwMUVGJywnXFx1MDFGMSc6J1xcdTAxRjMnLCdcXHUwMUYyJzonXFx1MDFGMycsJ1xcdTAxRjQnOidcXHUwMUY1JywnXFx1MDFGNic6J1xcdTAxOTUnLCdcXHUwMUY3JzonXFx1MDFCRicsJ1xcdTAxRjgnOidcXHUwMUY5JywnXFx1MDFGQSc6J1xcdTAxRkInLCdcXHUwMUZDJzonXFx1MDFGRCcsJ1xcdTAxRkUnOidcXHUwMUZGJywnXFx1MDIwMCc6J1xcdTAyMDEnLCdcXHUwMjAyJzonXFx1MDIwMycsJ1xcdTAyMDQnOidcXHUwMjA1JywnXFx1MDIwNic6J1xcdTAyMDcnLCdcXHUwMjA4JzonXFx1MDIwOScsJ1xcdTAyMEEnOidcXHUwMjBCJywnXFx1MDIwQyc6J1xcdTAyMEQnLCdcXHUwMjBFJzonXFx1MDIwRicsJ1xcdTAyMTAnOidcXHUwMjExJywnXFx1MDIxMic6J1xcdTAyMTMnLCdcXHUwMjE0JzonXFx1MDIxNScsJ1xcdTAyMTYnOidcXHUwMjE3JywnXFx1MDIxOCc6J1xcdTAyMTknLCdcXHUwMjFBJzonXFx1MDIxQicsJ1xcdTAyMUMnOidcXHUwMjFEJywnXFx1MDIxRSc6J1xcdTAyMUYnLCdcXHUwMjIwJzonXFx1MDE5RScsJ1xcdTAyMjInOidcXHUwMjIzJywnXFx1MDIyNCc6J1xcdTAyMjUnLCdcXHUwMjI2JzonXFx1MDIyNycsJ1xcdTAyMjgnOidcXHUwMjI5JywnXFx1MDIyQSc6J1xcdTAyMkInLCdcXHUwMjJDJzonXFx1MDIyRCcsJ1xcdTAyMkUnOidcXHUwMjJGJywnXFx1MDIzMCc6J1xcdTAyMzEnLCdcXHUwMjMyJzonXFx1MDIzMycsJ1xcdTAyM0EnOidcXHUyQzY1JywnXFx1MDIzQic6J1xcdTAyM0MnLCdcXHUwMjNEJzonXFx1MDE5QScsJ1xcdTAyM0UnOidcXHUyQzY2JywnXFx1MDI0MSc6J1xcdTAyNDInLCdcXHUwMjQzJzonXFx1MDE4MCcsJ1xcdTAyNDQnOidcXHUwMjg5JywnXFx1MDI0NSc6J1xcdTAyOEMnLCdcXHUwMjQ2JzonXFx1MDI0NycsJ1xcdTAyNDgnOidcXHUwMjQ5JywnXFx1MDI0QSc6J1xcdTAyNEInLCdcXHUwMjRDJzonXFx1MDI0RCcsJ1xcdTAyNEUnOidcXHUwMjRGJywnXFx1MDM0NSc6J1xcdTAzQjknLCdcXHUwMzcwJzonXFx1MDM3MScsJ1xcdTAzNzInOidcXHUwMzczJywnXFx1MDM3Nic6J1xcdTAzNzcnLCdcXHUwMzdGJzonXFx1MDNGMycsJ1xcdTAzODYnOidcXHUwM0FDJywnXFx1MDM4OCc6J1xcdTAzQUQnLCdcXHUwMzg5JzonXFx1MDNBRScsJ1xcdTAzOEEnOidcXHUwM0FGJywnXFx1MDM4Qyc6J1xcdTAzQ0MnLCdcXHUwMzhFJzonXFx1MDNDRCcsJ1xcdTAzOEYnOidcXHUwM0NFJywnXFx1MDM5MSc6J1xcdTAzQjEnLCdcXHUwMzkyJzonXFx1MDNCMicsJ1xcdTAzOTMnOidcXHUwM0IzJywnXFx1MDM5NCc6J1xcdTAzQjQnLCdcXHUwMzk1JzonXFx1MDNCNScsJ1xcdTAzOTYnOidcXHUwM0I2JywnXFx1MDM5Nyc6J1xcdTAzQjcnLCdcXHUwMzk4JzonXFx1MDNCOCcsJ1xcdTAzOTknOidcXHUwM0I5JywnXFx1MDM5QSc6J1xcdTAzQkEnLCdcXHUwMzlCJzonXFx1MDNCQicsJ1xcdTAzOUMnOidcXHUwM0JDJywnXFx1MDM5RCc6J1xcdTAzQkQnLCdcXHUwMzlFJzonXFx1MDNCRScsJ1xcdTAzOUYnOidcXHUwM0JGJywnXFx1MDNBMCc6J1xcdTAzQzAnLCdcXHUwM0ExJzonXFx1MDNDMScsJ1xcdTAzQTMnOidcXHUwM0MzJywnXFx1MDNBNCc6J1xcdTAzQzQnLCdcXHUwM0E1JzonXFx1MDNDNScsJ1xcdTAzQTYnOidcXHUwM0M2JywnXFx1MDNBNyc6J1xcdTAzQzcnLCdcXHUwM0E4JzonXFx1MDNDOCcsJ1xcdTAzQTknOidcXHUwM0M5JywnXFx1MDNBQSc6J1xcdTAzQ0EnLCdcXHUwM0FCJzonXFx1MDNDQicsJ1xcdTAzQzInOidcXHUwM0MzJywnXFx1MDNDRic6J1xcdTAzRDcnLCdcXHUwM0QwJzonXFx1MDNCMicsJ1xcdTAzRDEnOidcXHUwM0I4JywnXFx1MDNENSc6J1xcdTAzQzYnLCdcXHUwM0Q2JzonXFx1MDNDMCcsJ1xcdTAzRDgnOidcXHUwM0Q5JywnXFx1MDNEQSc6J1xcdTAzREInLCdcXHUwM0RDJzonXFx1MDNERCcsJ1xcdTAzREUnOidcXHUwM0RGJywnXFx1MDNFMCc6J1xcdTAzRTEnLCdcXHUwM0UyJzonXFx1MDNFMycsJ1xcdTAzRTQnOidcXHUwM0U1JywnXFx1MDNFNic6J1xcdTAzRTcnLCdcXHUwM0U4JzonXFx1MDNFOScsJ1xcdTAzRUEnOidcXHUwM0VCJywnXFx1MDNFQyc6J1xcdTAzRUQnLCdcXHUwM0VFJzonXFx1MDNFRicsJ1xcdTAzRjAnOidcXHUwM0JBJywnXFx1MDNGMSc6J1xcdTAzQzEnLCdcXHUwM0Y0JzonXFx1MDNCOCcsJ1xcdTAzRjUnOidcXHUwM0I1JywnXFx1MDNGNyc6J1xcdTAzRjgnLCdcXHUwM0Y5JzonXFx1MDNGMicsJ1xcdTAzRkEnOidcXHUwM0ZCJywnXFx1MDNGRCc6J1xcdTAzN0InLCdcXHUwM0ZFJzonXFx1MDM3QycsJ1xcdTAzRkYnOidcXHUwMzdEJywnXFx1MDQwMCc6J1xcdTA0NTAnLCdcXHUwNDAxJzonXFx1MDQ1MScsJ1xcdTA0MDInOidcXHUwNDUyJywnXFx1MDQwMyc6J1xcdTA0NTMnLCdcXHUwNDA0JzonXFx1MDQ1NCcsJ1xcdTA0MDUnOidcXHUwNDU1JywnXFx1MDQwNic6J1xcdTA0NTYnLCdcXHUwNDA3JzonXFx1MDQ1NycsJ1xcdTA0MDgnOidcXHUwNDU4JywnXFx1MDQwOSc6J1xcdTA0NTknLCdcXHUwNDBBJzonXFx1MDQ1QScsJ1xcdTA0MEInOidcXHUwNDVCJywnXFx1MDQwQyc6J1xcdTA0NUMnLCdcXHUwNDBEJzonXFx1MDQ1RCcsJ1xcdTA0MEUnOidcXHUwNDVFJywnXFx1MDQwRic6J1xcdTA0NUYnLCdcXHUwNDEwJzonXFx1MDQzMCcsJ1xcdTA0MTEnOidcXHUwNDMxJywnXFx1MDQxMic6J1xcdTA0MzInLCdcXHUwNDEzJzonXFx1MDQzMycsJ1xcdTA0MTQnOidcXHUwNDM0JywnXFx1MDQxNSc6J1xcdTA0MzUnLCdcXHUwNDE2JzonXFx1MDQzNicsJ1xcdTA0MTcnOidcXHUwNDM3JywnXFx1MDQxOCc6J1xcdTA0MzgnLCdcXHUwNDE5JzonXFx1MDQzOScsJ1xcdTA0MUEnOidcXHUwNDNBJywnXFx1MDQxQic6J1xcdTA0M0InLCdcXHUwNDFDJzonXFx1MDQzQycsJ1xcdTA0MUQnOidcXHUwNDNEJywnXFx1MDQxRSc6J1xcdTA0M0UnLCdcXHUwNDFGJzonXFx1MDQzRicsJ1xcdTA0MjAnOidcXHUwNDQwJywnXFx1MDQyMSc6J1xcdTA0NDEnLCdcXHUwNDIyJzonXFx1MDQ0MicsJ1xcdTA0MjMnOidcXHUwNDQzJywnXFx1MDQyNCc6J1xcdTA0NDQnLCdcXHUwNDI1JzonXFx1MDQ0NScsJ1xcdTA0MjYnOidcXHUwNDQ2JywnXFx1MDQyNyc6J1xcdTA0NDcnLCdcXHUwNDI4JzonXFx1MDQ0OCcsJ1xcdTA0MjknOidcXHUwNDQ5JywnXFx1MDQyQSc6J1xcdTA0NEEnLCdcXHUwNDJCJzonXFx1MDQ0QicsJ1xcdTA0MkMnOidcXHUwNDRDJywnXFx1MDQyRCc6J1xcdTA0NEQnLCdcXHUwNDJFJzonXFx1MDQ0RScsJ1xcdTA0MkYnOidcXHUwNDRGJywnXFx1MDQ2MCc6J1xcdTA0NjEnLCdcXHUwNDYyJzonXFx1MDQ2MycsJ1xcdTA0NjQnOidcXHUwNDY1JywnXFx1MDQ2Nic6J1xcdTA0NjcnLCdcXHUwNDY4JzonXFx1MDQ2OScsJ1xcdTA0NkEnOidcXHUwNDZCJywnXFx1MDQ2Qyc6J1xcdTA0NkQnLCdcXHUwNDZFJzonXFx1MDQ2RicsJ1xcdTA0NzAnOidcXHUwNDcxJywnXFx1MDQ3Mic6J1xcdTA0NzMnLCdcXHUwNDc0JzonXFx1MDQ3NScsJ1xcdTA0NzYnOidcXHUwNDc3JywnXFx1MDQ3OCc6J1xcdTA0NzknLCdcXHUwNDdBJzonXFx1MDQ3QicsJ1xcdTA0N0MnOidcXHUwNDdEJywnXFx1MDQ3RSc6J1xcdTA0N0YnLCdcXHUwNDgwJzonXFx1MDQ4MScsJ1xcdTA0OEEnOidcXHUwNDhCJywnXFx1MDQ4Qyc6J1xcdTA0OEQnLCdcXHUwNDhFJzonXFx1MDQ4RicsJ1xcdTA0OTAnOidcXHUwNDkxJywnXFx1MDQ5Mic6J1xcdTA0OTMnLCdcXHUwNDk0JzonXFx1MDQ5NScsJ1xcdTA0OTYnOidcXHUwNDk3JywnXFx1MDQ5OCc6J1xcdTA0OTknLCdcXHUwNDlBJzonXFx1MDQ5QicsJ1xcdTA0OUMnOidcXHUwNDlEJywnXFx1MDQ5RSc6J1xcdTA0OUYnLCdcXHUwNEEwJzonXFx1MDRBMScsJ1xcdTA0QTInOidcXHUwNEEzJywnXFx1MDRBNCc6J1xcdTA0QTUnLCdcXHUwNEE2JzonXFx1MDRBNycsJ1xcdTA0QTgnOidcXHUwNEE5JywnXFx1MDRBQSc6J1xcdTA0QUInLCdcXHUwNEFDJzonXFx1MDRBRCcsJ1xcdTA0QUUnOidcXHUwNEFGJywnXFx1MDRCMCc6J1xcdTA0QjEnLCdcXHUwNEIyJzonXFx1MDRCMycsJ1xcdTA0QjQnOidcXHUwNEI1JywnXFx1MDRCNic6J1xcdTA0QjcnLCdcXHUwNEI4JzonXFx1MDRCOScsJ1xcdTA0QkEnOidcXHUwNEJCJywnXFx1MDRCQyc6J1xcdTA0QkQnLCdcXHUwNEJFJzonXFx1MDRCRicsJ1xcdTA0QzAnOidcXHUwNENGJywnXFx1MDRDMSc6J1xcdTA0QzInLCdcXHUwNEMzJzonXFx1MDRDNCcsJ1xcdTA0QzUnOidcXHUwNEM2JywnXFx1MDRDNyc6J1xcdTA0QzgnLCdcXHUwNEM5JzonXFx1MDRDQScsJ1xcdTA0Q0InOidcXHUwNENDJywnXFx1MDRDRCc6J1xcdTA0Q0UnLCdcXHUwNEQwJzonXFx1MDREMScsJ1xcdTA0RDInOidcXHUwNEQzJywnXFx1MDRENCc6J1xcdTA0RDUnLCdcXHUwNEQ2JzonXFx1MDRENycsJ1xcdTA0RDgnOidcXHUwNEQ5JywnXFx1MDREQSc6J1xcdTA0REInLCdcXHUwNERDJzonXFx1MDRERCcsJ1xcdTA0REUnOidcXHUwNERGJywnXFx1MDRFMCc6J1xcdTA0RTEnLCdcXHUwNEUyJzonXFx1MDRFMycsJ1xcdTA0RTQnOidcXHUwNEU1JywnXFx1MDRFNic6J1xcdTA0RTcnLCdcXHUwNEU4JzonXFx1MDRFOScsJ1xcdTA0RUEnOidcXHUwNEVCJywnXFx1MDRFQyc6J1xcdTA0RUQnLCdcXHUwNEVFJzonXFx1MDRFRicsJ1xcdTA0RjAnOidcXHUwNEYxJywnXFx1MDRGMic6J1xcdTA0RjMnLCdcXHUwNEY0JzonXFx1MDRGNScsJ1xcdTA0RjYnOidcXHUwNEY3JywnXFx1MDRGOCc6J1xcdTA0RjknLCdcXHUwNEZBJzonXFx1MDRGQicsJ1xcdTA0RkMnOidcXHUwNEZEJywnXFx1MDRGRSc6J1xcdTA0RkYnLCdcXHUwNTAwJzonXFx1MDUwMScsJ1xcdTA1MDInOidcXHUwNTAzJywnXFx1MDUwNCc6J1xcdTA1MDUnLCdcXHUwNTA2JzonXFx1MDUwNycsJ1xcdTA1MDgnOidcXHUwNTA5JywnXFx1MDUwQSc6J1xcdTA1MEInLCdcXHUwNTBDJzonXFx1MDUwRCcsJ1xcdTA1MEUnOidcXHUwNTBGJywnXFx1MDUxMCc6J1xcdTA1MTEnLCdcXHUwNTEyJzonXFx1MDUxMycsJ1xcdTA1MTQnOidcXHUwNTE1JywnXFx1MDUxNic6J1xcdTA1MTcnLCdcXHUwNTE4JzonXFx1MDUxOScsJ1xcdTA1MUEnOidcXHUwNTFCJywnXFx1MDUxQyc6J1xcdTA1MUQnLCdcXHUwNTFFJzonXFx1MDUxRicsJ1xcdTA1MjAnOidcXHUwNTIxJywnXFx1MDUyMic6J1xcdTA1MjMnLCdcXHUwNTI0JzonXFx1MDUyNScsJ1xcdTA1MjYnOidcXHUwNTI3JywnXFx1MDUyOCc6J1xcdTA1MjknLCdcXHUwNTJBJzonXFx1MDUyQicsJ1xcdTA1MkMnOidcXHUwNTJEJywnXFx1MDUyRSc6J1xcdTA1MkYnLCdcXHUwNTMxJzonXFx1MDU2MScsJ1xcdTA1MzInOidcXHUwNTYyJywnXFx1MDUzMyc6J1xcdTA1NjMnLCdcXHUwNTM0JzonXFx1MDU2NCcsJ1xcdTA1MzUnOidcXHUwNTY1JywnXFx1MDUzNic6J1xcdTA1NjYnLCdcXHUwNTM3JzonXFx1MDU2NycsJ1xcdTA1MzgnOidcXHUwNTY4JywnXFx1MDUzOSc6J1xcdTA1NjknLCdcXHUwNTNBJzonXFx1MDU2QScsJ1xcdTA1M0InOidcXHUwNTZCJywnXFx1MDUzQyc6J1xcdTA1NkMnLCdcXHUwNTNEJzonXFx1MDU2RCcsJ1xcdTA1M0UnOidcXHUwNTZFJywnXFx1MDUzRic6J1xcdTA1NkYnLCdcXHUwNTQwJzonXFx1MDU3MCcsJ1xcdTA1NDEnOidcXHUwNTcxJywnXFx1MDU0Mic6J1xcdTA1NzInLCdcXHUwNTQzJzonXFx1MDU3MycsJ1xcdTA1NDQnOidcXHUwNTc0JywnXFx1MDU0NSc6J1xcdTA1NzUnLCdcXHUwNTQ2JzonXFx1MDU3NicsJ1xcdTA1NDcnOidcXHUwNTc3JywnXFx1MDU0OCc6J1xcdTA1NzgnLCdcXHUwNTQ5JzonXFx1MDU3OScsJ1xcdTA1NEEnOidcXHUwNTdBJywnXFx1MDU0Qic6J1xcdTA1N0InLCdcXHUwNTRDJzonXFx1MDU3QycsJ1xcdTA1NEQnOidcXHUwNTdEJywnXFx1MDU0RSc6J1xcdTA1N0UnLCdcXHUwNTRGJzonXFx1MDU3RicsJ1xcdTA1NTAnOidcXHUwNTgwJywnXFx1MDU1MSc6J1xcdTA1ODEnLCdcXHUwNTUyJzonXFx1MDU4MicsJ1xcdTA1NTMnOidcXHUwNTgzJywnXFx1MDU1NCc6J1xcdTA1ODQnLCdcXHUwNTU1JzonXFx1MDU4NScsJ1xcdTA1NTYnOidcXHUwNTg2JywnXFx1MTBBMCc6J1xcdTJEMDAnLCdcXHUxMEExJzonXFx1MkQwMScsJ1xcdTEwQTInOidcXHUyRDAyJywnXFx1MTBBMyc6J1xcdTJEMDMnLCdcXHUxMEE0JzonXFx1MkQwNCcsJ1xcdTEwQTUnOidcXHUyRDA1JywnXFx1MTBBNic6J1xcdTJEMDYnLCdcXHUxMEE3JzonXFx1MkQwNycsJ1xcdTEwQTgnOidcXHUyRDA4JywnXFx1MTBBOSc6J1xcdTJEMDknLCdcXHUxMEFBJzonXFx1MkQwQScsJ1xcdTEwQUInOidcXHUyRDBCJywnXFx1MTBBQyc6J1xcdTJEMEMnLCdcXHUxMEFEJzonXFx1MkQwRCcsJ1xcdTEwQUUnOidcXHUyRDBFJywnXFx1MTBBRic6J1xcdTJEMEYnLCdcXHUxMEIwJzonXFx1MkQxMCcsJ1xcdTEwQjEnOidcXHUyRDExJywnXFx1MTBCMic6J1xcdTJEMTInLCdcXHUxMEIzJzonXFx1MkQxMycsJ1xcdTEwQjQnOidcXHUyRDE0JywnXFx1MTBCNSc6J1xcdTJEMTUnLCdcXHUxMEI2JzonXFx1MkQxNicsJ1xcdTEwQjcnOidcXHUyRDE3JywnXFx1MTBCOCc6J1xcdTJEMTgnLCdcXHUxMEI5JzonXFx1MkQxOScsJ1xcdTEwQkEnOidcXHUyRDFBJywnXFx1MTBCQic6J1xcdTJEMUInLCdcXHUxMEJDJzonXFx1MkQxQycsJ1xcdTEwQkQnOidcXHUyRDFEJywnXFx1MTBCRSc6J1xcdTJEMUUnLCdcXHUxMEJGJzonXFx1MkQxRicsJ1xcdTEwQzAnOidcXHUyRDIwJywnXFx1MTBDMSc6J1xcdTJEMjEnLCdcXHUxMEMyJzonXFx1MkQyMicsJ1xcdTEwQzMnOidcXHUyRDIzJywnXFx1MTBDNCc6J1xcdTJEMjQnLCdcXHUxMEM1JzonXFx1MkQyNScsJ1xcdTEwQzcnOidcXHUyRDI3JywnXFx1MTBDRCc6J1xcdTJEMkQnLCdcXHUxRTAwJzonXFx1MUUwMScsJ1xcdTFFMDInOidcXHUxRTAzJywnXFx1MUUwNCc6J1xcdTFFMDUnLCdcXHUxRTA2JzonXFx1MUUwNycsJ1xcdTFFMDgnOidcXHUxRTA5JywnXFx1MUUwQSc6J1xcdTFFMEInLCdcXHUxRTBDJzonXFx1MUUwRCcsJ1xcdTFFMEUnOidcXHUxRTBGJywnXFx1MUUxMCc6J1xcdTFFMTEnLCdcXHUxRTEyJzonXFx1MUUxMycsJ1xcdTFFMTQnOidcXHUxRTE1JywnXFx1MUUxNic6J1xcdTFFMTcnLCdcXHUxRTE4JzonXFx1MUUxOScsJ1xcdTFFMUEnOidcXHUxRTFCJywnXFx1MUUxQyc6J1xcdTFFMUQnLCdcXHUxRTFFJzonXFx1MUUxRicsJ1xcdTFFMjAnOidcXHUxRTIxJywnXFx1MUUyMic6J1xcdTFFMjMnLCdcXHUxRTI0JzonXFx1MUUyNScsJ1xcdTFFMjYnOidcXHUxRTI3JywnXFx1MUUyOCc6J1xcdTFFMjknLCdcXHUxRTJBJzonXFx1MUUyQicsJ1xcdTFFMkMnOidcXHUxRTJEJywnXFx1MUUyRSc6J1xcdTFFMkYnLCdcXHUxRTMwJzonXFx1MUUzMScsJ1xcdTFFMzInOidcXHUxRTMzJywnXFx1MUUzNCc6J1xcdTFFMzUnLCdcXHUxRTM2JzonXFx1MUUzNycsJ1xcdTFFMzgnOidcXHUxRTM5JywnXFx1MUUzQSc6J1xcdTFFM0InLCdcXHUxRTNDJzonXFx1MUUzRCcsJ1xcdTFFM0UnOidcXHUxRTNGJywnXFx1MUU0MCc6J1xcdTFFNDEnLCdcXHUxRTQyJzonXFx1MUU0MycsJ1xcdTFFNDQnOidcXHUxRTQ1JywnXFx1MUU0Nic6J1xcdTFFNDcnLCdcXHUxRTQ4JzonXFx1MUU0OScsJ1xcdTFFNEEnOidcXHUxRTRCJywnXFx1MUU0Qyc6J1xcdTFFNEQnLCdcXHUxRTRFJzonXFx1MUU0RicsJ1xcdTFFNTAnOidcXHUxRTUxJywnXFx1MUU1Mic6J1xcdTFFNTMnLCdcXHUxRTU0JzonXFx1MUU1NScsJ1xcdTFFNTYnOidcXHUxRTU3JywnXFx1MUU1OCc6J1xcdTFFNTknLCdcXHUxRTVBJzonXFx1MUU1QicsJ1xcdTFFNUMnOidcXHUxRTVEJywnXFx1MUU1RSc6J1xcdTFFNUYnLCdcXHUxRTYwJzonXFx1MUU2MScsJ1xcdTFFNjInOidcXHUxRTYzJywnXFx1MUU2NCc6J1xcdTFFNjUnLCdcXHUxRTY2JzonXFx1MUU2NycsJ1xcdTFFNjgnOidcXHUxRTY5JywnXFx1MUU2QSc6J1xcdTFFNkInLCdcXHUxRTZDJzonXFx1MUU2RCcsJ1xcdTFFNkUnOidcXHUxRTZGJywnXFx1MUU3MCc6J1xcdTFFNzEnLCdcXHUxRTcyJzonXFx1MUU3MycsJ1xcdTFFNzQnOidcXHUxRTc1JywnXFx1MUU3Nic6J1xcdTFFNzcnLCdcXHUxRTc4JzonXFx1MUU3OScsJ1xcdTFFN0EnOidcXHUxRTdCJywnXFx1MUU3Qyc6J1xcdTFFN0QnLCdcXHUxRTdFJzonXFx1MUU3RicsJ1xcdTFFODAnOidcXHUxRTgxJywnXFx1MUU4Mic6J1xcdTFFODMnLCdcXHUxRTg0JzonXFx1MUU4NScsJ1xcdTFFODYnOidcXHUxRTg3JywnXFx1MUU4OCc6J1xcdTFFODknLCdcXHUxRThBJzonXFx1MUU4QicsJ1xcdTFFOEMnOidcXHUxRThEJywnXFx1MUU4RSc6J1xcdTFFOEYnLCdcXHUxRTkwJzonXFx1MUU5MScsJ1xcdTFFOTInOidcXHUxRTkzJywnXFx1MUU5NCc6J1xcdTFFOTUnLCdcXHUxRTlCJzonXFx1MUU2MScsJ1xcdTFFQTAnOidcXHUxRUExJywnXFx1MUVBMic6J1xcdTFFQTMnLCdcXHUxRUE0JzonXFx1MUVBNScsJ1xcdTFFQTYnOidcXHUxRUE3JywnXFx1MUVBOCc6J1xcdTFFQTknLCdcXHUxRUFBJzonXFx1MUVBQicsJ1xcdTFFQUMnOidcXHUxRUFEJywnXFx1MUVBRSc6J1xcdTFFQUYnLCdcXHUxRUIwJzonXFx1MUVCMScsJ1xcdTFFQjInOidcXHUxRUIzJywnXFx1MUVCNCc6J1xcdTFFQjUnLCdcXHUxRUI2JzonXFx1MUVCNycsJ1xcdTFFQjgnOidcXHUxRUI5JywnXFx1MUVCQSc6J1xcdTFFQkInLCdcXHUxRUJDJzonXFx1MUVCRCcsJ1xcdTFFQkUnOidcXHUxRUJGJywnXFx1MUVDMCc6J1xcdTFFQzEnLCdcXHUxRUMyJzonXFx1MUVDMycsJ1xcdTFFQzQnOidcXHUxRUM1JywnXFx1MUVDNic6J1xcdTFFQzcnLCdcXHUxRUM4JzonXFx1MUVDOScsJ1xcdTFFQ0EnOidcXHUxRUNCJywnXFx1MUVDQyc6J1xcdTFFQ0QnLCdcXHUxRUNFJzonXFx1MUVDRicsJ1xcdTFFRDAnOidcXHUxRUQxJywnXFx1MUVEMic6J1xcdTFFRDMnLCdcXHUxRUQ0JzonXFx1MUVENScsJ1xcdTFFRDYnOidcXHUxRUQ3JywnXFx1MUVEOCc6J1xcdTFFRDknLCdcXHUxRURBJzonXFx1MUVEQicsJ1xcdTFFREMnOidcXHUxRUREJywnXFx1MUVERSc6J1xcdTFFREYnLCdcXHUxRUUwJzonXFx1MUVFMScsJ1xcdTFFRTInOidcXHUxRUUzJywnXFx1MUVFNCc6J1xcdTFFRTUnLCdcXHUxRUU2JzonXFx1MUVFNycsJ1xcdTFFRTgnOidcXHUxRUU5JywnXFx1MUVFQSc6J1xcdTFFRUInLCdcXHUxRUVDJzonXFx1MUVFRCcsJ1xcdTFFRUUnOidcXHUxRUVGJywnXFx1MUVGMCc6J1xcdTFFRjEnLCdcXHUxRUYyJzonXFx1MUVGMycsJ1xcdTFFRjQnOidcXHUxRUY1JywnXFx1MUVGNic6J1xcdTFFRjcnLCdcXHUxRUY4JzonXFx1MUVGOScsJ1xcdTFFRkEnOidcXHUxRUZCJywnXFx1MUVGQyc6J1xcdTFFRkQnLCdcXHUxRUZFJzonXFx1MUVGRicsJ1xcdTFGMDgnOidcXHUxRjAwJywnXFx1MUYwOSc6J1xcdTFGMDEnLCdcXHUxRjBBJzonXFx1MUYwMicsJ1xcdTFGMEInOidcXHUxRjAzJywnXFx1MUYwQyc6J1xcdTFGMDQnLCdcXHUxRjBEJzonXFx1MUYwNScsJ1xcdTFGMEUnOidcXHUxRjA2JywnXFx1MUYwRic6J1xcdTFGMDcnLCdcXHUxRjE4JzonXFx1MUYxMCcsJ1xcdTFGMTknOidcXHUxRjExJywnXFx1MUYxQSc6J1xcdTFGMTInLCdcXHUxRjFCJzonXFx1MUYxMycsJ1xcdTFGMUMnOidcXHUxRjE0JywnXFx1MUYxRCc6J1xcdTFGMTUnLCdcXHUxRjI4JzonXFx1MUYyMCcsJ1xcdTFGMjknOidcXHUxRjIxJywnXFx1MUYyQSc6J1xcdTFGMjInLCdcXHUxRjJCJzonXFx1MUYyMycsJ1xcdTFGMkMnOidcXHUxRjI0JywnXFx1MUYyRCc6J1xcdTFGMjUnLCdcXHUxRjJFJzonXFx1MUYyNicsJ1xcdTFGMkYnOidcXHUxRjI3JywnXFx1MUYzOCc6J1xcdTFGMzAnLCdcXHUxRjM5JzonXFx1MUYzMScsJ1xcdTFGM0EnOidcXHUxRjMyJywnXFx1MUYzQic6J1xcdTFGMzMnLCdcXHUxRjNDJzonXFx1MUYzNCcsJ1xcdTFGM0QnOidcXHUxRjM1JywnXFx1MUYzRSc6J1xcdTFGMzYnLCdcXHUxRjNGJzonXFx1MUYzNycsJ1xcdTFGNDgnOidcXHUxRjQwJywnXFx1MUY0OSc6J1xcdTFGNDEnLCdcXHUxRjRBJzonXFx1MUY0MicsJ1xcdTFGNEInOidcXHUxRjQzJywnXFx1MUY0Qyc6J1xcdTFGNDQnLCdcXHUxRjREJzonXFx1MUY0NScsJ1xcdTFGNTknOidcXHUxRjUxJywnXFx1MUY1Qic6J1xcdTFGNTMnLCdcXHUxRjVEJzonXFx1MUY1NScsJ1xcdTFGNUYnOidcXHUxRjU3JywnXFx1MUY2OCc6J1xcdTFGNjAnLCdcXHUxRjY5JzonXFx1MUY2MScsJ1xcdTFGNkEnOidcXHUxRjYyJywnXFx1MUY2Qic6J1xcdTFGNjMnLCdcXHUxRjZDJzonXFx1MUY2NCcsJ1xcdTFGNkQnOidcXHUxRjY1JywnXFx1MUY2RSc6J1xcdTFGNjYnLCdcXHUxRjZGJzonXFx1MUY2NycsJ1xcdTFGQjgnOidcXHUxRkIwJywnXFx1MUZCOSc6J1xcdTFGQjEnLCdcXHUxRkJBJzonXFx1MUY3MCcsJ1xcdTFGQkInOidcXHUxRjcxJywnXFx1MUZCRSc6J1xcdTAzQjknLCdcXHUxRkM4JzonXFx1MUY3MicsJ1xcdTFGQzknOidcXHUxRjczJywnXFx1MUZDQSc6J1xcdTFGNzQnLCdcXHUxRkNCJzonXFx1MUY3NScsJ1xcdTFGRDgnOidcXHUxRkQwJywnXFx1MUZEOSc6J1xcdTFGRDEnLCdcXHUxRkRBJzonXFx1MUY3NicsJ1xcdTFGREInOidcXHUxRjc3JywnXFx1MUZFOCc6J1xcdTFGRTAnLCdcXHUxRkU5JzonXFx1MUZFMScsJ1xcdTFGRUEnOidcXHUxRjdBJywnXFx1MUZFQic6J1xcdTFGN0InLCdcXHUxRkVDJzonXFx1MUZFNScsJ1xcdTFGRjgnOidcXHUxRjc4JywnXFx1MUZGOSc6J1xcdTFGNzknLCdcXHUxRkZBJzonXFx1MUY3QycsJ1xcdTFGRkInOidcXHUxRjdEJywnXFx1MjEyNic6J1xcdTAzQzknLCdcXHUyMTJBJzonaycsJ1xcdTIxMkInOidcXHhFNScsJ1xcdTIxMzInOidcXHUyMTRFJywnXFx1MjE2MCc6J1xcdTIxNzAnLCdcXHUyMTYxJzonXFx1MjE3MScsJ1xcdTIxNjInOidcXHUyMTcyJywnXFx1MjE2Myc6J1xcdTIxNzMnLCdcXHUyMTY0JzonXFx1MjE3NCcsJ1xcdTIxNjUnOidcXHUyMTc1JywnXFx1MjE2Nic6J1xcdTIxNzYnLCdcXHUyMTY3JzonXFx1MjE3NycsJ1xcdTIxNjgnOidcXHUyMTc4JywnXFx1MjE2OSc6J1xcdTIxNzknLCdcXHUyMTZBJzonXFx1MjE3QScsJ1xcdTIxNkInOidcXHUyMTdCJywnXFx1MjE2Qyc6J1xcdTIxN0MnLCdcXHUyMTZEJzonXFx1MjE3RCcsJ1xcdTIxNkUnOidcXHUyMTdFJywnXFx1MjE2Ric6J1xcdTIxN0YnLCdcXHUyMTgzJzonXFx1MjE4NCcsJ1xcdTI0QjYnOidcXHUyNEQwJywnXFx1MjRCNyc6J1xcdTI0RDEnLCdcXHUyNEI4JzonXFx1MjREMicsJ1xcdTI0QjknOidcXHUyNEQzJywnXFx1MjRCQSc6J1xcdTI0RDQnLCdcXHUyNEJCJzonXFx1MjRENScsJ1xcdTI0QkMnOidcXHUyNEQ2JywnXFx1MjRCRCc6J1xcdTI0RDcnLCdcXHUyNEJFJzonXFx1MjREOCcsJ1xcdTI0QkYnOidcXHUyNEQ5JywnXFx1MjRDMCc6J1xcdTI0REEnLCdcXHUyNEMxJzonXFx1MjREQicsJ1xcdTI0QzInOidcXHUyNERDJywnXFx1MjRDMyc6J1xcdTI0REQnLCdcXHUyNEM0JzonXFx1MjRERScsJ1xcdTI0QzUnOidcXHUyNERGJywnXFx1MjRDNic6J1xcdTI0RTAnLCdcXHUyNEM3JzonXFx1MjRFMScsJ1xcdTI0QzgnOidcXHUyNEUyJywnXFx1MjRDOSc6J1xcdTI0RTMnLCdcXHUyNENBJzonXFx1MjRFNCcsJ1xcdTI0Q0InOidcXHUyNEU1JywnXFx1MjRDQyc6J1xcdTI0RTYnLCdcXHUyNENEJzonXFx1MjRFNycsJ1xcdTI0Q0UnOidcXHUyNEU4JywnXFx1MjRDRic6J1xcdTI0RTknLCdcXHUyQzAwJzonXFx1MkMzMCcsJ1xcdTJDMDEnOidcXHUyQzMxJywnXFx1MkMwMic6J1xcdTJDMzInLCdcXHUyQzAzJzonXFx1MkMzMycsJ1xcdTJDMDQnOidcXHUyQzM0JywnXFx1MkMwNSc6J1xcdTJDMzUnLCdcXHUyQzA2JzonXFx1MkMzNicsJ1xcdTJDMDcnOidcXHUyQzM3JywnXFx1MkMwOCc6J1xcdTJDMzgnLCdcXHUyQzA5JzonXFx1MkMzOScsJ1xcdTJDMEEnOidcXHUyQzNBJywnXFx1MkMwQic6J1xcdTJDM0InLCdcXHUyQzBDJzonXFx1MkMzQycsJ1xcdTJDMEQnOidcXHUyQzNEJywnXFx1MkMwRSc6J1xcdTJDM0UnLCdcXHUyQzBGJzonXFx1MkMzRicsJ1xcdTJDMTAnOidcXHUyQzQwJywnXFx1MkMxMSc6J1xcdTJDNDEnLCdcXHUyQzEyJzonXFx1MkM0MicsJ1xcdTJDMTMnOidcXHUyQzQzJywnXFx1MkMxNCc6J1xcdTJDNDQnLCdcXHUyQzE1JzonXFx1MkM0NScsJ1xcdTJDMTYnOidcXHUyQzQ2JywnXFx1MkMxNyc6J1xcdTJDNDcnLCdcXHUyQzE4JzonXFx1MkM0OCcsJ1xcdTJDMTknOidcXHUyQzQ5JywnXFx1MkMxQSc6J1xcdTJDNEEnLCdcXHUyQzFCJzonXFx1MkM0QicsJ1xcdTJDMUMnOidcXHUyQzRDJywnXFx1MkMxRCc6J1xcdTJDNEQnLCdcXHUyQzFFJzonXFx1MkM0RScsJ1xcdTJDMUYnOidcXHUyQzRGJywnXFx1MkMyMCc6J1xcdTJDNTAnLCdcXHUyQzIxJzonXFx1MkM1MScsJ1xcdTJDMjInOidcXHUyQzUyJywnXFx1MkMyMyc6J1xcdTJDNTMnLCdcXHUyQzI0JzonXFx1MkM1NCcsJ1xcdTJDMjUnOidcXHUyQzU1JywnXFx1MkMyNic6J1xcdTJDNTYnLCdcXHUyQzI3JzonXFx1MkM1NycsJ1xcdTJDMjgnOidcXHUyQzU4JywnXFx1MkMyOSc6J1xcdTJDNTknLCdcXHUyQzJBJzonXFx1MkM1QScsJ1xcdTJDMkInOidcXHUyQzVCJywnXFx1MkMyQyc6J1xcdTJDNUMnLCdcXHUyQzJEJzonXFx1MkM1RCcsJ1xcdTJDMkUnOidcXHUyQzVFJywnXFx1MkM2MCc6J1xcdTJDNjEnLCdcXHUyQzYyJzonXFx1MDI2QicsJ1xcdTJDNjMnOidcXHUxRDdEJywnXFx1MkM2NCc6J1xcdTAyN0QnLCdcXHUyQzY3JzonXFx1MkM2OCcsJ1xcdTJDNjknOidcXHUyQzZBJywnXFx1MkM2Qic6J1xcdTJDNkMnLCdcXHUyQzZEJzonXFx1MDI1MScsJ1xcdTJDNkUnOidcXHUwMjcxJywnXFx1MkM2Ric6J1xcdTAyNTAnLCdcXHUyQzcwJzonXFx1MDI1MicsJ1xcdTJDNzInOidcXHUyQzczJywnXFx1MkM3NSc6J1xcdTJDNzYnLCdcXHUyQzdFJzonXFx1MDIzRicsJ1xcdTJDN0YnOidcXHUwMjQwJywnXFx1MkM4MCc6J1xcdTJDODEnLCdcXHUyQzgyJzonXFx1MkM4MycsJ1xcdTJDODQnOidcXHUyQzg1JywnXFx1MkM4Nic6J1xcdTJDODcnLCdcXHUyQzg4JzonXFx1MkM4OScsJ1xcdTJDOEEnOidcXHUyQzhCJywnXFx1MkM4Qyc6J1xcdTJDOEQnLCdcXHUyQzhFJzonXFx1MkM4RicsJ1xcdTJDOTAnOidcXHUyQzkxJywnXFx1MkM5Mic6J1xcdTJDOTMnLCdcXHUyQzk0JzonXFx1MkM5NScsJ1xcdTJDOTYnOidcXHUyQzk3JywnXFx1MkM5OCc6J1xcdTJDOTknLCdcXHUyQzlBJzonXFx1MkM5QicsJ1xcdTJDOUMnOidcXHUyQzlEJywnXFx1MkM5RSc6J1xcdTJDOUYnLCdcXHUyQ0EwJzonXFx1MkNBMScsJ1xcdTJDQTInOidcXHUyQ0EzJywnXFx1MkNBNCc6J1xcdTJDQTUnLCdcXHUyQ0E2JzonXFx1MkNBNycsJ1xcdTJDQTgnOidcXHUyQ0E5JywnXFx1MkNBQSc6J1xcdTJDQUInLCdcXHUyQ0FDJzonXFx1MkNBRCcsJ1xcdTJDQUUnOidcXHUyQ0FGJywnXFx1MkNCMCc6J1xcdTJDQjEnLCdcXHUyQ0IyJzonXFx1MkNCMycsJ1xcdTJDQjQnOidcXHUyQ0I1JywnXFx1MkNCNic6J1xcdTJDQjcnLCdcXHUyQ0I4JzonXFx1MkNCOScsJ1xcdTJDQkEnOidcXHUyQ0JCJywnXFx1MkNCQyc6J1xcdTJDQkQnLCdcXHUyQ0JFJzonXFx1MkNCRicsJ1xcdTJDQzAnOidcXHUyQ0MxJywnXFx1MkNDMic6J1xcdTJDQzMnLCdcXHUyQ0M0JzonXFx1MkNDNScsJ1xcdTJDQzYnOidcXHUyQ0M3JywnXFx1MkNDOCc6J1xcdTJDQzknLCdcXHUyQ0NBJzonXFx1MkNDQicsJ1xcdTJDQ0MnOidcXHUyQ0NEJywnXFx1MkNDRSc6J1xcdTJDQ0YnLCdcXHUyQ0QwJzonXFx1MkNEMScsJ1xcdTJDRDInOidcXHUyQ0QzJywnXFx1MkNENCc6J1xcdTJDRDUnLCdcXHUyQ0Q2JzonXFx1MkNENycsJ1xcdTJDRDgnOidcXHUyQ0Q5JywnXFx1MkNEQSc6J1xcdTJDREInLCdcXHUyQ0RDJzonXFx1MkNERCcsJ1xcdTJDREUnOidcXHUyQ0RGJywnXFx1MkNFMCc6J1xcdTJDRTEnLCdcXHUyQ0UyJzonXFx1MkNFMycsJ1xcdTJDRUInOidcXHUyQ0VDJywnXFx1MkNFRCc6J1xcdTJDRUUnLCdcXHUyQ0YyJzonXFx1MkNGMycsJ1xcdUE2NDAnOidcXHVBNjQxJywnXFx1QTY0Mic6J1xcdUE2NDMnLCdcXHVBNjQ0JzonXFx1QTY0NScsJ1xcdUE2NDYnOidcXHVBNjQ3JywnXFx1QTY0OCc6J1xcdUE2NDknLCdcXHVBNjRBJzonXFx1QTY0QicsJ1xcdUE2NEMnOidcXHVBNjREJywnXFx1QTY0RSc6J1xcdUE2NEYnLCdcXHVBNjUwJzonXFx1QTY1MScsJ1xcdUE2NTInOidcXHVBNjUzJywnXFx1QTY1NCc6J1xcdUE2NTUnLCdcXHVBNjU2JzonXFx1QTY1NycsJ1xcdUE2NTgnOidcXHVBNjU5JywnXFx1QTY1QSc6J1xcdUE2NUInLCdcXHVBNjVDJzonXFx1QTY1RCcsJ1xcdUE2NUUnOidcXHVBNjVGJywnXFx1QTY2MCc6J1xcdUE2NjEnLCdcXHVBNjYyJzonXFx1QTY2MycsJ1xcdUE2NjQnOidcXHVBNjY1JywnXFx1QTY2Nic6J1xcdUE2NjcnLCdcXHVBNjY4JzonXFx1QTY2OScsJ1xcdUE2NkEnOidcXHVBNjZCJywnXFx1QTY2Qyc6J1xcdUE2NkQnLCdcXHVBNjgwJzonXFx1QTY4MScsJ1xcdUE2ODInOidcXHVBNjgzJywnXFx1QTY4NCc6J1xcdUE2ODUnLCdcXHVBNjg2JzonXFx1QTY4NycsJ1xcdUE2ODgnOidcXHVBNjg5JywnXFx1QTY4QSc6J1xcdUE2OEInLCdcXHVBNjhDJzonXFx1QTY4RCcsJ1xcdUE2OEUnOidcXHVBNjhGJywnXFx1QTY5MCc6J1xcdUE2OTEnLCdcXHVBNjkyJzonXFx1QTY5MycsJ1xcdUE2OTQnOidcXHVBNjk1JywnXFx1QTY5Nic6J1xcdUE2OTcnLCdcXHVBNjk4JzonXFx1QTY5OScsJ1xcdUE2OUEnOidcXHVBNjlCJywnXFx1QTcyMic6J1xcdUE3MjMnLCdcXHVBNzI0JzonXFx1QTcyNScsJ1xcdUE3MjYnOidcXHVBNzI3JywnXFx1QTcyOCc6J1xcdUE3MjknLCdcXHVBNzJBJzonXFx1QTcyQicsJ1xcdUE3MkMnOidcXHVBNzJEJywnXFx1QTcyRSc6J1xcdUE3MkYnLCdcXHVBNzMyJzonXFx1QTczMycsJ1xcdUE3MzQnOidcXHVBNzM1JywnXFx1QTczNic6J1xcdUE3MzcnLCdcXHVBNzM4JzonXFx1QTczOScsJ1xcdUE3M0EnOidcXHVBNzNCJywnXFx1QTczQyc6J1xcdUE3M0QnLCdcXHVBNzNFJzonXFx1QTczRicsJ1xcdUE3NDAnOidcXHVBNzQxJywnXFx1QTc0Mic6J1xcdUE3NDMnLCdcXHVBNzQ0JzonXFx1QTc0NScsJ1xcdUE3NDYnOidcXHVBNzQ3JywnXFx1QTc0OCc6J1xcdUE3NDknLCdcXHVBNzRBJzonXFx1QTc0QicsJ1xcdUE3NEMnOidcXHVBNzREJywnXFx1QTc0RSc6J1xcdUE3NEYnLCdcXHVBNzUwJzonXFx1QTc1MScsJ1xcdUE3NTInOidcXHVBNzUzJywnXFx1QTc1NCc6J1xcdUE3NTUnLCdcXHVBNzU2JzonXFx1QTc1NycsJ1xcdUE3NTgnOidcXHVBNzU5JywnXFx1QTc1QSc6J1xcdUE3NUInLCdcXHVBNzVDJzonXFx1QTc1RCcsJ1xcdUE3NUUnOidcXHVBNzVGJywnXFx1QTc2MCc6J1xcdUE3NjEnLCdcXHVBNzYyJzonXFx1QTc2MycsJ1xcdUE3NjQnOidcXHVBNzY1JywnXFx1QTc2Nic6J1xcdUE3NjcnLCdcXHVBNzY4JzonXFx1QTc2OScsJ1xcdUE3NkEnOidcXHVBNzZCJywnXFx1QTc2Qyc6J1xcdUE3NkQnLCdcXHVBNzZFJzonXFx1QTc2RicsJ1xcdUE3NzknOidcXHVBNzdBJywnXFx1QTc3Qic6J1xcdUE3N0MnLCdcXHVBNzdEJzonXFx1MUQ3OScsJ1xcdUE3N0UnOidcXHVBNzdGJywnXFx1QTc4MCc6J1xcdUE3ODEnLCdcXHVBNzgyJzonXFx1QTc4MycsJ1xcdUE3ODQnOidcXHVBNzg1JywnXFx1QTc4Nic6J1xcdUE3ODcnLCdcXHVBNzhCJzonXFx1QTc4QycsJ1xcdUE3OEQnOidcXHUwMjY1JywnXFx1QTc5MCc6J1xcdUE3OTEnLCdcXHVBNzkyJzonXFx1QTc5MycsJ1xcdUE3OTYnOidcXHVBNzk3JywnXFx1QTc5OCc6J1xcdUE3OTknLCdcXHVBNzlBJzonXFx1QTc5QicsJ1xcdUE3OUMnOidcXHVBNzlEJywnXFx1QTc5RSc6J1xcdUE3OUYnLCdcXHVBN0EwJzonXFx1QTdBMScsJ1xcdUE3QTInOidcXHVBN0EzJywnXFx1QTdBNCc6J1xcdUE3QTUnLCdcXHVBN0E2JzonXFx1QTdBNycsJ1xcdUE3QTgnOidcXHVBN0E5JywnXFx1QTdBQSc6J1xcdTAyNjYnLCdcXHVBN0FCJzonXFx1MDI1QycsJ1xcdUE3QUMnOidcXHUwMjYxJywnXFx1QTdBRCc6J1xcdTAyNkMnLCdcXHVBN0IwJzonXFx1MDI5RScsJ1xcdUE3QjEnOidcXHUwMjg3JywnXFx1RkYyMSc6J1xcdUZGNDEnLCdcXHVGRjIyJzonXFx1RkY0MicsJ1xcdUZGMjMnOidcXHVGRjQzJywnXFx1RkYyNCc6J1xcdUZGNDQnLCdcXHVGRjI1JzonXFx1RkY0NScsJ1xcdUZGMjYnOidcXHVGRjQ2JywnXFx1RkYyNyc6J1xcdUZGNDcnLCdcXHVGRjI4JzonXFx1RkY0OCcsJ1xcdUZGMjknOidcXHVGRjQ5JywnXFx1RkYyQSc6J1xcdUZGNEEnLCdcXHVGRjJCJzonXFx1RkY0QicsJ1xcdUZGMkMnOidcXHVGRjRDJywnXFx1RkYyRCc6J1xcdUZGNEQnLCdcXHVGRjJFJzonXFx1RkY0RScsJ1xcdUZGMkYnOidcXHVGRjRGJywnXFx1RkYzMCc6J1xcdUZGNTAnLCdcXHVGRjMxJzonXFx1RkY1MScsJ1xcdUZGMzInOidcXHVGRjUyJywnXFx1RkYzMyc6J1xcdUZGNTMnLCdcXHVGRjM0JzonXFx1RkY1NCcsJ1xcdUZGMzUnOidcXHVGRjU1JywnXFx1RkYzNic6J1xcdUZGNTYnLCdcXHVGRjM3JzonXFx1RkY1NycsJ1xcdUZGMzgnOidcXHVGRjU4JywnXFx1RkYzOSc6J1xcdUZGNTknLCdcXHVGRjNBJzonXFx1RkY1QScsJ1xcdUQ4MDFcXHVEQzAwJzonXFx1RDgwMVxcdURDMjgnLCdcXHVEODAxXFx1REMwMSc6J1xcdUQ4MDFcXHVEQzI5JywnXFx1RDgwMVxcdURDMDInOidcXHVEODAxXFx1REMyQScsJ1xcdUQ4MDFcXHVEQzAzJzonXFx1RDgwMVxcdURDMkInLCdcXHVEODAxXFx1REMwNCc6J1xcdUQ4MDFcXHVEQzJDJywnXFx1RDgwMVxcdURDMDUnOidcXHVEODAxXFx1REMyRCcsJ1xcdUQ4MDFcXHVEQzA2JzonXFx1RDgwMVxcdURDMkUnLCdcXHVEODAxXFx1REMwNyc6J1xcdUQ4MDFcXHVEQzJGJywnXFx1RDgwMVxcdURDMDgnOidcXHVEODAxXFx1REMzMCcsJ1xcdUQ4MDFcXHVEQzA5JzonXFx1RDgwMVxcdURDMzEnLCdcXHVEODAxXFx1REMwQSc6J1xcdUQ4MDFcXHVEQzMyJywnXFx1RDgwMVxcdURDMEInOidcXHVEODAxXFx1REMzMycsJ1xcdUQ4MDFcXHVEQzBDJzonXFx1RDgwMVxcdURDMzQnLCdcXHVEODAxXFx1REMwRCc6J1xcdUQ4MDFcXHVEQzM1JywnXFx1RDgwMVxcdURDMEUnOidcXHVEODAxXFx1REMzNicsJ1xcdUQ4MDFcXHVEQzBGJzonXFx1RDgwMVxcdURDMzcnLCdcXHVEODAxXFx1REMxMCc6J1xcdUQ4MDFcXHVEQzM4JywnXFx1RDgwMVxcdURDMTEnOidcXHVEODAxXFx1REMzOScsJ1xcdUQ4MDFcXHVEQzEyJzonXFx1RDgwMVxcdURDM0EnLCdcXHVEODAxXFx1REMxMyc6J1xcdUQ4MDFcXHVEQzNCJywnXFx1RDgwMVxcdURDMTQnOidcXHVEODAxXFx1REMzQycsJ1xcdUQ4MDFcXHVEQzE1JzonXFx1RDgwMVxcdURDM0QnLCdcXHVEODAxXFx1REMxNic6J1xcdUQ4MDFcXHVEQzNFJywnXFx1RDgwMVxcdURDMTcnOidcXHVEODAxXFx1REMzRicsJ1xcdUQ4MDFcXHVEQzE4JzonXFx1RDgwMVxcdURDNDAnLCdcXHVEODAxXFx1REMxOSc6J1xcdUQ4MDFcXHVEQzQxJywnXFx1RDgwMVxcdURDMUEnOidcXHVEODAxXFx1REM0MicsJ1xcdUQ4MDFcXHVEQzFCJzonXFx1RDgwMVxcdURDNDMnLCdcXHVEODAxXFx1REMxQyc6J1xcdUQ4MDFcXHVEQzQ0JywnXFx1RDgwMVxcdURDMUQnOidcXHVEODAxXFx1REM0NScsJ1xcdUQ4MDFcXHVEQzFFJzonXFx1RDgwMVxcdURDNDYnLCdcXHVEODAxXFx1REMxRic6J1xcdUQ4MDFcXHVEQzQ3JywnXFx1RDgwMVxcdURDMjAnOidcXHVEODAxXFx1REM0OCcsJ1xcdUQ4MDFcXHVEQzIxJzonXFx1RDgwMVxcdURDNDknLCdcXHVEODAxXFx1REMyMic6J1xcdUQ4MDFcXHVEQzRBJywnXFx1RDgwMVxcdURDMjMnOidcXHVEODAxXFx1REM0QicsJ1xcdUQ4MDFcXHVEQzI0JzonXFx1RDgwMVxcdURDNEMnLCdcXHVEODAxXFx1REMyNSc6J1xcdUQ4MDFcXHVEQzREJywnXFx1RDgwMVxcdURDMjYnOidcXHVEODAxXFx1REM0RScsJ1xcdUQ4MDFcXHVEQzI3JzonXFx1RDgwMVxcdURDNEYnLCdcXHVEODA2XFx1RENBMCc6J1xcdUQ4MDZcXHVEQ0MwJywnXFx1RDgwNlxcdURDQTEnOidcXHVEODA2XFx1RENDMScsJ1xcdUQ4MDZcXHVEQ0EyJzonXFx1RDgwNlxcdURDQzInLCdcXHVEODA2XFx1RENBMyc6J1xcdUQ4MDZcXHVEQ0MzJywnXFx1RDgwNlxcdURDQTQnOidcXHVEODA2XFx1RENDNCcsJ1xcdUQ4MDZcXHVEQ0E1JzonXFx1RDgwNlxcdURDQzUnLCdcXHVEODA2XFx1RENBNic6J1xcdUQ4MDZcXHVEQ0M2JywnXFx1RDgwNlxcdURDQTcnOidcXHVEODA2XFx1RENDNycsJ1xcdUQ4MDZcXHVEQ0E4JzonXFx1RDgwNlxcdURDQzgnLCdcXHVEODA2XFx1RENBOSc6J1xcdUQ4MDZcXHVEQ0M5JywnXFx1RDgwNlxcdURDQUEnOidcXHVEODA2XFx1RENDQScsJ1xcdUQ4MDZcXHVEQ0FCJzonXFx1RDgwNlxcdURDQ0InLCdcXHVEODA2XFx1RENBQyc6J1xcdUQ4MDZcXHVEQ0NDJywnXFx1RDgwNlxcdURDQUQnOidcXHVEODA2XFx1RENDRCcsJ1xcdUQ4MDZcXHVEQ0FFJzonXFx1RDgwNlxcdURDQ0UnLCdcXHVEODA2XFx1RENBRic6J1xcdUQ4MDZcXHVEQ0NGJywnXFx1RDgwNlxcdURDQjAnOidcXHVEODA2XFx1RENEMCcsJ1xcdUQ4MDZcXHVEQ0IxJzonXFx1RDgwNlxcdURDRDEnLCdcXHVEODA2XFx1RENCMic6J1xcdUQ4MDZcXHVEQ0QyJywnXFx1RDgwNlxcdURDQjMnOidcXHVEODA2XFx1RENEMycsJ1xcdUQ4MDZcXHVEQ0I0JzonXFx1RDgwNlxcdURDRDQnLCdcXHVEODA2XFx1RENCNSc6J1xcdUQ4MDZcXHVEQ0Q1JywnXFx1RDgwNlxcdURDQjYnOidcXHVEODA2XFx1RENENicsJ1xcdUQ4MDZcXHVEQ0I3JzonXFx1RDgwNlxcdURDRDcnLCdcXHVEODA2XFx1RENCOCc6J1xcdUQ4MDZcXHVEQ0Q4JywnXFx1RDgwNlxcdURDQjknOidcXHVEODA2XFx1RENEOScsJ1xcdUQ4MDZcXHVEQ0JBJzonXFx1RDgwNlxcdURDREEnLCdcXHVEODA2XFx1RENCQic6J1xcdUQ4MDZcXHVEQ0RCJywnXFx1RDgwNlxcdURDQkMnOidcXHVEODA2XFx1RENEQycsJ1xcdUQ4MDZcXHVEQ0JEJzonXFx1RDgwNlxcdURDREQnLCdcXHVEODA2XFx1RENCRSc6J1xcdUQ4MDZcXHVEQ0RFJywnXFx1RDgwNlxcdURDQkYnOidcXHVEODA2XFx1RENERicsJ1xceERGJzonc3MnLCdcXHUwMTMwJzonaVxcdTAzMDcnLCdcXHUwMTQ5JzonXFx1MDJCQ24nLCdcXHUwMUYwJzonalxcdTAzMEMnLCdcXHUwMzkwJzonXFx1MDNCOVxcdTAzMDhcXHUwMzAxJywnXFx1MDNCMCc6J1xcdTAzQzVcXHUwMzA4XFx1MDMwMScsJ1xcdTA1ODcnOidcXHUwNTY1XFx1MDU4MicsJ1xcdTFFOTYnOidoXFx1MDMzMScsJ1xcdTFFOTcnOid0XFx1MDMwOCcsJ1xcdTFFOTgnOid3XFx1MDMwQScsJ1xcdTFFOTknOid5XFx1MDMwQScsJ1xcdTFFOUEnOidhXFx1MDJCRScsJ1xcdTFFOUUnOidzcycsJ1xcdTFGNTAnOidcXHUwM0M1XFx1MDMxMycsJ1xcdTFGNTInOidcXHUwM0M1XFx1MDMxM1xcdTAzMDAnLCdcXHUxRjU0JzonXFx1MDNDNVxcdTAzMTNcXHUwMzAxJywnXFx1MUY1Nic6J1xcdTAzQzVcXHUwMzEzXFx1MDM0MicsJ1xcdTFGODAnOidcXHUxRjAwXFx1MDNCOScsJ1xcdTFGODEnOidcXHUxRjAxXFx1MDNCOScsJ1xcdTFGODInOidcXHUxRjAyXFx1MDNCOScsJ1xcdTFGODMnOidcXHUxRjAzXFx1MDNCOScsJ1xcdTFGODQnOidcXHUxRjA0XFx1MDNCOScsJ1xcdTFGODUnOidcXHUxRjA1XFx1MDNCOScsJ1xcdTFGODYnOidcXHUxRjA2XFx1MDNCOScsJ1xcdTFGODcnOidcXHUxRjA3XFx1MDNCOScsJ1xcdTFGODgnOidcXHUxRjAwXFx1MDNCOScsJ1xcdTFGODknOidcXHUxRjAxXFx1MDNCOScsJ1xcdTFGOEEnOidcXHUxRjAyXFx1MDNCOScsJ1xcdTFGOEInOidcXHUxRjAzXFx1MDNCOScsJ1xcdTFGOEMnOidcXHUxRjA0XFx1MDNCOScsJ1xcdTFGOEQnOidcXHUxRjA1XFx1MDNCOScsJ1xcdTFGOEUnOidcXHUxRjA2XFx1MDNCOScsJ1xcdTFGOEYnOidcXHUxRjA3XFx1MDNCOScsJ1xcdTFGOTAnOidcXHUxRjIwXFx1MDNCOScsJ1xcdTFGOTEnOidcXHUxRjIxXFx1MDNCOScsJ1xcdTFGOTInOidcXHUxRjIyXFx1MDNCOScsJ1xcdTFGOTMnOidcXHUxRjIzXFx1MDNCOScsJ1xcdTFGOTQnOidcXHUxRjI0XFx1MDNCOScsJ1xcdTFGOTUnOidcXHUxRjI1XFx1MDNCOScsJ1xcdTFGOTYnOidcXHUxRjI2XFx1MDNCOScsJ1xcdTFGOTcnOidcXHUxRjI3XFx1MDNCOScsJ1xcdTFGOTgnOidcXHUxRjIwXFx1MDNCOScsJ1xcdTFGOTknOidcXHUxRjIxXFx1MDNCOScsJ1xcdTFGOUEnOidcXHUxRjIyXFx1MDNCOScsJ1xcdTFGOUInOidcXHUxRjIzXFx1MDNCOScsJ1xcdTFGOUMnOidcXHUxRjI0XFx1MDNCOScsJ1xcdTFGOUQnOidcXHUxRjI1XFx1MDNCOScsJ1xcdTFGOUUnOidcXHUxRjI2XFx1MDNCOScsJ1xcdTFGOUYnOidcXHUxRjI3XFx1MDNCOScsJ1xcdTFGQTAnOidcXHUxRjYwXFx1MDNCOScsJ1xcdTFGQTEnOidcXHUxRjYxXFx1MDNCOScsJ1xcdTFGQTInOidcXHUxRjYyXFx1MDNCOScsJ1xcdTFGQTMnOidcXHUxRjYzXFx1MDNCOScsJ1xcdTFGQTQnOidcXHUxRjY0XFx1MDNCOScsJ1xcdTFGQTUnOidcXHUxRjY1XFx1MDNCOScsJ1xcdTFGQTYnOidcXHUxRjY2XFx1MDNCOScsJ1xcdTFGQTcnOidcXHUxRjY3XFx1MDNCOScsJ1xcdTFGQTgnOidcXHUxRjYwXFx1MDNCOScsJ1xcdTFGQTknOidcXHUxRjYxXFx1MDNCOScsJ1xcdTFGQUEnOidcXHUxRjYyXFx1MDNCOScsJ1xcdTFGQUInOidcXHUxRjYzXFx1MDNCOScsJ1xcdTFGQUMnOidcXHUxRjY0XFx1MDNCOScsJ1xcdTFGQUQnOidcXHUxRjY1XFx1MDNCOScsJ1xcdTFGQUUnOidcXHUxRjY2XFx1MDNCOScsJ1xcdTFGQUYnOidcXHUxRjY3XFx1MDNCOScsJ1xcdTFGQjInOidcXHUxRjcwXFx1MDNCOScsJ1xcdTFGQjMnOidcXHUwM0IxXFx1MDNCOScsJ1xcdTFGQjQnOidcXHUwM0FDXFx1MDNCOScsJ1xcdTFGQjYnOidcXHUwM0IxXFx1MDM0MicsJ1xcdTFGQjcnOidcXHUwM0IxXFx1MDM0MlxcdTAzQjknLCdcXHUxRkJDJzonXFx1MDNCMVxcdTAzQjknLCdcXHUxRkMyJzonXFx1MUY3NFxcdTAzQjknLCdcXHUxRkMzJzonXFx1MDNCN1xcdTAzQjknLCdcXHUxRkM0JzonXFx1MDNBRVxcdTAzQjknLCdcXHUxRkM2JzonXFx1MDNCN1xcdTAzNDInLCdcXHUxRkM3JzonXFx1MDNCN1xcdTAzNDJcXHUwM0I5JywnXFx1MUZDQyc6J1xcdTAzQjdcXHUwM0I5JywnXFx1MUZEMic6J1xcdTAzQjlcXHUwMzA4XFx1MDMwMCcsJ1xcdTFGRDMnOidcXHUwM0I5XFx1MDMwOFxcdTAzMDEnLCdcXHUxRkQ2JzonXFx1MDNCOVxcdTAzNDInLCdcXHUxRkQ3JzonXFx1MDNCOVxcdTAzMDhcXHUwMzQyJywnXFx1MUZFMic6J1xcdTAzQzVcXHUwMzA4XFx1MDMwMCcsJ1xcdTFGRTMnOidcXHUwM0M1XFx1MDMwOFxcdTAzMDEnLCdcXHUxRkU0JzonXFx1MDNDMVxcdTAzMTMnLCdcXHUxRkU2JzonXFx1MDNDNVxcdTAzNDInLCdcXHUxRkU3JzonXFx1MDNDNVxcdTAzMDhcXHUwMzQyJywnXFx1MUZGMic6J1xcdTFGN0NcXHUwM0I5JywnXFx1MUZGMyc6J1xcdTAzQzlcXHUwM0I5JywnXFx1MUZGNCc6J1xcdTAzQ0VcXHUwM0I5JywnXFx1MUZGNic6J1xcdTAzQzlcXHUwMzQyJywnXFx1MUZGNyc6J1xcdTAzQzlcXHUwMzQyXFx1MDNCOScsJ1xcdTFGRkMnOidcXHUwM0M5XFx1MDNCOScsJ1xcdUZCMDAnOidmZicsJ1xcdUZCMDEnOidmaScsJ1xcdUZCMDInOidmbCcsJ1xcdUZCMDMnOidmZmknLCdcXHVGQjA0JzonZmZsJywnXFx1RkIwNSc6J3N0JywnXFx1RkIwNic6J3N0JywnXFx1RkIxMyc6J1xcdTA1NzRcXHUwNTc2JywnXFx1RkIxNCc6J1xcdTA1NzRcXHUwNTY1JywnXFx1RkIxNSc6J1xcdTA1NzRcXHUwNTZCJywnXFx1RkIxNic6J1xcdTA1N0VcXHUwNTc2JywnXFx1RkIxNyc6J1xcdTA1NzRcXHUwNTZEJ307XG5cbi8vIE5vcm1hbGl6ZSByZWZlcmVuY2UgbGFiZWw6IGNvbGxhcHNlIGludGVybmFsIHdoaXRlc3BhY2Vcbi8vIHRvIHNpbmdsZSBzcGFjZSwgcmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgd2hpdGVzcGFjZSwgY2FzZSBmb2xkLlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnNsaWNlKDEsIHN0cmluZy5sZW5ndGggLSAxKS50cmltKCkucmVwbGFjZShyZWdleCwgZnVuY3Rpb24oJDApIHtcbiAgICAgICAgLy8gTm90ZTogdGhlcmUgaXMgbm8gbmVlZCB0byBjaGVjayBgaGFzT3duUHJvcGVydHkoJDApYCBoZXJlLlxuICAgICAgICAvLyBJZiBjaGFyYWN0ZXIgbm90IGZvdW5kIGluIGxvb2t1cCB0YWJsZSwgaXQgbXVzdCBiZSB3aGl0ZXNwYWNlLlxuICAgICAgICByZXR1cm4gbWFwWyQwXSB8fCAnICc7XG4gICAgfSk7XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBSZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXInKTtcblxudmFyIHJlVW5zYWZlUHJvdG9jb2wgPSAvXmphdmFzY3JpcHQ6fHZic2NyaXB0OnxmaWxlOnxkYXRhOi9pO1xudmFyIHJlU2FmZURhdGFQcm90b2NvbCA9IC9eZGF0YTppbWFnZVxcLyg/OnBuZ3xnaWZ8anBlZ3x3ZWJwKS9pO1xuXG52YXIgcG90ZW50aWFsbHlVbnNhZmUgPSBmdW5jdGlvbih1cmwpIHtcbiAgcmV0dXJuIHJlVW5zYWZlUHJvdG9jb2wudGVzdCh1cmwpICYmXG4gICAgICAhcmVTYWZlRGF0YVByb3RvY29sLnRlc3QodXJsKTtcbn07XG5cbi8vIEhlbHBlciBmdW5jdGlvbiB0byBwcm9kdWNlIGFuIEhUTUwgdGFnLlxuZnVuY3Rpb24gdGFnKG5hbWUsIGF0dHJzLCBzZWxmY2xvc2luZykge1xuICBpZiAodGhpcy5kaXNhYmxlVGFncyA+IDApIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdGhpcy5idWZmZXIgKz0gKCc8JyArIG5hbWUpO1xuICBpZiAoYXR0cnMgJiYgYXR0cnMubGVuZ3RoID4gMCkge1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgYXR0cmliO1xuICAgIHdoaWxlICgoYXR0cmliID0gYXR0cnNbaV0pICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHRoaXMuYnVmZmVyICs9ICgnICcgKyBhdHRyaWJbMF0gKyAnPVwiJyArIGF0dHJpYlsxXSArICdcIicpO1xuICAgICAgaSsrO1xuICAgIH1cbiAgfVxuICBpZiAoc2VsZmNsb3NpbmcpIHtcbiAgICB0aGlzLmJ1ZmZlciArPSAnIC8nO1xuICB9XG4gIHRoaXMuYnVmZmVyICs9ICc+JztcbiAgdGhpcy5sYXN0T3V0ID0gJz4nO1xufVxuXG5mdW5jdGlvbiBIdG1sUmVuZGVyZXIob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgLy8gYnkgZGVmYXVsdCwgc29mdCBicmVha3MgYXJlIHJlbmRlcmVkIGFzIG5ld2xpbmVzIGluIEhUTUxcbiAgb3B0aW9ucy5zb2Z0YnJlYWsgPSBvcHRpb25zLnNvZnRicmVhayB8fCAnXFxuJztcbiAgLy8gc2V0IHRvIFwiPGJyIC8+XCIgdG8gbWFrZSB0aGVtIGhhcmQgYnJlYWtzXG4gIC8vIHNldCB0byBcIiBcIiBpZiB5b3Ugd2FudCB0byBpZ25vcmUgbGluZSB3cmFwcGluZyBpbiBzb3VyY2VcblxuICB0aGlzLmRpc2FibGVUYWdzID0gMDtcbiAgdGhpcy5sYXN0T3V0ID0gXCJcXG5cIjtcbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbn1cblxuLyogTm9kZSBtZXRob2RzICovXG5cbmZ1bmN0aW9uIHRleHQobm9kZSkge1xuICB0aGlzLm91dChub2RlLmxpdGVyYWwpO1xufVxuXG5mdW5jdGlvbiBzb2Z0YnJlYWsoKSB7XG4gIHRoaXMubGl0KHRoaXMub3B0aW9ucy5zb2Z0YnJlYWspO1xufVxuXG5mdW5jdGlvbiBsaW5lYnJlYWsoKSB7XG4gIHRoaXMudGFnKCdicicsIFtdLCB0cnVlKTtcbiAgdGhpcy5jcigpO1xufVxuXG5mdW5jdGlvbiBsaW5rKG5vZGUsIGVudGVyaW5nKSB7XG4gIHZhciBhdHRycyA9IHRoaXMuYXR0cnMobm9kZSk7XG4gIGlmIChlbnRlcmluZykge1xuICAgIGlmICghKHRoaXMub3B0aW9ucy5zYWZlICYmIHBvdGVudGlhbGx5VW5zYWZlKG5vZGUuZGVzdGluYXRpb24pKSkge1xuICAgICAgYXR0cnMucHVzaChbJ2hyZWYnLCB0aGlzLmVzYyhub2RlLmRlc3RpbmF0aW9uLCB0cnVlKV0pO1xuICAgIH1cbiAgICBpZiAobm9kZS50aXRsZSkge1xuICAgICAgYXR0cnMucHVzaChbJ3RpdGxlJywgdGhpcy5lc2Mobm9kZS50aXRsZSwgdHJ1ZSldKTtcbiAgICB9XG4gICAgdGhpcy50YWcoJ2EnLCBhdHRycyk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy50YWcoJy9hJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaW1hZ2Uobm9kZSwgZW50ZXJpbmcpIHtcbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgaWYgKHRoaXMuZGlzYWJsZVRhZ3MgPT09IDApIHtcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc2FmZSAmJiBwb3RlbnRpYWxseVVuc2FmZShub2RlLmRlc3RpbmF0aW9uKSkge1xuICAgICAgICB0aGlzLmxpdCgnPGltZyBzcmM9XCJcIiBhbHQ9XCInKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMubGl0KCc8aW1nIHNyYz1cIicgKyB0aGlzLmVzYyhub2RlLmRlc3RpbmF0aW9uLCB0cnVlKSArXG4gICAgICAgICAgICAnXCIgYWx0PVwiJyk7XG4gICAgICB9XG4gICAgfVxuICAgIHRoaXMuZGlzYWJsZVRhZ3MgKz0gMTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmRpc2FibGVUYWdzIC09IDE7XG4gICAgaWYgKHRoaXMuZGlzYWJsZVRhZ3MgPT09IDApIHtcbiAgICAgIGlmIChub2RlLnRpdGxlKSB7XG4gICAgICAgIHRoaXMubGl0KCdcIiB0aXRsZT1cIicgKyB0aGlzLmVzYyhub2RlLnRpdGxlLCB0cnVlKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmxpdCgnXCIgLz4nKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZW1waChub2RlLCBlbnRlcmluZykge1xuICB0aGlzLnRhZyhlbnRlcmluZyA/ICdlbScgOiAnL2VtJyk7XG59XG5cbmZ1bmN0aW9uIHN0cm9uZyhub2RlLCBlbnRlcmluZykge1xuICB0aGlzLnRhZyhlbnRlcmluZyA/ICdzdHJvbmcnIDogJy9zdHJvbmcnKTtcbn1cblxuZnVuY3Rpb24gcGFyYWdyYXBoKG5vZGUsIGVudGVyaW5nKSB7XG4gIHZhciBncmFuZHBhcmVudCA9IG5vZGUucGFyZW50LnBhcmVudFxuICAgICwgYXR0cnMgPSB0aGlzLmF0dHJzKG5vZGUpO1xuICBpZiAoZ3JhbmRwYXJlbnQgIT09IG51bGwgJiZcbiAgICBncmFuZHBhcmVudC50eXBlID09PSAnbGlzdCcpIHtcbiAgICBpZiAoZ3JhbmRwYXJlbnQubGlzdFRpZ2h0KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9XG4gIGlmIChlbnRlcmluZykge1xuICAgIHRoaXMuY3IoKTtcbiAgICB0aGlzLnRhZygncCcsIGF0dHJzKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnRhZygnL3AnKTtcbiAgICB0aGlzLmNyKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaGVhZGluZyhub2RlLCBlbnRlcmluZykge1xuICB2YXIgdGFnbmFtZSA9ICdoJyArIG5vZGUubGV2ZWxcbiAgICAsIGF0dHJzID0gdGhpcy5hdHRycyhub2RlKTtcbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgdGhpcy5jcigpO1xuICAgIHRoaXMudGFnKHRhZ25hbWUsIGF0dHJzKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnRhZygnLycgKyB0YWduYW1lKTtcbiAgICB0aGlzLmNyKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29kZShub2RlKSB7XG4gIHRoaXMudGFnKCdjb2RlJyk7XG4gIHRoaXMub3V0KG5vZGUubGl0ZXJhbCk7XG4gIHRoaXMudGFnKCcvY29kZScpO1xufVxuXG5mdW5jdGlvbiBjb2RlX2Jsb2NrKG5vZGUpIHtcbiAgdmFyIGluZm9fd29yZHMgPSBub2RlLmluZm8gPyBub2RlLmluZm8uc3BsaXQoL1xccysvKSA6IFtdXG4gICAgLCBhdHRycyA9IHRoaXMuYXR0cnMobm9kZSk7XG4gIGlmIChpbmZvX3dvcmRzLmxlbmd0aCA+IDAgJiYgaW5mb193b3Jkc1swXS5sZW5ndGggPiAwKSB7XG4gICAgYXR0cnMucHVzaChbJ2NsYXNzJywgJ2xhbmd1YWdlLScgKyB0aGlzLmVzYyhpbmZvX3dvcmRzWzBdLCB0cnVlKV0pO1xuICB9XG4gIHRoaXMuY3IoKTtcbiAgdGhpcy50YWcoJ3ByZScpO1xuICB0aGlzLnRhZygnY29kZScsIGF0dHJzKTtcbiAgdGhpcy5vdXQobm9kZS5saXRlcmFsKTtcbiAgdGhpcy50YWcoJy9jb2RlJyk7XG4gIHRoaXMudGFnKCcvcHJlJyk7XG4gIHRoaXMuY3IoKTtcbn1cblxuZnVuY3Rpb24gdGhlbWF0aWNfYnJlYWsobm9kZSkge1xuICB2YXIgYXR0cnMgPSB0aGlzLmF0dHJzKG5vZGUpO1xuICB0aGlzLmNyKCk7XG4gIHRoaXMudGFnKCdocicsIGF0dHJzLCB0cnVlKTtcbiAgdGhpcy5jcigpO1xufVxuXG5mdW5jdGlvbiBibG9ja19xdW90ZShub2RlLCBlbnRlcmluZykge1xuICB2YXIgYXR0cnMgPSB0aGlzLmF0dHJzKG5vZGUpO1xuICBpZiAoZW50ZXJpbmcpIHtcbiAgICB0aGlzLmNyKCk7XG4gICAgdGhpcy50YWcoJ2Jsb2NrcXVvdGUnLCBhdHRycyk7XG4gICAgdGhpcy5jcigpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuY3IoKTtcbiAgICB0aGlzLnRhZygnL2Jsb2NrcXVvdGUnKTtcbiAgICB0aGlzLmNyKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gbGlzdChub2RlLCBlbnRlcmluZykge1xuICB2YXIgdGFnbmFtZSA9IG5vZGUubGlzdFR5cGUgPT09ICdidWxsZXQnID8gJ3VsJyA6ICdvbCdcbiAgICAsIGF0dHJzID0gdGhpcy5hdHRycyhub2RlKTtcblxuICBpZiAoZW50ZXJpbmcpIHtcbiAgICB2YXIgc3RhcnQgPSBub2RlLmxpc3RTdGFydDtcbiAgICBpZiAoc3RhcnQgIT09IG51bGwgJiYgc3RhcnQgIT09IDEpIHtcbiAgICAgIGF0dHJzLnB1c2goWydzdGFydCcsIHN0YXJ0LnRvU3RyaW5nKCldKTtcbiAgICB9XG4gICAgdGhpcy5jcigpO1xuICAgIHRoaXMudGFnKHRhZ25hbWUsIGF0dHJzKTtcbiAgICB0aGlzLmNyKCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5jcigpO1xuICAgIHRoaXMudGFnKCcvJyArIHRhZ25hbWUpO1xuICAgIHRoaXMuY3IoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpdGVtKG5vZGUsIGVudGVyaW5nKSB7XG4gIHZhciBhdHRycyA9IHRoaXMuYXR0cnMobm9kZSk7XG4gIGlmIChlbnRlcmluZykge1xuICAgIHRoaXMudGFnKCdsaScsIGF0dHJzKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnRhZygnL2xpJyk7XG4gICAgdGhpcy5jcigpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGh0bWxfaW5saW5lKG5vZGUpIHtcbiAgaWYgKHRoaXMub3B0aW9ucy5zYWZlKSB7XG4gICAgdGhpcy5saXQoJzwhLS0gcmF3IEhUTUwgb21pdHRlZCAtLT4nKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmxpdChub2RlLmxpdGVyYWwpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGh0bWxfYmxvY2sobm9kZSkge1xuICB0aGlzLmNyKCk7XG4gIGlmICh0aGlzLm9wdGlvbnMuc2FmZSkge1xuICAgIHRoaXMubGl0KCc8IS0tIHJhdyBIVE1MIG9taXR0ZWQgLS0+Jyk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5saXQobm9kZS5saXRlcmFsKTtcbiAgfVxuICB0aGlzLmNyKCk7XG59XG5cbmZ1bmN0aW9uIGN1c3RvbV9pbmxpbmUobm9kZSwgZW50ZXJpbmcpIHtcbiAgaWYgKGVudGVyaW5nICYmIG5vZGUub25FbnRlcikge1xuICAgIHRoaXMubGl0KG5vZGUub25FbnRlcik7XG4gIH0gZWxzZSBpZiAoIWVudGVyaW5nICYmIG5vZGUub25FeGl0KSB7XG4gICAgdGhpcy5saXQobm9kZS5vbkV4aXQpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGN1c3RvbV9ibG9jayhub2RlLCBlbnRlcmluZykge1xuICB0aGlzLmNyKCk7XG4gIGlmIChlbnRlcmluZyAmJiBub2RlLm9uRW50ZXIpIHtcbiAgICB0aGlzLmxpdChub2RlLm9uRW50ZXIpO1xuICB9IGVsc2UgaWYgKCFlbnRlcmluZyAmJiBub2RlLm9uRXhpdCkge1xuICAgIHRoaXMubGl0KG5vZGUub25FeGl0KTtcbiAgfVxuICB0aGlzLmNyKCk7XG59XG5cbi8qIEhlbHBlciBtZXRob2RzICovXG5cbmZ1bmN0aW9uIG91dChzKSB7XG4gIHRoaXMubGl0KHRoaXMuZXNjKHMsIGZhbHNlKSk7XG59XG5cbmZ1bmN0aW9uIGF0dHJzIChub2RlKSB7XG4gIHZhciBhdHQgPSBbXTtcbiAgaWYgKHRoaXMub3B0aW9ucy5zb3VyY2Vwb3MpIHtcbiAgICB2YXIgcG9zID0gbm9kZS5zb3VyY2Vwb3M7XG4gICAgaWYgKHBvcykge1xuICAgICAgYXR0LnB1c2goWydkYXRhLXNvdXJjZXBvcycsIFN0cmluZyhwb3NbMF1bMF0pICsgJzonICtcbiAgICAgICAgU3RyaW5nKHBvc1swXVsxXSkgKyAnLScgKyBTdHJpbmcocG9zWzFdWzBdKSArICc6JyArXG4gICAgICAgIFN0cmluZyhwb3NbMV1bMV0pXSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBhdHQ7XG59XG5cbi8vIHF1aWNrIGJyb3dzZXItY29tcGF0aWJsZSBpbmhlcml0YW5jZVxuSHRtbFJlbmRlcmVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVuZGVyZXIucHJvdG90eXBlKTtcblxuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS50ZXh0ID0gdGV4dDtcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuaHRtbF9pbmxpbmUgPSBodG1sX2lubGluZTtcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuaHRtbF9ibG9jayA9IGh0bWxfYmxvY2s7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLnNvZnRicmVhayA9IHNvZnRicmVhaztcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUubGluZWJyZWFrID0gbGluZWJyZWFrO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5saW5rID0gbGluaztcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuaW1hZ2UgPSBpbWFnZTtcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuZW1waCA9IGVtcGg7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLnN0cm9uZyA9IHN0cm9uZztcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUucGFyYWdyYXBoID0gcGFyYWdyYXBoO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5oZWFkaW5nID0gaGVhZGluZztcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuY29kZSA9IGNvZGU7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLmNvZGVfYmxvY2sgPSBjb2RlX2Jsb2NrO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS50aGVtYXRpY19icmVhayA9IHRoZW1hdGljX2JyZWFrO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5ibG9ja19xdW90ZSA9IGJsb2NrX3F1b3RlO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5saXN0ID0gbGlzdDtcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuaXRlbSA9IGl0ZW07XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLmN1c3RvbV9pbmxpbmUgPSBjdXN0b21faW5saW5lO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5jdXN0b21fYmxvY2sgPSBjdXN0b21fYmxvY2s7XG5cbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuZXNjID0gcmVxdWlyZSgnLi4vY29tbW9uJykuZXNjYXBlWG1sO1xuXG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLm91dCA9IG91dDtcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUudGFnID0gdGFnO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5hdHRycyA9IGF0dHJzO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEh0bWxSZW5kZXJlcjtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG5mdW5jdGlvbiBSZW5kZXJlcigpIHt9XG5cbi8qKlxuICogIFdhbGtzIHRoZSBBU1QgYW5kIGNhbGxzIG1lbWJlciBtZXRob2RzIGZvciBlYWNoIE5vZGUgdHlwZS5cbiAqXG4gKiAgQHBhcmFtIGFzdCB7Tm9kZX0gVGhlIHJvb3Qgb2YgdGhlIGFic3RyYWN0IHN5bnRheCB0cmVlLlxuICovXG5mdW5jdGlvbiByZW5kZXIoYXN0KSB7XG4gIHZhciB3YWxrZXIgPSBhc3Qud2Fsa2VyKClcbiAgICAsIGV2ZW50XG4gICAgLCB0eXBlO1xuXG4gIHRoaXMuYnVmZmVyID0gJyc7XG4gIHRoaXMubGFzdE91dCA9ICdcXG4nO1xuXG4gIHdoaWxlKChldmVudCA9IHdhbGtlci5uZXh0KCkpKSB7XG4gICAgdHlwZSA9IGV2ZW50Lm5vZGUudHlwZTtcbiAgICBpZiAodGhpc1t0eXBlXSkge1xuICAgICAgdGhpc1t0eXBlXShldmVudC5ub2RlLCBldmVudC5lbnRlcmluZyk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzLmJ1ZmZlcjtcbn1cblxuLyoqXG4gKiAgQ29uY2F0ZW5hdGUgYSBsaXRlcmFsIHN0cmluZyB0byB0aGUgYnVmZmVyLlxuICpcbiAqICBAcGFyYW0gc3RyIHtTdHJpbmd9IFRoZSBzdHJpbmcgdG8gY29uY2F0ZW5hdGUuXG4gKi9cbmZ1bmN0aW9uIGxpdChzdHIpIHtcbiAgdGhpcy5idWZmZXIgKz0gc3RyO1xuICB0aGlzLmxhc3RPdXQgPSBzdHI7XG59XG5cbi8qKlxuICogIE91dHB1dCBhIG5ld2xpbmUgdG8gdGhlIGJ1ZmZlci5cbiAqL1xuZnVuY3Rpb24gY3IoKSB7XG4gIGlmICh0aGlzLmxhc3RPdXQgIT09ICdcXG4nKSB7XG4gICAgdGhpcy5saXQoJ1xcbicpO1xuICB9XG59XG5cbi8qKlxuICogIENvbmNhdGVuYXRlIGEgc3RyaW5nIHRvIHRoZSBidWZmZXIgcG9zc2libHkgZXNjYXBpbmcgdGhlIGNvbnRlbnQuXG4gKlxuICogIENvbmNyZXRlIHJlbmRlcmVyIGltcGxlbWVudGF0aW9ucyBzaG91bGQgb3ZlcnJpZGUgdGhpcyBtZXRob2QuXG4gKlxuICogIEBwYXJhbSBzdHIge1N0cmluZ30gVGhlIHN0cmluZyB0byBjb25jYXRlbmF0ZS5cbiAqL1xuZnVuY3Rpb24gb3V0KHN0cikge1xuICB0aGlzLmxpdChzdHIpO1xufVxuXG4vKipcbiAqICBFc2NhcGUgYSBzdHJpbmcgZm9yIHRoZSB0YXJnZXQgcmVuZGVyZXIuXG4gKlxuICogIEFic3RyYWN0IGZ1bmN0aW9uIHRoYXQgc2hvdWxkIGJlIGltcGxlbWVudGVkIGJ5IGNvbmNyZXRlIFxuICogIHJlbmRlcmVyIGltcGxlbWVudGF0aW9ucy5cbiAqXG4gKiAgQHBhcmFtIHN0ciB7U3RyaW5nfSBUaGUgc3RyaW5nIHRvIGVzY2FwZS5cbiAqL1xuZnVuY3Rpb24gZXNjKHN0cikge1xuICByZXR1cm4gc3RyO1xufVxuXG5SZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gcmVuZGVyO1xuUmVuZGVyZXIucHJvdG90eXBlLm91dCA9IG91dDtcblJlbmRlcmVyLnByb3RvdHlwZS5saXQgPSBsaXQ7XG5SZW5kZXJlci5wcm90b3R5cGUuY3IgID0gY3I7XG5SZW5kZXJlci5wcm90b3R5cGUuZXNjICA9IGVzYztcblxubW9kdWxlLmV4cG9ydHMgPSBSZW5kZXJlcjtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgUmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyJyk7XG5cbnZhciByZVhNTFRhZyA9IC9cXDxbXj5dKlxcPi87XG5cbmZ1bmN0aW9uIHRvVGFnTmFtZShzKSB7XG4gIHJldHVybiBzLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csIFwiJDFfJDJcIikudG9Mb3dlckNhc2UoKTtcbn1cblxuZnVuY3Rpb24gWG1sUmVuZGVyZXIob3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICB0aGlzLmRpc2FibGVUYWdzID0gMDtcbiAgdGhpcy5sYXN0T3V0ID0gXCJcXG5cIjtcblxuICB0aGlzLmluZGVudExldmVsID0gMDtcbiAgdGhpcy5pbmRlbnQgPSAnICAnO1xuXG4gIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIHJlbmRlcihhc3QpIHtcblxuICB0aGlzLmJ1ZmZlciA9ICcnO1xuXG4gIHZhciBhdHRycztcbiAgdmFyIHRhZ25hbWU7XG4gIHZhciB3YWxrZXIgPSBhc3Qud2Fsa2VyKCk7XG4gIHZhciBldmVudCwgbm9kZSwgZW50ZXJpbmc7XG4gIHZhciBjb250YWluZXI7XG4gIHZhciBzZWxmQ2xvc2luZztcbiAgdmFyIG5vZGV0eXBlO1xuXG4gIHZhciBvcHRpb25zID0gdGhpcy5vcHRpb25zO1xuXG4gIGlmIChvcHRpb25zLnRpbWUpIHsgY29uc29sZS50aW1lKFwicmVuZGVyaW5nXCIpOyB9XG5cbiAgdGhpcy5idWZmZXIgKz0gJzw/eG1sIHZlcnNpb249XCIxLjBcIiBlbmNvZGluZz1cIlVURi04XCI/Plxcbic7XG4gIHRoaXMuYnVmZmVyICs9ICc8IURPQ1RZUEUgZG9jdW1lbnQgU1lTVEVNIFwiQ29tbW9uTWFyay5kdGRcIj5cXG4nO1xuXG4gIHdoaWxlICgoZXZlbnQgPSB3YWxrZXIubmV4dCgpKSkge1xuICAgIGVudGVyaW5nID0gZXZlbnQuZW50ZXJpbmc7XG4gICAgbm9kZSA9IGV2ZW50Lm5vZGU7XG4gICAgbm9kZXR5cGUgPSBub2RlLnR5cGU7XG5cbiAgICBjb250YWluZXIgPSBub2RlLmlzQ29udGFpbmVyO1xuXG4gICAgc2VsZkNsb3NpbmcgPSBub2RldHlwZSA9PT0gJ3RoZW1hdGljX2JyZWFrJ1xuICAgICAgfHwgbm9kZXR5cGUgPT09ICdsaW5lYnJlYWsnXG4gICAgICB8fCBub2RldHlwZSA9PT0gJ3NvZnRicmVhayc7XG5cbiAgICB0YWduYW1lID0gdG9UYWdOYW1lKG5vZGV0eXBlKTtcblxuICAgIGlmIChlbnRlcmluZykge1xuXG4gICAgICAgIGF0dHJzID0gW107XG5cbiAgICAgICAgc3dpdGNoIChub2RldHlwZSkge1xuICAgICAgICAgIGNhc2UgJ2RvY3VtZW50JzpcbiAgICAgICAgICAgIGF0dHJzLnB1c2goWyd4bWxucycsICdodHRwOi8vY29tbW9ubWFyay5vcmcveG1sLzEuMCddKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2xpc3QnOlxuICAgICAgICAgICAgaWYgKG5vZGUubGlzdFR5cGUgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgYXR0cnMucHVzaChbJ3R5cGUnLCBub2RlLmxpc3RUeXBlLnRvTG93ZXJDYXNlKCldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChub2RlLmxpc3RTdGFydCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBhdHRycy5wdXNoKFsnc3RhcnQnLCBTdHJpbmcobm9kZS5saXN0U3RhcnQpXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm9kZS5saXN0VGlnaHQgIT09IG51bGwpIHtcbiAgICAgICAgICAgICAgYXR0cnMucHVzaChbJ3RpZ2h0JywgKG5vZGUubGlzdFRpZ2h0ID8gJ3RydWUnIDogJ2ZhbHNlJyldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciBkZWxpbSA9IG5vZGUubGlzdERlbGltaXRlcjtcbiAgICAgICAgICAgIGlmIChkZWxpbSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICB2YXIgZGVsaW13b3JkID0gJyc7XG4gICAgICAgICAgICAgIGlmIChkZWxpbSA9PT0gJy4nKSB7XG4gICAgICAgICAgICAgICAgZGVsaW13b3JkID0gJ3BlcmlvZCc7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZGVsaW13b3JkID0gJ3BhcmVuJztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBhdHRycy5wdXNoKFsnZGVsaW1pdGVyJywgZGVsaW13b3JkXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdjb2RlX2Jsb2NrJzpcbiAgICAgICAgICAgIGlmIChub2RlLmluZm8pIHtcbiAgICAgICAgICAgICAgYXR0cnMucHVzaChbJ2luZm8nLCBub2RlLmluZm9dKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2hlYWRpbmcnOlxuICAgICAgICAgICAgYXR0cnMucHVzaChbJ2xldmVsJywgU3RyaW5nKG5vZGUubGV2ZWwpXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdsaW5rJzpcbiAgICAgICAgICBjYXNlICdpbWFnZSc6XG4gICAgICAgICAgICBhdHRycy5wdXNoKFsnZGVzdGluYXRpb24nLCBub2RlLmRlc3RpbmF0aW9uXSk7XG4gICAgICAgICAgICBhdHRycy5wdXNoKFsndGl0bGUnLCBub2RlLnRpdGxlXSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdjdXN0b21faW5saW5lJzpcbiAgICAgICAgICBjYXNlICdjdXN0b21fYmxvY2snOlxuICAgICAgICAgICAgYXR0cnMucHVzaChbJ29uX2VudGVyJywgbm9kZS5vbkVudGVyXSk7XG4gICAgICAgICAgICBhdHRycy5wdXNoKFsnb25fZXhpdCcsIG5vZGUub25FeGl0XSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG9wdGlvbnMuc291cmNlcG9zKSB7XG4gICAgICAgICAgdmFyIHBvcyA9IG5vZGUuc291cmNlcG9zO1xuICAgICAgICAgIGlmIChwb3MpIHtcbiAgICAgICAgICAgIGF0dHJzLnB1c2goWydzb3VyY2Vwb3MnLCBTdHJpbmcocG9zWzBdWzBdKSArICc6JyArXG4gICAgICAgICAgICAgIFN0cmluZyhwb3NbMF1bMV0pICsgJy0nICsgU3RyaW5nKHBvc1sxXVswXSkgKyAnOicgK1xuICAgICAgICAgICAgICBTdHJpbmcocG9zWzFdWzFdKV0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY3IoKTtcbiAgICAgICAgdGhpcy5vdXQodGhpcy50YWcodGFnbmFtZSwgYXR0cnMsIHNlbGZDbG9zaW5nKSk7XG4gICAgICAgIGlmIChjb250YWluZXIpIHtcbiAgICAgICAgICB0aGlzLmluZGVudExldmVsICs9IDE7XG4gICAgICAgIH0gZWxzZSBpZiAoIWNvbnRhaW5lciAmJiAhc2VsZkNsb3NpbmcpIHtcbiAgICAgICAgICB2YXIgbGl0ID0gbm9kZS5saXRlcmFsO1xuICAgICAgICAgIGlmIChsaXQpIHtcbiAgICAgICAgICAgIHRoaXMub3V0KHRoaXMuZXNjKGxpdCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLm91dCh0aGlzLnRhZygnLycgKyB0YWduYW1lKSk7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbmRlbnRMZXZlbCAtPSAxO1xuICAgICAgdGhpcy5jcigpO1xuICAgICAgdGhpcy5vdXQodGhpcy50YWcoJy8nICsgdGFnbmFtZSkpO1xuICAgIH1cbiAgfVxuICBpZiAob3B0aW9ucy50aW1lKSB7IGNvbnNvbGUudGltZUVuZChcInJlbmRlcmluZ1wiKTsgfVxuICB0aGlzLmJ1ZmZlciArPSAnXFxuJztcbiAgcmV0dXJuIHRoaXMuYnVmZmVyO1xufVxuXG5mdW5jdGlvbiBvdXQocykge1xuICBpZih0aGlzLmRpc2FibGVUYWdzID4gMCkge1xuICAgIHRoaXMuYnVmZmVyICs9IHMucmVwbGFjZShyZVhNTFRhZywgJycpO1xuICB9ZWxzZXtcbiAgICB0aGlzLmJ1ZmZlciArPSBzO1xuICB9XG4gIHRoaXMubGFzdE91dCA9IHM7XG59XG5cbmZ1bmN0aW9uIGNyKCkge1xuICBpZih0aGlzLmxhc3RPdXQgIT09ICdcXG4nKSB7XG4gICAgdGhpcy5idWZmZXIgKz0gJ1xcbic7XG4gICAgdGhpcy5sYXN0T3V0ID0gJ1xcbic7XG4gICAgZm9yKHZhciBpID0gdGhpcy5pbmRlbnRMZXZlbDsgaSA+IDA7IGktLSkge1xuICAgICAgdGhpcy5idWZmZXIgKz0gdGhpcy5pbmRlbnQ7XG4gICAgfVxuICB9XG59XG5cbi8vIEhlbHBlciBmdW5jdGlvbiB0byBwcm9kdWNlIGFuIFhNTCB0YWcuXG5mdW5jdGlvbiB0YWcobmFtZSwgYXR0cnMsIHNlbGZjbG9zaW5nKSB7XG4gIHZhciByZXN1bHQgPSAnPCcgKyBuYW1lO1xuICBpZihhdHRycyAmJiBhdHRycy5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBhdHRyaWI7XG4gICAgd2hpbGUgKChhdHRyaWIgPSBhdHRyc1tpXSkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVzdWx0ICs9ICcgJyArIGF0dHJpYlswXSArICc9XCInICsgdGhpcy5lc2MoYXR0cmliWzFdKSArICdcIic7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG4gIGlmKHNlbGZjbG9zaW5nKSB7XG4gICAgcmVzdWx0ICs9ICcgLyc7XG4gIH1cbiAgcmVzdWx0ICs9ICc+JztcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gcXVpY2sgYnJvd3Nlci1jb21wYXRpYmxlIGluaGVyaXRhbmNlXG5YbWxSZW5kZXJlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFJlbmRlcmVyLnByb3RvdHlwZSk7XG5cblhtbFJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSByZW5kZXI7XG5YbWxSZW5kZXJlci5wcm90b3R5cGUub3V0ID0gb3V0O1xuWG1sUmVuZGVyZXIucHJvdG90eXBlLmNyID0gY3I7XG5YbWxSZW5kZXJlci5wcm90b3R5cGUudGFnID0gdGFnO1xuWG1sUmVuZGVyZXIucHJvdG90eXBlLmVzYyA9IHJlcXVpcmUoJy4uL2NvbW1vbicpLmVzY2FwZVhtbDtcblxubW9kdWxlLmV4cG9ydHMgPSBYbWxSZW5kZXJlcjtcbiIsIid1c2Ugc3RyaWN0J1xuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSByZWFkeVxuXG5mdW5jdGlvbiByZWFkeSAoY2FsbGJhY2spIHtcbiAgYXNzZXJ0Lm5vdEVxdWFsKHR5cGVvZiBkb2N1bWVudCwgJ3VuZGVmaW5lZCcsICdkb2N1bWVudC1yZWFkeSBvbmx5IHJ1bnMgaW4gdGhlIGJyb3dzZXInKVxuICB2YXIgc3RhdGUgPSBkb2N1bWVudC5yZWFkeVN0YXRlXG4gIGlmIChzdGF0ZSA9PT0gJ2NvbXBsZXRlJyB8fCBzdGF0ZSA9PT0gJ2ludGVyYWN0aXZlJykge1xuICAgIHJldHVybiBzZXRUaW1lb3V0KGNhbGxiYWNrLCAwKVxuICB9XG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGZ1bmN0aW9uIG9uTG9hZCAoKSB7XG4gICAgY2FsbGJhY2soKVxuICB9KVxufVxuIiwidmFyIGVuY29kZSA9IHJlcXVpcmUoXCIuL2xpYi9lbmNvZGUuanNcIiksXG4gICAgZGVjb2RlID0gcmVxdWlyZShcIi4vbGliL2RlY29kZS5qc1wiKTtcblxuZXhwb3J0cy5kZWNvZGUgPSBmdW5jdGlvbihkYXRhLCBsZXZlbCl7XG5cdHJldHVybiAoIWxldmVsIHx8IGxldmVsIDw9IDAgPyBkZWNvZGUuWE1MIDogZGVjb2RlLkhUTUwpKGRhdGEpO1xufTtcblxuZXhwb3J0cy5kZWNvZGVTdHJpY3QgPSBmdW5jdGlvbihkYXRhLCBsZXZlbCl7XG5cdHJldHVybiAoIWxldmVsIHx8IGxldmVsIDw9IDAgPyBkZWNvZGUuWE1MIDogZGVjb2RlLkhUTUxTdHJpY3QpKGRhdGEpO1xufTtcblxuZXhwb3J0cy5lbmNvZGUgPSBmdW5jdGlvbihkYXRhLCBsZXZlbCl7XG5cdHJldHVybiAoIWxldmVsIHx8IGxldmVsIDw9IDAgPyBlbmNvZGUuWE1MIDogZW5jb2RlLkhUTUwpKGRhdGEpO1xufTtcblxuZXhwb3J0cy5lbmNvZGVYTUwgPSBlbmNvZGUuWE1MO1xuXG5leHBvcnRzLmVuY29kZUhUTUw0ID1cbmV4cG9ydHMuZW5jb2RlSFRNTDUgPVxuZXhwb3J0cy5lbmNvZGVIVE1MICA9IGVuY29kZS5IVE1MO1xuXG5leHBvcnRzLmRlY29kZVhNTCA9XG5leHBvcnRzLmRlY29kZVhNTFN0cmljdCA9IGRlY29kZS5YTUw7XG5cbmV4cG9ydHMuZGVjb2RlSFRNTDQgPVxuZXhwb3J0cy5kZWNvZGVIVE1MNSA9XG5leHBvcnRzLmRlY29kZUhUTUwgPSBkZWNvZGUuSFRNTDtcblxuZXhwb3J0cy5kZWNvZGVIVE1MNFN0cmljdCA9XG5leHBvcnRzLmRlY29kZUhUTUw1U3RyaWN0ID1cbmV4cG9ydHMuZGVjb2RlSFRNTFN0cmljdCA9IGRlY29kZS5IVE1MU3RyaWN0O1xuXG5leHBvcnRzLmVzY2FwZSA9IGVuY29kZS5lc2NhcGU7XG4iLCJ2YXIgZW50aXR5TWFwID0gcmVxdWlyZShcIi4uL21hcHMvZW50aXRpZXMuanNvblwiKSxcbiAgICBsZWdhY3lNYXAgPSByZXF1aXJlKFwiLi4vbWFwcy9sZWdhY3kuanNvblwiKSxcbiAgICB4bWxNYXAgICAgPSByZXF1aXJlKFwiLi4vbWFwcy94bWwuanNvblwiKSxcbiAgICBkZWNvZGVDb2RlUG9pbnQgPSByZXF1aXJlKFwiLi9kZWNvZGVfY29kZXBvaW50LmpzXCIpO1xuXG52YXIgZGVjb2RlWE1MU3RyaWN0ICA9IGdldFN0cmljdERlY29kZXIoeG1sTWFwKSxcbiAgICBkZWNvZGVIVE1MU3RyaWN0ID0gZ2V0U3RyaWN0RGVjb2RlcihlbnRpdHlNYXApO1xuXG5mdW5jdGlvbiBnZXRTdHJpY3REZWNvZGVyKG1hcCl7XG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMobWFwKS5qb2luKFwifFwiKSxcblx0ICAgIHJlcGxhY2UgPSBnZXRSZXBsYWNlcihtYXApO1xuXG5cdGtleXMgKz0gXCJ8I1t4WF1bXFxcXGRhLWZBLUZdK3wjXFxcXGQrXCI7XG5cblx0dmFyIHJlID0gbmV3IFJlZ0V4cChcIiYoPzpcIiArIGtleXMgKyBcIik7XCIsIFwiZ1wiKTtcblxuXHRyZXR1cm4gZnVuY3Rpb24oc3RyKXtcblx0XHRyZXR1cm4gU3RyaW5nKHN0cikucmVwbGFjZShyZSwgcmVwbGFjZSk7XG5cdH07XG59XG5cbnZhciBkZWNvZGVIVE1MID0gKGZ1bmN0aW9uKCl7XG5cdHZhciBsZWdhY3kgPSBPYmplY3Qua2V5cyhsZWdhY3lNYXApXG5cdFx0LnNvcnQoc29ydGVyKTtcblxuXHR2YXIga2V5cyA9IE9iamVjdC5rZXlzKGVudGl0eU1hcClcblx0XHQuc29ydChzb3J0ZXIpO1xuXG5cdGZvcih2YXIgaSA9IDAsIGogPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKyl7XG5cdFx0aWYobGVnYWN5W2pdID09PSBrZXlzW2ldKXtcblx0XHRcdGtleXNbaV0gKz0gXCI7P1wiO1xuXHRcdFx0aisrO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRrZXlzW2ldICs9IFwiO1wiO1xuXHRcdH1cblx0fVxuXG5cdHZhciByZSA9IG5ldyBSZWdFeHAoXCImKD86XCIgKyBrZXlzLmpvaW4oXCJ8XCIpICsgXCJ8I1t4WF1bXFxcXGRhLWZBLUZdKzs/fCNcXFxcZCs7PylcIiwgXCJnXCIpLFxuXHQgICAgcmVwbGFjZSA9IGdldFJlcGxhY2VyKGVudGl0eU1hcCk7XG5cblx0ZnVuY3Rpb24gcmVwbGFjZXIoc3RyKXtcblx0XHRpZihzdHIuc3Vic3RyKC0xKSAhPT0gXCI7XCIpIHN0ciArPSBcIjtcIjtcblx0XHRyZXR1cm4gcmVwbGFjZShzdHIpO1xuXHR9XG5cblx0Ly9UT0RPIGNvbnNpZGVyIGNyZWF0aW5nIGEgbWVyZ2VkIG1hcFxuXHRyZXR1cm4gZnVuY3Rpb24oc3RyKXtcblx0XHRyZXR1cm4gU3RyaW5nKHN0cikucmVwbGFjZShyZSwgcmVwbGFjZXIpO1xuXHR9O1xufSgpKTtcblxuZnVuY3Rpb24gc29ydGVyKGEsIGIpe1xuXHRyZXR1cm4gYSA8IGIgPyAxIDogLTE7XG59XG5cbmZ1bmN0aW9uIGdldFJlcGxhY2VyKG1hcCl7XG5cdHJldHVybiBmdW5jdGlvbiByZXBsYWNlKHN0cil7XG5cdFx0aWYoc3RyLmNoYXJBdCgxKSA9PT0gXCIjXCIpe1xuXHRcdFx0aWYoc3RyLmNoYXJBdCgyKSA9PT0gXCJYXCIgfHwgc3RyLmNoYXJBdCgyKSA9PT0gXCJ4XCIpe1xuXHRcdFx0XHRyZXR1cm4gZGVjb2RlQ29kZVBvaW50KHBhcnNlSW50KHN0ci5zdWJzdHIoMyksIDE2KSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gZGVjb2RlQ29kZVBvaW50KHBhcnNlSW50KHN0ci5zdWJzdHIoMiksIDEwKSk7XG5cdFx0fVxuXHRcdHJldHVybiBtYXBbc3RyLnNsaWNlKDEsIC0xKV07XG5cdH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRYTUw6IGRlY29kZVhNTFN0cmljdCxcblx0SFRNTDogZGVjb2RlSFRNTCxcblx0SFRNTFN0cmljdDogZGVjb2RlSFRNTFN0cmljdFxufTsiLCJ2YXIgZGVjb2RlTWFwID0gcmVxdWlyZShcIi4uL21hcHMvZGVjb2RlLmpzb25cIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVjb2RlQ29kZVBvaW50O1xuXG4vLyBtb2RpZmllZCB2ZXJzaW9uIG9mIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXRoaWFzYnluZW5zL2hlL2Jsb2IvbWFzdGVyL3NyYy9oZS5qcyNMOTQtTDExOVxuZnVuY3Rpb24gZGVjb2RlQ29kZVBvaW50KGNvZGVQb2ludCl7XG5cblx0aWYoKGNvZGVQb2ludCA+PSAweEQ4MDAgJiYgY29kZVBvaW50IDw9IDB4REZGRikgfHwgY29kZVBvaW50ID4gMHgxMEZGRkYpe1xuXHRcdHJldHVybiBcIlxcdUZGRkRcIjtcblx0fVxuXG5cdGlmKGNvZGVQb2ludCBpbiBkZWNvZGVNYXApe1xuXHRcdGNvZGVQb2ludCA9IGRlY29kZU1hcFtjb2RlUG9pbnRdO1xuXHR9XG5cblx0dmFyIG91dHB1dCA9IFwiXCI7XG5cblx0aWYoY29kZVBvaW50ID4gMHhGRkZGKXtcblx0XHRjb2RlUG9pbnQgLT0gMHgxMDAwMDtcblx0XHRvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlUG9pbnQgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdGNvZGVQb2ludCA9IDB4REMwMCB8IGNvZGVQb2ludCAmIDB4M0ZGO1xuXHR9XG5cblx0b3V0cHV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZVBvaW50KTtcblx0cmV0dXJuIG91dHB1dDtcbn1cbiIsInZhciBpbnZlcnNlWE1MID0gZ2V0SW52ZXJzZU9iaihyZXF1aXJlKFwiLi4vbWFwcy94bWwuanNvblwiKSksXG4gICAgeG1sUmVwbGFjZXIgPSBnZXRJbnZlcnNlUmVwbGFjZXIoaW52ZXJzZVhNTCk7XG5cbmV4cG9ydHMuWE1MID0gZ2V0SW52ZXJzZShpbnZlcnNlWE1MLCB4bWxSZXBsYWNlcik7XG5cbnZhciBpbnZlcnNlSFRNTCA9IGdldEludmVyc2VPYmoocmVxdWlyZShcIi4uL21hcHMvZW50aXRpZXMuanNvblwiKSksXG4gICAgaHRtbFJlcGxhY2VyID0gZ2V0SW52ZXJzZVJlcGxhY2VyKGludmVyc2VIVE1MKTtcblxuZXhwb3J0cy5IVE1MID0gZ2V0SW52ZXJzZShpbnZlcnNlSFRNTCwgaHRtbFJlcGxhY2VyKTtcblxuZnVuY3Rpb24gZ2V0SW52ZXJzZU9iaihvYmope1xuXHRyZXR1cm4gT2JqZWN0LmtleXMob2JqKS5zb3J0KCkucmVkdWNlKGZ1bmN0aW9uKGludmVyc2UsIG5hbWUpe1xuXHRcdGludmVyc2Vbb2JqW25hbWVdXSA9IFwiJlwiICsgbmFtZSArIFwiO1wiO1xuXHRcdHJldHVybiBpbnZlcnNlO1xuXHR9LCB7fSk7XG59XG5cbmZ1bmN0aW9uIGdldEludmVyc2VSZXBsYWNlcihpbnZlcnNlKXtcblx0dmFyIHNpbmdsZSA9IFtdLFxuXHQgICAgbXVsdGlwbGUgPSBbXTtcblxuXHRPYmplY3Qua2V5cyhpbnZlcnNlKS5mb3JFYWNoKGZ1bmN0aW9uKGspe1xuXHRcdGlmKGsubGVuZ3RoID09PSAxKXtcblx0XHRcdHNpbmdsZS5wdXNoKFwiXFxcXFwiICsgayk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG11bHRpcGxlLnB1c2goayk7XG5cdFx0fVxuXHR9KTtcblxuXHQvL1RPRE8gYWRkIHJhbmdlc1xuXHRtdWx0aXBsZS51bnNoaWZ0KFwiW1wiICsgc2luZ2xlLmpvaW4oXCJcIikgKyBcIl1cIik7XG5cblx0cmV0dXJuIG5ldyBSZWdFeHAobXVsdGlwbGUuam9pbihcInxcIiksIFwiZ1wiKTtcbn1cblxudmFyIHJlX25vbkFTQ0lJID0gL1teXFwwLVxceDdGXS9nLFxuICAgIHJlX2FzdHJhbFN5bWJvbHMgPSAvW1xcdUQ4MDAtXFx1REJGRl1bXFx1REMwMC1cXHVERkZGXS9nO1xuXG5mdW5jdGlvbiBzaW5nbGVDaGFyUmVwbGFjZXIoYyl7XG5cdHJldHVybiBcIiYjeFwiICsgYy5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpICsgXCI7XCI7XG59XG5cbmZ1bmN0aW9uIGFzdHJhbFJlcGxhY2VyKGMpe1xuXHQvLyBodHRwOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nI3N1cnJvZ2F0ZS1mb3JtdWxhZVxuXHR2YXIgaGlnaCA9IGMuY2hhckNvZGVBdCgwKTtcblx0dmFyIGxvdyAgPSBjLmNoYXJDb2RlQXQoMSk7XG5cdHZhciBjb2RlUG9pbnQgPSAoaGlnaCAtIDB4RDgwMCkgKiAweDQwMCArIGxvdyAtIDB4REMwMCArIDB4MTAwMDA7XG5cdHJldHVybiBcIiYjeFwiICsgY29kZVBvaW50LnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpICsgXCI7XCI7XG59XG5cbmZ1bmN0aW9uIGdldEludmVyc2UoaW52ZXJzZSwgcmUpe1xuXHRmdW5jdGlvbiBmdW5jKG5hbWUpe1xuXHRcdHJldHVybiBpbnZlcnNlW25hbWVdO1xuXHR9XG5cblx0cmV0dXJuIGZ1bmN0aW9uKGRhdGEpe1xuXHRcdHJldHVybiBkYXRhXG5cdFx0XHRcdC5yZXBsYWNlKHJlLCBmdW5jKVxuXHRcdFx0XHQucmVwbGFjZShyZV9hc3RyYWxTeW1ib2xzLCBhc3RyYWxSZXBsYWNlcilcblx0XHRcdFx0LnJlcGxhY2UocmVfbm9uQVNDSUksIHNpbmdsZUNoYXJSZXBsYWNlcik7XG5cdH07XG59XG5cbnZhciByZV94bWxDaGFycyA9IGdldEludmVyc2VSZXBsYWNlcihpbnZlcnNlWE1MKTtcblxuZnVuY3Rpb24gZXNjYXBlWE1MKGRhdGEpe1xuXHRyZXR1cm4gZGF0YVxuXHRcdFx0LnJlcGxhY2UocmVfeG1sQ2hhcnMsIHNpbmdsZUNoYXJSZXBsYWNlcilcblx0XHRcdC5yZXBsYWNlKHJlX2FzdHJhbFN5bWJvbHMsIGFzdHJhbFJlcGxhY2VyKVxuXHRcdFx0LnJlcGxhY2UocmVfbm9uQVNDSUksIHNpbmdsZUNoYXJSZXBsYWNlcik7XG59XG5cbmV4cG9ydHMuZXNjYXBlID0gZXNjYXBlWE1MO1xuIiwibW9kdWxlLmV4cG9ydHM9e1wiMFwiOjY1NTMzLFwiMTI4XCI6ODM2NCxcIjEzMFwiOjgyMTgsXCIxMzFcIjo0MDIsXCIxMzJcIjo4MjIyLFwiMTMzXCI6ODIzMCxcIjEzNFwiOjgyMjQsXCIxMzVcIjo4MjI1LFwiMTM2XCI6NzEwLFwiMTM3XCI6ODI0MCxcIjEzOFwiOjM1MixcIjEzOVwiOjgyNDksXCIxNDBcIjozMzgsXCIxNDJcIjozODEsXCIxNDVcIjo4MjE2LFwiMTQ2XCI6ODIxNyxcIjE0N1wiOjgyMjAsXCIxNDhcIjo4MjIxLFwiMTQ5XCI6ODIyNixcIjE1MFwiOjgyMTEsXCIxNTFcIjo4MjEyLFwiMTUyXCI6NzMyLFwiMTUzXCI6ODQ4MixcIjE1NFwiOjM1MyxcIjE1NVwiOjgyNTAsXCIxNTZcIjozMzksXCIxNThcIjozODIsXCIxNTlcIjozNzZ9IiwibW9kdWxlLmV4cG9ydHM9e1wiQWFjdXRlXCI6XCJcXHUwMEMxXCIsXCJhYWN1dGVcIjpcIlxcdTAwRTFcIixcIkFicmV2ZVwiOlwiXFx1MDEwMlwiLFwiYWJyZXZlXCI6XCJcXHUwMTAzXCIsXCJhY1wiOlwiXFx1MjIzRVwiLFwiYWNkXCI6XCJcXHUyMjNGXCIsXCJhY0VcIjpcIlxcdTIyM0VcXHUwMzMzXCIsXCJBY2lyY1wiOlwiXFx1MDBDMlwiLFwiYWNpcmNcIjpcIlxcdTAwRTJcIixcImFjdXRlXCI6XCJcXHUwMEI0XCIsXCJBY3lcIjpcIlxcdTA0MTBcIixcImFjeVwiOlwiXFx1MDQzMFwiLFwiQUVsaWdcIjpcIlxcdTAwQzZcIixcImFlbGlnXCI6XCJcXHUwMEU2XCIsXCJhZlwiOlwiXFx1MjA2MVwiLFwiQWZyXCI6XCJcXHVEODM1XFx1REQwNFwiLFwiYWZyXCI6XCJcXHVEODM1XFx1REQxRVwiLFwiQWdyYXZlXCI6XCJcXHUwMEMwXCIsXCJhZ3JhdmVcIjpcIlxcdTAwRTBcIixcImFsZWZzeW1cIjpcIlxcdTIxMzVcIixcImFsZXBoXCI6XCJcXHUyMTM1XCIsXCJBbHBoYVwiOlwiXFx1MDM5MVwiLFwiYWxwaGFcIjpcIlxcdTAzQjFcIixcIkFtYWNyXCI6XCJcXHUwMTAwXCIsXCJhbWFjclwiOlwiXFx1MDEwMVwiLFwiYW1hbGdcIjpcIlxcdTJBM0ZcIixcImFtcFwiOlwiJlwiLFwiQU1QXCI6XCImXCIsXCJhbmRhbmRcIjpcIlxcdTJBNTVcIixcIkFuZFwiOlwiXFx1MkE1M1wiLFwiYW5kXCI6XCJcXHUyMjI3XCIsXCJhbmRkXCI6XCJcXHUyQTVDXCIsXCJhbmRzbG9wZVwiOlwiXFx1MkE1OFwiLFwiYW5kdlwiOlwiXFx1MkE1QVwiLFwiYW5nXCI6XCJcXHUyMjIwXCIsXCJhbmdlXCI6XCJcXHUyOUE0XCIsXCJhbmdsZVwiOlwiXFx1MjIyMFwiLFwiYW5nbXNkYWFcIjpcIlxcdTI5QThcIixcImFuZ21zZGFiXCI6XCJcXHUyOUE5XCIsXCJhbmdtc2RhY1wiOlwiXFx1MjlBQVwiLFwiYW5nbXNkYWRcIjpcIlxcdTI5QUJcIixcImFuZ21zZGFlXCI6XCJcXHUyOUFDXCIsXCJhbmdtc2RhZlwiOlwiXFx1MjlBRFwiLFwiYW5nbXNkYWdcIjpcIlxcdTI5QUVcIixcImFuZ21zZGFoXCI6XCJcXHUyOUFGXCIsXCJhbmdtc2RcIjpcIlxcdTIyMjFcIixcImFuZ3J0XCI6XCJcXHUyMjFGXCIsXCJhbmdydHZiXCI6XCJcXHUyMkJFXCIsXCJhbmdydHZiZFwiOlwiXFx1Mjk5RFwiLFwiYW5nc3BoXCI6XCJcXHUyMjIyXCIsXCJhbmdzdFwiOlwiXFx1MDBDNVwiLFwiYW5nemFyclwiOlwiXFx1MjM3Q1wiLFwiQW9nb25cIjpcIlxcdTAxMDRcIixcImFvZ29uXCI6XCJcXHUwMTA1XCIsXCJBb3BmXCI6XCJcXHVEODM1XFx1REQzOFwiLFwiYW9wZlwiOlwiXFx1RDgzNVxcdURENTJcIixcImFwYWNpclwiOlwiXFx1MkE2RlwiLFwiYXBcIjpcIlxcdTIyNDhcIixcImFwRVwiOlwiXFx1MkE3MFwiLFwiYXBlXCI6XCJcXHUyMjRBXCIsXCJhcGlkXCI6XCJcXHUyMjRCXCIsXCJhcG9zXCI6XCInXCIsXCJBcHBseUZ1bmN0aW9uXCI6XCJcXHUyMDYxXCIsXCJhcHByb3hcIjpcIlxcdTIyNDhcIixcImFwcHJveGVxXCI6XCJcXHUyMjRBXCIsXCJBcmluZ1wiOlwiXFx1MDBDNVwiLFwiYXJpbmdcIjpcIlxcdTAwRTVcIixcIkFzY3JcIjpcIlxcdUQ4MzVcXHVEQzlDXCIsXCJhc2NyXCI6XCJcXHVEODM1XFx1RENCNlwiLFwiQXNzaWduXCI6XCJcXHUyMjU0XCIsXCJhc3RcIjpcIipcIixcImFzeW1wXCI6XCJcXHUyMjQ4XCIsXCJhc3ltcGVxXCI6XCJcXHUyMjREXCIsXCJBdGlsZGVcIjpcIlxcdTAwQzNcIixcImF0aWxkZVwiOlwiXFx1MDBFM1wiLFwiQXVtbFwiOlwiXFx1MDBDNFwiLFwiYXVtbFwiOlwiXFx1MDBFNFwiLFwiYXdjb25pbnRcIjpcIlxcdTIyMzNcIixcImF3aW50XCI6XCJcXHUyQTExXCIsXCJiYWNrY29uZ1wiOlwiXFx1MjI0Q1wiLFwiYmFja2Vwc2lsb25cIjpcIlxcdTAzRjZcIixcImJhY2twcmltZVwiOlwiXFx1MjAzNVwiLFwiYmFja3NpbVwiOlwiXFx1MjIzRFwiLFwiYmFja3NpbWVxXCI6XCJcXHUyMkNEXCIsXCJCYWNrc2xhc2hcIjpcIlxcdTIyMTZcIixcIkJhcnZcIjpcIlxcdTJBRTdcIixcImJhcnZlZVwiOlwiXFx1MjJCRFwiLFwiYmFyd2VkXCI6XCJcXHUyMzA1XCIsXCJCYXJ3ZWRcIjpcIlxcdTIzMDZcIixcImJhcndlZGdlXCI6XCJcXHUyMzA1XCIsXCJiYnJrXCI6XCJcXHUyM0I1XCIsXCJiYnJrdGJya1wiOlwiXFx1MjNCNlwiLFwiYmNvbmdcIjpcIlxcdTIyNENcIixcIkJjeVwiOlwiXFx1MDQxMVwiLFwiYmN5XCI6XCJcXHUwNDMxXCIsXCJiZHF1b1wiOlwiXFx1MjAxRVwiLFwiYmVjYXVzXCI6XCJcXHUyMjM1XCIsXCJiZWNhdXNlXCI6XCJcXHUyMjM1XCIsXCJCZWNhdXNlXCI6XCJcXHUyMjM1XCIsXCJiZW1wdHl2XCI6XCJcXHUyOUIwXCIsXCJiZXBzaVwiOlwiXFx1MDNGNlwiLFwiYmVybm91XCI6XCJcXHUyMTJDXCIsXCJCZXJub3VsbGlzXCI6XCJcXHUyMTJDXCIsXCJCZXRhXCI6XCJcXHUwMzkyXCIsXCJiZXRhXCI6XCJcXHUwM0IyXCIsXCJiZXRoXCI6XCJcXHUyMTM2XCIsXCJiZXR3ZWVuXCI6XCJcXHUyMjZDXCIsXCJCZnJcIjpcIlxcdUQ4MzVcXHVERDA1XCIsXCJiZnJcIjpcIlxcdUQ4MzVcXHVERDFGXCIsXCJiaWdjYXBcIjpcIlxcdTIyQzJcIixcImJpZ2NpcmNcIjpcIlxcdTI1RUZcIixcImJpZ2N1cFwiOlwiXFx1MjJDM1wiLFwiYmlnb2RvdFwiOlwiXFx1MkEwMFwiLFwiYmlnb3BsdXNcIjpcIlxcdTJBMDFcIixcImJpZ290aW1lc1wiOlwiXFx1MkEwMlwiLFwiYmlnc3FjdXBcIjpcIlxcdTJBMDZcIixcImJpZ3N0YXJcIjpcIlxcdTI2MDVcIixcImJpZ3RyaWFuZ2xlZG93blwiOlwiXFx1MjVCRFwiLFwiYmlndHJpYW5nbGV1cFwiOlwiXFx1MjVCM1wiLFwiYmlndXBsdXNcIjpcIlxcdTJBMDRcIixcImJpZ3ZlZVwiOlwiXFx1MjJDMVwiLFwiYmlnd2VkZ2VcIjpcIlxcdTIyQzBcIixcImJrYXJvd1wiOlwiXFx1MjkwRFwiLFwiYmxhY2tsb3plbmdlXCI6XCJcXHUyOUVCXCIsXCJibGFja3NxdWFyZVwiOlwiXFx1MjVBQVwiLFwiYmxhY2t0cmlhbmdsZVwiOlwiXFx1MjVCNFwiLFwiYmxhY2t0cmlhbmdsZWRvd25cIjpcIlxcdTI1QkVcIixcImJsYWNrdHJpYW5nbGVsZWZ0XCI6XCJcXHUyNUMyXCIsXCJibGFja3RyaWFuZ2xlcmlnaHRcIjpcIlxcdTI1QjhcIixcImJsYW5rXCI6XCJcXHUyNDIzXCIsXCJibGsxMlwiOlwiXFx1MjU5MlwiLFwiYmxrMTRcIjpcIlxcdTI1OTFcIixcImJsazM0XCI6XCJcXHUyNTkzXCIsXCJibG9ja1wiOlwiXFx1MjU4OFwiLFwiYm5lXCI6XCI9XFx1MjBFNVwiLFwiYm5lcXVpdlwiOlwiXFx1MjI2MVxcdTIwRTVcIixcImJOb3RcIjpcIlxcdTJBRURcIixcImJub3RcIjpcIlxcdTIzMTBcIixcIkJvcGZcIjpcIlxcdUQ4MzVcXHVERDM5XCIsXCJib3BmXCI6XCJcXHVEODM1XFx1REQ1M1wiLFwiYm90XCI6XCJcXHUyMkE1XCIsXCJib3R0b21cIjpcIlxcdTIyQTVcIixcImJvd3RpZVwiOlwiXFx1MjJDOFwiLFwiYm94Ym94XCI6XCJcXHUyOUM5XCIsXCJib3hkbFwiOlwiXFx1MjUxMFwiLFwiYm94ZExcIjpcIlxcdTI1NTVcIixcImJveERsXCI6XCJcXHUyNTU2XCIsXCJib3hETFwiOlwiXFx1MjU1N1wiLFwiYm94ZHJcIjpcIlxcdTI1MENcIixcImJveGRSXCI6XCJcXHUyNTUyXCIsXCJib3hEclwiOlwiXFx1MjU1M1wiLFwiYm94RFJcIjpcIlxcdTI1NTRcIixcImJveGhcIjpcIlxcdTI1MDBcIixcImJveEhcIjpcIlxcdTI1NTBcIixcImJveGhkXCI6XCJcXHUyNTJDXCIsXCJib3hIZFwiOlwiXFx1MjU2NFwiLFwiYm94aERcIjpcIlxcdTI1NjVcIixcImJveEhEXCI6XCJcXHUyNTY2XCIsXCJib3hodVwiOlwiXFx1MjUzNFwiLFwiYm94SHVcIjpcIlxcdTI1NjdcIixcImJveGhVXCI6XCJcXHUyNTY4XCIsXCJib3hIVVwiOlwiXFx1MjU2OVwiLFwiYm94bWludXNcIjpcIlxcdTIyOUZcIixcImJveHBsdXNcIjpcIlxcdTIyOUVcIixcImJveHRpbWVzXCI6XCJcXHUyMkEwXCIsXCJib3h1bFwiOlwiXFx1MjUxOFwiLFwiYm94dUxcIjpcIlxcdTI1NUJcIixcImJveFVsXCI6XCJcXHUyNTVDXCIsXCJib3hVTFwiOlwiXFx1MjU1RFwiLFwiYm94dXJcIjpcIlxcdTI1MTRcIixcImJveHVSXCI6XCJcXHUyNTU4XCIsXCJib3hVclwiOlwiXFx1MjU1OVwiLFwiYm94VVJcIjpcIlxcdTI1NUFcIixcImJveHZcIjpcIlxcdTI1MDJcIixcImJveFZcIjpcIlxcdTI1NTFcIixcImJveHZoXCI6XCJcXHUyNTNDXCIsXCJib3h2SFwiOlwiXFx1MjU2QVwiLFwiYm94VmhcIjpcIlxcdTI1NkJcIixcImJveFZIXCI6XCJcXHUyNTZDXCIsXCJib3h2bFwiOlwiXFx1MjUyNFwiLFwiYm94dkxcIjpcIlxcdTI1NjFcIixcImJveFZsXCI6XCJcXHUyNTYyXCIsXCJib3hWTFwiOlwiXFx1MjU2M1wiLFwiYm94dnJcIjpcIlxcdTI1MUNcIixcImJveHZSXCI6XCJcXHUyNTVFXCIsXCJib3hWclwiOlwiXFx1MjU1RlwiLFwiYm94VlJcIjpcIlxcdTI1NjBcIixcImJwcmltZVwiOlwiXFx1MjAzNVwiLFwiYnJldmVcIjpcIlxcdTAyRDhcIixcIkJyZXZlXCI6XCJcXHUwMkQ4XCIsXCJicnZiYXJcIjpcIlxcdTAwQTZcIixcImJzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I3XCIsXCJCc2NyXCI6XCJcXHUyMTJDXCIsXCJic2VtaVwiOlwiXFx1MjA0RlwiLFwiYnNpbVwiOlwiXFx1MjIzRFwiLFwiYnNpbWVcIjpcIlxcdTIyQ0RcIixcImJzb2xiXCI6XCJcXHUyOUM1XCIsXCJic29sXCI6XCJcXFxcXCIsXCJic29saHN1YlwiOlwiXFx1MjdDOFwiLFwiYnVsbFwiOlwiXFx1MjAyMlwiLFwiYnVsbGV0XCI6XCJcXHUyMDIyXCIsXCJidW1wXCI6XCJcXHUyMjRFXCIsXCJidW1wRVwiOlwiXFx1MkFBRVwiLFwiYnVtcGVcIjpcIlxcdTIyNEZcIixcIkJ1bXBlcVwiOlwiXFx1MjI0RVwiLFwiYnVtcGVxXCI6XCJcXHUyMjRGXCIsXCJDYWN1dGVcIjpcIlxcdTAxMDZcIixcImNhY3V0ZVwiOlwiXFx1MDEwN1wiLFwiY2FwYW5kXCI6XCJcXHUyQTQ0XCIsXCJjYXBicmN1cFwiOlwiXFx1MkE0OVwiLFwiY2FwY2FwXCI6XCJcXHUyQTRCXCIsXCJjYXBcIjpcIlxcdTIyMjlcIixcIkNhcFwiOlwiXFx1MjJEMlwiLFwiY2FwY3VwXCI6XCJcXHUyQTQ3XCIsXCJjYXBkb3RcIjpcIlxcdTJBNDBcIixcIkNhcGl0YWxEaWZmZXJlbnRpYWxEXCI6XCJcXHUyMTQ1XCIsXCJjYXBzXCI6XCJcXHUyMjI5XFx1RkUwMFwiLFwiY2FyZXRcIjpcIlxcdTIwNDFcIixcImNhcm9uXCI6XCJcXHUwMkM3XCIsXCJDYXlsZXlzXCI6XCJcXHUyMTJEXCIsXCJjY2Fwc1wiOlwiXFx1MkE0RFwiLFwiQ2Nhcm9uXCI6XCJcXHUwMTBDXCIsXCJjY2Fyb25cIjpcIlxcdTAxMERcIixcIkNjZWRpbFwiOlwiXFx1MDBDN1wiLFwiY2NlZGlsXCI6XCJcXHUwMEU3XCIsXCJDY2lyY1wiOlwiXFx1MDEwOFwiLFwiY2NpcmNcIjpcIlxcdTAxMDlcIixcIkNjb25pbnRcIjpcIlxcdTIyMzBcIixcImNjdXBzXCI6XCJcXHUyQTRDXCIsXCJjY3Vwc3NtXCI6XCJcXHUyQTUwXCIsXCJDZG90XCI6XCJcXHUwMTBBXCIsXCJjZG90XCI6XCJcXHUwMTBCXCIsXCJjZWRpbFwiOlwiXFx1MDBCOFwiLFwiQ2VkaWxsYVwiOlwiXFx1MDBCOFwiLFwiY2VtcHR5dlwiOlwiXFx1MjlCMlwiLFwiY2VudFwiOlwiXFx1MDBBMlwiLFwiY2VudGVyZG90XCI6XCJcXHUwMEI3XCIsXCJDZW50ZXJEb3RcIjpcIlxcdTAwQjdcIixcImNmclwiOlwiXFx1RDgzNVxcdUREMjBcIixcIkNmclwiOlwiXFx1MjEyRFwiLFwiQ0hjeVwiOlwiXFx1MDQyN1wiLFwiY2hjeVwiOlwiXFx1MDQ0N1wiLFwiY2hlY2tcIjpcIlxcdTI3MTNcIixcImNoZWNrbWFya1wiOlwiXFx1MjcxM1wiLFwiQ2hpXCI6XCJcXHUwM0E3XCIsXCJjaGlcIjpcIlxcdTAzQzdcIixcImNpcmNcIjpcIlxcdTAyQzZcIixcImNpcmNlcVwiOlwiXFx1MjI1N1wiLFwiY2lyY2xlYXJyb3dsZWZ0XCI6XCJcXHUyMUJBXCIsXCJjaXJjbGVhcnJvd3JpZ2h0XCI6XCJcXHUyMUJCXCIsXCJjaXJjbGVkYXN0XCI6XCJcXHUyMjlCXCIsXCJjaXJjbGVkY2lyY1wiOlwiXFx1MjI5QVwiLFwiY2lyY2xlZGRhc2hcIjpcIlxcdTIyOURcIixcIkNpcmNsZURvdFwiOlwiXFx1MjI5OVwiLFwiY2lyY2xlZFJcIjpcIlxcdTAwQUVcIixcImNpcmNsZWRTXCI6XCJcXHUyNEM4XCIsXCJDaXJjbGVNaW51c1wiOlwiXFx1MjI5NlwiLFwiQ2lyY2xlUGx1c1wiOlwiXFx1MjI5NVwiLFwiQ2lyY2xlVGltZXNcIjpcIlxcdTIyOTdcIixcImNpclwiOlwiXFx1MjVDQlwiLFwiY2lyRVwiOlwiXFx1MjlDM1wiLFwiY2lyZVwiOlwiXFx1MjI1N1wiLFwiY2lyZm5pbnRcIjpcIlxcdTJBMTBcIixcImNpcm1pZFwiOlwiXFx1MkFFRlwiLFwiY2lyc2NpclwiOlwiXFx1MjlDMlwiLFwiQ2xvY2t3aXNlQ29udG91ckludGVncmFsXCI6XCJcXHUyMjMyXCIsXCJDbG9zZUN1cmx5RG91YmxlUXVvdGVcIjpcIlxcdTIwMURcIixcIkNsb3NlQ3VybHlRdW90ZVwiOlwiXFx1MjAxOVwiLFwiY2x1YnNcIjpcIlxcdTI2NjNcIixcImNsdWJzdWl0XCI6XCJcXHUyNjYzXCIsXCJjb2xvblwiOlwiOlwiLFwiQ29sb25cIjpcIlxcdTIyMzdcIixcIkNvbG9uZVwiOlwiXFx1MkE3NFwiLFwiY29sb25lXCI6XCJcXHUyMjU0XCIsXCJjb2xvbmVxXCI6XCJcXHUyMjU0XCIsXCJjb21tYVwiOlwiLFwiLFwiY29tbWF0XCI6XCJAXCIsXCJjb21wXCI6XCJcXHUyMjAxXCIsXCJjb21wZm5cIjpcIlxcdTIyMThcIixcImNvbXBsZW1lbnRcIjpcIlxcdTIyMDFcIixcImNvbXBsZXhlc1wiOlwiXFx1MjEwMlwiLFwiY29uZ1wiOlwiXFx1MjI0NVwiLFwiY29uZ2RvdFwiOlwiXFx1MkE2RFwiLFwiQ29uZ3J1ZW50XCI6XCJcXHUyMjYxXCIsXCJjb25pbnRcIjpcIlxcdTIyMkVcIixcIkNvbmludFwiOlwiXFx1MjIyRlwiLFwiQ29udG91ckludGVncmFsXCI6XCJcXHUyMjJFXCIsXCJjb3BmXCI6XCJcXHVEODM1XFx1REQ1NFwiLFwiQ29wZlwiOlwiXFx1MjEwMlwiLFwiY29wcm9kXCI6XCJcXHUyMjEwXCIsXCJDb3Byb2R1Y3RcIjpcIlxcdTIyMTBcIixcImNvcHlcIjpcIlxcdTAwQTlcIixcIkNPUFlcIjpcIlxcdTAwQTlcIixcImNvcHlzclwiOlwiXFx1MjExN1wiLFwiQ291bnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbFwiOlwiXFx1MjIzM1wiLFwiY3JhcnJcIjpcIlxcdTIxQjVcIixcImNyb3NzXCI6XCJcXHUyNzE3XCIsXCJDcm9zc1wiOlwiXFx1MkEyRlwiLFwiQ3NjclwiOlwiXFx1RDgzNVxcdURDOUVcIixcImNzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I4XCIsXCJjc3ViXCI6XCJcXHUyQUNGXCIsXCJjc3ViZVwiOlwiXFx1MkFEMVwiLFwiY3N1cFwiOlwiXFx1MkFEMFwiLFwiY3N1cGVcIjpcIlxcdTJBRDJcIixcImN0ZG90XCI6XCJcXHUyMkVGXCIsXCJjdWRhcnJsXCI6XCJcXHUyOTM4XCIsXCJjdWRhcnJyXCI6XCJcXHUyOTM1XCIsXCJjdWVwclwiOlwiXFx1MjJERVwiLFwiY3Vlc2NcIjpcIlxcdTIyREZcIixcImN1bGFyclwiOlwiXFx1MjFCNlwiLFwiY3VsYXJycFwiOlwiXFx1MjkzRFwiLFwiY3VwYnJjYXBcIjpcIlxcdTJBNDhcIixcImN1cGNhcFwiOlwiXFx1MkE0NlwiLFwiQ3VwQ2FwXCI6XCJcXHUyMjREXCIsXCJjdXBcIjpcIlxcdTIyMkFcIixcIkN1cFwiOlwiXFx1MjJEM1wiLFwiY3VwY3VwXCI6XCJcXHUyQTRBXCIsXCJjdXBkb3RcIjpcIlxcdTIyOERcIixcImN1cG9yXCI6XCJcXHUyQTQ1XCIsXCJjdXBzXCI6XCJcXHUyMjJBXFx1RkUwMFwiLFwiY3VyYXJyXCI6XCJcXHUyMUI3XCIsXCJjdXJhcnJtXCI6XCJcXHUyOTNDXCIsXCJjdXJseWVxcHJlY1wiOlwiXFx1MjJERVwiLFwiY3VybHllcXN1Y2NcIjpcIlxcdTIyREZcIixcImN1cmx5dmVlXCI6XCJcXHUyMkNFXCIsXCJjdXJseXdlZGdlXCI6XCJcXHUyMkNGXCIsXCJjdXJyZW5cIjpcIlxcdTAwQTRcIixcImN1cnZlYXJyb3dsZWZ0XCI6XCJcXHUyMUI2XCIsXCJjdXJ2ZWFycm93cmlnaHRcIjpcIlxcdTIxQjdcIixcImN1dmVlXCI6XCJcXHUyMkNFXCIsXCJjdXdlZFwiOlwiXFx1MjJDRlwiLFwiY3djb25pbnRcIjpcIlxcdTIyMzJcIixcImN3aW50XCI6XCJcXHUyMjMxXCIsXCJjeWxjdHlcIjpcIlxcdTIzMkRcIixcImRhZ2dlclwiOlwiXFx1MjAyMFwiLFwiRGFnZ2VyXCI6XCJcXHUyMDIxXCIsXCJkYWxldGhcIjpcIlxcdTIxMzhcIixcImRhcnJcIjpcIlxcdTIxOTNcIixcIkRhcnJcIjpcIlxcdTIxQTFcIixcImRBcnJcIjpcIlxcdTIxRDNcIixcImRhc2hcIjpcIlxcdTIwMTBcIixcIkRhc2h2XCI6XCJcXHUyQUU0XCIsXCJkYXNodlwiOlwiXFx1MjJBM1wiLFwiZGJrYXJvd1wiOlwiXFx1MjkwRlwiLFwiZGJsYWNcIjpcIlxcdTAyRERcIixcIkRjYXJvblwiOlwiXFx1MDEwRVwiLFwiZGNhcm9uXCI6XCJcXHUwMTBGXCIsXCJEY3lcIjpcIlxcdTA0MTRcIixcImRjeVwiOlwiXFx1MDQzNFwiLFwiZGRhZ2dlclwiOlwiXFx1MjAyMVwiLFwiZGRhcnJcIjpcIlxcdTIxQ0FcIixcIkREXCI6XCJcXHUyMTQ1XCIsXCJkZFwiOlwiXFx1MjE0NlwiLFwiRERvdHJhaGRcIjpcIlxcdTI5MTFcIixcImRkb3RzZXFcIjpcIlxcdTJBNzdcIixcImRlZ1wiOlwiXFx1MDBCMFwiLFwiRGVsXCI6XCJcXHUyMjA3XCIsXCJEZWx0YVwiOlwiXFx1MDM5NFwiLFwiZGVsdGFcIjpcIlxcdTAzQjRcIixcImRlbXB0eXZcIjpcIlxcdTI5QjFcIixcImRmaXNodFwiOlwiXFx1Mjk3RlwiLFwiRGZyXCI6XCJcXHVEODM1XFx1REQwN1wiLFwiZGZyXCI6XCJcXHVEODM1XFx1REQyMVwiLFwiZEhhclwiOlwiXFx1Mjk2NVwiLFwiZGhhcmxcIjpcIlxcdTIxQzNcIixcImRoYXJyXCI6XCJcXHUyMUMyXCIsXCJEaWFjcml0aWNhbEFjdXRlXCI6XCJcXHUwMEI0XCIsXCJEaWFjcml0aWNhbERvdFwiOlwiXFx1MDJEOVwiLFwiRGlhY3JpdGljYWxEb3VibGVBY3V0ZVwiOlwiXFx1MDJERFwiLFwiRGlhY3JpdGljYWxHcmF2ZVwiOlwiYFwiLFwiRGlhY3JpdGljYWxUaWxkZVwiOlwiXFx1MDJEQ1wiLFwiZGlhbVwiOlwiXFx1MjJDNFwiLFwiZGlhbW9uZFwiOlwiXFx1MjJDNFwiLFwiRGlhbW9uZFwiOlwiXFx1MjJDNFwiLFwiZGlhbW9uZHN1aXRcIjpcIlxcdTI2NjZcIixcImRpYW1zXCI6XCJcXHUyNjY2XCIsXCJkaWVcIjpcIlxcdTAwQThcIixcIkRpZmZlcmVudGlhbERcIjpcIlxcdTIxNDZcIixcImRpZ2FtbWFcIjpcIlxcdTAzRERcIixcImRpc2luXCI6XCJcXHUyMkYyXCIsXCJkaXZcIjpcIlxcdTAwRjdcIixcImRpdmlkZVwiOlwiXFx1MDBGN1wiLFwiZGl2aWRlb250aW1lc1wiOlwiXFx1MjJDN1wiLFwiZGl2b254XCI6XCJcXHUyMkM3XCIsXCJESmN5XCI6XCJcXHUwNDAyXCIsXCJkamN5XCI6XCJcXHUwNDUyXCIsXCJkbGNvcm5cIjpcIlxcdTIzMUVcIixcImRsY3JvcFwiOlwiXFx1MjMwRFwiLFwiZG9sbGFyXCI6XCIkXCIsXCJEb3BmXCI6XCJcXHVEODM1XFx1REQzQlwiLFwiZG9wZlwiOlwiXFx1RDgzNVxcdURENTVcIixcIkRvdFwiOlwiXFx1MDBBOFwiLFwiZG90XCI6XCJcXHUwMkQ5XCIsXCJEb3REb3RcIjpcIlxcdTIwRENcIixcImRvdGVxXCI6XCJcXHUyMjUwXCIsXCJkb3RlcWRvdFwiOlwiXFx1MjI1MVwiLFwiRG90RXF1YWxcIjpcIlxcdTIyNTBcIixcImRvdG1pbnVzXCI6XCJcXHUyMjM4XCIsXCJkb3RwbHVzXCI6XCJcXHUyMjE0XCIsXCJkb3RzcXVhcmVcIjpcIlxcdTIyQTFcIixcImRvdWJsZWJhcndlZGdlXCI6XCJcXHUyMzA2XCIsXCJEb3VibGVDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMkZcIixcIkRvdWJsZURvdFwiOlwiXFx1MDBBOFwiLFwiRG91YmxlRG93bkFycm93XCI6XCJcXHUyMUQzXCIsXCJEb3VibGVMZWZ0QXJyb3dcIjpcIlxcdTIxRDBcIixcIkRvdWJsZUxlZnRSaWdodEFycm93XCI6XCJcXHUyMUQ0XCIsXCJEb3VibGVMZWZ0VGVlXCI6XCJcXHUyQUU0XCIsXCJEb3VibGVMb25nTGVmdEFycm93XCI6XCJcXHUyN0Y4XCIsXCJEb3VibGVMb25nTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTI3RkFcIixcIkRvdWJsZUxvbmdSaWdodEFycm93XCI6XCJcXHUyN0Y5XCIsXCJEb3VibGVSaWdodEFycm93XCI6XCJcXHUyMUQyXCIsXCJEb3VibGVSaWdodFRlZVwiOlwiXFx1MjJBOFwiLFwiRG91YmxlVXBBcnJvd1wiOlwiXFx1MjFEMVwiLFwiRG91YmxlVXBEb3duQXJyb3dcIjpcIlxcdTIxRDVcIixcIkRvdWJsZVZlcnRpY2FsQmFyXCI6XCJcXHUyMjI1XCIsXCJEb3duQXJyb3dCYXJcIjpcIlxcdTI5MTNcIixcImRvd25hcnJvd1wiOlwiXFx1MjE5M1wiLFwiRG93bkFycm93XCI6XCJcXHUyMTkzXCIsXCJEb3duYXJyb3dcIjpcIlxcdTIxRDNcIixcIkRvd25BcnJvd1VwQXJyb3dcIjpcIlxcdTIxRjVcIixcIkRvd25CcmV2ZVwiOlwiXFx1MDMxMVwiLFwiZG93bmRvd25hcnJvd3NcIjpcIlxcdTIxQ0FcIixcImRvd25oYXJwb29ubGVmdFwiOlwiXFx1MjFDM1wiLFwiZG93bmhhcnBvb25yaWdodFwiOlwiXFx1MjFDMlwiLFwiRG93bkxlZnRSaWdodFZlY3RvclwiOlwiXFx1Mjk1MFwiLFwiRG93bkxlZnRUZWVWZWN0b3JcIjpcIlxcdTI5NUVcIixcIkRvd25MZWZ0VmVjdG9yQmFyXCI6XCJcXHUyOTU2XCIsXCJEb3duTGVmdFZlY3RvclwiOlwiXFx1MjFCRFwiLFwiRG93blJpZ2h0VGVlVmVjdG9yXCI6XCJcXHUyOTVGXCIsXCJEb3duUmlnaHRWZWN0b3JCYXJcIjpcIlxcdTI5NTdcIixcIkRvd25SaWdodFZlY3RvclwiOlwiXFx1MjFDMVwiLFwiRG93blRlZUFycm93XCI6XCJcXHUyMUE3XCIsXCJEb3duVGVlXCI6XCJcXHUyMkE0XCIsXCJkcmJrYXJvd1wiOlwiXFx1MjkxMFwiLFwiZHJjb3JuXCI6XCJcXHUyMzFGXCIsXCJkcmNyb3BcIjpcIlxcdTIzMENcIixcIkRzY3JcIjpcIlxcdUQ4MzVcXHVEQzlGXCIsXCJkc2NyXCI6XCJcXHVEODM1XFx1RENCOVwiLFwiRFNjeVwiOlwiXFx1MDQwNVwiLFwiZHNjeVwiOlwiXFx1MDQ1NVwiLFwiZHNvbFwiOlwiXFx1MjlGNlwiLFwiRHN0cm9rXCI6XCJcXHUwMTEwXCIsXCJkc3Ryb2tcIjpcIlxcdTAxMTFcIixcImR0ZG90XCI6XCJcXHUyMkYxXCIsXCJkdHJpXCI6XCJcXHUyNUJGXCIsXCJkdHJpZlwiOlwiXFx1MjVCRVwiLFwiZHVhcnJcIjpcIlxcdTIxRjVcIixcImR1aGFyXCI6XCJcXHUyOTZGXCIsXCJkd2FuZ2xlXCI6XCJcXHUyOUE2XCIsXCJEWmN5XCI6XCJcXHUwNDBGXCIsXCJkemN5XCI6XCJcXHUwNDVGXCIsXCJkemlncmFyclwiOlwiXFx1MjdGRlwiLFwiRWFjdXRlXCI6XCJcXHUwMEM5XCIsXCJlYWN1dGVcIjpcIlxcdTAwRTlcIixcImVhc3RlclwiOlwiXFx1MkE2RVwiLFwiRWNhcm9uXCI6XCJcXHUwMTFBXCIsXCJlY2Fyb25cIjpcIlxcdTAxMUJcIixcIkVjaXJjXCI6XCJcXHUwMENBXCIsXCJlY2lyY1wiOlwiXFx1MDBFQVwiLFwiZWNpclwiOlwiXFx1MjI1NlwiLFwiZWNvbG9uXCI6XCJcXHUyMjU1XCIsXCJFY3lcIjpcIlxcdTA0MkRcIixcImVjeVwiOlwiXFx1MDQ0RFwiLFwiZUREb3RcIjpcIlxcdTJBNzdcIixcIkVkb3RcIjpcIlxcdTAxMTZcIixcImVkb3RcIjpcIlxcdTAxMTdcIixcImVEb3RcIjpcIlxcdTIyNTFcIixcImVlXCI6XCJcXHUyMTQ3XCIsXCJlZkRvdFwiOlwiXFx1MjI1MlwiLFwiRWZyXCI6XCJcXHVEODM1XFx1REQwOFwiLFwiZWZyXCI6XCJcXHVEODM1XFx1REQyMlwiLFwiZWdcIjpcIlxcdTJBOUFcIixcIkVncmF2ZVwiOlwiXFx1MDBDOFwiLFwiZWdyYXZlXCI6XCJcXHUwMEU4XCIsXCJlZ3NcIjpcIlxcdTJBOTZcIixcImVnc2RvdFwiOlwiXFx1MkE5OFwiLFwiZWxcIjpcIlxcdTJBOTlcIixcIkVsZW1lbnRcIjpcIlxcdTIyMDhcIixcImVsaW50ZXJzXCI6XCJcXHUyM0U3XCIsXCJlbGxcIjpcIlxcdTIxMTNcIixcImVsc1wiOlwiXFx1MkE5NVwiLFwiZWxzZG90XCI6XCJcXHUyQTk3XCIsXCJFbWFjclwiOlwiXFx1MDExMlwiLFwiZW1hY3JcIjpcIlxcdTAxMTNcIixcImVtcHR5XCI6XCJcXHUyMjA1XCIsXCJlbXB0eXNldFwiOlwiXFx1MjIwNVwiLFwiRW1wdHlTbWFsbFNxdWFyZVwiOlwiXFx1MjVGQlwiLFwiZW1wdHl2XCI6XCJcXHUyMjA1XCIsXCJFbXB0eVZlcnlTbWFsbFNxdWFyZVwiOlwiXFx1MjVBQlwiLFwiZW1zcDEzXCI6XCJcXHUyMDA0XCIsXCJlbXNwMTRcIjpcIlxcdTIwMDVcIixcImVtc3BcIjpcIlxcdTIwMDNcIixcIkVOR1wiOlwiXFx1MDE0QVwiLFwiZW5nXCI6XCJcXHUwMTRCXCIsXCJlbnNwXCI6XCJcXHUyMDAyXCIsXCJFb2dvblwiOlwiXFx1MDExOFwiLFwiZW9nb25cIjpcIlxcdTAxMTlcIixcIkVvcGZcIjpcIlxcdUQ4MzVcXHVERDNDXCIsXCJlb3BmXCI6XCJcXHVEODM1XFx1REQ1NlwiLFwiZXBhclwiOlwiXFx1MjJENVwiLFwiZXBhcnNsXCI6XCJcXHUyOUUzXCIsXCJlcGx1c1wiOlwiXFx1MkE3MVwiLFwiZXBzaVwiOlwiXFx1MDNCNVwiLFwiRXBzaWxvblwiOlwiXFx1MDM5NVwiLFwiZXBzaWxvblwiOlwiXFx1MDNCNVwiLFwiZXBzaXZcIjpcIlxcdTAzRjVcIixcImVxY2lyY1wiOlwiXFx1MjI1NlwiLFwiZXFjb2xvblwiOlwiXFx1MjI1NVwiLFwiZXFzaW1cIjpcIlxcdTIyNDJcIixcImVxc2xhbnRndHJcIjpcIlxcdTJBOTZcIixcImVxc2xhbnRsZXNzXCI6XCJcXHUyQTk1XCIsXCJFcXVhbFwiOlwiXFx1MkE3NVwiLFwiZXF1YWxzXCI6XCI9XCIsXCJFcXVhbFRpbGRlXCI6XCJcXHUyMjQyXCIsXCJlcXVlc3RcIjpcIlxcdTIyNUZcIixcIkVxdWlsaWJyaXVtXCI6XCJcXHUyMUNDXCIsXCJlcXVpdlwiOlwiXFx1MjI2MVwiLFwiZXF1aXZERFwiOlwiXFx1MkE3OFwiLFwiZXF2cGFyc2xcIjpcIlxcdTI5RTVcIixcImVyYXJyXCI6XCJcXHUyOTcxXCIsXCJlckRvdFwiOlwiXFx1MjI1M1wiLFwiZXNjclwiOlwiXFx1MjEyRlwiLFwiRXNjclwiOlwiXFx1MjEzMFwiLFwiZXNkb3RcIjpcIlxcdTIyNTBcIixcIkVzaW1cIjpcIlxcdTJBNzNcIixcImVzaW1cIjpcIlxcdTIyNDJcIixcIkV0YVwiOlwiXFx1MDM5N1wiLFwiZXRhXCI6XCJcXHUwM0I3XCIsXCJFVEhcIjpcIlxcdTAwRDBcIixcImV0aFwiOlwiXFx1MDBGMFwiLFwiRXVtbFwiOlwiXFx1MDBDQlwiLFwiZXVtbFwiOlwiXFx1MDBFQlwiLFwiZXVyb1wiOlwiXFx1MjBBQ1wiLFwiZXhjbFwiOlwiIVwiLFwiZXhpc3RcIjpcIlxcdTIyMDNcIixcIkV4aXN0c1wiOlwiXFx1MjIwM1wiLFwiZXhwZWN0YXRpb25cIjpcIlxcdTIxMzBcIixcImV4cG9uZW50aWFsZVwiOlwiXFx1MjE0N1wiLFwiRXhwb25lbnRpYWxFXCI6XCJcXHUyMTQ3XCIsXCJmYWxsaW5nZG90c2VxXCI6XCJcXHUyMjUyXCIsXCJGY3lcIjpcIlxcdTA0MjRcIixcImZjeVwiOlwiXFx1MDQ0NFwiLFwiZmVtYWxlXCI6XCJcXHUyNjQwXCIsXCJmZmlsaWdcIjpcIlxcdUZCMDNcIixcImZmbGlnXCI6XCJcXHVGQjAwXCIsXCJmZmxsaWdcIjpcIlxcdUZCMDRcIixcIkZmclwiOlwiXFx1RDgzNVxcdUREMDlcIixcImZmclwiOlwiXFx1RDgzNVxcdUREMjNcIixcImZpbGlnXCI6XCJcXHVGQjAxXCIsXCJGaWxsZWRTbWFsbFNxdWFyZVwiOlwiXFx1MjVGQ1wiLFwiRmlsbGVkVmVyeVNtYWxsU3F1YXJlXCI6XCJcXHUyNUFBXCIsXCJmamxpZ1wiOlwiZmpcIixcImZsYXRcIjpcIlxcdTI2NkRcIixcImZsbGlnXCI6XCJcXHVGQjAyXCIsXCJmbHRuc1wiOlwiXFx1MjVCMVwiLFwiZm5vZlwiOlwiXFx1MDE5MlwiLFwiRm9wZlwiOlwiXFx1RDgzNVxcdUREM0RcIixcImZvcGZcIjpcIlxcdUQ4MzVcXHVERDU3XCIsXCJmb3JhbGxcIjpcIlxcdTIyMDBcIixcIkZvckFsbFwiOlwiXFx1MjIwMFwiLFwiZm9ya1wiOlwiXFx1MjJENFwiLFwiZm9ya3ZcIjpcIlxcdTJBRDlcIixcIkZvdXJpZXJ0cmZcIjpcIlxcdTIxMzFcIixcImZwYXJ0aW50XCI6XCJcXHUyQTBEXCIsXCJmcmFjMTJcIjpcIlxcdTAwQkRcIixcImZyYWMxM1wiOlwiXFx1MjE1M1wiLFwiZnJhYzE0XCI6XCJcXHUwMEJDXCIsXCJmcmFjMTVcIjpcIlxcdTIxNTVcIixcImZyYWMxNlwiOlwiXFx1MjE1OVwiLFwiZnJhYzE4XCI6XCJcXHUyMTVCXCIsXCJmcmFjMjNcIjpcIlxcdTIxNTRcIixcImZyYWMyNVwiOlwiXFx1MjE1NlwiLFwiZnJhYzM0XCI6XCJcXHUwMEJFXCIsXCJmcmFjMzVcIjpcIlxcdTIxNTdcIixcImZyYWMzOFwiOlwiXFx1MjE1Q1wiLFwiZnJhYzQ1XCI6XCJcXHUyMTU4XCIsXCJmcmFjNTZcIjpcIlxcdTIxNUFcIixcImZyYWM1OFwiOlwiXFx1MjE1RFwiLFwiZnJhYzc4XCI6XCJcXHUyMTVFXCIsXCJmcmFzbFwiOlwiXFx1MjA0NFwiLFwiZnJvd25cIjpcIlxcdTIzMjJcIixcImZzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JCXCIsXCJGc2NyXCI6XCJcXHUyMTMxXCIsXCJnYWN1dGVcIjpcIlxcdTAxRjVcIixcIkdhbW1hXCI6XCJcXHUwMzkzXCIsXCJnYW1tYVwiOlwiXFx1MDNCM1wiLFwiR2FtbWFkXCI6XCJcXHUwM0RDXCIsXCJnYW1tYWRcIjpcIlxcdTAzRERcIixcImdhcFwiOlwiXFx1MkE4NlwiLFwiR2JyZXZlXCI6XCJcXHUwMTFFXCIsXCJnYnJldmVcIjpcIlxcdTAxMUZcIixcIkdjZWRpbFwiOlwiXFx1MDEyMlwiLFwiR2NpcmNcIjpcIlxcdTAxMUNcIixcImdjaXJjXCI6XCJcXHUwMTFEXCIsXCJHY3lcIjpcIlxcdTA0MTNcIixcImdjeVwiOlwiXFx1MDQzM1wiLFwiR2RvdFwiOlwiXFx1MDEyMFwiLFwiZ2RvdFwiOlwiXFx1MDEyMVwiLFwiZ2VcIjpcIlxcdTIyNjVcIixcImdFXCI6XCJcXHUyMjY3XCIsXCJnRWxcIjpcIlxcdTJBOENcIixcImdlbFwiOlwiXFx1MjJEQlwiLFwiZ2VxXCI6XCJcXHUyMjY1XCIsXCJnZXFxXCI6XCJcXHUyMjY3XCIsXCJnZXFzbGFudFwiOlwiXFx1MkE3RVwiLFwiZ2VzY2NcIjpcIlxcdTJBQTlcIixcImdlc1wiOlwiXFx1MkE3RVwiLFwiZ2VzZG90XCI6XCJcXHUyQTgwXCIsXCJnZXNkb3RvXCI6XCJcXHUyQTgyXCIsXCJnZXNkb3RvbFwiOlwiXFx1MkE4NFwiLFwiZ2VzbFwiOlwiXFx1MjJEQlxcdUZFMDBcIixcImdlc2xlc1wiOlwiXFx1MkE5NFwiLFwiR2ZyXCI6XCJcXHVEODM1XFx1REQwQVwiLFwiZ2ZyXCI6XCJcXHVEODM1XFx1REQyNFwiLFwiZ2dcIjpcIlxcdTIyNkJcIixcIkdnXCI6XCJcXHUyMkQ5XCIsXCJnZ2dcIjpcIlxcdTIyRDlcIixcImdpbWVsXCI6XCJcXHUyMTM3XCIsXCJHSmN5XCI6XCJcXHUwNDAzXCIsXCJnamN5XCI6XCJcXHUwNDUzXCIsXCJnbGFcIjpcIlxcdTJBQTVcIixcImdsXCI6XCJcXHUyMjc3XCIsXCJnbEVcIjpcIlxcdTJBOTJcIixcImdsalwiOlwiXFx1MkFBNFwiLFwiZ25hcFwiOlwiXFx1MkE4QVwiLFwiZ25hcHByb3hcIjpcIlxcdTJBOEFcIixcImduZVwiOlwiXFx1MkE4OFwiLFwiZ25FXCI6XCJcXHUyMjY5XCIsXCJnbmVxXCI6XCJcXHUyQTg4XCIsXCJnbmVxcVwiOlwiXFx1MjI2OVwiLFwiZ25zaW1cIjpcIlxcdTIyRTdcIixcIkdvcGZcIjpcIlxcdUQ4MzVcXHVERDNFXCIsXCJnb3BmXCI6XCJcXHVEODM1XFx1REQ1OFwiLFwiZ3JhdmVcIjpcImBcIixcIkdyZWF0ZXJFcXVhbFwiOlwiXFx1MjI2NVwiLFwiR3JlYXRlckVxdWFsTGVzc1wiOlwiXFx1MjJEQlwiLFwiR3JlYXRlckZ1bGxFcXVhbFwiOlwiXFx1MjI2N1wiLFwiR3JlYXRlckdyZWF0ZXJcIjpcIlxcdTJBQTJcIixcIkdyZWF0ZXJMZXNzXCI6XCJcXHUyMjc3XCIsXCJHcmVhdGVyU2xhbnRFcXVhbFwiOlwiXFx1MkE3RVwiLFwiR3JlYXRlclRpbGRlXCI6XCJcXHUyMjczXCIsXCJHc2NyXCI6XCJcXHVEODM1XFx1RENBMlwiLFwiZ3NjclwiOlwiXFx1MjEwQVwiLFwiZ3NpbVwiOlwiXFx1MjI3M1wiLFwiZ3NpbWVcIjpcIlxcdTJBOEVcIixcImdzaW1sXCI6XCJcXHUyQTkwXCIsXCJndGNjXCI6XCJcXHUyQUE3XCIsXCJndGNpclwiOlwiXFx1MkE3QVwiLFwiZ3RcIjpcIj5cIixcIkdUXCI6XCI+XCIsXCJHdFwiOlwiXFx1MjI2QlwiLFwiZ3Rkb3RcIjpcIlxcdTIyRDdcIixcImd0bFBhclwiOlwiXFx1Mjk5NVwiLFwiZ3RxdWVzdFwiOlwiXFx1MkE3Q1wiLFwiZ3RyYXBwcm94XCI6XCJcXHUyQTg2XCIsXCJndHJhcnJcIjpcIlxcdTI5NzhcIixcImd0cmRvdFwiOlwiXFx1MjJEN1wiLFwiZ3RyZXFsZXNzXCI6XCJcXHUyMkRCXCIsXCJndHJlcXFsZXNzXCI6XCJcXHUyQThDXCIsXCJndHJsZXNzXCI6XCJcXHUyMjc3XCIsXCJndHJzaW1cIjpcIlxcdTIyNzNcIixcImd2ZXJ0bmVxcVwiOlwiXFx1MjI2OVxcdUZFMDBcIixcImd2bkVcIjpcIlxcdTIyNjlcXHVGRTAwXCIsXCJIYWNla1wiOlwiXFx1MDJDN1wiLFwiaGFpcnNwXCI6XCJcXHUyMDBBXCIsXCJoYWxmXCI6XCJcXHUwMEJEXCIsXCJoYW1pbHRcIjpcIlxcdTIxMEJcIixcIkhBUkRjeVwiOlwiXFx1MDQyQVwiLFwiaGFyZGN5XCI6XCJcXHUwNDRBXCIsXCJoYXJyY2lyXCI6XCJcXHUyOTQ4XCIsXCJoYXJyXCI6XCJcXHUyMTk0XCIsXCJoQXJyXCI6XCJcXHUyMUQ0XCIsXCJoYXJyd1wiOlwiXFx1MjFBRFwiLFwiSGF0XCI6XCJeXCIsXCJoYmFyXCI6XCJcXHUyMTBGXCIsXCJIY2lyY1wiOlwiXFx1MDEyNFwiLFwiaGNpcmNcIjpcIlxcdTAxMjVcIixcImhlYXJ0c1wiOlwiXFx1MjY2NVwiLFwiaGVhcnRzdWl0XCI6XCJcXHUyNjY1XCIsXCJoZWxsaXBcIjpcIlxcdTIwMjZcIixcImhlcmNvblwiOlwiXFx1MjJCOVwiLFwiaGZyXCI6XCJcXHVEODM1XFx1REQyNVwiLFwiSGZyXCI6XCJcXHUyMTBDXCIsXCJIaWxiZXJ0U3BhY2VcIjpcIlxcdTIxMEJcIixcImhrc2Vhcm93XCI6XCJcXHUyOTI1XCIsXCJoa3N3YXJvd1wiOlwiXFx1MjkyNlwiLFwiaG9hcnJcIjpcIlxcdTIxRkZcIixcImhvbXRodFwiOlwiXFx1MjIzQlwiLFwiaG9va2xlZnRhcnJvd1wiOlwiXFx1MjFBOVwiLFwiaG9va3JpZ2h0YXJyb3dcIjpcIlxcdTIxQUFcIixcImhvcGZcIjpcIlxcdUQ4MzVcXHVERDU5XCIsXCJIb3BmXCI6XCJcXHUyMTBEXCIsXCJob3JiYXJcIjpcIlxcdTIwMTVcIixcIkhvcml6b250YWxMaW5lXCI6XCJcXHUyNTAwXCIsXCJoc2NyXCI6XCJcXHVEODM1XFx1RENCRFwiLFwiSHNjclwiOlwiXFx1MjEwQlwiLFwiaHNsYXNoXCI6XCJcXHUyMTBGXCIsXCJIc3Ryb2tcIjpcIlxcdTAxMjZcIixcImhzdHJva1wiOlwiXFx1MDEyN1wiLFwiSHVtcERvd25IdW1wXCI6XCJcXHUyMjRFXCIsXCJIdW1wRXF1YWxcIjpcIlxcdTIyNEZcIixcImh5YnVsbFwiOlwiXFx1MjA0M1wiLFwiaHlwaGVuXCI6XCJcXHUyMDEwXCIsXCJJYWN1dGVcIjpcIlxcdTAwQ0RcIixcImlhY3V0ZVwiOlwiXFx1MDBFRFwiLFwiaWNcIjpcIlxcdTIwNjNcIixcIkljaXJjXCI6XCJcXHUwMENFXCIsXCJpY2lyY1wiOlwiXFx1MDBFRVwiLFwiSWN5XCI6XCJcXHUwNDE4XCIsXCJpY3lcIjpcIlxcdTA0MzhcIixcIklkb3RcIjpcIlxcdTAxMzBcIixcIklFY3lcIjpcIlxcdTA0MTVcIixcImllY3lcIjpcIlxcdTA0MzVcIixcImlleGNsXCI6XCJcXHUwMEExXCIsXCJpZmZcIjpcIlxcdTIxRDRcIixcImlmclwiOlwiXFx1RDgzNVxcdUREMjZcIixcIklmclwiOlwiXFx1MjExMVwiLFwiSWdyYXZlXCI6XCJcXHUwMENDXCIsXCJpZ3JhdmVcIjpcIlxcdTAwRUNcIixcImlpXCI6XCJcXHUyMTQ4XCIsXCJpaWlpbnRcIjpcIlxcdTJBMENcIixcImlpaW50XCI6XCJcXHUyMjJEXCIsXCJpaW5maW5cIjpcIlxcdTI5RENcIixcImlpb3RhXCI6XCJcXHUyMTI5XCIsXCJJSmxpZ1wiOlwiXFx1MDEzMlwiLFwiaWpsaWdcIjpcIlxcdTAxMzNcIixcIkltYWNyXCI6XCJcXHUwMTJBXCIsXCJpbWFjclwiOlwiXFx1MDEyQlwiLFwiaW1hZ2VcIjpcIlxcdTIxMTFcIixcIkltYWdpbmFyeUlcIjpcIlxcdTIxNDhcIixcImltYWdsaW5lXCI6XCJcXHUyMTEwXCIsXCJpbWFncGFydFwiOlwiXFx1MjExMVwiLFwiaW1hdGhcIjpcIlxcdTAxMzFcIixcIkltXCI6XCJcXHUyMTExXCIsXCJpbW9mXCI6XCJcXHUyMkI3XCIsXCJpbXBlZFwiOlwiXFx1MDFCNVwiLFwiSW1wbGllc1wiOlwiXFx1MjFEMlwiLFwiaW5jYXJlXCI6XCJcXHUyMTA1XCIsXCJpblwiOlwiXFx1MjIwOFwiLFwiaW5maW5cIjpcIlxcdTIyMUVcIixcImluZmludGllXCI6XCJcXHUyOUREXCIsXCJpbm9kb3RcIjpcIlxcdTAxMzFcIixcImludGNhbFwiOlwiXFx1MjJCQVwiLFwiaW50XCI6XCJcXHUyMjJCXCIsXCJJbnRcIjpcIlxcdTIyMkNcIixcImludGVnZXJzXCI6XCJcXHUyMTI0XCIsXCJJbnRlZ3JhbFwiOlwiXFx1MjIyQlwiLFwiaW50ZXJjYWxcIjpcIlxcdTIyQkFcIixcIkludGVyc2VjdGlvblwiOlwiXFx1MjJDMlwiLFwiaW50bGFyaGtcIjpcIlxcdTJBMTdcIixcImludHByb2RcIjpcIlxcdTJBM0NcIixcIkludmlzaWJsZUNvbW1hXCI6XCJcXHUyMDYzXCIsXCJJbnZpc2libGVUaW1lc1wiOlwiXFx1MjA2MlwiLFwiSU9jeVwiOlwiXFx1MDQwMVwiLFwiaW9jeVwiOlwiXFx1MDQ1MVwiLFwiSW9nb25cIjpcIlxcdTAxMkVcIixcImlvZ29uXCI6XCJcXHUwMTJGXCIsXCJJb3BmXCI6XCJcXHVEODM1XFx1REQ0MFwiLFwiaW9wZlwiOlwiXFx1RDgzNVxcdURENUFcIixcIklvdGFcIjpcIlxcdTAzOTlcIixcImlvdGFcIjpcIlxcdTAzQjlcIixcImlwcm9kXCI6XCJcXHUyQTNDXCIsXCJpcXVlc3RcIjpcIlxcdTAwQkZcIixcImlzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JFXCIsXCJJc2NyXCI6XCJcXHUyMTEwXCIsXCJpc2luXCI6XCJcXHUyMjA4XCIsXCJpc2luZG90XCI6XCJcXHUyMkY1XCIsXCJpc2luRVwiOlwiXFx1MjJGOVwiLFwiaXNpbnNcIjpcIlxcdTIyRjRcIixcImlzaW5zdlwiOlwiXFx1MjJGM1wiLFwiaXNpbnZcIjpcIlxcdTIyMDhcIixcIml0XCI6XCJcXHUyMDYyXCIsXCJJdGlsZGVcIjpcIlxcdTAxMjhcIixcIml0aWxkZVwiOlwiXFx1MDEyOVwiLFwiSXVrY3lcIjpcIlxcdTA0MDZcIixcIml1a2N5XCI6XCJcXHUwNDU2XCIsXCJJdW1sXCI6XCJcXHUwMENGXCIsXCJpdW1sXCI6XCJcXHUwMEVGXCIsXCJKY2lyY1wiOlwiXFx1MDEzNFwiLFwiamNpcmNcIjpcIlxcdTAxMzVcIixcIkpjeVwiOlwiXFx1MDQxOVwiLFwiamN5XCI6XCJcXHUwNDM5XCIsXCJKZnJcIjpcIlxcdUQ4MzVcXHVERDBEXCIsXCJqZnJcIjpcIlxcdUQ4MzVcXHVERDI3XCIsXCJqbWF0aFwiOlwiXFx1MDIzN1wiLFwiSm9wZlwiOlwiXFx1RDgzNVxcdURENDFcIixcImpvcGZcIjpcIlxcdUQ4MzVcXHVERDVCXCIsXCJKc2NyXCI6XCJcXHVEODM1XFx1RENBNVwiLFwianNjclwiOlwiXFx1RDgzNVxcdURDQkZcIixcIkpzZXJjeVwiOlwiXFx1MDQwOFwiLFwianNlcmN5XCI6XCJcXHUwNDU4XCIsXCJKdWtjeVwiOlwiXFx1MDQwNFwiLFwianVrY3lcIjpcIlxcdTA0NTRcIixcIkthcHBhXCI6XCJcXHUwMzlBXCIsXCJrYXBwYVwiOlwiXFx1MDNCQVwiLFwia2FwcGF2XCI6XCJcXHUwM0YwXCIsXCJLY2VkaWxcIjpcIlxcdTAxMzZcIixcImtjZWRpbFwiOlwiXFx1MDEzN1wiLFwiS2N5XCI6XCJcXHUwNDFBXCIsXCJrY3lcIjpcIlxcdTA0M0FcIixcIktmclwiOlwiXFx1RDgzNVxcdUREMEVcIixcImtmclwiOlwiXFx1RDgzNVxcdUREMjhcIixcImtncmVlblwiOlwiXFx1MDEzOFwiLFwiS0hjeVwiOlwiXFx1MDQyNVwiLFwia2hjeVwiOlwiXFx1MDQ0NVwiLFwiS0pjeVwiOlwiXFx1MDQwQ1wiLFwia2pjeVwiOlwiXFx1MDQ1Q1wiLFwiS29wZlwiOlwiXFx1RDgzNVxcdURENDJcIixcImtvcGZcIjpcIlxcdUQ4MzVcXHVERDVDXCIsXCJLc2NyXCI6XCJcXHVEODM1XFx1RENBNlwiLFwia3NjclwiOlwiXFx1RDgzNVxcdURDQzBcIixcImxBYXJyXCI6XCJcXHUyMURBXCIsXCJMYWN1dGVcIjpcIlxcdTAxMzlcIixcImxhY3V0ZVwiOlwiXFx1MDEzQVwiLFwibGFlbXB0eXZcIjpcIlxcdTI5QjRcIixcImxhZ3JhblwiOlwiXFx1MjExMlwiLFwiTGFtYmRhXCI6XCJcXHUwMzlCXCIsXCJsYW1iZGFcIjpcIlxcdTAzQkJcIixcImxhbmdcIjpcIlxcdTI3RThcIixcIkxhbmdcIjpcIlxcdTI3RUFcIixcImxhbmdkXCI6XCJcXHUyOTkxXCIsXCJsYW5nbGVcIjpcIlxcdTI3RThcIixcImxhcFwiOlwiXFx1MkE4NVwiLFwiTGFwbGFjZXRyZlwiOlwiXFx1MjExMlwiLFwibGFxdW9cIjpcIlxcdTAwQUJcIixcImxhcnJiXCI6XCJcXHUyMUU0XCIsXCJsYXJyYmZzXCI6XCJcXHUyOTFGXCIsXCJsYXJyXCI6XCJcXHUyMTkwXCIsXCJMYXJyXCI6XCJcXHUyMTlFXCIsXCJsQXJyXCI6XCJcXHUyMUQwXCIsXCJsYXJyZnNcIjpcIlxcdTI5MURcIixcImxhcnJoa1wiOlwiXFx1MjFBOVwiLFwibGFycmxwXCI6XCJcXHUyMUFCXCIsXCJsYXJycGxcIjpcIlxcdTI5MzlcIixcImxhcnJzaW1cIjpcIlxcdTI5NzNcIixcImxhcnJ0bFwiOlwiXFx1MjFBMlwiLFwibGF0YWlsXCI6XCJcXHUyOTE5XCIsXCJsQXRhaWxcIjpcIlxcdTI5MUJcIixcImxhdFwiOlwiXFx1MkFBQlwiLFwibGF0ZVwiOlwiXFx1MkFBRFwiLFwibGF0ZXNcIjpcIlxcdTJBQURcXHVGRTAwXCIsXCJsYmFyclwiOlwiXFx1MjkwQ1wiLFwibEJhcnJcIjpcIlxcdTI5MEVcIixcImxiYnJrXCI6XCJcXHUyNzcyXCIsXCJsYnJhY2VcIjpcIntcIixcImxicmFja1wiOlwiW1wiLFwibGJya2VcIjpcIlxcdTI5OEJcIixcImxicmtzbGRcIjpcIlxcdTI5OEZcIixcImxicmtzbHVcIjpcIlxcdTI5OERcIixcIkxjYXJvblwiOlwiXFx1MDEzRFwiLFwibGNhcm9uXCI6XCJcXHUwMTNFXCIsXCJMY2VkaWxcIjpcIlxcdTAxM0JcIixcImxjZWRpbFwiOlwiXFx1MDEzQ1wiLFwibGNlaWxcIjpcIlxcdTIzMDhcIixcImxjdWJcIjpcIntcIixcIkxjeVwiOlwiXFx1MDQxQlwiLFwibGN5XCI6XCJcXHUwNDNCXCIsXCJsZGNhXCI6XCJcXHUyOTM2XCIsXCJsZHF1b1wiOlwiXFx1MjAxQ1wiLFwibGRxdW9yXCI6XCJcXHUyMDFFXCIsXCJsZHJkaGFyXCI6XCJcXHUyOTY3XCIsXCJsZHJ1c2hhclwiOlwiXFx1Mjk0QlwiLFwibGRzaFwiOlwiXFx1MjFCMlwiLFwibGVcIjpcIlxcdTIyNjRcIixcImxFXCI6XCJcXHUyMjY2XCIsXCJMZWZ0QW5nbGVCcmFja2V0XCI6XCJcXHUyN0U4XCIsXCJMZWZ0QXJyb3dCYXJcIjpcIlxcdTIxRTRcIixcImxlZnRhcnJvd1wiOlwiXFx1MjE5MFwiLFwiTGVmdEFycm93XCI6XCJcXHUyMTkwXCIsXCJMZWZ0YXJyb3dcIjpcIlxcdTIxRDBcIixcIkxlZnRBcnJvd1JpZ2h0QXJyb3dcIjpcIlxcdTIxQzZcIixcImxlZnRhcnJvd3RhaWxcIjpcIlxcdTIxQTJcIixcIkxlZnRDZWlsaW5nXCI6XCJcXHUyMzA4XCIsXCJMZWZ0RG91YmxlQnJhY2tldFwiOlwiXFx1MjdFNlwiLFwiTGVmdERvd25UZWVWZWN0b3JcIjpcIlxcdTI5NjFcIixcIkxlZnREb3duVmVjdG9yQmFyXCI6XCJcXHUyOTU5XCIsXCJMZWZ0RG93blZlY3RvclwiOlwiXFx1MjFDM1wiLFwiTGVmdEZsb29yXCI6XCJcXHUyMzBBXCIsXCJsZWZ0aGFycG9vbmRvd25cIjpcIlxcdTIxQkRcIixcImxlZnRoYXJwb29udXBcIjpcIlxcdTIxQkNcIixcImxlZnRsZWZ0YXJyb3dzXCI6XCJcXHUyMUM3XCIsXCJsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjE5NFwiLFwiTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTIxOTRcIixcIkxlZnRyaWdodGFycm93XCI6XCJcXHUyMUQ0XCIsXCJsZWZ0cmlnaHRhcnJvd3NcIjpcIlxcdTIxQzZcIixcImxlZnRyaWdodGhhcnBvb25zXCI6XCJcXHUyMUNCXCIsXCJsZWZ0cmlnaHRzcXVpZ2Fycm93XCI6XCJcXHUyMUFEXCIsXCJMZWZ0UmlnaHRWZWN0b3JcIjpcIlxcdTI5NEVcIixcIkxlZnRUZWVBcnJvd1wiOlwiXFx1MjFBNFwiLFwiTGVmdFRlZVwiOlwiXFx1MjJBM1wiLFwiTGVmdFRlZVZlY3RvclwiOlwiXFx1Mjk1QVwiLFwibGVmdHRocmVldGltZXNcIjpcIlxcdTIyQ0JcIixcIkxlZnRUcmlhbmdsZUJhclwiOlwiXFx1MjlDRlwiLFwiTGVmdFRyaWFuZ2xlXCI6XCJcXHUyMkIyXCIsXCJMZWZ0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJCNFwiLFwiTGVmdFVwRG93blZlY3RvclwiOlwiXFx1Mjk1MVwiLFwiTGVmdFVwVGVlVmVjdG9yXCI6XCJcXHUyOTYwXCIsXCJMZWZ0VXBWZWN0b3JCYXJcIjpcIlxcdTI5NThcIixcIkxlZnRVcFZlY3RvclwiOlwiXFx1MjFCRlwiLFwiTGVmdFZlY3RvckJhclwiOlwiXFx1Mjk1MlwiLFwiTGVmdFZlY3RvclwiOlwiXFx1MjFCQ1wiLFwibEVnXCI6XCJcXHUyQThCXCIsXCJsZWdcIjpcIlxcdTIyREFcIixcImxlcVwiOlwiXFx1MjI2NFwiLFwibGVxcVwiOlwiXFx1MjI2NlwiLFwibGVxc2xhbnRcIjpcIlxcdTJBN0RcIixcImxlc2NjXCI6XCJcXHUyQUE4XCIsXCJsZXNcIjpcIlxcdTJBN0RcIixcImxlc2RvdFwiOlwiXFx1MkE3RlwiLFwibGVzZG90b1wiOlwiXFx1MkE4MVwiLFwibGVzZG90b3JcIjpcIlxcdTJBODNcIixcImxlc2dcIjpcIlxcdTIyREFcXHVGRTAwXCIsXCJsZXNnZXNcIjpcIlxcdTJBOTNcIixcImxlc3NhcHByb3hcIjpcIlxcdTJBODVcIixcImxlc3Nkb3RcIjpcIlxcdTIyRDZcIixcImxlc3NlcWd0clwiOlwiXFx1MjJEQVwiLFwibGVzc2VxcWd0clwiOlwiXFx1MkE4QlwiLFwiTGVzc0VxdWFsR3JlYXRlclwiOlwiXFx1MjJEQVwiLFwiTGVzc0Z1bGxFcXVhbFwiOlwiXFx1MjI2NlwiLFwiTGVzc0dyZWF0ZXJcIjpcIlxcdTIyNzZcIixcImxlc3NndHJcIjpcIlxcdTIyNzZcIixcIkxlc3NMZXNzXCI6XCJcXHUyQUExXCIsXCJsZXNzc2ltXCI6XCJcXHUyMjcyXCIsXCJMZXNzU2xhbnRFcXVhbFwiOlwiXFx1MkE3RFwiLFwiTGVzc1RpbGRlXCI6XCJcXHUyMjcyXCIsXCJsZmlzaHRcIjpcIlxcdTI5N0NcIixcImxmbG9vclwiOlwiXFx1MjMwQVwiLFwiTGZyXCI6XCJcXHVEODM1XFx1REQwRlwiLFwibGZyXCI6XCJcXHVEODM1XFx1REQyOVwiLFwibGdcIjpcIlxcdTIyNzZcIixcImxnRVwiOlwiXFx1MkE5MVwiLFwibEhhclwiOlwiXFx1Mjk2MlwiLFwibGhhcmRcIjpcIlxcdTIxQkRcIixcImxoYXJ1XCI6XCJcXHUyMUJDXCIsXCJsaGFydWxcIjpcIlxcdTI5NkFcIixcImxoYmxrXCI6XCJcXHUyNTg0XCIsXCJMSmN5XCI6XCJcXHUwNDA5XCIsXCJsamN5XCI6XCJcXHUwNDU5XCIsXCJsbGFyclwiOlwiXFx1MjFDN1wiLFwibGxcIjpcIlxcdTIyNkFcIixcIkxsXCI6XCJcXHUyMkQ4XCIsXCJsbGNvcm5lclwiOlwiXFx1MjMxRVwiLFwiTGxlZnRhcnJvd1wiOlwiXFx1MjFEQVwiLFwibGxoYXJkXCI6XCJcXHUyOTZCXCIsXCJsbHRyaVwiOlwiXFx1MjVGQVwiLFwiTG1pZG90XCI6XCJcXHUwMTNGXCIsXCJsbWlkb3RcIjpcIlxcdTAxNDBcIixcImxtb3VzdGFjaGVcIjpcIlxcdTIzQjBcIixcImxtb3VzdFwiOlwiXFx1MjNCMFwiLFwibG5hcFwiOlwiXFx1MkE4OVwiLFwibG5hcHByb3hcIjpcIlxcdTJBODlcIixcImxuZVwiOlwiXFx1MkE4N1wiLFwibG5FXCI6XCJcXHUyMjY4XCIsXCJsbmVxXCI6XCJcXHUyQTg3XCIsXCJsbmVxcVwiOlwiXFx1MjI2OFwiLFwibG5zaW1cIjpcIlxcdTIyRTZcIixcImxvYW5nXCI6XCJcXHUyN0VDXCIsXCJsb2FyclwiOlwiXFx1MjFGRFwiLFwibG9icmtcIjpcIlxcdTI3RTZcIixcImxvbmdsZWZ0YXJyb3dcIjpcIlxcdTI3RjVcIixcIkxvbmdMZWZ0QXJyb3dcIjpcIlxcdTI3RjVcIixcIkxvbmdsZWZ0YXJyb3dcIjpcIlxcdTI3RjhcIixcImxvbmdsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjdGN1wiLFwiTG9uZ0xlZnRSaWdodEFycm93XCI6XCJcXHUyN0Y3XCIsXCJMb25nbGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTI3RkFcIixcImxvbmdtYXBzdG9cIjpcIlxcdTI3RkNcIixcImxvbmdyaWdodGFycm93XCI6XCJcXHUyN0Y2XCIsXCJMb25nUmlnaHRBcnJvd1wiOlwiXFx1MjdGNlwiLFwiTG9uZ3JpZ2h0YXJyb3dcIjpcIlxcdTI3RjlcIixcImxvb3BhcnJvd2xlZnRcIjpcIlxcdTIxQUJcIixcImxvb3BhcnJvd3JpZ2h0XCI6XCJcXHUyMUFDXCIsXCJsb3BhclwiOlwiXFx1Mjk4NVwiLFwiTG9wZlwiOlwiXFx1RDgzNVxcdURENDNcIixcImxvcGZcIjpcIlxcdUQ4MzVcXHVERDVEXCIsXCJsb3BsdXNcIjpcIlxcdTJBMkRcIixcImxvdGltZXNcIjpcIlxcdTJBMzRcIixcImxvd2FzdFwiOlwiXFx1MjIxN1wiLFwibG93YmFyXCI6XCJfXCIsXCJMb3dlckxlZnRBcnJvd1wiOlwiXFx1MjE5OVwiLFwiTG93ZXJSaWdodEFycm93XCI6XCJcXHUyMTk4XCIsXCJsb3pcIjpcIlxcdTI1Q0FcIixcImxvemVuZ2VcIjpcIlxcdTI1Q0FcIixcImxvemZcIjpcIlxcdTI5RUJcIixcImxwYXJcIjpcIihcIixcImxwYXJsdFwiOlwiXFx1Mjk5M1wiLFwibHJhcnJcIjpcIlxcdTIxQzZcIixcImxyY29ybmVyXCI6XCJcXHUyMzFGXCIsXCJscmhhclwiOlwiXFx1MjFDQlwiLFwibHJoYXJkXCI6XCJcXHUyOTZEXCIsXCJscm1cIjpcIlxcdTIwMEVcIixcImxydHJpXCI6XCJcXHUyMkJGXCIsXCJsc2FxdW9cIjpcIlxcdTIwMzlcIixcImxzY3JcIjpcIlxcdUQ4MzVcXHVEQ0MxXCIsXCJMc2NyXCI6XCJcXHUyMTEyXCIsXCJsc2hcIjpcIlxcdTIxQjBcIixcIkxzaFwiOlwiXFx1MjFCMFwiLFwibHNpbVwiOlwiXFx1MjI3MlwiLFwibHNpbWVcIjpcIlxcdTJBOERcIixcImxzaW1nXCI6XCJcXHUyQThGXCIsXCJsc3FiXCI6XCJbXCIsXCJsc3F1b1wiOlwiXFx1MjAxOFwiLFwibHNxdW9yXCI6XCJcXHUyMDFBXCIsXCJMc3Ryb2tcIjpcIlxcdTAxNDFcIixcImxzdHJva1wiOlwiXFx1MDE0MlwiLFwibHRjY1wiOlwiXFx1MkFBNlwiLFwibHRjaXJcIjpcIlxcdTJBNzlcIixcImx0XCI6XCI8XCIsXCJMVFwiOlwiPFwiLFwiTHRcIjpcIlxcdTIyNkFcIixcImx0ZG90XCI6XCJcXHUyMkQ2XCIsXCJsdGhyZWVcIjpcIlxcdTIyQ0JcIixcImx0aW1lc1wiOlwiXFx1MjJDOVwiLFwibHRsYXJyXCI6XCJcXHUyOTc2XCIsXCJsdHF1ZXN0XCI6XCJcXHUyQTdCXCIsXCJsdHJpXCI6XCJcXHUyNUMzXCIsXCJsdHJpZVwiOlwiXFx1MjJCNFwiLFwibHRyaWZcIjpcIlxcdTI1QzJcIixcImx0clBhclwiOlwiXFx1Mjk5NlwiLFwibHVyZHNoYXJcIjpcIlxcdTI5NEFcIixcImx1cnVoYXJcIjpcIlxcdTI5NjZcIixcImx2ZXJ0bmVxcVwiOlwiXFx1MjI2OFxcdUZFMDBcIixcImx2bkVcIjpcIlxcdTIyNjhcXHVGRTAwXCIsXCJtYWNyXCI6XCJcXHUwMEFGXCIsXCJtYWxlXCI6XCJcXHUyNjQyXCIsXCJtYWx0XCI6XCJcXHUyNzIwXCIsXCJtYWx0ZXNlXCI6XCJcXHUyNzIwXCIsXCJNYXBcIjpcIlxcdTI5MDVcIixcIm1hcFwiOlwiXFx1MjFBNlwiLFwibWFwc3RvXCI6XCJcXHUyMUE2XCIsXCJtYXBzdG9kb3duXCI6XCJcXHUyMUE3XCIsXCJtYXBzdG9sZWZ0XCI6XCJcXHUyMUE0XCIsXCJtYXBzdG91cFwiOlwiXFx1MjFBNVwiLFwibWFya2VyXCI6XCJcXHUyNUFFXCIsXCJtY29tbWFcIjpcIlxcdTJBMjlcIixcIk1jeVwiOlwiXFx1MDQxQ1wiLFwibWN5XCI6XCJcXHUwNDNDXCIsXCJtZGFzaFwiOlwiXFx1MjAxNFwiLFwibUREb3RcIjpcIlxcdTIyM0FcIixcIm1lYXN1cmVkYW5nbGVcIjpcIlxcdTIyMjFcIixcIk1lZGl1bVNwYWNlXCI6XCJcXHUyMDVGXCIsXCJNZWxsaW50cmZcIjpcIlxcdTIxMzNcIixcIk1mclwiOlwiXFx1RDgzNVxcdUREMTBcIixcIm1mclwiOlwiXFx1RDgzNVxcdUREMkFcIixcIm1ob1wiOlwiXFx1MjEyN1wiLFwibWljcm9cIjpcIlxcdTAwQjVcIixcIm1pZGFzdFwiOlwiKlwiLFwibWlkY2lyXCI6XCJcXHUyQUYwXCIsXCJtaWRcIjpcIlxcdTIyMjNcIixcIm1pZGRvdFwiOlwiXFx1MDBCN1wiLFwibWludXNiXCI6XCJcXHUyMjlGXCIsXCJtaW51c1wiOlwiXFx1MjIxMlwiLFwibWludXNkXCI6XCJcXHUyMjM4XCIsXCJtaW51c2R1XCI6XCJcXHUyQTJBXCIsXCJNaW51c1BsdXNcIjpcIlxcdTIyMTNcIixcIm1sY3BcIjpcIlxcdTJBREJcIixcIm1sZHJcIjpcIlxcdTIwMjZcIixcIm1ucGx1c1wiOlwiXFx1MjIxM1wiLFwibW9kZWxzXCI6XCJcXHUyMkE3XCIsXCJNb3BmXCI6XCJcXHVEODM1XFx1REQ0NFwiLFwibW9wZlwiOlwiXFx1RDgzNVxcdURENUVcIixcIm1wXCI6XCJcXHUyMjEzXCIsXCJtc2NyXCI6XCJcXHVEODM1XFx1RENDMlwiLFwiTXNjclwiOlwiXFx1MjEzM1wiLFwibXN0cG9zXCI6XCJcXHUyMjNFXCIsXCJNdVwiOlwiXFx1MDM5Q1wiLFwibXVcIjpcIlxcdTAzQkNcIixcIm11bHRpbWFwXCI6XCJcXHUyMkI4XCIsXCJtdW1hcFwiOlwiXFx1MjJCOFwiLFwibmFibGFcIjpcIlxcdTIyMDdcIixcIk5hY3V0ZVwiOlwiXFx1MDE0M1wiLFwibmFjdXRlXCI6XCJcXHUwMTQ0XCIsXCJuYW5nXCI6XCJcXHUyMjIwXFx1MjBEMlwiLFwibmFwXCI6XCJcXHUyMjQ5XCIsXCJuYXBFXCI6XCJcXHUyQTcwXFx1MDMzOFwiLFwibmFwaWRcIjpcIlxcdTIyNEJcXHUwMzM4XCIsXCJuYXBvc1wiOlwiXFx1MDE0OVwiLFwibmFwcHJveFwiOlwiXFx1MjI0OVwiLFwibmF0dXJhbFwiOlwiXFx1MjY2RVwiLFwibmF0dXJhbHNcIjpcIlxcdTIxMTVcIixcIm5hdHVyXCI6XCJcXHUyNjZFXCIsXCJuYnNwXCI6XCJcXHUwMEEwXCIsXCJuYnVtcFwiOlwiXFx1MjI0RVxcdTAzMzhcIixcIm5idW1wZVwiOlwiXFx1MjI0RlxcdTAzMzhcIixcIm5jYXBcIjpcIlxcdTJBNDNcIixcIk5jYXJvblwiOlwiXFx1MDE0N1wiLFwibmNhcm9uXCI6XCJcXHUwMTQ4XCIsXCJOY2VkaWxcIjpcIlxcdTAxNDVcIixcIm5jZWRpbFwiOlwiXFx1MDE0NlwiLFwibmNvbmdcIjpcIlxcdTIyNDdcIixcIm5jb25nZG90XCI6XCJcXHUyQTZEXFx1MDMzOFwiLFwibmN1cFwiOlwiXFx1MkE0MlwiLFwiTmN5XCI6XCJcXHUwNDFEXCIsXCJuY3lcIjpcIlxcdTA0M0RcIixcIm5kYXNoXCI6XCJcXHUyMDEzXCIsXCJuZWFyaGtcIjpcIlxcdTI5MjRcIixcIm5lYXJyXCI6XCJcXHUyMTk3XCIsXCJuZUFyclwiOlwiXFx1MjFEN1wiLFwibmVhcnJvd1wiOlwiXFx1MjE5N1wiLFwibmVcIjpcIlxcdTIyNjBcIixcIm5lZG90XCI6XCJcXHUyMjUwXFx1MDMzOFwiLFwiTmVnYXRpdmVNZWRpdW1TcGFjZVwiOlwiXFx1MjAwQlwiLFwiTmVnYXRpdmVUaGlja1NwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVRoaW5TcGFjZVwiOlwiXFx1MjAwQlwiLFwiTmVnYXRpdmVWZXJ5VGhpblNwYWNlXCI6XCJcXHUyMDBCXCIsXCJuZXF1aXZcIjpcIlxcdTIyNjJcIixcIm5lc2VhclwiOlwiXFx1MjkyOFwiLFwibmVzaW1cIjpcIlxcdTIyNDJcXHUwMzM4XCIsXCJOZXN0ZWRHcmVhdGVyR3JlYXRlclwiOlwiXFx1MjI2QlwiLFwiTmVzdGVkTGVzc0xlc3NcIjpcIlxcdTIyNkFcIixcIk5ld0xpbmVcIjpcIlxcblwiLFwibmV4aXN0XCI6XCJcXHUyMjA0XCIsXCJuZXhpc3RzXCI6XCJcXHUyMjA0XCIsXCJOZnJcIjpcIlxcdUQ4MzVcXHVERDExXCIsXCJuZnJcIjpcIlxcdUQ4MzVcXHVERDJCXCIsXCJuZ0VcIjpcIlxcdTIyNjdcXHUwMzM4XCIsXCJuZ2VcIjpcIlxcdTIyNzFcIixcIm5nZXFcIjpcIlxcdTIyNzFcIixcIm5nZXFxXCI6XCJcXHUyMjY3XFx1MDMzOFwiLFwibmdlcXNsYW50XCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwibmdlc1wiOlwiXFx1MkE3RVxcdTAzMzhcIixcIm5HZ1wiOlwiXFx1MjJEOVxcdTAzMzhcIixcIm5nc2ltXCI6XCJcXHUyMjc1XCIsXCJuR3RcIjpcIlxcdTIyNkJcXHUyMEQyXCIsXCJuZ3RcIjpcIlxcdTIyNkZcIixcIm5ndHJcIjpcIlxcdTIyNkZcIixcIm5HdHZcIjpcIlxcdTIyNkJcXHUwMzM4XCIsXCJuaGFyclwiOlwiXFx1MjFBRVwiLFwibmhBcnJcIjpcIlxcdTIxQ0VcIixcIm5ocGFyXCI6XCJcXHUyQUYyXCIsXCJuaVwiOlwiXFx1MjIwQlwiLFwibmlzXCI6XCJcXHUyMkZDXCIsXCJuaXNkXCI6XCJcXHUyMkZBXCIsXCJuaXZcIjpcIlxcdTIyMEJcIixcIk5KY3lcIjpcIlxcdTA0MEFcIixcIm5qY3lcIjpcIlxcdTA0NUFcIixcIm5sYXJyXCI6XCJcXHUyMTlBXCIsXCJubEFyclwiOlwiXFx1MjFDRFwiLFwibmxkclwiOlwiXFx1MjAyNVwiLFwibmxFXCI6XCJcXHUyMjY2XFx1MDMzOFwiLFwibmxlXCI6XCJcXHUyMjcwXCIsXCJubGVmdGFycm93XCI6XCJcXHUyMTlBXCIsXCJuTGVmdGFycm93XCI6XCJcXHUyMUNEXCIsXCJubGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTIxQUVcIixcIm5MZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjFDRVwiLFwibmxlcVwiOlwiXFx1MjI3MFwiLFwibmxlcXFcIjpcIlxcdTIyNjZcXHUwMzM4XCIsXCJubGVxc2xhbnRcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJubGVzXCI6XCJcXHUyQTdEXFx1MDMzOFwiLFwibmxlc3NcIjpcIlxcdTIyNkVcIixcIm5MbFwiOlwiXFx1MjJEOFxcdTAzMzhcIixcIm5sc2ltXCI6XCJcXHUyMjc0XCIsXCJuTHRcIjpcIlxcdTIyNkFcXHUyMEQyXCIsXCJubHRcIjpcIlxcdTIyNkVcIixcIm5sdHJpXCI6XCJcXHUyMkVBXCIsXCJubHRyaWVcIjpcIlxcdTIyRUNcIixcIm5MdHZcIjpcIlxcdTIyNkFcXHUwMzM4XCIsXCJubWlkXCI6XCJcXHUyMjI0XCIsXCJOb0JyZWFrXCI6XCJcXHUyMDYwXCIsXCJOb25CcmVha2luZ1NwYWNlXCI6XCJcXHUwMEEwXCIsXCJub3BmXCI6XCJcXHVEODM1XFx1REQ1RlwiLFwiTm9wZlwiOlwiXFx1MjExNVwiLFwiTm90XCI6XCJcXHUyQUVDXCIsXCJub3RcIjpcIlxcdTAwQUNcIixcIk5vdENvbmdydWVudFwiOlwiXFx1MjI2MlwiLFwiTm90Q3VwQ2FwXCI6XCJcXHUyMjZEXCIsXCJOb3REb3VibGVWZXJ0aWNhbEJhclwiOlwiXFx1MjIyNlwiLFwiTm90RWxlbWVudFwiOlwiXFx1MjIwOVwiLFwiTm90RXF1YWxcIjpcIlxcdTIyNjBcIixcIk5vdEVxdWFsVGlsZGVcIjpcIlxcdTIyNDJcXHUwMzM4XCIsXCJOb3RFeGlzdHNcIjpcIlxcdTIyMDRcIixcIk5vdEdyZWF0ZXJcIjpcIlxcdTIyNkZcIixcIk5vdEdyZWF0ZXJFcXVhbFwiOlwiXFx1MjI3MVwiLFwiTm90R3JlYXRlckZ1bGxFcXVhbFwiOlwiXFx1MjI2N1xcdTAzMzhcIixcIk5vdEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyMjZCXFx1MDMzOFwiLFwiTm90R3JlYXRlckxlc3NcIjpcIlxcdTIyNzlcIixcIk5vdEdyZWF0ZXJTbGFudEVxdWFsXCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwiTm90R3JlYXRlclRpbGRlXCI6XCJcXHUyMjc1XCIsXCJOb3RIdW1wRG93bkh1bXBcIjpcIlxcdTIyNEVcXHUwMzM4XCIsXCJOb3RIdW1wRXF1YWxcIjpcIlxcdTIyNEZcXHUwMzM4XCIsXCJub3RpblwiOlwiXFx1MjIwOVwiLFwibm90aW5kb3RcIjpcIlxcdTIyRjVcXHUwMzM4XCIsXCJub3RpbkVcIjpcIlxcdTIyRjlcXHUwMzM4XCIsXCJub3RpbnZhXCI6XCJcXHUyMjA5XCIsXCJub3RpbnZiXCI6XCJcXHUyMkY3XCIsXCJub3RpbnZjXCI6XCJcXHUyMkY2XCIsXCJOb3RMZWZ0VHJpYW5nbGVCYXJcIjpcIlxcdTI5Q0ZcXHUwMzM4XCIsXCJOb3RMZWZ0VHJpYW5nbGVcIjpcIlxcdTIyRUFcIixcIk5vdExlZnRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkVDXCIsXCJOb3RMZXNzXCI6XCJcXHUyMjZFXCIsXCJOb3RMZXNzRXF1YWxcIjpcIlxcdTIyNzBcIixcIk5vdExlc3NHcmVhdGVyXCI6XCJcXHUyMjc4XCIsXCJOb3RMZXNzTGVzc1wiOlwiXFx1MjI2QVxcdTAzMzhcIixcIk5vdExlc3NTbGFudEVxdWFsXCI6XCJcXHUyQTdEXFx1MDMzOFwiLFwiTm90TGVzc1RpbGRlXCI6XCJcXHUyMjc0XCIsXCJOb3ROZXN0ZWRHcmVhdGVyR3JlYXRlclwiOlwiXFx1MkFBMlxcdTAzMzhcIixcIk5vdE5lc3RlZExlc3NMZXNzXCI6XCJcXHUyQUExXFx1MDMzOFwiLFwibm90bmlcIjpcIlxcdTIyMENcIixcIm5vdG5pdmFcIjpcIlxcdTIyMENcIixcIm5vdG5pdmJcIjpcIlxcdTIyRkVcIixcIm5vdG5pdmNcIjpcIlxcdTIyRkRcIixcIk5vdFByZWNlZGVzXCI6XCJcXHUyMjgwXCIsXCJOb3RQcmVjZWRlc0VxdWFsXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwiTm90UHJlY2VkZXNTbGFudEVxdWFsXCI6XCJcXHUyMkUwXCIsXCJOb3RSZXZlcnNlRWxlbWVudFwiOlwiXFx1MjIwQ1wiLFwiTm90UmlnaHRUcmlhbmdsZUJhclwiOlwiXFx1MjlEMFxcdTAzMzhcIixcIk5vdFJpZ2h0VHJpYW5nbGVcIjpcIlxcdTIyRUJcIixcIk5vdFJpZ2h0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJFRFwiLFwiTm90U3F1YXJlU3Vic2V0XCI6XCJcXHUyMjhGXFx1MDMzOFwiLFwiTm90U3F1YXJlU3Vic2V0RXF1YWxcIjpcIlxcdTIyRTJcIixcIk5vdFNxdWFyZVN1cGVyc2V0XCI6XCJcXHUyMjkwXFx1MDMzOFwiLFwiTm90U3F1YXJlU3VwZXJzZXRFcXVhbFwiOlwiXFx1MjJFM1wiLFwiTm90U3Vic2V0XCI6XCJcXHUyMjgyXFx1MjBEMlwiLFwiTm90U3Vic2V0RXF1YWxcIjpcIlxcdTIyODhcIixcIk5vdFN1Y2NlZWRzXCI6XCJcXHUyMjgxXCIsXCJOb3RTdWNjZWVkc0VxdWFsXCI6XCJcXHUyQUIwXFx1MDMzOFwiLFwiTm90U3VjY2VlZHNTbGFudEVxdWFsXCI6XCJcXHUyMkUxXCIsXCJOb3RTdWNjZWVkc1RpbGRlXCI6XCJcXHUyMjdGXFx1MDMzOFwiLFwiTm90U3VwZXJzZXRcIjpcIlxcdTIyODNcXHUyMEQyXCIsXCJOb3RTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjg5XCIsXCJOb3RUaWxkZVwiOlwiXFx1MjI0MVwiLFwiTm90VGlsZGVFcXVhbFwiOlwiXFx1MjI0NFwiLFwiTm90VGlsZGVGdWxsRXF1YWxcIjpcIlxcdTIyNDdcIixcIk5vdFRpbGRlVGlsZGVcIjpcIlxcdTIyNDlcIixcIk5vdFZlcnRpY2FsQmFyXCI6XCJcXHUyMjI0XCIsXCJucGFyYWxsZWxcIjpcIlxcdTIyMjZcIixcIm5wYXJcIjpcIlxcdTIyMjZcIixcIm5wYXJzbFwiOlwiXFx1MkFGRFxcdTIwRTVcIixcIm5wYXJ0XCI6XCJcXHUyMjAyXFx1MDMzOFwiLFwibnBvbGludFwiOlwiXFx1MkExNFwiLFwibnByXCI6XCJcXHUyMjgwXCIsXCJucHJjdWVcIjpcIlxcdTIyRTBcIixcIm5wcmVjXCI6XCJcXHUyMjgwXCIsXCJucHJlY2VxXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwibnByZVwiOlwiXFx1MkFBRlxcdTAzMzhcIixcIm5yYXJyY1wiOlwiXFx1MjkzM1xcdTAzMzhcIixcIm5yYXJyXCI6XCJcXHUyMTlCXCIsXCJuckFyclwiOlwiXFx1MjFDRlwiLFwibnJhcnJ3XCI6XCJcXHUyMTlEXFx1MDMzOFwiLFwibnJpZ2h0YXJyb3dcIjpcIlxcdTIxOUJcIixcIm5SaWdodGFycm93XCI6XCJcXHUyMUNGXCIsXCJucnRyaVwiOlwiXFx1MjJFQlwiLFwibnJ0cmllXCI6XCJcXHUyMkVEXCIsXCJuc2NcIjpcIlxcdTIyODFcIixcIm5zY2N1ZVwiOlwiXFx1MjJFMVwiLFwibnNjZVwiOlwiXFx1MkFCMFxcdTAzMzhcIixcIk5zY3JcIjpcIlxcdUQ4MzVcXHVEQ0E5XCIsXCJuc2NyXCI6XCJcXHVEODM1XFx1RENDM1wiLFwibnNob3J0bWlkXCI6XCJcXHUyMjI0XCIsXCJuc2hvcnRwYXJhbGxlbFwiOlwiXFx1MjIyNlwiLFwibnNpbVwiOlwiXFx1MjI0MVwiLFwibnNpbWVcIjpcIlxcdTIyNDRcIixcIm5zaW1lcVwiOlwiXFx1MjI0NFwiLFwibnNtaWRcIjpcIlxcdTIyMjRcIixcIm5zcGFyXCI6XCJcXHUyMjI2XCIsXCJuc3FzdWJlXCI6XCJcXHUyMkUyXCIsXCJuc3FzdXBlXCI6XCJcXHUyMkUzXCIsXCJuc3ViXCI6XCJcXHUyMjg0XCIsXCJuc3ViRVwiOlwiXFx1MkFDNVxcdTAzMzhcIixcIm5zdWJlXCI6XCJcXHUyMjg4XCIsXCJuc3Vic2V0XCI6XCJcXHUyMjgyXFx1MjBEMlwiLFwibnN1YnNldGVxXCI6XCJcXHUyMjg4XCIsXCJuc3Vic2V0ZXFxXCI6XCJcXHUyQUM1XFx1MDMzOFwiLFwibnN1Y2NcIjpcIlxcdTIyODFcIixcIm5zdWNjZXFcIjpcIlxcdTJBQjBcXHUwMzM4XCIsXCJuc3VwXCI6XCJcXHUyMjg1XCIsXCJuc3VwRVwiOlwiXFx1MkFDNlxcdTAzMzhcIixcIm5zdXBlXCI6XCJcXHUyMjg5XCIsXCJuc3Vwc2V0XCI6XCJcXHUyMjgzXFx1MjBEMlwiLFwibnN1cHNldGVxXCI6XCJcXHUyMjg5XCIsXCJuc3Vwc2V0ZXFxXCI6XCJcXHUyQUM2XFx1MDMzOFwiLFwibnRnbFwiOlwiXFx1MjI3OVwiLFwiTnRpbGRlXCI6XCJcXHUwMEQxXCIsXCJudGlsZGVcIjpcIlxcdTAwRjFcIixcIm50bGdcIjpcIlxcdTIyNzhcIixcIm50cmlhbmdsZWxlZnRcIjpcIlxcdTIyRUFcIixcIm50cmlhbmdsZWxlZnRlcVwiOlwiXFx1MjJFQ1wiLFwibnRyaWFuZ2xlcmlnaHRcIjpcIlxcdTIyRUJcIixcIm50cmlhbmdsZXJpZ2h0ZXFcIjpcIlxcdTIyRURcIixcIk51XCI6XCJcXHUwMzlEXCIsXCJudVwiOlwiXFx1MDNCRFwiLFwibnVtXCI6XCIjXCIsXCJudW1lcm9cIjpcIlxcdTIxMTZcIixcIm51bXNwXCI6XCJcXHUyMDA3XCIsXCJudmFwXCI6XCJcXHUyMjREXFx1MjBEMlwiLFwibnZkYXNoXCI6XCJcXHUyMkFDXCIsXCJudkRhc2hcIjpcIlxcdTIyQURcIixcIm5WZGFzaFwiOlwiXFx1MjJBRVwiLFwiblZEYXNoXCI6XCJcXHUyMkFGXCIsXCJudmdlXCI6XCJcXHUyMjY1XFx1MjBEMlwiLFwibnZndFwiOlwiPlxcdTIwRDJcIixcIm52SGFyclwiOlwiXFx1MjkwNFwiLFwibnZpbmZpblwiOlwiXFx1MjlERVwiLFwibnZsQXJyXCI6XCJcXHUyOTAyXCIsXCJudmxlXCI6XCJcXHUyMjY0XFx1MjBEMlwiLFwibnZsdFwiOlwiPFxcdTIwRDJcIixcIm52bHRyaWVcIjpcIlxcdTIyQjRcXHUyMEQyXCIsXCJudnJBcnJcIjpcIlxcdTI5MDNcIixcIm52cnRyaWVcIjpcIlxcdTIyQjVcXHUyMEQyXCIsXCJudnNpbVwiOlwiXFx1MjIzQ1xcdTIwRDJcIixcIm53YXJoa1wiOlwiXFx1MjkyM1wiLFwibndhcnJcIjpcIlxcdTIxOTZcIixcIm53QXJyXCI6XCJcXHUyMUQ2XCIsXCJud2Fycm93XCI6XCJcXHUyMTk2XCIsXCJud25lYXJcIjpcIlxcdTI5MjdcIixcIk9hY3V0ZVwiOlwiXFx1MDBEM1wiLFwib2FjdXRlXCI6XCJcXHUwMEYzXCIsXCJvYXN0XCI6XCJcXHUyMjlCXCIsXCJPY2lyY1wiOlwiXFx1MDBENFwiLFwib2NpcmNcIjpcIlxcdTAwRjRcIixcIm9jaXJcIjpcIlxcdTIyOUFcIixcIk9jeVwiOlwiXFx1MDQxRVwiLFwib2N5XCI6XCJcXHUwNDNFXCIsXCJvZGFzaFwiOlwiXFx1MjI5RFwiLFwiT2RibGFjXCI6XCJcXHUwMTUwXCIsXCJvZGJsYWNcIjpcIlxcdTAxNTFcIixcIm9kaXZcIjpcIlxcdTJBMzhcIixcIm9kb3RcIjpcIlxcdTIyOTlcIixcIm9kc29sZFwiOlwiXFx1MjlCQ1wiLFwiT0VsaWdcIjpcIlxcdTAxNTJcIixcIm9lbGlnXCI6XCJcXHUwMTUzXCIsXCJvZmNpclwiOlwiXFx1MjlCRlwiLFwiT2ZyXCI6XCJcXHVEODM1XFx1REQxMlwiLFwib2ZyXCI6XCJcXHVEODM1XFx1REQyQ1wiLFwib2dvblwiOlwiXFx1MDJEQlwiLFwiT2dyYXZlXCI6XCJcXHUwMEQyXCIsXCJvZ3JhdmVcIjpcIlxcdTAwRjJcIixcIm9ndFwiOlwiXFx1MjlDMVwiLFwib2hiYXJcIjpcIlxcdTI5QjVcIixcIm9obVwiOlwiXFx1MDNBOVwiLFwib2ludFwiOlwiXFx1MjIyRVwiLFwib2xhcnJcIjpcIlxcdTIxQkFcIixcIm9sY2lyXCI6XCJcXHUyOUJFXCIsXCJvbGNyb3NzXCI6XCJcXHUyOUJCXCIsXCJvbGluZVwiOlwiXFx1MjAzRVwiLFwib2x0XCI6XCJcXHUyOUMwXCIsXCJPbWFjclwiOlwiXFx1MDE0Q1wiLFwib21hY3JcIjpcIlxcdTAxNERcIixcIk9tZWdhXCI6XCJcXHUwM0E5XCIsXCJvbWVnYVwiOlwiXFx1MDNDOVwiLFwiT21pY3JvblwiOlwiXFx1MDM5RlwiLFwib21pY3JvblwiOlwiXFx1MDNCRlwiLFwib21pZFwiOlwiXFx1MjlCNlwiLFwib21pbnVzXCI6XCJcXHUyMjk2XCIsXCJPb3BmXCI6XCJcXHVEODM1XFx1REQ0NlwiLFwib29wZlwiOlwiXFx1RDgzNVxcdURENjBcIixcIm9wYXJcIjpcIlxcdTI5QjdcIixcIk9wZW5DdXJseURvdWJsZVF1b3RlXCI6XCJcXHUyMDFDXCIsXCJPcGVuQ3VybHlRdW90ZVwiOlwiXFx1MjAxOFwiLFwib3BlcnBcIjpcIlxcdTI5QjlcIixcIm9wbHVzXCI6XCJcXHUyMjk1XCIsXCJvcmFyclwiOlwiXFx1MjFCQlwiLFwiT3JcIjpcIlxcdTJBNTRcIixcIm9yXCI6XCJcXHUyMjI4XCIsXCJvcmRcIjpcIlxcdTJBNURcIixcIm9yZGVyXCI6XCJcXHUyMTM0XCIsXCJvcmRlcm9mXCI6XCJcXHUyMTM0XCIsXCJvcmRmXCI6XCJcXHUwMEFBXCIsXCJvcmRtXCI6XCJcXHUwMEJBXCIsXCJvcmlnb2ZcIjpcIlxcdTIyQjZcIixcIm9yb3JcIjpcIlxcdTJBNTZcIixcIm9yc2xvcGVcIjpcIlxcdTJBNTdcIixcIm9ydlwiOlwiXFx1MkE1QlwiLFwib1NcIjpcIlxcdTI0QzhcIixcIk9zY3JcIjpcIlxcdUQ4MzVcXHVEQ0FBXCIsXCJvc2NyXCI6XCJcXHUyMTM0XCIsXCJPc2xhc2hcIjpcIlxcdTAwRDhcIixcIm9zbGFzaFwiOlwiXFx1MDBGOFwiLFwib3NvbFwiOlwiXFx1MjI5OFwiLFwiT3RpbGRlXCI6XCJcXHUwMEQ1XCIsXCJvdGlsZGVcIjpcIlxcdTAwRjVcIixcIm90aW1lc2FzXCI6XCJcXHUyQTM2XCIsXCJPdGltZXNcIjpcIlxcdTJBMzdcIixcIm90aW1lc1wiOlwiXFx1MjI5N1wiLFwiT3VtbFwiOlwiXFx1MDBENlwiLFwib3VtbFwiOlwiXFx1MDBGNlwiLFwib3ZiYXJcIjpcIlxcdTIzM0RcIixcIk92ZXJCYXJcIjpcIlxcdTIwM0VcIixcIk92ZXJCcmFjZVwiOlwiXFx1MjNERVwiLFwiT3ZlckJyYWNrZXRcIjpcIlxcdTIzQjRcIixcIk92ZXJQYXJlbnRoZXNpc1wiOlwiXFx1MjNEQ1wiLFwicGFyYVwiOlwiXFx1MDBCNlwiLFwicGFyYWxsZWxcIjpcIlxcdTIyMjVcIixcInBhclwiOlwiXFx1MjIyNVwiLFwicGFyc2ltXCI6XCJcXHUyQUYzXCIsXCJwYXJzbFwiOlwiXFx1MkFGRFwiLFwicGFydFwiOlwiXFx1MjIwMlwiLFwiUGFydGlhbERcIjpcIlxcdTIyMDJcIixcIlBjeVwiOlwiXFx1MDQxRlwiLFwicGN5XCI6XCJcXHUwNDNGXCIsXCJwZXJjbnRcIjpcIiVcIixcInBlcmlvZFwiOlwiLlwiLFwicGVybWlsXCI6XCJcXHUyMDMwXCIsXCJwZXJwXCI6XCJcXHUyMkE1XCIsXCJwZXJ0ZW5rXCI6XCJcXHUyMDMxXCIsXCJQZnJcIjpcIlxcdUQ4MzVcXHVERDEzXCIsXCJwZnJcIjpcIlxcdUQ4MzVcXHVERDJEXCIsXCJQaGlcIjpcIlxcdTAzQTZcIixcInBoaVwiOlwiXFx1MDNDNlwiLFwicGhpdlwiOlwiXFx1MDNENVwiLFwicGhtbWF0XCI6XCJcXHUyMTMzXCIsXCJwaG9uZVwiOlwiXFx1MjYwRVwiLFwiUGlcIjpcIlxcdTAzQTBcIixcInBpXCI6XCJcXHUwM0MwXCIsXCJwaXRjaGZvcmtcIjpcIlxcdTIyRDRcIixcInBpdlwiOlwiXFx1MDNENlwiLFwicGxhbmNrXCI6XCJcXHUyMTBGXCIsXCJwbGFuY2toXCI6XCJcXHUyMTBFXCIsXCJwbGFua3ZcIjpcIlxcdTIxMEZcIixcInBsdXNhY2lyXCI6XCJcXHUyQTIzXCIsXCJwbHVzYlwiOlwiXFx1MjI5RVwiLFwicGx1c2NpclwiOlwiXFx1MkEyMlwiLFwicGx1c1wiOlwiK1wiLFwicGx1c2RvXCI6XCJcXHUyMjE0XCIsXCJwbHVzZHVcIjpcIlxcdTJBMjVcIixcInBsdXNlXCI6XCJcXHUyQTcyXCIsXCJQbHVzTWludXNcIjpcIlxcdTAwQjFcIixcInBsdXNtblwiOlwiXFx1MDBCMVwiLFwicGx1c3NpbVwiOlwiXFx1MkEyNlwiLFwicGx1c3R3b1wiOlwiXFx1MkEyN1wiLFwicG1cIjpcIlxcdTAwQjFcIixcIlBvaW5jYXJlcGxhbmVcIjpcIlxcdTIxMENcIixcInBvaW50aW50XCI6XCJcXHUyQTE1XCIsXCJwb3BmXCI6XCJcXHVEODM1XFx1REQ2MVwiLFwiUG9wZlwiOlwiXFx1MjExOVwiLFwicG91bmRcIjpcIlxcdTAwQTNcIixcInByYXBcIjpcIlxcdTJBQjdcIixcIlByXCI6XCJcXHUyQUJCXCIsXCJwclwiOlwiXFx1MjI3QVwiLFwicHJjdWVcIjpcIlxcdTIyN0NcIixcInByZWNhcHByb3hcIjpcIlxcdTJBQjdcIixcInByZWNcIjpcIlxcdTIyN0FcIixcInByZWNjdXJseWVxXCI6XCJcXHUyMjdDXCIsXCJQcmVjZWRlc1wiOlwiXFx1MjI3QVwiLFwiUHJlY2VkZXNFcXVhbFwiOlwiXFx1MkFBRlwiLFwiUHJlY2VkZXNTbGFudEVxdWFsXCI6XCJcXHUyMjdDXCIsXCJQcmVjZWRlc1RpbGRlXCI6XCJcXHUyMjdFXCIsXCJwcmVjZXFcIjpcIlxcdTJBQUZcIixcInByZWNuYXBwcm94XCI6XCJcXHUyQUI5XCIsXCJwcmVjbmVxcVwiOlwiXFx1MkFCNVwiLFwicHJlY25zaW1cIjpcIlxcdTIyRThcIixcInByZVwiOlwiXFx1MkFBRlwiLFwicHJFXCI6XCJcXHUyQUIzXCIsXCJwcmVjc2ltXCI6XCJcXHUyMjdFXCIsXCJwcmltZVwiOlwiXFx1MjAzMlwiLFwiUHJpbWVcIjpcIlxcdTIwMzNcIixcInByaW1lc1wiOlwiXFx1MjExOVwiLFwicHJuYXBcIjpcIlxcdTJBQjlcIixcInBybkVcIjpcIlxcdTJBQjVcIixcInBybnNpbVwiOlwiXFx1MjJFOFwiLFwicHJvZFwiOlwiXFx1MjIwRlwiLFwiUHJvZHVjdFwiOlwiXFx1MjIwRlwiLFwicHJvZmFsYXJcIjpcIlxcdTIzMkVcIixcInByb2ZsaW5lXCI6XCJcXHUyMzEyXCIsXCJwcm9mc3VyZlwiOlwiXFx1MjMxM1wiLFwicHJvcFwiOlwiXFx1MjIxRFwiLFwiUHJvcG9ydGlvbmFsXCI6XCJcXHUyMjFEXCIsXCJQcm9wb3J0aW9uXCI6XCJcXHUyMjM3XCIsXCJwcm9wdG9cIjpcIlxcdTIyMURcIixcInByc2ltXCI6XCJcXHUyMjdFXCIsXCJwcnVyZWxcIjpcIlxcdTIyQjBcIixcIlBzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FCXCIsXCJwc2NyXCI6XCJcXHVEODM1XFx1RENDNVwiLFwiUHNpXCI6XCJcXHUwM0E4XCIsXCJwc2lcIjpcIlxcdTAzQzhcIixcInB1bmNzcFwiOlwiXFx1MjAwOFwiLFwiUWZyXCI6XCJcXHVEODM1XFx1REQxNFwiLFwicWZyXCI6XCJcXHVEODM1XFx1REQyRVwiLFwicWludFwiOlwiXFx1MkEwQ1wiLFwicW9wZlwiOlwiXFx1RDgzNVxcdURENjJcIixcIlFvcGZcIjpcIlxcdTIxMUFcIixcInFwcmltZVwiOlwiXFx1MjA1N1wiLFwiUXNjclwiOlwiXFx1RDgzNVxcdURDQUNcIixcInFzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M2XCIsXCJxdWF0ZXJuaW9uc1wiOlwiXFx1MjEwRFwiLFwicXVhdGludFwiOlwiXFx1MkExNlwiLFwicXVlc3RcIjpcIj9cIixcInF1ZXN0ZXFcIjpcIlxcdTIyNUZcIixcInF1b3RcIjpcIlxcXCJcIixcIlFVT1RcIjpcIlxcXCJcIixcInJBYXJyXCI6XCJcXHUyMURCXCIsXCJyYWNlXCI6XCJcXHUyMjNEXFx1MDMzMVwiLFwiUmFjdXRlXCI6XCJcXHUwMTU0XCIsXCJyYWN1dGVcIjpcIlxcdTAxNTVcIixcInJhZGljXCI6XCJcXHUyMjFBXCIsXCJyYWVtcHR5dlwiOlwiXFx1MjlCM1wiLFwicmFuZ1wiOlwiXFx1MjdFOVwiLFwiUmFuZ1wiOlwiXFx1MjdFQlwiLFwicmFuZ2RcIjpcIlxcdTI5OTJcIixcInJhbmdlXCI6XCJcXHUyOUE1XCIsXCJyYW5nbGVcIjpcIlxcdTI3RTlcIixcInJhcXVvXCI6XCJcXHUwMEJCXCIsXCJyYXJyYXBcIjpcIlxcdTI5NzVcIixcInJhcnJiXCI6XCJcXHUyMUU1XCIsXCJyYXJyYmZzXCI6XCJcXHUyOTIwXCIsXCJyYXJyY1wiOlwiXFx1MjkzM1wiLFwicmFyclwiOlwiXFx1MjE5MlwiLFwiUmFyclwiOlwiXFx1MjFBMFwiLFwickFyclwiOlwiXFx1MjFEMlwiLFwicmFycmZzXCI6XCJcXHUyOTFFXCIsXCJyYXJyaGtcIjpcIlxcdTIxQUFcIixcInJhcnJscFwiOlwiXFx1MjFBQ1wiLFwicmFycnBsXCI6XCJcXHUyOTQ1XCIsXCJyYXJyc2ltXCI6XCJcXHUyOTc0XCIsXCJSYXJydGxcIjpcIlxcdTI5MTZcIixcInJhcnJ0bFwiOlwiXFx1MjFBM1wiLFwicmFycndcIjpcIlxcdTIxOURcIixcInJhdGFpbFwiOlwiXFx1MjkxQVwiLFwickF0YWlsXCI6XCJcXHUyOTFDXCIsXCJyYXRpb1wiOlwiXFx1MjIzNlwiLFwicmF0aW9uYWxzXCI6XCJcXHUyMTFBXCIsXCJyYmFyclwiOlwiXFx1MjkwRFwiLFwickJhcnJcIjpcIlxcdTI5MEZcIixcIlJCYXJyXCI6XCJcXHUyOTEwXCIsXCJyYmJya1wiOlwiXFx1Mjc3M1wiLFwicmJyYWNlXCI6XCJ9XCIsXCJyYnJhY2tcIjpcIl1cIixcInJicmtlXCI6XCJcXHUyOThDXCIsXCJyYnJrc2xkXCI6XCJcXHUyOThFXCIsXCJyYnJrc2x1XCI6XCJcXHUyOTkwXCIsXCJSY2Fyb25cIjpcIlxcdTAxNThcIixcInJjYXJvblwiOlwiXFx1MDE1OVwiLFwiUmNlZGlsXCI6XCJcXHUwMTU2XCIsXCJyY2VkaWxcIjpcIlxcdTAxNTdcIixcInJjZWlsXCI6XCJcXHUyMzA5XCIsXCJyY3ViXCI6XCJ9XCIsXCJSY3lcIjpcIlxcdTA0MjBcIixcInJjeVwiOlwiXFx1MDQ0MFwiLFwicmRjYVwiOlwiXFx1MjkzN1wiLFwicmRsZGhhclwiOlwiXFx1Mjk2OVwiLFwicmRxdW9cIjpcIlxcdTIwMURcIixcInJkcXVvclwiOlwiXFx1MjAxRFwiLFwicmRzaFwiOlwiXFx1MjFCM1wiLFwicmVhbFwiOlwiXFx1MjExQ1wiLFwicmVhbGluZVwiOlwiXFx1MjExQlwiLFwicmVhbHBhcnRcIjpcIlxcdTIxMUNcIixcInJlYWxzXCI6XCJcXHUyMTFEXCIsXCJSZVwiOlwiXFx1MjExQ1wiLFwicmVjdFwiOlwiXFx1MjVBRFwiLFwicmVnXCI6XCJcXHUwMEFFXCIsXCJSRUdcIjpcIlxcdTAwQUVcIixcIlJldmVyc2VFbGVtZW50XCI6XCJcXHUyMjBCXCIsXCJSZXZlcnNlRXF1aWxpYnJpdW1cIjpcIlxcdTIxQ0JcIixcIlJldmVyc2VVcEVxdWlsaWJyaXVtXCI6XCJcXHUyOTZGXCIsXCJyZmlzaHRcIjpcIlxcdTI5N0RcIixcInJmbG9vclwiOlwiXFx1MjMwQlwiLFwicmZyXCI6XCJcXHVEODM1XFx1REQyRlwiLFwiUmZyXCI6XCJcXHUyMTFDXCIsXCJySGFyXCI6XCJcXHUyOTY0XCIsXCJyaGFyZFwiOlwiXFx1MjFDMVwiLFwicmhhcnVcIjpcIlxcdTIxQzBcIixcInJoYXJ1bFwiOlwiXFx1Mjk2Q1wiLFwiUmhvXCI6XCJcXHUwM0ExXCIsXCJyaG9cIjpcIlxcdTAzQzFcIixcInJob3ZcIjpcIlxcdTAzRjFcIixcIlJpZ2h0QW5nbGVCcmFja2V0XCI6XCJcXHUyN0U5XCIsXCJSaWdodEFycm93QmFyXCI6XCJcXHUyMUU1XCIsXCJyaWdodGFycm93XCI6XCJcXHUyMTkyXCIsXCJSaWdodEFycm93XCI6XCJcXHUyMTkyXCIsXCJSaWdodGFycm93XCI6XCJcXHUyMUQyXCIsXCJSaWdodEFycm93TGVmdEFycm93XCI6XCJcXHUyMUM0XCIsXCJyaWdodGFycm93dGFpbFwiOlwiXFx1MjFBM1wiLFwiUmlnaHRDZWlsaW5nXCI6XCJcXHUyMzA5XCIsXCJSaWdodERvdWJsZUJyYWNrZXRcIjpcIlxcdTI3RTdcIixcIlJpZ2h0RG93blRlZVZlY3RvclwiOlwiXFx1Mjk1RFwiLFwiUmlnaHREb3duVmVjdG9yQmFyXCI6XCJcXHUyOTU1XCIsXCJSaWdodERvd25WZWN0b3JcIjpcIlxcdTIxQzJcIixcIlJpZ2h0Rmxvb3JcIjpcIlxcdTIzMEJcIixcInJpZ2h0aGFycG9vbmRvd25cIjpcIlxcdTIxQzFcIixcInJpZ2h0aGFycG9vbnVwXCI6XCJcXHUyMUMwXCIsXCJyaWdodGxlZnRhcnJvd3NcIjpcIlxcdTIxQzRcIixcInJpZ2h0bGVmdGhhcnBvb25zXCI6XCJcXHUyMUNDXCIsXCJyaWdodHJpZ2h0YXJyb3dzXCI6XCJcXHUyMUM5XCIsXCJyaWdodHNxdWlnYXJyb3dcIjpcIlxcdTIxOURcIixcIlJpZ2h0VGVlQXJyb3dcIjpcIlxcdTIxQTZcIixcIlJpZ2h0VGVlXCI6XCJcXHUyMkEyXCIsXCJSaWdodFRlZVZlY3RvclwiOlwiXFx1Mjk1QlwiLFwicmlnaHR0aHJlZXRpbWVzXCI6XCJcXHUyMkNDXCIsXCJSaWdodFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUQwXCIsXCJSaWdodFRyaWFuZ2xlXCI6XCJcXHUyMkIzXCIsXCJSaWdodFRyaWFuZ2xlRXF1YWxcIjpcIlxcdTIyQjVcIixcIlJpZ2h0VXBEb3duVmVjdG9yXCI6XCJcXHUyOTRGXCIsXCJSaWdodFVwVGVlVmVjdG9yXCI6XCJcXHUyOTVDXCIsXCJSaWdodFVwVmVjdG9yQmFyXCI6XCJcXHUyOTU0XCIsXCJSaWdodFVwVmVjdG9yXCI6XCJcXHUyMUJFXCIsXCJSaWdodFZlY3RvckJhclwiOlwiXFx1Mjk1M1wiLFwiUmlnaHRWZWN0b3JcIjpcIlxcdTIxQzBcIixcInJpbmdcIjpcIlxcdTAyREFcIixcInJpc2luZ2RvdHNlcVwiOlwiXFx1MjI1M1wiLFwicmxhcnJcIjpcIlxcdTIxQzRcIixcInJsaGFyXCI6XCJcXHUyMUNDXCIsXCJybG1cIjpcIlxcdTIwMEZcIixcInJtb3VzdGFjaGVcIjpcIlxcdTIzQjFcIixcInJtb3VzdFwiOlwiXFx1MjNCMVwiLFwicm5taWRcIjpcIlxcdTJBRUVcIixcInJvYW5nXCI6XCJcXHUyN0VEXCIsXCJyb2FyclwiOlwiXFx1MjFGRVwiLFwicm9icmtcIjpcIlxcdTI3RTdcIixcInJvcGFyXCI6XCJcXHUyOTg2XCIsXCJyb3BmXCI6XCJcXHVEODM1XFx1REQ2M1wiLFwiUm9wZlwiOlwiXFx1MjExRFwiLFwicm9wbHVzXCI6XCJcXHUyQTJFXCIsXCJyb3RpbWVzXCI6XCJcXHUyQTM1XCIsXCJSb3VuZEltcGxpZXNcIjpcIlxcdTI5NzBcIixcInJwYXJcIjpcIilcIixcInJwYXJndFwiOlwiXFx1Mjk5NFwiLFwicnBwb2xpbnRcIjpcIlxcdTJBMTJcIixcInJyYXJyXCI6XCJcXHUyMUM5XCIsXCJScmlnaHRhcnJvd1wiOlwiXFx1MjFEQlwiLFwicnNhcXVvXCI6XCJcXHUyMDNBXCIsXCJyc2NyXCI6XCJcXHVEODM1XFx1RENDN1wiLFwiUnNjclwiOlwiXFx1MjExQlwiLFwicnNoXCI6XCJcXHUyMUIxXCIsXCJSc2hcIjpcIlxcdTIxQjFcIixcInJzcWJcIjpcIl1cIixcInJzcXVvXCI6XCJcXHUyMDE5XCIsXCJyc3F1b3JcIjpcIlxcdTIwMTlcIixcInJ0aHJlZVwiOlwiXFx1MjJDQ1wiLFwicnRpbWVzXCI6XCJcXHUyMkNBXCIsXCJydHJpXCI6XCJcXHUyNUI5XCIsXCJydHJpZVwiOlwiXFx1MjJCNVwiLFwicnRyaWZcIjpcIlxcdTI1QjhcIixcInJ0cmlsdHJpXCI6XCJcXHUyOUNFXCIsXCJSdWxlRGVsYXllZFwiOlwiXFx1MjlGNFwiLFwicnVsdWhhclwiOlwiXFx1Mjk2OFwiLFwicnhcIjpcIlxcdTIxMUVcIixcIlNhY3V0ZVwiOlwiXFx1MDE1QVwiLFwic2FjdXRlXCI6XCJcXHUwMTVCXCIsXCJzYnF1b1wiOlwiXFx1MjAxQVwiLFwic2NhcFwiOlwiXFx1MkFCOFwiLFwiU2Nhcm9uXCI6XCJcXHUwMTYwXCIsXCJzY2Fyb25cIjpcIlxcdTAxNjFcIixcIlNjXCI6XCJcXHUyQUJDXCIsXCJzY1wiOlwiXFx1MjI3QlwiLFwic2NjdWVcIjpcIlxcdTIyN0RcIixcInNjZVwiOlwiXFx1MkFCMFwiLFwic2NFXCI6XCJcXHUyQUI0XCIsXCJTY2VkaWxcIjpcIlxcdTAxNUVcIixcInNjZWRpbFwiOlwiXFx1MDE1RlwiLFwiU2NpcmNcIjpcIlxcdTAxNUNcIixcInNjaXJjXCI6XCJcXHUwMTVEXCIsXCJzY25hcFwiOlwiXFx1MkFCQVwiLFwic2NuRVwiOlwiXFx1MkFCNlwiLFwic2Nuc2ltXCI6XCJcXHUyMkU5XCIsXCJzY3BvbGludFwiOlwiXFx1MkExM1wiLFwic2NzaW1cIjpcIlxcdTIyN0ZcIixcIlNjeVwiOlwiXFx1MDQyMVwiLFwic2N5XCI6XCJcXHUwNDQxXCIsXCJzZG90YlwiOlwiXFx1MjJBMVwiLFwic2RvdFwiOlwiXFx1MjJDNVwiLFwic2RvdGVcIjpcIlxcdTJBNjZcIixcInNlYXJoa1wiOlwiXFx1MjkyNVwiLFwic2VhcnJcIjpcIlxcdTIxOThcIixcInNlQXJyXCI6XCJcXHUyMUQ4XCIsXCJzZWFycm93XCI6XCJcXHUyMTk4XCIsXCJzZWN0XCI6XCJcXHUwMEE3XCIsXCJzZW1pXCI6XCI7XCIsXCJzZXN3YXJcIjpcIlxcdTI5MjlcIixcInNldG1pbnVzXCI6XCJcXHUyMjE2XCIsXCJzZXRtblwiOlwiXFx1MjIxNlwiLFwic2V4dFwiOlwiXFx1MjczNlwiLFwiU2ZyXCI6XCJcXHVEODM1XFx1REQxNlwiLFwic2ZyXCI6XCJcXHVEODM1XFx1REQzMFwiLFwic2Zyb3duXCI6XCJcXHUyMzIyXCIsXCJzaGFycFwiOlwiXFx1MjY2RlwiLFwiU0hDSGN5XCI6XCJcXHUwNDI5XCIsXCJzaGNoY3lcIjpcIlxcdTA0NDlcIixcIlNIY3lcIjpcIlxcdTA0MjhcIixcInNoY3lcIjpcIlxcdTA0NDhcIixcIlNob3J0RG93bkFycm93XCI6XCJcXHUyMTkzXCIsXCJTaG9ydExlZnRBcnJvd1wiOlwiXFx1MjE5MFwiLFwic2hvcnRtaWRcIjpcIlxcdTIyMjNcIixcInNob3J0cGFyYWxsZWxcIjpcIlxcdTIyMjVcIixcIlNob3J0UmlnaHRBcnJvd1wiOlwiXFx1MjE5MlwiLFwiU2hvcnRVcEFycm93XCI6XCJcXHUyMTkxXCIsXCJzaHlcIjpcIlxcdTAwQURcIixcIlNpZ21hXCI6XCJcXHUwM0EzXCIsXCJzaWdtYVwiOlwiXFx1MDNDM1wiLFwic2lnbWFmXCI6XCJcXHUwM0MyXCIsXCJzaWdtYXZcIjpcIlxcdTAzQzJcIixcInNpbVwiOlwiXFx1MjIzQ1wiLFwic2ltZG90XCI6XCJcXHUyQTZBXCIsXCJzaW1lXCI6XCJcXHUyMjQzXCIsXCJzaW1lcVwiOlwiXFx1MjI0M1wiLFwic2ltZ1wiOlwiXFx1MkE5RVwiLFwic2ltZ0VcIjpcIlxcdTJBQTBcIixcInNpbWxcIjpcIlxcdTJBOURcIixcInNpbWxFXCI6XCJcXHUyQTlGXCIsXCJzaW1uZVwiOlwiXFx1MjI0NlwiLFwic2ltcGx1c1wiOlwiXFx1MkEyNFwiLFwic2ltcmFyclwiOlwiXFx1Mjk3MlwiLFwic2xhcnJcIjpcIlxcdTIxOTBcIixcIlNtYWxsQ2lyY2xlXCI6XCJcXHUyMjE4XCIsXCJzbWFsbHNldG1pbnVzXCI6XCJcXHUyMjE2XCIsXCJzbWFzaHBcIjpcIlxcdTJBMzNcIixcInNtZXBhcnNsXCI6XCJcXHUyOUU0XCIsXCJzbWlkXCI6XCJcXHUyMjIzXCIsXCJzbWlsZVwiOlwiXFx1MjMyM1wiLFwic210XCI6XCJcXHUyQUFBXCIsXCJzbXRlXCI6XCJcXHUyQUFDXCIsXCJzbXRlc1wiOlwiXFx1MkFBQ1xcdUZFMDBcIixcIlNPRlRjeVwiOlwiXFx1MDQyQ1wiLFwic29mdGN5XCI6XCJcXHUwNDRDXCIsXCJzb2xiYXJcIjpcIlxcdTIzM0ZcIixcInNvbGJcIjpcIlxcdTI5QzRcIixcInNvbFwiOlwiL1wiLFwiU29wZlwiOlwiXFx1RDgzNVxcdURENEFcIixcInNvcGZcIjpcIlxcdUQ4MzVcXHVERDY0XCIsXCJzcGFkZXNcIjpcIlxcdTI2NjBcIixcInNwYWRlc3VpdFwiOlwiXFx1MjY2MFwiLFwic3BhclwiOlwiXFx1MjIyNVwiLFwic3FjYXBcIjpcIlxcdTIyOTNcIixcInNxY2Fwc1wiOlwiXFx1MjI5M1xcdUZFMDBcIixcInNxY3VwXCI6XCJcXHUyMjk0XCIsXCJzcWN1cHNcIjpcIlxcdTIyOTRcXHVGRTAwXCIsXCJTcXJ0XCI6XCJcXHUyMjFBXCIsXCJzcXN1YlwiOlwiXFx1MjI4RlwiLFwic3FzdWJlXCI6XCJcXHUyMjkxXCIsXCJzcXN1YnNldFwiOlwiXFx1MjI4RlwiLFwic3FzdWJzZXRlcVwiOlwiXFx1MjI5MVwiLFwic3FzdXBcIjpcIlxcdTIyOTBcIixcInNxc3VwZVwiOlwiXFx1MjI5MlwiLFwic3FzdXBzZXRcIjpcIlxcdTIyOTBcIixcInNxc3Vwc2V0ZXFcIjpcIlxcdTIyOTJcIixcInNxdWFyZVwiOlwiXFx1MjVBMVwiLFwiU3F1YXJlXCI6XCJcXHUyNUExXCIsXCJTcXVhcmVJbnRlcnNlY3Rpb25cIjpcIlxcdTIyOTNcIixcIlNxdWFyZVN1YnNldFwiOlwiXFx1MjI4RlwiLFwiU3F1YXJlU3Vic2V0RXF1YWxcIjpcIlxcdTIyOTFcIixcIlNxdWFyZVN1cGVyc2V0XCI6XCJcXHUyMjkwXCIsXCJTcXVhcmVTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjkyXCIsXCJTcXVhcmVVbmlvblwiOlwiXFx1MjI5NFwiLFwic3F1YXJmXCI6XCJcXHUyNUFBXCIsXCJzcXVcIjpcIlxcdTI1QTFcIixcInNxdWZcIjpcIlxcdTI1QUFcIixcInNyYXJyXCI6XCJcXHUyMTkyXCIsXCJTc2NyXCI6XCJcXHVEODM1XFx1RENBRVwiLFwic3NjclwiOlwiXFx1RDgzNVxcdURDQzhcIixcInNzZXRtblwiOlwiXFx1MjIxNlwiLFwic3NtaWxlXCI6XCJcXHUyMzIzXCIsXCJzc3RhcmZcIjpcIlxcdTIyQzZcIixcIlN0YXJcIjpcIlxcdTIyQzZcIixcInN0YXJcIjpcIlxcdTI2MDZcIixcInN0YXJmXCI6XCJcXHUyNjA1XCIsXCJzdHJhaWdodGVwc2lsb25cIjpcIlxcdTAzRjVcIixcInN0cmFpZ2h0cGhpXCI6XCJcXHUwM0Q1XCIsXCJzdHJuc1wiOlwiXFx1MDBBRlwiLFwic3ViXCI6XCJcXHUyMjgyXCIsXCJTdWJcIjpcIlxcdTIyRDBcIixcInN1YmRvdFwiOlwiXFx1MkFCRFwiLFwic3ViRVwiOlwiXFx1MkFDNVwiLFwic3ViZVwiOlwiXFx1MjI4NlwiLFwic3ViZWRvdFwiOlwiXFx1MkFDM1wiLFwic3VibXVsdFwiOlwiXFx1MkFDMVwiLFwic3VibkVcIjpcIlxcdTJBQ0JcIixcInN1Ym5lXCI6XCJcXHUyMjhBXCIsXCJzdWJwbHVzXCI6XCJcXHUyQUJGXCIsXCJzdWJyYXJyXCI6XCJcXHUyOTc5XCIsXCJzdWJzZXRcIjpcIlxcdTIyODJcIixcIlN1YnNldFwiOlwiXFx1MjJEMFwiLFwic3Vic2V0ZXFcIjpcIlxcdTIyODZcIixcInN1YnNldGVxcVwiOlwiXFx1MkFDNVwiLFwiU3Vic2V0RXF1YWxcIjpcIlxcdTIyODZcIixcInN1YnNldG5lcVwiOlwiXFx1MjI4QVwiLFwic3Vic2V0bmVxcVwiOlwiXFx1MkFDQlwiLFwic3Vic2ltXCI6XCJcXHUyQUM3XCIsXCJzdWJzdWJcIjpcIlxcdTJBRDVcIixcInN1YnN1cFwiOlwiXFx1MkFEM1wiLFwic3VjY2FwcHJveFwiOlwiXFx1MkFCOFwiLFwic3VjY1wiOlwiXFx1MjI3QlwiLFwic3VjY2N1cmx5ZXFcIjpcIlxcdTIyN0RcIixcIlN1Y2NlZWRzXCI6XCJcXHUyMjdCXCIsXCJTdWNjZWVkc0VxdWFsXCI6XCJcXHUyQUIwXCIsXCJTdWNjZWVkc1NsYW50RXF1YWxcIjpcIlxcdTIyN0RcIixcIlN1Y2NlZWRzVGlsZGVcIjpcIlxcdTIyN0ZcIixcInN1Y2NlcVwiOlwiXFx1MkFCMFwiLFwic3VjY25hcHByb3hcIjpcIlxcdTJBQkFcIixcInN1Y2NuZXFxXCI6XCJcXHUyQUI2XCIsXCJzdWNjbnNpbVwiOlwiXFx1MjJFOVwiLFwic3VjY3NpbVwiOlwiXFx1MjI3RlwiLFwiU3VjaFRoYXRcIjpcIlxcdTIyMEJcIixcInN1bVwiOlwiXFx1MjIxMVwiLFwiU3VtXCI6XCJcXHUyMjExXCIsXCJzdW5nXCI6XCJcXHUyNjZBXCIsXCJzdXAxXCI6XCJcXHUwMEI5XCIsXCJzdXAyXCI6XCJcXHUwMEIyXCIsXCJzdXAzXCI6XCJcXHUwMEIzXCIsXCJzdXBcIjpcIlxcdTIyODNcIixcIlN1cFwiOlwiXFx1MjJEMVwiLFwic3VwZG90XCI6XCJcXHUyQUJFXCIsXCJzdXBkc3ViXCI6XCJcXHUyQUQ4XCIsXCJzdXBFXCI6XCJcXHUyQUM2XCIsXCJzdXBlXCI6XCJcXHUyMjg3XCIsXCJzdXBlZG90XCI6XCJcXHUyQUM0XCIsXCJTdXBlcnNldFwiOlwiXFx1MjI4M1wiLFwiU3VwZXJzZXRFcXVhbFwiOlwiXFx1MjI4N1wiLFwic3VwaHNvbFwiOlwiXFx1MjdDOVwiLFwic3VwaHN1YlwiOlwiXFx1MkFEN1wiLFwic3VwbGFyclwiOlwiXFx1Mjk3QlwiLFwic3VwbXVsdFwiOlwiXFx1MkFDMlwiLFwic3VwbkVcIjpcIlxcdTJBQ0NcIixcInN1cG5lXCI6XCJcXHUyMjhCXCIsXCJzdXBwbHVzXCI6XCJcXHUyQUMwXCIsXCJzdXBzZXRcIjpcIlxcdTIyODNcIixcIlN1cHNldFwiOlwiXFx1MjJEMVwiLFwic3Vwc2V0ZXFcIjpcIlxcdTIyODdcIixcInN1cHNldGVxcVwiOlwiXFx1MkFDNlwiLFwic3Vwc2V0bmVxXCI6XCJcXHUyMjhCXCIsXCJzdXBzZXRuZXFxXCI6XCJcXHUyQUNDXCIsXCJzdXBzaW1cIjpcIlxcdTJBQzhcIixcInN1cHN1YlwiOlwiXFx1MkFENFwiLFwic3Vwc3VwXCI6XCJcXHUyQUQ2XCIsXCJzd2FyaGtcIjpcIlxcdTI5MjZcIixcInN3YXJyXCI6XCJcXHUyMTk5XCIsXCJzd0FyclwiOlwiXFx1MjFEOVwiLFwic3dhcnJvd1wiOlwiXFx1MjE5OVwiLFwic3dud2FyXCI6XCJcXHUyOTJBXCIsXCJzemxpZ1wiOlwiXFx1MDBERlwiLFwiVGFiXCI6XCJcXHRcIixcInRhcmdldFwiOlwiXFx1MjMxNlwiLFwiVGF1XCI6XCJcXHUwM0E0XCIsXCJ0YXVcIjpcIlxcdTAzQzRcIixcInRicmtcIjpcIlxcdTIzQjRcIixcIlRjYXJvblwiOlwiXFx1MDE2NFwiLFwidGNhcm9uXCI6XCJcXHUwMTY1XCIsXCJUY2VkaWxcIjpcIlxcdTAxNjJcIixcInRjZWRpbFwiOlwiXFx1MDE2M1wiLFwiVGN5XCI6XCJcXHUwNDIyXCIsXCJ0Y3lcIjpcIlxcdTA0NDJcIixcInRkb3RcIjpcIlxcdTIwREJcIixcInRlbHJlY1wiOlwiXFx1MjMxNVwiLFwiVGZyXCI6XCJcXHVEODM1XFx1REQxN1wiLFwidGZyXCI6XCJcXHVEODM1XFx1REQzMVwiLFwidGhlcmU0XCI6XCJcXHUyMjM0XCIsXCJ0aGVyZWZvcmVcIjpcIlxcdTIyMzRcIixcIlRoZXJlZm9yZVwiOlwiXFx1MjIzNFwiLFwiVGhldGFcIjpcIlxcdTAzOThcIixcInRoZXRhXCI6XCJcXHUwM0I4XCIsXCJ0aGV0YXN5bVwiOlwiXFx1MDNEMVwiLFwidGhldGF2XCI6XCJcXHUwM0QxXCIsXCJ0aGlja2FwcHJveFwiOlwiXFx1MjI0OFwiLFwidGhpY2tzaW1cIjpcIlxcdTIyM0NcIixcIlRoaWNrU3BhY2VcIjpcIlxcdTIwNUZcXHUyMDBBXCIsXCJUaGluU3BhY2VcIjpcIlxcdTIwMDlcIixcInRoaW5zcFwiOlwiXFx1MjAwOVwiLFwidGhrYXBcIjpcIlxcdTIyNDhcIixcInRoa3NpbVwiOlwiXFx1MjIzQ1wiLFwiVEhPUk5cIjpcIlxcdTAwREVcIixcInRob3JuXCI6XCJcXHUwMEZFXCIsXCJ0aWxkZVwiOlwiXFx1MDJEQ1wiLFwiVGlsZGVcIjpcIlxcdTIyM0NcIixcIlRpbGRlRXF1YWxcIjpcIlxcdTIyNDNcIixcIlRpbGRlRnVsbEVxdWFsXCI6XCJcXHUyMjQ1XCIsXCJUaWxkZVRpbGRlXCI6XCJcXHUyMjQ4XCIsXCJ0aW1lc2JhclwiOlwiXFx1MkEzMVwiLFwidGltZXNiXCI6XCJcXHUyMkEwXCIsXCJ0aW1lc1wiOlwiXFx1MDBEN1wiLFwidGltZXNkXCI6XCJcXHUyQTMwXCIsXCJ0aW50XCI6XCJcXHUyMjJEXCIsXCJ0b2VhXCI6XCJcXHUyOTI4XCIsXCJ0b3Bib3RcIjpcIlxcdTIzMzZcIixcInRvcGNpclwiOlwiXFx1MkFGMVwiLFwidG9wXCI6XCJcXHUyMkE0XCIsXCJUb3BmXCI6XCJcXHVEODM1XFx1REQ0QlwiLFwidG9wZlwiOlwiXFx1RDgzNVxcdURENjVcIixcInRvcGZvcmtcIjpcIlxcdTJBREFcIixcInRvc2FcIjpcIlxcdTI5MjlcIixcInRwcmltZVwiOlwiXFx1MjAzNFwiLFwidHJhZGVcIjpcIlxcdTIxMjJcIixcIlRSQURFXCI6XCJcXHUyMTIyXCIsXCJ0cmlhbmdsZVwiOlwiXFx1MjVCNVwiLFwidHJpYW5nbGVkb3duXCI6XCJcXHUyNUJGXCIsXCJ0cmlhbmdsZWxlZnRcIjpcIlxcdTI1QzNcIixcInRyaWFuZ2xlbGVmdGVxXCI6XCJcXHUyMkI0XCIsXCJ0cmlhbmdsZXFcIjpcIlxcdTIyNUNcIixcInRyaWFuZ2xlcmlnaHRcIjpcIlxcdTI1QjlcIixcInRyaWFuZ2xlcmlnaHRlcVwiOlwiXFx1MjJCNVwiLFwidHJpZG90XCI6XCJcXHUyNUVDXCIsXCJ0cmllXCI6XCJcXHUyMjVDXCIsXCJ0cmltaW51c1wiOlwiXFx1MkEzQVwiLFwiVHJpcGxlRG90XCI6XCJcXHUyMERCXCIsXCJ0cmlwbHVzXCI6XCJcXHUyQTM5XCIsXCJ0cmlzYlwiOlwiXFx1MjlDRFwiLFwidHJpdGltZVwiOlwiXFx1MkEzQlwiLFwidHJwZXppdW1cIjpcIlxcdTIzRTJcIixcIlRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FGXCIsXCJ0c2NyXCI6XCJcXHVEODM1XFx1RENDOVwiLFwiVFNjeVwiOlwiXFx1MDQyNlwiLFwidHNjeVwiOlwiXFx1MDQ0NlwiLFwiVFNIY3lcIjpcIlxcdTA0MEJcIixcInRzaGN5XCI6XCJcXHUwNDVCXCIsXCJUc3Ryb2tcIjpcIlxcdTAxNjZcIixcInRzdHJva1wiOlwiXFx1MDE2N1wiLFwidHdpeHRcIjpcIlxcdTIyNkNcIixcInR3b2hlYWRsZWZ0YXJyb3dcIjpcIlxcdTIxOUVcIixcInR3b2hlYWRyaWdodGFycm93XCI6XCJcXHUyMUEwXCIsXCJVYWN1dGVcIjpcIlxcdTAwREFcIixcInVhY3V0ZVwiOlwiXFx1MDBGQVwiLFwidWFyclwiOlwiXFx1MjE5MVwiLFwiVWFyclwiOlwiXFx1MjE5RlwiLFwidUFyclwiOlwiXFx1MjFEMVwiLFwiVWFycm9jaXJcIjpcIlxcdTI5NDlcIixcIlVicmN5XCI6XCJcXHUwNDBFXCIsXCJ1YnJjeVwiOlwiXFx1MDQ1RVwiLFwiVWJyZXZlXCI6XCJcXHUwMTZDXCIsXCJ1YnJldmVcIjpcIlxcdTAxNkRcIixcIlVjaXJjXCI6XCJcXHUwMERCXCIsXCJ1Y2lyY1wiOlwiXFx1MDBGQlwiLFwiVWN5XCI6XCJcXHUwNDIzXCIsXCJ1Y3lcIjpcIlxcdTA0NDNcIixcInVkYXJyXCI6XCJcXHUyMUM1XCIsXCJVZGJsYWNcIjpcIlxcdTAxNzBcIixcInVkYmxhY1wiOlwiXFx1MDE3MVwiLFwidWRoYXJcIjpcIlxcdTI5NkVcIixcInVmaXNodFwiOlwiXFx1Mjk3RVwiLFwiVWZyXCI6XCJcXHVEODM1XFx1REQxOFwiLFwidWZyXCI6XCJcXHVEODM1XFx1REQzMlwiLFwiVWdyYXZlXCI6XCJcXHUwMEQ5XCIsXCJ1Z3JhdmVcIjpcIlxcdTAwRjlcIixcInVIYXJcIjpcIlxcdTI5NjNcIixcInVoYXJsXCI6XCJcXHUyMUJGXCIsXCJ1aGFyclwiOlwiXFx1MjFCRVwiLFwidWhibGtcIjpcIlxcdTI1ODBcIixcInVsY29yblwiOlwiXFx1MjMxQ1wiLFwidWxjb3JuZXJcIjpcIlxcdTIzMUNcIixcInVsY3JvcFwiOlwiXFx1MjMwRlwiLFwidWx0cmlcIjpcIlxcdTI1RjhcIixcIlVtYWNyXCI6XCJcXHUwMTZBXCIsXCJ1bWFjclwiOlwiXFx1MDE2QlwiLFwidW1sXCI6XCJcXHUwMEE4XCIsXCJVbmRlckJhclwiOlwiX1wiLFwiVW5kZXJCcmFjZVwiOlwiXFx1MjNERlwiLFwiVW5kZXJCcmFja2V0XCI6XCJcXHUyM0I1XCIsXCJVbmRlclBhcmVudGhlc2lzXCI6XCJcXHUyM0REXCIsXCJVbmlvblwiOlwiXFx1MjJDM1wiLFwiVW5pb25QbHVzXCI6XCJcXHUyMjhFXCIsXCJVb2dvblwiOlwiXFx1MDE3MlwiLFwidW9nb25cIjpcIlxcdTAxNzNcIixcIlVvcGZcIjpcIlxcdUQ4MzVcXHVERDRDXCIsXCJ1b3BmXCI6XCJcXHVEODM1XFx1REQ2NlwiLFwiVXBBcnJvd0JhclwiOlwiXFx1MjkxMlwiLFwidXBhcnJvd1wiOlwiXFx1MjE5MVwiLFwiVXBBcnJvd1wiOlwiXFx1MjE5MVwiLFwiVXBhcnJvd1wiOlwiXFx1MjFEMVwiLFwiVXBBcnJvd0Rvd25BcnJvd1wiOlwiXFx1MjFDNVwiLFwidXBkb3duYXJyb3dcIjpcIlxcdTIxOTVcIixcIlVwRG93bkFycm93XCI6XCJcXHUyMTk1XCIsXCJVcGRvd25hcnJvd1wiOlwiXFx1MjFENVwiLFwiVXBFcXVpbGlicml1bVwiOlwiXFx1Mjk2RVwiLFwidXBoYXJwb29ubGVmdFwiOlwiXFx1MjFCRlwiLFwidXBoYXJwb29ucmlnaHRcIjpcIlxcdTIxQkVcIixcInVwbHVzXCI6XCJcXHUyMjhFXCIsXCJVcHBlckxlZnRBcnJvd1wiOlwiXFx1MjE5NlwiLFwiVXBwZXJSaWdodEFycm93XCI6XCJcXHUyMTk3XCIsXCJ1cHNpXCI6XCJcXHUwM0M1XCIsXCJVcHNpXCI6XCJcXHUwM0QyXCIsXCJ1cHNpaFwiOlwiXFx1MDNEMlwiLFwiVXBzaWxvblwiOlwiXFx1MDNBNVwiLFwidXBzaWxvblwiOlwiXFx1MDNDNVwiLFwiVXBUZWVBcnJvd1wiOlwiXFx1MjFBNVwiLFwiVXBUZWVcIjpcIlxcdTIyQTVcIixcInVwdXBhcnJvd3NcIjpcIlxcdTIxQzhcIixcInVyY29yblwiOlwiXFx1MjMxRFwiLFwidXJjb3JuZXJcIjpcIlxcdTIzMURcIixcInVyY3JvcFwiOlwiXFx1MjMwRVwiLFwiVXJpbmdcIjpcIlxcdTAxNkVcIixcInVyaW5nXCI6XCJcXHUwMTZGXCIsXCJ1cnRyaVwiOlwiXFx1MjVGOVwiLFwiVXNjclwiOlwiXFx1RDgzNVxcdURDQjBcIixcInVzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NBXCIsXCJ1dGRvdFwiOlwiXFx1MjJGMFwiLFwiVXRpbGRlXCI6XCJcXHUwMTY4XCIsXCJ1dGlsZGVcIjpcIlxcdTAxNjlcIixcInV0cmlcIjpcIlxcdTI1QjVcIixcInV0cmlmXCI6XCJcXHUyNUI0XCIsXCJ1dWFyclwiOlwiXFx1MjFDOFwiLFwiVXVtbFwiOlwiXFx1MDBEQ1wiLFwidXVtbFwiOlwiXFx1MDBGQ1wiLFwidXdhbmdsZVwiOlwiXFx1MjlBN1wiLFwidmFuZ3J0XCI6XCJcXHUyOTlDXCIsXCJ2YXJlcHNpbG9uXCI6XCJcXHUwM0Y1XCIsXCJ2YXJrYXBwYVwiOlwiXFx1MDNGMFwiLFwidmFybm90aGluZ1wiOlwiXFx1MjIwNVwiLFwidmFycGhpXCI6XCJcXHUwM0Q1XCIsXCJ2YXJwaVwiOlwiXFx1MDNENlwiLFwidmFycHJvcHRvXCI6XCJcXHUyMjFEXCIsXCJ2YXJyXCI6XCJcXHUyMTk1XCIsXCJ2QXJyXCI6XCJcXHUyMUQ1XCIsXCJ2YXJyaG9cIjpcIlxcdTAzRjFcIixcInZhcnNpZ21hXCI6XCJcXHUwM0MyXCIsXCJ2YXJzdWJzZXRuZXFcIjpcIlxcdTIyOEFcXHVGRTAwXCIsXCJ2YXJzdWJzZXRuZXFxXCI6XCJcXHUyQUNCXFx1RkUwMFwiLFwidmFyc3Vwc2V0bmVxXCI6XCJcXHUyMjhCXFx1RkUwMFwiLFwidmFyc3Vwc2V0bmVxcVwiOlwiXFx1MkFDQ1xcdUZFMDBcIixcInZhcnRoZXRhXCI6XCJcXHUwM0QxXCIsXCJ2YXJ0cmlhbmdsZWxlZnRcIjpcIlxcdTIyQjJcIixcInZhcnRyaWFuZ2xlcmlnaHRcIjpcIlxcdTIyQjNcIixcInZCYXJcIjpcIlxcdTJBRThcIixcIlZiYXJcIjpcIlxcdTJBRUJcIixcInZCYXJ2XCI6XCJcXHUyQUU5XCIsXCJWY3lcIjpcIlxcdTA0MTJcIixcInZjeVwiOlwiXFx1MDQzMlwiLFwidmRhc2hcIjpcIlxcdTIyQTJcIixcInZEYXNoXCI6XCJcXHUyMkE4XCIsXCJWZGFzaFwiOlwiXFx1MjJBOVwiLFwiVkRhc2hcIjpcIlxcdTIyQUJcIixcIlZkYXNobFwiOlwiXFx1MkFFNlwiLFwidmVlYmFyXCI6XCJcXHUyMkJCXCIsXCJ2ZWVcIjpcIlxcdTIyMjhcIixcIlZlZVwiOlwiXFx1MjJDMVwiLFwidmVlZXFcIjpcIlxcdTIyNUFcIixcInZlbGxpcFwiOlwiXFx1MjJFRVwiLFwidmVyYmFyXCI6XCJ8XCIsXCJWZXJiYXJcIjpcIlxcdTIwMTZcIixcInZlcnRcIjpcInxcIixcIlZlcnRcIjpcIlxcdTIwMTZcIixcIlZlcnRpY2FsQmFyXCI6XCJcXHUyMjIzXCIsXCJWZXJ0aWNhbExpbmVcIjpcInxcIixcIlZlcnRpY2FsU2VwYXJhdG9yXCI6XCJcXHUyNzU4XCIsXCJWZXJ0aWNhbFRpbGRlXCI6XCJcXHUyMjQwXCIsXCJWZXJ5VGhpblNwYWNlXCI6XCJcXHUyMDBBXCIsXCJWZnJcIjpcIlxcdUQ4MzVcXHVERDE5XCIsXCJ2ZnJcIjpcIlxcdUQ4MzVcXHVERDMzXCIsXCJ2bHRyaVwiOlwiXFx1MjJCMlwiLFwidm5zdWJcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJ2bnN1cFwiOlwiXFx1MjI4M1xcdTIwRDJcIixcIlZvcGZcIjpcIlxcdUQ4MzVcXHVERDREXCIsXCJ2b3BmXCI6XCJcXHVEODM1XFx1REQ2N1wiLFwidnByb3BcIjpcIlxcdTIyMURcIixcInZydHJpXCI6XCJcXHUyMkIzXCIsXCJWc2NyXCI6XCJcXHVEODM1XFx1RENCMVwiLFwidnNjclwiOlwiXFx1RDgzNVxcdURDQ0JcIixcInZzdWJuRVwiOlwiXFx1MkFDQlxcdUZFMDBcIixcInZzdWJuZVwiOlwiXFx1MjI4QVxcdUZFMDBcIixcInZzdXBuRVwiOlwiXFx1MkFDQ1xcdUZFMDBcIixcInZzdXBuZVwiOlwiXFx1MjI4QlxcdUZFMDBcIixcIlZ2ZGFzaFwiOlwiXFx1MjJBQVwiLFwidnppZ3phZ1wiOlwiXFx1Mjk5QVwiLFwiV2NpcmNcIjpcIlxcdTAxNzRcIixcIndjaXJjXCI6XCJcXHUwMTc1XCIsXCJ3ZWRiYXJcIjpcIlxcdTJBNUZcIixcIndlZGdlXCI6XCJcXHUyMjI3XCIsXCJXZWRnZVwiOlwiXFx1MjJDMFwiLFwid2VkZ2VxXCI6XCJcXHUyMjU5XCIsXCJ3ZWllcnBcIjpcIlxcdTIxMThcIixcIldmclwiOlwiXFx1RDgzNVxcdUREMUFcIixcIndmclwiOlwiXFx1RDgzNVxcdUREMzRcIixcIldvcGZcIjpcIlxcdUQ4MzVcXHVERDRFXCIsXCJ3b3BmXCI6XCJcXHVEODM1XFx1REQ2OFwiLFwid3BcIjpcIlxcdTIxMThcIixcIndyXCI6XCJcXHUyMjQwXCIsXCJ3cmVhdGhcIjpcIlxcdTIyNDBcIixcIldzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IyXCIsXCJ3c2NyXCI6XCJcXHVEODM1XFx1RENDQ1wiLFwieGNhcFwiOlwiXFx1MjJDMlwiLFwieGNpcmNcIjpcIlxcdTI1RUZcIixcInhjdXBcIjpcIlxcdTIyQzNcIixcInhkdHJpXCI6XCJcXHUyNUJEXCIsXCJYZnJcIjpcIlxcdUQ4MzVcXHVERDFCXCIsXCJ4ZnJcIjpcIlxcdUQ4MzVcXHVERDM1XCIsXCJ4aGFyclwiOlwiXFx1MjdGN1wiLFwieGhBcnJcIjpcIlxcdTI3RkFcIixcIlhpXCI6XCJcXHUwMzlFXCIsXCJ4aVwiOlwiXFx1MDNCRVwiLFwieGxhcnJcIjpcIlxcdTI3RjVcIixcInhsQXJyXCI6XCJcXHUyN0Y4XCIsXCJ4bWFwXCI6XCJcXHUyN0ZDXCIsXCJ4bmlzXCI6XCJcXHUyMkZCXCIsXCJ4b2RvdFwiOlwiXFx1MkEwMFwiLFwiWG9wZlwiOlwiXFx1RDgzNVxcdURENEZcIixcInhvcGZcIjpcIlxcdUQ4MzVcXHVERDY5XCIsXCJ4b3BsdXNcIjpcIlxcdTJBMDFcIixcInhvdGltZVwiOlwiXFx1MkEwMlwiLFwieHJhcnJcIjpcIlxcdTI3RjZcIixcInhyQXJyXCI6XCJcXHUyN0Y5XCIsXCJYc2NyXCI6XCJcXHVEODM1XFx1RENCM1wiLFwieHNjclwiOlwiXFx1RDgzNVxcdURDQ0RcIixcInhzcWN1cFwiOlwiXFx1MkEwNlwiLFwieHVwbHVzXCI6XCJcXHUyQTA0XCIsXCJ4dXRyaVwiOlwiXFx1MjVCM1wiLFwieHZlZVwiOlwiXFx1MjJDMVwiLFwieHdlZGdlXCI6XCJcXHUyMkMwXCIsXCJZYWN1dGVcIjpcIlxcdTAwRERcIixcInlhY3V0ZVwiOlwiXFx1MDBGRFwiLFwiWUFjeVwiOlwiXFx1MDQyRlwiLFwieWFjeVwiOlwiXFx1MDQ0RlwiLFwiWWNpcmNcIjpcIlxcdTAxNzZcIixcInljaXJjXCI6XCJcXHUwMTc3XCIsXCJZY3lcIjpcIlxcdTA0MkJcIixcInljeVwiOlwiXFx1MDQ0QlwiLFwieWVuXCI6XCJcXHUwMEE1XCIsXCJZZnJcIjpcIlxcdUQ4MzVcXHVERDFDXCIsXCJ5ZnJcIjpcIlxcdUQ4MzVcXHVERDM2XCIsXCJZSWN5XCI6XCJcXHUwNDA3XCIsXCJ5aWN5XCI6XCJcXHUwNDU3XCIsXCJZb3BmXCI6XCJcXHVEODM1XFx1REQ1MFwiLFwieW9wZlwiOlwiXFx1RDgzNVxcdURENkFcIixcIllzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I0XCIsXCJ5c2NyXCI6XCJcXHVEODM1XFx1RENDRVwiLFwiWVVjeVwiOlwiXFx1MDQyRVwiLFwieXVjeVwiOlwiXFx1MDQ0RVwiLFwieXVtbFwiOlwiXFx1MDBGRlwiLFwiWXVtbFwiOlwiXFx1MDE3OFwiLFwiWmFjdXRlXCI6XCJcXHUwMTc5XCIsXCJ6YWN1dGVcIjpcIlxcdTAxN0FcIixcIlpjYXJvblwiOlwiXFx1MDE3RFwiLFwiemNhcm9uXCI6XCJcXHUwMTdFXCIsXCJaY3lcIjpcIlxcdTA0MTdcIixcInpjeVwiOlwiXFx1MDQzN1wiLFwiWmRvdFwiOlwiXFx1MDE3QlwiLFwiemRvdFwiOlwiXFx1MDE3Q1wiLFwiemVldHJmXCI6XCJcXHUyMTI4XCIsXCJaZXJvV2lkdGhTcGFjZVwiOlwiXFx1MjAwQlwiLFwiWmV0YVwiOlwiXFx1MDM5NlwiLFwiemV0YVwiOlwiXFx1MDNCNlwiLFwiemZyXCI6XCJcXHVEODM1XFx1REQzN1wiLFwiWmZyXCI6XCJcXHUyMTI4XCIsXCJaSGN5XCI6XCJcXHUwNDE2XCIsXCJ6aGN5XCI6XCJcXHUwNDM2XCIsXCJ6aWdyYXJyXCI6XCJcXHUyMUREXCIsXCJ6b3BmXCI6XCJcXHVEODM1XFx1REQ2QlwiLFwiWm9wZlwiOlwiXFx1MjEyNFwiLFwiWnNjclwiOlwiXFx1RDgzNVxcdURDQjVcIixcInpzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NGXCIsXCJ6d2pcIjpcIlxcdTIwMERcIixcInp3bmpcIjpcIlxcdTIwMENcIn0iLCJtb2R1bGUuZXhwb3J0cz17XCJBYWN1dGVcIjpcIlxcdTAwQzFcIixcImFhY3V0ZVwiOlwiXFx1MDBFMVwiLFwiQWNpcmNcIjpcIlxcdTAwQzJcIixcImFjaXJjXCI6XCJcXHUwMEUyXCIsXCJhY3V0ZVwiOlwiXFx1MDBCNFwiLFwiQUVsaWdcIjpcIlxcdTAwQzZcIixcImFlbGlnXCI6XCJcXHUwMEU2XCIsXCJBZ3JhdmVcIjpcIlxcdTAwQzBcIixcImFncmF2ZVwiOlwiXFx1MDBFMFwiLFwiYW1wXCI6XCImXCIsXCJBTVBcIjpcIiZcIixcIkFyaW5nXCI6XCJcXHUwMEM1XCIsXCJhcmluZ1wiOlwiXFx1MDBFNVwiLFwiQXRpbGRlXCI6XCJcXHUwMEMzXCIsXCJhdGlsZGVcIjpcIlxcdTAwRTNcIixcIkF1bWxcIjpcIlxcdTAwQzRcIixcImF1bWxcIjpcIlxcdTAwRTRcIixcImJydmJhclwiOlwiXFx1MDBBNlwiLFwiQ2NlZGlsXCI6XCJcXHUwMEM3XCIsXCJjY2VkaWxcIjpcIlxcdTAwRTdcIixcImNlZGlsXCI6XCJcXHUwMEI4XCIsXCJjZW50XCI6XCJcXHUwMEEyXCIsXCJjb3B5XCI6XCJcXHUwMEE5XCIsXCJDT1BZXCI6XCJcXHUwMEE5XCIsXCJjdXJyZW5cIjpcIlxcdTAwQTRcIixcImRlZ1wiOlwiXFx1MDBCMFwiLFwiZGl2aWRlXCI6XCJcXHUwMEY3XCIsXCJFYWN1dGVcIjpcIlxcdTAwQzlcIixcImVhY3V0ZVwiOlwiXFx1MDBFOVwiLFwiRWNpcmNcIjpcIlxcdTAwQ0FcIixcImVjaXJjXCI6XCJcXHUwMEVBXCIsXCJFZ3JhdmVcIjpcIlxcdTAwQzhcIixcImVncmF2ZVwiOlwiXFx1MDBFOFwiLFwiRVRIXCI6XCJcXHUwMEQwXCIsXCJldGhcIjpcIlxcdTAwRjBcIixcIkV1bWxcIjpcIlxcdTAwQ0JcIixcImV1bWxcIjpcIlxcdTAwRUJcIixcImZyYWMxMlwiOlwiXFx1MDBCRFwiLFwiZnJhYzE0XCI6XCJcXHUwMEJDXCIsXCJmcmFjMzRcIjpcIlxcdTAwQkVcIixcImd0XCI6XCI+XCIsXCJHVFwiOlwiPlwiLFwiSWFjdXRlXCI6XCJcXHUwMENEXCIsXCJpYWN1dGVcIjpcIlxcdTAwRURcIixcIkljaXJjXCI6XCJcXHUwMENFXCIsXCJpY2lyY1wiOlwiXFx1MDBFRVwiLFwiaWV4Y2xcIjpcIlxcdTAwQTFcIixcIklncmF2ZVwiOlwiXFx1MDBDQ1wiLFwiaWdyYXZlXCI6XCJcXHUwMEVDXCIsXCJpcXVlc3RcIjpcIlxcdTAwQkZcIixcIkl1bWxcIjpcIlxcdTAwQ0ZcIixcIml1bWxcIjpcIlxcdTAwRUZcIixcImxhcXVvXCI6XCJcXHUwMEFCXCIsXCJsdFwiOlwiPFwiLFwiTFRcIjpcIjxcIixcIm1hY3JcIjpcIlxcdTAwQUZcIixcIm1pY3JvXCI6XCJcXHUwMEI1XCIsXCJtaWRkb3RcIjpcIlxcdTAwQjdcIixcIm5ic3BcIjpcIlxcdTAwQTBcIixcIm5vdFwiOlwiXFx1MDBBQ1wiLFwiTnRpbGRlXCI6XCJcXHUwMEQxXCIsXCJudGlsZGVcIjpcIlxcdTAwRjFcIixcIk9hY3V0ZVwiOlwiXFx1MDBEM1wiLFwib2FjdXRlXCI6XCJcXHUwMEYzXCIsXCJPY2lyY1wiOlwiXFx1MDBENFwiLFwib2NpcmNcIjpcIlxcdTAwRjRcIixcIk9ncmF2ZVwiOlwiXFx1MDBEMlwiLFwib2dyYXZlXCI6XCJcXHUwMEYyXCIsXCJvcmRmXCI6XCJcXHUwMEFBXCIsXCJvcmRtXCI6XCJcXHUwMEJBXCIsXCJPc2xhc2hcIjpcIlxcdTAwRDhcIixcIm9zbGFzaFwiOlwiXFx1MDBGOFwiLFwiT3RpbGRlXCI6XCJcXHUwMEQ1XCIsXCJvdGlsZGVcIjpcIlxcdTAwRjVcIixcIk91bWxcIjpcIlxcdTAwRDZcIixcIm91bWxcIjpcIlxcdTAwRjZcIixcInBhcmFcIjpcIlxcdTAwQjZcIixcInBsdXNtblwiOlwiXFx1MDBCMVwiLFwicG91bmRcIjpcIlxcdTAwQTNcIixcInF1b3RcIjpcIlxcXCJcIixcIlFVT1RcIjpcIlxcXCJcIixcInJhcXVvXCI6XCJcXHUwMEJCXCIsXCJyZWdcIjpcIlxcdTAwQUVcIixcIlJFR1wiOlwiXFx1MDBBRVwiLFwic2VjdFwiOlwiXFx1MDBBN1wiLFwic2h5XCI6XCJcXHUwMEFEXCIsXCJzdXAxXCI6XCJcXHUwMEI5XCIsXCJzdXAyXCI6XCJcXHUwMEIyXCIsXCJzdXAzXCI6XCJcXHUwMEIzXCIsXCJzemxpZ1wiOlwiXFx1MDBERlwiLFwiVEhPUk5cIjpcIlxcdTAwREVcIixcInRob3JuXCI6XCJcXHUwMEZFXCIsXCJ0aW1lc1wiOlwiXFx1MDBEN1wiLFwiVWFjdXRlXCI6XCJcXHUwMERBXCIsXCJ1YWN1dGVcIjpcIlxcdTAwRkFcIixcIlVjaXJjXCI6XCJcXHUwMERCXCIsXCJ1Y2lyY1wiOlwiXFx1MDBGQlwiLFwiVWdyYXZlXCI6XCJcXHUwMEQ5XCIsXCJ1Z3JhdmVcIjpcIlxcdTAwRjlcIixcInVtbFwiOlwiXFx1MDBBOFwiLFwiVXVtbFwiOlwiXFx1MDBEQ1wiLFwidXVtbFwiOlwiXFx1MDBGQ1wiLFwiWWFjdXRlXCI6XCJcXHUwMEREXCIsXCJ5YWN1dGVcIjpcIlxcdTAwRkRcIixcInllblwiOlwiXFx1MDBBNVwiLFwieXVtbFwiOlwiXFx1MDBGRlwifSIsIm1vZHVsZS5leHBvcnRzPXtcImFtcFwiOlwiJlwiLFwiYXBvc1wiOlwiJ1wiLFwiZ3RcIjpcIj5cIixcImx0XCI6XCI8XCIsXCJxdW90XCI6XCJcXFwiXCJ9XG4iLCJ2YXIgdG9wTGV2ZWwgPSB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6XG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB7fVxudmFyIG1pbkRvYyA9IHJlcXVpcmUoJ21pbi1kb2N1bWVudCcpO1xuXG52YXIgZG9jY3k7XG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgZG9jY3kgPSBkb2N1bWVudDtcbn0gZWxzZSB7XG4gICAgZG9jY3kgPSB0b3BMZXZlbFsnX19HTE9CQUxfRE9DVU1FTlRfQ0FDSEVANCddO1xuXG4gICAgaWYgKCFkb2NjeSkge1xuICAgICAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J10gPSBtaW5Eb2M7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvY2N5O1xuIiwidmFyIHdpbjtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB3aW4gPSB3aW5kb3c7XG59IGVsc2UgaWYgKHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB3aW4gPSBnbG9iYWw7XG59IGVsc2UgaWYgKHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiKXtcbiAgICB3aW4gPSBzZWxmO1xufSBlbHNlIHtcbiAgICB3aW4gPSB7fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB3aW47XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGF0dHJpYnV0ZVRvUHJvcGVydHlcblxudmFyIHRyYW5zZm9ybSA9IHtcbiAgJ2NsYXNzJzogJ2NsYXNzTmFtZScsXG4gICdmb3InOiAnaHRtbEZvcicsXG4gICdodHRwLWVxdWl2JzogJ2h0dHBFcXVpdidcbn1cblxuZnVuY3Rpb24gYXR0cmlidXRlVG9Qcm9wZXJ0eSAoaCkge1xuICByZXR1cm4gZnVuY3Rpb24gKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbikge1xuICAgIGZvciAodmFyIGF0dHIgaW4gYXR0cnMpIHtcbiAgICAgIGlmIChhdHRyIGluIHRyYW5zZm9ybSkge1xuICAgICAgICBhdHRyc1t0cmFuc2Zvcm1bYXR0cl1dID0gYXR0cnNbYXR0cl1cbiAgICAgICAgZGVsZXRlIGF0dHJzW2F0dHJdXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBoKHRhZ05hbWUsIGF0dHJzLCBjaGlsZHJlbilcbiAgfVxufVxuIiwidmFyIGF0dHJUb1Byb3AgPSByZXF1aXJlKCdoeXBlcnNjcmlwdC1hdHRyaWJ1dGUtdG8tcHJvcGVydHknKVxuXG52YXIgVkFSID0gMCwgVEVYVCA9IDEsIE9QRU4gPSAyLCBDTE9TRSA9IDMsIEFUVFIgPSA0XG52YXIgQVRUUl9LRVkgPSA1LCBBVFRSX0tFWV9XID0gNlxudmFyIEFUVFJfVkFMVUVfVyA9IDcsIEFUVFJfVkFMVUUgPSA4XG52YXIgQVRUUl9WQUxVRV9TUSA9IDksIEFUVFJfVkFMVUVfRFEgPSAxMFxudmFyIEFUVFJfRVEgPSAxMSwgQVRUUl9CUkVBSyA9IDEyXG52YXIgQ09NTUVOVCA9IDEzXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGgsIG9wdHMpIHtcbiAgaWYgKCFvcHRzKSBvcHRzID0ge31cbiAgdmFyIGNvbmNhdCA9IG9wdHMuY29uY2F0IHx8IGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgcmV0dXJuIFN0cmluZyhhKSArIFN0cmluZyhiKVxuICB9XG4gIGlmIChvcHRzLmF0dHJUb1Byb3AgIT09IGZhbHNlKSB7XG4gICAgaCA9IGF0dHJUb1Byb3AoaClcbiAgfVxuXG4gIHJldHVybiBmdW5jdGlvbiAoc3RyaW5ncykge1xuICAgIHZhciBzdGF0ZSA9IFRFWFQsIHJlZyA9ICcnXG4gICAgdmFyIGFyZ2xlbiA9IGFyZ3VtZW50cy5sZW5ndGhcbiAgICB2YXIgcGFydHMgPSBbXVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHJpbmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoaSA8IGFyZ2xlbiAtIDEpIHtcbiAgICAgICAgdmFyIGFyZyA9IGFyZ3VtZW50c1tpKzFdXG4gICAgICAgIHZhciBwID0gcGFyc2Uoc3RyaW5nc1tpXSlcbiAgICAgICAgdmFyIHhzdGF0ZSA9IHN0YXRlXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfRFEpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSkgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHhzdGF0ZSA9IEFUVFJfVkFMVUVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUikgeHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgcC5wdXNoKFsgVkFSLCB4c3RhdGUsIGFyZyBdKVxuICAgICAgICBwYXJ0cy5wdXNoLmFwcGx5KHBhcnRzLCBwKVxuICAgICAgfSBlbHNlIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHBhcnNlKHN0cmluZ3NbaV0pKVxuICAgIH1cblxuICAgIHZhciB0cmVlID0gW251bGwse30sW11dXG4gICAgdmFyIHN0YWNrID0gW1t0cmVlLC0xXV1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgY3VyID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdXG4gICAgICB2YXIgcCA9IHBhcnRzW2ldLCBzID0gcFswXVxuICAgICAgaWYgKHMgPT09IE9QRU4gJiYgL15cXC8vLnRlc3QocFsxXSkpIHtcbiAgICAgICAgdmFyIGl4ID0gc3RhY2tbc3RhY2subGVuZ3RoLTFdWzFdXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgc3RhY2sucG9wKClcbiAgICAgICAgICBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1bMl1baXhdID0gaChcbiAgICAgICAgICAgIGN1clswXSwgY3VyWzFdLCBjdXJbMl0ubGVuZ3RoID8gY3VyWzJdIDogdW5kZWZpbmVkXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHMgPT09IE9QRU4pIHtcbiAgICAgICAgdmFyIGMgPSBbcFsxXSx7fSxbXV1cbiAgICAgICAgY3VyWzJdLnB1c2goYylcbiAgICAgICAgc3RhY2sucHVzaChbYyxjdXJbMl0ubGVuZ3RoLTFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0tFWSB8fCAocyA9PT0gVkFSICYmIHBbMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICB2YXIga2V5ID0gJydcbiAgICAgICAgdmFyIGNvcHlLZXlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGtleSA9IGNvbmNhdChrZXksIHBhcnRzW2ldWzFdKVxuICAgICAgICAgIH0gZWxzZSBpZiAocGFydHNbaV1bMF0gPT09IFZBUiAmJiBwYXJ0c1tpXVsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcGFydHNbaV1bMl0gPT09ICdvYmplY3QnICYmICFrZXkpIHtcbiAgICAgICAgICAgICAgZm9yIChjb3B5S2V5IGluIHBhcnRzW2ldWzJdKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnRzW2ldWzJdLmhhc093blByb3BlcnR5KGNvcHlLZXkpICYmICFjdXJbMV1bY29weUtleV0pIHtcbiAgICAgICAgICAgICAgICAgIGN1clsxXVtjb3B5S2V5XSA9IHBhcnRzW2ldWzJdW2NvcHlLZXldXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBrZXkgPSBjb25jYXQoa2V5LCBwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgYnJlYWtcbiAgICAgICAgfVxuICAgICAgICBpZiAocGFydHNbaV1bMF0gPT09IEFUVFJfRVEpIGkrK1xuICAgICAgICB2YXIgaiA9IGlcbiAgICAgICAgZm9yICg7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9WQUxVRSB8fCBwYXJ0c1tpXVswXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICAgIGlmICghY3VyWzFdW2tleV0pIGN1clsxXVtrZXldID0gc3RyZm4ocGFydHNbaV1bMV0pXG4gICAgICAgICAgICBlbHNlIGN1clsxXVtrZXldID0gY29uY2F0KGN1clsxXVtrZXldLCBwYXJ0c1tpXVsxXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHBhcnRzW2ldWzBdID09PSBWQVJcbiAgICAgICAgICAmJiAocGFydHNbaV1bMV0gPT09IEFUVFJfVkFMVUUgfHwgcGFydHNbaV1bMV0gPT09IEFUVFJfS0VZKSkge1xuICAgICAgICAgICAgaWYgKCFjdXJbMV1ba2V5XSkgY3VyWzFdW2tleV0gPSBzdHJmbihwYXJ0c1tpXVsyXSlcbiAgICAgICAgICAgIGVsc2UgY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzJdKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoa2V5Lmxlbmd0aCAmJiAhY3VyWzFdW2tleV0gJiYgaSA9PT0galxuICAgICAgICAgICAgJiYgKHBhcnRzW2ldWzBdID09PSBDTE9TRSB8fCBwYXJ0c1tpXVswXSA9PT0gQVRUUl9CUkVBSykpIHtcbiAgICAgICAgICAgICAgLy8gaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2UvaW5mcmFzdHJ1Y3R1cmUuaHRtbCNib29sZWFuLWF0dHJpYnV0ZXNcbiAgICAgICAgICAgICAgLy8gZW1wdHkgc3RyaW5nIGlzIGZhbHN5LCBub3Qgd2VsbCBiZWhhdmVkIHZhbHVlIGluIGJyb3dzZXJcbiAgICAgICAgICAgICAgY3VyWzFdW2tleV0gPSBrZXkudG9Mb3dlckNhc2UoKVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMV1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBWQVIgJiYgcFsxXSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgY3VyWzFdW3BbMl1dID0gdHJ1ZVxuICAgICAgfSBlbHNlIGlmIChzID09PSBDTE9TRSkge1xuICAgICAgICBpZiAoc2VsZkNsb3NpbmcoY3VyWzBdKSAmJiBzdGFjay5sZW5ndGgpIHtcbiAgICAgICAgICB2YXIgaXggPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMV1cbiAgICAgICAgICBzdGFjay5wb3AoKVxuICAgICAgICAgIHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVsyXVtpeF0gPSBoKFxuICAgICAgICAgICAgY3VyWzBdLCBjdXJbMV0sIGN1clsyXS5sZW5ndGggPyBjdXJbMl0gOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVkFSICYmIHBbMV0gPT09IFRFWFQpIHtcbiAgICAgICAgaWYgKHBbMl0gPT09IHVuZGVmaW5lZCB8fCBwWzJdID09PSBudWxsKSBwWzJdID0gJydcbiAgICAgICAgZWxzZSBpZiAoIXBbMl0pIHBbMl0gPSBjb25jYXQoJycsIHBbMl0pXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBbMl1bMF0pKSB7XG4gICAgICAgICAgY3VyWzJdLnB1c2guYXBwbHkoY3VyWzJdLCBwWzJdKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGN1clsyXS5wdXNoKHBbMl0pXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gVEVYVCkge1xuICAgICAgICBjdXJbMl0ucHVzaChwWzFdKVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0VRIHx8IHMgPT09IEFUVFJfQlJFQUspIHtcbiAgICAgICAgLy8gbm8tb3BcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndW5oYW5kbGVkOiAnICsgcylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodHJlZVsyXS5sZW5ndGggPiAxICYmIC9eXFxzKiQvLnRlc3QodHJlZVsyXVswXSkpIHtcbiAgICAgIHRyZWVbMl0uc2hpZnQoKVxuICAgIH1cblxuICAgIGlmICh0cmVlWzJdLmxlbmd0aCA+IDJcbiAgICB8fCAodHJlZVsyXS5sZW5ndGggPT09IDIgJiYgL1xcUy8udGVzdCh0cmVlWzJdWzFdKSkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgJ211bHRpcGxlIHJvb3QgZWxlbWVudHMgbXVzdCBiZSB3cmFwcGVkIGluIGFuIGVuY2xvc2luZyB0YWcnXG4gICAgICApXG4gICAgfVxuICAgIGlmIChBcnJheS5pc0FycmF5KHRyZWVbMl1bMF0pICYmIHR5cGVvZiB0cmVlWzJdWzBdWzBdID09PSAnc3RyaW5nJ1xuICAgICYmIEFycmF5LmlzQXJyYXkodHJlZVsyXVswXVsyXSkpIHtcbiAgICAgIHRyZWVbMl1bMF0gPSBoKHRyZWVbMl1bMF1bMF0sIHRyZWVbMl1bMF1bMV0sIHRyZWVbMl1bMF1bMl0pXG4gICAgfVxuICAgIHJldHVybiB0cmVlWzJdWzBdXG5cbiAgICBmdW5jdGlvbiBwYXJzZSAoc3RyKSB7XG4gICAgICB2YXIgcmVzID0gW11cbiAgICAgIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XKSBzdGF0ZSA9IEFUVFJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBjID0gc3RyLmNoYXJBdChpKVxuICAgICAgICBpZiAoc3RhdGUgPT09IFRFWFQgJiYgYyA9PT0gJzwnKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHJlcy5wdXNoKFtURVhULCByZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBPUEVOXG4gICAgICAgIH0gZWxzZSBpZiAoYyA9PT0gJz4nICYmICFxdW90KHN0YXRlKSAmJiBzdGF0ZSAhPT0gQ09NTUVOVCkge1xuICAgICAgICAgIGlmIChzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgICAgcmVzLnB1c2goW09QRU4scmVnXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXMucHVzaChbQ0xPU0VdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBURVhUXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IENPTU1FTlQgJiYgLy0kLy50ZXN0KHJlZykgJiYgYyA9PT0gJy0nKSB7XG4gICAgICAgICAgaWYgKG9wdHMuY29tbWVudHMpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZy5zdWJzdHIoMCwgcmVnLmxlbmd0aCAtIDEpXSxbQ0xPU0VdKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gVEVYVFxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOICYmIC9eIS0tJC8udGVzdChyZWcpKSB7XG4gICAgICAgICAgaWYgKG9wdHMuY29tbWVudHMpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtPUEVOLCByZWddLFtBVFRSX0tFWSwnY29tbWVudCddLFtBVFRSX0VRXSlcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVnID0gY1xuICAgICAgICAgIHN0YXRlID0gQ09NTUVOVFxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBURVhUIHx8IHN0YXRlID09PSBDT01NRU5UKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW09QRU4sIHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gT1BFTikge1xuICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFIgJiYgL1teXFxzXCInPS9dLy50ZXN0KGMpKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICAgIHJlZyA9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgaWYgKHJlZy5sZW5ndGgpIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0JSRUFLXSlcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX0tFWV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddLFtBVFRSX0VRXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9XXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmICgoc3RhdGUgPT09IEFUVFJfS0VZX1cgfHwgc3RhdGUgPT09IEFUVFIpICYmIGMgPT09ICc9Jykge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0VRXSlcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfV1xuICAgICAgICB9IGVsc2UgaWYgKChzdGF0ZSA9PT0gQVRUUl9LRVlfVyB8fCBzdGF0ZSA9PT0gQVRUUikgJiYgIS9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9CUkVBS10pXG4gICAgICAgICAgaWYgKC9bXFx3LV0vLnRlc3QoYykpIHtcbiAgICAgICAgICAgIHJlZyArPSBjXG4gICAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgICAgfSBlbHNlIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gJ1wiJykge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9EUVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cgJiYgYyA9PT0gXCInXCIpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfVkFMVUVfU1FcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9TUSAmJiBjID09PSBcIidcIikge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiAhL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICAgIGktLVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRXG4gICAgICAgIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHN0YXRlID09PSBURVhUICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW1RFWFQscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX0tFWSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHN0cmZuICh4KSB7XG4gICAgaWYgKHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHR5cGVvZiB4ID09PSAnc3RyaW5nJykgcmV0dXJuIHhcbiAgICBlbHNlIGlmICh4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JykgcmV0dXJuIHhcbiAgICBlbHNlIHJldHVybiBjb25jYXQoJycsIHgpXG4gIH1cbn1cblxuZnVuY3Rpb24gcXVvdCAoc3RhdGUpIHtcbiAgcmV0dXJuIHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRIHx8IHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRXG59XG5cbnZhciBoYXNPd24gPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5XG5mdW5jdGlvbiBoYXMgKG9iaiwga2V5KSB7IHJldHVybiBoYXNPd24uY2FsbChvYmosIGtleSkgfVxuXG52YXIgY2xvc2VSRSA9IFJlZ0V4cCgnXignICsgW1xuICAnYXJlYScsICdiYXNlJywgJ2Jhc2Vmb250JywgJ2Jnc291bmQnLCAnYnInLCAnY29sJywgJ2NvbW1hbmQnLCAnZW1iZWQnLFxuICAnZnJhbWUnLCAnaHInLCAnaW1nJywgJ2lucHV0JywgJ2lzaW5kZXgnLCAna2V5Z2VuJywgJ2xpbmsnLCAnbWV0YScsICdwYXJhbScsXG4gICdzb3VyY2UnLCAndHJhY2snLCAnd2JyJywgJyEtLScsXG4gIC8vIFNWRyBUQUdTXG4gICdhbmltYXRlJywgJ2FuaW1hdGVUcmFuc2Zvcm0nLCAnY2lyY2xlJywgJ2N1cnNvcicsICdkZXNjJywgJ2VsbGlwc2UnLFxuICAnZmVCbGVuZCcsICdmZUNvbG9yTWF0cml4JywgJ2ZlQ29tcG9zaXRlJyxcbiAgJ2ZlQ29udm9sdmVNYXRyaXgnLCAnZmVEaWZmdXNlTGlnaHRpbmcnLCAnZmVEaXNwbGFjZW1lbnRNYXAnLFxuICAnZmVEaXN0YW50TGlnaHQnLCAnZmVGbG9vZCcsICdmZUZ1bmNBJywgJ2ZlRnVuY0InLCAnZmVGdW5jRycsICdmZUZ1bmNSJyxcbiAgJ2ZlR2F1c3NpYW5CbHVyJywgJ2ZlSW1hZ2UnLCAnZmVNZXJnZU5vZGUnLCAnZmVNb3JwaG9sb2d5JyxcbiAgJ2ZlT2Zmc2V0JywgJ2ZlUG9pbnRMaWdodCcsICdmZVNwZWN1bGFyTGlnaHRpbmcnLCAnZmVTcG90TGlnaHQnLCAnZmVUaWxlJyxcbiAgJ2ZlVHVyYnVsZW5jZScsICdmb250LWZhY2UtZm9ybWF0JywgJ2ZvbnQtZmFjZS1uYW1lJywgJ2ZvbnQtZmFjZS11cmknLFxuICAnZ2x5cGgnLCAnZ2x5cGhSZWYnLCAnaGtlcm4nLCAnaW1hZ2UnLCAnbGluZScsICdtaXNzaW5nLWdseXBoJywgJ21wYXRoJyxcbiAgJ3BhdGgnLCAncG9seWdvbicsICdwb2x5bGluZScsICdyZWN0JywgJ3NldCcsICdzdG9wJywgJ3RyZWYnLCAndXNlJywgJ3ZpZXcnLFxuICAndmtlcm4nXG5dLmpvaW4oJ3wnKSArICcpKD86W1xcLiNdW2EtekEtWjAtOVxcdTAwN0YtXFx1RkZGRl86LV0rKSokJylcbmZ1bmN0aW9uIHNlbGZDbG9zaW5nICh0YWcpIHsgcmV0dXJuIGNsb3NlUkUudGVzdCh0YWcpIH1cbiIsIlxuJ3VzZSBzdHJpY3QnO1xuXG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLWJpdHdpc2UgKi9cblxudmFyIGRlY29kZUNhY2hlID0ge307XG5cbmZ1bmN0aW9uIGdldERlY29kZUNhY2hlKGV4Y2x1ZGUpIHtcbiAgdmFyIGksIGNoLCBjYWNoZSA9IGRlY29kZUNhY2hlW2V4Y2x1ZGVdO1xuICBpZiAoY2FjaGUpIHsgcmV0dXJuIGNhY2hlOyB9XG5cbiAgY2FjaGUgPSBkZWNvZGVDYWNoZVtleGNsdWRlXSA9IFtdO1xuXG4gIGZvciAoaSA9IDA7IGkgPCAxMjg7IGkrKykge1xuICAgIGNoID0gU3RyaW5nLmZyb21DaGFyQ29kZShpKTtcbiAgICBjYWNoZS5wdXNoKGNoKTtcbiAgfVxuXG4gIGZvciAoaSA9IDA7IGkgPCBleGNsdWRlLmxlbmd0aDsgaSsrKSB7XG4gICAgY2ggPSBleGNsdWRlLmNoYXJDb2RlQXQoaSk7XG4gICAgY2FjaGVbY2hdID0gJyUnICsgKCcwJyArIGNoLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpKS5zbGljZSgtMik7XG4gIH1cblxuICByZXR1cm4gY2FjaGU7XG59XG5cblxuLy8gRGVjb2RlIHBlcmNlbnQtZW5jb2RlZCBzdHJpbmcuXG4vL1xuZnVuY3Rpb24gZGVjb2RlKHN0cmluZywgZXhjbHVkZSkge1xuICB2YXIgY2FjaGU7XG5cbiAgaWYgKHR5cGVvZiBleGNsdWRlICE9PSAnc3RyaW5nJykge1xuICAgIGV4Y2x1ZGUgPSBkZWNvZGUuZGVmYXVsdENoYXJzO1xuICB9XG5cbiAgY2FjaGUgPSBnZXREZWNvZGVDYWNoZShleGNsdWRlKTtcblxuICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoLyglW2EtZjAtOV17Mn0pKy9naSwgZnVuY3Rpb24oc2VxKSB7XG4gICAgdmFyIGksIGwsIGIxLCBiMiwgYjMsIGI0LCBjaHIsXG4gICAgICAgIHJlc3VsdCA9ICcnO1xuXG4gICAgZm9yIChpID0gMCwgbCA9IHNlcS5sZW5ndGg7IGkgPCBsOyBpICs9IDMpIHtcbiAgICAgIGIxID0gcGFyc2VJbnQoc2VxLnNsaWNlKGkgKyAxLCBpICsgMyksIDE2KTtcblxuICAgICAgaWYgKGIxIDwgMHg4MCkge1xuICAgICAgICByZXN1bHQgKz0gY2FjaGVbYjFdO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKChiMSAmIDB4RTApID09PSAweEMwICYmIChpICsgMyA8IGwpKSB7XG4gICAgICAgIC8vIDExMHh4eHh4IDEweHh4eHh4XG4gICAgICAgIGIyID0gcGFyc2VJbnQoc2VxLnNsaWNlKGkgKyA0LCBpICsgNiksIDE2KTtcblxuICAgICAgICBpZiAoKGIyICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICBjaHIgPSAoKGIxIDw8IDYpICYgMHg3QzApIHwgKGIyICYgMHgzRik7XG5cbiAgICAgICAgICBpZiAoY2hyIDwgMHg4MCkge1xuICAgICAgICAgICAgcmVzdWx0ICs9ICdcXHVmZmZkXFx1ZmZmZCc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNocik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaSArPSAzO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICgoYjEgJiAweEYwKSA9PT0gMHhFMCAmJiAoaSArIDYgPCBsKSkge1xuICAgICAgICAvLyAxMTEweHh4eCAxMHh4eHh4eCAxMHh4eHh4eFxuICAgICAgICBiMiA9IHBhcnNlSW50KHNlcS5zbGljZShpICsgNCwgaSArIDYpLCAxNik7XG4gICAgICAgIGIzID0gcGFyc2VJbnQoc2VxLnNsaWNlKGkgKyA3LCBpICsgOSksIDE2KTtcblxuICAgICAgICBpZiAoKGIyICYgMHhDMCkgPT09IDB4ODAgJiYgKGIzICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICBjaHIgPSAoKGIxIDw8IDEyKSAmIDB4RjAwMCkgfCAoKGIyIDw8IDYpICYgMHhGQzApIHwgKGIzICYgMHgzRik7XG5cbiAgICAgICAgICBpZiAoY2hyIDwgMHg4MDAgfHwgKGNociA+PSAweEQ4MDAgJiYgY2hyIDw9IDB4REZGRikpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSAnXFx1ZmZmZFxcdWZmZmRcXHVmZmZkJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpICs9IDY7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKChiMSAmIDB4RjgpID09PSAweEYwICYmIChpICsgOSA8IGwpKSB7XG4gICAgICAgIC8vIDExMTExMHh4IDEweHh4eHh4IDEweHh4eHh4IDEweHh4eHh4XG4gICAgICAgIGIyID0gcGFyc2VJbnQoc2VxLnNsaWNlKGkgKyA0LCBpICsgNiksIDE2KTtcbiAgICAgICAgYjMgPSBwYXJzZUludChzZXEuc2xpY2UoaSArIDcsIGkgKyA5KSwgMTYpO1xuICAgICAgICBiNCA9IHBhcnNlSW50KHNlcS5zbGljZShpICsgMTAsIGkgKyAxMiksIDE2KTtcblxuICAgICAgICBpZiAoKGIyICYgMHhDMCkgPT09IDB4ODAgJiYgKGIzICYgMHhDMCkgPT09IDB4ODAgJiYgKGI0ICYgMHhDMCkgPT09IDB4ODApIHtcbiAgICAgICAgICBjaHIgPSAoKGIxIDw8IDE4KSAmIDB4MUMwMDAwKSB8ICgoYjIgPDwgMTIpICYgMHgzRjAwMCkgfCAoKGIzIDw8IDYpICYgMHhGQzApIHwgKGI0ICYgMHgzRik7XG5cbiAgICAgICAgICBpZiAoY2hyIDwgMHgxMDAwMCB8fCBjaHIgPiAweDEwRkZGRikge1xuICAgICAgICAgICAgcmVzdWx0ICs9ICdcXHVmZmZkXFx1ZmZmZFxcdWZmZmRcXHVmZmZkJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2hyIC09IDB4MTAwMDA7XG4gICAgICAgICAgICByZXN1bHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZSgweEQ4MDAgKyAoY2hyID4+IDEwKSwgMHhEQzAwICsgKGNociAmIDB4M0ZGKSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaSArPSA5O1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJlc3VsdCArPSAnXFx1ZmZmZCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59XG5cblxuZGVjb2RlLmRlZmF1bHRDaGFycyAgID0gJzsvPzpAJj0rJCwjJztcbmRlY29kZS5jb21wb25lbnRDaGFycyA9ICcnO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZGVjb2RlO1xuIiwiXG4ndXNlIHN0cmljdCc7XG5cblxudmFyIGVuY29kZUNhY2hlID0ge307XG5cblxuLy8gQ3JlYXRlIGEgbG9va3VwIGFycmF5IHdoZXJlIGFueXRoaW5nIGJ1dCBjaGFyYWN0ZXJzIGluIGBjaGFyc2Agc3RyaW5nXG4vLyBhbmQgYWxwaGFudW1lcmljIGNoYXJzIGlzIHBlcmNlbnQtZW5jb2RlZC5cbi8vXG5mdW5jdGlvbiBnZXRFbmNvZGVDYWNoZShleGNsdWRlKSB7XG4gIHZhciBpLCBjaCwgY2FjaGUgPSBlbmNvZGVDYWNoZVtleGNsdWRlXTtcbiAgaWYgKGNhY2hlKSB7IHJldHVybiBjYWNoZTsgfVxuXG4gIGNhY2hlID0gZW5jb2RlQ2FjaGVbZXhjbHVkZV0gPSBbXTtcblxuICBmb3IgKGkgPSAwOyBpIDwgMTI4OyBpKyspIHtcbiAgICBjaCA9IFN0cmluZy5mcm9tQ2hhckNvZGUoaSk7XG5cbiAgICBpZiAoL15bMC05YS16XSQvaS50ZXN0KGNoKSkge1xuICAgICAgLy8gYWx3YXlzIGFsbG93IHVuZW5jb2RlZCBhbHBoYW51bWVyaWMgY2hhcmFjdGVyc1xuICAgICAgY2FjaGUucHVzaChjaCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhY2hlLnB1c2goJyUnICsgKCcwJyArIGkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkpLnNsaWNlKC0yKSk7XG4gICAgfVxuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IGV4Y2x1ZGUubGVuZ3RoOyBpKyspIHtcbiAgICBjYWNoZVtleGNsdWRlLmNoYXJDb2RlQXQoaSldID0gZXhjbHVkZVtpXTtcbiAgfVxuXG4gIHJldHVybiBjYWNoZTtcbn1cblxuXG4vLyBFbmNvZGUgdW5zYWZlIGNoYXJhY3RlcnMgd2l0aCBwZXJjZW50LWVuY29kaW5nLCBza2lwcGluZyBhbHJlYWR5XG4vLyBlbmNvZGVkIHNlcXVlbmNlcy5cbi8vXG4vLyAgLSBzdHJpbmcgICAgICAgLSBzdHJpbmcgdG8gZW5jb2RlXG4vLyAgLSBleGNsdWRlICAgICAgLSBsaXN0IG9mIGNoYXJhY3RlcnMgdG8gaWdub3JlIChpbiBhZGRpdGlvbiB0byBhLXpBLVowLTkpXG4vLyAgLSBrZWVwRXNjYXBlZCAgLSBkb24ndCBlbmNvZGUgJyUnIGluIGEgY29ycmVjdCBlc2NhcGUgc2VxdWVuY2UgKGRlZmF1bHQ6IHRydWUpXG4vL1xuZnVuY3Rpb24gZW5jb2RlKHN0cmluZywgZXhjbHVkZSwga2VlcEVzY2FwZWQpIHtcbiAgdmFyIGksIGwsIGNvZGUsIG5leHRDb2RlLCBjYWNoZSxcbiAgICAgIHJlc3VsdCA9ICcnO1xuXG4gIGlmICh0eXBlb2YgZXhjbHVkZSAhPT0gJ3N0cmluZycpIHtcbiAgICAvLyBlbmNvZGUoc3RyaW5nLCBrZWVwRXNjYXBlZClcbiAgICBrZWVwRXNjYXBlZCAgPSBleGNsdWRlO1xuICAgIGV4Y2x1ZGUgPSBlbmNvZGUuZGVmYXVsdENoYXJzO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBrZWVwRXNjYXBlZCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBrZWVwRXNjYXBlZCA9IHRydWU7XG4gIH1cblxuICBjYWNoZSA9IGdldEVuY29kZUNhY2hlKGV4Y2x1ZGUpO1xuXG4gIGZvciAoaSA9IDAsIGwgPSBzdHJpbmcubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY29kZSA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xuXG4gICAgaWYgKGtlZXBFc2NhcGVkICYmIGNvZGUgPT09IDB4MjUgLyogJSAqLyAmJiBpICsgMiA8IGwpIHtcbiAgICAgIGlmICgvXlswLTlhLWZdezJ9JC9pLnRlc3Qoc3RyaW5nLnNsaWNlKGkgKyAxLCBpICsgMykpKSB7XG4gICAgICAgIHJlc3VsdCArPSBzdHJpbmcuc2xpY2UoaSwgaSArIDMpO1xuICAgICAgICBpICs9IDI7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb2RlIDwgMTI4KSB7XG4gICAgICByZXN1bHQgKz0gY2FjaGVbY29kZV07XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICBpZiAoY29kZSA+PSAweEQ4MDAgJiYgY29kZSA8PSAweERGRkYpIHtcbiAgICAgIGlmIChjb2RlID49IDB4RDgwMCAmJiBjb2RlIDw9IDB4REJGRiAmJiBpICsgMSA8IGwpIHtcbiAgICAgICAgbmV4dENvZGUgPSBzdHJpbmcuY2hhckNvZGVBdChpICsgMSk7XG4gICAgICAgIGlmIChuZXh0Q29kZSA+PSAweERDMDAgJiYgbmV4dENvZGUgPD0gMHhERkZGKSB7XG4gICAgICAgICAgcmVzdWx0ICs9IGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdbaV0gKyBzdHJpbmdbaSArIDFdKTtcbiAgICAgICAgICBpKys7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJlc3VsdCArPSAnJUVGJUJGJUJEJztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc3VsdCArPSBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5nW2ldKTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmVuY29kZS5kZWZhdWx0Q2hhcnMgICA9IFwiOy8/OkAmPSskLC1fLiF+KicoKSNcIjtcbmVuY29kZS5jb21wb25lbnRDaGFycyA9IFwiLV8uIX4qJygpXCI7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBlbmNvZGU7XG4iLCJ2YXIgbmFub3RpbWluZyA9IHJlcXVpcmUoJ25hbm90aW1pbmcnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gTmFub2J1c1xuXG5mdW5jdGlvbiBOYW5vYnVzIChuYW1lKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBOYW5vYnVzKSkgcmV0dXJuIG5ldyBOYW5vYnVzKG5hbWUpXG5cbiAgdGhpcy5fbmFtZSA9IG5hbWUgfHwgJ25hbm9idXMnXG4gIHRoaXMuX3N0YXJMaXN0ZW5lcnMgPSBbXVxuICB0aGlzLl9saXN0ZW5lcnMgPSB7fVxuXG4gIHRoaXMuX3RpbWluZyA9IG5hbm90aW1pbmcodGhpcy5fbmFtZSlcbn1cblxuTmFub2J1cy5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGRhdGEpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5lbWl0OiBldmVudE5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcblxuICB0aGlzLl90aW1pbmcuc3RhcnQoZXZlbnROYW1lKVxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV1cbiAgaWYgKGxpc3RlbmVycyAmJiBsaXN0ZW5lcnMubGVuZ3RoID4gMCkge1xuICAgIHRoaXMuX2VtaXQodGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0sIGRhdGEpXG4gIH1cblxuICBpZiAodGhpcy5fc3Rhckxpc3RlbmVycy5sZW5ndGggPiAwKSB7XG4gICAgdGhpcy5fZW1pdCh0aGlzLl9zdGFyTGlzdGVuZXJzLCBldmVudE5hbWUsIGRhdGEpXG4gIH1cbiAgdGhpcy5fdGltaW5nLmVuZChldmVudE5hbWUpXG5cbiAgcmV0dXJuIHRoaXNcbn1cblxuTmFub2J1cy5wcm90b3R5cGUub24gPSBOYW5vYnVzLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgZXZlbnROYW1lLCAnc3RyaW5nJywgJ25hbm9idXMub246IGV2ZW50TmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIGxpc3RlbmVyLCAnZnVuY3Rpb24nLCAnbmFub2J1cy5vbjogbGlzdGVuZXIgc2hvdWxkIGJlIHR5cGUgZnVuY3Rpb24nKVxuXG4gIGlmIChldmVudE5hbWUgPT09ICcqJykge1xuICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMucHVzaChsaXN0ZW5lcilcbiAgfSBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdKSB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdXG4gICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0ucHVzaChsaXN0ZW5lcilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5wcmVwZW5kTGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGV2ZW50TmFtZSwgJ3N0cmluZycsICduYW5vYnVzLnByZXBlbmRMaXN0ZW5lcjogZXZlbnROYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbGlzdGVuZXIsICdmdW5jdGlvbicsICduYW5vYnVzLnByZXBlbmRMaXN0ZW5lcjogbGlzdGVuZXIgc2hvdWxkIGJlIHR5cGUgZnVuY3Rpb24nKVxuXG4gIGlmIChldmVudE5hbWUgPT09ICcqJykge1xuICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMudW5zaGlmdChsaXN0ZW5lcilcbiAgfSBlbHNlIHtcbiAgICBpZiAoIXRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdKSB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdXG4gICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0udW5zaGlmdChsaXN0ZW5lcilcbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5vbmNlOiBldmVudE5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBsaXN0ZW5lciwgJ2Z1bmN0aW9uJywgJ25hbm9idXMub25jZTogbGlzdGVuZXIgc2hvdWxkIGJlIHR5cGUgZnVuY3Rpb24nKVxuXG4gIHZhciBzZWxmID0gdGhpc1xuICB0aGlzLm9uKGV2ZW50TmFtZSwgb25jZSlcbiAgZnVuY3Rpb24gb25jZSAoKSB7XG4gICAgbGlzdGVuZXIuYXBwbHkoc2VsZiwgYXJndW1lbnRzKVxuICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIoZXZlbnROYW1lLCBvbmNlKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbk5hbm9idXMucHJvdG90eXBlLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGV2ZW50TmFtZSwgJ3N0cmluZycsICduYW5vYnVzLnByZXBlbmRPbmNlTGlzdGVuZXI6IGV2ZW50TmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIGxpc3RlbmVyLCAnZnVuY3Rpb24nLCAnbmFub2J1cy5wcmVwZW5kT25jZUxpc3RlbmVyOiBsaXN0ZW5lciBzaG91bGQgYmUgdHlwZSBmdW5jdGlvbicpXG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMucHJlcGVuZExpc3RlbmVyKGV2ZW50TmFtZSwgb25jZSlcbiAgZnVuY3Rpb24gb25jZSAoKSB7XG4gICAgbGlzdGVuZXIuYXBwbHkoc2VsZiwgYXJndW1lbnRzKVxuICAgIHNlbGYucmVtb3ZlTGlzdGVuZXIoZXZlbnROYW1lLCBvbmNlKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbk5hbm9idXMucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5yZW1vdmVMaXN0ZW5lcjogZXZlbnROYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbGlzdGVuZXIsICdmdW5jdGlvbicsICduYW5vYnVzLnJlbW92ZUxpc3RlbmVyOiBsaXN0ZW5lciBzaG91bGQgYmUgdHlwZSBmdW5jdGlvbicpXG5cbiAgaWYgKGV2ZW50TmFtZSA9PT0gJyonKSB7XG4gICAgdGhpcy5fc3Rhckxpc3RlbmVycyA9IHRoaXMuX3N0YXJMaXN0ZW5lcnMuc2xpY2UoKVxuICAgIHJldHVybiByZW1vdmUodGhpcy5fc3Rhckxpc3RlbmVycywgbGlzdGVuZXIpXG4gIH0gZWxzZSB7XG4gICAgaWYgKHR5cGVvZiB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdID0gdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0uc2xpY2UoKVxuICAgIH1cblxuICAgIHJldHVybiByZW1vdmUodGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0sIGxpc3RlbmVyKVxuICB9XG5cbiAgZnVuY3Rpb24gcmVtb3ZlIChhcnIsIGxpc3RlbmVyKSB7XG4gICAgaWYgKCFhcnIpIHJldHVyblxuICAgIHZhciBpbmRleCA9IGFyci5pbmRleE9mKGxpc3RlbmVyKVxuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIGFyci5zcGxpY2UoaW5kZXgsIDEpXG4gICAgICByZXR1cm4gdHJ1ZVxuICAgIH1cbiAgfVxufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbiAoZXZlbnROYW1lKSB7XG4gIGlmIChldmVudE5hbWUpIHtcbiAgICBpZiAoZXZlbnROYW1lID09PSAnKicpIHtcbiAgICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMgPSBbXVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSA9IFtdXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHRoaXMuX3N0YXJMaXN0ZW5lcnMgPSBbXVxuICAgIHRoaXMuX2xpc3RlbmVycyA9IHt9XG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuTmFub2J1cy5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50TmFtZSkge1xuICB2YXIgbGlzdGVuZXJzID0gKGV2ZW50TmFtZSAhPT0gJyonKSA/IHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdIDogdGhpcy5fc3Rhckxpc3RlbmVyc1xuICB2YXIgcmV0ID0gW11cbiAgaWYgKGxpc3RlbmVycykge1xuICAgIHZhciBpbGVuZ3RoID0gbGlzdGVuZXJzLmxlbmd0aFxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaWxlbmd0aDsgaSsrKSByZXQucHVzaChsaXN0ZW5lcnNbaV0pXG4gIH1cbiAgcmV0dXJuIHJldFxufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5fZW1pdCA9IGZ1bmN0aW9uIChhcnIsIGV2ZW50TmFtZSwgZGF0YSkge1xuICBpZiAodHlwZW9mIGFyciA9PT0gJ3VuZGVmaW5lZCcpIHJldHVyblxuICBpZiAoIWRhdGEpIHtcbiAgICBkYXRhID0gZXZlbnROYW1lXG4gICAgZXZlbnROYW1lID0gbnVsbFxuICB9XG4gIHZhciBsZW5ndGggPSBhcnIubGVuZ3RoXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgbGlzdGVuZXIgPSBhcnJbaV1cbiAgICBpZiAoZXZlbnROYW1lKSBsaXN0ZW5lcihldmVudE5hbWUsIGRhdGEpXG4gICAgZWxzZSBsaXN0ZW5lcihkYXRhKVxuICB9XG59XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBoaXN0b3J5XG5cbi8vIGxpc3RlbiB0byBodG1sNSBwdXNoc3RhdGUgZXZlbnRzXG4vLyBhbmQgdXBkYXRlIHJvdXRlciBhY2NvcmRpbmdseVxuZnVuY3Rpb24gaGlzdG9yeSAoY2IpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjYiwgJ2Z1bmN0aW9uJywgJ25hbm9oaXN0b3J5OiBjYiBtdXN0IGJlIHR5cGUgZnVuY3Rpb24nKVxuICB3aW5kb3cub25wb3BzdGF0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBjYihkb2N1bWVudC5sb2NhdGlvbilcbiAgfVxufVxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gaHJlZlxuXG52YXIgbm9Sb3V0aW5nQXR0ck5hbWUgPSAnZGF0YS1uby1yb3V0aW5nJ1xuXG4vLyBoYW5kbGUgYSBjbGljayBpZiBpcyBhbmNob3IgdGFnIHdpdGggYW4gaHJlZlxuLy8gYW5kIHVybCBsaXZlcyBvbiB0aGUgc2FtZSBkb21haW4uIFJlcGxhY2VzXG4vLyB0cmFpbGluZyAnIycgc28gZW1wdHkgbGlua3Mgd29yayBhcyBleHBlY3RlZC5cbi8vIChmbihzdHIpLCBvYmo/KSAtPiB1bmRlZmluZWRcbmZ1bmN0aW9uIGhyZWYgKGNiLCByb290KSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgY2IsICdmdW5jdGlvbicsICduYW5vaHJlZjogY2IgbXVzdCBiZSB0eXBlIGZ1bmN0aW9uJylcbiAgcm9vdCA9IHJvb3QgfHwgd2luZG93LmRvY3VtZW50XG5cbiAgd2luZG93Lm9uY2xpY2sgPSBmdW5jdGlvbiAoZSkge1xuICAgIGlmICgoZS5idXR0b24gJiYgZS5idXR0b24gIT09IDApIHx8IGUuY3RybEtleSB8fCBlLm1ldGFLZXkgfHwgZS5hbHRLZXkgfHwgZS5zaGlmdEtleSkgcmV0dXJuXG5cbiAgICB2YXIgbm9kZSA9IChmdW5jdGlvbiB0cmF2ZXJzZSAobm9kZSkge1xuICAgICAgaWYgKCFub2RlIHx8IG5vZGUgPT09IHJvb3QpIHJldHVyblxuICAgICAgaWYgKG5vZGUubG9jYWxOYW1lICE9PSAnYScpIHJldHVybiB0cmF2ZXJzZShub2RlLnBhcmVudE5vZGUpXG4gICAgICBpZiAobm9kZS5ocmVmID09PSB1bmRlZmluZWQpIHJldHVybiB0cmF2ZXJzZShub2RlLnBhcmVudE5vZGUpXG4gICAgICBpZiAod2luZG93LmxvY2F0aW9uLmhvc3QgIT09IG5vZGUuaG9zdCkgcmV0dXJuIHRyYXZlcnNlKG5vZGUucGFyZW50Tm9kZSlcbiAgICAgIHJldHVybiBub2RlXG4gICAgfSkoZS50YXJnZXQpXG5cbiAgICBpZiAoIW5vZGUpIHJldHVyblxuXG4gICAgdmFyIGlzUm91dGluZ0Rpc2FibGVkID0gbm9kZS5oYXNBdHRyaWJ1dGUobm9Sb3V0aW5nQXR0ck5hbWUpXG4gICAgaWYgKGlzUm91dGluZ0Rpc2FibGVkKSByZXR1cm5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIGNiKG5vZGUpXG4gIH1cbn1cbiIsInZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxudmFyIG1vcnBoID0gcmVxdWlyZSgnLi9saWIvbW9ycGgnKVxudmFyIHJvb3RMYWJlbFJlZ2V4ID0gL15kYXRhLW9ubG9hZGlkL1xuXG52YXIgRUxFTUVOVF9OT0RFID0gMVxuXG5tb2R1bGUuZXhwb3J0cyA9IG5hbm9tb3JwaFxuXG4vLyBtb3JwaCBvbmUgdHJlZSBpbnRvIGFub3RoZXIgdHJlZVxuLy8gKG9iaiwgb2JqKSAtPiBvYmpcbi8vIG5vIHBhcmVudFxuLy8gICAtPiBzYW1lOiBkaWZmIGFuZCB3YWxrIGNoaWxkcmVuXG4vLyAgIC0+IG5vdCBzYW1lOiByZXBsYWNlIGFuZCByZXR1cm5cbi8vIG9sZCBub2RlIGRvZXNuJ3QgZXhpc3Rcbi8vICAgLT4gaW5zZXJ0IG5ldyBub2RlXG4vLyBuZXcgbm9kZSBkb2Vzbid0IGV4aXN0XG4vLyAgIC0+IGRlbGV0ZSBvbGQgbm9kZVxuLy8gbm9kZXMgYXJlIG5vdCB0aGUgc2FtZVxuLy8gICAtPiBkaWZmIG5vZGVzIGFuZCBhcHBseSBwYXRjaCB0byBvbGQgbm9kZVxuLy8gbm9kZXMgYXJlIHRoZSBzYW1lXG4vLyAgIC0+IHdhbGsgYWxsIGNoaWxkIG5vZGVzIGFuZCBhcHBlbmQgdG8gb2xkIG5vZGVcbmZ1bmN0aW9uIG5hbm9tb3JwaCAob2xkVHJlZSwgbmV3VHJlZSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIG9sZFRyZWUsICdvYmplY3QnLCAnbmFub21vcnBoOiBvbGRUcmVlIHNob3VsZCBiZSBhbiBvYmplY3QnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIG5ld1RyZWUsICdvYmplY3QnLCAnbmFub21vcnBoOiBuZXdUcmVlIHNob3VsZCBiZSBhbiBvYmplY3QnKVxuXG4gIHBlcnNpc3RTdGF0ZWZ1bFJvb3QobmV3VHJlZSwgb2xkVHJlZSlcbiAgdmFyIHRyZWUgPSB3YWxrKG5ld1RyZWUsIG9sZFRyZWUpXG4gIHJldHVybiB0cmVlXG59XG5cbi8vIHdhbGsgYW5kIG1vcnBoIGEgZG9tIHRyZWVcbi8vIChvYmosIG9iaikgLT4gb2JqXG5mdW5jdGlvbiB3YWxrIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIGlmICghb2xkTm9kZSkge1xuICAgIHJldHVybiBuZXdOb2RlXG4gIH0gZWxzZSBpZiAoIW5ld05vZGUpIHtcbiAgICByZXR1cm4gbnVsbFxuICB9IGVsc2UgaWYgKG5ld05vZGUuaXNTYW1lTm9kZSAmJiBuZXdOb2RlLmlzU2FtZU5vZGUob2xkTm9kZSkpIHtcbiAgICByZXR1cm4gb2xkTm9kZVxuICB9IGVsc2UgaWYgKG5ld05vZGUudGFnTmFtZSAhPT0gb2xkTm9kZS50YWdOYW1lKSB7XG4gICAgcmV0dXJuIG5ld05vZGVcbiAgfSBlbHNlIHtcbiAgICBtb3JwaChuZXdOb2RlLCBvbGROb2RlKVxuICAgIHVwZGF0ZUNoaWxkcmVuKG5ld05vZGUsIG9sZE5vZGUpXG4gICAgcmV0dXJuIG9sZE5vZGVcbiAgfVxufVxuXG4vLyB1cGRhdGUgdGhlIGNoaWxkcmVuIG9mIGVsZW1lbnRzXG4vLyAob2JqLCBvYmopIC0+IG51bGxcbmZ1bmN0aW9uIHVwZGF0ZUNoaWxkcmVuIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIGlmICghbmV3Tm9kZS5jaGlsZE5vZGVzIHx8ICFvbGROb2RlLmNoaWxkTm9kZXMpIHJldHVyblxuXG4gIHZhciBuZXdMZW5ndGggPSBuZXdOb2RlLmNoaWxkTm9kZXMubGVuZ3RoXG4gIHZhciBvbGRMZW5ndGggPSBvbGROb2RlLmNoaWxkTm9kZXMubGVuZ3RoXG4gIHZhciBsZW5ndGggPSBNYXRoLm1heChvbGRMZW5ndGgsIG5ld0xlbmd0aClcblxuICB2YXIgaU5ldyA9IDBcbiAgdmFyIGlPbGQgPSAwXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyssIGlOZXcrKywgaU9sZCsrKSB7XG4gICAgdmFyIG5ld0NoaWxkTm9kZSA9IG5ld05vZGUuY2hpbGROb2Rlc1tpTmV3XVxuICAgIHZhciBvbGRDaGlsZE5vZGUgPSBvbGROb2RlLmNoaWxkTm9kZXNbaU9sZF1cbiAgICB2YXIgcmV0Q2hpbGROb2RlID0gd2FsayhuZXdDaGlsZE5vZGUsIG9sZENoaWxkTm9kZSlcbiAgICBpZiAoIXJldENoaWxkTm9kZSkge1xuICAgICAgaWYgKG9sZENoaWxkTm9kZSkge1xuICAgICAgICBvbGROb2RlLnJlbW92ZUNoaWxkKG9sZENoaWxkTm9kZSlcbiAgICAgICAgaU9sZC0tXG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghb2xkQ2hpbGROb2RlKSB7XG4gICAgICBpZiAocmV0Q2hpbGROb2RlKSB7XG4gICAgICAgIG9sZE5vZGUuYXBwZW5kQ2hpbGQocmV0Q2hpbGROb2RlKVxuICAgICAgICBpTmV3LS1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHJldENoaWxkTm9kZSAhPT0gb2xkQ2hpbGROb2RlKSB7XG4gICAgICBvbGROb2RlLnJlcGxhY2VDaGlsZChyZXRDaGlsZE5vZGUsIG9sZENoaWxkTm9kZSlcbiAgICAgIGlOZXctLVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwZXJzaXN0U3RhdGVmdWxSb290IChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIGlmICghbmV3Tm9kZSB8fCAhb2xkTm9kZSB8fCBvbGROb2RlLm5vZGVUeXBlICE9PSBFTEVNRU5UX05PREUgfHwgbmV3Tm9kZS5ub2RlVHlwZSAhPT0gRUxFTUVOVF9OT0RFKSByZXR1cm5cbiAgdmFyIG9sZEF0dHJzID0gb2xkTm9kZS5hdHRyaWJ1dGVzXG4gIHZhciBhdHRyLCBuYW1lXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBvbGRBdHRycy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGF0dHIgPSBvbGRBdHRyc1tpXVxuICAgIG5hbWUgPSBhdHRyLm5hbWVcbiAgICBpZiAocm9vdExhYmVsUmVnZXgudGVzdChuYW1lKSkge1xuICAgICAgbmV3Tm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgYXR0ci52YWx1ZSlcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IFtcbiAgLy8gYXR0cmlidXRlIGV2ZW50cyAoY2FuIGJlIHNldCB3aXRoIGF0dHJpYnV0ZXMpXG4gICdvbmNsaWNrJyxcbiAgJ29uZGJsY2xpY2snLFxuICAnb25tb3VzZWRvd24nLFxuICAnb25tb3VzZXVwJyxcbiAgJ29ubW91c2VvdmVyJyxcbiAgJ29ubW91c2Vtb3ZlJyxcbiAgJ29ubW91c2VvdXQnLFxuICAnb25tb3VzZWVudGVyJyxcbiAgJ29ubW91c2VsZWF2ZScsXG4gICdvbmRyYWdzdGFydCcsXG4gICdvbmRyYWcnLFxuICAnb25kcmFnZW50ZXInLFxuICAnb25kcmFnbGVhdmUnLFxuICAnb25kcmFnb3ZlcicsXG4gICdvbmRyb3AnLFxuICAnb25kcmFnZW5kJyxcbiAgJ29ua2V5ZG93bicsXG4gICdvbmtleXByZXNzJyxcbiAgJ29ua2V5dXAnLFxuICAnb251bmxvYWQnLFxuICAnb25hYm9ydCcsXG4gICdvbmVycm9yJyxcbiAgJ29ucmVzaXplJyxcbiAgJ29uc2Nyb2xsJyxcbiAgJ29uc2VsZWN0JyxcbiAgJ29uY2hhbmdlJyxcbiAgJ29uc3VibWl0JyxcbiAgJ29ucmVzZXQnLFxuICAnb25mb2N1cycsXG4gICdvbmJsdXInLFxuICAnb25pbnB1dCcsXG4gIC8vIG90aGVyIGNvbW1vbiBldmVudHNcbiAgJ29uY29udGV4dG1lbnUnLFxuICAnb25mb2N1c2luJyxcbiAgJ29uZm9jdXNvdXQnXG5dXG4iLCJ2YXIgZXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxudmFyIGV2ZW50c0xlbmd0aCA9IGV2ZW50cy5sZW5ndGhcblxudmFyIEVMRU1FTlRfTk9ERSA9IDFcbnZhciBURVhUX05PREUgPSAzXG52YXIgQ09NTUVOVF9OT0RFID0gOFxuXG5tb2R1bGUuZXhwb3J0cyA9IG1vcnBoXG5cbi8vIGRpZmYgZWxlbWVudHMgYW5kIGFwcGx5IHRoZSByZXN1bHRpbmcgcGF0Y2ggdG8gdGhlIG9sZCBub2RlXG4vLyAob2JqLCBvYmopIC0+IG51bGxcbmZ1bmN0aW9uIG1vcnBoIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIHZhciBub2RlVHlwZSA9IG5ld05vZGUubm9kZVR5cGVcbiAgdmFyIG5vZGVOYW1lID0gbmV3Tm9kZS5ub2RlTmFtZVxuXG4gIGlmIChub2RlVHlwZSA9PT0gRUxFTUVOVF9OT0RFKSB7XG4gICAgY29weUF0dHJzKG5ld05vZGUsIG9sZE5vZGUpXG4gIH1cblxuICBpZiAobm9kZVR5cGUgPT09IFRFWFRfTk9ERSB8fCBub2RlVHlwZSA9PT0gQ09NTUVOVF9OT0RFKSB7XG4gICAgb2xkTm9kZS5ub2RlVmFsdWUgPSBuZXdOb2RlLm5vZGVWYWx1ZVxuICB9XG5cbiAgLy8gU29tZSBET00gbm9kZXMgYXJlIHdlaXJkXG4gIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9wYXRyaWNrLXN0ZWVsZS1pZGVtL21vcnBoZG9tL2Jsb2IvbWFzdGVyL3NyYy9zcGVjaWFsRWxIYW5kbGVycy5qc1xuICBpZiAobm9kZU5hbWUgPT09ICdJTlBVVCcpIHVwZGF0ZUlucHV0KG5ld05vZGUsIG9sZE5vZGUpXG4gIGVsc2UgaWYgKG5vZGVOYW1lID09PSAnT1BUSU9OJykgdXBkYXRlT3B0aW9uKG5ld05vZGUsIG9sZE5vZGUpXG4gIGVsc2UgaWYgKG5vZGVOYW1lID09PSAnVEVYVEFSRUEnKSB1cGRhdGVUZXh0YXJlYShuZXdOb2RlLCBvbGROb2RlKVxuICBlbHNlIGlmIChub2RlTmFtZSA9PT0gJ1NFTEVDVCcpIHVwZGF0ZVNlbGVjdChuZXdOb2RlLCBvbGROb2RlKVxuXG4gIGNvcHlFdmVudHMobmV3Tm9kZSwgb2xkTm9kZSlcbn1cblxuZnVuY3Rpb24gY29weUF0dHJzIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIHZhciBvbGRBdHRycyA9IG9sZE5vZGUuYXR0cmlidXRlc1xuICB2YXIgbmV3QXR0cnMgPSBuZXdOb2RlLmF0dHJpYnV0ZXNcbiAgdmFyIGF0dHJOYW1lc3BhY2VVUkkgPSBudWxsXG4gIHZhciBhdHRyVmFsdWUgPSBudWxsXG4gIHZhciBmcm9tVmFsdWUgPSBudWxsXG4gIHZhciBhdHRyTmFtZSA9IG51bGxcbiAgdmFyIGF0dHIgPSBudWxsXG5cbiAgZm9yICh2YXIgaSA9IG5ld0F0dHJzLmxlbmd0aCAtIDE7IGkgPj0gMDsgLS1pKSB7XG4gICAgYXR0ciA9IG5ld0F0dHJzW2ldXG4gICAgYXR0ck5hbWUgPSBhdHRyLm5hbWVcbiAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUklcbiAgICBhdHRyVmFsdWUgPSBhdHRyLnZhbHVlXG5cbiAgICBpZiAoYXR0ck5hbWVzcGFjZVVSSSkge1xuICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZVxuICAgICAgZnJvbVZhbHVlID0gb2xkTm9kZS5nZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSlcblxuICAgICAgaWYgKGZyb21WYWx1ZSAhPT0gYXR0clZhbHVlKSB7XG4gICAgICAgIG9sZE5vZGUuc2V0QXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUsIGF0dHJWYWx1ZSlcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZnJvbVZhbHVlID0gb2xkTm9kZS5nZXRBdHRyaWJ1dGUoYXR0ck5hbWUpXG5cbiAgICAgIGlmIChmcm9tVmFsdWUgIT09IGF0dHJWYWx1ZSkge1xuICAgICAgICAvLyBhcHBhcmVudGx5IHZhbHVlcyBhcmUgYWx3YXlzIGNhc3QgdG8gc3RyaW5ncywgYWggd2VsbFxuICAgICAgICBpZiAoYXR0clZhbHVlID09PSAnbnVsbCcgfHwgYXR0clZhbHVlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIG9sZE5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG9sZE5vZGUuc2V0QXR0cmlidXRlKGF0dHJOYW1lLCBhdHRyVmFsdWUpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBSZW1vdmUgYW55IGV4dHJhIGF0dHJpYnV0ZXMgZm91bmQgb24gdGhlIG9yaWdpbmFsIERPTSBlbGVtZW50IHRoYXRcbiAgLy8gd2VyZW4ndCBmb3VuZCBvbiB0aGUgdGFyZ2V0IGVsZW1lbnQuXG4gIGZvciAodmFyIGogPSBvbGRBdHRycy5sZW5ndGggLSAxOyBqID49IDA7IC0taikge1xuICAgIGF0dHIgPSBvbGRBdHRyc1tqXVxuICAgIGlmIChhdHRyLnNwZWNpZmllZCAhPT0gZmFsc2UpIHtcbiAgICAgIGF0dHJOYW1lID0gYXR0ci5uYW1lXG4gICAgICBhdHRyTmFtZXNwYWNlVVJJID0gYXR0ci5uYW1lc3BhY2VVUklcblxuICAgICAgaWYgKGF0dHJOYW1lc3BhY2VVUkkpIHtcbiAgICAgICAgYXR0ck5hbWUgPSBhdHRyLmxvY2FsTmFtZSB8fCBhdHRyTmFtZVxuICAgICAgICBpZiAoIW5ld05vZGUuaGFzQXR0cmlidXRlTlMoYXR0ck5hbWVzcGFjZVVSSSwgYXR0ck5hbWUpKSB7XG4gICAgICAgICAgb2xkTm9kZS5yZW1vdmVBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSlcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCFuZXdOb2RlLmhhc0F0dHJpYnV0ZU5TKG51bGwsIGF0dHJOYW1lKSkge1xuICAgICAgICAgIG9sZE5vZGUucmVtb3ZlQXR0cmlidXRlKGF0dHJOYW1lKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGNvcHlFdmVudHMgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBldmVudHNMZW5ndGg7IGkrKykge1xuICAgIHZhciBldiA9IGV2ZW50c1tpXVxuICAgIGlmIChuZXdOb2RlW2V2XSkgeyAgICAgICAgICAgLy8gaWYgbmV3IGVsZW1lbnQgaGFzIGEgd2hpdGVsaXN0ZWQgYXR0cmlidXRlXG4gICAgICBvbGROb2RlW2V2XSA9IG5ld05vZGVbZXZdICAvLyB1cGRhdGUgZXhpc3RpbmcgZWxlbWVudFxuICAgIH0gZWxzZSBpZiAob2xkTm9kZVtldl0pIHsgICAgLy8gaWYgZXhpc3RpbmcgZWxlbWVudCBoYXMgaXQgYW5kIG5ldyBvbmUgZG9lc250XG4gICAgICBvbGROb2RlW2V2XSA9IHVuZGVmaW5lZCAgICAvLyByZW1vdmUgaXQgZnJvbSBleGlzdGluZyBlbGVtZW50XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZU9wdGlvbiAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICB1cGRhdGVBdHRyaWJ1dGUobmV3Tm9kZSwgb2xkTm9kZSwgJ3NlbGVjdGVkJylcbn1cblxuLy8gVGhlIFwidmFsdWVcIiBhdHRyaWJ1dGUgaXMgc3BlY2lhbCBmb3IgdGhlIDxpbnB1dD4gZWxlbWVudCBzaW5jZSBpdCBzZXRzIHRoZVxuLy8gaW5pdGlhbCB2YWx1ZS4gQ2hhbmdpbmcgdGhlIFwidmFsdWVcIiBhdHRyaWJ1dGUgd2l0aG91dCBjaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiXG4vLyBwcm9wZXJ0eSB3aWxsIGhhdmUgbm8gZWZmZWN0IHNpbmNlIGl0IGlzIG9ubHkgdXNlZCB0byB0aGUgc2V0IHRoZSBpbml0aWFsXG4vLyB2YWx1ZS4gU2ltaWxhciBmb3IgdGhlIFwiY2hlY2tlZFwiIGF0dHJpYnV0ZSwgYW5kIFwiZGlzYWJsZWRcIi5cbmZ1bmN0aW9uIHVwZGF0ZUlucHV0IChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIHZhciBuZXdWYWx1ZSA9IG5ld05vZGUudmFsdWVcbiAgdmFyIG9sZFZhbHVlID0gb2xkTm9kZS52YWx1ZVxuXG4gIHVwZGF0ZUF0dHJpYnV0ZShuZXdOb2RlLCBvbGROb2RlLCAnY2hlY2tlZCcpXG4gIHVwZGF0ZUF0dHJpYnV0ZShuZXdOb2RlLCBvbGROb2RlLCAnZGlzYWJsZWQnKVxuXG4gIGlmICghbmV3Tm9kZS5oYXNBdHRyaWJ1dGVOUyhudWxsLCAndmFsdWUnKSB8fCBuZXdWYWx1ZSA9PT0gJ251bGwnKSB7XG4gICAgb2xkTm9kZS52YWx1ZSA9ICcnXG4gICAgb2xkTm9kZS5yZW1vdmVBdHRyaWJ1dGUoJ3ZhbHVlJylcbiAgfSBlbHNlIGlmIChuZXdWYWx1ZSAhPT0gb2xkVmFsdWUpIHtcbiAgICBvbGROb2RlLnNldEF0dHJpYnV0ZSgndmFsdWUnLCBuZXdWYWx1ZSlcbiAgICBvbGROb2RlLnZhbHVlID0gbmV3VmFsdWVcbiAgfSBlbHNlIGlmIChvbGROb2RlLnR5cGUgPT09ICdyYW5nZScpIHtcbiAgICAvLyB0aGlzIGlzIHNvIGVsZW1lbnRzIGxpa2Ugc2xpZGVyIG1vdmUgdGhlaXIgVUkgdGhpbmd5XG4gICAgb2xkTm9kZS52YWx1ZSA9IG5ld1ZhbHVlXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlVGV4dGFyZWEgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgdmFyIG5ld1ZhbHVlID0gbmV3Tm9kZS52YWx1ZVxuICBpZiAobmV3VmFsdWUgIT09IG9sZE5vZGUudmFsdWUpIHtcbiAgICBvbGROb2RlLnZhbHVlID0gbmV3VmFsdWVcbiAgfVxuXG4gIGlmIChvbGROb2RlLmZpcnN0Q2hpbGQpIHtcbiAgICAvLyBOZWVkZWQgZm9yIElFLiBBcHBhcmVudGx5IElFIHNldHMgdGhlIHBsYWNlaG9sZGVyIGFzIHRoZVxuICAgIC8vIG5vZGUgdmFsdWUgYW5kIHZpc2UgdmVyc2EuIFRoaXMgaWdub3JlcyBhbiBlbXB0eSB1cGRhdGUuXG4gICAgaWYgKG5ld1ZhbHVlID09PSAnJyAmJiBvbGROb2RlLmZpcnN0Q2hpbGQubm9kZVZhbHVlID09PSBvbGROb2RlLnBsYWNlaG9sZGVyKSB7XG4gICAgICByZXR1cm5cbiAgICB9XG5cbiAgICBvbGROb2RlLmZpcnN0Q2hpbGQubm9kZVZhbHVlID0gbmV3VmFsdWVcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVTZWxlY3QgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgaWYgKCFvbGROb2RlLmhhc0F0dHJpYnV0ZU5TKG51bGwsICdtdWx0aXBsZScpKSB7XG4gICAgdmFyIGkgPSAwXG4gICAgdmFyIGN1ckNoaWxkID0gb2xkTm9kZS5maXJzdENoaWxkXG4gICAgd2hpbGUgKGN1ckNoaWxkKSB7XG4gICAgICB2YXIgbm9kZU5hbWUgPSBjdXJDaGlsZC5ub2RlTmFtZVxuICAgICAgaWYgKG5vZGVOYW1lICYmIG5vZGVOYW1lLnRvVXBwZXJDYXNlKCkgPT09ICdPUFRJT04nKSB7XG4gICAgICAgIGlmIChjdXJDaGlsZC5oYXNBdHRyaWJ1dGVOUyhudWxsLCAnc2VsZWN0ZWQnKSkgYnJlYWtcbiAgICAgICAgaSsrXG4gICAgICB9XG4gICAgICBjdXJDaGlsZCA9IGN1ckNoaWxkLm5leHRTaWJsaW5nXG4gICAgfVxuXG4gICAgbmV3Tm9kZS5zZWxlY3RlZEluZGV4ID0gaVxuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZUF0dHJpYnV0ZSAobmV3Tm9kZSwgb2xkTm9kZSwgbmFtZSkge1xuICBpZiAobmV3Tm9kZVtuYW1lXSAhPT0gb2xkTm9kZVtuYW1lXSkge1xuICAgIG9sZE5vZGVbbmFtZV0gPSBuZXdOb2RlW25hbWVdXG4gICAgaWYgKG5ld05vZGVbbmFtZV0pIHtcbiAgICAgIG9sZE5vZGUuc2V0QXR0cmlidXRlKG5hbWUsICcnKVxuICAgIH0gZWxzZSB7XG4gICAgICBvbGROb2RlLnJlbW92ZUF0dHJpYnV0ZShuYW1lLCAnJylcbiAgICB9XG4gIH1cbn1cbiIsInZhciBuYW5vbW9ycGggPSByZXF1aXJlKCduYW5vbW9ycGgnKVxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gbmFub21vdW50XG5cbmZ1bmN0aW9uIG5hbm9tb3VudCAodGFyZ2V0LCBuZXdUcmVlKSB7XG4gIGlmICh0YXJnZXQubm9kZU5hbWUgPT09ICdCT0RZJykge1xuICAgIHZhciBjaGlsZHJlbiA9IHRhcmdldC5jaGlsZE5vZGVzXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjaGlsZHJlbi5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKGNoaWxkcmVuW2ldLm5vZGVOYW1lID09PSAnU0NSSVBUJykge1xuICAgICAgICBuZXdUcmVlLmFwcGVuZENoaWxkKGNoaWxkcmVuW2ldLmNsb25lTm9kZSh0cnVlKSlcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICB2YXIgdHJlZSA9IG5hbm9tb3JwaCh0YXJnZXQsIG5ld1RyZWUpXG4gIGFzc2VydC5lcXVhbCh0cmVlLCB0YXJnZXQsICduYW5vbW91bnQ6IFRoZSB0YXJnZXQgbm9kZSAnICtcbiAgICB0cmVlLm91dGVySFRNTC5ub2RlTmFtZSArICcgaXMgbm90IHRoZSBzYW1lIHR5cGUgYXMgdGhlIG5ldyBub2RlICcgK1xuICAgIHRhcmdldC5vdXRlckhUTUwubm9kZU5hbWUgKyAnLicpXG59XG4iLCIndXNlIHN0cmljdCdcblxudmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gbmFub3JhZlxuXG4vLyBPbmx5IGNhbGwgUkFGIHdoZW4gbmVlZGVkXG4vLyAoZm4sIGZuPykgLT4gZm5cbmZ1bmN0aW9uIG5hbm9yYWYgKHJlbmRlciwgcmFmKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgcmVuZGVyLCAnZnVuY3Rpb24nLCAnbmFub3JhZjogcmVuZGVyIHNob3VsZCBiZSBhIGZ1bmN0aW9uJylcbiAgYXNzZXJ0Lm9rKHR5cGVvZiByYWYgPT09ICdmdW5jdGlvbicgfHwgdHlwZW9mIHJhZiA9PT0gJ3VuZGVmaW5lZCcsICduYW5vcmFmOiByYWYgc2hvdWxkIGJlIGEgZnVuY3Rpb24gb3IgdW5kZWZpbmVkJylcblxuICBpZiAoIXJhZikgcmFmID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB2YXIgcmVkcmF3U2NoZWR1bGVkID0gZmFsc2VcbiAgdmFyIGFyZ3MgPSBudWxsXG5cbiAgcmV0dXJuIGZ1bmN0aW9uIGZyYW1lICgpIHtcbiAgICBpZiAoYXJncyA9PT0gbnVsbCAmJiAhcmVkcmF3U2NoZWR1bGVkKSB7XG4gICAgICByZWRyYXdTY2hlZHVsZWQgPSB0cnVlXG5cbiAgICAgIHJhZihmdW5jdGlvbiByZWRyYXcgKCkge1xuICAgICAgICByZWRyYXdTY2hlZHVsZWQgPSBmYWxzZVxuXG4gICAgICAgIHZhciBsZW5ndGggPSBhcmdzLmxlbmd0aFxuICAgICAgICB2YXIgX2FyZ3MgPSBuZXcgQXJyYXkobGVuZ3RoKVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSBfYXJnc1tpXSA9IGFyZ3NbaV1cblxuICAgICAgICByZW5kZXIuYXBwbHkocmVuZGVyLCBfYXJncylcbiAgICAgICAgYXJncyA9IG51bGxcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgYXJncyA9IGFyZ3VtZW50c1xuICB9XG59XG4iLCJ2YXIgd2F5ZmFyZXIgPSByZXF1aXJlKCd3YXlmYXJlcicpXG5cbnZhciBpc0xvY2FsRmlsZSA9ICgvZmlsZTpcXC9cXC8vLnRlc3QodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcgJiZcbiAgd2luZG93LmxvY2F0aW9uICYmIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pKSAvLyBlbGVjdHJvbiBzdXBwb3J0XG5cbi8qIGVzbGludC1kaXNhYmxlIG5vLXVzZWxlc3MtZXNjYXBlICovXG52YXIgZWxlY3Ryb24gPSAnXihmaWxlOlxcL1xcL3xcXC8pKC4qXFwuaHRtbD9cXC8/KT8nXG52YXIgcHJvdG9jb2wgPSAnXihodHRwKHMpPyg6XFwvXFwvKSk/KHd3d1xcLik/J1xudmFyIGRvbWFpbiA9ICdbYS16QS1aMC05LV9cXC5dKyg6WzAtOV17MSw1fSk/KFxcL3sxfSk/J1xudmFyIHFzID0gJ1tcXD9dLiokJ1xuLyogZXNsaW50LWVuYWJsZSBuby11c2VsZXNzLWVzY2FwZSAqL1xuXG52YXIgc3RyaXBFbGVjdHJvbiA9IG5ldyBSZWdFeHAoZWxlY3Ryb24pXG52YXIgcHJlZml4ID0gbmV3IFJlZ0V4cChwcm90b2NvbCArIGRvbWFpbilcbnZhciBub3JtYWxpemUgPSBuZXcgUmVnRXhwKCcjJylcbnZhciBzdWZmaXggPSBuZXcgUmVnRXhwKHFzKVxuXG5tb2R1bGUuZXhwb3J0cyA9IE5hbm9yb3V0ZXJcblxuZnVuY3Rpb24gTmFub3JvdXRlciAob3B0cykge1xuICBvcHRzID0gb3B0cyB8fCB7fVxuXG4gIHZhciByb3V0ZXIgPSB3YXlmYXJlcihvcHRzLmRlZmF1bHQgfHwgJy80MDQnKVxuICB2YXIgY3VycnkgPSBvcHRzLmN1cnJ5IHx8IGZhbHNlXG4gIHZhciBwcmV2Q2FsbGJhY2sgPSBudWxsXG4gIHZhciBwcmV2Um91dGUgPSBudWxsXG5cbiAgZW1pdC5yb3V0ZXIgPSByb3V0ZXJcbiAgZW1pdC5vbiA9IG9uXG4gIHJldHVybiBlbWl0XG5cbiAgZnVuY3Rpb24gb24gKHJvdXRlbmFtZSwgbGlzdGVuZXIpIHtcbiAgICByb3V0ZW5hbWUgPSByb3V0ZW5hbWUucmVwbGFjZSgvXlsjL10vLCAnJylcbiAgICByb3V0ZXIub24ocm91dGVuYW1lLCBsaXN0ZW5lcilcbiAgfVxuXG4gIGZ1bmN0aW9uIGVtaXQgKHJvdXRlKSB7XG4gICAgaWYgKCFjdXJyeSkge1xuICAgICAgcmV0dXJuIHJvdXRlcihyb3V0ZSlcbiAgICB9IGVsc2Uge1xuICAgICAgcm91dGUgPSBwYXRobmFtZShyb3V0ZSwgaXNMb2NhbEZpbGUpXG4gICAgICBpZiAocm91dGUgPT09IHByZXZSb3V0ZSkge1xuICAgICAgICByZXR1cm4gcHJldkNhbGxiYWNrKClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByZXZSb3V0ZSA9IHJvdXRlXG4gICAgICAgIHByZXZDYWxsYmFjayA9IHJvdXRlcihyb3V0ZSlcbiAgICAgICAgcmV0dXJuIHByZXZDYWxsYmFjaygpXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIHJlcGxhY2UgZXZlcnl0aGluZyBpbiBhIHJvdXRlIGJ1dCB0aGUgcGF0aG5hbWUgYW5kIGhhc2hcbmZ1bmN0aW9uIHBhdGhuYW1lIChyb3V0ZSwgaXNFbGVjdHJvbikge1xuICBpZiAoaXNFbGVjdHJvbikgcm91dGUgPSByb3V0ZS5yZXBsYWNlKHN0cmlwRWxlY3Ryb24sICcnKVxuICBlbHNlIHJvdXRlID0gcm91dGUucmVwbGFjZShwcmVmaXgsICcnKVxuICByZXR1cm4gcm91dGUucmVwbGFjZShzdWZmaXgsICcnKS5yZXBsYWNlKG5vcm1hbGl6ZSwgJy8nKVxufVxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG5cbm1vZHVsZS5leHBvcnRzID0gTmFub3RpbWluZ1xuXG5mdW5jdGlvbiBOYW5vdGltaW5nIChuYW1lKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBOYW5vdGltaW5nKSkgcmV0dXJuIG5ldyBOYW5vdGltaW5nKG5hbWUpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbmFtZSwgJ3N0cmluZycsICdOYW5vdGltaW5nOiBuYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIHRoaXMuX25hbWUgPSBuYW1lXG4gIHRoaXMuX2VuYWJsZWQgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgIHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB3aW5kb3cucGVyZm9ybWFuY2UubWFya1xufVxuXG5OYW5vdGltaW5nLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uIChwYXJ0aWFsKSB7XG4gIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuXG4gIHZhciBuYW1lID0gcGFydGlhbCA/IHRoaXMuX25hbWUgKyAnOicgKyBwYXJ0aWFsIDogdGhpcy5fbmFtZVxuICB3aW5kb3cucGVyZm9ybWFuY2UubWFyayhuYW1lICsgJy1zdGFydCcpXG59XG5cbk5hbm90aW1pbmcucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIChwYXJ0aWFsKSB7XG4gIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuXG4gIHZhciBuYW1lID0gcGFydGlhbCA/IHRoaXMuX25hbWUgKyAnOicgKyBwYXJ0aWFsIDogdGhpcy5fbmFtZVxuICB3aW5kb3cucGVyZm9ybWFuY2UubWFyayhuYW1lICsgJy1lbmQnKVxuICB3aW5kb3cucGVyZm9ybWFuY2UubWVhc3VyZShuYW1lLCBuYW1lICsgJy1zdGFydCcsIG5hbWUgKyAnLWVuZCcpXG59XG4iLCIvKiBnbG9iYWwgTXV0YXRpb25PYnNlcnZlciAqL1xudmFyIGRvY3VtZW50ID0gcmVxdWlyZSgnZ2xvYmFsL2RvY3VtZW50JylcbnZhciB3aW5kb3cgPSByZXF1aXJlKCdnbG9iYWwvd2luZG93JylcbnZhciB3YXRjaCA9IE9iamVjdC5jcmVhdGUobnVsbClcbnZhciBLRVlfSUQgPSAnb25sb2FkaWQnICsgKG5ldyBEYXRlKCkgJSA5ZTYpLnRvU3RyaW5nKDM2KVxudmFyIEtFWV9BVFRSID0gJ2RhdGEtJyArIEtFWV9JRFxudmFyIElOREVYID0gMFxuXG5pZiAod2luZG93ICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyKSB7XG4gIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uIChtdXRhdGlvbnMpIHtcbiAgICBpZiAoT2JqZWN0LmtleXMod2F0Y2gpLmxlbmd0aCA8IDEpIHJldHVyblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbXV0YXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAobXV0YXRpb25zW2ldLmF0dHJpYnV0ZU5hbWUgPT09IEtFWV9BVFRSKSB7XG4gICAgICAgIGVhY2hBdHRyKG11dGF0aW9uc1tpXSwgdHVybm9uLCB0dXJub2ZmKVxuICAgICAgICBjb250aW51ZVxuICAgICAgfVxuICAgICAgZWFjaE11dGF0aW9uKG11dGF0aW9uc1tpXS5yZW1vdmVkTm9kZXMsIHR1cm5vZmYpXG4gICAgICBlYWNoTXV0YXRpb24obXV0YXRpb25zW2ldLmFkZGVkTm9kZXMsIHR1cm5vbilcbiAgICB9XG4gIH0pXG4gIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwge1xuICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICBzdWJ0cmVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZXM6IHRydWUsXG4gICAgYXR0cmlidXRlT2xkVmFsdWU6IHRydWUsXG4gICAgYXR0cmlidXRlRmlsdGVyOiBbS0VZX0FUVFJdXG4gIH0pXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gb25sb2FkIChlbCwgb24sIG9mZiwgY2FsbGVyKSB7XG4gIG9uID0gb24gfHwgZnVuY3Rpb24gKCkge31cbiAgb2ZmID0gb2ZmIHx8IGZ1bmN0aW9uICgpIHt9XG4gIGVsLnNldEF0dHJpYnV0ZShLRVlfQVRUUiwgJ28nICsgSU5ERVgpXG4gIHdhdGNoWydvJyArIElOREVYXSA9IFtvbiwgb2ZmLCAwLCBjYWxsZXIgfHwgb25sb2FkLmNhbGxlcl1cbiAgSU5ERVggKz0gMVxuICByZXR1cm4gZWxcbn1cblxuZnVuY3Rpb24gdHVybm9uIChpbmRleCwgZWwpIHtcbiAgaWYgKHdhdGNoW2luZGV4XVswXSAmJiB3YXRjaFtpbmRleF1bMl0gPT09IDApIHtcbiAgICB3YXRjaFtpbmRleF1bMF0oZWwpXG4gICAgd2F0Y2hbaW5kZXhdWzJdID0gMVxuICB9XG59XG5cbmZ1bmN0aW9uIHR1cm5vZmYgKGluZGV4LCBlbCkge1xuICBpZiAod2F0Y2hbaW5kZXhdWzFdICYmIHdhdGNoW2luZGV4XVsyXSA9PT0gMSkge1xuICAgIHdhdGNoW2luZGV4XVsxXShlbClcbiAgICB3YXRjaFtpbmRleF1bMl0gPSAwXG4gIH1cbn1cblxuZnVuY3Rpb24gZWFjaEF0dHIgKG11dGF0aW9uLCBvbiwgb2ZmKSB7XG4gIHZhciBuZXdWYWx1ZSA9IG11dGF0aW9uLnRhcmdldC5nZXRBdHRyaWJ1dGUoS0VZX0FUVFIpXG4gIGlmIChzYW1lT3JpZ2luKG11dGF0aW9uLm9sZFZhbHVlLCBuZXdWYWx1ZSkpIHtcbiAgICB3YXRjaFtuZXdWYWx1ZV0gPSB3YXRjaFttdXRhdGlvbi5vbGRWYWx1ZV1cbiAgICByZXR1cm5cbiAgfVxuICBpZiAod2F0Y2hbbXV0YXRpb24ub2xkVmFsdWVdKSB7XG4gICAgb2ZmKG11dGF0aW9uLm9sZFZhbHVlLCBtdXRhdGlvbi50YXJnZXQpXG4gIH1cbiAgaWYgKHdhdGNoW25ld1ZhbHVlXSkge1xuICAgIG9uKG5ld1ZhbHVlLCBtdXRhdGlvbi50YXJnZXQpXG4gIH1cbn1cblxuZnVuY3Rpb24gc2FtZU9yaWdpbiAob2xkVmFsdWUsIG5ld1ZhbHVlKSB7XG4gIGlmICghb2xkVmFsdWUgfHwgIW5ld1ZhbHVlKSByZXR1cm4gZmFsc2VcbiAgcmV0dXJuIHdhdGNoW29sZFZhbHVlXVszXSA9PT0gd2F0Y2hbbmV3VmFsdWVdWzNdXG59XG5cbmZ1bmN0aW9uIGVhY2hNdXRhdGlvbiAobm9kZXMsIGZuKSB7XG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMod2F0Y2gpXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbm9kZXMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAobm9kZXNbaV0gJiYgbm9kZXNbaV0uZ2V0QXR0cmlidXRlICYmIG5vZGVzW2ldLmdldEF0dHJpYnV0ZShLRVlfQVRUUikpIHtcbiAgICAgIHZhciBvbmxvYWRpZCA9IG5vZGVzW2ldLmdldEF0dHJpYnV0ZShLRVlfQVRUUilcbiAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICBpZiAob25sb2FkaWQgPT09IGspIHtcbiAgICAgICAgICBmbihrLCBub2Rlc1tpXSlcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gICAgaWYgKG5vZGVzW2ldLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xuICAgICAgZWFjaE11dGF0aW9uKG5vZGVzW2ldLmNoaWxkTm9kZXMsIGZuKVxuICAgIH1cbiAgfVxufVxuIiwiLyohIGh0dHA6Ly9tdGhzLmJlL3JlcGVhdCB2MC4yLjAgYnkgQG1hdGhpYXMgKi9cbmlmICghU3RyaW5nLnByb3RvdHlwZS5yZXBlYXQpIHtcblx0KGZ1bmN0aW9uKCkge1xuXHRcdCd1c2Ugc3RyaWN0JzsgLy8gbmVlZGVkIHRvIHN1cHBvcnQgYGFwcGx5YC9gY2FsbGAgd2l0aCBgdW5kZWZpbmVkYC9gbnVsbGBcblx0XHR2YXIgZGVmaW5lUHJvcGVydHkgPSAoZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyBJRSA4IG9ubHkgc3VwcG9ydHMgYE9iamVjdC5kZWZpbmVQcm9wZXJ0eWAgb24gRE9NIGVsZW1lbnRzXG5cdFx0XHR0cnkge1xuXHRcdFx0XHR2YXIgb2JqZWN0ID0ge307XG5cdFx0XHRcdHZhciAkZGVmaW5lUHJvcGVydHkgPSBPYmplY3QuZGVmaW5lUHJvcGVydHk7XG5cdFx0XHRcdHZhciByZXN1bHQgPSAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCBvYmplY3QsIG9iamVjdCkgJiYgJGRlZmluZVByb3BlcnR5O1xuXHRcdFx0fSBjYXRjaChlcnJvcikge31cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fSgpKTtcblx0XHR2YXIgcmVwZWF0ID0gZnVuY3Rpb24oY291bnQpIHtcblx0XHRcdGlmICh0aGlzID09IG51bGwpIHtcblx0XHRcdFx0dGhyb3cgVHlwZUVycm9yKCk7XG5cdFx0XHR9XG5cdFx0XHR2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuXHRcdFx0Ly8gYFRvSW50ZWdlcmBcblx0XHRcdHZhciBuID0gY291bnQgPyBOdW1iZXIoY291bnQpIDogMDtcblx0XHRcdGlmIChuICE9IG4pIHsgLy8gYmV0dGVyIGBpc05hTmBcblx0XHRcdFx0biA9IDA7XG5cdFx0XHR9XG5cdFx0XHQvLyBBY2NvdW50IGZvciBvdXQtb2YtYm91bmRzIGluZGljZXNcblx0XHRcdGlmIChuIDwgMCB8fCBuID09IEluZmluaXR5KSB7XG5cdFx0XHRcdHRocm93IFJhbmdlRXJyb3IoKTtcblx0XHRcdH1cblx0XHRcdHZhciByZXN1bHQgPSAnJztcblx0XHRcdHdoaWxlIChuKSB7XG5cdFx0XHRcdGlmIChuICUgMiA9PSAxKSB7XG5cdFx0XHRcdFx0cmVzdWx0ICs9IHN0cmluZztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobiA+IDEpIHtcblx0XHRcdFx0XHRzdHJpbmcgKz0gc3RyaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG4gPj49IDE7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gcmVzdWx0O1xuXHRcdH07XG5cdFx0aWYgKGRlZmluZVByb3BlcnR5KSB7XG5cdFx0XHRkZWZpbmVQcm9wZXJ0eShTdHJpbmcucHJvdG90eXBlLCAncmVwZWF0Jywge1xuXHRcdFx0XHQndmFsdWUnOiByZXBlYXQsXG5cdFx0XHRcdCdjb25maWd1cmFibGUnOiB0cnVlLFxuXHRcdFx0XHQnd3JpdGFibGUnOiB0cnVlXG5cdFx0XHR9KTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0U3RyaW5nLnByb3RvdHlwZS5yZXBlYXQgPSByZXBlYXQ7XG5cdFx0fVxuXHR9KCkpO1xufVxuIiwiLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG52YXIgYnl0ZVRvSGV4ID0gW107XG5mb3IgKHZhciBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleFtpXSA9IChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zdWJzdHIoMSk7XG59XG5cbmZ1bmN0aW9uIGJ5dGVzVG9VdWlkKGJ1Ziwgb2Zmc2V0KSB7XG4gIHZhciBpID0gb2Zmc2V0IHx8IDA7XG4gIHZhciBidGggPSBieXRlVG9IZXg7XG4gIHJldHVybiBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYnl0ZXNUb1V1aWQ7XG4iLCIvLyBVbmlxdWUgSUQgY3JlYXRpb24gcmVxdWlyZXMgYSBoaWdoIHF1YWxpdHkgcmFuZG9tICMgZ2VuZXJhdG9yLiAgSW4gdGhlXG4vLyBicm93c2VyIHRoaXMgaXMgYSBsaXR0bGUgY29tcGxpY2F0ZWQgZHVlIHRvIHVua25vd24gcXVhbGl0eSBvZiBNYXRoLnJhbmRvbSgpXG4vLyBhbmQgaW5jb25zaXN0ZW50IHN1cHBvcnQgZm9yIHRoZSBgY3J5cHRvYCBBUEkuICBXZSBkbyB0aGUgYmVzdCB3ZSBjYW4gdmlhXG4vLyBmZWF0dXJlLWRldGVjdGlvblxudmFyIHJuZztcblxudmFyIGNyeXB0byA9IGdsb2JhbC5jcnlwdG8gfHwgZ2xvYmFsLm1zQ3J5cHRvOyAvLyBmb3IgSUUgMTFcbmlmIChjcnlwdG8gJiYgY3J5cHRvLmdldFJhbmRvbVZhbHVlcykge1xuICAvLyBXSEFUV0cgY3J5cHRvIFJORyAtIGh0dHA6Ly93aWtpLndoYXR3Zy5vcmcvd2lraS9DcnlwdG9cbiAgdmFyIHJuZHM4ID0gbmV3IFVpbnQ4QXJyYXkoMTYpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLXVuZGVmXG4gIHJuZyA9IGZ1bmN0aW9uIHdoYXR3Z1JORygpIHtcbiAgICBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKHJuZHM4KTtcbiAgICByZXR1cm4gcm5kczg7XG4gIH07XG59XG5cbmlmICghcm5nKSB7XG4gIC8vIE1hdGgucmFuZG9tKCktYmFzZWQgKFJORylcbiAgLy9cbiAgLy8gSWYgYWxsIGVsc2UgZmFpbHMsIHVzZSBNYXRoLnJhbmRvbSgpLiAgSXQncyBmYXN0LCBidXQgaXMgb2YgdW5zcGVjaWZpZWRcbiAgLy8gcXVhbGl0eS5cbiAgdmFyIHJuZHMgPSBuZXcgQXJyYXkoMTYpO1xuICBybmcgPSBmdW5jdGlvbigpIHtcbiAgICBmb3IgKHZhciBpID0gMCwgcjsgaSA8IDE2OyBpKyspIHtcbiAgICAgIGlmICgoaSAmIDB4MDMpID09PSAwKSByID0gTWF0aC5yYW5kb20oKSAqIDB4MTAwMDAwMDAwO1xuICAgICAgcm5kc1tpXSA9IHIgPj4+ICgoaSAmIDB4MDMpIDw8IDMpICYgMHhmZjtcbiAgICB9XG5cbiAgICByZXR1cm4gcm5kcztcbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBybmc7XG4iLCJ2YXIgcm5nID0gcmVxdWlyZSgnLi9saWIvcm5nJyk7XG52YXIgYnl0ZXNUb1V1aWQgPSByZXF1aXJlKCcuL2xpYi9ieXRlc1RvVXVpZCcpO1xuXG4vLyAqKmB2MSgpYCAtIEdlbmVyYXRlIHRpbWUtYmFzZWQgVVVJRCoqXG4vL1xuLy8gSW5zcGlyZWQgYnkgaHR0cHM6Ly9naXRodWIuY29tL0xpb3NLL1VVSUQuanNcbi8vIGFuZCBodHRwOi8vZG9jcy5weXRob24ub3JnL2xpYnJhcnkvdXVpZC5odG1sXG5cbi8vIHJhbmRvbSAjJ3Mgd2UgbmVlZCB0byBpbml0IG5vZGUgYW5kIGNsb2Nrc2VxXG52YXIgX3NlZWRCeXRlcyA9IHJuZygpO1xuXG4vLyBQZXIgNC41LCBjcmVhdGUgYW5kIDQ4LWJpdCBub2RlIGlkLCAoNDcgcmFuZG9tIGJpdHMgKyBtdWx0aWNhc3QgYml0ID0gMSlcbnZhciBfbm9kZUlkID0gW1xuICBfc2VlZEJ5dGVzWzBdIHwgMHgwMSxcbiAgX3NlZWRCeXRlc1sxXSwgX3NlZWRCeXRlc1syXSwgX3NlZWRCeXRlc1szXSwgX3NlZWRCeXRlc1s0XSwgX3NlZWRCeXRlc1s1XVxuXTtcblxuLy8gUGVyIDQuMi4yLCByYW5kb21pemUgKDE0IGJpdCkgY2xvY2tzZXFcbnZhciBfY2xvY2tzZXEgPSAoX3NlZWRCeXRlc1s2XSA8PCA4IHwgX3NlZWRCeXRlc1s3XSkgJiAweDNmZmY7XG5cbi8vIFByZXZpb3VzIHV1aWQgY3JlYXRpb24gdGltZVxudmFyIF9sYXN0TVNlY3MgPSAwLCBfbGFzdE5TZWNzID0gMDtcblxuLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9icm9vZmEvbm9kZS11dWlkIGZvciBBUEkgZGV0YWlsc1xuZnVuY3Rpb24gdjEob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG4gIHZhciBiID0gYnVmIHx8IFtdO1xuXG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHZhciBjbG9ja3NlcSA9IG9wdGlvbnMuY2xvY2tzZXEgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuY2xvY2tzZXEgOiBfY2xvY2tzZXE7XG5cbiAgLy8gVVVJRCB0aW1lc3RhbXBzIGFyZSAxMDAgbmFuby1zZWNvbmQgdW5pdHMgc2luY2UgdGhlIEdyZWdvcmlhbiBlcG9jaCxcbiAgLy8gKDE1ODItMTAtMTUgMDA6MDApLiAgSlNOdW1iZXJzIGFyZW4ndCBwcmVjaXNlIGVub3VnaCBmb3IgdGhpcywgc29cbiAgLy8gdGltZSBpcyBoYW5kbGVkIGludGVybmFsbHkgYXMgJ21zZWNzJyAoaW50ZWdlciBtaWxsaXNlY29uZHMpIGFuZCAnbnNlY3MnXG4gIC8vICgxMDAtbmFub3NlY29uZHMgb2Zmc2V0IGZyb20gbXNlY3MpIHNpbmNlIHVuaXggZXBvY2gsIDE5NzAtMDEtMDEgMDA6MDAuXG4gIHZhciBtc2VjcyA9IG9wdGlvbnMubXNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubXNlY3MgOiBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuICAvLyBQZXIgNC4yLjEuMiwgdXNlIGNvdW50IG9mIHV1aWQncyBnZW5lcmF0ZWQgZHVyaW5nIHRoZSBjdXJyZW50IGNsb2NrXG4gIC8vIGN5Y2xlIHRvIHNpbXVsYXRlIGhpZ2hlciByZXNvbHV0aW9uIGNsb2NrXG4gIHZhciBuc2VjcyA9IG9wdGlvbnMubnNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNlY3MgOiBfbGFzdE5TZWNzICsgMTtcblxuICAvLyBUaW1lIHNpbmNlIGxhc3QgdXVpZCBjcmVhdGlvbiAoaW4gbXNlY3MpXG4gIHZhciBkdCA9IChtc2VjcyAtIF9sYXN0TVNlY3MpICsgKG5zZWNzIC0gX2xhc3ROU2VjcykvMTAwMDA7XG5cbiAgLy8gUGVyIDQuMi4xLjIsIEJ1bXAgY2xvY2tzZXEgb24gY2xvY2sgcmVncmVzc2lvblxuICBpZiAoZHQgPCAwICYmIG9wdGlvbnMuY2xvY2tzZXEgPT09IHVuZGVmaW5lZCkge1xuICAgIGNsb2Nrc2VxID0gY2xvY2tzZXEgKyAxICYgMHgzZmZmO1xuICB9XG5cbiAgLy8gUmVzZXQgbnNlY3MgaWYgY2xvY2sgcmVncmVzc2VzIChuZXcgY2xvY2tzZXEpIG9yIHdlJ3ZlIG1vdmVkIG9udG8gYSBuZXdcbiAgLy8gdGltZSBpbnRlcnZhbFxuICBpZiAoKGR0IDwgMCB8fCBtc2VjcyA+IF9sYXN0TVNlY3MpICYmIG9wdGlvbnMubnNlY3MgPT09IHVuZGVmaW5lZCkge1xuICAgIG5zZWNzID0gMDtcbiAgfVxuXG4gIC8vIFBlciA0LjIuMS4yIFRocm93IGVycm9yIGlmIHRvbyBtYW55IHV1aWRzIGFyZSByZXF1ZXN0ZWRcbiAgaWYgKG5zZWNzID49IDEwMDAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd1dWlkLnYxKCk6IENhblxcJ3QgY3JlYXRlIG1vcmUgdGhhbiAxME0gdXVpZHMvc2VjJyk7XG4gIH1cblxuICBfbGFzdE1TZWNzID0gbXNlY3M7XG4gIF9sYXN0TlNlY3MgPSBuc2VjcztcbiAgX2Nsb2Nrc2VxID0gY2xvY2tzZXE7XG5cbiAgLy8gUGVyIDQuMS40IC0gQ29udmVydCBmcm9tIHVuaXggZXBvY2ggdG8gR3JlZ29yaWFuIGVwb2NoXG4gIG1zZWNzICs9IDEyMjE5MjkyODAwMDAwO1xuXG4gIC8vIGB0aW1lX2xvd2BcbiAgdmFyIHRsID0gKChtc2VjcyAmIDB4ZmZmZmZmZikgKiAxMDAwMCArIG5zZWNzKSAlIDB4MTAwMDAwMDAwO1xuICBiW2krK10gPSB0bCA+Pj4gMjQgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gMTYgJiAweGZmO1xuICBiW2krK10gPSB0bCA+Pj4gOCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsICYgMHhmZjtcblxuICAvLyBgdGltZV9taWRgXG4gIHZhciB0bWggPSAobXNlY3MgLyAweDEwMDAwMDAwMCAqIDEwMDAwKSAmIDB4ZmZmZmZmZjtcbiAgYltpKytdID0gdG1oID4+PiA4ICYgMHhmZjtcbiAgYltpKytdID0gdG1oICYgMHhmZjtcblxuICAvLyBgdGltZV9oaWdoX2FuZF92ZXJzaW9uYFxuICBiW2krK10gPSB0bWggPj4+IDI0ICYgMHhmIHwgMHgxMDsgLy8gaW5jbHVkZSB2ZXJzaW9uXG4gIGJbaSsrXSA9IHRtaCA+Pj4gMTYgJiAweGZmO1xuXG4gIC8vIGBjbG9ja19zZXFfaGlfYW5kX3Jlc2VydmVkYCAoUGVyIDQuMi4yIC0gaW5jbHVkZSB2YXJpYW50KVxuICBiW2krK10gPSBjbG9ja3NlcSA+Pj4gOCB8IDB4ODA7XG5cbiAgLy8gYGNsb2NrX3NlcV9sb3dgXG4gIGJbaSsrXSA9IGNsb2Nrc2VxICYgMHhmZjtcblxuICAvLyBgbm9kZWBcbiAgdmFyIG5vZGUgPSBvcHRpb25zLm5vZGUgfHwgX25vZGVJZDtcbiAgZm9yICh2YXIgbiA9IDA7IG4gPCA2OyArK24pIHtcbiAgICBiW2kgKyBuXSA9IG5vZGVbbl07XG4gIH1cblxuICByZXR1cm4gYnVmID8gYnVmIDogYnl0ZXNUb1V1aWQoYik7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdjE7XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbnZhciB0cmllID0gcmVxdWlyZSgnLi90cmllJylcblxubW9kdWxlLmV4cG9ydHMgPSBXYXlmYXJlclxuXG4vLyBjcmVhdGUgYSByb3V0ZXJcbi8vIHN0ciAtPiBvYmpcbmZ1bmN0aW9uIFdheWZhcmVyIChkZnQpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFdheWZhcmVyKSkgcmV0dXJuIG5ldyBXYXlmYXJlcihkZnQpXG5cbiAgdmFyIF9kZWZhdWx0ID0gKGRmdCB8fCAnJykucmVwbGFjZSgvXlxcLy8sICcnKVxuICB2YXIgX3RyaWUgPSB0cmllKClcblxuICBlbWl0Ll90cmllID0gX3RyaWVcbiAgZW1pdC5lbWl0ID0gZW1pdFxuICBlbWl0Lm9uID0gb25cbiAgZW1pdC5fd2F5ZmFyZXIgPSB0cnVlXG5cbiAgcmV0dXJuIGVtaXRcblxuICAvLyBkZWZpbmUgYSByb3V0ZVxuICAvLyAoc3RyLCBmbikgLT4gb2JqXG4gIGZ1bmN0aW9uIG9uIChyb3V0ZSwgY2IpIHtcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIHJvdXRlLCAnc3RyaW5nJylcbiAgICBhc3NlcnQuZXF1YWwodHlwZW9mIGNiLCAnZnVuY3Rpb24nKVxuXG4gICAgcm91dGUgPSByb3V0ZSB8fCAnLydcbiAgICBjYi5yb3V0ZSA9IHJvdXRlXG5cbiAgICBpZiAoY2IgJiYgY2IuX3dheWZhcmVyICYmIGNiLl90cmllKSB7XG4gICAgICBfdHJpZS5tb3VudChyb3V0ZSwgY2IuX3RyaWUudHJpZSlcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIG5vZGUgPSBfdHJpZS5jcmVhdGUocm91dGUpXG4gICAgICBub2RlLmNiID0gY2JcbiAgICB9XG5cbiAgICByZXR1cm4gZW1pdFxuICB9XG5cbiAgLy8gbWF0Y2ggYW5kIGNhbGwgYSByb3V0ZVxuICAvLyAoc3RyLCBvYmo/KSAtPiBudWxsXG4gIGZ1bmN0aW9uIGVtaXQgKHJvdXRlKSB7XG4gICAgYXNzZXJ0Lm5vdEVxdWFsKHJvdXRlLCB1bmRlZmluZWQsIFwiJ3JvdXRlJyBtdXN0IGJlIGRlZmluZWRcIilcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKVxuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXVxuICAgIH1cblxuICAgIHZhciBub2RlID0gX3RyaWUubWF0Y2gocm91dGUpXG4gICAgaWYgKG5vZGUgJiYgbm9kZS5jYikge1xuICAgICAgYXJnc1swXSA9IG5vZGUucGFyYW1zXG4gICAgICB2YXIgY2IgPSBub2RlLmNiXG4gICAgICByZXR1cm4gY2IuYXBwbHkoY2IsIGFyZ3MpXG4gICAgfVxuXG4gICAgdmFyIGRmdCA9IF90cmllLm1hdGNoKF9kZWZhdWx0KVxuICAgIGlmIChkZnQgJiYgZGZ0LmNiKSB7XG4gICAgICBhcmdzWzBdID0gZGZ0LnBhcmFtc1xuICAgICAgdmFyIGRmdGNiID0gZGZ0LmNiXG4gICAgICByZXR1cm4gZGZ0Y2IuYXBwbHkoZGZ0Y2IsIGFyZ3MpXG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKFwicm91dGUgJ1wiICsgcm91dGUgKyBcIicgZGlkIG5vdCBtYXRjaFwiKVxuICB9XG59XG4iLCJ2YXIgbXV0YXRlID0gcmVxdWlyZSgneHRlbmQvbXV0YWJsZScpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcbnZhciB4dGVuZCA9IHJlcXVpcmUoJ3h0ZW5kJylcblxubW9kdWxlLmV4cG9ydHMgPSBUcmllXG5cbi8vIGNyZWF0ZSBhIG5ldyB0cmllXG4vLyBudWxsIC0+IG9ialxuZnVuY3Rpb24gVHJpZSAoKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBUcmllKSkgcmV0dXJuIG5ldyBUcmllKClcbiAgdGhpcy50cmllID0geyBub2Rlczoge30gfVxufVxuXG4vLyBjcmVhdGUgYSBub2RlIG9uIHRoZSB0cmllIGF0IHJvdXRlXG4vLyBhbmQgcmV0dXJuIGEgbm9kZVxuLy8gc3RyIC0+IG51bGxcblRyaWUucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uIChyb3V0ZSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJvdXRlLCAnc3RyaW5nJywgJ3JvdXRlIHNob3VsZCBiZSBhIHN0cmluZycpXG4gIC8vIHN0cmlwIGxlYWRpbmcgJy8nIGFuZCBzcGxpdCByb3V0ZXNcbiAgdmFyIHJvdXRlcyA9IHJvdXRlLnJlcGxhY2UoL15cXC8vLCAnJykuc3BsaXQoJy8nKVxuXG4gIGZ1bmN0aW9uIGNyZWF0ZU5vZGUgKGluZGV4LCB0cmllKSB7XG4gICAgdmFyIHRoaXNSb3V0ZSA9IChyb3V0ZXMuaGFzT3duUHJvcGVydHkoaW5kZXgpICYmIHJvdXRlc1tpbmRleF0pXG4gICAgaWYgKHRoaXNSb3V0ZSA9PT0gZmFsc2UpIHJldHVybiB0cmllXG5cbiAgICB2YXIgbm9kZSA9IG51bGxcbiAgICBpZiAoL146fF5cXCovLnRlc3QodGhpc1JvdXRlKSkge1xuICAgICAgLy8gaWYgbm9kZSBpcyBhIG5hbWUgbWF0Y2gsIHNldCBuYW1lIGFuZCBhcHBlbmQgdG8gJzonIG5vZGVcbiAgICAgIGlmICghdHJpZS5ub2Rlcy5oYXNPd25Qcm9wZXJ0eSgnJCQnKSkge1xuICAgICAgICBub2RlID0geyBub2Rlczoge30gfVxuICAgICAgICB0cmllLm5vZGVzWyckJCddID0gbm9kZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbm9kZSA9IHRyaWUubm9kZXNbJyQkJ11cbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXNSb3V0ZVswXSA9PT0gJyonKSB7XG4gICAgICAgIHRyaWUud2lsZGNhcmQgPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIHRyaWUubmFtZSA9IHRoaXNSb3V0ZS5yZXBsYWNlKC9eOnxeXFwqLywgJycpXG4gICAgfSBlbHNlIGlmICghdHJpZS5ub2Rlcy5oYXNPd25Qcm9wZXJ0eSh0aGlzUm91dGUpKSB7XG4gICAgICBub2RlID0geyBub2Rlczoge30gfVxuICAgICAgdHJpZS5ub2Rlc1t0aGlzUm91dGVdID0gbm9kZVxuICAgIH0gZWxzZSB7XG4gICAgICBub2RlID0gdHJpZS5ub2Rlc1t0aGlzUm91dGVdXG4gICAgfVxuXG4gICAgLy8gd2UgbXVzdCByZWN1cnNlIGRlZXBlclxuICAgIHJldHVybiBjcmVhdGVOb2RlKGluZGV4ICsgMSwgbm9kZSlcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVOb2RlKDAsIHRoaXMudHJpZSlcbn1cblxuLy8gbWF0Y2ggYSByb3V0ZSBvbiB0aGUgdHJpZVxuLy8gYW5kIHJldHVybiB0aGUgbm9kZVxuLy8gc3RyIC0+IG9ialxuVHJpZS5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiAocm91dGUpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiByb3V0ZSwgJ3N0cmluZycsICdyb3V0ZSBzaG91bGQgYmUgYSBzdHJpbmcnKVxuXG4gIHZhciByb3V0ZXMgPSByb3V0ZS5yZXBsYWNlKC9eXFwvLywgJycpLnNwbGl0KCcvJylcbiAgdmFyIHBhcmFtcyA9IHt9XG5cbiAgZnVuY3Rpb24gc2VhcmNoIChpbmRleCwgdHJpZSkge1xuICAgIC8vIGVpdGhlciB0aGVyZSdzIG5vIG1hdGNoLCBvciB3ZSdyZSBkb25lIHNlYXJjaGluZ1xuICAgIGlmICh0cmllID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWRcbiAgICB2YXIgdGhpc1JvdXRlID0gcm91dGVzW2luZGV4XVxuICAgIGlmICh0aGlzUm91dGUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRyaWVcblxuICAgIGlmICh0cmllLm5vZGVzLmhhc093blByb3BlcnR5KHRoaXNSb3V0ZSkpIHtcbiAgICAgIC8vIG1hdGNoIHJlZ3VsYXIgcm91dGVzIGZpcnN0XG4gICAgICByZXR1cm4gc2VhcmNoKGluZGV4ICsgMSwgdHJpZS5ub2Rlc1t0aGlzUm91dGVdKVxuICAgIH0gZWxzZSBpZiAodHJpZS5uYW1lKSB7XG4gICAgICAvLyBtYXRjaCBuYW1lZCByb3V0ZXNcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhcmFtc1t0cmllLm5hbWVdID0gZGVjb2RlVVJJQ29tcG9uZW50KHRoaXNSb3V0ZSlcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHNlYXJjaChpbmRleCwgdW5kZWZpbmVkKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHNlYXJjaChpbmRleCArIDEsIHRyaWUubm9kZXNbJyQkJ10pXG4gICAgfSBlbHNlIGlmICh0cmllLndpbGRjYXJkKSB7XG4gICAgICAvLyBtYXRjaCB3aWxkY2FyZHNcbiAgICAgIHRyeSB7XG4gICAgICAgIHBhcmFtc1snd2lsZGNhcmQnXSA9IGRlY29kZVVSSUNvbXBvbmVudChyb3V0ZXMuc2xpY2UoaW5kZXgpLmpvaW4oJy8nKSlcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIHNlYXJjaChpbmRleCwgdW5kZWZpbmVkKVxuICAgICAgfVxuICAgICAgLy8gcmV0dXJuIGVhcmx5LCBvciBlbHNlIHNlYXJjaCBtYXkga2VlcCByZWN1cnNpbmcgdGhyb3VnaCB0aGUgd2lsZGNhcmRcbiAgICAgIHJldHVybiB0cmllLm5vZGVzWyckJCddXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vIG1hdGNoZXMgZm91bmRcbiAgICAgIHJldHVybiBzZWFyY2goaW5kZXggKyAxKVxuICAgIH1cbiAgfVxuXG4gIHZhciBub2RlID0gc2VhcmNoKDAsIHRoaXMudHJpZSlcblxuICBpZiAoIW5vZGUpIHJldHVybiB1bmRlZmluZWRcbiAgbm9kZSA9IHh0ZW5kKG5vZGUpXG4gIG5vZGUucGFyYW1zID0gcGFyYW1zXG4gIHJldHVybiBub2RlXG59XG5cbi8vIG1vdW50IGEgdHJpZSBvbnRvIGEgbm9kZSBhdCByb3V0ZVxuLy8gKHN0ciwgb2JqKSAtPiBudWxsXG5UcmllLnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChyb3V0ZSwgdHJpZSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJvdXRlLCAnc3RyaW5nJywgJ3JvdXRlIHNob3VsZCBiZSBhIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgdHJpZSwgJ29iamVjdCcsICd0cmllIHNob3VsZCBiZSBhIG9iamVjdCcpXG5cbiAgdmFyIHNwbGl0ID0gcm91dGUucmVwbGFjZSgvXlxcLy8sICcnKS5zcGxpdCgnLycpXG4gIHZhciBub2RlID0gbnVsbFxuICB2YXIga2V5ID0gbnVsbFxuXG4gIGlmIChzcGxpdC5sZW5ndGggPT09IDEpIHtcbiAgICBrZXkgPSBzcGxpdFswXVxuICAgIG5vZGUgPSB0aGlzLmNyZWF0ZShrZXkpXG4gIH0gZWxzZSB7XG4gICAgdmFyIGhlYWRBcnIgPSBzcGxpdC5zcGxpY2UoMCwgc3BsaXQubGVuZ3RoIC0gMSlcbiAgICB2YXIgaGVhZCA9IGhlYWRBcnIuam9pbignLycpXG4gICAga2V5ID0gc3BsaXRbMF1cbiAgICBub2RlID0gdGhpcy5jcmVhdGUoaGVhZClcbiAgfVxuXG4gIG11dGF0ZShub2RlLm5vZGVzLCB0cmllLm5vZGVzKVxuICBpZiAodHJpZS5uYW1lKSBub2RlLm5hbWUgPSB0cmllLm5hbWVcblxuICAvLyBkZWxlZ2F0ZSBwcm9wZXJ0aWVzIGZyb20gJy8nIHRvIHRoZSBuZXcgbm9kZVxuICAvLyAnLycgY2Fubm90IGJlIHJlYWNoZWQgb25jZSBtb3VudGVkXG4gIGlmIChub2RlLm5vZGVzWycnXSkge1xuICAgIE9iamVjdC5rZXlzKG5vZGUubm9kZXNbJyddKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgIGlmIChrZXkgPT09ICdub2RlcycpIHJldHVyblxuICAgICAgbm9kZVtrZXldID0gbm9kZS5ub2Rlc1snJ11ba2V5XVxuICAgIH0pXG4gICAgbXV0YXRlKG5vZGUubm9kZXMsIG5vZGUubm9kZXNbJyddLm5vZGVzKVxuICAgIGRlbGV0ZSBub2RlLm5vZGVzWycnXS5ub2Rlc1xuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5mdW5jdGlvbiBleHRlbmQoKSB7XG4gICAgdmFyIHRhcmdldCA9IHt9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldXG5cbiAgICAgICAgZm9yICh2YXIga2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKGhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhcmdldFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBleHRlbmRcblxudmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuZnVuY3Rpb24gZXh0ZW5kKHRhcmdldCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGNvbXBhcmUgYW5kIGlzQnVmZmVyIHRha2VuIGZyb20gaHR0cHM6Ly9naXRodWIuY29tL2Zlcm9zcy9idWZmZXIvYmxvYi82ODBlOWU1ZTQ4OGYyMmFhYzI3NTk5YTU3ZGM4NDRhNjMxNTkyOGRkL2luZGV4LmpzXG4vLyBvcmlnaW5hbCBub3RpY2U6XG5cbi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cbmZ1bmN0aW9uIGNvbXBhcmUoYSwgYikge1xuICBpZiAoYSA9PT0gYikge1xuICAgIHJldHVybiAwO1xuICB9XG5cbiAgdmFyIHggPSBhLmxlbmd0aDtcbiAgdmFyIHkgPSBiLmxlbmd0aDtcblxuICBmb3IgKHZhciBpID0gMCwgbGVuID0gTWF0aC5taW4oeCwgeSk7IGkgPCBsZW47ICsraSkge1xuICAgIGlmIChhW2ldICE9PSBiW2ldKSB7XG4gICAgICB4ID0gYVtpXTtcbiAgICAgIHkgPSBiW2ldO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgaWYgKHggPCB5KSB7XG4gICAgcmV0dXJuIC0xO1xuICB9XG4gIGlmICh5IDwgeCkge1xuICAgIHJldHVybiAxO1xuICB9XG4gIHJldHVybiAwO1xufVxuZnVuY3Rpb24gaXNCdWZmZXIoYikge1xuICBpZiAoZ2xvYmFsLkJ1ZmZlciAmJiB0eXBlb2YgZ2xvYmFsLkJ1ZmZlci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHJldHVybiBnbG9iYWwuQnVmZmVyLmlzQnVmZmVyKGIpO1xuICB9XG4gIHJldHVybiAhIShiICE9IG51bGwgJiYgYi5faXNCdWZmZXIpO1xufVxuXG4vLyBiYXNlZCBvbiBub2RlIGFzc2VydCwgb3JpZ2luYWwgbm90aWNlOlxuXG4vLyBodHRwOi8vd2lraS5jb21tb25qcy5vcmcvd2lraS9Vbml0X1Rlc3RpbmcvMS4wXG4vL1xuLy8gVEhJUyBJUyBOT1QgVEVTVEVEIE5PUiBMSUtFTFkgVE8gV09SSyBPVVRTSURFIFY4IVxuLy9cbi8vIE9yaWdpbmFsbHkgZnJvbSBuYXJ3aGFsLmpzIChodHRwOi8vbmFyd2hhbGpzLm9yZylcbi8vIENvcHlyaWdodCAoYykgMjAwOSBUaG9tYXMgUm9iaW5zb24gPDI4MG5vcnRoLmNvbT5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5XG4vLyBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSAnU29mdHdhcmUnKSwgdG9cbi8vIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyB3aXRob3V0IGxpbWl0YXRpb24gdGhlXG4vLyByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Jcbi8vIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzXG4vLyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkIGluXG4vLyBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgJ0FTIElTJywgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUlxuLy8gSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksXG4vLyBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBFVkVOVCBTSEFMTCBUSEVcbi8vIEFVVEhPUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOXG4vLyBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OXG4vLyBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsLycpO1xudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG52YXIgcFNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlO1xudmFyIGZ1bmN0aW9uc0hhdmVOYW1lcyA9IChmdW5jdGlvbiAoKSB7XG4gIHJldHVybiBmdW5jdGlvbiBmb28oKSB7fS5uYW1lID09PSAnZm9vJztcbn0oKSk7XG5mdW5jdGlvbiBwVG9TdHJpbmcgKG9iaikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaik7XG59XG5mdW5jdGlvbiBpc1ZpZXcoYXJyYnVmKSB7XG4gIGlmIChpc0J1ZmZlcihhcnJidWYpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh0eXBlb2YgZ2xvYmFsLkFycmF5QnVmZmVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICh0eXBlb2YgQXJyYXlCdWZmZXIuaXNWaWV3ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIEFycmF5QnVmZmVyLmlzVmlldyhhcnJidWYpO1xuICB9XG4gIGlmICghYXJyYnVmKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChhcnJidWYgaW5zdGFuY2VvZiBEYXRhVmlldykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChhcnJidWYuYnVmZmVyICYmIGFycmJ1Zi5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcikge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbi8vIDEuIFRoZSBhc3NlcnQgbW9kdWxlIHByb3ZpZGVzIGZ1bmN0aW9ucyB0aGF0IHRocm93XG4vLyBBc3NlcnRpb25FcnJvcidzIHdoZW4gcGFydGljdWxhciBjb25kaXRpb25zIGFyZSBub3QgbWV0LiBUaGVcbi8vIGFzc2VydCBtb2R1bGUgbXVzdCBjb25mb3JtIHRvIHRoZSBmb2xsb3dpbmcgaW50ZXJmYWNlLlxuXG52YXIgYXNzZXJ0ID0gbW9kdWxlLmV4cG9ydHMgPSBvaztcblxuLy8gMi4gVGhlIEFzc2VydGlvbkVycm9yIGlzIGRlZmluZWQgaW4gYXNzZXJ0LlxuLy8gbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7IG1lc3NhZ2U6IG1lc3NhZ2UsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0dWFsOiBhY3R1YWwsXG4vLyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhwZWN0ZWQ6IGV4cGVjdGVkIH0pXG5cbnZhciByZWdleCA9IC9cXHMqZnVuY3Rpb25cXHMrKFteXFwoXFxzXSopXFxzKi87XG4vLyBiYXNlZCBvbiBodHRwczovL2dpdGh1Yi5jb20vbGpoYXJiL2Z1bmN0aW9uLnByb3RvdHlwZS5uYW1lL2Jsb2IvYWRlZWVlYzhiZmNjNjA2OGIxODdkN2Q5ZmIzZDViYjFkM2EzMDg5OS9pbXBsZW1lbnRhdGlvbi5qc1xuZnVuY3Rpb24gZ2V0TmFtZShmdW5jKSB7XG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGZ1bmMpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChmdW5jdGlvbnNIYXZlTmFtZXMpIHtcbiAgICByZXR1cm4gZnVuYy5uYW1lO1xuICB9XG4gIHZhciBzdHIgPSBmdW5jLnRvU3RyaW5nKCk7XG4gIHZhciBtYXRjaCA9IHN0ci5tYXRjaChyZWdleCk7XG4gIHJldHVybiBtYXRjaCAmJiBtYXRjaFsxXTtcbn1cbmFzc2VydC5Bc3NlcnRpb25FcnJvciA9IGZ1bmN0aW9uIEFzc2VydGlvbkVycm9yKG9wdGlvbnMpIHtcbiAgdGhpcy5uYW1lID0gJ0Fzc2VydGlvbkVycm9yJztcbiAgdGhpcy5hY3R1YWwgPSBvcHRpb25zLmFjdHVhbDtcbiAgdGhpcy5leHBlY3RlZCA9IG9wdGlvbnMuZXhwZWN0ZWQ7XG4gIHRoaXMub3BlcmF0b3IgPSBvcHRpb25zLm9wZXJhdG9yO1xuICBpZiAob3B0aW9ucy5tZXNzYWdlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gb3B0aW9ucy5tZXNzYWdlO1xuICAgIHRoaXMuZ2VuZXJhdGVkTWVzc2FnZSA9IGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubWVzc2FnZSA9IGdldE1lc3NhZ2UodGhpcyk7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gdHJ1ZTtcbiAgfVxuICB2YXIgc3RhY2tTdGFydEZ1bmN0aW9uID0gb3B0aW9ucy5zdGFja1N0YXJ0RnVuY3Rpb24gfHwgZmFpbDtcbiAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XG4gICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgc3RhY2tTdGFydEZ1bmN0aW9uKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBub24gdjggYnJvd3NlcnMgc28gd2UgY2FuIGhhdmUgYSBzdGFja3RyYWNlXG4gICAgdmFyIGVyciA9IG5ldyBFcnJvcigpO1xuICAgIGlmIChlcnIuc3RhY2spIHtcbiAgICAgIHZhciBvdXQgPSBlcnIuc3RhY2s7XG5cbiAgICAgIC8vIHRyeSB0byBzdHJpcCB1c2VsZXNzIGZyYW1lc1xuICAgICAgdmFyIGZuX25hbWUgPSBnZXROYW1lKHN0YWNrU3RhcnRGdW5jdGlvbik7XG4gICAgICB2YXIgaWR4ID0gb3V0LmluZGV4T2YoJ1xcbicgKyBmbl9uYW1lKTtcbiAgICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgICAvLyBvbmNlIHdlIGhhdmUgbG9jYXRlZCB0aGUgZnVuY3Rpb24gZnJhbWVcbiAgICAgICAgLy8gd2UgbmVlZCB0byBzdHJpcCBvdXQgZXZlcnl0aGluZyBiZWZvcmUgaXQgKGFuZCBpdHMgbGluZSlcbiAgICAgICAgdmFyIG5leHRfbGluZSA9IG91dC5pbmRleE9mKCdcXG4nLCBpZHggKyAxKTtcbiAgICAgICAgb3V0ID0gb3V0LnN1YnN0cmluZyhuZXh0X2xpbmUgKyAxKTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zdGFjayA9IG91dDtcbiAgICB9XG4gIH1cbn07XG5cbi8vIGFzc2VydC5Bc3NlcnRpb25FcnJvciBpbnN0YW5jZW9mIEVycm9yXG51dGlsLmluaGVyaXRzKGFzc2VydC5Bc3NlcnRpb25FcnJvciwgRXJyb3IpO1xuXG5mdW5jdGlvbiB0cnVuY2F0ZShzLCBuKSB7XG4gIGlmICh0eXBlb2YgcyA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gcy5sZW5ndGggPCBuID8gcyA6IHMuc2xpY2UoMCwgbik7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHM7XG4gIH1cbn1cbmZ1bmN0aW9uIGluc3BlY3Qoc29tZXRoaW5nKSB7XG4gIGlmIChmdW5jdGlvbnNIYXZlTmFtZXMgfHwgIXV0aWwuaXNGdW5jdGlvbihzb21ldGhpbmcpKSB7XG4gICAgcmV0dXJuIHV0aWwuaW5zcGVjdChzb21ldGhpbmcpO1xuICB9XG4gIHZhciByYXduYW1lID0gZ2V0TmFtZShzb21ldGhpbmcpO1xuICB2YXIgbmFtZSA9IHJhd25hbWUgPyAnOiAnICsgcmF3bmFtZSA6ICcnO1xuICByZXR1cm4gJ1tGdW5jdGlvbicgKyAgbmFtZSArICddJztcbn1cbmZ1bmN0aW9uIGdldE1lc3NhZ2Uoc2VsZikge1xuICByZXR1cm4gdHJ1bmNhdGUoaW5zcGVjdChzZWxmLmFjdHVhbCksIDEyOCkgKyAnICcgK1xuICAgICAgICAgc2VsZi5vcGVyYXRvciArICcgJyArXG4gICAgICAgICB0cnVuY2F0ZShpbnNwZWN0KHNlbGYuZXhwZWN0ZWQpLCAxMjgpO1xufVxuXG4vLyBBdCBwcmVzZW50IG9ubHkgdGhlIHRocmVlIGtleXMgbWVudGlvbmVkIGFib3ZlIGFyZSB1c2VkIGFuZFxuLy8gdW5kZXJzdG9vZCBieSB0aGUgc3BlYy4gSW1wbGVtZW50YXRpb25zIG9yIHN1YiBtb2R1bGVzIGNhbiBwYXNzXG4vLyBvdGhlciBrZXlzIHRvIHRoZSBBc3NlcnRpb25FcnJvcidzIGNvbnN0cnVjdG9yIC0gdGhleSB3aWxsIGJlXG4vLyBpZ25vcmVkLlxuXG4vLyAzLiBBbGwgb2YgdGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgbXVzdCB0aHJvdyBhbiBBc3NlcnRpb25FcnJvclxuLy8gd2hlbiBhIGNvcnJlc3BvbmRpbmcgY29uZGl0aW9uIGlzIG5vdCBtZXQsIHdpdGggYSBtZXNzYWdlIHRoYXRcbi8vIG1heSBiZSB1bmRlZmluZWQgaWYgbm90IHByb3ZpZGVkLiAgQWxsIGFzc2VydGlvbiBtZXRob2RzIHByb3ZpZGVcbi8vIGJvdGggdGhlIGFjdHVhbCBhbmQgZXhwZWN0ZWQgdmFsdWVzIHRvIHRoZSBhc3NlcnRpb24gZXJyb3IgZm9yXG4vLyBkaXNwbGF5IHB1cnBvc2VzLlxuXG5mdW5jdGlvbiBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsIG9wZXJhdG9yLCBzdGFja1N0YXJ0RnVuY3Rpb24pIHtcbiAgdGhyb3cgbmV3IGFzc2VydC5Bc3NlcnRpb25FcnJvcih7XG4gICAgbWVzc2FnZTogbWVzc2FnZSxcbiAgICBhY3R1YWw6IGFjdHVhbCxcbiAgICBleHBlY3RlZDogZXhwZWN0ZWQsXG4gICAgb3BlcmF0b3I6IG9wZXJhdG9yLFxuICAgIHN0YWNrU3RhcnRGdW5jdGlvbjogc3RhY2tTdGFydEZ1bmN0aW9uXG4gIH0pO1xufVxuXG4vLyBFWFRFTlNJT04hIGFsbG93cyBmb3Igd2VsbCBiZWhhdmVkIGVycm9ycyBkZWZpbmVkIGVsc2V3aGVyZS5cbmFzc2VydC5mYWlsID0gZmFpbDtcblxuLy8gNC4gUHVyZSBhc3NlcnRpb24gdGVzdHMgd2hldGhlciBhIHZhbHVlIGlzIHRydXRoeSwgYXMgZGV0ZXJtaW5lZFxuLy8gYnkgISFndWFyZC5cbi8vIGFzc2VydC5vayhndWFyZCwgbWVzc2FnZV9vcHQpO1xuLy8gVGhpcyBzdGF0ZW1lbnQgaXMgZXF1aXZhbGVudCB0byBhc3NlcnQuZXF1YWwodHJ1ZSwgISFndWFyZCxcbi8vIG1lc3NhZ2Vfb3B0KTsuIFRvIHRlc3Qgc3RyaWN0bHkgZm9yIHRoZSB2YWx1ZSB0cnVlLCB1c2Vcbi8vIGFzc2VydC5zdHJpY3RFcXVhbCh0cnVlLCBndWFyZCwgbWVzc2FnZV9vcHQpOy5cblxuZnVuY3Rpb24gb2sodmFsdWUsIG1lc3NhZ2UpIHtcbiAgaWYgKCF2YWx1ZSkgZmFpbCh2YWx1ZSwgdHJ1ZSwgbWVzc2FnZSwgJz09JywgYXNzZXJ0Lm9rKTtcbn1cbmFzc2VydC5vayA9IG9rO1xuXG4vLyA1LiBUaGUgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHNoYWxsb3csIGNvZXJjaXZlIGVxdWFsaXR5IHdpdGhcbi8vID09LlxuLy8gYXNzZXJ0LmVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmVxdWFsID0gZnVuY3Rpb24gZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9IGV4cGVjdGVkKSBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICc9PScsIGFzc2VydC5lcXVhbCk7XG59O1xuXG4vLyA2LiBUaGUgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igd2hldGhlciB0d28gb2JqZWN0cyBhcmUgbm90IGVxdWFsXG4vLyB3aXRoICE9IGFzc2VydC5ub3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RFcXVhbCA9IGZ1bmN0aW9uIG5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJyE9JywgYXNzZXJ0Lm5vdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gNy4gVGhlIGVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBhIGRlZXAgZXF1YWxpdHkgcmVsYXRpb24uXG4vLyBhc3NlcnQuZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LmRlZXBFcXVhbCA9IGZ1bmN0aW9uIGRlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmICghX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBmYWxzZSkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdkZWVwRXF1YWwnLCBhc3NlcnQuZGVlcEVxdWFsKTtcbiAgfVxufTtcblxuYXNzZXJ0LmRlZXBTdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIGRlZXBTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmICghX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCB0cnVlKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ2RlZXBTdHJpY3RFcXVhbCcsIGFzc2VydC5kZWVwU3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIHN0cmljdCwgbWVtb3MpIHtcbiAgLy8gNy4xLiBBbGwgaWRlbnRpY2FsIHZhbHVlcyBhcmUgZXF1aXZhbGVudCwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0gZWxzZSBpZiAoaXNCdWZmZXIoYWN0dWFsKSAmJiBpc0J1ZmZlcihleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gY29tcGFyZShhY3R1YWwsIGV4cGVjdGVkKSA9PT0gMDtcblxuICAvLyA3LjIuIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIERhdGUgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIERhdGUgb2JqZWN0IHRoYXQgcmVmZXJzIHRvIHRoZSBzYW1lIHRpbWUuXG4gIH0gZWxzZSBpZiAodXRpbC5pc0RhdGUoYWN0dWFsKSAmJiB1dGlsLmlzRGF0ZShleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLmdldFRpbWUoKSA9PT0gZXhwZWN0ZWQuZ2V0VGltZSgpO1xuXG4gIC8vIDcuMyBJZiB0aGUgZXhwZWN0ZWQgdmFsdWUgaXMgYSBSZWdFeHAgb2JqZWN0LCB0aGUgYWN0dWFsIHZhbHVlIGlzXG4gIC8vIGVxdWl2YWxlbnQgaWYgaXQgaXMgYWxzbyBhIFJlZ0V4cCBvYmplY3Qgd2l0aCB0aGUgc2FtZSBzb3VyY2UgYW5kXG4gIC8vIHByb3BlcnRpZXMgKGBnbG9iYWxgLCBgbXVsdGlsaW5lYCwgYGxhc3RJbmRleGAsIGBpZ25vcmVDYXNlYCkuXG4gIH0gZWxzZSBpZiAodXRpbC5pc1JlZ0V4cChhY3R1YWwpICYmIHV0aWwuaXNSZWdFeHAoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGFjdHVhbC5zb3VyY2UgPT09IGV4cGVjdGVkLnNvdXJjZSAmJlxuICAgICAgICAgICBhY3R1YWwuZ2xvYmFsID09PSBleHBlY3RlZC5nbG9iYWwgJiZcbiAgICAgICAgICAgYWN0dWFsLm11bHRpbGluZSA9PT0gZXhwZWN0ZWQubXVsdGlsaW5lICYmXG4gICAgICAgICAgIGFjdHVhbC5sYXN0SW5kZXggPT09IGV4cGVjdGVkLmxhc3RJbmRleCAmJlxuICAgICAgICAgICBhY3R1YWwuaWdub3JlQ2FzZSA9PT0gZXhwZWN0ZWQuaWdub3JlQ2FzZTtcblxuICAvLyA3LjQuIE90aGVyIHBhaXJzIHRoYXQgZG8gbm90IGJvdGggcGFzcyB0eXBlb2YgdmFsdWUgPT0gJ29iamVjdCcsXG4gIC8vIGVxdWl2YWxlbmNlIGlzIGRldGVybWluZWQgYnkgPT0uXG4gIH0gZWxzZSBpZiAoKGFjdHVhbCA9PT0gbnVsbCB8fCB0eXBlb2YgYWN0dWFsICE9PSAnb2JqZWN0JykgJiZcbiAgICAgICAgICAgICAoZXhwZWN0ZWQgPT09IG51bGwgfHwgdHlwZW9mIGV4cGVjdGVkICE9PSAnb2JqZWN0JykpIHtcbiAgICByZXR1cm4gc3RyaWN0ID8gYWN0dWFsID09PSBleHBlY3RlZCA6IGFjdHVhbCA9PSBleHBlY3RlZDtcblxuICAvLyBJZiBib3RoIHZhbHVlcyBhcmUgaW5zdGFuY2VzIG9mIHR5cGVkIGFycmF5cywgd3JhcCB0aGVpciB1bmRlcmx5aW5nXG4gIC8vIEFycmF5QnVmZmVycyBpbiBhIEJ1ZmZlciBlYWNoIHRvIGluY3JlYXNlIHBlcmZvcm1hbmNlXG4gIC8vIFRoaXMgb3B0aW1pemF0aW9uIHJlcXVpcmVzIHRoZSBhcnJheXMgdG8gaGF2ZSB0aGUgc2FtZSB0eXBlIGFzIGNoZWNrZWQgYnlcbiAgLy8gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyAoYWthIHBUb1N0cmluZykuIE5ldmVyIHBlcmZvcm0gYmluYXJ5XG4gIC8vIGNvbXBhcmlzb25zIGZvciBGbG9hdCpBcnJheXMsIHRob3VnaCwgc2luY2UgZS5nLiArMCA9PT0gLTAgYnV0IHRoZWlyXG4gIC8vIGJpdCBwYXR0ZXJucyBhcmUgbm90IGlkZW50aWNhbC5cbiAgfSBlbHNlIGlmIChpc1ZpZXcoYWN0dWFsKSAmJiBpc1ZpZXcoZXhwZWN0ZWQpICYmXG4gICAgICAgICAgICAgcFRvU3RyaW5nKGFjdHVhbCkgPT09IHBUb1N0cmluZyhleHBlY3RlZCkgJiZcbiAgICAgICAgICAgICAhKGFjdHVhbCBpbnN0YW5jZW9mIEZsb2F0MzJBcnJheSB8fFxuICAgICAgICAgICAgICAgYWN0dWFsIGluc3RhbmNlb2YgRmxvYXQ2NEFycmF5KSkge1xuICAgIHJldHVybiBjb21wYXJlKG5ldyBVaW50OEFycmF5KGFjdHVhbC5idWZmZXIpLFxuICAgICAgICAgICAgICAgICAgIG5ldyBVaW50OEFycmF5KGV4cGVjdGVkLmJ1ZmZlcikpID09PSAwO1xuXG4gIC8vIDcuNSBGb3IgYWxsIG90aGVyIE9iamVjdCBwYWlycywgaW5jbHVkaW5nIEFycmF5IG9iamVjdHMsIGVxdWl2YWxlbmNlIGlzXG4gIC8vIGRldGVybWluZWQgYnkgaGF2aW5nIHRoZSBzYW1lIG51bWJlciBvZiBvd25lZCBwcm9wZXJ0aWVzIChhcyB2ZXJpZmllZFxuICAvLyB3aXRoIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbCksIHRoZSBzYW1lIHNldCBvZiBrZXlzXG4gIC8vIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLCBlcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnlcbiAgLy8gY29ycmVzcG9uZGluZyBrZXksIGFuZCBhbiBpZGVudGljYWwgJ3Byb3RvdHlwZScgcHJvcGVydHkuIE5vdGU6IHRoaXNcbiAgLy8gYWNjb3VudHMgZm9yIGJvdGggbmFtZWQgYW5kIGluZGV4ZWQgcHJvcGVydGllcyBvbiBBcnJheXMuXG4gIH0gZWxzZSBpZiAoaXNCdWZmZXIoYWN0dWFsKSAhPT0gaXNCdWZmZXIoZXhwZWN0ZWQpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2Uge1xuICAgIG1lbW9zID0gbWVtb3MgfHwge2FjdHVhbDogW10sIGV4cGVjdGVkOiBbXX07XG5cbiAgICB2YXIgYWN0dWFsSW5kZXggPSBtZW1vcy5hY3R1YWwuaW5kZXhPZihhY3R1YWwpO1xuICAgIGlmIChhY3R1YWxJbmRleCAhPT0gLTEpIHtcbiAgICAgIGlmIChhY3R1YWxJbmRleCA9PT0gbWVtb3MuZXhwZWN0ZWQuaW5kZXhPZihleHBlY3RlZCkpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbWVtb3MuYWN0dWFsLnB1c2goYWN0dWFsKTtcbiAgICBtZW1vcy5leHBlY3RlZC5wdXNoKGV4cGVjdGVkKTtcblxuICAgIHJldHVybiBvYmpFcXVpdihhY3R1YWwsIGV4cGVjdGVkLCBzdHJpY3QsIG1lbW9zKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpc0FyZ3VtZW50cyhvYmplY3QpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmplY3QpID09ICdbb2JqZWN0IEFyZ3VtZW50c10nO1xufVxuXG5mdW5jdGlvbiBvYmpFcXVpdihhLCBiLCBzdHJpY3QsIGFjdHVhbFZpc2l0ZWRPYmplY3RzKSB7XG4gIGlmIChhID09PSBudWxsIHx8IGEgPT09IHVuZGVmaW5lZCB8fCBiID09PSBudWxsIHx8IGIgPT09IHVuZGVmaW5lZClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vIGlmIG9uZSBpcyBhIHByaW1pdGl2ZSwgdGhlIG90aGVyIG11c3QgYmUgc2FtZVxuICBpZiAodXRpbC5pc1ByaW1pdGl2ZShhKSB8fCB1dGlsLmlzUHJpbWl0aXZlKGIpKVxuICAgIHJldHVybiBhID09PSBiO1xuICBpZiAoc3RyaWN0ICYmIE9iamVjdC5nZXRQcm90b3R5cGVPZihhKSAhPT0gT2JqZWN0LmdldFByb3RvdHlwZU9mKGIpKVxuICAgIHJldHVybiBmYWxzZTtcbiAgdmFyIGFJc0FyZ3MgPSBpc0FyZ3VtZW50cyhhKTtcbiAgdmFyIGJJc0FyZ3MgPSBpc0FyZ3VtZW50cyhiKTtcbiAgaWYgKChhSXNBcmdzICYmICFiSXNBcmdzKSB8fCAoIWFJc0FyZ3MgJiYgYklzQXJncykpXG4gICAgcmV0dXJuIGZhbHNlO1xuICBpZiAoYUlzQXJncykge1xuICAgIGEgPSBwU2xpY2UuY2FsbChhKTtcbiAgICBiID0gcFNsaWNlLmNhbGwoYik7XG4gICAgcmV0dXJuIF9kZWVwRXF1YWwoYSwgYiwgc3RyaWN0KTtcbiAgfVxuICB2YXIga2EgPSBvYmplY3RLZXlzKGEpO1xuICB2YXIga2IgPSBvYmplY3RLZXlzKGIpO1xuICB2YXIga2V5LCBpO1xuICAvLyBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGtleXMgaW5jb3Jwb3JhdGVzXG4gIC8vIGhhc093blByb3BlcnR5KVxuICBpZiAoa2EubGVuZ3RoICE9PSBrYi5sZW5ndGgpXG4gICAgcmV0dXJuIGZhbHNlO1xuICAvL3RoZSBzYW1lIHNldCBvZiBrZXlzIChhbHRob3VnaCBub3QgbmVjZXNzYXJpbHkgdGhlIHNhbWUgb3JkZXIpLFxuICBrYS5zb3J0KCk7XG4gIGtiLnNvcnQoKTtcbiAgLy9+fn5jaGVhcCBrZXkgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGlmIChrYVtpXSAhPT0ga2JbaV0pXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgLy9lcXVpdmFsZW50IHZhbHVlcyBmb3IgZXZlcnkgY29ycmVzcG9uZGluZyBrZXksIGFuZFxuICAvL35+fnBvc3NpYmx5IGV4cGVuc2l2ZSBkZWVwIHRlc3RcbiAgZm9yIChpID0ga2EubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBrZXkgPSBrYVtpXTtcbiAgICBpZiAoIV9kZWVwRXF1YWwoYVtrZXldLCBiW2tleV0sIHN0cmljdCwgYWN0dWFsVmlzaXRlZE9iamVjdHMpKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyA4LiBUaGUgbm9uLWVxdWl2YWxlbmNlIGFzc2VydGlvbiB0ZXN0cyBmb3IgYW55IGRlZXAgaW5lcXVhbGl0eS5cbi8vIGFzc2VydC5ub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90RGVlcEVxdWFsID0gZnVuY3Rpb24gbm90RGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgZmFsc2UpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnbm90RGVlcEVxdWFsJywgYXNzZXJ0Lm5vdERlZXBFcXVhbCk7XG4gIH1cbn07XG5cbmFzc2VydC5ub3REZWVwU3RyaWN0RXF1YWwgPSBub3REZWVwU3RyaWN0RXF1YWw7XG5mdW5jdGlvbiBub3REZWVwU3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCB0cnVlKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ25vdERlZXBTdHJpY3RFcXVhbCcsIG5vdERlZXBTdHJpY3RFcXVhbCk7XG4gIH1cbn1cblxuXG4vLyA5LiBUaGUgc3RyaWN0IGVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBzdHJpY3QgZXF1YWxpdHksIGFzIGRldGVybWluZWQgYnkgPT09LlxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnN0cmljdEVxdWFsID0gZnVuY3Rpb24gc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsICE9PSBleHBlY3RlZCkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09PScsIGFzc2VydC5zdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbi8vIDEwLiBUaGUgc3RyaWN0IG5vbi1lcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgZm9yIHN0cmljdCBpbmVxdWFsaXR5LCBhc1xuLy8gZGV0ZXJtaW5lZCBieSAhPT0uICBhc3NlcnQubm90U3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQubm90U3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgPT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT09JywgYXNzZXJ0Lm5vdFN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuZnVuY3Rpb24gZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkge1xuICBpZiAoIWFjdHVhbCB8fCAhZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICBpZiAoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGV4cGVjdGVkKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgIHJldHVybiBleHBlY3RlZC50ZXN0KGFjdHVhbCk7XG4gIH1cblxuICB0cnkge1xuICAgIGlmIChhY3R1YWwgaW5zdGFuY2VvZiBleHBlY3RlZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgLy8gSWdub3JlLiAgVGhlIGluc3RhbmNlb2YgY2hlY2sgZG9lc24ndCB3b3JrIGZvciBhcnJvdyBmdW5jdGlvbnMuXG4gIH1cblxuICBpZiAoRXJyb3IuaXNQcm90b3R5cGVPZihleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gZXhwZWN0ZWQuY2FsbCh7fSwgYWN0dWFsKSA9PT0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gX3RyeUJsb2NrKGJsb2NrKSB7XG4gIHZhciBlcnJvcjtcbiAgdHJ5IHtcbiAgICBibG9jaygpO1xuICB9IGNhdGNoIChlKSB7XG4gICAgZXJyb3IgPSBlO1xuICB9XG4gIHJldHVybiBlcnJvcjtcbn1cblxuZnVuY3Rpb24gX3Rocm93cyhzaG91bGRUaHJvdywgYmxvY2ssIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIHZhciBhY3R1YWw7XG5cbiAgaWYgKHR5cGVvZiBibG9jayAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1wiYmxvY2tcIiBhcmd1bWVudCBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgZXhwZWN0ZWQgPT09ICdzdHJpbmcnKSB7XG4gICAgbWVzc2FnZSA9IGV4cGVjdGVkO1xuICAgIGV4cGVjdGVkID0gbnVsbDtcbiAgfVxuXG4gIGFjdHVhbCA9IF90cnlCbG9jayhibG9jayk7XG5cbiAgbWVzc2FnZSA9IChleHBlY3RlZCAmJiBleHBlY3RlZC5uYW1lID8gJyAoJyArIGV4cGVjdGVkLm5hbWUgKyAnKS4nIDogJy4nKSArXG4gICAgICAgICAgICAobWVzc2FnZSA/ICcgJyArIG1lc3NhZ2UgOiAnLicpO1xuXG4gIGlmIChzaG91bGRUaHJvdyAmJiAhYWN0dWFsKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnTWlzc2luZyBleHBlY3RlZCBleGNlcHRpb24nICsgbWVzc2FnZSk7XG4gIH1cblxuICB2YXIgdXNlclByb3ZpZGVkTWVzc2FnZSA9IHR5cGVvZiBtZXNzYWdlID09PSAnc3RyaW5nJztcbiAgdmFyIGlzVW53YW50ZWRFeGNlcHRpb24gPSAhc2hvdWxkVGhyb3cgJiYgdXRpbC5pc0Vycm9yKGFjdHVhbCk7XG4gIHZhciBpc1VuZXhwZWN0ZWRFeGNlcHRpb24gPSAhc2hvdWxkVGhyb3cgJiYgYWN0dWFsICYmICFleHBlY3RlZDtcblxuICBpZiAoKGlzVW53YW50ZWRFeGNlcHRpb24gJiZcbiAgICAgIHVzZXJQcm92aWRlZE1lc3NhZ2UgJiZcbiAgICAgIGV4cGVjdGVkRXhjZXB0aW9uKGFjdHVhbCwgZXhwZWN0ZWQpKSB8fFxuICAgICAgaXNVbmV4cGVjdGVkRXhjZXB0aW9uKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCAnR290IHVud2FudGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIGlmICgoc2hvdWxkVGhyb3cgJiYgYWN0dWFsICYmIGV4cGVjdGVkICYmXG4gICAgICAhZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHx8ICghc2hvdWxkVGhyb3cgJiYgYWN0dWFsKSkge1xuICAgIHRocm93IGFjdHVhbDtcbiAgfVxufVxuXG4vLyAxMS4gRXhwZWN0ZWQgdG8gdGhyb3cgYW4gZXJyb3I6XG4vLyBhc3NlcnQudGhyb3dzKGJsb2NrLCBFcnJvcl9vcHQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0LnRocm93cyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9lcnJvciwgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzKHRydWUsIGJsb2NrLCBlcnJvciwgbWVzc2FnZSk7XG59O1xuXG4vLyBFWFRFTlNJT04hIFRoaXMgaXMgYW5ub3lpbmcgdG8gd3JpdGUgb3V0c2lkZSB0aGlzIG1vZHVsZS5cbmFzc2VydC5kb2VzTm90VGhyb3cgPSBmdW5jdGlvbihibG9jaywgLypvcHRpb25hbCovZXJyb3IsIC8qb3B0aW9uYWwqL21lc3NhZ2UpIHtcbiAgX3Rocm93cyhmYWxzZSwgYmxvY2ssIGVycm9yLCBtZXNzYWdlKTtcbn07XG5cbmFzc2VydC5pZkVycm9yID0gZnVuY3Rpb24oZXJyKSB7IGlmIChlcnIpIHRocm93IGVycjsgfTtcblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciBrZXlzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoaGFzT3duLmNhbGwob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgfVxuICByZXR1cm4ga2V5cztcbn07XG4iLCIiLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnByZXBlbmRPbmNlTGlzdGVuZXIgPSBub29wO1xuXG5wcm9jZXNzLmxpc3RlbmVycyA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBbXSB9XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiaWYgKHR5cGVvZiBPYmplY3QuY3JlYXRlID09PSAnZnVuY3Rpb24nKSB7XG4gIC8vIGltcGxlbWVudGF0aW9uIGZyb20gc3RhbmRhcmQgbm9kZS5qcyAndXRpbCcgbW9kdWxlXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICBjdG9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoc3VwZXJDdG9yLnByb3RvdHlwZSwge1xuICAgICAgY29uc3RydWN0b3I6IHtcbiAgICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgICB9XG4gICAgfSk7XG4gIH07XG59IGVsc2Uge1xuICAvLyBvbGQgc2Nob29sIHNoaW0gZm9yIG9sZCBicm93c2Vyc1xuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgdmFyIFRlbXBDdG9yID0gZnVuY3Rpb24gKCkge31cbiAgICBUZW1wQ3Rvci5wcm90b3R5cGUgPSBzdXBlckN0b3IucHJvdG90eXBlXG4gICAgY3Rvci5wcm90b3R5cGUgPSBuZXcgVGVtcEN0b3IoKVxuICAgIGN0b3IucHJvdG90eXBlLmNvbnN0cnVjdG9yID0gY3RvclxuICB9XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQnVmZmVyKGFyZykge1xuICByZXR1cm4gYXJnICYmIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnXG4gICAgJiYgdHlwZW9mIGFyZy5jb3B5ID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5maWxsID09PSAnZnVuY3Rpb24nXG4gICAgJiYgdHlwZW9mIGFyZy5yZWFkVUludDggPT09ICdmdW5jdGlvbic7XG59IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbnZhciBmb3JtYXRSZWdFeHAgPSAvJVtzZGolXS9nO1xuZXhwb3J0cy5mb3JtYXQgPSBmdW5jdGlvbihmKSB7XG4gIGlmICghaXNTdHJpbmcoZikpIHtcbiAgICB2YXIgb2JqZWN0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBvYmplY3RzLnB1c2goaW5zcGVjdChhcmd1bWVudHNbaV0pKTtcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdHMuam9pbignICcpO1xuICB9XG5cbiAgdmFyIGkgPSAxO1xuICB2YXIgYXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuICB2YXIgc3RyID0gU3RyaW5nKGYpLnJlcGxhY2UoZm9ybWF0UmVnRXhwLCBmdW5jdGlvbih4KSB7XG4gICAgaWYgKHggPT09ICclJScpIHJldHVybiAnJSc7XG4gICAgaWYgKGkgPj0gbGVuKSByZXR1cm4geDtcbiAgICBzd2l0Y2ggKHgpIHtcbiAgICAgIGNhc2UgJyVzJzogcmV0dXJuIFN0cmluZyhhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWQnOiByZXR1cm4gTnVtYmVyKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclaic6XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGFyZ3NbaSsrXSk7XG4gICAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgICByZXR1cm4gJ1tDaXJjdWxhcl0nO1xuICAgICAgICB9XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4geDtcbiAgICB9XG4gIH0pO1xuICBmb3IgKHZhciB4ID0gYXJnc1tpXTsgaSA8IGxlbjsgeCA9IGFyZ3NbKytpXSkge1xuICAgIGlmIChpc051bGwoeCkgfHwgIWlzT2JqZWN0KHgpKSB7XG4gICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdHI7XG59O1xuXG5cbi8vIE1hcmsgdGhhdCBhIG1ldGhvZCBzaG91bGQgbm90IGJlIHVzZWQuXG4vLyBSZXR1cm5zIGEgbW9kaWZpZWQgZnVuY3Rpb24gd2hpY2ggd2FybnMgb25jZSBieSBkZWZhdWx0LlxuLy8gSWYgLS1uby1kZXByZWNhdGlvbiBpcyBzZXQsIHRoZW4gaXQgaXMgYSBuby1vcC5cbmV4cG9ydHMuZGVwcmVjYXRlID0gZnVuY3Rpb24oZm4sIG1zZykge1xuICAvLyBBbGxvdyBmb3IgZGVwcmVjYXRpbmcgdGhpbmdzIGluIHRoZSBwcm9jZXNzIG9mIHN0YXJ0aW5nIHVwLlxuICBpZiAoaXNVbmRlZmluZWQoZ2xvYmFsLnByb2Nlc3MpKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGV4cG9ydHMuZGVwcmVjYXRlKGZuLCBtc2cpLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChwcm9jZXNzLm5vRGVwcmVjYXRpb24gPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm47XG4gIH1cblxuICB2YXIgd2FybmVkID0gZmFsc2U7XG4gIGZ1bmN0aW9uIGRlcHJlY2F0ZWQoKSB7XG4gICAgaWYgKCF3YXJuZWQpIHtcbiAgICAgIGlmIChwcm9jZXNzLnRocm93RGVwcmVjYXRpb24pIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKG1zZyk7XG4gICAgICB9IGVsc2UgaWYgKHByb2Nlc3MudHJhY2VEZXByZWNhdGlvbikge1xuICAgICAgICBjb25zb2xlLnRyYWNlKG1zZyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gICAgICB9XG4gICAgICB3YXJuZWQgPSB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHJldHVybiBkZXByZWNhdGVkO1xufTtcblxuXG52YXIgZGVidWdzID0ge307XG52YXIgZGVidWdFbnZpcm9uO1xuZXhwb3J0cy5kZWJ1Z2xvZyA9IGZ1bmN0aW9uKHNldCkge1xuICBpZiAoaXNVbmRlZmluZWQoZGVidWdFbnZpcm9uKSlcbiAgICBkZWJ1Z0Vudmlyb24gPSBwcm9jZXNzLmVudi5OT0RFX0RFQlVHIHx8ICcnO1xuICBzZXQgPSBzZXQudG9VcHBlckNhc2UoKTtcbiAgaWYgKCFkZWJ1Z3Nbc2V0XSkge1xuICAgIGlmIChuZXcgUmVnRXhwKCdcXFxcYicgKyBzZXQgKyAnXFxcXGInLCAnaScpLnRlc3QoZGVidWdFbnZpcm9uKSkge1xuICAgICAgdmFyIHBpZCA9IHByb2Nlc3MucGlkO1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG1zZyA9IGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cyk7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyVzICVkOiAlcycsIHNldCwgcGlkLCBtc2cpO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGVidWdzW3NldF0gPSBmdW5jdGlvbigpIHt9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVidWdzW3NldF07XG59O1xuXG5cbi8qKlxuICogRWNob3MgdGhlIHZhbHVlIG9mIGEgdmFsdWUuIFRyeXMgdG8gcHJpbnQgdGhlIHZhbHVlIG91dFxuICogaW4gdGhlIGJlc3Qgd2F5IHBvc3NpYmxlIGdpdmVuIHRoZSBkaWZmZXJlbnQgdHlwZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9iaiBUaGUgb2JqZWN0IHRvIHByaW50IG91dC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRzIE9wdGlvbmFsIG9wdGlvbnMgb2JqZWN0IHRoYXQgYWx0ZXJzIHRoZSBvdXRwdXQuXG4gKi9cbi8qIGxlZ2FjeTogb2JqLCBzaG93SGlkZGVuLCBkZXB0aCwgY29sb3JzKi9cbmZ1bmN0aW9uIGluc3BlY3Qob2JqLCBvcHRzKSB7XG4gIC8vIGRlZmF1bHQgb3B0aW9uc1xuICB2YXIgY3R4ID0ge1xuICAgIHNlZW46IFtdLFxuICAgIHN0eWxpemU6IHN0eWxpemVOb0NvbG9yXG4gIH07XG4gIC8vIGxlZ2FjeS4uLlxuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSAzKSBjdHguZGVwdGggPSBhcmd1bWVudHNbMl07XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDQpIGN0eC5jb2xvcnMgPSBhcmd1bWVudHNbM107XG4gIGlmIChpc0Jvb2xlYW4ob3B0cykpIHtcbiAgICAvLyBsZWdhY3kuLi5cbiAgICBjdHguc2hvd0hpZGRlbiA9IG9wdHM7XG4gIH0gZWxzZSBpZiAob3B0cykge1xuICAgIC8vIGdvdCBhbiBcIm9wdGlvbnNcIiBvYmplY3RcbiAgICBleHBvcnRzLl9leHRlbmQoY3R4LCBvcHRzKTtcbiAgfVxuICAvLyBzZXQgZGVmYXVsdCBvcHRpb25zXG4gIGlmIChpc1VuZGVmaW5lZChjdHguc2hvd0hpZGRlbikpIGN0eC5zaG93SGlkZGVuID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguZGVwdGgpKSBjdHguZGVwdGggPSAyO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmNvbG9ycykpIGN0eC5jb2xvcnMgPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jdXN0b21JbnNwZWN0KSkgY3R4LmN1c3RvbUluc3BlY3QgPSB0cnVlO1xuICBpZiAoY3R4LmNvbG9ycykgY3R4LnN0eWxpemUgPSBzdHlsaXplV2l0aENvbG9yO1xuICByZXR1cm4gZm9ybWF0VmFsdWUoY3R4LCBvYmosIGN0eC5kZXB0aCk7XG59XG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xuXG5cbi8vIGh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvQU5TSV9lc2NhcGVfY29kZSNncmFwaGljc1xuaW5zcGVjdC5jb2xvcnMgPSB7XG4gICdib2xkJyA6IFsxLCAyMl0sXG4gICdpdGFsaWMnIDogWzMsIDIzXSxcbiAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAnaW52ZXJzZScgOiBbNywgMjddLFxuICAnd2hpdGUnIDogWzM3LCAzOV0sXG4gICdncmV5JyA6IFs5MCwgMzldLFxuICAnYmxhY2snIDogWzMwLCAzOV0sXG4gICdibHVlJyA6IFszNCwgMzldLFxuICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgJ2dyZWVuJyA6IFszMiwgMzldLFxuICAnbWFnZW50YScgOiBbMzUsIDM5XSxcbiAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgJ3llbGxvdycgOiBbMzMsIDM5XVxufTtcblxuLy8gRG9uJ3QgdXNlICdibHVlJyBub3QgdmlzaWJsZSBvbiBjbWQuZXhlXG5pbnNwZWN0LnN0eWxlcyA9IHtcbiAgJ3NwZWNpYWwnOiAnY3lhbicsXG4gICdudW1iZXInOiAneWVsbG93JyxcbiAgJ2Jvb2xlYW4nOiAneWVsbG93JyxcbiAgJ3VuZGVmaW5lZCc6ICdncmV5JyxcbiAgJ251bGwnOiAnYm9sZCcsXG4gICdzdHJpbmcnOiAnZ3JlZW4nLFxuICAnZGF0ZSc6ICdtYWdlbnRhJyxcbiAgLy8gXCJuYW1lXCI6IGludGVudGlvbmFsbHkgbm90IHN0eWxpbmdcbiAgJ3JlZ2V4cCc6ICdyZWQnXG59O1xuXG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRoQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgdmFyIHN0eWxlID0gaW5zcGVjdC5zdHlsZXNbc3R5bGVUeXBlXTtcblxuICBpZiAoc3R5bGUpIHtcbiAgICByZXR1cm4gJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVswXSArICdtJyArIHN0ciArXG4gICAgICAgICAgICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMV0gKyAnbSc7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHN0cjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHN0eWxpemVOb0NvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblxuZnVuY3Rpb24gYXJyYXlUb0hhc2goYXJyYXkpIHtcbiAgdmFyIGhhc2ggPSB7fTtcblxuICBhcnJheS5mb3JFYWNoKGZ1bmN0aW9uKHZhbCwgaWR4KSB7XG4gICAgaGFzaFt2YWxdID0gdHJ1ZTtcbiAgfSk7XG5cbiAgcmV0dXJuIGhhc2g7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0VmFsdWUoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzKSB7XG4gIC8vIFByb3ZpZGUgYSBob29rIGZvciB1c2VyLXNwZWNpZmllZCBpbnNwZWN0IGZ1bmN0aW9ucy5cbiAgLy8gQ2hlY2sgdGhhdCB2YWx1ZSBpcyBhbiBvYmplY3Qgd2l0aCBhbiBpbnNwZWN0IGZ1bmN0aW9uIG9uIGl0XG4gIGlmIChjdHguY3VzdG9tSW5zcGVjdCAmJlxuICAgICAgdmFsdWUgJiZcbiAgICAgIGlzRnVuY3Rpb24odmFsdWUuaW5zcGVjdCkgJiZcbiAgICAgIC8vIEZpbHRlciBvdXQgdGhlIHV0aWwgbW9kdWxlLCBpdCdzIGluc3BlY3QgZnVuY3Rpb24gaXMgc3BlY2lhbFxuICAgICAgdmFsdWUuaW5zcGVjdCAhPT0gZXhwb3J0cy5pbnNwZWN0ICYmXG4gICAgICAvLyBBbHNvIGZpbHRlciBvdXQgYW55IHByb3RvdHlwZSBvYmplY3RzIHVzaW5nIHRoZSBjaXJjdWxhciBjaGVjay5cbiAgICAgICEodmFsdWUuY29uc3RydWN0b3IgJiYgdmFsdWUuY29uc3RydWN0b3IucHJvdG90eXBlID09PSB2YWx1ZSkpIHtcbiAgICB2YXIgcmV0ID0gdmFsdWUuaW5zcGVjdChyZWN1cnNlVGltZXMsIGN0eCk7XG4gICAgaWYgKCFpc1N0cmluZyhyZXQpKSB7XG4gICAgICByZXQgPSBmb3JtYXRWYWx1ZShjdHgsIHJldCwgcmVjdXJzZVRpbWVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbiAgfVxuXG4gIC8vIFByaW1pdGl2ZSB0eXBlcyBjYW5ub3QgaGF2ZSBwcm9wZXJ0aWVzXG4gIHZhciBwcmltaXRpdmUgPSBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSk7XG4gIGlmIChwcmltaXRpdmUpIHtcbiAgICByZXR1cm4gcHJpbWl0aXZlO1xuICB9XG5cbiAgLy8gTG9vayB1cCB0aGUga2V5cyBvZiB0aGUgb2JqZWN0LlxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHZhbHVlKTtcbiAgdmFyIHZpc2libGVLZXlzID0gYXJyYXlUb0hhc2goa2V5cyk7XG5cbiAgaWYgKGN0eC5zaG93SGlkZGVuKSB7XG4gICAga2V5cyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHZhbHVlKTtcbiAgfVxuXG4gIC8vIElFIGRvZXNuJ3QgbWFrZSBlcnJvciBmaWVsZHMgbm9uLWVudW1lcmFibGVcbiAgLy8gaHR0cDovL21zZG4ubWljcm9zb2Z0LmNvbS9lbi11cy9saWJyYXJ5L2llL2R3dzUyc2J0KHY9dnMuOTQpLmFzcHhcbiAgaWYgKGlzRXJyb3IodmFsdWUpXG4gICAgICAmJiAoa2V5cy5pbmRleE9mKCdtZXNzYWdlJykgPj0gMCB8fCBrZXlzLmluZGV4T2YoJ2Rlc2NyaXB0aW9uJykgPj0gMCkpIHtcbiAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgLy8gU29tZSB0eXBlIG9mIG9iamVjdCB3aXRob3V0IHByb3BlcnRpZXMgY2FuIGJlIHNob3J0Y3V0dGVkLlxuICBpZiAoa2V5cy5sZW5ndGggPT09IDApIHtcbiAgICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgIHZhciBuYW1lID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tGdW5jdGlvbicgKyBuYW1lICsgJ10nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKERhdGUucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAnZGF0ZScpO1xuICAgIH1cbiAgICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gICAgfVxuICB9XG5cbiAgdmFyIGJhc2UgPSAnJywgYXJyYXkgPSBmYWxzZSwgYnJhY2VzID0gWyd7JywgJ30nXTtcblxuICAvLyBNYWtlIEFycmF5IHNheSB0aGF0IHRoZXkgYXJlIEFycmF5XG4gIGlmIChpc0FycmF5KHZhbHVlKSkge1xuICAgIGFycmF5ID0gdHJ1ZTtcbiAgICBicmFjZXMgPSBbJ1snLCAnXSddO1xuICB9XG5cbiAgLy8gTWFrZSBmdW5jdGlvbnMgc2F5IHRoYXQgdGhleSBhcmUgZnVuY3Rpb25zXG4gIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgIHZhciBuID0gdmFsdWUubmFtZSA/ICc6ICcgKyB2YWx1ZS5uYW1lIDogJyc7XG4gICAgYmFzZSA9ICcgW0Z1bmN0aW9uJyArIG4gKyAnXSc7XG4gIH1cblxuICAvLyBNYWtlIFJlZ0V4cHMgc2F5IHRoYXQgdGhleSBhcmUgUmVnRXhwc1xuICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGRhdGVzIHdpdGggcHJvcGVydGllcyBmaXJzdCBzYXkgdGhlIGRhdGVcbiAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgRGF0ZS5wcm90b3R5cGUudG9VVENTdHJpbmcuY2FsbCh2YWx1ZSk7XG4gIH1cblxuICAvLyBNYWtlIGVycm9yIHdpdGggbWVzc2FnZSBmaXJzdCBzYXkgdGhlIGVycm9yXG4gIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICBpZiAoa2V5cy5sZW5ndGggPT09IDAgJiYgKCFhcnJheSB8fCB2YWx1ZS5sZW5ndGggPT0gMCkpIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArIGJyYWNlc1sxXTtcbiAgfVxuXG4gIGlmIChyZWN1cnNlVGltZXMgPCAwKSB7XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbT2JqZWN0XScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG5cbiAgY3R4LnNlZW4ucHVzaCh2YWx1ZSk7XG5cbiAgdmFyIG91dHB1dDtcbiAgaWYgKGFycmF5KSB7XG4gICAgb3V0cHV0ID0gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cyk7XG4gIH0gZWxzZSB7XG4gICAgb3V0cHV0ID0ga2V5cy5tYXAoZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSk7XG4gICAgfSk7XG4gIH1cblxuICBjdHguc2Vlbi5wb3AoKTtcblxuICByZXR1cm4gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKSB7XG4gIGlmIChpc1VuZGVmaW5lZCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCd1bmRlZmluZWQnLCAndW5kZWZpbmVkJyk7XG4gIGlmIChpc1N0cmluZyh2YWx1ZSkpIHtcbiAgICB2YXIgc2ltcGxlID0gJ1xcJycgKyBKU09OLnN0cmluZ2lmeSh2YWx1ZSkucmVwbGFjZSgvXlwifFwiJC9nLCAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJykgKyAnXFwnJztcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoc2ltcGxlLCAnc3RyaW5nJyk7XG4gIH1cbiAgaWYgKGlzTnVtYmVyKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ251bWJlcicpO1xuICBpZiAoaXNCb29sZWFuKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJycgKyB2YWx1ZSwgJ2Jvb2xlYW4nKTtcbiAgLy8gRm9yIHNvbWUgcmVhc29uIHR5cGVvZiBudWxsIGlzIFwib2JqZWN0XCIsIHNvIHNwZWNpYWwgY2FzZSBoZXJlLlxuICBpZiAoaXNOdWxsKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ251bGwnLCAnbnVsbCcpO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEVycm9yKHZhbHVlKSB7XG4gIHJldHVybiAnWycgKyBFcnJvci5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSkgKyAnXSc7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0QXJyYXkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5cykge1xuICB2YXIgb3V0cHV0ID0gW107XG4gIGZvciAodmFyIGkgPSAwLCBsID0gdmFsdWUubGVuZ3RoOyBpIDwgbDsgKytpKSB7XG4gICAgaWYgKGhhc093blByb3BlcnR5KHZhbHVlLCBTdHJpbmcoaSkpKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIFN0cmluZyhpKSwgdHJ1ZSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvdXRwdXQucHVzaCgnJyk7XG4gICAgfVxuICB9XG4gIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICBpZiAoIWtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAga2V5LCB0cnVlKSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KSB7XG4gIHZhciBuYW1lLCBzdHIsIGRlc2M7XG4gIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHZhbHVlLCBrZXkpIHx8IHsgdmFsdWU6IHZhbHVlW2tleV0gfTtcbiAgaWYgKGRlc2MuZ2V0KSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlci9TZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGRlc2Muc2V0KSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoIWhhc093blByb3BlcnR5KHZpc2libGVLZXlzLCBrZXkpKSB7XG4gICAgbmFtZSA9ICdbJyArIGtleSArICddJztcbiAgfVxuICBpZiAoIXN0cikge1xuICAgIGlmIChjdHguc2Vlbi5pbmRleE9mKGRlc2MudmFsdWUpIDwgMCkge1xuICAgICAgaWYgKGlzTnVsbChyZWN1cnNlVGltZXMpKSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgbnVsbCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIHJlY3Vyc2VUaW1lcyAtIDEpO1xuICAgICAgfVxuICAgICAgaWYgKHN0ci5pbmRleE9mKCdcXG4nKSA+IC0xKSB7XG4gICAgICAgIGlmIChhcnJheSkge1xuICAgICAgICAgIHN0ciA9IHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKS5zdWJzdHIoMik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RyID0gJ1xcbicgKyBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbQ2lyY3VsYXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzVW5kZWZpbmVkKG5hbWUpKSB7XG4gICAgaWYgKGFycmF5ICYmIGtleS5tYXRjaCgvXlxcZCskLykpIHtcbiAgICAgIHJldHVybiBzdHI7XG4gICAgfVxuICAgIG5hbWUgPSBKU09OLnN0cmluZ2lmeSgnJyArIGtleSk7XG4gICAgaWYgKG5hbWUubWF0Y2goL15cIihbYS16QS1aX11bYS16QS1aXzAtOV0qKVwiJC8pKSB7XG4gICAgICBuYW1lID0gbmFtZS5zdWJzdHIoMSwgbmFtZS5sZW5ndGggLSAyKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnbmFtZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIilcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvKF5cInxcIiQpL2csIFwiJ1wiKTtcbiAgICAgIG5hbWUgPSBjdHguc3R5bGl6ZShuYW1lLCAnc3RyaW5nJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG5hbWUgKyAnOiAnICsgc3RyO1xufVxuXG5cbmZ1bmN0aW9uIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKSB7XG4gIHZhciBudW1MaW5lc0VzdCA9IDA7XG4gIHZhciBsZW5ndGggPSBvdXRwdXQucmVkdWNlKGZ1bmN0aW9uKHByZXYsIGN1cikge1xuICAgIG51bUxpbmVzRXN0Kys7XG4gICAgaWYgKGN1ci5pbmRleE9mKCdcXG4nKSA+PSAwKSBudW1MaW5lc0VzdCsrO1xuICAgIHJldHVybiBwcmV2ICsgY3VyLnJlcGxhY2UoL1xcdTAwMWJcXFtcXGRcXGQ/bS9nLCAnJykubGVuZ3RoICsgMTtcbiAgfSwgMCk7XG5cbiAgaWYgKGxlbmd0aCA+IDYwKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArXG4gICAgICAgICAgIChiYXNlID09PSAnJyA/ICcnIDogYmFzZSArICdcXG4gJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBvdXRwdXQuam9pbignLFxcbiAgJykgK1xuICAgICAgICAgICAnICcgK1xuICAgICAgICAgICBicmFjZXNbMV07XG4gIH1cblxuICByZXR1cm4gYnJhY2VzWzBdICsgYmFzZSArICcgJyArIG91dHB1dC5qb2luKCcsICcpICsgJyAnICsgYnJhY2VzWzFdO1xufVxuXG5cbi8vIE5PVEU6IFRoZXNlIHR5cGUgY2hlY2tpbmcgZnVuY3Rpb25zIGludGVudGlvbmFsbHkgZG9uJ3QgdXNlIGBpbnN0YW5jZW9mYFxuLy8gYmVjYXVzZSBpdCBpcyBmcmFnaWxlIGFuZCBjYW4gYmUgZWFzaWx5IGZha2VkIHdpdGggYE9iamVjdC5jcmVhdGUoKWAuXG5mdW5jdGlvbiBpc0FycmF5KGFyKSB7XG4gIHJldHVybiBBcnJheS5pc0FycmF5KGFyKTtcbn1cbmV4cG9ydHMuaXNBcnJheSA9IGlzQXJyYXk7XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJztcbn1cbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuXG5mdW5jdGlvbiBpc051bGwoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbCA9IGlzTnVsbDtcblxuZnVuY3Rpb24gaXNOdWxsT3JVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsT3JVbmRlZmluZWQgPSBpc051bGxPclVuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcblxuZnVuY3Rpb24gaXNTdHJpbmcoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3RyaW5nJztcbn1cbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcblxuZnVuY3Rpb24gaXNTeW1ib2woYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnc3ltYm9sJztcbn1cbmV4cG9ydHMuaXNTeW1ib2wgPSBpc1N5bWJvbDtcblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBpc1VuZGVmaW5lZDtcblxuZnVuY3Rpb24gaXNSZWdFeHAocmUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KHJlKSAmJiBvYmplY3RUb1N0cmluZyhyZSkgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcblxuZnVuY3Rpb24gaXNEYXRlKGQpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGQpICYmIG9iamVjdFRvU3RyaW5nKGQpID09PSAnW29iamVjdCBEYXRlXSc7XG59XG5leHBvcnRzLmlzRGF0ZSA9IGlzRGF0ZTtcblxuZnVuY3Rpb24gaXNFcnJvcihlKSB7XG4gIHJldHVybiBpc09iamVjdChlKSAmJlxuICAgICAgKG9iamVjdFRvU3RyaW5nKGUpID09PSAnW29iamVjdCBFcnJvcl0nIHx8IGUgaW5zdGFuY2VvZiBFcnJvcik7XG59XG5leHBvcnRzLmlzRXJyb3IgPSBpc0Vycm9yO1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cbmV4cG9ydHMuaXNGdW5jdGlvbiA9IGlzRnVuY3Rpb247XG5cbmZ1bmN0aW9uIGlzUHJpbWl0aXZlKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnYm9vbGVhbicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdudW1iZXInIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3RyaW5nJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCcgfHwgIC8vIEVTNiBzeW1ib2xcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnO1xufVxuZXhwb3J0cy5pc1ByaW1pdGl2ZSA9IGlzUHJpbWl0aXZlO1xuXG5leHBvcnRzLmlzQnVmZmVyID0gcmVxdWlyZSgnLi9zdXBwb3J0L2lzQnVmZmVyJyk7XG5cbmZ1bmN0aW9uIG9iamVjdFRvU3RyaW5nKG8pIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvKTtcbn1cblxuXG5mdW5jdGlvbiBwYWQobikge1xuICByZXR1cm4gbiA8IDEwID8gJzAnICsgbi50b1N0cmluZygxMCkgOiBuLnRvU3RyaW5nKDEwKTtcbn1cblxuXG52YXIgbW9udGhzID0gWydKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsXG4gICAgICAgICAgICAgICdPY3QnLCAnTm92JywgJ0RlYyddO1xuXG4vLyAyNiBGZWIgMTY6MTk6MzRcbmZ1bmN0aW9uIHRpbWVzdGFtcCgpIHtcbiAgdmFyIGQgPSBuZXcgRGF0ZSgpO1xuICB2YXIgdGltZSA9IFtwYWQoZC5nZXRIb3VycygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0TWludXRlcygpKSxcbiAgICAgICAgICAgICAgcGFkKGQuZ2V0U2Vjb25kcygpKV0uam9pbignOicpO1xuICByZXR1cm4gW2QuZ2V0RGF0ZSgpLCBtb250aHNbZC5nZXRNb250aCgpXSwgdGltZV0uam9pbignICcpO1xufVxuXG5cbi8vIGxvZyBpcyBqdXN0IGEgdGhpbiB3cmFwcGVyIHRvIGNvbnNvbGUubG9nIHRoYXQgcHJlcGVuZHMgYSB0aW1lc3RhbXBcbmV4cG9ydHMubG9nID0gZnVuY3Rpb24oKSB7XG4gIGNvbnNvbGUubG9nKCclcyAtICVzJywgdGltZXN0YW1wKCksIGV4cG9ydHMuZm9ybWF0LmFwcGx5KGV4cG9ydHMsIGFyZ3VtZW50cykpO1xufTtcblxuXG4vKipcbiAqIEluaGVyaXQgdGhlIHByb3RvdHlwZSBtZXRob2RzIGZyb20gb25lIGNvbnN0cnVjdG9yIGludG8gYW5vdGhlci5cbiAqXG4gKiBUaGUgRnVuY3Rpb24ucHJvdG90eXBlLmluaGVyaXRzIGZyb20gbGFuZy5qcyByZXdyaXR0ZW4gYXMgYSBzdGFuZGFsb25lXG4gKiBmdW5jdGlvbiAobm90IG9uIEZ1bmN0aW9uLnByb3RvdHlwZSkuIE5PVEU6IElmIHRoaXMgZmlsZSBpcyB0byBiZSBsb2FkZWRcbiAqIGR1cmluZyBib290c3RyYXBwaW5nIHRoaXMgZnVuY3Rpb24gbmVlZHMgdG8gYmUgcmV3cml0dGVuIHVzaW5nIHNvbWUgbmF0aXZlXG4gKiBmdW5jdGlvbnMgYXMgcHJvdG90eXBlIHNldHVwIHVzaW5nIG5vcm1hbCBKYXZhU2NyaXB0IGRvZXMgbm90IHdvcmsgYXNcbiAqIGV4cGVjdGVkIGR1cmluZyBib290c3RyYXBwaW5nIChzZWUgbWlycm9yLmpzIGluIHIxMTQ5MDMpLlxuICpcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IGN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gd2hpY2ggbmVlZHMgdG8gaW5oZXJpdCB0aGVcbiAqICAgICBwcm90b3R5cGUuXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBzdXBlckN0b3IgQ29uc3RydWN0b3IgZnVuY3Rpb24gdG8gaW5oZXJpdCBwcm90b3R5cGUgZnJvbS5cbiAqL1xuZXhwb3J0cy5pbmhlcml0cyA9IHJlcXVpcmUoJ2luaGVyaXRzJyk7XG5cbmV4cG9ydHMuX2V4dGVuZCA9IGZ1bmN0aW9uKG9yaWdpbiwgYWRkKSB7XG4gIC8vIERvbid0IGRvIGFueXRoaW5nIGlmIGFkZCBpc24ndCBhbiBvYmplY3RcbiAgaWYgKCFhZGQgfHwgIWlzT2JqZWN0KGFkZCkpIHJldHVybiBvcmlnaW47XG5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhhZGQpO1xuICB2YXIgaSA9IGtleXMubGVuZ3RoO1xuICB3aGlsZSAoaS0tKSB7XG4gICAgb3JpZ2luW2tleXNbaV1dID0gYWRkW2tleXNbaV1dO1xuICB9XG4gIHJldHVybiBvcmlnaW47XG59O1xuXG5mdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShvYmosIHByb3ApIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApO1xufVxuIl19
