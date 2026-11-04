/**
 * Official document registry hook — utils stay free of the backend client.
 * التسجيل الفعلي يُحقن من `@/lib/pdf/installDocumentRegistrar` عند الإقلاع.
 */
export interface IssueDocumentInput {
  docType: string;
  contentHash: string;
  pageCount: number;
  fiscalYearId?: string | null;
}

export interface IssuedDocumentRef {
  docNumber: string;
  verificationCode: string;
  issuedAt: string;
}

export type DocumentRegistrar = (input: IssueDocumentInput) => Promise<IssuedDocumentRef | null>;

let registrar: DocumentRegistrar | null = null;

export const setDocumentRegistrar = (fn: DocumentRegistrar | null): void => {
  registrar = fn;
};

export const getDocumentRegistrar = (): DocumentRegistrar | null => registrar;

/** يشتق نوع الوثيقة من اسم الملف (حروف لاتينية صغيرة وشرطة سفلية فقط). */
export const docTypeFromFilename = (filename: string): string => {
  const ascii = filename.replace(/\.pdf$/i, '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
  const trimmed = ascii.slice(0, 40).replace(/_+$/g, '');
  return trimmed.length >= 2 ? trimmed : 'report';
};

export const verifyDocumentUrl = (origin: string, code: string): string =>
  `${origin}/verify/document/${code}`;

export const sha256Hex = async (bytes: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
};
