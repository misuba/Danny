const assert = require('assert');

const {parseAndRunBehaviors} = require('../lib/behavior');


const startState = {
  truths: {},
  cards: [
    {
      elements: [
        {
          behavior: []
        }
      ]
    },
    {
      elements: [
        {
          text: "Hello"
        }
      ]
    },
  ],
  backgrounds: [

  ],
  currentCard: 0
};

let theRecord = [];

const mockEmit = {
  emit: function() {
    const args = [...arguments];
    theRecord.push(args);
  }
};


describe('behaviors', function() {
  let state;

  beforeEach(function() {
    state = Object.assign({}, startState);
    theRecord = [];
  });

  it('jumpsTo a card', function(done) {
    const behaviors = [{'jumpTo': 1}]
    state.cards[0].elements[0].behavior = behaviors;
    parseAndRunBehaviors(state, mockEmit.emit, behaviors);

    setTimeout(() => {
      assert(state.nextCard === 1);
      assert(theRecord[0] && theRecord[0].includes('goto'));
      done();
    }, 1);
  });

  it('jumpsTo a card by name', function(done) {
    state.cards[1].name = "second card";
    const behaviors = [{'jumpTo': "second card"}]
    state.cards[0].elements[0].behavior = behaviors;
    parseAndRunBehaviors(state, mockEmit.emit, behaviors);

    setTimeout(() => {
      assert(state.nextCard === 1);
      assert(theRecord[0] && theRecord[0].includes('goto'));
      done();
    }, 1);
  });

  it('sets truths', function(done) {
    const behaviors = [{'setTruth': 'hello'}]
    state.cards[0].elements[0].behavior = behaviors;
    parseAndRunBehaviors(state, mockEmit.emit, behaviors);

    setTimeout(() => {
      assert(Object.keys(state.truths).length);
      assert(state.truths.hello == true);
      done();
    }, 1);
  });

  it('removes truths', function(done) {
    state.truths = {'hello': true, 'badboi': true};
    const behaviors = [{'removeTruth': 'hello'}]
    state.cards[0].elements[0].behavior = behaviors;
    parseAndRunBehaviors(state, mockEmit.emit, behaviors);

    setTimeout(() => {
      assert(Object.keys(state.truths).length === 1);
      assert(state.truths.hello == undefined);
      done();
    }, 1);
  });

  describe('goToNextCard', function() {
    // is it bad that behavior.js is partly a store, or is it bad that those two compound gotos
    // live alongside the plain one?
    // or should we just test that the behavior routing works and emits the event

    beforeEach(function() {
      state.cards[0].background = 0;
      state.cards[1].background = 1;
      state.cards[2] = {background: 0};
    });

    it('does a simple go-to-next-card', function(done) {
      const behaviors = [{'goToNextCard': 'stack'}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        // it hasn't set nextCard, that gets done in a store event
        assert(theRecord[0] && theRecord[0].includes('gotoNextCard'));
        done();
      }, 1);
    });

    it('does a simple go-to-next-card, calling for no wrapsies', function(done) {
      const behaviors = [{'goToNextCard': 'stack', 'wrap': false}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        assert(theRecord[0] && theRecord[0].includes('gotoNextCard'));
        assert(theRecord[0].length == 2);
        assert(theRecord[0][1] === false);
        done();
      }, 1);
    });

    it('does a go-to-next-card in background', function(done) {
      const behaviors = [{'goToNextCard': 'bg'}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        assert(state.nextCard == 2);
        assert(theRecord[0].includes('goto'));
        done();
      }, 1);
    });

    it('does a go-to-next-card in background, wrapping around', function(done) {
      state.currentCard = 2;

      const behaviors = [{'goToNextCard': 'bg', 'wrap': true}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        assert(state.nextCard == 0);
        assert(theRecord[0].includes('goto'));
        done();
      }, 1);
    });

    it('does a go-to-next-card in background, NOT wrapping around', function(done) {
      state.currentCard = 2;

      const behaviors = [{'goToNextCard': 'bg', 'wrap': false}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        assert(state.nextCard == undefined);
        assert(!theRecord.length);
        done();
      }, 1);
    });
  });

  // yes we really have to do all that again for previous
  // we duplicated that code, we can duplicate this code. :-P
  describe('goToPreviousCard', function() {
    beforeEach(function() {
      state.cards[0].background = 0;
      state.cards[1].background = 1;
      state.cards[2] = {background: 0};
      state.currentCard = 2;
    });

    it('does a simple go-to-prev-card', function(done) {
      const behaviors = [{'goToPreviousCard': 'stack'}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        // it hasn't set nextCard, that gets done in a store event
        assert(theRecord[0] && theRecord[0].includes('gotoPrevCard'));
        done();
      }, 1);
    });

    it('does a simple go-to-prev-card, calling for no wrapsies', function(done) {
      const behaviors = [{'goToNextCard': 'stack', 'wrap': false}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        assert(theRecord[0] && theRecord[0].includes('gotoPrevCard'));
        assert(theRecord[0].length == 2);
        assert(theRecord[0][1] === false);
        done();
      }, 1);
    });

    it('does a go-to-prev-card in background', function(done) {
      const behaviors = [{'goToPreviousCard': 'bg'}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        assert(state.nextCard == 0);
        assert(theRecord[0].includes('goto'));
        done();
      }, 1);
    });

    it('does a go-to-prev-card in background, wrapping around', function(done) {
      state.currentCard = 0;

      const behaviors = [{'goToPreviousCard': 'bg', 'wrap': true}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        assert(state.nextCard == 2);
        assert(theRecord[0].includes('goto'));
        done();
      }, 1);
    });

    it('does a go-to-prev-card in background, NOT wrapping around', function(done) {
      state.currentCard = 0;

      const behaviors = [{'goToPreviousCard': 'bg', 'wrap': false}]
      state.cards[0].elements[0].behavior = behaviors;
      parseAndRunBehaviors(state, mockEmit.emit, behaviors);

      setTimeout(() => {
        assert(state.nextCard == undefined);
        assert(!theRecord.length);
        done();
      }, 1);
    });
  });
});
