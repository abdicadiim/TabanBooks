/**
 * Approval Evaluator Utility
 * Evaluates custom approval rules against document data (e.g., Quote, Invoice)
 */

/**
 * Evaluates a set of criteria against a document
 * @param criteria Array of criteria from the approval rule
 * @param pattern Logical pattern (e.g., "1 AND 2 OR 3")
 * @param doc The document to evaluate
 * @returns boolean indicating if the criteria match
 */
export const evaluateCriteria = (criteria: any[], pattern: string | undefined, doc: any): boolean => {
    if (!criteria || criteria.length === 0) return true;

    // 1. Evaluate each criterion individually
    const results: Record<number, boolean> = {};
    criteria.forEach((criterion, index) => {
        const id = index + 1;
        results[id] = evaluateCriterion(criterion, doc);
    });

    // 2. If no pattern, default to ALL (AND)
    if (!pattern) {
        return Object.values(results).every(res => res === true);
    }

    // 3. Evaluate pattern string
    // Replace "1", "2", etc. with their boolean results
    let evalString = pattern;
    Object.keys(results).reverse().forEach(id => {
        // Use regex to replace exact match (prevent replacing "1" in "10")
        const regex = new RegExp(`\\b${id}\\b`, 'g');
        evalString = evalString.replace(regex, results[Number(id)].toString());
    });

    // Normalize logical operators for JS evaluation
    evalString = evalString.replace(/AND/g, '&&').replace(/OR/g, '||');

    try {
        // Use Function constructor instead of eval for a bit more safety
        // evalString looks like "(true && false) || true"
        return new Function(`return ${evalString}`)();
    } catch (error) {
        console.error('Error evaluating criteria pattern:', pattern, error);
        // Fallback to AND if pattern is invalid
        return Object.values(results).every(res => res === true);
    }
};

/**
 * Evaluates a single criterion against a document field
 */
const evaluateCriterion = (criterion: any, doc: any): boolean => {
    const { field, comparator, value } = criterion;
    const docValue = getFieldValue(doc, field);

    switch (comparator) {
        case 'is':
        case 'equals':
            return docValue == value;
        case 'is_not':
        case 'not_equals':
            return docValue != value;
        case 'contains':
            return String(docValue).toLowerCase().includes(String(value).toLowerCase());
        case 'not_contains':
            return !String(docValue).toLowerCase().includes(String(value).toLowerCase());
        case 'starts_with':
            return String(docValue).startsWith(String(value));
        case 'greater_than':
            return Number(docValue) > Number(value);
        case 'less_than':
            return Number(docValue) < Number(value);
        case 'greater_or_equal':
            return Number(docValue) >= Number(value);
        case 'less_or_equal':
            return Number(docValue) <= Number(value);
        case 'is_empty':
            return !docValue;
        case 'is_not_empty':
            return !!docValue;
        default:
            return false;
    }
};

/**
 * Gets value from document, handles nested fields (e.g., "customer.name")
 */
const getFieldValue = (doc: any, fieldPath: string): any => {
    if (!fieldPath) return undefined;

    // Map specialized fields if needed
    if (fieldPath === 'total') return doc.total;
    if (fieldPath === 'subtotal') return doc.subtotal;

    const parts = fieldPath.split('.');
    let value = doc;
    for (const part of parts) {
        if (value === null || value === undefined) return undefined;
        value = value[part];
    }
    return value;
};
