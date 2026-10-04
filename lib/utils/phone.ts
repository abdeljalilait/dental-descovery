export interface WhatsAppResult {
  e164: string;
  link: string;
  dialable: boolean;
}

const PLACEHOLDER = /^(?:212)?(?:6000000\d{2,3}|522000000)$/;

export function toWhatsApp(raw?: string | null): WhatsAppResult {
  if (!raw) return { e164: "", link: "", dialable: false };
  if (/X{2,}/i.test(raw)) return { e164: "", link: "", dialable: false };

  const digits = raw.replace(/\D/g, "");
  if (PLACEHOLDER.test(digits.replace(/^0/, ""))) {
    return { e164: "", link: "", dialable: false };
  }

  let national = digits;
  if (national.startsWith("00212")) national = national.slice(5);
  else if (national.startsWith("212")) national = national.slice(3);
  if (national.startsWith("0")) national = national.slice(1);

  if (!/^[67]/.test(national) || national.length !== 9) {
    return { e164: "", link: "", dialable: false };
  }

  const e164 = `+212${national}`;
  return { e164, link: `https://wa.me/${e164.replace(/\D/g, "")}`, dialable: true };
}
