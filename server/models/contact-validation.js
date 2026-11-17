import CustomError from '../shared/customError.js';

const EMAIL =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const RUSSIAN_PHONE =
  /^\+7\d{10}$/;

const INTERNATIONAL_PHONE =
  /^\+[1-9]\d{7,14}$/;

const TELEGRAM_ID =
  /^#[0-9]{7,10}$/;

const TELEGRAM_NICKNAME =
  /^@[A-Za-z0-9_]{5,32}$/;

const VKONTAKTE =
  /^[A-Za-z0-9](?:[A-Za-z0-9_]|(?:\.(?!\.))){3,30}[A-Za-z0-9]$/;

const INSTAGRAM =
  /^[A-Za-z0-9_](?:[A-Za-z0-9_]|(?:\.(?!\.))){0,28}[A-Za-z0-9_]$/;

const FACEBOOK =
  /^[A-Za-z0-9_.]{5,}$/;

const WEBSITE =
  /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

function phoneExpression(value) {
  return value.startsWith('+7')
    ? RUSSIAN_PHONE
    : INTERNATIONAL_PHONE;
}

export function regularExpression(
  type,
  value,
) {
  switch (type) {
    case 'email':
      return EMAIL;

    case 'phoneNumber':
    case 'whatsApp':
    case 'telegramPhoneNumber':
      return phoneExpression(value);

    case 'telegramId':
      return TELEGRAM_ID;

    case 'telegramNickname':
      return TELEGRAM_NICKNAME;

    case 'vKontakte':
      return VKONTAKTE;

    case 'instagram':
      return INSTAGRAM;

    case 'facebook':
      return FACEBOOK;

    case 'website':
      return WEBSITE;

    case 'otherContact':
      return null;

    default:
      throw new CustomError(
        'ERRORS.VALIDATION',
        422,
        {
          field: 'type',
          value: type,
        },
      );
  }
}
