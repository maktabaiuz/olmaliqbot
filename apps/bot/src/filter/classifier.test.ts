import { zeroLayerFilter } from './zeroLayerFilter';
import { classifyQuery } from './aiClassifier';
import { IntentType } from '@kimbor/types';

describe('Zero-Layer Keyword Filter (0-qavat)', () => {
  it('should pass questions with question mark ?', () => {
    expect(zeroLayerFilter('gazavik bormi?')).toBe(true);
    expect(zeroLayerFilter('notarius ochiqmi?')).toBe(true);
  });

  it('should pass questions containing target Uzbek query keywords', () => {
    expect(zeroLayerFilter('gazavik kerak edi')).toBe(true);
    expect(zeroLayerFilter('Bahromni nomeri nechi')).toBe(true);
    expect(zeroLayerFilter('santexnik bor')).toBe(true);
  });

  it('should block non-query chat chatter without question words', () => {
    expect(zeroLayerFilter('Bugun havo juda issiq')).toBe(false);
    expect(zeroLayerFilter('Ertaga ko\'rishamiz')).toBe(false);
    expect(zeroLayerFilter('Rahmat catga')).toBe(false);
  });
});

describe('AI Classifier (1-qavat)', () => {
  it('should classify gazavik query with Korzinka landmark', async () => {
    const res = await classifyQuery('Karzinka oldida gazavik bormi?');
    expect(res.intent).toBe(IntentType.SERVICE);
    expect(res.category).toBe('gazavik');
    expect(res.landmark).toBe('Korzinka');
    expect(res.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('should classify emergency query correctly with high confidence', async () => {
    const res = await classifyQuery('Uyda gaz hidi kelyapti nima qilay');
    expect(res.intent).toBe(IntentType.EMERGENCY);
    expect(res.confidence).toBe(0.99);
  });

  it('should remain silent (NOT_RELEVANT) when confidence is low', async () => {
    const res = await classifyQuery('Salam hammaga nega jimlik');
    expect(res.intent).toBe(IntentType.NOT_RELEVANT);
  });
});
