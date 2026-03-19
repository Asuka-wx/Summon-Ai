import { TOTP } from "otpauth";
import QRCode from "qrcode";

export function createAdminTotp(email: string) {
  const totp = new TOTP({
    issuer: "SummonAI Admin",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    otpauthUri: totp.toString(),
  };
}

export async function createTotpQrCodeDataUrl(otpauthUri: string) {
  return QRCode.toDataURL(otpauthUri);
}

export function verifyTotpToken({
  secret,
  token,
}: {
  secret: string;
  token: string;
}) {
  const totp = new TOTP({
    issuer: "SummonAI Admin",
    secret,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  return totp.validate({ token, window: 1 }) !== null;
}
