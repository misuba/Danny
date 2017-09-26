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
