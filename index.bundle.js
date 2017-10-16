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

},{"./lib/appView":2,"./lib/store/appStore":33,"./lib/store/bgStore":34,"./lib/store/cardStore":35,"./lib/store/editBarStore":36,"./lib/store/editModalStore":37,"./lib/store/elementStore":38,"./lib/store/fieldStore":39,"./lib/store/imageStore":40,"choo":44}],2:[function(require,module,exports){
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

},{"./bgView":4,"./cardView":5,"./editBarView":6,"./editModalView":7,"./util":41,"choo/html":43}],3:[function(require,module,exports){
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
    'startTally': {'startTally': '', 'value': 0},
    'setTally': {'setTally': '', 'upBy': 0},
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
    'startTally': function(state, emit, behavObj) {
        if (!state.tallies) {
            state.tallies = {};
        }
        state.tallies[behavObj.startTally] = behavObj.value ? behavObj.value : 0;
        setTimeout(() => {
            emit('render');
            emit('save');
        }, 1);
    },
    'setTally': function(state, emit, behavObj) {
        if (!state.tallies) {
            state.tallies = {};
        }
        if (behavObj.upBy) {
            state.tallies[behavObj.setTally] += behavObj.upBy;
        } else if (behavObj.downBy) {
            state.tallies[behavObj.setTally] -= behavObj.downBy;
        } else if (behavObj.to) {
            state.tallies[behavObj.setTally] = behavObj.to;
        }
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

},{"./form/behaviorsToComponents":10,"./form/ifComponents":19,"./form/ifLogic":20,"./util":41,"choo/html":43,"uuid/v1":84}],4:[function(require,module,exports){
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

},{"./elementView.js":8,"./fieldView.js":9,"./graphicView.js":30,"./imageView.js":31,"choo/html":43}],5:[function(require,module,exports){
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

},{"./elementView.js":8,"./fieldView.js":9,"./graphicView.js":30,"./imageView.js":31,"choo/html":43}],6:[function(require,module,exports){
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

},{"./util":41,"choo/html":43}],7:[function(require,module,exports){
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

},{"./form/bgStyleView.js":11,"./form/cardStyleView.js":12,"./form/editBehaviorView.js":14,"./form/elementStyleView.js":15,"./form/fieldStyleView.js":16,"./form/imageStyleView.js":21,"./form/stackComboView.js":28,"choo/html":43}],8:[function(require,module,exports){
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

},{"./behavior.js":3,"choo/html":43,"commonmark":48}],9:[function(require,module,exports){
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

},{"./util":41,"choo/html":43}],10:[function(require,module,exports){
module.exports = {
    goToNextCard: require('./goToNextCardComponent'),
    goToPreviousCard: require('./goToPreviousCardComponent'),
    'if': null, // here to be counted, but not actually handled by a sep. component
    clickElement: require('./clickElementComponent'),
    jumpTo: require('./jumpToComponent'),
    removeTruth: require('./removeTruthComponent'),
    setTruth: require('./setTruthComponent'),
    startTally: require('./startTallyComponent'),
    setTally: require('./setTallyComponent'),
    linkTo: require('./linkToComponent'),
    playSound: require('./playSoundComponent')
};

},{"./clickElementComponent":13,"./goToNextCardComponent":17,"./goToPreviousCardComponent":18,"./jumpToComponent":22,"./linkToComponent":23,"./playSoundComponent":24,"./removeTruthComponent":25,"./setTallyComponent":26,"./setTruthComponent":27,"./startTallyComponent":29}],11:[function(require,module,exports){
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

},{"choo/html":43}],12:[function(require,module,exports){
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

},{"choo/html":43}],13:[function(require,module,exports){
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

},{"../util":41,"choo/html":43}],14:[function(require,module,exports){
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

},{"../behavior":3,"../util":41,"choo/html":43}],15:[function(require,module,exports){
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

},{"../util":41,"choo/html":43}],16:[function(require,module,exports){
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

},{"../util":41,"choo/html":43}],17:[function(require,module,exports){
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

},{"../util":41,"choo/html":43}],18:[function(require,module,exports){
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

},{"../util":41,"choo/html":43}],19:[function(require,module,exports){
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
    or: {'or': []},
    tally: {tally: {}}
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
    const isTally = typeof clause === 'object' &&
        clause !== null &&
        clause.tally;
    const isField = typeof clause === 'object' &&
        clause !== null &&
        typeof clause.or == 'undefined' &&
        !isTally;
    const orIsThere = clause !== null &&
        typeof clause == 'object' &&
        typeof clause.or != 'undefined';
    const unifiedCompareValue = isNull
        ? null
        : (isTruth
            ? 'truth'
            : (isField
                ? 'field'
                : (isTally
                    ? 'tally'
                    : 'or')));

    return html`<section>
        <select data-realvalue="${unifiedCompareValue}" onchange=${subjectHandler}>
            ${selectOption(null, '-', unifiedCompareValue)}
            ${selectOption('truth', 'there is a Truth named', unifiedCompareValue)}
            ${selectOption('field', 'the field named', unifiedCompareValue)}
            ${selectOption('tally', 'the tally named', unifiedCompareValue)}
            ${selectOption('or', 'either', unifiedCompareValue)}
        </select>
        ${isTruth
            ? html`<input type="text" onchange=${valueHandler} value="${clause}" />`
            : null}
        ${isTally
            ? tallyClause(state, emit, clause.tally, path.concat(['tally']))
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

function tallyClause(state, emit, clause, path) {
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

    const nameHandler = (e) => {
        const fieldObj = {};
        fieldObj[e.target.value] = compareObj;
        emit('setBehaviorObj', [path, fieldObj]);
    };
    const compareHandler = (e) => {
        const newCompareObj = {};
        newCompareObj[e.target.value] = compareValue;
        clause[firstKey] = newCompareObj;
        emit('setBehaviorObj', [path, clause]);
    };
    const valueHandler = (e) => {
        compareObj[comparator] = e.target.value;
        clause[firstKey] = compareObj;
        emit('setBehaviorObj', [path, clause]);
    };

    const valueForInteract = (!!compareValue || compareValue === 0) ? compareValue : '';

    return html`<span>
        <input type="text" onchange=${nameHandler} value="${firstKey || ''}" />
        <select data-realvalue="${comparator}" onchange=${compareHandler}>
            ${selectOption(null, '-', comparator)}
            ${selectOption('eq', 'equals', comparator)}
            ${selectOption('lt', 'is less than', comparator)}
            ${selectOption('gt', 'is greater than', comparator)}
            ${selectOption('lte', 'is less than or equal to', comparator)}
            ${selectOption('gte', 'is greater than or equal to', comparator)}
        </select>
        ${(compareObj && comparator)
            ? html`<input type="text" onchange=${valueHandler} value="${valueForInteract}" />`
            : null}
    </span>`;
}

module.exports = {condition};

},{"../util":41,"choo/html":43}],20:[function(require,module,exports){
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

// look how similar these are, hey refactor this
const evalTally = function(state, tallyName, comparedTo) {
    const value = state.tallies[tallyName];
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
    };
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
        if (key === 'tally') {
            const tallyCondition = condObj[key];
            const tallyName = Object.keys(tallyCondition)[0];
            const tallyResult = evalTally(state, tallyName, tallyCondition[tallyName]);
            return tallyResult;
        }
        const clauseResult = evalField(state, key, condObj[key]);
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

},{"../util":41}],21:[function(require,module,exports){
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

},{"../util":41,"choo/html":43}],22:[function(require,module,exports){
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

},{"../util":41,"choo/html":43}],23:[function(require,module,exports){
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

},{"choo/html":43}],24:[function(require,module,exports){
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

},{"../util":41,"choo/html":43}],25:[function(require,module,exports){
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

},{"choo/html":43}],26:[function(require,module,exports){
const html = require('choo/html');

const {selectOption} = require('../util');


function setTally(state, emit, behav, path) {
    const tallyName = behav.setTally || '';
    const tallyValue = behav.upBy
        ? behav.upBy
        : (behav.downBy
            ? behav.downBy
            : (behav.to ? behav.to : 0));

    const nameHandler = (e) => emit('setBehaviorObj',
        [path, Object.assign(behav, {setTally: e.target.value})]);
    const howHandler = (e) => {
        const newBehavObj = {setTally: tallyName};
        newBehavObj[e.target.value] = tallyValue;
        emit('setBehaviorObj', [path, newBehavObj]);
    };
    const valueHandler = (e) => {
        const otherKey = Object.keys(behav).filter((key) => key != 'setTally')[0];
        const newBehavObj = {setTally: tallyName};
        newBehavObj[otherKey] = parseInt(e.target.value, 10);
        emit('setBehaviorObj', [path, newBehavObj]);
    };

    return html`<div>
        <section>Move the Tally
        <input type="text" name="whatTally" value="${tallyName}"
            onchange=${nameHandler} />
        <select name="howMoveIt" onchange=${howHandler}>
            ${selectOption('upBy', 'up by', typeof behav.upBy !== 'undefined')}
            ${selectOption('downBy', 'down by', typeof behav.downBy !== 'undefined')}
            ${selectOption('to', 'to the number', typeof behav.to !== 'undefined')}
        </select>
        <input type="" name="tallyValue" value="${tallyValue}"
            onchange=${valueHandler} />
        </section>
    </div>`;
}

module.exports = setTally;

},{"../util":41,"choo/html":43}],27:[function(require,module,exports){
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

},{"choo/html":43}],28:[function(require,module,exports){
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

},{"choo/html":43}],29:[function(require,module,exports){
const html = require('choo/html');


function startTally(state, emit, behav, path) {
    const tallyName = behav.startTally || '';
    const tallyVal = behav.value || 0;

    const nameHandler = (e) => emit('setBehaviorObj',
        [path, {startTally: e.target.value, value: tallyVal}]);
    const valueHandler = (e) => emit('setBehaviorObj',
        [path, {startTally: tallyName, value: parseInt(e.target.value, 10)}]);

    return html`<div>
        <section>start a Tally named
        <input type="text" name="whatTally" value="${behav.startTally}"
            onchange=${nameHandler} />
        at the number
        <input type="" name="tallyValue" value="${behav.value}"
            onchange=${valueHandler} />
        </section>
    </div>`;
}

module.exports = startTally;

},{"choo/html":43}],30:[function(require,module,exports){
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

},{"choo/html":43}],31:[function(require,module,exports){
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

},{"./behavior.js":3,"choo/html":43}],32:[function(require,module,exports){
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

},{"./util":41}],33:[function(require,module,exports){
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

},{"../stateApi":32}],34:[function(require,module,exports){
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

},{"../behavior.js":3,"../util":41}],35:[function(require,module,exports){
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

},{"../behavior.js":3}],36:[function(require,module,exports){
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

},{"../util":41}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{"../util":41}],39:[function(require,module,exports){
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

},{"../util":41}],40:[function(require,module,exports){
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

},{"../util":41}],41:[function(require,module,exports){
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

},{"choo/html":43,"uuid/v1":84}],42:[function(require,module,exports){
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

},{"global/document":64,"hyperx":67,"on-load":80}],43:[function(require,module,exports){
module.exports = require('bel')

},{"bel":42}],44:[function(require,module,exports){
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

},{"assert":89,"document-ready":55,"nanobus":70,"nanohistory":71,"nanohref":72,"nanomorph":73,"nanomount":76,"nanoraf":77,"nanorouter":78}],45:[function(require,module,exports){
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

},{"./common":46,"./inlines":49,"./node":50}],46:[function(require,module,exports){
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

},{"entities":56,"mdurl/decode":68,"mdurl/encode":69}],47:[function(require,module,exports){
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

},{}],48:[function(require,module,exports){
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

},{"./blocks":45,"./node":50,"./render/html":52,"./render/xml":54}],49:[function(require,module,exports){
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

},{"./common":46,"./from-code-point.js":47,"./node":50,"./normalize-reference":51,"entities":56,"string.prototype.repeat":81}],50:[function(require,module,exports){
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

},{}],51:[function(require,module,exports){
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

},{}],52:[function(require,module,exports){
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

},{"../common":46,"./renderer":53}],53:[function(require,module,exports){
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

},{}],54:[function(require,module,exports){
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

},{"../common":46,"./renderer":53}],55:[function(require,module,exports){
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

},{"assert":89}],56:[function(require,module,exports){
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

},{"./lib/decode.js":57,"./lib/encode.js":59}],57:[function(require,module,exports){
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
},{"../maps/entities.json":61,"../maps/legacy.json":62,"../maps/xml.json":63,"./decode_codepoint.js":58}],58:[function(require,module,exports){
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

},{"../maps/decode.json":60}],59:[function(require,module,exports){
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

},{"../maps/entities.json":61,"../maps/xml.json":63}],60:[function(require,module,exports){
module.exports={"0":65533,"128":8364,"130":8218,"131":402,"132":8222,"133":8230,"134":8224,"135":8225,"136":710,"137":8240,"138":352,"139":8249,"140":338,"142":381,"145":8216,"146":8217,"147":8220,"148":8221,"149":8226,"150":8211,"151":8212,"152":732,"153":8482,"154":353,"155":8250,"156":339,"158":382,"159":376}
},{}],61:[function(require,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Abreve":"\u0102","abreve":"\u0103","ac":"\u223E","acd":"\u223F","acE":"\u223E\u0333","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","Acy":"\u0410","acy":"\u0430","AElig":"\u00C6","aelig":"\u00E6","af":"\u2061","Afr":"\uD835\uDD04","afr":"\uD835\uDD1E","Agrave":"\u00C0","agrave":"\u00E0","alefsym":"\u2135","aleph":"\u2135","Alpha":"\u0391","alpha":"\u03B1","Amacr":"\u0100","amacr":"\u0101","amalg":"\u2A3F","amp":"&","AMP":"&","andand":"\u2A55","And":"\u2A53","and":"\u2227","andd":"\u2A5C","andslope":"\u2A58","andv":"\u2A5A","ang":"\u2220","ange":"\u29A4","angle":"\u2220","angmsdaa":"\u29A8","angmsdab":"\u29A9","angmsdac":"\u29AA","angmsdad":"\u29AB","angmsdae":"\u29AC","angmsdaf":"\u29AD","angmsdag":"\u29AE","angmsdah":"\u29AF","angmsd":"\u2221","angrt":"\u221F","angrtvb":"\u22BE","angrtvbd":"\u299D","angsph":"\u2222","angst":"\u00C5","angzarr":"\u237C","Aogon":"\u0104","aogon":"\u0105","Aopf":"\uD835\uDD38","aopf":"\uD835\uDD52","apacir":"\u2A6F","ap":"\u2248","apE":"\u2A70","ape":"\u224A","apid":"\u224B","apos":"'","ApplyFunction":"\u2061","approx":"\u2248","approxeq":"\u224A","Aring":"\u00C5","aring":"\u00E5","Ascr":"\uD835\uDC9C","ascr":"\uD835\uDCB6","Assign":"\u2254","ast":"*","asymp":"\u2248","asympeq":"\u224D","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","awconint":"\u2233","awint":"\u2A11","backcong":"\u224C","backepsilon":"\u03F6","backprime":"\u2035","backsim":"\u223D","backsimeq":"\u22CD","Backslash":"\u2216","Barv":"\u2AE7","barvee":"\u22BD","barwed":"\u2305","Barwed":"\u2306","barwedge":"\u2305","bbrk":"\u23B5","bbrktbrk":"\u23B6","bcong":"\u224C","Bcy":"\u0411","bcy":"\u0431","bdquo":"\u201E","becaus":"\u2235","because":"\u2235","Because":"\u2235","bemptyv":"\u29B0","bepsi":"\u03F6","bernou":"\u212C","Bernoullis":"\u212C","Beta":"\u0392","beta":"\u03B2","beth":"\u2136","between":"\u226C","Bfr":"\uD835\uDD05","bfr":"\uD835\uDD1F","bigcap":"\u22C2","bigcirc":"\u25EF","bigcup":"\u22C3","bigodot":"\u2A00","bigoplus":"\u2A01","bigotimes":"\u2A02","bigsqcup":"\u2A06","bigstar":"\u2605","bigtriangledown":"\u25BD","bigtriangleup":"\u25B3","biguplus":"\u2A04","bigvee":"\u22C1","bigwedge":"\u22C0","bkarow":"\u290D","blacklozenge":"\u29EB","blacksquare":"\u25AA","blacktriangle":"\u25B4","blacktriangledown":"\u25BE","blacktriangleleft":"\u25C2","blacktriangleright":"\u25B8","blank":"\u2423","blk12":"\u2592","blk14":"\u2591","blk34":"\u2593","block":"\u2588","bne":"=\u20E5","bnequiv":"\u2261\u20E5","bNot":"\u2AED","bnot":"\u2310","Bopf":"\uD835\uDD39","bopf":"\uD835\uDD53","bot":"\u22A5","bottom":"\u22A5","bowtie":"\u22C8","boxbox":"\u29C9","boxdl":"\u2510","boxdL":"\u2555","boxDl":"\u2556","boxDL":"\u2557","boxdr":"\u250C","boxdR":"\u2552","boxDr":"\u2553","boxDR":"\u2554","boxh":"\u2500","boxH":"\u2550","boxhd":"\u252C","boxHd":"\u2564","boxhD":"\u2565","boxHD":"\u2566","boxhu":"\u2534","boxHu":"\u2567","boxhU":"\u2568","boxHU":"\u2569","boxminus":"\u229F","boxplus":"\u229E","boxtimes":"\u22A0","boxul":"\u2518","boxuL":"\u255B","boxUl":"\u255C","boxUL":"\u255D","boxur":"\u2514","boxuR":"\u2558","boxUr":"\u2559","boxUR":"\u255A","boxv":"\u2502","boxV":"\u2551","boxvh":"\u253C","boxvH":"\u256A","boxVh":"\u256B","boxVH":"\u256C","boxvl":"\u2524","boxvL":"\u2561","boxVl":"\u2562","boxVL":"\u2563","boxvr":"\u251C","boxvR":"\u255E","boxVr":"\u255F","boxVR":"\u2560","bprime":"\u2035","breve":"\u02D8","Breve":"\u02D8","brvbar":"\u00A6","bscr":"\uD835\uDCB7","Bscr":"\u212C","bsemi":"\u204F","bsim":"\u223D","bsime":"\u22CD","bsolb":"\u29C5","bsol":"\\","bsolhsub":"\u27C8","bull":"\u2022","bullet":"\u2022","bump":"\u224E","bumpE":"\u2AAE","bumpe":"\u224F","Bumpeq":"\u224E","bumpeq":"\u224F","Cacute":"\u0106","cacute":"\u0107","capand":"\u2A44","capbrcup":"\u2A49","capcap":"\u2A4B","cap":"\u2229","Cap":"\u22D2","capcup":"\u2A47","capdot":"\u2A40","CapitalDifferentialD":"\u2145","caps":"\u2229\uFE00","caret":"\u2041","caron":"\u02C7","Cayleys":"\u212D","ccaps":"\u2A4D","Ccaron":"\u010C","ccaron":"\u010D","Ccedil":"\u00C7","ccedil":"\u00E7","Ccirc":"\u0108","ccirc":"\u0109","Cconint":"\u2230","ccups":"\u2A4C","ccupssm":"\u2A50","Cdot":"\u010A","cdot":"\u010B","cedil":"\u00B8","Cedilla":"\u00B8","cemptyv":"\u29B2","cent":"\u00A2","centerdot":"\u00B7","CenterDot":"\u00B7","cfr":"\uD835\uDD20","Cfr":"\u212D","CHcy":"\u0427","chcy":"\u0447","check":"\u2713","checkmark":"\u2713","Chi":"\u03A7","chi":"\u03C7","circ":"\u02C6","circeq":"\u2257","circlearrowleft":"\u21BA","circlearrowright":"\u21BB","circledast":"\u229B","circledcirc":"\u229A","circleddash":"\u229D","CircleDot":"\u2299","circledR":"\u00AE","circledS":"\u24C8","CircleMinus":"\u2296","CirclePlus":"\u2295","CircleTimes":"\u2297","cir":"\u25CB","cirE":"\u29C3","cire":"\u2257","cirfnint":"\u2A10","cirmid":"\u2AEF","cirscir":"\u29C2","ClockwiseContourIntegral":"\u2232","CloseCurlyDoubleQuote":"\u201D","CloseCurlyQuote":"\u2019","clubs":"\u2663","clubsuit":"\u2663","colon":":","Colon":"\u2237","Colone":"\u2A74","colone":"\u2254","coloneq":"\u2254","comma":",","commat":"@","comp":"\u2201","compfn":"\u2218","complement":"\u2201","complexes":"\u2102","cong":"\u2245","congdot":"\u2A6D","Congruent":"\u2261","conint":"\u222E","Conint":"\u222F","ContourIntegral":"\u222E","copf":"\uD835\uDD54","Copf":"\u2102","coprod":"\u2210","Coproduct":"\u2210","copy":"\u00A9","COPY":"\u00A9","copysr":"\u2117","CounterClockwiseContourIntegral":"\u2233","crarr":"\u21B5","cross":"\u2717","Cross":"\u2A2F","Cscr":"\uD835\uDC9E","cscr":"\uD835\uDCB8","csub":"\u2ACF","csube":"\u2AD1","csup":"\u2AD0","csupe":"\u2AD2","ctdot":"\u22EF","cudarrl":"\u2938","cudarrr":"\u2935","cuepr":"\u22DE","cuesc":"\u22DF","cularr":"\u21B6","cularrp":"\u293D","cupbrcap":"\u2A48","cupcap":"\u2A46","CupCap":"\u224D","cup":"\u222A","Cup":"\u22D3","cupcup":"\u2A4A","cupdot":"\u228D","cupor":"\u2A45","cups":"\u222A\uFE00","curarr":"\u21B7","curarrm":"\u293C","curlyeqprec":"\u22DE","curlyeqsucc":"\u22DF","curlyvee":"\u22CE","curlywedge":"\u22CF","curren":"\u00A4","curvearrowleft":"\u21B6","curvearrowright":"\u21B7","cuvee":"\u22CE","cuwed":"\u22CF","cwconint":"\u2232","cwint":"\u2231","cylcty":"\u232D","dagger":"\u2020","Dagger":"\u2021","daleth":"\u2138","darr":"\u2193","Darr":"\u21A1","dArr":"\u21D3","dash":"\u2010","Dashv":"\u2AE4","dashv":"\u22A3","dbkarow":"\u290F","dblac":"\u02DD","Dcaron":"\u010E","dcaron":"\u010F","Dcy":"\u0414","dcy":"\u0434","ddagger":"\u2021","ddarr":"\u21CA","DD":"\u2145","dd":"\u2146","DDotrahd":"\u2911","ddotseq":"\u2A77","deg":"\u00B0","Del":"\u2207","Delta":"\u0394","delta":"\u03B4","demptyv":"\u29B1","dfisht":"\u297F","Dfr":"\uD835\uDD07","dfr":"\uD835\uDD21","dHar":"\u2965","dharl":"\u21C3","dharr":"\u21C2","DiacriticalAcute":"\u00B4","DiacriticalDot":"\u02D9","DiacriticalDoubleAcute":"\u02DD","DiacriticalGrave":"`","DiacriticalTilde":"\u02DC","diam":"\u22C4","diamond":"\u22C4","Diamond":"\u22C4","diamondsuit":"\u2666","diams":"\u2666","die":"\u00A8","DifferentialD":"\u2146","digamma":"\u03DD","disin":"\u22F2","div":"\u00F7","divide":"\u00F7","divideontimes":"\u22C7","divonx":"\u22C7","DJcy":"\u0402","djcy":"\u0452","dlcorn":"\u231E","dlcrop":"\u230D","dollar":"$","Dopf":"\uD835\uDD3B","dopf":"\uD835\uDD55","Dot":"\u00A8","dot":"\u02D9","DotDot":"\u20DC","doteq":"\u2250","doteqdot":"\u2251","DotEqual":"\u2250","dotminus":"\u2238","dotplus":"\u2214","dotsquare":"\u22A1","doublebarwedge":"\u2306","DoubleContourIntegral":"\u222F","DoubleDot":"\u00A8","DoubleDownArrow":"\u21D3","DoubleLeftArrow":"\u21D0","DoubleLeftRightArrow":"\u21D4","DoubleLeftTee":"\u2AE4","DoubleLongLeftArrow":"\u27F8","DoubleLongLeftRightArrow":"\u27FA","DoubleLongRightArrow":"\u27F9","DoubleRightArrow":"\u21D2","DoubleRightTee":"\u22A8","DoubleUpArrow":"\u21D1","DoubleUpDownArrow":"\u21D5","DoubleVerticalBar":"\u2225","DownArrowBar":"\u2913","downarrow":"\u2193","DownArrow":"\u2193","Downarrow":"\u21D3","DownArrowUpArrow":"\u21F5","DownBreve":"\u0311","downdownarrows":"\u21CA","downharpoonleft":"\u21C3","downharpoonright":"\u21C2","DownLeftRightVector":"\u2950","DownLeftTeeVector":"\u295E","DownLeftVectorBar":"\u2956","DownLeftVector":"\u21BD","DownRightTeeVector":"\u295F","DownRightVectorBar":"\u2957","DownRightVector":"\u21C1","DownTeeArrow":"\u21A7","DownTee":"\u22A4","drbkarow":"\u2910","drcorn":"\u231F","drcrop":"\u230C","Dscr":"\uD835\uDC9F","dscr":"\uD835\uDCB9","DScy":"\u0405","dscy":"\u0455","dsol":"\u29F6","Dstrok":"\u0110","dstrok":"\u0111","dtdot":"\u22F1","dtri":"\u25BF","dtrif":"\u25BE","duarr":"\u21F5","duhar":"\u296F","dwangle":"\u29A6","DZcy":"\u040F","dzcy":"\u045F","dzigrarr":"\u27FF","Eacute":"\u00C9","eacute":"\u00E9","easter":"\u2A6E","Ecaron":"\u011A","ecaron":"\u011B","Ecirc":"\u00CA","ecirc":"\u00EA","ecir":"\u2256","ecolon":"\u2255","Ecy":"\u042D","ecy":"\u044D","eDDot":"\u2A77","Edot":"\u0116","edot":"\u0117","eDot":"\u2251","ee":"\u2147","efDot":"\u2252","Efr":"\uD835\uDD08","efr":"\uD835\uDD22","eg":"\u2A9A","Egrave":"\u00C8","egrave":"\u00E8","egs":"\u2A96","egsdot":"\u2A98","el":"\u2A99","Element":"\u2208","elinters":"\u23E7","ell":"\u2113","els":"\u2A95","elsdot":"\u2A97","Emacr":"\u0112","emacr":"\u0113","empty":"\u2205","emptyset":"\u2205","EmptySmallSquare":"\u25FB","emptyv":"\u2205","EmptyVerySmallSquare":"\u25AB","emsp13":"\u2004","emsp14":"\u2005","emsp":"\u2003","ENG":"\u014A","eng":"\u014B","ensp":"\u2002","Eogon":"\u0118","eogon":"\u0119","Eopf":"\uD835\uDD3C","eopf":"\uD835\uDD56","epar":"\u22D5","eparsl":"\u29E3","eplus":"\u2A71","epsi":"\u03B5","Epsilon":"\u0395","epsilon":"\u03B5","epsiv":"\u03F5","eqcirc":"\u2256","eqcolon":"\u2255","eqsim":"\u2242","eqslantgtr":"\u2A96","eqslantless":"\u2A95","Equal":"\u2A75","equals":"=","EqualTilde":"\u2242","equest":"\u225F","Equilibrium":"\u21CC","equiv":"\u2261","equivDD":"\u2A78","eqvparsl":"\u29E5","erarr":"\u2971","erDot":"\u2253","escr":"\u212F","Escr":"\u2130","esdot":"\u2250","Esim":"\u2A73","esim":"\u2242","Eta":"\u0397","eta":"\u03B7","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","euro":"\u20AC","excl":"!","exist":"\u2203","Exists":"\u2203","expectation":"\u2130","exponentiale":"\u2147","ExponentialE":"\u2147","fallingdotseq":"\u2252","Fcy":"\u0424","fcy":"\u0444","female":"\u2640","ffilig":"\uFB03","fflig":"\uFB00","ffllig":"\uFB04","Ffr":"\uD835\uDD09","ffr":"\uD835\uDD23","filig":"\uFB01","FilledSmallSquare":"\u25FC","FilledVerySmallSquare":"\u25AA","fjlig":"fj","flat":"\u266D","fllig":"\uFB02","fltns":"\u25B1","fnof":"\u0192","Fopf":"\uD835\uDD3D","fopf":"\uD835\uDD57","forall":"\u2200","ForAll":"\u2200","fork":"\u22D4","forkv":"\u2AD9","Fouriertrf":"\u2131","fpartint":"\u2A0D","frac12":"\u00BD","frac13":"\u2153","frac14":"\u00BC","frac15":"\u2155","frac16":"\u2159","frac18":"\u215B","frac23":"\u2154","frac25":"\u2156","frac34":"\u00BE","frac35":"\u2157","frac38":"\u215C","frac45":"\u2158","frac56":"\u215A","frac58":"\u215D","frac78":"\u215E","frasl":"\u2044","frown":"\u2322","fscr":"\uD835\uDCBB","Fscr":"\u2131","gacute":"\u01F5","Gamma":"\u0393","gamma":"\u03B3","Gammad":"\u03DC","gammad":"\u03DD","gap":"\u2A86","Gbreve":"\u011E","gbreve":"\u011F","Gcedil":"\u0122","Gcirc":"\u011C","gcirc":"\u011D","Gcy":"\u0413","gcy":"\u0433","Gdot":"\u0120","gdot":"\u0121","ge":"\u2265","gE":"\u2267","gEl":"\u2A8C","gel":"\u22DB","geq":"\u2265","geqq":"\u2267","geqslant":"\u2A7E","gescc":"\u2AA9","ges":"\u2A7E","gesdot":"\u2A80","gesdoto":"\u2A82","gesdotol":"\u2A84","gesl":"\u22DB\uFE00","gesles":"\u2A94","Gfr":"\uD835\uDD0A","gfr":"\uD835\uDD24","gg":"\u226B","Gg":"\u22D9","ggg":"\u22D9","gimel":"\u2137","GJcy":"\u0403","gjcy":"\u0453","gla":"\u2AA5","gl":"\u2277","glE":"\u2A92","glj":"\u2AA4","gnap":"\u2A8A","gnapprox":"\u2A8A","gne":"\u2A88","gnE":"\u2269","gneq":"\u2A88","gneqq":"\u2269","gnsim":"\u22E7","Gopf":"\uD835\uDD3E","gopf":"\uD835\uDD58","grave":"`","GreaterEqual":"\u2265","GreaterEqualLess":"\u22DB","GreaterFullEqual":"\u2267","GreaterGreater":"\u2AA2","GreaterLess":"\u2277","GreaterSlantEqual":"\u2A7E","GreaterTilde":"\u2273","Gscr":"\uD835\uDCA2","gscr":"\u210A","gsim":"\u2273","gsime":"\u2A8E","gsiml":"\u2A90","gtcc":"\u2AA7","gtcir":"\u2A7A","gt":">","GT":">","Gt":"\u226B","gtdot":"\u22D7","gtlPar":"\u2995","gtquest":"\u2A7C","gtrapprox":"\u2A86","gtrarr":"\u2978","gtrdot":"\u22D7","gtreqless":"\u22DB","gtreqqless":"\u2A8C","gtrless":"\u2277","gtrsim":"\u2273","gvertneqq":"\u2269\uFE00","gvnE":"\u2269\uFE00","Hacek":"\u02C7","hairsp":"\u200A","half":"\u00BD","hamilt":"\u210B","HARDcy":"\u042A","hardcy":"\u044A","harrcir":"\u2948","harr":"\u2194","hArr":"\u21D4","harrw":"\u21AD","Hat":"^","hbar":"\u210F","Hcirc":"\u0124","hcirc":"\u0125","hearts":"\u2665","heartsuit":"\u2665","hellip":"\u2026","hercon":"\u22B9","hfr":"\uD835\uDD25","Hfr":"\u210C","HilbertSpace":"\u210B","hksearow":"\u2925","hkswarow":"\u2926","hoarr":"\u21FF","homtht":"\u223B","hookleftarrow":"\u21A9","hookrightarrow":"\u21AA","hopf":"\uD835\uDD59","Hopf":"\u210D","horbar":"\u2015","HorizontalLine":"\u2500","hscr":"\uD835\uDCBD","Hscr":"\u210B","hslash":"\u210F","Hstrok":"\u0126","hstrok":"\u0127","HumpDownHump":"\u224E","HumpEqual":"\u224F","hybull":"\u2043","hyphen":"\u2010","Iacute":"\u00CD","iacute":"\u00ED","ic":"\u2063","Icirc":"\u00CE","icirc":"\u00EE","Icy":"\u0418","icy":"\u0438","Idot":"\u0130","IEcy":"\u0415","iecy":"\u0435","iexcl":"\u00A1","iff":"\u21D4","ifr":"\uD835\uDD26","Ifr":"\u2111","Igrave":"\u00CC","igrave":"\u00EC","ii":"\u2148","iiiint":"\u2A0C","iiint":"\u222D","iinfin":"\u29DC","iiota":"\u2129","IJlig":"\u0132","ijlig":"\u0133","Imacr":"\u012A","imacr":"\u012B","image":"\u2111","ImaginaryI":"\u2148","imagline":"\u2110","imagpart":"\u2111","imath":"\u0131","Im":"\u2111","imof":"\u22B7","imped":"\u01B5","Implies":"\u21D2","incare":"\u2105","in":"\u2208","infin":"\u221E","infintie":"\u29DD","inodot":"\u0131","intcal":"\u22BA","int":"\u222B","Int":"\u222C","integers":"\u2124","Integral":"\u222B","intercal":"\u22BA","Intersection":"\u22C2","intlarhk":"\u2A17","intprod":"\u2A3C","InvisibleComma":"\u2063","InvisibleTimes":"\u2062","IOcy":"\u0401","iocy":"\u0451","Iogon":"\u012E","iogon":"\u012F","Iopf":"\uD835\uDD40","iopf":"\uD835\uDD5A","Iota":"\u0399","iota":"\u03B9","iprod":"\u2A3C","iquest":"\u00BF","iscr":"\uD835\uDCBE","Iscr":"\u2110","isin":"\u2208","isindot":"\u22F5","isinE":"\u22F9","isins":"\u22F4","isinsv":"\u22F3","isinv":"\u2208","it":"\u2062","Itilde":"\u0128","itilde":"\u0129","Iukcy":"\u0406","iukcy":"\u0456","Iuml":"\u00CF","iuml":"\u00EF","Jcirc":"\u0134","jcirc":"\u0135","Jcy":"\u0419","jcy":"\u0439","Jfr":"\uD835\uDD0D","jfr":"\uD835\uDD27","jmath":"\u0237","Jopf":"\uD835\uDD41","jopf":"\uD835\uDD5B","Jscr":"\uD835\uDCA5","jscr":"\uD835\uDCBF","Jsercy":"\u0408","jsercy":"\u0458","Jukcy":"\u0404","jukcy":"\u0454","Kappa":"\u039A","kappa":"\u03BA","kappav":"\u03F0","Kcedil":"\u0136","kcedil":"\u0137","Kcy":"\u041A","kcy":"\u043A","Kfr":"\uD835\uDD0E","kfr":"\uD835\uDD28","kgreen":"\u0138","KHcy":"\u0425","khcy":"\u0445","KJcy":"\u040C","kjcy":"\u045C","Kopf":"\uD835\uDD42","kopf":"\uD835\uDD5C","Kscr":"\uD835\uDCA6","kscr":"\uD835\uDCC0","lAarr":"\u21DA","Lacute":"\u0139","lacute":"\u013A","laemptyv":"\u29B4","lagran":"\u2112","Lambda":"\u039B","lambda":"\u03BB","lang":"\u27E8","Lang":"\u27EA","langd":"\u2991","langle":"\u27E8","lap":"\u2A85","Laplacetrf":"\u2112","laquo":"\u00AB","larrb":"\u21E4","larrbfs":"\u291F","larr":"\u2190","Larr":"\u219E","lArr":"\u21D0","larrfs":"\u291D","larrhk":"\u21A9","larrlp":"\u21AB","larrpl":"\u2939","larrsim":"\u2973","larrtl":"\u21A2","latail":"\u2919","lAtail":"\u291B","lat":"\u2AAB","late":"\u2AAD","lates":"\u2AAD\uFE00","lbarr":"\u290C","lBarr":"\u290E","lbbrk":"\u2772","lbrace":"{","lbrack":"[","lbrke":"\u298B","lbrksld":"\u298F","lbrkslu":"\u298D","Lcaron":"\u013D","lcaron":"\u013E","Lcedil":"\u013B","lcedil":"\u013C","lceil":"\u2308","lcub":"{","Lcy":"\u041B","lcy":"\u043B","ldca":"\u2936","ldquo":"\u201C","ldquor":"\u201E","ldrdhar":"\u2967","ldrushar":"\u294B","ldsh":"\u21B2","le":"\u2264","lE":"\u2266","LeftAngleBracket":"\u27E8","LeftArrowBar":"\u21E4","leftarrow":"\u2190","LeftArrow":"\u2190","Leftarrow":"\u21D0","LeftArrowRightArrow":"\u21C6","leftarrowtail":"\u21A2","LeftCeiling":"\u2308","LeftDoubleBracket":"\u27E6","LeftDownTeeVector":"\u2961","LeftDownVectorBar":"\u2959","LeftDownVector":"\u21C3","LeftFloor":"\u230A","leftharpoondown":"\u21BD","leftharpoonup":"\u21BC","leftleftarrows":"\u21C7","leftrightarrow":"\u2194","LeftRightArrow":"\u2194","Leftrightarrow":"\u21D4","leftrightarrows":"\u21C6","leftrightharpoons":"\u21CB","leftrightsquigarrow":"\u21AD","LeftRightVector":"\u294E","LeftTeeArrow":"\u21A4","LeftTee":"\u22A3","LeftTeeVector":"\u295A","leftthreetimes":"\u22CB","LeftTriangleBar":"\u29CF","LeftTriangle":"\u22B2","LeftTriangleEqual":"\u22B4","LeftUpDownVector":"\u2951","LeftUpTeeVector":"\u2960","LeftUpVectorBar":"\u2958","LeftUpVector":"\u21BF","LeftVectorBar":"\u2952","LeftVector":"\u21BC","lEg":"\u2A8B","leg":"\u22DA","leq":"\u2264","leqq":"\u2266","leqslant":"\u2A7D","lescc":"\u2AA8","les":"\u2A7D","lesdot":"\u2A7F","lesdoto":"\u2A81","lesdotor":"\u2A83","lesg":"\u22DA\uFE00","lesges":"\u2A93","lessapprox":"\u2A85","lessdot":"\u22D6","lesseqgtr":"\u22DA","lesseqqgtr":"\u2A8B","LessEqualGreater":"\u22DA","LessFullEqual":"\u2266","LessGreater":"\u2276","lessgtr":"\u2276","LessLess":"\u2AA1","lesssim":"\u2272","LessSlantEqual":"\u2A7D","LessTilde":"\u2272","lfisht":"\u297C","lfloor":"\u230A","Lfr":"\uD835\uDD0F","lfr":"\uD835\uDD29","lg":"\u2276","lgE":"\u2A91","lHar":"\u2962","lhard":"\u21BD","lharu":"\u21BC","lharul":"\u296A","lhblk":"\u2584","LJcy":"\u0409","ljcy":"\u0459","llarr":"\u21C7","ll":"\u226A","Ll":"\u22D8","llcorner":"\u231E","Lleftarrow":"\u21DA","llhard":"\u296B","lltri":"\u25FA","Lmidot":"\u013F","lmidot":"\u0140","lmoustache":"\u23B0","lmoust":"\u23B0","lnap":"\u2A89","lnapprox":"\u2A89","lne":"\u2A87","lnE":"\u2268","lneq":"\u2A87","lneqq":"\u2268","lnsim":"\u22E6","loang":"\u27EC","loarr":"\u21FD","lobrk":"\u27E6","longleftarrow":"\u27F5","LongLeftArrow":"\u27F5","Longleftarrow":"\u27F8","longleftrightarrow":"\u27F7","LongLeftRightArrow":"\u27F7","Longleftrightarrow":"\u27FA","longmapsto":"\u27FC","longrightarrow":"\u27F6","LongRightArrow":"\u27F6","Longrightarrow":"\u27F9","looparrowleft":"\u21AB","looparrowright":"\u21AC","lopar":"\u2985","Lopf":"\uD835\uDD43","lopf":"\uD835\uDD5D","loplus":"\u2A2D","lotimes":"\u2A34","lowast":"\u2217","lowbar":"_","LowerLeftArrow":"\u2199","LowerRightArrow":"\u2198","loz":"\u25CA","lozenge":"\u25CA","lozf":"\u29EB","lpar":"(","lparlt":"\u2993","lrarr":"\u21C6","lrcorner":"\u231F","lrhar":"\u21CB","lrhard":"\u296D","lrm":"\u200E","lrtri":"\u22BF","lsaquo":"\u2039","lscr":"\uD835\uDCC1","Lscr":"\u2112","lsh":"\u21B0","Lsh":"\u21B0","lsim":"\u2272","lsime":"\u2A8D","lsimg":"\u2A8F","lsqb":"[","lsquo":"\u2018","lsquor":"\u201A","Lstrok":"\u0141","lstrok":"\u0142","ltcc":"\u2AA6","ltcir":"\u2A79","lt":"<","LT":"<","Lt":"\u226A","ltdot":"\u22D6","lthree":"\u22CB","ltimes":"\u22C9","ltlarr":"\u2976","ltquest":"\u2A7B","ltri":"\u25C3","ltrie":"\u22B4","ltrif":"\u25C2","ltrPar":"\u2996","lurdshar":"\u294A","luruhar":"\u2966","lvertneqq":"\u2268\uFE00","lvnE":"\u2268\uFE00","macr":"\u00AF","male":"\u2642","malt":"\u2720","maltese":"\u2720","Map":"\u2905","map":"\u21A6","mapsto":"\u21A6","mapstodown":"\u21A7","mapstoleft":"\u21A4","mapstoup":"\u21A5","marker":"\u25AE","mcomma":"\u2A29","Mcy":"\u041C","mcy":"\u043C","mdash":"\u2014","mDDot":"\u223A","measuredangle":"\u2221","MediumSpace":"\u205F","Mellintrf":"\u2133","Mfr":"\uD835\uDD10","mfr":"\uD835\uDD2A","mho":"\u2127","micro":"\u00B5","midast":"*","midcir":"\u2AF0","mid":"\u2223","middot":"\u00B7","minusb":"\u229F","minus":"\u2212","minusd":"\u2238","minusdu":"\u2A2A","MinusPlus":"\u2213","mlcp":"\u2ADB","mldr":"\u2026","mnplus":"\u2213","models":"\u22A7","Mopf":"\uD835\uDD44","mopf":"\uD835\uDD5E","mp":"\u2213","mscr":"\uD835\uDCC2","Mscr":"\u2133","mstpos":"\u223E","Mu":"\u039C","mu":"\u03BC","multimap":"\u22B8","mumap":"\u22B8","nabla":"\u2207","Nacute":"\u0143","nacute":"\u0144","nang":"\u2220\u20D2","nap":"\u2249","napE":"\u2A70\u0338","napid":"\u224B\u0338","napos":"\u0149","napprox":"\u2249","natural":"\u266E","naturals":"\u2115","natur":"\u266E","nbsp":"\u00A0","nbump":"\u224E\u0338","nbumpe":"\u224F\u0338","ncap":"\u2A43","Ncaron":"\u0147","ncaron":"\u0148","Ncedil":"\u0145","ncedil":"\u0146","ncong":"\u2247","ncongdot":"\u2A6D\u0338","ncup":"\u2A42","Ncy":"\u041D","ncy":"\u043D","ndash":"\u2013","nearhk":"\u2924","nearr":"\u2197","neArr":"\u21D7","nearrow":"\u2197","ne":"\u2260","nedot":"\u2250\u0338","NegativeMediumSpace":"\u200B","NegativeThickSpace":"\u200B","NegativeThinSpace":"\u200B","NegativeVeryThinSpace":"\u200B","nequiv":"\u2262","nesear":"\u2928","nesim":"\u2242\u0338","NestedGreaterGreater":"\u226B","NestedLessLess":"\u226A","NewLine":"\n","nexist":"\u2204","nexists":"\u2204","Nfr":"\uD835\uDD11","nfr":"\uD835\uDD2B","ngE":"\u2267\u0338","nge":"\u2271","ngeq":"\u2271","ngeqq":"\u2267\u0338","ngeqslant":"\u2A7E\u0338","nges":"\u2A7E\u0338","nGg":"\u22D9\u0338","ngsim":"\u2275","nGt":"\u226B\u20D2","ngt":"\u226F","ngtr":"\u226F","nGtv":"\u226B\u0338","nharr":"\u21AE","nhArr":"\u21CE","nhpar":"\u2AF2","ni":"\u220B","nis":"\u22FC","nisd":"\u22FA","niv":"\u220B","NJcy":"\u040A","njcy":"\u045A","nlarr":"\u219A","nlArr":"\u21CD","nldr":"\u2025","nlE":"\u2266\u0338","nle":"\u2270","nleftarrow":"\u219A","nLeftarrow":"\u21CD","nleftrightarrow":"\u21AE","nLeftrightarrow":"\u21CE","nleq":"\u2270","nleqq":"\u2266\u0338","nleqslant":"\u2A7D\u0338","nles":"\u2A7D\u0338","nless":"\u226E","nLl":"\u22D8\u0338","nlsim":"\u2274","nLt":"\u226A\u20D2","nlt":"\u226E","nltri":"\u22EA","nltrie":"\u22EC","nLtv":"\u226A\u0338","nmid":"\u2224","NoBreak":"\u2060","NonBreakingSpace":"\u00A0","nopf":"\uD835\uDD5F","Nopf":"\u2115","Not":"\u2AEC","not":"\u00AC","NotCongruent":"\u2262","NotCupCap":"\u226D","NotDoubleVerticalBar":"\u2226","NotElement":"\u2209","NotEqual":"\u2260","NotEqualTilde":"\u2242\u0338","NotExists":"\u2204","NotGreater":"\u226F","NotGreaterEqual":"\u2271","NotGreaterFullEqual":"\u2267\u0338","NotGreaterGreater":"\u226B\u0338","NotGreaterLess":"\u2279","NotGreaterSlantEqual":"\u2A7E\u0338","NotGreaterTilde":"\u2275","NotHumpDownHump":"\u224E\u0338","NotHumpEqual":"\u224F\u0338","notin":"\u2209","notindot":"\u22F5\u0338","notinE":"\u22F9\u0338","notinva":"\u2209","notinvb":"\u22F7","notinvc":"\u22F6","NotLeftTriangleBar":"\u29CF\u0338","NotLeftTriangle":"\u22EA","NotLeftTriangleEqual":"\u22EC","NotLess":"\u226E","NotLessEqual":"\u2270","NotLessGreater":"\u2278","NotLessLess":"\u226A\u0338","NotLessSlantEqual":"\u2A7D\u0338","NotLessTilde":"\u2274","NotNestedGreaterGreater":"\u2AA2\u0338","NotNestedLessLess":"\u2AA1\u0338","notni":"\u220C","notniva":"\u220C","notnivb":"\u22FE","notnivc":"\u22FD","NotPrecedes":"\u2280","NotPrecedesEqual":"\u2AAF\u0338","NotPrecedesSlantEqual":"\u22E0","NotReverseElement":"\u220C","NotRightTriangleBar":"\u29D0\u0338","NotRightTriangle":"\u22EB","NotRightTriangleEqual":"\u22ED","NotSquareSubset":"\u228F\u0338","NotSquareSubsetEqual":"\u22E2","NotSquareSuperset":"\u2290\u0338","NotSquareSupersetEqual":"\u22E3","NotSubset":"\u2282\u20D2","NotSubsetEqual":"\u2288","NotSucceeds":"\u2281","NotSucceedsEqual":"\u2AB0\u0338","NotSucceedsSlantEqual":"\u22E1","NotSucceedsTilde":"\u227F\u0338","NotSuperset":"\u2283\u20D2","NotSupersetEqual":"\u2289","NotTilde":"\u2241","NotTildeEqual":"\u2244","NotTildeFullEqual":"\u2247","NotTildeTilde":"\u2249","NotVerticalBar":"\u2224","nparallel":"\u2226","npar":"\u2226","nparsl":"\u2AFD\u20E5","npart":"\u2202\u0338","npolint":"\u2A14","npr":"\u2280","nprcue":"\u22E0","nprec":"\u2280","npreceq":"\u2AAF\u0338","npre":"\u2AAF\u0338","nrarrc":"\u2933\u0338","nrarr":"\u219B","nrArr":"\u21CF","nrarrw":"\u219D\u0338","nrightarrow":"\u219B","nRightarrow":"\u21CF","nrtri":"\u22EB","nrtrie":"\u22ED","nsc":"\u2281","nsccue":"\u22E1","nsce":"\u2AB0\u0338","Nscr":"\uD835\uDCA9","nscr":"\uD835\uDCC3","nshortmid":"\u2224","nshortparallel":"\u2226","nsim":"\u2241","nsime":"\u2244","nsimeq":"\u2244","nsmid":"\u2224","nspar":"\u2226","nsqsube":"\u22E2","nsqsupe":"\u22E3","nsub":"\u2284","nsubE":"\u2AC5\u0338","nsube":"\u2288","nsubset":"\u2282\u20D2","nsubseteq":"\u2288","nsubseteqq":"\u2AC5\u0338","nsucc":"\u2281","nsucceq":"\u2AB0\u0338","nsup":"\u2285","nsupE":"\u2AC6\u0338","nsupe":"\u2289","nsupset":"\u2283\u20D2","nsupseteq":"\u2289","nsupseteqq":"\u2AC6\u0338","ntgl":"\u2279","Ntilde":"\u00D1","ntilde":"\u00F1","ntlg":"\u2278","ntriangleleft":"\u22EA","ntrianglelefteq":"\u22EC","ntriangleright":"\u22EB","ntrianglerighteq":"\u22ED","Nu":"\u039D","nu":"\u03BD","num":"#","numero":"\u2116","numsp":"\u2007","nvap":"\u224D\u20D2","nvdash":"\u22AC","nvDash":"\u22AD","nVdash":"\u22AE","nVDash":"\u22AF","nvge":"\u2265\u20D2","nvgt":">\u20D2","nvHarr":"\u2904","nvinfin":"\u29DE","nvlArr":"\u2902","nvle":"\u2264\u20D2","nvlt":"<\u20D2","nvltrie":"\u22B4\u20D2","nvrArr":"\u2903","nvrtrie":"\u22B5\u20D2","nvsim":"\u223C\u20D2","nwarhk":"\u2923","nwarr":"\u2196","nwArr":"\u21D6","nwarrow":"\u2196","nwnear":"\u2927","Oacute":"\u00D3","oacute":"\u00F3","oast":"\u229B","Ocirc":"\u00D4","ocirc":"\u00F4","ocir":"\u229A","Ocy":"\u041E","ocy":"\u043E","odash":"\u229D","Odblac":"\u0150","odblac":"\u0151","odiv":"\u2A38","odot":"\u2299","odsold":"\u29BC","OElig":"\u0152","oelig":"\u0153","ofcir":"\u29BF","Ofr":"\uD835\uDD12","ofr":"\uD835\uDD2C","ogon":"\u02DB","Ograve":"\u00D2","ograve":"\u00F2","ogt":"\u29C1","ohbar":"\u29B5","ohm":"\u03A9","oint":"\u222E","olarr":"\u21BA","olcir":"\u29BE","olcross":"\u29BB","oline":"\u203E","olt":"\u29C0","Omacr":"\u014C","omacr":"\u014D","Omega":"\u03A9","omega":"\u03C9","Omicron":"\u039F","omicron":"\u03BF","omid":"\u29B6","ominus":"\u2296","Oopf":"\uD835\uDD46","oopf":"\uD835\uDD60","opar":"\u29B7","OpenCurlyDoubleQuote":"\u201C","OpenCurlyQuote":"\u2018","operp":"\u29B9","oplus":"\u2295","orarr":"\u21BB","Or":"\u2A54","or":"\u2228","ord":"\u2A5D","order":"\u2134","orderof":"\u2134","ordf":"\u00AA","ordm":"\u00BA","origof":"\u22B6","oror":"\u2A56","orslope":"\u2A57","orv":"\u2A5B","oS":"\u24C8","Oscr":"\uD835\uDCAA","oscr":"\u2134","Oslash":"\u00D8","oslash":"\u00F8","osol":"\u2298","Otilde":"\u00D5","otilde":"\u00F5","otimesas":"\u2A36","Otimes":"\u2A37","otimes":"\u2297","Ouml":"\u00D6","ouml":"\u00F6","ovbar":"\u233D","OverBar":"\u203E","OverBrace":"\u23DE","OverBracket":"\u23B4","OverParenthesis":"\u23DC","para":"\u00B6","parallel":"\u2225","par":"\u2225","parsim":"\u2AF3","parsl":"\u2AFD","part":"\u2202","PartialD":"\u2202","Pcy":"\u041F","pcy":"\u043F","percnt":"%","period":".","permil":"\u2030","perp":"\u22A5","pertenk":"\u2031","Pfr":"\uD835\uDD13","pfr":"\uD835\uDD2D","Phi":"\u03A6","phi":"\u03C6","phiv":"\u03D5","phmmat":"\u2133","phone":"\u260E","Pi":"\u03A0","pi":"\u03C0","pitchfork":"\u22D4","piv":"\u03D6","planck":"\u210F","planckh":"\u210E","plankv":"\u210F","plusacir":"\u2A23","plusb":"\u229E","pluscir":"\u2A22","plus":"+","plusdo":"\u2214","plusdu":"\u2A25","pluse":"\u2A72","PlusMinus":"\u00B1","plusmn":"\u00B1","plussim":"\u2A26","plustwo":"\u2A27","pm":"\u00B1","Poincareplane":"\u210C","pointint":"\u2A15","popf":"\uD835\uDD61","Popf":"\u2119","pound":"\u00A3","prap":"\u2AB7","Pr":"\u2ABB","pr":"\u227A","prcue":"\u227C","precapprox":"\u2AB7","prec":"\u227A","preccurlyeq":"\u227C","Precedes":"\u227A","PrecedesEqual":"\u2AAF","PrecedesSlantEqual":"\u227C","PrecedesTilde":"\u227E","preceq":"\u2AAF","precnapprox":"\u2AB9","precneqq":"\u2AB5","precnsim":"\u22E8","pre":"\u2AAF","prE":"\u2AB3","precsim":"\u227E","prime":"\u2032","Prime":"\u2033","primes":"\u2119","prnap":"\u2AB9","prnE":"\u2AB5","prnsim":"\u22E8","prod":"\u220F","Product":"\u220F","profalar":"\u232E","profline":"\u2312","profsurf":"\u2313","prop":"\u221D","Proportional":"\u221D","Proportion":"\u2237","propto":"\u221D","prsim":"\u227E","prurel":"\u22B0","Pscr":"\uD835\uDCAB","pscr":"\uD835\uDCC5","Psi":"\u03A8","psi":"\u03C8","puncsp":"\u2008","Qfr":"\uD835\uDD14","qfr":"\uD835\uDD2E","qint":"\u2A0C","qopf":"\uD835\uDD62","Qopf":"\u211A","qprime":"\u2057","Qscr":"\uD835\uDCAC","qscr":"\uD835\uDCC6","quaternions":"\u210D","quatint":"\u2A16","quest":"?","questeq":"\u225F","quot":"\"","QUOT":"\"","rAarr":"\u21DB","race":"\u223D\u0331","Racute":"\u0154","racute":"\u0155","radic":"\u221A","raemptyv":"\u29B3","rang":"\u27E9","Rang":"\u27EB","rangd":"\u2992","range":"\u29A5","rangle":"\u27E9","raquo":"\u00BB","rarrap":"\u2975","rarrb":"\u21E5","rarrbfs":"\u2920","rarrc":"\u2933","rarr":"\u2192","Rarr":"\u21A0","rArr":"\u21D2","rarrfs":"\u291E","rarrhk":"\u21AA","rarrlp":"\u21AC","rarrpl":"\u2945","rarrsim":"\u2974","Rarrtl":"\u2916","rarrtl":"\u21A3","rarrw":"\u219D","ratail":"\u291A","rAtail":"\u291C","ratio":"\u2236","rationals":"\u211A","rbarr":"\u290D","rBarr":"\u290F","RBarr":"\u2910","rbbrk":"\u2773","rbrace":"}","rbrack":"]","rbrke":"\u298C","rbrksld":"\u298E","rbrkslu":"\u2990","Rcaron":"\u0158","rcaron":"\u0159","Rcedil":"\u0156","rcedil":"\u0157","rceil":"\u2309","rcub":"}","Rcy":"\u0420","rcy":"\u0440","rdca":"\u2937","rdldhar":"\u2969","rdquo":"\u201D","rdquor":"\u201D","rdsh":"\u21B3","real":"\u211C","realine":"\u211B","realpart":"\u211C","reals":"\u211D","Re":"\u211C","rect":"\u25AD","reg":"\u00AE","REG":"\u00AE","ReverseElement":"\u220B","ReverseEquilibrium":"\u21CB","ReverseUpEquilibrium":"\u296F","rfisht":"\u297D","rfloor":"\u230B","rfr":"\uD835\uDD2F","Rfr":"\u211C","rHar":"\u2964","rhard":"\u21C1","rharu":"\u21C0","rharul":"\u296C","Rho":"\u03A1","rho":"\u03C1","rhov":"\u03F1","RightAngleBracket":"\u27E9","RightArrowBar":"\u21E5","rightarrow":"\u2192","RightArrow":"\u2192","Rightarrow":"\u21D2","RightArrowLeftArrow":"\u21C4","rightarrowtail":"\u21A3","RightCeiling":"\u2309","RightDoubleBracket":"\u27E7","RightDownTeeVector":"\u295D","RightDownVectorBar":"\u2955","RightDownVector":"\u21C2","RightFloor":"\u230B","rightharpoondown":"\u21C1","rightharpoonup":"\u21C0","rightleftarrows":"\u21C4","rightleftharpoons":"\u21CC","rightrightarrows":"\u21C9","rightsquigarrow":"\u219D","RightTeeArrow":"\u21A6","RightTee":"\u22A2","RightTeeVector":"\u295B","rightthreetimes":"\u22CC","RightTriangleBar":"\u29D0","RightTriangle":"\u22B3","RightTriangleEqual":"\u22B5","RightUpDownVector":"\u294F","RightUpTeeVector":"\u295C","RightUpVectorBar":"\u2954","RightUpVector":"\u21BE","RightVectorBar":"\u2953","RightVector":"\u21C0","ring":"\u02DA","risingdotseq":"\u2253","rlarr":"\u21C4","rlhar":"\u21CC","rlm":"\u200F","rmoustache":"\u23B1","rmoust":"\u23B1","rnmid":"\u2AEE","roang":"\u27ED","roarr":"\u21FE","robrk":"\u27E7","ropar":"\u2986","ropf":"\uD835\uDD63","Ropf":"\u211D","roplus":"\u2A2E","rotimes":"\u2A35","RoundImplies":"\u2970","rpar":")","rpargt":"\u2994","rppolint":"\u2A12","rrarr":"\u21C9","Rrightarrow":"\u21DB","rsaquo":"\u203A","rscr":"\uD835\uDCC7","Rscr":"\u211B","rsh":"\u21B1","Rsh":"\u21B1","rsqb":"]","rsquo":"\u2019","rsquor":"\u2019","rthree":"\u22CC","rtimes":"\u22CA","rtri":"\u25B9","rtrie":"\u22B5","rtrif":"\u25B8","rtriltri":"\u29CE","RuleDelayed":"\u29F4","ruluhar":"\u2968","rx":"\u211E","Sacute":"\u015A","sacute":"\u015B","sbquo":"\u201A","scap":"\u2AB8","Scaron":"\u0160","scaron":"\u0161","Sc":"\u2ABC","sc":"\u227B","sccue":"\u227D","sce":"\u2AB0","scE":"\u2AB4","Scedil":"\u015E","scedil":"\u015F","Scirc":"\u015C","scirc":"\u015D","scnap":"\u2ABA","scnE":"\u2AB6","scnsim":"\u22E9","scpolint":"\u2A13","scsim":"\u227F","Scy":"\u0421","scy":"\u0441","sdotb":"\u22A1","sdot":"\u22C5","sdote":"\u2A66","searhk":"\u2925","searr":"\u2198","seArr":"\u21D8","searrow":"\u2198","sect":"\u00A7","semi":";","seswar":"\u2929","setminus":"\u2216","setmn":"\u2216","sext":"\u2736","Sfr":"\uD835\uDD16","sfr":"\uD835\uDD30","sfrown":"\u2322","sharp":"\u266F","SHCHcy":"\u0429","shchcy":"\u0449","SHcy":"\u0428","shcy":"\u0448","ShortDownArrow":"\u2193","ShortLeftArrow":"\u2190","shortmid":"\u2223","shortparallel":"\u2225","ShortRightArrow":"\u2192","ShortUpArrow":"\u2191","shy":"\u00AD","Sigma":"\u03A3","sigma":"\u03C3","sigmaf":"\u03C2","sigmav":"\u03C2","sim":"\u223C","simdot":"\u2A6A","sime":"\u2243","simeq":"\u2243","simg":"\u2A9E","simgE":"\u2AA0","siml":"\u2A9D","simlE":"\u2A9F","simne":"\u2246","simplus":"\u2A24","simrarr":"\u2972","slarr":"\u2190","SmallCircle":"\u2218","smallsetminus":"\u2216","smashp":"\u2A33","smeparsl":"\u29E4","smid":"\u2223","smile":"\u2323","smt":"\u2AAA","smte":"\u2AAC","smtes":"\u2AAC\uFE00","SOFTcy":"\u042C","softcy":"\u044C","solbar":"\u233F","solb":"\u29C4","sol":"/","Sopf":"\uD835\uDD4A","sopf":"\uD835\uDD64","spades":"\u2660","spadesuit":"\u2660","spar":"\u2225","sqcap":"\u2293","sqcaps":"\u2293\uFE00","sqcup":"\u2294","sqcups":"\u2294\uFE00","Sqrt":"\u221A","sqsub":"\u228F","sqsube":"\u2291","sqsubset":"\u228F","sqsubseteq":"\u2291","sqsup":"\u2290","sqsupe":"\u2292","sqsupset":"\u2290","sqsupseteq":"\u2292","square":"\u25A1","Square":"\u25A1","SquareIntersection":"\u2293","SquareSubset":"\u228F","SquareSubsetEqual":"\u2291","SquareSuperset":"\u2290","SquareSupersetEqual":"\u2292","SquareUnion":"\u2294","squarf":"\u25AA","squ":"\u25A1","squf":"\u25AA","srarr":"\u2192","Sscr":"\uD835\uDCAE","sscr":"\uD835\uDCC8","ssetmn":"\u2216","ssmile":"\u2323","sstarf":"\u22C6","Star":"\u22C6","star":"\u2606","starf":"\u2605","straightepsilon":"\u03F5","straightphi":"\u03D5","strns":"\u00AF","sub":"\u2282","Sub":"\u22D0","subdot":"\u2ABD","subE":"\u2AC5","sube":"\u2286","subedot":"\u2AC3","submult":"\u2AC1","subnE":"\u2ACB","subne":"\u228A","subplus":"\u2ABF","subrarr":"\u2979","subset":"\u2282","Subset":"\u22D0","subseteq":"\u2286","subseteqq":"\u2AC5","SubsetEqual":"\u2286","subsetneq":"\u228A","subsetneqq":"\u2ACB","subsim":"\u2AC7","subsub":"\u2AD5","subsup":"\u2AD3","succapprox":"\u2AB8","succ":"\u227B","succcurlyeq":"\u227D","Succeeds":"\u227B","SucceedsEqual":"\u2AB0","SucceedsSlantEqual":"\u227D","SucceedsTilde":"\u227F","succeq":"\u2AB0","succnapprox":"\u2ABA","succneqq":"\u2AB6","succnsim":"\u22E9","succsim":"\u227F","SuchThat":"\u220B","sum":"\u2211","Sum":"\u2211","sung":"\u266A","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","sup":"\u2283","Sup":"\u22D1","supdot":"\u2ABE","supdsub":"\u2AD8","supE":"\u2AC6","supe":"\u2287","supedot":"\u2AC4","Superset":"\u2283","SupersetEqual":"\u2287","suphsol":"\u27C9","suphsub":"\u2AD7","suplarr":"\u297B","supmult":"\u2AC2","supnE":"\u2ACC","supne":"\u228B","supplus":"\u2AC0","supset":"\u2283","Supset":"\u22D1","supseteq":"\u2287","supseteqq":"\u2AC6","supsetneq":"\u228B","supsetneqq":"\u2ACC","supsim":"\u2AC8","supsub":"\u2AD4","supsup":"\u2AD6","swarhk":"\u2926","swarr":"\u2199","swArr":"\u21D9","swarrow":"\u2199","swnwar":"\u292A","szlig":"\u00DF","Tab":"\t","target":"\u2316","Tau":"\u03A4","tau":"\u03C4","tbrk":"\u23B4","Tcaron":"\u0164","tcaron":"\u0165","Tcedil":"\u0162","tcedil":"\u0163","Tcy":"\u0422","tcy":"\u0442","tdot":"\u20DB","telrec":"\u2315","Tfr":"\uD835\uDD17","tfr":"\uD835\uDD31","there4":"\u2234","therefore":"\u2234","Therefore":"\u2234","Theta":"\u0398","theta":"\u03B8","thetasym":"\u03D1","thetav":"\u03D1","thickapprox":"\u2248","thicksim":"\u223C","ThickSpace":"\u205F\u200A","ThinSpace":"\u2009","thinsp":"\u2009","thkap":"\u2248","thksim":"\u223C","THORN":"\u00DE","thorn":"\u00FE","tilde":"\u02DC","Tilde":"\u223C","TildeEqual":"\u2243","TildeFullEqual":"\u2245","TildeTilde":"\u2248","timesbar":"\u2A31","timesb":"\u22A0","times":"\u00D7","timesd":"\u2A30","tint":"\u222D","toea":"\u2928","topbot":"\u2336","topcir":"\u2AF1","top":"\u22A4","Topf":"\uD835\uDD4B","topf":"\uD835\uDD65","topfork":"\u2ADA","tosa":"\u2929","tprime":"\u2034","trade":"\u2122","TRADE":"\u2122","triangle":"\u25B5","triangledown":"\u25BF","triangleleft":"\u25C3","trianglelefteq":"\u22B4","triangleq":"\u225C","triangleright":"\u25B9","trianglerighteq":"\u22B5","tridot":"\u25EC","trie":"\u225C","triminus":"\u2A3A","TripleDot":"\u20DB","triplus":"\u2A39","trisb":"\u29CD","tritime":"\u2A3B","trpezium":"\u23E2","Tscr":"\uD835\uDCAF","tscr":"\uD835\uDCC9","TScy":"\u0426","tscy":"\u0446","TSHcy":"\u040B","tshcy":"\u045B","Tstrok":"\u0166","tstrok":"\u0167","twixt":"\u226C","twoheadleftarrow":"\u219E","twoheadrightarrow":"\u21A0","Uacute":"\u00DA","uacute":"\u00FA","uarr":"\u2191","Uarr":"\u219F","uArr":"\u21D1","Uarrocir":"\u2949","Ubrcy":"\u040E","ubrcy":"\u045E","Ubreve":"\u016C","ubreve":"\u016D","Ucirc":"\u00DB","ucirc":"\u00FB","Ucy":"\u0423","ucy":"\u0443","udarr":"\u21C5","Udblac":"\u0170","udblac":"\u0171","udhar":"\u296E","ufisht":"\u297E","Ufr":"\uD835\uDD18","ufr":"\uD835\uDD32","Ugrave":"\u00D9","ugrave":"\u00F9","uHar":"\u2963","uharl":"\u21BF","uharr":"\u21BE","uhblk":"\u2580","ulcorn":"\u231C","ulcorner":"\u231C","ulcrop":"\u230F","ultri":"\u25F8","Umacr":"\u016A","umacr":"\u016B","uml":"\u00A8","UnderBar":"_","UnderBrace":"\u23DF","UnderBracket":"\u23B5","UnderParenthesis":"\u23DD","Union":"\u22C3","UnionPlus":"\u228E","Uogon":"\u0172","uogon":"\u0173","Uopf":"\uD835\uDD4C","uopf":"\uD835\uDD66","UpArrowBar":"\u2912","uparrow":"\u2191","UpArrow":"\u2191","Uparrow":"\u21D1","UpArrowDownArrow":"\u21C5","updownarrow":"\u2195","UpDownArrow":"\u2195","Updownarrow":"\u21D5","UpEquilibrium":"\u296E","upharpoonleft":"\u21BF","upharpoonright":"\u21BE","uplus":"\u228E","UpperLeftArrow":"\u2196","UpperRightArrow":"\u2197","upsi":"\u03C5","Upsi":"\u03D2","upsih":"\u03D2","Upsilon":"\u03A5","upsilon":"\u03C5","UpTeeArrow":"\u21A5","UpTee":"\u22A5","upuparrows":"\u21C8","urcorn":"\u231D","urcorner":"\u231D","urcrop":"\u230E","Uring":"\u016E","uring":"\u016F","urtri":"\u25F9","Uscr":"\uD835\uDCB0","uscr":"\uD835\uDCCA","utdot":"\u22F0","Utilde":"\u0168","utilde":"\u0169","utri":"\u25B5","utrif":"\u25B4","uuarr":"\u21C8","Uuml":"\u00DC","uuml":"\u00FC","uwangle":"\u29A7","vangrt":"\u299C","varepsilon":"\u03F5","varkappa":"\u03F0","varnothing":"\u2205","varphi":"\u03D5","varpi":"\u03D6","varpropto":"\u221D","varr":"\u2195","vArr":"\u21D5","varrho":"\u03F1","varsigma":"\u03C2","varsubsetneq":"\u228A\uFE00","varsubsetneqq":"\u2ACB\uFE00","varsupsetneq":"\u228B\uFE00","varsupsetneqq":"\u2ACC\uFE00","vartheta":"\u03D1","vartriangleleft":"\u22B2","vartriangleright":"\u22B3","vBar":"\u2AE8","Vbar":"\u2AEB","vBarv":"\u2AE9","Vcy":"\u0412","vcy":"\u0432","vdash":"\u22A2","vDash":"\u22A8","Vdash":"\u22A9","VDash":"\u22AB","Vdashl":"\u2AE6","veebar":"\u22BB","vee":"\u2228","Vee":"\u22C1","veeeq":"\u225A","vellip":"\u22EE","verbar":"|","Verbar":"\u2016","vert":"|","Vert":"\u2016","VerticalBar":"\u2223","VerticalLine":"|","VerticalSeparator":"\u2758","VerticalTilde":"\u2240","VeryThinSpace":"\u200A","Vfr":"\uD835\uDD19","vfr":"\uD835\uDD33","vltri":"\u22B2","vnsub":"\u2282\u20D2","vnsup":"\u2283\u20D2","Vopf":"\uD835\uDD4D","vopf":"\uD835\uDD67","vprop":"\u221D","vrtri":"\u22B3","Vscr":"\uD835\uDCB1","vscr":"\uD835\uDCCB","vsubnE":"\u2ACB\uFE00","vsubne":"\u228A\uFE00","vsupnE":"\u2ACC\uFE00","vsupne":"\u228B\uFE00","Vvdash":"\u22AA","vzigzag":"\u299A","Wcirc":"\u0174","wcirc":"\u0175","wedbar":"\u2A5F","wedge":"\u2227","Wedge":"\u22C0","wedgeq":"\u2259","weierp":"\u2118","Wfr":"\uD835\uDD1A","wfr":"\uD835\uDD34","Wopf":"\uD835\uDD4E","wopf":"\uD835\uDD68","wp":"\u2118","wr":"\u2240","wreath":"\u2240","Wscr":"\uD835\uDCB2","wscr":"\uD835\uDCCC","xcap":"\u22C2","xcirc":"\u25EF","xcup":"\u22C3","xdtri":"\u25BD","Xfr":"\uD835\uDD1B","xfr":"\uD835\uDD35","xharr":"\u27F7","xhArr":"\u27FA","Xi":"\u039E","xi":"\u03BE","xlarr":"\u27F5","xlArr":"\u27F8","xmap":"\u27FC","xnis":"\u22FB","xodot":"\u2A00","Xopf":"\uD835\uDD4F","xopf":"\uD835\uDD69","xoplus":"\u2A01","xotime":"\u2A02","xrarr":"\u27F6","xrArr":"\u27F9","Xscr":"\uD835\uDCB3","xscr":"\uD835\uDCCD","xsqcup":"\u2A06","xuplus":"\u2A04","xutri":"\u25B3","xvee":"\u22C1","xwedge":"\u22C0","Yacute":"\u00DD","yacute":"\u00FD","YAcy":"\u042F","yacy":"\u044F","Ycirc":"\u0176","ycirc":"\u0177","Ycy":"\u042B","ycy":"\u044B","yen":"\u00A5","Yfr":"\uD835\uDD1C","yfr":"\uD835\uDD36","YIcy":"\u0407","yicy":"\u0457","Yopf":"\uD835\uDD50","yopf":"\uD835\uDD6A","Yscr":"\uD835\uDCB4","yscr":"\uD835\uDCCE","YUcy":"\u042E","yucy":"\u044E","yuml":"\u00FF","Yuml":"\u0178","Zacute":"\u0179","zacute":"\u017A","Zcaron":"\u017D","zcaron":"\u017E","Zcy":"\u0417","zcy":"\u0437","Zdot":"\u017B","zdot":"\u017C","zeetrf":"\u2128","ZeroWidthSpace":"\u200B","Zeta":"\u0396","zeta":"\u03B6","zfr":"\uD835\uDD37","Zfr":"\u2128","ZHcy":"\u0416","zhcy":"\u0436","zigrarr":"\u21DD","zopf":"\uD835\uDD6B","Zopf":"\u2124","Zscr":"\uD835\uDCB5","zscr":"\uD835\uDCCF","zwj":"\u200D","zwnj":"\u200C"}
},{}],62:[function(require,module,exports){
module.exports={"Aacute":"\u00C1","aacute":"\u00E1","Acirc":"\u00C2","acirc":"\u00E2","acute":"\u00B4","AElig":"\u00C6","aelig":"\u00E6","Agrave":"\u00C0","agrave":"\u00E0","amp":"&","AMP":"&","Aring":"\u00C5","aring":"\u00E5","Atilde":"\u00C3","atilde":"\u00E3","Auml":"\u00C4","auml":"\u00E4","brvbar":"\u00A6","Ccedil":"\u00C7","ccedil":"\u00E7","cedil":"\u00B8","cent":"\u00A2","copy":"\u00A9","COPY":"\u00A9","curren":"\u00A4","deg":"\u00B0","divide":"\u00F7","Eacute":"\u00C9","eacute":"\u00E9","Ecirc":"\u00CA","ecirc":"\u00EA","Egrave":"\u00C8","egrave":"\u00E8","ETH":"\u00D0","eth":"\u00F0","Euml":"\u00CB","euml":"\u00EB","frac12":"\u00BD","frac14":"\u00BC","frac34":"\u00BE","gt":">","GT":">","Iacute":"\u00CD","iacute":"\u00ED","Icirc":"\u00CE","icirc":"\u00EE","iexcl":"\u00A1","Igrave":"\u00CC","igrave":"\u00EC","iquest":"\u00BF","Iuml":"\u00CF","iuml":"\u00EF","laquo":"\u00AB","lt":"<","LT":"<","macr":"\u00AF","micro":"\u00B5","middot":"\u00B7","nbsp":"\u00A0","not":"\u00AC","Ntilde":"\u00D1","ntilde":"\u00F1","Oacute":"\u00D3","oacute":"\u00F3","Ocirc":"\u00D4","ocirc":"\u00F4","Ograve":"\u00D2","ograve":"\u00F2","ordf":"\u00AA","ordm":"\u00BA","Oslash":"\u00D8","oslash":"\u00F8","Otilde":"\u00D5","otilde":"\u00F5","Ouml":"\u00D6","ouml":"\u00F6","para":"\u00B6","plusmn":"\u00B1","pound":"\u00A3","quot":"\"","QUOT":"\"","raquo":"\u00BB","reg":"\u00AE","REG":"\u00AE","sect":"\u00A7","shy":"\u00AD","sup1":"\u00B9","sup2":"\u00B2","sup3":"\u00B3","szlig":"\u00DF","THORN":"\u00DE","thorn":"\u00FE","times":"\u00D7","Uacute":"\u00DA","uacute":"\u00FA","Ucirc":"\u00DB","ucirc":"\u00FB","Ugrave":"\u00D9","ugrave":"\u00F9","uml":"\u00A8","Uuml":"\u00DC","uuml":"\u00FC","Yacute":"\u00DD","yacute":"\u00FD","yen":"\u00A5","yuml":"\u00FF"}
},{}],63:[function(require,module,exports){
module.exports={"amp":"&","apos":"'","gt":">","lt":"<","quot":"\""}

},{}],64:[function(require,module,exports){
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

},{"min-document":90}],65:[function(require,module,exports){
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

},{}],66:[function(require,module,exports){
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

},{}],67:[function(require,module,exports){
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

},{"hyperscript-attribute-to-property":66}],68:[function(require,module,exports){

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

},{}],69:[function(require,module,exports){

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

},{}],70:[function(require,module,exports){
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

},{"assert":89,"nanotiming":79}],71:[function(require,module,exports){
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

},{"assert":89}],72:[function(require,module,exports){
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

},{"assert":89}],73:[function(require,module,exports){
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

},{"./lib/morph":75,"assert":89}],74:[function(require,module,exports){
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

},{}],75:[function(require,module,exports){
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

},{"./events":74}],76:[function(require,module,exports){
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

},{"assert":89,"nanomorph":73}],77:[function(require,module,exports){
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

},{"assert":89}],78:[function(require,module,exports){
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

},{"wayfarer":85}],79:[function(require,module,exports){
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

},{"assert":89}],80:[function(require,module,exports){
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

},{"global/document":64,"global/window":65}],81:[function(require,module,exports){
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

},{}],82:[function(require,module,exports){
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

},{}],83:[function(require,module,exports){
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

},{}],84:[function(require,module,exports){
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

},{"./lib/bytesToUuid":82,"./lib/rng":83}],85:[function(require,module,exports){
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

},{"./trie":86,"assert":89}],86:[function(require,module,exports){
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

},{"assert":89,"xtend":87,"xtend/mutable":88}],87:[function(require,module,exports){
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

},{}],88:[function(require,module,exports){
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

},{}],89:[function(require,module,exports){
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

},{"util/":94}],90:[function(require,module,exports){

},{}],91:[function(require,module,exports){
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

},{}],92:[function(require,module,exports){
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

},{}],93:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],94:[function(require,module,exports){
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

},{"./support/isBuffer":93,"_process":91,"inherits":92}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9hcHBWaWV3LmpzIiwibGliL2JlaGF2aW9yLmpzIiwibGliL2JnVmlldy5qcyIsImxpYi9jYXJkVmlldy5qcyIsImxpYi9lZGl0QmFyVmlldy5qcyIsImxpYi9lZGl0TW9kYWxWaWV3LmpzIiwibGliL2VsZW1lbnRWaWV3LmpzIiwibGliL2ZpZWxkVmlldy5qcyIsImxpYi9mb3JtL2JlaGF2aW9yc1RvQ29tcG9uZW50cy5qcyIsImxpYi9mb3JtL2JnU3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vY2FyZFN0eWxlVmlldy5qcyIsImxpYi9mb3JtL2NsaWNrRWxlbWVudENvbXBvbmVudC5qcyIsImxpYi9mb3JtL2VkaXRCZWhhdmlvclZpZXcuanMiLCJsaWIvZm9ybS9lbGVtZW50U3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vZmllbGRTdHlsZVZpZXcuanMiLCJsaWIvZm9ybS9nb1RvTmV4dENhcmRDb21wb25lbnQuanMiLCJsaWIvZm9ybS9nb1RvUHJldmlvdXNDYXJkQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vaWZDb21wb25lbnRzLmpzIiwibGliL2Zvcm0vaWZMb2dpYy5qcyIsImxpYi9mb3JtL2ltYWdlU3R5bGVWaWV3LmpzIiwibGliL2Zvcm0vanVtcFRvQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vbGlua1RvQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vcGxheVNvdW5kQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vcmVtb3ZlVHJ1dGhDb21wb25lbnQuanMiLCJsaWIvZm9ybS9zZXRUYWxseUNvbXBvbmVudC5qcyIsImxpYi9mb3JtL3NldFRydXRoQ29tcG9uZW50LmpzIiwibGliL2Zvcm0vc3RhY2tDb21ib1ZpZXcuanMiLCJsaWIvZm9ybS9zdGFydFRhbGx5Q29tcG9uZW50LmpzIiwibGliL2dyYXBoaWNWaWV3LmpzIiwibGliL2ltYWdlVmlldy5qcyIsImxpYi9zdGF0ZUFwaS5qcyIsImxpYi9zdG9yZS9hcHBTdG9yZS5qcyIsImxpYi9zdG9yZS9iZ1N0b3JlLmpzIiwibGliL3N0b3JlL2NhcmRTdG9yZS5qcyIsImxpYi9zdG9yZS9lZGl0QmFyU3RvcmUuanMiLCJsaWIvc3RvcmUvZWRpdE1vZGFsU3RvcmUuanMiLCJsaWIvc3RvcmUvZWxlbWVudFN0b3JlLmpzIiwibGliL3N0b3JlL2ZpZWxkU3RvcmUuanMiLCJsaWIvc3RvcmUvaW1hZ2VTdG9yZS5qcyIsImxpYi91dGlsLmpzIiwibm9kZV9tb2R1bGVzL2JlbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jaG9vL2h0bWwuanMiLCJub2RlX21vZHVsZXMvY2hvby9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9ibG9ja3MuanMiLCJub2RlX21vZHVsZXMvY29tbW9ubWFyay9saWIvY29tbW9uLmpzIiwibm9kZV9tb2R1bGVzL2NvbW1vbm1hcmsvbGliL2Zyb20tY29kZS1wb2ludC5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9pbmxpbmVzLmpzIiwibm9kZV9tb2R1bGVzL2NvbW1vbm1hcmsvbGliL25vZGUuanMiLCJub2RlX21vZHVsZXMvY29tbW9ubWFyay9saWIvbm9ybWFsaXplLXJlZmVyZW5jZS5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9yZW5kZXIvaHRtbC5qcyIsIm5vZGVfbW9kdWxlcy9jb21tb25tYXJrL2xpYi9yZW5kZXIvcmVuZGVyZXIuanMiLCJub2RlX21vZHVsZXMvY29tbW9ubWFyay9saWIvcmVuZGVyL3htbC5qcyIsIm5vZGVfbW9kdWxlcy9kb2N1bWVudC1yZWFkeS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbnRpdGllcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbnRpdGllcy9saWIvZGVjb2RlLmpzIiwibm9kZV9tb2R1bGVzL2VudGl0aWVzL2xpYi9kZWNvZGVfY29kZXBvaW50LmpzIiwibm9kZV9tb2R1bGVzL2VudGl0aWVzL2xpYi9lbmNvZGUuanMiLCJub2RlX21vZHVsZXMvZW50aXRpZXMvbWFwcy9kZWNvZGUuanNvbiIsIm5vZGVfbW9kdWxlcy9lbnRpdGllcy9tYXBzL2VudGl0aWVzLmpzb24iLCJub2RlX21vZHVsZXMvZW50aXRpZXMvbWFwcy9sZWdhY3kuanNvbiIsIm5vZGVfbW9kdWxlcy9lbnRpdGllcy9tYXBzL3htbC5qc29uIiwibm9kZV9tb2R1bGVzL2dsb2JhbC9kb2N1bWVudC5qcyIsIm5vZGVfbW9kdWxlcy9nbG9iYWwvd2luZG93LmpzIiwibm9kZV9tb2R1bGVzL2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oeXBlcngvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbWR1cmwvZGVjb2RlLmpzIiwibm9kZV9tb2R1bGVzL21kdXJsL2VuY29kZS5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vYnVzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9oaXN0b3J5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9ocmVmL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9tb3JwaC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vbW9ycGgvbGliL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vbW9ycGgvbGliL21vcnBoLmpzIiwibm9kZV9tb2R1bGVzL25hbm9tb3VudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9uYW5vcmFmL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL25hbm9yb3V0ZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvbmFub3RpbWluZy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9vbi1sb2FkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3N0cmluZy5wcm90b3R5cGUucmVwZWF0L3JlcGVhdC5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL2xpYi9ieXRlc1RvVXVpZC5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL2xpYi9ybmctYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy91dWlkL3YxLmpzIiwibm9kZV9tb2R1bGVzL3dheWZhcmVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3dheWZhcmVyL3RyaWUuanMiLCJub2RlX21vZHVsZXMveHRlbmQvaW1tdXRhYmxlLmpzIiwibm9kZV9tb2R1bGVzL3h0ZW5kL211dGFibGUuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYXNzZXJ0L2Fzc2VydC5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXJlc29sdmUvZW1wdHkuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIiwiLi4vLi4vLi4vLi4vdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL3V0aWwvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcktBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0tBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SkE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDejJCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL1FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pFQTs7QUNBQTs7QUNBQTs7QUNBQTtBQUNBOzs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdFJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFlQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBjb25zdCBhcmMgPSBuZXcgRGF0QXJjaGl2ZSh3aW5kb3cubG9jYXRpb24udG9TdHJpbmcoKSk7XG5cbi8vIGNvbnN0IGNvbmZpZyA9IEpTT04ucGFyc2UoYXdhaXQgYXJjLnJlYWRGaWxlKCdjb25maWcuanNvbicpKTtcblxuLy8gY29uc3Qge3JlbmRlcn0gPSByZXF1aXJlKCdsaWIvdXRpbC5qcycpO1xuLy9cbi8vIHJlbmRlcihjYXJkMSwgYXJjKTtcblxuY29uc3QgY2hvbyA9IHJlcXVpcmUoJ2Nob28nKTtcblxuY29uc3QgbWFpblZpZXcgPSByZXF1aXJlKCcuL2xpYi9hcHBWaWV3Jyk7XG5cblxubGV0IGFwcCA9IGNob28oKTtcblxuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9hcHBTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvYmdTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvY2FyZFN0b3JlJykpO1xuYXBwLnVzZShyZXF1aXJlKCcuL2xpYi9zdG9yZS9lbGVtZW50U3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2ZpZWxkU3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2VkaXRCYXJTdG9yZScpKTtcbmFwcC51c2UocmVxdWlyZSgnLi9saWIvc3RvcmUvZWRpdE1vZGFsU3RvcmUnKSk7XG5hcHAudXNlKHJlcXVpcmUoJy4vbGliL3N0b3JlL2ltYWdlU3RvcmUnKSk7XG5cbmFwcC5yb3V0ZSgnLycsIG1haW5WaWV3KTtcbi8vIGFwcC5yb3V0ZSgnL2NhcmQvOndoaWNoJywgZnVuY3Rpb24oc3RhdGUsIGVtaXQpIHtcbi8vICAgICByZXR1cm4gbWFpblZpZXcoc3RhdGUsIGVtaXQpO1xuLy8gfSlcblxuYXBwLm1vdW50KCdtYWluJyk7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IGJhY2tncm91bmQgPSByZXF1aXJlKCcuL2JnVmlldycpO1xuY29uc3QgY2FyZCA9IHJlcXVpcmUoJy4vY2FyZFZpZXcnKTtcbmNvbnN0IGVkaXRCYXIgPSByZXF1aXJlKCcuL2VkaXRCYXJWaWV3Jyk7XG5jb25zdCBlZGl0TW9kYWwgPSByZXF1aXJlKCcuL2VkaXRNb2RhbFZpZXcnKTtcblxuY29uc3QgeyBjb2xvciB9ID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmNvbnN0IG1haW5WaWV3ID0gZnVuY3Rpb24oc3RhdGUsIGVtaXQpIHtcbiAgICBpZiAodHlwZW9mIHN0YXRlLmVkaXRpbmcgIT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICAgICAgcmV0dXJuIGh0bWxgPG1haW4gaWQ9XCJoYW56b1wiPjwvbWFpbj5gO1xuICAgIH1cblxuICAgIGNvbnN0IGN1cnJlbnRDb2xvciA9IGNvbG9yKHN0YXRlKTtcbiAgICByZXR1cm4gaHRtbGA8bWFpbiBjbGFzcz1cIiR7c3RhdGUuZWRpdE1vZGUgfHwgXCJcIn1cIlxuICAgICAgICBzdHlsZT1cIiR7Y3VycmVudENvbG9yID8gXCJiYWNrZ3JvdW5kLWNvbG9yOlwiICsgY3VycmVudENvbG9yIDogXCJcIn1cIj5cbiAgICAgICR7c3RhdGUuZWRpdGluZygpID8gZWRpdEJhcihzdGF0ZSwgZW1pdCkgOiBudWxsfVxuICAgICAgJHtiYWNrZ3JvdW5kKHN0YXRlLCBlbWl0KX1cbiAgICAgICR7Y2FyZChzdGF0ZSwgZW1pdCl9XG4gICAgICAke3N0YXRlLmVkaXRpbmdPYmplY3QoKSA/IGVkaXRNb2RhbChzdGF0ZSwgZW1pdCkgOiBudWxsfVxuICAgIDwvbWFpbj5gO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBtYWluVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IHV1aWQgPSByZXF1aXJlKCd1dWlkL3YxJyk7XG5cbmNvbnN0IHtzZWxlY3RPcHRpb24sIGNoZWNrQm94LCBnZXRQYXRofSA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuY29uc3Qge2NvbmRpdGlvbn0gPSByZXF1aXJlKCcuL2Zvcm0vaWZDb21wb25lbnRzJyk7XG5cbmNvbnN0IGJlaGF2aW9yT2JqcyA9IHtcbiAgICAnanVtcFRvJzogeydqdW1wVG8nOiBudWxsfSxcbiAgICAnaWYnOiB7J2lmJzoge1xuICAgICAgICBcImNvbmRpdGlvblwiOiBbXSxcbiAgICAgICAgXCJhY3Rpb25cIjogbnVsbCxcbiAgICAgICAgXCJlbHNlXCI6IG51bGxcbiAgICB9fSxcbiAgICAnY2xpY2tFbGVtZW50JzogeydjbGlja0VsZW1lbnQnOiBudWxsfSxcbiAgICAnc2V0VHJ1dGgnOiB7J3NldFRydXRoJzogJyd9LFxuICAgICdyZW1vdmVUcnV0aCc6IHsncmVtb3ZlVHJ1dGgnOiAnJ30sXG4gICAgJ3N0YXJ0VGFsbHknOiB7J3N0YXJ0VGFsbHknOiAnJywgJ3ZhbHVlJzogMH0sXG4gICAgJ3NldFRhbGx5JzogeydzZXRUYWxseSc6ICcnLCAndXBCeSc6IDB9LFxuICAgICdnb1RvTmV4dENhcmQnOiB7J2dvVG9OZXh0Q2FyZCc6ICdzdGFjaycsICd3cmFwJzogdHJ1ZX0sXG4gICAgJ2dvVG9QcmV2aW91c0NhcmQnOiB7J2dvVG9QcmV2aW91c0NhcmQnOiAnc3RhY2snLCAnd3JhcCc6IHRydWV9LFxuICAgICdsaW5rVG8nOiB7J2xpbmtUbyc6ICcnfSxcbiAgICAncGxheVNvdW5kJzogeydwbGF5U291bmQnOiAnJ30sXG59O1xuXG5jb25zdCBiZWhhdmlvck9wZXJhdGlvbnMgPSB7XG4gICAgJ2p1bXBUbyc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBsZXQgd2hlcmVUbyA9IHBhcnNlSW50KGJlaGF2T2JqLmp1bXBUbyk7XG4gICAgICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKHdoZXJlVG8pKSB7XG4gICAgICAgICAgICBzdGF0ZS5uZXh0Q2FyZCA9IHdoZXJlVG87XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB3aGVyZVRvID0gc3RhdGUuY2FyZHMuZmluZEluZGV4KFxuICAgICAgICAgICAgICAgIChjZCkgPT4gY2QubmFtZSA9PT0gYmVoYXZPYmouanVtcFRvXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKHdoZXJlVG8gPj0gMCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gd2hlcmVUbztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXQoJ2dvdG8nKSwgMSk7XG4gICAgfSxcbiAgICAnc2V0VHJ1dGgnOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgc3RhdGUudHJ1dGhzW2JlaGF2T2JqLnNldFRydXRoXSA9IHRydWU7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICBlbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH0sXG4gICAgJ3JlbW92ZVRydXRoJzogZnVuY3Rpb24oc3RhdGUsIGVtaXQsIGJlaGF2T2JqKSB7XG4gICAgICAgIGRlbGV0ZSBzdGF0ZS50cnV0aHNbYmVoYXZPYmoucmVtb3ZlVHJ1dGhdO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgZW1pdCgnc2F2ZScpO1xuICAgICAgICB9LCAxKTtcbiAgICB9LFxuICAgICdzdGFydFRhbGx5JzogZnVuY3Rpb24oc3RhdGUsIGVtaXQsIGJlaGF2T2JqKSB7XG4gICAgICAgIGlmICghc3RhdGUudGFsbGllcykge1xuICAgICAgICAgICAgc3RhdGUudGFsbGllcyA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLnRhbGxpZXNbYmVoYXZPYmouc3RhcnRUYWxseV0gPSBiZWhhdk9iai52YWx1ZSA/IGJlaGF2T2JqLnZhbHVlIDogMDtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgIGVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSxcbiAgICAnc2V0VGFsbHknOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgaWYgKCFzdGF0ZS50YWxsaWVzKSB7XG4gICAgICAgICAgICBzdGF0ZS50YWxsaWVzID0ge307XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGJlaGF2T2JqLnVwQnkpIHtcbiAgICAgICAgICAgIHN0YXRlLnRhbGxpZXNbYmVoYXZPYmouc2V0VGFsbHldICs9IGJlaGF2T2JqLnVwQnk7XG4gICAgICAgIH0gZWxzZSBpZiAoYmVoYXZPYmouZG93bkJ5KSB7XG4gICAgICAgICAgICBzdGF0ZS50YWxsaWVzW2JlaGF2T2JqLnNldFRhbGx5XSAtPSBiZWhhdk9iai5kb3duQnk7XG4gICAgICAgIH0gZWxzZSBpZiAoYmVoYXZPYmoudG8pIHtcbiAgICAgICAgICAgIHN0YXRlLnRhbGxpZXNbYmVoYXZPYmouc2V0VGFsbHldID0gYmVoYXZPYmoudG87XG4gICAgICAgIH1cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgIGVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfSxcbiAgICAnZ29Ub05leHRDYXJkJzogZnVuY3Rpb24oc3RhdGUsIGVtaXQsIGJlaGF2T2JqKSB7XG4gICAgICAgIGlmIChiZWhhdk9iai5nb1RvTmV4dENhcmQgPT0gJ2JnJykge1xuICAgICAgICAgICAgbGV0IHdpdGhJbmRleCA9IHN0YXRlLmNhcmRzLm1hcCgoY2QsIGluZCkgPT4gT2JqZWN0LmFzc2lnbih7fSwgY2QsIHtpbmRleDogaW5kfSkpO1xuICAgICAgICAgICAgbGV0IHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgY2QuaW5kZXggPiBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCkgJiZcbiAgICAgICAgICAgICAgICAgICAgY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKCFzYW1lc2llcy5sZW5ndGggJiYgYmVoYXZPYmoud3JhcCkge1xuICAgICAgICAgICAgICAgIHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgICAgIGNkLmluZGV4IDwgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNhbWVzaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gc2FtZXNpZXNbMF0uaW5kZXg7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvTmV4dENhcmQnLCAhIWJlaGF2T2JqLndyYXApLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2dvVG9QcmV2aW91c0NhcmQnOiBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZPYmopIHtcbiAgICAgICAgaWYgKGJlaGF2T2JqLmdvVG9QcmV2aW91c0NhcmQgPT0gJ2JnJykge1xuICAgICAgICAgICAgbGV0IHdpdGhJbmRleCA9IHN0YXRlLmNhcmRzLm1hcCgoY2QsIGluZCkgPT4gT2JqZWN0LmFzc2lnbih7fSwgY2QsIHtpbmRleDogaW5kfSkpO1xuICAgICAgICAgICAgbGV0IHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgY2QuaW5kZXggPCBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCkgJiZcbiAgICAgICAgICAgICAgICAgICAgY2QuYmFja2dyb3VuZCA9PT0gc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKCFzYW1lc2llcy5sZW5ndGggJiYgYmVoYXZPYmoud3JhcCkge1xuICAgICAgICAgICAgICAgIHNhbWVzaWVzID0gd2l0aEluZGV4LmZpbHRlcigoY2QpID0+XG4gICAgICAgICAgICAgICAgICAgIGNkLmluZGV4ID4gc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpICYmXG4gICAgICAgICAgICAgICAgICAgICAgICBjZC5iYWNrZ3JvdW5kID09PSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHNhbWVzaWVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLm5leHRDYXJkID0gc2FtZXNpZXNbc2FtZXNpZXMubGVuZ3RoIC0gMV0uaW5kZXg7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdnb3RvUHJldkNhcmQnLCAhIWJlaGF2T2JqLndyYXApLCAxKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ2xpbmtUbyc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgbGlua3lwb28gPSBuZXcgVVJMKGJlaGF2T2JqLmxpbmtUbyk7XG4gICAgICAgICAgICBpZiAoWydodHRwOicsJ2h0dHBzOicsJ2RhdDonXS5pbmNsdWRlcyhsaW5reXBvby5wcm90b2NvbCkpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHdpbmRvdy5sb2NhdGlvbiA9IGxpbmt5cG9vLmhyZWYsIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIC8vIG5vdCBhIHVybCB5YXlcbiAgICAgICAgfVxuICAgIH0sXG4gICAgJ3BsYXlTb3VuZCc6IGZ1bmN0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdk9iaikge1xuICAgICAgICBjb25zdCBzaG91dGluZyA9IGh0bWxgPGF1ZGlvIHNyYz1cIi9pbWcvJHtiZWhhdk9iai5wbGF5U291bmR9XCIgYXV0b3BsYXkgLz5gO1xuICAgICAgICBzaG91dGluZy5hZGRFdmVudExpc3RlbmVyKCdlbmRlZCcsICgpID0+IHtcbiAgICAgICAgICAgIHNob3V0aW5nLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc2hvdXRpbmcpO1xuICAgICAgICB9KTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChzaG91dGluZyk7XG4gICAgfVxufTtcblxuY29uc3QgYmVoYXZpb3JDb21wb25lbnRzID0gcmVxdWlyZSgnLi9mb3JtL2JlaGF2aW9yc1RvQ29tcG9uZW50cycpO1xuXG4vKlxuR2l2ZW4gYSBiZWhhdkFyciB0aGF0IGxvb2tzIHNvbWV0aGluZyBsaWtlOiBbXG4gICAge1xuICAgICAgICBcInNldFRydXRoXCI6IFwiaGFzVGVzdGVkT3RoZXJGaWVsZFwiXG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwiaWZcIjoge1xuICAgICAgICAgICAgXCJjb25kaXRpb25cIjogW3tcIm90aGVyRmllbGRcIjogXCJ5ZXNcIn1dLFxuICAgICAgICAgICAgXCJhY3Rpb25cIjoge1wianVtcFRvXCI6IDF9LFxuICAgICAgICAgICAgXCJlbHNlXCI6IHtcImp1bXBUb1wiOiAwfVxuICAgICAgICB9XG4gICAgfSxcbiAgICB7XG4gICAgICAgIFwianVtcFRvXCI6IDBcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJkZXN0cm95VHJ1dGhcIjogXCJoYXNUZXN0ZWRPdGhlckZpZWxkXCJcbiAgICB9LFxuICAgIHtcbiAgICAgICAgXCJ1cmxcIjogXCJkYXQ6Ly8zMmEuLi40NGVcIiAvLyBvciBodHRwLCB0aGF0J3Mgbm90IHRoZSBwb2ludFxuICAgIH1cbl1cbnBhcnNlQW5kUnVuQmVoYXZpb3JzIHdpbGwgdGFrZSBlYWNoIGluIG9yZGVyLCByZWFkIHRoZW0gdG8gc2VlIGhvdyBpdCBzaG91bGQgYWx0ZXJcbmEgZ2l2ZW4gc3RhdGUgaGFzaCwgYW5kIHRoZW4gZG8gc28sIHNvbWV0aW1lcyBieSBmaXJpbmcgZXZlbnRzIHdpdGggYSBnaXZlbiBlbWl0XG5mdW5jdGlvbi5cblxuU29tZSBtb3JlIGhhaXJzIG9uIHRoZSBiZWhhdkFyciBvYmplY3Qgc3ludGF4OlxuXG5pZjoge1xuICAgIGNvbmRpdGlvbjogWyduYW1lT2ZBVHJ1dGgnLCAnbmFtZU9mQW5vdGhlclRydXRoJ10sXG4gICAgY29uZGl0aW9uOiBbJ3RydXRoMScsIHsnb3RoZXJGaWVsZCc6ICd5ZXMnfSwgJ3RydXRoMiddLFxuICAgIGNvbmRpdGlvbjogWyd0cnV0aDMnLCB7J290aGVyRmllbGQnOiB7Z3Q6IDUsIGx0ZTogMzB9fSwgeydmaWZ0aEZpZWxkJzoge2NvbnRhaW5zOiAnbyd9fV0sXG4gICAgLy8gYWxsIHdvcmtcblxuICAgIGNvbmRpdGlvbjoge1wib3JcIjogW3snbmFtZSc6ICdkYXZlJ30sIHsnam9iJzogJ2phbml0b3InfV19IC8vIGdvZXMgb2ZmIGZvciBhbGwgZGF2ZXMgYW5kIGphbml0b3JzXG4gICAgY29uZGl0aW9uOiB7XCJvclwiOiBbeyduYW1lJzogJ2RhdmUnfSwgeyduYW1lJzogJ2ppbSd9XX0sIC8vIGJvdGggbmFtZXNcbiAgICBjb25kaXRpb246IHtcIm9yXCI6IFsndHJ1dGgxJywgJ3RydXRoMiddfSAvLyBlaXRoZXIgdHJ1dGguIHlvdSBjYW4gc3RpbGwgbWl4IGFuIG9iaiBpbiwgdG9vXG59XG5cbkFsc28geW91IGNhbiBqdW1wVG8gYSBjYXJkIGJ5IG5hbWU6IHsgJ2p1bXBUbyc6ICdhcnRodXInIH1cbiAqL1xuY29uc3Qge2V2YWxDb25kaXRpb259ID0gcmVxdWlyZSgnLi9mb3JtL2lmTG9naWMnKTtcblxuY29uc3QgcGFyc2VBbmRSdW5CZWhhdmlvcnMgPSBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgYmVoYXZBcnIpIHtcblxuICAgIGNvbnN0IGRvQmVoYXZpb3IgPSAoYmVoYXZPYmopID0+IHtcbiAgICAgICAgaWYgKGJlaGF2T2JqID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoYmVoYXZPYmpbJ2lmJ10pIHtcbiAgICAgICAgICAgIGlmIChldmFsQ29uZGl0aW9uKHN0YXRlLCBiZWhhdk9ialsnaWYnXS5jb25kaXRpb24pKSB7XG4gICAgICAgICAgICAgICAgZG9CZWhhdmlvcihiZWhhdk9ialsnaWYnXS5hY3Rpb24pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpZiAoYmVoYXZPYmpbJ2lmJ11bJ2Vsc2UnXSkge1xuICAgICAgICAgICAgICAgICAgICBkb0JlaGF2aW9yKGJlaGF2T2JqWydpZiddWydlbHNlJ10pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChiZWhhdk9iai5zY2hlZHVsZSkge1xuICAgICAgICAgICAgc3RhdGUuY2FyZFNjaGVkdWxlZCA9IHNldFRpbWVvdXQoXG4gICAgICAgICAgICAgICAgKCkgPT4gYmVoYXZPYmouc2NoZWR1bGUuZm9yRWFjaChkb0JlaGF2aW9yKSxcbiAgICAgICAgICAgICAgICBiZWhhdk9iai5zZWNvbmRzICogMTAwMFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIC8vIGFoIGJ1dCB3ZSBkb24ndCBrbm93IHRoaXMgYmVoYXZpb3IgaXMgY2FyZC1sZXZlbFxuICAgICAgICAgICAgLy8gYnV0IGFueXdheSB0aGF0J3Mge3NjaGVkdWxlOiBbYmVoYXYsIGJlaGF2Li4uXSwgc2Vjb25kczogbnVtfVxuICAgICAgICB9IGVsc2UgaWYgKGJlaGF2T2JqLmNsaWNrRWxlbWVudCkge1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGJlaGF2T2JqLmNsaWNrRWxlbWVudDtcbiAgICAgICAgICAgIGNvbnN0IGNhcmQgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpO1xuICAgICAgICAgICAgY29uc3QgYW55T25DYXJkID0gY2FyZC5lbGVtZW50cy5maWx0ZXIoKGVsbSkgPT4gZWxtLm5hbWUgPT0gbmFtZSk7XG4gICAgICAgICAgICBpZiAoYW55T25DYXJkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGFueU9uQ2FyZFswXS5iZWhhdmlvci5mb3JFYWNoKGRvQmVoYXZpb3IpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiZyA9IHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kKCk7XG4gICAgICAgICAgICAgICAgY29uc3QgYW55T25CZyA9IGJnLmVsZW1lbnRzLmZpbHRlcigoZWxtKSA9PiBlbG0ubmFtZSA9PSBuYW1lKTtcbiAgICAgICAgICAgICAgICBpZiAoYW55T25CZy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgYW55T25CZ1swXS5iZWhhdmlvci5mb3JFYWNoKGRvQmVoYXZpb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IG1hZ2ljS2V5ID0gT2JqZWN0LmtleXMoYmVoYXZpb3JPcGVyYXRpb25zKS5maW5kKChrZXkpID0+XG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoYmVoYXZPYmopLmluY2x1ZGVzKGtleSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBiZWhhdmlvck9wZXJhdGlvbnNbbWFnaWNLZXldLmNhbGwobnVsbCwgc3RhdGUsIGVtaXQsIGJlaGF2T2JqKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBiZWhhdkFyci5mb3JFYWNoKGRvQmVoYXZpb3IpO1xuICAgIC8vIFByb21pc2UuZWFjaChiZWhhdkFycixcbiAgICAvLyAgKGJlaGF2T2JqLCBiZWhhdkluZGV4KSA9PiBkb0JlaGF2aW9yKGJlaGF2T2JqLCBiZWhhdkluZGV4KVxuICAgIC8vIClcbn1cblxuY29uc3QgYmVoYXZpb3IgPSBmdW5jdGlvbihzdGF0ZSwgZW1pdCwgcGF0aCkge1xuICAgIGNvbnN0IHNhZmV0eVBhdGggPSBbXS5jb25jYXQocGF0aCk7XG4gICAgY29uc3QgYmVoYXYgPSBnZXRQYXRoKHN0YXRlLCBzYWZldHlQYXRoKTtcblxuICAgIGxldCBiZWhhdlR5cGU7XG5cbiAgICBpZiAodHlwZW9mIGJlaGF2ID09PSAndW5kZWZpbmVkJyB8fCBiZWhhdiA9PSBudWxsKSB7XG4gICAgICAgIGJlaGF2VHlwZSA9IG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgd2hhdFdlR290ID0gT2JqZWN0LmtleXMoYmVoYXYpO1xuICAgICAgICBpZiAoIXdoYXRXZUdvdC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGJlaGF2VHlwZSA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHlwZXMgPSBPYmplY3Qua2V5cyhiZWhhdmlvckNvbXBvbmVudHMpO1xuICAgICAgICB0eXBlcy5mb3JFYWNoKCh0eXBlKSA9PiB7XG4gICAgICAgICAgICBpZiAod2hhdFdlR290LmluY2x1ZGVzKHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgYmVoYXZUeXBlID0gdHlwZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgbWVudSA9IGJlaGF2VHlwZU1lbnUoYmVoYXZUeXBlLCBzYWZldHlQYXRoLCBzZXRCZWhhdmlvclR5cGUpO1xuICAgIHJldHVybiBodG1sYDxkaXYgY2xhc3M9XCJiZWhhdmlvciAkeydiZWhhdi0nICsgYmVoYXZUeXBlfVwiPlxuICAgICAgICAke21lbnV9XG4gICAgICAgICR7YmVoYXZUeXBlID09PSAnaWYnXG4gICAgICAgICAgICA/IGlmU2hlbGwoc3RhdGUsIGVtaXQsIGJlaGF2LCBzYWZldHlQYXRoKVxuICAgICAgICAgICAgOiAoYmVoYXZUeXBlICE9PSBudWxsXG4gICAgICAgICAgICAgICAgPyBiZWhhdmlvckNvbXBvbmVudHNbYmVoYXZUeXBlXS5jYWxsKG51bGwsIHN0YXRlLCBlbWl0LCBiZWhhdiwgc2FmZXR5UGF0aClcbiAgICAgICAgICAgICAgICA6IG51bGwpfVxuICAgIDwvZGl2PmA7XG5cbiAgICBmdW5jdGlvbiBzZXRCZWhhdmlvclR5cGUocGF0aCwgdmFsdWUpIHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgYmVoYXZpb3JPYmpzW3ZhbHVlXV0pO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIGlmU2hlbGwoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICR7Y29uZGl0aW9uKHN0YXRlLCBlbWl0LCBiZWhhdlsnaWYnXS5jb25kaXRpb24sIHBhdGguY29uY2F0KFsnaWYnLCAnY29uZGl0aW9uJ10pKX1cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIDx1bCBjbGFzcz1cImJlaGF2aW9yc1wiPlxuICAgICAgICAgICAgPGxpPkRvIHRoZSBiZWhhdmlvcjpcbiAgICAgICAgICAgICAgICAke2JlaGF2aW9yKHN0YXRlLCBlbWl0LCBwYXRoLmNvbmNhdChbJ2lmJywgJ2FjdGlvbiddKSl9XG4gICAgICAgICAgICA8L2xpPlxuICAgICAgICAgICAgPGxpPk90aGVyd2lzZSwgZG86XG4gICAgICAgICAgICAgICAgJHtiZWhhdmlvcihzdGF0ZSwgZW1pdCwgcGF0aC5jb25jYXQoWydpZicsICdlbHNlJ10pKX1cbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgIDwvdWw+XG4gICAgPC9kaXY+YDtcbn1cblxuZnVuY3Rpb24gYmVoYXZpb3JMaXN0KHN0YXRlLCBlbWl0LCBiZWhhdmlvcnMsIHBhdGgpIHtcbiAgICBjb25zdCByZXQgPSBodG1sYDx1bCBjbGFzcz1cImJlaGF2aW9yc1wiPlxuICAgICAgICAke2JlaGF2aW9ycy5tYXAoKGJlaGF2LCBpbmQpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBodG1sYDxsaT5cbiAgICAgICAgICAgICAgJHtiZWhhdmlvcihzdGF0ZSwgZW1pdCwgcGF0aC5jb25jYXQoW2luZF0pKX1cbiAgICAgICAgICAgIDwvbGk+YDtcbiAgICAgICAgfSl9XG4gICAgICAgIDxidXR0b24gY2xhc3M9XCJhZGQtYmVoYXZpb3JcIiBvbmNsaWNrPSR7YWRkSGFuZGxlcn0+KzwvYnV0dG9uPlxuICAgIDwvdWw+YDtcbiAgICByZXR1cm4gcmV0O1xuXG4gICAgZnVuY3Rpb24gYWRkSGFuZGxlcigpIHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgYmVoYXZpb3JzLmNvbmNhdChbbnVsbF0pXSk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGJlaGF2VHlwZU1lbnUoc2VsZWN0VHlwZSwgcGF0aCwgaGFuZGxlcikge1xuICAgIGNvbnN0IG9wdHMgPSBbc2VsZWN0T3B0aW9uKG51bGwsICctJywgc2VsZWN0VHlwZSldO1xuICAgIGNvbnN0IGJlaGF2aW9yS2V5cyA9IE9iamVjdC5rZXlzKGJlaGF2aW9yQ29tcG9uZW50cyk7XG5cbiAgICBmb3IgKGNvbnN0IGJlaGF2aW9yS2V5IG9mIGJlaGF2aW9yS2V5cykge1xuICAgICAgICBvcHRzLnB1c2goc2VsZWN0T3B0aW9uKGJlaGF2aW9yS2V5LCBzZWxlY3RUeXBlKSk7XG4gICAgfVxuICAgIHJldHVybiBodG1sYDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke3NlbGVjdFR5cGV9XCIgbmFtZT1cIiR7bmFtZX1cIiBvbmNoYW5nZT0keyhlKSA9PiBoYW5kbGVyKHBhdGgsIGUudGFyZ2V0LnZhbHVlKX0+XG4gICAgICAgICR7b3B0c31cbiAgICA8L3NlbGVjdD5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtwYXJzZUFuZFJ1bkJlaGF2aW9ycywgYmVoYXZpb3IsIGJlaGF2VHlwZU1lbnUsIGJlaGF2aW9yTGlzdH07XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IEltYWdlID0gcmVxdWlyZSgnLi9pbWFnZVZpZXcuanMnKTtcbmNvbnN0IEdyYXBoaWNFbGVtZW50ID0gcmVxdWlyZSgnLi9ncmFwaGljVmlldy5qcycpO1xuY29uc3QgRWxlbWVudCA9IHJlcXVpcmUoJy4vZWxlbWVudFZpZXcuanMnKTtcbmNvbnN0IEZpZWxkID0gcmVxdWlyZSgnLi9maWVsZFZpZXcuanMnKTtcblxuXG5jb25zdCBiZ1ZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBjb25zdCBiZyA9IHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kKCk7XG4gICAgcmV0dXJuIGh0bWxgPHNlY3Rpb24gaWQ9XCJiZ1wiPlxuICAgICAgICAke2RyYXdJbWFnZXMoKX1cbiAgICAgICAgJHtkcmF3RWxlbWVudHMoKX1cbiAgICAgICAgJHtkcmF3RmllbGRzKCl9XG4gICAgPC9zZWN0aW9uPmA7XG5cbiAgICBmdW5jdGlvbiBkcmF3SW1hZ2VzKCkge1xuICAgICAgICBpZiAoYmcgJiYgYmcuaW1hZ2VzKSB7XG4gICAgICAgICAgICByZXR1cm4gYmcuaW1hZ2VzLm1hcCgoZWxtLCBpbmQpID0+XG4gICAgICAgICAgICAgICAgSW1hZ2UoZWxtLCBpbmQsIHN0YXRlLCBlbWl0KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHRtbGA8ZGl2IGlkPVwiYmctbm8taW1hZ2VzXCI+PC9kaXY+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3RWxlbWVudHMoKSB7XG4gICAgICAgIGlmIChiZyAmJiBiZy5lbGVtZW50cykge1xuICAgICAgICAgICAgcmV0dXJuIGJnLmVsZW1lbnRzLm1hcCgoYnV0LCBpbmQpID0+XG4gICAgICAgICAgICAgICAgRWxlbWVudChidXQsIGluZCwgc3RhdGUsIGVtaXQpXG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBodG1sYDxzcGFuIGNsYXNzPVwiYmctbm8tZWxlbWVudHNcIj48L3NwYW4+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3RmllbGRzKCkge1xuICAgICAgICBpZiAoYmcgJiYgYmcuZmllbGRzKSB7XG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmtleXMoYmcuZmllbGRzKS5tYXAoZmxkTmFtZSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IGZpZWxkV2l0aFZhbHVlTWF5YmUgPSBPYmplY3QuYXNzaWduKFxuICAgICAgICAgICAgICAgICAgICB7fSxcbiAgICAgICAgICAgICAgICAgICAgYmcuZmllbGRzW2ZsZE5hbWVdLFxuICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpLnZhbHVlc1tmbGROYW1lXSB8fCBcIlwiIH1cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiBGaWVsZChmaWVsZFdpdGhWYWx1ZU1heWJlLCBmbGROYW1lLCBzdGF0ZSwgZW1pdCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHRtbGA8c3BhbiBjbGFzcz1cImJnLW5vLWZpZWxkc1wiPjwvc3Bhbj5gO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYmdWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCBJbWFnZSA9IHJlcXVpcmUoJy4vaW1hZ2VWaWV3LmpzJyk7XG5jb25zdCBHcmFwaGljRWxlbWVudCA9IHJlcXVpcmUoJy4vZ3JhcGhpY1ZpZXcuanMnKTtcbmNvbnN0IEVsZW1lbnQgPSByZXF1aXJlKCcuL2VsZW1lbnRWaWV3LmpzJyk7XG5jb25zdCBGaWVsZCA9IHJlcXVpcmUoJy4vZmllbGRWaWV3LmpzJyk7XG5cblxuY29uc3QgY2FyZFZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBjb25zdCBjYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmQoKTtcbiAgICByZXR1cm4gaHRtbGA8YXJ0aWNsZSBpZD1cImNhcmRcIj5cbiAgICAgICAgJHtkcmF3SW1hZ2VzKCl9XG4gICAgICAgICR7ZHJhd0VsZW1lbnRzKCl9XG4gICAgICAgICR7ZHJhd0ZpZWxkcygpfVxuICAgIDwvYXJ0aWNsZT5gO1xuXG4gICAgZnVuY3Rpb24gZHJhd0ltYWdlcygpIHtcbiAgICAgICAgaWYgKGNhcmQgJiYgY2FyZC5pbWFnZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBjYXJkLmltYWdlcy5tYXAoKGVsbSwgaW5kKSA9PlxuICAgICAgICAgICAgICAgIEltYWdlKGVsbSwgaW5kLCBzdGF0ZSwgZW1pdCwgdHJ1ZSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0bWxgPGRpdiBpZD1cImNhcmQtbm8taW1hZ2VzXCI+PC9kaXY+YFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRyYXdFbGVtZW50cygpIHtcbiAgICAgICAgaWYgKGNhcmQgJiYgY2FyZC5lbGVtZW50cykge1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQuZWxlbWVudHMubWFwKChidXQsIGluZCkgPT5cbiAgICAgICAgICAgICAgICBFbGVtZW50KGJ1dCwgaW5kLCBzdGF0ZSwgZW1pdCwgdHJ1ZSlcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGh0bWxgPHNwYW4gaWQ9XCJjYXJkLW5vLWVsZW1lbnRzXCI+PC9zcGFuPmBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkcmF3RmllbGRzKCkge1xuICAgICAgICBpZiAoY2FyZCAmJiBjYXJkLmZpZWxkcykge1xuICAgICAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGNhcmQuZmllbGRzKS5tYXAoKGZsZE5hbWUpID0+XG4gICAgICAgICAgICAgICAgRmllbGQoY2FyZC5maWVsZHNbZmxkTmFtZV0sIGZsZE5hbWUsIHN0YXRlLCBlbWl0LCB0cnVlKVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gaHRtbGA8c3BhbiBpZD1cImNhcmQtbm8tZmllbGRzXCI+PC9zcGFuPmBcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNhcmRWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoXCJjaG9vL2h0bWxcIik7XG5cbmNvbnN0IHtzZWxlY3RPcHRpb259ID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxuY29uc3QgZWRpdEJhclZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBjb25zdCBpc0JnID0gc3RhdGUuZWRpdGluZ0JhY2tncm91bmQoKTtcbiAgICBjb25zdCBlY2tzID0gaHRtbGA8YSBocmVmPVwiI1wiIG9uY2xpY2s9JHsoKSA9PiBlbWl0KCd0dXJuT2ZmRWRpdE1vZGUnKX0+PC9hPmA7XG4gICAgZWNrcy5pbm5lckhUTUwgPSAnJnRpbWVzOyc7XG5cbiAgICByZXR1cm4gaHRtbGA8bmF2IGlkPVwiZWRpdGJhclwiPlxuICAgICAgPGFzaWRlIGNsYXNzPVwicmVhZG91dFwiPlxuICAgICAgICBEYW5ueSAwLjEg8J+RpvCfj748YnIgLz5cbiAgICAgICAgJHtpc0JnXG4gICAgICAgICAgICA/IGh0bWxgPHNwYW4+QmcgJHtzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KCl9IG9mICR7c3RhdGUuZ2V0QmFja2dyb3VuZENvdW50KCl9PC9zcGFuPmBcbiAgICAgICAgICAgIDogaHRtbGA8c3Bhbj5DYXJkICR7c3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpfSBvZiAke3N0YXRlLmdldENhcmRDb3VudCgpfTwvc3Bhbj5gXG4gICAgICAgIH1cbiAgICAgIDwvYXNpZGU+XG5cbiAgICAgIDx1bD5cbiAgICAgICAgPGxpPkNyZWF0ZSBuZXc6XG4gICAgICAgIDxidXR0b24gb25jbGljaz0keygpID0+IHtlbWl0KCduZXdFbGVtZW50Jyk7cmV0dXJuIGZhbHNlfX0+RWxlbWVudDwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3SW1hZ2UnKTtyZXR1cm4gZmFsc2V9fT5JbWFnZTwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3RmllbGQnKTtyZXR1cm4gZmFsc2V9fT5GaWVsZDwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7ZW1pdCgnbmV3QmcnKTtyZXR1cm4gZmFsc2V9fT5CYWNrZ3JvdW5kPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gb25jbGljaz0keygpID0+IHtlbWl0KCduZXdDYXJkJyk7cmV0dXJuIGZhbHNlfX0+Q2FyZDwvYnV0dG9uPjwvbGk+XG4gICAgICAgIDxsaSBjbGFzcz1cImJnbW9kZVwiPjxhIGhyZWY9XCIjXCIgb25jbGljaz0keygpID0+IGVtaXQoXCJlZGl0QmdNb2RlXCIpfT5cbiAgICAgICAgICAgICR7aXNCZyA/ICdDYXJkJyA6ICdCYWNrZ3JvdW5kJ30gbW9kZVxuICAgICAgICA8L2E+PC9saT5cbiAgICAgICAgPGxpPjxhIGhyZWY9XCIjXCIgb25jbGljaz0keygpID0+IGVtaXQoaXNCZyA/ICdlZGl0QmcnIDonZWRpdENhcmQnKX0+XG4gICAgICAgICAgICBFZGl0ICR7aXNCZyA/ICdiYWNrZ3JvdW5kJyA6ICdjYXJkJ31cbiAgICAgICAgPC9hPjwvbGk+XG4gICAgICAgIDxsaT48YSBocmVmPVwiI1wiIG9uY2xpY2s9JHsoKSA9PiBlbWl0KFwiZWRpdFN0YWNrXCIpfT5FZGl0IHN0YWNrPC9hPjwvbGk+XG4gICAgICAgIDxsaSBjbGFzcz1cImNsb3NlXCI+JHtlY2tzfTwvbGk+XG4gICAgICA8L3VsPlxuICAgICAgJHtzdGF0ZS5hZGRpbmdJbWFnZSA/IGRyb3BJbWFnZSgpIDogXCJcIn1cbiAgICA8L25hdj5gO1xuXG4gICAgZnVuY3Rpb24gZHJvcEltYWdlKCkge1xuICAgICAgICBlbWl0KCdlbnN1cmVTdGF0aWNGaWxlTGlzdHMnKTtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGZvcm0gaWQ9XCJhZGRpbWFnZVwiPlxuICAgICAgICAgICAgQ2hvb3NlIG9yIGRyb3A6IDxpbnB1dCB0eXBlPVwiZmlsZVwiXG4gICAgICAgICAgICAgIG9uY2hhbmdlPSR7ZSA9PiBlbWl0KFwiYWRkSW1hZ2VcIiwgZSl9XG4gICAgICAgICAgICAgIGNsYXNzPVwiJHtzdGF0ZS5ob3ZlcmluZ0ltYWdlID8gXCJkcm9waG92ZXJcIiA6IFwiXCJ9XCIgLz5cbiAgICAgICAgICAgIE9yIHNlbGVjdCBleGlzdGluZzpcbiAgICAgICAgICAgIDxzZWxlY3QgbmFtZT1cImV4aXN0aW5nSW1hZ2VcIiBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KFwiYWRkSW1hZ2VcIiwgZSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgbnVsbCl9XG4gICAgICAgICAgICAgICAgJHtzdGF0ZS5zdGF0aWNGaWxlcyAmJiBzdGF0ZS5zdGF0aWNGaWxlcy5tYXAoKGZpbGUpID0+IHNlbGVjdE9wdGlvbihmaWxlKSl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgIDxhIGhyZWY9XCIjXCIgb25jbGljaz0ke2NhbmNlbEltYWdlfSBzdHlsZT1cInBhZGRpbmctbGVmdDoxMnJlbTtjb2xvcjpyZWQ7XCI+Q2FuY2VsPC9hPlxuICAgICAgICA8L2Zvcm0+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYW5jZWxJbWFnZSgpIHtcbiAgICAgICAgc3RhdGUuYWRkaW5nSW1hZ2UgPSBmYWxzZTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KFwicmVuZGVyXCIpLCAxKTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVkaXRCYXJWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoXCJjaG9vL2h0bWxcIik7XG5cbmNvbnN0IGVsZW1lbnRTdHlsZVZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2VsZW1lbnRTdHlsZVZpZXcuanNcIik7XG5jb25zdCBpbWFnZVN0eWxlVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vaW1hZ2VTdHlsZVZpZXcuanNcIik7XG5jb25zdCBmaWVsZFN0eWxlVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vZmllbGRTdHlsZVZpZXcuanNcIik7XG5jb25zdCBlZGl0QmVoYXZpb3JWaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9lZGl0QmVoYXZpb3JWaWV3LmpzXCIpO1xuY29uc3QgZmllbGRCZWhhdmlvclZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2VkaXRCZWhhdmlvclZpZXcuanNcIik7XG5cbmNvbnN0IGNhcmRTdHlsZVZpZXcgPSByZXF1aXJlKFwiLi9mb3JtL2NhcmRTdHlsZVZpZXcuanNcIik7XG5jb25zdCBiZ1N0eWxlVmlldyA9IHJlcXVpcmUoXCIuL2Zvcm0vYmdTdHlsZVZpZXcuanNcIik7XG5cbmNvbnN0IHN0YWNrQ29tYm9WaWV3ID0gcmVxdWlyZShcIi4vZm9ybS9zdGFja0NvbWJvVmlldy5qc1wiKTtcblxuY29uc3Qgd2hpY2hWaWV3TWF0cml4ID0ge1xuICAgIHN0eWxlOiB7XG4gICAgICAgIGVsZW1lbnQ6IGVsZW1lbnRTdHlsZVZpZXcsXG4gICAgICAgIGZpZWxkOiBmaWVsZFN0eWxlVmlldyxcbiAgICAgICAgaW1hZ2U6IGltYWdlU3R5bGVWaWV3LFxuICAgICAgICBjYXJkOiBjYXJkU3R5bGVWaWV3LFxuICAgICAgICBiZzogYmdTdHlsZVZpZXcsXG4gICAgICAgIHN0YWNrOiBzdGFja0NvbWJvVmlld1xuICAgIH0sXG4gICAgZnVuY3Rpb246IHtcbiAgICAgICAgZWxlbWVudDogZWRpdEJlaGF2aW9yVmlldyxcbiAgICAgICAgZmllbGQ6IGZpZWxkQmVoYXZpb3JWaWV3LFxuICAgICAgICBpbWFnZTogZWRpdEJlaGF2aW9yVmlldyxcbiAgICAgICAgY2FyZDogZWRpdEJlaGF2aW9yVmlldyxcbiAgICAgICAgYmc6IGVkaXRCZWhhdmlvclZpZXcsXG4gICAgICAgIHN0YWNrOiBzdGFja0NvbWJvVmlld1xuICAgIH1cbn07XG5cbmNvbnN0IGVkaXRNb2RhbFZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgICBsZXQgd2hpY2g7XG4gICAgaWYgKHN0YXRlLmVkaXRpbmdFbGVtZW50KSB7XG4gICAgICAgIHdoaWNoID0gXCJlbGVtZW50XCI7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5lZGl0aW5nRmllbGQpIHtcbiAgICAgICAgd2hpY2ggPSBcImZpZWxkXCI7XG4gICAgfSBlbHNlIGlmIChzdGF0ZS5lZGl0aW5nSW1hZ2UpIHtcbiAgICAgICAgd2hpY2ggPSBcImltYWdlXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdQYXRoWzBdID09ICdjYXJkcycpIHtcbiAgICAgICAgICAgIHdoaWNoID0gXCJjYXJkXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT0gJ2JhY2tncm91bmRzJykge1xuICAgICAgICAgICAgd2hpY2ggPSBcImJnXCI7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT0gJ3N0YWNrJykge1xuICAgICAgICAgICAgd2hpY2ggPSBcInN0YWNrXCI7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBlY2tzID0gaHRtbGA8YSBjbGFzcz1cImNsb3NlXCIgaHJlZj1cIiNcIiBvbmNsaWNrPSR7KCkgPT4gZW1pdCgnY2xvc2VFZGl0Jyl9PjwvYT5gO1xuICAgIGVja3MuaW5uZXJIVE1MID0gJyZ0aW1lczsnO1xuXG4gICAgY29uc3QgbW9kYWwgPSBodG1sYDxzZWN0aW9uIGlkPVwiZWRpdG1vZGFsXCI+PGRpdiBjbGFzcz1cInNjcm9sbHlcIj5cbiAgICAgICR7ZWNrc31cblxuICAgICAgJHt3aGljaCA9PSAnc3RhY2snXG4gICAgICAgID8gbnVsbFxuICAgICAgICA6IGh0bWxgPHVsIGlkPVwiZWRpdE1vZGFsVGFic1wiPlxuICAgICAgICAgICAgPGxpIGNsYXNzPVwiJHtzdGF0ZS5lZGl0aW5nRnVuY3Rpb24gPyBcIlwiIDogXCJoaWxpdGVkXCJ9XCJcbiAgICAgICAgICAgICAgICBvbmNsaWNrPSR7KCkgPT4gdG9nZ2xlRnVuY3Rpb25FZGl0KCdzdHlsZScpfT5cbiAgICAgICAgICAgICAgICBTdHlsZVxuICAgICAgICAgICAgPC9saT48bGkgY2xhc3M9XCIke3N0YXRlLmVkaXRpbmdGdW5jdGlvbiA/IFwiaGlsaXRlZFwiIDogXCJcIn1cIlxuICAgICAgICAgICAgICAgIG9uY2xpY2s9JHsoKSA9PiB0b2dnbGVGdW5jdGlvbkVkaXQoKX0+XG4gICAgICAgICAgICAgICAgQmVoYXZpb3JcbiAgICAgICAgICAgIDwvbGk+XG4gICAgICAgICAgPC91bD5gfVxuXG4gICAgICAke3N0YXRlLmVkaXRpbmdGdW5jdGlvblxuICAgICAgICAgID8gd2hpY2hWaWV3TWF0cml4LmZ1bmN0aW9uW3doaWNoXS5jYWxsKG51bGwsIHN0YXRlLCBlbWl0KVxuICAgICAgICAgIDogd2hpY2hWaWV3TWF0cml4LnN0eWxlW3doaWNoXS5jYWxsKG51bGwsIHN0YXRlLCBlbWl0KX1cbiAgICA8L2Rpdj48L3NlY3Rpb24+YDtcbiAgICAvLyBzZXRUaW1lb3V0KCgpID0+XG4gICAgLy8gICAgIG1vZGFsLnF1ZXJ5U2VsZWN0b3IoJ2Rpdi5zY3JvbGx5Jykuc3R5bGUuaGVpZ2h0ID0gbW9kYWwuY2xpZW50SGVpZ2h0ICsgJ3B4JyxcbiAgICAvLyAxKTtcbiAgICByZXR1cm4gbW9kYWw7XG5cbiAgICBmdW5jdGlvbiB0b2dnbGVGdW5jdGlvbkVkaXQod2hlcmUgPSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IGlzaXRvbiA9IHN0YXRlLmVkaXRpbmdGdW5jdGlvbjtcbiAgICAgICAgaWYgKChpc2l0b24gJiYgd2hlcmUgPT0gJ3N0eWxlJykgfHwgKCFpc2l0b24gJiYgd2hlcmUgPT0gJ2Z1bmN0aW9uJykpIHtcbiAgICAgICAgICAgIGVtaXQoJ3RvZ2dsZUZ1bmN0aW9uRWRpdCcpO1xuICAgICAgICB9IC8vIGkgZG9uJ3Qga25vdywgaXMgdGhhdCBkdW1iP1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZWRpdE1vZGFsVmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IGNvbW1vbm1hcmsgPSByZXF1aXJlKCdjb21tb25tYXJrJyk7XG5cbmNvbnN0IHtwYXJzZUFuZFJ1bkJlaGF2aW9yc30gPSByZXF1aXJlKCcuL2JlaGF2aW9yLmpzJyk7XG5cblxuY29uc3QgZW5zdXJlU3R5bGVQaXhlbHMgPSAodmFsKSA9PiB7XG4gICAgcmV0dXJuIHR5cGVvZiB2YWwgPT0gJ251bWJlcicgPyB2YWwgKyAncHgnIDogdmFsO1xufVxuXG5jb25zdCBlbGVtZW50VmlldyA9IChlbGVtZW50LCBpbmRleCwgc3RhdGUsIGVtaXQsIGlzQ2FyZCkgPT4ge1xuICAgIGNvbnN0IGF0dHJzID0ge1xuICAgICAgICBoZWlnaHQ6IGVuc3VyZVN0eWxlUGl4ZWxzKGVsZW1lbnQuaGVpZ2h0KSxcbiAgICAgICAgd2lkdGg6IGVuc3VyZVN0eWxlUGl4ZWxzKGVsZW1lbnQud2lkdGgpLFxuICAgICAgICB0b3A6IGVuc3VyZVN0eWxlUGl4ZWxzKGVsZW1lbnQudG9wKSxcbiAgICAgICAgbGVmdDogZW5zdXJlU3R5bGVQaXhlbHMoZWxlbWVudC5sZWZ0KSxcbiAgICAgICAgJ2JhY2tncm91bmQtY29sb3InOiBlbGVtZW50LmNvbG9yLFxuICAgICAgICAnZm9udC1mYW1pbHknOiBlbGVtZW50LmZvbnQsXG4gICAgICAgICdmb250LXNpemUnOiBlbGVtZW50LnNpemUsXG4gICAgICAgIGNvbG9yOiBlbGVtZW50LnRleHRDb2xvclxuICAgIH07IC8vIHRoaXMgZGF0YSBtdW5nZSBzdGVwIG1heSBiZWxvbmcgaW4gYSBzdG9yZT9cbiAgICBsZXQgZWxlbWVudFN0eWxlcyA9IE9iamVjdC5rZXlzKGF0dHJzKS5tYXAoKGtleSkgPT4gKGtleSArICc6JyArIGF0dHJzW2tleV0gKyAnOycpKS5qb2luKCcnKTtcbiAgICBpZiAoZWxlbWVudC5zdHlsZSkge1xuICAgICAgICBlbGVtZW50U3R5bGVzICs9IGVsZW1lbnQuc3R5bGU7XG4gICAgfVxuXG4gICAgY29uc3QgY2xpY2tIYW5kbGVyID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKGV2ZW50LmFsdEtleSB8fFxuICAgICAgICAgICAgKHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnICYmIGlzQ2FyZCkgfHxcbiAgICAgICAgICAgIChzdGF0ZS5lZGl0TW9kZSA9PT0gJ2JnRWRpdCcgJiYgIWlzQ2FyZClcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBlZGl0RWxlbWVudCgpO1xuICAgICAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYmVoYXZpb3IgJiYgZWxlbWVudC5iZWhhdmlvci5sZW5ndGgpIHtcbiAgICAgICAgICAgIHBhcnNlQW5kUnVuQmVoYXZpb3JzKHN0YXRlLCBlbWl0LCBlbGVtZW50LmJlaGF2aW9yKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBsZXQgZWxtO1xuICAgIGlmIChpc0RyYWdnYWJsZSgpKSB7XG4gICAgICAgIGVsbSA9IGh0bWxgPGRpdiBjbGFzcz1cImVsZW1lbnQgbW92YWJsZSAke2VsZW1lbnRDbGFzc2VzKCl9XCJcbiAgICAgICAgICAgIG9uY2xpY2s9JHsoZSkgPT4gZWRpdE1vZGVDbGljayhlKX1cbiAgICAgICAgICAgIG9ubW91c2Vkb3duPSR7KGUpID0+IG1vdXNlRG93bihlKX1cbiAgICAgICAgICAgIG9ubW91c2VsZWF2ZT0keyhlKSA9PiBtb3VzZUxlYXZlKGUpfVxuICAgICAgICAgICAgb25tb3VzZXVwPSR7KGUpID0+IG1vdXNlVXAoZSl9XG4gICAgICAgICAgICBzdHlsZT1cIiR7ZWxlbWVudFN0eWxlc31cIj48L2Rpdj5gO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGVsbSA9IGh0bWxgPGRpdiBjbGFzcz1cImVsZW1lbnQgJHtlbGVtZW50Q2xhc3NlcygpfVwiXG4gICAgICAgICAgb25jbGljaz0ke2NsaWNrSGFuZGxlcn1cbiAgICAgICAgICBzdHlsZT1cIiR7ZWxlbWVudFN0eWxlc31cIj48L2Rpdj5gO1xuICAgIH1cbiAgICBlbG0uaW5uZXJIVE1MID0gcmVuZGVyTWFya2Rvd24oZWxlbWVudC50ZXh0KTtcbiAgICBpZiAoaXNEcmFnZ2FibGUoKSB8fCAhZWxlbWVudC5oaWRkZW4pIHtcbiAgICAgICAgcmV0dXJuIGVsbTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG5cbiAgICBmdW5jdGlvbiBlbGVtZW50Q2xhc3NlcygpIHtcbiAgICAgICAgY29uc3Qga2xhc3MgPSBbXTtcbiAgICAgICAgaWYgKGVsZW1lbnQuYmVoYXZpb3IgJiYgZWxlbWVudC5iZWhhdmlvci5sZW5ndGggJiYgIXN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBrbGFzcy5wdXNoKCdiZWhhdmVzLW9uLWNsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQuaGlkZGVuKSB7XG4gICAgICAgICAgICBrbGFzcy5wdXNoKCdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgICAgICBrbGFzcy5wdXNoKGVsZW1lbnQuY2xhc3MpO1xuICAgICAgICByZXR1cm4ga2xhc3Muam9pbignICcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHJlbmRlck1hcmtkb3duKHR4dCkge1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgY29tbW9ubWFyay5QYXJzZXIoKTtcbiAgICAgICAgY29uc3Qgd3JpdGVyID0gbmV3IGNvbW1vbm1hcmsuSHRtbFJlbmRlcmVyKHtzYWZlOiB0cnVlfSk7XG4gICAgICAgIHJldHVybiB3cml0ZXIucmVuZGVyKHJlYWRlci5wYXJzZSh0eHQpKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBlZGl0RWxlbWVudCgpIHtcbiAgICAgICAgZW1pdCgnZWRpdEVsZW1lbnQnLCBbZWxlbWVudCwgaW5kZXgsIGlzQ2FyZF0pO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RyYWdnYWJsZSgpIHtcbiAgICAgICAgaWYgKGlzQ2FyZCkge1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnZWRpdE1vZGUnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZS5lZGl0TW9kZSA9PT0gJ2JnRWRpdCc7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZWRpdE1vZGVDbGljayhldnQpIHtcbiAgICAgICAgY29uc3QgW3N0YXJ0WCwgc3RhcnRZXSA9IHN0YXRlLm1vdXNlRG93bjtcbiAgICAgICAgaWYgKE1hdGguYWJzKGV2dC5zY3JlZW5YIC0gc3RhcnRYKSA8IDEwICYmIE1hdGguYWJzKGV2dC5zY3JlZW5ZIC0gc3RhcnRZKSA8IDEwKSB7XG4gICAgICAgICAgICBlZGl0RWxlbWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VEb3duKGV2dCkge1xuICAgICAgICBlbWl0KCdzdGFydERyYWcnLCBbZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLCBldnQub2Zmc2V0WCwgZXZ0Lm9mZnNldFksIGV2dC50YXJnZXRdKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZUxlYXZlKGV2dCkge1xuICAgICAgICBpZiAoc3RhdGUuZHJhZ0luZm8gfHwgc3RhdGUucmVzaXplSW5mbykge1xuICAgICAgICAgICAgY29uc3QgeWVySW5mbyA9IHN0YXRlLmRyYWdJbmZvID8gc3RhdGUuZHJhZ0luZm8gOiBzdGF0ZS5yZXNpemVJbmZvO1xuICAgICAgICAgICAgaWYgKHllckluZm8udGFyZ2V0ID09IGV2dC50YXJnZXQpIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZVVwKGV2dCkge1xuICAgICAgICBlbWl0KCdmaW5pc2hEcmFnJywgW1xuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyAnbW92ZUVsZW1lbnQnIDogJ3Jlc2l6ZUVsZW1lbnQnLFxuICAgICAgICAgICAgZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLmxlZnQgOiBldnQudGFyZ2V0LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLnRvcCA6IGV2dC50YXJnZXQuc3R5bGUuaGVpZ2h0LFxuICAgICAgICAgICAgaW5kZXhcbiAgICAgICAgXSk7XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50VmlldztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3RvUHh9ID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cblxuY29uc3QgZmllbGRWaWV3ID0gKGZpZWxkLCBuYW1lLCBzdGF0ZSwgZW1pdCwgaXNDYXJkKSA9PiB7XG4gICAgbGV0IGZsZDtcbiAgICBpZiAoZmllbGQudHlwZSA9PSAnc2VsZWN0Jykge1xuICAgICAgICBmbGQgPSBodG1sYDxzZWxlY3QgbmFtZT1cIiR7ZmllbGQubmFtZX1cIlxuICAgICAgICAgICAgb25jaGFuZ2U9XCIkeyhldnQpID0+IGVtaXQoJ2ZpZWxkY2hhbmdlJywgZXZ0LCBmaWVsZCl9XCJcbiAgICAgICAgICAgIGNsYXNzPVwiJHtmaWVsZENsYXNzZXMoKX1cIiAvPlxuICAgICAgICAgICAgJHtmaWVsZC5vcHRpb25zLm1hcCgob3B0KSA9PiB7XG4gICAgICAgICAgICAgICAgbGV0IHNlbGVjdGVkID0gb3B0ID09PSBmaWVsZC52YWx1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJzxvcHRpb24gdmFsdWU9XCInICsgb3B0ICsgJ1wiJyArXG4gICAgICAgICAgICAgICAgICAgIChzZWxlY3RlZCA/ICcgc2VsZWN0ZWQ9XCJzZWxlY3RlZFwiJyA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgICc+JyArIG9wdCArICc8L29wdGlvbj4nXG4gICAgICAgICAgICB9KX1cbiAgICAgICAgPC9zZWxlY3Q+YDtcbiAgICB9IGVsc2UgaWYgKGZpZWxkLnR5cGUgPT0gJ3JhZGlvJyB8fCBmaWVsZC50eXBlID09ICdjaGVja2JveCcpIHtcbiAgICAgICAgLy8gbm90aGluZyByaWdodCBub3cgbXIuIGhlcm1hblxuICAgIH0gZWxzZSBpZiAoZmllbGQudHlwZSA9PSAndGV4dGFyZWEnIHx8IHRvUHgoZmllbGQuaGVpZ2h0KSA+IE1hdGgubWF4KGZpZWxkLnNpemUsIDE1KSkge1xuICAgICAgICBmbGQgPSBodG1sYDx0ZXh0YXJlYSBuYW1lPVwiJHtmaWVsZC5uYW1lfVwiXG4gICAgICAgICAgICB3cmFwPVwidmlydHVhbFwiXG4gICAgICAgICAgICBvbmtleWRvd249XCJcIlxuICAgICAgICAgICAgb25rZXl1cD0keyhldnQpID0+IHtlbWl0KCdmaWVsZEtleVVwJywgW2V2dCwgZmllbGRdKX19XG4gICAgICAgICAgICBvbmtleXByZXNzPVwiXCJcbiAgICAgICAgICAgIG9uY2hhbmdlPVwiJHsoZXZ0KSA9PiBlbWl0KCdmaWVsZGNoYW5nZScsIFtldnQsIGZpZWxkXSl9XCJcbiAgICAgICAgICAgIGNsYXNzPVwiJHtmaWVsZENsYXNzZXMoKX1cIlxuICAgICAgICAgICAgc3R5bGU9XCIke2ZpZWxkU3R5bGVzKCl9XCI+JHtmaWVsZC52YWx1ZX08L3RleHRhcmVhPmA7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZmxkID0gaHRtbGA8aW5wdXQgdHlwZT1cIiR7ZmllbGQudHlwZSA/IGZpZWxkLnR5cGUgOiAndGV4dCd9XCJcbiAgICAgICAgICAgIG5hbWU9XCIke2ZpZWxkLm5hbWV9XCJcbiAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiJHtmaWVsZC5wbGFjZWhvbGRlcn1cIlxuICAgICAgICAgICAgdmFsdWU9XCIke2ZpZWxkLnZhbHVlfVwiXG4gICAgICAgICAgICBvbmtleWRvd249JHsoZXZ0KSA9PiBlbWl0KCdmaWVsZEtleURvd24nLCBbZXZ0LCBmaWVsZF0pfVxuICAgICAgICAgICAgb25rZXl1cD0keyhldnQpID0+IGVtaXQoJ2ZpZWxkS2V5VXAnLCBbZXZ0LCBmaWVsZF0pfVxuICAgICAgICAgICAgb25rZXlwcmVzcz0keyhldnQpID0+IGVtaXQoJ2ZpZWxkS2V5UHJlc3MnLCBbZXZ0LCBmaWVsZF0pfVxuICAgICAgICAgICAgb25jaGFuZ2U9XCIkeyhldnQpID0+IGVtaXQoJ2ZpZWxkY2hhbmdlJywgW2V2dCwgZmllbGRdKX1cIlxuICAgICAgICAgICAgY2xhc3M9XCIke2ZpZWxkQ2xhc3NlcygpfVwiXG4gICAgICAgICAgICBzdHlsZT1cIiR7ZmllbGRTdHlsZXMoKX1cIiAvPlxuICAgICAgICBgO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuZWRpdE1vZGUpIHtcbiAgICAgICAgcmV0dXJuIGh0bWxgPGRpdiBjbGFzcz1cImZpZWxkc2hpbSAke2ZpZWxkQ2xhc3NlcygpfVwiXG4gICAgICAgICAgICAgICAgc3R5bGU9XCIke2ZpZWxkU3R5bGVzKCl9XCJcbiAgICAgICAgICAgICAgICBvbmNsaWNrPSR7KGUpID0+IGVkaXRNb2RlQ2xpY2soZSl9XG4gICAgICAgICAgICAgICAgb25tb3VzZWRvd249JHsoZSkgPT4gbW91c2VEb3duKGUpfVxuICAgICAgICAgICAgICAgIG9ubW91c2VsZWF2ZT0keyhlKSA9PiBtb3VzZUxlYXZlKGUpfVxuICAgICAgICAgICAgICAgIG9ubW91c2V1cD0keyhlKSA9PiBtb3VzZVVwKGUpfT5cbiAgICAgICAgICAgIDxwPiR7ZmllbGQubmFtZX08L3A+XG4gICAgICAgICAgICA8YXNpZGU+VmFsdWU6IDxzcGFuPiR7ZmllbGQudmFsdWV9PC9zcGFuPjwvYXNpZGU+XG4gICAgICAgIDwvZGl2PmA7XG4gICAgfVxuICAgIGlmIChpc0RyYWdnYWJsZSgpIHx8ICFmaWVsZC5oaWRkZW4pIHtcbiAgICAgICAgcmV0dXJuIGZsZDtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG5cbiAgICBmdW5jdGlvbiBjbGlja0hhbmRsZXIoZXZ0KSB7XG4gICAgICAgIGlmIChldnQuYWx0S2V5IHx8IChzdGF0ZS5lZGl0TW9kZSAmJiBpc0RyYWdnYWJsZSgpKSkge1xuICAgICAgICAgICAgZW1pdCgnZWRpdEZpZWxkJywgW2ZpZWxkLCBuYW1lLCBpc0NhcmRdKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGlzRHJhZ2dhYmxlKCkge1xuICAgICAgICBpZiAoaXNDYXJkKSB7XG4gICAgICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBmaWVsZFN0eWxlcygpIHtcbiAgICAgICAgbGV0IHN0ZWV6ID0ge1xuICAgICAgICAgICAgdG9wOiBmaWVsZC50b3AsXG4gICAgICAgICAgICBsZWZ0OiBmaWVsZC5sZWZ0LFxuICAgICAgICAgICAgaGVpZ2h0OiBmaWVsZC5oZWlnaHQsXG4gICAgICAgICAgICB3aWR0aDogZmllbGQud2lkdGgsXG4gICAgICAgICAgICAnYmFja2dyb3VuZC1jb2xvcic6IGZpZWxkLmNvbG9yLFxuICAgICAgICAgICAgJ2ZvbnQtZmFtaWx5JzogZmllbGQuZm9udCxcbiAgICAgICAgICAgICdmb250LXNpemUnOiBmaWVsZC5zaXplLFxuICAgICAgICAgICAgJ2ZvbnQtc3R5bGUnOiBmaWVsZC5zdHlsZSxcbiAgICAgICAgICAgIGNvbG9yOiBmaWVsZC50ZXh0Q29sb3JcbiAgICAgICAgfTtcbiAgICAgICAgaWYgKHN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBzdGVlei5oZWlnaHQgPSB0b1B4KGZpZWxkLmhlaWdodCkgPj0gNDAgPyBzdGVlei5oZWlnaHQgOiAnNDBweCc7XG4gICAgICAgICAgICBzdGVlei53aWR0aCA9IHRvUHgoZmllbGQud2lkdGgpID49IDQwID8gc3RlZXoud2lkdGggOiAnNDBweCc7XG4gICAgICAgICAgICBpZiAoIXN0ZWV6WydiYWNrZ3JvdW5kLWNvbG9yJ10pIHtcbiAgICAgICAgICAgICAgICBzdGVlelsnYmFja2dyb3VuZC1jb2xvciddID0gJyNkZGQnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBPYmplY3Qua2V5cyhzdGVleikubWFwKChrZXkpID0+IChrZXkgKyAnOicgKyBzdGVleltrZXldICsgJzsnKSkuam9pbignJyk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZmllbGRDbGFzc2VzKCkge1xuICAgICAgICBjb25zdCBrbGFzcyA9IFtdO1xuICAgICAgICBpZiAoaXNEcmFnZ2FibGUoKSkge1xuICAgICAgICAgICAga2xhc3MucHVzaCgnbW92YWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChmaWVsZC5oaWRkZW4pIHtcbiAgICAgICAgICAgIGtsYXNzLnB1c2goJ2hpZGRlbicpO1xuICAgICAgICB9XG4gICAgICAgIGtsYXNzLnB1c2goZmllbGRbJ2NsYXNzJ10pO1xuICAgICAgICByZXR1cm4ga2xhc3Muam9pbignICcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVkaXRNb2RlQ2xpY2soZXZ0KSB7XG4gICAgICAgIGNvbnN0IFtzdGFydFgsIHN0YXJ0WV0gPSBzdGF0ZS5tb3VzZURvd247XG4gICAgICAgIGlmIChNYXRoLmFicyhldnQuc2NyZWVuWCAtIHN0YXJ0WCkgPCAxMCAmJiBNYXRoLmFicyhldnQuc2NyZWVuWSAtIHN0YXJ0WSkgPCAxMCkge1xuICAgICAgICAgICAgZW1pdCgnZWRpdEZpZWxkJywgW2ZpZWxkLCBuYW1lLCBpc0NhcmRdKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5kcmFnSW5mbyA9IG51bGw7XG4gICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSBudWxsO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdXNlRG93bihldnQpIHtcbiAgICAgICAgZW1pdCgnc3RhcnREcmFnJywgW2V2dC5zY3JlZW5YLCBldnQuc2NyZWVuWSwgZXZ0Lm9mZnNldFgsIGV2dC5vZmZzZXRZLCBldnQudGFyZ2V0XSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VMZWF2ZShldnQpIHtcbiAgICAgICAgaWYgKHN0YXRlLmRyYWdJbmZvIHx8IHN0YXRlLnJlc2l6ZUluZm8pIHtcbiAgICAgICAgICAgIGNvbnN0IHllckluZm8gPSBzdGF0ZS5kcmFnSW5mbyA/IHN0YXRlLmRyYWdJbmZvIDogc3RhdGUucmVzaXplSW5mbztcbiAgICAgICAgICAgIGlmICh5ZXJJbmZvLnRhcmdldCA9PSBldnQudGFyZ2V0KSB7XG4gICAgICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPSBudWxsO1xuICAgICAgICAgICAgICAgIHN0YXRlLnJlc2l6ZUluZm8gPSBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbW91c2VVcChldnQpIHtcbiAgICAgICAgZW1pdCgnZmluaXNoRHJhZycsIFtcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gJ21vdmVGaWVsZCcgOiAncmVzaXplRmllbGQnLFxuICAgICAgICAgICAgZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLmxlZnQgOiBldnQudGFyZ2V0LnN0eWxlLndpZHRoLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLnRvcCA6IGV2dC50YXJnZXQuc3R5bGUuaGVpZ2h0LFxuICAgICAgICAgICAgbmFtZVxuICAgICAgICBdKTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZmllbGRWaWV3O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZ29Ub05leHRDYXJkOiByZXF1aXJlKCcuL2dvVG9OZXh0Q2FyZENvbXBvbmVudCcpLFxuICAgIGdvVG9QcmV2aW91c0NhcmQ6IHJlcXVpcmUoJy4vZ29Ub1ByZXZpb3VzQ2FyZENvbXBvbmVudCcpLFxuICAgICdpZic6IG51bGwsIC8vIGhlcmUgdG8gYmUgY291bnRlZCwgYnV0IG5vdCBhY3R1YWxseSBoYW5kbGVkIGJ5IGEgc2VwLiBjb21wb25lbnRcbiAgICBjbGlja0VsZW1lbnQ6IHJlcXVpcmUoJy4vY2xpY2tFbGVtZW50Q29tcG9uZW50JyksXG4gICAganVtcFRvOiByZXF1aXJlKCcuL2p1bXBUb0NvbXBvbmVudCcpLFxuICAgIHJlbW92ZVRydXRoOiByZXF1aXJlKCcuL3JlbW92ZVRydXRoQ29tcG9uZW50JyksXG4gICAgc2V0VHJ1dGg6IHJlcXVpcmUoJy4vc2V0VHJ1dGhDb21wb25lbnQnKSxcbiAgICBzdGFydFRhbGx5OiByZXF1aXJlKCcuL3N0YXJ0VGFsbHlDb21wb25lbnQnKSxcbiAgICBzZXRUYWxseTogcmVxdWlyZSgnLi9zZXRUYWxseUNvbXBvbmVudCcpLFxuICAgIGxpbmtUbzogcmVxdWlyZSgnLi9saW5rVG9Db21wb25lbnQnKSxcbiAgICBwbGF5U291bmQ6IHJlcXVpcmUoJy4vcGxheVNvdW5kQ29tcG9uZW50Jylcbn07XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuY29uc3QgY2FyZFN0eWxlVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICBsZXQgYmcgPSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZCgpO1xuICBsZXQgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgnZW52UHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgICAke2ZpZWxkRm9yKCduYW1lJywnTmFtZScpfVxuICAgICAgPHA+PGxhYmVsIGZvcj1cImNvbG9yXCI+Q29sb3I8L2xhYmVsPjxiciAvPlxuICAgICAgICA8aW5wdXQgdHlwZT1cImNvbG9yXCJcbiAgICAgICAgICBvbmNoYW5nZT0ke2NoYW5nZUhhbmRsZXJ9XG4gICAgICAgICAgbmFtZT1cImNvbG9yXCJcbiAgICAgICAgICB2YWx1ZT1cIiR7YmcuY29sb3IgfHwgJyNGRkZGRkYnfVwiIC8+XG4gICAgICAgIDxidXR0b24gb25jbGljaz0keygpID0+IHtcbiAgICAgICAgICAgIGVtaXQoJ2VudlByb3BlcnR5Q2hhbmdlJywge3RhcmdldDoge25hbWU6ICdjb2xvcicsIHZhbHVlOiAnJ319KTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfX0+XG4gICAgICAgICAgQ2xlYXJcbiAgICAgICAgPC9idXR0b24+XG4gICAgICA8L3A+XG4gICAgPC9mb3JtPmA7XG5cbiAgZnVuY3Rpb24gZmllbGRGb3IoYXR0TmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICByZXR1cm4gaHRtbGA8cD48bGFiZWwgZm9yPVwiJHthdHROYW1lfVwiPiR7ZGlzcGxheU5hbWV9PC9sYWJlbD48YnIgLz5cbiAgICA8aW5wdXQgdHlwZT1cInRleHRcIlxuICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgbmFtZT1cIiR7YXR0TmFtZX1cIlxuICAgICAgdmFsdWU9XCIke2JnW2F0dE5hbWVdfVwiIC8+XG4gICAgPC9wPmA7XG4gIH1cblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjYXJkU3R5bGVWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbmNvbnN0IGNhcmRTdHlsZVZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgbGV0IGNhcmQgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpO1xuICBsZXQgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgnZW52UHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgICAke2ZpZWxkRm9yKCduYW1lJywnTmFtZScpfVxuICAgICAgPHA+PGxhYmVsIGZvcj1cImNvbG9yXCI+Q29sb3I8L2xhYmVsPjxiciAvPlxuICAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgICAgbmFtZT1cImNvbG9yXCJcbiAgICAgICAgICAgdmFsdWU9XCIke2NhcmQuY29sb3IgfHwgJyNGRkZGRkYnfVwiIC8+XG4gICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge1xuICAgICAgICAgICBlbWl0KCdlbnZQcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiAnY29sb3InLCB2YWx1ZTogJyd9fSk7XG4gICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICB9fT5cbiAgICAgICAgIENsZWFyXG4gICAgICAgPC9idXR0b24+XG4gICAgICA8L3A+XG5cbiAgICAgIDxkaXYgc3R5bGU9XCJ0ZXh0LWFsaWduOmNlbnRlclwiPlxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHtkZWxldGVIYW5kbGVyfT5EZWxldGUgQ2FyZDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9mb3JtPmA7XG5cbiAgZnVuY3Rpb24gZmllbGRGb3IoYXR0TmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICByZXR1cm4gaHRtbGA8cD48bGFiZWwgZm9yPVwiJHthdHROYW1lfVwiPiR7ZGlzcGxheU5hbWV9PC9sYWJlbD48YnIgLz5cbiAgICA8aW5wdXQgdHlwZT1cInRleHRcIlxuICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgbmFtZT1cIiR7YXR0TmFtZX1cIlxuICAgICAgdmFsdWU9XCIke2NhcmRbYXR0TmFtZV19XCIgLz5cbiAgICA8L3A+YDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUNhcmQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNhcmRTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IHtzZWxlY3RPcHRpb259ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmZ1bmN0aW9uIGNsaWNrRWxlbWVudChzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICBjb25zdCBjYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmQoKTtcbiAgICBjb25zdCBiZyA9IHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kKCk7XG5cbiAgICBjb25zdCBuYW1lZEVsbXMgPSBlbG1zV2l0aE5hbWUoY2FyZCkuY29uY2F0KGVsbXNXaXRoTmFtZShiZykpO1xuXG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+ZG8gdGhlIEJlaGF2aW9yIG9mIHRoZSBlbGVtZW50IG5hbWVkXG4gICAgICAgICAgICA8c2VsZWN0IG5hbWU9XCJlbGVtZW50VG9DbGlja1wiXG4gICAgICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIHsnY2xpY2tFbGVtZW50JzogZS50YXJnZXQudmFsdWV9XSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgYmVoYXYuY2xpY2tFbGVtZW50ID09PSBudWxsLCAtMSl9XG4gICAgICAgICAgICAgICAgJHtuYW1lZEVsbXMubWFwKChuYW1lKSA9PlxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RPcHRpb24obmFtZSwgYmVoYXYuY2xpY2tFbGVtZW50KVxuICAgICAgICAgICAgICAgICl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG5cbiAgICBmdW5jdGlvbiBlbG1zV2l0aE5hbWUoZW52KSB7XG4gICAgICAgIHJldHVybiBlbnYuZWxlbWVudHMuZmlsdGVyKChlbG0pID0+XG4gICAgICAgICAgICB0eXBlb2YgZWxtLm5hbWUgIT09ICd1bmRlZmluZWQnICYmIGVsbS5uYW1lICE9PSAnJ1xuICAgICAgICApLm1hcCgoZWxtKSA9PiBlbG0ubmFtZSk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsaWNrRWxlbWVudDtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3BhcnNlQW5kUnVuQmVoYXZpb3JzLCBiZWhhdmlvckxpc3QsIGJlaGF2aW9yfSA9IHJlcXVpcmUoJy4uL2JlaGF2aW9yJyk7XG5jb25zdCB7Z2V0UGF0aH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgZWRpdEJlaGF2aW9yVmlldyA9IChzdGF0ZSwgZW1pdCkgPT4ge1xuICBjb25zdCB0aGluZyA9IHN0YXRlLmdldEVkaXRlZE9iamVjdCgpO1xuICBjb25zdCBraWNrb2ZmRGVzY3JpcHRvciA9IFsnY2FyZCcsJ2JhY2tncm91bmQnXS5pbmNsdWRlcyhzdGF0ZS5nZXRFZGl0ZWRPYmplY3RUeXBlKCkpXG4gICAgPyAnYXJyaXZhbCdcbiAgICA6ICdjbGljayc7XG4gIC8vIHRoaXMgaXMgYmFkIGJ1dCB3aGF0ZXZlclxuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgIDxkaXY+T24gJHtraWNrb2ZmRGVzY3JpcHRvcn0sXG5cbiAgICAke3RoaW5nLmJlaGF2aW9yICYmIHRoaW5nLmJlaGF2aW9yLmxlbmd0aFxuICAgICAgICA/IGJlaGF2aW9yTGlzdChzdGF0ZSwgZW1pdCwgdGhpbmcuYmVoYXZpb3IsIHN0YXRlLmVkaXRpbmdQYXRoLmNvbmNhdChbJ2JlaGF2aW9yJ10pKVxuICAgICAgICA6IGh0bWxgPHVsIGNsYXNzPVwiYmVoYXZpb3JzXCI+XG4gICAgICAgICAgICA8bGk+JHtiZWhhdmlvcihzdGF0ZSwgZW1pdCwgc3RhdGUuZWRpdGluZ1BhdGguY29uY2F0KFsnYmVoYXZpb3InLCAwXSkpfTwvbGk+XG4gICAgICAgIDwvdWw+YFxuICAgIH1cblxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJkZWJ1Zy1yZWFkb3V0XCI+XG4gICAgPHRhYmxlPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgICAgQ3VycmVudCB0cnV0aHM6XG4gICAgICAgICAgICAgICAgPHVsPlxuICAgICAgICAgICAgICAgICAgJHtPYmplY3Qua2V5cyhzdGF0ZS50cnV0aHMpLm1hcCgodGgpID0+IGh0bWxgPGxpPiR7dGh9PC9saT5gKX1cbiAgICAgICAgICAgICAgICA8L3VsPlxuICAgICAgICAgICAgPC90ZD5cbiAgICAgICAgICAgICR7c3RhdGUudGFsbGllc1xuICAgICAgICAgICAgICA/IGh0bWxgPHRkPlxuICAgICAgICAgICAgICAgIEN1cnJlbnQgdGFsbGllczpcbiAgICAgICAgICAgICAgICA8dWw+XG4gICAgICAgICAgICAgICAgICAke09iamVjdC5rZXlzKHN0YXRlLnRhbGxpZXMpLm1hcCgodGwpID0+IGh0bWxgPGxpPiR7dGx9OiAke3N0YXRlLnRhbGxpZXNbdGxdfTwvbGk+YCl9XG4gICAgICAgICAgICAgICAgPC91bD5cbiAgICAgICAgICAgICAgPC90ZD5gXG4gICAgICAgICAgICAgIDogbnVsbH1cbiAgICAgICAgPC90cj5cbiAgICA8L3RhYmxlPlxuXG4gICAgICA8YnV0dG9uIG9uY2xpY2s9JHsoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcGFyc2VBbmRSdW5CZWhhdmlvcnMoc3RhdGUsIGVtaXQsIHRoaW5nLmJlaGF2aW9yKTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcbiAgICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH19fT5UZXN0IGJlaGF2aW9yPC9idXR0b24+XG4gICAgPC9kaXY+XG4gIDwvZm9ybT5gO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGVkaXRCZWhhdmlvclZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cbmNvbnN0IHtzZWxlY3RPcHRpb24sIGNoZWNrQm94fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBlbGVtZW50U3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGxldCBlbG0gPSBzdGF0ZS5nZXRFZGl0ZWRPYmplY3QoKTtcbiAgbGV0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ3Byb3BlcnR5Q2hhbmdlJywgZXZlbnQpO1xuXG4gIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgJHtmaWVsZEZvcignbmFtZScsJ05hbWUnKX1cbiAgICAgIDx0YWJsZT5cbiAgICAgICAgPHRyPlxuICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ3RvcCcsJ1RvcCcpfTwvdGQ+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcignbGVmdCcsJ0xlZnQnKX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcignaGVpZ2h0JywnSGVpZ2h0Jyl9PC90ZD5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCd3aWR0aCcsJ1dpZHRoJyl9PC90ZD5cbiAgICAgICAgPC90cj5cbiAgICAgICAgPHRyPlxuICAgICAgICAgICAgPHRkPlxuICAgICAgICAgICAgICA8cD48bGFiZWwgZm9yPVwiY29sb3JcIj5Db2xvcjwvbGFiZWw+PGJyIC8+XG4gICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY29sb3JcIlxuICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgICAgICAgICAgICBuYW1lPVwiY29sb3JcIlxuICAgICAgICAgICAgICAgIHZhbHVlPVwiJHtlbG0uY29sb3IgfHwgJyMzMzMzMzMnfVwiIC8+XG4gICAgICAgICAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7Y2xlYXJIYW5kbGVyRm9yKCdjb2xvcicpfT5cbiAgICAgICAgICAgICAgICAgIENsZWFyXG4gICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDwvdGQ+XG4gICAgICAgICAgICA8dGQ+XG4gICAgICAgICAgICAgIDxwPjxsYWJlbCBmb3I9XCJ0ZXh0Q29sb3JcIj5UZXh0IENvbG9yPC9sYWJlbD48YnIgLz5cbiAgICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJjb2xvclwiXG4gICAgICAgICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgICAgICAgIG5hbWU9XCJ0ZXh0Q29sb3JcIlxuICAgICAgICAgICAgICAgIHZhbHVlPVwiJHtlbG0udGV4dENvbG9yIHx8ICcjMDAwMDAwJ31cIiAvPlxuICAgICAgICAgICAgICAgIDxidXR0b24gb25jbGljaz0ke2NsZWFySGFuZGxlckZvcigndGV4dENvbG9yJyl9PlxuICAgICAgICAgICAgICAgICAgIENsZWFyXG4gICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICA8L3RkPlxuICAgICAgICA8L3RyPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ2ZvbnQnLCdGb250Jyl9PC90ZD5cbiAgICAgICAgICA8dGQ+JHtmaWVsZEZvcignc2l6ZScsJ0ZvbnQgU2l6ZScpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgPC90YWJsZT5cblxuICAgICAgPHA+PGxhYmVsIGZvcj1cInRleHRcIj5UZXh0PC9sYWJlbD5cbiAgICAgICh5b3UgY2FuIHVzZSBtb3N0IG9mIDxhIHRhcmdldD1cIl9ibGFua1wiIGhyZWY9XCJodHRwOi8vY29tbW9ubWFyay5vcmcvaGVscC9cIj5NYXJrZG93bjwvYT4pPGJyIC8+XG4gICAgICA8dGV4dGFyZWEgY2xhc3M9XCJlbG10ZXh0XCIgd3JhcD1cInZpcnR1YWxcIlxuICAgICAgICBvbmNoYW5nZT0ke2NoYW5nZUhhbmRsZXJ9XG4gICAgICAgIG5hbWU9XCJ0ZXh0XCI+JHtlbG0udGV4dCB8fCAnJ308L3RleHRhcmVhPlxuICAgICAgPC9wPlxuXG4gICAgICAke2NoZWNrQm94KCdIaWRkZW4nLCBlbG0uaGlkZGVuLFxuICAgICAgICAoZSkgPT4gZW1pdCgncHJvcGVydHlDaGFuZ2UnLCB7dGFyZ2V0OntuYW1lOidoaWRkZW4nLHZhbHVlOiBlLnRhcmdldC5jaGVja2VkfX0pKX1cblxuICAgICAgJHtmaWVsZEZvcignY2xhc3MnLCdDbGFzcycpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEVsZW1lbnQ8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgcmV0dXJuIGh0bWxgPHA+PGxhYmVsIGZvcj1cIiR7YXR0TmFtZX1cIj4ke2Rpc3BsYXlOYW1lfTwvbGFiZWw+PGJyIC8+XG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgIG9uY2hhbmdlPSR7Y2hhbmdlSGFuZGxlcn1cbiAgICAgIG5hbWU9XCIke2F0dE5hbWV9XCJcbiAgICAgIHZhbHVlPVwiJHtlbG1bYXR0TmFtZV19XCIgLz5cbiAgICA8L3A+YDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNsZWFySGFuZGxlckZvcihwcm9wTmFtZSwgYnV0dG9ueSA9IHRydWUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBlbWl0KCdwcm9wZXJ0eUNoYW5nZScsIHt0YXJnZXQ6IHtuYW1lOiBwcm9wTmFtZSwgdmFsdWU6ICcnfX0pO1xuICAgICAgaWYgKGJ1dHRvbnkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbGV0ZUhhbmRsZXIoKSB7XG4gICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgIGVtaXQoJ2RlbGV0ZUVsZW1lbnQnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlbGVtZW50U3R5bGVWaWV3O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9uLCBjaGVja0JveH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgZmllbGRTdHlsZVZpZXcgPSAoc3RhdGUsIGVtaXQpID0+IHtcbiAgbGV0IGZsZCA9IHN0YXRlLmdldEVkaXRlZE9iamVjdCgpO1xuICBsZXQgY2hhbmdlSGFuZGxlciA9IChldmVudCkgPT4gZW1pdCgncHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG5cbiAgcmV0dXJuIGh0bWxgPGZvcm0+XG4gICAgICAke2ZpZWxkRm9yKCduYW1lJywnTmFtZScpfVxuICAgICAgPHRhYmxlPlxuICAgICAgICA8dHI+XG4gICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcigndG9wJywnVG9wJyl9PC90ZD5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdsZWZ0JywnTGVmdCcpfTwvdGQ+XG4gICAgICAgIDwvdHI+XG4gICAgICAgIDx0cj5cbiAgICAgICAgICAgIDx0ZD4ke2ZpZWxkRm9yKCdoZWlnaHQnLCdIZWlnaHQnKX08L3RkPlxuICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoJ3dpZHRoJywnV2lkdGgnKX08L3RkPlxuICAgICAgICA8L3RyPlxuICAgIDwvdGFibGU+XG4gICAgICA8cD48bGFiZWwgZm9yPVwidHlwZVwiPlR5cGU8L2xhYmVsPjxiciAvPlxuICAgICAgICA8c2VsZWN0IG5hbWU9XCJ0eXBlXCIgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfT5cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdUZXh0JywgZmxkLnR5cGUpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ01lbnUnLCBmbGQudHlwZSl9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgPC9wPlxuICAgICAgJHtmbGQudHlwZT09PSdNZW51JyA/IG9wdGlvbnNGaWVsZCgpIDogbnVsbH1cblxuICAgICAgJHtjaGVja0JveCgnSGlkZGVuJywgZmxkLmhpZGRlbixcbiAgICAgICAgKGUpID0+IGVtaXQoJ3Byb3BlcnR5Q2hhbmdlJywge3RhcmdldDp7bmFtZTonaGlkZGVuJyx2YWx1ZTogZS50YXJnZXQuY2hlY2tlZH19KSl9XG5cbiAgICAgICR7ZmllbGRGb3IoJ2NsYXNzJywnQ2xhc3MnKX1cblxuICAgICAgPGRpdiBzdHlsZT1cInRleHQtYWxpZ246Y2VudGVyXCI+XG4gICAgICAgIDxidXR0b24gb25jbGljaz0ke2RlbGV0ZUhhbmRsZXJ9PkRlbGV0ZSBGaWVsZDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9mb3JtPmA7XG5cbiAgZnVuY3Rpb24gZmllbGRGb3IoYXR0TmFtZSwgZGlzcGxheU5hbWUpIHtcbiAgICByZXR1cm4gaHRtbGA8cD48bGFiZWwgZm9yPVwiJHthdHROYW1lfVwiPiR7ZGlzcGxheU5hbWV9PC9sYWJlbD48YnIgLz5cbiAgICA8aW5wdXQgdHlwZT1cInRleHRcIlxuICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgbmFtZT1cIiR7YXR0TmFtZX1cIlxuICAgICAgdmFsdWU9XCIke2ZsZFthdHROYW1lXSB8fCAnJ31cIiAvPlxuICAgIDwvcD5gO1xuXG4gIH1cblxuICBmdW5jdGlvbiBkZWxldGVIYW5kbGVyKCkge1xuICAgICAgaWYgKHdpbmRvdy5jb25maXJtKFwiU2VyaW91c2x5PyAoVGhlcmUncyBubyBVbmRvIHlldClcIikpIHtcbiAgICAgICAgICBlbWl0KCdkZWxldGVGaWVsZCcpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgZnVuY3Rpb24gb3B0aW9uc0ZpZWxkKCkge1xuICAgIHJldHVybiBodG1sYDxwPjxsYWJlbCBmb3I9XCJvcHRpb25zXCI+T3B0aW9uczwvbGFiZWw+PGJyIC8+XG4gICAgICA8dGV4dGFyZWEgbmFtZT1cIm9wdGlvbnNcIiBvbmNoYW5nZT0ke29wdGlvbkhhbmRsZXJ9PiR7ZmxkLm9wdGlvbnMuam9pbihcIlxcblwiKX08L3RleHRhcmVhPlxuICAgIDwvcD5gO1xuXG4gICAgZnVuY3Rpb24gb3B0aW9uSGFuZGxlcihlKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gZS50YXJnZXQudmFsdWUuc3BsaXQoXCJcXG5cIikubWFwKChsaW5lKSA9PiBsaW5lLnRyaW0oKSk7XG4gICAgICBlbWl0KCdzZXRGaWVsZE9wdGlvbnMnLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZmllbGRTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5jb25zdCB7c2VsZWN0T3B0aW9uLCBjaGVja0JveH0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuZnVuY3Rpb24gZ29Ub05leHRDYXJkKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIHJldHVybiBodG1sYDxkaXY+XG4gICAgICAgIDxzZWN0aW9uPlxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwiZ29Ub05leHRDYXJkXCJcbiAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLFxuICAgICAgICAgICAgICAgICAgICB7J2dvVG9OZXh0Q2FyZCc6IGUudGFyZ2V0LnZhbHVlLCAnd3JhcCc6IGJlaGF2LndyYXAgPyB0cnVlIDogZmFsc2V9XG4gICAgICAgICAgICAgICAgXSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdzdGFjaycsICdpbiB0aGUgc3RhY2snLCBiZWhhdi5nb1RvTmV4dENhcmQpfVxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdiZycsICdpbiB0aGlzIGJhY2tncm91bmQnLCBiZWhhdi5nb1RvTmV4dENhcmQpfVxuICAgICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICAgICAke2NoZWNrQm94KCd3cmFwIGFyb3VuZCcsIGJlaGF2LndyYXAsIChlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLFxuICAgICAgICAgICAgICAgIHsnZ29Ub05leHRDYXJkJzogYmVoYXYuZ29Ub05leHRDYXJkLCAnd3JhcCc6IGUudGFyZ2V0LmNoZWNrZWR9XG4gICAgICAgICAgICBdKSl9XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGdvVG9OZXh0Q2FyZDtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IHtzZWxlY3RPcHRpb24sIGNoZWNrQm94fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBnb1RvUHJldmlvdXNDYXJkKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIHJldHVybiBodG1sYDxkaXY+XG4gICAgICAgIDxzZWN0aW9uPlxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwiZ29Ub05leHRDYXJkXCJcbiAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLFxuICAgICAgICAgICAgICAgICAgICB7J2dvVG9OZXh0Q2FyZCc6IGUudGFyZ2V0LnZhbHVlLCAnd3JhcCc6IGJlaGF2LndyYXAgPyB0cnVlIDogZmFsc2V9XG4gICAgICAgICAgICAgICAgXSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdzdGFjaycsICdpbiB0aGUgc3RhY2snLCBiZWhhdi5nb1RvUHJldmlvdXNDYXJkKX1cbiAgICAgICAgICAgICAgICAke3NlbGVjdE9wdGlvbignYmcnLCAnaW4gdGhpcyBiYWNrZ3JvdW5kJywgYmVoYXYuZ29Ub1ByZXZpb3VzQ2FyZCl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgICAgICR7Y2hlY2tCb3goJ3dyYXAgYXJvdW5kJywgYmVoYXYud3JhcCwgKGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsXG4gICAgICAgICAgICAgICAgeydnb1RvTmV4dENhcmQnOiBiZWhhdi5nb1RvTmV4dENhcmQsICd3cmFwJzogZS50YXJnZXQuY2hlY2tlZH1cbiAgICAgICAgICAgIF0pKX1cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZ29Ub1ByZXZpb3VzQ2FyZDtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3NlbGVjdE9wdGlvbiwgY2hlY2tCb3gsIGdldFBhdGgsIGZpZWxkc1dpdGhWYWx1ZXN9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmZ1bmN0aW9uIGNvbmRpdGlvbihzdGF0ZSwgZW1pdCwgY29uZCwgcGF0aCkge1xuICAgIGxldCBjb25qdW5jdGlvbiA9ICdhbmQnO1xuICAgIGlmIChwYXRoW3BhdGgubGVuZ3RoIC0gMV0gPT0gJ29yJykge1xuICAgICAgICBjb25qdW5jdGlvbiA9ICdvcic7XG4gICAgfVxuXG4gICAgbGV0IGNsYXVzZXM7XG4gICAgaWYgKGNvbmQubGVuZ3RoKSB7XG4gICAgICAgIGNsYXVzZXMgPSBjb25kLm1hcCgoY2xhdXNlLCBpbmRleCkgPT5cbiAgICAgICAgICAgIGh0bWxgPGRpdj5cbiAgICAgICAgICAgICAgICAke2luZGV4ID09PSAwID8gJycgOiBodG1sYDxhc2lkZT4ke2Nvbmp1bmN0aW9ufTwvYXNpZGU+YH1cbiAgICAgICAgICAgICAgICAke2NvbmRpdGlvbkNsYXVzZShzdGF0ZSwgZW1pdCwgY2xhdXNlLCBwYXRoLmNvbmNhdChbaW5kZXhdKSl9XG4gICAgICAgICAgICA8L2Rpdj5gXG4gICAgICAgICk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2xhdXNlcyA9IGh0bWxgPGRpdj5cbiAgICAgICAgICAgICR7Y29uZGl0aW9uQ2xhdXNlKHN0YXRlLCBlbWl0LCBudWxsLCBwYXRoLmNvbmNhdChbMF0pKX1cbiAgICAgICAgPC9kaXY+YDtcbiAgICB9XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgJHtjbGF1c2VzfVxuICAgICAgICA8YnV0dG9uIG9uY2xpY2s9JHthZGRDbGF1c2VIYW5kbGVyfT4rPC9idXR0b24+XG4gICAgPC9kaXY+YDtcblxuICAgIGZ1bmN0aW9uIGFkZENsYXVzZUhhbmRsZXIoKSB7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGNvbmQuY29uY2F0KFtudWxsXSldKTtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxuY29uc3QgY2xhdXNlT2JqcyA9IHtcbiAgICB0cnV0aDogJycsXG4gICAgZmllbGQ6IHt9LFxuICAgIG9yOiB7J29yJzogW119LFxuICAgIHRhbGx5OiB7dGFsbHk6IHt9fVxufTtcblxuZnVuY3Rpb24gY29uZGl0aW9uQ2xhdXNlKHN0YXRlLCBlbWl0LCBjbGF1c2UsIHBhdGgpIHtcbiAgICBjb25zdCBpbmRleCA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTtcblxuICAgIGNvbnN0IHN1YmplY3RIYW5kbGVyID0gKGUpID0+IHtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgY2xhdXNlT2Jqc1tlLnRhcmdldC52YWx1ZV1dKTtcbiAgICB9XG5cbiAgICBjb25zdCB2YWx1ZUhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBlLnRhcmdldC52YWx1ZV0pO1xuICAgIH1cblxuICAgIGNvbnN0IGlzTnVsbCA9IGNsYXVzZSA9PT0gbnVsbDtcbiAgICBjb25zdCBpc1RydXRoID0gdHlwZW9mIGNsYXVzZSA9PT0gJ3N0cmluZyc7XG4gICAgY29uc3QgaXNUYWxseSA9IHR5cGVvZiBjbGF1c2UgPT09ICdvYmplY3QnICYmXG4gICAgICAgIGNsYXVzZSAhPT0gbnVsbCAmJlxuICAgICAgICBjbGF1c2UudGFsbHk7XG4gICAgY29uc3QgaXNGaWVsZCA9IHR5cGVvZiBjbGF1c2UgPT09ICdvYmplY3QnICYmXG4gICAgICAgIGNsYXVzZSAhPT0gbnVsbCAmJlxuICAgICAgICB0eXBlb2YgY2xhdXNlLm9yID09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICFpc1RhbGx5O1xuICAgIGNvbnN0IG9ySXNUaGVyZSA9IGNsYXVzZSAhPT0gbnVsbCAmJlxuICAgICAgICB0eXBlb2YgY2xhdXNlID09ICdvYmplY3QnICYmXG4gICAgICAgIHR5cGVvZiBjbGF1c2Uub3IgIT0gJ3VuZGVmaW5lZCc7XG4gICAgY29uc3QgdW5pZmllZENvbXBhcmVWYWx1ZSA9IGlzTnVsbFxuICAgICAgICA/IG51bGxcbiAgICAgICAgOiAoaXNUcnV0aFxuICAgICAgICAgICAgPyAndHJ1dGgnXG4gICAgICAgICAgICA6IChpc0ZpZWxkXG4gICAgICAgICAgICAgICAgPyAnZmllbGQnXG4gICAgICAgICAgICAgICAgOiAoaXNUYWxseVxuICAgICAgICAgICAgICAgICAgICA/ICd0YWxseSdcbiAgICAgICAgICAgICAgICAgICAgOiAnb3InKSkpO1xuXG4gICAgcmV0dXJuIGh0bWxgPHNlY3Rpb24+XG4gICAgICAgIDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke3VuaWZpZWRDb21wYXJlVmFsdWV9XCIgb25jaGFuZ2U9JHtzdWJqZWN0SGFuZGxlcn0+XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIHVuaWZpZWRDb21wYXJlVmFsdWUpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ3RydXRoJywgJ3RoZXJlIGlzIGEgVHJ1dGggbmFtZWQnLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdmaWVsZCcsICd0aGUgZmllbGQgbmFtZWQnLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCd0YWxseScsICd0aGUgdGFsbHkgbmFtZWQnLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdvcicsICdlaXRoZXInLCB1bmlmaWVkQ29tcGFyZVZhbHVlKX1cbiAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgICR7aXNUcnV0aFxuICAgICAgICAgICAgPyBodG1sYDxpbnB1dCB0eXBlPVwidGV4dFwiIG9uY2hhbmdlPSR7dmFsdWVIYW5kbGVyfSB2YWx1ZT1cIiR7Y2xhdXNlfVwiIC8+YFxuICAgICAgICAgICAgOiBudWxsfVxuICAgICAgICAke2lzVGFsbHlcbiAgICAgICAgICAgID8gdGFsbHlDbGF1c2Uoc3RhdGUsIGVtaXQsIGNsYXVzZS50YWxseSwgcGF0aC5jb25jYXQoWyd0YWxseSddKSlcbiAgICAgICAgICAgIDogbnVsbH1cbiAgICAgICAgJHtpc0ZpZWxkXG4gICAgICAgICAgICA/IGZpZWxkQ2xhdXNlKHN0YXRlLCBlbWl0LCBjbGF1c2UsIHBhdGgpXG4gICAgICAgICAgICA6IG51bGx9XG4gICAgICAgICR7b3JJc1RoZXJlXG4gICAgICAgICAgICA/IGNvbmRpdGlvbihzdGF0ZSwgZW1pdCwgY2xhdXNlLm9yLCBwYXRoLmNvbmNhdChbJ29yJ10pKVxuICAgICAgICAgICAgOiBudWxsfVxuICAgICAgICAke2luZGV4ID4gMFxuICAgICAgICAgICAgPyBodG1sYDxidXR0b24gb25jbGljaz0keyhlKSA9PiB7cmVtb3ZlQ2xhdXNlKGluZGV4KTtyZXR1cm4gZmFsc2U7fX0gY2xhc3M9XCJyZW1vdmUtY2xhdXNlXCI+LTwvYnV0dG9uPmBcbiAgICAgICAgICAgIDogbnVsbH1cbiAgICA8L3NlY3Rpb24+YDtcblxuICAgIGZ1bmN0aW9uIHJlbW92ZUNsYXVzZShpbmRleCkge1xuICAgICAgICBjb25zdCBjb25kaXRpb25QYXRoID0gcGF0aC5zbGljZSgwLCBwYXRoLmxlbmd0aCAtIDEpO1xuICAgICAgICBjb25zdCBjb25kaXRpb24gPSBnZXRQYXRoKHN0YXRlLCBjb25kaXRpb25QYXRoKTtcbiAgICAgICAgY29uZGl0aW9uLnNwbGljZShwYXRoW3BhdGgubGVuZ3RoIC0gMV0sIDEpO1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtjb25kaXRpb25QYXRoLCBjb25kaXRpb25dKTtcbiAgICAgICAgLy8gc2VlIHRoaXMga2luZGEgdGhpbmcgc2hvdWxkIGJlIGluIGEgc3RvcmVcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGZpZWxkQ2xhdXNlKHN0YXRlLCBlbWl0LCBjbGF1c2UsIHBhdGgpIHtcbiAgICBsZXQgZmlyc3RLZXkgPSBudWxsO1xuICAgIGxldCBjb21wYXJlT2JqID0gbnVsbDtcbiAgICBsZXQgY29tcGFyYXRvciA9IG51bGw7XG4gICAgbGV0IGNvbXBhcmVWYWx1ZSA9IG51bGw7XG4gICAgaWYgKE9iamVjdC5rZXlzKGNsYXVzZSkubGVuZ3RoKSB7XG4gICAgICAgIGZpcnN0S2V5ID0gT2JqZWN0LmtleXMoY2xhdXNlKVswXTtcbiAgICAgICAgY29tcGFyZU9iaiA9IGNsYXVzZVtmaXJzdEtleV07XG4gICAgICAgIGNvbXBhcmF0b3IgPSBjb21wYXJlT2JqID09PSBudWxsXG4gICAgICAgICAgICA/IG51bGxcbiAgICAgICAgICAgIDogT2JqZWN0LmtleXMoY29tcGFyZU9iailbMF07XG4gICAgICAgIGNvbXBhcmVWYWx1ZSA9IGNvbXBhcmVPYmogPT09IG51bGxcbiAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgOiAoY29tcGFyYXRvciA9PT0gbnVsbFxuICAgICAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgICAgIDogY29tcGFyZU9ialtjb21wYXJhdG9yXSk7XG4gICAgfVxuXG4gICAgY29uc3QgZmllbGROYW1lSGFuZGxlciA9IChlKSA9PiB7XG4gICAgICAgIGNvbnN0IGZpZWxkT2JqID0ge307XG4gICAgICAgIGZpZWxkT2JqW2UudGFyZ2V0LnZhbHVlXSA9IGNvbXBhcmVPYmo7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGZpZWxkT2JqXSk7XG4gICAgfTtcbiAgICBjb25zdCBmaWVsZENvbXBhcmVIYW5kbGVyID0gKGUpID0+IHtcbiAgICAgICAgY29uc3QgbmV3Q29tcGFyZU9iaiA9IHt9O1xuICAgICAgICBuZXdDb21wYXJlT2JqW2UudGFyZ2V0LnZhbHVlXSA9IGNvbXBhcmVWYWx1ZTtcbiAgICAgICAgY2xhdXNlW2ZpcnN0S2V5XSA9IG5ld0NvbXBhcmVPYmo7XG4gICAgICAgIGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIGNsYXVzZV0pO1xuICAgIH07XG4gICAgY29uc3QgZmllbGRWYWx1ZUhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBjb21wYXJlT2JqW2NvbXBhcmF0b3JdID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgIGNsYXVzZVtmaXJzdEtleV0gPSBjb21wYXJlT2JqO1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBjbGF1c2VdKTtcbiAgICB9O1xuXG4gICAgY29uc3QgZmllbGRzID0gT2JqZWN0LmtleXMoZmllbGRzV2l0aFZhbHVlcyhzdGF0ZSkpO1xuICAgIGNvbnN0IHZhbHVlRm9ySW50ZXJhY3QgPSAoISFjb21wYXJlVmFsdWUgfHwgY29tcGFyZVZhbHVlID09PSAwKSA/IGNvbXBhcmVWYWx1ZSA6ICcnO1xuXG4gICAgcmV0dXJuIGh0bWxgPHNwYW4+XG4gICAgICAgIDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke2ZpcnN0S2V5fVwiIG9uY2hhbmdlPSR7ZmllbGROYW1lSGFuZGxlcn0+XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIGZpcnN0S2V5KX1cbiAgICAgICAgICAgICR7ZmllbGRzLm1hcCgoZmxkKSA9PiBzZWxlY3RPcHRpb24oZmxkLCBmaXJzdEtleSkpfVxuICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPHNlbGVjdCBkYXRhLXJlYWx2YWx1ZT1cIiR7Y29tcGFyYXRvcn1cIiBvbmNoYW5nZT0ke2ZpZWxkQ29tcGFyZUhhbmRsZXJ9PlxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24obnVsbCwgJy0nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdlcScsICdlcXVhbHMnLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdsdCcsICdpcyBsZXNzIHRoYW4nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdndCcsICdpcyBncmVhdGVyIHRoYW4nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdsdGUnLCAnaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvJywgY29tcGFyYXRvcil9XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbignZ3RlJywgJ2lzIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0bycsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2NvbnRhaW5zJywgY29tcGFyYXRvcil9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAkeyhjb21wYXJlT2JqICYmIGNvbXBhcmF0b3IpXG4gICAgICAgICAgICA/IGh0bWxgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgb25jaGFuZ2U9JHtmaWVsZFZhbHVlSGFuZGxlcn0gdmFsdWU9XCIke3ZhbHVlRm9ySW50ZXJhY3R9XCIgLz5gXG4gICAgICAgICAgICA6IG51bGx9XG4gICAgPC9zcGFuPmA7XG59XG5cbmZ1bmN0aW9uIHRhbGx5Q2xhdXNlKHN0YXRlLCBlbWl0LCBjbGF1c2UsIHBhdGgpIHtcbiAgICBsZXQgZmlyc3RLZXkgPSBudWxsO1xuICAgIGxldCBjb21wYXJlT2JqID0gbnVsbDtcbiAgICBsZXQgY29tcGFyYXRvciA9IG51bGw7XG4gICAgbGV0IGNvbXBhcmVWYWx1ZSA9IG51bGw7XG4gICAgaWYgKE9iamVjdC5rZXlzKGNsYXVzZSkubGVuZ3RoKSB7XG4gICAgICAgIGZpcnN0S2V5ID0gT2JqZWN0LmtleXMoY2xhdXNlKVswXTtcbiAgICAgICAgY29tcGFyZU9iaiA9IGNsYXVzZVtmaXJzdEtleV07XG4gICAgICAgIGNvbXBhcmF0b3IgPSBjb21wYXJlT2JqID09PSBudWxsXG4gICAgICAgICAgICA/IG51bGxcbiAgICAgICAgICAgIDogT2JqZWN0LmtleXMoY29tcGFyZU9iailbMF07XG4gICAgICAgIGNvbXBhcmVWYWx1ZSA9IGNvbXBhcmVPYmogPT09IG51bGxcbiAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgOiAoY29tcGFyYXRvciA9PT0gbnVsbFxuICAgICAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgICAgIDogY29tcGFyZU9ialtjb21wYXJhdG9yXSk7XG4gICAgfVxuXG4gICAgY29uc3QgbmFtZUhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBmaWVsZE9iaiA9IHt9O1xuICAgICAgICBmaWVsZE9ialtlLnRhcmdldC52YWx1ZV0gPSBjb21wYXJlT2JqO1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBmaWVsZE9ial0pO1xuICAgIH07XG4gICAgY29uc3QgY29tcGFyZUhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBuZXdDb21wYXJlT2JqID0ge307XG4gICAgICAgIG5ld0NvbXBhcmVPYmpbZS50YXJnZXQudmFsdWVdID0gY29tcGFyZVZhbHVlO1xuICAgICAgICBjbGF1c2VbZmlyc3RLZXldID0gbmV3Q29tcGFyZU9iajtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgY2xhdXNlXSk7XG4gICAgfTtcbiAgICBjb25zdCB2YWx1ZUhhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBjb21wYXJlT2JqW2NvbXBhcmF0b3JdID0gZS50YXJnZXQudmFsdWU7XG4gICAgICAgIGNsYXVzZVtmaXJzdEtleV0gPSBjb21wYXJlT2JqO1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBjbGF1c2VdKTtcbiAgICB9O1xuXG4gICAgY29uc3QgdmFsdWVGb3JJbnRlcmFjdCA9ICghIWNvbXBhcmVWYWx1ZSB8fCBjb21wYXJlVmFsdWUgPT09IDApID8gY29tcGFyZVZhbHVlIDogJyc7XG5cbiAgICByZXR1cm4gaHRtbGA8c3Bhbj5cbiAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgb25jaGFuZ2U9JHtuYW1lSGFuZGxlcn0gdmFsdWU9XCIke2ZpcnN0S2V5IHx8ICcnfVwiIC8+XG4gICAgICAgIDxzZWxlY3QgZGF0YS1yZWFsdmFsdWU9XCIke2NvbXBhcmF0b3J9XCIgb25jaGFuZ2U9JHtjb21wYXJlSGFuZGxlcn0+XG4gICAgICAgICAgICAke3NlbGVjdE9wdGlvbihudWxsLCAnLScsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2VxJywgJ2VxdWFscycsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2x0JywgJ2lzIGxlc3MgdGhhbicsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2d0JywgJ2lzIGdyZWF0ZXIgdGhhbicsIGNvbXBhcmF0b3IpfVxuICAgICAgICAgICAgJHtzZWxlY3RPcHRpb24oJ2x0ZScsICdpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8nLCBjb21wYXJhdG9yKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdndGUnLCAnaXMgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvJywgY29tcGFyYXRvcil9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgICAkeyhjb21wYXJlT2JqICYmIGNvbXBhcmF0b3IpXG4gICAgICAgICAgICA/IGh0bWxgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgb25jaGFuZ2U9JHt2YWx1ZUhhbmRsZXJ9IHZhbHVlPVwiJHt2YWx1ZUZvckludGVyYWN0fVwiIC8+YFxuICAgICAgICAgICAgOiBudWxsfVxuICAgIDwvc3Bhbj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtjb25kaXRpb259O1xuIiwiY29uc3Qge2ZpZWxkc1dpdGhWYWx1ZXN9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmNvbnN0IHNlcGFyYXRlQXJyYXkgPSBmdW5jdGlvbihhcnIpIHtcbiAgICBsZXQgb3RoZXJzID0gYXJyLmZpbHRlcigoaXRlbSkgPT4gdHlwZW9mIGl0ZW0gIT09ICdzdHJpbmcnKTtcbiAgICByZXR1cm4gW2Fyci5maWx0ZXIoKGl0ZW0pID0+IHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJyksIG90aGVyc107XG59O1xuXG5jb25zdCBldmFsVHJ1dGhzID0gZnVuY3Rpb24oc3RhdGUsIHRydXRoQXJyLCBvcnIgPSBmYWxzZSkge1xuICAgIGlmICghdHJ1dGhBcnIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAob3JyKSB7XG4gICAgICAgIHJldHVybiB0cnV0aEFyci5zb21lKCh0cnV0aCkgPT4gdHlwZW9mIHN0YXRlLnRydXRoc1t0cnV0aF0gIT09ICd1bmRlZmluZWQnKTtcbiAgICB9XG4gICAgcmV0dXJuIHRydXRoQXJyLmV2ZXJ5KCh0cnV0aCkgPT4gdHlwZW9mIHN0YXRlLnRydXRoc1t0cnV0aF0gIT09ICd1bmRlZmluZWQnKTtcbn07XG5cbmNvbnN0IGV2YWxGaWVsZCA9IGZ1bmN0aW9uKHN0YXRlLCBmaWVsZE5hbWUsIGNvbXBhcmVkVG8pIHtcbiAgICBjb25zdCB2YWx1ZSA9IGZpZWxkc1dpdGhWYWx1ZXMoc3RhdGUpW2ZpZWxkTmFtZV07XG4gICAgaWYgKE9iamVjdC5rZXlzKGNvbXBhcmVkVG8pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3Qga2V5ID0gT2JqZWN0LmtleXMoY29tcGFyZWRUbylbMF07XG4gICAgaWYgKGtleSA9PT0gJ2d0Jykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPiBjb21wYXJlZFRvW2tleV07XG4gICAgfVxuICAgIGlmIChrZXkgPT09ICdndGUnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA+PSBjb21wYXJlZFRvW2tleV07XG4gICAgfVxuICAgIGlmIChrZXkgPT09ICdsdCcpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlIDwgY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnbHRlJykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPD0gY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnZXEnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA9PSBjb21wYXJlZFRvW2tleV07XG4gICAgfVxuICAgIGlmIChrZXkgPT09ICdjb250YWlucycpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlLmluY2x1ZGVzKGNvbXBhcmVkVG9ba2V5XSk7XG4gICAgfVxufTtcblxuLy8gbG9vayBob3cgc2ltaWxhciB0aGVzZSBhcmUsIGhleSByZWZhY3RvciB0aGlzXG5jb25zdCBldmFsVGFsbHkgPSBmdW5jdGlvbihzdGF0ZSwgdGFsbHlOYW1lLCBjb21wYXJlZFRvKSB7XG4gICAgY29uc3QgdmFsdWUgPSBzdGF0ZS50YWxsaWVzW3RhbGx5TmFtZV07XG4gICAgaWYgKE9iamVjdC5rZXlzKGNvbXBhcmVkVG8pLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3Qga2V5ID0gT2JqZWN0LmtleXMoY29tcGFyZWRUbylbMF07XG4gICAgaWYgKGtleSA9PT0gJ2d0Jykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPiBjb21wYXJlZFRvW2tleV07XG4gICAgfVxuICAgIGlmIChrZXkgPT09ICdndGUnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA+PSBjb21wYXJlZFRvW2tleV07XG4gICAgfVxuICAgIGlmIChrZXkgPT09ICdsdCcpIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlIDwgY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnbHRlJykge1xuICAgICAgICByZXR1cm4gdmFsdWUgPD0gY29tcGFyZWRUb1trZXldO1xuICAgIH1cbiAgICBpZiAoa2V5ID09PSAnZXEnKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZSA9PSBjb21wYXJlZFRvW2tleV07XG4gICAgfTtcbn07XG5cbmNvbnN0IGV2YWxDbGF1c2UgPSBmdW5jdGlvbihzdGF0ZSwgY29uZE9iaikge1xuICAgIC8vIG5vdyBpdCdzIG9uXG4gICAgaWYgKGNvbmRPYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGkgZ3Vlc3M/Pz8gbWF5YmUgZmxhZyBpdCBzb21ld2hlcmUgdG8gdGhlIHVzZXJcbiAgICB9XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKGNvbmRPYmopLmV2ZXJ5KChrZXkpID0+IHtcbiAgICAgICAgaWYgKGtleSA9PT0gJ29yJykge1xuICAgICAgICAgICAgbGV0IFtzdHJpbmdzLCBvdGhlcnNdID0gc2VwYXJhdGVBcnJheShjb25kT2JqLm9yKTtcbiAgICAgICAgICAgIGlmIChvdGhlcnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGV2YWxUcnV0aHMoc3RhdGUsIHN0cmluZ3MsIHRydWUpIHx8IG90aGVycy5zb21lKChpdGVtKSA9PiBldmFsQ2xhdXNlKHN0YXRlLCBpdGVtKSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBldmFsVHJ1dGhzKHN0YXRlLCBzdHJpbmdzLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoa2V5ID09PSAndGFsbHknKSB7XG4gICAgICAgICAgICBjb25zdCB0YWxseUNvbmRpdGlvbiA9IGNvbmRPYmpba2V5XTtcbiAgICAgICAgICAgIGNvbnN0IHRhbGx5TmFtZSA9IE9iamVjdC5rZXlzKHRhbGx5Q29uZGl0aW9uKVswXTtcbiAgICAgICAgICAgIGNvbnN0IHRhbGx5UmVzdWx0ID0gZXZhbFRhbGx5KHN0YXRlLCB0YWxseU5hbWUsIHRhbGx5Q29uZGl0aW9uW3RhbGx5TmFtZV0pO1xuICAgICAgICAgICAgcmV0dXJuIHRhbGx5UmVzdWx0O1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNsYXVzZVJlc3VsdCA9IGV2YWxGaWVsZChzdGF0ZSwga2V5LCBjb25kT2JqW2tleV0pO1xuICAgICAgICByZXR1cm4gY2xhdXNlUmVzdWx0O1xuICAgIH0pO1xufVxuXG5jb25zdCBldmFsQ29uZGl0aW9uID0gZnVuY3Rpb24oc3RhdGUsIGNvbmRPYmosIGFueSA9IGZhbHNlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkoY29uZE9iaikpIHtcbiAgICAgICAgbGV0IFtzdHJpbmdzLCBvdGhlcnNdID0gc2VwYXJhdGVBcnJheShjb25kT2JqKTtcbiAgICAgICAgaWYgKG90aGVycy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybiBldmFsVHJ1dGhzKHN0YXRlLCBzdHJpbmdzKSAmJiBvdGhlcnMuZXZlcnkoKGl0ZW0pID0+IGV2YWxDbGF1c2Uoc3RhdGUsIGl0ZW0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBldmFsVHJ1dGhzKHN0YXRlLCBjb25kT2JqKTtcbiAgICAgICAgfVxuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0ge2V2YWxDb25kaXRpb259O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7Y2hlY2tCb3h9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5cbmNvbnN0IGltYWdlU3R5bGVWaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gICAgbGV0IGltZyA9IHN0YXRlLmdldEVkaXRlZE9iamVjdCgpO1xuICAgIGxldCBjaGFuZ2VIYW5kbGVyID0gZXZlbnQgPT4gZW1pdChcInByb3BlcnR5Q2hhbmdlXCIsIGV2ZW50KTtcblxuICAgIHJldHVybiBodG1sYDxmb3JtPlxuICAgICAgPHRhYmxlPlxuICAgICAgICAgIDx0cj5cbiAgICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoXCJ0b3BcIiwgXCJUb3BcIil9PC90ZD5cbiAgICAgICAgICAgICAgPHRkPiR7ZmllbGRGb3IoXCJsZWZ0XCIsIFwiTGVmdFwiKX08L3RkPlxuICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgPHRyPlxuICAgICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcihcImhlaWdodFwiLCBcIkhlaWdodFwiKX08L3RkPlxuICAgICAgICAgICAgICA8dGQ+JHtmaWVsZEZvcihcIndpZHRoXCIsIFwiV2lkdGhcIil9PC90ZD5cbiAgICAgICAgICA8L3RyPlxuICAgICAgPC90YWJsZT5cblxuICAgICAgJHtjaGVja0JveCgnSGlkZGVuJywgaW1nLmhpZGRlbixcbiAgICAgICAgKGUpID0+IGVtaXQoJ3Byb3BlcnR5Q2hhbmdlJywge3RhcmdldDp7bmFtZTonaGlkZGVuJyx2YWx1ZTogZS50YXJnZXQuY2hlY2tlZH19KSl9XG5cbiAgICAgICR7ZmllbGRGb3IoXCJjbGFzc1wiLCBcIkNsYXNzXCIpfVxuXG4gICAgICA8ZGl2IHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXJcIj5cbiAgICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7ZGVsZXRlSGFuZGxlcn0+RGVsZXRlIEltYWdlPC9idXR0b24+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Zvcm0+YDtcblxuICAgIGZ1bmN0aW9uIGZpZWxkRm9yKGF0dE5hbWUsIGRpc3BsYXlOYW1lKSB7XG4gICAgICAgIHJldHVybiBodG1sYDxwPjxsYWJlbCBmb3I9XCIke2F0dE5hbWV9XCI+JHtkaXNwbGF5TmFtZX08L2xhYmVsPjxiciAvPlxuICAgICAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCJcbiAgICAgICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgICAgICBuYW1lPVwiJHthdHROYW1lfVwiXG4gICAgICAgICAgICAgIHZhbHVlPVwiJHtpbWdbYXR0TmFtZV0gfHwgXCJcIn1cIiAvPlxuICAgICAgICA8L3A+YDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZWxldGVIYW5kbGVyKCkge1xuICAgICAgICBpZiAod2luZG93LmNvbmZpcm0oXCJTZXJpb3VzbHk/IChUaGVyZSdzIG5vIFVuZG8geWV0KVwiKSkge1xuICAgICAgICAgICAgZW1pdChcImRlbGV0ZUltYWdlXCIpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gaW1hZ2VTdHlsZVZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBqdW1wVG8oc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgLy8gbm9ybWFsaXppbmcgdGhlIGNyYXp5IG9mIGh0bWwgb3B0aW9ucyBhIGxpdHRsZVxuICAgIGlmIChOdW1iZXIuaXNJbnRlZ2VyKHBhcnNlSW50KGJlaGF2Lmp1bXBUbykpKSB7XG4gICAgICAgIGJlaGF2Lmp1bXBUbyA9IHBhcnNlSW50KGJlaGF2Lmp1bXBUbyk7XG4gICAgfVxuICAgIGlmICh0eXBlb2YgYmVoYXYuanVtcFRvID09ICdzdHJpbmcnICYmIGJlaGF2Lmp1bXBUbyA9PSAnbnVsbCcpIHtcbiAgICAgICAgYmVoYXYuanVtcFRvID0gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj50aGUgY2FyZCBuYW1lZCBvciBudW1iZXJlZFxuICAgICAgICAgICAgPHNlbGVjdCBuYW1lPVwianVtcFRvV2hhdFwiXG4gICAgICAgICAgICAgICAgICAgIG9uY2hhbmdlPSR7KGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJywgW3BhdGgsIHsnanVtcFRvJzogZS50YXJnZXQudmFsdWV9XSl9PlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgYmVoYXYuanVtcFRvID09PSBudWxsLCAtMSl9XG4gICAgICAgICAgICAgICAgJHtzdGF0ZS5jYXJkcy5tYXAoKGNkLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQganVtcFRvVmFsID0gY2QubmFtZSB8fCBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKE51bWJlci5pc0ludGVnZXIocGFyc2VJbnQoanVtcFRvVmFsKSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGp1bXBUb1ZhbCA9IHBhcnNlSW50KGp1bXBUb1ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNlbGVjdE9wdGlvbihqdW1wVG9WYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICAoY2QubmFtZSA/IGluZGV4ICsgXCIgLSBcIiArIGNkLm5hbWUgOiBpbmRleCksXG4gICAgICAgICAgICAgICAgICAgICAgICBiZWhhdi5qdW1wVG8gPT09IGp1bXBUb1ZhbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGV4XG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSl9XG4gICAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPC9zZWN0aW9uPlxuICAgIDwvZGl2PmA7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ganVtcFRvO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbmZ1bmN0aW9uIGxpbmtUbyhzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj50aGUgVVJMXG4gICAgICAgICAgICA8aW5wdXQgbmFtZT1cImxpbmtUb1doYXRcIlxuICAgICAgICAgICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J2xpbmtUbyc6IGUudGFyZ2V0LnZhbHVlfV0pfVxuICAgICAgICAgICAgICAgICAgICB2YWx1ZT1cIiR7YmVoYXYubGlua1RvfVwiIC8+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGxpbmtUbztcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3NlbGVjdE9wdGlvbn0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuZnVuY3Rpb24gcGxheVNvdW5kKHN0YXRlLCBlbWl0LCBiZWhhdiwgcGF0aCkge1xuICAgIGVtaXQoJ2Vuc3VyZVN0YXRpY0ZpbGVMaXN0cycpO1xuXG4gICAgY29uc3QgeW91ckJhc2ljSGFuZGxlciA9IChlKSA9PlxuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J3BsYXlTb3VuZCc6IGUudGFyZ2V0LnZhbHVlfV0pO1xuICAgIGNvbnN0IHN0YXRpY3MgPSBzdGF0ZS5zdGF0aWNGaWxlcyA/IHN0YXRlLnN0YXRpY0ZpbGVzIDogW107XG5cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj5cbiAgICAgICAgICAgIDxzbWFsbD4ocHV0IGEgV0FWLCBNUDMsIG9yIE9HRyBpbiB0aGUgPGNvZGU+L2ltZzwvY29kZT4gZm9sZGVyIGZvciBub3csIHNvcnJ5KTwvc21hbGw+PGJyIC8+XG4gICAgICAgICAgICA8c2VsZWN0IG9uY2hhbmdlPSR7eW91ckJhc2ljSGFuZGxlcn0gbmFtZT1cInBsYXlTb3VuZFwiPlxuICAgICAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKG51bGwsICctJywgYmVoYXYucGxheVNvdW5kKX1cbiAgICAgICAgICAgICAgICAke3N0YXRpY3MubWFwKChmaWxlbmFtZSkgPT5cbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0T3B0aW9uKGZpbGVuYW1lLCBiZWhhdi5wbGF5U291bmQpKX1cbiAgICAgICAgICAgIDwvc2VsZWN0PlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgPC9kaXY+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwbGF5U291bmQ7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuZnVuY3Rpb24gcmVtb3ZlVHJ1dGgoc3RhdGUsIGVtaXQsIGJlaGF2LCBwYXRoKSB7XG4gICAgcmV0dXJuIGh0bWxgPGRpdj5cbiAgICAgICAgPHNlY3Rpb24+cmVtb3ZlIHRoZSBUcnV0aCBuYW1lZFxuICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwid2hhdFRydXRoXCIgdmFsdWU9XCIke2JlaGF2LnJlbW92ZVRydXRofVwiXG4gICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J3JlbW92ZVRydXRoJzogZS50YXJnZXQudmFsdWV9XSl9IC8+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlbW92ZVRydXRoO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5jb25zdCB7c2VsZWN0T3B0aW9ufSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5mdW5jdGlvbiBzZXRUYWxseShzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICBjb25zdCB0YWxseU5hbWUgPSBiZWhhdi5zZXRUYWxseSB8fCAnJztcbiAgICBjb25zdCB0YWxseVZhbHVlID0gYmVoYXYudXBCeVxuICAgICAgICA/IGJlaGF2LnVwQnlcbiAgICAgICAgOiAoYmVoYXYuZG93bkJ5XG4gICAgICAgICAgICA/IGJlaGF2LmRvd25CeVxuICAgICAgICAgICAgOiAoYmVoYXYudG8gPyBiZWhhdi50byA6IDApKTtcblxuICAgIGNvbnN0IG5hbWVIYW5kbGVyID0gKGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJyxcbiAgICAgICAgW3BhdGgsIE9iamVjdC5hc3NpZ24oYmVoYXYsIHtzZXRUYWxseTogZS50YXJnZXQudmFsdWV9KV0pO1xuICAgIGNvbnN0IGhvd0hhbmRsZXIgPSAoZSkgPT4ge1xuICAgICAgICBjb25zdCBuZXdCZWhhdk9iaiA9IHtzZXRUYWxseTogdGFsbHlOYW1lfTtcbiAgICAgICAgbmV3QmVoYXZPYmpbZS50YXJnZXQudmFsdWVdID0gdGFsbHlWYWx1ZTtcbiAgICAgICAgZW1pdCgnc2V0QmVoYXZpb3JPYmonLCBbcGF0aCwgbmV3QmVoYXZPYmpdKTtcbiAgICB9O1xuICAgIGNvbnN0IHZhbHVlSGFuZGxlciA9IChlKSA9PiB7XG4gICAgICAgIGNvbnN0IG90aGVyS2V5ID0gT2JqZWN0LmtleXMoYmVoYXYpLmZpbHRlcigoa2V5KSA9PiBrZXkgIT0gJ3NldFRhbGx5JylbMF07XG4gICAgICAgIGNvbnN0IG5ld0JlaGF2T2JqID0ge3NldFRhbGx5OiB0YWxseU5hbWV9O1xuICAgICAgICBuZXdCZWhhdk9ialtvdGhlcktleV0gPSBwYXJzZUludChlLnRhcmdldC52YWx1ZSwgMTApO1xuICAgICAgICBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCBuZXdCZWhhdk9ial0pO1xuICAgIH07XG5cbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj5Nb3ZlIHRoZSBUYWxseVxuICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwid2hhdFRhbGx5XCIgdmFsdWU9XCIke3RhbGx5TmFtZX1cIlxuICAgICAgICAgICAgb25jaGFuZ2U9JHtuYW1lSGFuZGxlcn0gLz5cbiAgICAgICAgPHNlbGVjdCBuYW1lPVwiaG93TW92ZUl0XCIgb25jaGFuZ2U9JHtob3dIYW5kbGVyfT5cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCd1cEJ5JywgJ3VwIGJ5JywgdHlwZW9mIGJlaGF2LnVwQnkgIT09ICd1bmRlZmluZWQnKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCdkb3duQnknLCAnZG93biBieScsIHR5cGVvZiBiZWhhdi5kb3duQnkgIT09ICd1bmRlZmluZWQnKX1cbiAgICAgICAgICAgICR7c2VsZWN0T3B0aW9uKCd0bycsICd0byB0aGUgbnVtYmVyJywgdHlwZW9mIGJlaGF2LnRvICE9PSAndW5kZWZpbmVkJyl9XG4gICAgICAgIDwvc2VsZWN0PlxuICAgICAgICA8aW5wdXQgdHlwZT1cIlwiIG5hbWU9XCJ0YWxseVZhbHVlXCIgdmFsdWU9XCIke3RhbGx5VmFsdWV9XCJcbiAgICAgICAgICAgIG9uY2hhbmdlPSR7dmFsdWVIYW5kbGVyfSAvPlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgPC9kaXY+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXRUYWxseTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuXG5mdW5jdGlvbiBzZXRUcnV0aChzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICByZXR1cm4gaHRtbGA8ZGl2PlxuICAgICAgICA8c2VjdGlvbj5zZXQgYSBUcnV0aCBuYW1lZFxuICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBuYW1lPVwid2hhdFRydXRoXCIgdmFsdWU9XCIke2JlaGF2LnNldFRydXRofVwiXG4gICAgICAgICAgICBvbmNoYW5nZT0keyhlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsIFtwYXRoLCB7J3NldFRydXRoJzogZS50YXJnZXQudmFsdWV9XSl9IC8+XG4gICAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5gO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldFRydXRoO1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbmNvbnN0IHN0YWNrQ29tYm9WaWV3ID0gKHN0YXRlLCBlbWl0KSA9PiB7XG4gIGNvbnN0IGNoYW5nZUhhbmRsZXIgPSAoZXZlbnQpID0+IGVtaXQoJ3N0YWNrUHJvcGVydHlDaGFuZ2UnLCBldmVudCk7XG4gIGNvbnN0IHN0eWxlQ29udGFpbmVyID0gaHRtbGA8dGV4dGFyZWEgd3JhcD1cInZpcnR1YWxcIlxuICAgIGNsYXNzPVwic3R5bGVzaGVldFwiXG4gICAgb25jaGFuZ2U9JHsoZSkgPT4gc2V0U3R5bGVzKGUudGFyZ2V0LnZhbHVlKX0+JHtzdGF0ZS5zdHlsZUNhY2hlfTwvdGV4dGFyZWE+YDtcblxuICByZXR1cm4gaHRtbGA8Zm9ybT5cbiAgICA8cD48bGFiZWwgZm9yPVwiY29sb3JcIj5Db2xvcjwvbGFiZWw+PGJyIC8+XG4gICAgICAgICA8aW5wdXQgdHlwZT1cImNvbG9yXCJcbiAgICAgICAgICAgb25jaGFuZ2U9JHtjaGFuZ2VIYW5kbGVyfVxuICAgICAgICAgICBuYW1lPVwiY29sb3JcIlxuICAgICAgICAgICB2YWx1ZT1cIiR7c3RhdGUuY29sb3IgfHwgJyNGRkZGRkYnfVwiIC8+XG4gICAgICAgPGJ1dHRvbiBvbmNsaWNrPSR7KCkgPT4ge1xuICAgICAgICAgICBlbWl0KCdzdGFja1Byb3BlcnR5Q2hhbmdlJywge3RhcmdldDoge25hbWU6ICdjb2xvcicsIHZhbHVlOiAnJ319KTtcbiAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgIH19PlxuICAgICAgICAgQ2xlYXJcbiAgICAgICA8L2J1dHRvbj5cbiAgICA8L3A+XG4gICAgPHA+PGxhYmVsIGZvcj1cInN0eWxlc1wiPlN0eWxlczwvbGFiZWw+PGJyIC8+XG4gICAgJHtzdHlsZUNvbnRhaW5lcn1cbiAgICA8L3A+XG4gIDwvZm9ybT5gO1xuXG4gIGZ1bmN0aW9uIHNldFN0eWxlcyh2YWwpIHtcbiAgICAgIGVtaXQoJ3NldFN0eWxlcycsIHZhbCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gc3RhY2tDb21ib1ZpZXc7XG4iLCJjb25zdCBodG1sID0gcmVxdWlyZSgnY2hvby9odG1sJyk7XG5cblxuZnVuY3Rpb24gc3RhcnRUYWxseShzdGF0ZSwgZW1pdCwgYmVoYXYsIHBhdGgpIHtcbiAgICBjb25zdCB0YWxseU5hbWUgPSBiZWhhdi5zdGFydFRhbGx5IHx8ICcnO1xuICAgIGNvbnN0IHRhbGx5VmFsID0gYmVoYXYudmFsdWUgfHwgMDtcblxuICAgIGNvbnN0IG5hbWVIYW5kbGVyID0gKGUpID0+IGVtaXQoJ3NldEJlaGF2aW9yT2JqJyxcbiAgICAgICAgW3BhdGgsIHtzdGFydFRhbGx5OiBlLnRhcmdldC52YWx1ZSwgdmFsdWU6IHRhbGx5VmFsfV0pO1xuICAgIGNvbnN0IHZhbHVlSGFuZGxlciA9IChlKSA9PiBlbWl0KCdzZXRCZWhhdmlvck9iaicsXG4gICAgICAgIFtwYXRoLCB7c3RhcnRUYWxseTogdGFsbHlOYW1lLCB2YWx1ZTogcGFyc2VJbnQoZS50YXJnZXQudmFsdWUsIDEwKX1dKTtcblxuICAgIHJldHVybiBodG1sYDxkaXY+XG4gICAgICAgIDxzZWN0aW9uPnN0YXJ0IGEgVGFsbHkgbmFtZWRcbiAgICAgICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgbmFtZT1cIndoYXRUYWxseVwiIHZhbHVlPVwiJHtiZWhhdi5zdGFydFRhbGx5fVwiXG4gICAgICAgICAgICBvbmNoYW5nZT0ke25hbWVIYW5kbGVyfSAvPlxuICAgICAgICBhdCB0aGUgbnVtYmVyXG4gICAgICAgIDxpbnB1dCB0eXBlPVwiXCIgbmFtZT1cInRhbGx5VmFsdWVcIiB2YWx1ZT1cIiR7YmVoYXYudmFsdWV9XCJcbiAgICAgICAgICAgIG9uY2hhbmdlPSR7dmFsdWVIYW5kbGVyfSAvPlxuICAgICAgICA8L3NlY3Rpb24+XG4gICAgPC9kaXY+YDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzdGFydFRhbGx5O1xuIiwiY29uc3QgaHRtbCA9IHJlcXVpcmUoJ2Nob28vaHRtbCcpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgsIHN0YXRlLCBlbWl0LCBpc0NhcmQpIHtcbiAgICBsZXQgYXR0cnMgPSB7XG4gICAgICAgIGhlaWdodDogZWxlbWVudC5oZWlnaHQsXG4gICAgICAgIHdpZHRoOiBlbGVtZW50LndpZHRoLFxuICAgICAgICB0b3A6IGVsZW1lbnQudG9wLFxuICAgICAgICBsZWZ0OiBlbGVtZW50LmxlZnQsXG4gICAgICAgICdiYWNrZ3JvdW5kLWNvbG9yJzogZWxlbWVudC5jb2xvcixcbiAgICAgICAgJ2ZvbnQtZmFtaWx5JzogZWxlbWVudC5mb250LFxuICAgICAgICAnZm9udC1zaXplJzogZWxlbWVudC5zaXplLFxuICAgICAgICAnZm9udC1zdHlsZSc6IGVsZW1lbnQuc3R5bGUsXG4gICAgICAgIGNvbG9yOiBlbGVtZW50LnRleHRDb2xvclxuICAgIH07IC8vIHRoaXMgZGF0YSBtdW5nZSBzdGVwIG1heSBiZWxvbmcgaW4gYSBzdG9yZT9cbiAgICBsZXQgc3R5bGUgPSBPYmplY3Qua2V5cyhhdHRycykubWFwKChrZXkpID0+IChrZXkgKyAnOicgKyBhdHRyc1trZXldICsgJzsnKSkuam9pbignJyk7XG4gICAgcmV0dXJuIGh0bWxgPGRpdlxuICAgICAgICBjbGFzcz1cImdyYXBoaWMgJHtlbGVtZW50LmNsYXNzfVwiXG4gICAgICAgIHN0eWxlPVwiJHtzdHlsZX1cIlxuICAgID4ke2VsZW1lbnQudGV4dH08L2Rpdj5gO1xufTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcblxuY29uc3Qge3BhcnNlQW5kUnVuQmVoYXZpb3JzfSA9IHJlcXVpcmUoJy4vYmVoYXZpb3IuanMnKTtcblxuXG5jb25zdCBJTUFHRV9ST1RBVElPTiA9IHtcbiAgICAzOiAncm90YXRlKDE4MGRlZyknLFxuICAgIDY6ICdyb3RhdGUoOTBkZWcpJyxcbiAgICA4OiAncm90YXRlKDI3MGRlZyknXG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZWxlbWVudCwgaW5kZXgsIHN0YXRlLCBlbWl0LCBpc0NhcmQpIHtcbiAgICBpZiAoaXNEcmFnZ2FibGUoKSkge1xuICAgICAgICByZXR1cm4gaHRtbGA8aW1nIGNsYXNzPVwiJHtpbWFnZUNsYXNzZXMoKX1cIlxuICAgICAgICAgICAgb25jbGljaz0ke2VkaXRNb2RlQ2xpY2t9XG4gICAgICAgICAgICBvbm1vdXNlZG93bj0keyhlKSA9PiBtb3VzZURvd24oZSl9XG4gICAgICAgICAgICBvbm1vdXNlbGVhdmU9JHsoZSkgPT4gbW91c2VMZWF2ZShlKX1cbiAgICAgICAgICAgIG9ubW91c2V1cD0keyhlKSA9PiBtb3VzZVVwKGUpfVxuICAgICAgICAgICAgc3JjPVwiJHtlbGVtZW50LnNyY31cIlxuICAgICAgICAgICAgYWx0PVwiJHtlbGVtZW50LmFsdCA/IGVsZW1lbnQuYWx0IDogJyd9XCJcbiAgICAgICAgICAgIGhlaWdodD1cIiR7ZWxlbWVudC5oZWlnaHQgPyBlbGVtZW50LmhlaWdodCA6ICcnfVwiXG4gICAgICAgICAgICB3aWR0aD1cIiR7ZWxlbWVudC53aWR0aCA/IGVsZW1lbnQud2lkdGggOiAnJ31cIlxuICAgICAgICAgICAgc3R5bGU9XCJ0b3A6JHtlbGVtZW50LnRvcH07bGVmdDoke2VsZW1lbnQubGVmdH07JHtpbmxpbmVTdHlsZXMoKX1cIlxuICAgICAgICAvPmA7XG4gICAgfVxuICAgIGlmIChpc0RyYWdnYWJsZSgpIHx8ICFlbGVtZW50LmhpZGRlbikge1xuICAgICAgICByZXR1cm4gaHRtbGA8aW1nIGNsYXNzPVwiJHtpbWFnZUNsYXNzZXMoKX1cIlxuICAgICAgICAgICAgb25jbGljaz0ke2NsaWNrSGFuZGxlcn1cbiAgICAgICAgICAgIHNyYz1cIiR7ZWxlbWVudC5zcmN9XCJcbiAgICAgICAgICAgIGFsdD1cIiR7ZWxlbWVudC5hbHQgPyBlbGVtZW50LmFsdCA6ICcnfVwiXG4gICAgICAgICAgICBoZWlnaHQ9XCIke2VsZW1lbnQuaGVpZ2h0ID8gZWxlbWVudC5oZWlnaHQgOiAnJ31cIlxuICAgICAgICAgICAgd2lkdGg9XCIke2VsZW1lbnQud2lkdGggPyBlbGVtZW50LndpZHRoIDogJyd9XCJcbiAgICAgICAgICAgIHN0eWxlPVwidG9wOiR7ZWxlbWVudC50b3B9O2xlZnQ6JHtlbGVtZW50LmxlZnR9OyR7aW5saW5lU3R5bGVzKCl9XCJcbiAgICAgICAgLz5gO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcblxuICAgIGZ1bmN0aW9uIGNsaWNrSGFuZGxlcigpIHtcbiAgICAgICAgaWYgKGV2ZW50LmFsdEtleSkge1xuICAgICAgICAgICAgZW1pdCgnZWRpdEltYWdlJywgW2VsZW1lbnQsIGluZGV4LCBpc0NhcmRdKTtcbiAgICAgICAgfSBlbHNlIGlmIChlbGVtZW50LmJlaGF2aW9yICYmIGVsZW1lbnQuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJzZUFuZFJ1bkJlaGF2aW9ycyhzdGF0ZSwgZW1pdCwgZWxlbWVudC5iZWhhdmlvcik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbmxpbmVTdHlsZXMoKSB7XG4gICAgICAgIGxldCBvdXQgPSBcIlwiO1xuICAgICAgICBpZiAoZWxlbWVudC5zdHlsZSkge1xuICAgICAgICAgICAgb3V0ICs9IGVsZW1lbnQuc3R5bGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQub3JpZW50YXRpb24gJiYgZWxlbWVudC5vcmllbnRhdGlvbiAhPT0gMSkge1xuICAgICAgICAgICAgb3V0ICs9IFwidHJhbnNmb3JtOiBcIiArIElNQUdFX1JPVEFUSU9OW2VsZW1lbnQub3JpZW50YXRpb25dO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW1hZ2VDbGFzc2VzKCkge1xuICAgICAgICBjb25zdCBrbGFzcyA9IFtdO1xuICAgICAgICBpZiAoaXNEcmFnZ2FibGUoKSkge1xuICAgICAgICAgICAga2xhc3MucHVzaCgnbW92YWJsZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbGVtZW50LmJlaGF2aW9yICYmIGVsZW1lbnQuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICBrbGFzcy5wdXNoKCdiZWhhdmVzLW9uLWNsaWNrJyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGVsZW1lbnQuaGlkZGVuKSB7XG4gICAgICAgICAgICBrbGFzcy5wdXNoKCdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgICAgICBrbGFzcy5wdXNoKGVsZW1lbnRbJ2NsYXNzJ10pO1xuICAgICAgICByZXR1cm4ga2xhc3Muam9pbignICcpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVkaXRJbWFnZSgpIHtcbiAgICAgICAgZW1pdCgnZWRpdEltYWdlJywgW2VsZW1lbnQsIGluZGV4LCBpc0NhcmRdKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEcmFnZ2FibGUoKSB7XG4gICAgICAgIGlmIChpc0NhcmQpIHtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZS5lZGl0TW9kZSA9PT0gJ2VkaXRNb2RlJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdiZ0VkaXQnO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVkaXRNb2RlQ2xpY2soZXZ0KSB7XG4gICAgICAgIGNvbnN0IFtzdGFydFgsIHN0YXJ0WV0gPSBzdGF0ZS5tb3VzZURvd247XG4gICAgICAgIGlmIChNYXRoLmFicyhldnQuc2NyZWVuWCAtIHN0YXJ0WCkgPCAxMCAmJiBNYXRoLmFicyhldnQuc2NyZWVuWSAtIHN0YXJ0WSkgPCAxMCkge1xuICAgICAgICAgICAgZWRpdEltYWdlKCk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhdGUuZHJhZ0luZm8gPSBudWxsO1xuICAgICAgICBzdGF0ZS5yZXNpemVJbmZvID0gbnVsbDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBtb3VzZURvd24oZXZ0KSB7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGVtaXQoJ3N0YXJ0RHJhZycsIFtldnQuc2NyZWVuWCwgZXZ0LnNjcmVlblksIGV2dC5vZmZzZXRYLCBldnQub2Zmc2V0WSwgZXZ0LnRhcmdldF0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdXNlTGVhdmUoZXZ0KSB7XG4gICAgICAgIGlmIChzdGF0ZS5kcmFnSW5mbyB8fCBzdGF0ZS5yZXNpemVJbmZvKSB7XG4gICAgICAgICAgICBjb25zdCB5ZXJJbmZvID0gc3RhdGUuZHJhZ0luZm8gPyBzdGF0ZS5kcmFnSW5mbyA6IHN0YXRlLnJlc2l6ZUluZm87XG4gICAgICAgICAgICBpZiAoeWVySW5mby50YXJnZXQgPT0gZXZ0LnRhcmdldCkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID0gbnVsbDtcbiAgICAgICAgICAgICAgICBzdGF0ZS5yZXNpemVJbmZvID0gbnVsbDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIG1vdXNlVXAoZXZ0KSB7XG4gICAgICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgZW1pdCgnZmluaXNoRHJhZycsIFtcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID8gJ21vdmVJbWFnZScgOiAncmVzaXplSW1hZ2UnLFxuICAgICAgICAgICAgZXZ0LnNjcmVlblgsIGV2dC5zY3JlZW5ZLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLmxlZnQgOiBldnQudGFyZ2V0LmNsaWVudFdpZHRoLFxuICAgICAgICAgICAgc3RhdGUuZHJhZ0luZm8gPyBldnQudGFyZ2V0LnN0eWxlLnRvcCA6IGV2dC50YXJnZXQuY2xpZW50SGVpZ2h0LFxuICAgICAgICAgICAgaW5kZXhcbiAgICAgICAgXSk7XG4gICAgfVxufTtcbiIsImNvbnN0IHttb2RQYXRoLCBnZXRQYXRofSA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oc3RhdGUsIGVtaXR0ZXIpIHtcbiAgICBjb25zdCBwb2tlID0gbW9kUGF0aChzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBzdGF0ZS5nZXRDYXJkcyA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmRzO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0Q2FyZENvdW50ID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuY2FyZHMubGVuZ3RoO1xuICAgIH1cbiAgICBzdGF0ZS5zZXROZXh0Q2FyZCA9IChudW0pID0+IHtcbiAgICAgICAgc3RhdGUubmV4dENhcmQgPSBudW07XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4ID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuY3VycmVudENhcmQ7XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRDdXJyZW50Q2FyZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXTtcbiAgICB9O1xuICAgIHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kSW5kZXggPSAoKSA9PiB7XG4gICAgICAgIGlmIChzdGF0ZS5jdXJyZW50QmFja2dyb3VuZCkge1xuICAgICAgICAgICAgcmV0dXJuIHN0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kO1xuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gc3RhdGUuZ2V0Q3VycmVudENhcmQoKS5iYWNrZ3JvdW5kO1xuICAgIH07XG4gICAgc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmQgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5iYWNrZ3JvdW5kc1tzdGF0ZS5jdXJyZW50QmFja2dyb3VuZF07XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRCYWNrZ3JvdW5kRm9yQ2FyZCA9IChjYXJkKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5iYWNrZ3JvdW5kc1tjYXJkLmJhY2tncm91bmRdO1xuICAgIH1cbiAgICBzdGF0ZS5nZXRDYXJkc0luQ3VycmVudEJhY2tncm91bmQgPSAoKSA9PiB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5jYXJkcy5tYXAoKGNkLCBpbmQpID0+IE9iamVjdC5hc3NpZ24oe30sIGNkLCB7aW5kZXg6IGluZH0pKVxuICAgICAgICAgICAgLmZpbHRlcigoY2QpID0+IGNkLmJhY2tncm91bmQgPT09IHN0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kKTtcbiAgICB9O1xuICAgIHN0YXRlLmdldEJhY2tncm91bmRDb3VudCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHN0YXRlLmJhY2tncm91bmRzKS5sZW5ndGg7XG4gICAgfTtcblxuICAgIHN0YXRlLnNldFByb3BlcnR5QXRQYXRoID0gKHBhdGhBcnJheSwgdmFsdWUpID0+IHtcbiAgICAgICAgcG9rZShwYXRoQXJyYXksIHZhbHVlKTtcbiAgICB9XG4gICAgc3RhdGUuZ2V0UHJvcGVydHlBdFBhdGggPSAocGF0aEFycmF5KSA9PiB7XG4gICAgICAgIHJldHVybiBnZXRQYXRoKHN0YXRlLCBwYXRoQXJyYXkpO1xuICAgIH07XG5cbiAgICBzdGF0ZS5zZXRDdXJyZW50Q2FyZFByb3BlcnR5ID0gKHBhdGhBcnJheSwgdmFsdWUpID0+IHtcbiAgICAgICAgc3RhdGUuc2V0UHJvcGVydHlBdFBhdGgoXG4gICAgICAgICAgICBbJ2NhcmRzJywgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpXS5jb25jYXQocGF0aEFycmF5KSxcbiAgICAgICAgICAgIHZhbHVlXG4gICAgICAgICk7XG4gICAgfTtcbiAgICBzdGF0ZS5zZXRDdXJyZW50QmFja2dyb3VuZFByb3BlcnR5ID0gKHBhdGhBcnJheSwgdmFsdWUpID0+IHtcbiAgICAgICAgc3RhdGUuc2V0UHJvcGVydHlBdFBhdGgoXG4gICAgICAgICAgICBbJ2JhY2tncm91bmRzJywgc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpXS5jb25jYXQocGF0aEFycmF5KSxcbiAgICAgICAgICAgIHZhbHVlXG4gICAgICAgICk7XG4gICAgfVxuXG4gICAgc3RhdGUuZWRpdE9iamVjdCA9IChvYmplY3RQYXRoKSA9PiB7XG4gICAgICAgIC8vIHRoaXMganVzdCBtZWFucyBzd2l0Y2ggb24gdGhlIGVkaXQgbW9kYWw/XG4gICAgICAgIC8vIHdoYXQgaXMgJ2VudicgaGVyZSBhbmQgbWF5YmUgd2UgaWdub3JlIGl0P1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRpbmcoKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBsZVBhdGggPSBzdGF0ZS5lZGl0aW5nQ2FyZCgpXG4gICAgICAgICAgICA/IFsnY2FyZHMnLCBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCldXG4gICAgICAgICAgICA6IFsnYmFja2dyb3VuZHMnLCBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KCldO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nUGF0aCA9IGxlUGF0aC5jb25jYXQob2JqZWN0UGF0aCk7XG4gICAgICAgIC8vIHNvIEkgZ3Vlc3MgdGhhdCdzIHdoYXQgdGhvc2UgYXJndW1lbnRzIGFyZVxuXG4gICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmVkaXRpbmdFbGVtZW50ID0gc3RhdGUuZWRpdGluZ0ZpZWxkID0gbnVsbDtcbiAgICAgICAgc3dpdGNoIChvYmplY3RQYXRoWzBdKSB7XG4gICAgICAgICAgICBjYXNlICdlbGVtZW50cyc6XG4gICAgICAgICAgICAgICAgc3RhdGUuZWRpdGluZ0VsZW1lbnQgPSBzdGF0ZS5nZXRQcm9wZXJ0eUF0UGF0aChzdGF0ZS5lZGl0aW5nUGF0aCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpbWFnZXMnOlxuICAgICAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlLmdldFByb3BlcnR5QXRQYXRoKHN0YXRlLmVkaXRpbmdQYXRoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2ZpZWxkcyc6XG4gICAgICAgICAgICAgICAgc3RhdGUuZWRpdGluZ0ZpZWxkID0gc3RhdGUuZ2V0UHJvcGVydHlBdFBhdGgoc3RhdGUuZWRpdGluZ1BhdGgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY2FyZHMnOlxuICAgICAgICAgICAgY2FzZSAnYmFja2dyb3VuZHMnOlxuICAgICAgICAgICAgY2FzZSAnc3RhY2snOlxuICAgICAgICAgICAgICAgIC8vIG9oIGFjdHVhbGx5XG4gICAgICAgICAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBvYmplY3RQYXRoO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHN0YXRlLmdldEVkaXRlZE9iamVjdEluZGV4ID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuZWRpdGluZ1BhdGhbc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoIC0gMV07XG4gICAgfVxuICAgIHN0YXRlLmVkaXRpbmdPYmplY3QgPSAoKSA9PiAhIXN0YXRlLmVkaXRpbmdQYXRoO1xuICAgIHN0YXRlLmdldEVkaXRlZE9iamVjdCA9ICgpID0+IHtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0aW5nT2JqZWN0KCkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBzdGF0ZS5nZXRQcm9wZXJ0eUF0UGF0aChzdGF0ZS5lZGl0aW5nUGF0aCk7XG4gICAgfTtcbiAgICBzdGF0ZS5nZXRFZGl0ZWRPYmplY3RUeXBlID0gKCkgPT4ge1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRpbmdPYmplY3QoKSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRpbmdQYXRoLmluY2x1ZGVzKCdlbGVtZW50cycpXG4gICAgICAgICAgICA/ICdlbGVtZW50J1xuICAgICAgICAgICAgOiAoc3RhdGUuZWRpdGluZ1BhdGguaW5jbHVkZXMoJ2ltYWdlcycpXG4gICAgICAgICAgICAgICAgPyAnaW1hZ2UnXG4gICAgICAgICAgICAgICAgOiAoc3RhdGUuZWRpdGluZ1BhdGguaW5jbHVkZXMoJ2ZpZWxkcycpXG4gICAgICAgICAgICAgICAgICAgID8gJ2ZpZWxkJ1xuICAgICAgICAgICAgICAgICAgICA6IChzdGF0ZS5lZGl0aW5nUGF0aC5pbmNsdWRlcygnc3RhY2snKVxuICAgICAgICAgICAgICAgICAgICAgICAgPyAnc3RhY2snXG4gICAgICAgICAgICAgICAgICAgICAgICA6IChzdGF0ZS5lZGl0aW5nUGF0aC5pbmNsdWRlcygnYmFja2dyb3VuZHMnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgID8gJ2JhY2tncm91bmQnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgOiAnY2FyZCcpKSkpOyAvLyBtYXliZSBhIGJldHRlciB3YXkgdG8gZG8gdGhpcyA6LS9cbiAgICB9O1xuXG4gICAgc3RhdGUuc2V0RWRpdE1vZGUgPSAodG9XaGF0KSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgdG9XaGF0ID09PSAnYm9vbGVhbicpIHtcbiAgICAgICAgICAgIC8vIGlzQ2FyZExldmVsIGFuZCB0aGUgbGlrZVxuICAgICAgICAgICAgdG9XaGF0ID0gdG9XaGF0ID8gJ2VkaXRNb2RlJyA6ICdiZ0VkaXQnO1xuICAgICAgICB9XG4gICAgICAgIGlmIChbJ2VkaXRNb2RlJywnYmdFZGl0JywgJyddLmluY2x1ZGVzKHRvV2hhdCkpIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRNb2RlID0gdG9XaGF0O1xuICAgICAgICB9XG4gICAgICAgIGlmICh0b1doYXQgPT09IG51bGwgfHwgdG9XaGF0ID09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgc3RhdGUuZWRpdE1vZGUgPSAnJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBzdGF0ZS5lZGl0aW5nID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gISFzdGF0ZS5lZGl0TW9kZTtcbiAgICB9O1xuICAgIHN0YXRlLmVkaXRpbmdDYXJkID0gKCkgPT4ge1xuICAgICAgICByZXR1cm4gc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZSc7XG4gICAgfTtcbiAgICBzdGF0ZS5lZGl0aW5nQmFja2dyb3VuZCA9ICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmVkaXRNb2RlID09PSAnYmdFZGl0JztcbiAgICB9O1xuICAgIHN0YXRlLmdldEVkaXRTY29wZVBhdGggPSAoKSA9PiB7XG4gICAgICAgIGlmICghc3RhdGUuZWRpdGluZygpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3RhdGUuZWRpdGluZ0JhY2tncm91bmQoKVxuICAgICAgICAgICAgPyBbJ2JhY2tncm91bmRzJywgc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpXVxuICAgICAgICAgICAgOiBbJ2NhcmRzJywgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpXTtcbiAgICB9XG5cbiAgICAvLyB3aGF0IGFib3V0IGRyYWdnaW5nXG4gICAgLy8gbWF5YmUgZHJhZ2dpbmcgc3RheXMgaG93IGl0IGlzIGJlY2F1c2UgaXQgc2hvdWxkbid0IGhpdCB0aGUgZGlzayBldmVyXG5cbiAgICBzdGF0ZS5zYXZlRmllbGQgPSBmdW5jdGlvbihldmVudCwgZmllbGQsIHN0YXRlKSB7XG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgICBjb25zdCBjYXJkID0gc3RhdGUuZ2V0Q3VycmVudENhcmQoKTtcbiAgICAgICAgaWYgKGNhcmQuZmllbGRzW2ZpZWxkLm5hbWVdKSB7XG4gICAgICAgICAgICBzdGF0ZS5zZXRDdXJyZW50Q2FyZFByb3BlcnR5KFsnZmllbGRzJywgZmllbGQubmFtZSwgJ3ZhbHVlJ10sIG5ld1ZhbHVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlLnNldEN1cnJlbnRDYXJkUHJvcGVydHkoWyd2YWx1ZXMnLCBmaWVsZC5uYW1lXSwgbmV3VmFsdWUpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHJldHVybiBzdGF0ZTtcbn07XG4iLCJjb25zdCBzdGF0ZUFwaSA9IHJlcXVpcmUoJy4uL3N0YXRlQXBpJyk7XG5cblxuY29uc3QgQXBwU3RvcmUgPSBhc3luYyBmdW5jdGlvbihzdGF0ZSwgZW1pdHRlcikge1xuICAgIGNvbnN0IGxvY2FsQXJjID0gbmV3IERhdEFyY2hpdmUod2luZG93LmxvY2F0aW9uLnRvU3RyaW5nKCkpO1xuICAgIGNvbnN0IHJhd1N0YXRlID0gSlNPTi5wYXJzZShhd2FpdCBsb2NhbEFyYy5yZWFkRmlsZSgnc3RhY2suanNvbicpKTtcbiAgICBPYmplY3Qua2V5cyhyYXdTdGF0ZSkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICAgIHN0YXRlW2tleV0gPSByYXdTdGF0ZVtrZXldO1xuICAgIH0pO1xuXG4gICAgc3RhdGUgPSBzdGF0ZUFwaShzdGF0ZSwgZW1pdHRlcik7XG5cbiAgICBlbWl0dGVyLm9uKCdnb3RvJywgYXN5bmMgZnVuY3Rpb24oZm9yY2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAoc3RhdGUucGFyYW1zICYmIHN0YXRlLnBhcmFtcy53aGljaCkge1xuICAgICAgICAgICAgaWYgKE51bWJlci5pc05hTihwYXJzZUludChzdGF0ZS5wYXJhbXMud2hpY2gpKSAmJiBBcnJheS5pc0FycmF5KHN0YXRlLmNhcmRzKSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLnNldE5leHRDYXJkKHN0YXRlLmdldENhcmRzKCkuZmluZEluZGV4KChjZCkgPT4gY2QubmFtZSA9PSBzdGF0ZS5wYXJhbXMud2hpY2gpKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZChNYXRoLm1heChzdGF0ZS5uZXh0Q2FyZCwgMCkpOyAvLyBpbiBjYXNlIG9mIDQwNFxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZChzdGF0ZS5wYXJhbXMud2hpY2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIHN0YXRlLnBhcmFtcy53aGljaDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0eXBlb2Ygc3RhdGUubmV4dENhcmQgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICAgICAgICAgICAgKHN0YXRlLm5leHRDYXJkICE9PSBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCkgfHwgZm9yY2UgPT09IHRydWUpKSB7XG4gICAgICAgICAgICBsZXQgbnVtID0gc3RhdGUubmV4dENhcmQ7XG4gICAgICAgICAgICBzdGF0ZS5jYXJkID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuY2FyZHNbbnVtXSk7XG4gICAgICAgICAgICBzdGF0ZS5jdXJyZW50Q2FyZCA9IG51bTtcbiAgICAgICAgICAgIGlmICghc3RhdGUuYmFja2dyb3VuZCB8fFxuICAgICAgICAgICAgICAgICAgICBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpLmJhY2tncm91bmQgIT09IHN0YXRlLmdldEN1cnJlbnRCYWNrZ3JvdW5kSW5kZXgoKSkge1xuICAgICAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmQgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZS5nZXRCYWNrZ3JvdW5kRm9yQ2FyZChzdGF0ZS5jYXJkKSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdiYWNrZ3JvdW5kTG9hZGVkJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGF3YWl0IGFzeW5jRW1pdCgnY2FyZExvYWRlZCcpO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgZW1pdHRlci5vbignZ290b05leHRDYXJkJywgYXN5bmMgZnVuY3Rpb24od3JhcCA9IHRydWUpIHtcbiAgICAgICAgY29uc3QgY3VycmVudENhcmQgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCk7XG4gICAgICAgIHN0YXRlLnNldE5leHRDYXJkKChjdXJyZW50Q2FyZCArIDEgPj0gc3RhdGUuZ2V0Q2FyZENvdW50KCkpXG4gICAgICAgICAgICA/ICh3cmFwID8gMCA6IGN1cnJlbnRDYXJkKVxuICAgICAgICAgICAgOiBjdXJyZW50Q2FyZCArIDEpO1xuICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ2dvdG8nKTtcbiAgICB9KTtcbiAgICBlbWl0dGVyLm9uKCdnb3RvUHJldkNhcmQnLCBhc3luYyBmdW5jdGlvbih3cmFwID0gdHJ1ZSkge1xuICAgICAgICBjb25zdCBjdXJyZW50Q2FyZCA9IHN0YXRlLmdldEN1cnJlbnRDYXJkSW5kZXgoKTtcbiAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQoKGN1cnJlbnRDYXJkIC0gMSA8IDApXG4gICAgICAgICAgICA/ICh3cmFwID8gc3RhdGUuZ2V0Q2FyZENvdW50KCkgLSAxIDogMClcbiAgICAgICAgICAgIDogY3VycmVudENhcmQgLSAxKTtcbiAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdnb3RvJyk7XG4gICAgfSk7XG5cblxuICAgIGVtaXR0ZXIub24oJ3NhdmUnLCBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IHNhdmVkU3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZSk7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmNhcmQ7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmJhY2tncm91bmQ7XG4gICAgICAgIGRlbGV0ZSBzYXZlZFN0YXRlLmVkaXRNb2RlO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5lZGl0aW5nUGF0aDtcbiAgICAgICAgZGVsZXRlIHNhdmVkU3RhdGUucGFyYW1zO1xuICAgICAgICBkZWxldGUgc2F2ZWRTdGF0ZS5zdHlsZUNhY2hlO1xuICAgICAgICBmb3IgKGxldCBrZXkgb2YgT2JqZWN0LmtleXMoc2F2ZWRTdGF0ZSkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc2F2ZWRTdGF0ZVtrZXldID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHNhdmVkU3RhdGVba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBkZWxldGUgc2F2ZWRTdGF0ZS5xdWVyeTtcbiAgICAgICAgLy8gZGVsZXRlIHNhdmVkU3RhdGUuaHJlZjsgLy8gbW9yZSBjaG9vIGJ1aWx0aW5zXG4gICAgICAgIGF3YWl0IGxvY2FsQXJjLndyaXRlRmlsZSgnc3RhY2suanNvbicsXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeShzYXZlZFN0YXRlKSk7XG4gICAgICAgIHdpbmRvdy50ZXN0U3RhdGUgPSBzYXZlZFN0YXRlO1xuICAgIH0pO1xuXG5cbiAgICAvLyAvLyBraWNrIGl0IG9mZlxuICAgIC8vIGlmIChzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpKSB7XG4gICAgLy8gICAgIHN0YXRlLnNldE5leHRDYXJkKHN0YXRlLmdldEN1cnJlbnRDYXJkSW5kZXgoKSk7XG4gICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICAvLyB9XG5cblxuICAgIGNvbnN0IHN0eWxlU2hlZXQgPSBhd2FpdCBsb2NhbEFyYy5yZWFkRmlsZSgnc3RhY2suY3NzJyk7XG4gICAgc3RhdGUuc3R5bGVDYWNoZSA9IHN0eWxlU2hlZXQ7XG5cbiAgICBlbWl0dGVyLm9uKCdzZXRTdHlsZXMnLCBhc3luYyBmdW5jdGlvbihzdHlsZVRleHQpIHtcbiAgICAgICAgYXdhaXQgbG9jYWxBcmMud3JpdGVGaWxlKCdzdGFjay5jc3MnLCBzdHlsZVRleHQpO1xuXG4gICAgICAgIHN0YXRlLnN0eWxlQ2FjaGUgPSBzdHlsZVRleHQ7XG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgncmVuZGVyJyk7XG4gICAgfSk7XG5cblxuICAgIGVtaXR0ZXIub24oJ2Vuc3VyZVN0YXRpY0ZpbGVMaXN0cycsIGFzeW5jIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBuZWVkc0ZpcnN0UmVuZGVyID0gIShzdGF0ZS5zdGF0aWNGaWxlcyAmJiBzdGF0ZS5zdGF0aWNGaWxlcy5sZW5ndGgpO1xuICAgICAgICBjb25zdCBzdGF0aWNzID0gYXdhaXQgbG9jYWxBcmMucmVhZGRpcignL2ltZycsIHtyZWN1cnNpdmU6IHRydWV9KTtcbiAgICAgICAgc3RhdGUuc3RhdGljRmlsZXMgPSBzdGF0aWNzO1xuICAgICAgICBpZiAobmVlZHNGaXJzdFJlbmRlcikge1xuICAgICAgICAgICAgYXdhaXQgYXN5bmNFbWl0KCdyZW5kZXInKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbWFpbnRhaW5MaXN0c0hhbmRsZXIgPSAoe3BhdGh9KSA9PiBlbWl0dGVyLmVtaXQoJ2Vuc3VyZVN0YXRpY0ZpbGVMaXN0cycpO1xuICAgIGNvbnN0IHN0YXRpY3NNb25pdG9yID0gbG9jYWxBcmMuY3JlYXRlRmlsZUFjdGl2aXR5U3RyZWFtKCcvaW1nLyonKTtcbiAgICBzdGF0aWNzTW9uaXRvci5hZGRFdmVudExpc3RlbmVyKCdpbnZhbGlkYXRlZCcsIG1haW50YWluTGlzdHNIYW5kbGVyKTtcbiAgICBzdGF0aWNzTW9uaXRvci5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2VkJywgbWFpbnRhaW5MaXN0c0hhbmRsZXIpO1xuXG5cbiAgICBsZXQgYWx0S2V5UmVhZGllZCA9IGZhbHNlO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICgvXkFsdC8udGVzdChldmVudC5jb2RlKSkge1xuICAgICAgICAgICAgYWx0S2V5UmVhZGllZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoYWx0S2V5UmVhZGllZCkge1xuICAgICAgICAgICAgICAgIHN3aXRjaCAoZXZlbnQuY29kZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlICdFbnRlcic6IGVtaXR0ZXIuZW1pdCgndG9nZ2xlRWRpdE1vZGUnKTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0Fycm93UmlnaHQnOiBlbWl0dGVyLmVtaXQoJ2dvdG9OZXh0Q2FyZCcpOyBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnQXJyb3dMZWZ0JzogZW1pdHRlci5lbWl0KCdnb3RvUHJldkNhcmQnKTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ0tleU4nOiBlbWl0dGVyLmVtaXQoJ25ld0NhcmQnKTsgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGV2ZW50LmNvZGUgPT09IFwiRXNjYXBlXCIpIHtcbiAgICAgICAgICAgICAgICBhbHRLZXlSZWFkaWVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdPYmplY3QoKSkge1xuICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2Nsb3NlRWRpdCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdGluZygpKSB7XG4gICAgICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgndHVybk9mZkVkaXRNb2RlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoL15BbHQvLnRlc3QoZXZlbnQuY29kZSkgJiYgYWx0S2V5UmVhZGllZCkge1xuICAgICAgICAgICAgYWx0S2V5UmVhZGllZCA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdyZW5kZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGJhZEd1eXMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCdzZWxlY3QnKTtcbiAgICAgICAgICAgIC8vIHNvIG5hbWVkIG9ubHkgYmVjYXVzZSB0aGlzIGlzIHRvIGZpeCB3aGF0IHdlIGV4cGVyaWVuY2UgYXMgYSBidWchXG4gICAgICAgICAgICAvLyBXSEFUQ0hBIEdPTk5BIERPIFdIRU4gVEhFWSBDT01FIEZPUiBZT1VcbiAgICAgICAgICAgIGlmIChiYWRHdXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGJhZEd1eXMuZm9yRWFjaCgoZ3V5KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChndXkuaGFzQXR0cmlidXRlKCdkYXRhLXJlYWx2YWx1ZScpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBndXkucXVlcnlTZWxlY3RvckFsbCgnb3B0aW9uJykuZm9yRWFjaCgob3B0LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHQudmFsdWUgPT0gZ3V5LmdldEF0dHJpYnV0ZSgnZGF0YS1yZWFsdmFsdWUnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBndXkuc2VsZWN0ZWRJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgZ3V5LnF1ZXJ5U2VsZWN0b3JBbGwoJ29wdGlvbicpLmZvckVhY2goKG9wdCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob3B0Lmhhc0F0dHJpYnV0ZSgnc2VsZWN0ZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBndXkuc2VsZWN0ZWRJbmRleCA9IGluZGV4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIDEwKTtcbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGFzeW5jRW1pdCguLi5hcmdzKSB7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQuYXBwbHkoZW1pdHRlciwgYXJncyk7XG4gICAgICAgICAgICBzZXRUaW1lb3V0KHJlc29sdmUsIDEpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcFN0b3JlO1xuIiwiY29uc3Qge3BhcnNlQW5kUnVuQmVoYXZpb3JzfSA9IHJlcXVpcmUoJy4uL2JlaGF2aW9yLmpzJyk7XG5jb25zdCB7dW5pcXVlTmFtZX0gPSByZXF1aXJlKCcuLi91dGlsJyk7XG5cblxuY29uc3QgQmdTdG9yZSA9IChzdGF0ZSwgZW1pdHRlcikgPT4ge1xuICAgIGVtaXR0ZXIub24oJ2JhY2tncm91bmRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgYmcgPSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZCgpO1xuICAgICAgICBpZiAoYmcuYmVoYXZpb3IgJiYgYmcuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJzZUFuZFJ1bkJlaGF2aW9ycyhzdGF0ZSwgZW1pdHRlci5lbWl0LmJpbmQoZW1pdHRlciksIGJnLmJlaGF2aW9yKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ1BhdGggJiYgc3RhdGUuZWRpdGluZ1BhdGgubGVuZ3RoID09IDIgJiYgc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT0gJ2JhY2tncm91bmRzJykge1xuICAgICAgICAgICAgLy8gYWxyZWFkeSBpbiBiZy1lZGl0aW5nIG1vZGUsIHNvIHVwZGF0ZSB0aGUgcGF0aFxuICAgICAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGhbMV0gPSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZEluZGV4KCk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2NhcmRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgYmcgPSBzdGF0ZS5nZXRDdXJyZW50QmFja2dyb3VuZCgpO1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpLnZhbHVlcztcbiAgICAgICAgaWYgKHZhbHVlcykge1xuICAgICAgICAgICAgT2JqZWN0LmtleXModmFsdWVzKS5mb3JFYWNoKChmaWVsZE5hbWUpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYmcuZmllbGRzW2ZpZWxkTmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuc2V0Q3VycmVudEJhY2tncm91bmRQcm9wZXJ0eShbJ2ZpZWxkcycsIGZpZWxkTmFtZSwgJ3ZhbHVlJ10sXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZXNbZmllbGROYW1lXVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBibGFua0JnID0ge1xuICAgICAgICBuYW1lOiAnJyxcbiAgICAgICAgaW1hZ2VzOiBbXSxcbiAgICAgICAgZWxlbWVudHM6IFtdLFxuICAgICAgICBmaWVsZHM6IHt9LFxuICAgICAgICBiZWhhdmlvcjogW11cbiAgICB9O1xuXG4gICAgZW1pdHRlci5vbignbmV3QmcnLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgICAgIGlmIChuYW1lID09PSBudWxsIHx8IHR5cGVvZiBuYW1lID09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBuYW1lID0gdW5pcXVlTmFtZShbJ2JhY2tncm91bmRzJ10sICduZXdCZycpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmJhY2tncm91bmRzW25hbWVdID0gT2JqZWN0LmFzc2lnbih7fSwgYmxhbmtCZyk7XG4gICAgICAgIC8vIHRoZW4gZ28gdGhlcmU/XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdlZGl0QmcnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuZWRpdE9iamVjdChbJ2JhY2tncm91bmRzJywgc3RhdGUuZ2V0Q3VycmVudEJhY2tncm91bmRJbmRleCgpXSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdlbnZQcm9wZXJ0eUNoYW5nZScsIGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nKCkgJiYgc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT09ICdiYWNrZ3JvdW5kcycpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZXZlbnQudGFyZ2V0Lm5hbWU7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcblxuICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZHNbc3RhdGUuY3VycmVudEJhY2tncm91bmRdW3Byb3BOYW1lXSA9IG5ld1ZhbHVlO1xuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEJnU3RvcmU7XG4iLCJjb25zdCB7cGFyc2VBbmRSdW5CZWhhdmlvcnN9ID0gcmVxdWlyZSgnLi4vYmVoYXZpb3IuanMnKTtcblxuXG5jb25zdCBDYXJkU3RvcmUgPSAoc3RhdGUsIGVtaXR0ZXIpID0+IHtcbiAgICBlbWl0dGVyLm9uKCduZXdDYXJkJywgKHN0dWZmKSA9PiB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHN0dWZmKSkge1xuICAgICAgICAgICAgc3R1ZmYgPSBzdHVmZlswXTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIXN0dWZmKSB7XG4gICAgICAgICAgICBzdHVmZiA9IHt9O1xuICAgICAgICB9XG4gICAgICAgIGxldCBuZXdDYXJkID0gT2JqZWN0LmFzc2lnbih7fSwgc3RhdGUuY2FyZCwge1xuICAgICAgICAgICAgbmFtZTogJycsXG4gICAgICAgICAgICB2YWx1ZXM6IHt9LFxuICAgICAgICAgICAgaW1hZ2VzOiBbXSxcbiAgICAgICAgICAgIGVsZW1lbnRzOiBbXSxcbiAgICAgICAgICAgIGZpZWxkczoge30sXG4gICAgICAgICAgICBiZWhhdmlvcjogW11cbiAgICAgICAgfSwgc3R1ZmYpO1xuICAgICAgICBjb25zdCBuZXh0SW5kZXggPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCkgKyAxO1xuICAgICAgICBzdGF0ZS5jYXJkcy5zcGxpY2UobmV4dEluZGV4LCAwLCBuZXdDYXJkKTtcbiAgICAgICAgc3RhdGUuc2V0TmV4dENhcmQobmV4dEluZGV4KTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2dvdG8nKTtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICB9LCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ2NhcmRMb2FkZWQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgY2FyZCA9IHN0YXRlLmdldEN1cnJlbnRDYXJkKCk7XG4gICAgICAgIGlmIChjYXJkLmJlaGF2aW9yICYmIGNhcmQuYmVoYXZpb3IubGVuZ3RoKSB7XG4gICAgICAgICAgICBwYXJzZUFuZFJ1bkJlaGF2aW9ycyhzdGF0ZSwgZW1pdHRlci5lbWl0LmJpbmQoZW1pdHRlciksIGNhcmQuYmVoYXZpb3IpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nKCkgJiYgc3RhdGUuZ2V0RWRpdGVkT2JqZWN0VHlwZSgpID09ICdjYXJkJykge1xuICAgICAgICAgICAgLy8gYWxyZWFkeSBpbiBjYXJkLWVkaXRpbmcgbW9kZSwgc28gdXBkYXRlIHRoZSBwYXRoXG4gICAgICAgICAgICBzdGF0ZS5lZGl0T2JqZWN0KFsnY2FyZHMnLCBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCldKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdENhcmQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuZWRpdE9iamVjdChbJ2NhcmRzJywgc3RhdGUuZ2V0Q3VycmVudENhcmRJbmRleCgpXSk7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdkZWxldGVDYXJkJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChzdGF0ZS5nZXRDYXJkQ291bnQoKSA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGxldCBjdXJyZW50Q2FyZCA9IHN0YXRlLmdldEN1cnJlbnRDYXJkSW5kZXgoKTtcbiAgICAgICAgc3RhdGUuY2FyZHMuc3BsaWNlKGN1cnJlbnRDYXJkLCAxKTtcbiAgICAgICAgLy8gc29tZXRoaW5nIHdpdGggdGhlIGJhY2tncm91bmQgaWYgaXQgaXMgbm93IGNhcmRsZXNzP1xuICAgICAgICBpZiAoY3VycmVudENhcmQgPiAwKSB7XG4gICAgICAgICAgICBzdGF0ZS5zZXROZXh0Q2FyZCgtLWN1cnJlbnRDYXJkKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdnb3RvJyksIDEpO1xuICAgICAgICB9XG4gICAgICAgIHN0YXRlLmNhcmQgPSBzdGF0ZS5nZXRDdXJyZW50Q2FyZCgpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZW52UHJvcGVydHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ1BhdGggJiYgc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT09ICdjYXJkcycpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZXZlbnQudGFyZ2V0Lm5hbWU7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgIHN0YXRlLnNldFByb3BlcnR5QXRQYXRoKFsnY2FyZHMnLCBzdGF0ZS5nZXRDdXJyZW50Q2FyZEluZGV4KCksIHByb3BOYW1lXSwgbmV3VmFsdWUpXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICAgICAgfSwgMSk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FyZFN0b3JlO1xuIiwiY29uc3Qge3RvUHh9ID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG5jb25zdCBFZGl0U3RvcmUgPSAoc3RhdGUsIGVtaXR0ZXIpID0+IHtcbiAgICBlbWl0dGVyLm9uKCd0b2dnbGVFZGl0TW9kZScsIGZ1bmN0aW9uKGlzQ2FyZExldmVsRXZlbnQgPSB0cnVlKSB7XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nKCkpIHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgndHVybk9mZkVkaXRNb2RlJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5zZXRFZGl0TW9kZShpc0NhcmRMZXZlbEV2ZW50KTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBlbWl0dGVyLm9uKCdlZGl0QmdNb2RlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChzdGF0ZS5lZGl0aW5nQ2FyZCgpKSB7XG4gICAgICAgICAgICBzdGF0ZS5zZXRFZGl0TW9kZSgnYmdFZGl0Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzdGF0ZS5zZXRFZGl0TW9kZSgnZWRpdE1vZGUnKTtcbiAgICAgICAgfVxuICAgICAgICBlbWl0dGVyLmVtaXQoJ2Nsb3NlRWRpdCcpOyAvLyB0aGF0J2xsIHJlbmRlciBmb3IgdXNcbiAgICB9KTtcbiAgICBlbWl0dGVyLm9uKCd0dXJuT2ZmRWRpdE1vZGUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RhdGUuZWRpdE1vZGUgPSAnJztcbiAgICAgICAgc3RhdGUuZWRpdGluZ1BhdGggPSBudWxsO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IHN0YXRlLmVkaXRpbmdGaWVsZCA9IG51bGw7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCduZXdJbWFnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGF0ZS5hZGRpbmdJbWFnZSA9IHRydWU7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdzdGFydERyYWcnLCBmdW5jdGlvbihbc2NyZWVuWCwgc2NyZWVuWSwgb2Zmc2V0WCwgb2Zmc2V0WSwgdGFyZ2V0XSkge1xuICAgICAgICBzdGF0ZS5tb3VzZURvd24gPSBbc2NyZWVuWCwgc2NyZWVuWV07XG4gICAgICAgIGlmIChNYXRoLmFicyh0YXJnZXQuY2xpZW50SGVpZ2h0IC0gb2Zmc2V0WSkgPCAxMCkge1xuICAgICAgICAgICAgc3RhdGUucmVzaXplSW5mbyA9IHtcbiAgICAgICAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjZWRpdGJhcicpLmNsaWVudEhlaWdodFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIGlmIChNYXRoLmFicyh0YXJnZXQuY2xpZW50V2lkdGggLSBvZmZzZXRYKSA8IDEwKSB7XG4gICAgICAgICAgICBzdGF0ZS5yZXNpemVJbmZvID0ge1xuICAgICAgICAgICAgICAgIHRhcmdldCxcbiAgICAgICAgICAgICAgICB3aWR0aDogdHJ1ZVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlLmRyYWdJbmZvID0ge1xuICAgICAgICAgICAgICAgIG9mZnNldFgsXG4gICAgICAgICAgICAgICAgb2Zmc2V0WTogb2Zmc2V0WSArIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNlZGl0YmFyJykuY2xpZW50SGVpZ2h0LFxuICAgICAgICAgICAgICAgIHRhcmdldFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZmluaXNoRHJhZycsIGZ1bmN0aW9uKFtmb2xsb3dPbkFjdGlvbiwgc2NyZWVuWCwgc2NyZWVuWSwgeCwgeSwgaWRlbnRdKSB7XG4gICAgICAgIGNvbnN0IFtzdGFydFgsIHN0YXJ0WV0gPSBzdGF0ZS5tb3VzZURvd247XG4gICAgICAgIGlmIChNYXRoLmFicyhzY3JlZW5YIC0gc3RhcnRYKSA+PSAxMCB8fCBNYXRoLmFicyhzY3JlZW5ZIC0gc3RhcnRZKSA+PSAxMCkge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KGZvbGxvd09uQWN0aW9uLCBbaWRlbnQsIHgsIHldKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0TW9kZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGV2dC50YXJnZXQuY2xhc3NOYW1lLmluY2x1ZGVzKCdtb3ZhYmxlJykpIHtcbiAgICAgICAgICAgIGlmIChldnQudGFyZ2V0Lm5vZGVOYW1lID09ICdJTUcnKSB7XG4gICAgICAgICAgICAgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoc3RhdGUuZHJhZ0luZm8pIHtcbiAgICAgICAgICAgICAgICBldnQudGFyZ2V0LnN0eWxlLnRvcCA9IChldnQucGFnZVkgLSBzdGF0ZS5kcmFnSW5mby5vZmZzZXRZKSArICdweCc7XG4gICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5zdHlsZS5sZWZ0ID0gKGV2dC5wYWdlWCAtIHN0YXRlLmRyYWdJbmZvLm9mZnNldFgpICsgJ3B4JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUucmVzaXplSW5mbykge1xuICAgICAgICAgICAgICAgIGlmIChzdGF0ZS5yZXNpemVJbmZvLndpZHRoKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2dC50YXJnZXQuc3R5bGUud2lkdGggPSAoZXZ0LnBhZ2VYIC0gdG9QeChldnQudGFyZ2V0LnN0eWxlLmxlZnQpXG4gICAgICAgICAgICAgICAgICAgICAgICAtIHRvUHgoZXZ0LnRhcmdldC5zdHlsZS5wYWRkaW5nTGVmdClcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gdG9QeChldnQudGFyZ2V0LnN0eWxlLnBhZGRpbmdSaWdodCkpICsgJ3B4JztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBldnQudGFyZ2V0LnN0eWxlLmhlaWdodCA9IChldnQucGFnZVkgLSBzdGF0ZS5yZXNpemVJbmZvLmhlaWdodCAvLyB0aGUgZWRpdGJhciFcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gdG9QeChldnQudGFyZ2V0LnN0eWxlLnRvcClcbiAgICAgICAgICAgICAgICAgICAgICAgIC0gdG9QeChldnQudGFyZ2V0LnN0eWxlLnBhZGRpbmdUb3ApXG4gICAgICAgICAgICAgICAgICAgICAgICAtIHRvUHgoZXZ0LnRhcmdldC5zdHlsZS5wYWRkaW5nQm90dG9tKSkgKyAncHgnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXZ0LnRhcmdldC5zdHlsZS5jdXJzb3IgPVxuICAgICAgICAgICAgICAgICAgICBldnQudGFyZ2V0LmNsaWVudEhlaWdodCAtIGV2dC5vZmZzZXRZIDwgMTBcbiAgICAgICAgICAgICAgICAgICAgICAgID8gJ25zLXJlc2l6ZSdcbiAgICAgICAgICAgICAgICAgICAgICAgIDogKGV2dC50YXJnZXQuY2xpZW50V2lkdGggLSBldnQub2Zmc2V0WCA8IDEwXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPyAnZXctcmVzaXplJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogJycpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRTdG9yZTtcbiIsImNvbnN0IEVkaXRNb2RhbFN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgZW1pdHRlci5vbignY2xvc2VFZGl0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdQYXRoID0gbnVsbDtcbiAgICAgICAgc3RhdGUuZWRpdGluZ0VsZW1lbnQgPSBudWxsO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nRmllbGQgPSBudWxsO1xuICAgICAgICBzdGF0ZS5lZGl0aW5nSW1hZ2UgPSBudWxsO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbigndG9nZ2xlRnVuY3Rpb25FZGl0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmVkaXRpbmdGdW5jdGlvbiA9IHN0YXRlLmVkaXRpbmdGdW5jdGlvbiA/IGZhbHNlIDogdHJ1ZTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3Byb3BlcnR5Q2hhbmdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgbGV0IHByb3BOYW1lID0gZXZlbnQudGFyZ2V0Lm5hbWU7XG4gICAgICAgIGxldCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgICAgbGV0IGVkaXRQYXRoID0gc3RhdGUuZWRpdGluZ1BhdGg7XG5cbiAgICAgICAgc3RhdGUuc2V0UHJvcGVydHlBdFBhdGgoZWRpdFBhdGguY29uY2F0KFtwcm9wTmFtZV0pLCBuZXdWYWx1ZSlcbiAgICAgICAgLyogKi9cbiAgICAgICAgaWYgKGVkaXRQYXRoWzBdID09PSAnY2FyZHMnKSB7XG4gICAgICAgICAgICBzdGF0ZS5jYXJkID0gc3RhdGVbZWRpdFBhdGhbMF1dW2VkaXRQYXRoWzFdXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlLmJhY2tncm91bmQgPSBzdGF0ZVtlZGl0UGF0aFswXV1bZWRpdFBhdGhbMV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHN0YXRlLmVkaXRpbmdFbGVtZW50KSB7XG4gICAgICAgICAgICBzdGF0ZS5lZGl0aW5nRWxlbWVudCA9IHN0YXRlW2VkaXRQYXRoWzBdXVtlZGl0UGF0aFsxXV1bZWRpdFBhdGhbMl1dW2VkaXRQYXRoWzNdXTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZS5lZGl0aW5nRmllbGQpIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdGaWVsZCA9IHN0YXRlW2VkaXRQYXRoWzBdXVtlZGl0UGF0aFsxXV1bZWRpdFBhdGhbMl1dW2VkaXRQYXRoWzNdXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN0YXRlLmVkaXRpbmdJbWFnZSA9IHN0YXRlW2VkaXRQYXRoWzBdXVtlZGl0UGF0aFsxXV1bZWRpdFBhdGhbMl1dW2VkaXRQYXRoWzNdXTtcbiAgICAgICAgfSAvLyBobW0gZG8gd2UgbmVlZCBhIHJlZmFjdG9yPyBNQUFBQVlZWVlZQkVcbiAgICAgICAgLyogKi9cbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgIH0sIDEpO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdFN0YWNrJywgZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0YXRlLmVkaXRPYmplY3QoWydzdGFjayddKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3N0YWNrUHJvcGVydHlDaGFuZ2UnLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdGluZ1BhdGggJiYgc3RhdGUuZWRpdGluZ1BhdGhbMF0gPT09ICdzdGFjaycpIHtcbiAgICAgICAgICAgIGNvbnN0IHByb3BOYW1lID0gZXZlbnQudGFyZ2V0Lm5hbWU7XG4gICAgICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IGV2ZW50LnRhcmdldC52YWx1ZTtcblxuICAgICAgICAgICAgaWYgKFsnY29sb3InXS5pbmNsdWRlcyhwcm9wTmFtZSkpIHsgLy8gbGlzdCB3aWxsIGV4cGFuZCBpbiBmdXR1cmUsIG9idnNcbiAgICAgICAgICAgICAgICBzdGF0ZVtwcm9wTmFtZV0gPSBuZXdWYWx1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICB9XG4gICAgfSlcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdE1vZGFsU3RvcmU7XG4iLCJjb25zdCB7bW9kRW52LCBtb2RQYXRofSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBFbGVtZW50U3RvcmUgPSAoc3RhdGUsIGVtaXR0ZXIpID0+IHtcbiAgICBjb25zdCBjaGFuZ2UgPSBtb2RFbnYoc3RhdGUsIGVtaXR0ZXIpO1xuICAgIGNvbnN0IHBva2UgPSBtb2RQYXRoKHN0YXRlLCBlbWl0dGVyKTtcblxuICAgIGNvbnN0IGJsYW5rRWxlbWVudCA9IHtcbiAgICAgICAgXCJ0b3BcIjogXCIzMDBweFwiLFxuICAgICAgICBcImxlZnRcIjogXCIzMDBweFwiLFxuICAgICAgICBcImhlaWdodFwiOiBcIjM1cHhcIixcbiAgICAgICAgXCJ3aWR0aFwiOiBcIjEwMHB4XCIsXG4gICAgICAgIFwiY29sb3JcIjogXCIjZGRkXCIsXG4gICAgICAgIFwidGV4dFwiOiBcIlwiLFxuICAgICAgICBcImZvbnRcIjogXCJcIixcbiAgICAgICAgXCJzaXplXCI6IFwiMS42cmVtXCIsXG4gICAgICAgIFwic3R5bGVcIjogXCJcIixcbiAgICAgICAgXCJ0ZXh0Q29sb3JcIjogXCIjMzMzXCIsXG4gICAgICAgIFwiY2xhc3NcIjogXCJcIixcbiAgICAgICAgXCJiZWhhdmlvclwiOiBbXVxuICAgIH07XG5cbiAgICBlbWl0dGVyLm9uKCduZXdFbGVtZW50JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgY2FyZC5lbGVtZW50cy5wdXNoKE9iamVjdC5hc3NpZ24oe30sIGJsYW5rRWxlbWVudCkpO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZWRpdEVsZW1lbnQnLCBhc3luYyBmdW5jdGlvbihbZWxlbWVudCwgaW5kZXgsIGlzQ2FyZCA9IGZhbHNlXSkge1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRNb2RlKSB7XG4gICAgICAgICAgICBhd2FpdCBhc3luY0VtaXQoJ3RvZ2dsZUVkaXRNb2RlJywgaXNDYXJkKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5lZGl0T2JqZWN0KFsnZWxlbWVudHMnLCBpbmRleF0pXG4gICAgICAgIGF3YWl0IGFzeW5jRW1pdCgncmVuZGVyJyk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdtb3ZlRWxlbWVudCcsIGZ1bmN0aW9uKFtpbmRleCwgeCwgeV0pIHtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKGNhcmQuZWxlbWVudHNbaW5kZXhdLFxuICAgICAgICAgICAgICAgIHt0b3A6IHksIGxlZnQ6IHh9KTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3Jlc2l6ZUVsZW1lbnQnLCBmdW5jdGlvbihbaW5kZXgsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmVsZW1lbnRzW2luZGV4XSxcbiAgICAgICAgICAgICAgICB7aGVpZ2h0OiB5LCB3aWR0aDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignc2V0QmVoYXZpb3JPYmonLCBmdW5jdGlvbihbcGF0aCwgdmFsdWVdKSB7XG4gICAgICAgIHBva2UocGF0aCwgdmFsdWUpO1xuICAgICAgICAvLyByZWR1bmRhbnRseSByZW5kZXJpbmcgYmVjYXVzZSBzZWxlY3QgZWxlbWVudHMgYXJlIHRoZSB3b3JzdFxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGVtaXR0ZXIuZW1pdCgncmVuZGVyJyksIDEpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gYXN5bmNFbWl0KCkge1xuICAgICAgICBsZXQgYXJncyA9IFsuLi5hcmd1bWVudHNdO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0LmFwcGx5KGVtaXR0ZXIsIGFyZ3MpO1xuICAgICAgICAgICAgc2V0VGltZW91dChyZXNvbHZlLCAxKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZW1pdHRlci5vbignZGVsZXRlRWxlbWVudCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHN0YXRlLmdldEVkaXRlZE9iamVjdEluZGV4KCk7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgY2FyZC5lbGVtZW50cy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgICAgICBlbWl0dGVyLmVtaXQoJ2Nsb3NlRWRpdCcpO1xuICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFbGVtZW50U3RvcmU7XG4iLCJjb25zdCB7bW9kRW52LCBtb2RQYXRoLCB1bmlxdWVOYW1lfSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBzYXZlRmllbGRUb1N0YXRlID0gZnVuY3Rpb24oZXZlbnQsIGZpZWxkLCBzdGF0ZSkge1xuICAgIGNvbnN0IG5ld1ZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXG4gICAgaWYgKHN0YXRlLmdldEN1cnJlbnRDYXJkKCkuZmllbGRzW2ZpZWxkLm5hbWVdKSB7XG4gICAgICAgIHN0YXRlLnNldEN1cnJlbnRDYXJkUHJvcGVydHkoWydmaWVsZHMnLCBmaWVsZC5uYW1lLCAndmFsdWUnXSwgbmV3VmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0YXRlLnNldEN1cnJlbnRDYXJkUHJvcGVydHkoWyd2YWx1ZXMnLCBmaWVsZC5uYW1lXSwgbmV3VmFsdWUpO1xuICAgIH1cbn07XG5cbmNvbnN0IEZpZWxkU3RvcmUgPSAoc3RhdGUsIGVtaXR0ZXIpID0+IHtcbiAgICBlbWl0dGVyLm9uKFwiZmllbGRjaGFuZ2VcIiwgZnVuY3Rpb24oW2V2ZW50LCBmaWVsZF0pIHtcbiAgICAgICAgc2F2ZUZpZWxkVG9TdGF0ZShldmVudCwgZmllbGQsIHN0YXRlKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoXCJyZW5kZXJcIik7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoXCJzYXZlXCIpO1xuICAgICAgICB9LCAxKTtcbiAgICB9KTtcbiAgICBlbWl0dGVyLm9uKFwiZmllbGRLZXlVcFwiLCAoW2V2ZW50LCBmaWVsZF0pID0+IHtcbiAgICAgICAgc2F2ZUZpZWxkVG9TdGF0ZShldmVudCwgZmllbGQsIHN0YXRlKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoXCJzYXZlXCIpLCAxKTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGJsYW5rRmllbGQgPSB7XG4gICAgICAgIG5hbWU6IFwiXCIsXG4gICAgICAgIHRvcDogXCIzMDBweFwiLFxuICAgICAgICBsZWZ0OiBcIjMwMHB4XCIsXG4gICAgICAgIGhlaWdodDogXCIxNHB4XCIsXG4gICAgICAgIHdpZHRoOiBcIjE4MHB4XCIsXG4gICAgICAgIGNvbG9yOiBcIlwiLFxuICAgICAgICBmb250OiBcIlwiLFxuICAgICAgICBzaXplOiBcIlwiLFxuICAgICAgICBzdHlsZTogXCJcIixcbiAgICAgICAgdGV4dENvbG9yOiBcIlwiLFxuICAgICAgICBmaWVsZFR5cGU6IFwidGV4dFwiLFxuICAgICAgICB2YWx1ZTogXCJcIixcbiAgICAgICAgb3B0aW9uczogW10sXG4gICAgICAgIHBsYWNlaG9sZGVyOiBcIlwiLFxuICAgICAgICBiZWhhdmlvcjogW11cbiAgICB9O1xuXG4gICAgY29uc3QgY2hhbmdlID0gbW9kRW52KHN0YXRlLCBlbWl0dGVyKTtcblxuICAgIGVtaXR0ZXIub24oXCJuZXdGaWVsZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgbGV0IGZpZWxkTmFtZSA9IHVuaXF1ZU5hbWUoXG4gICAgICAgICAgICBzdGF0ZS5nZXRFZGl0U2NvcGVQYXRoKCkuY29uY2F0KFsnZmllbGRzJ10pLFxuICAgICAgICAgICAgJ25ld0ZpZWxkJ1xuICAgICAgICApO1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuZmllbGRzW2ZpZWxkTmFtZV0gPSBPYmplY3QuYXNzaWduKHt9LCBibGFua0ZpZWxkLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogZmllbGROYW1lXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oXCJtb3ZlRmllbGRcIiwgZnVuY3Rpb24oW2ZpZWxkTmFtZSwgeCwgeV0pIHtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKGNhcmQuZmllbGRzW2ZpZWxkTmFtZV0sXG4gICAgICAgICAgICAgICAge3RvcDogeSwgbGVmdDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbihcInJlc2l6ZUZpZWxkXCIsIGZ1bmN0aW9uKFtmaWVsZE5hbWUsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmZpZWxkc1tmaWVsZE5hbWVdLFxuICAgICAgICAgICAgICAgIHtoZWlnaHQ6IHksIHdpZHRoOiB4fSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdlZGl0RmllbGQnLCBmdW5jdGlvbihbZmllbGQsIG5hbWUsIGlzQ2FyZCA9IGZhbHNlXSkge1xuICAgICAgICBpZiAoIXN0YXRlLmVkaXRpbmcoKSkge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCd0b2dnbGVFZGl0TW9kZScpO1xuICAgICAgICB9XG4gICAgICAgIGlmICgoc3RhdGUuZWRpdGluZ0JhY2tncm91bmQoKSAmJiAhaXNDYXJkKSB8fFxuICAgICAgICAgICAgKHN0YXRlLmVkaXRpbmdDYXJkKCkgJiYgaXNDYXJkKSlcbiAgICAgICAge1xuICAgICAgICAgICAgc3RhdGUuZWRpdE9iamVjdChbJ2ZpZWxkcycsIG5hbWVdKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4gZW1pdHRlci5lbWl0KCdyZW5kZXInKSwgMSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ3NldEZpZWxkT3B0aW9ucycsIGZ1bmN0aW9uKG9wdGlvbnMpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBzdGF0ZS5nZXRFZGl0ZWRPYmplY3RJbmRleCgpO1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGNhcmQuZmllbGRzW2luZGV4XS5vcHRpb25zID0gb3B0aW9ucztcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KVxuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbignZGVsZXRlRmllbGQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgY29uc3QgaW5kZXggPSBzdGF0ZS5nZXRFZGl0ZWRPYmplY3RJbmRleCgpO1xuICAgICAgICBjaGFuZ2UoKGNhcmQpID0+IHtcbiAgICAgICAgICAgIGRlbGV0ZSBjYXJkLmZpZWxkc1tpbmRleF07XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgICAgIGVtaXR0ZXIuZW1pdCgnY2xvc2VFZGl0Jyk7XG4gICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZpZWxkU3RvcmU7XG4iLCJjb25zdCB7bW9kRW52fSA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuXG5jb25zdCBJbWFnZVN0b3JlID0gKHN0YXRlLCBlbWl0dGVyKSA9PiB7XG4gICAgY29uc3QgY2hhbmdlID0gbW9kRW52KHN0YXRlLCBlbWl0dGVyKTtcblxuICAgIGVtaXR0ZXIub24oJ2FkZEltYWdlJywgZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgLy8gY29wcGVkIGFuZCBtb2RpZmllZCBmcm9tIEB0YXJhdmFuY2lsJ3MgZGF0LXBob3RvLWFwcFxuICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LmZpbGVzKSB7XG4gICAgICAgICAgICBjb25zdCB7ZmlsZXN9ID0gZXZlbnQudGFyZ2V0O1xuICAgICAgICAgICAgY29uc3QgYXJjaGl2ZSA9IG5ldyBEYXRBcmNoaXZlKHdpbmRvdy5sb2NhdGlvbik7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZmlsZXMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBmaWxlc1tpXTtcblxuICAgICAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBhc3luYyBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGAvaW1nLyR7ZmlsZS5uYW1lfWA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9yaWVudGF0aW9uID0gcmVhZE9yaWVudGF0aW9uTWV0YWRhdGEocmVhZGVyLnJlc3VsdCk7XG5cbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXQgPSBhd2FpdCBhcmNoaXZlLnN0YXQocGF0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbXBsYWludCA9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBJbWFnZSB3aXRoIHRoZSBuYW1lIFwiJHtmaWxlLm5hbWV9XCIgYWxyZWFkeSBleGlzdHMuIFJlcGxhY2UgaXQ/YDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAod2luZG93LmNvbmZpcm0oY29tcGxhaW50KSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBhcmNoaXZlLndyaXRlRmlsZShwYXRoLCByZWFkZXIucmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgYXJjaGl2ZS5jb21taXQoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWRkSW1hZ2VPYmplY3QocGF0aCwgb3JpZW50YXRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgYXJjaGl2ZS53cml0ZUZpbGUocGF0aCwgcmVhZGVyLnJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBhcmNoaXZlLmNvbW1pdCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkSW1hZ2VPYmplY3QocGF0aCwgb3JpZW50YXRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgc3RhdGUuYWRkaW5nSW1hZ2UgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdzYXZlJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihmaWxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGFzc3VtaW5nIGEgZmlsZW5hbWUgZnJvbSB0aGUgbWVudSBvZiBleGlzdGluZyBmaWxlc1xuICAgICAgICAgICAgaWYgKGV2ZW50LnRhcmdldC52YWx1ZSAhPT0gbnVsbCAmJiBldmVudC50YXJnZXQudmFsdWUgIT0gJ251bGwnKSB7IC8vICpzaWdoKlxuICAgICAgICAgICAgICAgIGFkZEltYWdlT2JqZWN0KGAvaW1nLyR7ZXZlbnQudGFyZ2V0LnZhbHVlfWApO1xuICAgICAgICAgICAgICAgIHN0YXRlLmFkZGluZ0ltYWdlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICAgICAgICAgIH0sIDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBhZGRJbWFnZU9iamVjdChwYXRoLCBvcmllbnRhdGlvbiA9IDEpIHtcbiAgICAgICAgY29uc3QgbmV3Z3V5ID0ge1xuICAgICAgICAgICAgdG9wOiAnMzAwcHgnLFxuICAgICAgICAgICAgbGVmdDogJzMwMHB4JyxcbiAgICAgICAgICAgIHNyYzogcGF0aCxcbiAgICAgICAgICAgIG9yaWVudGF0aW9uLFxuICAgICAgICAgICAgYmVoYXZpb3I6IFtdXG4gICAgICAgIH07XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgY2FyZC5pbWFnZXMucHVzaChuZXdndXkpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBhbHNvIGNyaWJiZWQgZnJvbSBkYXQtcGhvdG8tYXBwIGFuZCBub3QgZXZlbiBtb2RpZmllZCBiZWNhdXNlIEkgYW0gbm90IHNtYXJ0XG4gICAgZnVuY3Rpb24gcmVhZE9yaWVudGF0aW9uTWV0YWRhdGEgKGJ1Zikge1xuICAgICAgICBjb25zdCBzY2FubmVyID0gbmV3IERhdGFWaWV3KGJ1Zik7XG4gICAgICAgIGxldCBpZHggPSAwO1xuICAgICAgICBsZXQgdmFsdWUgPSAxOyAvLyBOb24tcm90YXRlZCBpcyB0aGUgZGVmYXVsdFxuXG4gICAgICAgIGlmIChidWYubGVuZ3RoIDwgMiB8fCBzY2FubmVyLmdldFVpbnQxNihpZHgpICE9IDB4RkZEOCkge1xuICAgICAgICAgIC8vIG5vdCBhIEpQRUdcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZHggKz0gMjtcblxuICAgICAgICBsZXQgbWF4Qnl0ZXMgPSBzY2FubmVyLmJ5dGVMZW5ndGg7XG4gICAgICAgIHdoaWxlKGlkeCA8IG1heEJ5dGVzIC0gMikge1xuICAgICAgICAgIGxldCB1aW50MTYgPSBzY2FubmVyLmdldFVpbnQxNihpZHgpO1xuICAgICAgICAgIGlkeCArPSAyO1xuICAgICAgICAgIHN3aXRjaCh1aW50MTYpIHtcbiAgICAgICAgICAgIGNhc2UgMHhGRkUxOiAvLyBTdGFydCBvZiBFWElGXG4gICAgICAgICAgICAgIHZhciBleGlmTGVuZ3RoID0gc2Nhbm5lci5nZXRVaW50MTYoaWR4KTtcbiAgICAgICAgICAgICAgbWF4Qnl0ZXMgPSBleGlmTGVuZ3RoIC0gaWR4O1xuICAgICAgICAgICAgICBpZHggKz0gMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDB4MDExMjogLy8gT3JpZW50YXRpb24gdGFnXG4gICAgICAgICAgICAgIC8vIFJlYWQgdGhlIHZhbHVlLCBpdHMgNiBieXRlcyBmdXJ0aGVyIG91dFxuICAgICAgICAgICAgICAvLyBTZWUgcGFnZSAxMDIgYXQgdGhlIGZvbGxvd2luZyBVUkxcbiAgICAgICAgICAgICAgLy8gaHR0cDovL3d3dy5rb2Rhay5jb20vZ2xvYmFsL3BsdWdpbnMvYWNyb2JhdC9lbi9zZXJ2aWNlL2RpZ0NhbS9leGlmU3RhbmRhcmQyLnBkZlxuICAgICAgICAgICAgICB2YWx1ZSA9IHNjYW5uZXIuZ2V0VWludDE2KGlkeCArIDYsIGZhbHNlKTtcbiAgICAgICAgICAgICAgbWF4Qnl0ZXMgPSAwOyAvLyBTdG9wIHNjYW5uaW5nXG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgZW1pdHRlci5vbignZWRpdEltYWdlJywgZnVuY3Rpb24oW2ltYWdlLCBpbmRleF0pIHtcbiAgICAgICAgaWYgKCFzdGF0ZS5lZGl0aW5nKCkpIHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgndG9nZ2xlRWRpdE1vZGUnKTtcbiAgICAgICAgfVxuICAgICAgICBzdGF0ZS5lZGl0T2JqZWN0KFsnaW1hZ2VzJywgaW5kZXhdKTtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiBlbWl0dGVyLmVtaXQoJ3JlbmRlcicpLCAxKTtcbiAgICB9KTtcblxuICAgIGVtaXR0ZXIub24oJ21vdmVJbWFnZScsIGZ1bmN0aW9uKFtpbmRleCwgeCwgeV0pIHtcbiAgICAgICAgY2hhbmdlKChjYXJkKSA9PiB7XG4gICAgICAgICAgICBPYmplY3QuYXNzaWduKGNhcmQuaW1hZ2VzW2luZGV4XSwge3RvcDogeSwgbGVmdDogeH0pO1xuICAgICAgICAgICAgcmV0dXJuIGNhcmQ7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgZW1pdHRlci5vbigncmVzaXplSW1hZ2UnLCBmdW5jdGlvbihbaW5kZXgsIHgsIHldKSB7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgT2JqZWN0LmFzc2lnbihjYXJkLmltYWdlc1tpbmRleF0sIHtoZWlnaHQ6IHksIHdpZHRoOiB4fSk7XG4gICAgICAgICAgICByZXR1cm4gY2FyZDtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBlbWl0dGVyLm9uKCdkZWxldGVJbWFnZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zdCBpbmRleCA9IHN0YXRlLmdldEVkaXRlZE9iamVjdEluZGV4KCk7XG4gICAgICAgIGNoYW5nZSgoY2FyZCkgPT4ge1xuICAgICAgICAgICAgY2FyZC5pbWFnZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgIHJldHVybiBjYXJkO1xuICAgICAgICB9KTtcbiAgICAgICAgZW1pdHRlci5lbWl0KCdjbG9zZUVkaXQnKTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW1hZ2VTdG9yZTtcbiIsImNvbnN0IGh0bWwgPSByZXF1aXJlKCdjaG9vL2h0bWwnKTtcbmNvbnN0IHV1aWQgPSByZXF1aXJlKCd1dWlkL3YxJyk7XG5cblxuZnVuY3Rpb24gbW9kRW52KHN0YXRlLCBlbWl0dGVyKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGhvdykge1xuICAgICAgICBpZiAoc3RhdGUuZWRpdE1vZGUgPT09ICdiZ0VkaXQnKSB7XG4gICAgICAgICAgICBsZXQgbmV3QmdTdGF0ZSA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXSk7XG4gICAgICAgICAgICBuZXdCZ1N0YXRlID0gaG93KG5ld0JnU3RhdGUpO1xuICAgICAgICAgICAgc3RhdGUuYmFja2dyb3VuZHNbc3RhdGUuY3VycmVudEJhY2tncm91bmRdID0gc3RhdGUuYmFja2dyb3VuZCA9IG5ld0JnU3RhdGU7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUuZWRpdE1vZGUgPT09ICdlZGl0TW9kZScpIHtcbiAgICAgICAgICAgIGxldCBuZXdDYXJkU3RhdGUgPSBPYmplY3QuYXNzaWduKHt9LCBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF0pO1xuICAgICAgICAgICAgbmV3Q2FyZFN0YXRlID0gaG93KG5ld0NhcmRTdGF0ZSk7XG4gICAgICAgICAgICBzdGF0ZS5jYXJkc1tzdGF0ZS5jdXJyZW50Q2FyZF0gPSBzdGF0ZS5jYXJkID0gbmV3Q2FyZFN0YXRlO1xuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdyZW5kZXInKTtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnc2F2ZScpO1xuICAgICAgICB9LCAxKTtcbiAgICB9XG59XG5cbi8vIGlmIHN0YXRlIGdldHMgYmlnIHRoaXMgbWlnaHQgc2VyaW91c2x5IG1lc3MgdXMgdXAuIGxldCdzIHNlZVxuZnVuY3Rpb24gbW9kUGF0aChzdGF0ZSwgZW1pdHRlcikge1xuICAgIGNvbnN0IGdldEFuZFJlcGxhY2VQYXRoID0gZnVuY3Rpb24ocGF0aCwgdmFsdWUsIGluV2hhdCkge1xuICAgICAgICBsZXQgY3VyclRhcmdldDtcbiAgICAgICAgaWYgKHBhdGgubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgY3VyclRhcmdldCA9IHBhdGguc2hpZnQoKTtcbiAgICAgICAgICAgIGluV2hhdFtjdXJyVGFyZ2V0XSA9XG4gICAgICAgICAgICAgICAgZ2V0QW5kUmVwbGFjZVBhdGgocGF0aCwgdmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIEFycmF5LmlzQXJyYXkoaW5XaGF0W2N1cnJUYXJnZXRdKVxuICAgICAgICAgICAgICAgICAgICAgICAgPyBbXS5jb25jYXQoaW5XaGF0W2N1cnJUYXJnZXRdKVxuICAgICAgICAgICAgICAgICAgICAgICAgOiBPYmplY3QuYXNzaWduKHt9LCBpbldoYXRbY3VyclRhcmdldF0pKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGluV2hhdFtwYXRoWzBdXSA9IHZhbHVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbldoYXQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKHBhdGgsIHZhbHVlKSB7XG4gICAgICAgIHN0YXRlID0gZ2V0QW5kUmVwbGFjZVBhdGgoW10uY29uY2F0KHBhdGgpLCB2YWx1ZSwgc3RhdGUpO1xuICAgICAgICBzdGF0ZS5jYXJkID0gc3RhdGUuY2FyZHNbc3RhdGUuY3VycmVudENhcmRdO1xuICAgICAgICBzdGF0ZS5iYWNrZ3JvdW5kID0gc3RhdGUuYmFja2dyb3VuZHNbc3RhdGUuY3VycmVudEJhY2tncm91bmRdO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgncmVuZGVyJyk7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3NhdmUnKTtcbiAgICAgICAgfSwgMSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRQYXRoKHN0YXRlLCBwYXRoKSB7XG4gICAgY29uc3QgY29uc3VtZVRoaXNQYXRoID0gW10uY29uY2F0KHBhdGgpO1xuICAgIGxldCByZXR1cm5lZCA9IHN0YXRlW2NvbnN1bWVUaGlzUGF0aC5zaGlmdCgpXTtcbiAgICB3aGlsZSAoY29uc3VtZVRoaXNQYXRoLmxlbmd0aCkge1xuICAgICAgICByZXR1cm5lZCA9IHJldHVybmVkW2NvbnN1bWVUaGlzUGF0aC5zaGlmdCgpXTtcbiAgICB9XG4gICAgcmV0dXJuIHJldHVybmVkO1xufVxuXG5mdW5jdGlvbiB0b1B4KHN0clZhbCkge1xuICAgIGNvbnN0IHRyeWF2YWwgPSBwYXJzZUludChzdHJWYWwuc3Vic3RyaW5nKDAsIHN0clZhbC5pbmRleE9mKCdweCcpKSk7XG4gICAgcmV0dXJuIE51bWJlci5pc05hTih0cnlhdmFsKSA/IDAgOiB0cnlhdmFsO1xufVxuXG5mdW5jdGlvbiBzZWxlY3RPcHRpb24odmFsLCBsYWJlbCwgY29tcGFyZVZhbCwgcmVhY3RLZXkpIHtcbiAgICBpZiAodHlwZW9mIGNvbXBhcmVWYWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIGNvbXBhcmVWYWwgPSBsYWJlbDtcbiAgICAgICAgbGFiZWwgPSB2YWw7XG4gICAgfVxuICAgIGNvbnN0IG9wdHMgPSBbXG4gICAgICAgIGh0bWxgPG9wdGlvbiBpZD1cIiR7cmVhY3RLZXkgfHwgJyd9XCIgdmFsdWU9XCIke3ZhbH1cIiBzZWxlY3RlZD1cInNlbGVjdGVkXCI+JHtsYWJlbH08L29wdGlvbj5gLFxuICAgICAgICBodG1sYDxvcHRpb24gaWQ9XCIke3JlYWN0S2V5IHx8ICcnfVwiIHZhbHVlPVwiJHt2YWx9XCI+JHtsYWJlbH08L29wdGlvbj5gXG4gICAgXTtcbiAgICAvLyBhbHdheXMgcmUtcmVuZGVyIG9wdGlvbnNcbiAgICBvcHRzWzBdLmlzU2FtZU5vZGUgPSBvcHRzWzFdLmlzU2FtZU5vZGUgPSAoKSA9PiBmYWxzZTtcblxuICAgIGlmICh0eXBlb2YgY29tcGFyZVZhbCA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHJldHVybiBjb21wYXJlVmFsID8gb3B0c1swXSA6IG9wdHNbMV07XG4gICAgfVxuICAgIHJldHVybiBjb21wYXJlVmFsID09IHZhbCA/IG9wdHNbMF0gOiBvcHRzWzFdO1xufVxuXG5mdW5jdGlvbiBjaGVja0JveChsYWJlbCwgY2hlY2tkLCBoYW5kbGVyLCBuYW1lKSB7XG4gICAgaWYgKCFuYW1lKSB7XG4gICAgICAgIG5hbWUgPSB1dWlkKCk7XG4gICAgfVxuICAgIGNvbnN0IG9wdHMgPSBbXG4gICAgICAgIGh0bWxgPGlucHV0IHR5cGU9XCJjaGVja2JveFwiIG9uY2hhbmdlPSR7aGFuZGxlcn0gY2hlY2tlZD1cImNoZWNrZWRcIiBuYW1lPVwiJHtuYW1lfVwiIC8+YCxcbiAgICAgICAgaHRtbGA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgb25jaGFuZ2U9JHtoYW5kbGVyfSBuYW1lPVwiJHtuYW1lfVwiIC8+YFxuICAgIF07XG4gICAgcmV0dXJuIGh0bWxgPHNwYW4gY2xhc3M9XCJjaGVja2JveFwiPlxuICAgICAgICAke2NoZWNrZCA/IG9wdHNbMF0gOiBvcHRzWzFdfVxuICAgICAgICA8bGFiZWwgZm9yPVwiJHtuYW1lfVwiPiR7bGFiZWx9PC9sYWJlbD5cbiAgICA8L3NwYW4+YDtcbn1cblxuZnVuY3Rpb24gZmllbGRzV2l0aFZhbHVlcyhzdGF0ZSkge1xuICAgIGNvbnN0IGxlQ2FyZCA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmNhcmRzW3N0YXRlLmN1cnJlbnRDYXJkXSk7XG4gICAgY29uc3QgbGVCZyA9IE9iamVjdC5hc3NpZ24oe30sIHN0YXRlLmJhY2tncm91bmRzW3N0YXRlLmN1cnJlbnRCYWNrZ3JvdW5kXSk7XG4gICAgY29uc3QgZmllbGRzV2l0aFZhbHVlcyA9IE9iamVjdC5rZXlzKGxlQ2FyZC5maWVsZHMpLnJlZHVjZSgob2JqLCBmbGQpID0+IHtcbiAgICAgICAgb2JqW2ZsZF0gPSBsZUNhcmQuZmllbGRzW2ZsZF0udmFsdWU7XG4gICAgICAgIHJldHVybiBvYmo7XG4gICAgfSwge30pO1xuICAgIE9iamVjdC5hc3NpZ24oZmllbGRzV2l0aFZhbHVlcywgbGVDYXJkLnZhbHVlcyk7XG4gICAgLy8gb2ggZ29kIGZpZWxkcyB3aWxsIG5lZWQgdGhlIGNvbmNlcHQgb2YgZGVmYXVsdCB2YWx1ZXMsIGZvciByYWRpb3NcbiAgICAvLyBhdCBsZWFzdCB3aGVuIGZpcnN0IGNyZWF0ZWRcbiAgICByZXR1cm4gZmllbGRzV2l0aFZhbHVlcztcbn1cblxuZnVuY3Rpb24gdW5pcXVlTmFtZShzY29wZVBhdGgsIG5hbWVTdHViID0gJ25ld0d1eScpIHtcbiAgICBjb25zdCBsb2NhdGlvbiA9IHN0YXRlLmdldFByb3BlcnR5QXRQYXRoKHNjb3BlUGF0aCk7XG4gICAgbGV0IHRyeW51bSA9IDE7XG4gICAgbGV0IHRyeUFOYW1lID0gYCR7bmFtZVN0dWJ9JHt0cnludW19YDtcbiAgICB3aGlsZSAodHlwZW9mIGxvY2F0aW9uW3RyeUFOYW1lXSAhPSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIHRyeUFOYW1lID0gYCR7bmFtZVN0dWJ9JHsrK3RyeW51bX1gO1xuICAgIH1cbiAgICByZXR1cm4gdHJ5QU5hbWU7XG59O1xuXG5mdW5jdGlvbiBjb2xvcihzdGF0ZSkge1xuICAgIGlmIChzdGF0ZS5jYXJkICYmIHN0YXRlLmNhcmQuY29sb3IpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmNhcmQuY29sb3I7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5iYWNrZ3JvdW5kICYmIHN0YXRlLmJhY2tncm91bmQuY29sb3IpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmJhY2tncm91bmQuY29sb3I7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5jb2xvcikge1xuICAgICAgICByZXR1cm4gc3RhdGUuY29sb3I7XG4gICAgfVxuICAgIHJldHVybiAnaW5oZXJpdCc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge21vZEVudiwgbW9kUGF0aCwgZ2V0UGF0aCwgdG9QeCwgc2VsZWN0T3B0aW9uLCBjaGVja0JveCwgZmllbGRzV2l0aFZhbHVlcywgdW5pcXVlTmFtZSwgY29sb3J9O1xuIiwidmFyIGRvY3VtZW50ID0gcmVxdWlyZSgnZ2xvYmFsL2RvY3VtZW50JylcbnZhciBoeXBlcnggPSByZXF1aXJlKCdoeXBlcngnKVxudmFyIG9ubG9hZCA9IHJlcXVpcmUoJ29uLWxvYWQnKVxuXG52YXIgU1ZHTlMgPSAnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnXG52YXIgWExJTktOUyA9ICdodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rJ1xuXG52YXIgQk9PTF9QUk9QUyA9IHtcbiAgYXV0b2ZvY3VzOiAxLFxuICBjaGVja2VkOiAxLFxuICBkZWZhdWx0Y2hlY2tlZDogMSxcbiAgZGlzYWJsZWQ6IDEsXG4gIGZvcm1ub3ZhbGlkYXRlOiAxLFxuICBpbmRldGVybWluYXRlOiAxLFxuICByZWFkb25seTogMSxcbiAgcmVxdWlyZWQ6IDEsXG4gIHNlbGVjdGVkOiAxLFxuICB3aWxsdmFsaWRhdGU6IDFcbn1cbnZhciBDT01NRU5UX1RBRyA9ICchLS0nXG52YXIgU1ZHX1RBR1MgPSBbXG4gICdzdmcnLFxuICAnYWx0R2x5cGgnLCAnYWx0R2x5cGhEZWYnLCAnYWx0R2x5cGhJdGVtJywgJ2FuaW1hdGUnLCAnYW5pbWF0ZUNvbG9yJyxcbiAgJ2FuaW1hdGVNb3Rpb24nLCAnYW5pbWF0ZVRyYW5zZm9ybScsICdjaXJjbGUnLCAnY2xpcFBhdGgnLCAnY29sb3ItcHJvZmlsZScsXG4gICdjdXJzb3InLCAnZGVmcycsICdkZXNjJywgJ2VsbGlwc2UnLCAnZmVCbGVuZCcsICdmZUNvbG9yTWF0cml4JyxcbiAgJ2ZlQ29tcG9uZW50VHJhbnNmZXInLCAnZmVDb21wb3NpdGUnLCAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsXG4gICdmZURpc3BsYWNlbWVudE1hcCcsICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsXG4gICdmZUZ1bmNHJywgJ2ZlRnVuY1InLCAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlJywgJ2ZlTWVyZ2VOb2RlJyxcbiAgJ2ZlTW9ycGhvbG9neScsICdmZU9mZnNldCcsICdmZVBvaW50TGlnaHQnLCAnZmVTcGVjdWxhckxpZ2h0aW5nJyxcbiAgJ2ZlU3BvdExpZ2h0JywgJ2ZlVGlsZScsICdmZVR1cmJ1bGVuY2UnLCAnZmlsdGVyJywgJ2ZvbnQnLCAnZm9udC1mYWNlJyxcbiAgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXNyYycsICdmb250LWZhY2UtdXJpJyxcbiAgJ2ZvcmVpZ25PYmplY3QnLCAnZycsICdnbHlwaCcsICdnbHlwaFJlZicsICdoa2VybicsICdpbWFnZScsICdsaW5lJyxcbiAgJ2xpbmVhckdyYWRpZW50JywgJ21hcmtlcicsICdtYXNrJywgJ21ldGFkYXRhJywgJ21pc3NpbmctZ2x5cGgnLCAnbXBhdGgnLFxuICAncGF0aCcsICdwYXR0ZXJuJywgJ3BvbHlnb24nLCAncG9seWxpbmUnLCAncmFkaWFsR3JhZGllbnQnLCAncmVjdCcsXG4gICdzZXQnLCAnc3RvcCcsICdzd2l0Y2gnLCAnc3ltYm9sJywgJ3RleHQnLCAndGV4dFBhdGgnLCAndGl0bGUnLCAndHJlZicsXG4gICd0c3BhbicsICd1c2UnLCAndmlldycsICd2a2Vybidcbl1cblxuZnVuY3Rpb24gYmVsQ3JlYXRlRWxlbWVudCAodGFnLCBwcm9wcywgY2hpbGRyZW4pIHtcbiAgdmFyIGVsXG5cbiAgLy8gSWYgYW4gc3ZnIHRhZywgaXQgbmVlZHMgYSBuYW1lc3BhY2VcbiAgaWYgKFNWR19UQUdTLmluZGV4T2YodGFnKSAhPT0gLTEpIHtcbiAgICBwcm9wcy5uYW1lc3BhY2UgPSBTVkdOU1xuICB9XG5cbiAgLy8gSWYgd2UgYXJlIHVzaW5nIGEgbmFtZXNwYWNlXG4gIHZhciBucyA9IGZhbHNlXG4gIGlmIChwcm9wcy5uYW1lc3BhY2UpIHtcbiAgICBucyA9IHByb3BzLm5hbWVzcGFjZVxuICAgIGRlbGV0ZSBwcm9wcy5uYW1lc3BhY2VcbiAgfVxuXG4gIC8vIENyZWF0ZSB0aGUgZWxlbWVudFxuICBpZiAobnMpIHtcbiAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhucywgdGFnKVxuICB9IGVsc2UgaWYgKHRhZyA9PT0gQ09NTUVOVF9UQUcpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlQ29tbWVudChwcm9wcy5jb21tZW50KVxuICB9IGVsc2Uge1xuICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWcpXG4gIH1cblxuICAvLyBJZiBhZGRpbmcgb25sb2FkIGV2ZW50c1xuICBpZiAocHJvcHMub25sb2FkIHx8IHByb3BzLm9udW5sb2FkKSB7XG4gICAgdmFyIGxvYWQgPSBwcm9wcy5vbmxvYWQgfHwgZnVuY3Rpb24gKCkge31cbiAgICB2YXIgdW5sb2FkID0gcHJvcHMub251bmxvYWQgfHwgZnVuY3Rpb24gKCkge31cbiAgICBvbmxvYWQoZWwsIGZ1bmN0aW9uIGJlbE9ubG9hZCAoKSB7XG4gICAgICBsb2FkKGVsKVxuICAgIH0sIGZ1bmN0aW9uIGJlbE9udW5sb2FkICgpIHtcbiAgICAgIHVubG9hZChlbClcbiAgICB9LFxuICAgIC8vIFdlIGhhdmUgdG8gdXNlIG5vbi1zdGFuZGFyZCBgY2FsbGVyYCB0byBmaW5kIHdobyBpbnZva2VzIGBiZWxDcmVhdGVFbGVtZW50YFxuICAgIGJlbENyZWF0ZUVsZW1lbnQuY2FsbGVyLmNhbGxlci5jYWxsZXIpXG4gICAgZGVsZXRlIHByb3BzLm9ubG9hZFxuICAgIGRlbGV0ZSBwcm9wcy5vbnVubG9hZFxuICB9XG5cbiAgLy8gQ3JlYXRlIHRoZSBwcm9wZXJ0aWVzXG4gIGZvciAodmFyIHAgaW4gcHJvcHMpIHtcbiAgICBpZiAocHJvcHMuaGFzT3duUHJvcGVydHkocCkpIHtcbiAgICAgIHZhciBrZXkgPSBwLnRvTG93ZXJDYXNlKClcbiAgICAgIHZhciB2YWwgPSBwcm9wc1twXVxuICAgICAgLy8gTm9ybWFsaXplIGNsYXNzTmFtZVxuICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzbmFtZScpIHtcbiAgICAgICAga2V5ID0gJ2NsYXNzJ1xuICAgICAgICBwID0gJ2NsYXNzJ1xuICAgICAgfVxuICAgICAgLy8gVGhlIGZvciBhdHRyaWJ1dGUgZ2V0cyB0cmFuc2Zvcm1lZCB0byBodG1sRm9yLCBidXQgd2UganVzdCBzZXQgYXMgZm9yXG4gICAgICBpZiAocCA9PT0gJ2h0bWxGb3InKSB7XG4gICAgICAgIHAgPSAnZm9yJ1xuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBpcyBib29sZWFuLCBzZXQgaXRzZWxmIHRvIHRoZSBrZXlcbiAgICAgIGlmIChCT09MX1BST1BTW2tleV0pIHtcbiAgICAgICAgaWYgKHZhbCA9PT0gJ3RydWUnKSB2YWwgPSBrZXlcbiAgICAgICAgZWxzZSBpZiAodmFsID09PSAnZmFsc2UnKSBjb250aW51ZVxuICAgICAgfVxuICAgICAgLy8gSWYgYSBwcm9wZXJ0eSBwcmVmZXJzIGJlaW5nIHNldCBkaXJlY3RseSB2cyBzZXRBdHRyaWJ1dGVcbiAgICAgIGlmIChrZXkuc2xpY2UoMCwgMikgPT09ICdvbicpIHtcbiAgICAgICAgZWxbcF0gPSB2YWxcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChucykge1xuICAgICAgICAgIGlmIChwID09PSAneGxpbms6aHJlZicpIHtcbiAgICAgICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKFhMSU5LTlMsIHAsIHZhbClcbiAgICAgICAgICB9IGVsc2UgaWYgKC9eeG1sbnMoJHw6KS9pLnRlc3QocCkpIHtcbiAgICAgICAgICAgIC8vIHNraXAgeG1sbnMgZGVmaW5pdGlvbnNcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZWwuc2V0QXR0cmlidXRlTlMobnVsbCwgcCwgdmFsKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbC5zZXRBdHRyaWJ1dGUocCwgdmFsKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYXBwZW5kQ2hpbGQgKGNoaWxkcykge1xuICAgIGlmICghQXJyYXkuaXNBcnJheShjaGlsZHMpKSByZXR1cm5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5vZGUgPSBjaGlsZHNbaV1cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XG4gICAgICAgIGFwcGVuZENoaWxkKG5vZGUpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgdHlwZW9mIG5vZGUgPT09ICdib29sZWFuJyB8fFxuICAgICAgICB0eXBlb2Ygbm9kZSA9PT0gJ2Z1bmN0aW9uJyB8fFxuICAgICAgICBub2RlIGluc3RhbmNlb2YgRGF0ZSB8fFxuICAgICAgICBub2RlIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgICAgIG5vZGUgPSBub2RlLnRvU3RyaW5nKClcbiAgICAgIH1cblxuICAgICAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJykge1xuICAgICAgICBpZiAoZWwubGFzdENoaWxkICYmIGVsLmxhc3RDaGlsZC5ub2RlTmFtZSA9PT0gJyN0ZXh0Jykge1xuICAgICAgICAgIGVsLmxhc3RDaGlsZC5ub2RlVmFsdWUgKz0gbm9kZVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKG5vZGUpXG4gICAgICB9XG5cbiAgICAgIGlmIChub2RlICYmIG5vZGUubm9kZVR5cGUpIHtcbiAgICAgICAgZWwuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgYXBwZW5kQ2hpbGQoY2hpbGRyZW4pXG5cbiAgcmV0dXJuIGVsXG59XG5cbm1vZHVsZS5leHBvcnRzID0gaHlwZXJ4KGJlbENyZWF0ZUVsZW1lbnQsIHtjb21tZW50czogdHJ1ZX0pXG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gbW9kdWxlLmV4cG9ydHNcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZUVsZW1lbnQgPSBiZWxDcmVhdGVFbGVtZW50XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJ2JlbCcpXG4iLCJ2YXIgZG9jdW1lbnRSZWFkeSA9IHJlcXVpcmUoJ2RvY3VtZW50LXJlYWR5JylcbnZhciBuYW5vaGlzdG9yeSA9IHJlcXVpcmUoJ25hbm9oaXN0b3J5JylcbnZhciBuYW5vcm91dGVyID0gcmVxdWlyZSgnbmFub3JvdXRlcicpXG52YXIgbmFub21vdW50ID0gcmVxdWlyZSgnbmFub21vdW50JylcbnZhciBuYW5vbW9ycGggPSByZXF1aXJlKCduYW5vbW9ycGgnKVxudmFyIG5hbm9ocmVmID0gcmVxdWlyZSgnbmFub2hyZWYnKVxudmFyIG5hbm9yYWYgPSByZXF1aXJlKCduYW5vcmFmJylcbnZhciBuYW5vYnVzID0gcmVxdWlyZSgnbmFub2J1cycpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBDaG9vXG5cbmZ1bmN0aW9uIENob28gKG9wdHMpIHtcbiAgb3B0cyA9IG9wdHMgfHwge31cblxuICB2YXIgcm91dGVyT3B0cyA9IHtcbiAgICBkZWZhdWx0OiBvcHRzLmRlZmF1bHRSb3V0ZSB8fCAnLzQwNCcsXG4gICAgY3Vycnk6IHRydWVcbiAgfVxuXG4gIHZhciB0aW1pbmdFbmFibGVkID0gb3B0cy50aW1pbmcgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBvcHRzLnRpbWluZ1xuICB2YXIgaGFzV2luZG93ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgdmFyIGhhc1BlcmZvcm1hbmNlID0gaGFzV2luZG93ICYmIHdpbmRvdy5wZXJmb3JtYW5jZSAmJiB3aW5kb3cucGVyZm9ybWFuY2UubWFya1xuICB2YXIgcm91dGVyID0gbmFub3JvdXRlcihyb3V0ZXJPcHRzKVxuICB2YXIgYnVzID0gbmFub2J1cygpXG4gIHZhciByZXJlbmRlciA9IG51bGxcbiAgdmFyIHRyZWUgPSBudWxsXG4gIHZhciBzdGF0ZSA9IHt9XG5cbiAgcmV0dXJuIHtcbiAgICB0b1N0cmluZzogdG9TdHJpbmcsXG4gICAgdXNlOiByZWdpc3RlcixcbiAgICBtb3VudDogbW91bnQsXG4gICAgcm91dGVyOiByb3V0ZXIsXG4gICAgcm91dGU6IHJvdXRlLFxuICAgIHN0YXJ0OiBzdGFydFxuICB9XG5cbiAgZnVuY3Rpb24gcm91dGUgKHJvdXRlLCBoYW5kbGVyKSB7XG4gICAgcm91dGVyLm9uKHJvdXRlLCBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xuICAgICAgICBzdGF0ZS5wYXJhbXMgPSBwYXJhbXNcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIoc3RhdGUsIGVtaXQpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyIChjYikge1xuICAgIGNiKHN0YXRlLCBidXMpXG4gIH1cblxuICBmdW5jdGlvbiBzdGFydCAoKSB7XG4gICAgaWYgKG9wdHMuaGlzdG9yeSAhPT0gZmFsc2UpIHtcbiAgICAgIG5hbm9oaXN0b3J5KGZ1bmN0aW9uIChocmVmKSB7XG4gICAgICAgIGJ1cy5lbWl0KCdwdXNoU3RhdGUnKVxuICAgICAgfSlcblxuICAgICAgYnVzLnByZXBlbmRMaXN0ZW5lcigncHVzaFN0YXRlJywgdXBkYXRlSGlzdG9yeS5iaW5kKG51bGwsICdwdXNoJykpXG4gICAgICBidXMucHJlcGVuZExpc3RlbmVyKCdyZXBsYWNlU3RhdGUnLCB1cGRhdGVIaXN0b3J5LmJpbmQobnVsbCwgJ3JlcGxhY2UnKSlcblxuICAgICAgaWYgKG9wdHMuaHJlZiAhPT0gZmFsc2UpIHtcbiAgICAgICAgbmFub2hyZWYoZnVuY3Rpb24gKGxvY2F0aW9uKSB7XG4gICAgICAgICAgdmFyIGhyZWYgPSBsb2NhdGlvbi5ocmVmXG4gICAgICAgICAgdmFyIGN1cnJIcmVmID0gd2luZG93LmxvY2F0aW9uLmhyZWZcbiAgICAgICAgICBpZiAoaHJlZiA9PT0gY3VyckhyZWYpIHJldHVyblxuICAgICAgICAgIGJ1cy5lbWl0KCdwdXNoU3RhdGUnLCBocmVmKVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHVwZGF0ZUhpc3RvcnkgKG1vZGUsIGhyZWYpIHtcbiAgICAgIGlmIChocmVmKSB3aW5kb3cuaGlzdG9yeVttb2RlICsgJ1N0YXRlJ10oe30sIG51bGwsIGhyZWYpXG4gICAgICBidXMuZW1pdCgncmVuZGVyJylcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBzY3JvbGxJbnRvVmlldygpXG4gICAgICB9LCAwKVxuICAgIH1cblxuICAgIHJlcmVuZGVyID0gbmFub3JhZihmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoaGFzUGVyZm9ybWFuY2UgJiYgdGltaW5nRW5hYmxlZCkge1xuICAgICAgICB3aW5kb3cucGVyZm9ybWFuY2UubWFyaygnY2hvbzpyZW5kZXJTdGFydCcpXG4gICAgICB9XG4gICAgICB2YXIgbmV3VHJlZSA9IHJvdXRlcihjcmVhdGVMb2NhdGlvbigpKVxuICAgICAgdHJlZSA9IG5hbm9tb3JwaCh0cmVlLCBuZXdUcmVlKVxuICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHRyZWUsIG5ld1RyZWUsICdjaG9vLnN0YXJ0OiBhIGRpZmZlcmVudCBub2RlIHR5cGUgd2FzIHJldHVybmVkIGFzIHRoZSByb290IG5vZGUgb24gYSByZXJlbmRlci4gTWFrZSBzdXJlIHRoYXQgdGhlIHJvb3Qgbm9kZSBpcyBhbHdheXMgdGhlIHNhbWUgdHlwZSB0byBwcmV2ZW50IHRoZSBhcHBsaWNhdGlvbiBmcm9tIGJlaW5nIHVubW91bnRlZC4nKVxuICAgICAgaWYgKGhhc1BlcmZvcm1hbmNlICYmIHRpbWluZ0VuYWJsZWQpIHtcbiAgICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsoJ2Nob286cmVuZGVyRW5kJylcbiAgICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1lYXN1cmUoJ2Nob286cmVuZGVyJywgJ2Nob286cmVuZGVyU3RhcnQnLCAnY2hvbzpyZW5kZXJFbmQnKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICBidXMucHJlcGVuZExpc3RlbmVyKCdyZW5kZXInLCByZXJlbmRlcilcblxuICAgIGRvY3VtZW50UmVhZHkoZnVuY3Rpb24gKCkge1xuICAgICAgYnVzLmVtaXQoJ0RPTUNvbnRlbnRMb2FkZWQnKVxuICAgIH0pXG5cbiAgICB0cmVlID0gcm91dGVyKGNyZWF0ZUxvY2F0aW9uKCkpXG5cbiAgICByZXR1cm4gdHJlZVxuICB9XG5cbiAgZnVuY3Rpb24gZW1pdCAoZXZlbnROYW1lLCBkYXRhKSB7XG4gICAgYnVzLmVtaXQoZXZlbnROYW1lLCBkYXRhKVxuICB9XG5cbiAgZnVuY3Rpb24gbW91bnQgKHNlbGVjdG9yKSB7XG4gICAgdmFyIG5ld1RyZWUgPSBzdGFydCgpXG4gICAgZG9jdW1lbnRSZWFkeShmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgcm9vdCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpXG4gICAgICBhc3NlcnQub2socm9vdCwgJ2Nob28ubW91bnQ6IGNvdWxkIG5vdCBxdWVyeSBzZWxlY3RvcjogJyArIHNlbGVjdG9yKVxuICAgICAgbmFub21vdW50KHJvb3QsIG5ld1RyZWUpXG4gICAgICB0cmVlID0gcm9vdFxuICAgIH0pXG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyAobG9jYXRpb24sIF9zdGF0ZSkge1xuICAgIHN0YXRlID0gX3N0YXRlIHx8IHt9XG4gICAgdmFyIGh0bWwgPSByb3V0ZXIobG9jYXRpb24pXG4gICAgcmV0dXJuIGh0bWwudG9TdHJpbmcoKVxuICB9XG59XG5cbmZ1bmN0aW9uIHNjcm9sbEludG9WaWV3ICgpIHtcbiAgdmFyIGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaFxuICBpZiAoaGFzaCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgZWwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGhhc2gpXG4gICAgICBpZiAoZWwpIGVsLnNjcm9sbEludG9WaWV3KHRydWUpXG4gICAgfSBjYXRjaCAoZSkge31cbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVMb2NhdGlvbiAoKSB7XG4gIHZhciBwYXRobmFtZSA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5yZXBsYWNlKC9cXC8kLywgJycpXG4gIHZhciBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2gucmVwbGFjZSgvXiMvLCAnLycpXG4gIHJldHVybiBwYXRobmFtZSArIGhhc2hcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgTm9kZSA9IHJlcXVpcmUoJy4vbm9kZScpO1xudmFyIHVuZXNjYXBlU3RyaW5nID0gcmVxdWlyZSgnLi9jb21tb24nKS51bmVzY2FwZVN0cmluZztcbnZhciBPUEVOVEFHID0gcmVxdWlyZSgnLi9jb21tb24nKS5PUEVOVEFHO1xudmFyIENMT1NFVEFHID0gcmVxdWlyZSgnLi9jb21tb24nKS5DTE9TRVRBRztcblxudmFyIENPREVfSU5ERU5UID0gNDtcblxudmFyIENfVEFCID0gOTtcbnZhciBDX05FV0xJTkUgPSAxMDtcbnZhciBDX0dSRUFURVJUSEFOID0gNjI7XG52YXIgQ19MRVNTVEhBTiA9IDYwO1xudmFyIENfU1BBQ0UgPSAzMjtcbnZhciBDX09QRU5fQlJBQ0tFVCA9IDkxO1xuXG52YXIgSW5saW5lUGFyc2VyID0gcmVxdWlyZSgnLi9pbmxpbmVzJyk7XG5cbnZhciByZUh0bWxCbG9ja09wZW4gPSBbXG4gICAvLi8sIC8vIGR1bW15IGZvciAwXG4gICAvXjwoPzpzY3JpcHR8cHJlfHN0eWxlKSg/Olxcc3w+fCQpL2ksXG4gICAvXjwhLS0vLFxuICAgL148Wz9dLyxcbiAgIC9ePCFbQS1aXS8sXG4gICAvXjwhXFxbQ0RBVEFcXFsvLFxuICAgL148Wy9dPyg/OmFkZHJlc3N8YXJ0aWNsZXxhc2lkZXxiYXNlfGJhc2Vmb250fGJsb2NrcXVvdGV8Ym9keXxjYXB0aW9ufGNlbnRlcnxjb2x8Y29sZ3JvdXB8ZGR8ZGV0YWlsc3xkaWFsb2d8ZGlyfGRpdnxkbHxkdHxmaWVsZHNldHxmaWdjYXB0aW9ufGZpZ3VyZXxmb290ZXJ8Zm9ybXxmcmFtZXxmcmFtZXNldHxoWzEyMzQ1Nl18aGVhZHxoZWFkZXJ8aHJ8aHRtbHxpZnJhbWV8bGVnZW5kfGxpfGxpbmt8bWFpbnxtZW51fG1lbnVpdGVtfG1ldGF8bmF2fG5vZnJhbWVzfG9sfG9wdGdyb3VwfG9wdGlvbnxwfHBhcmFtfHNlY3Rpb258c291cmNlfHRpdGxlfHN1bW1hcnl8dGFibGV8dGJvZHl8dGR8dGZvb3R8dGh8dGhlYWR8dGl0bGV8dHJ8dHJhY2t8dWwpKD86XFxzfFsvXT9bPl18JCkvaSxcbiAgICBuZXcgUmVnRXhwKCdeKD86JyArIE9QRU5UQUcgKyAnfCcgKyBDTE9TRVRBRyArICcpXFxcXHMqJCcsICdpJylcbl07XG5cbnZhciByZUh0bWxCbG9ja0Nsb3NlID0gW1xuICAgLy4vLCAvLyBkdW1teSBmb3IgMFxuICAgLzxcXC8oPzpzY3JpcHR8cHJlfHN0eWxlKT4vaSxcbiAgIC8tLT4vLFxuICAgL1xcPz4vLFxuICAgLz4vLFxuICAgL1xcXVxcXT4vXG5dO1xuXG52YXIgcmVUaGVtYXRpY0JyZWFrID0gL14oPzooPzpcXCpbIFxcdF0qKXszLH18KD86X1sgXFx0XSopezMsfXwoPzotWyBcXHRdKil7Myx9KVsgXFx0XSokLztcblxudmFyIHJlTWF5YmVTcGVjaWFsID0gL15bI2B+KitfPTw+MC05LV0vO1xuXG52YXIgcmVOb25TcGFjZSA9IC9bXiBcXHRcXGZcXHZcXHJcXG5dLztcblxudmFyIHJlQnVsbGV0TGlzdE1hcmtlciA9IC9eWyorLV0vO1xuXG52YXIgcmVPcmRlcmVkTGlzdE1hcmtlciA9IC9eKFxcZHsxLDl9KShbLildKS87XG5cbnZhciByZUFUWEhlYWRpbmdNYXJrZXIgPSAvXiN7MSw2fSg/OlsgXFx0XSt8JCkvO1xuXG52YXIgcmVDb2RlRmVuY2UgPSAvXmB7Myx9KD8hLipgKXxefnszLH0oPyEuKn4pLztcblxudmFyIHJlQ2xvc2luZ0NvZGVGZW5jZSA9IC9eKD86YHszLH18fnszLH0pKD89ICokKS87XG5cbnZhciByZVNldGV4dEhlYWRpbmdMaW5lID0gL14oPzo9K3wtKylbIFxcdF0qJC87XG5cbnZhciByZUxpbmVFbmRpbmcgPSAvXFxyXFxufFxcbnxcXHIvO1xuXG4vLyBSZXR1cm5zIHRydWUgaWYgc3RyaW5nIGNvbnRhaW5zIG9ubHkgc3BhY2UgY2hhcmFjdGVycy5cbnZhciBpc0JsYW5rID0gZnVuY3Rpb24ocykge1xuICAgIHJldHVybiAhKHJlTm9uU3BhY2UudGVzdChzKSk7XG59O1xuXG52YXIgaXNTcGFjZU9yVGFiID0gZnVuY3Rpb24oYykge1xuICAgIHJldHVybiBjID09PSBDX1NQQUNFIHx8IGMgPT09IENfVEFCO1xufTtcblxudmFyIHBlZWsgPSBmdW5jdGlvbihsbiwgcG9zKSB7XG4gICAgaWYgKHBvcyA8IGxuLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gbG4uY2hhckNvZGVBdChwb3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICB9XG59O1xuXG4vLyBET0MgUEFSU0VSXG5cbi8vIFRoZXNlIGFyZSBtZXRob2RzIG9mIGEgUGFyc2VyIG9iamVjdCwgZGVmaW5lZCBiZWxvdy5cblxuLy8gUmV0dXJucyB0cnVlIGlmIGJsb2NrIGVuZHMgd2l0aCBhIGJsYW5rIGxpbmUsIGRlc2NlbmRpbmcgaWYgbmVlZGVkXG4vLyBpbnRvIGxpc3RzIGFuZCBzdWJsaXN0cy5cbnZhciBlbmRzV2l0aEJsYW5rTGluZSA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgd2hpbGUgKGJsb2NrKSB7XG4gICAgICAgIGlmIChibG9jay5fbGFzdExpbmVCbGFuaykge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHQgPSBibG9jay50eXBlO1xuICAgICAgICBpZiAodCA9PT0gJ2xpc3QnIHx8IHQgPT09ICdpdGVtJykge1xuICAgICAgICAgICAgYmxvY2sgPSBibG9jay5fbGFzdENoaWxkO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLy8gQWRkIGEgbGluZSB0byB0aGUgYmxvY2sgYXQgdGhlIHRpcC4gIFdlIGFzc3VtZSB0aGUgdGlwXG4vLyBjYW4gYWNjZXB0IGxpbmVzIC0tIHRoYXQgY2hlY2sgc2hvdWxkIGJlIGRvbmUgYmVmb3JlIGNhbGxpbmcgdGhpcy5cbnZhciBhZGRMaW5lID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMucGFydGlhbGx5Q29uc3VtZWRUYWIpIHtcbiAgICAgIHRoaXMub2Zmc2V0ICs9IDE7IC8vIHNraXAgb3ZlciB0YWJcbiAgICAgIC8vIGFkZCBzcGFjZSBjaGFyYWN0ZXJzOlxuICAgICAgdmFyIGNoYXJzVG9UYWIgPSA0IC0gKHRoaXMuY29sdW1uICUgNCk7XG4gICAgICB0aGlzLnRpcC5fc3RyaW5nX2NvbnRlbnQgKz0gKCcgJy5yZXBlYXQoY2hhcnNUb1RhYikpO1xuICAgIH1cbiAgICB0aGlzLnRpcC5fc3RyaW5nX2NvbnRlbnQgKz0gdGhpcy5jdXJyZW50TGluZS5zbGljZSh0aGlzLm9mZnNldCkgKyAnXFxuJztcbn07XG5cbi8vIEFkZCBibG9jayBvZiB0eXBlIHRhZyBhcyBhIGNoaWxkIG9mIHRoZSB0aXAuICBJZiB0aGUgdGlwIGNhbid0XG4vLyBhY2NlcHQgY2hpbGRyZW4sIGNsb3NlIGFuZCBmaW5hbGl6ZSBpdCBhbmQgdHJ5IGl0cyBwYXJlbnQsXG4vLyBhbmQgc28gb24gdGlsIHdlIGZpbmQgYSBibG9jayB0aGF0IGNhbiBhY2NlcHQgY2hpbGRyZW4uXG52YXIgYWRkQ2hpbGQgPSBmdW5jdGlvbih0YWcsIG9mZnNldCkge1xuICAgIHdoaWxlICghdGhpcy5ibG9ja3NbdGhpcy50aXAudHlwZV0uY2FuQ29udGFpbih0YWcpKSB7XG4gICAgICAgIHRoaXMuZmluYWxpemUodGhpcy50aXAsIHRoaXMubGluZU51bWJlciAtIDEpO1xuICAgIH1cblxuICAgIHZhciBjb2x1bW5fbnVtYmVyID0gb2Zmc2V0ICsgMTsgLy8gb2Zmc2V0IDAgPSBjb2x1bW4gMVxuICAgIHZhciBuZXdCbG9jayA9IG5ldyBOb2RlKHRhZywgW1t0aGlzLmxpbmVOdW1iZXIsIGNvbHVtbl9udW1iZXJdLCBbMCwgMF1dKTtcbiAgICBuZXdCbG9jay5fc3RyaW5nX2NvbnRlbnQgPSAnJztcbiAgICB0aGlzLnRpcC5hcHBlbmRDaGlsZChuZXdCbG9jayk7XG4gICAgdGhpcy50aXAgPSBuZXdCbG9jaztcbiAgICByZXR1cm4gbmV3QmxvY2s7XG59O1xuXG4vLyBQYXJzZSBhIGxpc3QgbWFya2VyIGFuZCByZXR1cm4gZGF0YSBvbiB0aGUgbWFya2VyICh0eXBlLFxuLy8gc3RhcnQsIGRlbGltaXRlciwgYnVsbGV0IGNoYXJhY3RlciwgcGFkZGluZykgb3IgbnVsbC5cbnZhciBwYXJzZUxpc3RNYXJrZXIgPSBmdW5jdGlvbihwYXJzZXIsIGNvbnRhaW5lcikge1xuICAgIHZhciByZXN0ID0gcGFyc2VyLmN1cnJlbnRMaW5lLnNsaWNlKHBhcnNlci5uZXh0Tm9uc3BhY2UpO1xuICAgIHZhciBtYXRjaDtcbiAgICB2YXIgbmV4dGM7XG4gICAgdmFyIHNwYWNlc1N0YXJ0Q29sO1xuICAgIHZhciBzcGFjZXNTdGFydE9mZnNldDtcbiAgICB2YXIgZGF0YSA9IHsgdHlwZTogbnVsbCxcbiAgICAgICAgICAgICAgICAgdGlnaHQ6IHRydWUsICAvLyBsaXN0cyBhcmUgdGlnaHQgYnkgZGVmYXVsdFxuICAgICAgICAgICAgICAgICBidWxsZXRDaGFyOiBudWxsLFxuICAgICAgICAgICAgICAgICBzdGFydDogbnVsbCxcbiAgICAgICAgICAgICAgICAgZGVsaW1pdGVyOiBudWxsLFxuICAgICAgICAgICAgICAgICBwYWRkaW5nOiBudWxsLFxuICAgICAgICAgICAgICAgICBtYXJrZXJPZmZzZXQ6IHBhcnNlci5pbmRlbnQgfTtcbiAgICBpZiAoKG1hdGNoID0gcmVzdC5tYXRjaChyZUJ1bGxldExpc3RNYXJrZXIpKSkge1xuICAgICAgICBkYXRhLnR5cGUgPSAnYnVsbGV0JztcbiAgICAgICAgZGF0YS5idWxsZXRDaGFyID0gbWF0Y2hbMF1bMF07XG5cbiAgICB9IGVsc2UgaWYgKChtYXRjaCA9IHJlc3QubWF0Y2gocmVPcmRlcmVkTGlzdE1hcmtlcikpICYmXG4gICAgICAgICAgICAgICAgKGNvbnRhaW5lci50eXBlICE9PSAncGFyYWdyYXBoJyB8fFxuICAgICAgICAgICAgICAgICBtYXRjaFsxXSA9PT0gJzEnKSkge1xuICAgICAgICBkYXRhLnR5cGUgPSAnb3JkZXJlZCc7XG4gICAgICAgIGRhdGEuc3RhcnQgPSBwYXJzZUludChtYXRjaFsxXSk7XG4gICAgICAgIGRhdGEuZGVsaW1pdGVyID0gbWF0Y2hbMl07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIC8vIG1ha2Ugc3VyZSB3ZSBoYXZlIHNwYWNlcyBhZnRlclxuICAgIG5leHRjID0gcGVlayhwYXJzZXIuY3VycmVudExpbmUsIHBhcnNlci5uZXh0Tm9uc3BhY2UgKyBtYXRjaFswXS5sZW5ndGgpO1xuICAgIGlmICghKG5leHRjID09PSAtMSB8fCBuZXh0YyA9PT0gQ19UQUIgfHwgbmV4dGMgPT09IENfU1BBQ0UpKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIC8vIGlmIGl0IGludGVycnVwdHMgcGFyYWdyYXBoLCBtYWtlIHN1cmUgZmlyc3QgbGluZSBpc24ndCBibGFua1xuICAgIGlmIChjb250YWluZXIudHlwZSA9PT0gJ3BhcmFncmFwaCcgJiYgIXBhcnNlci5jdXJyZW50TGluZS5zbGljZShwYXJzZXIubmV4dE5vbnNwYWNlICsgbWF0Y2hbMF0ubGVuZ3RoKS5tYXRjaChyZU5vblNwYWNlKSkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICAvLyB3ZSd2ZSBnb3QgYSBtYXRjaCEgYWR2YW5jZSBvZmZzZXQgYW5kIGNhbGN1bGF0ZSBwYWRkaW5nXG4gICAgcGFyc2VyLmFkdmFuY2VOZXh0Tm9uc3BhY2UoKTsgLy8gdG8gc3RhcnQgb2YgbWFya2VyXG4gICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQobWF0Y2hbMF0ubGVuZ3RoLCB0cnVlKTsgLy8gdG8gZW5kIG9mIG1hcmtlclxuICAgIHNwYWNlc1N0YXJ0Q29sID0gcGFyc2VyLmNvbHVtbjtcbiAgICBzcGFjZXNTdGFydE9mZnNldCA9IHBhcnNlci5vZmZzZXQ7XG4gICAgZG8ge1xuICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldCgxLCB0cnVlKTtcbiAgICAgICAgbmV4dGMgPSBwZWVrKHBhcnNlci5jdXJyZW50TGluZSwgcGFyc2VyLm9mZnNldCk7XG4gICAgfSB3aGlsZSAocGFyc2VyLmNvbHVtbiAtIHNwYWNlc1N0YXJ0Q29sIDwgNSAmJlxuICAgICAgICAgICBpc1NwYWNlT3JUYWIobmV4dGMpKTtcbiAgICB2YXIgYmxhbmtfaXRlbSA9IHBlZWsocGFyc2VyLmN1cnJlbnRMaW5lLCBwYXJzZXIub2Zmc2V0KSA9PT0gLTE7XG4gICAgdmFyIHNwYWNlc19hZnRlcl9tYXJrZXIgPSBwYXJzZXIuY29sdW1uIC0gc3BhY2VzU3RhcnRDb2w7XG4gICAgaWYgKHNwYWNlc19hZnRlcl9tYXJrZXIgPj0gNSB8fFxuICAgICAgICBzcGFjZXNfYWZ0ZXJfbWFya2VyIDwgMSB8fFxuICAgICAgICBibGFua19pdGVtKSB7XG4gICAgICAgIGRhdGEucGFkZGluZyA9IG1hdGNoWzBdLmxlbmd0aCArIDE7XG4gICAgICAgIHBhcnNlci5jb2x1bW4gPSBzcGFjZXNTdGFydENvbDtcbiAgICAgICAgcGFyc2VyLm9mZnNldCA9IHNwYWNlc1N0YXJ0T2Zmc2V0O1xuICAgICAgICBpZiAoaXNTcGFjZU9yVGFiKHBlZWsocGFyc2VyLmN1cnJlbnRMaW5lLCBwYXJzZXIub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KDEsIHRydWUpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZGF0YS5wYWRkaW5nID0gbWF0Y2hbMF0ubGVuZ3RoICsgc3BhY2VzX2FmdGVyX21hcmtlcjtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG59O1xuXG4vLyBSZXR1cm5zIHRydWUgaWYgdGhlIHR3byBsaXN0IGl0ZW1zIGFyZSBvZiB0aGUgc2FtZSB0eXBlLFxuLy8gd2l0aCB0aGUgc2FtZSBkZWxpbWl0ZXIgYW5kIGJ1bGxldCBjaGFyYWN0ZXIuICBUaGlzIGlzIHVzZWRcbi8vIGluIGFnZ2xvbWVyYXRpbmcgbGlzdCBpdGVtcyBpbnRvIGxpc3RzLlxudmFyIGxpc3RzTWF0Y2ggPSBmdW5jdGlvbihsaXN0X2RhdGEsIGl0ZW1fZGF0YSkge1xuICAgIHJldHVybiAobGlzdF9kYXRhLnR5cGUgPT09IGl0ZW1fZGF0YS50eXBlICYmXG4gICAgICAgICAgICBsaXN0X2RhdGEuZGVsaW1pdGVyID09PSBpdGVtX2RhdGEuZGVsaW1pdGVyICYmXG4gICAgICAgICAgICBsaXN0X2RhdGEuYnVsbGV0Q2hhciA9PT0gaXRlbV9kYXRhLmJ1bGxldENoYXIpO1xufTtcblxuLy8gRmluYWxpemUgYW5kIGNsb3NlIGFueSB1bm1hdGNoZWQgYmxvY2tzLlxudmFyIGNsb3NlVW5tYXRjaGVkQmxvY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLmFsbENsb3NlZCkge1xuICAgICAgICAvLyBmaW5hbGl6ZSBhbnkgYmxvY2tzIG5vdCBtYXRjaGVkXG4gICAgICAgIHdoaWxlICh0aGlzLm9sZHRpcCAhPT0gdGhpcy5sYXN0TWF0Y2hlZENvbnRhaW5lcikge1xuICAgICAgICAgICAgdmFyIHBhcmVudCA9IHRoaXMub2xkdGlwLl9wYXJlbnQ7XG4gICAgICAgICAgICB0aGlzLmZpbmFsaXplKHRoaXMub2xkdGlwLCB0aGlzLmxpbmVOdW1iZXIgLSAxKTtcbiAgICAgICAgICAgIHRoaXMub2xkdGlwID0gcGFyZW50O1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuYWxsQ2xvc2VkID0gdHJ1ZTtcbiAgICB9XG59O1xuXG4vLyAnZmluYWxpemUnIGlzIHJ1biB3aGVuIHRoZSBibG9jayBpcyBjbG9zZWQuXG4vLyAnY29udGludWUnIGlzIHJ1biB0byBjaGVjayB3aGV0aGVyIHRoZSBibG9jayBpcyBjb250aW51aW5nXG4vLyBhdCBhIGNlcnRhaW4gbGluZSBhbmQgb2Zmc2V0IChlLmcuIHdoZXRoZXIgYSBibG9jayBxdW90ZVxuLy8gY29udGFpbnMgYSBgPmAuICBJdCByZXR1cm5zIDAgZm9yIG1hdGNoZWQsIDEgZm9yIG5vdCBtYXRjaGVkLFxuLy8gYW5kIDIgZm9yIFwid2UndmUgZGVhbHQgd2l0aCB0aGlzIGxpbmUgY29tcGxldGVseSwgZ28gdG8gbmV4dC5cIlxudmFyIGJsb2NrcyA9IHtcbiAgICBkb2N1bWVudDoge1xuICAgICAgICBjb250aW51ZTogZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9LFxuICAgICAgICBmaW5hbGl6ZTogZnVuY3Rpb24oKSB7IHJldHVybjsgfSxcbiAgICAgICAgY2FuQ29udGFpbjogZnVuY3Rpb24odCkgeyByZXR1cm4gKHQgIT09ICdpdGVtJyk7IH0sXG4gICAgICAgIGFjY2VwdHNMaW5lczogZmFsc2VcbiAgICB9LFxuICAgIGxpc3Q6IHtcbiAgICAgICAgY29udGludWU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfSxcbiAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uKHBhcnNlciwgYmxvY2spIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gYmxvY2suX2ZpcnN0Q2hpbGQ7XG4gICAgICAgICAgICB3aGlsZSAoaXRlbSkge1xuICAgICAgICAgICAgICAgIC8vIGNoZWNrIGZvciBub24tZmluYWwgbGlzdCBpdGVtIGVuZGluZyB3aXRoIGJsYW5rIGxpbmU6XG4gICAgICAgICAgICAgICAgaWYgKGVuZHNXaXRoQmxhbmtMaW5lKGl0ZW0pICYmIGl0ZW0uX25leHQpIHtcbiAgICAgICAgICAgICAgICAgICAgYmxvY2suX2xpc3REYXRhLnRpZ2h0ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyByZWN1cnNlIGludG8gY2hpbGRyZW4gb2YgbGlzdCBpdGVtLCB0byBzZWUgaWYgdGhlcmUgYXJlXG4gICAgICAgICAgICAgICAgLy8gc3BhY2VzIGJldHdlZW4gYW55IG9mIHRoZW06XG4gICAgICAgICAgICAgICAgdmFyIHN1Yml0ZW0gPSBpdGVtLl9maXJzdENoaWxkO1xuICAgICAgICAgICAgICAgIHdoaWxlIChzdWJpdGVtKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmRzV2l0aEJsYW5rTGluZShzdWJpdGVtKSAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgKGl0ZW0uX25leHQgfHwgc3ViaXRlbS5fbmV4dCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJsb2NrLl9saXN0RGF0YS50aWdodCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc3ViaXRlbSA9IHN1Yml0ZW0uX25leHQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGl0ZW0gPSBpdGVtLl9uZXh0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBjYW5Db250YWluOiBmdW5jdGlvbih0KSB7IHJldHVybiAodCA9PT0gJ2l0ZW0nKTsgfSxcbiAgICAgICAgYWNjZXB0c0xpbmVzOiBmYWxzZVxuICAgIH0sXG4gICAgYmxvY2tfcXVvdGU6IHtcbiAgICAgICAgY29udGludWU6IGZ1bmN0aW9uKHBhcnNlcikge1xuICAgICAgICAgICAgdmFyIGxuID0gcGFyc2VyLmN1cnJlbnRMaW5lO1xuICAgICAgICAgICAgaWYgKCFwYXJzZXIuaW5kZW50ZWQgJiZcbiAgICAgICAgICAgICAgICBwZWVrKGxuLCBwYXJzZXIubmV4dE5vbnNwYWNlKSA9PT0gQ19HUkVBVEVSVEhBTikge1xuICAgICAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlTmV4dE5vbnNwYWNlKCk7XG4gICAgICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQoMSwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGlmIChpc1NwYWNlT3JUYWIocGVlayhsbiwgcGFyc2VyLm9mZnNldCkpKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KDEsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSxcbiAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG4gICAgICAgIGNhbkNvbnRhaW46IGZ1bmN0aW9uKHQpIHsgcmV0dXJuICh0ICE9PSAnaXRlbScpOyB9LFxuICAgICAgICBhY2NlcHRzTGluZXM6IGZhbHNlXG4gICAgfSxcbiAgICBpdGVtOiB7XG4gICAgICAgIGNvbnRpbnVlOiBmdW5jdGlvbihwYXJzZXIsIGNvbnRhaW5lcikge1xuICAgICAgICAgICAgaWYgKHBhcnNlci5ibGFuaykge1xuICAgICAgICAgICAgICAgIGlmIChjb250YWluZXIuX2ZpcnN0Q2hpbGQgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBCbGFuayBsaW5lIGFmdGVyIGVtcHR5IGxpc3QgaXRlbVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU5leHROb25zcGFjZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAocGFyc2VyLmluZGVudCA+PVxuICAgICAgICAgICAgICAgICAgICAgICBjb250YWluZXIuX2xpc3REYXRhLm1hcmtlck9mZnNldCArXG4gICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5fbGlzdERhdGEucGFkZGluZykge1xuICAgICAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KGNvbnRhaW5lci5fbGlzdERhdGEubWFya2VyT2Zmc2V0ICtcbiAgICAgICAgICAgICAgICAgICAgY29udGFpbmVyLl9saXN0RGF0YS5wYWRkaW5nLCB0cnVlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfSxcbiAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG4gICAgICAgIGNhbkNvbnRhaW46IGZ1bmN0aW9uKHQpIHsgcmV0dXJuICh0ICE9PSAnaXRlbScpOyB9LFxuICAgICAgICBhY2NlcHRzTGluZXM6IGZhbHNlXG4gICAgfSxcbiAgICBoZWFkaW5nOiB7XG4gICAgICAgIGNvbnRpbnVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIGEgaGVhZGluZyBjYW4gbmV2ZXIgY29udGFpbmVyID4gMSBsaW5lLCBzbyBmYWlsIHRvIG1hdGNoOlxuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmFsaXplOiBmdW5jdGlvbigpIHsgcmV0dXJuOyB9LFxuICAgICAgICBjYW5Db250YWluOiBmdW5jdGlvbigpIHsgcmV0dXJuIGZhbHNlOyB9LFxuICAgICAgICBhY2NlcHRzTGluZXM6IGZhbHNlXG4gICAgfSxcbiAgICB0aGVtYXRpY19icmVhazoge1xuICAgICAgICBjb250aW51ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBhIHRoZW1hdGljIGJyZWFrIGNhbiBuZXZlciBjb250YWluZXIgPiAxIGxpbmUsIHNvIGZhaWwgdG8gbWF0Y2g6XG4gICAgICAgICAgICByZXR1cm4gMTtcbiAgICAgICAgfSxcbiAgICAgICAgZmluYWxpemU6IGZ1bmN0aW9uKCkgeyByZXR1cm47IH0sXG4gICAgICAgIGNhbkNvbnRhaW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH0sXG4gICAgICAgIGFjY2VwdHNMaW5lczogZmFsc2VcbiAgICB9LFxuICAgIGNvZGVfYmxvY2s6IHtcbiAgICAgICAgY29udGludWU6IGZ1bmN0aW9uKHBhcnNlciwgY29udGFpbmVyKSB7XG4gICAgICAgICAgICB2YXIgbG4gPSBwYXJzZXIuY3VycmVudExpbmU7XG4gICAgICAgICAgICB2YXIgaW5kZW50ID0gcGFyc2VyLmluZGVudDtcbiAgICAgICAgICAgIGlmIChjb250YWluZXIuX2lzRmVuY2VkKSB7IC8vIGZlbmNlZFxuICAgICAgICAgICAgICAgIHZhciBtYXRjaCA9IChpbmRlbnQgPD0gMyAmJlxuICAgICAgICAgICAgICAgICAgICBsbi5jaGFyQXQocGFyc2VyLm5leHROb25zcGFjZSkgPT09IGNvbnRhaW5lci5fZmVuY2VDaGFyICYmXG4gICAgICAgICAgICAgICAgICAgIGxuLnNsaWNlKHBhcnNlci5uZXh0Tm9uc3BhY2UpLm1hdGNoKHJlQ2xvc2luZ0NvZGVGZW5jZSkpO1xuICAgICAgICAgICAgICAgIGlmIChtYXRjaCAmJiBtYXRjaFswXS5sZW5ndGggPj0gY29udGFpbmVyLl9mZW5jZUxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjbG9zaW5nIGZlbmNlIC0gd2UncmUgYXQgZW5kIG9mIGxpbmUsIHNvIHdlIGNhbiByZXR1cm5cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyLmZpbmFsaXplKGNvbnRhaW5lciwgcGFyc2VyLmxpbmVOdW1iZXIpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gMjtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBza2lwIG9wdGlvbmFsIHNwYWNlcyBvZiBmZW5jZSBvZmZzZXRcbiAgICAgICAgICAgICAgICAgICAgdmFyIGkgPSBjb250YWluZXIuX2ZlbmNlT2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICB3aGlsZSAoaSA+IDAgJiYgaXNTcGFjZU9yVGFiKHBlZWsobG4sIHBhcnNlci5vZmZzZXQpKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQoMSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBpbmRlbnRlZFxuICAgICAgICAgICAgICAgIGlmIChpbmRlbnQgPj0gQ09ERV9JTkRFTlQpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQoQ09ERV9JTkRFTlQsIHRydWUpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocGFyc2VyLmJsYW5rKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlTmV4dE5vbnNwYWNlKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmFsaXplOiBmdW5jdGlvbihwYXJzZXIsIGJsb2NrKSB7XG4gICAgICAgICAgICBpZiAoYmxvY2suX2lzRmVuY2VkKSB7IC8vIGZlbmNlZFxuICAgICAgICAgICAgICAgIC8vIGZpcnN0IGxpbmUgYmVjb21lcyBpbmZvIHN0cmluZ1xuICAgICAgICAgICAgICAgIHZhciBjb250ZW50ID0gYmxvY2suX3N0cmluZ19jb250ZW50O1xuICAgICAgICAgICAgICAgIHZhciBuZXdsaW5lUG9zID0gY29udGVudC5pbmRleE9mKCdcXG4nKTtcbiAgICAgICAgICAgICAgICB2YXIgZmlyc3RMaW5lID0gY29udGVudC5zbGljZSgwLCBuZXdsaW5lUG9zKTtcbiAgICAgICAgICAgICAgICB2YXIgcmVzdCA9IGNvbnRlbnQuc2xpY2UobmV3bGluZVBvcyArIDEpO1xuICAgICAgICAgICAgICAgIGJsb2NrLmluZm8gPSB1bmVzY2FwZVN0cmluZyhmaXJzdExpbmUudHJpbSgpKTtcbiAgICAgICAgICAgICAgICBibG9jay5fbGl0ZXJhbCA9IHJlc3Q7XG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBpbmRlbnRlZFxuICAgICAgICAgICAgICAgIGJsb2NrLl9saXRlcmFsID0gYmxvY2suX3N0cmluZ19jb250ZW50LnJlcGxhY2UoLyhcXG4gKikrJC8sICdcXG4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJsb2NrLl9zdHJpbmdfY29udGVudCA9IG51bGw7IC8vIGFsbG93IEdDXG4gICAgICAgIH0sXG4gICAgICAgIGNhbkNvbnRhaW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH0sXG4gICAgICAgIGFjY2VwdHNMaW5lczogdHJ1ZVxuICAgIH0sXG4gICAgaHRtbF9ibG9jazoge1xuICAgICAgICBjb250aW51ZTogZnVuY3Rpb24ocGFyc2VyLCBjb250YWluZXIpIHtcbiAgICAgICAgICAgIHJldHVybiAoKHBhcnNlci5ibGFuayAmJlxuICAgICAgICAgICAgICAgICAgICAgKGNvbnRhaW5lci5faHRtbEJsb2NrVHlwZSA9PT0gNiB8fFxuICAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci5faHRtbEJsb2NrVHlwZSA9PT0gNykpID8gMSA6IDApO1xuICAgICAgICB9LFxuICAgICAgICBmaW5hbGl6ZTogZnVuY3Rpb24ocGFyc2VyLCBibG9jaykge1xuICAgICAgICAgICAgYmxvY2suX2xpdGVyYWwgPSBibG9jay5fc3RyaW5nX2NvbnRlbnQucmVwbGFjZSgvKFxcbiAqKSskLywgJycpO1xuICAgICAgICAgICAgYmxvY2suX3N0cmluZ19jb250ZW50ID0gbnVsbDsgLy8gYWxsb3cgR0NcbiAgICAgICAgfSxcbiAgICAgICAgY2FuQ29udGFpbjogZnVuY3Rpb24oKSB7IHJldHVybiBmYWxzZTsgfSxcbiAgICAgICAgYWNjZXB0c0xpbmVzOiB0cnVlXG4gICAgfSxcbiAgICBwYXJhZ3JhcGg6IHtcbiAgICAgICAgY29udGludWU6IGZ1bmN0aW9uKHBhcnNlcikge1xuICAgICAgICAgICAgcmV0dXJuIChwYXJzZXIuYmxhbmsgPyAxIDogMCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZpbmFsaXplOiBmdW5jdGlvbihwYXJzZXIsIGJsb2NrKSB7XG4gICAgICAgICAgICB2YXIgcG9zO1xuICAgICAgICAgICAgdmFyIGhhc1JlZmVyZW5jZURlZnMgPSBmYWxzZTtcblxuICAgICAgICAgICAgLy8gdHJ5IHBhcnNpbmcgdGhlIGJlZ2lubmluZyBhcyBsaW5rIHJlZmVyZW5jZSBkZWZpbml0aW9uczpcbiAgICAgICAgICAgIHdoaWxlIChwZWVrKGJsb2NrLl9zdHJpbmdfY29udGVudCwgMCkgPT09IENfT1BFTl9CUkFDS0VUICYmXG4gICAgICAgICAgICAgICAgICAgKHBvcyA9XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlci5pbmxpbmVQYXJzZXIucGFyc2VSZWZlcmVuY2UoYmxvY2suX3N0cmluZ19jb250ZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlci5yZWZtYXApKSkge1xuICAgICAgICAgICAgICAgIGJsb2NrLl9zdHJpbmdfY29udGVudCA9IGJsb2NrLl9zdHJpbmdfY29udGVudC5zbGljZShwb3MpO1xuICAgICAgICAgICAgICAgIGhhc1JlZmVyZW5jZURlZnMgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGhhc1JlZmVyZW5jZURlZnMgJiYgaXNCbGFuayhibG9jay5fc3RyaW5nX2NvbnRlbnQpKSB7XG4gICAgICAgICAgICAgICAgYmxvY2sudW5saW5rKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGNhbkNvbnRhaW46IGZ1bmN0aW9uKCkgeyByZXR1cm4gZmFsc2U7IH0sXG4gICAgICAgIGFjY2VwdHNMaW5lczogdHJ1ZVxuICAgIH1cbn07XG5cbi8vIGJsb2NrIHN0YXJ0IGZ1bmN0aW9ucy4gIFJldHVybiB2YWx1ZXM6XG4vLyAwID0gbm8gbWF0Y2hcbi8vIDEgPSBtYXRjaGVkIGNvbnRhaW5lciwga2VlcCBnb2luZ1xuLy8gMiA9IG1hdGNoZWQgbGVhZiwgbm8gbW9yZSBibG9jayBzdGFydHNcbnZhciBibG9ja1N0YXJ0cyA9IFtcbiAgICAvLyBibG9jayBxdW90ZVxuICAgIGZ1bmN0aW9uKHBhcnNlcikge1xuICAgICAgICBpZiAoIXBhcnNlci5pbmRlbnRlZCAmJlxuICAgICAgICAgICAgcGVlayhwYXJzZXIuY3VycmVudExpbmUsIHBhcnNlci5uZXh0Tm9uc3BhY2UpID09PSBDX0dSRUFURVJUSEFOKSB7XG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU5leHROb25zcGFjZSgpO1xuICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VPZmZzZXQoMSwgZmFsc2UpO1xuICAgICAgICAgICAgLy8gb3B0aW9uYWwgZm9sbG93aW5nIHNwYWNlXG4gICAgICAgICAgICBpZiAoaXNTcGFjZU9yVGFiKHBlZWsocGFyc2VyLmN1cnJlbnRMaW5lLCBwYXJzZXIub2Zmc2V0KSkpIHtcbiAgICAgICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldCgxLCB0cnVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHBhcnNlci5jbG9zZVVubWF0Y2hlZEJsb2NrcygpO1xuICAgICAgICAgICAgcGFyc2VyLmFkZENoaWxkKCdibG9ja19xdW90ZScsIHBhcnNlci5uZXh0Tm9uc3BhY2UpO1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBBVFggaGVhZGluZ1xuICAgIGZ1bmN0aW9uKHBhcnNlcikge1xuICAgICAgICB2YXIgbWF0Y2g7XG4gICAgICAgIGlmICghcGFyc2VyLmluZGVudGVkICYmXG4gICAgICAgICAgICAobWF0Y2ggPSBwYXJzZXIuY3VycmVudExpbmUuc2xpY2UocGFyc2VyLm5leHROb25zcGFjZSkubWF0Y2gocmVBVFhIZWFkaW5nTWFya2VyKSkpIHtcbiAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlTmV4dE5vbnNwYWNlKCk7XG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldChtYXRjaFswXS5sZW5ndGgsIGZhbHNlKTtcbiAgICAgICAgICAgIHBhcnNlci5jbG9zZVVubWF0Y2hlZEJsb2NrcygpO1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9IHBhcnNlci5hZGRDaGlsZCgnaGVhZGluZycsIHBhcnNlci5uZXh0Tm9uc3BhY2UpO1xuICAgICAgICAgICAgY29udGFpbmVyLmxldmVsID0gbWF0Y2hbMF0udHJpbSgpLmxlbmd0aDsgLy8gbnVtYmVyIG9mICNzXG4gICAgICAgICAgICAvLyByZW1vdmUgdHJhaWxpbmcgIyMjczpcbiAgICAgICAgICAgIGNvbnRhaW5lci5fc3RyaW5nX2NvbnRlbnQgPVxuICAgICAgICAgICAgICAgIHBhcnNlci5jdXJyZW50TGluZS5zbGljZShwYXJzZXIub2Zmc2V0KS5yZXBsYWNlKC9eWyBcXHRdKiMrWyBcXHRdKiQvLCAnJykucmVwbGFjZSgvWyBcXHRdKyMrWyBcXHRdKiQvLCAnJyk7XG4gICAgICAgICAgICBwYXJzZXIuYWR2YW5jZU9mZnNldChwYXJzZXIuY3VycmVudExpbmUubGVuZ3RoIC0gcGFyc2VyLm9mZnNldCk7XG4gICAgICAgICAgICByZXR1cm4gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIEZlbmNlZCBjb2RlIGJsb2NrXG4gICAgZnVuY3Rpb24ocGFyc2VyKSB7XG4gICAgICAgIHZhciBtYXRjaDtcbiAgICAgICAgaWYgKCFwYXJzZXIuaW5kZW50ZWQgJiZcbiAgICAgICAgICAgIChtYXRjaCA9IHBhcnNlci5jdXJyZW50TGluZS5zbGljZShwYXJzZXIubmV4dE5vbnNwYWNlKS5tYXRjaChyZUNvZGVGZW5jZSkpKSB7XG4gICAgICAgICAgICB2YXIgZmVuY2VMZW5ndGggPSBtYXRjaFswXS5sZW5ndGg7XG4gICAgICAgICAgICBwYXJzZXIuY2xvc2VVbm1hdGNoZWRCbG9ja3MoKTtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSBwYXJzZXIuYWRkQ2hpbGQoJ2NvZGVfYmxvY2snLCBwYXJzZXIubmV4dE5vbnNwYWNlKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5faXNGZW5jZWQgPSB0cnVlO1xuICAgICAgICAgICAgY29udGFpbmVyLl9mZW5jZUxlbmd0aCA9IGZlbmNlTGVuZ3RoO1xuICAgICAgICAgICAgY29udGFpbmVyLl9mZW5jZUNoYXIgPSBtYXRjaFswXVswXTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5fZmVuY2VPZmZzZXQgPSBwYXJzZXIuaW5kZW50O1xuICAgICAgICAgICAgcGFyc2VyLmFkdmFuY2VOZXh0Tm9uc3BhY2UoKTtcbiAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KGZlbmNlTGVuZ3RoLCBmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm4gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIEhUTUwgYmxvY2tcbiAgICBmdW5jdGlvbihwYXJzZXIsIGNvbnRhaW5lcikge1xuICAgICAgICBpZiAoIXBhcnNlci5pbmRlbnRlZCAmJlxuICAgICAgICAgICAgcGVlayhwYXJzZXIuY3VycmVudExpbmUsIHBhcnNlci5uZXh0Tm9uc3BhY2UpID09PSBDX0xFU1NUSEFOKSB7XG4gICAgICAgICAgICB2YXIgcyA9IHBhcnNlci5jdXJyZW50TGluZS5zbGljZShwYXJzZXIubmV4dE5vbnNwYWNlKTtcbiAgICAgICAgICAgIHZhciBibG9ja1R5cGU7XG5cbiAgICAgICAgICAgIGZvciAoYmxvY2tUeXBlID0gMTsgYmxvY2tUeXBlIDw9IDc7IGJsb2NrVHlwZSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlSHRtbEJsb2NrT3BlbltibG9ja1R5cGVdLnRlc3QocykgJiZcbiAgICAgICAgICAgICAgICAgICAgKGJsb2NrVHlwZSA8IDcgfHxcbiAgICAgICAgICAgICAgICAgICAgIGNvbnRhaW5lci50eXBlICE9PSAncGFyYWdyYXBoJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyLmNsb3NlVW5tYXRjaGVkQmxvY2tzKCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFdlIGRvbid0IGFkanVzdCBwYXJzZXIub2Zmc2V0O1xuICAgICAgICAgICAgICAgICAgICAvLyBzcGFjZXMgYXJlIHBhcnQgb2YgdGhlIEhUTUwgYmxvY2s6XG4gICAgICAgICAgICAgICAgICAgIHZhciBiID0gcGFyc2VyLmFkZENoaWxkKCdodG1sX2Jsb2NrJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VyLm9mZnNldCk7XG4gICAgICAgICAgICAgICAgICAgIGIuX2h0bWxCbG9ja1R5cGUgPSBibG9ja1R5cGU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAyO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiAwO1xuXG4gICAgfSxcblxuICAgIC8vIFNldGV4dCBoZWFkaW5nXG4gICAgZnVuY3Rpb24ocGFyc2VyLCBjb250YWluZXIpIHtcbiAgICAgICAgdmFyIG1hdGNoO1xuICAgICAgICBpZiAoIXBhcnNlci5pbmRlbnRlZCAmJlxuICAgICAgICAgICAgY29udGFpbmVyLnR5cGUgPT09ICdwYXJhZ3JhcGgnICYmXG4gICAgICAgICAgICAgICAgICAgKChtYXRjaCA9IHBhcnNlci5jdXJyZW50TGluZS5zbGljZShwYXJzZXIubmV4dE5vbnNwYWNlKS5tYXRjaChyZVNldGV4dEhlYWRpbmdMaW5lKSkpKSB7XG4gICAgICAgICAgICBwYXJzZXIuY2xvc2VVbm1hdGNoZWRCbG9ja3MoKTtcbiAgICAgICAgICAgIHZhciBoZWFkaW5nID0gbmV3IE5vZGUoJ2hlYWRpbmcnLCBjb250YWluZXIuc291cmNlcG9zKTtcbiAgICAgICAgICAgIGhlYWRpbmcubGV2ZWwgPSBtYXRjaFswXVswXSA9PT0gJz0nID8gMSA6IDI7XG4gICAgICAgICAgICBoZWFkaW5nLl9zdHJpbmdfY29udGVudCA9IGNvbnRhaW5lci5fc3RyaW5nX2NvbnRlbnQ7XG4gICAgICAgICAgICBjb250YWluZXIuaW5zZXJ0QWZ0ZXIoaGVhZGluZyk7XG4gICAgICAgICAgICBjb250YWluZXIudW5saW5rKCk7XG4gICAgICAgICAgICBwYXJzZXIudGlwID0gaGVhZGluZztcbiAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KHBhcnNlci5jdXJyZW50TGluZS5sZW5ndGggLSBwYXJzZXIub2Zmc2V0LCBmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm4gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIHRoZW1hdGljIGJyZWFrXG4gICAgZnVuY3Rpb24ocGFyc2VyKSB7XG4gICAgICAgIGlmICghcGFyc2VyLmluZGVudGVkICYmXG4gICAgICAgICAgICByZVRoZW1hdGljQnJlYWsudGVzdChwYXJzZXIuY3VycmVudExpbmUuc2xpY2UocGFyc2VyLm5leHROb25zcGFjZSkpKSB7XG4gICAgICAgICAgICBwYXJzZXIuY2xvc2VVbm1hdGNoZWRCbG9ja3MoKTtcbiAgICAgICAgICAgIHBhcnNlci5hZGRDaGlsZCgndGhlbWF0aWNfYnJlYWsnLCBwYXJzZXIubmV4dE5vbnNwYWNlKTtcbiAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KHBhcnNlci5jdXJyZW50TGluZS5sZW5ndGggLSBwYXJzZXIub2Zmc2V0LCBmYWxzZSk7XG4gICAgICAgICAgICByZXR1cm4gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8vIGxpc3QgaXRlbVxuICAgIGZ1bmN0aW9uKHBhcnNlciwgY29udGFpbmVyKSB7XG4gICAgICAgIHZhciBkYXRhO1xuXG4gICAgICAgIGlmICgoIXBhcnNlci5pbmRlbnRlZCB8fCBjb250YWluZXIudHlwZSA9PT0gJ2xpc3QnKVxuICAgICAgICAgICAgICAgICYmIChkYXRhID0gcGFyc2VMaXN0TWFya2VyKHBhcnNlciwgY29udGFpbmVyKSkpIHtcbiAgICAgICAgICAgIHBhcnNlci5jbG9zZVVubWF0Y2hlZEJsb2NrcygpO1xuXG4gICAgICAgICAgICAvLyBhZGQgdGhlIGxpc3QgaWYgbmVlZGVkXG4gICAgICAgICAgICBpZiAocGFyc2VyLnRpcC50eXBlICE9PSAnbGlzdCcgfHxcbiAgICAgICAgICAgICAgICAhKGxpc3RzTWF0Y2goY29udGFpbmVyLl9saXN0RGF0YSwgZGF0YSkpKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyID0gcGFyc2VyLmFkZENoaWxkKCdsaXN0JywgcGFyc2VyLm5leHROb25zcGFjZSk7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyLl9saXN0RGF0YSA9IGRhdGE7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGFkZCB0aGUgbGlzdCBpdGVtXG4gICAgICAgICAgICBjb250YWluZXIgPSBwYXJzZXIuYWRkQ2hpbGQoJ2l0ZW0nLCBwYXJzZXIubmV4dE5vbnNwYWNlKTtcbiAgICAgICAgICAgIGNvbnRhaW5lci5fbGlzdERhdGEgPSBkYXRhO1xuICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBpbmRlbnRlZCBjb2RlIGJsb2NrXG4gICAgZnVuY3Rpb24ocGFyc2VyKSB7XG4gICAgICAgIGlmIChwYXJzZXIuaW5kZW50ZWQgJiZcbiAgICAgICAgICAgIHBhcnNlci50aXAudHlwZSAhPT0gJ3BhcmFncmFwaCcgJiZcbiAgICAgICAgICAgICFwYXJzZXIuYmxhbmspIHtcbiAgICAgICAgICAgIC8vIGluZGVudGVkIGNvZGVcbiAgICAgICAgICAgIHBhcnNlci5hZHZhbmNlT2Zmc2V0KENPREVfSU5ERU5ULCB0cnVlKTtcbiAgICAgICAgICAgIHBhcnNlci5jbG9zZVVubWF0Y2hlZEJsb2NrcygpO1xuICAgICAgICAgICAgcGFyc2VyLmFkZENoaWxkKCdjb2RlX2Jsb2NrJywgcGFyc2VyLm9mZnNldCk7XG4gICAgICAgICAgICByZXR1cm4gMjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgIH1cblxuXTtcblxudmFyIGFkdmFuY2VPZmZzZXQgPSBmdW5jdGlvbihjb3VudCwgY29sdW1ucykge1xuICAgIHZhciBjdXJyZW50TGluZSA9IHRoaXMuY3VycmVudExpbmU7XG4gICAgdmFyIGNoYXJzVG9UYWIsIGNoYXJzVG9BZHZhbmNlO1xuICAgIHZhciBjO1xuICAgIHdoaWxlIChjb3VudCA+IDAgJiYgKGMgPSBjdXJyZW50TGluZVt0aGlzLm9mZnNldF0pKSB7XG4gICAgICAgIGlmIChjID09PSAnXFx0Jykge1xuICAgICAgICAgICAgY2hhcnNUb1RhYiA9IDQgLSAodGhpcy5jb2x1bW4gJSA0KTtcbiAgICAgICAgICAgIGlmIChjb2x1bW5zKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wYXJ0aWFsbHlDb25zdW1lZFRhYiA9IGNoYXJzVG9UYWIgPiBjb3VudDtcbiAgICAgICAgICAgICAgICBjaGFyc1RvQWR2YW5jZSA9IGNoYXJzVG9UYWIgPiBjb3VudCA/IGNvdW50IDogY2hhcnNUb1RhYjtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbHVtbiArPSBjaGFyc1RvQWR2YW5jZTtcbiAgICAgICAgICAgICAgICB0aGlzLm9mZnNldCArPSB0aGlzLnBhcnRpYWxseUNvbnN1bWVkVGFiID8gMCA6IDE7XG4gICAgICAgICAgICAgICAgY291bnQgLT0gY2hhcnNUb0FkdmFuY2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMucGFydGlhbGx5Q29uc3VtZWRUYWIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbHVtbiArPSBjaGFyc1RvVGFiO1xuICAgICAgICAgICAgICAgIHRoaXMub2Zmc2V0ICs9IDE7XG4gICAgICAgICAgICAgICAgY291bnQgLT0gMTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMucGFydGlhbGx5Q29uc3VtZWRUYWIgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0ICs9IDE7XG4gICAgICAgICAgICB0aGlzLmNvbHVtbiArPSAxOyAvLyBhc3N1bWUgYXNjaWk7IGJsb2NrIHN0YXJ0cyBhcmUgYXNjaWlcbiAgICAgICAgICAgIGNvdW50IC09IDE7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgYWR2YW5jZU5leHROb25zcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMub2Zmc2V0ID0gdGhpcy5uZXh0Tm9uc3BhY2U7XG4gICAgdGhpcy5jb2x1bW4gPSB0aGlzLm5leHROb25zcGFjZUNvbHVtbjtcbiAgICB0aGlzLnBhcnRpYWxseUNvbnN1bWVkVGFiID0gZmFsc2U7XG59O1xuXG52YXIgZmluZE5leHROb25zcGFjZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBjdXJyZW50TGluZSA9IHRoaXMuY3VycmVudExpbmU7XG4gICAgdmFyIGkgPSB0aGlzLm9mZnNldDtcbiAgICB2YXIgY29scyA9IHRoaXMuY29sdW1uO1xuICAgIHZhciBjO1xuXG4gICAgd2hpbGUgKChjID0gY3VycmVudExpbmUuY2hhckF0KGkpKSAhPT0gJycpIHtcbiAgICAgICAgaWYgKGMgPT09ICcgJykge1xuICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgY29scysrO1xuICAgICAgICB9IGVsc2UgaWYgKGMgPT09ICdcXHQnKSB7XG4gICAgICAgICAgICBpKys7XG4gICAgICAgICAgICBjb2xzICs9ICg0IC0gKGNvbHMgJSA0KSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cbiAgICB0aGlzLmJsYW5rID0gKGMgPT09ICdcXG4nIHx8IGMgPT09ICdcXHInIHx8IGMgPT09ICcnKTtcbiAgICB0aGlzLm5leHROb25zcGFjZSA9IGk7XG4gICAgdGhpcy5uZXh0Tm9uc3BhY2VDb2x1bW4gPSBjb2xzO1xuICAgIHRoaXMuaW5kZW50ID0gdGhpcy5uZXh0Tm9uc3BhY2VDb2x1bW4gLSB0aGlzLmNvbHVtbjtcbiAgICB0aGlzLmluZGVudGVkID0gdGhpcy5pbmRlbnQgPj0gQ09ERV9JTkRFTlQ7XG59O1xuXG4vLyBBbmFseXplIGEgbGluZSBvZiB0ZXh0IGFuZCB1cGRhdGUgdGhlIGRvY3VtZW50IGFwcHJvcHJpYXRlbHkuXG4vLyBXZSBwYXJzZSBtYXJrZG93biB0ZXh0IGJ5IGNhbGxpbmcgdGhpcyBvbiBlYWNoIGxpbmUgb2YgaW5wdXQsXG4vLyB0aGVuIGZpbmFsaXppbmcgdGhlIGRvY3VtZW50LlxudmFyIGluY29ycG9yYXRlTGluZSA9IGZ1bmN0aW9uKGxuKSB7XG4gICAgdmFyIGFsbF9tYXRjaGVkID0gdHJ1ZTtcbiAgICB2YXIgdDtcblxuICAgIHZhciBjb250YWluZXIgPSB0aGlzLmRvYztcbiAgICB0aGlzLm9sZHRpcCA9IHRoaXMudGlwO1xuICAgIHRoaXMub2Zmc2V0ID0gMDtcbiAgICB0aGlzLmNvbHVtbiA9IDA7XG4gICAgdGhpcy5ibGFuayA9IGZhbHNlO1xuICAgIHRoaXMucGFydGlhbGx5Q29uc3VtZWRUYWIgPSBmYWxzZTtcbiAgICB0aGlzLmxpbmVOdW1iZXIgKz0gMTtcblxuICAgIC8vIHJlcGxhY2UgTlVMIGNoYXJhY3RlcnMgZm9yIHNlY3VyaXR5XG4gICAgaWYgKGxuLmluZGV4T2YoJ1xcdTAwMDAnKSAhPT0gLTEpIHtcbiAgICAgICAgbG4gPSBsbi5yZXBsYWNlKC9cXDAvZywgJ1xcdUZGRkQnKTtcbiAgICB9XG5cbiAgICB0aGlzLmN1cnJlbnRMaW5lID0gbG47XG5cbiAgICAvLyBGb3IgZWFjaCBjb250YWluaW5nIGJsb2NrLCB0cnkgdG8gcGFyc2UgdGhlIGFzc29jaWF0ZWQgbGluZSBzdGFydC5cbiAgICAvLyBCYWlsIG91dCBvbiBmYWlsdXJlOiBjb250YWluZXIgd2lsbCBwb2ludCB0byB0aGUgbGFzdCBtYXRjaGluZyBibG9jay5cbiAgICAvLyBTZXQgYWxsX21hdGNoZWQgdG8gZmFsc2UgaWYgbm90IGFsbCBjb250YWluZXJzIG1hdGNoLlxuICAgIHZhciBsYXN0Q2hpbGQ7XG4gICAgd2hpbGUgKChsYXN0Q2hpbGQgPSBjb250YWluZXIuX2xhc3RDaGlsZCkgJiYgbGFzdENoaWxkLl9vcGVuKSB7XG4gICAgICAgIGNvbnRhaW5lciA9IGxhc3RDaGlsZDtcblxuICAgICAgICB0aGlzLmZpbmROZXh0Tm9uc3BhY2UoKTtcblxuICAgICAgICBzd2l0Y2ggKHRoaXMuYmxvY2tzW2NvbnRhaW5lci50eXBlXS5jb250aW51ZSh0aGlzLCBjb250YWluZXIpKSB7XG4gICAgICAgIGNhc2UgMDogLy8gd2UndmUgbWF0Y2hlZCwga2VlcCBnb2luZ1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgMTogLy8gd2UndmUgZmFpbGVkIHRvIG1hdGNoIGEgYmxvY2tcbiAgICAgICAgICAgIGFsbF9tYXRjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAyOiAvLyB3ZSd2ZSBoaXQgZW5kIG9mIGxpbmUgZm9yIGZlbmNlZCBjb2RlIGNsb3NlIGFuZCBjYW4gcmV0dXJuXG4gICAgICAgICAgICB0aGlzLmxhc3RMaW5lTGVuZ3RoID0gbG4ubGVuZ3RoO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdGhyb3cgJ2NvbnRpbnVlIHJldHVybmVkIGlsbGVnYWwgdmFsdWUsIG11c3QgYmUgMCwgMSwgb3IgMic7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFhbGxfbWF0Y2hlZCkge1xuICAgICAgICAgICAgY29udGFpbmVyID0gY29udGFpbmVyLl9wYXJlbnQ7IC8vIGJhY2sgdXAgdG8gbGFzdCBtYXRjaGluZyBibG9ja1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmFsbENsb3NlZCA9IChjb250YWluZXIgPT09IHRoaXMub2xkdGlwKTtcbiAgICB0aGlzLmxhc3RNYXRjaGVkQ29udGFpbmVyID0gY29udGFpbmVyO1xuXG4gICAgdmFyIG1hdGNoZWRMZWFmID0gY29udGFpbmVyLnR5cGUgIT09ICdwYXJhZ3JhcGgnICYmXG4gICAgICAgICAgICBibG9ja3NbY29udGFpbmVyLnR5cGVdLmFjY2VwdHNMaW5lcztcbiAgICB2YXIgc3RhcnRzID0gdGhpcy5ibG9ja1N0YXJ0cztcbiAgICB2YXIgc3RhcnRzTGVuID0gc3RhcnRzLmxlbmd0aDtcbiAgICAvLyBVbmxlc3MgbGFzdCBtYXRjaGVkIGNvbnRhaW5lciBpcyBhIGNvZGUgYmxvY2ssIHRyeSBuZXcgY29udGFpbmVyIHN0YXJ0cyxcbiAgICAvLyBhZGRpbmcgY2hpbGRyZW4gdG8gdGhlIGxhc3QgbWF0Y2hlZCBjb250YWluZXI6XG4gICAgd2hpbGUgKCFtYXRjaGVkTGVhZikge1xuXG4gICAgICAgIHRoaXMuZmluZE5leHROb25zcGFjZSgpO1xuXG4gICAgICAgIC8vIHRoaXMgaXMgYSBsaXR0bGUgcGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uOlxuICAgICAgICBpZiAoIXRoaXMuaW5kZW50ZWQgJiZcbiAgICAgICAgICAgICFyZU1heWJlU3BlY2lhbC50ZXN0KGxuLnNsaWNlKHRoaXMubmV4dE5vbnNwYWNlKSkpIHtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZU5leHROb25zcGFjZSgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaSA9IDA7XG4gICAgICAgIHdoaWxlIChpIDwgc3RhcnRzTGVuKSB7XG4gICAgICAgICAgICB2YXIgcmVzID0gc3RhcnRzW2ldKHRoaXMsIGNvbnRhaW5lcik7XG4gICAgICAgICAgICBpZiAocmVzID09PSAxKSB7XG4gICAgICAgICAgICAgICAgY29udGFpbmVyID0gdGhpcy50aXA7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlcyA9PT0gMikge1xuICAgICAgICAgICAgICAgIGNvbnRhaW5lciA9IHRoaXMudGlwO1xuICAgICAgICAgICAgICAgIG1hdGNoZWRMZWFmID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaSsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGkgPT09IHN0YXJ0c0xlbikgeyAvLyBub3RoaW5nIG1hdGNoZWRcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZU5leHROb25zcGFjZSgpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBXaGF0IHJlbWFpbnMgYXQgdGhlIG9mZnNldCBpcyBhIHRleHQgbGluZS4gIEFkZCB0aGUgdGV4dCB0byB0aGVcbiAgICAvLyBhcHByb3ByaWF0ZSBjb250YWluZXIuXG5cbiAgIC8vIEZpcnN0IGNoZWNrIGZvciBhIGxhenkgcGFyYWdyYXBoIGNvbnRpbnVhdGlvbjpcbiAgICBpZiAoIXRoaXMuYWxsQ2xvc2VkICYmICF0aGlzLmJsYW5rICYmXG4gICAgICAgIHRoaXMudGlwLnR5cGUgPT09ICdwYXJhZ3JhcGgnKSB7XG4gICAgICAgIC8vIGxhenkgcGFyYWdyYXBoIGNvbnRpbnVhdGlvblxuICAgICAgICB0aGlzLmFkZExpbmUoKTtcblxuICAgIH0gZWxzZSB7IC8vIG5vdCBhIGxhenkgY29udGludWF0aW9uXG5cbiAgICAgICAgLy8gZmluYWxpemUgYW55IGJsb2NrcyBub3QgbWF0Y2hlZFxuICAgICAgICB0aGlzLmNsb3NlVW5tYXRjaGVkQmxvY2tzKCk7XG4gICAgICAgIGlmICh0aGlzLmJsYW5rICYmIGNvbnRhaW5lci5sYXN0Q2hpbGQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5sYXN0Q2hpbGQuX2xhc3RMaW5lQmxhbmsgPSB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgdCA9IGNvbnRhaW5lci50eXBlO1xuXG4gICAgICAgIC8vIEJsb2NrIHF1b3RlIGxpbmVzIGFyZSBuZXZlciBibGFuayBhcyB0aGV5IHN0YXJ0IHdpdGggPlxuICAgICAgICAvLyBhbmQgd2UgZG9uJ3QgY291bnQgYmxhbmtzIGluIGZlbmNlZCBjb2RlIGZvciBwdXJwb3NlcyBvZiB0aWdodC9sb29zZVxuICAgICAgICAvLyBsaXN0cyBvciBicmVha2luZyBvdXQgb2YgbGlzdHMuICBXZSBhbHNvIGRvbid0IHNldCBfbGFzdExpbmVCbGFua1xuICAgICAgICAvLyBvbiBhbiBlbXB0eSBsaXN0IGl0ZW0sIG9yIGlmIHdlIGp1c3QgY2xvc2VkIGEgZmVuY2VkIGJsb2NrLlxuICAgICAgICB2YXIgbGFzdExpbmVCbGFuayA9IHRoaXMuYmxhbmsgJiZcbiAgICAgICAgICAgICEodCA9PT0gJ2Jsb2NrX3F1b3RlJyB8fFxuICAgICAgICAgICAgICAodCA9PT0gJ2NvZGVfYmxvY2snICYmIGNvbnRhaW5lci5faXNGZW5jZWQpIHx8XG4gICAgICAgICAgICAgICh0ID09PSAnaXRlbScgJiZcbiAgICAgICAgICAgICAgICFjb250YWluZXIuX2ZpcnN0Q2hpbGQgJiZcbiAgICAgICAgICAgICAgIGNvbnRhaW5lci5zb3VyY2Vwb3NbMF1bMF0gPT09IHRoaXMubGluZU51bWJlcikpO1xuXG4gICAgICAgIC8vIHByb3BhZ2F0ZSBsYXN0TGluZUJsYW5rIHVwIHRocm91Z2ggcGFyZW50czpcbiAgICAgICAgdmFyIGNvbnQgPSBjb250YWluZXI7XG4gICAgICAgIHdoaWxlIChjb250KSB7XG4gICAgICAgICAgICBjb250Ll9sYXN0TGluZUJsYW5rID0gbGFzdExpbmVCbGFuaztcbiAgICAgICAgICAgIGNvbnQgPSBjb250Ll9wYXJlbnQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5ibG9ja3NbdF0uYWNjZXB0c0xpbmVzKSB7XG4gICAgICAgICAgICB0aGlzLmFkZExpbmUoKTtcbiAgICAgICAgICAgIC8vIGlmIEh0bWxCbG9jaywgY2hlY2sgZm9yIGVuZCBjb25kaXRpb25cbiAgICAgICAgICAgIGlmICh0ID09PSAnaHRtbF9ibG9jaycgJiZcbiAgICAgICAgICAgICAgICBjb250YWluZXIuX2h0bWxCbG9ja1R5cGUgPj0gMSAmJlxuICAgICAgICAgICAgICAgIGNvbnRhaW5lci5faHRtbEJsb2NrVHlwZSA8PSA1ICYmXG4gICAgICAgICAgICAgICAgcmVIdG1sQmxvY2tDbG9zZVtjb250YWluZXIuX2h0bWxCbG9ja1R5cGVdLnRlc3QodGhpcy5jdXJyZW50TGluZS5zbGljZSh0aGlzLm9mZnNldCkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5maW5hbGl6ZShjb250YWluZXIsIHRoaXMubGluZU51bWJlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfSBlbHNlIGlmICh0aGlzLm9mZnNldCA8IGxuLmxlbmd0aCAmJiAhdGhpcy5ibGFuaykge1xuICAgICAgICAgICAgLy8gY3JlYXRlIHBhcmFncmFwaCBjb250YWluZXIgZm9yIGxpbmVcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IHRoaXMuYWRkQ2hpbGQoJ3BhcmFncmFwaCcsIHRoaXMub2Zmc2V0KTtcbiAgICAgICAgICAgIHRoaXMuYWR2YW5jZU5leHROb25zcGFjZSgpO1xuICAgICAgICAgICAgdGhpcy5hZGRMaW5lKCk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5sYXN0TGluZUxlbmd0aCA9IGxuLmxlbmd0aDtcbn07XG5cbi8vIEZpbmFsaXplIGEgYmxvY2suICBDbG9zZSBpdCBhbmQgZG8gYW55IG5lY2Vzc2FyeSBwb3N0cHJvY2Vzc2luZyxcbi8vIGUuZy4gY3JlYXRpbmcgc3RyaW5nX2NvbnRlbnQgZnJvbSBzdHJpbmdzLCBzZXR0aW5nIHRoZSAndGlnaHQnXG4vLyBvciAnbG9vc2UnIHN0YXR1cyBvZiBhIGxpc3QsIGFuZCBwYXJzaW5nIHRoZSBiZWdpbm5pbmdzXG4vLyBvZiBwYXJhZ3JhcGhzIGZvciByZWZlcmVuY2UgZGVmaW5pdGlvbnMuICBSZXNldCB0aGUgdGlwIHRvIHRoZVxuLy8gcGFyZW50IG9mIHRoZSBjbG9zZWQgYmxvY2suXG52YXIgZmluYWxpemUgPSBmdW5jdGlvbihibG9jaywgbGluZU51bWJlcikge1xuICAgIHZhciBhYm92ZSA9IGJsb2NrLl9wYXJlbnQ7XG4gICAgYmxvY2suX29wZW4gPSBmYWxzZTtcbiAgICBibG9jay5zb3VyY2Vwb3NbMV0gPSBbbGluZU51bWJlciwgdGhpcy5sYXN0TGluZUxlbmd0aF07XG5cbiAgICB0aGlzLmJsb2Nrc1tibG9jay50eXBlXS5maW5hbGl6ZSh0aGlzLCBibG9jayk7XG5cbiAgICB0aGlzLnRpcCA9IGFib3ZlO1xufTtcblxuLy8gV2FsayB0aHJvdWdoIGEgYmxvY2sgJiBjaGlsZHJlbiByZWN1cnNpdmVseSwgcGFyc2luZyBzdHJpbmcgY29udGVudFxuLy8gaW50byBpbmxpbmUgY29udGVudCB3aGVyZSBhcHByb3ByaWF0ZS5cbnZhciBwcm9jZXNzSW5saW5lcyA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIG5vZGUsIGV2ZW50LCB0O1xuICAgIHZhciB3YWxrZXIgPSBibG9jay53YWxrZXIoKTtcbiAgICB0aGlzLmlubGluZVBhcnNlci5yZWZtYXAgPSB0aGlzLnJlZm1hcDtcbiAgICB0aGlzLmlubGluZVBhcnNlci5vcHRpb25zID0gdGhpcy5vcHRpb25zO1xuICAgIHdoaWxlICgoZXZlbnQgPSB3YWxrZXIubmV4dCgpKSkge1xuICAgICAgICBub2RlID0gZXZlbnQubm9kZTtcbiAgICAgICAgdCA9IG5vZGUudHlwZTtcbiAgICAgICAgaWYgKCFldmVudC5lbnRlcmluZyAmJiAodCA9PT0gJ3BhcmFncmFwaCcgfHwgdCA9PT0gJ2hlYWRpbmcnKSkge1xuICAgICAgICAgICAgdGhpcy5pbmxpbmVQYXJzZXIucGFyc2Uobm9kZSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG52YXIgRG9jdW1lbnQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jID0gbmV3IE5vZGUoJ2RvY3VtZW50JywgW1sxLCAxXSwgWzAsIDBdXSk7XG4gICAgcmV0dXJuIGRvYztcbn07XG5cbi8vIFRoZSBtYWluIHBhcnNpbmcgZnVuY3Rpb24uICBSZXR1cm5zIGEgcGFyc2VkIGRvY3VtZW50IEFTVC5cbnZhciBwYXJzZSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgdGhpcy5kb2MgPSBuZXcgRG9jdW1lbnQoKTtcbiAgICB0aGlzLnRpcCA9IHRoaXMuZG9jO1xuICAgIHRoaXMucmVmbWFwID0ge307XG4gICAgdGhpcy5saW5lTnVtYmVyID0gMDtcbiAgICB0aGlzLmxhc3RMaW5lTGVuZ3RoID0gMDtcbiAgICB0aGlzLm9mZnNldCA9IDA7XG4gICAgdGhpcy5jb2x1bW4gPSAwO1xuICAgIHRoaXMubGFzdE1hdGNoZWRDb250YWluZXIgPSB0aGlzLmRvYztcbiAgICB0aGlzLmN1cnJlbnRMaW5lID0gXCJcIjtcbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWUpIHsgY29uc29sZS50aW1lKFwicHJlcGFyaW5nIGlucHV0XCIpOyB9XG4gICAgdmFyIGxpbmVzID0gaW5wdXQuc3BsaXQocmVMaW5lRW5kaW5nKTtcbiAgICB2YXIgbGVuID0gbGluZXMubGVuZ3RoO1xuICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KGlucHV0Lmxlbmd0aCAtIDEpID09PSBDX05FV0xJTkUpIHtcbiAgICAgICAgLy8gaWdub3JlIGxhc3QgYmxhbmsgbGluZSBjcmVhdGVkIGJ5IGZpbmFsIG5ld2xpbmVcbiAgICAgICAgbGVuIC09IDE7XG4gICAgfVxuICAgIGlmICh0aGlzLm9wdGlvbnMudGltZSkgeyBjb25zb2xlLnRpbWVFbmQoXCJwcmVwYXJpbmcgaW5wdXRcIik7IH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWUpIHsgY29uc29sZS50aW1lKFwiYmxvY2sgcGFyc2luZ1wiKTsgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgdGhpcy5pbmNvcnBvcmF0ZUxpbmUobGluZXNbaV0pO1xuICAgIH1cbiAgICB3aGlsZSAodGhpcy50aXApIHtcbiAgICAgICAgdGhpcy5maW5hbGl6ZSh0aGlzLnRpcCwgbGVuKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3B0aW9ucy50aW1lKSB7IGNvbnNvbGUudGltZUVuZChcImJsb2NrIHBhcnNpbmdcIik7IH1cbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWUpIHsgY29uc29sZS50aW1lKFwiaW5saW5lIHBhcnNpbmdcIik7IH1cbiAgICB0aGlzLnByb2Nlc3NJbmxpbmVzKHRoaXMuZG9jKTtcbiAgICBpZiAodGhpcy5vcHRpb25zLnRpbWUpIHsgY29uc29sZS50aW1lRW5kKFwiaW5saW5lIHBhcnNpbmdcIik7IH1cbiAgICByZXR1cm4gdGhpcy5kb2M7XG59O1xuXG5cbi8vIFRoZSBQYXJzZXIgb2JqZWN0LlxuZnVuY3Rpb24gUGFyc2VyKG9wdGlvbnMpe1xuICAgIHJldHVybiB7XG4gICAgICAgIGRvYzogbmV3IERvY3VtZW50KCksXG4gICAgICAgIGJsb2NrczogYmxvY2tzLFxuICAgICAgICBibG9ja1N0YXJ0czogYmxvY2tTdGFydHMsXG4gICAgICAgIHRpcDogdGhpcy5kb2MsXG4gICAgICAgIG9sZHRpcDogdGhpcy5kb2MsXG4gICAgICAgIGN1cnJlbnRMaW5lOiBcIlwiLFxuICAgICAgICBsaW5lTnVtYmVyOiAwLFxuICAgICAgICBvZmZzZXQ6IDAsXG4gICAgICAgIGNvbHVtbjogMCxcbiAgICAgICAgbmV4dE5vbnNwYWNlOiAwLFxuICAgICAgICBuZXh0Tm9uc3BhY2VDb2x1bW46IDAsXG4gICAgICAgIGluZGVudDogMCxcbiAgICAgICAgaW5kZW50ZWQ6IGZhbHNlLFxuICAgICAgICBibGFuazogZmFsc2UsXG4gICAgICAgIHBhcnRpYWxseUNvbnN1bWVkVGFiOiBmYWxzZSxcbiAgICAgICAgYWxsQ2xvc2VkOiB0cnVlLFxuICAgICAgICBsYXN0TWF0Y2hlZENvbnRhaW5lcjogdGhpcy5kb2MsXG4gICAgICAgIHJlZm1hcDoge30sXG4gICAgICAgIGxhc3RMaW5lTGVuZ3RoOiAwLFxuICAgICAgICBpbmxpbmVQYXJzZXI6IG5ldyBJbmxpbmVQYXJzZXIob3B0aW9ucyksXG4gICAgICAgIGZpbmROZXh0Tm9uc3BhY2U6IGZpbmROZXh0Tm9uc3BhY2UsXG4gICAgICAgIGFkdmFuY2VPZmZzZXQ6IGFkdmFuY2VPZmZzZXQsXG4gICAgICAgIGFkdmFuY2VOZXh0Tm9uc3BhY2U6IGFkdmFuY2VOZXh0Tm9uc3BhY2UsXG4gICAgICAgIGFkZExpbmU6IGFkZExpbmUsXG4gICAgICAgIGFkZENoaWxkOiBhZGRDaGlsZCxcbiAgICAgICAgaW5jb3Jwb3JhdGVMaW5lOiBpbmNvcnBvcmF0ZUxpbmUsXG4gICAgICAgIGZpbmFsaXplOiBmaW5hbGl6ZSxcbiAgICAgICAgcHJvY2Vzc0lubGluZXM6IHByb2Nlc3NJbmxpbmVzLFxuICAgICAgICBjbG9zZVVubWF0Y2hlZEJsb2NrczogY2xvc2VVbm1hdGNoZWRCbG9ja3MsXG4gICAgICAgIHBhcnNlOiBwYXJzZSxcbiAgICAgICAgb3B0aW9uczogb3B0aW9ucyB8fCB7fVxuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyc2VyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBlbmNvZGUgPSByZXF1aXJlKCdtZHVybC9lbmNvZGUnKTtcbnZhciBkZWNvZGUgPSByZXF1aXJlKCdtZHVybC9kZWNvZGUnKTtcblxudmFyIENfQkFDS1NMQVNIID0gOTI7XG5cbnZhciBkZWNvZGVIVE1MID0gcmVxdWlyZSgnZW50aXRpZXMnKS5kZWNvZGVIVE1MO1xuXG52YXIgRU5USVRZID0gXCImKD86I3hbYS1mMC05XXsxLDh9fCNbMC05XXsxLDh9fFthLXpdW2EtejAtOV17MSwzMX0pO1wiO1xuXG52YXIgVEFHTkFNRSA9ICdbQS1aYS16XVtBLVphLXowLTktXSonO1xudmFyIEFUVFJJQlVURU5BTUUgPSAnW2EtekEtWl86XVthLXpBLVowLTk6Ll8tXSonO1xudmFyIFVOUVVPVEVEVkFMVUUgPSBcIlteXFxcIic9PD5gXFxcXHgwMC1cXFxceDIwXStcIjtcbnZhciBTSU5HTEVRVU9URURWQUxVRSA9IFwiJ1teJ10qJ1wiO1xudmFyIERPVUJMRVFVT1RFRFZBTFVFID0gJ1wiW15cIl0qXCInO1xudmFyIEFUVFJJQlVURVZBTFVFID0gXCIoPzpcIiArIFVOUVVPVEVEVkFMVUUgKyBcInxcIiArIFNJTkdMRVFVT1RFRFZBTFVFICsgXCJ8XCIgKyBET1VCTEVRVU9URURWQUxVRSArIFwiKVwiO1xudmFyIEFUVFJJQlVURVZBTFVFU1BFQyA9IFwiKD86XCIgKyBcIlxcXFxzKj1cIiArIFwiXFxcXHMqXCIgKyBBVFRSSUJVVEVWQUxVRSArIFwiKVwiO1xudmFyIEFUVFJJQlVURSA9IFwiKD86XCIgKyBcIlxcXFxzK1wiICsgQVRUUklCVVRFTkFNRSArIEFUVFJJQlVURVZBTFVFU1BFQyArIFwiPylcIjtcbnZhciBPUEVOVEFHID0gXCI8XCIgKyBUQUdOQU1FICsgQVRUUklCVVRFICsgXCIqXCIgKyBcIlxcXFxzKi8/PlwiO1xudmFyIENMT1NFVEFHID0gXCI8L1wiICsgVEFHTkFNRSArIFwiXFxcXHMqWz5dXCI7XG52YXIgSFRNTENPTU1FTlQgPSBcIjwhLS0tLT58PCEtLSg/Oi0/W14+LV0pKD86LT9bXi1dKSotLT5cIjtcbnZhciBQUk9DRVNTSU5HSU5TVFJVQ1RJT04gPSBcIls8XVs/XS4qP1s/XVs+XVwiO1xudmFyIERFQ0xBUkFUSU9OID0gXCI8IVtBLVpdK1wiICsgXCJcXFxccytbXj5dKj5cIjtcbnZhciBDREFUQSA9IFwiPCFcXFxcW0NEQVRBXFxcXFtbXFxcXHNcXFxcU10qP1xcXFxdXFxcXF0+XCI7XG52YXIgSFRNTFRBRyA9IFwiKD86XCIgKyBPUEVOVEFHICsgXCJ8XCIgKyBDTE9TRVRBRyArIFwifFwiICsgSFRNTENPTU1FTlQgKyBcInxcIiArXG4gICAgICAgIFBST0NFU1NJTkdJTlNUUlVDVElPTiArIFwifFwiICsgREVDTEFSQVRJT04gKyBcInxcIiArIENEQVRBICsgXCIpXCI7XG52YXIgcmVIdG1sVGFnID0gbmV3IFJlZ0V4cCgnXicgKyBIVE1MVEFHLCAnaScpO1xuXG52YXIgcmVCYWNrc2xhc2hPckFtcCA9IC9bXFxcXCZdLztcblxudmFyIEVTQ0FQQUJMRSA9ICdbIVwiIyQlJlxcJygpKissLi86Ozw9Pj9AW1xcXFxcXFxcXFxcXF1eX2B7fH1+LV0nO1xuXG52YXIgcmVFbnRpdHlPckVzY2FwZWRDaGFyID0gbmV3IFJlZ0V4cCgnXFxcXFxcXFwnICsgRVNDQVBBQkxFICsgJ3wnICsgRU5USVRZLCAnZ2knKTtcblxudmFyIFhNTFNQRUNJQUwgPSAnWyY8PlwiXSc7XG5cbnZhciByZVhtbFNwZWNpYWwgPSBuZXcgUmVnRXhwKFhNTFNQRUNJQUwsICdnJyk7XG5cbnZhciByZVhtbFNwZWNpYWxPckVudGl0eSA9IG5ldyBSZWdFeHAoRU5USVRZICsgJ3wnICsgWE1MU1BFQ0lBTCwgJ2dpJyk7XG5cbnZhciB1bmVzY2FwZUNoYXIgPSBmdW5jdGlvbihzKSB7XG4gICAgaWYgKHMuY2hhckNvZGVBdCgwKSA9PT0gQ19CQUNLU0xBU0gpIHtcbiAgICAgICAgcmV0dXJuIHMuY2hhckF0KDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBkZWNvZGVIVE1MKHMpO1xuICAgIH1cbn07XG5cbi8vIFJlcGxhY2UgZW50aXRpZXMgYW5kIGJhY2tzbGFzaCBlc2NhcGVzIHdpdGggbGl0ZXJhbCBjaGFyYWN0ZXJzLlxudmFyIHVuZXNjYXBlU3RyaW5nID0gZnVuY3Rpb24ocykge1xuICAgIGlmIChyZUJhY2tzbGFzaE9yQW1wLnRlc3QocykpIHtcbiAgICAgICAgcmV0dXJuIHMucmVwbGFjZShyZUVudGl0eU9yRXNjYXBlZENoYXIsIHVuZXNjYXBlQ2hhcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfVxufTtcblxudmFyIG5vcm1hbGl6ZVVSSSA9IGZ1bmN0aW9uKHVyaSkge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBlbmNvZGUoZGVjb2RlKHVyaSkpO1xuICAgIH1cbiAgICBjYXRjaChlcnIpIHtcbiAgICAgICAgcmV0dXJuIHVyaTtcbiAgICB9XG59O1xuXG52YXIgcmVwbGFjZVVuc2FmZUNoYXIgPSBmdW5jdGlvbihzKSB7XG4gICAgc3dpdGNoIChzKSB7XG4gICAgY2FzZSAnJic6XG4gICAgICAgIHJldHVybiAnJmFtcDsnO1xuICAgIGNhc2UgJzwnOlxuICAgICAgICByZXR1cm4gJyZsdDsnO1xuICAgIGNhc2UgJz4nOlxuICAgICAgICByZXR1cm4gJyZndDsnO1xuICAgIGNhc2UgJ1wiJzpcbiAgICAgICAgcmV0dXJuICcmcXVvdDsnO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBzO1xuICAgIH1cbn07XG5cbnZhciBlc2NhcGVYbWwgPSBmdW5jdGlvbihzLCBwcmVzZXJ2ZV9lbnRpdGllcykge1xuICAgIGlmIChyZVhtbFNwZWNpYWwudGVzdChzKSkge1xuICAgICAgICBpZiAocHJlc2VydmVfZW50aXRpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UocmVYbWxTcGVjaWFsT3JFbnRpdHksIHJlcGxhY2VVbnNhZmVDaGFyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBzLnJlcGxhY2UocmVYbWxTcGVjaWFsLCByZXBsYWNlVW5zYWZlQ2hhcik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gcztcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHsgdW5lc2NhcGVTdHJpbmc6IHVuZXNjYXBlU3RyaW5nLFxuICAgICAgICAgICAgICAgICAgIG5vcm1hbGl6ZVVSSTogbm9ybWFsaXplVVJJLFxuICAgICAgICAgICAgICAgICAgIGVzY2FwZVhtbDogZXNjYXBlWG1sLFxuICAgICAgICAgICAgICAgICAgIHJlSHRtbFRhZzogcmVIdG1sVGFnLFxuICAgICAgICAgICAgICAgICAgIE9QRU5UQUc6IE9QRU5UQUcsXG4gICAgICAgICAgICAgICAgICAgQ0xPU0VUQUc6IENMT1NFVEFHLFxuICAgICAgICAgICAgICAgICAgIEVOVElUWTogRU5USVRZLFxuICAgICAgICAgICAgICAgICAgIEVTQ0FQQUJMRTogRVNDQVBBQkxFXG4gICAgICAgICAgICAgICAgIH07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuLy8gZGVyaXZlZCBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9tYXRoaWFzYnluZW5zL1N0cmluZy5mcm9tQ29kZVBvaW50XG4vKiEgaHR0cDovL210aHMuYmUvZnJvbWNvZGVwb2ludCB2MC4yLjEgYnkgQG1hdGhpYXMgKi9cbmlmIChTdHJpbmcuZnJvbUNvZGVQb2ludCkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKF8pIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNvZGVQb2ludChfKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgaWYgKGUgaW5zdGFuY2VvZiBSYW5nZUVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoMHhGRkZEKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICB9O1xuXG59IGVsc2Uge1xuXG4gIHZhciBzdHJpbmdGcm9tQ2hhckNvZGUgPSBTdHJpbmcuZnJvbUNoYXJDb2RlO1xuICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICB2YXIgZnJvbUNvZGVQb2ludCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIE1BWF9TSVpFID0gMHg0MDAwO1xuICAgICAgdmFyIGNvZGVVbml0cyA9IFtdO1xuICAgICAgdmFyIGhpZ2hTdXJyb2dhdGU7XG4gICAgICB2YXIgbG93U3Vycm9nYXRlO1xuICAgICAgdmFyIGluZGV4ID0gLTE7XG4gICAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgIGlmICghbGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuICAgICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB2YXIgY29kZVBvaW50ID0gTnVtYmVyKGFyZ3VtZW50c1tpbmRleF0pO1xuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgIWlzRmluaXRlKGNvZGVQb2ludCkgfHwgLy8gYE5hTmAsIGArSW5maW5pdHlgLCBvciBgLUluZmluaXR5YFxuICAgICAgICAgICAgICAgICAgY29kZVBvaW50IDwgMCB8fCAvLyBub3QgYSB2YWxpZCBVbmljb2RlIGNvZGUgcG9pbnRcbiAgICAgICAgICAgICAgICAgIGNvZGVQb2ludCA+IDB4MTBGRkZGIHx8IC8vIG5vdCBhIHZhbGlkIFVuaWNvZGUgY29kZSBwb2ludFxuICAgICAgICAgICAgICAgICAgZmxvb3IoY29kZVBvaW50KSAhPT0gY29kZVBvaW50IC8vIG5vdCBhbiBpbnRlZ2VyXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChjb2RlUG9pbnQgPD0gMHhGRkZGKSB7IC8vIEJNUCBjb2RlIHBvaW50XG4gICAgICAgICAgICAgIGNvZGVVbml0cy5wdXNoKGNvZGVQb2ludCk7XG4gICAgICAgICAgfSBlbHNlIHsgLy8gQXN0cmFsIGNvZGUgcG9pbnQ7IHNwbGl0IGluIHN1cnJvZ2F0ZSBoYWx2ZXNcbiAgICAgICAgICAgICAgLy8gaHR0cDovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZyNzdXJyb2dhdGUtZm9ybXVsYWVcbiAgICAgICAgICAgICAgY29kZVBvaW50IC09IDB4MTAwMDA7XG4gICAgICAgICAgICAgIGhpZ2hTdXJyb2dhdGUgPSAoY29kZVBvaW50ID4+IDEwKSArIDB4RDgwMDtcbiAgICAgICAgICAgICAgbG93U3Vycm9nYXRlID0gKGNvZGVQb2ludCAlIDB4NDAwKSArIDB4REMwMDtcbiAgICAgICAgICAgICAgY29kZVVuaXRzLnB1c2goaGlnaFN1cnJvZ2F0ZSwgbG93U3Vycm9nYXRlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGluZGV4ICsgMSA9PT0gbGVuZ3RoIHx8IGNvZGVVbml0cy5sZW5ndGggPiBNQVhfU0laRSkge1xuICAgICAgICAgICAgICByZXN1bHQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGNvZGVVbml0cyk7XG4gICAgICAgICAgICAgIGNvZGVVbml0cy5sZW5ndGggPSAwO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIG1vZHVsZS5leHBvcnRzID0gZnJvbUNvZGVQb2ludDtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vLyBjb21tb25tYXJrLmpzIC0gQ29tbW9tTWFyayBpbiBKYXZhU2NyaXB0XG4vLyBDb3B5cmlnaHQgKEMpIDIwMTQgSm9obiBNYWNGYXJsYW5lXG4vLyBMaWNlbnNlOiBCU0QzLlxuXG4vLyBCYXNpYyB1c2FnZTpcbi8vXG4vLyB2YXIgY29tbW9ubWFyayA9IHJlcXVpcmUoJ2NvbW1vbm1hcmsnKTtcbi8vIHZhciBwYXJzZXIgPSBuZXcgY29tbW9ubWFyay5QYXJzZXIoKTtcbi8vIHZhciByZW5kZXJlciA9IG5ldyBjb21tb25tYXJrLkh0bWxSZW5kZXJlcigpO1xuLy8gY29uc29sZS5sb2cocmVuZGVyZXIucmVuZGVyKHBhcnNlci5wYXJzZSgnSGVsbG8gKndvcmxkKicpKSk7XG5cbm1vZHVsZS5leHBvcnRzLk5vZGUgPSByZXF1aXJlKCcuL25vZGUnKTtcbm1vZHVsZS5leHBvcnRzLlBhcnNlciA9IHJlcXVpcmUoJy4vYmxvY2tzJyk7XG5tb2R1bGUuZXhwb3J0cy5IdG1sUmVuZGVyZXIgPSByZXF1aXJlKCcuL3JlbmRlci9odG1sJyk7XG5tb2R1bGUuZXhwb3J0cy5YbWxSZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyL3htbCcpO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBOb2RlID0gcmVxdWlyZSgnLi9ub2RlJyk7XG52YXIgY29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcbnZhciBub3JtYWxpemVSZWZlcmVuY2UgPSByZXF1aXJlKCcuL25vcm1hbGl6ZS1yZWZlcmVuY2UnKTtcblxudmFyIG5vcm1hbGl6ZVVSSSA9IGNvbW1vbi5ub3JtYWxpemVVUkk7XG52YXIgdW5lc2NhcGVTdHJpbmcgPSBjb21tb24udW5lc2NhcGVTdHJpbmc7XG52YXIgZnJvbUNvZGVQb2ludCA9IHJlcXVpcmUoJy4vZnJvbS1jb2RlLXBvaW50LmpzJyk7XG52YXIgZGVjb2RlSFRNTCA9IHJlcXVpcmUoJ2VudGl0aWVzJykuZGVjb2RlSFRNTDtcbnJlcXVpcmUoJ3N0cmluZy5wcm90b3R5cGUucmVwZWF0Jyk7IC8vIFBvbHlmaWxsIGZvciBTdHJpbmcucHJvdG90eXBlLnJlcGVhdFxuXG4vLyBDb25zdGFudHMgZm9yIGNoYXJhY3RlciBjb2RlczpcblxudmFyIENfTkVXTElORSA9IDEwO1xudmFyIENfQVNURVJJU0sgPSA0MjtcbnZhciBDX1VOREVSU0NPUkUgPSA5NTtcbnZhciBDX0JBQ0tUSUNLID0gOTY7XG52YXIgQ19PUEVOX0JSQUNLRVQgPSA5MTtcbnZhciBDX0NMT1NFX0JSQUNLRVQgPSA5MztcbnZhciBDX0xFU1NUSEFOID0gNjA7XG52YXIgQ19CQU5HID0gMzM7XG52YXIgQ19CQUNLU0xBU0ggPSA5MjtcbnZhciBDX0FNUEVSU0FORCA9IDM4O1xudmFyIENfT1BFTl9QQVJFTiA9IDQwO1xudmFyIENfQ0xPU0VfUEFSRU4gPSA0MTtcbnZhciBDX0NPTE9OID0gNTg7XG52YXIgQ19TSU5HTEVRVU9URSA9IDM5O1xudmFyIENfRE9VQkxFUVVPVEUgPSAzNDtcblxuLy8gU29tZSByZWdleHBzIHVzZWQgaW4gaW5saW5lIHBhcnNlcjpcblxudmFyIEVTQ0FQQUJMRSA9IGNvbW1vbi5FU0NBUEFCTEU7XG52YXIgRVNDQVBFRF9DSEFSID0gJ1xcXFxcXFxcJyArIEVTQ0FQQUJMRTtcblxudmFyIEVOVElUWSA9IGNvbW1vbi5FTlRJVFk7XG52YXIgcmVIdG1sVGFnID0gY29tbW9uLnJlSHRtbFRhZztcblxudmFyIHJlUHVuY3R1YXRpb24gPSBuZXcgUmVnRXhwKC9bIVwiIyQlJicoKSorLFxcLS4vOjs8PT4/QFxcW1xcXV5fYHt8fX5cXHhBMVxceEE3XFx4QUJcXHhCNlxceEI3XFx4QkJcXHhCRlxcdTAzN0VcXHUwMzg3XFx1MDU1QS1cXHUwNTVGXFx1MDU4OVxcdTA1OEFcXHUwNUJFXFx1MDVDMFxcdTA1QzNcXHUwNUM2XFx1MDVGM1xcdTA1RjRcXHUwNjA5XFx1MDYwQVxcdTA2MENcXHUwNjBEXFx1MDYxQlxcdTA2MUVcXHUwNjFGXFx1MDY2QS1cXHUwNjZEXFx1MDZENFxcdTA3MDAtXFx1MDcwRFxcdTA3RjctXFx1MDdGOVxcdTA4MzAtXFx1MDgzRVxcdTA4NUVcXHUwOTY0XFx1MDk2NVxcdTA5NzBcXHUwQUYwXFx1MERGNFxcdTBFNEZcXHUwRTVBXFx1MEU1QlxcdTBGMDQtXFx1MEYxMlxcdTBGMTRcXHUwRjNBLVxcdTBGM0RcXHUwRjg1XFx1MEZEMC1cXHUwRkQ0XFx1MEZEOVxcdTBGREFcXHUxMDRBLVxcdTEwNEZcXHUxMEZCXFx1MTM2MC1cXHUxMzY4XFx1MTQwMFxcdTE2NkRcXHUxNjZFXFx1MTY5QlxcdTE2OUNcXHUxNkVCLVxcdTE2RURcXHUxNzM1XFx1MTczNlxcdTE3RDQtXFx1MTdENlxcdTE3RDgtXFx1MTdEQVxcdTE4MDAtXFx1MTgwQVxcdTE5NDRcXHUxOTQ1XFx1MUExRVxcdTFBMUZcXHUxQUEwLVxcdTFBQTZcXHUxQUE4LVxcdTFBQURcXHUxQjVBLVxcdTFCNjBcXHUxQkZDLVxcdTFCRkZcXHUxQzNCLVxcdTFDM0ZcXHUxQzdFXFx1MUM3RlxcdTFDQzAtXFx1MUNDN1xcdTFDRDNcXHUyMDEwLVxcdTIwMjdcXHUyMDMwLVxcdTIwNDNcXHUyMDQ1LVxcdTIwNTFcXHUyMDUzLVxcdTIwNUVcXHUyMDdEXFx1MjA3RVxcdTIwOERcXHUyMDhFXFx1MjMwOC1cXHUyMzBCXFx1MjMyOVxcdTIzMkFcXHUyNzY4LVxcdTI3NzVcXHUyN0M1XFx1MjdDNlxcdTI3RTYtXFx1MjdFRlxcdTI5ODMtXFx1Mjk5OFxcdTI5RDgtXFx1MjlEQlxcdTI5RkNcXHUyOUZEXFx1MkNGOS1cXHUyQ0ZDXFx1MkNGRVxcdTJDRkZcXHUyRDcwXFx1MkUwMC1cXHUyRTJFXFx1MkUzMC1cXHUyRTQyXFx1MzAwMS1cXHUzMDAzXFx1MzAwOC1cXHUzMDExXFx1MzAxNC1cXHUzMDFGXFx1MzAzMFxcdTMwM0RcXHUzMEEwXFx1MzBGQlxcdUE0RkVcXHVBNEZGXFx1QTYwRC1cXHVBNjBGXFx1QTY3M1xcdUE2N0VcXHVBNkYyLVxcdUE2RjdcXHVBODc0LVxcdUE4NzdcXHVBOENFXFx1QThDRlxcdUE4RjgtXFx1QThGQVxcdUE4RkNcXHVBOTJFXFx1QTkyRlxcdUE5NUZcXHVBOUMxLVxcdUE5Q0RcXHVBOURFXFx1QTlERlxcdUFBNUMtXFx1QUE1RlxcdUFBREVcXHVBQURGXFx1QUFGMFxcdUFBRjFcXHVBQkVCXFx1RkQzRVxcdUZEM0ZcXHVGRTEwLVxcdUZFMTlcXHVGRTMwLVxcdUZFNTJcXHVGRTU0LVxcdUZFNjFcXHVGRTYzXFx1RkU2OFxcdUZFNkFcXHVGRTZCXFx1RkYwMS1cXHVGRjAzXFx1RkYwNS1cXHVGRjBBXFx1RkYwQy1cXHVGRjBGXFx1RkYxQVxcdUZGMUJcXHVGRjFGXFx1RkYyMFxcdUZGM0ItXFx1RkYzRFxcdUZGM0ZcXHVGRjVCXFx1RkY1RFxcdUZGNUYtXFx1RkY2NV18XFx1RDgwMFtcXHVERDAwLVxcdUREMDJcXHVERjlGXFx1REZEMF18XFx1RDgwMVxcdURENkZ8XFx1RDgwMltcXHVEQzU3XFx1REQxRlxcdUREM0ZcXHVERTUwLVxcdURFNThcXHVERTdGXFx1REVGMC1cXHVERUY2XFx1REYzOS1cXHVERjNGXFx1REY5OS1cXHVERjlDXXxcXHVEODA0W1xcdURDNDctXFx1REM0RFxcdURDQkJcXHVEQ0JDXFx1RENCRS1cXHVEQ0MxXFx1REQ0MC1cXHVERDQzXFx1REQ3NFxcdURENzVcXHVEREM1LVxcdUREQzlcXHVERENEXFx1REREQlxcdUREREQtXFx1RERERlxcdURFMzgtXFx1REUzRFxcdURFQTldfFxcdUQ4MDVbXFx1RENDNlxcdUREQzEtXFx1REREN1xcdURFNDEtXFx1REU0M1xcdURGM0MtXFx1REYzRV18XFx1RDgwOVtcXHVEQzcwLVxcdURDNzRdfFxcdUQ4MUFbXFx1REU2RVxcdURFNkZcXHVERUY1XFx1REYzNy1cXHVERjNCXFx1REY0NF18XFx1RDgyRlxcdURDOUZ8XFx1RDgzNltcXHVERTg3LVxcdURFOEJdLyk7XG5cbnZhciByZUxpbmtUaXRsZSA9IG5ldyBSZWdFeHAoXG4gICAgJ14oPzpcIignICsgRVNDQVBFRF9DSEFSICsgJ3xbXlwiXFxcXHgwMF0pKlwiJyArXG4gICAgICAgICd8JyArXG4gICAgICAgICdcXCcoJyArIEVTQ0FQRURfQ0hBUiArICd8W15cXCdcXFxceDAwXSkqXFwnJyArXG4gICAgICAgICd8JyArXG4gICAgICAgICdcXFxcKCgnICsgRVNDQVBFRF9DSEFSICsgJ3xbXilcXFxceDAwXSkqXFxcXCkpJyk7XG5cbnZhciByZUxpbmtEZXN0aW5hdGlvbkJyYWNlcyA9IG5ldyBSZWdFeHAoXG4gICAgJ14oPzpbPF0oPzpbXiA8PlxcXFx0XFxcXG5cXFxcXFxcXFxcXFx4MDBdJyArICd8JyArIEVTQ0FQRURfQ0hBUiArICd8JyArICdcXFxcXFxcXCkqWz5dKScpO1xuXG52YXIgcmVFc2NhcGFibGUgPSBuZXcgUmVnRXhwKCdeJyArIEVTQ0FQQUJMRSk7XG5cbnZhciByZUVudGl0eUhlcmUgPSBuZXcgUmVnRXhwKCdeJyArIEVOVElUWSwgJ2knKTtcblxudmFyIHJlVGlja3MgPSAvYCsvO1xuXG52YXIgcmVUaWNrc0hlcmUgPSAvXmArLztcblxudmFyIHJlRWxsaXBzZXMgPSAvXFwuXFwuXFwuL2c7XG5cbnZhciByZURhc2ggPSAvLS0rL2c7XG5cbnZhciByZUVtYWlsQXV0b2xpbmsgPSAvXjwoW2EtekEtWjAtOS4hIyQlJicqK1xcLz0/Xl9ge3x9fi1dK0BbYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8oPzpcXC5bYS16QS1aMC05XSg/OlthLXpBLVowLTktXXswLDYxfVthLXpBLVowLTldKT8pKik+LztcblxudmFyIHJlQXV0b2xpbmsgPSAvXjxbQS1aYS16XVtBLVphLXowLTkuKy1dezEsMzF9OltePD5cXHgwMC1cXHgyMF0qPi9pO1xuXG52YXIgcmVTcG5sID0gL14gKig/OlxcbiAqKT8vO1xuXG52YXIgcmVXaGl0ZXNwYWNlQ2hhciA9IC9eWyBcXHRcXG5cXHgwYlxceDBjXFx4MGRdLztcblxudmFyIHJlV2hpdGVzcGFjZSA9IC9bIFxcdFxcblxceDBiXFx4MGNcXHgwZF0rL2c7XG5cbnZhciByZVVuaWNvZGVXaGl0ZXNwYWNlQ2hhciA9IC9eXFxzLztcblxudmFyIHJlRmluYWxTcGFjZSA9IC8gKiQvO1xuXG52YXIgcmVJbml0aWFsU3BhY2UgPSAvXiAqLztcblxudmFyIHJlU3BhY2VBdEVuZE9mTGluZSA9IC9eICooPzpcXG58JCkvO1xuXG52YXIgcmVMaW5rTGFiZWwgPSBuZXcgUmVnRXhwKCdeXFxcXFsoPzpbXlxcXFxcXFxcXFxcXFtcXFxcXV18JyArIEVTQ0FQRURfQ0hBUiArXG4gICd8XFxcXFxcXFwpezAsMTAwMH1cXFxcXScpO1xuXG4vLyBNYXRjaGVzIGEgc3RyaW5nIG9mIG5vbi1zcGVjaWFsIGNoYXJhY3RlcnMuXG52YXIgcmVNYWluID0gL15bXlxcbmBcXFtcXF1cXFxcITwmKl8nXCJdKy9tO1xuXG52YXIgdGV4dCA9IGZ1bmN0aW9uKHMpIHtcbiAgICB2YXIgbm9kZSA9IG5ldyBOb2RlKCd0ZXh0Jyk7XG4gICAgbm9kZS5fbGl0ZXJhbCA9IHM7XG4gICAgcmV0dXJuIG5vZGU7XG59O1xuXG4vLyBJTkxJTkUgUEFSU0VSXG5cbi8vIFRoZXNlIGFyZSBtZXRob2RzIG9mIGFuIElubGluZVBhcnNlciBvYmplY3QsIGRlZmluZWQgYmVsb3cuXG4vLyBBbiBJbmxpbmVQYXJzZXIga2VlcHMgdHJhY2sgb2YgYSBzdWJqZWN0IChhIHN0cmluZyB0byBiZVxuLy8gcGFyc2VkKSBhbmQgYSBwb3NpdGlvbiBpbiB0aGF0IHN1YmplY3QuXG5cbi8vIElmIHJlIG1hdGNoZXMgYXQgY3VycmVudCBwb3NpdGlvbiBpbiB0aGUgc3ViamVjdCwgYWR2YW5jZVxuLy8gcG9zaXRpb24gaW4gc3ViamVjdCBhbmQgcmV0dXJuIHRoZSBtYXRjaDsgb3RoZXJ3aXNlIHJldHVybiBudWxsLlxudmFyIG1hdGNoID0gZnVuY3Rpb24ocmUpIHtcbiAgICB2YXIgbSA9IHJlLmV4ZWModGhpcy5zdWJqZWN0LnNsaWNlKHRoaXMucG9zKSk7XG4gICAgaWYgKG0gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5wb3MgKz0gbS5pbmRleCArIG1bMF0ubGVuZ3RoO1xuICAgICAgICByZXR1cm4gbVswXTtcbiAgICB9XG59O1xuXG4vLyBSZXR1cm5zIHRoZSBjb2RlIGZvciB0aGUgY2hhcmFjdGVyIGF0IHRoZSBjdXJyZW50IHN1YmplY3QgcG9zaXRpb24sIG9yIC0xXG4vLyB0aGVyZSBhcmUgbm8gbW9yZSBjaGFyYWN0ZXJzLlxudmFyIHBlZWsgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5wb3MgPCB0aGlzLnN1YmplY3QubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnN1YmplY3QuY2hhckNvZGVBdCh0aGlzLnBvcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIC0xO1xuICAgIH1cbn07XG5cbi8vIFBhcnNlIHplcm8gb3IgbW9yZSBzcGFjZSBjaGFyYWN0ZXJzLCBpbmNsdWRpbmcgYXQgbW9zdCBvbmUgbmV3bGluZVxudmFyIHNwbmwgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLm1hdGNoKHJlU3BubCk7XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBBbGwgb2YgdGhlIHBhcnNlcnMgYmVsb3cgdHJ5IHRvIG1hdGNoIHNvbWV0aGluZyBhdCB0aGUgY3VycmVudCBwb3NpdGlvblxuLy8gaW4gdGhlIHN1YmplY3QuICBJZiB0aGV5IHN1Y2NlZWQgaW4gbWF0Y2hpbmcgYW55dGhpbmcsIHRoZXlcbi8vIHJldHVybiB0aGUgaW5saW5lIG1hdGNoZWQsIGFkdmFuY2luZyB0aGUgc3ViamVjdC5cblxuLy8gQXR0ZW1wdCB0byBwYXJzZSBiYWNrdGlja3MsIGFkZGluZyBlaXRoZXIgYSBiYWNrdGljayBjb2RlIHNwYW4gb3IgYVxuLy8gbGl0ZXJhbCBzZXF1ZW5jZSBvZiBiYWNrdGlja3MuXG52YXIgcGFyc2VCYWNrdGlja3MgPSBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciB0aWNrcyA9IHRoaXMubWF0Y2gocmVUaWNrc0hlcmUpO1xuICAgIGlmICh0aWNrcyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBhZnRlck9wZW5UaWNrcyA9IHRoaXMucG9zO1xuICAgIHZhciBtYXRjaGVkO1xuICAgIHZhciBub2RlO1xuICAgIHdoaWxlICgobWF0Y2hlZCA9IHRoaXMubWF0Y2gocmVUaWNrcykpICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChtYXRjaGVkID09PSB0aWNrcykge1xuICAgICAgICAgICAgbm9kZSA9IG5ldyBOb2RlKCdjb2RlJyk7XG4gICAgICAgICAgICBub2RlLl9saXRlcmFsID0gdGhpcy5zdWJqZWN0LnNsaWNlKGFmdGVyT3BlblRpY2tzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucG9zIC0gdGlja3MubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAudHJpbSgpLnJlcGxhY2UocmVXaGl0ZXNwYWNlLCAnICcpO1xuICAgICAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvLyBJZiB3ZSBnb3QgaGVyZSwgd2UgZGlkbid0IG1hdGNoIGEgY2xvc2luZyBiYWNrdGljayBzZXF1ZW5jZS5cbiAgICB0aGlzLnBvcyA9IGFmdGVyT3BlblRpY2tzO1xuICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQodGlja3MpKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIFBhcnNlIGEgYmFja3NsYXNoLWVzY2FwZWQgc3BlY2lhbCBjaGFyYWN0ZXIsIGFkZGluZyBlaXRoZXIgdGhlIGVzY2FwZWRcbi8vIGNoYXJhY3RlciwgYSBoYXJkIGxpbmUgYnJlYWsgKGlmIHRoZSBiYWNrc2xhc2ggaXMgZm9sbG93ZWQgYnkgYSBuZXdsaW5lKSxcbi8vIG9yIGEgbGl0ZXJhbCBiYWNrc2xhc2ggdG8gdGhlIGJsb2NrJ3MgY2hpbGRyZW4uICBBc3N1bWVzIGN1cnJlbnQgY2hhcmFjdGVyXG4vLyBpcyBhIGJhY2tzbGFzaC5cbnZhciBwYXJzZUJhY2tzbGFzaCA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIHN1YmogPSB0aGlzLnN1YmplY3Q7XG4gICAgdmFyIG5vZGU7XG4gICAgdGhpcy5wb3MgKz0gMTtcbiAgICBpZiAodGhpcy5wZWVrKCkgPT09IENfTkVXTElORSkge1xuICAgICAgICB0aGlzLnBvcyArPSAxO1xuICAgICAgICBub2RlID0gbmV3IE5vZGUoJ2xpbmVicmVhaycpO1xuICAgICAgICBibG9jay5hcHBlbmRDaGlsZChub2RlKTtcbiAgICB9IGVsc2UgaWYgKHJlRXNjYXBhYmxlLnRlc3Qoc3Viai5jaGFyQXQodGhpcy5wb3MpKSkge1xuICAgICAgICBibG9jay5hcHBlbmRDaGlsZCh0ZXh0KHN1YmouY2hhckF0KHRoaXMucG9zKSkpO1xuICAgICAgICB0aGlzLnBvcyArPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQoJ1xcXFwnKSk7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLy8gQXR0ZW1wdCB0byBwYXJzZSBhbiBhdXRvbGluayAoVVJMIG9yIGVtYWlsIGluIHBvaW50eSBicmFja2V0cykuXG52YXIgcGFyc2VBdXRvbGluayA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIG07XG4gICAgdmFyIGRlc3Q7XG4gICAgdmFyIG5vZGU7XG4gICAgaWYgKChtID0gdGhpcy5tYXRjaChyZUVtYWlsQXV0b2xpbmspKSkge1xuICAgICAgICBkZXN0ID0gbS5zbGljZSgxLCBtLmxlbmd0aCAtIDEpO1xuICAgICAgICBub2RlID0gbmV3IE5vZGUoJ2xpbmsnKTtcbiAgICAgICAgbm9kZS5fZGVzdGluYXRpb24gPSBub3JtYWxpemVVUkkoJ21haWx0bzonICsgZGVzdCk7XG4gICAgICAgIG5vZGUuX3RpdGxlID0gJyc7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQodGV4dChkZXN0KSk7XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKChtID0gdGhpcy5tYXRjaChyZUF1dG9saW5rKSkpIHtcbiAgICAgICAgZGVzdCA9IG0uc2xpY2UoMSwgbS5sZW5ndGggLSAxKTtcbiAgICAgICAgbm9kZSA9IG5ldyBOb2RlKCdsaW5rJyk7XG4gICAgICAgIG5vZGUuX2Rlc3RpbmF0aW9uID0gbm9ybWFsaXplVVJJKGRlc3QpO1xuICAgICAgICBub2RlLl90aXRsZSA9ICcnO1xuICAgICAgICBub2RlLmFwcGVuZENoaWxkKHRleHQoZGVzdCkpO1xuICAgICAgICBibG9jay5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8vIEF0dGVtcHQgdG8gcGFyc2UgYSByYXcgSFRNTCB0YWcuXG52YXIgcGFyc2VIdG1sVGFnID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgbSA9IHRoaXMubWF0Y2gocmVIdG1sVGFnKTtcbiAgICBpZiAobSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIG5vZGUgPSBuZXcgTm9kZSgnaHRtbF9pbmxpbmUnKTtcbiAgICAgICAgbm9kZS5fbGl0ZXJhbCA9IG07XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59O1xuXG4vLyBTY2FuIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyB3aXRoIGNvZGUgY2MsIGFuZCByZXR1cm4gaW5mb3JtYXRpb24gYWJvdXRcbi8vIHRoZSBudW1iZXIgb2YgZGVsaW1pdGVycyBhbmQgd2hldGhlciB0aGV5IGFyZSBwb3NpdGlvbmVkIHN1Y2ggdGhhdFxuLy8gdGhleSBjYW4gb3BlbiBhbmQvb3IgY2xvc2UgZW1waGFzaXMgb3Igc3Ryb25nIGVtcGhhc2lzLiAgQSB1dGlsaXR5XG4vLyBmdW5jdGlvbiBmb3Igc3Ryb25nL2VtcGggcGFyc2luZy5cbnZhciBzY2FuRGVsaW1zID0gZnVuY3Rpb24oY2MpIHtcbiAgICB2YXIgbnVtZGVsaW1zID0gMDtcbiAgICB2YXIgY2hhcl9iZWZvcmUsIGNoYXJfYWZ0ZXIsIGNjX2FmdGVyO1xuICAgIHZhciBzdGFydHBvcyA9IHRoaXMucG9zO1xuICAgIHZhciBsZWZ0X2ZsYW5raW5nLCByaWdodF9mbGFua2luZywgY2FuX29wZW4sIGNhbl9jbG9zZTtcbiAgICB2YXIgYWZ0ZXJfaXNfd2hpdGVzcGFjZSwgYWZ0ZXJfaXNfcHVuY3R1YXRpb24sIGJlZm9yZV9pc193aGl0ZXNwYWNlLCBiZWZvcmVfaXNfcHVuY3R1YXRpb247XG5cbiAgICBpZiAoY2MgPT09IENfU0lOR0xFUVVPVEUgfHwgY2MgPT09IENfRE9VQkxFUVVPVEUpIHtcbiAgICAgICAgbnVtZGVsaW1zKys7XG4gICAgICAgIHRoaXMucG9zKys7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgd2hpbGUgKHRoaXMucGVlaygpID09PSBjYykge1xuICAgICAgICAgICAgbnVtZGVsaW1zKys7XG4gICAgICAgICAgICB0aGlzLnBvcysrO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG51bWRlbGltcyA9PT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjaGFyX2JlZm9yZSA9IHN0YXJ0cG9zID09PSAwID8gJ1xcbicgOiB0aGlzLnN1YmplY3QuY2hhckF0KHN0YXJ0cG9zIC0gMSk7XG5cbiAgICBjY19hZnRlciA9IHRoaXMucGVlaygpO1xuICAgIGlmIChjY19hZnRlciA9PT0gLTEpIHtcbiAgICAgICAgY2hhcl9hZnRlciA9ICdcXG4nO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYXJfYWZ0ZXIgPSBmcm9tQ29kZVBvaW50KGNjX2FmdGVyKTtcbiAgICB9XG5cbiAgICBhZnRlcl9pc193aGl0ZXNwYWNlID0gcmVVbmljb2RlV2hpdGVzcGFjZUNoYXIudGVzdChjaGFyX2FmdGVyKTtcbiAgICBhZnRlcl9pc19wdW5jdHVhdGlvbiA9IHJlUHVuY3R1YXRpb24udGVzdChjaGFyX2FmdGVyKTtcbiAgICBiZWZvcmVfaXNfd2hpdGVzcGFjZSA9IHJlVW5pY29kZVdoaXRlc3BhY2VDaGFyLnRlc3QoY2hhcl9iZWZvcmUpO1xuICAgIGJlZm9yZV9pc19wdW5jdHVhdGlvbiA9IHJlUHVuY3R1YXRpb24udGVzdChjaGFyX2JlZm9yZSk7XG5cbiAgICBsZWZ0X2ZsYW5raW5nID0gIWFmdGVyX2lzX3doaXRlc3BhY2UgJiZcbiAgICAgICAgICAgICghYWZ0ZXJfaXNfcHVuY3R1YXRpb24gfHwgYmVmb3JlX2lzX3doaXRlc3BhY2UgfHwgYmVmb3JlX2lzX3B1bmN0dWF0aW9uKTtcbiAgICByaWdodF9mbGFua2luZyA9ICFiZWZvcmVfaXNfd2hpdGVzcGFjZSAmJlxuICAgICAgICAgICAgKCFiZWZvcmVfaXNfcHVuY3R1YXRpb24gfHwgYWZ0ZXJfaXNfd2hpdGVzcGFjZSB8fCBhZnRlcl9pc19wdW5jdHVhdGlvbik7XG4gICAgaWYgKGNjID09PSBDX1VOREVSU0NPUkUpIHtcbiAgICAgICAgY2FuX29wZW4gPSBsZWZ0X2ZsYW5raW5nICYmXG4gICAgICAgICAgICAoIXJpZ2h0X2ZsYW5raW5nIHx8IGJlZm9yZV9pc19wdW5jdHVhdGlvbik7XG4gICAgICAgIGNhbl9jbG9zZSA9IHJpZ2h0X2ZsYW5raW5nICYmXG4gICAgICAgICAgICAoIWxlZnRfZmxhbmtpbmcgfHwgYWZ0ZXJfaXNfcHVuY3R1YXRpb24pO1xuICAgIH0gZWxzZSBpZiAoY2MgPT09IENfU0lOR0xFUVVPVEUgfHwgY2MgPT09IENfRE9VQkxFUVVPVEUpIHtcbiAgICAgICAgY2FuX29wZW4gPSBsZWZ0X2ZsYW5raW5nICYmICFyaWdodF9mbGFua2luZztcbiAgICAgICAgY2FuX2Nsb3NlID0gcmlnaHRfZmxhbmtpbmc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2FuX29wZW4gPSBsZWZ0X2ZsYW5raW5nO1xuICAgICAgICBjYW5fY2xvc2UgPSByaWdodF9mbGFua2luZztcbiAgICB9XG4gICAgdGhpcy5wb3MgPSBzdGFydHBvcztcbiAgICByZXR1cm4geyBudW1kZWxpbXM6IG51bWRlbGltcyxcbiAgICAgICAgICAgICBjYW5fb3BlbjogY2FuX29wZW4sXG4gICAgICAgICAgICAgY2FuX2Nsb3NlOiBjYW5fY2xvc2UgfTtcbn07XG5cbi8vIEhhbmRsZSBhIGRlbGltaXRlciBtYXJrZXIgZm9yIGVtcGhhc2lzIG9yIGEgcXVvdGUuXG52YXIgaGFuZGxlRGVsaW0gPSBmdW5jdGlvbihjYywgYmxvY2spIHtcbiAgICB2YXIgcmVzID0gdGhpcy5zY2FuRGVsaW1zKGNjKTtcbiAgICBpZiAoIXJlcykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBudW1kZWxpbXMgPSByZXMubnVtZGVsaW1zO1xuICAgIHZhciBzdGFydHBvcyA9IHRoaXMucG9zO1xuICAgIHZhciBjb250ZW50cztcblxuICAgIHRoaXMucG9zICs9IG51bWRlbGltcztcbiAgICBpZiAoY2MgPT09IENfU0lOR0xFUVVPVEUpIHtcbiAgICAgICAgY29udGVudHMgPSBcIlxcdTIwMTlcIjtcbiAgICB9IGVsc2UgaWYgKGNjID09PSBDX0RPVUJMRVFVT1RFKSB7XG4gICAgICAgIGNvbnRlbnRzID0gXCJcXHUyMDFDXCI7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29udGVudHMgPSB0aGlzLnN1YmplY3Quc2xpY2Uoc3RhcnRwb3MsIHRoaXMucG9zKTtcbiAgICB9XG4gICAgdmFyIG5vZGUgPSB0ZXh0KGNvbnRlbnRzKTtcbiAgICBibG9jay5hcHBlbmRDaGlsZChub2RlKTtcblxuICAgIC8vIEFkZCBlbnRyeSB0byBzdGFjayBmb3IgdGhpcyBvcGVuZXJcbiAgICB0aGlzLmRlbGltaXRlcnMgPSB7IGNjOiBjYyxcbiAgICAgICAgICAgICAgICAgICAgICAgIG51bWRlbGltczogbnVtZGVsaW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgb3JpZ2RlbGltczogbnVtZGVsaW1zLFxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZTogbm9kZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByZXZpb3VzOiB0aGlzLmRlbGltaXRlcnMsXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0OiBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuX29wZW46IHJlcy5jYW5fb3BlbixcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbl9jbG9zZTogcmVzLmNhbl9jbG9zZSB9O1xuICAgIGlmICh0aGlzLmRlbGltaXRlcnMucHJldmlvdXMgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5kZWxpbWl0ZXJzLnByZXZpb3VzLm5leHQgPSB0aGlzLmRlbGltaXRlcnM7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG5cbn07XG5cbnZhciByZW1vdmVEZWxpbWl0ZXIgPSBmdW5jdGlvbihkZWxpbSkge1xuICAgIGlmIChkZWxpbS5wcmV2aW91cyAhPT0gbnVsbCkge1xuICAgICAgICBkZWxpbS5wcmV2aW91cy5uZXh0ID0gZGVsaW0ubmV4dDtcbiAgICB9XG4gICAgaWYgKGRlbGltLm5leHQgPT09IG51bGwpIHtcbiAgICAgICAgLy8gdG9wIG9mIHN0YWNrXG4gICAgICAgIHRoaXMuZGVsaW1pdGVycyA9IGRlbGltLnByZXZpb3VzO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGRlbGltLm5leHQucHJldmlvdXMgPSBkZWxpbS5wcmV2aW91cztcbiAgICB9XG59O1xuXG52YXIgcmVtb3ZlRGVsaW1pdGVyc0JldHdlZW4gPSBmdW5jdGlvbihib3R0b20sIHRvcCkge1xuICAgIGlmIChib3R0b20ubmV4dCAhPT0gdG9wKSB7XG4gICAgICAgIGJvdHRvbS5uZXh0ID0gdG9wO1xuICAgICAgICB0b3AucHJldmlvdXMgPSBib3R0b207XG4gICAgfVxufTtcblxudmFyIHByb2Nlc3NFbXBoYXNpcyA9IGZ1bmN0aW9uKHN0YWNrX2JvdHRvbSkge1xuICAgIHZhciBvcGVuZXIsIGNsb3Nlciwgb2xkX2Nsb3NlcjtcbiAgICB2YXIgb3BlbmVyX2lubCwgY2xvc2VyX2lubDtcbiAgICB2YXIgdGVtcHN0YWNrO1xuICAgIHZhciB1c2VfZGVsaW1zO1xuICAgIHZhciB0bXAsIG5leHQ7XG4gICAgdmFyIG9wZW5lcl9mb3VuZDtcbiAgICB2YXIgb3BlbmVyc19ib3R0b20gPSBbXTtcbiAgICB2YXIgb2RkX21hdGNoID0gZmFsc2U7XG5cbiAgICBvcGVuZXJzX2JvdHRvbVtDX1VOREVSU0NPUkVdID0gc3RhY2tfYm90dG9tO1xuICAgIG9wZW5lcnNfYm90dG9tW0NfQVNURVJJU0tdID0gc3RhY2tfYm90dG9tO1xuICAgIG9wZW5lcnNfYm90dG9tW0NfU0lOR0xFUVVPVEVdID0gc3RhY2tfYm90dG9tO1xuICAgIG9wZW5lcnNfYm90dG9tW0NfRE9VQkxFUVVPVEVdID0gc3RhY2tfYm90dG9tO1xuXG4gICAgLy8gZmluZCBmaXJzdCBjbG9zZXIgYWJvdmUgc3RhY2tfYm90dG9tOlxuICAgIGNsb3NlciA9IHRoaXMuZGVsaW1pdGVycztcbiAgICB3aGlsZSAoY2xvc2VyICE9PSBudWxsICYmIGNsb3Nlci5wcmV2aW91cyAhPT0gc3RhY2tfYm90dG9tKSB7XG4gICAgICAgIGNsb3NlciA9IGNsb3Nlci5wcmV2aW91cztcbiAgICB9XG4gICAgLy8gbW92ZSBmb3J3YXJkLCBsb29raW5nIGZvciBjbG9zZXJzLCBhbmQgaGFuZGxpbmcgZWFjaFxuICAgIHdoaWxlIChjbG9zZXIgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIGNsb3NlcmNjID0gY2xvc2VyLmNjO1xuICAgICAgICBpZiAoIWNsb3Nlci5jYW5fY2xvc2UpIHtcbiAgICAgICAgICAgIGNsb3NlciA9IGNsb3Nlci5uZXh0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZm91bmQgZW1waGFzaXMgY2xvc2VyLiBub3cgbG9vayBiYWNrIGZvciBmaXJzdCBtYXRjaGluZyBvcGVuZXI6XG4gICAgICAgICAgICBvcGVuZXIgPSBjbG9zZXIucHJldmlvdXM7XG4gICAgICAgICAgICBvcGVuZXJfZm91bmQgPSBmYWxzZTtcbiAgICAgICAgICAgIHdoaWxlIChvcGVuZXIgIT09IG51bGwgJiYgb3BlbmVyICE9PSBzdGFja19ib3R0b20gJiZcbiAgICAgICAgICAgICAgICAgICBvcGVuZXIgIT09IG9wZW5lcnNfYm90dG9tW2Nsb3NlcmNjXSkge1xuICAgICAgICAgICAgICAgIG9kZF9tYXRjaCA9IChjbG9zZXIuY2FuX29wZW4gfHwgb3BlbmVyLmNhbl9jbG9zZSkgJiZcbiAgICAgICAgICAgICAgICAgICAgKG9wZW5lci5vcmlnZGVsaW1zICsgY2xvc2VyLm9yaWdkZWxpbXMpICUgMyA9PT0gMDtcbiAgICAgICAgICAgICAgICBpZiAob3BlbmVyLmNjID09PSBjbG9zZXIuY2MgJiYgb3BlbmVyLmNhbl9vcGVuICYmICFvZGRfbWF0Y2gpIHtcbiAgICAgICAgICAgICAgICAgICAgb3BlbmVyX2ZvdW5kID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9wZW5lciA9IG9wZW5lci5wcmV2aW91cztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG9sZF9jbG9zZXIgPSBjbG9zZXI7XG5cbiAgICAgICAgICAgIGlmIChjbG9zZXJjYyA9PT0gQ19BU1RFUklTSyB8fCBjbG9zZXJjYyA9PT0gQ19VTkRFUlNDT1JFKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFvcGVuZXJfZm91bmQpIHtcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VyID0gY2xvc2VyLm5leHQ7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gY2FsY3VsYXRlIGFjdHVhbCBudW1iZXIgb2YgZGVsaW1pdGVycyB1c2VkIGZyb20gY2xvc2VyXG4gICAgICAgICAgICAgICAgICAgIHVzZV9kZWxpbXMgPVxuICAgICAgICAgICAgICAgICAgICAgIChjbG9zZXIubnVtZGVsaW1zID49IDIgJiYgb3BlbmVyLm51bWRlbGltcyA+PSAyKSA/IDIgOiAxO1xuXG4gICAgICAgICAgICAgICAgICAgIG9wZW5lcl9pbmwgPSBvcGVuZXIubm9kZTtcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VyX2lubCA9IGNsb3Nlci5ub2RlO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIHJlbW92ZSB1c2VkIGRlbGltaXRlcnMgZnJvbSBzdGFjayBlbHRzIGFuZCBpbmxpbmVzXG4gICAgICAgICAgICAgICAgICAgIG9wZW5lci5udW1kZWxpbXMgLT0gdXNlX2RlbGltcztcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VyLm51bWRlbGltcyAtPSB1c2VfZGVsaW1zO1xuICAgICAgICAgICAgICAgICAgICBvcGVuZXJfaW5sLl9saXRlcmFsID1cbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5lcl9pbmwuX2xpdGVyYWwuc2xpY2UoMCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3BlbmVyX2lubC5fbGl0ZXJhbC5sZW5ndGggLSB1c2VfZGVsaW1zKTtcbiAgICAgICAgICAgICAgICAgICAgY2xvc2VyX2lubC5fbGl0ZXJhbCA9XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXJfaW5sLl9saXRlcmFsLnNsaWNlKDAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsb3Nlcl9pbmwuX2xpdGVyYWwubGVuZ3RoIC0gdXNlX2RlbGltcyk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gYnVpbGQgY29udGVudHMgZm9yIG5ldyBlbXBoIGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVtcGggPSBuZXcgTm9kZSh1c2VfZGVsaW1zID09PSAxID8gJ2VtcGgnIDogJ3N0cm9uZycpO1xuXG4gICAgICAgICAgICAgICAgICAgIHRtcCA9IG9wZW5lcl9pbmwuX25leHQ7XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlICh0bXAgJiYgdG1wICE9PSBjbG9zZXJfaW5sKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0ID0gdG1wLl9uZXh0O1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wLnVubGluaygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgZW1waC5hcHBlbmRDaGlsZCh0bXApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdG1wID0gbmV4dDtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIG9wZW5lcl9pbmwuaW5zZXJ0QWZ0ZXIoZW1waCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gcmVtb3ZlIGVsdHMgYmV0d2VlbiBvcGVuZXIgYW5kIGNsb3NlciBpbiBkZWxpbWl0ZXJzIHN0YWNrXG4gICAgICAgICAgICAgICAgICAgIHJlbW92ZURlbGltaXRlcnNCZXR3ZWVuKG9wZW5lciwgY2xvc2VyKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBpZiBvcGVuZXIgaGFzIDAgZGVsaW1zLCByZW1vdmUgaXQgYW5kIHRoZSBpbmxpbmVcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wZW5lci5udW1kZWxpbXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZW5lcl9pbmwudW5saW5rKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZURlbGltaXRlcihvcGVuZXIpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGNsb3Nlci5udW1kZWxpbXMgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsb3Nlcl9pbmwudW5saW5rKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZW1wc3RhY2sgPSBjbG9zZXIubmV4dDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlRGVsaW1pdGVyKGNsb3Nlcik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjbG9zZXIgPSB0ZW1wc3RhY2s7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSBlbHNlIGlmIChjbG9zZXJjYyA9PT0gQ19TSU5HTEVRVU9URSkge1xuICAgICAgICAgICAgICAgIGNsb3Nlci5ub2RlLl9saXRlcmFsID0gXCJcXHUyMDE5XCI7XG4gICAgICAgICAgICAgICAgaWYgKG9wZW5lcl9mb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICBvcGVuZXIubm9kZS5fbGl0ZXJhbCA9IFwiXFx1MjAxOFwiO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjbG9zZXIgPSBjbG9zZXIubmV4dDtcblxuICAgICAgICAgICAgfSBlbHNlIGlmIChjbG9zZXJjYyA9PT0gQ19ET1VCTEVRVU9URSkge1xuICAgICAgICAgICAgICAgIGNsb3Nlci5ub2RlLl9saXRlcmFsID0gXCJcXHUyMDFEXCI7XG4gICAgICAgICAgICAgICAgaWYgKG9wZW5lcl9mb3VuZCkge1xuICAgICAgICAgICAgICAgICAgICBvcGVuZXIubm9kZS5saXRlcmFsID0gXCJcXHUyMDFDXCI7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNsb3NlciA9IGNsb3Nlci5uZXh0O1xuXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW9wZW5lcl9mb3VuZCAmJiAhb2RkX21hdGNoKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGxvd2VyIGJvdW5kIGZvciBmdXR1cmUgc2VhcmNoZXMgZm9yIG9wZW5lcnM6XG4gICAgICAgICAgICAgICAgLy8gV2UgZG9uJ3QgZG8gdGhpcyB3aXRoIG9kZF9tYXRjaCBiZWNhdXNlIGEgKipcbiAgICAgICAgICAgICAgICAvLyB0aGF0IGRvZXNuJ3QgbWF0Y2ggYW4gZWFybGllciAqIG1pZ2h0IHR1cm4gaW50b1xuICAgICAgICAgICAgICAgIC8vIGFuIG9wZW5lciwgYW5kIHRoZSAqIG1pZ2h0IGJlIG1hdGNoZWQgYnkgc29tZXRoaW5nXG4gICAgICAgICAgICAgICAgLy8gZWxzZS5cbiAgICAgICAgICAgICAgICBvcGVuZXJzX2JvdHRvbVtjbG9zZXJjY10gPSBvbGRfY2xvc2VyLnByZXZpb3VzO1xuICAgICAgICAgICAgICAgIGlmICghb2xkX2Nsb3Nlci5jYW5fb3Blbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBXZSBjYW4gcmVtb3ZlIGEgY2xvc2VyIHRoYXQgY2FuJ3QgYmUgYW4gb3BlbmVyLFxuICAgICAgICAgICAgICAgICAgICAvLyBvbmNlIHdlJ3ZlIHNlZW4gdGhlcmUncyBubyBtYXRjaGluZyBvcGVuZXI6XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlRGVsaW1pdGVyKG9sZF9jbG9zZXIpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGFsbCBkZWxpbWl0ZXJzXG4gICAgd2hpbGUgKHRoaXMuZGVsaW1pdGVycyAhPT0gbnVsbCAmJiB0aGlzLmRlbGltaXRlcnMgIT09IHN0YWNrX2JvdHRvbSkge1xuICAgICAgICB0aGlzLnJlbW92ZURlbGltaXRlcih0aGlzLmRlbGltaXRlcnMpO1xuICAgIH1cbn07XG5cbi8vIEF0dGVtcHQgdG8gcGFyc2UgbGluayB0aXRsZSAoc2FucyBxdW90ZXMpLCByZXR1cm5pbmcgdGhlIHN0cmluZ1xuLy8gb3IgbnVsbCBpZiBubyBtYXRjaC5cbnZhciBwYXJzZUxpbmtUaXRsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0aXRsZSA9IHRoaXMubWF0Y2gocmVMaW5rVGl0bGUpO1xuICAgIGlmICh0aXRsZSA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjaG9wIG9mZiBxdW90ZXMgZnJvbSB0aXRsZSBhbmQgdW5lc2NhcGU6XG4gICAgICAgIHJldHVybiB1bmVzY2FwZVN0cmluZyh0aXRsZS5zdWJzdHIoMSwgdGl0bGUubGVuZ3RoIC0gMikpO1xuICAgIH1cbn07XG5cbi8vIEF0dGVtcHQgdG8gcGFyc2UgbGluayBkZXN0aW5hdGlvbiwgcmV0dXJuaW5nIHRoZSBzdHJpbmcgb3Jcbi8vIG51bGwgaWYgbm8gbWF0Y2guXG52YXIgcGFyc2VMaW5rRGVzdGluYXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcmVzID0gdGhpcy5tYXRjaChyZUxpbmtEZXN0aW5hdGlvbkJyYWNlcyk7XG4gICAgaWYgKHJlcyA9PT0gbnVsbCkge1xuICAgICAgICAvLyBUT0RPIGhhbmRyb2xsZWQgcGFyc2VyOyByZXMgc2hvdWxkIGJlIG51bGwgb3IgdGhlIHN0cmluZ1xuICAgICAgICB2YXIgc2F2ZXBvcyA9IHRoaXMucG9zO1xuICAgICAgICB2YXIgb3BlbnBhcmVucyA9IDA7XG4gICAgICAgIHZhciBjO1xuICAgICAgICB3aGlsZSAoKGMgPSB0aGlzLnBlZWsoKSkgIT09IC0xKSB7XG4gICAgICAgICAgICBpZiAoYyA9PT0gQ19CQUNLU0xBU0gpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcyArPSAxO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnBlZWsoKSAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wb3MgKz0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGMgPT09IENfT1BFTl9QQVJFTikge1xuICAgICAgICAgICAgICAgIHRoaXMucG9zICs9IDE7XG4gICAgICAgICAgICAgICAgb3BlbnBhcmVucyArPSAxO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChjID09PSBDX0NMT1NFX1BBUkVOKSB7XG4gICAgICAgICAgICAgICAgaWYgKG9wZW5wYXJlbnMgPCAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucG9zICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIG9wZW5wYXJlbnMgLT0gMTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlV2hpdGVzcGFjZUNoYXIuZXhlYyhmcm9tQ29kZVBvaW50KGMpKSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLnBvcyArPSAxO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJlcyA9IHRoaXMuc3ViamVjdC5zdWJzdHIoc2F2ZXBvcywgdGhpcy5wb3MgLSBzYXZlcG9zKTtcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZVVSSSh1bmVzY2FwZVN0cmluZyhyZXMpKTtcbiAgICB9IGVsc2UgeyAgLy8gY2hvcCBvZmYgc3Vycm91bmRpbmcgPC4uPjpcbiAgICAgICAgcmV0dXJuIG5vcm1hbGl6ZVVSSSh1bmVzY2FwZVN0cmluZyhyZXMuc3Vic3RyKDEsIHJlcy5sZW5ndGggLSAyKSkpO1xuICAgIH1cbn07XG5cbi8vIEF0dGVtcHQgdG8gcGFyc2UgYSBsaW5rIGxhYmVsLCByZXR1cm5pbmcgbnVtYmVyIG9mIGNoYXJhY3RlcnMgcGFyc2VkLlxudmFyIHBhcnNlTGlua0xhYmVsID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIG0gPSB0aGlzLm1hdGNoKHJlTGlua0xhYmVsKTtcbiAgICAvLyBOb3RlOiAgb3VyIHJlZ2V4IHdpbGwgYWxsb3cgc29tZXRoaW5nIG9mIGZvcm0gWy4uXFxdO1xuICAgIC8vIHdlIGRpc2FsbG93IGl0IGhlcmUgcmF0aGVyIHRoYW4gdXNpbmcgbG9va2FoZWFkIGluIHRoZSByZWdleDpcbiAgICBpZiAobSA9PT0gbnVsbCB8fCBtLmxlbmd0aCA+IDEwMDEgfHwgL1teXFxcXF1cXFxcXFxdJC8uZXhlYyhtKSkge1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbS5sZW5ndGg7XG4gICAgfVxufTtcblxuLy8gQWRkIG9wZW4gYnJhY2tldCB0byBkZWxpbWl0ZXIgc3RhY2sgYW5kIGFkZCBhIHRleHQgbm9kZSB0byBibG9jaydzIGNoaWxkcmVuLlxudmFyIHBhcnNlT3BlbkJyYWNrZXQgPSBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBzdGFydHBvcyA9IHRoaXMucG9zO1xuICAgIHRoaXMucG9zICs9IDE7XG5cbiAgICB2YXIgbm9kZSA9IHRleHQoJ1snKTtcbiAgICBibG9jay5hcHBlbmRDaGlsZChub2RlKTtcblxuICAgIC8vIEFkZCBlbnRyeSB0byBzdGFjayBmb3IgdGhpcyBvcGVuZXJcbiAgICB0aGlzLmFkZEJyYWNrZXQobm9kZSwgc3RhcnRwb3MsIGZhbHNlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIElGIG5leHQgY2hhcmFjdGVyIGlzIFssIGFuZCAhIGRlbGltaXRlciB0byBkZWxpbWl0ZXIgc3RhY2sgYW5kXG4vLyBhZGQgYSB0ZXh0IG5vZGUgdG8gYmxvY2sncyBjaGlsZHJlbi4gIE90aGVyd2lzZSBqdXN0IGFkZCBhIHRleHQgbm9kZS5cbnZhciBwYXJzZUJhbmcgPSBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBzdGFydHBvcyA9IHRoaXMucG9zO1xuICAgIHRoaXMucG9zICs9IDE7XG4gICAgaWYgKHRoaXMucGVlaygpID09PSBDX09QRU5fQlJBQ0tFVCkge1xuICAgICAgICB0aGlzLnBvcyArPSAxO1xuXG4gICAgICAgIHZhciBub2RlID0gdGV4dCgnIVsnKTtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQobm9kZSk7XG5cbiAgICAgICAgLy8gQWRkIGVudHJ5IHRvIHN0YWNrIGZvciB0aGlzIG9wZW5lclxuICAgICAgICB0aGlzLmFkZEJyYWNrZXQobm9kZSwgc3RhcnRwb3MgKyAxLCB0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBibG9jay5hcHBlbmRDaGlsZCh0ZXh0KCchJykpO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIFRyeSB0byBtYXRjaCBjbG9zZSBicmFja2V0IGFnYWluc3QgYW4gb3BlbmluZyBpbiB0aGUgZGVsaW1pdGVyXG4vLyBzdGFjay4gIEFkZCBlaXRoZXIgYSBsaW5rIG9yIGltYWdlLCBvciBhIHBsYWluIFsgY2hhcmFjdGVyLFxuLy8gdG8gYmxvY2sncyBjaGlsZHJlbi4gIElmIHRoZXJlIGlzIGEgbWF0Y2hpbmcgZGVsaW1pdGVyLFxuLy8gcmVtb3ZlIGl0IGZyb20gdGhlIGRlbGltaXRlciBzdGFjay5cbnZhciBwYXJzZUNsb3NlQnJhY2tldCA9IGZ1bmN0aW9uKGJsb2NrKSB7XG4gICAgdmFyIHN0YXJ0cG9zO1xuICAgIHZhciBpc19pbWFnZTtcbiAgICB2YXIgZGVzdDtcbiAgICB2YXIgdGl0bGU7XG4gICAgdmFyIG1hdGNoZWQgPSBmYWxzZTtcbiAgICB2YXIgcmVmbGFiZWw7XG4gICAgdmFyIG9wZW5lcjtcblxuICAgIHRoaXMucG9zICs9IDE7XG4gICAgc3RhcnRwb3MgPSB0aGlzLnBvcztcblxuICAgIC8vIGdldCBsYXN0IFsgb3IgIVtcbiAgICBvcGVuZXIgPSB0aGlzLmJyYWNrZXRzO1xuXG4gICAgaWYgKG9wZW5lciA9PT0gbnVsbCkge1xuICAgICAgICAvLyBubyBtYXRjaGVkIG9wZW5lciwganVzdCByZXR1cm4gYSBsaXRlcmFsXG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQoJ10nKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGlmICghb3BlbmVyLmFjdGl2ZSkge1xuICAgICAgICAvLyBubyBtYXRjaGVkIG9wZW5lciwganVzdCByZXR1cm4gYSBsaXRlcmFsXG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQoJ10nKSk7XG4gICAgICAgIC8vIHRha2Ugb3BlbmVyIG9mZiBicmFja2V0cyBzdGFja1xuICAgICAgICB0aGlzLnJlbW92ZUJyYWNrZXQoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gSWYgd2UgZ290IGhlcmUsIG9wZW4gaXMgYSBwb3RlbnRpYWwgb3BlbmVyXG4gICAgaXNfaW1hZ2UgPSBvcGVuZXIuaW1hZ2U7XG5cbiAgICAvLyBDaGVjayB0byBzZWUgaWYgd2UgaGF2ZSBhIGxpbmsvaW1hZ2VcblxuICAgIHZhciBzYXZlcG9zID0gdGhpcy5wb3M7XG5cbiAgICAvLyBJbmxpbmUgbGluaz9cbiAgICBpZiAodGhpcy5wZWVrKCkgPT09IENfT1BFTl9QQVJFTikge1xuICAgICAgICB0aGlzLnBvcysrO1xuICAgICAgICBpZiAodGhpcy5zcG5sKCkgJiZcbiAgICAgICAgICAgICgoZGVzdCA9IHRoaXMucGFyc2VMaW5rRGVzdGluYXRpb24oKSkgIT09IG51bGwpICYmXG4gICAgICAgICAgICB0aGlzLnNwbmwoKSAmJlxuICAgICAgICAgICAgLy8gbWFrZSBzdXJlIHRoZXJlJ3MgYSBzcGFjZSBiZWZvcmUgdGhlIHRpdGxlOlxuICAgICAgICAgICAgKHJlV2hpdGVzcGFjZUNoYXIudGVzdCh0aGlzLnN1YmplY3QuY2hhckF0KHRoaXMucG9zIC0gMSkpICYmXG4gICAgICAgICAgICAgKHRpdGxlID0gdGhpcy5wYXJzZUxpbmtUaXRsZSgpKSB8fCB0cnVlKSAmJlxuICAgICAgICAgICAgdGhpcy5zcG5sKCkgJiZcbiAgICAgICAgICAgIHRoaXMucGVlaygpID09PSBDX0NMT1NFX1BBUkVOKSB7XG4gICAgICAgICAgICB0aGlzLnBvcyArPSAxO1xuICAgICAgICAgICAgbWF0Y2hlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnBvcyA9IHNhdmVwb3M7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIW1hdGNoZWQpIHtcblxuICAgICAgICAvLyBOZXh0LCBzZWUgaWYgdGhlcmUncyBhIGxpbmsgbGFiZWxcbiAgICAgICAgdmFyIGJlZm9yZWxhYmVsID0gdGhpcy5wb3M7XG4gICAgICAgIHZhciBuID0gdGhpcy5wYXJzZUxpbmtMYWJlbCgpO1xuICAgICAgICBpZiAobiA+IDIpIHtcbiAgICAgICAgICAgIHJlZmxhYmVsID0gdGhpcy5zdWJqZWN0LnNsaWNlKGJlZm9yZWxhYmVsLCBiZWZvcmVsYWJlbCArIG4pO1xuICAgICAgICB9IGVsc2UgaWYgKCFvcGVuZXIuYnJhY2tldEFmdGVyKSB7XG4gICAgICAgICAgICAvLyBFbXB0eSBvciBtaXNzaW5nIHNlY29uZCBsYWJlbCBtZWFucyB0byB1c2UgdGhlIGZpcnN0IGxhYmVsIGFzIHRoZSByZWZlcmVuY2UuXG4gICAgICAgICAgICAvLyBUaGUgcmVmZXJlbmNlIG11c3Qgbm90IGNvbnRhaW4gYSBicmFja2V0LiBJZiB3ZSBrbm93IHRoZXJlJ3MgYSBicmFja2V0LCB3ZSBkb24ndCBldmVuIGJvdGhlciBjaGVja2luZyBpdC5cbiAgICAgICAgICAgIHJlZmxhYmVsID0gdGhpcy5zdWJqZWN0LnNsaWNlKG9wZW5lci5pbmRleCwgc3RhcnRwb3MpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuID09PSAwKSB7XG4gICAgICAgICAgICAvLyBJZiBzaG9ydGN1dCByZWZlcmVuY2UgbGluaywgcmV3aW5kIGJlZm9yZSBzcGFjZXMgd2Ugc2tpcHBlZC5cbiAgICAgICAgICAgIHRoaXMucG9zID0gc2F2ZXBvcztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZWZsYWJlbCkge1xuICAgICAgICAgICAgLy8gbG9va3VwIHJhd2xhYmVsIGluIHJlZm1hcFxuICAgICAgICAgICAgdmFyIGxpbmsgPSB0aGlzLnJlZm1hcFtub3JtYWxpemVSZWZlcmVuY2UocmVmbGFiZWwpXTtcbiAgICAgICAgICAgIGlmIChsaW5rKSB7XG4gICAgICAgICAgICAgICAgZGVzdCA9IGxpbmsuZGVzdGluYXRpb247XG4gICAgICAgICAgICAgICAgdGl0bGUgPSBsaW5rLnRpdGxlO1xuICAgICAgICAgICAgICAgIG1hdGNoZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG1hdGNoZWQpIHtcbiAgICAgICAgdmFyIG5vZGUgPSBuZXcgTm9kZShpc19pbWFnZSA/ICdpbWFnZScgOiAnbGluaycpO1xuICAgICAgICBub2RlLl9kZXN0aW5hdGlvbiA9IGRlc3Q7XG4gICAgICAgIG5vZGUuX3RpdGxlID0gdGl0bGUgfHwgJyc7XG5cbiAgICAgICAgdmFyIHRtcCwgbmV4dDtcbiAgICAgICAgdG1wID0gb3BlbmVyLm5vZGUuX25leHQ7XG4gICAgICAgIHdoaWxlICh0bXApIHtcbiAgICAgICAgICAgIG5leHQgPSB0bXAuX25leHQ7XG4gICAgICAgICAgICB0bXAudW5saW5rKCk7XG4gICAgICAgICAgICBub2RlLmFwcGVuZENoaWxkKHRtcCk7XG4gICAgICAgICAgICB0bXAgPSBuZXh0O1xuICAgICAgICB9XG4gICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgICB0aGlzLnByb2Nlc3NFbXBoYXNpcyhvcGVuZXIucHJldmlvdXNEZWxpbWl0ZXIpO1xuICAgICAgICB0aGlzLnJlbW92ZUJyYWNrZXQoKTtcbiAgICAgICAgb3BlbmVyLm5vZGUudW5saW5rKCk7XG5cbiAgICAgICAgLy8gV2UgcmVtb3ZlIHRoaXMgYnJhY2tldCBhbmQgcHJvY2Vzc0VtcGhhc2lzIHdpbGwgcmVtb3ZlIGxhdGVyIGRlbGltaXRlcnMuXG4gICAgICAgIC8vIE5vdywgZm9yIGEgbGluaywgd2UgYWxzbyBkZWFjdGl2YXRlIGVhcmxpZXIgbGluayBvcGVuZXJzLlxuICAgICAgICAvLyAobm8gbGlua3MgaW4gbGlua3MpXG4gICAgICAgIGlmICghaXNfaW1hZ2UpIHtcbiAgICAgICAgICBvcGVuZXIgPSB0aGlzLmJyYWNrZXRzO1xuICAgICAgICAgIHdoaWxlIChvcGVuZXIgIT09IG51bGwpIHtcbiAgICAgICAgICAgIGlmICghb3BlbmVyLmltYWdlKSB7XG4gICAgICAgICAgICAgICAgb3BlbmVyLmFjdGl2ZSA9IGZhbHNlOyAvLyBkZWFjdGl2YXRlIHRoaXMgb3BlbmVyXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcGVuZXIgPSBvcGVuZXIucHJldmlvdXM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHRydWU7XG5cbiAgICB9IGVsc2UgeyAvLyBubyBtYXRjaFxuXG4gICAgICAgIHRoaXMucmVtb3ZlQnJhY2tldCgpOyAgLy8gcmVtb3ZlIHRoaXMgb3BlbmVyIGZyb20gc3RhY2tcbiAgICAgICAgdGhpcy5wb3MgPSBzdGFydHBvcztcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQodGV4dCgnXScpKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG59O1xuXG52YXIgYWRkQnJhY2tldCA9IGZ1bmN0aW9uKG5vZGUsIGluZGV4LCBpbWFnZSkge1xuICAgIGlmICh0aGlzLmJyYWNrZXRzICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMuYnJhY2tldHMuYnJhY2tldEFmdGVyID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5icmFja2V0cyA9IHsgbm9kZTogbm9kZSxcbiAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91czogdGhpcy5icmFja2V0cyxcbiAgICAgICAgICAgICAgICAgICAgICBwcmV2aW91c0RlbGltaXRlcjogdGhpcy5kZWxpbWl0ZXJzLFxuICAgICAgICAgICAgICAgICAgICAgIGluZGV4OiBpbmRleCxcbiAgICAgICAgICAgICAgICAgICAgICBpbWFnZTogaW1hZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiB0cnVlIH07XG59O1xuXG52YXIgcmVtb3ZlQnJhY2tldCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuYnJhY2tldHMgPSB0aGlzLmJyYWNrZXRzLnByZXZpb3VzO1xufTtcblxuLy8gQXR0ZW1wdCB0byBwYXJzZSBhbiBlbnRpdHkuXG52YXIgcGFyc2VFbnRpdHkgPSBmdW5jdGlvbihibG9jaykge1xuICAgIHZhciBtO1xuICAgIGlmICgobSA9IHRoaXMubWF0Y2gocmVFbnRpdHlIZXJlKSkpIHtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQodGV4dChkZWNvZGVIVE1MKG0pKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59O1xuXG4vLyBQYXJzZSBhIHJ1biBvZiBvcmRpbmFyeSBjaGFyYWN0ZXJzLCBvciBhIHNpbmdsZSBjaGFyYWN0ZXIgd2l0aFxuLy8gYSBzcGVjaWFsIG1lYW5pbmcgaW4gbWFya2Rvd24sIGFzIGEgcGxhaW4gc3RyaW5nLlxudmFyIHBhcnNlU3RyaW5nID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoKG0gPSB0aGlzLm1hdGNoKHJlTWFpbikpKSB7XG4gICAgICAgIGlmICh0aGlzLm9wdGlvbnMuc21hcnQpIHtcbiAgICAgICAgICAgIGJsb2NrLmFwcGVuZENoaWxkKHRleHQoXG4gICAgICAgICAgICAgICAgbS5yZXBsYWNlKHJlRWxsaXBzZXMsIFwiXFx1MjAyNlwiKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZShyZURhc2gsIGZ1bmN0aW9uKGNoYXJzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5Db3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW1Db3VudCA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2hhcnMubGVuZ3RoICUgMyA9PT0gMCkgeyAvLyBJZiBkaXZpc2libGUgYnkgMywgdXNlIGFsbCBlbSBkYXNoZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbUNvdW50ID0gY2hhcnMubGVuZ3RoIC8gMztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhcnMubGVuZ3RoICUgMiA9PT0gMCkgeyAvLyBJZiBkaXZpc2libGUgYnkgMiwgdXNlIGFsbCBlbiBkYXNoZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbkNvdW50ID0gY2hhcnMubGVuZ3RoIC8gMjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoY2hhcnMubGVuZ3RoICUgMyA9PT0gMikgeyAvLyBJZiAyIGV4dHJhIGRhc2hlcywgdXNlIGVuIGRhc2ggZm9yIGxhc3QgMjsgZW0gZGFzaGVzIGZvciByZXN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5Db3VudCA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1Db3VudCA9IChjaGFycy5sZW5ndGggLSAyKSAvIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgeyAvLyBVc2UgZW4gZGFzaGVzIGZvciBsYXN0IDQgaHlwaGVuczsgZW0gZGFzaGVzIGZvciByZXN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5Db3VudCA9IDI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW1Db3VudCA9IChjaGFycy5sZW5ndGggLSA0KSAvIDM7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJcXHUyMDE0XCIucmVwZWF0KGVtQ291bnQpICsgXCJcXHUyMDEzXCIucmVwZWF0KGVuQ291bnQpO1xuICAgICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQodGV4dChtKSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn07XG5cbi8vIFBhcnNlIGEgbmV3bGluZS4gIElmIGl0IHdhcyBwcmVjZWRlZCBieSB0d28gc3BhY2VzLCByZXR1cm4gYSBoYXJkXG4vLyBsaW5lIGJyZWFrOyBvdGhlcndpc2UgYSBzb2Z0IGxpbmUgYnJlYWsuXG52YXIgcGFyc2VOZXdsaW5lID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB0aGlzLnBvcyArPSAxOyAvLyBhc3N1bWUgd2UncmUgYXQgYSBcXG5cbiAgICAvLyBjaGVjayBwcmV2aW91cyBub2RlIGZvciB0cmFpbGluZyBzcGFjZXNcbiAgICB2YXIgbGFzdGMgPSBibG9jay5fbGFzdENoaWxkO1xuICAgIGlmIChsYXN0YyAmJiBsYXN0Yy50eXBlID09PSAndGV4dCcgJiYgbGFzdGMuX2xpdGVyYWxbbGFzdGMuX2xpdGVyYWwubGVuZ3RoIC0gMV0gPT09ICcgJykge1xuICAgICAgICB2YXIgaGFyZGJyZWFrID0gbGFzdGMuX2xpdGVyYWxbbGFzdGMuX2xpdGVyYWwubGVuZ3RoIC0gMl0gPT09ICcgJztcbiAgICAgICAgbGFzdGMuX2xpdGVyYWwgPSBsYXN0Yy5fbGl0ZXJhbC5yZXBsYWNlKHJlRmluYWxTcGFjZSwgJycpO1xuICAgICAgICBibG9jay5hcHBlbmRDaGlsZChuZXcgTm9kZShoYXJkYnJlYWsgPyAnbGluZWJyZWFrJyA6ICdzb2Z0YnJlYWsnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQobmV3IE5vZGUoJ3NvZnRicmVhaycpKTtcbiAgICB9XG4gICAgdGhpcy5tYXRjaChyZUluaXRpYWxTcGFjZSk7IC8vIGdvYmJsZSBsZWFkaW5nIHNwYWNlcyBpbiBuZXh0IGxpbmVcbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8vIEF0dGVtcHQgdG8gcGFyc2UgYSBsaW5rIHJlZmVyZW5jZSwgbW9kaWZ5aW5nIHJlZm1hcC5cbnZhciBwYXJzZVJlZmVyZW5jZSA9IGZ1bmN0aW9uKHMsIHJlZm1hcCkge1xuICAgIHRoaXMuc3ViamVjdCA9IHM7XG4gICAgdGhpcy5wb3MgPSAwO1xuICAgIHZhciByYXdsYWJlbDtcbiAgICB2YXIgZGVzdDtcbiAgICB2YXIgdGl0bGU7XG4gICAgdmFyIG1hdGNoQ2hhcnM7XG4gICAgdmFyIHN0YXJ0cG9zID0gdGhpcy5wb3M7XG5cbiAgICAvLyBsYWJlbDpcbiAgICBtYXRjaENoYXJzID0gdGhpcy5wYXJzZUxpbmtMYWJlbCgpO1xuICAgIGlmIChtYXRjaENoYXJzID09PSAwKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJhd2xhYmVsID0gdGhpcy5zdWJqZWN0LnN1YnN0cigwLCBtYXRjaENoYXJzKTtcbiAgICB9XG5cbiAgICAvLyBjb2xvbjpcbiAgICBpZiAodGhpcy5wZWVrKCkgPT09IENfQ09MT04pIHtcbiAgICAgICAgdGhpcy5wb3MrKztcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnBvcyA9IHN0YXJ0cG9zO1xuICAgICAgICByZXR1cm4gMDtcbiAgICB9XG5cbiAgICAvLyAgbGluayB1cmxcbiAgICB0aGlzLnNwbmwoKTtcblxuICAgIGRlc3QgPSB0aGlzLnBhcnNlTGlua0Rlc3RpbmF0aW9uKCk7XG4gICAgaWYgKGRlc3QgPT09IG51bGwgfHwgZGVzdC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgdGhpcy5wb3MgPSBzdGFydHBvcztcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgfVxuXG4gICAgdmFyIGJlZm9yZXRpdGxlID0gdGhpcy5wb3M7XG4gICAgdGhpcy5zcG5sKCk7XG4gICAgdGl0bGUgPSB0aGlzLnBhcnNlTGlua1RpdGxlKCk7XG4gICAgaWYgKHRpdGxlID09PSBudWxsKSB7XG4gICAgICAgIHRpdGxlID0gJyc7XG4gICAgICAgIC8vIHJld2luZCBiZWZvcmUgc3BhY2VzXG4gICAgICAgIHRoaXMucG9zID0gYmVmb3JldGl0bGU7XG4gICAgfVxuXG4gICAgLy8gbWFrZSBzdXJlIHdlJ3JlIGF0IGxpbmUgZW5kOlxuICAgIHZhciBhdExpbmVFbmQgPSB0cnVlO1xuICAgIGlmICh0aGlzLm1hdGNoKHJlU3BhY2VBdEVuZE9mTGluZSkgPT09IG51bGwpIHtcbiAgICAgICAgaWYgKHRpdGxlID09PSAnJykge1xuICAgICAgICAgICAgYXRMaW5lRW5kID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0aGUgcG90ZW50aWFsIHRpdGxlIHdlIGZvdW5kIGlzIG5vdCBhdCB0aGUgbGluZSBlbmQsXG4gICAgICAgICAgICAvLyBidXQgaXQgY291bGQgc3RpbGwgYmUgYSBsZWdhbCBsaW5rIHJlZmVyZW5jZSBpZiB3ZVxuICAgICAgICAgICAgLy8gZGlzY2FyZCB0aGUgdGl0bGVcbiAgICAgICAgICAgIHRpdGxlID0gJyc7XG4gICAgICAgICAgICAvLyByZXdpbmQgYmVmb3JlIHNwYWNlc1xuICAgICAgICAgICAgdGhpcy5wb3MgPSBiZWZvcmV0aXRsZTtcbiAgICAgICAgICAgIC8vIGFuZCBpbnN0ZWFkIGNoZWNrIGlmIHRoZSBsaW5rIFVSTCBpcyBhdCB0aGUgbGluZSBlbmRcbiAgICAgICAgICAgIGF0TGluZUVuZCA9IHRoaXMubWF0Y2gocmVTcGFjZUF0RW5kT2ZMaW5lKSAhPT0gbnVsbDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIGlmICghYXRMaW5lRW5kKSB7XG4gICAgICAgIHRoaXMucG9zID0gc3RhcnRwb3M7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIHZhciBub3JtbGFiZWwgPSBub3JtYWxpemVSZWZlcmVuY2UocmF3bGFiZWwpO1xuICAgIGlmIChub3JtbGFiZWwgPT09ICcnKSB7XG4gICAgICAgIC8vIGxhYmVsIG11c3QgY29udGFpbiBub24td2hpdGVzcGFjZSBjaGFyYWN0ZXJzXG4gICAgICAgIHRoaXMucG9zID0gc3RhcnRwb3M7XG4gICAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGlmICghcmVmbWFwW25vcm1sYWJlbF0pIHtcbiAgICAgICAgcmVmbWFwW25vcm1sYWJlbF0gPSB7IGRlc3RpbmF0aW9uOiBkZXN0LCB0aXRsZTogdGl0bGUgfTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucG9zIC0gc3RhcnRwb3M7XG59O1xuXG4vLyBQYXJzZSB0aGUgbmV4dCBpbmxpbmUgZWxlbWVudCBpbiBzdWJqZWN0LCBhZHZhbmNpbmcgc3ViamVjdCBwb3NpdGlvbi5cbi8vIE9uIHN1Y2Nlc3MsIGFkZCB0aGUgcmVzdWx0IHRvIGJsb2NrJ3MgY2hpbGRyZW4gYW5kIHJldHVybiB0cnVlLlxuLy8gT24gZmFpbHVyZSwgcmV0dXJuIGZhbHNlLlxudmFyIHBhcnNlSW5saW5lID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB2YXIgcmVzID0gZmFsc2U7XG4gICAgdmFyIGMgPSB0aGlzLnBlZWsoKTtcbiAgICBpZiAoYyA9PT0gLTEpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBzd2l0Y2goYykge1xuICAgIGNhc2UgQ19ORVdMSU5FOlxuICAgICAgICByZXMgPSB0aGlzLnBhcnNlTmV3bGluZShibG9jayk7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgQ19CQUNLU0xBU0g6XG4gICAgICAgIHJlcyA9IHRoaXMucGFyc2VCYWNrc2xhc2goYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIENfQkFDS1RJQ0s6XG4gICAgICAgIHJlcyA9IHRoaXMucGFyc2VCYWNrdGlja3MoYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIENfQVNURVJJU0s6XG4gICAgY2FzZSBDX1VOREVSU0NPUkU6XG4gICAgICAgIHJlcyA9IHRoaXMuaGFuZGxlRGVsaW0oYywgYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICBjYXNlIENfU0lOR0xFUVVPVEU6XG4gICAgY2FzZSBDX0RPVUJMRVFVT1RFOlxuICAgICAgICByZXMgPSB0aGlzLm9wdGlvbnMuc21hcnQgJiYgdGhpcy5oYW5kbGVEZWxpbShjLCBibG9jayk7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgQ19PUEVOX0JSQUNLRVQ6XG4gICAgICAgIHJlcyA9IHRoaXMucGFyc2VPcGVuQnJhY2tldChibG9jayk7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgQ19CQU5HOlxuICAgICAgICByZXMgPSB0aGlzLnBhcnNlQmFuZyhibG9jayk7XG4gICAgICAgIGJyZWFrO1xuICAgIGNhc2UgQ19DTE9TRV9CUkFDS0VUOlxuICAgICAgICByZXMgPSB0aGlzLnBhcnNlQ2xvc2VCcmFja2V0KGJsb2NrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBDX0xFU1NUSEFOOlxuICAgICAgICByZXMgPSB0aGlzLnBhcnNlQXV0b2xpbmsoYmxvY2spIHx8IHRoaXMucGFyc2VIdG1sVGFnKGJsb2NrKTtcbiAgICAgICAgYnJlYWs7XG4gICAgY2FzZSBDX0FNUEVSU0FORDpcbiAgICAgICAgcmVzID0gdGhpcy5wYXJzZUVudGl0eShibG9jayk7XG4gICAgICAgIGJyZWFrO1xuICAgIGRlZmF1bHQ6XG4gICAgICAgIHJlcyA9IHRoaXMucGFyc2VTdHJpbmcoYmxvY2spO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgaWYgKCFyZXMpIHtcbiAgICAgICAgdGhpcy5wb3MgKz0gMTtcbiAgICAgICAgYmxvY2suYXBwZW5kQ2hpbGQodGV4dChmcm9tQ29kZVBvaW50KGMpKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vLyBQYXJzZSBzdHJpbmcgY29udGVudCBpbiBibG9jayBpbnRvIGlubGluZSBjaGlsZHJlbixcbi8vIHVzaW5nIHJlZm1hcCB0byByZXNvbHZlIHJlZmVyZW5jZXMuXG52YXIgcGFyc2VJbmxpbmVzID0gZnVuY3Rpb24oYmxvY2spIHtcbiAgICB0aGlzLnN1YmplY3QgPSBibG9jay5fc3RyaW5nX2NvbnRlbnQudHJpbSgpO1xuICAgIHRoaXMucG9zID0gMDtcbiAgICB0aGlzLmRlbGltaXRlcnMgPSBudWxsO1xuICAgIHRoaXMuYnJhY2tldHMgPSBudWxsO1xuICAgIHdoaWxlICh0aGlzLnBhcnNlSW5saW5lKGJsb2NrKSkge1xuICAgIH1cbiAgICBibG9jay5fc3RyaW5nX2NvbnRlbnQgPSBudWxsOyAvLyBhbGxvdyByYXcgc3RyaW5nIHRvIGJlIGdhcmJhZ2UgY29sbGVjdGVkXG4gICAgdGhpcy5wcm9jZXNzRW1waGFzaXMobnVsbCk7XG59O1xuXG4vLyBUaGUgSW5saW5lUGFyc2VyIG9iamVjdC5cbmZ1bmN0aW9uIElubGluZVBhcnNlcihvcHRpb25zKXtcbiAgICByZXR1cm4ge1xuICAgICAgICBzdWJqZWN0OiAnJyxcbiAgICAgICAgZGVsaW1pdGVyczogbnVsbCwgIC8vIHVzZWQgYnkgaGFuZGxlRGVsaW0gbWV0aG9kXG4gICAgICAgIGJyYWNrZXRzOiBudWxsLFxuICAgICAgICBwb3M6IDAsXG4gICAgICAgIHJlZm1hcDoge30sXG4gICAgICAgIG1hdGNoOiBtYXRjaCxcbiAgICAgICAgcGVlazogcGVlayxcbiAgICAgICAgc3BubDogc3BubCxcbiAgICAgICAgcGFyc2VCYWNrdGlja3M6IHBhcnNlQmFja3RpY2tzLFxuICAgICAgICBwYXJzZUJhY2tzbGFzaDogcGFyc2VCYWNrc2xhc2gsXG4gICAgICAgIHBhcnNlQXV0b2xpbms6IHBhcnNlQXV0b2xpbmssXG4gICAgICAgIHBhcnNlSHRtbFRhZzogcGFyc2VIdG1sVGFnLFxuICAgICAgICBzY2FuRGVsaW1zOiBzY2FuRGVsaW1zLFxuICAgICAgICBoYW5kbGVEZWxpbTogaGFuZGxlRGVsaW0sXG4gICAgICAgIHBhcnNlTGlua1RpdGxlOiBwYXJzZUxpbmtUaXRsZSxcbiAgICAgICAgcGFyc2VMaW5rRGVzdGluYXRpb246IHBhcnNlTGlua0Rlc3RpbmF0aW9uLFxuICAgICAgICBwYXJzZUxpbmtMYWJlbDogcGFyc2VMaW5rTGFiZWwsXG4gICAgICAgIHBhcnNlT3BlbkJyYWNrZXQ6IHBhcnNlT3BlbkJyYWNrZXQsXG4gICAgICAgIHBhcnNlQmFuZzogcGFyc2VCYW5nLFxuICAgICAgICBwYXJzZUNsb3NlQnJhY2tldDogcGFyc2VDbG9zZUJyYWNrZXQsXG4gICAgICAgIGFkZEJyYWNrZXQ6IGFkZEJyYWNrZXQsXG4gICAgICAgIHJlbW92ZUJyYWNrZXQ6IHJlbW92ZUJyYWNrZXQsXG4gICAgICAgIHBhcnNlRW50aXR5OiBwYXJzZUVudGl0eSxcbiAgICAgICAgcGFyc2VTdHJpbmc6IHBhcnNlU3RyaW5nLFxuICAgICAgICBwYXJzZU5ld2xpbmU6IHBhcnNlTmV3bGluZSxcbiAgICAgICAgcGFyc2VSZWZlcmVuY2U6IHBhcnNlUmVmZXJlbmNlLFxuICAgICAgICBwYXJzZUlubGluZTogcGFyc2VJbmxpbmUsXG4gICAgICAgIHByb2Nlc3NFbXBoYXNpczogcHJvY2Vzc0VtcGhhc2lzLFxuICAgICAgICByZW1vdmVEZWxpbWl0ZXI6IHJlbW92ZURlbGltaXRlcixcbiAgICAgICAgb3B0aW9uczogb3B0aW9ucyB8fCB7fSxcbiAgICAgICAgcGFyc2U6IHBhcnNlSW5saW5lc1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gSW5saW5lUGFyc2VyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGlzQ29udGFpbmVyKG5vZGUpIHtcbiAgICBzd2l0Y2ggKG5vZGUuX3R5cGUpIHtcbiAgICBjYXNlICdkb2N1bWVudCc6XG4gICAgY2FzZSAnYmxvY2tfcXVvdGUnOlxuICAgIGNhc2UgJ2xpc3QnOlxuICAgIGNhc2UgJ2l0ZW0nOlxuICAgIGNhc2UgJ3BhcmFncmFwaCc6XG4gICAgY2FzZSAnaGVhZGluZyc6XG4gICAgY2FzZSAnZW1waCc6XG4gICAgY2FzZSAnc3Ryb25nJzpcbiAgICBjYXNlICdsaW5rJzpcbiAgICBjYXNlICdpbWFnZSc6XG4gICAgY2FzZSAnY3VzdG9tX2lubGluZSc6XG4gICAgY2FzZSAnY3VzdG9tX2Jsb2NrJzpcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbn1cblxudmFyIHJlc3VtZUF0ID0gZnVuY3Rpb24obm9kZSwgZW50ZXJpbmcpIHtcbiAgICB0aGlzLmN1cnJlbnQgPSBub2RlO1xuICAgIHRoaXMuZW50ZXJpbmcgPSAoZW50ZXJpbmcgPT09IHRydWUpO1xufTtcblxudmFyIG5leHQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBjdXIgPSB0aGlzLmN1cnJlbnQ7XG4gICAgdmFyIGVudGVyaW5nID0gdGhpcy5lbnRlcmluZztcblxuICAgIGlmIChjdXIgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGNvbnRhaW5lciA9IGlzQ29udGFpbmVyKGN1cik7XG5cbiAgICBpZiAoZW50ZXJpbmcgJiYgY29udGFpbmVyKSB7XG4gICAgICAgIGlmIChjdXIuX2ZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IGN1ci5fZmlyc3RDaGlsZDtcbiAgICAgICAgICAgIHRoaXMuZW50ZXJpbmcgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc3RheSBvbiBub2RlIGJ1dCBleGl0XG4gICAgICAgICAgICB0aGlzLmVudGVyaW5nID0gZmFsc2U7XG4gICAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoY3VyID09PSB0aGlzLnJvb3QpIHtcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbnVsbDtcblxuICAgIH0gZWxzZSBpZiAoY3VyLl9uZXh0ID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMuY3VycmVudCA9IGN1ci5fcGFyZW50O1xuICAgICAgICB0aGlzLmVudGVyaW5nID0gZmFsc2U7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmN1cnJlbnQgPSBjdXIuX25leHQ7XG4gICAgICAgIHRoaXMuZW50ZXJpbmcgPSB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB7ZW50ZXJpbmc6IGVudGVyaW5nLCBub2RlOiBjdXJ9O1xufTtcblxudmFyIE5vZGVXYWxrZXIgPSBmdW5jdGlvbihyb290KSB7XG4gICAgcmV0dXJuIHsgY3VycmVudDogcm9vdCxcbiAgICAgICAgICAgICByb290OiByb290LFxuICAgICAgICAgICAgIGVudGVyaW5nOiB0cnVlLFxuICAgICAgICAgICAgIG5leHQ6IG5leHQsXG4gICAgICAgICAgICAgcmVzdW1lQXQ6IHJlc3VtZUF0IH07XG59O1xuXG52YXIgTm9kZSA9IGZ1bmN0aW9uKG5vZGVUeXBlLCBzb3VyY2Vwb3MpIHtcbiAgICB0aGlzLl90eXBlID0gbm9kZVR5cGU7XG4gICAgdGhpcy5fcGFyZW50ID0gbnVsbDtcbiAgICB0aGlzLl9maXJzdENoaWxkID0gbnVsbDtcbiAgICB0aGlzLl9sYXN0Q2hpbGQgPSBudWxsO1xuICAgIHRoaXMuX3ByZXYgPSBudWxsO1xuICAgIHRoaXMuX25leHQgPSBudWxsO1xuICAgIHRoaXMuX3NvdXJjZXBvcyA9IHNvdXJjZXBvcztcbiAgICB0aGlzLl9sYXN0TGluZUJsYW5rID0gZmFsc2U7XG4gICAgdGhpcy5fb3BlbiA9IHRydWU7XG4gICAgdGhpcy5fc3RyaW5nX2NvbnRlbnQgPSBudWxsO1xuICAgIHRoaXMuX2xpdGVyYWwgPSBudWxsO1xuICAgIHRoaXMuX2xpc3REYXRhID0ge307XG4gICAgdGhpcy5faW5mbyA9IG51bGw7XG4gICAgdGhpcy5fZGVzdGluYXRpb24gPSBudWxsO1xuICAgIHRoaXMuX3RpdGxlID0gbnVsbDtcbiAgICB0aGlzLl9pc0ZlbmNlZCA9IGZhbHNlO1xuICAgIHRoaXMuX2ZlbmNlQ2hhciA9IG51bGw7XG4gICAgdGhpcy5fZmVuY2VMZW5ndGggPSAwO1xuICAgIHRoaXMuX2ZlbmNlT2Zmc2V0ID0gbnVsbDtcbiAgICB0aGlzLl9sZXZlbCA9IG51bGw7XG4gICAgdGhpcy5fb25FbnRlciA9IG51bGw7XG4gICAgdGhpcy5fb25FeGl0ID0gbnVsbDtcbn07XG5cbnZhciBwcm90byA9IE5vZGUucHJvdG90eXBlO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdpc0NvbnRhaW5lcicsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGlzQ29udGFpbmVyKHRoaXMpOyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAndHlwZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fdHlwZTsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ2ZpcnN0Q2hpbGQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2ZpcnN0Q2hpbGQ7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdsYXN0Q2hpbGQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2xhc3RDaGlsZDsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ25leHQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX25leHQ7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdwcmV2Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9wcmV2OyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFyZW50Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9wYXJlbnQ7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdzb3VyY2Vwb3MnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX3NvdXJjZXBvczsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ2xpdGVyYWwnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2xpdGVyYWw7IH0sXG4gICAgc2V0OiBmdW5jdGlvbihzKSB7IHRoaXMuX2xpdGVyYWwgPSBzOyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnZGVzdGluYXRpb24nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2Rlc3RpbmF0aW9uOyB9LFxuICAgIHNldDogZnVuY3Rpb24ocykgeyB0aGlzLl9kZXN0aW5hdGlvbiA9IHM7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICd0aXRsZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fdGl0bGU7IH0sXG4gICAgc2V0OiBmdW5jdGlvbihzKSB7IHRoaXMuX3RpdGxlID0gczsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ2luZm8nLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2luZm87IH0sXG4gICAgc2V0OiBmdW5jdGlvbihzKSB7IHRoaXMuX2luZm8gPSBzOyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnbGV2ZWwnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2xldmVsOyB9LFxuICAgIHNldDogZnVuY3Rpb24ocykgeyB0aGlzLl9sZXZlbCA9IHM7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdsaXN0VHlwZScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fbGlzdERhdGEudHlwZTsgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHQpIHsgdGhpcy5fbGlzdERhdGEudHlwZSA9IHQ7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdsaXN0VGlnaHQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2xpc3REYXRhLnRpZ2h0OyB9LFxuICAgIHNldDogZnVuY3Rpb24odCkgeyB0aGlzLl9saXN0RGF0YS50aWdodCA9IHQ7IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdsaXN0U3RhcnQnLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX2xpc3REYXRhLnN0YXJ0OyB9LFxuICAgIHNldDogZnVuY3Rpb24obikgeyB0aGlzLl9saXN0RGF0YS5zdGFydCA9IG47IH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdsaXN0RGVsaW1pdGVyJywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9saXN0RGF0YS5kZWxpbWl0ZXI7IH0sXG4gICAgc2V0OiBmdW5jdGlvbihkZWxpbSkgeyB0aGlzLl9saXN0RGF0YS5kZWxpbWl0ZXIgPSBkZWxpbTsgfVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ29uRW50ZXInLCB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuX29uRW50ZXI7IH0sXG4gICAgc2V0OiBmdW5jdGlvbihzKSB7IHRoaXMuX29uRW50ZXIgPSBzOyB9XG59KTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAnb25FeGl0Jywge1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzLl9vbkV4aXQ7IH0sXG4gICAgc2V0OiBmdW5jdGlvbihzKSB7IHRoaXMuX29uRXhpdCA9IHM7IH1cbn0pO1xuXG5Ob2RlLnByb3RvdHlwZS5hcHBlbmRDaGlsZCA9IGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgY2hpbGQudW5saW5rKCk7XG4gICAgY2hpbGQuX3BhcmVudCA9IHRoaXM7XG4gICAgaWYgKHRoaXMuX2xhc3RDaGlsZCkge1xuICAgICAgICB0aGlzLl9sYXN0Q2hpbGQuX25leHQgPSBjaGlsZDtcbiAgICAgICAgY2hpbGQuX3ByZXYgPSB0aGlzLl9sYXN0Q2hpbGQ7XG4gICAgICAgIHRoaXMuX2xhc3RDaGlsZCA9IGNoaWxkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2ZpcnN0Q2hpbGQgPSBjaGlsZDtcbiAgICAgICAgdGhpcy5fbGFzdENoaWxkID0gY2hpbGQ7XG4gICAgfVxufTtcblxuTm9kZS5wcm90b3R5cGUucHJlcGVuZENoaWxkID0gZnVuY3Rpb24oY2hpbGQpIHtcbiAgICBjaGlsZC51bmxpbmsoKTtcbiAgICBjaGlsZC5fcGFyZW50ID0gdGhpcztcbiAgICBpZiAodGhpcy5fZmlyc3RDaGlsZCkge1xuICAgICAgICB0aGlzLl9maXJzdENoaWxkLl9wcmV2ID0gY2hpbGQ7XG4gICAgICAgIGNoaWxkLl9uZXh0ID0gdGhpcy5fZmlyc3RDaGlsZDtcbiAgICAgICAgdGhpcy5fZmlyc3RDaGlsZCA9IGNoaWxkO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2ZpcnN0Q2hpbGQgPSBjaGlsZDtcbiAgICAgICAgdGhpcy5fbGFzdENoaWxkID0gY2hpbGQ7XG4gICAgfVxufTtcblxuTm9kZS5wcm90b3R5cGUudW5saW5rID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX3ByZXYpIHtcbiAgICAgICAgdGhpcy5fcHJldi5fbmV4dCA9IHRoaXMuX25leHQ7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgICAgdGhpcy5fcGFyZW50Ll9maXJzdENoaWxkID0gdGhpcy5fbmV4dDtcbiAgICB9XG4gICAgaWYgKHRoaXMuX25leHQpIHtcbiAgICAgICAgdGhpcy5fbmV4dC5fcHJldiA9IHRoaXMuX3ByZXY7XG4gICAgfSBlbHNlIGlmICh0aGlzLl9wYXJlbnQpIHtcbiAgICAgICAgdGhpcy5fcGFyZW50Ll9sYXN0Q2hpbGQgPSB0aGlzLl9wcmV2O1xuICAgIH1cbiAgICB0aGlzLl9wYXJlbnQgPSBudWxsO1xuICAgIHRoaXMuX25leHQgPSBudWxsO1xuICAgIHRoaXMuX3ByZXYgPSBudWxsO1xufTtcblxuTm9kZS5wcm90b3R5cGUuaW5zZXJ0QWZ0ZXIgPSBmdW5jdGlvbihzaWJsaW5nKSB7XG4gICAgc2libGluZy51bmxpbmsoKTtcbiAgICBzaWJsaW5nLl9uZXh0ID0gdGhpcy5fbmV4dDtcbiAgICBpZiAoc2libGluZy5fbmV4dCkge1xuICAgICAgICBzaWJsaW5nLl9uZXh0Ll9wcmV2ID0gc2libGluZztcbiAgICB9XG4gICAgc2libGluZy5fcHJldiA9IHRoaXM7XG4gICAgdGhpcy5fbmV4dCA9IHNpYmxpbmc7XG4gICAgc2libGluZy5fcGFyZW50ID0gdGhpcy5fcGFyZW50O1xuICAgIGlmICghc2libGluZy5fbmV4dCkge1xuICAgICAgICBzaWJsaW5nLl9wYXJlbnQuX2xhc3RDaGlsZCA9IHNpYmxpbmc7XG4gICAgfVxufTtcblxuTm9kZS5wcm90b3R5cGUuaW5zZXJ0QmVmb3JlID0gZnVuY3Rpb24oc2libGluZykge1xuICAgIHNpYmxpbmcudW5saW5rKCk7XG4gICAgc2libGluZy5fcHJldiA9IHRoaXMuX3ByZXY7XG4gICAgaWYgKHNpYmxpbmcuX3ByZXYpIHtcbiAgICAgICAgc2libGluZy5fcHJldi5fbmV4dCA9IHNpYmxpbmc7XG4gICAgfVxuICAgIHNpYmxpbmcuX25leHQgPSB0aGlzO1xuICAgIHRoaXMuX3ByZXYgPSBzaWJsaW5nO1xuICAgIHNpYmxpbmcuX3BhcmVudCA9IHRoaXMuX3BhcmVudDtcbiAgICBpZiAoIXNpYmxpbmcuX3ByZXYpIHtcbiAgICAgICAgc2libGluZy5fcGFyZW50Ll9maXJzdENoaWxkID0gc2libGluZztcbiAgICB9XG59O1xuXG5Ob2RlLnByb3RvdHlwZS53YWxrZXIgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgd2Fsa2VyID0gbmV3IE5vZGVXYWxrZXIodGhpcyk7XG4gICAgcmV0dXJuIHdhbGtlcjtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm9kZTtcblxuXG4vKiBFeGFtcGxlIG9mIHVzZSBvZiB3YWxrZXI6XG5cbiB2YXIgd2Fsa2VyID0gdy53YWxrZXIoKTtcbiB2YXIgZXZlbnQ7XG5cbiB3aGlsZSAoZXZlbnQgPSB3YWxrZXIubmV4dCgpKSB7XG4gY29uc29sZS5sb2coZXZlbnQuZW50ZXJpbmcsIGV2ZW50Lm5vZGUudHlwZSk7XG4gfVxuXG4gKi9cbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBUaGUgYnVsayBvZiB0aGlzIGNvZGUgZGVyaXZlcyBmcm9tIGh0dHBzOi8vZ2l0aHViLmNvbS9kbW9zY3JvcC9mb2xkLWNhc2VcbkJ1dCBpbiBhZGRpdGlvbiB0byBjYXNlLWZvbGRpbmcsIHdlIGFsc28gbm9ybWFsaXplIHdoaXRlc3BhY2UuXG5cbmZvbGQtY2FzZSBpcyBDb3B5cmlnaHQgTWF0aGlhcyBCeW5lbnMgPGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS8+XG5cblBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZ1xuYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG5cIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbndpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbmRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0b1xucGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvXG50aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cblRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlXG5pbmNsdWRlZCBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cblxuVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCxcbkVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkRcbk5PTklORlJJTkdFTUVOVC4gSU4gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkVcbkxJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT05cbk9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTlxuV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG4qL1xuXG4vKmVzbGludC1kaXNhYmxlICBrZXktc3BhY2luZywgY29tbWEtc3BhY2luZyAqL1xuXG52YXIgcmVnZXggPSAvWyBcXHRcXHJcXG5dK3xbQS1aXFx4QjVcXHhDMC1cXHhENlxceEQ4LVxceERGXFx1MDEwMFxcdTAxMDJcXHUwMTA0XFx1MDEwNlxcdTAxMDhcXHUwMTBBXFx1MDEwQ1xcdTAxMEVcXHUwMTEwXFx1MDExMlxcdTAxMTRcXHUwMTE2XFx1MDExOFxcdTAxMUFcXHUwMTFDXFx1MDExRVxcdTAxMjBcXHUwMTIyXFx1MDEyNFxcdTAxMjZcXHUwMTI4XFx1MDEyQVxcdTAxMkNcXHUwMTJFXFx1MDEzMFxcdTAxMzJcXHUwMTM0XFx1MDEzNlxcdTAxMzlcXHUwMTNCXFx1MDEzRFxcdTAxM0ZcXHUwMTQxXFx1MDE0M1xcdTAxNDVcXHUwMTQ3XFx1MDE0OVxcdTAxNEFcXHUwMTRDXFx1MDE0RVxcdTAxNTBcXHUwMTUyXFx1MDE1NFxcdTAxNTZcXHUwMTU4XFx1MDE1QVxcdTAxNUNcXHUwMTVFXFx1MDE2MFxcdTAxNjJcXHUwMTY0XFx1MDE2NlxcdTAxNjhcXHUwMTZBXFx1MDE2Q1xcdTAxNkVcXHUwMTcwXFx1MDE3MlxcdTAxNzRcXHUwMTc2XFx1MDE3OFxcdTAxNzlcXHUwMTdCXFx1MDE3RFxcdTAxN0ZcXHUwMTgxXFx1MDE4MlxcdTAxODRcXHUwMTg2XFx1MDE4N1xcdTAxODktXFx1MDE4QlxcdTAxOEUtXFx1MDE5MVxcdTAxOTNcXHUwMTk0XFx1MDE5Ni1cXHUwMTk4XFx1MDE5Q1xcdTAxOURcXHUwMTlGXFx1MDFBMFxcdTAxQTJcXHUwMUE0XFx1MDFBNlxcdTAxQTdcXHUwMUE5XFx1MDFBQ1xcdTAxQUVcXHUwMUFGXFx1MDFCMS1cXHUwMUIzXFx1MDFCNVxcdTAxQjdcXHUwMUI4XFx1MDFCQ1xcdTAxQzRcXHUwMUM1XFx1MDFDN1xcdTAxQzhcXHUwMUNBXFx1MDFDQlxcdTAxQ0RcXHUwMUNGXFx1MDFEMVxcdTAxRDNcXHUwMUQ1XFx1MDFEN1xcdTAxRDlcXHUwMURCXFx1MDFERVxcdTAxRTBcXHUwMUUyXFx1MDFFNFxcdTAxRTZcXHUwMUU4XFx1MDFFQVxcdTAxRUNcXHUwMUVFXFx1MDFGMC1cXHUwMUYyXFx1MDFGNFxcdTAxRjYtXFx1MDFGOFxcdTAxRkFcXHUwMUZDXFx1MDFGRVxcdTAyMDBcXHUwMjAyXFx1MDIwNFxcdTAyMDZcXHUwMjA4XFx1MDIwQVxcdTAyMENcXHUwMjBFXFx1MDIxMFxcdTAyMTJcXHUwMjE0XFx1MDIxNlxcdTAyMThcXHUwMjFBXFx1MDIxQ1xcdTAyMUVcXHUwMjIwXFx1MDIyMlxcdTAyMjRcXHUwMjI2XFx1MDIyOFxcdTAyMkFcXHUwMjJDXFx1MDIyRVxcdTAyMzBcXHUwMjMyXFx1MDIzQVxcdTAyM0JcXHUwMjNEXFx1MDIzRVxcdTAyNDFcXHUwMjQzLVxcdTAyNDZcXHUwMjQ4XFx1MDI0QVxcdTAyNENcXHUwMjRFXFx1MDM0NVxcdTAzNzBcXHUwMzcyXFx1MDM3NlxcdTAzN0ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhBXFx1MDM4Q1xcdTAzOEUtXFx1MDNBMVxcdTAzQTMtXFx1MDNBQlxcdTAzQjBcXHUwM0MyXFx1MDNDRi1cXHUwM0QxXFx1MDNENVxcdTAzRDZcXHUwM0Q4XFx1MDNEQVxcdTAzRENcXHUwM0RFXFx1MDNFMFxcdTAzRTJcXHUwM0U0XFx1MDNFNlxcdTAzRThcXHUwM0VBXFx1MDNFQ1xcdTAzRUVcXHUwM0YwXFx1MDNGMVxcdTAzRjRcXHUwM0Y1XFx1MDNGN1xcdTAzRjlcXHUwM0ZBXFx1MDNGRC1cXHUwNDJGXFx1MDQ2MFxcdTA0NjJcXHUwNDY0XFx1MDQ2NlxcdTA0NjhcXHUwNDZBXFx1MDQ2Q1xcdTA0NkVcXHUwNDcwXFx1MDQ3MlxcdTA0NzRcXHUwNDc2XFx1MDQ3OFxcdTA0N0FcXHUwNDdDXFx1MDQ3RVxcdTA0ODBcXHUwNDhBXFx1MDQ4Q1xcdTA0OEVcXHUwNDkwXFx1MDQ5MlxcdTA0OTRcXHUwNDk2XFx1MDQ5OFxcdTA0OUFcXHUwNDlDXFx1MDQ5RVxcdTA0QTBcXHUwNEEyXFx1MDRBNFxcdTA0QTZcXHUwNEE4XFx1MDRBQVxcdTA0QUNcXHUwNEFFXFx1MDRCMFxcdTA0QjJcXHUwNEI0XFx1MDRCNlxcdTA0QjhcXHUwNEJBXFx1MDRCQ1xcdTA0QkVcXHUwNEMwXFx1MDRDMVxcdTA0QzNcXHUwNEM1XFx1MDRDN1xcdTA0QzlcXHUwNENCXFx1MDRDRFxcdTA0RDBcXHUwNEQyXFx1MDRENFxcdTA0RDZcXHUwNEQ4XFx1MDREQVxcdTA0RENcXHUwNERFXFx1MDRFMFxcdTA0RTJcXHUwNEU0XFx1MDRFNlxcdTA0RThcXHUwNEVBXFx1MDRFQ1xcdTA0RUVcXHUwNEYwXFx1MDRGMlxcdTA0RjRcXHUwNEY2XFx1MDRGOFxcdTA0RkFcXHUwNEZDXFx1MDRGRVxcdTA1MDBcXHUwNTAyXFx1MDUwNFxcdTA1MDZcXHUwNTA4XFx1MDUwQVxcdTA1MENcXHUwNTBFXFx1MDUxMFxcdTA1MTJcXHUwNTE0XFx1MDUxNlxcdTA1MThcXHUwNTFBXFx1MDUxQ1xcdTA1MUVcXHUwNTIwXFx1MDUyMlxcdTA1MjRcXHUwNTI2XFx1MDUyOFxcdTA1MkFcXHUwNTJDXFx1MDUyRVxcdTA1MzEtXFx1MDU1NlxcdTA1ODdcXHUxMEEwLVxcdTEwQzVcXHUxMEM3XFx1MTBDRFxcdTFFMDBcXHUxRTAyXFx1MUUwNFxcdTFFMDZcXHUxRTA4XFx1MUUwQVxcdTFFMENcXHUxRTBFXFx1MUUxMFxcdTFFMTJcXHUxRTE0XFx1MUUxNlxcdTFFMThcXHUxRTFBXFx1MUUxQ1xcdTFFMUVcXHUxRTIwXFx1MUUyMlxcdTFFMjRcXHUxRTI2XFx1MUUyOFxcdTFFMkFcXHUxRTJDXFx1MUUyRVxcdTFFMzBcXHUxRTMyXFx1MUUzNFxcdTFFMzZcXHUxRTM4XFx1MUUzQVxcdTFFM0NcXHUxRTNFXFx1MUU0MFxcdTFFNDJcXHUxRTQ0XFx1MUU0NlxcdTFFNDhcXHUxRTRBXFx1MUU0Q1xcdTFFNEVcXHUxRTUwXFx1MUU1MlxcdTFFNTRcXHUxRTU2XFx1MUU1OFxcdTFFNUFcXHUxRTVDXFx1MUU1RVxcdTFFNjBcXHUxRTYyXFx1MUU2NFxcdTFFNjZcXHUxRTY4XFx1MUU2QVxcdTFFNkNcXHUxRTZFXFx1MUU3MFxcdTFFNzJcXHUxRTc0XFx1MUU3NlxcdTFFNzhcXHUxRTdBXFx1MUU3Q1xcdTFFN0VcXHUxRTgwXFx1MUU4MlxcdTFFODRcXHUxRTg2XFx1MUU4OFxcdTFFOEFcXHUxRThDXFx1MUU4RVxcdTFFOTBcXHUxRTkyXFx1MUU5NFxcdTFFOTYtXFx1MUU5QlxcdTFFOUVcXHUxRUEwXFx1MUVBMlxcdTFFQTRcXHUxRUE2XFx1MUVBOFxcdTFFQUFcXHUxRUFDXFx1MUVBRVxcdTFFQjBcXHUxRUIyXFx1MUVCNFxcdTFFQjZcXHUxRUI4XFx1MUVCQVxcdTFFQkNcXHUxRUJFXFx1MUVDMFxcdTFFQzJcXHUxRUM0XFx1MUVDNlxcdTFFQzhcXHUxRUNBXFx1MUVDQ1xcdTFFQ0VcXHUxRUQwXFx1MUVEMlxcdTFFRDRcXHUxRUQ2XFx1MUVEOFxcdTFFREFcXHUxRURDXFx1MUVERVxcdTFFRTBcXHUxRUUyXFx1MUVFNFxcdTFFRTZcXHUxRUU4XFx1MUVFQVxcdTFFRUNcXHUxRUVFXFx1MUVGMFxcdTFFRjJcXHUxRUY0XFx1MUVGNlxcdTFFRjhcXHUxRUZBXFx1MUVGQ1xcdTFFRkVcXHUxRjA4LVxcdTFGMEZcXHUxRjE4LVxcdTFGMURcXHUxRjI4LVxcdTFGMkZcXHUxRjM4LVxcdTFGM0ZcXHUxRjQ4LVxcdTFGNERcXHUxRjUwXFx1MUY1MlxcdTFGNTRcXHUxRjU2XFx1MUY1OVxcdTFGNUJcXHUxRjVEXFx1MUY1RlxcdTFGNjgtXFx1MUY2RlxcdTFGODAtXFx1MUZBRlxcdTFGQjItXFx1MUZCNFxcdTFGQjYtXFx1MUZCQ1xcdTFGQkVcXHUxRkMyLVxcdTFGQzRcXHUxRkM2LVxcdTFGQ0NcXHUxRkQyXFx1MUZEM1xcdTFGRDYtXFx1MUZEQlxcdTFGRTItXFx1MUZFNFxcdTFGRTYtXFx1MUZFQ1xcdTFGRjItXFx1MUZGNFxcdTFGRjYtXFx1MUZGQ1xcdTIxMjZcXHUyMTJBXFx1MjEyQlxcdTIxMzJcXHUyMTYwLVxcdTIxNkZcXHUyMTgzXFx1MjRCNi1cXHUyNENGXFx1MkMwMC1cXHUyQzJFXFx1MkM2MFxcdTJDNjItXFx1MkM2NFxcdTJDNjdcXHUyQzY5XFx1MkM2QlxcdTJDNkQtXFx1MkM3MFxcdTJDNzJcXHUyQzc1XFx1MkM3RS1cXHUyQzgwXFx1MkM4MlxcdTJDODRcXHUyQzg2XFx1MkM4OFxcdTJDOEFcXHUyQzhDXFx1MkM4RVxcdTJDOTBcXHUyQzkyXFx1MkM5NFxcdTJDOTZcXHUyQzk4XFx1MkM5QVxcdTJDOUNcXHUyQzlFXFx1MkNBMFxcdTJDQTJcXHUyQ0E0XFx1MkNBNlxcdTJDQThcXHUyQ0FBXFx1MkNBQ1xcdTJDQUVcXHUyQ0IwXFx1MkNCMlxcdTJDQjRcXHUyQ0I2XFx1MkNCOFxcdTJDQkFcXHUyQ0JDXFx1MkNCRVxcdTJDQzBcXHUyQ0MyXFx1MkNDNFxcdTJDQzZcXHUyQ0M4XFx1MkNDQVxcdTJDQ0NcXHUyQ0NFXFx1MkNEMFxcdTJDRDJcXHUyQ0Q0XFx1MkNENlxcdTJDRDhcXHUyQ0RBXFx1MkNEQ1xcdTJDREVcXHUyQ0UwXFx1MkNFMlxcdTJDRUJcXHUyQ0VEXFx1MkNGMlxcdUE2NDBcXHVBNjQyXFx1QTY0NFxcdUE2NDZcXHVBNjQ4XFx1QTY0QVxcdUE2NENcXHVBNjRFXFx1QTY1MFxcdUE2NTJcXHVBNjU0XFx1QTY1NlxcdUE2NThcXHVBNjVBXFx1QTY1Q1xcdUE2NUVcXHVBNjYwXFx1QTY2MlxcdUE2NjRcXHVBNjY2XFx1QTY2OFxcdUE2NkFcXHVBNjZDXFx1QTY4MFxcdUE2ODJcXHVBNjg0XFx1QTY4NlxcdUE2ODhcXHVBNjhBXFx1QTY4Q1xcdUE2OEVcXHVBNjkwXFx1QTY5MlxcdUE2OTRcXHVBNjk2XFx1QTY5OFxcdUE2OUFcXHVBNzIyXFx1QTcyNFxcdUE3MjZcXHVBNzI4XFx1QTcyQVxcdUE3MkNcXHVBNzJFXFx1QTczMlxcdUE3MzRcXHVBNzM2XFx1QTczOFxcdUE3M0FcXHVBNzNDXFx1QTczRVxcdUE3NDBcXHVBNzQyXFx1QTc0NFxcdUE3NDZcXHVBNzQ4XFx1QTc0QVxcdUE3NENcXHVBNzRFXFx1QTc1MFxcdUE3NTJcXHVBNzU0XFx1QTc1NlxcdUE3NThcXHVBNzVBXFx1QTc1Q1xcdUE3NUVcXHVBNzYwXFx1QTc2MlxcdUE3NjRcXHVBNzY2XFx1QTc2OFxcdUE3NkFcXHVBNzZDXFx1QTc2RVxcdUE3NzlcXHVBNzdCXFx1QTc3RFxcdUE3N0VcXHVBNzgwXFx1QTc4MlxcdUE3ODRcXHVBNzg2XFx1QTc4QlxcdUE3OERcXHVBNzkwXFx1QTc5MlxcdUE3OTZcXHVBNzk4XFx1QTc5QVxcdUE3OUNcXHVBNzlFXFx1QTdBMFxcdUE3QTJcXHVBN0E0XFx1QTdBNlxcdUE3QThcXHVBN0FBLVxcdUE3QURcXHVBN0IwXFx1QTdCMVxcdUZCMDAtXFx1RkIwNlxcdUZCMTMtXFx1RkIxN1xcdUZGMjEtXFx1RkYzQV18XFx1RDgwMVtcXHVEQzAwLVxcdURDMjddfFxcdUQ4MDZbXFx1RENBMC1cXHVEQ0JGXS9nO1xuXG52YXIgbWFwID0geydBJzonYScsJ0InOidiJywnQyc6J2MnLCdEJzonZCcsJ0UnOidlJywnRic6J2YnLCdHJzonZycsJ0gnOidoJywnSSc6J2knLCdKJzonaicsJ0snOidrJywnTCc6J2wnLCdNJzonbScsJ04nOiduJywnTyc6J28nLCdQJzoncCcsJ1EnOidxJywnUic6J3InLCdTJzoncycsJ1QnOid0JywnVSc6J3UnLCdWJzondicsJ1cnOid3JywnWCc6J3gnLCdZJzoneScsJ1onOid6JywnXFx4QjUnOidcXHUwM0JDJywnXFx4QzAnOidcXHhFMCcsJ1xceEMxJzonXFx4RTEnLCdcXHhDMic6J1xceEUyJywnXFx4QzMnOidcXHhFMycsJ1xceEM0JzonXFx4RTQnLCdcXHhDNSc6J1xceEU1JywnXFx4QzYnOidcXHhFNicsJ1xceEM3JzonXFx4RTcnLCdcXHhDOCc6J1xceEU4JywnXFx4QzknOidcXHhFOScsJ1xceENBJzonXFx4RUEnLCdcXHhDQic6J1xceEVCJywnXFx4Q0MnOidcXHhFQycsJ1xceENEJzonXFx4RUQnLCdcXHhDRSc6J1xceEVFJywnXFx4Q0YnOidcXHhFRicsJ1xceEQwJzonXFx4RjAnLCdcXHhEMSc6J1xceEYxJywnXFx4RDInOidcXHhGMicsJ1xceEQzJzonXFx4RjMnLCdcXHhENCc6J1xceEY0JywnXFx4RDUnOidcXHhGNScsJ1xceEQ2JzonXFx4RjYnLCdcXHhEOCc6J1xceEY4JywnXFx4RDknOidcXHhGOScsJ1xceERBJzonXFx4RkEnLCdcXHhEQic6J1xceEZCJywnXFx4REMnOidcXHhGQycsJ1xceEREJzonXFx4RkQnLCdcXHhERSc6J1xceEZFJywnXFx1MDEwMCc6J1xcdTAxMDEnLCdcXHUwMTAyJzonXFx1MDEwMycsJ1xcdTAxMDQnOidcXHUwMTA1JywnXFx1MDEwNic6J1xcdTAxMDcnLCdcXHUwMTA4JzonXFx1MDEwOScsJ1xcdTAxMEEnOidcXHUwMTBCJywnXFx1MDEwQyc6J1xcdTAxMEQnLCdcXHUwMTBFJzonXFx1MDEwRicsJ1xcdTAxMTAnOidcXHUwMTExJywnXFx1MDExMic6J1xcdTAxMTMnLCdcXHUwMTE0JzonXFx1MDExNScsJ1xcdTAxMTYnOidcXHUwMTE3JywnXFx1MDExOCc6J1xcdTAxMTknLCdcXHUwMTFBJzonXFx1MDExQicsJ1xcdTAxMUMnOidcXHUwMTFEJywnXFx1MDExRSc6J1xcdTAxMUYnLCdcXHUwMTIwJzonXFx1MDEyMScsJ1xcdTAxMjInOidcXHUwMTIzJywnXFx1MDEyNCc6J1xcdTAxMjUnLCdcXHUwMTI2JzonXFx1MDEyNycsJ1xcdTAxMjgnOidcXHUwMTI5JywnXFx1MDEyQSc6J1xcdTAxMkInLCdcXHUwMTJDJzonXFx1MDEyRCcsJ1xcdTAxMkUnOidcXHUwMTJGJywnXFx1MDEzMic6J1xcdTAxMzMnLCdcXHUwMTM0JzonXFx1MDEzNScsJ1xcdTAxMzYnOidcXHUwMTM3JywnXFx1MDEzOSc6J1xcdTAxM0EnLCdcXHUwMTNCJzonXFx1MDEzQycsJ1xcdTAxM0QnOidcXHUwMTNFJywnXFx1MDEzRic6J1xcdTAxNDAnLCdcXHUwMTQxJzonXFx1MDE0MicsJ1xcdTAxNDMnOidcXHUwMTQ0JywnXFx1MDE0NSc6J1xcdTAxNDYnLCdcXHUwMTQ3JzonXFx1MDE0OCcsJ1xcdTAxNEEnOidcXHUwMTRCJywnXFx1MDE0Qyc6J1xcdTAxNEQnLCdcXHUwMTRFJzonXFx1MDE0RicsJ1xcdTAxNTAnOidcXHUwMTUxJywnXFx1MDE1Mic6J1xcdTAxNTMnLCdcXHUwMTU0JzonXFx1MDE1NScsJ1xcdTAxNTYnOidcXHUwMTU3JywnXFx1MDE1OCc6J1xcdTAxNTknLCdcXHUwMTVBJzonXFx1MDE1QicsJ1xcdTAxNUMnOidcXHUwMTVEJywnXFx1MDE1RSc6J1xcdTAxNUYnLCdcXHUwMTYwJzonXFx1MDE2MScsJ1xcdTAxNjInOidcXHUwMTYzJywnXFx1MDE2NCc6J1xcdTAxNjUnLCdcXHUwMTY2JzonXFx1MDE2NycsJ1xcdTAxNjgnOidcXHUwMTY5JywnXFx1MDE2QSc6J1xcdTAxNkInLCdcXHUwMTZDJzonXFx1MDE2RCcsJ1xcdTAxNkUnOidcXHUwMTZGJywnXFx1MDE3MCc6J1xcdTAxNzEnLCdcXHUwMTcyJzonXFx1MDE3MycsJ1xcdTAxNzQnOidcXHUwMTc1JywnXFx1MDE3Nic6J1xcdTAxNzcnLCdcXHUwMTc4JzonXFx4RkYnLCdcXHUwMTc5JzonXFx1MDE3QScsJ1xcdTAxN0InOidcXHUwMTdDJywnXFx1MDE3RCc6J1xcdTAxN0UnLCdcXHUwMTdGJzoncycsJ1xcdTAxODEnOidcXHUwMjUzJywnXFx1MDE4Mic6J1xcdTAxODMnLCdcXHUwMTg0JzonXFx1MDE4NScsJ1xcdTAxODYnOidcXHUwMjU0JywnXFx1MDE4Nyc6J1xcdTAxODgnLCdcXHUwMTg5JzonXFx1MDI1NicsJ1xcdTAxOEEnOidcXHUwMjU3JywnXFx1MDE4Qic6J1xcdTAxOEMnLCdcXHUwMThFJzonXFx1MDFERCcsJ1xcdTAxOEYnOidcXHUwMjU5JywnXFx1MDE5MCc6J1xcdTAyNUInLCdcXHUwMTkxJzonXFx1MDE5MicsJ1xcdTAxOTMnOidcXHUwMjYwJywnXFx1MDE5NCc6J1xcdTAyNjMnLCdcXHUwMTk2JzonXFx1MDI2OScsJ1xcdTAxOTcnOidcXHUwMjY4JywnXFx1MDE5OCc6J1xcdTAxOTknLCdcXHUwMTlDJzonXFx1MDI2RicsJ1xcdTAxOUQnOidcXHUwMjcyJywnXFx1MDE5Ric6J1xcdTAyNzUnLCdcXHUwMUEwJzonXFx1MDFBMScsJ1xcdTAxQTInOidcXHUwMUEzJywnXFx1MDFBNCc6J1xcdTAxQTUnLCdcXHUwMUE2JzonXFx1MDI4MCcsJ1xcdTAxQTcnOidcXHUwMUE4JywnXFx1MDFBOSc6J1xcdTAyODMnLCdcXHUwMUFDJzonXFx1MDFBRCcsJ1xcdTAxQUUnOidcXHUwMjg4JywnXFx1MDFBRic6J1xcdTAxQjAnLCdcXHUwMUIxJzonXFx1MDI4QScsJ1xcdTAxQjInOidcXHUwMjhCJywnXFx1MDFCMyc6J1xcdTAxQjQnLCdcXHUwMUI1JzonXFx1MDFCNicsJ1xcdTAxQjcnOidcXHUwMjkyJywnXFx1MDFCOCc6J1xcdTAxQjknLCdcXHUwMUJDJzonXFx1MDFCRCcsJ1xcdTAxQzQnOidcXHUwMUM2JywnXFx1MDFDNSc6J1xcdTAxQzYnLCdcXHUwMUM3JzonXFx1MDFDOScsJ1xcdTAxQzgnOidcXHUwMUM5JywnXFx1MDFDQSc6J1xcdTAxQ0MnLCdcXHUwMUNCJzonXFx1MDFDQycsJ1xcdTAxQ0QnOidcXHUwMUNFJywnXFx1MDFDRic6J1xcdTAxRDAnLCdcXHUwMUQxJzonXFx1MDFEMicsJ1xcdTAxRDMnOidcXHUwMUQ0JywnXFx1MDFENSc6J1xcdTAxRDYnLCdcXHUwMUQ3JzonXFx1MDFEOCcsJ1xcdTAxRDknOidcXHUwMURBJywnXFx1MDFEQic6J1xcdTAxREMnLCdcXHUwMURFJzonXFx1MDFERicsJ1xcdTAxRTAnOidcXHUwMUUxJywnXFx1MDFFMic6J1xcdTAxRTMnLCdcXHUwMUU0JzonXFx1MDFFNScsJ1xcdTAxRTYnOidcXHUwMUU3JywnXFx1MDFFOCc6J1xcdTAxRTknLCdcXHUwMUVBJzonXFx1MDFFQicsJ1xcdTAxRUMnOidcXHUwMUVEJywnXFx1MDFFRSc6J1xcdTAxRUYnLCdcXHUwMUYxJzonXFx1MDFGMycsJ1xcdTAxRjInOidcXHUwMUYzJywnXFx1MDFGNCc6J1xcdTAxRjUnLCdcXHUwMUY2JzonXFx1MDE5NScsJ1xcdTAxRjcnOidcXHUwMUJGJywnXFx1MDFGOCc6J1xcdTAxRjknLCdcXHUwMUZBJzonXFx1MDFGQicsJ1xcdTAxRkMnOidcXHUwMUZEJywnXFx1MDFGRSc6J1xcdTAxRkYnLCdcXHUwMjAwJzonXFx1MDIwMScsJ1xcdTAyMDInOidcXHUwMjAzJywnXFx1MDIwNCc6J1xcdTAyMDUnLCdcXHUwMjA2JzonXFx1MDIwNycsJ1xcdTAyMDgnOidcXHUwMjA5JywnXFx1MDIwQSc6J1xcdTAyMEInLCdcXHUwMjBDJzonXFx1MDIwRCcsJ1xcdTAyMEUnOidcXHUwMjBGJywnXFx1MDIxMCc6J1xcdTAyMTEnLCdcXHUwMjEyJzonXFx1MDIxMycsJ1xcdTAyMTQnOidcXHUwMjE1JywnXFx1MDIxNic6J1xcdTAyMTcnLCdcXHUwMjE4JzonXFx1MDIxOScsJ1xcdTAyMUEnOidcXHUwMjFCJywnXFx1MDIxQyc6J1xcdTAyMUQnLCdcXHUwMjFFJzonXFx1MDIxRicsJ1xcdTAyMjAnOidcXHUwMTlFJywnXFx1MDIyMic6J1xcdTAyMjMnLCdcXHUwMjI0JzonXFx1MDIyNScsJ1xcdTAyMjYnOidcXHUwMjI3JywnXFx1MDIyOCc6J1xcdTAyMjknLCdcXHUwMjJBJzonXFx1MDIyQicsJ1xcdTAyMkMnOidcXHUwMjJEJywnXFx1MDIyRSc6J1xcdTAyMkYnLCdcXHUwMjMwJzonXFx1MDIzMScsJ1xcdTAyMzInOidcXHUwMjMzJywnXFx1MDIzQSc6J1xcdTJDNjUnLCdcXHUwMjNCJzonXFx1MDIzQycsJ1xcdTAyM0QnOidcXHUwMTlBJywnXFx1MDIzRSc6J1xcdTJDNjYnLCdcXHUwMjQxJzonXFx1MDI0MicsJ1xcdTAyNDMnOidcXHUwMTgwJywnXFx1MDI0NCc6J1xcdTAyODknLCdcXHUwMjQ1JzonXFx1MDI4QycsJ1xcdTAyNDYnOidcXHUwMjQ3JywnXFx1MDI0OCc6J1xcdTAyNDknLCdcXHUwMjRBJzonXFx1MDI0QicsJ1xcdTAyNEMnOidcXHUwMjREJywnXFx1MDI0RSc6J1xcdTAyNEYnLCdcXHUwMzQ1JzonXFx1MDNCOScsJ1xcdTAzNzAnOidcXHUwMzcxJywnXFx1MDM3Mic6J1xcdTAzNzMnLCdcXHUwMzc2JzonXFx1MDM3NycsJ1xcdTAzN0YnOidcXHUwM0YzJywnXFx1MDM4Nic6J1xcdTAzQUMnLCdcXHUwMzg4JzonXFx1MDNBRCcsJ1xcdTAzODknOidcXHUwM0FFJywnXFx1MDM4QSc6J1xcdTAzQUYnLCdcXHUwMzhDJzonXFx1MDNDQycsJ1xcdTAzOEUnOidcXHUwM0NEJywnXFx1MDM4Ric6J1xcdTAzQ0UnLCdcXHUwMzkxJzonXFx1MDNCMScsJ1xcdTAzOTInOidcXHUwM0IyJywnXFx1MDM5Myc6J1xcdTAzQjMnLCdcXHUwMzk0JzonXFx1MDNCNCcsJ1xcdTAzOTUnOidcXHUwM0I1JywnXFx1MDM5Nic6J1xcdTAzQjYnLCdcXHUwMzk3JzonXFx1MDNCNycsJ1xcdTAzOTgnOidcXHUwM0I4JywnXFx1MDM5OSc6J1xcdTAzQjknLCdcXHUwMzlBJzonXFx1MDNCQScsJ1xcdTAzOUInOidcXHUwM0JCJywnXFx1MDM5Qyc6J1xcdTAzQkMnLCdcXHUwMzlEJzonXFx1MDNCRCcsJ1xcdTAzOUUnOidcXHUwM0JFJywnXFx1MDM5Ric6J1xcdTAzQkYnLCdcXHUwM0EwJzonXFx1MDNDMCcsJ1xcdTAzQTEnOidcXHUwM0MxJywnXFx1MDNBMyc6J1xcdTAzQzMnLCdcXHUwM0E0JzonXFx1MDNDNCcsJ1xcdTAzQTUnOidcXHUwM0M1JywnXFx1MDNBNic6J1xcdTAzQzYnLCdcXHUwM0E3JzonXFx1MDNDNycsJ1xcdTAzQTgnOidcXHUwM0M4JywnXFx1MDNBOSc6J1xcdTAzQzknLCdcXHUwM0FBJzonXFx1MDNDQScsJ1xcdTAzQUInOidcXHUwM0NCJywnXFx1MDNDMic6J1xcdTAzQzMnLCdcXHUwM0NGJzonXFx1MDNENycsJ1xcdTAzRDAnOidcXHUwM0IyJywnXFx1MDNEMSc6J1xcdTAzQjgnLCdcXHUwM0Q1JzonXFx1MDNDNicsJ1xcdTAzRDYnOidcXHUwM0MwJywnXFx1MDNEOCc6J1xcdTAzRDknLCdcXHUwM0RBJzonXFx1MDNEQicsJ1xcdTAzREMnOidcXHUwM0REJywnXFx1MDNERSc6J1xcdTAzREYnLCdcXHUwM0UwJzonXFx1MDNFMScsJ1xcdTAzRTInOidcXHUwM0UzJywnXFx1MDNFNCc6J1xcdTAzRTUnLCdcXHUwM0U2JzonXFx1MDNFNycsJ1xcdTAzRTgnOidcXHUwM0U5JywnXFx1MDNFQSc6J1xcdTAzRUInLCdcXHUwM0VDJzonXFx1MDNFRCcsJ1xcdTAzRUUnOidcXHUwM0VGJywnXFx1MDNGMCc6J1xcdTAzQkEnLCdcXHUwM0YxJzonXFx1MDNDMScsJ1xcdTAzRjQnOidcXHUwM0I4JywnXFx1MDNGNSc6J1xcdTAzQjUnLCdcXHUwM0Y3JzonXFx1MDNGOCcsJ1xcdTAzRjknOidcXHUwM0YyJywnXFx1MDNGQSc6J1xcdTAzRkInLCdcXHUwM0ZEJzonXFx1MDM3QicsJ1xcdTAzRkUnOidcXHUwMzdDJywnXFx1MDNGRic6J1xcdTAzN0QnLCdcXHUwNDAwJzonXFx1MDQ1MCcsJ1xcdTA0MDEnOidcXHUwNDUxJywnXFx1MDQwMic6J1xcdTA0NTInLCdcXHUwNDAzJzonXFx1MDQ1MycsJ1xcdTA0MDQnOidcXHUwNDU0JywnXFx1MDQwNSc6J1xcdTA0NTUnLCdcXHUwNDA2JzonXFx1MDQ1NicsJ1xcdTA0MDcnOidcXHUwNDU3JywnXFx1MDQwOCc6J1xcdTA0NTgnLCdcXHUwNDA5JzonXFx1MDQ1OScsJ1xcdTA0MEEnOidcXHUwNDVBJywnXFx1MDQwQic6J1xcdTA0NUInLCdcXHUwNDBDJzonXFx1MDQ1QycsJ1xcdTA0MEQnOidcXHUwNDVEJywnXFx1MDQwRSc6J1xcdTA0NUUnLCdcXHUwNDBGJzonXFx1MDQ1RicsJ1xcdTA0MTAnOidcXHUwNDMwJywnXFx1MDQxMSc6J1xcdTA0MzEnLCdcXHUwNDEyJzonXFx1MDQzMicsJ1xcdTA0MTMnOidcXHUwNDMzJywnXFx1MDQxNCc6J1xcdTA0MzQnLCdcXHUwNDE1JzonXFx1MDQzNScsJ1xcdTA0MTYnOidcXHUwNDM2JywnXFx1MDQxNyc6J1xcdTA0MzcnLCdcXHUwNDE4JzonXFx1MDQzOCcsJ1xcdTA0MTknOidcXHUwNDM5JywnXFx1MDQxQSc6J1xcdTA0M0EnLCdcXHUwNDFCJzonXFx1MDQzQicsJ1xcdTA0MUMnOidcXHUwNDNDJywnXFx1MDQxRCc6J1xcdTA0M0QnLCdcXHUwNDFFJzonXFx1MDQzRScsJ1xcdTA0MUYnOidcXHUwNDNGJywnXFx1MDQyMCc6J1xcdTA0NDAnLCdcXHUwNDIxJzonXFx1MDQ0MScsJ1xcdTA0MjInOidcXHUwNDQyJywnXFx1MDQyMyc6J1xcdTA0NDMnLCdcXHUwNDI0JzonXFx1MDQ0NCcsJ1xcdTA0MjUnOidcXHUwNDQ1JywnXFx1MDQyNic6J1xcdTA0NDYnLCdcXHUwNDI3JzonXFx1MDQ0NycsJ1xcdTA0MjgnOidcXHUwNDQ4JywnXFx1MDQyOSc6J1xcdTA0NDknLCdcXHUwNDJBJzonXFx1MDQ0QScsJ1xcdTA0MkInOidcXHUwNDRCJywnXFx1MDQyQyc6J1xcdTA0NEMnLCdcXHUwNDJEJzonXFx1MDQ0RCcsJ1xcdTA0MkUnOidcXHUwNDRFJywnXFx1MDQyRic6J1xcdTA0NEYnLCdcXHUwNDYwJzonXFx1MDQ2MScsJ1xcdTA0NjInOidcXHUwNDYzJywnXFx1MDQ2NCc6J1xcdTA0NjUnLCdcXHUwNDY2JzonXFx1MDQ2NycsJ1xcdTA0NjgnOidcXHUwNDY5JywnXFx1MDQ2QSc6J1xcdTA0NkInLCdcXHUwNDZDJzonXFx1MDQ2RCcsJ1xcdTA0NkUnOidcXHUwNDZGJywnXFx1MDQ3MCc6J1xcdTA0NzEnLCdcXHUwNDcyJzonXFx1MDQ3MycsJ1xcdTA0NzQnOidcXHUwNDc1JywnXFx1MDQ3Nic6J1xcdTA0NzcnLCdcXHUwNDc4JzonXFx1MDQ3OScsJ1xcdTA0N0EnOidcXHUwNDdCJywnXFx1MDQ3Qyc6J1xcdTA0N0QnLCdcXHUwNDdFJzonXFx1MDQ3RicsJ1xcdTA0ODAnOidcXHUwNDgxJywnXFx1MDQ4QSc6J1xcdTA0OEInLCdcXHUwNDhDJzonXFx1MDQ4RCcsJ1xcdTA0OEUnOidcXHUwNDhGJywnXFx1MDQ5MCc6J1xcdTA0OTEnLCdcXHUwNDkyJzonXFx1MDQ5MycsJ1xcdTA0OTQnOidcXHUwNDk1JywnXFx1MDQ5Nic6J1xcdTA0OTcnLCdcXHUwNDk4JzonXFx1MDQ5OScsJ1xcdTA0OUEnOidcXHUwNDlCJywnXFx1MDQ5Qyc6J1xcdTA0OUQnLCdcXHUwNDlFJzonXFx1MDQ5RicsJ1xcdTA0QTAnOidcXHUwNEExJywnXFx1MDRBMic6J1xcdTA0QTMnLCdcXHUwNEE0JzonXFx1MDRBNScsJ1xcdTA0QTYnOidcXHUwNEE3JywnXFx1MDRBOCc6J1xcdTA0QTknLCdcXHUwNEFBJzonXFx1MDRBQicsJ1xcdTA0QUMnOidcXHUwNEFEJywnXFx1MDRBRSc6J1xcdTA0QUYnLCdcXHUwNEIwJzonXFx1MDRCMScsJ1xcdTA0QjInOidcXHUwNEIzJywnXFx1MDRCNCc6J1xcdTA0QjUnLCdcXHUwNEI2JzonXFx1MDRCNycsJ1xcdTA0QjgnOidcXHUwNEI5JywnXFx1MDRCQSc6J1xcdTA0QkInLCdcXHUwNEJDJzonXFx1MDRCRCcsJ1xcdTA0QkUnOidcXHUwNEJGJywnXFx1MDRDMCc6J1xcdTA0Q0YnLCdcXHUwNEMxJzonXFx1MDRDMicsJ1xcdTA0QzMnOidcXHUwNEM0JywnXFx1MDRDNSc6J1xcdTA0QzYnLCdcXHUwNEM3JzonXFx1MDRDOCcsJ1xcdTA0QzknOidcXHUwNENBJywnXFx1MDRDQic6J1xcdTA0Q0MnLCdcXHUwNENEJzonXFx1MDRDRScsJ1xcdTA0RDAnOidcXHUwNEQxJywnXFx1MDREMic6J1xcdTA0RDMnLCdcXHUwNEQ0JzonXFx1MDRENScsJ1xcdTA0RDYnOidcXHUwNEQ3JywnXFx1MDREOCc6J1xcdTA0RDknLCdcXHUwNERBJzonXFx1MDREQicsJ1xcdTA0REMnOidcXHUwNEREJywnXFx1MDRERSc6J1xcdTA0REYnLCdcXHUwNEUwJzonXFx1MDRFMScsJ1xcdTA0RTInOidcXHUwNEUzJywnXFx1MDRFNCc6J1xcdTA0RTUnLCdcXHUwNEU2JzonXFx1MDRFNycsJ1xcdTA0RTgnOidcXHUwNEU5JywnXFx1MDRFQSc6J1xcdTA0RUInLCdcXHUwNEVDJzonXFx1MDRFRCcsJ1xcdTA0RUUnOidcXHUwNEVGJywnXFx1MDRGMCc6J1xcdTA0RjEnLCdcXHUwNEYyJzonXFx1MDRGMycsJ1xcdTA0RjQnOidcXHUwNEY1JywnXFx1MDRGNic6J1xcdTA0RjcnLCdcXHUwNEY4JzonXFx1MDRGOScsJ1xcdTA0RkEnOidcXHUwNEZCJywnXFx1MDRGQyc6J1xcdTA0RkQnLCdcXHUwNEZFJzonXFx1MDRGRicsJ1xcdTA1MDAnOidcXHUwNTAxJywnXFx1MDUwMic6J1xcdTA1MDMnLCdcXHUwNTA0JzonXFx1MDUwNScsJ1xcdTA1MDYnOidcXHUwNTA3JywnXFx1MDUwOCc6J1xcdTA1MDknLCdcXHUwNTBBJzonXFx1MDUwQicsJ1xcdTA1MEMnOidcXHUwNTBEJywnXFx1MDUwRSc6J1xcdTA1MEYnLCdcXHUwNTEwJzonXFx1MDUxMScsJ1xcdTA1MTInOidcXHUwNTEzJywnXFx1MDUxNCc6J1xcdTA1MTUnLCdcXHUwNTE2JzonXFx1MDUxNycsJ1xcdTA1MTgnOidcXHUwNTE5JywnXFx1MDUxQSc6J1xcdTA1MUInLCdcXHUwNTFDJzonXFx1MDUxRCcsJ1xcdTA1MUUnOidcXHUwNTFGJywnXFx1MDUyMCc6J1xcdTA1MjEnLCdcXHUwNTIyJzonXFx1MDUyMycsJ1xcdTA1MjQnOidcXHUwNTI1JywnXFx1MDUyNic6J1xcdTA1MjcnLCdcXHUwNTI4JzonXFx1MDUyOScsJ1xcdTA1MkEnOidcXHUwNTJCJywnXFx1MDUyQyc6J1xcdTA1MkQnLCdcXHUwNTJFJzonXFx1MDUyRicsJ1xcdTA1MzEnOidcXHUwNTYxJywnXFx1MDUzMic6J1xcdTA1NjInLCdcXHUwNTMzJzonXFx1MDU2MycsJ1xcdTA1MzQnOidcXHUwNTY0JywnXFx1MDUzNSc6J1xcdTA1NjUnLCdcXHUwNTM2JzonXFx1MDU2NicsJ1xcdTA1MzcnOidcXHUwNTY3JywnXFx1MDUzOCc6J1xcdTA1NjgnLCdcXHUwNTM5JzonXFx1MDU2OScsJ1xcdTA1M0EnOidcXHUwNTZBJywnXFx1MDUzQic6J1xcdTA1NkInLCdcXHUwNTNDJzonXFx1MDU2QycsJ1xcdTA1M0QnOidcXHUwNTZEJywnXFx1MDUzRSc6J1xcdTA1NkUnLCdcXHUwNTNGJzonXFx1MDU2RicsJ1xcdTA1NDAnOidcXHUwNTcwJywnXFx1MDU0MSc6J1xcdTA1NzEnLCdcXHUwNTQyJzonXFx1MDU3MicsJ1xcdTA1NDMnOidcXHUwNTczJywnXFx1MDU0NCc6J1xcdTA1NzQnLCdcXHUwNTQ1JzonXFx1MDU3NScsJ1xcdTA1NDYnOidcXHUwNTc2JywnXFx1MDU0Nyc6J1xcdTA1NzcnLCdcXHUwNTQ4JzonXFx1MDU3OCcsJ1xcdTA1NDknOidcXHUwNTc5JywnXFx1MDU0QSc6J1xcdTA1N0EnLCdcXHUwNTRCJzonXFx1MDU3QicsJ1xcdTA1NEMnOidcXHUwNTdDJywnXFx1MDU0RCc6J1xcdTA1N0QnLCdcXHUwNTRFJzonXFx1MDU3RScsJ1xcdTA1NEYnOidcXHUwNTdGJywnXFx1MDU1MCc6J1xcdTA1ODAnLCdcXHUwNTUxJzonXFx1MDU4MScsJ1xcdTA1NTInOidcXHUwNTgyJywnXFx1MDU1Myc6J1xcdTA1ODMnLCdcXHUwNTU0JzonXFx1MDU4NCcsJ1xcdTA1NTUnOidcXHUwNTg1JywnXFx1MDU1Nic6J1xcdTA1ODYnLCdcXHUxMEEwJzonXFx1MkQwMCcsJ1xcdTEwQTEnOidcXHUyRDAxJywnXFx1MTBBMic6J1xcdTJEMDInLCdcXHUxMEEzJzonXFx1MkQwMycsJ1xcdTEwQTQnOidcXHUyRDA0JywnXFx1MTBBNSc6J1xcdTJEMDUnLCdcXHUxMEE2JzonXFx1MkQwNicsJ1xcdTEwQTcnOidcXHUyRDA3JywnXFx1MTBBOCc6J1xcdTJEMDgnLCdcXHUxMEE5JzonXFx1MkQwOScsJ1xcdTEwQUEnOidcXHUyRDBBJywnXFx1MTBBQic6J1xcdTJEMEInLCdcXHUxMEFDJzonXFx1MkQwQycsJ1xcdTEwQUQnOidcXHUyRDBEJywnXFx1MTBBRSc6J1xcdTJEMEUnLCdcXHUxMEFGJzonXFx1MkQwRicsJ1xcdTEwQjAnOidcXHUyRDEwJywnXFx1MTBCMSc6J1xcdTJEMTEnLCdcXHUxMEIyJzonXFx1MkQxMicsJ1xcdTEwQjMnOidcXHUyRDEzJywnXFx1MTBCNCc6J1xcdTJEMTQnLCdcXHUxMEI1JzonXFx1MkQxNScsJ1xcdTEwQjYnOidcXHUyRDE2JywnXFx1MTBCNyc6J1xcdTJEMTcnLCdcXHUxMEI4JzonXFx1MkQxOCcsJ1xcdTEwQjknOidcXHUyRDE5JywnXFx1MTBCQSc6J1xcdTJEMUEnLCdcXHUxMEJCJzonXFx1MkQxQicsJ1xcdTEwQkMnOidcXHUyRDFDJywnXFx1MTBCRCc6J1xcdTJEMUQnLCdcXHUxMEJFJzonXFx1MkQxRScsJ1xcdTEwQkYnOidcXHUyRDFGJywnXFx1MTBDMCc6J1xcdTJEMjAnLCdcXHUxMEMxJzonXFx1MkQyMScsJ1xcdTEwQzInOidcXHUyRDIyJywnXFx1MTBDMyc6J1xcdTJEMjMnLCdcXHUxMEM0JzonXFx1MkQyNCcsJ1xcdTEwQzUnOidcXHUyRDI1JywnXFx1MTBDNyc6J1xcdTJEMjcnLCdcXHUxMENEJzonXFx1MkQyRCcsJ1xcdTFFMDAnOidcXHUxRTAxJywnXFx1MUUwMic6J1xcdTFFMDMnLCdcXHUxRTA0JzonXFx1MUUwNScsJ1xcdTFFMDYnOidcXHUxRTA3JywnXFx1MUUwOCc6J1xcdTFFMDknLCdcXHUxRTBBJzonXFx1MUUwQicsJ1xcdTFFMEMnOidcXHUxRTBEJywnXFx1MUUwRSc6J1xcdTFFMEYnLCdcXHUxRTEwJzonXFx1MUUxMScsJ1xcdTFFMTInOidcXHUxRTEzJywnXFx1MUUxNCc6J1xcdTFFMTUnLCdcXHUxRTE2JzonXFx1MUUxNycsJ1xcdTFFMTgnOidcXHUxRTE5JywnXFx1MUUxQSc6J1xcdTFFMUInLCdcXHUxRTFDJzonXFx1MUUxRCcsJ1xcdTFFMUUnOidcXHUxRTFGJywnXFx1MUUyMCc6J1xcdTFFMjEnLCdcXHUxRTIyJzonXFx1MUUyMycsJ1xcdTFFMjQnOidcXHUxRTI1JywnXFx1MUUyNic6J1xcdTFFMjcnLCdcXHUxRTI4JzonXFx1MUUyOScsJ1xcdTFFMkEnOidcXHUxRTJCJywnXFx1MUUyQyc6J1xcdTFFMkQnLCdcXHUxRTJFJzonXFx1MUUyRicsJ1xcdTFFMzAnOidcXHUxRTMxJywnXFx1MUUzMic6J1xcdTFFMzMnLCdcXHUxRTM0JzonXFx1MUUzNScsJ1xcdTFFMzYnOidcXHUxRTM3JywnXFx1MUUzOCc6J1xcdTFFMzknLCdcXHUxRTNBJzonXFx1MUUzQicsJ1xcdTFFM0MnOidcXHUxRTNEJywnXFx1MUUzRSc6J1xcdTFFM0YnLCdcXHUxRTQwJzonXFx1MUU0MScsJ1xcdTFFNDInOidcXHUxRTQzJywnXFx1MUU0NCc6J1xcdTFFNDUnLCdcXHUxRTQ2JzonXFx1MUU0NycsJ1xcdTFFNDgnOidcXHUxRTQ5JywnXFx1MUU0QSc6J1xcdTFFNEInLCdcXHUxRTRDJzonXFx1MUU0RCcsJ1xcdTFFNEUnOidcXHUxRTRGJywnXFx1MUU1MCc6J1xcdTFFNTEnLCdcXHUxRTUyJzonXFx1MUU1MycsJ1xcdTFFNTQnOidcXHUxRTU1JywnXFx1MUU1Nic6J1xcdTFFNTcnLCdcXHUxRTU4JzonXFx1MUU1OScsJ1xcdTFFNUEnOidcXHUxRTVCJywnXFx1MUU1Qyc6J1xcdTFFNUQnLCdcXHUxRTVFJzonXFx1MUU1RicsJ1xcdTFFNjAnOidcXHUxRTYxJywnXFx1MUU2Mic6J1xcdTFFNjMnLCdcXHUxRTY0JzonXFx1MUU2NScsJ1xcdTFFNjYnOidcXHUxRTY3JywnXFx1MUU2OCc6J1xcdTFFNjknLCdcXHUxRTZBJzonXFx1MUU2QicsJ1xcdTFFNkMnOidcXHUxRTZEJywnXFx1MUU2RSc6J1xcdTFFNkYnLCdcXHUxRTcwJzonXFx1MUU3MScsJ1xcdTFFNzInOidcXHUxRTczJywnXFx1MUU3NCc6J1xcdTFFNzUnLCdcXHUxRTc2JzonXFx1MUU3NycsJ1xcdTFFNzgnOidcXHUxRTc5JywnXFx1MUU3QSc6J1xcdTFFN0InLCdcXHUxRTdDJzonXFx1MUU3RCcsJ1xcdTFFN0UnOidcXHUxRTdGJywnXFx1MUU4MCc6J1xcdTFFODEnLCdcXHUxRTgyJzonXFx1MUU4MycsJ1xcdTFFODQnOidcXHUxRTg1JywnXFx1MUU4Nic6J1xcdTFFODcnLCdcXHUxRTg4JzonXFx1MUU4OScsJ1xcdTFFOEEnOidcXHUxRThCJywnXFx1MUU4Qyc6J1xcdTFFOEQnLCdcXHUxRThFJzonXFx1MUU4RicsJ1xcdTFFOTAnOidcXHUxRTkxJywnXFx1MUU5Mic6J1xcdTFFOTMnLCdcXHUxRTk0JzonXFx1MUU5NScsJ1xcdTFFOUInOidcXHUxRTYxJywnXFx1MUVBMCc6J1xcdTFFQTEnLCdcXHUxRUEyJzonXFx1MUVBMycsJ1xcdTFFQTQnOidcXHUxRUE1JywnXFx1MUVBNic6J1xcdTFFQTcnLCdcXHUxRUE4JzonXFx1MUVBOScsJ1xcdTFFQUEnOidcXHUxRUFCJywnXFx1MUVBQyc6J1xcdTFFQUQnLCdcXHUxRUFFJzonXFx1MUVBRicsJ1xcdTFFQjAnOidcXHUxRUIxJywnXFx1MUVCMic6J1xcdTFFQjMnLCdcXHUxRUI0JzonXFx1MUVCNScsJ1xcdTFFQjYnOidcXHUxRUI3JywnXFx1MUVCOCc6J1xcdTFFQjknLCdcXHUxRUJBJzonXFx1MUVCQicsJ1xcdTFFQkMnOidcXHUxRUJEJywnXFx1MUVCRSc6J1xcdTFFQkYnLCdcXHUxRUMwJzonXFx1MUVDMScsJ1xcdTFFQzInOidcXHUxRUMzJywnXFx1MUVDNCc6J1xcdTFFQzUnLCdcXHUxRUM2JzonXFx1MUVDNycsJ1xcdTFFQzgnOidcXHUxRUM5JywnXFx1MUVDQSc6J1xcdTFFQ0InLCdcXHUxRUNDJzonXFx1MUVDRCcsJ1xcdTFFQ0UnOidcXHUxRUNGJywnXFx1MUVEMCc6J1xcdTFFRDEnLCdcXHUxRUQyJzonXFx1MUVEMycsJ1xcdTFFRDQnOidcXHUxRUQ1JywnXFx1MUVENic6J1xcdTFFRDcnLCdcXHUxRUQ4JzonXFx1MUVEOScsJ1xcdTFFREEnOidcXHUxRURCJywnXFx1MUVEQyc6J1xcdTFFREQnLCdcXHUxRURFJzonXFx1MUVERicsJ1xcdTFFRTAnOidcXHUxRUUxJywnXFx1MUVFMic6J1xcdTFFRTMnLCdcXHUxRUU0JzonXFx1MUVFNScsJ1xcdTFFRTYnOidcXHUxRUU3JywnXFx1MUVFOCc6J1xcdTFFRTknLCdcXHUxRUVBJzonXFx1MUVFQicsJ1xcdTFFRUMnOidcXHUxRUVEJywnXFx1MUVFRSc6J1xcdTFFRUYnLCdcXHUxRUYwJzonXFx1MUVGMScsJ1xcdTFFRjInOidcXHUxRUYzJywnXFx1MUVGNCc6J1xcdTFFRjUnLCdcXHUxRUY2JzonXFx1MUVGNycsJ1xcdTFFRjgnOidcXHUxRUY5JywnXFx1MUVGQSc6J1xcdTFFRkInLCdcXHUxRUZDJzonXFx1MUVGRCcsJ1xcdTFFRkUnOidcXHUxRUZGJywnXFx1MUYwOCc6J1xcdTFGMDAnLCdcXHUxRjA5JzonXFx1MUYwMScsJ1xcdTFGMEEnOidcXHUxRjAyJywnXFx1MUYwQic6J1xcdTFGMDMnLCdcXHUxRjBDJzonXFx1MUYwNCcsJ1xcdTFGMEQnOidcXHUxRjA1JywnXFx1MUYwRSc6J1xcdTFGMDYnLCdcXHUxRjBGJzonXFx1MUYwNycsJ1xcdTFGMTgnOidcXHUxRjEwJywnXFx1MUYxOSc6J1xcdTFGMTEnLCdcXHUxRjFBJzonXFx1MUYxMicsJ1xcdTFGMUInOidcXHUxRjEzJywnXFx1MUYxQyc6J1xcdTFGMTQnLCdcXHUxRjFEJzonXFx1MUYxNScsJ1xcdTFGMjgnOidcXHUxRjIwJywnXFx1MUYyOSc6J1xcdTFGMjEnLCdcXHUxRjJBJzonXFx1MUYyMicsJ1xcdTFGMkInOidcXHUxRjIzJywnXFx1MUYyQyc6J1xcdTFGMjQnLCdcXHUxRjJEJzonXFx1MUYyNScsJ1xcdTFGMkUnOidcXHUxRjI2JywnXFx1MUYyRic6J1xcdTFGMjcnLCdcXHUxRjM4JzonXFx1MUYzMCcsJ1xcdTFGMzknOidcXHUxRjMxJywnXFx1MUYzQSc6J1xcdTFGMzInLCdcXHUxRjNCJzonXFx1MUYzMycsJ1xcdTFGM0MnOidcXHUxRjM0JywnXFx1MUYzRCc6J1xcdTFGMzUnLCdcXHUxRjNFJzonXFx1MUYzNicsJ1xcdTFGM0YnOidcXHUxRjM3JywnXFx1MUY0OCc6J1xcdTFGNDAnLCdcXHUxRjQ5JzonXFx1MUY0MScsJ1xcdTFGNEEnOidcXHUxRjQyJywnXFx1MUY0Qic6J1xcdTFGNDMnLCdcXHUxRjRDJzonXFx1MUY0NCcsJ1xcdTFGNEQnOidcXHUxRjQ1JywnXFx1MUY1OSc6J1xcdTFGNTEnLCdcXHUxRjVCJzonXFx1MUY1MycsJ1xcdTFGNUQnOidcXHUxRjU1JywnXFx1MUY1Ric6J1xcdTFGNTcnLCdcXHUxRjY4JzonXFx1MUY2MCcsJ1xcdTFGNjknOidcXHUxRjYxJywnXFx1MUY2QSc6J1xcdTFGNjInLCdcXHUxRjZCJzonXFx1MUY2MycsJ1xcdTFGNkMnOidcXHUxRjY0JywnXFx1MUY2RCc6J1xcdTFGNjUnLCdcXHUxRjZFJzonXFx1MUY2NicsJ1xcdTFGNkYnOidcXHUxRjY3JywnXFx1MUZCOCc6J1xcdTFGQjAnLCdcXHUxRkI5JzonXFx1MUZCMScsJ1xcdTFGQkEnOidcXHUxRjcwJywnXFx1MUZCQic6J1xcdTFGNzEnLCdcXHUxRkJFJzonXFx1MDNCOScsJ1xcdTFGQzgnOidcXHUxRjcyJywnXFx1MUZDOSc6J1xcdTFGNzMnLCdcXHUxRkNBJzonXFx1MUY3NCcsJ1xcdTFGQ0InOidcXHUxRjc1JywnXFx1MUZEOCc6J1xcdTFGRDAnLCdcXHUxRkQ5JzonXFx1MUZEMScsJ1xcdTFGREEnOidcXHUxRjc2JywnXFx1MUZEQic6J1xcdTFGNzcnLCdcXHUxRkU4JzonXFx1MUZFMCcsJ1xcdTFGRTknOidcXHUxRkUxJywnXFx1MUZFQSc6J1xcdTFGN0EnLCdcXHUxRkVCJzonXFx1MUY3QicsJ1xcdTFGRUMnOidcXHUxRkU1JywnXFx1MUZGOCc6J1xcdTFGNzgnLCdcXHUxRkY5JzonXFx1MUY3OScsJ1xcdTFGRkEnOidcXHUxRjdDJywnXFx1MUZGQic6J1xcdTFGN0QnLCdcXHUyMTI2JzonXFx1MDNDOScsJ1xcdTIxMkEnOidrJywnXFx1MjEyQic6J1xceEU1JywnXFx1MjEzMic6J1xcdTIxNEUnLCdcXHUyMTYwJzonXFx1MjE3MCcsJ1xcdTIxNjEnOidcXHUyMTcxJywnXFx1MjE2Mic6J1xcdTIxNzInLCdcXHUyMTYzJzonXFx1MjE3MycsJ1xcdTIxNjQnOidcXHUyMTc0JywnXFx1MjE2NSc6J1xcdTIxNzUnLCdcXHUyMTY2JzonXFx1MjE3NicsJ1xcdTIxNjcnOidcXHUyMTc3JywnXFx1MjE2OCc6J1xcdTIxNzgnLCdcXHUyMTY5JzonXFx1MjE3OScsJ1xcdTIxNkEnOidcXHUyMTdBJywnXFx1MjE2Qic6J1xcdTIxN0InLCdcXHUyMTZDJzonXFx1MjE3QycsJ1xcdTIxNkQnOidcXHUyMTdEJywnXFx1MjE2RSc6J1xcdTIxN0UnLCdcXHUyMTZGJzonXFx1MjE3RicsJ1xcdTIxODMnOidcXHUyMTg0JywnXFx1MjRCNic6J1xcdTI0RDAnLCdcXHUyNEI3JzonXFx1MjREMScsJ1xcdTI0QjgnOidcXHUyNEQyJywnXFx1MjRCOSc6J1xcdTI0RDMnLCdcXHUyNEJBJzonXFx1MjRENCcsJ1xcdTI0QkInOidcXHUyNEQ1JywnXFx1MjRCQyc6J1xcdTI0RDYnLCdcXHUyNEJEJzonXFx1MjRENycsJ1xcdTI0QkUnOidcXHUyNEQ4JywnXFx1MjRCRic6J1xcdTI0RDknLCdcXHUyNEMwJzonXFx1MjREQScsJ1xcdTI0QzEnOidcXHUyNERCJywnXFx1MjRDMic6J1xcdTI0REMnLCdcXHUyNEMzJzonXFx1MjRERCcsJ1xcdTI0QzQnOidcXHUyNERFJywnXFx1MjRDNSc6J1xcdTI0REYnLCdcXHUyNEM2JzonXFx1MjRFMCcsJ1xcdTI0QzcnOidcXHUyNEUxJywnXFx1MjRDOCc6J1xcdTI0RTInLCdcXHUyNEM5JzonXFx1MjRFMycsJ1xcdTI0Q0EnOidcXHUyNEU0JywnXFx1MjRDQic6J1xcdTI0RTUnLCdcXHUyNENDJzonXFx1MjRFNicsJ1xcdTI0Q0QnOidcXHUyNEU3JywnXFx1MjRDRSc6J1xcdTI0RTgnLCdcXHUyNENGJzonXFx1MjRFOScsJ1xcdTJDMDAnOidcXHUyQzMwJywnXFx1MkMwMSc6J1xcdTJDMzEnLCdcXHUyQzAyJzonXFx1MkMzMicsJ1xcdTJDMDMnOidcXHUyQzMzJywnXFx1MkMwNCc6J1xcdTJDMzQnLCdcXHUyQzA1JzonXFx1MkMzNScsJ1xcdTJDMDYnOidcXHUyQzM2JywnXFx1MkMwNyc6J1xcdTJDMzcnLCdcXHUyQzA4JzonXFx1MkMzOCcsJ1xcdTJDMDknOidcXHUyQzM5JywnXFx1MkMwQSc6J1xcdTJDM0EnLCdcXHUyQzBCJzonXFx1MkMzQicsJ1xcdTJDMEMnOidcXHUyQzNDJywnXFx1MkMwRCc6J1xcdTJDM0QnLCdcXHUyQzBFJzonXFx1MkMzRScsJ1xcdTJDMEYnOidcXHUyQzNGJywnXFx1MkMxMCc6J1xcdTJDNDAnLCdcXHUyQzExJzonXFx1MkM0MScsJ1xcdTJDMTInOidcXHUyQzQyJywnXFx1MkMxMyc6J1xcdTJDNDMnLCdcXHUyQzE0JzonXFx1MkM0NCcsJ1xcdTJDMTUnOidcXHUyQzQ1JywnXFx1MkMxNic6J1xcdTJDNDYnLCdcXHUyQzE3JzonXFx1MkM0NycsJ1xcdTJDMTgnOidcXHUyQzQ4JywnXFx1MkMxOSc6J1xcdTJDNDknLCdcXHUyQzFBJzonXFx1MkM0QScsJ1xcdTJDMUInOidcXHUyQzRCJywnXFx1MkMxQyc6J1xcdTJDNEMnLCdcXHUyQzFEJzonXFx1MkM0RCcsJ1xcdTJDMUUnOidcXHUyQzRFJywnXFx1MkMxRic6J1xcdTJDNEYnLCdcXHUyQzIwJzonXFx1MkM1MCcsJ1xcdTJDMjEnOidcXHUyQzUxJywnXFx1MkMyMic6J1xcdTJDNTInLCdcXHUyQzIzJzonXFx1MkM1MycsJ1xcdTJDMjQnOidcXHUyQzU0JywnXFx1MkMyNSc6J1xcdTJDNTUnLCdcXHUyQzI2JzonXFx1MkM1NicsJ1xcdTJDMjcnOidcXHUyQzU3JywnXFx1MkMyOCc6J1xcdTJDNTgnLCdcXHUyQzI5JzonXFx1MkM1OScsJ1xcdTJDMkEnOidcXHUyQzVBJywnXFx1MkMyQic6J1xcdTJDNUInLCdcXHUyQzJDJzonXFx1MkM1QycsJ1xcdTJDMkQnOidcXHUyQzVEJywnXFx1MkMyRSc6J1xcdTJDNUUnLCdcXHUyQzYwJzonXFx1MkM2MScsJ1xcdTJDNjInOidcXHUwMjZCJywnXFx1MkM2Myc6J1xcdTFEN0QnLCdcXHUyQzY0JzonXFx1MDI3RCcsJ1xcdTJDNjcnOidcXHUyQzY4JywnXFx1MkM2OSc6J1xcdTJDNkEnLCdcXHUyQzZCJzonXFx1MkM2QycsJ1xcdTJDNkQnOidcXHUwMjUxJywnXFx1MkM2RSc6J1xcdTAyNzEnLCdcXHUyQzZGJzonXFx1MDI1MCcsJ1xcdTJDNzAnOidcXHUwMjUyJywnXFx1MkM3Mic6J1xcdTJDNzMnLCdcXHUyQzc1JzonXFx1MkM3NicsJ1xcdTJDN0UnOidcXHUwMjNGJywnXFx1MkM3Ric6J1xcdTAyNDAnLCdcXHUyQzgwJzonXFx1MkM4MScsJ1xcdTJDODInOidcXHUyQzgzJywnXFx1MkM4NCc6J1xcdTJDODUnLCdcXHUyQzg2JzonXFx1MkM4NycsJ1xcdTJDODgnOidcXHUyQzg5JywnXFx1MkM4QSc6J1xcdTJDOEInLCdcXHUyQzhDJzonXFx1MkM4RCcsJ1xcdTJDOEUnOidcXHUyQzhGJywnXFx1MkM5MCc6J1xcdTJDOTEnLCdcXHUyQzkyJzonXFx1MkM5MycsJ1xcdTJDOTQnOidcXHUyQzk1JywnXFx1MkM5Nic6J1xcdTJDOTcnLCdcXHUyQzk4JzonXFx1MkM5OScsJ1xcdTJDOUEnOidcXHUyQzlCJywnXFx1MkM5Qyc6J1xcdTJDOUQnLCdcXHUyQzlFJzonXFx1MkM5RicsJ1xcdTJDQTAnOidcXHUyQ0ExJywnXFx1MkNBMic6J1xcdTJDQTMnLCdcXHUyQ0E0JzonXFx1MkNBNScsJ1xcdTJDQTYnOidcXHUyQ0E3JywnXFx1MkNBOCc6J1xcdTJDQTknLCdcXHUyQ0FBJzonXFx1MkNBQicsJ1xcdTJDQUMnOidcXHUyQ0FEJywnXFx1MkNBRSc6J1xcdTJDQUYnLCdcXHUyQ0IwJzonXFx1MkNCMScsJ1xcdTJDQjInOidcXHUyQ0IzJywnXFx1MkNCNCc6J1xcdTJDQjUnLCdcXHUyQ0I2JzonXFx1MkNCNycsJ1xcdTJDQjgnOidcXHUyQ0I5JywnXFx1MkNCQSc6J1xcdTJDQkInLCdcXHUyQ0JDJzonXFx1MkNCRCcsJ1xcdTJDQkUnOidcXHUyQ0JGJywnXFx1MkNDMCc6J1xcdTJDQzEnLCdcXHUyQ0MyJzonXFx1MkNDMycsJ1xcdTJDQzQnOidcXHUyQ0M1JywnXFx1MkNDNic6J1xcdTJDQzcnLCdcXHUyQ0M4JzonXFx1MkNDOScsJ1xcdTJDQ0EnOidcXHUyQ0NCJywnXFx1MkNDQyc6J1xcdTJDQ0QnLCdcXHUyQ0NFJzonXFx1MkNDRicsJ1xcdTJDRDAnOidcXHUyQ0QxJywnXFx1MkNEMic6J1xcdTJDRDMnLCdcXHUyQ0Q0JzonXFx1MkNENScsJ1xcdTJDRDYnOidcXHUyQ0Q3JywnXFx1MkNEOCc6J1xcdTJDRDknLCdcXHUyQ0RBJzonXFx1MkNEQicsJ1xcdTJDREMnOidcXHUyQ0REJywnXFx1MkNERSc6J1xcdTJDREYnLCdcXHUyQ0UwJzonXFx1MkNFMScsJ1xcdTJDRTInOidcXHUyQ0UzJywnXFx1MkNFQic6J1xcdTJDRUMnLCdcXHUyQ0VEJzonXFx1MkNFRScsJ1xcdTJDRjInOidcXHUyQ0YzJywnXFx1QTY0MCc6J1xcdUE2NDEnLCdcXHVBNjQyJzonXFx1QTY0MycsJ1xcdUE2NDQnOidcXHVBNjQ1JywnXFx1QTY0Nic6J1xcdUE2NDcnLCdcXHVBNjQ4JzonXFx1QTY0OScsJ1xcdUE2NEEnOidcXHVBNjRCJywnXFx1QTY0Qyc6J1xcdUE2NEQnLCdcXHVBNjRFJzonXFx1QTY0RicsJ1xcdUE2NTAnOidcXHVBNjUxJywnXFx1QTY1Mic6J1xcdUE2NTMnLCdcXHVBNjU0JzonXFx1QTY1NScsJ1xcdUE2NTYnOidcXHVBNjU3JywnXFx1QTY1OCc6J1xcdUE2NTknLCdcXHVBNjVBJzonXFx1QTY1QicsJ1xcdUE2NUMnOidcXHVBNjVEJywnXFx1QTY1RSc6J1xcdUE2NUYnLCdcXHVBNjYwJzonXFx1QTY2MScsJ1xcdUE2NjInOidcXHVBNjYzJywnXFx1QTY2NCc6J1xcdUE2NjUnLCdcXHVBNjY2JzonXFx1QTY2NycsJ1xcdUE2NjgnOidcXHVBNjY5JywnXFx1QTY2QSc6J1xcdUE2NkInLCdcXHVBNjZDJzonXFx1QTY2RCcsJ1xcdUE2ODAnOidcXHVBNjgxJywnXFx1QTY4Mic6J1xcdUE2ODMnLCdcXHVBNjg0JzonXFx1QTY4NScsJ1xcdUE2ODYnOidcXHVBNjg3JywnXFx1QTY4OCc6J1xcdUE2ODknLCdcXHVBNjhBJzonXFx1QTY4QicsJ1xcdUE2OEMnOidcXHVBNjhEJywnXFx1QTY4RSc6J1xcdUE2OEYnLCdcXHVBNjkwJzonXFx1QTY5MScsJ1xcdUE2OTInOidcXHVBNjkzJywnXFx1QTY5NCc6J1xcdUE2OTUnLCdcXHVBNjk2JzonXFx1QTY5NycsJ1xcdUE2OTgnOidcXHVBNjk5JywnXFx1QTY5QSc6J1xcdUE2OUInLCdcXHVBNzIyJzonXFx1QTcyMycsJ1xcdUE3MjQnOidcXHVBNzI1JywnXFx1QTcyNic6J1xcdUE3MjcnLCdcXHVBNzI4JzonXFx1QTcyOScsJ1xcdUE3MkEnOidcXHVBNzJCJywnXFx1QTcyQyc6J1xcdUE3MkQnLCdcXHVBNzJFJzonXFx1QTcyRicsJ1xcdUE3MzInOidcXHVBNzMzJywnXFx1QTczNCc6J1xcdUE3MzUnLCdcXHVBNzM2JzonXFx1QTczNycsJ1xcdUE3MzgnOidcXHVBNzM5JywnXFx1QTczQSc6J1xcdUE3M0InLCdcXHVBNzNDJzonXFx1QTczRCcsJ1xcdUE3M0UnOidcXHVBNzNGJywnXFx1QTc0MCc6J1xcdUE3NDEnLCdcXHVBNzQyJzonXFx1QTc0MycsJ1xcdUE3NDQnOidcXHVBNzQ1JywnXFx1QTc0Nic6J1xcdUE3NDcnLCdcXHVBNzQ4JzonXFx1QTc0OScsJ1xcdUE3NEEnOidcXHVBNzRCJywnXFx1QTc0Qyc6J1xcdUE3NEQnLCdcXHVBNzRFJzonXFx1QTc0RicsJ1xcdUE3NTAnOidcXHVBNzUxJywnXFx1QTc1Mic6J1xcdUE3NTMnLCdcXHVBNzU0JzonXFx1QTc1NScsJ1xcdUE3NTYnOidcXHVBNzU3JywnXFx1QTc1OCc6J1xcdUE3NTknLCdcXHVBNzVBJzonXFx1QTc1QicsJ1xcdUE3NUMnOidcXHVBNzVEJywnXFx1QTc1RSc6J1xcdUE3NUYnLCdcXHVBNzYwJzonXFx1QTc2MScsJ1xcdUE3NjInOidcXHVBNzYzJywnXFx1QTc2NCc6J1xcdUE3NjUnLCdcXHVBNzY2JzonXFx1QTc2NycsJ1xcdUE3NjgnOidcXHVBNzY5JywnXFx1QTc2QSc6J1xcdUE3NkInLCdcXHVBNzZDJzonXFx1QTc2RCcsJ1xcdUE3NkUnOidcXHVBNzZGJywnXFx1QTc3OSc6J1xcdUE3N0EnLCdcXHVBNzdCJzonXFx1QTc3QycsJ1xcdUE3N0QnOidcXHUxRDc5JywnXFx1QTc3RSc6J1xcdUE3N0YnLCdcXHVBNzgwJzonXFx1QTc4MScsJ1xcdUE3ODInOidcXHVBNzgzJywnXFx1QTc4NCc6J1xcdUE3ODUnLCdcXHVBNzg2JzonXFx1QTc4NycsJ1xcdUE3OEInOidcXHVBNzhDJywnXFx1QTc4RCc6J1xcdTAyNjUnLCdcXHVBNzkwJzonXFx1QTc5MScsJ1xcdUE3OTInOidcXHVBNzkzJywnXFx1QTc5Nic6J1xcdUE3OTcnLCdcXHVBNzk4JzonXFx1QTc5OScsJ1xcdUE3OUEnOidcXHVBNzlCJywnXFx1QTc5Qyc6J1xcdUE3OUQnLCdcXHVBNzlFJzonXFx1QTc5RicsJ1xcdUE3QTAnOidcXHVBN0ExJywnXFx1QTdBMic6J1xcdUE3QTMnLCdcXHVBN0E0JzonXFx1QTdBNScsJ1xcdUE3QTYnOidcXHVBN0E3JywnXFx1QTdBOCc6J1xcdUE3QTknLCdcXHVBN0FBJzonXFx1MDI2NicsJ1xcdUE3QUInOidcXHUwMjVDJywnXFx1QTdBQyc6J1xcdTAyNjEnLCdcXHVBN0FEJzonXFx1MDI2QycsJ1xcdUE3QjAnOidcXHUwMjlFJywnXFx1QTdCMSc6J1xcdTAyODcnLCdcXHVGRjIxJzonXFx1RkY0MScsJ1xcdUZGMjInOidcXHVGRjQyJywnXFx1RkYyMyc6J1xcdUZGNDMnLCdcXHVGRjI0JzonXFx1RkY0NCcsJ1xcdUZGMjUnOidcXHVGRjQ1JywnXFx1RkYyNic6J1xcdUZGNDYnLCdcXHVGRjI3JzonXFx1RkY0NycsJ1xcdUZGMjgnOidcXHVGRjQ4JywnXFx1RkYyOSc6J1xcdUZGNDknLCdcXHVGRjJBJzonXFx1RkY0QScsJ1xcdUZGMkInOidcXHVGRjRCJywnXFx1RkYyQyc6J1xcdUZGNEMnLCdcXHVGRjJEJzonXFx1RkY0RCcsJ1xcdUZGMkUnOidcXHVGRjRFJywnXFx1RkYyRic6J1xcdUZGNEYnLCdcXHVGRjMwJzonXFx1RkY1MCcsJ1xcdUZGMzEnOidcXHVGRjUxJywnXFx1RkYzMic6J1xcdUZGNTInLCdcXHVGRjMzJzonXFx1RkY1MycsJ1xcdUZGMzQnOidcXHVGRjU0JywnXFx1RkYzNSc6J1xcdUZGNTUnLCdcXHVGRjM2JzonXFx1RkY1NicsJ1xcdUZGMzcnOidcXHVGRjU3JywnXFx1RkYzOCc6J1xcdUZGNTgnLCdcXHVGRjM5JzonXFx1RkY1OScsJ1xcdUZGM0EnOidcXHVGRjVBJywnXFx1RDgwMVxcdURDMDAnOidcXHVEODAxXFx1REMyOCcsJ1xcdUQ4MDFcXHVEQzAxJzonXFx1RDgwMVxcdURDMjknLCdcXHVEODAxXFx1REMwMic6J1xcdUQ4MDFcXHVEQzJBJywnXFx1RDgwMVxcdURDMDMnOidcXHVEODAxXFx1REMyQicsJ1xcdUQ4MDFcXHVEQzA0JzonXFx1RDgwMVxcdURDMkMnLCdcXHVEODAxXFx1REMwNSc6J1xcdUQ4MDFcXHVEQzJEJywnXFx1RDgwMVxcdURDMDYnOidcXHVEODAxXFx1REMyRScsJ1xcdUQ4MDFcXHVEQzA3JzonXFx1RDgwMVxcdURDMkYnLCdcXHVEODAxXFx1REMwOCc6J1xcdUQ4MDFcXHVEQzMwJywnXFx1RDgwMVxcdURDMDknOidcXHVEODAxXFx1REMzMScsJ1xcdUQ4MDFcXHVEQzBBJzonXFx1RDgwMVxcdURDMzInLCdcXHVEODAxXFx1REMwQic6J1xcdUQ4MDFcXHVEQzMzJywnXFx1RDgwMVxcdURDMEMnOidcXHVEODAxXFx1REMzNCcsJ1xcdUQ4MDFcXHVEQzBEJzonXFx1RDgwMVxcdURDMzUnLCdcXHVEODAxXFx1REMwRSc6J1xcdUQ4MDFcXHVEQzM2JywnXFx1RDgwMVxcdURDMEYnOidcXHVEODAxXFx1REMzNycsJ1xcdUQ4MDFcXHVEQzEwJzonXFx1RDgwMVxcdURDMzgnLCdcXHVEODAxXFx1REMxMSc6J1xcdUQ4MDFcXHVEQzM5JywnXFx1RDgwMVxcdURDMTInOidcXHVEODAxXFx1REMzQScsJ1xcdUQ4MDFcXHVEQzEzJzonXFx1RDgwMVxcdURDM0InLCdcXHVEODAxXFx1REMxNCc6J1xcdUQ4MDFcXHVEQzNDJywnXFx1RDgwMVxcdURDMTUnOidcXHVEODAxXFx1REMzRCcsJ1xcdUQ4MDFcXHVEQzE2JzonXFx1RDgwMVxcdURDM0UnLCdcXHVEODAxXFx1REMxNyc6J1xcdUQ4MDFcXHVEQzNGJywnXFx1RDgwMVxcdURDMTgnOidcXHVEODAxXFx1REM0MCcsJ1xcdUQ4MDFcXHVEQzE5JzonXFx1RDgwMVxcdURDNDEnLCdcXHVEODAxXFx1REMxQSc6J1xcdUQ4MDFcXHVEQzQyJywnXFx1RDgwMVxcdURDMUInOidcXHVEODAxXFx1REM0MycsJ1xcdUQ4MDFcXHVEQzFDJzonXFx1RDgwMVxcdURDNDQnLCdcXHVEODAxXFx1REMxRCc6J1xcdUQ4MDFcXHVEQzQ1JywnXFx1RDgwMVxcdURDMUUnOidcXHVEODAxXFx1REM0NicsJ1xcdUQ4MDFcXHVEQzFGJzonXFx1RDgwMVxcdURDNDcnLCdcXHVEODAxXFx1REMyMCc6J1xcdUQ4MDFcXHVEQzQ4JywnXFx1RDgwMVxcdURDMjEnOidcXHVEODAxXFx1REM0OScsJ1xcdUQ4MDFcXHVEQzIyJzonXFx1RDgwMVxcdURDNEEnLCdcXHVEODAxXFx1REMyMyc6J1xcdUQ4MDFcXHVEQzRCJywnXFx1RDgwMVxcdURDMjQnOidcXHVEODAxXFx1REM0QycsJ1xcdUQ4MDFcXHVEQzI1JzonXFx1RDgwMVxcdURDNEQnLCdcXHVEODAxXFx1REMyNic6J1xcdUQ4MDFcXHVEQzRFJywnXFx1RDgwMVxcdURDMjcnOidcXHVEODAxXFx1REM0RicsJ1xcdUQ4MDZcXHVEQ0EwJzonXFx1RDgwNlxcdURDQzAnLCdcXHVEODA2XFx1RENBMSc6J1xcdUQ4MDZcXHVEQ0MxJywnXFx1RDgwNlxcdURDQTInOidcXHVEODA2XFx1RENDMicsJ1xcdUQ4MDZcXHVEQ0EzJzonXFx1RDgwNlxcdURDQzMnLCdcXHVEODA2XFx1RENBNCc6J1xcdUQ4MDZcXHVEQ0M0JywnXFx1RDgwNlxcdURDQTUnOidcXHVEODA2XFx1RENDNScsJ1xcdUQ4MDZcXHVEQ0E2JzonXFx1RDgwNlxcdURDQzYnLCdcXHVEODA2XFx1RENBNyc6J1xcdUQ4MDZcXHVEQ0M3JywnXFx1RDgwNlxcdURDQTgnOidcXHVEODA2XFx1RENDOCcsJ1xcdUQ4MDZcXHVEQ0E5JzonXFx1RDgwNlxcdURDQzknLCdcXHVEODA2XFx1RENBQSc6J1xcdUQ4MDZcXHVEQ0NBJywnXFx1RDgwNlxcdURDQUInOidcXHVEODA2XFx1RENDQicsJ1xcdUQ4MDZcXHVEQ0FDJzonXFx1RDgwNlxcdURDQ0MnLCdcXHVEODA2XFx1RENBRCc6J1xcdUQ4MDZcXHVEQ0NEJywnXFx1RDgwNlxcdURDQUUnOidcXHVEODA2XFx1RENDRScsJ1xcdUQ4MDZcXHVEQ0FGJzonXFx1RDgwNlxcdURDQ0YnLCdcXHVEODA2XFx1RENCMCc6J1xcdUQ4MDZcXHVEQ0QwJywnXFx1RDgwNlxcdURDQjEnOidcXHVEODA2XFx1RENEMScsJ1xcdUQ4MDZcXHVEQ0IyJzonXFx1RDgwNlxcdURDRDInLCdcXHVEODA2XFx1RENCMyc6J1xcdUQ4MDZcXHVEQ0QzJywnXFx1RDgwNlxcdURDQjQnOidcXHVEODA2XFx1RENENCcsJ1xcdUQ4MDZcXHVEQ0I1JzonXFx1RDgwNlxcdURDRDUnLCdcXHVEODA2XFx1RENCNic6J1xcdUQ4MDZcXHVEQ0Q2JywnXFx1RDgwNlxcdURDQjcnOidcXHVEODA2XFx1RENENycsJ1xcdUQ4MDZcXHVEQ0I4JzonXFx1RDgwNlxcdURDRDgnLCdcXHVEODA2XFx1RENCOSc6J1xcdUQ4MDZcXHVEQ0Q5JywnXFx1RDgwNlxcdURDQkEnOidcXHVEODA2XFx1RENEQScsJ1xcdUQ4MDZcXHVEQ0JCJzonXFx1RDgwNlxcdURDREInLCdcXHVEODA2XFx1RENCQyc6J1xcdUQ4MDZcXHVEQ0RDJywnXFx1RDgwNlxcdURDQkQnOidcXHVEODA2XFx1RENERCcsJ1xcdUQ4MDZcXHVEQ0JFJzonXFx1RDgwNlxcdURDREUnLCdcXHVEODA2XFx1RENCRic6J1xcdUQ4MDZcXHVEQ0RGJywnXFx4REYnOidzcycsJ1xcdTAxMzAnOidpXFx1MDMwNycsJ1xcdTAxNDknOidcXHUwMkJDbicsJ1xcdTAxRjAnOidqXFx1MDMwQycsJ1xcdTAzOTAnOidcXHUwM0I5XFx1MDMwOFxcdTAzMDEnLCdcXHUwM0IwJzonXFx1MDNDNVxcdTAzMDhcXHUwMzAxJywnXFx1MDU4Nyc6J1xcdTA1NjVcXHUwNTgyJywnXFx1MUU5Nic6J2hcXHUwMzMxJywnXFx1MUU5Nyc6J3RcXHUwMzA4JywnXFx1MUU5OCc6J3dcXHUwMzBBJywnXFx1MUU5OSc6J3lcXHUwMzBBJywnXFx1MUU5QSc6J2FcXHUwMkJFJywnXFx1MUU5RSc6J3NzJywnXFx1MUY1MCc6J1xcdTAzQzVcXHUwMzEzJywnXFx1MUY1Mic6J1xcdTAzQzVcXHUwMzEzXFx1MDMwMCcsJ1xcdTFGNTQnOidcXHUwM0M1XFx1MDMxM1xcdTAzMDEnLCdcXHUxRjU2JzonXFx1MDNDNVxcdTAzMTNcXHUwMzQyJywnXFx1MUY4MCc6J1xcdTFGMDBcXHUwM0I5JywnXFx1MUY4MSc6J1xcdTFGMDFcXHUwM0I5JywnXFx1MUY4Mic6J1xcdTFGMDJcXHUwM0I5JywnXFx1MUY4Myc6J1xcdTFGMDNcXHUwM0I5JywnXFx1MUY4NCc6J1xcdTFGMDRcXHUwM0I5JywnXFx1MUY4NSc6J1xcdTFGMDVcXHUwM0I5JywnXFx1MUY4Nic6J1xcdTFGMDZcXHUwM0I5JywnXFx1MUY4Nyc6J1xcdTFGMDdcXHUwM0I5JywnXFx1MUY4OCc6J1xcdTFGMDBcXHUwM0I5JywnXFx1MUY4OSc6J1xcdTFGMDFcXHUwM0I5JywnXFx1MUY4QSc6J1xcdTFGMDJcXHUwM0I5JywnXFx1MUY4Qic6J1xcdTFGMDNcXHUwM0I5JywnXFx1MUY4Qyc6J1xcdTFGMDRcXHUwM0I5JywnXFx1MUY4RCc6J1xcdTFGMDVcXHUwM0I5JywnXFx1MUY4RSc6J1xcdTFGMDZcXHUwM0I5JywnXFx1MUY4Ric6J1xcdTFGMDdcXHUwM0I5JywnXFx1MUY5MCc6J1xcdTFGMjBcXHUwM0I5JywnXFx1MUY5MSc6J1xcdTFGMjFcXHUwM0I5JywnXFx1MUY5Mic6J1xcdTFGMjJcXHUwM0I5JywnXFx1MUY5Myc6J1xcdTFGMjNcXHUwM0I5JywnXFx1MUY5NCc6J1xcdTFGMjRcXHUwM0I5JywnXFx1MUY5NSc6J1xcdTFGMjVcXHUwM0I5JywnXFx1MUY5Nic6J1xcdTFGMjZcXHUwM0I5JywnXFx1MUY5Nyc6J1xcdTFGMjdcXHUwM0I5JywnXFx1MUY5OCc6J1xcdTFGMjBcXHUwM0I5JywnXFx1MUY5OSc6J1xcdTFGMjFcXHUwM0I5JywnXFx1MUY5QSc6J1xcdTFGMjJcXHUwM0I5JywnXFx1MUY5Qic6J1xcdTFGMjNcXHUwM0I5JywnXFx1MUY5Qyc6J1xcdTFGMjRcXHUwM0I5JywnXFx1MUY5RCc6J1xcdTFGMjVcXHUwM0I5JywnXFx1MUY5RSc6J1xcdTFGMjZcXHUwM0I5JywnXFx1MUY5Ric6J1xcdTFGMjdcXHUwM0I5JywnXFx1MUZBMCc6J1xcdTFGNjBcXHUwM0I5JywnXFx1MUZBMSc6J1xcdTFGNjFcXHUwM0I5JywnXFx1MUZBMic6J1xcdTFGNjJcXHUwM0I5JywnXFx1MUZBMyc6J1xcdTFGNjNcXHUwM0I5JywnXFx1MUZBNCc6J1xcdTFGNjRcXHUwM0I5JywnXFx1MUZBNSc6J1xcdTFGNjVcXHUwM0I5JywnXFx1MUZBNic6J1xcdTFGNjZcXHUwM0I5JywnXFx1MUZBNyc6J1xcdTFGNjdcXHUwM0I5JywnXFx1MUZBOCc6J1xcdTFGNjBcXHUwM0I5JywnXFx1MUZBOSc6J1xcdTFGNjFcXHUwM0I5JywnXFx1MUZBQSc6J1xcdTFGNjJcXHUwM0I5JywnXFx1MUZBQic6J1xcdTFGNjNcXHUwM0I5JywnXFx1MUZBQyc6J1xcdTFGNjRcXHUwM0I5JywnXFx1MUZBRCc6J1xcdTFGNjVcXHUwM0I5JywnXFx1MUZBRSc6J1xcdTFGNjZcXHUwM0I5JywnXFx1MUZBRic6J1xcdTFGNjdcXHUwM0I5JywnXFx1MUZCMic6J1xcdTFGNzBcXHUwM0I5JywnXFx1MUZCMyc6J1xcdTAzQjFcXHUwM0I5JywnXFx1MUZCNCc6J1xcdTAzQUNcXHUwM0I5JywnXFx1MUZCNic6J1xcdTAzQjFcXHUwMzQyJywnXFx1MUZCNyc6J1xcdTAzQjFcXHUwMzQyXFx1MDNCOScsJ1xcdTFGQkMnOidcXHUwM0IxXFx1MDNCOScsJ1xcdTFGQzInOidcXHUxRjc0XFx1MDNCOScsJ1xcdTFGQzMnOidcXHUwM0I3XFx1MDNCOScsJ1xcdTFGQzQnOidcXHUwM0FFXFx1MDNCOScsJ1xcdTFGQzYnOidcXHUwM0I3XFx1MDM0MicsJ1xcdTFGQzcnOidcXHUwM0I3XFx1MDM0MlxcdTAzQjknLCdcXHUxRkNDJzonXFx1MDNCN1xcdTAzQjknLCdcXHUxRkQyJzonXFx1MDNCOVxcdTAzMDhcXHUwMzAwJywnXFx1MUZEMyc6J1xcdTAzQjlcXHUwMzA4XFx1MDMwMScsJ1xcdTFGRDYnOidcXHUwM0I5XFx1MDM0MicsJ1xcdTFGRDcnOidcXHUwM0I5XFx1MDMwOFxcdTAzNDInLCdcXHUxRkUyJzonXFx1MDNDNVxcdTAzMDhcXHUwMzAwJywnXFx1MUZFMyc6J1xcdTAzQzVcXHUwMzA4XFx1MDMwMScsJ1xcdTFGRTQnOidcXHUwM0MxXFx1MDMxMycsJ1xcdTFGRTYnOidcXHUwM0M1XFx1MDM0MicsJ1xcdTFGRTcnOidcXHUwM0M1XFx1MDMwOFxcdTAzNDInLCdcXHUxRkYyJzonXFx1MUY3Q1xcdTAzQjknLCdcXHUxRkYzJzonXFx1MDNDOVxcdTAzQjknLCdcXHUxRkY0JzonXFx1MDNDRVxcdTAzQjknLCdcXHUxRkY2JzonXFx1MDNDOVxcdTAzNDInLCdcXHUxRkY3JzonXFx1MDNDOVxcdTAzNDJcXHUwM0I5JywnXFx1MUZGQyc6J1xcdTAzQzlcXHUwM0I5JywnXFx1RkIwMCc6J2ZmJywnXFx1RkIwMSc6J2ZpJywnXFx1RkIwMic6J2ZsJywnXFx1RkIwMyc6J2ZmaScsJ1xcdUZCMDQnOidmZmwnLCdcXHVGQjA1Jzonc3QnLCdcXHVGQjA2Jzonc3QnLCdcXHVGQjEzJzonXFx1MDU3NFxcdTA1NzYnLCdcXHVGQjE0JzonXFx1MDU3NFxcdTA1NjUnLCdcXHVGQjE1JzonXFx1MDU3NFxcdTA1NkInLCdcXHVGQjE2JzonXFx1MDU3RVxcdTA1NzYnLCdcXHVGQjE3JzonXFx1MDU3NFxcdTA1NkQnfTtcblxuLy8gTm9ybWFsaXplIHJlZmVyZW5jZSBsYWJlbDogY29sbGFwc2UgaW50ZXJuYWwgd2hpdGVzcGFjZVxuLy8gdG8gc2luZ2xlIHNwYWNlLCByZW1vdmUgbGVhZGluZy90cmFpbGluZyB3aGl0ZXNwYWNlLCBjYXNlIGZvbGQuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIHJldHVybiBzdHJpbmcuc2xpY2UoMSwgc3RyaW5nLmxlbmd0aCAtIDEpLnRyaW0oKS5yZXBsYWNlKHJlZ2V4LCBmdW5jdGlvbigkMCkge1xuICAgICAgICAvLyBOb3RlOiB0aGVyZSBpcyBubyBuZWVkIHRvIGNoZWNrIGBoYXNPd25Qcm9wZXJ0eSgkMClgIGhlcmUuXG4gICAgICAgIC8vIElmIGNoYXJhY3RlciBub3QgZm91bmQgaW4gbG9va3VwIHRhYmxlLCBpdCBtdXN0IGJlIHdoaXRlc3BhY2UuXG4gICAgICAgIHJldHVybiBtYXBbJDBdIHx8ICcgJztcbiAgICB9KTtcbn07XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIFJlbmRlcmVyID0gcmVxdWlyZSgnLi9yZW5kZXJlcicpO1xuXG52YXIgcmVVbnNhZmVQcm90b2NvbCA9IC9eamF2YXNjcmlwdDp8dmJzY3JpcHQ6fGZpbGU6fGRhdGE6L2k7XG52YXIgcmVTYWZlRGF0YVByb3RvY29sID0gL15kYXRhOmltYWdlXFwvKD86cG5nfGdpZnxqcGVnfHdlYnApL2k7XG5cbnZhciBwb3RlbnRpYWxseVVuc2FmZSA9IGZ1bmN0aW9uKHVybCkge1xuICByZXR1cm4gcmVVbnNhZmVQcm90b2NvbC50ZXN0KHVybCkgJiZcbiAgICAgICFyZVNhZmVEYXRhUHJvdG9jb2wudGVzdCh1cmwpO1xufTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIHByb2R1Y2UgYW4gSFRNTCB0YWcuXG5mdW5jdGlvbiB0YWcobmFtZSwgYXR0cnMsIHNlbGZjbG9zaW5nKSB7XG4gIGlmICh0aGlzLmRpc2FibGVUYWdzID4gMCkge1xuICAgIHJldHVybjtcbiAgfVxuICB0aGlzLmJ1ZmZlciArPSAoJzwnICsgbmFtZSk7XG4gIGlmIChhdHRycyAmJiBhdHRycy5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGkgPSAwO1xuICAgIHZhciBhdHRyaWI7XG4gICAgd2hpbGUgKChhdHRyaWIgPSBhdHRyc1tpXSkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhpcy5idWZmZXIgKz0gKCcgJyArIGF0dHJpYlswXSArICc9XCInICsgYXR0cmliWzFdICsgJ1wiJyk7XG4gICAgICBpKys7XG4gICAgfVxuICB9XG4gIGlmIChzZWxmY2xvc2luZykge1xuICAgIHRoaXMuYnVmZmVyICs9ICcgLyc7XG4gIH1cbiAgdGhpcy5idWZmZXIgKz0gJz4nO1xuICB0aGlzLmxhc3RPdXQgPSAnPic7XG59XG5cbmZ1bmN0aW9uIEh0bWxSZW5kZXJlcihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAvLyBieSBkZWZhdWx0LCBzb2Z0IGJyZWFrcyBhcmUgcmVuZGVyZWQgYXMgbmV3bGluZXMgaW4gSFRNTFxuICBvcHRpb25zLnNvZnRicmVhayA9IG9wdGlvbnMuc29mdGJyZWFrIHx8ICdcXG4nO1xuICAvLyBzZXQgdG8gXCI8YnIgLz5cIiB0byBtYWtlIHRoZW0gaGFyZCBicmVha3NcbiAgLy8gc2V0IHRvIFwiIFwiIGlmIHlvdSB3YW50IHRvIGlnbm9yZSBsaW5lIHdyYXBwaW5nIGluIHNvdXJjZVxuXG4gIHRoaXMuZGlzYWJsZVRhZ3MgPSAwO1xuICB0aGlzLmxhc3RPdXQgPSBcIlxcblwiO1xuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xufVxuXG4vKiBOb2RlIG1ldGhvZHMgKi9cblxuZnVuY3Rpb24gdGV4dChub2RlKSB7XG4gIHRoaXMub3V0KG5vZGUubGl0ZXJhbCk7XG59XG5cbmZ1bmN0aW9uIHNvZnRicmVhaygpIHtcbiAgdGhpcy5saXQodGhpcy5vcHRpb25zLnNvZnRicmVhayk7XG59XG5cbmZ1bmN0aW9uIGxpbmVicmVhaygpIHtcbiAgdGhpcy50YWcoJ2JyJywgW10sIHRydWUpO1xuICB0aGlzLmNyKCk7XG59XG5cbmZ1bmN0aW9uIGxpbmsobm9kZSwgZW50ZXJpbmcpIHtcbiAgdmFyIGF0dHJzID0gdGhpcy5hdHRycyhub2RlKTtcbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgaWYgKCEodGhpcy5vcHRpb25zLnNhZmUgJiYgcG90ZW50aWFsbHlVbnNhZmUobm9kZS5kZXN0aW5hdGlvbikpKSB7XG4gICAgICBhdHRycy5wdXNoKFsnaHJlZicsIHRoaXMuZXNjKG5vZGUuZGVzdGluYXRpb24sIHRydWUpXSk7XG4gICAgfVxuICAgIGlmIChub2RlLnRpdGxlKSB7XG4gICAgICBhdHRycy5wdXNoKFsndGl0bGUnLCB0aGlzLmVzYyhub2RlLnRpdGxlLCB0cnVlKV0pO1xuICAgIH1cbiAgICB0aGlzLnRhZygnYScsIGF0dHJzKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnRhZygnL2EnKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBpbWFnZShub2RlLCBlbnRlcmluZykge1xuICBpZiAoZW50ZXJpbmcpIHtcbiAgICBpZiAodGhpcy5kaXNhYmxlVGFncyA9PT0gMCkge1xuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zYWZlICYmIHBvdGVudGlhbGx5VW5zYWZlKG5vZGUuZGVzdGluYXRpb24pKSB7XG4gICAgICAgIHRoaXMubGl0KCc8aW1nIHNyYz1cIlwiIGFsdD1cIicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5saXQoJzxpbWcgc3JjPVwiJyArIHRoaXMuZXNjKG5vZGUuZGVzdGluYXRpb24sIHRydWUpICtcbiAgICAgICAgICAgICdcIiBhbHQ9XCInKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdGhpcy5kaXNhYmxlVGFncyArPSAxO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZGlzYWJsZVRhZ3MgLT0gMTtcbiAgICBpZiAodGhpcy5kaXNhYmxlVGFncyA9PT0gMCkge1xuICAgICAgaWYgKG5vZGUudGl0bGUpIHtcbiAgICAgICAgdGhpcy5saXQoJ1wiIHRpdGxlPVwiJyArIHRoaXMuZXNjKG5vZGUudGl0bGUsIHRydWUpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMubGl0KCdcIiAvPicpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBlbXBoKG5vZGUsIGVudGVyaW5nKSB7XG4gIHRoaXMudGFnKGVudGVyaW5nID8gJ2VtJyA6ICcvZW0nKTtcbn1cblxuZnVuY3Rpb24gc3Ryb25nKG5vZGUsIGVudGVyaW5nKSB7XG4gIHRoaXMudGFnKGVudGVyaW5nID8gJ3N0cm9uZycgOiAnL3N0cm9uZycpO1xufVxuXG5mdW5jdGlvbiBwYXJhZ3JhcGgobm9kZSwgZW50ZXJpbmcpIHtcbiAgdmFyIGdyYW5kcGFyZW50ID0gbm9kZS5wYXJlbnQucGFyZW50XG4gICAgLCBhdHRycyA9IHRoaXMuYXR0cnMobm9kZSk7XG4gIGlmIChncmFuZHBhcmVudCAhPT0gbnVsbCAmJlxuICAgIGdyYW5kcGFyZW50LnR5cGUgPT09ICdsaXN0Jykge1xuICAgIGlmIChncmFuZHBhcmVudC5saXN0VGlnaHQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gIH1cbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgdGhpcy5jcigpO1xuICAgIHRoaXMudGFnKCdwJywgYXR0cnMpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMudGFnKCcvcCcpO1xuICAgIHRoaXMuY3IoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBoZWFkaW5nKG5vZGUsIGVudGVyaW5nKSB7XG4gIHZhciB0YWduYW1lID0gJ2gnICsgbm9kZS5sZXZlbFxuICAgICwgYXR0cnMgPSB0aGlzLmF0dHJzKG5vZGUpO1xuICBpZiAoZW50ZXJpbmcpIHtcbiAgICB0aGlzLmNyKCk7XG4gICAgdGhpcy50YWcodGFnbmFtZSwgYXR0cnMpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMudGFnKCcvJyArIHRhZ25hbWUpO1xuICAgIHRoaXMuY3IoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjb2RlKG5vZGUpIHtcbiAgdGhpcy50YWcoJ2NvZGUnKTtcbiAgdGhpcy5vdXQobm9kZS5saXRlcmFsKTtcbiAgdGhpcy50YWcoJy9jb2RlJyk7XG59XG5cbmZ1bmN0aW9uIGNvZGVfYmxvY2sobm9kZSkge1xuICB2YXIgaW5mb193b3JkcyA9IG5vZGUuaW5mbyA/IG5vZGUuaW5mby5zcGxpdCgvXFxzKy8pIDogW11cbiAgICAsIGF0dHJzID0gdGhpcy5hdHRycyhub2RlKTtcbiAgaWYgKGluZm9fd29yZHMubGVuZ3RoID4gMCAmJiBpbmZvX3dvcmRzWzBdLmxlbmd0aCA+IDApIHtcbiAgICBhdHRycy5wdXNoKFsnY2xhc3MnLCAnbGFuZ3VhZ2UtJyArIHRoaXMuZXNjKGluZm9fd29yZHNbMF0sIHRydWUpXSk7XG4gIH1cbiAgdGhpcy5jcigpO1xuICB0aGlzLnRhZygncHJlJyk7XG4gIHRoaXMudGFnKCdjb2RlJywgYXR0cnMpO1xuICB0aGlzLm91dChub2RlLmxpdGVyYWwpO1xuICB0aGlzLnRhZygnL2NvZGUnKTtcbiAgdGhpcy50YWcoJy9wcmUnKTtcbiAgdGhpcy5jcigpO1xufVxuXG5mdW5jdGlvbiB0aGVtYXRpY19icmVhayhub2RlKSB7XG4gIHZhciBhdHRycyA9IHRoaXMuYXR0cnMobm9kZSk7XG4gIHRoaXMuY3IoKTtcbiAgdGhpcy50YWcoJ2hyJywgYXR0cnMsIHRydWUpO1xuICB0aGlzLmNyKCk7XG59XG5cbmZ1bmN0aW9uIGJsb2NrX3F1b3RlKG5vZGUsIGVudGVyaW5nKSB7XG4gIHZhciBhdHRycyA9IHRoaXMuYXR0cnMobm9kZSk7XG4gIGlmIChlbnRlcmluZykge1xuICAgIHRoaXMuY3IoKTtcbiAgICB0aGlzLnRhZygnYmxvY2txdW90ZScsIGF0dHJzKTtcbiAgICB0aGlzLmNyKCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5jcigpO1xuICAgIHRoaXMudGFnKCcvYmxvY2txdW90ZScpO1xuICAgIHRoaXMuY3IoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBsaXN0KG5vZGUsIGVudGVyaW5nKSB7XG4gIHZhciB0YWduYW1lID0gbm9kZS5saXN0VHlwZSA9PT0gJ2J1bGxldCcgPyAndWwnIDogJ29sJ1xuICAgICwgYXR0cnMgPSB0aGlzLmF0dHJzKG5vZGUpO1xuXG4gIGlmIChlbnRlcmluZykge1xuICAgIHZhciBzdGFydCA9IG5vZGUubGlzdFN0YXJ0O1xuICAgIGlmIChzdGFydCAhPT0gbnVsbCAmJiBzdGFydCAhPT0gMSkge1xuICAgICAgYXR0cnMucHVzaChbJ3N0YXJ0Jywgc3RhcnQudG9TdHJpbmcoKV0pO1xuICAgIH1cbiAgICB0aGlzLmNyKCk7XG4gICAgdGhpcy50YWcodGFnbmFtZSwgYXR0cnMpO1xuICAgIHRoaXMuY3IoKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmNyKCk7XG4gICAgdGhpcy50YWcoJy8nICsgdGFnbmFtZSk7XG4gICAgdGhpcy5jcigpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGl0ZW0obm9kZSwgZW50ZXJpbmcpIHtcbiAgdmFyIGF0dHJzID0gdGhpcy5hdHRycyhub2RlKTtcbiAgaWYgKGVudGVyaW5nKSB7XG4gICAgdGhpcy50YWcoJ2xpJywgYXR0cnMpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMudGFnKCcvbGknKTtcbiAgICB0aGlzLmNyKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaHRtbF9pbmxpbmUobm9kZSkge1xuICBpZiAodGhpcy5vcHRpb25zLnNhZmUpIHtcbiAgICB0aGlzLmxpdCgnPCEtLSByYXcgSFRNTCBvbWl0dGVkIC0tPicpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMubGl0KG5vZGUubGl0ZXJhbCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gaHRtbF9ibG9jayhub2RlKSB7XG4gIHRoaXMuY3IoKTtcbiAgaWYgKHRoaXMub3B0aW9ucy5zYWZlKSB7XG4gICAgdGhpcy5saXQoJzwhLS0gcmF3IEhUTUwgb21pdHRlZCAtLT4nKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLmxpdChub2RlLmxpdGVyYWwpO1xuICB9XG4gIHRoaXMuY3IoKTtcbn1cblxuZnVuY3Rpb24gY3VzdG9tX2lubGluZShub2RlLCBlbnRlcmluZykge1xuICBpZiAoZW50ZXJpbmcgJiYgbm9kZS5vbkVudGVyKSB7XG4gICAgdGhpcy5saXQobm9kZS5vbkVudGVyKTtcbiAgfSBlbHNlIGlmICghZW50ZXJpbmcgJiYgbm9kZS5vbkV4aXQpIHtcbiAgICB0aGlzLmxpdChub2RlLm9uRXhpdCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY3VzdG9tX2Jsb2NrKG5vZGUsIGVudGVyaW5nKSB7XG4gIHRoaXMuY3IoKTtcbiAgaWYgKGVudGVyaW5nICYmIG5vZGUub25FbnRlcikge1xuICAgIHRoaXMubGl0KG5vZGUub25FbnRlcik7XG4gIH0gZWxzZSBpZiAoIWVudGVyaW5nICYmIG5vZGUub25FeGl0KSB7XG4gICAgdGhpcy5saXQobm9kZS5vbkV4aXQpO1xuICB9XG4gIHRoaXMuY3IoKTtcbn1cblxuLyogSGVscGVyIG1ldGhvZHMgKi9cblxuZnVuY3Rpb24gb3V0KHMpIHtcbiAgdGhpcy5saXQodGhpcy5lc2MocywgZmFsc2UpKTtcbn1cblxuZnVuY3Rpb24gYXR0cnMgKG5vZGUpIHtcbiAgdmFyIGF0dCA9IFtdO1xuICBpZiAodGhpcy5vcHRpb25zLnNvdXJjZXBvcykge1xuICAgIHZhciBwb3MgPSBub2RlLnNvdXJjZXBvcztcbiAgICBpZiAocG9zKSB7XG4gICAgICBhdHQucHVzaChbJ2RhdGEtc291cmNlcG9zJywgU3RyaW5nKHBvc1swXVswXSkgKyAnOicgK1xuICAgICAgICBTdHJpbmcocG9zWzBdWzFdKSArICctJyArIFN0cmluZyhwb3NbMV1bMF0pICsgJzonICtcbiAgICAgICAgU3RyaW5nKHBvc1sxXVsxXSldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGF0dDtcbn1cblxuLy8gcXVpY2sgYnJvd3Nlci1jb21wYXRpYmxlIGluaGVyaXRhbmNlXG5IdG1sUmVuZGVyZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShSZW5kZXJlci5wcm90b3R5cGUpO1xuXG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLnRleHQgPSB0ZXh0O1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5odG1sX2lubGluZSA9IGh0bWxfaW5saW5lO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5odG1sX2Jsb2NrID0gaHRtbF9ibG9jaztcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuc29mdGJyZWFrID0gc29mdGJyZWFrO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5saW5lYnJlYWsgPSBsaW5lYnJlYWs7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLmxpbmsgPSBsaW5rO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5pbWFnZSA9IGltYWdlO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5lbXBoID0gZW1waDtcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuc3Ryb25nID0gc3Ryb25nO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5wYXJhZ3JhcGggPSBwYXJhZ3JhcGg7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLmhlYWRpbmcgPSBoZWFkaW5nO1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5jb2RlID0gY29kZTtcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuY29kZV9ibG9jayA9IGNvZGVfYmxvY2s7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLnRoZW1hdGljX2JyZWFrID0gdGhlbWF0aWNfYnJlYWs7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLmJsb2NrX3F1b3RlID0gYmxvY2tfcXVvdGU7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLmxpc3QgPSBsaXN0O1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5pdGVtID0gaXRlbTtcbkh0bWxSZW5kZXJlci5wcm90b3R5cGUuY3VzdG9tX2lubGluZSA9IGN1c3RvbV9pbmxpbmU7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLmN1c3RvbV9ibG9jayA9IGN1c3RvbV9ibG9jaztcblxuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS5lc2MgPSByZXF1aXJlKCcuLi9jb21tb24nKS5lc2NhcGVYbWw7XG5cbkh0bWxSZW5kZXJlci5wcm90b3R5cGUub3V0ID0gb3V0O1xuSHRtbFJlbmRlcmVyLnByb3RvdHlwZS50YWcgPSB0YWc7XG5IdG1sUmVuZGVyZXIucHJvdG90eXBlLmF0dHJzID0gYXR0cnM7XG5cbm1vZHVsZS5leHBvcnRzID0gSHRtbFJlbmRlcmVyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIFJlbmRlcmVyKCkge31cblxuLyoqXG4gKiAgV2Fsa3MgdGhlIEFTVCBhbmQgY2FsbHMgbWVtYmVyIG1ldGhvZHMgZm9yIGVhY2ggTm9kZSB0eXBlLlxuICpcbiAqICBAcGFyYW0gYXN0IHtOb2RlfSBUaGUgcm9vdCBvZiB0aGUgYWJzdHJhY3Qgc3ludGF4IHRyZWUuXG4gKi9cbmZ1bmN0aW9uIHJlbmRlcihhc3QpIHtcbiAgdmFyIHdhbGtlciA9IGFzdC53YWxrZXIoKVxuICAgICwgZXZlbnRcbiAgICAsIHR5cGU7XG5cbiAgdGhpcy5idWZmZXIgPSAnJztcbiAgdGhpcy5sYXN0T3V0ID0gJ1xcbic7XG5cbiAgd2hpbGUoKGV2ZW50ID0gd2Fsa2VyLm5leHQoKSkpIHtcbiAgICB0eXBlID0gZXZlbnQubm9kZS50eXBlO1xuICAgIGlmICh0aGlzW3R5cGVdKSB7XG4gICAgICB0aGlzW3R5cGVdKGV2ZW50Lm5vZGUsIGV2ZW50LmVudGVyaW5nKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXMuYnVmZmVyO1xufVxuXG4vKipcbiAqICBDb25jYXRlbmF0ZSBhIGxpdGVyYWwgc3RyaW5nIHRvIHRoZSBidWZmZXIuXG4gKlxuICogIEBwYXJhbSBzdHIge1N0cmluZ30gVGhlIHN0cmluZyB0byBjb25jYXRlbmF0ZS5cbiAqL1xuZnVuY3Rpb24gbGl0KHN0cikge1xuICB0aGlzLmJ1ZmZlciArPSBzdHI7XG4gIHRoaXMubGFzdE91dCA9IHN0cjtcbn1cblxuLyoqXG4gKiAgT3V0cHV0IGEgbmV3bGluZSB0byB0aGUgYnVmZmVyLlxuICovXG5mdW5jdGlvbiBjcigpIHtcbiAgaWYgKHRoaXMubGFzdE91dCAhPT0gJ1xcbicpIHtcbiAgICB0aGlzLmxpdCgnXFxuJyk7XG4gIH1cbn1cblxuLyoqXG4gKiAgQ29uY2F0ZW5hdGUgYSBzdHJpbmcgdG8gdGhlIGJ1ZmZlciBwb3NzaWJseSBlc2NhcGluZyB0aGUgY29udGVudC5cbiAqXG4gKiAgQ29uY3JldGUgcmVuZGVyZXIgaW1wbGVtZW50YXRpb25zIHNob3VsZCBvdmVycmlkZSB0aGlzIG1ldGhvZC5cbiAqXG4gKiAgQHBhcmFtIHN0ciB7U3RyaW5nfSBUaGUgc3RyaW5nIHRvIGNvbmNhdGVuYXRlLlxuICovXG5mdW5jdGlvbiBvdXQoc3RyKSB7XG4gIHRoaXMubGl0KHN0cik7XG59XG5cbi8qKlxuICogIEVzY2FwZSBhIHN0cmluZyBmb3IgdGhlIHRhcmdldCByZW5kZXJlci5cbiAqXG4gKiAgQWJzdHJhY3QgZnVuY3Rpb24gdGhhdCBzaG91bGQgYmUgaW1wbGVtZW50ZWQgYnkgY29uY3JldGUgXG4gKiAgcmVuZGVyZXIgaW1wbGVtZW50YXRpb25zLlxuICpcbiAqICBAcGFyYW0gc3RyIHtTdHJpbmd9IFRoZSBzdHJpbmcgdG8gZXNjYXBlLlxuICovXG5mdW5jdGlvbiBlc2Moc3RyKSB7XG4gIHJldHVybiBzdHI7XG59XG5cblJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXIgPSByZW5kZXI7XG5SZW5kZXJlci5wcm90b3R5cGUub3V0ID0gb3V0O1xuUmVuZGVyZXIucHJvdG90eXBlLmxpdCA9IGxpdDtcblJlbmRlcmVyLnByb3RvdHlwZS5jciAgPSBjcjtcblJlbmRlcmVyLnByb3RvdHlwZS5lc2MgID0gZXNjO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJlbmRlcmVyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBSZW5kZXJlciA9IHJlcXVpcmUoJy4vcmVuZGVyZXInKTtcblxudmFyIHJlWE1MVGFnID0gL1xcPFtePl0qXFw+LztcblxuZnVuY3Rpb24gdG9UYWdOYW1lKHMpIHtcbiAgcmV0dXJuIHMucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgXCIkMV8kMlwiKS50b0xvd2VyQ2FzZSgpO1xufVxuXG5mdW5jdGlvbiBYbWxSZW5kZXJlcihvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gIHRoaXMuZGlzYWJsZVRhZ3MgPSAwO1xuICB0aGlzLmxhc3RPdXQgPSBcIlxcblwiO1xuXG4gIHRoaXMuaW5kZW50TGV2ZWwgPSAwO1xuICB0aGlzLmluZGVudCA9ICcgICc7XG5cbiAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbn1cblxuZnVuY3Rpb24gcmVuZGVyKGFzdCkge1xuXG4gIHRoaXMuYnVmZmVyID0gJyc7XG5cbiAgdmFyIGF0dHJzO1xuICB2YXIgdGFnbmFtZTtcbiAgdmFyIHdhbGtlciA9IGFzdC53YWxrZXIoKTtcbiAgdmFyIGV2ZW50LCBub2RlLCBlbnRlcmluZztcbiAgdmFyIGNvbnRhaW5lcjtcbiAgdmFyIHNlbGZDbG9zaW5nO1xuICB2YXIgbm9kZXR5cGU7XG5cbiAgdmFyIG9wdGlvbnMgPSB0aGlzLm9wdGlvbnM7XG5cbiAgaWYgKG9wdGlvbnMudGltZSkgeyBjb25zb2xlLnRpbWUoXCJyZW5kZXJpbmdcIik7IH1cblxuICB0aGlzLmJ1ZmZlciArPSAnPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIj8+XFxuJztcbiAgdGhpcy5idWZmZXIgKz0gJzwhRE9DVFlQRSBkb2N1bWVudCBTWVNURU0gXCJDb21tb25NYXJrLmR0ZFwiPlxcbic7XG5cbiAgd2hpbGUgKChldmVudCA9IHdhbGtlci5uZXh0KCkpKSB7XG4gICAgZW50ZXJpbmcgPSBldmVudC5lbnRlcmluZztcbiAgICBub2RlID0gZXZlbnQubm9kZTtcbiAgICBub2RldHlwZSA9IG5vZGUudHlwZTtcblxuICAgIGNvbnRhaW5lciA9IG5vZGUuaXNDb250YWluZXI7XG5cbiAgICBzZWxmQ2xvc2luZyA9IG5vZGV0eXBlID09PSAndGhlbWF0aWNfYnJlYWsnXG4gICAgICB8fCBub2RldHlwZSA9PT0gJ2xpbmVicmVhaydcbiAgICAgIHx8IG5vZGV0eXBlID09PSAnc29mdGJyZWFrJztcblxuICAgIHRhZ25hbWUgPSB0b1RhZ05hbWUobm9kZXR5cGUpO1xuXG4gICAgaWYgKGVudGVyaW5nKSB7XG5cbiAgICAgICAgYXR0cnMgPSBbXTtcblxuICAgICAgICBzd2l0Y2ggKG5vZGV0eXBlKSB7XG4gICAgICAgICAgY2FzZSAnZG9jdW1lbnQnOlxuICAgICAgICAgICAgYXR0cnMucHVzaChbJ3htbG5zJywgJ2h0dHA6Ly9jb21tb25tYXJrLm9yZy94bWwvMS4wJ10pO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbGlzdCc6XG4gICAgICAgICAgICBpZiAobm9kZS5saXN0VHlwZSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBhdHRycy5wdXNoKFsndHlwZScsIG5vZGUubGlzdFR5cGUudG9Mb3dlckNhc2UoKV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vZGUubGlzdFN0YXJ0ICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGF0dHJzLnB1c2goWydzdGFydCcsIFN0cmluZyhub2RlLmxpc3RTdGFydCldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChub2RlLmxpc3RUaWdodCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgICBhdHRycy5wdXNoKFsndGlnaHQnLCAobm9kZS5saXN0VGlnaHQgPyAndHJ1ZScgOiAnZmFsc2UnKV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIGRlbGltID0gbm9kZS5saXN0RGVsaW1pdGVyO1xuICAgICAgICAgICAgaWYgKGRlbGltICE9PSBudWxsKSB7XG4gICAgICAgICAgICAgIHZhciBkZWxpbXdvcmQgPSAnJztcbiAgICAgICAgICAgICAgaWYgKGRlbGltID09PSAnLicpIHtcbiAgICAgICAgICAgICAgICBkZWxpbXdvcmQgPSAncGVyaW9kJztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZWxpbXdvcmQgPSAncGFyZW4nO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGF0dHJzLnB1c2goWydkZWxpbWl0ZXInLCBkZWxpbXdvcmRdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2NvZGVfYmxvY2snOlxuICAgICAgICAgICAgaWYgKG5vZGUuaW5mbykge1xuICAgICAgICAgICAgICBhdHRycy5wdXNoKFsnaW5mbycsIG5vZGUuaW5mb10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnaGVhZGluZyc6XG4gICAgICAgICAgICBhdHRycy5wdXNoKFsnbGV2ZWwnLCBTdHJpbmcobm9kZS5sZXZlbCldKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2xpbmsnOlxuICAgICAgICAgIGNhc2UgJ2ltYWdlJzpcbiAgICAgICAgICAgIGF0dHJzLnB1c2goWydkZXN0aW5hdGlvbicsIG5vZGUuZGVzdGluYXRpb25dKTtcbiAgICAgICAgICAgIGF0dHJzLnB1c2goWyd0aXRsZScsIG5vZGUudGl0bGVdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ2N1c3RvbV9pbmxpbmUnOlxuICAgICAgICAgIGNhc2UgJ2N1c3RvbV9ibG9jayc6XG4gICAgICAgICAgICBhdHRycy5wdXNoKFsnb25fZW50ZXInLCBub2RlLm9uRW50ZXJdKTtcbiAgICAgICAgICAgIGF0dHJzLnB1c2goWydvbl9leGl0Jywgbm9kZS5vbkV4aXRdKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBpZiAob3B0aW9ucy5zb3VyY2Vwb3MpIHtcbiAgICAgICAgICB2YXIgcG9zID0gbm9kZS5zb3VyY2Vwb3M7XG4gICAgICAgICAgaWYgKHBvcykge1xuICAgICAgICAgICAgYXR0cnMucHVzaChbJ3NvdXJjZXBvcycsIFN0cmluZyhwb3NbMF1bMF0pICsgJzonICtcbiAgICAgICAgICAgICAgU3RyaW5nKHBvc1swXVsxXSkgKyAnLScgKyBTdHJpbmcocG9zWzFdWzBdKSArICc6JyArXG4gICAgICAgICAgICAgIFN0cmluZyhwb3NbMV1bMV0pXSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5jcigpO1xuICAgICAgICB0aGlzLm91dCh0aGlzLnRhZyh0YWduYW1lLCBhdHRycywgc2VsZkNsb3NpbmcpKTtcbiAgICAgICAgaWYgKGNvbnRhaW5lcikge1xuICAgICAgICAgIHRoaXMuaW5kZW50TGV2ZWwgKz0gMTtcbiAgICAgICAgfSBlbHNlIGlmICghY29udGFpbmVyICYmICFzZWxmQ2xvc2luZykge1xuICAgICAgICAgIHZhciBsaXQgPSBub2RlLmxpdGVyYWw7XG4gICAgICAgICAgaWYgKGxpdCkge1xuICAgICAgICAgICAgdGhpcy5vdXQodGhpcy5lc2MobGl0KSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoaXMub3V0KHRoaXMudGFnKCcvJyArIHRhZ25hbWUpKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluZGVudExldmVsIC09IDE7XG4gICAgICB0aGlzLmNyKCk7XG4gICAgICB0aGlzLm91dCh0aGlzLnRhZygnLycgKyB0YWduYW1lKSk7XG4gICAgfVxuICB9XG4gIGlmIChvcHRpb25zLnRpbWUpIHsgY29uc29sZS50aW1lRW5kKFwicmVuZGVyaW5nXCIpOyB9XG4gIHRoaXMuYnVmZmVyICs9ICdcXG4nO1xuICByZXR1cm4gdGhpcy5idWZmZXI7XG59XG5cbmZ1bmN0aW9uIG91dChzKSB7XG4gIGlmKHRoaXMuZGlzYWJsZVRhZ3MgPiAwKSB7XG4gICAgdGhpcy5idWZmZXIgKz0gcy5yZXBsYWNlKHJlWE1MVGFnLCAnJyk7XG4gIH1lbHNle1xuICAgIHRoaXMuYnVmZmVyICs9IHM7XG4gIH1cbiAgdGhpcy5sYXN0T3V0ID0gcztcbn1cblxuZnVuY3Rpb24gY3IoKSB7XG4gIGlmKHRoaXMubGFzdE91dCAhPT0gJ1xcbicpIHtcbiAgICB0aGlzLmJ1ZmZlciArPSAnXFxuJztcbiAgICB0aGlzLmxhc3RPdXQgPSAnXFxuJztcbiAgICBmb3IodmFyIGkgPSB0aGlzLmluZGVudExldmVsOyBpID4gMDsgaS0tKSB7XG4gICAgICB0aGlzLmJ1ZmZlciArPSB0aGlzLmluZGVudDtcbiAgICB9XG4gIH1cbn1cblxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIHByb2R1Y2UgYW4gWE1MIHRhZy5cbmZ1bmN0aW9uIHRhZyhuYW1lLCBhdHRycywgc2VsZmNsb3NpbmcpIHtcbiAgdmFyIHJlc3VsdCA9ICc8JyArIG5hbWU7XG4gIGlmKGF0dHJzICYmIGF0dHJzLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgaSA9IDA7XG4gICAgdmFyIGF0dHJpYjtcbiAgICB3aGlsZSAoKGF0dHJpYiA9IGF0dHJzW2ldKSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXN1bHQgKz0gJyAnICsgYXR0cmliWzBdICsgJz1cIicgKyB0aGlzLmVzYyhhdHRyaWJbMV0pICsgJ1wiJztcbiAgICAgIGkrKztcbiAgICB9XG4gIH1cbiAgaWYoc2VsZmNsb3NpbmcpIHtcbiAgICByZXN1bHQgKz0gJyAvJztcbiAgfVxuICByZXN1bHQgKz0gJz4nO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyBxdWljayBicm93c2VyLWNvbXBhdGlibGUgaW5oZXJpdGFuY2VcblhtbFJlbmRlcmVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVuZGVyZXIucHJvdG90eXBlKTtcblxuWG1sUmVuZGVyZXIucHJvdG90eXBlLnJlbmRlciA9IHJlbmRlcjtcblhtbFJlbmRlcmVyLnByb3RvdHlwZS5vdXQgPSBvdXQ7XG5YbWxSZW5kZXJlci5wcm90b3R5cGUuY3IgPSBjcjtcblhtbFJlbmRlcmVyLnByb3RvdHlwZS50YWcgPSB0YWc7XG5YbWxSZW5kZXJlci5wcm90b3R5cGUuZXNjID0gcmVxdWlyZSgnLi4vY29tbW9uJykuZXNjYXBlWG1sO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFhtbFJlbmRlcmVyO1xuIiwiJ3VzZSBzdHJpY3QnXG5cbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJlYWR5XG5cbmZ1bmN0aW9uIHJlYWR5IChjYWxsYmFjaykge1xuICBhc3NlcnQubm90RXF1YWwodHlwZW9mIGRvY3VtZW50LCAndW5kZWZpbmVkJywgJ2RvY3VtZW50LXJlYWR5IG9ubHkgcnVucyBpbiB0aGUgYnJvd3NlcicpXG4gIHZhciBzdGF0ZSA9IGRvY3VtZW50LnJlYWR5U3RhdGVcbiAgaWYgKHN0YXRlID09PSAnY29tcGxldGUnIHx8IHN0YXRlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gICAgcmV0dXJuIHNldFRpbWVvdXQoY2FsbGJhY2ssIDApXG4gIH1cblxuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgZnVuY3Rpb24gb25Mb2FkICgpIHtcbiAgICBjYWxsYmFjaygpXG4gIH0pXG59XG4iLCJ2YXIgZW5jb2RlID0gcmVxdWlyZShcIi4vbGliL2VuY29kZS5qc1wiKSxcbiAgICBkZWNvZGUgPSByZXF1aXJlKFwiLi9saWIvZGVjb2RlLmpzXCIpO1xuXG5leHBvcnRzLmRlY29kZSA9IGZ1bmN0aW9uKGRhdGEsIGxldmVsKXtcblx0cmV0dXJuICghbGV2ZWwgfHwgbGV2ZWwgPD0gMCA/IGRlY29kZS5YTUwgOiBkZWNvZGUuSFRNTCkoZGF0YSk7XG59O1xuXG5leHBvcnRzLmRlY29kZVN0cmljdCA9IGZ1bmN0aW9uKGRhdGEsIGxldmVsKXtcblx0cmV0dXJuICghbGV2ZWwgfHwgbGV2ZWwgPD0gMCA/IGRlY29kZS5YTUwgOiBkZWNvZGUuSFRNTFN0cmljdCkoZGF0YSk7XG59O1xuXG5leHBvcnRzLmVuY29kZSA9IGZ1bmN0aW9uKGRhdGEsIGxldmVsKXtcblx0cmV0dXJuICghbGV2ZWwgfHwgbGV2ZWwgPD0gMCA/IGVuY29kZS5YTUwgOiBlbmNvZGUuSFRNTCkoZGF0YSk7XG59O1xuXG5leHBvcnRzLmVuY29kZVhNTCA9IGVuY29kZS5YTUw7XG5cbmV4cG9ydHMuZW5jb2RlSFRNTDQgPVxuZXhwb3J0cy5lbmNvZGVIVE1MNSA9XG5leHBvcnRzLmVuY29kZUhUTUwgID0gZW5jb2RlLkhUTUw7XG5cbmV4cG9ydHMuZGVjb2RlWE1MID1cbmV4cG9ydHMuZGVjb2RlWE1MU3RyaWN0ID0gZGVjb2RlLlhNTDtcblxuZXhwb3J0cy5kZWNvZGVIVE1MNCA9XG5leHBvcnRzLmRlY29kZUhUTUw1ID1cbmV4cG9ydHMuZGVjb2RlSFRNTCA9IGRlY29kZS5IVE1MO1xuXG5leHBvcnRzLmRlY29kZUhUTUw0U3RyaWN0ID1cbmV4cG9ydHMuZGVjb2RlSFRNTDVTdHJpY3QgPVxuZXhwb3J0cy5kZWNvZGVIVE1MU3RyaWN0ID0gZGVjb2RlLkhUTUxTdHJpY3Q7XG5cbmV4cG9ydHMuZXNjYXBlID0gZW5jb2RlLmVzY2FwZTtcbiIsInZhciBlbnRpdHlNYXAgPSByZXF1aXJlKFwiLi4vbWFwcy9lbnRpdGllcy5qc29uXCIpLFxuICAgIGxlZ2FjeU1hcCA9IHJlcXVpcmUoXCIuLi9tYXBzL2xlZ2FjeS5qc29uXCIpLFxuICAgIHhtbE1hcCAgICA9IHJlcXVpcmUoXCIuLi9tYXBzL3htbC5qc29uXCIpLFxuICAgIGRlY29kZUNvZGVQb2ludCA9IHJlcXVpcmUoXCIuL2RlY29kZV9jb2RlcG9pbnQuanNcIik7XG5cbnZhciBkZWNvZGVYTUxTdHJpY3QgID0gZ2V0U3RyaWN0RGVjb2Rlcih4bWxNYXApLFxuICAgIGRlY29kZUhUTUxTdHJpY3QgPSBnZXRTdHJpY3REZWNvZGVyKGVudGl0eU1hcCk7XG5cbmZ1bmN0aW9uIGdldFN0cmljdERlY29kZXIobWFwKXtcblx0dmFyIGtleXMgPSBPYmplY3Qua2V5cyhtYXApLmpvaW4oXCJ8XCIpLFxuXHQgICAgcmVwbGFjZSA9IGdldFJlcGxhY2VyKG1hcCk7XG5cblx0a2V5cyArPSBcInwjW3hYXVtcXFxcZGEtZkEtRl0rfCNcXFxcZCtcIjtcblxuXHR2YXIgcmUgPSBuZXcgUmVnRXhwKFwiJig/OlwiICsga2V5cyArIFwiKTtcIiwgXCJnXCIpO1xuXG5cdHJldHVybiBmdW5jdGlvbihzdHIpe1xuXHRcdHJldHVybiBTdHJpbmcoc3RyKS5yZXBsYWNlKHJlLCByZXBsYWNlKTtcblx0fTtcbn1cblxudmFyIGRlY29kZUhUTUwgPSAoZnVuY3Rpb24oKXtcblx0dmFyIGxlZ2FjeSA9IE9iamVjdC5rZXlzKGxlZ2FjeU1hcClcblx0XHQuc29ydChzb3J0ZXIpO1xuXG5cdHZhciBrZXlzID0gT2JqZWN0LmtleXMoZW50aXR5TWFwKVxuXHRcdC5zb3J0KHNvcnRlcik7XG5cblx0Zm9yKHZhciBpID0gMCwgaiA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKXtcblx0XHRpZihsZWdhY3lbal0gPT09IGtleXNbaV0pe1xuXHRcdFx0a2V5c1tpXSArPSBcIjs/XCI7XG5cdFx0XHRqKys7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGtleXNbaV0gKz0gXCI7XCI7XG5cdFx0fVxuXHR9XG5cblx0dmFyIHJlID0gbmV3IFJlZ0V4cChcIiYoPzpcIiArIGtleXMuam9pbihcInxcIikgKyBcInwjW3hYXVtcXFxcZGEtZkEtRl0rOz98I1xcXFxkKzs/KVwiLCBcImdcIiksXG5cdCAgICByZXBsYWNlID0gZ2V0UmVwbGFjZXIoZW50aXR5TWFwKTtcblxuXHRmdW5jdGlvbiByZXBsYWNlcihzdHIpe1xuXHRcdGlmKHN0ci5zdWJzdHIoLTEpICE9PSBcIjtcIikgc3RyICs9IFwiO1wiO1xuXHRcdHJldHVybiByZXBsYWNlKHN0cik7XG5cdH1cblxuXHQvL1RPRE8gY29uc2lkZXIgY3JlYXRpbmcgYSBtZXJnZWQgbWFwXG5cdHJldHVybiBmdW5jdGlvbihzdHIpe1xuXHRcdHJldHVybiBTdHJpbmcoc3RyKS5yZXBsYWNlKHJlLCByZXBsYWNlcik7XG5cdH07XG59KCkpO1xuXG5mdW5jdGlvbiBzb3J0ZXIoYSwgYil7XG5cdHJldHVybiBhIDwgYiA/IDEgOiAtMTtcbn1cblxuZnVuY3Rpb24gZ2V0UmVwbGFjZXIobWFwKXtcblx0cmV0dXJuIGZ1bmN0aW9uIHJlcGxhY2Uoc3RyKXtcblx0XHRpZihzdHIuY2hhckF0KDEpID09PSBcIiNcIil7XG5cdFx0XHRpZihzdHIuY2hhckF0KDIpID09PSBcIlhcIiB8fCBzdHIuY2hhckF0KDIpID09PSBcInhcIil7XG5cdFx0XHRcdHJldHVybiBkZWNvZGVDb2RlUG9pbnQocGFyc2VJbnQoc3RyLnN1YnN0cigzKSwgMTYpKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBkZWNvZGVDb2RlUG9pbnQocGFyc2VJbnQoc3RyLnN1YnN0cigyKSwgMTApKTtcblx0XHR9XG5cdFx0cmV0dXJuIG1hcFtzdHIuc2xpY2UoMSwgLTEpXTtcblx0fTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdFhNTDogZGVjb2RlWE1MU3RyaWN0LFxuXHRIVE1MOiBkZWNvZGVIVE1MLFxuXHRIVE1MU3RyaWN0OiBkZWNvZGVIVE1MU3RyaWN0XG59OyIsInZhciBkZWNvZGVNYXAgPSByZXF1aXJlKFwiLi4vbWFwcy9kZWNvZGUuanNvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBkZWNvZGVDb2RlUG9pbnQ7XG5cbi8vIG1vZGlmaWVkIHZlcnNpb24gb2YgaHR0cHM6Ly9naXRodWIuY29tL21hdGhpYXNieW5lbnMvaGUvYmxvYi9tYXN0ZXIvc3JjL2hlLmpzI0w5NC1MMTE5XG5mdW5jdGlvbiBkZWNvZGVDb2RlUG9pbnQoY29kZVBvaW50KXtcblxuXHRpZigoY29kZVBvaW50ID49IDB4RDgwMCAmJiBjb2RlUG9pbnQgPD0gMHhERkZGKSB8fCBjb2RlUG9pbnQgPiAweDEwRkZGRil7XG5cdFx0cmV0dXJuIFwiXFx1RkZGRFwiO1xuXHR9XG5cblx0aWYoY29kZVBvaW50IGluIGRlY29kZU1hcCl7XG5cdFx0Y29kZVBvaW50ID0gZGVjb2RlTWFwW2NvZGVQb2ludF07XG5cdH1cblxuXHR2YXIgb3V0cHV0ID0gXCJcIjtcblxuXHRpZihjb2RlUG9pbnQgPiAweEZGRkYpe1xuXHRcdGNvZGVQb2ludCAtPSAweDEwMDAwO1xuXHRcdG91dHB1dCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGVQb2ludCA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMCk7XG5cdFx0Y29kZVBvaW50ID0gMHhEQzAwIHwgY29kZVBvaW50ICYgMHgzRkY7XG5cdH1cblxuXHRvdXRwdXQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlUG9pbnQpO1xuXHRyZXR1cm4gb3V0cHV0O1xufVxuIiwidmFyIGludmVyc2VYTUwgPSBnZXRJbnZlcnNlT2JqKHJlcXVpcmUoXCIuLi9tYXBzL3htbC5qc29uXCIpKSxcbiAgICB4bWxSZXBsYWNlciA9IGdldEludmVyc2VSZXBsYWNlcihpbnZlcnNlWE1MKTtcblxuZXhwb3J0cy5YTUwgPSBnZXRJbnZlcnNlKGludmVyc2VYTUwsIHhtbFJlcGxhY2VyKTtcblxudmFyIGludmVyc2VIVE1MID0gZ2V0SW52ZXJzZU9iaihyZXF1aXJlKFwiLi4vbWFwcy9lbnRpdGllcy5qc29uXCIpKSxcbiAgICBodG1sUmVwbGFjZXIgPSBnZXRJbnZlcnNlUmVwbGFjZXIoaW52ZXJzZUhUTUwpO1xuXG5leHBvcnRzLkhUTUwgPSBnZXRJbnZlcnNlKGludmVyc2VIVE1MLCBodG1sUmVwbGFjZXIpO1xuXG5mdW5jdGlvbiBnZXRJbnZlcnNlT2JqKG9iail7XG5cdHJldHVybiBPYmplY3Qua2V5cyhvYmopLnNvcnQoKS5yZWR1Y2UoZnVuY3Rpb24oaW52ZXJzZSwgbmFtZSl7XG5cdFx0aW52ZXJzZVtvYmpbbmFtZV1dID0gXCImXCIgKyBuYW1lICsgXCI7XCI7XG5cdFx0cmV0dXJuIGludmVyc2U7XG5cdH0sIHt9KTtcbn1cblxuZnVuY3Rpb24gZ2V0SW52ZXJzZVJlcGxhY2VyKGludmVyc2Upe1xuXHR2YXIgc2luZ2xlID0gW10sXG5cdCAgICBtdWx0aXBsZSA9IFtdO1xuXG5cdE9iamVjdC5rZXlzKGludmVyc2UpLmZvckVhY2goZnVuY3Rpb24oayl7XG5cdFx0aWYoay5sZW5ndGggPT09IDEpe1xuXHRcdFx0c2luZ2xlLnB1c2goXCJcXFxcXCIgKyBrKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bXVsdGlwbGUucHVzaChrKTtcblx0XHR9XG5cdH0pO1xuXG5cdC8vVE9ETyBhZGQgcmFuZ2VzXG5cdG11bHRpcGxlLnVuc2hpZnQoXCJbXCIgKyBzaW5nbGUuam9pbihcIlwiKSArIFwiXVwiKTtcblxuXHRyZXR1cm4gbmV3IFJlZ0V4cChtdWx0aXBsZS5qb2luKFwifFwiKSwgXCJnXCIpO1xufVxuXG52YXIgcmVfbm9uQVNDSUkgPSAvW15cXDAtXFx4N0ZdL2csXG4gICAgcmVfYXN0cmFsU3ltYm9scyA9IC9bXFx1RDgwMC1cXHVEQkZGXVtcXHVEQzAwLVxcdURGRkZdL2c7XG5cbmZ1bmN0aW9uIHNpbmdsZUNoYXJSZXBsYWNlcihjKXtcblx0cmV0dXJuIFwiJiN4XCIgKyBjLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyBcIjtcIjtcbn1cblxuZnVuY3Rpb24gYXN0cmFsUmVwbGFjZXIoYyl7XG5cdC8vIGh0dHA6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmcjc3Vycm9nYXRlLWZvcm11bGFlXG5cdHZhciBoaWdoID0gYy5jaGFyQ29kZUF0KDApO1xuXHR2YXIgbG93ICA9IGMuY2hhckNvZGVBdCgxKTtcblx0dmFyIGNvZGVQb2ludCA9IChoaWdoIC0gMHhEODAwKSAqIDB4NDAwICsgbG93IC0gMHhEQzAwICsgMHgxMDAwMDtcblx0cmV0dXJuIFwiJiN4XCIgKyBjb2RlUG9pbnQudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyBcIjtcIjtcbn1cblxuZnVuY3Rpb24gZ2V0SW52ZXJzZShpbnZlcnNlLCByZSl7XG5cdGZ1bmN0aW9uIGZ1bmMobmFtZSl7XG5cdFx0cmV0dXJuIGludmVyc2VbbmFtZV07XG5cdH1cblxuXHRyZXR1cm4gZnVuY3Rpb24oZGF0YSl7XG5cdFx0cmV0dXJuIGRhdGFcblx0XHRcdFx0LnJlcGxhY2UocmUsIGZ1bmMpXG5cdFx0XHRcdC5yZXBsYWNlKHJlX2FzdHJhbFN5bWJvbHMsIGFzdHJhbFJlcGxhY2VyKVxuXHRcdFx0XHQucmVwbGFjZShyZV9ub25BU0NJSSwgc2luZ2xlQ2hhclJlcGxhY2VyKTtcblx0fTtcbn1cblxudmFyIHJlX3htbENoYXJzID0gZ2V0SW52ZXJzZVJlcGxhY2VyKGludmVyc2VYTUwpO1xuXG5mdW5jdGlvbiBlc2NhcGVYTUwoZGF0YSl7XG5cdHJldHVybiBkYXRhXG5cdFx0XHQucmVwbGFjZShyZV94bWxDaGFycywgc2luZ2xlQ2hhclJlcGxhY2VyKVxuXHRcdFx0LnJlcGxhY2UocmVfYXN0cmFsU3ltYm9scywgYXN0cmFsUmVwbGFjZXIpXG5cdFx0XHQucmVwbGFjZShyZV9ub25BU0NJSSwgc2luZ2xlQ2hhclJlcGxhY2VyKTtcbn1cblxuZXhwb3J0cy5lc2NhcGUgPSBlc2NhcGVYTUw7XG4iLCJtb2R1bGUuZXhwb3J0cz17XCIwXCI6NjU1MzMsXCIxMjhcIjo4MzY0LFwiMTMwXCI6ODIxOCxcIjEzMVwiOjQwMixcIjEzMlwiOjgyMjIsXCIxMzNcIjo4MjMwLFwiMTM0XCI6ODIyNCxcIjEzNVwiOjgyMjUsXCIxMzZcIjo3MTAsXCIxMzdcIjo4MjQwLFwiMTM4XCI6MzUyLFwiMTM5XCI6ODI0OSxcIjE0MFwiOjMzOCxcIjE0MlwiOjM4MSxcIjE0NVwiOjgyMTYsXCIxNDZcIjo4MjE3LFwiMTQ3XCI6ODIyMCxcIjE0OFwiOjgyMjEsXCIxNDlcIjo4MjI2LFwiMTUwXCI6ODIxMSxcIjE1MVwiOjgyMTIsXCIxNTJcIjo3MzIsXCIxNTNcIjo4NDgyLFwiMTU0XCI6MzUzLFwiMTU1XCI6ODI1MCxcIjE1NlwiOjMzOSxcIjE1OFwiOjM4MixcIjE1OVwiOjM3Nn0iLCJtb2R1bGUuZXhwb3J0cz17XCJBYWN1dGVcIjpcIlxcdTAwQzFcIixcImFhY3V0ZVwiOlwiXFx1MDBFMVwiLFwiQWJyZXZlXCI6XCJcXHUwMTAyXCIsXCJhYnJldmVcIjpcIlxcdTAxMDNcIixcImFjXCI6XCJcXHUyMjNFXCIsXCJhY2RcIjpcIlxcdTIyM0ZcIixcImFjRVwiOlwiXFx1MjIzRVxcdTAzMzNcIixcIkFjaXJjXCI6XCJcXHUwMEMyXCIsXCJhY2lyY1wiOlwiXFx1MDBFMlwiLFwiYWN1dGVcIjpcIlxcdTAwQjRcIixcIkFjeVwiOlwiXFx1MDQxMFwiLFwiYWN5XCI6XCJcXHUwNDMwXCIsXCJBRWxpZ1wiOlwiXFx1MDBDNlwiLFwiYWVsaWdcIjpcIlxcdTAwRTZcIixcImFmXCI6XCJcXHUyMDYxXCIsXCJBZnJcIjpcIlxcdUQ4MzVcXHVERDA0XCIsXCJhZnJcIjpcIlxcdUQ4MzVcXHVERDFFXCIsXCJBZ3JhdmVcIjpcIlxcdTAwQzBcIixcImFncmF2ZVwiOlwiXFx1MDBFMFwiLFwiYWxlZnN5bVwiOlwiXFx1MjEzNVwiLFwiYWxlcGhcIjpcIlxcdTIxMzVcIixcIkFscGhhXCI6XCJcXHUwMzkxXCIsXCJhbHBoYVwiOlwiXFx1MDNCMVwiLFwiQW1hY3JcIjpcIlxcdTAxMDBcIixcImFtYWNyXCI6XCJcXHUwMTAxXCIsXCJhbWFsZ1wiOlwiXFx1MkEzRlwiLFwiYW1wXCI6XCImXCIsXCJBTVBcIjpcIiZcIixcImFuZGFuZFwiOlwiXFx1MkE1NVwiLFwiQW5kXCI6XCJcXHUyQTUzXCIsXCJhbmRcIjpcIlxcdTIyMjdcIixcImFuZGRcIjpcIlxcdTJBNUNcIixcImFuZHNsb3BlXCI6XCJcXHUyQTU4XCIsXCJhbmR2XCI6XCJcXHUyQTVBXCIsXCJhbmdcIjpcIlxcdTIyMjBcIixcImFuZ2VcIjpcIlxcdTI5QTRcIixcImFuZ2xlXCI6XCJcXHUyMjIwXCIsXCJhbmdtc2RhYVwiOlwiXFx1MjlBOFwiLFwiYW5nbXNkYWJcIjpcIlxcdTI5QTlcIixcImFuZ21zZGFjXCI6XCJcXHUyOUFBXCIsXCJhbmdtc2RhZFwiOlwiXFx1MjlBQlwiLFwiYW5nbXNkYWVcIjpcIlxcdTI5QUNcIixcImFuZ21zZGFmXCI6XCJcXHUyOUFEXCIsXCJhbmdtc2RhZ1wiOlwiXFx1MjlBRVwiLFwiYW5nbXNkYWhcIjpcIlxcdTI5QUZcIixcImFuZ21zZFwiOlwiXFx1MjIyMVwiLFwiYW5ncnRcIjpcIlxcdTIyMUZcIixcImFuZ3J0dmJcIjpcIlxcdTIyQkVcIixcImFuZ3J0dmJkXCI6XCJcXHUyOTlEXCIsXCJhbmdzcGhcIjpcIlxcdTIyMjJcIixcImFuZ3N0XCI6XCJcXHUwMEM1XCIsXCJhbmd6YXJyXCI6XCJcXHUyMzdDXCIsXCJBb2dvblwiOlwiXFx1MDEwNFwiLFwiYW9nb25cIjpcIlxcdTAxMDVcIixcIkFvcGZcIjpcIlxcdUQ4MzVcXHVERDM4XCIsXCJhb3BmXCI6XCJcXHVEODM1XFx1REQ1MlwiLFwiYXBhY2lyXCI6XCJcXHUyQTZGXCIsXCJhcFwiOlwiXFx1MjI0OFwiLFwiYXBFXCI6XCJcXHUyQTcwXCIsXCJhcGVcIjpcIlxcdTIyNEFcIixcImFwaWRcIjpcIlxcdTIyNEJcIixcImFwb3NcIjpcIidcIixcIkFwcGx5RnVuY3Rpb25cIjpcIlxcdTIwNjFcIixcImFwcHJveFwiOlwiXFx1MjI0OFwiLFwiYXBwcm94ZXFcIjpcIlxcdTIyNEFcIixcIkFyaW5nXCI6XCJcXHUwMEM1XCIsXCJhcmluZ1wiOlwiXFx1MDBFNVwiLFwiQXNjclwiOlwiXFx1RDgzNVxcdURDOUNcIixcImFzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I2XCIsXCJBc3NpZ25cIjpcIlxcdTIyNTRcIixcImFzdFwiOlwiKlwiLFwiYXN5bXBcIjpcIlxcdTIyNDhcIixcImFzeW1wZXFcIjpcIlxcdTIyNERcIixcIkF0aWxkZVwiOlwiXFx1MDBDM1wiLFwiYXRpbGRlXCI6XCJcXHUwMEUzXCIsXCJBdW1sXCI6XCJcXHUwMEM0XCIsXCJhdW1sXCI6XCJcXHUwMEU0XCIsXCJhd2NvbmludFwiOlwiXFx1MjIzM1wiLFwiYXdpbnRcIjpcIlxcdTJBMTFcIixcImJhY2tjb25nXCI6XCJcXHUyMjRDXCIsXCJiYWNrZXBzaWxvblwiOlwiXFx1MDNGNlwiLFwiYmFja3ByaW1lXCI6XCJcXHUyMDM1XCIsXCJiYWNrc2ltXCI6XCJcXHUyMjNEXCIsXCJiYWNrc2ltZXFcIjpcIlxcdTIyQ0RcIixcIkJhY2tzbGFzaFwiOlwiXFx1MjIxNlwiLFwiQmFydlwiOlwiXFx1MkFFN1wiLFwiYmFydmVlXCI6XCJcXHUyMkJEXCIsXCJiYXJ3ZWRcIjpcIlxcdTIzMDVcIixcIkJhcndlZFwiOlwiXFx1MjMwNlwiLFwiYmFyd2VkZ2VcIjpcIlxcdTIzMDVcIixcImJicmtcIjpcIlxcdTIzQjVcIixcImJicmt0YnJrXCI6XCJcXHUyM0I2XCIsXCJiY29uZ1wiOlwiXFx1MjI0Q1wiLFwiQmN5XCI6XCJcXHUwNDExXCIsXCJiY3lcIjpcIlxcdTA0MzFcIixcImJkcXVvXCI6XCJcXHUyMDFFXCIsXCJiZWNhdXNcIjpcIlxcdTIyMzVcIixcImJlY2F1c2VcIjpcIlxcdTIyMzVcIixcIkJlY2F1c2VcIjpcIlxcdTIyMzVcIixcImJlbXB0eXZcIjpcIlxcdTI5QjBcIixcImJlcHNpXCI6XCJcXHUwM0Y2XCIsXCJiZXJub3VcIjpcIlxcdTIxMkNcIixcIkJlcm5vdWxsaXNcIjpcIlxcdTIxMkNcIixcIkJldGFcIjpcIlxcdTAzOTJcIixcImJldGFcIjpcIlxcdTAzQjJcIixcImJldGhcIjpcIlxcdTIxMzZcIixcImJldHdlZW5cIjpcIlxcdTIyNkNcIixcIkJmclwiOlwiXFx1RDgzNVxcdUREMDVcIixcImJmclwiOlwiXFx1RDgzNVxcdUREMUZcIixcImJpZ2NhcFwiOlwiXFx1MjJDMlwiLFwiYmlnY2lyY1wiOlwiXFx1MjVFRlwiLFwiYmlnY3VwXCI6XCJcXHUyMkMzXCIsXCJiaWdvZG90XCI6XCJcXHUyQTAwXCIsXCJiaWdvcGx1c1wiOlwiXFx1MkEwMVwiLFwiYmlnb3RpbWVzXCI6XCJcXHUyQTAyXCIsXCJiaWdzcWN1cFwiOlwiXFx1MkEwNlwiLFwiYmlnc3RhclwiOlwiXFx1MjYwNVwiLFwiYmlndHJpYW5nbGVkb3duXCI6XCJcXHUyNUJEXCIsXCJiaWd0cmlhbmdsZXVwXCI6XCJcXHUyNUIzXCIsXCJiaWd1cGx1c1wiOlwiXFx1MkEwNFwiLFwiYmlndmVlXCI6XCJcXHUyMkMxXCIsXCJiaWd3ZWRnZVwiOlwiXFx1MjJDMFwiLFwiYmthcm93XCI6XCJcXHUyOTBEXCIsXCJibGFja2xvemVuZ2VcIjpcIlxcdTI5RUJcIixcImJsYWNrc3F1YXJlXCI6XCJcXHUyNUFBXCIsXCJibGFja3RyaWFuZ2xlXCI6XCJcXHUyNUI0XCIsXCJibGFja3RyaWFuZ2xlZG93blwiOlwiXFx1MjVCRVwiLFwiYmxhY2t0cmlhbmdsZWxlZnRcIjpcIlxcdTI1QzJcIixcImJsYWNrdHJpYW5nbGVyaWdodFwiOlwiXFx1MjVCOFwiLFwiYmxhbmtcIjpcIlxcdTI0MjNcIixcImJsazEyXCI6XCJcXHUyNTkyXCIsXCJibGsxNFwiOlwiXFx1MjU5MVwiLFwiYmxrMzRcIjpcIlxcdTI1OTNcIixcImJsb2NrXCI6XCJcXHUyNTg4XCIsXCJibmVcIjpcIj1cXHUyMEU1XCIsXCJibmVxdWl2XCI6XCJcXHUyMjYxXFx1MjBFNVwiLFwiYk5vdFwiOlwiXFx1MkFFRFwiLFwiYm5vdFwiOlwiXFx1MjMxMFwiLFwiQm9wZlwiOlwiXFx1RDgzNVxcdUREMzlcIixcImJvcGZcIjpcIlxcdUQ4MzVcXHVERDUzXCIsXCJib3RcIjpcIlxcdTIyQTVcIixcImJvdHRvbVwiOlwiXFx1MjJBNVwiLFwiYm93dGllXCI6XCJcXHUyMkM4XCIsXCJib3hib3hcIjpcIlxcdTI5QzlcIixcImJveGRsXCI6XCJcXHUyNTEwXCIsXCJib3hkTFwiOlwiXFx1MjU1NVwiLFwiYm94RGxcIjpcIlxcdTI1NTZcIixcImJveERMXCI6XCJcXHUyNTU3XCIsXCJib3hkclwiOlwiXFx1MjUwQ1wiLFwiYm94ZFJcIjpcIlxcdTI1NTJcIixcImJveERyXCI6XCJcXHUyNTUzXCIsXCJib3hEUlwiOlwiXFx1MjU1NFwiLFwiYm94aFwiOlwiXFx1MjUwMFwiLFwiYm94SFwiOlwiXFx1MjU1MFwiLFwiYm94aGRcIjpcIlxcdTI1MkNcIixcImJveEhkXCI6XCJcXHUyNTY0XCIsXCJib3hoRFwiOlwiXFx1MjU2NVwiLFwiYm94SERcIjpcIlxcdTI1NjZcIixcImJveGh1XCI6XCJcXHUyNTM0XCIsXCJib3hIdVwiOlwiXFx1MjU2N1wiLFwiYm94aFVcIjpcIlxcdTI1NjhcIixcImJveEhVXCI6XCJcXHUyNTY5XCIsXCJib3htaW51c1wiOlwiXFx1MjI5RlwiLFwiYm94cGx1c1wiOlwiXFx1MjI5RVwiLFwiYm94dGltZXNcIjpcIlxcdTIyQTBcIixcImJveHVsXCI6XCJcXHUyNTE4XCIsXCJib3h1TFwiOlwiXFx1MjU1QlwiLFwiYm94VWxcIjpcIlxcdTI1NUNcIixcImJveFVMXCI6XCJcXHUyNTVEXCIsXCJib3h1clwiOlwiXFx1MjUxNFwiLFwiYm94dVJcIjpcIlxcdTI1NThcIixcImJveFVyXCI6XCJcXHUyNTU5XCIsXCJib3hVUlwiOlwiXFx1MjU1QVwiLFwiYm94dlwiOlwiXFx1MjUwMlwiLFwiYm94VlwiOlwiXFx1MjU1MVwiLFwiYm94dmhcIjpcIlxcdTI1M0NcIixcImJveHZIXCI6XCJcXHUyNTZBXCIsXCJib3hWaFwiOlwiXFx1MjU2QlwiLFwiYm94VkhcIjpcIlxcdTI1NkNcIixcImJveHZsXCI6XCJcXHUyNTI0XCIsXCJib3h2TFwiOlwiXFx1MjU2MVwiLFwiYm94VmxcIjpcIlxcdTI1NjJcIixcImJveFZMXCI6XCJcXHUyNTYzXCIsXCJib3h2clwiOlwiXFx1MjUxQ1wiLFwiYm94dlJcIjpcIlxcdTI1NUVcIixcImJveFZyXCI6XCJcXHUyNTVGXCIsXCJib3hWUlwiOlwiXFx1MjU2MFwiLFwiYnByaW1lXCI6XCJcXHUyMDM1XCIsXCJicmV2ZVwiOlwiXFx1MDJEOFwiLFwiQnJldmVcIjpcIlxcdTAyRDhcIixcImJydmJhclwiOlwiXFx1MDBBNlwiLFwiYnNjclwiOlwiXFx1RDgzNVxcdURDQjdcIixcIkJzY3JcIjpcIlxcdTIxMkNcIixcImJzZW1pXCI6XCJcXHUyMDRGXCIsXCJic2ltXCI6XCJcXHUyMjNEXCIsXCJic2ltZVwiOlwiXFx1MjJDRFwiLFwiYnNvbGJcIjpcIlxcdTI5QzVcIixcImJzb2xcIjpcIlxcXFxcIixcImJzb2xoc3ViXCI6XCJcXHUyN0M4XCIsXCJidWxsXCI6XCJcXHUyMDIyXCIsXCJidWxsZXRcIjpcIlxcdTIwMjJcIixcImJ1bXBcIjpcIlxcdTIyNEVcIixcImJ1bXBFXCI6XCJcXHUyQUFFXCIsXCJidW1wZVwiOlwiXFx1MjI0RlwiLFwiQnVtcGVxXCI6XCJcXHUyMjRFXCIsXCJidW1wZXFcIjpcIlxcdTIyNEZcIixcIkNhY3V0ZVwiOlwiXFx1MDEwNlwiLFwiY2FjdXRlXCI6XCJcXHUwMTA3XCIsXCJjYXBhbmRcIjpcIlxcdTJBNDRcIixcImNhcGJyY3VwXCI6XCJcXHUyQTQ5XCIsXCJjYXBjYXBcIjpcIlxcdTJBNEJcIixcImNhcFwiOlwiXFx1MjIyOVwiLFwiQ2FwXCI6XCJcXHUyMkQyXCIsXCJjYXBjdXBcIjpcIlxcdTJBNDdcIixcImNhcGRvdFwiOlwiXFx1MkE0MFwiLFwiQ2FwaXRhbERpZmZlcmVudGlhbERcIjpcIlxcdTIxNDVcIixcImNhcHNcIjpcIlxcdTIyMjlcXHVGRTAwXCIsXCJjYXJldFwiOlwiXFx1MjA0MVwiLFwiY2Fyb25cIjpcIlxcdTAyQzdcIixcIkNheWxleXNcIjpcIlxcdTIxMkRcIixcImNjYXBzXCI6XCJcXHUyQTREXCIsXCJDY2Fyb25cIjpcIlxcdTAxMENcIixcImNjYXJvblwiOlwiXFx1MDEwRFwiLFwiQ2NlZGlsXCI6XCJcXHUwMEM3XCIsXCJjY2VkaWxcIjpcIlxcdTAwRTdcIixcIkNjaXJjXCI6XCJcXHUwMTA4XCIsXCJjY2lyY1wiOlwiXFx1MDEwOVwiLFwiQ2NvbmludFwiOlwiXFx1MjIzMFwiLFwiY2N1cHNcIjpcIlxcdTJBNENcIixcImNjdXBzc21cIjpcIlxcdTJBNTBcIixcIkNkb3RcIjpcIlxcdTAxMEFcIixcImNkb3RcIjpcIlxcdTAxMEJcIixcImNlZGlsXCI6XCJcXHUwMEI4XCIsXCJDZWRpbGxhXCI6XCJcXHUwMEI4XCIsXCJjZW1wdHl2XCI6XCJcXHUyOUIyXCIsXCJjZW50XCI6XCJcXHUwMEEyXCIsXCJjZW50ZXJkb3RcIjpcIlxcdTAwQjdcIixcIkNlbnRlckRvdFwiOlwiXFx1MDBCN1wiLFwiY2ZyXCI6XCJcXHVEODM1XFx1REQyMFwiLFwiQ2ZyXCI6XCJcXHUyMTJEXCIsXCJDSGN5XCI6XCJcXHUwNDI3XCIsXCJjaGN5XCI6XCJcXHUwNDQ3XCIsXCJjaGVja1wiOlwiXFx1MjcxM1wiLFwiY2hlY2ttYXJrXCI6XCJcXHUyNzEzXCIsXCJDaGlcIjpcIlxcdTAzQTdcIixcImNoaVwiOlwiXFx1MDNDN1wiLFwiY2lyY1wiOlwiXFx1MDJDNlwiLFwiY2lyY2VxXCI6XCJcXHUyMjU3XCIsXCJjaXJjbGVhcnJvd2xlZnRcIjpcIlxcdTIxQkFcIixcImNpcmNsZWFycm93cmlnaHRcIjpcIlxcdTIxQkJcIixcImNpcmNsZWRhc3RcIjpcIlxcdTIyOUJcIixcImNpcmNsZWRjaXJjXCI6XCJcXHUyMjlBXCIsXCJjaXJjbGVkZGFzaFwiOlwiXFx1MjI5RFwiLFwiQ2lyY2xlRG90XCI6XCJcXHUyMjk5XCIsXCJjaXJjbGVkUlwiOlwiXFx1MDBBRVwiLFwiY2lyY2xlZFNcIjpcIlxcdTI0QzhcIixcIkNpcmNsZU1pbnVzXCI6XCJcXHUyMjk2XCIsXCJDaXJjbGVQbHVzXCI6XCJcXHUyMjk1XCIsXCJDaXJjbGVUaW1lc1wiOlwiXFx1MjI5N1wiLFwiY2lyXCI6XCJcXHUyNUNCXCIsXCJjaXJFXCI6XCJcXHUyOUMzXCIsXCJjaXJlXCI6XCJcXHUyMjU3XCIsXCJjaXJmbmludFwiOlwiXFx1MkExMFwiLFwiY2lybWlkXCI6XCJcXHUyQUVGXCIsXCJjaXJzY2lyXCI6XCJcXHUyOUMyXCIsXCJDbG9ja3dpc2VDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMzJcIixcIkNsb3NlQ3VybHlEb3VibGVRdW90ZVwiOlwiXFx1MjAxRFwiLFwiQ2xvc2VDdXJseVF1b3RlXCI6XCJcXHUyMDE5XCIsXCJjbHVic1wiOlwiXFx1MjY2M1wiLFwiY2x1YnN1aXRcIjpcIlxcdTI2NjNcIixcImNvbG9uXCI6XCI6XCIsXCJDb2xvblwiOlwiXFx1MjIzN1wiLFwiQ29sb25lXCI6XCJcXHUyQTc0XCIsXCJjb2xvbmVcIjpcIlxcdTIyNTRcIixcImNvbG9uZXFcIjpcIlxcdTIyNTRcIixcImNvbW1hXCI6XCIsXCIsXCJjb21tYXRcIjpcIkBcIixcImNvbXBcIjpcIlxcdTIyMDFcIixcImNvbXBmblwiOlwiXFx1MjIxOFwiLFwiY29tcGxlbWVudFwiOlwiXFx1MjIwMVwiLFwiY29tcGxleGVzXCI6XCJcXHUyMTAyXCIsXCJjb25nXCI6XCJcXHUyMjQ1XCIsXCJjb25nZG90XCI6XCJcXHUyQTZEXCIsXCJDb25ncnVlbnRcIjpcIlxcdTIyNjFcIixcImNvbmludFwiOlwiXFx1MjIyRVwiLFwiQ29uaW50XCI6XCJcXHUyMjJGXCIsXCJDb250b3VySW50ZWdyYWxcIjpcIlxcdTIyMkVcIixcImNvcGZcIjpcIlxcdUQ4MzVcXHVERDU0XCIsXCJDb3BmXCI6XCJcXHUyMTAyXCIsXCJjb3Byb2RcIjpcIlxcdTIyMTBcIixcIkNvcHJvZHVjdFwiOlwiXFx1MjIxMFwiLFwiY29weVwiOlwiXFx1MDBBOVwiLFwiQ09QWVwiOlwiXFx1MDBBOVwiLFwiY29weXNyXCI6XCJcXHUyMTE3XCIsXCJDb3VudGVyQ2xvY2t3aXNlQ29udG91ckludGVncmFsXCI6XCJcXHUyMjMzXCIsXCJjcmFyclwiOlwiXFx1MjFCNVwiLFwiY3Jvc3NcIjpcIlxcdTI3MTdcIixcIkNyb3NzXCI6XCJcXHUyQTJGXCIsXCJDc2NyXCI6XCJcXHVEODM1XFx1REM5RVwiLFwiY3NjclwiOlwiXFx1RDgzNVxcdURDQjhcIixcImNzdWJcIjpcIlxcdTJBQ0ZcIixcImNzdWJlXCI6XCJcXHUyQUQxXCIsXCJjc3VwXCI6XCJcXHUyQUQwXCIsXCJjc3VwZVwiOlwiXFx1MkFEMlwiLFwiY3Rkb3RcIjpcIlxcdTIyRUZcIixcImN1ZGFycmxcIjpcIlxcdTI5MzhcIixcImN1ZGFycnJcIjpcIlxcdTI5MzVcIixcImN1ZXByXCI6XCJcXHUyMkRFXCIsXCJjdWVzY1wiOlwiXFx1MjJERlwiLFwiY3VsYXJyXCI6XCJcXHUyMUI2XCIsXCJjdWxhcnJwXCI6XCJcXHUyOTNEXCIsXCJjdXBicmNhcFwiOlwiXFx1MkE0OFwiLFwiY3VwY2FwXCI6XCJcXHUyQTQ2XCIsXCJDdXBDYXBcIjpcIlxcdTIyNERcIixcImN1cFwiOlwiXFx1MjIyQVwiLFwiQ3VwXCI6XCJcXHUyMkQzXCIsXCJjdXBjdXBcIjpcIlxcdTJBNEFcIixcImN1cGRvdFwiOlwiXFx1MjI4RFwiLFwiY3Vwb3JcIjpcIlxcdTJBNDVcIixcImN1cHNcIjpcIlxcdTIyMkFcXHVGRTAwXCIsXCJjdXJhcnJcIjpcIlxcdTIxQjdcIixcImN1cmFycm1cIjpcIlxcdTI5M0NcIixcImN1cmx5ZXFwcmVjXCI6XCJcXHUyMkRFXCIsXCJjdXJseWVxc3VjY1wiOlwiXFx1MjJERlwiLFwiY3VybHl2ZWVcIjpcIlxcdTIyQ0VcIixcImN1cmx5d2VkZ2VcIjpcIlxcdTIyQ0ZcIixcImN1cnJlblwiOlwiXFx1MDBBNFwiLFwiY3VydmVhcnJvd2xlZnRcIjpcIlxcdTIxQjZcIixcImN1cnZlYXJyb3dyaWdodFwiOlwiXFx1MjFCN1wiLFwiY3V2ZWVcIjpcIlxcdTIyQ0VcIixcImN1d2VkXCI6XCJcXHUyMkNGXCIsXCJjd2NvbmludFwiOlwiXFx1MjIzMlwiLFwiY3dpbnRcIjpcIlxcdTIyMzFcIixcImN5bGN0eVwiOlwiXFx1MjMyRFwiLFwiZGFnZ2VyXCI6XCJcXHUyMDIwXCIsXCJEYWdnZXJcIjpcIlxcdTIwMjFcIixcImRhbGV0aFwiOlwiXFx1MjEzOFwiLFwiZGFyclwiOlwiXFx1MjE5M1wiLFwiRGFyclwiOlwiXFx1MjFBMVwiLFwiZEFyclwiOlwiXFx1MjFEM1wiLFwiZGFzaFwiOlwiXFx1MjAxMFwiLFwiRGFzaHZcIjpcIlxcdTJBRTRcIixcImRhc2h2XCI6XCJcXHUyMkEzXCIsXCJkYmthcm93XCI6XCJcXHUyOTBGXCIsXCJkYmxhY1wiOlwiXFx1MDJERFwiLFwiRGNhcm9uXCI6XCJcXHUwMTBFXCIsXCJkY2Fyb25cIjpcIlxcdTAxMEZcIixcIkRjeVwiOlwiXFx1MDQxNFwiLFwiZGN5XCI6XCJcXHUwNDM0XCIsXCJkZGFnZ2VyXCI6XCJcXHUyMDIxXCIsXCJkZGFyclwiOlwiXFx1MjFDQVwiLFwiRERcIjpcIlxcdTIxNDVcIixcImRkXCI6XCJcXHUyMTQ2XCIsXCJERG90cmFoZFwiOlwiXFx1MjkxMVwiLFwiZGRvdHNlcVwiOlwiXFx1MkE3N1wiLFwiZGVnXCI6XCJcXHUwMEIwXCIsXCJEZWxcIjpcIlxcdTIyMDdcIixcIkRlbHRhXCI6XCJcXHUwMzk0XCIsXCJkZWx0YVwiOlwiXFx1MDNCNFwiLFwiZGVtcHR5dlwiOlwiXFx1MjlCMVwiLFwiZGZpc2h0XCI6XCJcXHUyOTdGXCIsXCJEZnJcIjpcIlxcdUQ4MzVcXHVERDA3XCIsXCJkZnJcIjpcIlxcdUQ4MzVcXHVERDIxXCIsXCJkSGFyXCI6XCJcXHUyOTY1XCIsXCJkaGFybFwiOlwiXFx1MjFDM1wiLFwiZGhhcnJcIjpcIlxcdTIxQzJcIixcIkRpYWNyaXRpY2FsQWN1dGVcIjpcIlxcdTAwQjRcIixcIkRpYWNyaXRpY2FsRG90XCI6XCJcXHUwMkQ5XCIsXCJEaWFjcml0aWNhbERvdWJsZUFjdXRlXCI6XCJcXHUwMkREXCIsXCJEaWFjcml0aWNhbEdyYXZlXCI6XCJgXCIsXCJEaWFjcml0aWNhbFRpbGRlXCI6XCJcXHUwMkRDXCIsXCJkaWFtXCI6XCJcXHUyMkM0XCIsXCJkaWFtb25kXCI6XCJcXHUyMkM0XCIsXCJEaWFtb25kXCI6XCJcXHUyMkM0XCIsXCJkaWFtb25kc3VpdFwiOlwiXFx1MjY2NlwiLFwiZGlhbXNcIjpcIlxcdTI2NjZcIixcImRpZVwiOlwiXFx1MDBBOFwiLFwiRGlmZmVyZW50aWFsRFwiOlwiXFx1MjE0NlwiLFwiZGlnYW1tYVwiOlwiXFx1MDNERFwiLFwiZGlzaW5cIjpcIlxcdTIyRjJcIixcImRpdlwiOlwiXFx1MDBGN1wiLFwiZGl2aWRlXCI6XCJcXHUwMEY3XCIsXCJkaXZpZGVvbnRpbWVzXCI6XCJcXHUyMkM3XCIsXCJkaXZvbnhcIjpcIlxcdTIyQzdcIixcIkRKY3lcIjpcIlxcdTA0MDJcIixcImRqY3lcIjpcIlxcdTA0NTJcIixcImRsY29yblwiOlwiXFx1MjMxRVwiLFwiZGxjcm9wXCI6XCJcXHUyMzBEXCIsXCJkb2xsYXJcIjpcIiRcIixcIkRvcGZcIjpcIlxcdUQ4MzVcXHVERDNCXCIsXCJkb3BmXCI6XCJcXHVEODM1XFx1REQ1NVwiLFwiRG90XCI6XCJcXHUwMEE4XCIsXCJkb3RcIjpcIlxcdTAyRDlcIixcIkRvdERvdFwiOlwiXFx1MjBEQ1wiLFwiZG90ZXFcIjpcIlxcdTIyNTBcIixcImRvdGVxZG90XCI6XCJcXHUyMjUxXCIsXCJEb3RFcXVhbFwiOlwiXFx1MjI1MFwiLFwiZG90bWludXNcIjpcIlxcdTIyMzhcIixcImRvdHBsdXNcIjpcIlxcdTIyMTRcIixcImRvdHNxdWFyZVwiOlwiXFx1MjJBMVwiLFwiZG91YmxlYmFyd2VkZ2VcIjpcIlxcdTIzMDZcIixcIkRvdWJsZUNvbnRvdXJJbnRlZ3JhbFwiOlwiXFx1MjIyRlwiLFwiRG91YmxlRG90XCI6XCJcXHUwMEE4XCIsXCJEb3VibGVEb3duQXJyb3dcIjpcIlxcdTIxRDNcIixcIkRvdWJsZUxlZnRBcnJvd1wiOlwiXFx1MjFEMFwiLFwiRG91YmxlTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTIxRDRcIixcIkRvdWJsZUxlZnRUZWVcIjpcIlxcdTJBRTRcIixcIkRvdWJsZUxvbmdMZWZ0QXJyb3dcIjpcIlxcdTI3RjhcIixcIkRvdWJsZUxvbmdMZWZ0UmlnaHRBcnJvd1wiOlwiXFx1MjdGQVwiLFwiRG91YmxlTG9uZ1JpZ2h0QXJyb3dcIjpcIlxcdTI3RjlcIixcIkRvdWJsZVJpZ2h0QXJyb3dcIjpcIlxcdTIxRDJcIixcIkRvdWJsZVJpZ2h0VGVlXCI6XCJcXHUyMkE4XCIsXCJEb3VibGVVcEFycm93XCI6XCJcXHUyMUQxXCIsXCJEb3VibGVVcERvd25BcnJvd1wiOlwiXFx1MjFENVwiLFwiRG91YmxlVmVydGljYWxCYXJcIjpcIlxcdTIyMjVcIixcIkRvd25BcnJvd0JhclwiOlwiXFx1MjkxM1wiLFwiZG93bmFycm93XCI6XCJcXHUyMTkzXCIsXCJEb3duQXJyb3dcIjpcIlxcdTIxOTNcIixcIkRvd25hcnJvd1wiOlwiXFx1MjFEM1wiLFwiRG93bkFycm93VXBBcnJvd1wiOlwiXFx1MjFGNVwiLFwiRG93bkJyZXZlXCI6XCJcXHUwMzExXCIsXCJkb3duZG93bmFycm93c1wiOlwiXFx1MjFDQVwiLFwiZG93bmhhcnBvb25sZWZ0XCI6XCJcXHUyMUMzXCIsXCJkb3duaGFycG9vbnJpZ2h0XCI6XCJcXHUyMUMyXCIsXCJEb3duTGVmdFJpZ2h0VmVjdG9yXCI6XCJcXHUyOTUwXCIsXCJEb3duTGVmdFRlZVZlY3RvclwiOlwiXFx1Mjk1RVwiLFwiRG93bkxlZnRWZWN0b3JCYXJcIjpcIlxcdTI5NTZcIixcIkRvd25MZWZ0VmVjdG9yXCI6XCJcXHUyMUJEXCIsXCJEb3duUmlnaHRUZWVWZWN0b3JcIjpcIlxcdTI5NUZcIixcIkRvd25SaWdodFZlY3RvckJhclwiOlwiXFx1Mjk1N1wiLFwiRG93blJpZ2h0VmVjdG9yXCI6XCJcXHUyMUMxXCIsXCJEb3duVGVlQXJyb3dcIjpcIlxcdTIxQTdcIixcIkRvd25UZWVcIjpcIlxcdTIyQTRcIixcImRyYmthcm93XCI6XCJcXHUyOTEwXCIsXCJkcmNvcm5cIjpcIlxcdTIzMUZcIixcImRyY3JvcFwiOlwiXFx1MjMwQ1wiLFwiRHNjclwiOlwiXFx1RDgzNVxcdURDOUZcIixcImRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0I5XCIsXCJEU2N5XCI6XCJcXHUwNDA1XCIsXCJkc2N5XCI6XCJcXHUwNDU1XCIsXCJkc29sXCI6XCJcXHUyOUY2XCIsXCJEc3Ryb2tcIjpcIlxcdTAxMTBcIixcImRzdHJva1wiOlwiXFx1MDExMVwiLFwiZHRkb3RcIjpcIlxcdTIyRjFcIixcImR0cmlcIjpcIlxcdTI1QkZcIixcImR0cmlmXCI6XCJcXHUyNUJFXCIsXCJkdWFyclwiOlwiXFx1MjFGNVwiLFwiZHVoYXJcIjpcIlxcdTI5NkZcIixcImR3YW5nbGVcIjpcIlxcdTI5QTZcIixcIkRaY3lcIjpcIlxcdTA0MEZcIixcImR6Y3lcIjpcIlxcdTA0NUZcIixcImR6aWdyYXJyXCI6XCJcXHUyN0ZGXCIsXCJFYWN1dGVcIjpcIlxcdTAwQzlcIixcImVhY3V0ZVwiOlwiXFx1MDBFOVwiLFwiZWFzdGVyXCI6XCJcXHUyQTZFXCIsXCJFY2Fyb25cIjpcIlxcdTAxMUFcIixcImVjYXJvblwiOlwiXFx1MDExQlwiLFwiRWNpcmNcIjpcIlxcdTAwQ0FcIixcImVjaXJjXCI6XCJcXHUwMEVBXCIsXCJlY2lyXCI6XCJcXHUyMjU2XCIsXCJlY29sb25cIjpcIlxcdTIyNTVcIixcIkVjeVwiOlwiXFx1MDQyRFwiLFwiZWN5XCI6XCJcXHUwNDREXCIsXCJlRERvdFwiOlwiXFx1MkE3N1wiLFwiRWRvdFwiOlwiXFx1MDExNlwiLFwiZWRvdFwiOlwiXFx1MDExN1wiLFwiZURvdFwiOlwiXFx1MjI1MVwiLFwiZWVcIjpcIlxcdTIxNDdcIixcImVmRG90XCI6XCJcXHUyMjUyXCIsXCJFZnJcIjpcIlxcdUQ4MzVcXHVERDA4XCIsXCJlZnJcIjpcIlxcdUQ4MzVcXHVERDIyXCIsXCJlZ1wiOlwiXFx1MkE5QVwiLFwiRWdyYXZlXCI6XCJcXHUwMEM4XCIsXCJlZ3JhdmVcIjpcIlxcdTAwRThcIixcImVnc1wiOlwiXFx1MkE5NlwiLFwiZWdzZG90XCI6XCJcXHUyQTk4XCIsXCJlbFwiOlwiXFx1MkE5OVwiLFwiRWxlbWVudFwiOlwiXFx1MjIwOFwiLFwiZWxpbnRlcnNcIjpcIlxcdTIzRTdcIixcImVsbFwiOlwiXFx1MjExM1wiLFwiZWxzXCI6XCJcXHUyQTk1XCIsXCJlbHNkb3RcIjpcIlxcdTJBOTdcIixcIkVtYWNyXCI6XCJcXHUwMTEyXCIsXCJlbWFjclwiOlwiXFx1MDExM1wiLFwiZW1wdHlcIjpcIlxcdTIyMDVcIixcImVtcHR5c2V0XCI6XCJcXHUyMjA1XCIsXCJFbXB0eVNtYWxsU3F1YXJlXCI6XCJcXHUyNUZCXCIsXCJlbXB0eXZcIjpcIlxcdTIyMDVcIixcIkVtcHR5VmVyeVNtYWxsU3F1YXJlXCI6XCJcXHUyNUFCXCIsXCJlbXNwMTNcIjpcIlxcdTIwMDRcIixcImVtc3AxNFwiOlwiXFx1MjAwNVwiLFwiZW1zcFwiOlwiXFx1MjAwM1wiLFwiRU5HXCI6XCJcXHUwMTRBXCIsXCJlbmdcIjpcIlxcdTAxNEJcIixcImVuc3BcIjpcIlxcdTIwMDJcIixcIkVvZ29uXCI6XCJcXHUwMTE4XCIsXCJlb2dvblwiOlwiXFx1MDExOVwiLFwiRW9wZlwiOlwiXFx1RDgzNVxcdUREM0NcIixcImVvcGZcIjpcIlxcdUQ4MzVcXHVERDU2XCIsXCJlcGFyXCI6XCJcXHUyMkQ1XCIsXCJlcGFyc2xcIjpcIlxcdTI5RTNcIixcImVwbHVzXCI6XCJcXHUyQTcxXCIsXCJlcHNpXCI6XCJcXHUwM0I1XCIsXCJFcHNpbG9uXCI6XCJcXHUwMzk1XCIsXCJlcHNpbG9uXCI6XCJcXHUwM0I1XCIsXCJlcHNpdlwiOlwiXFx1MDNGNVwiLFwiZXFjaXJjXCI6XCJcXHUyMjU2XCIsXCJlcWNvbG9uXCI6XCJcXHUyMjU1XCIsXCJlcXNpbVwiOlwiXFx1MjI0MlwiLFwiZXFzbGFudGd0clwiOlwiXFx1MkE5NlwiLFwiZXFzbGFudGxlc3NcIjpcIlxcdTJBOTVcIixcIkVxdWFsXCI6XCJcXHUyQTc1XCIsXCJlcXVhbHNcIjpcIj1cIixcIkVxdWFsVGlsZGVcIjpcIlxcdTIyNDJcIixcImVxdWVzdFwiOlwiXFx1MjI1RlwiLFwiRXF1aWxpYnJpdW1cIjpcIlxcdTIxQ0NcIixcImVxdWl2XCI6XCJcXHUyMjYxXCIsXCJlcXVpdkREXCI6XCJcXHUyQTc4XCIsXCJlcXZwYXJzbFwiOlwiXFx1MjlFNVwiLFwiZXJhcnJcIjpcIlxcdTI5NzFcIixcImVyRG90XCI6XCJcXHUyMjUzXCIsXCJlc2NyXCI6XCJcXHUyMTJGXCIsXCJFc2NyXCI6XCJcXHUyMTMwXCIsXCJlc2RvdFwiOlwiXFx1MjI1MFwiLFwiRXNpbVwiOlwiXFx1MkE3M1wiLFwiZXNpbVwiOlwiXFx1MjI0MlwiLFwiRXRhXCI6XCJcXHUwMzk3XCIsXCJldGFcIjpcIlxcdTAzQjdcIixcIkVUSFwiOlwiXFx1MDBEMFwiLFwiZXRoXCI6XCJcXHUwMEYwXCIsXCJFdW1sXCI6XCJcXHUwMENCXCIsXCJldW1sXCI6XCJcXHUwMEVCXCIsXCJldXJvXCI6XCJcXHUyMEFDXCIsXCJleGNsXCI6XCIhXCIsXCJleGlzdFwiOlwiXFx1MjIwM1wiLFwiRXhpc3RzXCI6XCJcXHUyMjAzXCIsXCJleHBlY3RhdGlvblwiOlwiXFx1MjEzMFwiLFwiZXhwb25lbnRpYWxlXCI6XCJcXHUyMTQ3XCIsXCJFeHBvbmVudGlhbEVcIjpcIlxcdTIxNDdcIixcImZhbGxpbmdkb3RzZXFcIjpcIlxcdTIyNTJcIixcIkZjeVwiOlwiXFx1MDQyNFwiLFwiZmN5XCI6XCJcXHUwNDQ0XCIsXCJmZW1hbGVcIjpcIlxcdTI2NDBcIixcImZmaWxpZ1wiOlwiXFx1RkIwM1wiLFwiZmZsaWdcIjpcIlxcdUZCMDBcIixcImZmbGxpZ1wiOlwiXFx1RkIwNFwiLFwiRmZyXCI6XCJcXHVEODM1XFx1REQwOVwiLFwiZmZyXCI6XCJcXHVEODM1XFx1REQyM1wiLFwiZmlsaWdcIjpcIlxcdUZCMDFcIixcIkZpbGxlZFNtYWxsU3F1YXJlXCI6XCJcXHUyNUZDXCIsXCJGaWxsZWRWZXJ5U21hbGxTcXVhcmVcIjpcIlxcdTI1QUFcIixcImZqbGlnXCI6XCJmalwiLFwiZmxhdFwiOlwiXFx1MjY2RFwiLFwiZmxsaWdcIjpcIlxcdUZCMDJcIixcImZsdG5zXCI6XCJcXHUyNUIxXCIsXCJmbm9mXCI6XCJcXHUwMTkyXCIsXCJGb3BmXCI6XCJcXHVEODM1XFx1REQzRFwiLFwiZm9wZlwiOlwiXFx1RDgzNVxcdURENTdcIixcImZvcmFsbFwiOlwiXFx1MjIwMFwiLFwiRm9yQWxsXCI6XCJcXHUyMjAwXCIsXCJmb3JrXCI6XCJcXHUyMkQ0XCIsXCJmb3JrdlwiOlwiXFx1MkFEOVwiLFwiRm91cmllcnRyZlwiOlwiXFx1MjEzMVwiLFwiZnBhcnRpbnRcIjpcIlxcdTJBMERcIixcImZyYWMxMlwiOlwiXFx1MDBCRFwiLFwiZnJhYzEzXCI6XCJcXHUyMTUzXCIsXCJmcmFjMTRcIjpcIlxcdTAwQkNcIixcImZyYWMxNVwiOlwiXFx1MjE1NVwiLFwiZnJhYzE2XCI6XCJcXHUyMTU5XCIsXCJmcmFjMThcIjpcIlxcdTIxNUJcIixcImZyYWMyM1wiOlwiXFx1MjE1NFwiLFwiZnJhYzI1XCI6XCJcXHUyMTU2XCIsXCJmcmFjMzRcIjpcIlxcdTAwQkVcIixcImZyYWMzNVwiOlwiXFx1MjE1N1wiLFwiZnJhYzM4XCI6XCJcXHUyMTVDXCIsXCJmcmFjNDVcIjpcIlxcdTIxNThcIixcImZyYWM1NlwiOlwiXFx1MjE1QVwiLFwiZnJhYzU4XCI6XCJcXHUyMTVEXCIsXCJmcmFjNzhcIjpcIlxcdTIxNUVcIixcImZyYXNsXCI6XCJcXHUyMDQ0XCIsXCJmcm93blwiOlwiXFx1MjMyMlwiLFwiZnNjclwiOlwiXFx1RDgzNVxcdURDQkJcIixcIkZzY3JcIjpcIlxcdTIxMzFcIixcImdhY3V0ZVwiOlwiXFx1MDFGNVwiLFwiR2FtbWFcIjpcIlxcdTAzOTNcIixcImdhbW1hXCI6XCJcXHUwM0IzXCIsXCJHYW1tYWRcIjpcIlxcdTAzRENcIixcImdhbW1hZFwiOlwiXFx1MDNERFwiLFwiZ2FwXCI6XCJcXHUyQTg2XCIsXCJHYnJldmVcIjpcIlxcdTAxMUVcIixcImdicmV2ZVwiOlwiXFx1MDExRlwiLFwiR2NlZGlsXCI6XCJcXHUwMTIyXCIsXCJHY2lyY1wiOlwiXFx1MDExQ1wiLFwiZ2NpcmNcIjpcIlxcdTAxMURcIixcIkdjeVwiOlwiXFx1MDQxM1wiLFwiZ2N5XCI6XCJcXHUwNDMzXCIsXCJHZG90XCI6XCJcXHUwMTIwXCIsXCJnZG90XCI6XCJcXHUwMTIxXCIsXCJnZVwiOlwiXFx1MjI2NVwiLFwiZ0VcIjpcIlxcdTIyNjdcIixcImdFbFwiOlwiXFx1MkE4Q1wiLFwiZ2VsXCI6XCJcXHUyMkRCXCIsXCJnZXFcIjpcIlxcdTIyNjVcIixcImdlcXFcIjpcIlxcdTIyNjdcIixcImdlcXNsYW50XCI6XCJcXHUyQTdFXCIsXCJnZXNjY1wiOlwiXFx1MkFBOVwiLFwiZ2VzXCI6XCJcXHUyQTdFXCIsXCJnZXNkb3RcIjpcIlxcdTJBODBcIixcImdlc2RvdG9cIjpcIlxcdTJBODJcIixcImdlc2RvdG9sXCI6XCJcXHUyQTg0XCIsXCJnZXNsXCI6XCJcXHUyMkRCXFx1RkUwMFwiLFwiZ2VzbGVzXCI6XCJcXHUyQTk0XCIsXCJHZnJcIjpcIlxcdUQ4MzVcXHVERDBBXCIsXCJnZnJcIjpcIlxcdUQ4MzVcXHVERDI0XCIsXCJnZ1wiOlwiXFx1MjI2QlwiLFwiR2dcIjpcIlxcdTIyRDlcIixcImdnZ1wiOlwiXFx1MjJEOVwiLFwiZ2ltZWxcIjpcIlxcdTIxMzdcIixcIkdKY3lcIjpcIlxcdTA0MDNcIixcImdqY3lcIjpcIlxcdTA0NTNcIixcImdsYVwiOlwiXFx1MkFBNVwiLFwiZ2xcIjpcIlxcdTIyNzdcIixcImdsRVwiOlwiXFx1MkE5MlwiLFwiZ2xqXCI6XCJcXHUyQUE0XCIsXCJnbmFwXCI6XCJcXHUyQThBXCIsXCJnbmFwcHJveFwiOlwiXFx1MkE4QVwiLFwiZ25lXCI6XCJcXHUyQTg4XCIsXCJnbkVcIjpcIlxcdTIyNjlcIixcImduZXFcIjpcIlxcdTJBODhcIixcImduZXFxXCI6XCJcXHUyMjY5XCIsXCJnbnNpbVwiOlwiXFx1MjJFN1wiLFwiR29wZlwiOlwiXFx1RDgzNVxcdUREM0VcIixcImdvcGZcIjpcIlxcdUQ4MzVcXHVERDU4XCIsXCJncmF2ZVwiOlwiYFwiLFwiR3JlYXRlckVxdWFsXCI6XCJcXHUyMjY1XCIsXCJHcmVhdGVyRXF1YWxMZXNzXCI6XCJcXHUyMkRCXCIsXCJHcmVhdGVyRnVsbEVxdWFsXCI6XCJcXHUyMjY3XCIsXCJHcmVhdGVyR3JlYXRlclwiOlwiXFx1MkFBMlwiLFwiR3JlYXRlckxlc3NcIjpcIlxcdTIyNzdcIixcIkdyZWF0ZXJTbGFudEVxdWFsXCI6XCJcXHUyQTdFXCIsXCJHcmVhdGVyVGlsZGVcIjpcIlxcdTIyNzNcIixcIkdzY3JcIjpcIlxcdUQ4MzVcXHVEQ0EyXCIsXCJnc2NyXCI6XCJcXHUyMTBBXCIsXCJnc2ltXCI6XCJcXHUyMjczXCIsXCJnc2ltZVwiOlwiXFx1MkE4RVwiLFwiZ3NpbWxcIjpcIlxcdTJBOTBcIixcImd0Y2NcIjpcIlxcdTJBQTdcIixcImd0Y2lyXCI6XCJcXHUyQTdBXCIsXCJndFwiOlwiPlwiLFwiR1RcIjpcIj5cIixcIkd0XCI6XCJcXHUyMjZCXCIsXCJndGRvdFwiOlwiXFx1MjJEN1wiLFwiZ3RsUGFyXCI6XCJcXHUyOTk1XCIsXCJndHF1ZXN0XCI6XCJcXHUyQTdDXCIsXCJndHJhcHByb3hcIjpcIlxcdTJBODZcIixcImd0cmFyclwiOlwiXFx1Mjk3OFwiLFwiZ3RyZG90XCI6XCJcXHUyMkQ3XCIsXCJndHJlcWxlc3NcIjpcIlxcdTIyREJcIixcImd0cmVxcWxlc3NcIjpcIlxcdTJBOENcIixcImd0cmxlc3NcIjpcIlxcdTIyNzdcIixcImd0cnNpbVwiOlwiXFx1MjI3M1wiLFwiZ3ZlcnRuZXFxXCI6XCJcXHUyMjY5XFx1RkUwMFwiLFwiZ3ZuRVwiOlwiXFx1MjI2OVxcdUZFMDBcIixcIkhhY2VrXCI6XCJcXHUwMkM3XCIsXCJoYWlyc3BcIjpcIlxcdTIwMEFcIixcImhhbGZcIjpcIlxcdTAwQkRcIixcImhhbWlsdFwiOlwiXFx1MjEwQlwiLFwiSEFSRGN5XCI6XCJcXHUwNDJBXCIsXCJoYXJkY3lcIjpcIlxcdTA0NEFcIixcImhhcnJjaXJcIjpcIlxcdTI5NDhcIixcImhhcnJcIjpcIlxcdTIxOTRcIixcImhBcnJcIjpcIlxcdTIxRDRcIixcImhhcnJ3XCI6XCJcXHUyMUFEXCIsXCJIYXRcIjpcIl5cIixcImhiYXJcIjpcIlxcdTIxMEZcIixcIkhjaXJjXCI6XCJcXHUwMTI0XCIsXCJoY2lyY1wiOlwiXFx1MDEyNVwiLFwiaGVhcnRzXCI6XCJcXHUyNjY1XCIsXCJoZWFydHN1aXRcIjpcIlxcdTI2NjVcIixcImhlbGxpcFwiOlwiXFx1MjAyNlwiLFwiaGVyY29uXCI6XCJcXHUyMkI5XCIsXCJoZnJcIjpcIlxcdUQ4MzVcXHVERDI1XCIsXCJIZnJcIjpcIlxcdTIxMENcIixcIkhpbGJlcnRTcGFjZVwiOlwiXFx1MjEwQlwiLFwiaGtzZWFyb3dcIjpcIlxcdTI5MjVcIixcImhrc3dhcm93XCI6XCJcXHUyOTI2XCIsXCJob2FyclwiOlwiXFx1MjFGRlwiLFwiaG9tdGh0XCI6XCJcXHUyMjNCXCIsXCJob29rbGVmdGFycm93XCI6XCJcXHUyMUE5XCIsXCJob29rcmlnaHRhcnJvd1wiOlwiXFx1MjFBQVwiLFwiaG9wZlwiOlwiXFx1RDgzNVxcdURENTlcIixcIkhvcGZcIjpcIlxcdTIxMERcIixcImhvcmJhclwiOlwiXFx1MjAxNVwiLFwiSG9yaXpvbnRhbExpbmVcIjpcIlxcdTI1MDBcIixcImhzY3JcIjpcIlxcdUQ4MzVcXHVEQ0JEXCIsXCJIc2NyXCI6XCJcXHUyMTBCXCIsXCJoc2xhc2hcIjpcIlxcdTIxMEZcIixcIkhzdHJva1wiOlwiXFx1MDEyNlwiLFwiaHN0cm9rXCI6XCJcXHUwMTI3XCIsXCJIdW1wRG93bkh1bXBcIjpcIlxcdTIyNEVcIixcIkh1bXBFcXVhbFwiOlwiXFx1MjI0RlwiLFwiaHlidWxsXCI6XCJcXHUyMDQzXCIsXCJoeXBoZW5cIjpcIlxcdTIwMTBcIixcIklhY3V0ZVwiOlwiXFx1MDBDRFwiLFwiaWFjdXRlXCI6XCJcXHUwMEVEXCIsXCJpY1wiOlwiXFx1MjA2M1wiLFwiSWNpcmNcIjpcIlxcdTAwQ0VcIixcImljaXJjXCI6XCJcXHUwMEVFXCIsXCJJY3lcIjpcIlxcdTA0MThcIixcImljeVwiOlwiXFx1MDQzOFwiLFwiSWRvdFwiOlwiXFx1MDEzMFwiLFwiSUVjeVwiOlwiXFx1MDQxNVwiLFwiaWVjeVwiOlwiXFx1MDQzNVwiLFwiaWV4Y2xcIjpcIlxcdTAwQTFcIixcImlmZlwiOlwiXFx1MjFENFwiLFwiaWZyXCI6XCJcXHVEODM1XFx1REQyNlwiLFwiSWZyXCI6XCJcXHUyMTExXCIsXCJJZ3JhdmVcIjpcIlxcdTAwQ0NcIixcImlncmF2ZVwiOlwiXFx1MDBFQ1wiLFwiaWlcIjpcIlxcdTIxNDhcIixcImlpaWludFwiOlwiXFx1MkEwQ1wiLFwiaWlpbnRcIjpcIlxcdTIyMkRcIixcImlpbmZpblwiOlwiXFx1MjlEQ1wiLFwiaWlvdGFcIjpcIlxcdTIxMjlcIixcIklKbGlnXCI6XCJcXHUwMTMyXCIsXCJpamxpZ1wiOlwiXFx1MDEzM1wiLFwiSW1hY3JcIjpcIlxcdTAxMkFcIixcImltYWNyXCI6XCJcXHUwMTJCXCIsXCJpbWFnZVwiOlwiXFx1MjExMVwiLFwiSW1hZ2luYXJ5SVwiOlwiXFx1MjE0OFwiLFwiaW1hZ2xpbmVcIjpcIlxcdTIxMTBcIixcImltYWdwYXJ0XCI6XCJcXHUyMTExXCIsXCJpbWF0aFwiOlwiXFx1MDEzMVwiLFwiSW1cIjpcIlxcdTIxMTFcIixcImltb2ZcIjpcIlxcdTIyQjdcIixcImltcGVkXCI6XCJcXHUwMUI1XCIsXCJJbXBsaWVzXCI6XCJcXHUyMUQyXCIsXCJpbmNhcmVcIjpcIlxcdTIxMDVcIixcImluXCI6XCJcXHUyMjA4XCIsXCJpbmZpblwiOlwiXFx1MjIxRVwiLFwiaW5maW50aWVcIjpcIlxcdTI5RERcIixcImlub2RvdFwiOlwiXFx1MDEzMVwiLFwiaW50Y2FsXCI6XCJcXHUyMkJBXCIsXCJpbnRcIjpcIlxcdTIyMkJcIixcIkludFwiOlwiXFx1MjIyQ1wiLFwiaW50ZWdlcnNcIjpcIlxcdTIxMjRcIixcIkludGVncmFsXCI6XCJcXHUyMjJCXCIsXCJpbnRlcmNhbFwiOlwiXFx1MjJCQVwiLFwiSW50ZXJzZWN0aW9uXCI6XCJcXHUyMkMyXCIsXCJpbnRsYXJoa1wiOlwiXFx1MkExN1wiLFwiaW50cHJvZFwiOlwiXFx1MkEzQ1wiLFwiSW52aXNpYmxlQ29tbWFcIjpcIlxcdTIwNjNcIixcIkludmlzaWJsZVRpbWVzXCI6XCJcXHUyMDYyXCIsXCJJT2N5XCI6XCJcXHUwNDAxXCIsXCJpb2N5XCI6XCJcXHUwNDUxXCIsXCJJb2dvblwiOlwiXFx1MDEyRVwiLFwiaW9nb25cIjpcIlxcdTAxMkZcIixcIklvcGZcIjpcIlxcdUQ4MzVcXHVERDQwXCIsXCJpb3BmXCI6XCJcXHVEODM1XFx1REQ1QVwiLFwiSW90YVwiOlwiXFx1MDM5OVwiLFwiaW90YVwiOlwiXFx1MDNCOVwiLFwiaXByb2RcIjpcIlxcdTJBM0NcIixcImlxdWVzdFwiOlwiXFx1MDBCRlwiLFwiaXNjclwiOlwiXFx1RDgzNVxcdURDQkVcIixcIklzY3JcIjpcIlxcdTIxMTBcIixcImlzaW5cIjpcIlxcdTIyMDhcIixcImlzaW5kb3RcIjpcIlxcdTIyRjVcIixcImlzaW5FXCI6XCJcXHUyMkY5XCIsXCJpc2luc1wiOlwiXFx1MjJGNFwiLFwiaXNpbnN2XCI6XCJcXHUyMkYzXCIsXCJpc2ludlwiOlwiXFx1MjIwOFwiLFwiaXRcIjpcIlxcdTIwNjJcIixcIkl0aWxkZVwiOlwiXFx1MDEyOFwiLFwiaXRpbGRlXCI6XCJcXHUwMTI5XCIsXCJJdWtjeVwiOlwiXFx1MDQwNlwiLFwiaXVrY3lcIjpcIlxcdTA0NTZcIixcIkl1bWxcIjpcIlxcdTAwQ0ZcIixcIml1bWxcIjpcIlxcdTAwRUZcIixcIkpjaXJjXCI6XCJcXHUwMTM0XCIsXCJqY2lyY1wiOlwiXFx1MDEzNVwiLFwiSmN5XCI6XCJcXHUwNDE5XCIsXCJqY3lcIjpcIlxcdTA0MzlcIixcIkpmclwiOlwiXFx1RDgzNVxcdUREMERcIixcImpmclwiOlwiXFx1RDgzNVxcdUREMjdcIixcImptYXRoXCI6XCJcXHUwMjM3XCIsXCJKb3BmXCI6XCJcXHVEODM1XFx1REQ0MVwiLFwiam9wZlwiOlwiXFx1RDgzNVxcdURENUJcIixcIkpzY3JcIjpcIlxcdUQ4MzVcXHVEQ0E1XCIsXCJqc2NyXCI6XCJcXHVEODM1XFx1RENCRlwiLFwiSnNlcmN5XCI6XCJcXHUwNDA4XCIsXCJqc2VyY3lcIjpcIlxcdTA0NThcIixcIkp1a2N5XCI6XCJcXHUwNDA0XCIsXCJqdWtjeVwiOlwiXFx1MDQ1NFwiLFwiS2FwcGFcIjpcIlxcdTAzOUFcIixcImthcHBhXCI6XCJcXHUwM0JBXCIsXCJrYXBwYXZcIjpcIlxcdTAzRjBcIixcIktjZWRpbFwiOlwiXFx1MDEzNlwiLFwia2NlZGlsXCI6XCJcXHUwMTM3XCIsXCJLY3lcIjpcIlxcdTA0MUFcIixcImtjeVwiOlwiXFx1MDQzQVwiLFwiS2ZyXCI6XCJcXHVEODM1XFx1REQwRVwiLFwia2ZyXCI6XCJcXHVEODM1XFx1REQyOFwiLFwia2dyZWVuXCI6XCJcXHUwMTM4XCIsXCJLSGN5XCI6XCJcXHUwNDI1XCIsXCJraGN5XCI6XCJcXHUwNDQ1XCIsXCJLSmN5XCI6XCJcXHUwNDBDXCIsXCJramN5XCI6XCJcXHUwNDVDXCIsXCJLb3BmXCI6XCJcXHVEODM1XFx1REQ0MlwiLFwia29wZlwiOlwiXFx1RDgzNVxcdURENUNcIixcIktzY3JcIjpcIlxcdUQ4MzVcXHVEQ0E2XCIsXCJrc2NyXCI6XCJcXHVEODM1XFx1RENDMFwiLFwibEFhcnJcIjpcIlxcdTIxREFcIixcIkxhY3V0ZVwiOlwiXFx1MDEzOVwiLFwibGFjdXRlXCI6XCJcXHUwMTNBXCIsXCJsYWVtcHR5dlwiOlwiXFx1MjlCNFwiLFwibGFncmFuXCI6XCJcXHUyMTEyXCIsXCJMYW1iZGFcIjpcIlxcdTAzOUJcIixcImxhbWJkYVwiOlwiXFx1MDNCQlwiLFwibGFuZ1wiOlwiXFx1MjdFOFwiLFwiTGFuZ1wiOlwiXFx1MjdFQVwiLFwibGFuZ2RcIjpcIlxcdTI5OTFcIixcImxhbmdsZVwiOlwiXFx1MjdFOFwiLFwibGFwXCI6XCJcXHUyQTg1XCIsXCJMYXBsYWNldHJmXCI6XCJcXHUyMTEyXCIsXCJsYXF1b1wiOlwiXFx1MDBBQlwiLFwibGFycmJcIjpcIlxcdTIxRTRcIixcImxhcnJiZnNcIjpcIlxcdTI5MUZcIixcImxhcnJcIjpcIlxcdTIxOTBcIixcIkxhcnJcIjpcIlxcdTIxOUVcIixcImxBcnJcIjpcIlxcdTIxRDBcIixcImxhcnJmc1wiOlwiXFx1MjkxRFwiLFwibGFycmhrXCI6XCJcXHUyMUE5XCIsXCJsYXJybHBcIjpcIlxcdTIxQUJcIixcImxhcnJwbFwiOlwiXFx1MjkzOVwiLFwibGFycnNpbVwiOlwiXFx1Mjk3M1wiLFwibGFycnRsXCI6XCJcXHUyMUEyXCIsXCJsYXRhaWxcIjpcIlxcdTI5MTlcIixcImxBdGFpbFwiOlwiXFx1MjkxQlwiLFwibGF0XCI6XCJcXHUyQUFCXCIsXCJsYXRlXCI6XCJcXHUyQUFEXCIsXCJsYXRlc1wiOlwiXFx1MkFBRFxcdUZFMDBcIixcImxiYXJyXCI6XCJcXHUyOTBDXCIsXCJsQmFyclwiOlwiXFx1MjkwRVwiLFwibGJicmtcIjpcIlxcdTI3NzJcIixcImxicmFjZVwiOlwie1wiLFwibGJyYWNrXCI6XCJbXCIsXCJsYnJrZVwiOlwiXFx1Mjk4QlwiLFwibGJya3NsZFwiOlwiXFx1Mjk4RlwiLFwibGJya3NsdVwiOlwiXFx1Mjk4RFwiLFwiTGNhcm9uXCI6XCJcXHUwMTNEXCIsXCJsY2Fyb25cIjpcIlxcdTAxM0VcIixcIkxjZWRpbFwiOlwiXFx1MDEzQlwiLFwibGNlZGlsXCI6XCJcXHUwMTNDXCIsXCJsY2VpbFwiOlwiXFx1MjMwOFwiLFwibGN1YlwiOlwie1wiLFwiTGN5XCI6XCJcXHUwNDFCXCIsXCJsY3lcIjpcIlxcdTA0M0JcIixcImxkY2FcIjpcIlxcdTI5MzZcIixcImxkcXVvXCI6XCJcXHUyMDFDXCIsXCJsZHF1b3JcIjpcIlxcdTIwMUVcIixcImxkcmRoYXJcIjpcIlxcdTI5NjdcIixcImxkcnVzaGFyXCI6XCJcXHUyOTRCXCIsXCJsZHNoXCI6XCJcXHUyMUIyXCIsXCJsZVwiOlwiXFx1MjI2NFwiLFwibEVcIjpcIlxcdTIyNjZcIixcIkxlZnRBbmdsZUJyYWNrZXRcIjpcIlxcdTI3RThcIixcIkxlZnRBcnJvd0JhclwiOlwiXFx1MjFFNFwiLFwibGVmdGFycm93XCI6XCJcXHUyMTkwXCIsXCJMZWZ0QXJyb3dcIjpcIlxcdTIxOTBcIixcIkxlZnRhcnJvd1wiOlwiXFx1MjFEMFwiLFwiTGVmdEFycm93UmlnaHRBcnJvd1wiOlwiXFx1MjFDNlwiLFwibGVmdGFycm93dGFpbFwiOlwiXFx1MjFBMlwiLFwiTGVmdENlaWxpbmdcIjpcIlxcdTIzMDhcIixcIkxlZnREb3VibGVCcmFja2V0XCI6XCJcXHUyN0U2XCIsXCJMZWZ0RG93blRlZVZlY3RvclwiOlwiXFx1Mjk2MVwiLFwiTGVmdERvd25WZWN0b3JCYXJcIjpcIlxcdTI5NTlcIixcIkxlZnREb3duVmVjdG9yXCI6XCJcXHUyMUMzXCIsXCJMZWZ0Rmxvb3JcIjpcIlxcdTIzMEFcIixcImxlZnRoYXJwb29uZG93blwiOlwiXFx1MjFCRFwiLFwibGVmdGhhcnBvb251cFwiOlwiXFx1MjFCQ1wiLFwibGVmdGxlZnRhcnJvd3NcIjpcIlxcdTIxQzdcIixcImxlZnRyaWdodGFycm93XCI6XCJcXHUyMTk0XCIsXCJMZWZ0UmlnaHRBcnJvd1wiOlwiXFx1MjE5NFwiLFwiTGVmdHJpZ2h0YXJyb3dcIjpcIlxcdTIxRDRcIixcImxlZnRyaWdodGFycm93c1wiOlwiXFx1MjFDNlwiLFwibGVmdHJpZ2h0aGFycG9vbnNcIjpcIlxcdTIxQ0JcIixcImxlZnRyaWdodHNxdWlnYXJyb3dcIjpcIlxcdTIxQURcIixcIkxlZnRSaWdodFZlY3RvclwiOlwiXFx1Mjk0RVwiLFwiTGVmdFRlZUFycm93XCI6XCJcXHUyMUE0XCIsXCJMZWZ0VGVlXCI6XCJcXHUyMkEzXCIsXCJMZWZ0VGVlVmVjdG9yXCI6XCJcXHUyOTVBXCIsXCJsZWZ0dGhyZWV0aW1lc1wiOlwiXFx1MjJDQlwiLFwiTGVmdFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUNGXCIsXCJMZWZ0VHJpYW5nbGVcIjpcIlxcdTIyQjJcIixcIkxlZnRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkI0XCIsXCJMZWZ0VXBEb3duVmVjdG9yXCI6XCJcXHUyOTUxXCIsXCJMZWZ0VXBUZWVWZWN0b3JcIjpcIlxcdTI5NjBcIixcIkxlZnRVcFZlY3RvckJhclwiOlwiXFx1Mjk1OFwiLFwiTGVmdFVwVmVjdG9yXCI6XCJcXHUyMUJGXCIsXCJMZWZ0VmVjdG9yQmFyXCI6XCJcXHUyOTUyXCIsXCJMZWZ0VmVjdG9yXCI6XCJcXHUyMUJDXCIsXCJsRWdcIjpcIlxcdTJBOEJcIixcImxlZ1wiOlwiXFx1MjJEQVwiLFwibGVxXCI6XCJcXHUyMjY0XCIsXCJsZXFxXCI6XCJcXHUyMjY2XCIsXCJsZXFzbGFudFwiOlwiXFx1MkE3RFwiLFwibGVzY2NcIjpcIlxcdTJBQThcIixcImxlc1wiOlwiXFx1MkE3RFwiLFwibGVzZG90XCI6XCJcXHUyQTdGXCIsXCJsZXNkb3RvXCI6XCJcXHUyQTgxXCIsXCJsZXNkb3RvclwiOlwiXFx1MkE4M1wiLFwibGVzZ1wiOlwiXFx1MjJEQVxcdUZFMDBcIixcImxlc2dlc1wiOlwiXFx1MkE5M1wiLFwibGVzc2FwcHJveFwiOlwiXFx1MkE4NVwiLFwibGVzc2RvdFwiOlwiXFx1MjJENlwiLFwibGVzc2VxZ3RyXCI6XCJcXHUyMkRBXCIsXCJsZXNzZXFxZ3RyXCI6XCJcXHUyQThCXCIsXCJMZXNzRXF1YWxHcmVhdGVyXCI6XCJcXHUyMkRBXCIsXCJMZXNzRnVsbEVxdWFsXCI6XCJcXHUyMjY2XCIsXCJMZXNzR3JlYXRlclwiOlwiXFx1MjI3NlwiLFwibGVzc2d0clwiOlwiXFx1MjI3NlwiLFwiTGVzc0xlc3NcIjpcIlxcdTJBQTFcIixcImxlc3NzaW1cIjpcIlxcdTIyNzJcIixcIkxlc3NTbGFudEVxdWFsXCI6XCJcXHUyQTdEXCIsXCJMZXNzVGlsZGVcIjpcIlxcdTIyNzJcIixcImxmaXNodFwiOlwiXFx1Mjk3Q1wiLFwibGZsb29yXCI6XCJcXHUyMzBBXCIsXCJMZnJcIjpcIlxcdUQ4MzVcXHVERDBGXCIsXCJsZnJcIjpcIlxcdUQ4MzVcXHVERDI5XCIsXCJsZ1wiOlwiXFx1MjI3NlwiLFwibGdFXCI6XCJcXHUyQTkxXCIsXCJsSGFyXCI6XCJcXHUyOTYyXCIsXCJsaGFyZFwiOlwiXFx1MjFCRFwiLFwibGhhcnVcIjpcIlxcdTIxQkNcIixcImxoYXJ1bFwiOlwiXFx1Mjk2QVwiLFwibGhibGtcIjpcIlxcdTI1ODRcIixcIkxKY3lcIjpcIlxcdTA0MDlcIixcImxqY3lcIjpcIlxcdTA0NTlcIixcImxsYXJyXCI6XCJcXHUyMUM3XCIsXCJsbFwiOlwiXFx1MjI2QVwiLFwiTGxcIjpcIlxcdTIyRDhcIixcImxsY29ybmVyXCI6XCJcXHUyMzFFXCIsXCJMbGVmdGFycm93XCI6XCJcXHUyMURBXCIsXCJsbGhhcmRcIjpcIlxcdTI5NkJcIixcImxsdHJpXCI6XCJcXHUyNUZBXCIsXCJMbWlkb3RcIjpcIlxcdTAxM0ZcIixcImxtaWRvdFwiOlwiXFx1MDE0MFwiLFwibG1vdXN0YWNoZVwiOlwiXFx1MjNCMFwiLFwibG1vdXN0XCI6XCJcXHUyM0IwXCIsXCJsbmFwXCI6XCJcXHUyQTg5XCIsXCJsbmFwcHJveFwiOlwiXFx1MkE4OVwiLFwibG5lXCI6XCJcXHUyQTg3XCIsXCJsbkVcIjpcIlxcdTIyNjhcIixcImxuZXFcIjpcIlxcdTJBODdcIixcImxuZXFxXCI6XCJcXHUyMjY4XCIsXCJsbnNpbVwiOlwiXFx1MjJFNlwiLFwibG9hbmdcIjpcIlxcdTI3RUNcIixcImxvYXJyXCI6XCJcXHUyMUZEXCIsXCJsb2Jya1wiOlwiXFx1MjdFNlwiLFwibG9uZ2xlZnRhcnJvd1wiOlwiXFx1MjdGNVwiLFwiTG9uZ0xlZnRBcnJvd1wiOlwiXFx1MjdGNVwiLFwiTG9uZ2xlZnRhcnJvd1wiOlwiXFx1MjdGOFwiLFwibG9uZ2xlZnRyaWdodGFycm93XCI6XCJcXHUyN0Y3XCIsXCJMb25nTGVmdFJpZ2h0QXJyb3dcIjpcIlxcdTI3RjdcIixcIkxvbmdsZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjdGQVwiLFwibG9uZ21hcHN0b1wiOlwiXFx1MjdGQ1wiLFwibG9uZ3JpZ2h0YXJyb3dcIjpcIlxcdTI3RjZcIixcIkxvbmdSaWdodEFycm93XCI6XCJcXHUyN0Y2XCIsXCJMb25ncmlnaHRhcnJvd1wiOlwiXFx1MjdGOVwiLFwibG9vcGFycm93bGVmdFwiOlwiXFx1MjFBQlwiLFwibG9vcGFycm93cmlnaHRcIjpcIlxcdTIxQUNcIixcImxvcGFyXCI6XCJcXHUyOTg1XCIsXCJMb3BmXCI6XCJcXHVEODM1XFx1REQ0M1wiLFwibG9wZlwiOlwiXFx1RDgzNVxcdURENURcIixcImxvcGx1c1wiOlwiXFx1MkEyRFwiLFwibG90aW1lc1wiOlwiXFx1MkEzNFwiLFwibG93YXN0XCI6XCJcXHUyMjE3XCIsXCJsb3diYXJcIjpcIl9cIixcIkxvd2VyTGVmdEFycm93XCI6XCJcXHUyMTk5XCIsXCJMb3dlclJpZ2h0QXJyb3dcIjpcIlxcdTIxOThcIixcImxvelwiOlwiXFx1MjVDQVwiLFwibG96ZW5nZVwiOlwiXFx1MjVDQVwiLFwibG96ZlwiOlwiXFx1MjlFQlwiLFwibHBhclwiOlwiKFwiLFwibHBhcmx0XCI6XCJcXHUyOTkzXCIsXCJscmFyclwiOlwiXFx1MjFDNlwiLFwibHJjb3JuZXJcIjpcIlxcdTIzMUZcIixcImxyaGFyXCI6XCJcXHUyMUNCXCIsXCJscmhhcmRcIjpcIlxcdTI5NkRcIixcImxybVwiOlwiXFx1MjAwRVwiLFwibHJ0cmlcIjpcIlxcdTIyQkZcIixcImxzYXF1b1wiOlwiXFx1MjAzOVwiLFwibHNjclwiOlwiXFx1RDgzNVxcdURDQzFcIixcIkxzY3JcIjpcIlxcdTIxMTJcIixcImxzaFwiOlwiXFx1MjFCMFwiLFwiTHNoXCI6XCJcXHUyMUIwXCIsXCJsc2ltXCI6XCJcXHUyMjcyXCIsXCJsc2ltZVwiOlwiXFx1MkE4RFwiLFwibHNpbWdcIjpcIlxcdTJBOEZcIixcImxzcWJcIjpcIltcIixcImxzcXVvXCI6XCJcXHUyMDE4XCIsXCJsc3F1b3JcIjpcIlxcdTIwMUFcIixcIkxzdHJva1wiOlwiXFx1MDE0MVwiLFwibHN0cm9rXCI6XCJcXHUwMTQyXCIsXCJsdGNjXCI6XCJcXHUyQUE2XCIsXCJsdGNpclwiOlwiXFx1MkE3OVwiLFwibHRcIjpcIjxcIixcIkxUXCI6XCI8XCIsXCJMdFwiOlwiXFx1MjI2QVwiLFwibHRkb3RcIjpcIlxcdTIyRDZcIixcImx0aHJlZVwiOlwiXFx1MjJDQlwiLFwibHRpbWVzXCI6XCJcXHUyMkM5XCIsXCJsdGxhcnJcIjpcIlxcdTI5NzZcIixcImx0cXVlc3RcIjpcIlxcdTJBN0JcIixcImx0cmlcIjpcIlxcdTI1QzNcIixcImx0cmllXCI6XCJcXHUyMkI0XCIsXCJsdHJpZlwiOlwiXFx1MjVDMlwiLFwibHRyUGFyXCI6XCJcXHUyOTk2XCIsXCJsdXJkc2hhclwiOlwiXFx1Mjk0QVwiLFwibHVydWhhclwiOlwiXFx1Mjk2NlwiLFwibHZlcnRuZXFxXCI6XCJcXHUyMjY4XFx1RkUwMFwiLFwibHZuRVwiOlwiXFx1MjI2OFxcdUZFMDBcIixcIm1hY3JcIjpcIlxcdTAwQUZcIixcIm1hbGVcIjpcIlxcdTI2NDJcIixcIm1hbHRcIjpcIlxcdTI3MjBcIixcIm1hbHRlc2VcIjpcIlxcdTI3MjBcIixcIk1hcFwiOlwiXFx1MjkwNVwiLFwibWFwXCI6XCJcXHUyMUE2XCIsXCJtYXBzdG9cIjpcIlxcdTIxQTZcIixcIm1hcHN0b2Rvd25cIjpcIlxcdTIxQTdcIixcIm1hcHN0b2xlZnRcIjpcIlxcdTIxQTRcIixcIm1hcHN0b3VwXCI6XCJcXHUyMUE1XCIsXCJtYXJrZXJcIjpcIlxcdTI1QUVcIixcIm1jb21tYVwiOlwiXFx1MkEyOVwiLFwiTWN5XCI6XCJcXHUwNDFDXCIsXCJtY3lcIjpcIlxcdTA0M0NcIixcIm1kYXNoXCI6XCJcXHUyMDE0XCIsXCJtRERvdFwiOlwiXFx1MjIzQVwiLFwibWVhc3VyZWRhbmdsZVwiOlwiXFx1MjIyMVwiLFwiTWVkaXVtU3BhY2VcIjpcIlxcdTIwNUZcIixcIk1lbGxpbnRyZlwiOlwiXFx1MjEzM1wiLFwiTWZyXCI6XCJcXHVEODM1XFx1REQxMFwiLFwibWZyXCI6XCJcXHVEODM1XFx1REQyQVwiLFwibWhvXCI6XCJcXHUyMTI3XCIsXCJtaWNyb1wiOlwiXFx1MDBCNVwiLFwibWlkYXN0XCI6XCIqXCIsXCJtaWRjaXJcIjpcIlxcdTJBRjBcIixcIm1pZFwiOlwiXFx1MjIyM1wiLFwibWlkZG90XCI6XCJcXHUwMEI3XCIsXCJtaW51c2JcIjpcIlxcdTIyOUZcIixcIm1pbnVzXCI6XCJcXHUyMjEyXCIsXCJtaW51c2RcIjpcIlxcdTIyMzhcIixcIm1pbnVzZHVcIjpcIlxcdTJBMkFcIixcIk1pbnVzUGx1c1wiOlwiXFx1MjIxM1wiLFwibWxjcFwiOlwiXFx1MkFEQlwiLFwibWxkclwiOlwiXFx1MjAyNlwiLFwibW5wbHVzXCI6XCJcXHUyMjEzXCIsXCJtb2RlbHNcIjpcIlxcdTIyQTdcIixcIk1vcGZcIjpcIlxcdUQ4MzVcXHVERDQ0XCIsXCJtb3BmXCI6XCJcXHVEODM1XFx1REQ1RVwiLFwibXBcIjpcIlxcdTIyMTNcIixcIm1zY3JcIjpcIlxcdUQ4MzVcXHVEQ0MyXCIsXCJNc2NyXCI6XCJcXHUyMTMzXCIsXCJtc3Rwb3NcIjpcIlxcdTIyM0VcIixcIk11XCI6XCJcXHUwMzlDXCIsXCJtdVwiOlwiXFx1MDNCQ1wiLFwibXVsdGltYXBcIjpcIlxcdTIyQjhcIixcIm11bWFwXCI6XCJcXHUyMkI4XCIsXCJuYWJsYVwiOlwiXFx1MjIwN1wiLFwiTmFjdXRlXCI6XCJcXHUwMTQzXCIsXCJuYWN1dGVcIjpcIlxcdTAxNDRcIixcIm5hbmdcIjpcIlxcdTIyMjBcXHUyMEQyXCIsXCJuYXBcIjpcIlxcdTIyNDlcIixcIm5hcEVcIjpcIlxcdTJBNzBcXHUwMzM4XCIsXCJuYXBpZFwiOlwiXFx1MjI0QlxcdTAzMzhcIixcIm5hcG9zXCI6XCJcXHUwMTQ5XCIsXCJuYXBwcm94XCI6XCJcXHUyMjQ5XCIsXCJuYXR1cmFsXCI6XCJcXHUyNjZFXCIsXCJuYXR1cmFsc1wiOlwiXFx1MjExNVwiLFwibmF0dXJcIjpcIlxcdTI2NkVcIixcIm5ic3BcIjpcIlxcdTAwQTBcIixcIm5idW1wXCI6XCJcXHUyMjRFXFx1MDMzOFwiLFwibmJ1bXBlXCI6XCJcXHUyMjRGXFx1MDMzOFwiLFwibmNhcFwiOlwiXFx1MkE0M1wiLFwiTmNhcm9uXCI6XCJcXHUwMTQ3XCIsXCJuY2Fyb25cIjpcIlxcdTAxNDhcIixcIk5jZWRpbFwiOlwiXFx1MDE0NVwiLFwibmNlZGlsXCI6XCJcXHUwMTQ2XCIsXCJuY29uZ1wiOlwiXFx1MjI0N1wiLFwibmNvbmdkb3RcIjpcIlxcdTJBNkRcXHUwMzM4XCIsXCJuY3VwXCI6XCJcXHUyQTQyXCIsXCJOY3lcIjpcIlxcdTA0MURcIixcIm5jeVwiOlwiXFx1MDQzRFwiLFwibmRhc2hcIjpcIlxcdTIwMTNcIixcIm5lYXJoa1wiOlwiXFx1MjkyNFwiLFwibmVhcnJcIjpcIlxcdTIxOTdcIixcIm5lQXJyXCI6XCJcXHUyMUQ3XCIsXCJuZWFycm93XCI6XCJcXHUyMTk3XCIsXCJuZVwiOlwiXFx1MjI2MFwiLFwibmVkb3RcIjpcIlxcdTIyNTBcXHUwMzM4XCIsXCJOZWdhdGl2ZU1lZGl1bVNwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVRoaWNrU3BhY2VcIjpcIlxcdTIwMEJcIixcIk5lZ2F0aXZlVGhpblNwYWNlXCI6XCJcXHUyMDBCXCIsXCJOZWdhdGl2ZVZlcnlUaGluU3BhY2VcIjpcIlxcdTIwMEJcIixcIm5lcXVpdlwiOlwiXFx1MjI2MlwiLFwibmVzZWFyXCI6XCJcXHUyOTI4XCIsXCJuZXNpbVwiOlwiXFx1MjI0MlxcdTAzMzhcIixcIk5lc3RlZEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyMjZCXCIsXCJOZXN0ZWRMZXNzTGVzc1wiOlwiXFx1MjI2QVwiLFwiTmV3TGluZVwiOlwiXFxuXCIsXCJuZXhpc3RcIjpcIlxcdTIyMDRcIixcIm5leGlzdHNcIjpcIlxcdTIyMDRcIixcIk5mclwiOlwiXFx1RDgzNVxcdUREMTFcIixcIm5mclwiOlwiXFx1RDgzNVxcdUREMkJcIixcIm5nRVwiOlwiXFx1MjI2N1xcdTAzMzhcIixcIm5nZVwiOlwiXFx1MjI3MVwiLFwibmdlcVwiOlwiXFx1MjI3MVwiLFwibmdlcXFcIjpcIlxcdTIyNjdcXHUwMzM4XCIsXCJuZ2Vxc2xhbnRcIjpcIlxcdTJBN0VcXHUwMzM4XCIsXCJuZ2VzXCI6XCJcXHUyQTdFXFx1MDMzOFwiLFwibkdnXCI6XCJcXHUyMkQ5XFx1MDMzOFwiLFwibmdzaW1cIjpcIlxcdTIyNzVcIixcIm5HdFwiOlwiXFx1MjI2QlxcdTIwRDJcIixcIm5ndFwiOlwiXFx1MjI2RlwiLFwibmd0clwiOlwiXFx1MjI2RlwiLFwibkd0dlwiOlwiXFx1MjI2QlxcdTAzMzhcIixcIm5oYXJyXCI6XCJcXHUyMUFFXCIsXCJuaEFyclwiOlwiXFx1MjFDRVwiLFwibmhwYXJcIjpcIlxcdTJBRjJcIixcIm5pXCI6XCJcXHUyMjBCXCIsXCJuaXNcIjpcIlxcdTIyRkNcIixcIm5pc2RcIjpcIlxcdTIyRkFcIixcIm5pdlwiOlwiXFx1MjIwQlwiLFwiTkpjeVwiOlwiXFx1MDQwQVwiLFwibmpjeVwiOlwiXFx1MDQ1QVwiLFwibmxhcnJcIjpcIlxcdTIxOUFcIixcIm5sQXJyXCI6XCJcXHUyMUNEXCIsXCJubGRyXCI6XCJcXHUyMDI1XCIsXCJubEVcIjpcIlxcdTIyNjZcXHUwMzM4XCIsXCJubGVcIjpcIlxcdTIyNzBcIixcIm5sZWZ0YXJyb3dcIjpcIlxcdTIxOUFcIixcIm5MZWZ0YXJyb3dcIjpcIlxcdTIxQ0RcIixcIm5sZWZ0cmlnaHRhcnJvd1wiOlwiXFx1MjFBRVwiLFwibkxlZnRyaWdodGFycm93XCI6XCJcXHUyMUNFXCIsXCJubGVxXCI6XCJcXHUyMjcwXCIsXCJubGVxcVwiOlwiXFx1MjI2NlxcdTAzMzhcIixcIm5sZXFzbGFudFwiOlwiXFx1MkE3RFxcdTAzMzhcIixcIm5sZXNcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJubGVzc1wiOlwiXFx1MjI2RVwiLFwibkxsXCI6XCJcXHUyMkQ4XFx1MDMzOFwiLFwibmxzaW1cIjpcIlxcdTIyNzRcIixcIm5MdFwiOlwiXFx1MjI2QVxcdTIwRDJcIixcIm5sdFwiOlwiXFx1MjI2RVwiLFwibmx0cmlcIjpcIlxcdTIyRUFcIixcIm5sdHJpZVwiOlwiXFx1MjJFQ1wiLFwibkx0dlwiOlwiXFx1MjI2QVxcdTAzMzhcIixcIm5taWRcIjpcIlxcdTIyMjRcIixcIk5vQnJlYWtcIjpcIlxcdTIwNjBcIixcIk5vbkJyZWFraW5nU3BhY2VcIjpcIlxcdTAwQTBcIixcIm5vcGZcIjpcIlxcdUQ4MzVcXHVERDVGXCIsXCJOb3BmXCI6XCJcXHUyMTE1XCIsXCJOb3RcIjpcIlxcdTJBRUNcIixcIm5vdFwiOlwiXFx1MDBBQ1wiLFwiTm90Q29uZ3J1ZW50XCI6XCJcXHUyMjYyXCIsXCJOb3RDdXBDYXBcIjpcIlxcdTIyNkRcIixcIk5vdERvdWJsZVZlcnRpY2FsQmFyXCI6XCJcXHUyMjI2XCIsXCJOb3RFbGVtZW50XCI6XCJcXHUyMjA5XCIsXCJOb3RFcXVhbFwiOlwiXFx1MjI2MFwiLFwiTm90RXF1YWxUaWxkZVwiOlwiXFx1MjI0MlxcdTAzMzhcIixcIk5vdEV4aXN0c1wiOlwiXFx1MjIwNFwiLFwiTm90R3JlYXRlclwiOlwiXFx1MjI2RlwiLFwiTm90R3JlYXRlckVxdWFsXCI6XCJcXHUyMjcxXCIsXCJOb3RHcmVhdGVyRnVsbEVxdWFsXCI6XCJcXHUyMjY3XFx1MDMzOFwiLFwiTm90R3JlYXRlckdyZWF0ZXJcIjpcIlxcdTIyNkJcXHUwMzM4XCIsXCJOb3RHcmVhdGVyTGVzc1wiOlwiXFx1MjI3OVwiLFwiTm90R3JlYXRlclNsYW50RXF1YWxcIjpcIlxcdTJBN0VcXHUwMzM4XCIsXCJOb3RHcmVhdGVyVGlsZGVcIjpcIlxcdTIyNzVcIixcIk5vdEh1bXBEb3duSHVtcFwiOlwiXFx1MjI0RVxcdTAzMzhcIixcIk5vdEh1bXBFcXVhbFwiOlwiXFx1MjI0RlxcdTAzMzhcIixcIm5vdGluXCI6XCJcXHUyMjA5XCIsXCJub3RpbmRvdFwiOlwiXFx1MjJGNVxcdTAzMzhcIixcIm5vdGluRVwiOlwiXFx1MjJGOVxcdTAzMzhcIixcIm5vdGludmFcIjpcIlxcdTIyMDlcIixcIm5vdGludmJcIjpcIlxcdTIyRjdcIixcIm5vdGludmNcIjpcIlxcdTIyRjZcIixcIk5vdExlZnRUcmlhbmdsZUJhclwiOlwiXFx1MjlDRlxcdTAzMzhcIixcIk5vdExlZnRUcmlhbmdsZVwiOlwiXFx1MjJFQVwiLFwiTm90TGVmdFRyaWFuZ2xlRXF1YWxcIjpcIlxcdTIyRUNcIixcIk5vdExlc3NcIjpcIlxcdTIyNkVcIixcIk5vdExlc3NFcXVhbFwiOlwiXFx1MjI3MFwiLFwiTm90TGVzc0dyZWF0ZXJcIjpcIlxcdTIyNzhcIixcIk5vdExlc3NMZXNzXCI6XCJcXHUyMjZBXFx1MDMzOFwiLFwiTm90TGVzc1NsYW50RXF1YWxcIjpcIlxcdTJBN0RcXHUwMzM4XCIsXCJOb3RMZXNzVGlsZGVcIjpcIlxcdTIyNzRcIixcIk5vdE5lc3RlZEdyZWF0ZXJHcmVhdGVyXCI6XCJcXHUyQUEyXFx1MDMzOFwiLFwiTm90TmVzdGVkTGVzc0xlc3NcIjpcIlxcdTJBQTFcXHUwMzM4XCIsXCJub3RuaVwiOlwiXFx1MjIwQ1wiLFwibm90bml2YVwiOlwiXFx1MjIwQ1wiLFwibm90bml2YlwiOlwiXFx1MjJGRVwiLFwibm90bml2Y1wiOlwiXFx1MjJGRFwiLFwiTm90UHJlY2VkZXNcIjpcIlxcdTIyODBcIixcIk5vdFByZWNlZGVzRXF1YWxcIjpcIlxcdTJBQUZcXHUwMzM4XCIsXCJOb3RQcmVjZWRlc1NsYW50RXF1YWxcIjpcIlxcdTIyRTBcIixcIk5vdFJldmVyc2VFbGVtZW50XCI6XCJcXHUyMjBDXCIsXCJOb3RSaWdodFRyaWFuZ2xlQmFyXCI6XCJcXHUyOUQwXFx1MDMzOFwiLFwiTm90UmlnaHRUcmlhbmdsZVwiOlwiXFx1MjJFQlwiLFwiTm90UmlnaHRUcmlhbmdsZUVxdWFsXCI6XCJcXHUyMkVEXCIsXCJOb3RTcXVhcmVTdWJzZXRcIjpcIlxcdTIyOEZcXHUwMzM4XCIsXCJOb3RTcXVhcmVTdWJzZXRFcXVhbFwiOlwiXFx1MjJFMlwiLFwiTm90U3F1YXJlU3VwZXJzZXRcIjpcIlxcdTIyOTBcXHUwMzM4XCIsXCJOb3RTcXVhcmVTdXBlcnNldEVxdWFsXCI6XCJcXHUyMkUzXCIsXCJOb3RTdWJzZXRcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJOb3RTdWJzZXRFcXVhbFwiOlwiXFx1MjI4OFwiLFwiTm90U3VjY2VlZHNcIjpcIlxcdTIyODFcIixcIk5vdFN1Y2NlZWRzRXF1YWxcIjpcIlxcdTJBQjBcXHUwMzM4XCIsXCJOb3RTdWNjZWVkc1NsYW50RXF1YWxcIjpcIlxcdTIyRTFcIixcIk5vdFN1Y2NlZWRzVGlsZGVcIjpcIlxcdTIyN0ZcXHUwMzM4XCIsXCJOb3RTdXBlcnNldFwiOlwiXFx1MjI4M1xcdTIwRDJcIixcIk5vdFN1cGVyc2V0RXF1YWxcIjpcIlxcdTIyODlcIixcIk5vdFRpbGRlXCI6XCJcXHUyMjQxXCIsXCJOb3RUaWxkZUVxdWFsXCI6XCJcXHUyMjQ0XCIsXCJOb3RUaWxkZUZ1bGxFcXVhbFwiOlwiXFx1MjI0N1wiLFwiTm90VGlsZGVUaWxkZVwiOlwiXFx1MjI0OVwiLFwiTm90VmVydGljYWxCYXJcIjpcIlxcdTIyMjRcIixcIm5wYXJhbGxlbFwiOlwiXFx1MjIyNlwiLFwibnBhclwiOlwiXFx1MjIyNlwiLFwibnBhcnNsXCI6XCJcXHUyQUZEXFx1MjBFNVwiLFwibnBhcnRcIjpcIlxcdTIyMDJcXHUwMzM4XCIsXCJucG9saW50XCI6XCJcXHUyQTE0XCIsXCJucHJcIjpcIlxcdTIyODBcIixcIm5wcmN1ZVwiOlwiXFx1MjJFMFwiLFwibnByZWNcIjpcIlxcdTIyODBcIixcIm5wcmVjZXFcIjpcIlxcdTJBQUZcXHUwMzM4XCIsXCJucHJlXCI6XCJcXHUyQUFGXFx1MDMzOFwiLFwibnJhcnJjXCI6XCJcXHUyOTMzXFx1MDMzOFwiLFwibnJhcnJcIjpcIlxcdTIxOUJcIixcIm5yQXJyXCI6XCJcXHUyMUNGXCIsXCJucmFycndcIjpcIlxcdTIxOURcXHUwMzM4XCIsXCJucmlnaHRhcnJvd1wiOlwiXFx1MjE5QlwiLFwiblJpZ2h0YXJyb3dcIjpcIlxcdTIxQ0ZcIixcIm5ydHJpXCI6XCJcXHUyMkVCXCIsXCJucnRyaWVcIjpcIlxcdTIyRURcIixcIm5zY1wiOlwiXFx1MjI4MVwiLFwibnNjY3VlXCI6XCJcXHUyMkUxXCIsXCJuc2NlXCI6XCJcXHUyQUIwXFx1MDMzOFwiLFwiTnNjclwiOlwiXFx1RDgzNVxcdURDQTlcIixcIm5zY3JcIjpcIlxcdUQ4MzVcXHVEQ0MzXCIsXCJuc2hvcnRtaWRcIjpcIlxcdTIyMjRcIixcIm5zaG9ydHBhcmFsbGVsXCI6XCJcXHUyMjI2XCIsXCJuc2ltXCI6XCJcXHUyMjQxXCIsXCJuc2ltZVwiOlwiXFx1MjI0NFwiLFwibnNpbWVxXCI6XCJcXHUyMjQ0XCIsXCJuc21pZFwiOlwiXFx1MjIyNFwiLFwibnNwYXJcIjpcIlxcdTIyMjZcIixcIm5zcXN1YmVcIjpcIlxcdTIyRTJcIixcIm5zcXN1cGVcIjpcIlxcdTIyRTNcIixcIm5zdWJcIjpcIlxcdTIyODRcIixcIm5zdWJFXCI6XCJcXHUyQUM1XFx1MDMzOFwiLFwibnN1YmVcIjpcIlxcdTIyODhcIixcIm5zdWJzZXRcIjpcIlxcdTIyODJcXHUyMEQyXCIsXCJuc3Vic2V0ZXFcIjpcIlxcdTIyODhcIixcIm5zdWJzZXRlcXFcIjpcIlxcdTJBQzVcXHUwMzM4XCIsXCJuc3VjY1wiOlwiXFx1MjI4MVwiLFwibnN1Y2NlcVwiOlwiXFx1MkFCMFxcdTAzMzhcIixcIm5zdXBcIjpcIlxcdTIyODVcIixcIm5zdXBFXCI6XCJcXHUyQUM2XFx1MDMzOFwiLFwibnN1cGVcIjpcIlxcdTIyODlcIixcIm5zdXBzZXRcIjpcIlxcdTIyODNcXHUyMEQyXCIsXCJuc3Vwc2V0ZXFcIjpcIlxcdTIyODlcIixcIm5zdXBzZXRlcXFcIjpcIlxcdTJBQzZcXHUwMzM4XCIsXCJudGdsXCI6XCJcXHUyMjc5XCIsXCJOdGlsZGVcIjpcIlxcdTAwRDFcIixcIm50aWxkZVwiOlwiXFx1MDBGMVwiLFwibnRsZ1wiOlwiXFx1MjI3OFwiLFwibnRyaWFuZ2xlbGVmdFwiOlwiXFx1MjJFQVwiLFwibnRyaWFuZ2xlbGVmdGVxXCI6XCJcXHUyMkVDXCIsXCJudHJpYW5nbGVyaWdodFwiOlwiXFx1MjJFQlwiLFwibnRyaWFuZ2xlcmlnaHRlcVwiOlwiXFx1MjJFRFwiLFwiTnVcIjpcIlxcdTAzOURcIixcIm51XCI6XCJcXHUwM0JEXCIsXCJudW1cIjpcIiNcIixcIm51bWVyb1wiOlwiXFx1MjExNlwiLFwibnVtc3BcIjpcIlxcdTIwMDdcIixcIm52YXBcIjpcIlxcdTIyNERcXHUyMEQyXCIsXCJudmRhc2hcIjpcIlxcdTIyQUNcIixcIm52RGFzaFwiOlwiXFx1MjJBRFwiLFwiblZkYXNoXCI6XCJcXHUyMkFFXCIsXCJuVkRhc2hcIjpcIlxcdTIyQUZcIixcIm52Z2VcIjpcIlxcdTIyNjVcXHUyMEQyXCIsXCJudmd0XCI6XCI+XFx1MjBEMlwiLFwibnZIYXJyXCI6XCJcXHUyOTA0XCIsXCJudmluZmluXCI6XCJcXHUyOURFXCIsXCJudmxBcnJcIjpcIlxcdTI5MDJcIixcIm52bGVcIjpcIlxcdTIyNjRcXHUyMEQyXCIsXCJudmx0XCI6XCI8XFx1MjBEMlwiLFwibnZsdHJpZVwiOlwiXFx1MjJCNFxcdTIwRDJcIixcIm52ckFyclwiOlwiXFx1MjkwM1wiLFwibnZydHJpZVwiOlwiXFx1MjJCNVxcdTIwRDJcIixcIm52c2ltXCI6XCJcXHUyMjNDXFx1MjBEMlwiLFwibndhcmhrXCI6XCJcXHUyOTIzXCIsXCJud2FyclwiOlwiXFx1MjE5NlwiLFwibndBcnJcIjpcIlxcdTIxRDZcIixcIm53YXJyb3dcIjpcIlxcdTIxOTZcIixcIm53bmVhclwiOlwiXFx1MjkyN1wiLFwiT2FjdXRlXCI6XCJcXHUwMEQzXCIsXCJvYWN1dGVcIjpcIlxcdTAwRjNcIixcIm9hc3RcIjpcIlxcdTIyOUJcIixcIk9jaXJjXCI6XCJcXHUwMEQ0XCIsXCJvY2lyY1wiOlwiXFx1MDBGNFwiLFwib2NpclwiOlwiXFx1MjI5QVwiLFwiT2N5XCI6XCJcXHUwNDFFXCIsXCJvY3lcIjpcIlxcdTA0M0VcIixcIm9kYXNoXCI6XCJcXHUyMjlEXCIsXCJPZGJsYWNcIjpcIlxcdTAxNTBcIixcIm9kYmxhY1wiOlwiXFx1MDE1MVwiLFwib2RpdlwiOlwiXFx1MkEzOFwiLFwib2RvdFwiOlwiXFx1MjI5OVwiLFwib2Rzb2xkXCI6XCJcXHUyOUJDXCIsXCJPRWxpZ1wiOlwiXFx1MDE1MlwiLFwib2VsaWdcIjpcIlxcdTAxNTNcIixcIm9mY2lyXCI6XCJcXHUyOUJGXCIsXCJPZnJcIjpcIlxcdUQ4MzVcXHVERDEyXCIsXCJvZnJcIjpcIlxcdUQ4MzVcXHVERDJDXCIsXCJvZ29uXCI6XCJcXHUwMkRCXCIsXCJPZ3JhdmVcIjpcIlxcdTAwRDJcIixcIm9ncmF2ZVwiOlwiXFx1MDBGMlwiLFwib2d0XCI6XCJcXHUyOUMxXCIsXCJvaGJhclwiOlwiXFx1MjlCNVwiLFwib2htXCI6XCJcXHUwM0E5XCIsXCJvaW50XCI6XCJcXHUyMjJFXCIsXCJvbGFyclwiOlwiXFx1MjFCQVwiLFwib2xjaXJcIjpcIlxcdTI5QkVcIixcIm9sY3Jvc3NcIjpcIlxcdTI5QkJcIixcIm9saW5lXCI6XCJcXHUyMDNFXCIsXCJvbHRcIjpcIlxcdTI5QzBcIixcIk9tYWNyXCI6XCJcXHUwMTRDXCIsXCJvbWFjclwiOlwiXFx1MDE0RFwiLFwiT21lZ2FcIjpcIlxcdTAzQTlcIixcIm9tZWdhXCI6XCJcXHUwM0M5XCIsXCJPbWljcm9uXCI6XCJcXHUwMzlGXCIsXCJvbWljcm9uXCI6XCJcXHUwM0JGXCIsXCJvbWlkXCI6XCJcXHUyOUI2XCIsXCJvbWludXNcIjpcIlxcdTIyOTZcIixcIk9vcGZcIjpcIlxcdUQ4MzVcXHVERDQ2XCIsXCJvb3BmXCI6XCJcXHVEODM1XFx1REQ2MFwiLFwib3BhclwiOlwiXFx1MjlCN1wiLFwiT3BlbkN1cmx5RG91YmxlUXVvdGVcIjpcIlxcdTIwMUNcIixcIk9wZW5DdXJseVF1b3RlXCI6XCJcXHUyMDE4XCIsXCJvcGVycFwiOlwiXFx1MjlCOVwiLFwib3BsdXNcIjpcIlxcdTIyOTVcIixcIm9yYXJyXCI6XCJcXHUyMUJCXCIsXCJPclwiOlwiXFx1MkE1NFwiLFwib3JcIjpcIlxcdTIyMjhcIixcIm9yZFwiOlwiXFx1MkE1RFwiLFwib3JkZXJcIjpcIlxcdTIxMzRcIixcIm9yZGVyb2ZcIjpcIlxcdTIxMzRcIixcIm9yZGZcIjpcIlxcdTAwQUFcIixcIm9yZG1cIjpcIlxcdTAwQkFcIixcIm9yaWdvZlwiOlwiXFx1MjJCNlwiLFwib3JvclwiOlwiXFx1MkE1NlwiLFwib3JzbG9wZVwiOlwiXFx1MkE1N1wiLFwib3J2XCI6XCJcXHUyQTVCXCIsXCJvU1wiOlwiXFx1MjRDOFwiLFwiT3NjclwiOlwiXFx1RDgzNVxcdURDQUFcIixcIm9zY3JcIjpcIlxcdTIxMzRcIixcIk9zbGFzaFwiOlwiXFx1MDBEOFwiLFwib3NsYXNoXCI6XCJcXHUwMEY4XCIsXCJvc29sXCI6XCJcXHUyMjk4XCIsXCJPdGlsZGVcIjpcIlxcdTAwRDVcIixcIm90aWxkZVwiOlwiXFx1MDBGNVwiLFwib3RpbWVzYXNcIjpcIlxcdTJBMzZcIixcIk90aW1lc1wiOlwiXFx1MkEzN1wiLFwib3RpbWVzXCI6XCJcXHUyMjk3XCIsXCJPdW1sXCI6XCJcXHUwMEQ2XCIsXCJvdW1sXCI6XCJcXHUwMEY2XCIsXCJvdmJhclwiOlwiXFx1MjMzRFwiLFwiT3ZlckJhclwiOlwiXFx1MjAzRVwiLFwiT3ZlckJyYWNlXCI6XCJcXHUyM0RFXCIsXCJPdmVyQnJhY2tldFwiOlwiXFx1MjNCNFwiLFwiT3ZlclBhcmVudGhlc2lzXCI6XCJcXHUyM0RDXCIsXCJwYXJhXCI6XCJcXHUwMEI2XCIsXCJwYXJhbGxlbFwiOlwiXFx1MjIyNVwiLFwicGFyXCI6XCJcXHUyMjI1XCIsXCJwYXJzaW1cIjpcIlxcdTJBRjNcIixcInBhcnNsXCI6XCJcXHUyQUZEXCIsXCJwYXJ0XCI6XCJcXHUyMjAyXCIsXCJQYXJ0aWFsRFwiOlwiXFx1MjIwMlwiLFwiUGN5XCI6XCJcXHUwNDFGXCIsXCJwY3lcIjpcIlxcdTA0M0ZcIixcInBlcmNudFwiOlwiJVwiLFwicGVyaW9kXCI6XCIuXCIsXCJwZXJtaWxcIjpcIlxcdTIwMzBcIixcInBlcnBcIjpcIlxcdTIyQTVcIixcInBlcnRlbmtcIjpcIlxcdTIwMzFcIixcIlBmclwiOlwiXFx1RDgzNVxcdUREMTNcIixcInBmclwiOlwiXFx1RDgzNVxcdUREMkRcIixcIlBoaVwiOlwiXFx1MDNBNlwiLFwicGhpXCI6XCJcXHUwM0M2XCIsXCJwaGl2XCI6XCJcXHUwM0Q1XCIsXCJwaG1tYXRcIjpcIlxcdTIxMzNcIixcInBob25lXCI6XCJcXHUyNjBFXCIsXCJQaVwiOlwiXFx1MDNBMFwiLFwicGlcIjpcIlxcdTAzQzBcIixcInBpdGNoZm9ya1wiOlwiXFx1MjJENFwiLFwicGl2XCI6XCJcXHUwM0Q2XCIsXCJwbGFuY2tcIjpcIlxcdTIxMEZcIixcInBsYW5ja2hcIjpcIlxcdTIxMEVcIixcInBsYW5rdlwiOlwiXFx1MjEwRlwiLFwicGx1c2FjaXJcIjpcIlxcdTJBMjNcIixcInBsdXNiXCI6XCJcXHUyMjlFXCIsXCJwbHVzY2lyXCI6XCJcXHUyQTIyXCIsXCJwbHVzXCI6XCIrXCIsXCJwbHVzZG9cIjpcIlxcdTIyMTRcIixcInBsdXNkdVwiOlwiXFx1MkEyNVwiLFwicGx1c2VcIjpcIlxcdTJBNzJcIixcIlBsdXNNaW51c1wiOlwiXFx1MDBCMVwiLFwicGx1c21uXCI6XCJcXHUwMEIxXCIsXCJwbHVzc2ltXCI6XCJcXHUyQTI2XCIsXCJwbHVzdHdvXCI6XCJcXHUyQTI3XCIsXCJwbVwiOlwiXFx1MDBCMVwiLFwiUG9pbmNhcmVwbGFuZVwiOlwiXFx1MjEwQ1wiLFwicG9pbnRpbnRcIjpcIlxcdTJBMTVcIixcInBvcGZcIjpcIlxcdUQ4MzVcXHVERDYxXCIsXCJQb3BmXCI6XCJcXHUyMTE5XCIsXCJwb3VuZFwiOlwiXFx1MDBBM1wiLFwicHJhcFwiOlwiXFx1MkFCN1wiLFwiUHJcIjpcIlxcdTJBQkJcIixcInByXCI6XCJcXHUyMjdBXCIsXCJwcmN1ZVwiOlwiXFx1MjI3Q1wiLFwicHJlY2FwcHJveFwiOlwiXFx1MkFCN1wiLFwicHJlY1wiOlwiXFx1MjI3QVwiLFwicHJlY2N1cmx5ZXFcIjpcIlxcdTIyN0NcIixcIlByZWNlZGVzXCI6XCJcXHUyMjdBXCIsXCJQcmVjZWRlc0VxdWFsXCI6XCJcXHUyQUFGXCIsXCJQcmVjZWRlc1NsYW50RXF1YWxcIjpcIlxcdTIyN0NcIixcIlByZWNlZGVzVGlsZGVcIjpcIlxcdTIyN0VcIixcInByZWNlcVwiOlwiXFx1MkFBRlwiLFwicHJlY25hcHByb3hcIjpcIlxcdTJBQjlcIixcInByZWNuZXFxXCI6XCJcXHUyQUI1XCIsXCJwcmVjbnNpbVwiOlwiXFx1MjJFOFwiLFwicHJlXCI6XCJcXHUyQUFGXCIsXCJwckVcIjpcIlxcdTJBQjNcIixcInByZWNzaW1cIjpcIlxcdTIyN0VcIixcInByaW1lXCI6XCJcXHUyMDMyXCIsXCJQcmltZVwiOlwiXFx1MjAzM1wiLFwicHJpbWVzXCI6XCJcXHUyMTE5XCIsXCJwcm5hcFwiOlwiXFx1MkFCOVwiLFwicHJuRVwiOlwiXFx1MkFCNVwiLFwicHJuc2ltXCI6XCJcXHUyMkU4XCIsXCJwcm9kXCI6XCJcXHUyMjBGXCIsXCJQcm9kdWN0XCI6XCJcXHUyMjBGXCIsXCJwcm9mYWxhclwiOlwiXFx1MjMyRVwiLFwicHJvZmxpbmVcIjpcIlxcdTIzMTJcIixcInByb2ZzdXJmXCI6XCJcXHUyMzEzXCIsXCJwcm9wXCI6XCJcXHUyMjFEXCIsXCJQcm9wb3J0aW9uYWxcIjpcIlxcdTIyMURcIixcIlByb3BvcnRpb25cIjpcIlxcdTIyMzdcIixcInByb3B0b1wiOlwiXFx1MjIxRFwiLFwicHJzaW1cIjpcIlxcdTIyN0VcIixcInBydXJlbFwiOlwiXFx1MjJCMFwiLFwiUHNjclwiOlwiXFx1RDgzNVxcdURDQUJcIixcInBzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M1XCIsXCJQc2lcIjpcIlxcdTAzQThcIixcInBzaVwiOlwiXFx1MDNDOFwiLFwicHVuY3NwXCI6XCJcXHUyMDA4XCIsXCJRZnJcIjpcIlxcdUQ4MzVcXHVERDE0XCIsXCJxZnJcIjpcIlxcdUQ4MzVcXHVERDJFXCIsXCJxaW50XCI6XCJcXHUyQTBDXCIsXCJxb3BmXCI6XCJcXHVEODM1XFx1REQ2MlwiLFwiUW9wZlwiOlwiXFx1MjExQVwiLFwicXByaW1lXCI6XCJcXHUyMDU3XCIsXCJRc2NyXCI6XCJcXHVEODM1XFx1RENBQ1wiLFwicXNjclwiOlwiXFx1RDgzNVxcdURDQzZcIixcInF1YXRlcm5pb25zXCI6XCJcXHUyMTBEXCIsXCJxdWF0aW50XCI6XCJcXHUyQTE2XCIsXCJxdWVzdFwiOlwiP1wiLFwicXVlc3RlcVwiOlwiXFx1MjI1RlwiLFwicXVvdFwiOlwiXFxcIlwiLFwiUVVPVFwiOlwiXFxcIlwiLFwickFhcnJcIjpcIlxcdTIxREJcIixcInJhY2VcIjpcIlxcdTIyM0RcXHUwMzMxXCIsXCJSYWN1dGVcIjpcIlxcdTAxNTRcIixcInJhY3V0ZVwiOlwiXFx1MDE1NVwiLFwicmFkaWNcIjpcIlxcdTIyMUFcIixcInJhZW1wdHl2XCI6XCJcXHUyOUIzXCIsXCJyYW5nXCI6XCJcXHUyN0U5XCIsXCJSYW5nXCI6XCJcXHUyN0VCXCIsXCJyYW5nZFwiOlwiXFx1Mjk5MlwiLFwicmFuZ2VcIjpcIlxcdTI5QTVcIixcInJhbmdsZVwiOlwiXFx1MjdFOVwiLFwicmFxdW9cIjpcIlxcdTAwQkJcIixcInJhcnJhcFwiOlwiXFx1Mjk3NVwiLFwicmFycmJcIjpcIlxcdTIxRTVcIixcInJhcnJiZnNcIjpcIlxcdTI5MjBcIixcInJhcnJjXCI6XCJcXHUyOTMzXCIsXCJyYXJyXCI6XCJcXHUyMTkyXCIsXCJSYXJyXCI6XCJcXHUyMUEwXCIsXCJyQXJyXCI6XCJcXHUyMUQyXCIsXCJyYXJyZnNcIjpcIlxcdTI5MUVcIixcInJhcnJoa1wiOlwiXFx1MjFBQVwiLFwicmFycmxwXCI6XCJcXHUyMUFDXCIsXCJyYXJycGxcIjpcIlxcdTI5NDVcIixcInJhcnJzaW1cIjpcIlxcdTI5NzRcIixcIlJhcnJ0bFwiOlwiXFx1MjkxNlwiLFwicmFycnRsXCI6XCJcXHUyMUEzXCIsXCJyYXJyd1wiOlwiXFx1MjE5RFwiLFwicmF0YWlsXCI6XCJcXHUyOTFBXCIsXCJyQXRhaWxcIjpcIlxcdTI5MUNcIixcInJhdGlvXCI6XCJcXHUyMjM2XCIsXCJyYXRpb25hbHNcIjpcIlxcdTIxMUFcIixcInJiYXJyXCI6XCJcXHUyOTBEXCIsXCJyQmFyclwiOlwiXFx1MjkwRlwiLFwiUkJhcnJcIjpcIlxcdTI5MTBcIixcInJiYnJrXCI6XCJcXHUyNzczXCIsXCJyYnJhY2VcIjpcIn1cIixcInJicmFja1wiOlwiXVwiLFwicmJya2VcIjpcIlxcdTI5OENcIixcInJicmtzbGRcIjpcIlxcdTI5OEVcIixcInJicmtzbHVcIjpcIlxcdTI5OTBcIixcIlJjYXJvblwiOlwiXFx1MDE1OFwiLFwicmNhcm9uXCI6XCJcXHUwMTU5XCIsXCJSY2VkaWxcIjpcIlxcdTAxNTZcIixcInJjZWRpbFwiOlwiXFx1MDE1N1wiLFwicmNlaWxcIjpcIlxcdTIzMDlcIixcInJjdWJcIjpcIn1cIixcIlJjeVwiOlwiXFx1MDQyMFwiLFwicmN5XCI6XCJcXHUwNDQwXCIsXCJyZGNhXCI6XCJcXHUyOTM3XCIsXCJyZGxkaGFyXCI6XCJcXHUyOTY5XCIsXCJyZHF1b1wiOlwiXFx1MjAxRFwiLFwicmRxdW9yXCI6XCJcXHUyMDFEXCIsXCJyZHNoXCI6XCJcXHUyMUIzXCIsXCJyZWFsXCI6XCJcXHUyMTFDXCIsXCJyZWFsaW5lXCI6XCJcXHUyMTFCXCIsXCJyZWFscGFydFwiOlwiXFx1MjExQ1wiLFwicmVhbHNcIjpcIlxcdTIxMURcIixcIlJlXCI6XCJcXHUyMTFDXCIsXCJyZWN0XCI6XCJcXHUyNUFEXCIsXCJyZWdcIjpcIlxcdTAwQUVcIixcIlJFR1wiOlwiXFx1MDBBRVwiLFwiUmV2ZXJzZUVsZW1lbnRcIjpcIlxcdTIyMEJcIixcIlJldmVyc2VFcXVpbGlicml1bVwiOlwiXFx1MjFDQlwiLFwiUmV2ZXJzZVVwRXF1aWxpYnJpdW1cIjpcIlxcdTI5NkZcIixcInJmaXNodFwiOlwiXFx1Mjk3RFwiLFwicmZsb29yXCI6XCJcXHUyMzBCXCIsXCJyZnJcIjpcIlxcdUQ4MzVcXHVERDJGXCIsXCJSZnJcIjpcIlxcdTIxMUNcIixcInJIYXJcIjpcIlxcdTI5NjRcIixcInJoYXJkXCI6XCJcXHUyMUMxXCIsXCJyaGFydVwiOlwiXFx1MjFDMFwiLFwicmhhcnVsXCI6XCJcXHUyOTZDXCIsXCJSaG9cIjpcIlxcdTAzQTFcIixcInJob1wiOlwiXFx1MDNDMVwiLFwicmhvdlwiOlwiXFx1MDNGMVwiLFwiUmlnaHRBbmdsZUJyYWNrZXRcIjpcIlxcdTI3RTlcIixcIlJpZ2h0QXJyb3dCYXJcIjpcIlxcdTIxRTVcIixcInJpZ2h0YXJyb3dcIjpcIlxcdTIxOTJcIixcIlJpZ2h0QXJyb3dcIjpcIlxcdTIxOTJcIixcIlJpZ2h0YXJyb3dcIjpcIlxcdTIxRDJcIixcIlJpZ2h0QXJyb3dMZWZ0QXJyb3dcIjpcIlxcdTIxQzRcIixcInJpZ2h0YXJyb3d0YWlsXCI6XCJcXHUyMUEzXCIsXCJSaWdodENlaWxpbmdcIjpcIlxcdTIzMDlcIixcIlJpZ2h0RG91YmxlQnJhY2tldFwiOlwiXFx1MjdFN1wiLFwiUmlnaHREb3duVGVlVmVjdG9yXCI6XCJcXHUyOTVEXCIsXCJSaWdodERvd25WZWN0b3JCYXJcIjpcIlxcdTI5NTVcIixcIlJpZ2h0RG93blZlY3RvclwiOlwiXFx1MjFDMlwiLFwiUmlnaHRGbG9vclwiOlwiXFx1MjMwQlwiLFwicmlnaHRoYXJwb29uZG93blwiOlwiXFx1MjFDMVwiLFwicmlnaHRoYXJwb29udXBcIjpcIlxcdTIxQzBcIixcInJpZ2h0bGVmdGFycm93c1wiOlwiXFx1MjFDNFwiLFwicmlnaHRsZWZ0aGFycG9vbnNcIjpcIlxcdTIxQ0NcIixcInJpZ2h0cmlnaHRhcnJvd3NcIjpcIlxcdTIxQzlcIixcInJpZ2h0c3F1aWdhcnJvd1wiOlwiXFx1MjE5RFwiLFwiUmlnaHRUZWVBcnJvd1wiOlwiXFx1MjFBNlwiLFwiUmlnaHRUZWVcIjpcIlxcdTIyQTJcIixcIlJpZ2h0VGVlVmVjdG9yXCI6XCJcXHUyOTVCXCIsXCJyaWdodHRocmVldGltZXNcIjpcIlxcdTIyQ0NcIixcIlJpZ2h0VHJpYW5nbGVCYXJcIjpcIlxcdTI5RDBcIixcIlJpZ2h0VHJpYW5nbGVcIjpcIlxcdTIyQjNcIixcIlJpZ2h0VHJpYW5nbGVFcXVhbFwiOlwiXFx1MjJCNVwiLFwiUmlnaHRVcERvd25WZWN0b3JcIjpcIlxcdTI5NEZcIixcIlJpZ2h0VXBUZWVWZWN0b3JcIjpcIlxcdTI5NUNcIixcIlJpZ2h0VXBWZWN0b3JCYXJcIjpcIlxcdTI5NTRcIixcIlJpZ2h0VXBWZWN0b3JcIjpcIlxcdTIxQkVcIixcIlJpZ2h0VmVjdG9yQmFyXCI6XCJcXHUyOTUzXCIsXCJSaWdodFZlY3RvclwiOlwiXFx1MjFDMFwiLFwicmluZ1wiOlwiXFx1MDJEQVwiLFwicmlzaW5nZG90c2VxXCI6XCJcXHUyMjUzXCIsXCJybGFyclwiOlwiXFx1MjFDNFwiLFwicmxoYXJcIjpcIlxcdTIxQ0NcIixcInJsbVwiOlwiXFx1MjAwRlwiLFwicm1vdXN0YWNoZVwiOlwiXFx1MjNCMVwiLFwicm1vdXN0XCI6XCJcXHUyM0IxXCIsXCJybm1pZFwiOlwiXFx1MkFFRVwiLFwicm9hbmdcIjpcIlxcdTI3RURcIixcInJvYXJyXCI6XCJcXHUyMUZFXCIsXCJyb2Jya1wiOlwiXFx1MjdFN1wiLFwicm9wYXJcIjpcIlxcdTI5ODZcIixcInJvcGZcIjpcIlxcdUQ4MzVcXHVERDYzXCIsXCJSb3BmXCI6XCJcXHUyMTFEXCIsXCJyb3BsdXNcIjpcIlxcdTJBMkVcIixcInJvdGltZXNcIjpcIlxcdTJBMzVcIixcIlJvdW5kSW1wbGllc1wiOlwiXFx1Mjk3MFwiLFwicnBhclwiOlwiKVwiLFwicnBhcmd0XCI6XCJcXHUyOTk0XCIsXCJycHBvbGludFwiOlwiXFx1MkExMlwiLFwicnJhcnJcIjpcIlxcdTIxQzlcIixcIlJyaWdodGFycm93XCI6XCJcXHUyMURCXCIsXCJyc2FxdW9cIjpcIlxcdTIwM0FcIixcInJzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M3XCIsXCJSc2NyXCI6XCJcXHUyMTFCXCIsXCJyc2hcIjpcIlxcdTIxQjFcIixcIlJzaFwiOlwiXFx1MjFCMVwiLFwicnNxYlwiOlwiXVwiLFwicnNxdW9cIjpcIlxcdTIwMTlcIixcInJzcXVvclwiOlwiXFx1MjAxOVwiLFwicnRocmVlXCI6XCJcXHUyMkNDXCIsXCJydGltZXNcIjpcIlxcdTIyQ0FcIixcInJ0cmlcIjpcIlxcdTI1QjlcIixcInJ0cmllXCI6XCJcXHUyMkI1XCIsXCJydHJpZlwiOlwiXFx1MjVCOFwiLFwicnRyaWx0cmlcIjpcIlxcdTI5Q0VcIixcIlJ1bGVEZWxheWVkXCI6XCJcXHUyOUY0XCIsXCJydWx1aGFyXCI6XCJcXHUyOTY4XCIsXCJyeFwiOlwiXFx1MjExRVwiLFwiU2FjdXRlXCI6XCJcXHUwMTVBXCIsXCJzYWN1dGVcIjpcIlxcdTAxNUJcIixcInNicXVvXCI6XCJcXHUyMDFBXCIsXCJzY2FwXCI6XCJcXHUyQUI4XCIsXCJTY2Fyb25cIjpcIlxcdTAxNjBcIixcInNjYXJvblwiOlwiXFx1MDE2MVwiLFwiU2NcIjpcIlxcdTJBQkNcIixcInNjXCI6XCJcXHUyMjdCXCIsXCJzY2N1ZVwiOlwiXFx1MjI3RFwiLFwic2NlXCI6XCJcXHUyQUIwXCIsXCJzY0VcIjpcIlxcdTJBQjRcIixcIlNjZWRpbFwiOlwiXFx1MDE1RVwiLFwic2NlZGlsXCI6XCJcXHUwMTVGXCIsXCJTY2lyY1wiOlwiXFx1MDE1Q1wiLFwic2NpcmNcIjpcIlxcdTAxNURcIixcInNjbmFwXCI6XCJcXHUyQUJBXCIsXCJzY25FXCI6XCJcXHUyQUI2XCIsXCJzY25zaW1cIjpcIlxcdTIyRTlcIixcInNjcG9saW50XCI6XCJcXHUyQTEzXCIsXCJzY3NpbVwiOlwiXFx1MjI3RlwiLFwiU2N5XCI6XCJcXHUwNDIxXCIsXCJzY3lcIjpcIlxcdTA0NDFcIixcInNkb3RiXCI6XCJcXHUyMkExXCIsXCJzZG90XCI6XCJcXHUyMkM1XCIsXCJzZG90ZVwiOlwiXFx1MkE2NlwiLFwic2VhcmhrXCI6XCJcXHUyOTI1XCIsXCJzZWFyclwiOlwiXFx1MjE5OFwiLFwic2VBcnJcIjpcIlxcdTIxRDhcIixcInNlYXJyb3dcIjpcIlxcdTIxOThcIixcInNlY3RcIjpcIlxcdTAwQTdcIixcInNlbWlcIjpcIjtcIixcInNlc3dhclwiOlwiXFx1MjkyOVwiLFwic2V0bWludXNcIjpcIlxcdTIyMTZcIixcInNldG1uXCI6XCJcXHUyMjE2XCIsXCJzZXh0XCI6XCJcXHUyNzM2XCIsXCJTZnJcIjpcIlxcdUQ4MzVcXHVERDE2XCIsXCJzZnJcIjpcIlxcdUQ4MzVcXHVERDMwXCIsXCJzZnJvd25cIjpcIlxcdTIzMjJcIixcInNoYXJwXCI6XCJcXHUyNjZGXCIsXCJTSENIY3lcIjpcIlxcdTA0MjlcIixcInNoY2hjeVwiOlwiXFx1MDQ0OVwiLFwiU0hjeVwiOlwiXFx1MDQyOFwiLFwic2hjeVwiOlwiXFx1MDQ0OFwiLFwiU2hvcnREb3duQXJyb3dcIjpcIlxcdTIxOTNcIixcIlNob3J0TGVmdEFycm93XCI6XCJcXHUyMTkwXCIsXCJzaG9ydG1pZFwiOlwiXFx1MjIyM1wiLFwic2hvcnRwYXJhbGxlbFwiOlwiXFx1MjIyNVwiLFwiU2hvcnRSaWdodEFycm93XCI6XCJcXHUyMTkyXCIsXCJTaG9ydFVwQXJyb3dcIjpcIlxcdTIxOTFcIixcInNoeVwiOlwiXFx1MDBBRFwiLFwiU2lnbWFcIjpcIlxcdTAzQTNcIixcInNpZ21hXCI6XCJcXHUwM0MzXCIsXCJzaWdtYWZcIjpcIlxcdTAzQzJcIixcInNpZ21hdlwiOlwiXFx1MDNDMlwiLFwic2ltXCI6XCJcXHUyMjNDXCIsXCJzaW1kb3RcIjpcIlxcdTJBNkFcIixcInNpbWVcIjpcIlxcdTIyNDNcIixcInNpbWVxXCI6XCJcXHUyMjQzXCIsXCJzaW1nXCI6XCJcXHUyQTlFXCIsXCJzaW1nRVwiOlwiXFx1MkFBMFwiLFwic2ltbFwiOlwiXFx1MkE5RFwiLFwic2ltbEVcIjpcIlxcdTJBOUZcIixcInNpbW5lXCI6XCJcXHUyMjQ2XCIsXCJzaW1wbHVzXCI6XCJcXHUyQTI0XCIsXCJzaW1yYXJyXCI6XCJcXHUyOTcyXCIsXCJzbGFyclwiOlwiXFx1MjE5MFwiLFwiU21hbGxDaXJjbGVcIjpcIlxcdTIyMThcIixcInNtYWxsc2V0bWludXNcIjpcIlxcdTIyMTZcIixcInNtYXNocFwiOlwiXFx1MkEzM1wiLFwic21lcGFyc2xcIjpcIlxcdTI5RTRcIixcInNtaWRcIjpcIlxcdTIyMjNcIixcInNtaWxlXCI6XCJcXHUyMzIzXCIsXCJzbXRcIjpcIlxcdTJBQUFcIixcInNtdGVcIjpcIlxcdTJBQUNcIixcInNtdGVzXCI6XCJcXHUyQUFDXFx1RkUwMFwiLFwiU09GVGN5XCI6XCJcXHUwNDJDXCIsXCJzb2Z0Y3lcIjpcIlxcdTA0NENcIixcInNvbGJhclwiOlwiXFx1MjMzRlwiLFwic29sYlwiOlwiXFx1MjlDNFwiLFwic29sXCI6XCIvXCIsXCJTb3BmXCI6XCJcXHVEODM1XFx1REQ0QVwiLFwic29wZlwiOlwiXFx1RDgzNVxcdURENjRcIixcInNwYWRlc1wiOlwiXFx1MjY2MFwiLFwic3BhZGVzdWl0XCI6XCJcXHUyNjYwXCIsXCJzcGFyXCI6XCJcXHUyMjI1XCIsXCJzcWNhcFwiOlwiXFx1MjI5M1wiLFwic3FjYXBzXCI6XCJcXHUyMjkzXFx1RkUwMFwiLFwic3FjdXBcIjpcIlxcdTIyOTRcIixcInNxY3Vwc1wiOlwiXFx1MjI5NFxcdUZFMDBcIixcIlNxcnRcIjpcIlxcdTIyMUFcIixcInNxc3ViXCI6XCJcXHUyMjhGXCIsXCJzcXN1YmVcIjpcIlxcdTIyOTFcIixcInNxc3Vic2V0XCI6XCJcXHUyMjhGXCIsXCJzcXN1YnNldGVxXCI6XCJcXHUyMjkxXCIsXCJzcXN1cFwiOlwiXFx1MjI5MFwiLFwic3FzdXBlXCI6XCJcXHUyMjkyXCIsXCJzcXN1cHNldFwiOlwiXFx1MjI5MFwiLFwic3FzdXBzZXRlcVwiOlwiXFx1MjI5MlwiLFwic3F1YXJlXCI6XCJcXHUyNUExXCIsXCJTcXVhcmVcIjpcIlxcdTI1QTFcIixcIlNxdWFyZUludGVyc2VjdGlvblwiOlwiXFx1MjI5M1wiLFwiU3F1YXJlU3Vic2V0XCI6XCJcXHUyMjhGXCIsXCJTcXVhcmVTdWJzZXRFcXVhbFwiOlwiXFx1MjI5MVwiLFwiU3F1YXJlU3VwZXJzZXRcIjpcIlxcdTIyOTBcIixcIlNxdWFyZVN1cGVyc2V0RXF1YWxcIjpcIlxcdTIyOTJcIixcIlNxdWFyZVVuaW9uXCI6XCJcXHUyMjk0XCIsXCJzcXVhcmZcIjpcIlxcdTI1QUFcIixcInNxdVwiOlwiXFx1MjVBMVwiLFwic3F1ZlwiOlwiXFx1MjVBQVwiLFwic3JhcnJcIjpcIlxcdTIxOTJcIixcIlNzY3JcIjpcIlxcdUQ4MzVcXHVEQ0FFXCIsXCJzc2NyXCI6XCJcXHVEODM1XFx1RENDOFwiLFwic3NldG1uXCI6XCJcXHUyMjE2XCIsXCJzc21pbGVcIjpcIlxcdTIzMjNcIixcInNzdGFyZlwiOlwiXFx1MjJDNlwiLFwiU3RhclwiOlwiXFx1MjJDNlwiLFwic3RhclwiOlwiXFx1MjYwNlwiLFwic3RhcmZcIjpcIlxcdTI2MDVcIixcInN0cmFpZ2h0ZXBzaWxvblwiOlwiXFx1MDNGNVwiLFwic3RyYWlnaHRwaGlcIjpcIlxcdTAzRDVcIixcInN0cm5zXCI6XCJcXHUwMEFGXCIsXCJzdWJcIjpcIlxcdTIyODJcIixcIlN1YlwiOlwiXFx1MjJEMFwiLFwic3ViZG90XCI6XCJcXHUyQUJEXCIsXCJzdWJFXCI6XCJcXHUyQUM1XCIsXCJzdWJlXCI6XCJcXHUyMjg2XCIsXCJzdWJlZG90XCI6XCJcXHUyQUMzXCIsXCJzdWJtdWx0XCI6XCJcXHUyQUMxXCIsXCJzdWJuRVwiOlwiXFx1MkFDQlwiLFwic3VibmVcIjpcIlxcdTIyOEFcIixcInN1YnBsdXNcIjpcIlxcdTJBQkZcIixcInN1YnJhcnJcIjpcIlxcdTI5NzlcIixcInN1YnNldFwiOlwiXFx1MjI4MlwiLFwiU3Vic2V0XCI6XCJcXHUyMkQwXCIsXCJzdWJzZXRlcVwiOlwiXFx1MjI4NlwiLFwic3Vic2V0ZXFxXCI6XCJcXHUyQUM1XCIsXCJTdWJzZXRFcXVhbFwiOlwiXFx1MjI4NlwiLFwic3Vic2V0bmVxXCI6XCJcXHUyMjhBXCIsXCJzdWJzZXRuZXFxXCI6XCJcXHUyQUNCXCIsXCJzdWJzaW1cIjpcIlxcdTJBQzdcIixcInN1YnN1YlwiOlwiXFx1MkFENVwiLFwic3Vic3VwXCI6XCJcXHUyQUQzXCIsXCJzdWNjYXBwcm94XCI6XCJcXHUyQUI4XCIsXCJzdWNjXCI6XCJcXHUyMjdCXCIsXCJzdWNjY3VybHllcVwiOlwiXFx1MjI3RFwiLFwiU3VjY2VlZHNcIjpcIlxcdTIyN0JcIixcIlN1Y2NlZWRzRXF1YWxcIjpcIlxcdTJBQjBcIixcIlN1Y2NlZWRzU2xhbnRFcXVhbFwiOlwiXFx1MjI3RFwiLFwiU3VjY2VlZHNUaWxkZVwiOlwiXFx1MjI3RlwiLFwic3VjY2VxXCI6XCJcXHUyQUIwXCIsXCJzdWNjbmFwcHJveFwiOlwiXFx1MkFCQVwiLFwic3VjY25lcXFcIjpcIlxcdTJBQjZcIixcInN1Y2Nuc2ltXCI6XCJcXHUyMkU5XCIsXCJzdWNjc2ltXCI6XCJcXHUyMjdGXCIsXCJTdWNoVGhhdFwiOlwiXFx1MjIwQlwiLFwic3VtXCI6XCJcXHUyMjExXCIsXCJTdW1cIjpcIlxcdTIyMTFcIixcInN1bmdcIjpcIlxcdTI2NkFcIixcInN1cDFcIjpcIlxcdTAwQjlcIixcInN1cDJcIjpcIlxcdTAwQjJcIixcInN1cDNcIjpcIlxcdTAwQjNcIixcInN1cFwiOlwiXFx1MjI4M1wiLFwiU3VwXCI6XCJcXHUyMkQxXCIsXCJzdXBkb3RcIjpcIlxcdTJBQkVcIixcInN1cGRzdWJcIjpcIlxcdTJBRDhcIixcInN1cEVcIjpcIlxcdTJBQzZcIixcInN1cGVcIjpcIlxcdTIyODdcIixcInN1cGVkb3RcIjpcIlxcdTJBQzRcIixcIlN1cGVyc2V0XCI6XCJcXHUyMjgzXCIsXCJTdXBlcnNldEVxdWFsXCI6XCJcXHUyMjg3XCIsXCJzdXBoc29sXCI6XCJcXHUyN0M5XCIsXCJzdXBoc3ViXCI6XCJcXHUyQUQ3XCIsXCJzdXBsYXJyXCI6XCJcXHUyOTdCXCIsXCJzdXBtdWx0XCI6XCJcXHUyQUMyXCIsXCJzdXBuRVwiOlwiXFx1MkFDQ1wiLFwic3VwbmVcIjpcIlxcdTIyOEJcIixcInN1cHBsdXNcIjpcIlxcdTJBQzBcIixcInN1cHNldFwiOlwiXFx1MjI4M1wiLFwiU3Vwc2V0XCI6XCJcXHUyMkQxXCIsXCJzdXBzZXRlcVwiOlwiXFx1MjI4N1wiLFwic3Vwc2V0ZXFxXCI6XCJcXHUyQUM2XCIsXCJzdXBzZXRuZXFcIjpcIlxcdTIyOEJcIixcInN1cHNldG5lcXFcIjpcIlxcdTJBQ0NcIixcInN1cHNpbVwiOlwiXFx1MkFDOFwiLFwic3Vwc3ViXCI6XCJcXHUyQUQ0XCIsXCJzdXBzdXBcIjpcIlxcdTJBRDZcIixcInN3YXJoa1wiOlwiXFx1MjkyNlwiLFwic3dhcnJcIjpcIlxcdTIxOTlcIixcInN3QXJyXCI6XCJcXHUyMUQ5XCIsXCJzd2Fycm93XCI6XCJcXHUyMTk5XCIsXCJzd253YXJcIjpcIlxcdTI5MkFcIixcInN6bGlnXCI6XCJcXHUwMERGXCIsXCJUYWJcIjpcIlxcdFwiLFwidGFyZ2V0XCI6XCJcXHUyMzE2XCIsXCJUYXVcIjpcIlxcdTAzQTRcIixcInRhdVwiOlwiXFx1MDNDNFwiLFwidGJya1wiOlwiXFx1MjNCNFwiLFwiVGNhcm9uXCI6XCJcXHUwMTY0XCIsXCJ0Y2Fyb25cIjpcIlxcdTAxNjVcIixcIlRjZWRpbFwiOlwiXFx1MDE2MlwiLFwidGNlZGlsXCI6XCJcXHUwMTYzXCIsXCJUY3lcIjpcIlxcdTA0MjJcIixcInRjeVwiOlwiXFx1MDQ0MlwiLFwidGRvdFwiOlwiXFx1MjBEQlwiLFwidGVscmVjXCI6XCJcXHUyMzE1XCIsXCJUZnJcIjpcIlxcdUQ4MzVcXHVERDE3XCIsXCJ0ZnJcIjpcIlxcdUQ4MzVcXHVERDMxXCIsXCJ0aGVyZTRcIjpcIlxcdTIyMzRcIixcInRoZXJlZm9yZVwiOlwiXFx1MjIzNFwiLFwiVGhlcmVmb3JlXCI6XCJcXHUyMjM0XCIsXCJUaGV0YVwiOlwiXFx1MDM5OFwiLFwidGhldGFcIjpcIlxcdTAzQjhcIixcInRoZXRhc3ltXCI6XCJcXHUwM0QxXCIsXCJ0aGV0YXZcIjpcIlxcdTAzRDFcIixcInRoaWNrYXBwcm94XCI6XCJcXHUyMjQ4XCIsXCJ0aGlja3NpbVwiOlwiXFx1MjIzQ1wiLFwiVGhpY2tTcGFjZVwiOlwiXFx1MjA1RlxcdTIwMEFcIixcIlRoaW5TcGFjZVwiOlwiXFx1MjAwOVwiLFwidGhpbnNwXCI6XCJcXHUyMDA5XCIsXCJ0aGthcFwiOlwiXFx1MjI0OFwiLFwidGhrc2ltXCI6XCJcXHUyMjNDXCIsXCJUSE9STlwiOlwiXFx1MDBERVwiLFwidGhvcm5cIjpcIlxcdTAwRkVcIixcInRpbGRlXCI6XCJcXHUwMkRDXCIsXCJUaWxkZVwiOlwiXFx1MjIzQ1wiLFwiVGlsZGVFcXVhbFwiOlwiXFx1MjI0M1wiLFwiVGlsZGVGdWxsRXF1YWxcIjpcIlxcdTIyNDVcIixcIlRpbGRlVGlsZGVcIjpcIlxcdTIyNDhcIixcInRpbWVzYmFyXCI6XCJcXHUyQTMxXCIsXCJ0aW1lc2JcIjpcIlxcdTIyQTBcIixcInRpbWVzXCI6XCJcXHUwMEQ3XCIsXCJ0aW1lc2RcIjpcIlxcdTJBMzBcIixcInRpbnRcIjpcIlxcdTIyMkRcIixcInRvZWFcIjpcIlxcdTI5MjhcIixcInRvcGJvdFwiOlwiXFx1MjMzNlwiLFwidG9wY2lyXCI6XCJcXHUyQUYxXCIsXCJ0b3BcIjpcIlxcdTIyQTRcIixcIlRvcGZcIjpcIlxcdUQ4MzVcXHVERDRCXCIsXCJ0b3BmXCI6XCJcXHVEODM1XFx1REQ2NVwiLFwidG9wZm9ya1wiOlwiXFx1MkFEQVwiLFwidG9zYVwiOlwiXFx1MjkyOVwiLFwidHByaW1lXCI6XCJcXHUyMDM0XCIsXCJ0cmFkZVwiOlwiXFx1MjEyMlwiLFwiVFJBREVcIjpcIlxcdTIxMjJcIixcInRyaWFuZ2xlXCI6XCJcXHUyNUI1XCIsXCJ0cmlhbmdsZWRvd25cIjpcIlxcdTI1QkZcIixcInRyaWFuZ2xlbGVmdFwiOlwiXFx1MjVDM1wiLFwidHJpYW5nbGVsZWZ0ZXFcIjpcIlxcdTIyQjRcIixcInRyaWFuZ2xlcVwiOlwiXFx1MjI1Q1wiLFwidHJpYW5nbGVyaWdodFwiOlwiXFx1MjVCOVwiLFwidHJpYW5nbGVyaWdodGVxXCI6XCJcXHUyMkI1XCIsXCJ0cmlkb3RcIjpcIlxcdTI1RUNcIixcInRyaWVcIjpcIlxcdTIyNUNcIixcInRyaW1pbnVzXCI6XCJcXHUyQTNBXCIsXCJUcmlwbGVEb3RcIjpcIlxcdTIwREJcIixcInRyaXBsdXNcIjpcIlxcdTJBMzlcIixcInRyaXNiXCI6XCJcXHUyOUNEXCIsXCJ0cml0aW1lXCI6XCJcXHUyQTNCXCIsXCJ0cnBleml1bVwiOlwiXFx1MjNFMlwiLFwiVHNjclwiOlwiXFx1RDgzNVxcdURDQUZcIixcInRzY3JcIjpcIlxcdUQ4MzVcXHVEQ0M5XCIsXCJUU2N5XCI6XCJcXHUwNDI2XCIsXCJ0c2N5XCI6XCJcXHUwNDQ2XCIsXCJUU0hjeVwiOlwiXFx1MDQwQlwiLFwidHNoY3lcIjpcIlxcdTA0NUJcIixcIlRzdHJva1wiOlwiXFx1MDE2NlwiLFwidHN0cm9rXCI6XCJcXHUwMTY3XCIsXCJ0d2l4dFwiOlwiXFx1MjI2Q1wiLFwidHdvaGVhZGxlZnRhcnJvd1wiOlwiXFx1MjE5RVwiLFwidHdvaGVhZHJpZ2h0YXJyb3dcIjpcIlxcdTIxQTBcIixcIlVhY3V0ZVwiOlwiXFx1MDBEQVwiLFwidWFjdXRlXCI6XCJcXHUwMEZBXCIsXCJ1YXJyXCI6XCJcXHUyMTkxXCIsXCJVYXJyXCI6XCJcXHUyMTlGXCIsXCJ1QXJyXCI6XCJcXHUyMUQxXCIsXCJVYXJyb2NpclwiOlwiXFx1Mjk0OVwiLFwiVWJyY3lcIjpcIlxcdTA0MEVcIixcInVicmN5XCI6XCJcXHUwNDVFXCIsXCJVYnJldmVcIjpcIlxcdTAxNkNcIixcInVicmV2ZVwiOlwiXFx1MDE2RFwiLFwiVWNpcmNcIjpcIlxcdTAwREJcIixcInVjaXJjXCI6XCJcXHUwMEZCXCIsXCJVY3lcIjpcIlxcdTA0MjNcIixcInVjeVwiOlwiXFx1MDQ0M1wiLFwidWRhcnJcIjpcIlxcdTIxQzVcIixcIlVkYmxhY1wiOlwiXFx1MDE3MFwiLFwidWRibGFjXCI6XCJcXHUwMTcxXCIsXCJ1ZGhhclwiOlwiXFx1Mjk2RVwiLFwidWZpc2h0XCI6XCJcXHUyOTdFXCIsXCJVZnJcIjpcIlxcdUQ4MzVcXHVERDE4XCIsXCJ1ZnJcIjpcIlxcdUQ4MzVcXHVERDMyXCIsXCJVZ3JhdmVcIjpcIlxcdTAwRDlcIixcInVncmF2ZVwiOlwiXFx1MDBGOVwiLFwidUhhclwiOlwiXFx1Mjk2M1wiLFwidWhhcmxcIjpcIlxcdTIxQkZcIixcInVoYXJyXCI6XCJcXHUyMUJFXCIsXCJ1aGJsa1wiOlwiXFx1MjU4MFwiLFwidWxjb3JuXCI6XCJcXHUyMzFDXCIsXCJ1bGNvcm5lclwiOlwiXFx1MjMxQ1wiLFwidWxjcm9wXCI6XCJcXHUyMzBGXCIsXCJ1bHRyaVwiOlwiXFx1MjVGOFwiLFwiVW1hY3JcIjpcIlxcdTAxNkFcIixcInVtYWNyXCI6XCJcXHUwMTZCXCIsXCJ1bWxcIjpcIlxcdTAwQThcIixcIlVuZGVyQmFyXCI6XCJfXCIsXCJVbmRlckJyYWNlXCI6XCJcXHUyM0RGXCIsXCJVbmRlckJyYWNrZXRcIjpcIlxcdTIzQjVcIixcIlVuZGVyUGFyZW50aGVzaXNcIjpcIlxcdTIzRERcIixcIlVuaW9uXCI6XCJcXHUyMkMzXCIsXCJVbmlvblBsdXNcIjpcIlxcdTIyOEVcIixcIlVvZ29uXCI6XCJcXHUwMTcyXCIsXCJ1b2dvblwiOlwiXFx1MDE3M1wiLFwiVW9wZlwiOlwiXFx1RDgzNVxcdURENENcIixcInVvcGZcIjpcIlxcdUQ4MzVcXHVERDY2XCIsXCJVcEFycm93QmFyXCI6XCJcXHUyOTEyXCIsXCJ1cGFycm93XCI6XCJcXHUyMTkxXCIsXCJVcEFycm93XCI6XCJcXHUyMTkxXCIsXCJVcGFycm93XCI6XCJcXHUyMUQxXCIsXCJVcEFycm93RG93bkFycm93XCI6XCJcXHUyMUM1XCIsXCJ1cGRvd25hcnJvd1wiOlwiXFx1MjE5NVwiLFwiVXBEb3duQXJyb3dcIjpcIlxcdTIxOTVcIixcIlVwZG93bmFycm93XCI6XCJcXHUyMUQ1XCIsXCJVcEVxdWlsaWJyaXVtXCI6XCJcXHUyOTZFXCIsXCJ1cGhhcnBvb25sZWZ0XCI6XCJcXHUyMUJGXCIsXCJ1cGhhcnBvb25yaWdodFwiOlwiXFx1MjFCRVwiLFwidXBsdXNcIjpcIlxcdTIyOEVcIixcIlVwcGVyTGVmdEFycm93XCI6XCJcXHUyMTk2XCIsXCJVcHBlclJpZ2h0QXJyb3dcIjpcIlxcdTIxOTdcIixcInVwc2lcIjpcIlxcdTAzQzVcIixcIlVwc2lcIjpcIlxcdTAzRDJcIixcInVwc2loXCI6XCJcXHUwM0QyXCIsXCJVcHNpbG9uXCI6XCJcXHUwM0E1XCIsXCJ1cHNpbG9uXCI6XCJcXHUwM0M1XCIsXCJVcFRlZUFycm93XCI6XCJcXHUyMUE1XCIsXCJVcFRlZVwiOlwiXFx1MjJBNVwiLFwidXB1cGFycm93c1wiOlwiXFx1MjFDOFwiLFwidXJjb3JuXCI6XCJcXHUyMzFEXCIsXCJ1cmNvcm5lclwiOlwiXFx1MjMxRFwiLFwidXJjcm9wXCI6XCJcXHUyMzBFXCIsXCJVcmluZ1wiOlwiXFx1MDE2RVwiLFwidXJpbmdcIjpcIlxcdTAxNkZcIixcInVydHJpXCI6XCJcXHUyNUY5XCIsXCJVc2NyXCI6XCJcXHVEODM1XFx1RENCMFwiLFwidXNjclwiOlwiXFx1RDgzNVxcdURDQ0FcIixcInV0ZG90XCI6XCJcXHUyMkYwXCIsXCJVdGlsZGVcIjpcIlxcdTAxNjhcIixcInV0aWxkZVwiOlwiXFx1MDE2OVwiLFwidXRyaVwiOlwiXFx1MjVCNVwiLFwidXRyaWZcIjpcIlxcdTI1QjRcIixcInV1YXJyXCI6XCJcXHUyMUM4XCIsXCJVdW1sXCI6XCJcXHUwMERDXCIsXCJ1dW1sXCI6XCJcXHUwMEZDXCIsXCJ1d2FuZ2xlXCI6XCJcXHUyOUE3XCIsXCJ2YW5ncnRcIjpcIlxcdTI5OUNcIixcInZhcmVwc2lsb25cIjpcIlxcdTAzRjVcIixcInZhcmthcHBhXCI6XCJcXHUwM0YwXCIsXCJ2YXJub3RoaW5nXCI6XCJcXHUyMjA1XCIsXCJ2YXJwaGlcIjpcIlxcdTAzRDVcIixcInZhcnBpXCI6XCJcXHUwM0Q2XCIsXCJ2YXJwcm9wdG9cIjpcIlxcdTIyMURcIixcInZhcnJcIjpcIlxcdTIxOTVcIixcInZBcnJcIjpcIlxcdTIxRDVcIixcInZhcnJob1wiOlwiXFx1MDNGMVwiLFwidmFyc2lnbWFcIjpcIlxcdTAzQzJcIixcInZhcnN1YnNldG5lcVwiOlwiXFx1MjI4QVxcdUZFMDBcIixcInZhcnN1YnNldG5lcXFcIjpcIlxcdTJBQ0JcXHVGRTAwXCIsXCJ2YXJzdXBzZXRuZXFcIjpcIlxcdTIyOEJcXHVGRTAwXCIsXCJ2YXJzdXBzZXRuZXFxXCI6XCJcXHUyQUNDXFx1RkUwMFwiLFwidmFydGhldGFcIjpcIlxcdTAzRDFcIixcInZhcnRyaWFuZ2xlbGVmdFwiOlwiXFx1MjJCMlwiLFwidmFydHJpYW5nbGVyaWdodFwiOlwiXFx1MjJCM1wiLFwidkJhclwiOlwiXFx1MkFFOFwiLFwiVmJhclwiOlwiXFx1MkFFQlwiLFwidkJhcnZcIjpcIlxcdTJBRTlcIixcIlZjeVwiOlwiXFx1MDQxMlwiLFwidmN5XCI6XCJcXHUwNDMyXCIsXCJ2ZGFzaFwiOlwiXFx1MjJBMlwiLFwidkRhc2hcIjpcIlxcdTIyQThcIixcIlZkYXNoXCI6XCJcXHUyMkE5XCIsXCJWRGFzaFwiOlwiXFx1MjJBQlwiLFwiVmRhc2hsXCI6XCJcXHUyQUU2XCIsXCJ2ZWViYXJcIjpcIlxcdTIyQkJcIixcInZlZVwiOlwiXFx1MjIyOFwiLFwiVmVlXCI6XCJcXHUyMkMxXCIsXCJ2ZWVlcVwiOlwiXFx1MjI1QVwiLFwidmVsbGlwXCI6XCJcXHUyMkVFXCIsXCJ2ZXJiYXJcIjpcInxcIixcIlZlcmJhclwiOlwiXFx1MjAxNlwiLFwidmVydFwiOlwifFwiLFwiVmVydFwiOlwiXFx1MjAxNlwiLFwiVmVydGljYWxCYXJcIjpcIlxcdTIyMjNcIixcIlZlcnRpY2FsTGluZVwiOlwifFwiLFwiVmVydGljYWxTZXBhcmF0b3JcIjpcIlxcdTI3NThcIixcIlZlcnRpY2FsVGlsZGVcIjpcIlxcdTIyNDBcIixcIlZlcnlUaGluU3BhY2VcIjpcIlxcdTIwMEFcIixcIlZmclwiOlwiXFx1RDgzNVxcdUREMTlcIixcInZmclwiOlwiXFx1RDgzNVxcdUREMzNcIixcInZsdHJpXCI6XCJcXHUyMkIyXCIsXCJ2bnN1YlwiOlwiXFx1MjI4MlxcdTIwRDJcIixcInZuc3VwXCI6XCJcXHUyMjgzXFx1MjBEMlwiLFwiVm9wZlwiOlwiXFx1RDgzNVxcdURENERcIixcInZvcGZcIjpcIlxcdUQ4MzVcXHVERDY3XCIsXCJ2cHJvcFwiOlwiXFx1MjIxRFwiLFwidnJ0cmlcIjpcIlxcdTIyQjNcIixcIlZzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IxXCIsXCJ2c2NyXCI6XCJcXHVEODM1XFx1RENDQlwiLFwidnN1Ym5FXCI6XCJcXHUyQUNCXFx1RkUwMFwiLFwidnN1Ym5lXCI6XCJcXHUyMjhBXFx1RkUwMFwiLFwidnN1cG5FXCI6XCJcXHUyQUNDXFx1RkUwMFwiLFwidnN1cG5lXCI6XCJcXHUyMjhCXFx1RkUwMFwiLFwiVnZkYXNoXCI6XCJcXHUyMkFBXCIsXCJ2emlnemFnXCI6XCJcXHUyOTlBXCIsXCJXY2lyY1wiOlwiXFx1MDE3NFwiLFwid2NpcmNcIjpcIlxcdTAxNzVcIixcIndlZGJhclwiOlwiXFx1MkE1RlwiLFwid2VkZ2VcIjpcIlxcdTIyMjdcIixcIldlZGdlXCI6XCJcXHUyMkMwXCIsXCJ3ZWRnZXFcIjpcIlxcdTIyNTlcIixcIndlaWVycFwiOlwiXFx1MjExOFwiLFwiV2ZyXCI6XCJcXHVEODM1XFx1REQxQVwiLFwid2ZyXCI6XCJcXHVEODM1XFx1REQzNFwiLFwiV29wZlwiOlwiXFx1RDgzNVxcdURENEVcIixcIndvcGZcIjpcIlxcdUQ4MzVcXHVERDY4XCIsXCJ3cFwiOlwiXFx1MjExOFwiLFwid3JcIjpcIlxcdTIyNDBcIixcIndyZWF0aFwiOlwiXFx1MjI0MFwiLFwiV3NjclwiOlwiXFx1RDgzNVxcdURDQjJcIixcIndzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NDXCIsXCJ4Y2FwXCI6XCJcXHUyMkMyXCIsXCJ4Y2lyY1wiOlwiXFx1MjVFRlwiLFwieGN1cFwiOlwiXFx1MjJDM1wiLFwieGR0cmlcIjpcIlxcdTI1QkRcIixcIlhmclwiOlwiXFx1RDgzNVxcdUREMUJcIixcInhmclwiOlwiXFx1RDgzNVxcdUREMzVcIixcInhoYXJyXCI6XCJcXHUyN0Y3XCIsXCJ4aEFyclwiOlwiXFx1MjdGQVwiLFwiWGlcIjpcIlxcdTAzOUVcIixcInhpXCI6XCJcXHUwM0JFXCIsXCJ4bGFyclwiOlwiXFx1MjdGNVwiLFwieGxBcnJcIjpcIlxcdTI3RjhcIixcInhtYXBcIjpcIlxcdTI3RkNcIixcInhuaXNcIjpcIlxcdTIyRkJcIixcInhvZG90XCI6XCJcXHUyQTAwXCIsXCJYb3BmXCI6XCJcXHVEODM1XFx1REQ0RlwiLFwieG9wZlwiOlwiXFx1RDgzNVxcdURENjlcIixcInhvcGx1c1wiOlwiXFx1MkEwMVwiLFwieG90aW1lXCI6XCJcXHUyQTAyXCIsXCJ4cmFyclwiOlwiXFx1MjdGNlwiLFwieHJBcnJcIjpcIlxcdTI3RjlcIixcIlhzY3JcIjpcIlxcdUQ4MzVcXHVEQ0IzXCIsXCJ4c2NyXCI6XCJcXHVEODM1XFx1RENDRFwiLFwieHNxY3VwXCI6XCJcXHUyQTA2XCIsXCJ4dXBsdXNcIjpcIlxcdTJBMDRcIixcInh1dHJpXCI6XCJcXHUyNUIzXCIsXCJ4dmVlXCI6XCJcXHUyMkMxXCIsXCJ4d2VkZ2VcIjpcIlxcdTIyQzBcIixcIllhY3V0ZVwiOlwiXFx1MDBERFwiLFwieWFjdXRlXCI6XCJcXHUwMEZEXCIsXCJZQWN5XCI6XCJcXHUwNDJGXCIsXCJ5YWN5XCI6XCJcXHUwNDRGXCIsXCJZY2lyY1wiOlwiXFx1MDE3NlwiLFwieWNpcmNcIjpcIlxcdTAxNzdcIixcIlljeVwiOlwiXFx1MDQyQlwiLFwieWN5XCI6XCJcXHUwNDRCXCIsXCJ5ZW5cIjpcIlxcdTAwQTVcIixcIllmclwiOlwiXFx1RDgzNVxcdUREMUNcIixcInlmclwiOlwiXFx1RDgzNVxcdUREMzZcIixcIllJY3lcIjpcIlxcdTA0MDdcIixcInlpY3lcIjpcIlxcdTA0NTdcIixcIllvcGZcIjpcIlxcdUQ4MzVcXHVERDUwXCIsXCJ5b3BmXCI6XCJcXHVEODM1XFx1REQ2QVwiLFwiWXNjclwiOlwiXFx1RDgzNVxcdURDQjRcIixcInlzY3JcIjpcIlxcdUQ4MzVcXHVEQ0NFXCIsXCJZVWN5XCI6XCJcXHUwNDJFXCIsXCJ5dWN5XCI6XCJcXHUwNDRFXCIsXCJ5dW1sXCI6XCJcXHUwMEZGXCIsXCJZdW1sXCI6XCJcXHUwMTc4XCIsXCJaYWN1dGVcIjpcIlxcdTAxNzlcIixcInphY3V0ZVwiOlwiXFx1MDE3QVwiLFwiWmNhcm9uXCI6XCJcXHUwMTdEXCIsXCJ6Y2Fyb25cIjpcIlxcdTAxN0VcIixcIlpjeVwiOlwiXFx1MDQxN1wiLFwiemN5XCI6XCJcXHUwNDM3XCIsXCJaZG90XCI6XCJcXHUwMTdCXCIsXCJ6ZG90XCI6XCJcXHUwMTdDXCIsXCJ6ZWV0cmZcIjpcIlxcdTIxMjhcIixcIlplcm9XaWR0aFNwYWNlXCI6XCJcXHUyMDBCXCIsXCJaZXRhXCI6XCJcXHUwMzk2XCIsXCJ6ZXRhXCI6XCJcXHUwM0I2XCIsXCJ6ZnJcIjpcIlxcdUQ4MzVcXHVERDM3XCIsXCJaZnJcIjpcIlxcdTIxMjhcIixcIlpIY3lcIjpcIlxcdTA0MTZcIixcInpoY3lcIjpcIlxcdTA0MzZcIixcInppZ3JhcnJcIjpcIlxcdTIxRERcIixcInpvcGZcIjpcIlxcdUQ4MzVcXHVERDZCXCIsXCJab3BmXCI6XCJcXHUyMTI0XCIsXCJac2NyXCI6XCJcXHVEODM1XFx1RENCNVwiLFwienNjclwiOlwiXFx1RDgzNVxcdURDQ0ZcIixcInp3alwiOlwiXFx1MjAwRFwiLFwiendualwiOlwiXFx1MjAwQ1wifSIsIm1vZHVsZS5leHBvcnRzPXtcIkFhY3V0ZVwiOlwiXFx1MDBDMVwiLFwiYWFjdXRlXCI6XCJcXHUwMEUxXCIsXCJBY2lyY1wiOlwiXFx1MDBDMlwiLFwiYWNpcmNcIjpcIlxcdTAwRTJcIixcImFjdXRlXCI6XCJcXHUwMEI0XCIsXCJBRWxpZ1wiOlwiXFx1MDBDNlwiLFwiYWVsaWdcIjpcIlxcdTAwRTZcIixcIkFncmF2ZVwiOlwiXFx1MDBDMFwiLFwiYWdyYXZlXCI6XCJcXHUwMEUwXCIsXCJhbXBcIjpcIiZcIixcIkFNUFwiOlwiJlwiLFwiQXJpbmdcIjpcIlxcdTAwQzVcIixcImFyaW5nXCI6XCJcXHUwMEU1XCIsXCJBdGlsZGVcIjpcIlxcdTAwQzNcIixcImF0aWxkZVwiOlwiXFx1MDBFM1wiLFwiQXVtbFwiOlwiXFx1MDBDNFwiLFwiYXVtbFwiOlwiXFx1MDBFNFwiLFwiYnJ2YmFyXCI6XCJcXHUwMEE2XCIsXCJDY2VkaWxcIjpcIlxcdTAwQzdcIixcImNjZWRpbFwiOlwiXFx1MDBFN1wiLFwiY2VkaWxcIjpcIlxcdTAwQjhcIixcImNlbnRcIjpcIlxcdTAwQTJcIixcImNvcHlcIjpcIlxcdTAwQTlcIixcIkNPUFlcIjpcIlxcdTAwQTlcIixcImN1cnJlblwiOlwiXFx1MDBBNFwiLFwiZGVnXCI6XCJcXHUwMEIwXCIsXCJkaXZpZGVcIjpcIlxcdTAwRjdcIixcIkVhY3V0ZVwiOlwiXFx1MDBDOVwiLFwiZWFjdXRlXCI6XCJcXHUwMEU5XCIsXCJFY2lyY1wiOlwiXFx1MDBDQVwiLFwiZWNpcmNcIjpcIlxcdTAwRUFcIixcIkVncmF2ZVwiOlwiXFx1MDBDOFwiLFwiZWdyYXZlXCI6XCJcXHUwMEU4XCIsXCJFVEhcIjpcIlxcdTAwRDBcIixcImV0aFwiOlwiXFx1MDBGMFwiLFwiRXVtbFwiOlwiXFx1MDBDQlwiLFwiZXVtbFwiOlwiXFx1MDBFQlwiLFwiZnJhYzEyXCI6XCJcXHUwMEJEXCIsXCJmcmFjMTRcIjpcIlxcdTAwQkNcIixcImZyYWMzNFwiOlwiXFx1MDBCRVwiLFwiZ3RcIjpcIj5cIixcIkdUXCI6XCI+XCIsXCJJYWN1dGVcIjpcIlxcdTAwQ0RcIixcImlhY3V0ZVwiOlwiXFx1MDBFRFwiLFwiSWNpcmNcIjpcIlxcdTAwQ0VcIixcImljaXJjXCI6XCJcXHUwMEVFXCIsXCJpZXhjbFwiOlwiXFx1MDBBMVwiLFwiSWdyYXZlXCI6XCJcXHUwMENDXCIsXCJpZ3JhdmVcIjpcIlxcdTAwRUNcIixcImlxdWVzdFwiOlwiXFx1MDBCRlwiLFwiSXVtbFwiOlwiXFx1MDBDRlwiLFwiaXVtbFwiOlwiXFx1MDBFRlwiLFwibGFxdW9cIjpcIlxcdTAwQUJcIixcImx0XCI6XCI8XCIsXCJMVFwiOlwiPFwiLFwibWFjclwiOlwiXFx1MDBBRlwiLFwibWljcm9cIjpcIlxcdTAwQjVcIixcIm1pZGRvdFwiOlwiXFx1MDBCN1wiLFwibmJzcFwiOlwiXFx1MDBBMFwiLFwibm90XCI6XCJcXHUwMEFDXCIsXCJOdGlsZGVcIjpcIlxcdTAwRDFcIixcIm50aWxkZVwiOlwiXFx1MDBGMVwiLFwiT2FjdXRlXCI6XCJcXHUwMEQzXCIsXCJvYWN1dGVcIjpcIlxcdTAwRjNcIixcIk9jaXJjXCI6XCJcXHUwMEQ0XCIsXCJvY2lyY1wiOlwiXFx1MDBGNFwiLFwiT2dyYXZlXCI6XCJcXHUwMEQyXCIsXCJvZ3JhdmVcIjpcIlxcdTAwRjJcIixcIm9yZGZcIjpcIlxcdTAwQUFcIixcIm9yZG1cIjpcIlxcdTAwQkFcIixcIk9zbGFzaFwiOlwiXFx1MDBEOFwiLFwib3NsYXNoXCI6XCJcXHUwMEY4XCIsXCJPdGlsZGVcIjpcIlxcdTAwRDVcIixcIm90aWxkZVwiOlwiXFx1MDBGNVwiLFwiT3VtbFwiOlwiXFx1MDBENlwiLFwib3VtbFwiOlwiXFx1MDBGNlwiLFwicGFyYVwiOlwiXFx1MDBCNlwiLFwicGx1c21uXCI6XCJcXHUwMEIxXCIsXCJwb3VuZFwiOlwiXFx1MDBBM1wiLFwicXVvdFwiOlwiXFxcIlwiLFwiUVVPVFwiOlwiXFxcIlwiLFwicmFxdW9cIjpcIlxcdTAwQkJcIixcInJlZ1wiOlwiXFx1MDBBRVwiLFwiUkVHXCI6XCJcXHUwMEFFXCIsXCJzZWN0XCI6XCJcXHUwMEE3XCIsXCJzaHlcIjpcIlxcdTAwQURcIixcInN1cDFcIjpcIlxcdTAwQjlcIixcInN1cDJcIjpcIlxcdTAwQjJcIixcInN1cDNcIjpcIlxcdTAwQjNcIixcInN6bGlnXCI6XCJcXHUwMERGXCIsXCJUSE9STlwiOlwiXFx1MDBERVwiLFwidGhvcm5cIjpcIlxcdTAwRkVcIixcInRpbWVzXCI6XCJcXHUwMEQ3XCIsXCJVYWN1dGVcIjpcIlxcdTAwREFcIixcInVhY3V0ZVwiOlwiXFx1MDBGQVwiLFwiVWNpcmNcIjpcIlxcdTAwREJcIixcInVjaXJjXCI6XCJcXHUwMEZCXCIsXCJVZ3JhdmVcIjpcIlxcdTAwRDlcIixcInVncmF2ZVwiOlwiXFx1MDBGOVwiLFwidW1sXCI6XCJcXHUwMEE4XCIsXCJVdW1sXCI6XCJcXHUwMERDXCIsXCJ1dW1sXCI6XCJcXHUwMEZDXCIsXCJZYWN1dGVcIjpcIlxcdTAwRERcIixcInlhY3V0ZVwiOlwiXFx1MDBGRFwiLFwieWVuXCI6XCJcXHUwMEE1XCIsXCJ5dW1sXCI6XCJcXHUwMEZGXCJ9IiwibW9kdWxlLmV4cG9ydHM9e1wiYW1wXCI6XCImXCIsXCJhcG9zXCI6XCInXCIsXCJndFwiOlwiPlwiLFwibHRcIjpcIjxcIixcInF1b3RcIjpcIlxcXCJcIn1cbiIsInZhciB0b3BMZXZlbCA9IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDpcbiAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHt9XG52YXIgbWluRG9jID0gcmVxdWlyZSgnbWluLWRvY3VtZW50Jyk7XG5cbnZhciBkb2NjeTtcblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBkb2NjeSA9IGRvY3VtZW50O1xufSBlbHNlIHtcbiAgICBkb2NjeSA9IHRvcExldmVsWydfX0dMT0JBTF9ET0NVTUVOVF9DQUNIRUA0J107XG5cbiAgICBpZiAoIWRvY2N5KSB7XG4gICAgICAgIGRvY2N5ID0gdG9wTGV2ZWxbJ19fR0xPQkFMX0RPQ1VNRU5UX0NBQ0hFQDQnXSA9IG1pbkRvYztcbiAgICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZG9jY3k7XG4iLCJ2YXIgd2luO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHdpbiA9IHdpbmRvdztcbn0gZWxzZSBpZiAodHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHdpbiA9IGdsb2JhbDtcbn0gZWxzZSBpZiAodHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIpe1xuICAgIHdpbiA9IHNlbGY7XG59IGVsc2Uge1xuICAgIHdpbiA9IHt9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHdpbjtcbiIsIm1vZHVsZS5leHBvcnRzID0gYXR0cmlidXRlVG9Qcm9wZXJ0eVxuXG52YXIgdHJhbnNmb3JtID0ge1xuICAnY2xhc3MnOiAnY2xhc3NOYW1lJyxcbiAgJ2Zvcic6ICdodG1sRm9yJyxcbiAgJ2h0dHAtZXF1aXYnOiAnaHR0cEVxdWl2J1xufVxuXG5mdW5jdGlvbiBhdHRyaWJ1dGVUb1Byb3BlcnR5IChoKSB7XG4gIHJldHVybiBmdW5jdGlvbiAodGFnTmFtZSwgYXR0cnMsIGNoaWxkcmVuKSB7XG4gICAgZm9yICh2YXIgYXR0ciBpbiBhdHRycykge1xuICAgICAgaWYgKGF0dHIgaW4gdHJhbnNmb3JtKSB7XG4gICAgICAgIGF0dHJzW3RyYW5zZm9ybVthdHRyXV0gPSBhdHRyc1thdHRyXVxuICAgICAgICBkZWxldGUgYXR0cnNbYXR0cl1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGgodGFnTmFtZSwgYXR0cnMsIGNoaWxkcmVuKVxuICB9XG59XG4iLCJ2YXIgYXR0clRvUHJvcCA9IHJlcXVpcmUoJ2h5cGVyc2NyaXB0LWF0dHJpYnV0ZS10by1wcm9wZXJ0eScpXG5cbnZhciBWQVIgPSAwLCBURVhUID0gMSwgT1BFTiA9IDIsIENMT1NFID0gMywgQVRUUiA9IDRcbnZhciBBVFRSX0tFWSA9IDUsIEFUVFJfS0VZX1cgPSA2XG52YXIgQVRUUl9WQUxVRV9XID0gNywgQVRUUl9WQUxVRSA9IDhcbnZhciBBVFRSX1ZBTFVFX1NRID0gOSwgQVRUUl9WQUxVRV9EUSA9IDEwXG52YXIgQVRUUl9FUSA9IDExLCBBVFRSX0JSRUFLID0gMTJcbnZhciBDT01NRU5UID0gMTNcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoaCwgb3B0cykge1xuICBpZiAoIW9wdHMpIG9wdHMgPSB7fVxuICB2YXIgY29uY2F0ID0gb3B0cy5jb25jYXQgfHwgZnVuY3Rpb24gKGEsIGIpIHtcbiAgICByZXR1cm4gU3RyaW5nKGEpICsgU3RyaW5nKGIpXG4gIH1cbiAgaWYgKG9wdHMuYXR0clRvUHJvcCAhPT0gZmFsc2UpIHtcbiAgICBoID0gYXR0clRvUHJvcChoKVxuICB9XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIChzdHJpbmdzKSB7XG4gICAgdmFyIHN0YXRlID0gVEVYVCwgcmVnID0gJydcbiAgICB2YXIgYXJnbGVuID0gYXJndW1lbnRzLmxlbmd0aFxuICAgIHZhciBwYXJ0cyA9IFtdXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChpIDwgYXJnbGVuIC0gMSkge1xuICAgICAgICB2YXIgYXJnID0gYXJndW1lbnRzW2krMV1cbiAgICAgICAgdmFyIHAgPSBwYXJzZShzdHJpbmdzW2ldKVxuICAgICAgICB2YXIgeHN0YXRlID0gc3RhdGVcbiAgICAgICAgaWYgKHhzdGF0ZSA9PT0gQVRUUl9WQUxVRV9EUSkgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRKSB4c3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgIGlmICh4c3RhdGUgPT09IEFUVFJfVkFMVUVfVykgeHN0YXRlID0gQVRUUl9WQUxVRVxuICAgICAgICBpZiAoeHN0YXRlID09PSBBVFRSKSB4c3RhdGUgPSBBVFRSX0tFWVxuICAgICAgICBwLnB1c2goWyBWQVIsIHhzdGF0ZSwgYXJnIF0pXG4gICAgICAgIHBhcnRzLnB1c2guYXBwbHkocGFydHMsIHApXG4gICAgICB9IGVsc2UgcGFydHMucHVzaC5hcHBseShwYXJ0cywgcGFyc2Uoc3RyaW5nc1tpXSkpXG4gICAgfVxuXG4gICAgdmFyIHRyZWUgPSBbbnVsbCx7fSxbXV1cbiAgICB2YXIgc3RhY2sgPSBbW3RyZWUsLTFdXVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBjdXIgPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMF1cbiAgICAgIHZhciBwID0gcGFydHNbaV0sIHMgPSBwWzBdXG4gICAgICBpZiAocyA9PT0gT1BFTiAmJiAvXlxcLy8udGVzdChwWzFdKSkge1xuICAgICAgICB2YXIgaXggPSBzdGFja1tzdGFjay5sZW5ndGgtMV1bMV1cbiAgICAgICAgaWYgKHN0YWNrLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBzdGFjay5wb3AoKVxuICAgICAgICAgIHN0YWNrW3N0YWNrLmxlbmd0aC0xXVswXVsyXVtpeF0gPSBoKFxuICAgICAgICAgICAgY3VyWzBdLCBjdXJbMV0sIGN1clsyXS5sZW5ndGggPyBjdXJbMl0gOiB1bmRlZmluZWRcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocyA9PT0gT1BFTikge1xuICAgICAgICB2YXIgYyA9IFtwWzFdLHt9LFtdXVxuICAgICAgICBjdXJbMl0ucHVzaChjKVxuICAgICAgICBzdGFjay5wdXNoKFtjLGN1clsyXS5sZW5ndGgtMV0pXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfS0VZIHx8IChzID09PSBWQVIgJiYgcFsxXSA9PT0gQVRUUl9LRVkpKSB7XG4gICAgICAgIHZhciBrZXkgPSAnJ1xuICAgICAgICB2YXIgY29weUtleVxuICAgICAgICBmb3IgKDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAga2V5ID0gY29uY2F0KGtleSwgcGFydHNbaV1bMV0pXG4gICAgICAgICAgfSBlbHNlIGlmIChwYXJ0c1tpXVswXSA9PT0gVkFSICYmIHBhcnRzW2ldWzFdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBwYXJ0c1tpXVsyXSA9PT0gJ29iamVjdCcgJiYgIWtleSkge1xuICAgICAgICAgICAgICBmb3IgKGNvcHlLZXkgaW4gcGFydHNbaV1bMl0pIHtcbiAgICAgICAgICAgICAgICBpZiAocGFydHNbaV1bMl0uaGFzT3duUHJvcGVydHkoY29weUtleSkgJiYgIWN1clsxXVtjb3B5S2V5XSkge1xuICAgICAgICAgICAgICAgICAgY3VyWzFdW2NvcHlLZXldID0gcGFydHNbaV1bMl1bY29weUtleV1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGtleSA9IGNvbmNhdChrZXksIHBhcnRzW2ldWzJdKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBicmVha1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJ0c1tpXVswXSA9PT0gQVRUUl9FUSkgaSsrXG4gICAgICAgIHZhciBqID0gaVxuICAgICAgICBmb3IgKDsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgaWYgKHBhcnRzW2ldWzBdID09PSBBVFRSX1ZBTFVFIHx8IHBhcnRzW2ldWzBdID09PSBBVFRSX0tFWSkge1xuICAgICAgICAgICAgaWYgKCFjdXJbMV1ba2V5XSkgY3VyWzFdW2tleV0gPSBzdHJmbihwYXJ0c1tpXVsxXSlcbiAgICAgICAgICAgIGVsc2UgY3VyWzFdW2tleV0gPSBjb25jYXQoY3VyWzFdW2tleV0sIHBhcnRzW2ldWzFdKVxuICAgICAgICAgIH0gZWxzZSBpZiAocGFydHNbaV1bMF0gPT09IFZBUlxuICAgICAgICAgICYmIChwYXJ0c1tpXVsxXSA9PT0gQVRUUl9WQUxVRSB8fCBwYXJ0c1tpXVsxXSA9PT0gQVRUUl9LRVkpKSB7XG4gICAgICAgICAgICBpZiAoIWN1clsxXVtrZXldKSBjdXJbMV1ba2V5XSA9IHN0cmZuKHBhcnRzW2ldWzJdKVxuICAgICAgICAgICAgZWxzZSBjdXJbMV1ba2V5XSA9IGNvbmNhdChjdXJbMV1ba2V5XSwgcGFydHNbaV1bMl0pXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChrZXkubGVuZ3RoICYmICFjdXJbMV1ba2V5XSAmJiBpID09PSBqXG4gICAgICAgICAgICAmJiAocGFydHNbaV1bMF0gPT09IENMT1NFIHx8IHBhcnRzW2ldWzBdID09PSBBVFRSX0JSRUFLKSkge1xuICAgICAgICAgICAgICAvLyBodHRwczovL2h0bWwuc3BlYy53aGF0d2cub3JnL211bHRpcGFnZS9pbmZyYXN0cnVjdHVyZS5odG1sI2Jvb2xlYW4tYXR0cmlidXRlc1xuICAgICAgICAgICAgICAvLyBlbXB0eSBzdHJpbmcgaXMgZmFsc3ksIG5vdCB3ZWxsIGJlaGF2ZWQgdmFsdWUgaW4gYnJvd3NlclxuICAgICAgICAgICAgICBjdXJbMV1ba2V5XSA9IGtleS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBBVFRSX0tFWSkge1xuICAgICAgICBjdXJbMV1bcFsxXV0gPSB0cnVlXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IFZBUiAmJiBwWzFdID09PSBBVFRSX0tFWSkge1xuICAgICAgICBjdXJbMV1bcFsyXV0gPSB0cnVlXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IENMT1NFKSB7XG4gICAgICAgIGlmIChzZWxmQ2xvc2luZyhjdXJbMF0pICYmIHN0YWNrLmxlbmd0aCkge1xuICAgICAgICAgIHZhciBpeCA9IHN0YWNrW3N0YWNrLmxlbmd0aC0xXVsxXVxuICAgICAgICAgIHN0YWNrLnBvcCgpXG4gICAgICAgICAgc3RhY2tbc3RhY2subGVuZ3RoLTFdWzBdWzJdW2l4XSA9IGgoXG4gICAgICAgICAgICBjdXJbMF0sIGN1clsxXSwgY3VyWzJdLmxlbmd0aCA/IGN1clsyXSA6IHVuZGVmaW5lZFxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBWQVIgJiYgcFsxXSA9PT0gVEVYVCkge1xuICAgICAgICBpZiAocFsyXSA9PT0gdW5kZWZpbmVkIHx8IHBbMl0gPT09IG51bGwpIHBbMl0gPSAnJ1xuICAgICAgICBlbHNlIGlmICghcFsyXSkgcFsyXSA9IGNvbmNhdCgnJywgcFsyXSlcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocFsyXVswXSkpIHtcbiAgICAgICAgICBjdXJbMl0ucHVzaC5hcHBseShjdXJbMl0sIHBbMl0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY3VyWzJdLnB1c2gocFsyXSlcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzID09PSBURVhUKSB7XG4gICAgICAgIGN1clsyXS5wdXNoKHBbMV0pXG4gICAgICB9IGVsc2UgaWYgKHMgPT09IEFUVFJfRVEgfHwgcyA9PT0gQVRUUl9CUkVBSykge1xuICAgICAgICAvLyBuby1vcFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmhhbmRsZWQ6ICcgKyBzKVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0cmVlWzJdLmxlbmd0aCA+IDEgJiYgL15cXHMqJC8udGVzdCh0cmVlWzJdWzBdKSkge1xuICAgICAgdHJlZVsyXS5zaGlmdCgpXG4gICAgfVxuXG4gICAgaWYgKHRyZWVbMl0ubGVuZ3RoID4gMlxuICAgIHx8ICh0cmVlWzJdLmxlbmd0aCA9PT0gMiAmJiAvXFxTLy50ZXN0KHRyZWVbMl1bMV0pKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAnbXVsdGlwbGUgcm9vdCBlbGVtZW50cyBtdXN0IGJlIHdyYXBwZWQgaW4gYW4gZW5jbG9zaW5nIHRhZydcbiAgICAgIClcbiAgICB9XG4gICAgaWYgKEFycmF5LmlzQXJyYXkodHJlZVsyXVswXSkgJiYgdHlwZW9mIHRyZWVbMl1bMF1bMF0gPT09ICdzdHJpbmcnXG4gICAgJiYgQXJyYXkuaXNBcnJheSh0cmVlWzJdWzBdWzJdKSkge1xuICAgICAgdHJlZVsyXVswXSA9IGgodHJlZVsyXVswXVswXSwgdHJlZVsyXVswXVsxXSwgdHJlZVsyXVswXVsyXSlcbiAgICB9XG4gICAgcmV0dXJuIHRyZWVbMl1bMF1cblxuICAgIGZ1bmN0aW9uIHBhcnNlIChzdHIpIHtcbiAgICAgIHZhciByZXMgPSBbXVxuICAgICAgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1cpIHN0YXRlID0gQVRUUlxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGMgPSBzdHIuY2hhckF0KGkpXG4gICAgICAgIGlmIChzdGF0ZSA9PT0gVEVYVCAmJiBjID09PSAnPCcpIHtcbiAgICAgICAgICBpZiAocmVnLmxlbmd0aCkgcmVzLnB1c2goW1RFWFQsIHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IE9QRU5cbiAgICAgICAgfSBlbHNlIGlmIChjID09PSAnPicgJiYgIXF1b3Qoc3RhdGUpICYmIHN0YXRlICE9PSBDT01NRU5UKSB7XG4gICAgICAgICAgaWYgKHN0YXRlID09PSBPUEVOKSB7XG4gICAgICAgICAgICByZXMucHVzaChbT1BFTixyZWddKVxuICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfS0VZKSB7XG4gICAgICAgICAgICByZXMucHVzaChbQVRUUl9LRVkscmVnXSlcbiAgICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlcy5wdXNoKFtDTE9TRV0pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IFRFWFRcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQ09NTUVOVCAmJiAvLSQvLnRlc3QocmVnKSAmJiBjID09PSAnLScpIHtcbiAgICAgICAgICBpZiAob3B0cy5jb21tZW50cykge1xuICAgICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnLnN1YnN0cigwLCByZWcubGVuZ3RoIC0gMSldLFtDTE9TRV0pXG4gICAgICAgICAgfVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBURVhUXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IE9QRU4gJiYgL14hLS0kLy50ZXN0KHJlZykpIHtcbiAgICAgICAgICBpZiAob3B0cy5jb21tZW50cykge1xuICAgICAgICAgICAgcmVzLnB1c2goW09QRU4sIHJlZ10sW0FUVFJfS0VZLCdjb21tZW50J10sW0FUVFJfRVFdKVxuICAgICAgICAgIH1cbiAgICAgICAgICByZWcgPSBjXG4gICAgICAgICAgc3RhdGUgPSBDT01NRU5UXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IFRFWFQgfHwgc3RhdGUgPT09IENPTU1FTlQpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICByZXMucHVzaChbT1BFTiwgcmVnXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBPUEVOKSB7XG4gICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUiAmJiAvW15cXHNcIic9L10vLnRlc3QoYykpIHtcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZXG4gICAgICAgICAgcmVnID0gY1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSICYmIC9cXHMvLnRlc3QoYykpIHtcbiAgICAgICAgICBpZiAocmVnLmxlbmd0aCkgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfQlJFQUtdKVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX0tFWSAmJiAvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJfS0VZX1dcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkgJiYgYyA9PT0gJz0nKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10sW0FUVFJfRVFdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX1dcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9IGVsc2UgaWYgKChzdGF0ZSA9PT0gQVRUUl9LRVlfVyB8fCBzdGF0ZSA9PT0gQVRUUikgJiYgYyA9PT0gJz0nKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfRVFdKVxuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9XXG4gICAgICAgIH0gZWxzZSBpZiAoKHN0YXRlID09PSBBVFRSX0tFWV9XIHx8IHN0YXRlID09PSBBVFRSKSAmJiAhL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICBpZiAoL1tcXHctXS8udGVzdChjKSkge1xuICAgICAgICAgICAgcmVnICs9IGNcbiAgICAgICAgICAgIHN0YXRlID0gQVRUUl9LRVlcbiAgICAgICAgICB9IGVsc2Ugc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiBjID09PSAnXCInKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFX0RRXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfVyAmJiBjID09PSBcIidcIikge1xuICAgICAgICAgIHN0YXRlID0gQVRUUl9WQUxVRV9TUVxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRICYmIGMgPT09ICdcIicpIHtcbiAgICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddLFtBVFRSX0JSRUFLXSlcbiAgICAgICAgICByZWcgPSAnJ1xuICAgICAgICAgIHN0YXRlID0gQVRUUlxuICAgICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX1NRICYmIGMgPT09IFwiJ1wiKSB7XG4gICAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSxbQVRUUl9CUkVBS10pXG4gICAgICAgICAgcmVnID0gJydcbiAgICAgICAgICBzdGF0ZSA9IEFUVFJcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRV9XICYmICEvXFxzLy50ZXN0KGMpKSB7XG4gICAgICAgICAgc3RhdGUgPSBBVFRSX1ZBTFVFXG4gICAgICAgICAgaS0tXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgJiYgL1xccy8udGVzdChjKSkge1xuICAgICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10sW0FUVFJfQlJFQUtdKVxuICAgICAgICAgIHJlZyA9ICcnXG4gICAgICAgICAgc3RhdGUgPSBBVFRSXG4gICAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUUgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfU1FcbiAgICAgICAgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfRFEpIHtcbiAgICAgICAgICByZWcgKz0gY1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGUgPT09IFRFWFQgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbVEVYVCxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9WQUxVRSAmJiByZWcubGVuZ3RoKSB7XG4gICAgICAgIHJlcy5wdXNoKFtBVFRSX1ZBTFVFLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9IGVsc2UgaWYgKHN0YXRlID09PSBBVFRSX1ZBTFVFX0RRICYmIHJlZy5sZW5ndGgpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfVkFMVUUscmVnXSlcbiAgICAgICAgcmVnID0gJydcbiAgICAgIH0gZWxzZSBpZiAoc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgJiYgcmVnLmxlbmd0aCkge1xuICAgICAgICByZXMucHVzaChbQVRUUl9WQUxVRSxyZWddKVxuICAgICAgICByZWcgPSAnJ1xuICAgICAgfSBlbHNlIGlmIChzdGF0ZSA9PT0gQVRUUl9LRVkpIHtcbiAgICAgICAgcmVzLnB1c2goW0FUVFJfS0VZLHJlZ10pXG4gICAgICAgIHJlZyA9ICcnXG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc3RyZm4gKHgpIHtcbiAgICBpZiAodHlwZW9mIHggPT09ICdmdW5jdGlvbicpIHJldHVybiB4XG4gICAgZWxzZSBpZiAodHlwZW9mIHggPT09ICdzdHJpbmcnKSByZXR1cm4geFxuICAgIGVsc2UgaWYgKHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnKSByZXR1cm4geFxuICAgIGVsc2UgcmV0dXJuIGNvbmNhdCgnJywgeClcbiAgfVxufVxuXG5mdW5jdGlvbiBxdW90IChzdGF0ZSkge1xuICByZXR1cm4gc3RhdGUgPT09IEFUVFJfVkFMVUVfU1EgfHwgc3RhdGUgPT09IEFUVFJfVkFMVUVfRFFcbn1cblxudmFyIGhhc093biA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlcbmZ1bmN0aW9uIGhhcyAob2JqLCBrZXkpIHsgcmV0dXJuIGhhc093bi5jYWxsKG9iaiwga2V5KSB9XG5cbnZhciBjbG9zZVJFID0gUmVnRXhwKCdeKCcgKyBbXG4gICdhcmVhJywgJ2Jhc2UnLCAnYmFzZWZvbnQnLCAnYmdzb3VuZCcsICdicicsICdjb2wnLCAnY29tbWFuZCcsICdlbWJlZCcsXG4gICdmcmFtZScsICdocicsICdpbWcnLCAnaW5wdXQnLCAnaXNpbmRleCcsICdrZXlnZW4nLCAnbGluaycsICdtZXRhJywgJ3BhcmFtJyxcbiAgJ3NvdXJjZScsICd0cmFjaycsICd3YnInLCAnIS0tJyxcbiAgLy8gU1ZHIFRBR1NcbiAgJ2FuaW1hdGUnLCAnYW5pbWF0ZVRyYW5zZm9ybScsICdjaXJjbGUnLCAnY3Vyc29yJywgJ2Rlc2MnLCAnZWxsaXBzZScsXG4gICdmZUJsZW5kJywgJ2ZlQ29sb3JNYXRyaXgnLCAnZmVDb21wb3NpdGUnLFxuICAnZmVDb252b2x2ZU1hdHJpeCcsICdmZURpZmZ1c2VMaWdodGluZycsICdmZURpc3BsYWNlbWVudE1hcCcsXG4gICdmZURpc3RhbnRMaWdodCcsICdmZUZsb29kJywgJ2ZlRnVuY0EnLCAnZmVGdW5jQicsICdmZUZ1bmNHJywgJ2ZlRnVuY1InLFxuICAnZmVHYXVzc2lhbkJsdXInLCAnZmVJbWFnZScsICdmZU1lcmdlTm9kZScsICdmZU1vcnBob2xvZ3knLFxuICAnZmVPZmZzZXQnLCAnZmVQb2ludExpZ2h0JywgJ2ZlU3BlY3VsYXJMaWdodGluZycsICdmZVNwb3RMaWdodCcsICdmZVRpbGUnLFxuICAnZmVUdXJidWxlbmNlJywgJ2ZvbnQtZmFjZS1mb3JtYXQnLCAnZm9udC1mYWNlLW5hbWUnLCAnZm9udC1mYWNlLXVyaScsXG4gICdnbHlwaCcsICdnbHlwaFJlZicsICdoa2VybicsICdpbWFnZScsICdsaW5lJywgJ21pc3NpbmctZ2x5cGgnLCAnbXBhdGgnLFxuICAncGF0aCcsICdwb2x5Z29uJywgJ3BvbHlsaW5lJywgJ3JlY3QnLCAnc2V0JywgJ3N0b3AnLCAndHJlZicsICd1c2UnLCAndmlldycsXG4gICd2a2Vybidcbl0uam9pbignfCcpICsgJykoPzpbXFwuI11bYS16QS1aMC05XFx1MDA3Ri1cXHVGRkZGXzotXSspKiQnKVxuZnVuY3Rpb24gc2VsZkNsb3NpbmcgKHRhZykgeyByZXR1cm4gY2xvc2VSRS50ZXN0KHRhZykgfVxuIiwiXG4ndXNlIHN0cmljdCc7XG5cblxuLyogZXNsaW50LWRpc2FibGUgbm8tYml0d2lzZSAqL1xuXG52YXIgZGVjb2RlQ2FjaGUgPSB7fTtcblxuZnVuY3Rpb24gZ2V0RGVjb2RlQ2FjaGUoZXhjbHVkZSkge1xuICB2YXIgaSwgY2gsIGNhY2hlID0gZGVjb2RlQ2FjaGVbZXhjbHVkZV07XG4gIGlmIChjYWNoZSkgeyByZXR1cm4gY2FjaGU7IH1cblxuICBjYWNoZSA9IGRlY29kZUNhY2hlW2V4Y2x1ZGVdID0gW107XG5cbiAgZm9yIChpID0gMDsgaSA8IDEyODsgaSsrKSB7XG4gICAgY2ggPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGkpO1xuICAgIGNhY2hlLnB1c2goY2gpO1xuICB9XG5cbiAgZm9yIChpID0gMDsgaSA8IGV4Y2x1ZGUubGVuZ3RoOyBpKyspIHtcbiAgICBjaCA9IGV4Y2x1ZGUuY2hhckNvZGVBdChpKTtcbiAgICBjYWNoZVtjaF0gPSAnJScgKyAoJzAnICsgY2gudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkpLnNsaWNlKC0yKTtcbiAgfVxuXG4gIHJldHVybiBjYWNoZTtcbn1cblxuXG4vLyBEZWNvZGUgcGVyY2VudC1lbmNvZGVkIHN0cmluZy5cbi8vXG5mdW5jdGlvbiBkZWNvZGUoc3RyaW5nLCBleGNsdWRlKSB7XG4gIHZhciBjYWNoZTtcblxuICBpZiAodHlwZW9mIGV4Y2x1ZGUgIT09ICdzdHJpbmcnKSB7XG4gICAgZXhjbHVkZSA9IGRlY29kZS5kZWZhdWx0Q2hhcnM7XG4gIH1cblxuICBjYWNoZSA9IGdldERlY29kZUNhY2hlKGV4Y2x1ZGUpO1xuXG4gIHJldHVybiBzdHJpbmcucmVwbGFjZSgvKCVbYS1mMC05XXsyfSkrL2dpLCBmdW5jdGlvbihzZXEpIHtcbiAgICB2YXIgaSwgbCwgYjEsIGIyLCBiMywgYjQsIGNocixcbiAgICAgICAgcmVzdWx0ID0gJyc7XG5cbiAgICBmb3IgKGkgPSAwLCBsID0gc2VxLmxlbmd0aDsgaSA8IGw7IGkgKz0gMykge1xuICAgICAgYjEgPSBwYXJzZUludChzZXEuc2xpY2UoaSArIDEsIGkgKyAzKSwgMTYpO1xuXG4gICAgICBpZiAoYjEgPCAweDgwKSB7XG4gICAgICAgIHJlc3VsdCArPSBjYWNoZVtiMV07XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAoKGIxICYgMHhFMCkgPT09IDB4QzAgJiYgKGkgKyAzIDwgbCkpIHtcbiAgICAgICAgLy8gMTEweHh4eHggMTB4eHh4eHhcbiAgICAgICAgYjIgPSBwYXJzZUludChzZXEuc2xpY2UoaSArIDQsIGkgKyA2KSwgMTYpO1xuXG4gICAgICAgIGlmICgoYjIgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgIGNociA9ICgoYjEgPDwgNikgJiAweDdDMCkgfCAoYjIgJiAweDNGKTtcblxuICAgICAgICAgIGlmIChjaHIgPCAweDgwKSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gJ1xcdWZmZmRcXHVmZmZkJztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoY2hyKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpICs9IDM7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKChiMSAmIDB4RjApID09PSAweEUwICYmIChpICsgNiA8IGwpKSB7XG4gICAgICAgIC8vIDExMTB4eHh4IDEweHh4eHh4IDEweHh4eHh4XG4gICAgICAgIGIyID0gcGFyc2VJbnQoc2VxLnNsaWNlKGkgKyA0LCBpICsgNiksIDE2KTtcbiAgICAgICAgYjMgPSBwYXJzZUludChzZXEuc2xpY2UoaSArIDcsIGkgKyA5KSwgMTYpO1xuXG4gICAgICAgIGlmICgoYjIgJiAweEMwKSA9PT0gMHg4MCAmJiAoYjMgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgIGNociA9ICgoYjEgPDwgMTIpICYgMHhGMDAwKSB8ICgoYjIgPDwgNikgJiAweEZDMCkgfCAoYjMgJiAweDNGKTtcblxuICAgICAgICAgIGlmIChjaHIgPCAweDgwMCB8fCAoY2hyID49IDB4RDgwMCAmJiBjaHIgPD0gMHhERkZGKSkge1xuICAgICAgICAgICAgcmVzdWx0ICs9ICdcXHVmZmZkXFx1ZmZmZFxcdWZmZmQnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjaHIpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGkgKz0gNjtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoKGIxICYgMHhGOCkgPT09IDB4RjAgJiYgKGkgKyA5IDwgbCkpIHtcbiAgICAgICAgLy8gMTExMTEweHggMTB4eHh4eHggMTB4eHh4eHggMTB4eHh4eHhcbiAgICAgICAgYjIgPSBwYXJzZUludChzZXEuc2xpY2UoaSArIDQsIGkgKyA2KSwgMTYpO1xuICAgICAgICBiMyA9IHBhcnNlSW50KHNlcS5zbGljZShpICsgNywgaSArIDkpLCAxNik7XG4gICAgICAgIGI0ID0gcGFyc2VJbnQoc2VxLnNsaWNlKGkgKyAxMCwgaSArIDEyKSwgMTYpO1xuXG4gICAgICAgIGlmICgoYjIgJiAweEMwKSA9PT0gMHg4MCAmJiAoYjMgJiAweEMwKSA9PT0gMHg4MCAmJiAoYjQgJiAweEMwKSA9PT0gMHg4MCkge1xuICAgICAgICAgIGNociA9ICgoYjEgPDwgMTgpICYgMHgxQzAwMDApIHwgKChiMiA8PCAxMikgJiAweDNGMDAwKSB8ICgoYjMgPDwgNikgJiAweEZDMCkgfCAoYjQgJiAweDNGKTtcblxuICAgICAgICAgIGlmIChjaHIgPCAweDEwMDAwIHx8IGNociA+IDB4MTBGRkZGKSB7XG4gICAgICAgICAgICByZXN1bHQgKz0gJ1xcdWZmZmRcXHVmZmZkXFx1ZmZmZFxcdWZmZmQnO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjaHIgLT0gMHgxMDAwMDtcbiAgICAgICAgICAgIHJlc3VsdCArPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RDgwMCArIChjaHIgPj4gMTApLCAweERDMDAgKyAoY2hyICYgMHgzRkYpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpICs9IDk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmVzdWx0ICs9ICdcXHVmZmZkJztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxuXG5kZWNvZGUuZGVmYXVsdENoYXJzICAgPSAnOy8/OkAmPSskLCMnO1xuZGVjb2RlLmNvbXBvbmVudENoYXJzID0gJyc7XG5cblxubW9kdWxlLmV4cG9ydHMgPSBkZWNvZGU7XG4iLCJcbid1c2Ugc3RyaWN0JztcblxuXG52YXIgZW5jb2RlQ2FjaGUgPSB7fTtcblxuXG4vLyBDcmVhdGUgYSBsb29rdXAgYXJyYXkgd2hlcmUgYW55dGhpbmcgYnV0IGNoYXJhY3RlcnMgaW4gYGNoYXJzYCBzdHJpbmdcbi8vIGFuZCBhbHBoYW51bWVyaWMgY2hhcnMgaXMgcGVyY2VudC1lbmNvZGVkLlxuLy9cbmZ1bmN0aW9uIGdldEVuY29kZUNhY2hlKGV4Y2x1ZGUpIHtcbiAgdmFyIGksIGNoLCBjYWNoZSA9IGVuY29kZUNhY2hlW2V4Y2x1ZGVdO1xuICBpZiAoY2FjaGUpIHsgcmV0dXJuIGNhY2hlOyB9XG5cbiAgY2FjaGUgPSBlbmNvZGVDYWNoZVtleGNsdWRlXSA9IFtdO1xuXG4gIGZvciAoaSA9IDA7IGkgPCAxMjg7IGkrKykge1xuICAgIGNoID0gU3RyaW5nLmZyb21DaGFyQ29kZShpKTtcblxuICAgIGlmICgvXlswLTlhLXpdJC9pLnRlc3QoY2gpKSB7XG4gICAgICAvLyBhbHdheXMgYWxsb3cgdW5lbmNvZGVkIGFscGhhbnVtZXJpYyBjaGFyYWN0ZXJzXG4gICAgICBjYWNoZS5wdXNoKGNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FjaGUucHVzaCgnJScgKyAoJzAnICsgaS50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSkuc2xpY2UoLTIpKTtcbiAgICB9XG4gIH1cblxuICBmb3IgKGkgPSAwOyBpIDwgZXhjbHVkZS5sZW5ndGg7IGkrKykge1xuICAgIGNhY2hlW2V4Y2x1ZGUuY2hhckNvZGVBdChpKV0gPSBleGNsdWRlW2ldO1xuICB9XG5cbiAgcmV0dXJuIGNhY2hlO1xufVxuXG5cbi8vIEVuY29kZSB1bnNhZmUgY2hhcmFjdGVycyB3aXRoIHBlcmNlbnQtZW5jb2RpbmcsIHNraXBwaW5nIGFscmVhZHlcbi8vIGVuY29kZWQgc2VxdWVuY2VzLlxuLy9cbi8vICAtIHN0cmluZyAgICAgICAtIHN0cmluZyB0byBlbmNvZGVcbi8vICAtIGV4Y2x1ZGUgICAgICAtIGxpc3Qgb2YgY2hhcmFjdGVycyB0byBpZ25vcmUgKGluIGFkZGl0aW9uIHRvIGEtekEtWjAtOSlcbi8vICAtIGtlZXBFc2NhcGVkICAtIGRvbid0IGVuY29kZSAnJScgaW4gYSBjb3JyZWN0IGVzY2FwZSBzZXF1ZW5jZSAoZGVmYXVsdDogdHJ1ZSlcbi8vXG5mdW5jdGlvbiBlbmNvZGUoc3RyaW5nLCBleGNsdWRlLCBrZWVwRXNjYXBlZCkge1xuICB2YXIgaSwgbCwgY29kZSwgbmV4dENvZGUsIGNhY2hlLFxuICAgICAgcmVzdWx0ID0gJyc7XG5cbiAgaWYgKHR5cGVvZiBleGNsdWRlICE9PSAnc3RyaW5nJykge1xuICAgIC8vIGVuY29kZShzdHJpbmcsIGtlZXBFc2NhcGVkKVxuICAgIGtlZXBFc2NhcGVkICA9IGV4Y2x1ZGU7XG4gICAgZXhjbHVkZSA9IGVuY29kZS5kZWZhdWx0Q2hhcnM7XG4gIH1cblxuICBpZiAodHlwZW9mIGtlZXBFc2NhcGVkID09PSAndW5kZWZpbmVkJykge1xuICAgIGtlZXBFc2NhcGVkID0gdHJ1ZTtcbiAgfVxuXG4gIGNhY2hlID0gZ2V0RW5jb2RlQ2FjaGUoZXhjbHVkZSk7XG5cbiAgZm9yIChpID0gMCwgbCA9IHN0cmluZy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBjb2RlID0gc3RyaW5nLmNoYXJDb2RlQXQoaSk7XG5cbiAgICBpZiAoa2VlcEVzY2FwZWQgJiYgY29kZSA9PT0gMHgyNSAvKiAlICovICYmIGkgKyAyIDwgbCkge1xuICAgICAgaWYgKC9eWzAtOWEtZl17Mn0kL2kudGVzdChzdHJpbmcuc2xpY2UoaSArIDEsIGkgKyAzKSkpIHtcbiAgICAgICAgcmVzdWx0ICs9IHN0cmluZy5zbGljZShpLCBpICsgMyk7XG4gICAgICAgIGkgKz0gMjtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvZGUgPCAxMjgpIHtcbiAgICAgIHJlc3VsdCArPSBjYWNoZVtjb2RlXTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChjb2RlID49IDB4RDgwMCAmJiBjb2RlIDw9IDB4REZGRikge1xuICAgICAgaWYgKGNvZGUgPj0gMHhEODAwICYmIGNvZGUgPD0gMHhEQkZGICYmIGkgKyAxIDwgbCkge1xuICAgICAgICBuZXh0Q29kZSA9IHN0cmluZy5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgICAgICAgaWYgKG5leHRDb2RlID49IDB4REMwMCAmJiBuZXh0Q29kZSA8PSAweERGRkYpIHtcbiAgICAgICAgICByZXN1bHQgKz0gZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ1tpXSArIHN0cmluZ1tpICsgMV0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmVzdWx0ICs9ICclRUYlQkYlQkQnO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzdWx0ICs9IGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdbaV0pO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZW5jb2RlLmRlZmF1bHRDaGFycyAgID0gXCI7Lz86QCY9KyQsLV8uIX4qJygpI1wiO1xuZW5jb2RlLmNvbXBvbmVudENoYXJzID0gXCItXy4hfionKClcIjtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGVuY29kZTtcbiIsInZhciBuYW5vdGltaW5nID0gcmVxdWlyZSgnbmFub3RpbWluZycpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBOYW5vYnVzXG5cbmZ1bmN0aW9uIE5hbm9idXMgKG5hbWUpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE5hbm9idXMpKSByZXR1cm4gbmV3IE5hbm9idXMobmFtZSlcblxuICB0aGlzLl9uYW1lID0gbmFtZSB8fCAnbmFub2J1cydcbiAgdGhpcy5fc3Rhckxpc3RlbmVycyA9IFtdXG4gIHRoaXMuX2xpc3RlbmVycyA9IHt9XG5cbiAgdGhpcy5fdGltaW5nID0gbmFub3RpbWluZyh0aGlzLl9uYW1lKVxufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgZGF0YSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGV2ZW50TmFtZSwgJ3N0cmluZycsICduYW5vYnVzLmVtaXQ6IGV2ZW50TmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuXG4gIHRoaXMuX3RpbWluZy5zdGFydChldmVudE5hbWUpXG4gIHZhciBsaXN0ZW5lcnMgPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXVxuICBpZiAobGlzdGVuZXJzICYmIGxpc3RlbmVycy5sZW5ndGggPiAwKSB7XG4gICAgdGhpcy5fZW1pdCh0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSwgZGF0YSlcbiAgfVxuXG4gIGlmICh0aGlzLl9zdGFyTGlzdGVuZXJzLmxlbmd0aCA+IDApIHtcbiAgICB0aGlzLl9lbWl0KHRoaXMuX3N0YXJMaXN0ZW5lcnMsIGV2ZW50TmFtZSwgZGF0YSlcbiAgfVxuICB0aGlzLl90aW1pbmcuZW5kKGV2ZW50TmFtZSlcblxuICByZXR1cm4gdGhpc1xufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5vbiA9IE5hbm9idXMucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24gKGV2ZW50TmFtZSwgbGlzdGVuZXIpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBldmVudE5hbWUsICdzdHJpbmcnLCAnbmFub2J1cy5vbjogZXZlbnROYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbGlzdGVuZXIsICdmdW5jdGlvbicsICduYW5vYnVzLm9uOiBsaXN0ZW5lciBzaG91bGQgYmUgdHlwZSBmdW5jdGlvbicpXG5cbiAgaWYgKGV2ZW50TmFtZSA9PT0gJyonKSB7XG4gICAgdGhpcy5fc3Rhckxpc3RlbmVycy5wdXNoKGxpc3RlbmVyKVxuICB9IGVsc2Uge1xuICAgIGlmICghdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0pIHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdID0gW11cbiAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXS5wdXNoKGxpc3RlbmVyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbk5hbm9idXMucHJvdG90eXBlLnByZXBlbmRMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgZXZlbnROYW1lLCAnc3RyaW5nJywgJ25hbm9idXMucHJlcGVuZExpc3RlbmVyOiBldmVudE5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBsaXN0ZW5lciwgJ2Z1bmN0aW9uJywgJ25hbm9idXMucHJlcGVuZExpc3RlbmVyOiBsaXN0ZW5lciBzaG91bGQgYmUgdHlwZSBmdW5jdGlvbicpXG5cbiAgaWYgKGV2ZW50TmFtZSA9PT0gJyonKSB7XG4gICAgdGhpcy5fc3Rhckxpc3RlbmVycy51bnNoaWZ0KGxpc3RlbmVyKVxuICB9IGVsc2Uge1xuICAgIGlmICghdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0pIHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdID0gW11cbiAgICB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXS51bnNoaWZ0KGxpc3RlbmVyKVxuICB9XG4gIHJldHVybiB0aGlzXG59XG5cbk5hbm9idXMucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGV2ZW50TmFtZSwgJ3N0cmluZycsICduYW5vYnVzLm9uY2U6IGV2ZW50TmFtZSBzaG91bGQgYmUgdHlwZSBzdHJpbmcnKVxuICBhc3NlcnQuZXF1YWwodHlwZW9mIGxpc3RlbmVyLCAnZnVuY3Rpb24nLCAnbmFub2J1cy5vbmNlOiBsaXN0ZW5lciBzaG91bGQgYmUgdHlwZSBmdW5jdGlvbicpXG5cbiAgdmFyIHNlbGYgPSB0aGlzXG4gIHRoaXMub24oZXZlbnROYW1lLCBvbmNlKVxuICBmdW5jdGlvbiBvbmNlICgpIHtcbiAgICBsaXN0ZW5lci5hcHBseShzZWxmLCBhcmd1bWVudHMpXG4gICAgc2VsZi5yZW1vdmVMaXN0ZW5lcihldmVudE5hbWUsIG9uY2UpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuTmFub2J1cy5wcm90b3R5cGUucHJlcGVuZE9uY2VMaXN0ZW5lciA9IGZ1bmN0aW9uIChldmVudE5hbWUsIGxpc3RlbmVyKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgZXZlbnROYW1lLCAnc3RyaW5nJywgJ25hbm9idXMucHJlcGVuZE9uY2VMaXN0ZW5lcjogZXZlbnROYW1lIHNob3VsZCBiZSB0eXBlIHN0cmluZycpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbGlzdGVuZXIsICdmdW5jdGlvbicsICduYW5vYnVzLnByZXBlbmRPbmNlTGlzdGVuZXI6IGxpc3RlbmVyIHNob3VsZCBiZSB0eXBlIGZ1bmN0aW9uJylcblxuICB2YXIgc2VsZiA9IHRoaXNcbiAgdGhpcy5wcmVwZW5kTGlzdGVuZXIoZXZlbnROYW1lLCBvbmNlKVxuICBmdW5jdGlvbiBvbmNlICgpIHtcbiAgICBsaXN0ZW5lci5hcHBseShzZWxmLCBhcmd1bWVudHMpXG4gICAgc2VsZi5yZW1vdmVMaXN0ZW5lcihldmVudE5hbWUsIG9uY2UpXG4gIH1cbiAgcmV0dXJuIHRoaXNcbn1cblxuTmFub2J1cy5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbiAoZXZlbnROYW1lLCBsaXN0ZW5lcikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGV2ZW50TmFtZSwgJ3N0cmluZycsICduYW5vYnVzLnJlbW92ZUxpc3RlbmVyOiBldmVudE5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBsaXN0ZW5lciwgJ2Z1bmN0aW9uJywgJ25hbm9idXMucmVtb3ZlTGlzdGVuZXI6IGxpc3RlbmVyIHNob3VsZCBiZSB0eXBlIGZ1bmN0aW9uJylcblxuICBpZiAoZXZlbnROYW1lID09PSAnKicpIHtcbiAgICB0aGlzLl9zdGFyTGlzdGVuZXJzID0gdGhpcy5fc3Rhckxpc3RlbmVycy5zbGljZSgpXG4gICAgcmV0dXJuIHJlbW92ZSh0aGlzLl9zdGFyTGlzdGVuZXJzLCBsaXN0ZW5lcilcbiAgfSBlbHNlIHtcbiAgICBpZiAodHlwZW9mIHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0gPSB0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXS5zbGljZSgpXG4gICAgfVxuXG4gICAgcmV0dXJuIHJlbW92ZSh0aGlzLl9saXN0ZW5lcnNbZXZlbnROYW1lXSwgbGlzdGVuZXIpXG4gIH1cblxuICBmdW5jdGlvbiByZW1vdmUgKGFyciwgbGlzdGVuZXIpIHtcbiAgICBpZiAoIWFycikgcmV0dXJuXG4gICAgdmFyIGluZGV4ID0gYXJyLmluZGV4T2YobGlzdGVuZXIpXG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgYXJyLnNwbGljZShpbmRleCwgMSlcbiAgICAgIHJldHVybiB0cnVlXG4gICAgfVxuICB9XG59XG5cbk5hbm9idXMucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uIChldmVudE5hbWUpIHtcbiAgaWYgKGV2ZW50TmFtZSkge1xuICAgIGlmIChldmVudE5hbWUgPT09ICcqJykge1xuICAgICAgdGhpcy5fc3Rhckxpc3RlbmVycyA9IFtdXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2xpc3RlbmVyc1tldmVudE5hbWVdID0gW11cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fc3Rhckxpc3RlbmVycyA9IFtdXG4gICAgdGhpcy5fbGlzdGVuZXJzID0ge31cbiAgfVxuICByZXR1cm4gdGhpc1xufVxuXG5OYW5vYnVzLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbiAoZXZlbnROYW1lKSB7XG4gIHZhciBsaXN0ZW5lcnMgPSAoZXZlbnROYW1lICE9PSAnKicpID8gdGhpcy5fbGlzdGVuZXJzW2V2ZW50TmFtZV0gOiB0aGlzLl9zdGFyTGlzdGVuZXJzXG4gIHZhciByZXQgPSBbXVxuICBpZiAobGlzdGVuZXJzKSB7XG4gICAgdmFyIGlsZW5ndGggPSBsaXN0ZW5lcnMubGVuZ3RoXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpbGVuZ3RoOyBpKyspIHJldC5wdXNoKGxpc3RlbmVyc1tpXSlcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbk5hbm9idXMucHJvdG90eXBlLl9lbWl0ID0gZnVuY3Rpb24gKGFyciwgZXZlbnROYW1lLCBkYXRhKSB7XG4gIGlmICh0eXBlb2YgYXJyID09PSAndW5kZWZpbmVkJykgcmV0dXJuXG4gIGlmICghZGF0YSkge1xuICAgIGRhdGEgPSBldmVudE5hbWVcbiAgICBldmVudE5hbWUgPSBudWxsXG4gIH1cbiAgdmFyIGxlbmd0aCA9IGFyci5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHZhciBsaXN0ZW5lciA9IGFycltpXVxuICAgIGlmIChldmVudE5hbWUpIGxpc3RlbmVyKGV2ZW50TmFtZSwgZGF0YSlcbiAgICBlbHNlIGxpc3RlbmVyKGRhdGEpXG4gIH1cbn1cbiIsInZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGhpc3RvcnlcblxuLy8gbGlzdGVuIHRvIGh0bWw1IHB1c2hzdGF0ZSBldmVudHNcbi8vIGFuZCB1cGRhdGUgcm91dGVyIGFjY29yZGluZ2x5XG5mdW5jdGlvbiBoaXN0b3J5IChjYikge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIGNiLCAnZnVuY3Rpb24nLCAnbmFub2hpc3Rvcnk6IGNiIG11c3QgYmUgdHlwZSBmdW5jdGlvbicpXG4gIHdpbmRvdy5vbnBvcHN0YXRlID0gZnVuY3Rpb24gKCkge1xuICAgIGNiKGRvY3VtZW50LmxvY2F0aW9uKVxuICB9XG59XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBocmVmXG5cbnZhciBub1JvdXRpbmdBdHRyTmFtZSA9ICdkYXRhLW5vLXJvdXRpbmcnXG5cbi8vIGhhbmRsZSBhIGNsaWNrIGlmIGlzIGFuY2hvciB0YWcgd2l0aCBhbiBocmVmXG4vLyBhbmQgdXJsIGxpdmVzIG9uIHRoZSBzYW1lIGRvbWFpbi4gUmVwbGFjZXNcbi8vIHRyYWlsaW5nICcjJyBzbyBlbXB0eSBsaW5rcyB3b3JrIGFzIGV4cGVjdGVkLlxuLy8gKGZuKHN0ciksIG9iaj8pIC0+IHVuZGVmaW5lZFxuZnVuY3Rpb24gaHJlZiAoY2IsIHJvb3QpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBjYiwgJ2Z1bmN0aW9uJywgJ25hbm9ocmVmOiBjYiBtdXN0IGJlIHR5cGUgZnVuY3Rpb24nKVxuICByb290ID0gcm9vdCB8fCB3aW5kb3cuZG9jdW1lbnRcblxuICB3aW5kb3cub25jbGljayA9IGZ1bmN0aW9uIChlKSB7XG4gICAgaWYgKChlLmJ1dHRvbiAmJiBlLmJ1dHRvbiAhPT0gMCkgfHwgZS5jdHJsS2V5IHx8IGUubWV0YUtleSB8fCBlLmFsdEtleSB8fCBlLnNoaWZ0S2V5KSByZXR1cm5cblxuICAgIHZhciBub2RlID0gKGZ1bmN0aW9uIHRyYXZlcnNlIChub2RlKSB7XG4gICAgICBpZiAoIW5vZGUgfHwgbm9kZSA9PT0gcm9vdCkgcmV0dXJuXG4gICAgICBpZiAobm9kZS5sb2NhbE5hbWUgIT09ICdhJykgcmV0dXJuIHRyYXZlcnNlKG5vZGUucGFyZW50Tm9kZSlcbiAgICAgIGlmIChub2RlLmhyZWYgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHRyYXZlcnNlKG5vZGUucGFyZW50Tm9kZSlcbiAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uaG9zdCAhPT0gbm9kZS5ob3N0KSByZXR1cm4gdHJhdmVyc2Uobm9kZS5wYXJlbnROb2RlKVxuICAgICAgcmV0dXJuIG5vZGVcbiAgICB9KShlLnRhcmdldClcblxuICAgIGlmICghbm9kZSkgcmV0dXJuXG5cbiAgICB2YXIgaXNSb3V0aW5nRGlzYWJsZWQgPSBub2RlLmhhc0F0dHJpYnV0ZShub1JvdXRpbmdBdHRyTmFtZSlcbiAgICBpZiAoaXNSb3V0aW5nRGlzYWJsZWQpIHJldHVyblxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgY2Iobm9kZSlcbiAgfVxufVxuIiwidmFyIGFzc2VydCA9IHJlcXVpcmUoJ2Fzc2VydCcpXG52YXIgbW9ycGggPSByZXF1aXJlKCcuL2xpYi9tb3JwaCcpXG52YXIgcm9vdExhYmVsUmVnZXggPSAvXmRhdGEtb25sb2FkaWQvXG5cbnZhciBFTEVNRU5UX05PREUgPSAxXG5cbm1vZHVsZS5leHBvcnRzID0gbmFub21vcnBoXG5cbi8vIG1vcnBoIG9uZSB0cmVlIGludG8gYW5vdGhlciB0cmVlXG4vLyAob2JqLCBvYmopIC0+IG9ialxuLy8gbm8gcGFyZW50XG4vLyAgIC0+IHNhbWU6IGRpZmYgYW5kIHdhbGsgY2hpbGRyZW5cbi8vICAgLT4gbm90IHNhbWU6IHJlcGxhY2UgYW5kIHJldHVyblxuLy8gb2xkIG5vZGUgZG9lc24ndCBleGlzdFxuLy8gICAtPiBpbnNlcnQgbmV3IG5vZGVcbi8vIG5ldyBub2RlIGRvZXNuJ3QgZXhpc3Rcbi8vICAgLT4gZGVsZXRlIG9sZCBub2RlXG4vLyBub2RlcyBhcmUgbm90IHRoZSBzYW1lXG4vLyAgIC0+IGRpZmYgbm9kZXMgYW5kIGFwcGx5IHBhdGNoIHRvIG9sZCBub2RlXG4vLyBub2RlcyBhcmUgdGhlIHNhbWVcbi8vICAgLT4gd2FsayBhbGwgY2hpbGQgbm9kZXMgYW5kIGFwcGVuZCB0byBvbGQgbm9kZVxuZnVuY3Rpb24gbmFub21vcnBoIChvbGRUcmVlLCBuZXdUcmVlKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2Ygb2xkVHJlZSwgJ29iamVjdCcsICduYW5vbW9ycGg6IG9sZFRyZWUgc2hvdWxkIGJlIGFuIG9iamVjdCcpXG4gIGFzc2VydC5lcXVhbCh0eXBlb2YgbmV3VHJlZSwgJ29iamVjdCcsICduYW5vbW9ycGg6IG5ld1RyZWUgc2hvdWxkIGJlIGFuIG9iamVjdCcpXG5cbiAgcGVyc2lzdFN0YXRlZnVsUm9vdChuZXdUcmVlLCBvbGRUcmVlKVxuICB2YXIgdHJlZSA9IHdhbGsobmV3VHJlZSwgb2xkVHJlZSlcbiAgcmV0dXJuIHRyZWVcbn1cblxuLy8gd2FsayBhbmQgbW9ycGggYSBkb20gdHJlZVxuLy8gKG9iaiwgb2JqKSAtPiBvYmpcbmZ1bmN0aW9uIHdhbGsgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgaWYgKCFvbGROb2RlKSB7XG4gICAgcmV0dXJuIG5ld05vZGVcbiAgfSBlbHNlIGlmICghbmV3Tm9kZSkge1xuICAgIHJldHVybiBudWxsXG4gIH0gZWxzZSBpZiAobmV3Tm9kZS5pc1NhbWVOb2RlICYmIG5ld05vZGUuaXNTYW1lTm9kZShvbGROb2RlKSkge1xuICAgIHJldHVybiBvbGROb2RlXG4gIH0gZWxzZSBpZiAobmV3Tm9kZS50YWdOYW1lICE9PSBvbGROb2RlLnRhZ05hbWUpIHtcbiAgICByZXR1cm4gbmV3Tm9kZVxuICB9IGVsc2Uge1xuICAgIG1vcnBoKG5ld05vZGUsIG9sZE5vZGUpXG4gICAgdXBkYXRlQ2hpbGRyZW4obmV3Tm9kZSwgb2xkTm9kZSlcbiAgICByZXR1cm4gb2xkTm9kZVxuICB9XG59XG5cbi8vIHVwZGF0ZSB0aGUgY2hpbGRyZW4gb2YgZWxlbWVudHNcbi8vIChvYmosIG9iaikgLT4gbnVsbFxuZnVuY3Rpb24gdXBkYXRlQ2hpbGRyZW4gKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgaWYgKCFuZXdOb2RlLmNoaWxkTm9kZXMgfHwgIW9sZE5vZGUuY2hpbGROb2RlcykgcmV0dXJuXG5cbiAgdmFyIG5ld0xlbmd0aCA9IG5ld05vZGUuY2hpbGROb2Rlcy5sZW5ndGhcbiAgdmFyIG9sZExlbmd0aCA9IG9sZE5vZGUuY2hpbGROb2Rlcy5sZW5ndGhcbiAgdmFyIGxlbmd0aCA9IE1hdGgubWF4KG9sZExlbmd0aCwgbmV3TGVuZ3RoKVxuXG4gIHZhciBpTmV3ID0gMFxuICB2YXIgaU9sZCA9IDBcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKywgaU5ldysrLCBpT2xkKyspIHtcbiAgICB2YXIgbmV3Q2hpbGROb2RlID0gbmV3Tm9kZS5jaGlsZE5vZGVzW2lOZXddXG4gICAgdmFyIG9sZENoaWxkTm9kZSA9IG9sZE5vZGUuY2hpbGROb2Rlc1tpT2xkXVxuICAgIHZhciByZXRDaGlsZE5vZGUgPSB3YWxrKG5ld0NoaWxkTm9kZSwgb2xkQ2hpbGROb2RlKVxuICAgIGlmICghcmV0Q2hpbGROb2RlKSB7XG4gICAgICBpZiAob2xkQ2hpbGROb2RlKSB7XG4gICAgICAgIG9sZE5vZGUucmVtb3ZlQ2hpbGQob2xkQ2hpbGROb2RlKVxuICAgICAgICBpT2xkLS1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKCFvbGRDaGlsZE5vZGUpIHtcbiAgICAgIGlmIChyZXRDaGlsZE5vZGUpIHtcbiAgICAgICAgb2xkTm9kZS5hcHBlbmRDaGlsZChyZXRDaGlsZE5vZGUpXG4gICAgICAgIGlOZXctLVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAocmV0Q2hpbGROb2RlICE9PSBvbGRDaGlsZE5vZGUpIHtcbiAgICAgIG9sZE5vZGUucmVwbGFjZUNoaWxkKHJldENoaWxkTm9kZSwgb2xkQ2hpbGROb2RlKVxuICAgICAgaU5ldy0tXG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBlcnNpc3RTdGF0ZWZ1bFJvb3QgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgaWYgKCFuZXdOb2RlIHx8ICFvbGROb2RlIHx8IG9sZE5vZGUubm9kZVR5cGUgIT09IEVMRU1FTlRfTk9ERSB8fCBuZXdOb2RlLm5vZGVUeXBlICE9PSBFTEVNRU5UX05PREUpIHJldHVyblxuICB2YXIgb2xkQXR0cnMgPSBvbGROb2RlLmF0dHJpYnV0ZXNcbiAgdmFyIGF0dHIsIG5hbWVcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IG9sZEF0dHJzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgYXR0ciA9IG9sZEF0dHJzW2ldXG4gICAgbmFtZSA9IGF0dHIubmFtZVxuICAgIGlmIChyb290TGFiZWxSZWdleC50ZXN0KG5hbWUpKSB7XG4gICAgICBuZXdOb2RlLnNldEF0dHJpYnV0ZShuYW1lLCBhdHRyLnZhbHVlKVxuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gW1xuICAvLyBhdHRyaWJ1dGUgZXZlbnRzIChjYW4gYmUgc2V0IHdpdGggYXR0cmlidXRlcylcbiAgJ29uY2xpY2snLFxuICAnb25kYmxjbGljaycsXG4gICdvbm1vdXNlZG93bicsXG4gICdvbm1vdXNldXAnLFxuICAnb25tb3VzZW92ZXInLFxuICAnb25tb3VzZW1vdmUnLFxuICAnb25tb3VzZW91dCcsXG4gICdvbm1vdXNlZW50ZXInLFxuICAnb25tb3VzZWxlYXZlJyxcbiAgJ29uZHJhZ3N0YXJ0JyxcbiAgJ29uZHJhZycsXG4gICdvbmRyYWdlbnRlcicsXG4gICdvbmRyYWdsZWF2ZScsXG4gICdvbmRyYWdvdmVyJyxcbiAgJ29uZHJvcCcsXG4gICdvbmRyYWdlbmQnLFxuICAnb25rZXlkb3duJyxcbiAgJ29ua2V5cHJlc3MnLFxuICAnb25rZXl1cCcsXG4gICdvbnVubG9hZCcsXG4gICdvbmFib3J0JyxcbiAgJ29uZXJyb3InLFxuICAnb25yZXNpemUnLFxuICAnb25zY3JvbGwnLFxuICAnb25zZWxlY3QnLFxuICAnb25jaGFuZ2UnLFxuICAnb25zdWJtaXQnLFxuICAnb25yZXNldCcsXG4gICdvbmZvY3VzJyxcbiAgJ29uYmx1cicsXG4gICdvbmlucHV0JyxcbiAgLy8gb3RoZXIgY29tbW9uIGV2ZW50c1xuICAnb25jb250ZXh0bWVudScsXG4gICdvbmZvY3VzaW4nLFxuICAnb25mb2N1c291dCdcbl1cbiIsInZhciBldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXG52YXIgZXZlbnRzTGVuZ3RoID0gZXZlbnRzLmxlbmd0aFxuXG52YXIgRUxFTUVOVF9OT0RFID0gMVxudmFyIFRFWFRfTk9ERSA9IDNcbnZhciBDT01NRU5UX05PREUgPSA4XG5cbm1vZHVsZS5leHBvcnRzID0gbW9ycGhcblxuLy8gZGlmZiBlbGVtZW50cyBhbmQgYXBwbHkgdGhlIHJlc3VsdGluZyBwYXRjaCB0byB0aGUgb2xkIG5vZGVcbi8vIChvYmosIG9iaikgLT4gbnVsbFxuZnVuY3Rpb24gbW9ycGggKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgdmFyIG5vZGVUeXBlID0gbmV3Tm9kZS5ub2RlVHlwZVxuICB2YXIgbm9kZU5hbWUgPSBuZXdOb2RlLm5vZGVOYW1lXG5cbiAgaWYgKG5vZGVUeXBlID09PSBFTEVNRU5UX05PREUpIHtcbiAgICBjb3B5QXR0cnMobmV3Tm9kZSwgb2xkTm9kZSlcbiAgfVxuXG4gIGlmIChub2RlVHlwZSA9PT0gVEVYVF9OT0RFIHx8IG5vZGVUeXBlID09PSBDT01NRU5UX05PREUpIHtcbiAgICBvbGROb2RlLm5vZGVWYWx1ZSA9IG5ld05vZGUubm9kZVZhbHVlXG4gIH1cblxuICAvLyBTb21lIERPTSBub2RlcyBhcmUgd2VpcmRcbiAgLy8gaHR0cHM6Ly9naXRodWIuY29tL3BhdHJpY2stc3RlZWxlLWlkZW0vbW9ycGhkb20vYmxvYi9tYXN0ZXIvc3JjL3NwZWNpYWxFbEhhbmRsZXJzLmpzXG4gIGlmIChub2RlTmFtZSA9PT0gJ0lOUFVUJykgdXBkYXRlSW5wdXQobmV3Tm9kZSwgb2xkTm9kZSlcbiAgZWxzZSBpZiAobm9kZU5hbWUgPT09ICdPUFRJT04nKSB1cGRhdGVPcHRpb24obmV3Tm9kZSwgb2xkTm9kZSlcbiAgZWxzZSBpZiAobm9kZU5hbWUgPT09ICdURVhUQVJFQScpIHVwZGF0ZVRleHRhcmVhKG5ld05vZGUsIG9sZE5vZGUpXG4gIGVsc2UgaWYgKG5vZGVOYW1lID09PSAnU0VMRUNUJykgdXBkYXRlU2VsZWN0KG5ld05vZGUsIG9sZE5vZGUpXG5cbiAgY29weUV2ZW50cyhuZXdOb2RlLCBvbGROb2RlKVxufVxuXG5mdW5jdGlvbiBjb3B5QXR0cnMgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgdmFyIG9sZEF0dHJzID0gb2xkTm9kZS5hdHRyaWJ1dGVzXG4gIHZhciBuZXdBdHRycyA9IG5ld05vZGUuYXR0cmlidXRlc1xuICB2YXIgYXR0ck5hbWVzcGFjZVVSSSA9IG51bGxcbiAgdmFyIGF0dHJWYWx1ZSA9IG51bGxcbiAgdmFyIGZyb21WYWx1ZSA9IG51bGxcbiAgdmFyIGF0dHJOYW1lID0gbnVsbFxuICB2YXIgYXR0ciA9IG51bGxcblxuICBmb3IgKHZhciBpID0gbmV3QXR0cnMubGVuZ3RoIC0gMTsgaSA+PSAwOyAtLWkpIHtcbiAgICBhdHRyID0gbmV3QXR0cnNbaV1cbiAgICBhdHRyTmFtZSA9IGF0dHIubmFtZVxuICAgIGF0dHJOYW1lc3BhY2VVUkkgPSBhdHRyLm5hbWVzcGFjZVVSSVxuICAgIGF0dHJWYWx1ZSA9IGF0dHIudmFsdWVcblxuICAgIGlmIChhdHRyTmFtZXNwYWNlVVJJKSB7XG4gICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lXG4gICAgICBmcm9tVmFsdWUgPSBvbGROb2RlLmdldEF0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lKVxuXG4gICAgICBpZiAoZnJvbVZhbHVlICE9PSBhdHRyVmFsdWUpIHtcbiAgICAgICAgb2xkTm9kZS5zZXRBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSwgYXR0clZhbHVlKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmcm9tVmFsdWUgPSBvbGROb2RlLmdldEF0dHJpYnV0ZShhdHRyTmFtZSlcblxuICAgICAgaWYgKGZyb21WYWx1ZSAhPT0gYXR0clZhbHVlKSB7XG4gICAgICAgIC8vIGFwcGFyZW50bHkgdmFsdWVzIGFyZSBhbHdheXMgY2FzdCB0byBzdHJpbmdzLCBhaCB3ZWxsXG4gICAgICAgIGlmIChhdHRyVmFsdWUgPT09ICdudWxsJyB8fCBhdHRyVmFsdWUgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgb2xkTm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgb2xkTm9kZS5zZXRBdHRyaWJ1dGUoYXR0ck5hbWUsIGF0dHJWYWx1ZSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJlbW92ZSBhbnkgZXh0cmEgYXR0cmlidXRlcyBmb3VuZCBvbiB0aGUgb3JpZ2luYWwgRE9NIGVsZW1lbnQgdGhhdFxuICAvLyB3ZXJlbid0IGZvdW5kIG9uIHRoZSB0YXJnZXQgZWxlbWVudC5cbiAgZm9yICh2YXIgaiA9IG9sZEF0dHJzLmxlbmd0aCAtIDE7IGogPj0gMDsgLS1qKSB7XG4gICAgYXR0ciA9IG9sZEF0dHJzW2pdXG4gICAgaWYgKGF0dHIuc3BlY2lmaWVkICE9PSBmYWxzZSkge1xuICAgICAgYXR0ck5hbWUgPSBhdHRyLm5hbWVcbiAgICAgIGF0dHJOYW1lc3BhY2VVUkkgPSBhdHRyLm5hbWVzcGFjZVVSSVxuXG4gICAgICBpZiAoYXR0ck5hbWVzcGFjZVVSSSkge1xuICAgICAgICBhdHRyTmFtZSA9IGF0dHIubG9jYWxOYW1lIHx8IGF0dHJOYW1lXG4gICAgICAgIGlmICghbmV3Tm9kZS5oYXNBdHRyaWJ1dGVOUyhhdHRyTmFtZXNwYWNlVVJJLCBhdHRyTmFtZSkpIHtcbiAgICAgICAgICBvbGROb2RlLnJlbW92ZUF0dHJpYnV0ZU5TKGF0dHJOYW1lc3BhY2VVUkksIGF0dHJOYW1lKVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoIW5ld05vZGUuaGFzQXR0cmlidXRlTlMobnVsbCwgYXR0ck5hbWUpKSB7XG4gICAgICAgICAgb2xkTm9kZS5yZW1vdmVBdHRyaWJ1dGUoYXR0ck5hbWUpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gY29weUV2ZW50cyAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGV2ZW50c0xlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGV2ID0gZXZlbnRzW2ldXG4gICAgaWYgKG5ld05vZGVbZXZdKSB7ICAgICAgICAgICAvLyBpZiBuZXcgZWxlbWVudCBoYXMgYSB3aGl0ZWxpc3RlZCBhdHRyaWJ1dGVcbiAgICAgIG9sZE5vZGVbZXZdID0gbmV3Tm9kZVtldl0gIC8vIHVwZGF0ZSBleGlzdGluZyBlbGVtZW50XG4gICAgfSBlbHNlIGlmIChvbGROb2RlW2V2XSkgeyAgICAvLyBpZiBleGlzdGluZyBlbGVtZW50IGhhcyBpdCBhbmQgbmV3IG9uZSBkb2VzbnRcbiAgICAgIG9sZE5vZGVbZXZdID0gdW5kZWZpbmVkICAgIC8vIHJlbW92ZSBpdCBmcm9tIGV4aXN0aW5nIGVsZW1lbnRcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlT3B0aW9uIChuZXdOb2RlLCBvbGROb2RlKSB7XG4gIHVwZGF0ZUF0dHJpYnV0ZShuZXdOb2RlLCBvbGROb2RlLCAnc2VsZWN0ZWQnKVxufVxuXG4vLyBUaGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSBpcyBzcGVjaWFsIGZvciB0aGUgPGlucHV0PiBlbGVtZW50IHNpbmNlIGl0IHNldHMgdGhlXG4vLyBpbml0aWFsIHZhbHVlLiBDaGFuZ2luZyB0aGUgXCJ2YWx1ZVwiIGF0dHJpYnV0ZSB3aXRob3V0IGNoYW5naW5nIHRoZSBcInZhbHVlXCJcbi8vIHByb3BlcnR5IHdpbGwgaGF2ZSBubyBlZmZlY3Qgc2luY2UgaXQgaXMgb25seSB1c2VkIHRvIHRoZSBzZXQgdGhlIGluaXRpYWxcbi8vIHZhbHVlLiBTaW1pbGFyIGZvciB0aGUgXCJjaGVja2VkXCIgYXR0cmlidXRlLCBhbmQgXCJkaXNhYmxlZFwiLlxuZnVuY3Rpb24gdXBkYXRlSW5wdXQgKG5ld05vZGUsIG9sZE5vZGUpIHtcbiAgdmFyIG5ld1ZhbHVlID0gbmV3Tm9kZS52YWx1ZVxuICB2YXIgb2xkVmFsdWUgPSBvbGROb2RlLnZhbHVlXG5cbiAgdXBkYXRlQXR0cmlidXRlKG5ld05vZGUsIG9sZE5vZGUsICdjaGVja2VkJylcbiAgdXBkYXRlQXR0cmlidXRlKG5ld05vZGUsIG9sZE5vZGUsICdkaXNhYmxlZCcpXG5cbiAgaWYgKCFuZXdOb2RlLmhhc0F0dHJpYnV0ZU5TKG51bGwsICd2YWx1ZScpIHx8IG5ld1ZhbHVlID09PSAnbnVsbCcpIHtcbiAgICBvbGROb2RlLnZhbHVlID0gJydcbiAgICBvbGROb2RlLnJlbW92ZUF0dHJpYnV0ZSgndmFsdWUnKVxuICB9IGVsc2UgaWYgKG5ld1ZhbHVlICE9PSBvbGRWYWx1ZSkge1xuICAgIG9sZE5vZGUuc2V0QXR0cmlidXRlKCd2YWx1ZScsIG5ld1ZhbHVlKVxuICAgIG9sZE5vZGUudmFsdWUgPSBuZXdWYWx1ZVxuICB9IGVsc2UgaWYgKG9sZE5vZGUudHlwZSA9PT0gJ3JhbmdlJykge1xuICAgIC8vIHRoaXMgaXMgc28gZWxlbWVudHMgbGlrZSBzbGlkZXIgbW92ZSB0aGVpciBVSSB0aGluZ3lcbiAgICBvbGROb2RlLnZhbHVlID0gbmV3VmFsdWVcbiAgfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVUZXh0YXJlYSAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICB2YXIgbmV3VmFsdWUgPSBuZXdOb2RlLnZhbHVlXG4gIGlmIChuZXdWYWx1ZSAhPT0gb2xkTm9kZS52YWx1ZSkge1xuICAgIG9sZE5vZGUudmFsdWUgPSBuZXdWYWx1ZVxuICB9XG5cbiAgaWYgKG9sZE5vZGUuZmlyc3RDaGlsZCkge1xuICAgIC8vIE5lZWRlZCBmb3IgSUUuIEFwcGFyZW50bHkgSUUgc2V0cyB0aGUgcGxhY2Vob2xkZXIgYXMgdGhlXG4gICAgLy8gbm9kZSB2YWx1ZSBhbmQgdmlzZSB2ZXJzYS4gVGhpcyBpZ25vcmVzIGFuIGVtcHR5IHVwZGF0ZS5cbiAgICBpZiAobmV3VmFsdWUgPT09ICcnICYmIG9sZE5vZGUuZmlyc3RDaGlsZC5ub2RlVmFsdWUgPT09IG9sZE5vZGUucGxhY2Vob2xkZXIpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIG9sZE5vZGUuZmlyc3RDaGlsZC5ub2RlVmFsdWUgPSBuZXdWYWx1ZVxuICB9XG59XG5cbmZ1bmN0aW9uIHVwZGF0ZVNlbGVjdCAobmV3Tm9kZSwgb2xkTm9kZSkge1xuICBpZiAoIW9sZE5vZGUuaGFzQXR0cmlidXRlTlMobnVsbCwgJ211bHRpcGxlJykpIHtcbiAgICB2YXIgaSA9IDBcbiAgICB2YXIgY3VyQ2hpbGQgPSBvbGROb2RlLmZpcnN0Q2hpbGRcbiAgICB3aGlsZSAoY3VyQ2hpbGQpIHtcbiAgICAgIHZhciBub2RlTmFtZSA9IGN1ckNoaWxkLm5vZGVOYW1lXG4gICAgICBpZiAobm9kZU5hbWUgJiYgbm9kZU5hbWUudG9VcHBlckNhc2UoKSA9PT0gJ09QVElPTicpIHtcbiAgICAgICAgaWYgKGN1ckNoaWxkLmhhc0F0dHJpYnV0ZU5TKG51bGwsICdzZWxlY3RlZCcpKSBicmVha1xuICAgICAgICBpKytcbiAgICAgIH1cbiAgICAgIGN1ckNoaWxkID0gY3VyQ2hpbGQubmV4dFNpYmxpbmdcbiAgICB9XG5cbiAgICBuZXdOb2RlLnNlbGVjdGVkSW5kZXggPSBpXG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlQXR0cmlidXRlIChuZXdOb2RlLCBvbGROb2RlLCBuYW1lKSB7XG4gIGlmIChuZXdOb2RlW25hbWVdICE9PSBvbGROb2RlW25hbWVdKSB7XG4gICAgb2xkTm9kZVtuYW1lXSA9IG5ld05vZGVbbmFtZV1cbiAgICBpZiAobmV3Tm9kZVtuYW1lXSkge1xuICAgICAgb2xkTm9kZS5zZXRBdHRyaWJ1dGUobmFtZSwgJycpXG4gICAgfSBlbHNlIHtcbiAgICAgIG9sZE5vZGUucmVtb3ZlQXR0cmlidXRlKG5hbWUsICcnKVxuICAgIH1cbiAgfVxufVxuIiwidmFyIG5hbm9tb3JwaCA9IHJlcXVpcmUoJ25hbm9tb3JwaCcpXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBuYW5vbW91bnRcblxuZnVuY3Rpb24gbmFub21vdW50ICh0YXJnZXQsIG5ld1RyZWUpIHtcbiAgaWYgKHRhcmdldC5ub2RlTmFtZSA9PT0gJ0JPRFknKSB7XG4gICAgdmFyIGNoaWxkcmVuID0gdGFyZ2V0LmNoaWxkTm9kZXNcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoY2hpbGRyZW5baV0ubm9kZU5hbWUgPT09ICdTQ1JJUFQnKSB7XG4gICAgICAgIG5ld1RyZWUuYXBwZW5kQ2hpbGQoY2hpbGRyZW5baV0uY2xvbmVOb2RlKHRydWUpKVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHZhciB0cmVlID0gbmFub21vcnBoKHRhcmdldCwgbmV3VHJlZSlcbiAgYXNzZXJ0LmVxdWFsKHRyZWUsIHRhcmdldCwgJ25hbm9tb3VudDogVGhlIHRhcmdldCBub2RlICcgK1xuICAgIHRyZWUub3V0ZXJIVE1MLm5vZGVOYW1lICsgJyBpcyBub3QgdGhlIHNhbWUgdHlwZSBhcyB0aGUgbmV3IG5vZGUgJyArXG4gICAgdGFyZ2V0Lm91dGVySFRNTC5ub2RlTmFtZSArICcuJylcbn1cbiIsIid1c2Ugc3RyaWN0J1xuXG52YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBuYW5vcmFmXG5cbi8vIE9ubHkgY2FsbCBSQUYgd2hlbiBuZWVkZWRcbi8vIChmbiwgZm4/KSAtPiBmblxuZnVuY3Rpb24gbmFub3JhZiAocmVuZGVyLCByYWYpIHtcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiByZW5kZXIsICdmdW5jdGlvbicsICduYW5vcmFmOiByZW5kZXIgc2hvdWxkIGJlIGEgZnVuY3Rpb24nKVxuICBhc3NlcnQub2sodHlwZW9mIHJhZiA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2YgcmFmID09PSAndW5kZWZpbmVkJywgJ25hbm9yYWY6IHJhZiBzaG91bGQgYmUgYSBmdW5jdGlvbiBvciB1bmRlZmluZWQnKVxuXG4gIGlmICghcmFmKSByYWYgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHZhciByZWRyYXdTY2hlZHVsZWQgPSBmYWxzZVxuICB2YXIgYXJncyA9IG51bGxcblxuICByZXR1cm4gZnVuY3Rpb24gZnJhbWUgKCkge1xuICAgIGlmIChhcmdzID09PSBudWxsICYmICFyZWRyYXdTY2hlZHVsZWQpIHtcbiAgICAgIHJlZHJhd1NjaGVkdWxlZCA9IHRydWVcblxuICAgICAgcmFmKGZ1bmN0aW9uIHJlZHJhdyAoKSB7XG4gICAgICAgIHJlZHJhd1NjaGVkdWxlZCA9IGZhbHNlXG5cbiAgICAgICAgdmFyIGxlbmd0aCA9IGFyZ3MubGVuZ3RoXG4gICAgICAgIHZhciBfYXJncyA9IG5ldyBBcnJheShsZW5ndGgpXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIF9hcmdzW2ldID0gYXJnc1tpXVxuXG4gICAgICAgIHJlbmRlci5hcHBseShyZW5kZXIsIF9hcmdzKVxuICAgICAgICBhcmdzID0gbnVsbFxuICAgICAgfSlcbiAgICB9XG5cbiAgICBhcmdzID0gYXJndW1lbnRzXG4gIH1cbn1cbiIsInZhciB3YXlmYXJlciA9IHJlcXVpcmUoJ3dheWZhcmVyJylcblxudmFyIGlzTG9jYWxGaWxlID0gKC9maWxlOlxcL1xcLy8udGVzdCh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JyAmJlxuICB3aW5kb3cubG9jYXRpb24gJiYgd2luZG93LmxvY2F0aW9uLm9yaWdpbikpIC8vIGVsZWN0cm9uIHN1cHBvcnRcblxuLyogZXNsaW50LWRpc2FibGUgbm8tdXNlbGVzcy1lc2NhcGUgKi9cbnZhciBlbGVjdHJvbiA9ICdeKGZpbGU6XFwvXFwvfFxcLykoLipcXC5odG1sP1xcLz8pPydcbnZhciBwcm90b2NvbCA9ICdeKGh0dHAocyk/KDpcXC9cXC8pKT8od3d3XFwuKT8nXG52YXIgZG9tYWluID0gJ1thLXpBLVowLTktX1xcLl0rKDpbMC05XXsxLDV9KT8oXFwvezF9KT8nXG52YXIgcXMgPSAnW1xcP10uKiQnXG4vKiBlc2xpbnQtZW5hYmxlIG5vLXVzZWxlc3MtZXNjYXBlICovXG5cbnZhciBzdHJpcEVsZWN0cm9uID0gbmV3IFJlZ0V4cChlbGVjdHJvbilcbnZhciBwcmVmaXggPSBuZXcgUmVnRXhwKHByb3RvY29sICsgZG9tYWluKVxudmFyIG5vcm1hbGl6ZSA9IG5ldyBSZWdFeHAoJyMnKVxudmFyIHN1ZmZpeCA9IG5ldyBSZWdFeHAocXMpXG5cbm1vZHVsZS5leHBvcnRzID0gTmFub3JvdXRlclxuXG5mdW5jdGlvbiBOYW5vcm91dGVyIChvcHRzKSB7XG4gIG9wdHMgPSBvcHRzIHx8IHt9XG5cbiAgdmFyIHJvdXRlciA9IHdheWZhcmVyKG9wdHMuZGVmYXVsdCB8fCAnLzQwNCcpXG4gIHZhciBjdXJyeSA9IG9wdHMuY3VycnkgfHwgZmFsc2VcbiAgdmFyIHByZXZDYWxsYmFjayA9IG51bGxcbiAgdmFyIHByZXZSb3V0ZSA9IG51bGxcblxuICBlbWl0LnJvdXRlciA9IHJvdXRlclxuICBlbWl0Lm9uID0gb25cbiAgcmV0dXJuIGVtaXRcblxuICBmdW5jdGlvbiBvbiAocm91dGVuYW1lLCBsaXN0ZW5lcikge1xuICAgIHJvdXRlbmFtZSA9IHJvdXRlbmFtZS5yZXBsYWNlKC9eWyMvXS8sICcnKVxuICAgIHJvdXRlci5vbihyb3V0ZW5hbWUsIGxpc3RlbmVyKVxuICB9XG5cbiAgZnVuY3Rpb24gZW1pdCAocm91dGUpIHtcbiAgICBpZiAoIWN1cnJ5KSB7XG4gICAgICByZXR1cm4gcm91dGVyKHJvdXRlKVxuICAgIH0gZWxzZSB7XG4gICAgICByb3V0ZSA9IHBhdGhuYW1lKHJvdXRlLCBpc0xvY2FsRmlsZSlcbiAgICAgIGlmIChyb3V0ZSA9PT0gcHJldlJvdXRlKSB7XG4gICAgICAgIHJldHVybiBwcmV2Q2FsbGJhY2soKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJldlJvdXRlID0gcm91dGVcbiAgICAgICAgcHJldkNhbGxiYWNrID0gcm91dGVyKHJvdXRlKVxuICAgICAgICByZXR1cm4gcHJldkNhbGxiYWNrKClcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLy8gcmVwbGFjZSBldmVyeXRoaW5nIGluIGEgcm91dGUgYnV0IHRoZSBwYXRobmFtZSBhbmQgaGFzaFxuZnVuY3Rpb24gcGF0aG5hbWUgKHJvdXRlLCBpc0VsZWN0cm9uKSB7XG4gIGlmIChpc0VsZWN0cm9uKSByb3V0ZSA9IHJvdXRlLnJlcGxhY2Uoc3RyaXBFbGVjdHJvbiwgJycpXG4gIGVsc2Ugcm91dGUgPSByb3V0ZS5yZXBsYWNlKHByZWZpeCwgJycpXG4gIHJldHVybiByb3V0ZS5yZXBsYWNlKHN1ZmZpeCwgJycpLnJlcGxhY2Uobm9ybWFsaXplLCAnLycpXG59XG4iLCJ2YXIgYXNzZXJ0ID0gcmVxdWlyZSgnYXNzZXJ0JylcblxubW9kdWxlLmV4cG9ydHMgPSBOYW5vdGltaW5nXG5cbmZ1bmN0aW9uIE5hbm90aW1pbmcgKG5hbWUpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIE5hbm90aW1pbmcpKSByZXR1cm4gbmV3IE5hbm90aW1pbmcobmFtZSlcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiBuYW1lLCAnc3RyaW5nJywgJ05hbm90aW1pbmc6IG5hbWUgc2hvdWxkIGJlIHR5cGUgc3RyaW5nJylcbiAgdGhpcy5fbmFtZSA9IG5hbWVcbiAgdGhpcy5fZW5hYmxlZCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gICAgd2luZG93LnBlcmZvcm1hbmNlICYmIHdpbmRvdy5wZXJmb3JtYW5jZS5tYXJrXG59XG5cbk5hbm90aW1pbmcucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKHBhcnRpYWwpIHtcbiAgaWYgKCF0aGlzLl9lbmFibGVkKSByZXR1cm5cbiAgdmFyIG5hbWUgPSBwYXJ0aWFsID8gdGhpcy5fbmFtZSArICc6JyArIHBhcnRpYWwgOiB0aGlzLl9uYW1lXG4gIHdpbmRvdy5wZXJmb3JtYW5jZS5tYXJrKG5hbWUgKyAnLXN0YXJ0Jylcbn1cblxuTmFub3RpbWluZy5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24gKHBhcnRpYWwpIHtcbiAgaWYgKCF0aGlzLl9lbmFibGVkKSByZXR1cm5cbiAgdmFyIG5hbWUgPSBwYXJ0aWFsID8gdGhpcy5fbmFtZSArICc6JyArIHBhcnRpYWwgOiB0aGlzLl9uYW1lXG4gIHdpbmRvdy5wZXJmb3JtYW5jZS5tYXJrKG5hbWUgKyAnLWVuZCcpXG4gIHdpbmRvdy5wZXJmb3JtYW5jZS5tZWFzdXJlKG5hbWUsIG5hbWUgKyAnLXN0YXJ0JywgbmFtZSArICctZW5kJylcbn1cbiIsIi8qIGdsb2JhbCBNdXRhdGlvbk9ic2VydmVyICovXG52YXIgZG9jdW1lbnQgPSByZXF1aXJlKCdnbG9iYWwvZG9jdW1lbnQnKVxudmFyIHdpbmRvdyA9IHJlcXVpcmUoJ2dsb2JhbC93aW5kb3cnKVxudmFyIHdhdGNoID0gT2JqZWN0LmNyZWF0ZShudWxsKVxudmFyIEtFWV9JRCA9ICdvbmxvYWRpZCcgKyAobmV3IERhdGUoKSAlIDllNikudG9TdHJpbmcoMzYpXG52YXIgS0VZX0FUVFIgPSAnZGF0YS0nICsgS0VZX0lEXG52YXIgSU5ERVggPSAwXG5cbmlmICh3aW5kb3cgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKG11dGF0aW9ucykge1xuICAgIGlmIChPYmplY3Qua2V5cyh3YXRjaCkubGVuZ3RoIDwgMSkgcmV0dXJuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtdXRhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChtdXRhdGlvbnNbaV0uYXR0cmlidXRlTmFtZSA9PT0gS0VZX0FUVFIpIHtcbiAgICAgICAgZWFjaEF0dHIobXV0YXRpb25zW2ldLCB0dXJub24sIHR1cm5vZmYpXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICB9XG4gICAgICBlYWNoTXV0YXRpb24obXV0YXRpb25zW2ldLnJlbW92ZWROb2RlcywgdHVybm9mZilcbiAgICAgIGVhY2hNdXRhdGlvbihtdXRhdGlvbnNbaV0uYWRkZWROb2RlcywgdHVybm9uKVxuICAgIH1cbiAgfSlcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7XG4gICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgIHN1YnRyZWU6IHRydWUsXG4gICAgYXR0cmlidXRlczogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVPbGRWYWx1ZTogdHJ1ZSxcbiAgICBhdHRyaWJ1dGVGaWx0ZXI6IFtLRVlfQVRUUl1cbiAgfSlcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBvbmxvYWQgKGVsLCBvbiwgb2ZmLCBjYWxsZXIpIHtcbiAgb24gPSBvbiB8fCBmdW5jdGlvbiAoKSB7fVxuICBvZmYgPSBvZmYgfHwgZnVuY3Rpb24gKCkge31cbiAgZWwuc2V0QXR0cmlidXRlKEtFWV9BVFRSLCAnbycgKyBJTkRFWClcbiAgd2F0Y2hbJ28nICsgSU5ERVhdID0gW29uLCBvZmYsIDAsIGNhbGxlciB8fCBvbmxvYWQuY2FsbGVyXVxuICBJTkRFWCArPSAxXG4gIHJldHVybiBlbFxufVxuXG5mdW5jdGlvbiB0dXJub24gKGluZGV4LCBlbCkge1xuICBpZiAod2F0Y2hbaW5kZXhdWzBdICYmIHdhdGNoW2luZGV4XVsyXSA9PT0gMCkge1xuICAgIHdhdGNoW2luZGV4XVswXShlbClcbiAgICB3YXRjaFtpbmRleF1bMl0gPSAxXG4gIH1cbn1cblxuZnVuY3Rpb24gdHVybm9mZiAoaW5kZXgsIGVsKSB7XG4gIGlmICh3YXRjaFtpbmRleF1bMV0gJiYgd2F0Y2hbaW5kZXhdWzJdID09PSAxKSB7XG4gICAgd2F0Y2hbaW5kZXhdWzFdKGVsKVxuICAgIHdhdGNoW2luZGV4XVsyXSA9IDBcbiAgfVxufVxuXG5mdW5jdGlvbiBlYWNoQXR0ciAobXV0YXRpb24sIG9uLCBvZmYpIHtcbiAgdmFyIG5ld1ZhbHVlID0gbXV0YXRpb24udGFyZ2V0LmdldEF0dHJpYnV0ZShLRVlfQVRUUilcbiAgaWYgKHNhbWVPcmlnaW4obXV0YXRpb24ub2xkVmFsdWUsIG5ld1ZhbHVlKSkge1xuICAgIHdhdGNoW25ld1ZhbHVlXSA9IHdhdGNoW211dGF0aW9uLm9sZFZhbHVlXVxuICAgIHJldHVyblxuICB9XG4gIGlmICh3YXRjaFttdXRhdGlvbi5vbGRWYWx1ZV0pIHtcbiAgICBvZmYobXV0YXRpb24ub2xkVmFsdWUsIG11dGF0aW9uLnRhcmdldClcbiAgfVxuICBpZiAod2F0Y2hbbmV3VmFsdWVdKSB7XG4gICAgb24obmV3VmFsdWUsIG11dGF0aW9uLnRhcmdldClcbiAgfVxufVxuXG5mdW5jdGlvbiBzYW1lT3JpZ2luIChvbGRWYWx1ZSwgbmV3VmFsdWUpIHtcbiAgaWYgKCFvbGRWYWx1ZSB8fCAhbmV3VmFsdWUpIHJldHVybiBmYWxzZVxuICByZXR1cm4gd2F0Y2hbb2xkVmFsdWVdWzNdID09PSB3YXRjaFtuZXdWYWx1ZV1bM11cbn1cblxuZnVuY3Rpb24gZWFjaE11dGF0aW9uIChub2RlcywgZm4pIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh3YXRjaClcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBub2Rlcy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChub2Rlc1tpXSAmJiBub2Rlc1tpXS5nZXRBdHRyaWJ1dGUgJiYgbm9kZXNbaV0uZ2V0QXR0cmlidXRlKEtFWV9BVFRSKSkge1xuICAgICAgdmFyIG9ubG9hZGlkID0gbm9kZXNbaV0uZ2V0QXR0cmlidXRlKEtFWV9BVFRSKVxuICAgICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgIGlmIChvbmxvYWRpZCA9PT0gaykge1xuICAgICAgICAgIGZuKGssIG5vZGVzW2ldKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICBpZiAobm9kZXNbaV0uY2hpbGROb2Rlcy5sZW5ndGggPiAwKSB7XG4gICAgICBlYWNoTXV0YXRpb24obm9kZXNbaV0uY2hpbGROb2RlcywgZm4pXG4gICAgfVxuICB9XG59XG4iLCIvKiEgaHR0cDovL210aHMuYmUvcmVwZWF0IHYwLjIuMCBieSBAbWF0aGlhcyAqL1xuaWYgKCFTdHJpbmcucHJvdG90eXBlLnJlcGVhdCkge1xuXHQoZnVuY3Rpb24oKSB7XG5cdFx0J3VzZSBzdHJpY3QnOyAvLyBuZWVkZWQgdG8gc3VwcG9ydCBgYXBwbHlgL2BjYWxsYCB3aXRoIGB1bmRlZmluZWRgL2BudWxsYFxuXHRcdHZhciBkZWZpbmVQcm9wZXJ0eSA9IChmdW5jdGlvbigpIHtcblx0XHRcdC8vIElFIDggb25seSBzdXBwb3J0cyBgT2JqZWN0LmRlZmluZVByb3BlcnR5YCBvbiBET00gZWxlbWVudHNcblx0XHRcdHRyeSB7XG5cdFx0XHRcdHZhciBvYmplY3QgPSB7fTtcblx0XHRcdFx0dmFyICRkZWZpbmVQcm9wZXJ0eSA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcblx0XHRcdFx0dmFyIHJlc3VsdCA9ICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG9iamVjdCwgb2JqZWN0KSAmJiAkZGVmaW5lUHJvcGVydHk7XG5cdFx0XHR9IGNhdGNoKGVycm9yKSB7fVxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9KCkpO1xuXHRcdHZhciByZXBlYXQgPSBmdW5jdGlvbihjb3VudCkge1xuXHRcdFx0aWYgKHRoaXMgPT0gbnVsbCkge1xuXHRcdFx0XHR0aHJvdyBUeXBlRXJyb3IoKTtcblx0XHRcdH1cblx0XHRcdHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG5cdFx0XHQvLyBgVG9JbnRlZ2VyYFxuXHRcdFx0dmFyIG4gPSBjb3VudCA/IE51bWJlcihjb3VudCkgOiAwO1xuXHRcdFx0aWYgKG4gIT0gbikgeyAvLyBiZXR0ZXIgYGlzTmFOYFxuXHRcdFx0XHRuID0gMDtcblx0XHRcdH1cblx0XHRcdC8vIEFjY291bnQgZm9yIG91dC1vZi1ib3VuZHMgaW5kaWNlc1xuXHRcdFx0aWYgKG4gPCAwIHx8IG4gPT0gSW5maW5pdHkpIHtcblx0XHRcdFx0dGhyb3cgUmFuZ2VFcnJvcigpO1xuXHRcdFx0fVxuXHRcdFx0dmFyIHJlc3VsdCA9ICcnO1xuXHRcdFx0d2hpbGUgKG4pIHtcblx0XHRcdFx0aWYgKG4gJSAyID09IDEpIHtcblx0XHRcdFx0XHRyZXN1bHQgKz0gc3RyaW5nO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmIChuID4gMSkge1xuXHRcdFx0XHRcdHN0cmluZyArPSBzdHJpbmc7XG5cdFx0XHRcdH1cblx0XHRcdFx0biA+Pj0gMTtcblx0XHRcdH1cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fTtcblx0XHRpZiAoZGVmaW5lUHJvcGVydHkpIHtcblx0XHRcdGRlZmluZVByb3BlcnR5KFN0cmluZy5wcm90b3R5cGUsICdyZXBlYXQnLCB7XG5cdFx0XHRcdCd2YWx1ZSc6IHJlcGVhdCxcblx0XHRcdFx0J2NvbmZpZ3VyYWJsZSc6IHRydWUsXG5cdFx0XHRcdCd3cml0YWJsZSc6IHRydWVcblx0XHRcdH0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRTdHJpbmcucHJvdG90eXBlLnJlcGVhdCA9IHJlcGVhdDtcblx0XHR9XG5cdH0oKSk7XG59XG4iLCIvKipcbiAqIENvbnZlcnQgYXJyYXkgb2YgMTYgYnl0ZSB2YWx1ZXMgdG8gVVVJRCBzdHJpbmcgZm9ybWF0IG9mIHRoZSBmb3JtOlxuICogWFhYWFhYWFgtWFhYWC1YWFhYLVhYWFgtWFhYWFhYWFhYWFhYXG4gKi9cbnZhciBieXRlVG9IZXggPSBbXTtcbmZvciAodmFyIGkgPSAwOyBpIDwgMjU2OyArK2kpIHtcbiAgYnl0ZVRvSGV4W2ldID0gKGkgKyAweDEwMCkudG9TdHJpbmcoMTYpLnN1YnN0cigxKTtcbn1cblxuZnVuY3Rpb24gYnl0ZXNUb1V1aWQoYnVmLCBvZmZzZXQpIHtcbiAgdmFyIGkgPSBvZmZzZXQgfHwgMDtcbiAgdmFyIGJ0aCA9IGJ5dGVUb0hleDtcbiAgcmV0dXJuIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gKyAnLScgK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICsgJy0nICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXSArICctJyArXG4gICAgICAgICAgYnRoW2J1ZltpKytdXSArIGJ0aFtidWZbaSsrXV0gK1xuICAgICAgICAgIGJ0aFtidWZbaSsrXV0gKyBidGhbYnVmW2krK11dICtcbiAgICAgICAgICBidGhbYnVmW2krK11dICsgYnRoW2J1ZltpKytdXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBieXRlc1RvVXVpZDtcbiIsIi8vIFVuaXF1ZSBJRCBjcmVhdGlvbiByZXF1aXJlcyBhIGhpZ2ggcXVhbGl0eSByYW5kb20gIyBnZW5lcmF0b3IuICBJbiB0aGVcbi8vIGJyb3dzZXIgdGhpcyBpcyBhIGxpdHRsZSBjb21wbGljYXRlZCBkdWUgdG8gdW5rbm93biBxdWFsaXR5IG9mIE1hdGgucmFuZG9tKClcbi8vIGFuZCBpbmNvbnNpc3RlbnQgc3VwcG9ydCBmb3IgdGhlIGBjcnlwdG9gIEFQSS4gIFdlIGRvIHRoZSBiZXN0IHdlIGNhbiB2aWFcbi8vIGZlYXR1cmUtZGV0ZWN0aW9uXG52YXIgcm5nO1xuXG52YXIgY3J5cHRvID0gZ2xvYmFsLmNyeXB0byB8fCBnbG9iYWwubXNDcnlwdG87IC8vIGZvciBJRSAxMVxuaWYgKGNyeXB0byAmJiBjcnlwdG8uZ2V0UmFuZG9tVmFsdWVzKSB7XG4gIC8vIFdIQVRXRyBjcnlwdG8gUk5HIC0gaHR0cDovL3dpa2kud2hhdHdnLm9yZy93aWtpL0NyeXB0b1xuICB2YXIgcm5kczggPSBuZXcgVWludDhBcnJheSgxNik7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tdW5kZWZcbiAgcm5nID0gZnVuY3Rpb24gd2hhdHdnUk5HKCkge1xuICAgIGNyeXB0by5nZXRSYW5kb21WYWx1ZXMocm5kczgpO1xuICAgIHJldHVybiBybmRzODtcbiAgfTtcbn1cblxuaWYgKCFybmcpIHtcbiAgLy8gTWF0aC5yYW5kb20oKS1iYXNlZCAoUk5HKVxuICAvL1xuICAvLyBJZiBhbGwgZWxzZSBmYWlscywgdXNlIE1hdGgucmFuZG9tKCkuICBJdCdzIGZhc3QsIGJ1dCBpcyBvZiB1bnNwZWNpZmllZFxuICAvLyBxdWFsaXR5LlxuICB2YXIgcm5kcyA9IG5ldyBBcnJheSgxNik7XG4gIHJuZyA9IGZ1bmN0aW9uKCkge1xuICAgIGZvciAodmFyIGkgPSAwLCByOyBpIDwgMTY7IGkrKykge1xuICAgICAgaWYgKChpICYgMHgwMykgPT09IDApIHIgPSBNYXRoLnJhbmRvbSgpICogMHgxMDAwMDAwMDA7XG4gICAgICBybmRzW2ldID0gciA+Pj4gKChpICYgMHgwMykgPDwgMykgJiAweGZmO1xuICAgIH1cblxuICAgIHJldHVybiBybmRzO1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHJuZztcbiIsInZhciBybmcgPSByZXF1aXJlKCcuL2xpYi9ybmcnKTtcbnZhciBieXRlc1RvVXVpZCA9IHJlcXVpcmUoJy4vbGliL2J5dGVzVG9VdWlkJyk7XG5cbi8vICoqYHYxKClgIC0gR2VuZXJhdGUgdGltZS1iYXNlZCBVVUlEKipcbi8vXG4vLyBJbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vTGlvc0svVVVJRC5qc1xuLy8gYW5kIGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS91dWlkLmh0bWxcblxuLy8gcmFuZG9tICMncyB3ZSBuZWVkIHRvIGluaXQgbm9kZSBhbmQgY2xvY2tzZXFcbnZhciBfc2VlZEJ5dGVzID0gcm5nKCk7XG5cbi8vIFBlciA0LjUsIGNyZWF0ZSBhbmQgNDgtYml0IG5vZGUgaWQsICg0NyByYW5kb20gYml0cyArIG11bHRpY2FzdCBiaXQgPSAxKVxudmFyIF9ub2RlSWQgPSBbXG4gIF9zZWVkQnl0ZXNbMF0gfCAweDAxLFxuICBfc2VlZEJ5dGVzWzFdLCBfc2VlZEJ5dGVzWzJdLCBfc2VlZEJ5dGVzWzNdLCBfc2VlZEJ5dGVzWzRdLCBfc2VlZEJ5dGVzWzVdXG5dO1xuXG4vLyBQZXIgNC4yLjIsIHJhbmRvbWl6ZSAoMTQgYml0KSBjbG9ja3NlcVxudmFyIF9jbG9ja3NlcSA9IChfc2VlZEJ5dGVzWzZdIDw8IDggfCBfc2VlZEJ5dGVzWzddKSAmIDB4M2ZmZjtcblxuLy8gUHJldmlvdXMgdXVpZCBjcmVhdGlvbiB0aW1lXG52YXIgX2xhc3RNU2VjcyA9IDAsIF9sYXN0TlNlY3MgPSAwO1xuXG4vLyBTZWUgaHR0cHM6Ly9naXRodWIuY29tL2Jyb29mYS9ub2RlLXV1aWQgZm9yIEFQSSBkZXRhaWxzXG5mdW5jdGlvbiB2MShvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICB2YXIgaSA9IGJ1ZiAmJiBvZmZzZXQgfHwgMDtcbiAgdmFyIGIgPSBidWYgfHwgW107XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgdmFyIGNsb2Nrc2VxID0gb3B0aW9ucy5jbG9ja3NlcSAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5jbG9ja3NlcSA6IF9jbG9ja3NlcTtcblxuICAvLyBVVUlEIHRpbWVzdGFtcHMgYXJlIDEwMCBuYW5vLXNlY29uZCB1bml0cyBzaW5jZSB0aGUgR3JlZ29yaWFuIGVwb2NoLFxuICAvLyAoMTU4Mi0xMC0xNSAwMDowMCkuICBKU051bWJlcnMgYXJlbid0IHByZWNpc2UgZW5vdWdoIGZvciB0aGlzLCBzb1xuICAvLyB0aW1lIGlzIGhhbmRsZWQgaW50ZXJuYWxseSBhcyAnbXNlY3MnIChpbnRlZ2VyIG1pbGxpc2Vjb25kcykgYW5kICduc2VjcydcbiAgLy8gKDEwMC1uYW5vc2Vjb25kcyBvZmZzZXQgZnJvbSBtc2Vjcykgc2luY2UgdW5peCBlcG9jaCwgMTk3MC0wMS0wMSAwMDowMC5cbiAgdmFyIG1zZWNzID0gb3B0aW9ucy5tc2VjcyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5tc2VjcyA6IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4gIC8vIFBlciA0LjIuMS4yLCB1c2UgY291bnQgb2YgdXVpZCdzIGdlbmVyYXRlZCBkdXJpbmcgdGhlIGN1cnJlbnQgY2xvY2tcbiAgLy8gY3ljbGUgdG8gc2ltdWxhdGUgaGlnaGVyIHJlc29sdXRpb24gY2xvY2tcbiAgdmFyIG5zZWNzID0gb3B0aW9ucy5uc2VjcyAhPT0gdW5kZWZpbmVkID8gb3B0aW9ucy5uc2VjcyA6IF9sYXN0TlNlY3MgKyAxO1xuXG4gIC8vIFRpbWUgc2luY2UgbGFzdCB1dWlkIGNyZWF0aW9uIChpbiBtc2VjcylcbiAgdmFyIGR0ID0gKG1zZWNzIC0gX2xhc3RNU2VjcykgKyAobnNlY3MgLSBfbGFzdE5TZWNzKS8xMDAwMDtcblxuICAvLyBQZXIgNC4yLjEuMiwgQnVtcCBjbG9ja3NlcSBvbiBjbG9jayByZWdyZXNzaW9uXG4gIGlmIChkdCA8IDAgJiYgb3B0aW9ucy5jbG9ja3NlcSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY2xvY2tzZXEgPSBjbG9ja3NlcSArIDEgJiAweDNmZmY7XG4gIH1cblxuICAvLyBSZXNldCBuc2VjcyBpZiBjbG9jayByZWdyZXNzZXMgKG5ldyBjbG9ja3NlcSkgb3Igd2UndmUgbW92ZWQgb250byBhIG5ld1xuICAvLyB0aW1lIGludGVydmFsXG4gIGlmICgoZHQgPCAwIHx8IG1zZWNzID4gX2xhc3RNU2VjcykgJiYgb3B0aW9ucy5uc2VjcyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgbnNlY3MgPSAwO1xuICB9XG5cbiAgLy8gUGVyIDQuMi4xLjIgVGhyb3cgZXJyb3IgaWYgdG9vIG1hbnkgdXVpZHMgYXJlIHJlcXVlc3RlZFxuICBpZiAobnNlY3MgPj0gMTAwMDApIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3V1aWQudjEoKTogQ2FuXFwndCBjcmVhdGUgbW9yZSB0aGFuIDEwTSB1dWlkcy9zZWMnKTtcbiAgfVxuXG4gIF9sYXN0TVNlY3MgPSBtc2VjcztcbiAgX2xhc3ROU2VjcyA9IG5zZWNzO1xuICBfY2xvY2tzZXEgPSBjbG9ja3NlcTtcblxuICAvLyBQZXIgNC4xLjQgLSBDb252ZXJ0IGZyb20gdW5peCBlcG9jaCB0byBHcmVnb3JpYW4gZXBvY2hcbiAgbXNlY3MgKz0gMTIyMTkyOTI4MDAwMDA7XG5cbiAgLy8gYHRpbWVfbG93YFxuICB2YXIgdGwgPSAoKG1zZWNzICYgMHhmZmZmZmZmKSAqIDEwMDAwICsgbnNlY3MpICUgMHgxMDAwMDAwMDA7XG4gIGJbaSsrXSA9IHRsID4+PiAyNCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsID4+PiAxNiAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsID4+PiA4ICYgMHhmZjtcbiAgYltpKytdID0gdGwgJiAweGZmO1xuXG4gIC8vIGB0aW1lX21pZGBcbiAgdmFyIHRtaCA9IChtc2VjcyAvIDB4MTAwMDAwMDAwICogMTAwMDApICYgMHhmZmZmZmZmO1xuICBiW2krK10gPSB0bWggPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bWggJiAweGZmO1xuXG4gIC8vIGB0aW1lX2hpZ2hfYW5kX3ZlcnNpb25gXG4gIGJbaSsrXSA9IHRtaCA+Pj4gMjQgJiAweGYgfCAweDEwOyAvLyBpbmNsdWRlIHZlcnNpb25cbiAgYltpKytdID0gdG1oID4+PiAxNiAmIDB4ZmY7XG5cbiAgLy8gYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgIChQZXIgNC4yLjIgLSBpbmNsdWRlIHZhcmlhbnQpXG4gIGJbaSsrXSA9IGNsb2Nrc2VxID4+PiA4IHwgMHg4MDtcblxuICAvLyBgY2xvY2tfc2VxX2xvd2BcbiAgYltpKytdID0gY2xvY2tzZXEgJiAweGZmO1xuXG4gIC8vIGBub2RlYFxuICB2YXIgbm9kZSA9IG9wdGlvbnMubm9kZSB8fCBfbm9kZUlkO1xuICBmb3IgKHZhciBuID0gMDsgbiA8IDY7ICsrbikge1xuICAgIGJbaSArIG5dID0gbm9kZVtuXTtcbiAgfVxuXG4gIHJldHVybiBidWYgPyBidWYgOiBieXRlc1RvVXVpZChiKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB2MTtcbiIsInZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxudmFyIHRyaWUgPSByZXF1aXJlKCcuL3RyaWUnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdheWZhcmVyXG5cbi8vIGNyZWF0ZSBhIHJvdXRlclxuLy8gc3RyIC0+IG9ialxuZnVuY3Rpb24gV2F5ZmFyZXIgKGRmdCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgV2F5ZmFyZXIpKSByZXR1cm4gbmV3IFdheWZhcmVyKGRmdClcblxuICB2YXIgX2RlZmF1bHQgPSAoZGZ0IHx8ICcnKS5yZXBsYWNlKC9eXFwvLywgJycpXG4gIHZhciBfdHJpZSA9IHRyaWUoKVxuXG4gIGVtaXQuX3RyaWUgPSBfdHJpZVxuICBlbWl0LmVtaXQgPSBlbWl0XG4gIGVtaXQub24gPSBvblxuICBlbWl0Ll93YXlmYXJlciA9IHRydWVcblxuICByZXR1cm4gZW1pdFxuXG4gIC8vIGRlZmluZSBhIHJvdXRlXG4gIC8vIChzdHIsIGZuKSAtPiBvYmpcbiAgZnVuY3Rpb24gb24gKHJvdXRlLCBjYikge1xuICAgIGFzc2VydC5lcXVhbCh0eXBlb2Ygcm91dGUsICdzdHJpbmcnKVxuICAgIGFzc2VydC5lcXVhbCh0eXBlb2YgY2IsICdmdW5jdGlvbicpXG5cbiAgICByb3V0ZSA9IHJvdXRlIHx8ICcvJ1xuICAgIGNiLnJvdXRlID0gcm91dGVcblxuICAgIGlmIChjYiAmJiBjYi5fd2F5ZmFyZXIgJiYgY2IuX3RyaWUpIHtcbiAgICAgIF90cmllLm1vdW50KHJvdXRlLCBjYi5fdHJpZS50cmllKVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbm9kZSA9IF90cmllLmNyZWF0ZShyb3V0ZSlcbiAgICAgIG5vZGUuY2IgPSBjYlxuICAgIH1cblxuICAgIHJldHVybiBlbWl0XG4gIH1cblxuICAvLyBtYXRjaCBhbmQgY2FsbCBhIHJvdXRlXG4gIC8vIChzdHIsIG9iaj8pIC0+IG51bGxcbiAgZnVuY3Rpb24gZW1pdCAocm91dGUpIHtcbiAgICBhc3NlcnQubm90RXF1YWwocm91dGUsIHVuZGVmaW5lZCwgXCIncm91dGUnIG11c3QgYmUgZGVmaW5lZFwiKVxuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGgpXG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldXG4gICAgfVxuXG4gICAgdmFyIG5vZGUgPSBfdHJpZS5tYXRjaChyb3V0ZSlcbiAgICBpZiAobm9kZSAmJiBub2RlLmNiKSB7XG4gICAgICBhcmdzWzBdID0gbm9kZS5wYXJhbXNcbiAgICAgIHZhciBjYiA9IG5vZGUuY2JcbiAgICAgIHJldHVybiBjYi5hcHBseShjYiwgYXJncylcbiAgICB9XG5cbiAgICB2YXIgZGZ0ID0gX3RyaWUubWF0Y2goX2RlZmF1bHQpXG4gICAgaWYgKGRmdCAmJiBkZnQuY2IpIHtcbiAgICAgIGFyZ3NbMF0gPSBkZnQucGFyYW1zXG4gICAgICB2YXIgZGZ0Y2IgPSBkZnQuY2JcbiAgICAgIHJldHVybiBkZnRjYi5hcHBseShkZnRjYiwgYXJncylcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJyb3V0ZSAnXCIgKyByb3V0ZSArIFwiJyBkaWQgbm90IG1hdGNoXCIpXG4gIH1cbn1cbiIsInZhciBtdXRhdGUgPSByZXF1aXJlKCd4dGVuZC9tdXRhYmxlJylcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKVxudmFyIHh0ZW5kID0gcmVxdWlyZSgneHRlbmQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRyaWVcblxuLy8gY3JlYXRlIGEgbmV3IHRyaWVcbi8vIG51bGwgLT4gb2JqXG5mdW5jdGlvbiBUcmllICgpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFRyaWUpKSByZXR1cm4gbmV3IFRyaWUoKVxuICB0aGlzLnRyaWUgPSB7IG5vZGVzOiB7fSB9XG59XG5cbi8vIGNyZWF0ZSBhIG5vZGUgb24gdGhlIHRyaWUgYXQgcm91dGVcbi8vIGFuZCByZXR1cm4gYSBub2RlXG4vLyBzdHIgLT4gbnVsbFxuVHJpZS5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24gKHJvdXRlKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2Ygcm91dGUsICdzdHJpbmcnLCAncm91dGUgc2hvdWxkIGJlIGEgc3RyaW5nJylcbiAgLy8gc3RyaXAgbGVhZGluZyAnLycgYW5kIHNwbGl0IHJvdXRlc1xuICB2YXIgcm91dGVzID0gcm91dGUucmVwbGFjZSgvXlxcLy8sICcnKS5zcGxpdCgnLycpXG5cbiAgZnVuY3Rpb24gY3JlYXRlTm9kZSAoaW5kZXgsIHRyaWUpIHtcbiAgICB2YXIgdGhpc1JvdXRlID0gKHJvdXRlcy5oYXNPd25Qcm9wZXJ0eShpbmRleCkgJiYgcm91dGVzW2luZGV4XSlcbiAgICBpZiAodGhpc1JvdXRlID09PSBmYWxzZSkgcmV0dXJuIHRyaWVcblxuICAgIHZhciBub2RlID0gbnVsbFxuICAgIGlmICgvXjp8XlxcKi8udGVzdCh0aGlzUm91dGUpKSB7XG4gICAgICAvLyBpZiBub2RlIGlzIGEgbmFtZSBtYXRjaCwgc2V0IG5hbWUgYW5kIGFwcGVuZCB0byAnOicgbm9kZVxuICAgICAgaWYgKCF0cmllLm5vZGVzLmhhc093blByb3BlcnR5KCckJCcpKSB7XG4gICAgICAgIG5vZGUgPSB7IG5vZGVzOiB7fSB9XG4gICAgICAgIHRyaWUubm9kZXNbJyQkJ10gPSBub2RlXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBub2RlID0gdHJpZS5ub2Rlc1snJCQnXVxuICAgICAgfVxuXG4gICAgICBpZiAodGhpc1JvdXRlWzBdID09PSAnKicpIHtcbiAgICAgICAgdHJpZS53aWxkY2FyZCA9IHRydWVcbiAgICAgIH1cblxuICAgICAgdHJpZS5uYW1lID0gdGhpc1JvdXRlLnJlcGxhY2UoL146fF5cXCovLCAnJylcbiAgICB9IGVsc2UgaWYgKCF0cmllLm5vZGVzLmhhc093blByb3BlcnR5KHRoaXNSb3V0ZSkpIHtcbiAgICAgIG5vZGUgPSB7IG5vZGVzOiB7fSB9XG4gICAgICB0cmllLm5vZGVzW3RoaXNSb3V0ZV0gPSBub2RlXG4gICAgfSBlbHNlIHtcbiAgICAgIG5vZGUgPSB0cmllLm5vZGVzW3RoaXNSb3V0ZV1cbiAgICB9XG5cbiAgICAvLyB3ZSBtdXN0IHJlY3Vyc2UgZGVlcGVyXG4gICAgcmV0dXJuIGNyZWF0ZU5vZGUoaW5kZXggKyAxLCBub2RlKVxuICB9XG5cbiAgcmV0dXJuIGNyZWF0ZU5vZGUoMCwgdGhpcy50cmllKVxufVxuXG4vLyBtYXRjaCBhIHJvdXRlIG9uIHRoZSB0cmllXG4vLyBhbmQgcmV0dXJuIHRoZSBub2RlXG4vLyBzdHIgLT4gb2JqXG5UcmllLnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uIChyb3V0ZSkge1xuICBhc3NlcnQuZXF1YWwodHlwZW9mIHJvdXRlLCAnc3RyaW5nJywgJ3JvdXRlIHNob3VsZCBiZSBhIHN0cmluZycpXG5cbiAgdmFyIHJvdXRlcyA9IHJvdXRlLnJlcGxhY2UoL15cXC8vLCAnJykuc3BsaXQoJy8nKVxuICB2YXIgcGFyYW1zID0ge31cblxuICBmdW5jdGlvbiBzZWFyY2ggKGluZGV4LCB0cmllKSB7XG4gICAgLy8gZWl0aGVyIHRoZXJlJ3Mgbm8gbWF0Y2gsIG9yIHdlJ3JlIGRvbmUgc2VhcmNoaW5nXG4gICAgaWYgKHRyaWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZFxuICAgIHZhciB0aGlzUm91dGUgPSByb3V0ZXNbaW5kZXhdXG4gICAgaWYgKHRoaXNSb3V0ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gdHJpZVxuXG4gICAgaWYgKHRyaWUubm9kZXMuaGFzT3duUHJvcGVydHkodGhpc1JvdXRlKSkge1xuICAgICAgLy8gbWF0Y2ggcmVndWxhciByb3V0ZXMgZmlyc3RcbiAgICAgIHJldHVybiBzZWFyY2goaW5kZXggKyAxLCB0cmllLm5vZGVzW3RoaXNSb3V0ZV0pXG4gICAgfSBlbHNlIGlmICh0cmllLm5hbWUpIHtcbiAgICAgIC8vIG1hdGNoIG5hbWVkIHJvdXRlc1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFyYW1zW3RyaWUubmFtZV0gPSBkZWNvZGVVUklDb21wb25lbnQodGhpc1JvdXRlKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gc2VhcmNoKGluZGV4LCB1bmRlZmluZWQpXG4gICAgICB9XG4gICAgICByZXR1cm4gc2VhcmNoKGluZGV4ICsgMSwgdHJpZS5ub2Rlc1snJCQnXSlcbiAgICB9IGVsc2UgaWYgKHRyaWUud2lsZGNhcmQpIHtcbiAgICAgIC8vIG1hdGNoIHdpbGRjYXJkc1xuICAgICAgdHJ5IHtcbiAgICAgICAgcGFyYW1zWyd3aWxkY2FyZCddID0gZGVjb2RlVVJJQ29tcG9uZW50KHJvdXRlcy5zbGljZShpbmRleCkuam9pbignLycpKVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gc2VhcmNoKGluZGV4LCB1bmRlZmluZWQpXG4gICAgICB9XG4gICAgICAvLyByZXR1cm4gZWFybHksIG9yIGVsc2Ugc2VhcmNoIG1heSBrZWVwIHJlY3Vyc2luZyB0aHJvdWdoIHRoZSB3aWxkY2FyZFxuICAgICAgcmV0dXJuIHRyaWUubm9kZXNbJyQkJ11cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gbm8gbWF0Y2hlcyBmb3VuZFxuICAgICAgcmV0dXJuIHNlYXJjaChpbmRleCArIDEpXG4gICAgfVxuICB9XG5cbiAgdmFyIG5vZGUgPSBzZWFyY2goMCwgdGhpcy50cmllKVxuXG4gIGlmICghbm9kZSkgcmV0dXJuIHVuZGVmaW5lZFxuICBub2RlID0geHRlbmQobm9kZSlcbiAgbm9kZS5wYXJhbXMgPSBwYXJhbXNcbiAgcmV0dXJuIG5vZGVcbn1cblxuLy8gbW91bnQgYSB0cmllIG9udG8gYSBub2RlIGF0IHJvdXRlXG4vLyAoc3RyLCBvYmopIC0+IG51bGxcblRyaWUucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24gKHJvdXRlLCB0cmllKSB7XG4gIGFzc2VydC5lcXVhbCh0eXBlb2Ygcm91dGUsICdzdHJpbmcnLCAncm91dGUgc2hvdWxkIGJlIGEgc3RyaW5nJylcbiAgYXNzZXJ0LmVxdWFsKHR5cGVvZiB0cmllLCAnb2JqZWN0JywgJ3RyaWUgc2hvdWxkIGJlIGEgb2JqZWN0JylcblxuICB2YXIgc3BsaXQgPSByb3V0ZS5yZXBsYWNlKC9eXFwvLywgJycpLnNwbGl0KCcvJylcbiAgdmFyIG5vZGUgPSBudWxsXG4gIHZhciBrZXkgPSBudWxsXG5cbiAgaWYgKHNwbGl0Lmxlbmd0aCA9PT0gMSkge1xuICAgIGtleSA9IHNwbGl0WzBdXG4gICAgbm9kZSA9IHRoaXMuY3JlYXRlKGtleSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgaGVhZEFyciA9IHNwbGl0LnNwbGljZSgwLCBzcGxpdC5sZW5ndGggLSAxKVxuICAgIHZhciBoZWFkID0gaGVhZEFyci5qb2luKCcvJylcbiAgICBrZXkgPSBzcGxpdFswXVxuICAgIG5vZGUgPSB0aGlzLmNyZWF0ZShoZWFkKVxuICB9XG5cbiAgbXV0YXRlKG5vZGUubm9kZXMsIHRyaWUubm9kZXMpXG4gIGlmICh0cmllLm5hbWUpIG5vZGUubmFtZSA9IHRyaWUubmFtZVxuXG4gIC8vIGRlbGVnYXRlIHByb3BlcnRpZXMgZnJvbSAnLycgdG8gdGhlIG5ldyBub2RlXG4gIC8vICcvJyBjYW5ub3QgYmUgcmVhY2hlZCBvbmNlIG1vdW50ZWRcbiAgaWYgKG5vZGUubm9kZXNbJyddKSB7XG4gICAgT2JqZWN0LmtleXMobm9kZS5ub2Rlc1snJ10pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgICAgaWYgKGtleSA9PT0gJ25vZGVzJykgcmV0dXJuXG4gICAgICBub2RlW2tleV0gPSBub2RlLm5vZGVzWycnXVtrZXldXG4gICAgfSlcbiAgICBtdXRhdGUobm9kZS5ub2Rlcywgbm9kZS5ub2Rlc1snJ10ubm9kZXMpXG4gICAgZGVsZXRlIG5vZGUubm9kZXNbJyddLm5vZGVzXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZXh0ZW5kXG5cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbmZ1bmN0aW9uIGV4dGVuZCgpIHtcbiAgICB2YXIgdGFyZ2V0ID0ge31cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV1cblxuICAgICAgICBmb3IgKHZhciBrZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgICBpZiAoaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIGtleSkpIHtcbiAgICAgICAgICAgICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGFyZ2V0XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4dGVuZFxuXG52YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG5mdW5jdGlvbiBleHRlbmQodGFyZ2V0KSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXVxuXG4gICAgICAgIGZvciAodmFyIGtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChoYXNPd25Qcm9wZXJ0eS5jYWxsKHNvdXJjZSwga2V5KSkge1xuICAgICAgICAgICAgICAgIHRhcmdldFtrZXldID0gc291cmNlW2tleV1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0YXJnZXRcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxuLy8gY29tcGFyZSBhbmQgaXNCdWZmZXIgdGFrZW4gZnJvbSBodHRwczovL2dpdGh1Yi5jb20vZmVyb3NzL2J1ZmZlci9ibG9iLzY4MGU5ZTVlNDg4ZjIyYWFjMjc1OTlhNTdkYzg0NGE2MzE1OTI4ZGQvaW5kZXguanNcbi8vIG9yaWdpbmFsIG5vdGljZTpcblxuLyohXG4gKiBUaGUgYnVmZmVyIG1vZHVsZSBmcm9tIG5vZGUuanMsIGZvciB0aGUgYnJvd3Nlci5cbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8ZmVyb3NzQGZlcm9zcy5vcmc+IDxodHRwOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuZnVuY3Rpb24gY29tcGFyZShhLCBiKSB7XG4gIGlmIChhID09PSBiKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICB2YXIgeCA9IGEubGVuZ3RoO1xuICB2YXIgeSA9IGIubGVuZ3RoO1xuXG4gIGZvciAodmFyIGkgPSAwLCBsZW4gPSBNYXRoLm1pbih4LCB5KTsgaSA8IGxlbjsgKytpKSB7XG4gICAgaWYgKGFbaV0gIT09IGJbaV0pIHtcbiAgICAgIHggPSBhW2ldO1xuICAgICAgeSA9IGJbaV07XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICBpZiAoeCA8IHkpIHtcbiAgICByZXR1cm4gLTE7XG4gIH1cbiAgaWYgKHkgPCB4KSB7XG4gICAgcmV0dXJuIDE7XG4gIH1cbiAgcmV0dXJuIDA7XG59XG5mdW5jdGlvbiBpc0J1ZmZlcihiKSB7XG4gIGlmIChnbG9iYWwuQnVmZmVyICYmIHR5cGVvZiBnbG9iYWwuQnVmZmVyLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nKSB7XG4gICAgcmV0dXJuIGdsb2JhbC5CdWZmZXIuaXNCdWZmZXIoYik7XG4gIH1cbiAgcmV0dXJuICEhKGIgIT0gbnVsbCAmJiBiLl9pc0J1ZmZlcik7XG59XG5cbi8vIGJhc2VkIG9uIG5vZGUgYXNzZXJ0LCBvcmlnaW5hbCBub3RpY2U6XG5cbi8vIGh0dHA6Ly93aWtpLmNvbW1vbmpzLm9yZy93aWtpL1VuaXRfVGVzdGluZy8xLjBcbi8vXG4vLyBUSElTIElTIE5PVCBURVNURUQgTk9SIExJS0VMWSBUTyBXT1JLIE9VVFNJREUgVjghXG4vL1xuLy8gT3JpZ2luYWxseSBmcm9tIG5hcndoYWwuanMgKGh0dHA6Ly9uYXJ3aGFsanMub3JnKVxuLy8gQ29weXJpZ2h0IChjKSAyMDA5IFRob21hcyBSb2JpbnNvbiA8Mjgwbm9ydGguY29tPlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHlcbi8vIG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlICdTb2Z0d2FyZScpLCB0b1xuLy8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIHdpdGhvdXQgbGltaXRhdGlvbiB0aGVcbi8vIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vclxuLy8gc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXNcbi8vIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW5cbi8vIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCAnQVMgSVMnLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU5cbi8vIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT05cbi8vIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgdXRpbCA9IHJlcXVpcmUoJ3V0aWwvJyk7XG52YXIgaGFzT3duID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbnZhciBwU2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2U7XG52YXIgZnVuY3Rpb25zSGF2ZU5hbWVzID0gKGZ1bmN0aW9uICgpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGZvbygpIHt9Lm5hbWUgPT09ICdmb28nO1xufSgpKTtcbmZ1bmN0aW9uIHBUb1N0cmluZyAob2JqKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKTtcbn1cbmZ1bmN0aW9uIGlzVmlldyhhcnJidWYpIHtcbiAgaWYgKGlzQnVmZmVyKGFycmJ1ZikpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHR5cGVvZiBnbG9iYWwuQXJyYXlCdWZmZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHR5cGVvZiBBcnJheUJ1ZmZlci5pc1ZpZXcgPT09ICdmdW5jdGlvbicpIHtcbiAgICByZXR1cm4gQXJyYXlCdWZmZXIuaXNWaWV3KGFycmJ1Zik7XG4gIH1cbiAgaWYgKCFhcnJidWYpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGFycmJ1ZiBpbnN0YW5jZW9mIERhdGFWaWV3KSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGFycmJ1Zi5idWZmZXIgJiYgYXJyYnVmLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuLy8gMS4gVGhlIGFzc2VydCBtb2R1bGUgcHJvdmlkZXMgZnVuY3Rpb25zIHRoYXQgdGhyb3dcbi8vIEFzc2VydGlvbkVycm9yJ3Mgd2hlbiBwYXJ0aWN1bGFyIGNvbmRpdGlvbnMgYXJlIG5vdCBtZXQuIFRoZVxuLy8gYXNzZXJ0IG1vZHVsZSBtdXN0IGNvbmZvcm0gdG8gdGhlIGZvbGxvd2luZyBpbnRlcmZhY2UuXG5cbnZhciBhc3NlcnQgPSBtb2R1bGUuZXhwb3J0cyA9IG9rO1xuXG4vLyAyLiBUaGUgQXNzZXJ0aW9uRXJyb3IgaXMgZGVmaW5lZCBpbiBhc3NlcnQuXG4vLyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHsgbWVzc2FnZTogbWVzc2FnZSxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3R1YWw6IGFjdHVhbCxcbi8vICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHBlY3RlZDogZXhwZWN0ZWQgfSlcblxudmFyIHJlZ2V4ID0gL1xccypmdW5jdGlvblxccysoW15cXChcXHNdKilcXHMqLztcbi8vIGJhc2VkIG9uIGh0dHBzOi8vZ2l0aHViLmNvbS9samhhcmIvZnVuY3Rpb24ucHJvdG90eXBlLm5hbWUvYmxvYi9hZGVlZWVjOGJmY2M2MDY4YjE4N2Q3ZDlmYjNkNWJiMWQzYTMwODk5L2ltcGxlbWVudGF0aW9uLmpzXG5mdW5jdGlvbiBnZXROYW1lKGZ1bmMpIHtcbiAgaWYgKCF1dGlsLmlzRnVuY3Rpb24oZnVuYykpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGZ1bmN0aW9uc0hhdmVOYW1lcykge1xuICAgIHJldHVybiBmdW5jLm5hbWU7XG4gIH1cbiAgdmFyIHN0ciA9IGZ1bmMudG9TdHJpbmcoKTtcbiAgdmFyIG1hdGNoID0gc3RyLm1hdGNoKHJlZ2V4KTtcbiAgcmV0dXJuIG1hdGNoICYmIG1hdGNoWzFdO1xufVxuYXNzZXJ0LkFzc2VydGlvbkVycm9yID0gZnVuY3Rpb24gQXNzZXJ0aW9uRXJyb3Iob3B0aW9ucykge1xuICB0aGlzLm5hbWUgPSAnQXNzZXJ0aW9uRXJyb3InO1xuICB0aGlzLmFjdHVhbCA9IG9wdGlvbnMuYWN0dWFsO1xuICB0aGlzLmV4cGVjdGVkID0gb3B0aW9ucy5leHBlY3RlZDtcbiAgdGhpcy5vcGVyYXRvciA9IG9wdGlvbnMub3BlcmF0b3I7XG4gIGlmIChvcHRpb25zLm1lc3NhZ2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSBvcHRpb25zLm1lc3NhZ2U7XG4gICAgdGhpcy5nZW5lcmF0ZWRNZXNzYWdlID0gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5tZXNzYWdlID0gZ2V0TWVzc2FnZSh0aGlzKTtcbiAgICB0aGlzLmdlbmVyYXRlZE1lc3NhZ2UgPSB0cnVlO1xuICB9XG4gIHZhciBzdGFja1N0YXJ0RnVuY3Rpb24gPSBvcHRpb25zLnN0YWNrU3RhcnRGdW5jdGlvbiB8fCBmYWlsO1xuICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIHtcbiAgICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCBzdGFja1N0YXJ0RnVuY3Rpb24pO1xuICB9IGVsc2Uge1xuICAgIC8vIG5vbiB2OCBicm93c2VycyBzbyB3ZSBjYW4gaGF2ZSBhIHN0YWNrdHJhY2VcbiAgICB2YXIgZXJyID0gbmV3IEVycm9yKCk7XG4gICAgaWYgKGVyci5zdGFjaykge1xuICAgICAgdmFyIG91dCA9IGVyci5zdGFjaztcblxuICAgICAgLy8gdHJ5IHRvIHN0cmlwIHVzZWxlc3MgZnJhbWVzXG4gICAgICB2YXIgZm5fbmFtZSA9IGdldE5hbWUoc3RhY2tTdGFydEZ1bmN0aW9uKTtcbiAgICAgIHZhciBpZHggPSBvdXQuaW5kZXhPZignXFxuJyArIGZuX25hbWUpO1xuICAgICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICAgIC8vIG9uY2Ugd2UgaGF2ZSBsb2NhdGVkIHRoZSBmdW5jdGlvbiBmcmFtZVxuICAgICAgICAvLyB3ZSBuZWVkIHRvIHN0cmlwIG91dCBldmVyeXRoaW5nIGJlZm9yZSBpdCAoYW5kIGl0cyBsaW5lKVxuICAgICAgICB2YXIgbmV4dF9saW5lID0gb3V0LmluZGV4T2YoJ1xcbicsIGlkeCArIDEpO1xuICAgICAgICBvdXQgPSBvdXQuc3Vic3RyaW5nKG5leHRfbGluZSArIDEpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnN0YWNrID0gb3V0O1xuICAgIH1cbiAgfVxufTtcblxuLy8gYXNzZXJ0LkFzc2VydGlvbkVycm9yIGluc3RhbmNlb2YgRXJyb3JcbnV0aWwuaW5oZXJpdHMoYXNzZXJ0LkFzc2VydGlvbkVycm9yLCBFcnJvcik7XG5cbmZ1bmN0aW9uIHRydW5jYXRlKHMsIG4pIHtcbiAgaWYgKHR5cGVvZiBzID09PSAnc3RyaW5nJykge1xuICAgIHJldHVybiBzLmxlbmd0aCA8IG4gPyBzIDogcy5zbGljZSgwLCBuKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcztcbiAgfVxufVxuZnVuY3Rpb24gaW5zcGVjdChzb21ldGhpbmcpIHtcbiAgaWYgKGZ1bmN0aW9uc0hhdmVOYW1lcyB8fCAhdXRpbC5pc0Z1bmN0aW9uKHNvbWV0aGluZykpIHtcbiAgICByZXR1cm4gdXRpbC5pbnNwZWN0KHNvbWV0aGluZyk7XG4gIH1cbiAgdmFyIHJhd25hbWUgPSBnZXROYW1lKHNvbWV0aGluZyk7XG4gIHZhciBuYW1lID0gcmF3bmFtZSA/ICc6ICcgKyByYXduYW1lIDogJyc7XG4gIHJldHVybiAnW0Z1bmN0aW9uJyArICBuYW1lICsgJ10nO1xufVxuZnVuY3Rpb24gZ2V0TWVzc2FnZShzZWxmKSB7XG4gIHJldHVybiB0cnVuY2F0ZShpbnNwZWN0KHNlbGYuYWN0dWFsKSwgMTI4KSArICcgJyArXG4gICAgICAgICBzZWxmLm9wZXJhdG9yICsgJyAnICtcbiAgICAgICAgIHRydW5jYXRlKGluc3BlY3Qoc2VsZi5leHBlY3RlZCksIDEyOCk7XG59XG5cbi8vIEF0IHByZXNlbnQgb25seSB0aGUgdGhyZWUga2V5cyBtZW50aW9uZWQgYWJvdmUgYXJlIHVzZWQgYW5kXG4vLyB1bmRlcnN0b29kIGJ5IHRoZSBzcGVjLiBJbXBsZW1lbnRhdGlvbnMgb3Igc3ViIG1vZHVsZXMgY2FuIHBhc3Ncbi8vIG90aGVyIGtleXMgdG8gdGhlIEFzc2VydGlvbkVycm9yJ3MgY29uc3RydWN0b3IgLSB0aGV5IHdpbGwgYmVcbi8vIGlnbm9yZWQuXG5cbi8vIDMuIEFsbCBvZiB0aGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBtdXN0IHRocm93IGFuIEFzc2VydGlvbkVycm9yXG4vLyB3aGVuIGEgY29ycmVzcG9uZGluZyBjb25kaXRpb24gaXMgbm90IG1ldCwgd2l0aCBhIG1lc3NhZ2UgdGhhdFxuLy8gbWF5IGJlIHVuZGVmaW5lZCBpZiBub3QgcHJvdmlkZWQuICBBbGwgYXNzZXJ0aW9uIG1ldGhvZHMgcHJvdmlkZVxuLy8gYm90aCB0aGUgYWN0dWFsIGFuZCBleHBlY3RlZCB2YWx1ZXMgdG8gdGhlIGFzc2VydGlvbiBlcnJvciBmb3Jcbi8vIGRpc3BsYXkgcHVycG9zZXMuXG5cbmZ1bmN0aW9uIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgb3BlcmF0b3IsIHN0YWNrU3RhcnRGdW5jdGlvbikge1xuICB0aHJvdyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKHtcbiAgICBtZXNzYWdlOiBtZXNzYWdlLFxuICAgIGFjdHVhbDogYWN0dWFsLFxuICAgIGV4cGVjdGVkOiBleHBlY3RlZCxcbiAgICBvcGVyYXRvcjogb3BlcmF0b3IsXG4gICAgc3RhY2tTdGFydEZ1bmN0aW9uOiBzdGFja1N0YXJ0RnVuY3Rpb25cbiAgfSk7XG59XG5cbi8vIEVYVEVOU0lPTiEgYWxsb3dzIGZvciB3ZWxsIGJlaGF2ZWQgZXJyb3JzIGRlZmluZWQgZWxzZXdoZXJlLlxuYXNzZXJ0LmZhaWwgPSBmYWlsO1xuXG4vLyA0LiBQdXJlIGFzc2VydGlvbiB0ZXN0cyB3aGV0aGVyIGEgdmFsdWUgaXMgdHJ1dGh5LCBhcyBkZXRlcm1pbmVkXG4vLyBieSAhIWd1YXJkLlxuLy8gYXNzZXJ0Lm9rKGd1YXJkLCBtZXNzYWdlX29wdCk7XG4vLyBUaGlzIHN0YXRlbWVudCBpcyBlcXVpdmFsZW50IHRvIGFzc2VydC5lcXVhbCh0cnVlLCAhIWd1YXJkLFxuLy8gbWVzc2FnZV9vcHQpOy4gVG8gdGVzdCBzdHJpY3RseSBmb3IgdGhlIHZhbHVlIHRydWUsIHVzZVxuLy8gYXNzZXJ0LnN0cmljdEVxdWFsKHRydWUsIGd1YXJkLCBtZXNzYWdlX29wdCk7LlxuXG5mdW5jdGlvbiBvayh2YWx1ZSwgbWVzc2FnZSkge1xuICBpZiAoIXZhbHVlKSBmYWlsKHZhbHVlLCB0cnVlLCBtZXNzYWdlLCAnPT0nLCBhc3NlcnQub2spO1xufVxuYXNzZXJ0Lm9rID0gb2s7XG5cbi8vIDUuIFRoZSBlcXVhbGl0eSBhc3NlcnRpb24gdGVzdHMgc2hhbGxvdywgY29lcmNpdmUgZXF1YWxpdHkgd2l0aFxuLy8gPT0uXG4vLyBhc3NlcnQuZXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZXF1YWwgPSBmdW5jdGlvbiBlcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT0gZXhwZWN0ZWQpIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJz09JywgYXNzZXJ0LmVxdWFsKTtcbn07XG5cbi8vIDYuIFRoZSBub24tZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIGZvciB3aGV0aGVyIHR3byBvYmplY3RzIGFyZSBub3QgZXF1YWxcbi8vIHdpdGggIT0gYXNzZXJ0Lm5vdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2Vfb3B0KTtcblxuYXNzZXJ0Lm5vdEVxdWFsID0gZnVuY3Rpb24gbm90RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoYWN0dWFsID09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnIT0nLCBhc3NlcnQubm90RXF1YWwpO1xuICB9XG59O1xuXG4vLyA3LiBUaGUgZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGEgZGVlcCBlcXVhbGl0eSByZWxhdGlvbi5cbi8vIGFzc2VydC5kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuZGVlcEVxdWFsID0gZnVuY3Rpb24gZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIGZhbHNlKSkge1xuICAgIGZhaWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSwgJ2RlZXBFcXVhbCcsIGFzc2VydC5kZWVwRXF1YWwpO1xuICB9XG59O1xuXG5hc3NlcnQuZGVlcFN0cmljdEVxdWFsID0gZnVuY3Rpb24gZGVlcFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKCFfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIHRydWUpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnZGVlcFN0cmljdEVxdWFsJywgYXNzZXJ0LmRlZXBTdHJpY3RFcXVhbCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIF9kZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgc3RyaWN0LCBtZW1vcykge1xuICAvLyA3LjEuIEFsbCBpZGVudGljYWwgdmFsdWVzIGFyZSBlcXVpdmFsZW50LCBhcyBkZXRlcm1pbmVkIGJ5ID09PS5cbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSBlbHNlIGlmIChpc0J1ZmZlcihhY3R1YWwpICYmIGlzQnVmZmVyKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBjb21wYXJlKGFjdHVhbCwgZXhwZWN0ZWQpID09PSAwO1xuXG4gIC8vIDcuMi4gSWYgdGhlIGV4cGVjdGVkIHZhbHVlIGlzIGEgRGF0ZSBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgRGF0ZSBvYmplY3QgdGhhdCByZWZlcnMgdG8gdGhlIHNhbWUgdGltZS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzRGF0ZShhY3R1YWwpICYmIHV0aWwuaXNEYXRlKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBhY3R1YWwuZ2V0VGltZSgpID09PSBleHBlY3RlZC5nZXRUaW1lKCk7XG5cbiAgLy8gNy4zIElmIHRoZSBleHBlY3RlZCB2YWx1ZSBpcyBhIFJlZ0V4cCBvYmplY3QsIHRoZSBhY3R1YWwgdmFsdWUgaXNcbiAgLy8gZXF1aXZhbGVudCBpZiBpdCBpcyBhbHNvIGEgUmVnRXhwIG9iamVjdCB3aXRoIHRoZSBzYW1lIHNvdXJjZSBhbmRcbiAgLy8gcHJvcGVydGllcyAoYGdsb2JhbGAsIGBtdWx0aWxpbmVgLCBgbGFzdEluZGV4YCwgYGlnbm9yZUNhc2VgKS5cbiAgfSBlbHNlIGlmICh1dGlsLmlzUmVnRXhwKGFjdHVhbCkgJiYgdXRpbC5pc1JlZ0V4cChleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gYWN0dWFsLnNvdXJjZSA9PT0gZXhwZWN0ZWQuc291cmNlICYmXG4gICAgICAgICAgIGFjdHVhbC5nbG9iYWwgPT09IGV4cGVjdGVkLmdsb2JhbCAmJlxuICAgICAgICAgICBhY3R1YWwubXVsdGlsaW5lID09PSBleHBlY3RlZC5tdWx0aWxpbmUgJiZcbiAgICAgICAgICAgYWN0dWFsLmxhc3RJbmRleCA9PT0gZXhwZWN0ZWQubGFzdEluZGV4ICYmXG4gICAgICAgICAgIGFjdHVhbC5pZ25vcmVDYXNlID09PSBleHBlY3RlZC5pZ25vcmVDYXNlO1xuXG4gIC8vIDcuNC4gT3RoZXIgcGFpcnMgdGhhdCBkbyBub3QgYm90aCBwYXNzIHR5cGVvZiB2YWx1ZSA9PSAnb2JqZWN0JyxcbiAgLy8gZXF1aXZhbGVuY2UgaXMgZGV0ZXJtaW5lZCBieSA9PS5cbiAgfSBlbHNlIGlmICgoYWN0dWFsID09PSBudWxsIHx8IHR5cGVvZiBhY3R1YWwgIT09ICdvYmplY3QnKSAmJlxuICAgICAgICAgICAgIChleHBlY3RlZCA9PT0gbnVsbCB8fCB0eXBlb2YgZXhwZWN0ZWQgIT09ICdvYmplY3QnKSkge1xuICAgIHJldHVybiBzdHJpY3QgPyBhY3R1YWwgPT09IGV4cGVjdGVkIDogYWN0dWFsID09IGV4cGVjdGVkO1xuXG4gIC8vIElmIGJvdGggdmFsdWVzIGFyZSBpbnN0YW5jZXMgb2YgdHlwZWQgYXJyYXlzLCB3cmFwIHRoZWlyIHVuZGVybHlpbmdcbiAgLy8gQXJyYXlCdWZmZXJzIGluIGEgQnVmZmVyIGVhY2ggdG8gaW5jcmVhc2UgcGVyZm9ybWFuY2VcbiAgLy8gVGhpcyBvcHRpbWl6YXRpb24gcmVxdWlyZXMgdGhlIGFycmF5cyB0byBoYXZlIHRoZSBzYW1lIHR5cGUgYXMgY2hlY2tlZCBieVxuICAvLyBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nIChha2EgcFRvU3RyaW5nKS4gTmV2ZXIgcGVyZm9ybSBiaW5hcnlcbiAgLy8gY29tcGFyaXNvbnMgZm9yIEZsb2F0KkFycmF5cywgdGhvdWdoLCBzaW5jZSBlLmcuICswID09PSAtMCBidXQgdGhlaXJcbiAgLy8gYml0IHBhdHRlcm5zIGFyZSBub3QgaWRlbnRpY2FsLlxuICB9IGVsc2UgaWYgKGlzVmlldyhhY3R1YWwpICYmIGlzVmlldyhleHBlY3RlZCkgJiZcbiAgICAgICAgICAgICBwVG9TdHJpbmcoYWN0dWFsKSA9PT0gcFRvU3RyaW5nKGV4cGVjdGVkKSAmJlxuICAgICAgICAgICAgICEoYWN0dWFsIGluc3RhbmNlb2YgRmxvYXQzMkFycmF5IHx8XG4gICAgICAgICAgICAgICBhY3R1YWwgaW5zdGFuY2VvZiBGbG9hdDY0QXJyYXkpKSB7XG4gICAgcmV0dXJuIGNvbXBhcmUobmV3IFVpbnQ4QXJyYXkoYWN0dWFsLmJ1ZmZlciksXG4gICAgICAgICAgICAgICAgICAgbmV3IFVpbnQ4QXJyYXkoZXhwZWN0ZWQuYnVmZmVyKSkgPT09IDA7XG5cbiAgLy8gNy41IEZvciBhbGwgb3RoZXIgT2JqZWN0IHBhaXJzLCBpbmNsdWRpbmcgQXJyYXkgb2JqZWN0cywgZXF1aXZhbGVuY2UgaXNcbiAgLy8gZGV0ZXJtaW5lZCBieSBoYXZpbmcgdGhlIHNhbWUgbnVtYmVyIG9mIG93bmVkIHByb3BlcnRpZXMgKGFzIHZlcmlmaWVkXG4gIC8vIHdpdGggT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKSwgdGhlIHNhbWUgc2V0IG9mIGtleXNcbiAgLy8gKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksIGVxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeVxuICAvLyBjb3JyZXNwb25kaW5nIGtleSwgYW5kIGFuIGlkZW50aWNhbCAncHJvdG90eXBlJyBwcm9wZXJ0eS4gTm90ZTogdGhpc1xuICAvLyBhY2NvdW50cyBmb3IgYm90aCBuYW1lZCBhbmQgaW5kZXhlZCBwcm9wZXJ0aWVzIG9uIEFycmF5cy5cbiAgfSBlbHNlIGlmIChpc0J1ZmZlcihhY3R1YWwpICE9PSBpc0J1ZmZlcihleHBlY3RlZCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gICAgbWVtb3MgPSBtZW1vcyB8fCB7YWN0dWFsOiBbXSwgZXhwZWN0ZWQ6IFtdfTtcblxuICAgIHZhciBhY3R1YWxJbmRleCA9IG1lbW9zLmFjdHVhbC5pbmRleE9mKGFjdHVhbCk7XG4gICAgaWYgKGFjdHVhbEluZGV4ICE9PSAtMSkge1xuICAgICAgaWYgKGFjdHVhbEluZGV4ID09PSBtZW1vcy5leHBlY3RlZC5pbmRleE9mKGV4cGVjdGVkKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBtZW1vcy5hY3R1YWwucHVzaChhY3R1YWwpO1xuICAgIG1lbW9zLmV4cGVjdGVkLnB1c2goZXhwZWN0ZWQpO1xuXG4gICAgcmV0dXJuIG9iakVxdWl2KGFjdHVhbCwgZXhwZWN0ZWQsIHN0cmljdCwgbWVtb3MpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGlzQXJndW1lbnRzKG9iamVjdCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iamVjdCkgPT0gJ1tvYmplY3QgQXJndW1lbnRzXSc7XG59XG5cbmZ1bmN0aW9uIG9iakVxdWl2KGEsIGIsIHN0cmljdCwgYWN0dWFsVmlzaXRlZE9iamVjdHMpIHtcbiAgaWYgKGEgPT09IG51bGwgfHwgYSA9PT0gdW5kZWZpbmVkIHx8IGIgPT09IG51bGwgfHwgYiA9PT0gdW5kZWZpbmVkKVxuICAgIHJldHVybiBmYWxzZTtcbiAgLy8gaWYgb25lIGlzIGEgcHJpbWl0aXZlLCB0aGUgb3RoZXIgbXVzdCBiZSBzYW1lXG4gIGlmICh1dGlsLmlzUHJpbWl0aXZlKGEpIHx8IHV0aWwuaXNQcmltaXRpdmUoYikpXG4gICAgcmV0dXJuIGEgPT09IGI7XG4gIGlmIChzdHJpY3QgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKGEpICE9PSBPYmplY3QuZ2V0UHJvdG90eXBlT2YoYikpXG4gICAgcmV0dXJuIGZhbHNlO1xuICB2YXIgYUlzQXJncyA9IGlzQXJndW1lbnRzKGEpO1xuICB2YXIgYklzQXJncyA9IGlzQXJndW1lbnRzKGIpO1xuICBpZiAoKGFJc0FyZ3MgJiYgIWJJc0FyZ3MpIHx8ICghYUlzQXJncyAmJiBiSXNBcmdzKSlcbiAgICByZXR1cm4gZmFsc2U7XG4gIGlmIChhSXNBcmdzKSB7XG4gICAgYSA9IHBTbGljZS5jYWxsKGEpO1xuICAgIGIgPSBwU2xpY2UuY2FsbChiKTtcbiAgICByZXR1cm4gX2RlZXBFcXVhbChhLCBiLCBzdHJpY3QpO1xuICB9XG4gIHZhciBrYSA9IG9iamVjdEtleXMoYSk7XG4gIHZhciBrYiA9IG9iamVjdEtleXMoYik7XG4gIHZhciBrZXksIGk7XG4gIC8vIGhhdmluZyB0aGUgc2FtZSBudW1iZXIgb2Ygb3duZWQgcHJvcGVydGllcyAoa2V5cyBpbmNvcnBvcmF0ZXNcbiAgLy8gaGFzT3duUHJvcGVydHkpXG4gIGlmIChrYS5sZW5ndGggIT09IGtiLmxlbmd0aClcbiAgICByZXR1cm4gZmFsc2U7XG4gIC8vdGhlIHNhbWUgc2V0IG9mIGtleXMgKGFsdGhvdWdoIG5vdCBuZWNlc3NhcmlseSB0aGUgc2FtZSBvcmRlciksXG4gIGthLnNvcnQoKTtcbiAga2Iuc29ydCgpO1xuICAvL35+fmNoZWFwIGtleSB0ZXN0XG4gIGZvciAoaSA9IGthLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgaWYgKGthW2ldICE9PSBrYltpXSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAvL2VxdWl2YWxlbnQgdmFsdWVzIGZvciBldmVyeSBjb3JyZXNwb25kaW5nIGtleSwgYW5kXG4gIC8vfn5+cG9zc2libHkgZXhwZW5zaXZlIGRlZXAgdGVzdFxuICBmb3IgKGkgPSBrYS5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGtleSA9IGthW2ldO1xuICAgIGlmICghX2RlZXBFcXVhbChhW2tleV0sIGJba2V5XSwgc3RyaWN0LCBhY3R1YWxWaXNpdGVkT2JqZWN0cykpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIDguIFRoZSBub24tZXF1aXZhbGVuY2UgYXNzZXJ0aW9uIHRlc3RzIGZvciBhbnkgZGVlcCBpbmVxdWFsaXR5LlxuLy8gYXNzZXJ0Lm5vdERlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3REZWVwRXF1YWwgPSBmdW5jdGlvbiBub3REZWVwRXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZSkge1xuICBpZiAoX2RlZXBFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBmYWxzZSkpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICdub3REZWVwRXF1YWwnLCBhc3NlcnQubm90RGVlcEVxdWFsKTtcbiAgfVxufTtcblxuYXNzZXJ0Lm5vdERlZXBTdHJpY3RFcXVhbCA9IG5vdERlZXBTdHJpY3RFcXVhbDtcbmZ1bmN0aW9uIG5vdERlZXBTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChfZGVlcEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIHRydWUpKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnbm90RGVlcFN0cmljdEVxdWFsJywgbm90RGVlcFN0cmljdEVxdWFsKTtcbiAgfVxufVxuXG5cbi8vIDkuIFRoZSBzdHJpY3QgZXF1YWxpdHkgYXNzZXJ0aW9uIHRlc3RzIHN0cmljdCBlcXVhbGl0eSwgYXMgZGV0ZXJtaW5lZCBieSA9PT0uXG4vLyBhc3NlcnQuc3RyaWN0RXF1YWwoYWN0dWFsLCBleHBlY3RlZCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQuc3RyaWN0RXF1YWwgPSBmdW5jdGlvbiBzdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlKSB7XG4gIGlmIChhY3R1YWwgIT09IGV4cGVjdGVkKSB7XG4gICAgZmFpbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlLCAnPT09JywgYXNzZXJ0LnN0cmljdEVxdWFsKTtcbiAgfVxufTtcblxuLy8gMTAuIFRoZSBzdHJpY3Qgbm9uLWVxdWFsaXR5IGFzc2VydGlvbiB0ZXN0cyBmb3Igc3RyaWN0IGluZXF1YWxpdHksIGFzXG4vLyBkZXRlcm1pbmVkIGJ5ICE9PS4gIGFzc2VydC5ub3RTdHJpY3RFcXVhbChhY3R1YWwsIGV4cGVjdGVkLCBtZXNzYWdlX29wdCk7XG5cbmFzc2VydC5ub3RTdHJpY3RFcXVhbCA9IGZ1bmN0aW9uIG5vdFN0cmljdEVxdWFsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgaWYgKGFjdHVhbCA9PT0gZXhwZWN0ZWQpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsIG1lc3NhZ2UsICchPT0nLCBhc3NlcnQubm90U3RyaWN0RXF1YWwpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSB7XG4gIGlmICghYWN0dWFsIHx8ICFleHBlY3RlZCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGlmIChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoZXhwZWN0ZWQpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgcmV0dXJuIGV4cGVjdGVkLnRlc3QoYWN0dWFsKTtcbiAgfVxuXG4gIHRyeSB7XG4gICAgaWYgKGFjdHVhbCBpbnN0YW5jZW9mIGV4cGVjdGVkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICAvLyBJZ25vcmUuICBUaGUgaW5zdGFuY2VvZiBjaGVjayBkb2Vzbid0IHdvcmsgZm9yIGFycm93IGZ1bmN0aW9ucy5cbiAgfVxuXG4gIGlmIChFcnJvci5pc1Byb3RvdHlwZU9mKGV4cGVjdGVkKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHJldHVybiBleHBlY3RlZC5jYWxsKHt9LCBhY3R1YWwpID09PSB0cnVlO1xufVxuXG5mdW5jdGlvbiBfdHJ5QmxvY2soYmxvY2spIHtcbiAgdmFyIGVycm9yO1xuICB0cnkge1xuICAgIGJsb2NrKCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBlcnJvciA9IGU7XG4gIH1cbiAgcmV0dXJuIGVycm9yO1xufVxuXG5mdW5jdGlvbiBfdGhyb3dzKHNob3VsZFRocm93LCBibG9jaywgZXhwZWN0ZWQsIG1lc3NhZ2UpIHtcbiAgdmFyIGFjdHVhbDtcblxuICBpZiAodHlwZW9mIGJsb2NrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJibG9ja1wiIGFyZ3VtZW50IG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBleHBlY3RlZCA9PT0gJ3N0cmluZycpIHtcbiAgICBtZXNzYWdlID0gZXhwZWN0ZWQ7XG4gICAgZXhwZWN0ZWQgPSBudWxsO1xuICB9XG5cbiAgYWN0dWFsID0gX3RyeUJsb2NrKGJsb2NrKTtcblxuICBtZXNzYWdlID0gKGV4cGVjdGVkICYmIGV4cGVjdGVkLm5hbWUgPyAnICgnICsgZXhwZWN0ZWQubmFtZSArICcpLicgOiAnLicpICtcbiAgICAgICAgICAgIChtZXNzYWdlID8gJyAnICsgbWVzc2FnZSA6ICcuJyk7XG5cbiAgaWYgKHNob3VsZFRocm93ICYmICFhY3R1YWwpIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdNaXNzaW5nIGV4cGVjdGVkIGV4Y2VwdGlvbicgKyBtZXNzYWdlKTtcbiAgfVxuXG4gIHZhciB1c2VyUHJvdmlkZWRNZXNzYWdlID0gdHlwZW9mIG1lc3NhZ2UgPT09ICdzdHJpbmcnO1xuICB2YXIgaXNVbndhbnRlZEV4Y2VwdGlvbiA9ICFzaG91bGRUaHJvdyAmJiB1dGlsLmlzRXJyb3IoYWN0dWFsKTtcbiAgdmFyIGlzVW5leHBlY3RlZEV4Y2VwdGlvbiA9ICFzaG91bGRUaHJvdyAmJiBhY3R1YWwgJiYgIWV4cGVjdGVkO1xuXG4gIGlmICgoaXNVbndhbnRlZEV4Y2VwdGlvbiAmJlxuICAgICAgdXNlclByb3ZpZGVkTWVzc2FnZSAmJlxuICAgICAgZXhwZWN0ZWRFeGNlcHRpb24oYWN0dWFsLCBleHBlY3RlZCkpIHx8XG4gICAgICBpc1VuZXhwZWN0ZWRFeGNlcHRpb24pIHtcbiAgICBmYWlsKGFjdHVhbCwgZXhwZWN0ZWQsICdHb3QgdW53YW50ZWQgZXhjZXB0aW9uJyArIG1lc3NhZ2UpO1xuICB9XG5cbiAgaWYgKChzaG91bGRUaHJvdyAmJiBhY3R1YWwgJiYgZXhwZWN0ZWQgJiZcbiAgICAgICFleHBlY3RlZEV4Y2VwdGlvbihhY3R1YWwsIGV4cGVjdGVkKSkgfHwgKCFzaG91bGRUaHJvdyAmJiBhY3R1YWwpKSB7XG4gICAgdGhyb3cgYWN0dWFsO1xuICB9XG59XG5cbi8vIDExLiBFeHBlY3RlZCB0byB0aHJvdyBhbiBlcnJvcjpcbi8vIGFzc2VydC50aHJvd3MoYmxvY2ssIEVycm9yX29wdCwgbWVzc2FnZV9vcHQpO1xuXG5hc3NlcnQudGhyb3dzID0gZnVuY3Rpb24oYmxvY2ssIC8qb3B0aW9uYWwqL2Vycm9yLCAvKm9wdGlvbmFsKi9tZXNzYWdlKSB7XG4gIF90aHJvd3ModHJ1ZSwgYmxvY2ssIGVycm9yLCBtZXNzYWdlKTtcbn07XG5cbi8vIEVYVEVOU0lPTiEgVGhpcyBpcyBhbm5veWluZyB0byB3cml0ZSBvdXRzaWRlIHRoaXMgbW9kdWxlLlxuYXNzZXJ0LmRvZXNOb3RUaHJvdyA9IGZ1bmN0aW9uKGJsb2NrLCAvKm9wdGlvbmFsKi9lcnJvciwgLypvcHRpb25hbCovbWVzc2FnZSkge1xuICBfdGhyb3dzKGZhbHNlLCBibG9jaywgZXJyb3IsIG1lc3NhZ2UpO1xufTtcblxuYXNzZXJ0LmlmRXJyb3IgPSBmdW5jdGlvbihlcnIpIHsgaWYgKGVycikgdGhyb3cgZXJyOyB9O1xuXG52YXIgb2JqZWN0S2V5cyA9IE9iamVjdC5rZXlzIHx8IGZ1bmN0aW9uIChvYmopIHtcbiAgdmFyIGtleXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChoYXNPd24uY2FsbChvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiBrZXlzO1xufTtcbiIsIiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iXX0=
