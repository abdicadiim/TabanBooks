type SenderLike = {
  name?: string;
  email?: string;
  isVerified?: boolean;
  verified?: boolean;
};

const normalizeText = (value: any) => String(value ?? "").trim();

const extractSender = (response: any): SenderLike => {
  const direct = response?.data ?? response ?? {};
  const candidate =
    direct?.sender ||
    direct?.primarySender ||
    direct?.primary ||
    (Array.isArray(direct?.senders) ? direct.senders.find((item: any) => item?.isPrimary || item?.primary) : null) ||
    direct;

  return {
    name: normalizeText(candidate?.name),
    email: normalizeText(candidate?.email),
    isVerified: Boolean(candidate?.isVerified ?? candidate?.verified),
  };
};

export const resolveVerifiedPrimarySender = (
  response: any,
  fallbackName = "System",
  fallbackEmail = ""
) => {
  const sender = extractSender(response);

  return {
    name: sender.name || normalizeText(fallbackName) || "System",
    email: sender.email || normalizeText(fallbackEmail),
    isVerified: Boolean(sender.isVerified),
  };
};

export const formatSenderDisplay = (
  senderName?: string,
  senderEmail?: string,
  fallbackName = "System"
) => {
  const name = normalizeText(senderName) || normalizeText(fallbackName) || "System";
  const email = normalizeText(senderEmail);

  return email ? `${name} <${email}>` : name;
};
