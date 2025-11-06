//src\app\utils\user-diff.ts


export const normalize = (v: string | null | undefined) => (v ?? '').trim();

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
  nameUsers: string[],
  contactDups: Array<{ type: string; content: string; users: string[] }>
): string {
  let html = '';

  if (nameUsers.length === 1) {
    html += translate('PRIME_CONFIRM.NAMES_DUPLICATE', { user: nameUsers[0] });
  } else if (nameUsers.length > 1) {
    const usersList = nameUsers.map((u) => `- ${u}`).join('\n');
    html += translate('PRIME_CONFIRM.NAMES_DUPLICATES', { users: usersList });
  }

  for (const { type, content, users } of contactDups) {
    if (!users?.length) continue;
    if (users.length === 1) {
      html += translate('PRIME_CONFIRM.CONTACT_DUPLICATE', {
        type,
        content,
        user: users[0],
      });
    } else {
      const usersList = users.map((u) => `- ${u}`).join('\n');
      html += translate('PRIME_CONFIRM.CONTACT_DUPLICATES', {
        type,
        content,
        users: usersList,
      });
    }
  }
  return html;
}
