import { ClassifierResult, IntentType, ListingObjectType } from '@kimbor/types';

/**
 * 1-qavat — AI klassifikator.
 * Parses user group messages into structured query intent.
 * Strict rule: confidence < 0.7 => intent becomes NOT_RELEVANT
 */
export async function classifyQuery(userMessage: string, apiKey?: string): Promise<ClassifierResult> {
  const text = userMessage.toLowerCase().trim();

  // Baseline rule-based classification fallback for testing/offline mode
  let intent: IntentType = IntentType.NOT_RELEVANT;
  let objectType: ListingObjectType | null = null;
  let category: string | null = null;
  let landmark: string | null = null;
  let confidence = 0.85;

  // Emergency keywords check
  if (/gaz hidi|yong'in|tutun|elektr urdi|hushidan ketdi|qon ketyapti|avariya/.test(text)) {
    return {
      intent: IntentType.EMERGENCY,
      object_type: null,
      category: 'emergency',
      name: null,
      landmark: null,
      confidence: 0.99,
    };
  }

  // Category detection heuristic baseline
  if (text.includes('gazavik') || text.includes('gaz kolonka') || text.includes('газовик')) {
    intent = IntentType.SERVICE;
    objectType = ListingObjectType.USTA;
    category = 'gazavik';
  } else if (text.includes('santexnik') || text.includes('quvur') || text.includes('сантехник')) {
    intent = IntentType.SERVICE;
    objectType = ListingObjectType.USTA;
    category = 'santexnik';
  } else if (text.includes('kafelchi') || text.includes('plitka') || text.includes('кафельщик')) {
    intent = IntentType.SERVICE;
    objectType = ListingObjectType.USTA;
    category = 'kafelchi';
  } else if (text.includes('notarius') || text.includes('нотариус')) {
    intent = IntentType.LOCATION;
    objectType = ListingObjectType.MUASSASA;
    category = 'notarius';
  } else if (text.includes('nomeri') || text.includes('raqami') || text.includes('nomer')) {
    intent = IntentType.CONTACT;
  } else if (text.includes('nechigacha') || text.includes('ishlaydi') || text.includes('ochiqmi')) {
    intent = IntentType.HOURS;
  } else if (text.includes('qancha') || text.includes('narxi') || text.includes('necha pul')) {
    intent = IntentType.PRICE;
  } else {
    confidence = 0.4; // Low confidence for non-matching queries
  }

  // Landmark detection baseline
  if (text.includes('karzinka') || text.includes('korzinka') || text.includes('корзинка')) {
    landmark = 'Korzinka';
  } else if (text.includes('bozor') || text.includes('бозор')) {
    landmark = 'Bozor';
  } else if (text.includes('3-mavze') || text.includes('3 mavze')) {
    landmark = '3-mavze';
  }

  // Strict Rule: confidence < 0.7 => bot stays silent
  if (confidence < 0.7) {
    return {
      intent: IntentType.NOT_RELEVANT,
      object_type: null,
      category: null,
      name: null,
      landmark: null,
      confidence,
    };
  }

  return {
    intent,
    object_type: objectType,
    category,
    name: null,
    landmark,
    confidence,
  };
}
