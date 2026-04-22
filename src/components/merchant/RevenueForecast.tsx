import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface Props {
  dailyData: { date: string; revenue: number }[];
}

export default function RevenueForecast({ dailyData }: Props) {
  const forecast = useMemo(() => {
    if (dailyData.length < 7) return null;

    // Simple linear regression on last 14 days
    const recent = dailyData.slice(-14);
    const n = recent.length;
    const sumX = recent.reduce((s, _, i) => s + i, 0);
    const sumY = recent.reduce((s, d) => s + d.revenue, 0);
    const sumXY = recent.reduce((s, d, i) => s + i * d.revenue, 0);
    const sumXX = recent.reduce((s, _, i) => s + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 7-day moving average
    const movingAvg = dailyData.slice(-7).reduce((s, d) => s + d.revenue, 0) / 7;

    // Project next 7 days
    const projections = Array.from({ length: 7 }, (_, i) => ({
      date: `+${i + 1}d`,
      revenue: null as number | null,
      projected: Math.max(0, Math.round((intercept + slope * (n + i)) * 100) / 100),
    }));

    const combined = [
      ...dailyData.slice(-14).map(d => ({ ...d, projected: null as number | null })),
      ...projections,
    ];

    const weeklyGrowth = dailyData.length >= 14
      ? ((dailyData.slice(-7).reduce((s, d) => s + d.revenue, 0) /
          Math.max(1, dailyData.slice(-14, -7).reduce((s, d) => s + d.revenue, 0))) - 1) * 100
      : 0;

    const projectedWeekly = projections.reduce((s, p) => s + (p.projected || 0), 0);

    return { combined, movingAvg, weeklyGrowth, projectedWeekly, slope };
  }, [dailyData]);

  if (!forecast) return null;

  const isGrowing = forecast.slope > 0;

  return (
    <Card className="border-white/10 bg-white/5">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-white">Revenue Forecast</p>
          <div className="flex items-center gap-1">
            {isGrowing ? (
              <TrendingUp className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
            <span className={`text-[10px] font-semibold ${isGrowing ? "text-green-400" : "text-red-400"}`}>
              {forecast.weeklyGrowth >= 0 ? "+" : ""}{forecast.weeklyGrowth.toFixed(1)}% WoW
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center">
            <p className="text-[10px] text-white/40">7-Day Avg</p>
            <p className="text-sm font-bold text-secondary">RM {forecast.movingAvg.toFixed(2)}/day</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-white/40">Next 7-Day Proj.</p>
            <p className="text-sm font-bold text-white">RM {forecast.projectedWeekly.toFixed(2)}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={forecast.combined}>
            <XAxis dataKey="date" tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }} width={40} />
            <Tooltip contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11, color: "#fff" }} />
            <ReferenceLine x={forecast.combined.length - 8 >= 0 ? forecast.combined[forecast.combined.length - 8]?.date : undefined} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="revenue" stroke="#FFC800" strokeWidth={2} dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="projected" stroke="#FFC800" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[9px] text-white/20 text-center mt-1">Dotted line = projected (linear trend)</p>
      </CardContent>
    </Card>
  );
}
