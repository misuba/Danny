const newID = require('monotonic-timestamp-base36')

const coerce = require('./coerce');

module.exports = {
  version: 4,
  cards: {
    primaryKey: 'id',
    index: ['_origin+createdAt', '*elements.text', '*fields.value', '*values.*'],
    validator: record => ({
      id: coerce.string(record.id) || newID(),
      name: coerce.string(record.name),
      background: coerce.string(record.background),
      values: coerce.object(record.values),
      color: coerce.string(record.color),
      elements: coerce.arrayOfObjects(record.elements),
      images: coerce.arrayOfObjects(record.images),
      fields: coerce.object(record.fields),
      behavior: coerce.arrayOfObjects(record.behavior),
      createdAt: coerce.number(record.createdAt) || Date.now()
    })
  },
  backgrounds: {
    primaryKey: 'id',
    index: ['_origin+createdAt', '_origin+name'],
    validator: record => ({
        id: coerce.string(record.id) || newID(),
        name: coerce.required(coerce.string(record.name)),
        color: coerce.string(record.color),
        elements: coerce.arrayOfObjects(record.elements),
        images: coerce.arrayOfObjects(record.images),
        fields: coerce.object(record.fields),
        behavior: coerce.arrayOfObjects(record.behavior),
        createdAt: coerce.number(record.createdAt) || Date.now()
    })
  },
  config: {
    singular: true,
    validator: record => ({
      "currentCard": coerce.string(record.currentCard),
      "color": coerce.string(record.color),
      "cardSources": coerce.arrayOfStrings(record.cardSources)
    })
  }
};
