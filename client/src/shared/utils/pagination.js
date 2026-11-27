export const PAGE_SIZE = 10;

export const getTotalPages = (totalItems) => Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
