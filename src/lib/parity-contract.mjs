export function studioAuthorization(customerId, customerSecret) {
  const id = typeof customerId === "string" ? customerId.trim() : "";
  const secret =
    typeof customerSecret === "string" ? customerSecret.trim() : "";
  if (!id)
    throw new Error(
      "Missing required environment variable: AGORA_CUSTOMER_ID",
    );
  if (!secret)
    throw new Error(
      "Missing required environment variable: AGORA_CUSTOMER_SECRET",
    );
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

export function sanitizeAgoraProject(value) {
  if (typeof value !== "object" || value === null) return null;
  const project = value;
  const id = typeof project.id === "string" ? project.id : "";
  const name = typeof project.name === "string" ? project.name : "";
  const appId =
    typeof project.vendor_key === "string" ? project.vendor_key : "";
  if (!id || !name || !appId) return null;

  return {
    id,
    name,
    appId,
    status: project.status === 0 ? 0 : 1,
    created: typeof project.created === "number" ? project.created : null,
  };
}
