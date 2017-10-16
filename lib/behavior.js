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
