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
