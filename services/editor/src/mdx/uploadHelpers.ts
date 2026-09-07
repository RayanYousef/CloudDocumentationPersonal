export const fileExtension = (name: string): string => { const i = name.lastIndexOf('.'); return i >= 0 ? name.slice(i + 1).toLowerCase() : ''; };
export const sanitizeFileName = (name: string): string => name.trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '');
export const readFileBytes = (file: File): Promise<Uint8Array> => file.arrayBuffer().then((b) => new Uint8Array(b));
