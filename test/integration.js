

const ;

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
  backgrounds: {
    "schulzy": {
      name: "schulzy",
      elements: [],
      fields: {},
      images: []
    }
  },
  currentCard: 0
};

require(['node-dat-archive'], function(nda) {
  window.DatArchive = nda;

  require(['../lib/store/appStore',
    '../lib/store/bgStore',
    '../lib/store/cardStore',
    '../lib/store/elementStore',
    '../lib/store/fieldStore',
    '../lib/store/editBarStore',
    '../lib/store/editModalStore',
    '../lib/store/imageStore'
  ], function(appStore, bgStore, cardStore, elementStore, fieldStore, editBarStore, editModalStore, imageStore, appView) {
    require(['../lib/appView'], function(appView) {

      describe('Danny', function () {

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

    });
  });
});
