export const MALAYSIAN_BANKS = [
  "Maybank",
  "CIMB Bank",
  "Public Bank",
  "RHB Bank",
  "Hong Leong Bank",
  "AmBank",
  "Bank Islam",
  "Bank Rakyat",
  "Bank Muamalat",
  "Affin Bank",
  "Alliance Bank",
  "OCBC Bank",
  "HSBC Bank",
  "Standard Chartered",
  "UOB Bank",
  "BSN (Bank Simpanan Nasional)",
  "Agrobank",
] as const;

export type MalaysianBank = (typeof MALAYSIAN_BANKS)[number];
