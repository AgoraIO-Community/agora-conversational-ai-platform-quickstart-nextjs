function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

export function getAppId(): string {
  return required("AGORA_APP_ID");
}

export function getAppPublicUrl(requestUrl: string): string {
  const configured = process.env.APP_PUBLIC_URL?.trim().replace(/\/+$/, "");
  return configured || new URL(requestUrl).origin;
}
