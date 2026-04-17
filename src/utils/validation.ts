/** Відповідає бекенду: UPC max 12, телефон + та 1–12 цифр, назви/виробник max 50, характеристики товару max 100 (ProductRequest). */

export const MAX_UPC_LEN = 12;
export const MAX_NAME_LEN = 50;
export const MAX_PRODUCER_LEN = 50;
export const MAX_CHARACTERISTICS_LEN = 100;
export const MAX_CATEGORY_NAME_LEN = 50;
export const MAX_PHONE_LEN = 13;

/** Як у `PhoneNumberValidator` на бекенді: `^\\+[0-9]{1,12}$` */
export const PHONE_PATTERN = /^\+[0-9]{1,12}$/;

export const PHONE_HINT = 'Формат телефону як на бекенді: + і 1–12 цифр (усього до 13 символів).';

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value) && value.length <= MAX_PHONE_LEN;
}

export function isValidUpc(value: string): boolean {
  return value.trim().length > 0 && value.trim().length <= MAX_UPC_LEN;
}

export function clampStr(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}
