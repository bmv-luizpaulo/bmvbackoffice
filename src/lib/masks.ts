// This is a new file: src/lib/masks.ts

export function formatCPF(value: string) {
  if (!value) return "";
  value = value.replace(/\D/g, ''); // Remove all non-digit characters
  value = value.slice(0, 11); // Limit to 11 digits

  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d)/, '$1.$2');
  value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

  return value;
}

export function formatPhone(value: string) {
  if (!value) return "";
  value = value.replace(/\D/g, ''); // Remove all non-digit characters
  value = value.slice(0, 11); // Limit to 11 digits

  if (value.length > 10) {
    // (XX) XXXXX-XXXX
    value = value.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
  } else if (value.length > 5) {
    // (XX) XXXX-XXXX
    value = value.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
  } else if (value.length > 2) {
    // (XX) XXXX
    value = value.replace(/^(\d\d)(\d*)/, '($1) $2');
  } else {
    // (XX
    if (value.length > 0) {
      value = value.replace(/^(\d*)/, '($1');
    }
  }

  return value;
}
