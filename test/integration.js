const assert = require('assert');
const choo = require('choo');
const html = require('choo/html');
const test = require('choo-test');

const appStore = require('../lib/store/appStore');
const bgStore = require('../lib/store/bgStore');
const cardStore = require('../lib/store/cardStore');
const elementStore = require('../lib/store/elementStore');
const fieldStore = require('../lib/store/fieldStore');
const editBarStore = require('../lib/store/editBarStore');
const editModalStore = require('../lib/store/editModalStore');
const imageStore = require('../lib/store/imageStore');

const appView = require('../lib/appView');

const startState = {
  truths: {},
  cards: [
    {
      elements: [
        {
          class: "firstCardButton",
          behavior: []
        }
      ],
      fields: {

      },
      images: []
    },
    {
      elements: [
        {
          class: "secondCardButton",
          text: "Hello"
        }
      ],
      fields: {

      },
      images: []
    },
  ],
  backgrounds: [
    {
      name: "schulzy",
      elements: [],
      fields: {},
      images: []
    }
  ],
  currentCard: 0
};

describe('choo-app', function () {
  let restore;
  let app;

  beforeEach(function () {
    app = choo();
    app.use(appStore);
    app.use(bgStore);
    app.use(cardStore);
    app.use(elementStore);
    app.use(fieldStore);
    app.use(imageStore);
    app.use(editBarStore);
    app.use(editModalStore);
    app.route('/', appView);
  });

  afterEach(function () {
    restore();
  });

  it('changes the button text on click', function (done) {
    restore = test.start(app);

    test.fire('button', 'click');

    test.onRender(function () {
      assert.equal(test.$('button').innerText, 'Changed');
      done();
    });
  });

});
