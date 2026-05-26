import { useEffect, useState } from "react";

interface Props {
  endTime: string;
  onExpired?: () => void;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

const ONE_HOUR_S = 3600;
const SIX_HOURS_S = 21600;

function getTimeLeft(endTime: string): TimeLeft {
  const totalSeconds = Math.max(
    0,
    Math.floor((new Date(endTime).getTime() - Date.now()) / 1000)
  );
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const FlashSaleCountdown = ({ endTime, onExpired }: Props) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    getTimeLeft(endTime)
  );

  useEffect(() => {
    if (timeLeft.totalSeconds === 0) {
      onExpired?.();
      return;
    }

    const id = setInterval(() => {
      const next = getTimeLeft(endTime);
      setTimeLeft(next);
      if (next.totalSeconds === 0) {
        clearInterval(id);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [endTime, onExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  const colorClass =
    timeLeft.totalSeconds < ONE_HOUR_S
      ? "text-red-400"
      : timeLeft.totalSeconds < SIX_HOURS_S
      ? "text-yellow-400"
      : "text-white";

  if (timeLeft.totalSeconds === 0) {
    return (
      <span className={`font-mono font-semibold ${colorClass}`}>Ended</span>
    );
  }

  return (
    <span className={`font-mono font-semibold tabular-nums ${colorClass}`}>
      {timeLeft.hours > 0
        ? `Ends in ${timeLeft.hours}h ${pad(timeLeft.minutes)}m ${pad(
            timeLeft.seconds
          )}s`
        : `${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`}
    </span>
  );
};

export default FlashSaleCountdown;
