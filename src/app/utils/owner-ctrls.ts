//src\app\utils\owner-ctrls.ts


export const normalize = (v: string | null | undefined) => (v ?? '').trim();
export const lightNormalize = (v: string | null | undefined) => (v ?? '').trim() !== '' ? (v ?? '').trim() : null;

export const isFieldEqual = (
  newValue: number | null,
  oldValue: number | null
) =>
  (!newValue && !oldValue) ||
  (newValue != null && oldValue != null && newValue === oldValue);

export function completeContact(value: string, type: string) {
  switch (type) {
    case 'phoneNumber':
    case 'telegramPhoneNumber':
    case 'whatsApp':
      return value.trim().replace(/[^0-9+]/g, '');
    default:
      return value.trim();
  }
}

// Pass a translator function instead of using TranslateService directly
type TFn = (key: string, params?: Record<string, unknown>) => string;

/** Build HTML (string) for duplicates using provided translator */
export function buildDuplicateInfoMessage(
  translate: TFn,
  nameOwners: string[],
  contactDups: Array<{ type: string; content: string; owners: string[] }>
): string {
  let html = '';

  if (nameOwners.length === 1) {
    html += translate('PRIME_CONFIRM.NAMES_DUPLICATE', { owner: nameOwners[0] });
  } else if (nameOwners.length > 1) {
    const ownersList = nameOwners.map((o) => `- ${o}`).join('\n');
    html += translate('PRIME_CONFIRM.NAMES_DUPLICATES', { owners: ownersList });
  }

  for (const { type, content, owners } of contactDups) {
    if (!owners?.length) continue;
    if (owners.length === 1) {
      html += translate('PRIME_CONFIRM.CONTACT_DUPLICATE', {
        type,
        content,
        owner: owners[0],
      });
    } else {
      const ownersList = owners.map((o) => `- ${o}`).join('\n');
      html += translate('PRIME_CONFIRM.CONTACT_DUPLICATES', {
        type,
        content,
        owners: ownersList,
      });
    }
  }
  return html;
}
