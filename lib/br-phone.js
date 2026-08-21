'use strict';

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

class PhoneValidationError extends Error {
  constructor(message = 'Informe um telefone brasileiro válido.') {
    super(message);
    this.name = 'PhoneValidationError';
  }
}

function normalizeBrazilianPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) digits = digits.slice(2);
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith('0')) digits = digits.slice(1);

  if (digits.length !== 10 && digits.length !== 11) throw new PhoneValidationError();
  if (/^(\d)\1+$/.test(digits)) throw new PhoneValidationError();
  if ('01234567890'.includes(digits) || '09876543210'.includes(digits)) throw new PhoneValidationError();

  const ddd = Number(digits.slice(0, 2));
  if (!VALID_DDDS.has(ddd)) throw new PhoneValidationError();

  const subscriber = digits.slice(2);
  if (subscriber.length === 9 && subscriber[0] !== '9') throw new PhoneValidationError();
  if (subscriber.length === 8 && !/[2-5]/.test(subscriber[0])) throw new PhoneValidationError();
  if (/^(\d)\1+$/.test(subscriber)) throw new PhoneValidationError();

  return digits;
}

function tryNormalizeBrazilianPhone(value) {
  try {
    return normalizeBrazilianPhone(value);
  } catch (error) {
    if (error instanceof PhoneValidationError) return null;
    throw error;
  }
}

module.exports = {
  PhoneValidationError,
  normalizeBrazilianPhone,
  tryNormalizeBrazilianPhone,
};
