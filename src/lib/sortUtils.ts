/**
 * Universal Table Sorting Utilities
 */

export type SortDirection = 'asc' | 'desc' | null;

export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return '';
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return '';
    current = current[part];
  }
  return current;
}

export function sortTableData<T extends Record<string, any> = any>(
  data: T[],
  sortKey: string | null,
  sortDirection: SortDirection
): T[] {
  if (!sortKey || !sortDirection || !data || !data.length) {
    return data;
  }

  return [...data].sort((a, b) => {
    let valA = getNestedValue(a, sortKey);
    let valB = getNestedValue(b, sortKey);

    // Handle null/undefined
    if (valA === null || valA === undefined) valA = '';
    if (valB === null || valB === undefined) valB = '';

    // If both are numbers
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    // Try converting strings that represent numbers (e.g. "44008000" or numeric IDs)
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean' && String(valA).trim() !== '' && String(valB).trim() !== '') {
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    }

    // Date parsing check
    const dateA = Date.parse(String(valA));
    const dateB = Date.parse(String(valB));
    if (!isNaN(dateA) && !isNaN(dateB) && String(valA).includes('-') && String(valB).includes('-')) {
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }

    // Standard string comparison
    const strA = String(valA).toLowerCase().trim();
    const strB = String(valB).toLowerCase().trim();

    if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
    if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}
