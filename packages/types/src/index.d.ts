export declare enum IntentType {
    CONTACT = "CONTACT",
    SERVICE = "SERVICE",
    HOURS = "HOURS",
    LOCATION = "LOCATION",
    PRICE = "PRICE",
    EMERGENCY = "EMERGENCY",
    NOT_RELEVANT = "NOT_RELEVANT"
}
export declare enum ListingObjectType {
    USTA = "USTA",
    DOKON_OBYEKT = "DOKON_OBYEKT",
    MUASSASA = "MUASSASA",
    TRANSPORT = "TRANSPORT"
}
export interface ClassifierResult {
    intent: IntentType;
    object_type: ListingObjectType | null;
    category: string | null;
    name: string | null;
    landmark: string | null;
    confidence: number;
}
export interface EmergencyTemplate {
    level: 1 | 2 | 3;
    title: string;
    safetyInstructions: string[];
    numbersToCall: {
        label: string;
        key: string;
    }[];
    isPersistent: boolean;
}
//# sourceMappingURL=index.d.ts.map