"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe('Bayesian Rating Calculation', () => {
    it('should return global average 3.0 when there are no votes', () => {
        const score = (0, index_1.calculateBayesianRating)(0, 0);
        expect(score).toBe(3.0);
    });
    it('should calculate 87.5% thumbs up (28 out of 32) correctly as ~4.4', () => {
        const score = (0, index_1.calculateBayesianRating)(28, 4);
        // 28/32 = 87.5% -> 4.375 raw score -> Bayesian average pulls towards 3.0 baseline
        expect(score).toBe(4.1);
    });
    it('should pull single 100% positive vote towards mean to avoid 5.0 bias', () => {
        const score1 = (0, index_1.calculateBayesianRating)(1, 0); // 1 positive vote
        const score40 = (0, index_1.calculateBayesianRating)(40, 0); // 40 positive votes
        expect(score1).toBeLessThan(score40);
    });
});
//# sourceMappingURL=index.test.js.map