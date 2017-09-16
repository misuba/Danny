db.schema({
    version: 1,
    cards: {
        primaryKey: "createdAt",
        index: ["createdAt", "_origin"],
        validator: record => {
            assert(typeof record.text === "string");
            assert(typeof record.createdAt === "number");
            return record;
        }
    },
    backgrounds: {},
    behaviors: {
        primaryKey: "createdAt",
        index: "targetUrl",
        validator: record => {
            //   assert(typeof record.targetUrl === 'string')
            //   return record
        }
    },
    stack: {
        singular: true,
        // index: 'name',
        validator: record => {
            assert(typeof record.name === "string");
            return {
                name: record.name,
                description: isString(record.description)
                    ? record.description
                    : "",
                avatarUrl: isString(record.avatarUrl) ? record.avatarUrl : ""
            };
        }
    }
});
