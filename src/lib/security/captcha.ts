export async function verifyCaptcha(token: string) {
  const secret = process.env.HCAPTCHA_SECRET;

  if (!secret) {
    throw new Error("CAPTCHA_NOT_CONFIGURED");
  }

  const response = await fetch("https://api.hcaptcha.com/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: `response=${encodeURIComponent(token)}&secret=${encodeURIComponent(secret)}`,
  });

  const data = (await response.json()) as {
    success?: boolean;
  };

  if (!data.success) {
    throw new Error("CAPTCHA_FAILED");
  }

  return true;
}
