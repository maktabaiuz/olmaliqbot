"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const searchEngine_1 = require("./searchEngine");
describe('Search and Recommendation Engine', () => {
    it('should return null when cityId is missing or no listings exist', async () => {
        const res = await (0, searchEngine_1.searchListings)({ cityId: 'non-existent-city-id' });
        expect(res).toBeNull();
    });
});
//# sourceMappingURL=searchEngine.test.js.map