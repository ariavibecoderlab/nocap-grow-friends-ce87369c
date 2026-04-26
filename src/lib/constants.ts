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

export const TERMINOLOGY = {
  vaBalance: "VA Balance",
  yourVaBalance: "Your VA Balance",
  newVaBalance: "New VA Balance",
  vaBalanceAfterPayment: "VA Balance After Payment",
  insufficientVaBalance: "Insufficient VA Balance",
} as const;
