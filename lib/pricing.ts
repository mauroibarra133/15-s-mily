"use server";

export interface PricingConfig {
  serverTime: string;
  isEarly: boolean;
  allowInstallments: boolean;
  installmentWindow: number | null; // 1, 2, 3, 4 corresponding to Aug, Sep, Oct, Nov
  prices: Record<string, number>;
  installmentPrices: Record<string, number>;
}

// Ticket pricing threshold:
// Early Price: Until 10/11/2026 (Argentina time 23:59:59-03:00)
// Late Price: From 11/11/2026 onwards
export async function getCurrentPricingConfig(): Promise<PricingConfig> {
  const now = new Date();

  // Convert UTC to Argentina Time (America/Argentina/Buenos_Aires)
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || "0");

  const arYear = getPart("year");
  const arMonth = getPart("month"); // 1-indexed (1-12)
  const arDay = getPart("day");
  const arHour = getPart("hour");
  const arMinute = getPart("minute");
  const arSecond = getPart("second");

  // Reconstruct Argentina Time representation in local Date
  const argentinaTime = new Date(arYear, arMonth - 1, arDay, arHour, arMinute, arSecond);

  // Deadline is November 10th, 2026 at 23:59:59
  const deadline = new Date(2026, 10, 10, 23, 59, 59); // Month is 0-indexed (10 = November)

  const isEarly = argentinaTime.getTime() <= deadline.getTime();

  // Price matrix
  const prices: Record<string, number> = isEarly
    ? {
        adulto: 80000,
        menor_3_11: 40000,
        menor_0_2: 0,
        adolescente: 55000,
        trasnoche: 35000,
      }
    : {
        adulto: 90000,
        menor_3_11: 50000,
        menor_0_2: 0,
        adolescente: 65000,
        trasnoche: 45000,
      };

  // Installment configuration:
  // Allow installments permanently so guests can advance or prepay installments at any time of the year.
  const allowInstallments = true;
  let installmentWindow: number | null = null;

  if (arYear === 2026) {
    if (arMonth <= 8) {
      installmentWindow = 1;
    } else if (arMonth === 9) {
      installmentWindow = 2;
    } else if (arMonth === 10) {
      installmentWindow = 3;
    } else if (arMonth === 11) {
      installmentWindow = 4;
    }
  }

  const installmentPrices: Record<string, number> = {};
  for (const [key, val] of Object.entries(prices)) {
    installmentPrices[key] = Math.round(val / 4);
  }

  return {
    serverTime: now.toISOString(),
    isEarly,
    allowInstallments,
    installmentWindow,
    prices,
    installmentPrices,
  };
}
