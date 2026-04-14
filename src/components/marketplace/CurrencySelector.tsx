import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CurrencyContextType {
  currency: string;
  setCurrency: (c: string) => void;
  convert: (amountMYR: number) => number;
  symbol: string;
  format: (amountMYR: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "MYR",
  setCurrency: () => {},
  convert: (a) => a,
  symbol: "RM",
  format: (a) => `RM ${a.toFixed(2)}`,
});

export const useCurrency = () => useContext(CurrencyContext);

const SYMBOLS: Record<string, string> = { MYR: "RM", USD: "$", SGD: "S$" };

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState(() => localStorage.getItem("nocap_currency") || "MYR");
  const [rates, setRates] = useState<Record<string, number>>({ MYR: 1 });

  useEffect(() => {
    supabase
      .from("marketplace_exchange_rates")
      .select("to_currency, rate")
      .eq("from_currency", "MYR")
      .then(({ data }) => {
        const r: Record<string, number> = { MYR: 1 };
        data?.forEach((d) => { r[d.to_currency] = Number(d.rate); });
        setRates(r);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("nocap_currency", currency);
  }, [currency]);

  const convert = (amountMYR: number) => {
    const rate = rates[currency] ?? 1;
    return Math.round(amountMYR * rate * 100) / 100;
  };

  const symbol = SYMBOLS[currency] || currency;
  const format = (amountMYR: number) => `${symbol} ${convert(amountMYR).toFixed(2)}`;

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, symbol, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function CurrencySelectorWidget() {
  const { currency, setCurrency } = useCurrency();

  return (
    <Select value={currency} onValueChange={setCurrency}>
      <SelectTrigger className="h-7 w-20 text-[10px] border-white/10 bg-white/5 text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="MYR" className="text-xs">RM (MYR)</SelectItem>
        <SelectItem value="USD" className="text-xs">$ (USD)</SelectItem>
        <SelectItem value="SGD" className="text-xs">S$ (SGD)</SelectItem>
      </SelectContent>
    </Select>
  );
}
