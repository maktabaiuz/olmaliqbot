import { searchListings } from './searchEngine';

describe('Search and Recommendation Engine', () => {
  it('should return null when cityId is missing or no listings exist', async () => {
    const res = await searchListings({ cityId: 'non-existent-city-id' });
    expect(res).toBeNull();
  });
});
