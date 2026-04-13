import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Zap } from "lucide-react";

interface Courier {
  id: string;
  name: string;
  estimate: string;
  price: number;
  icon: typeof Truck;
}

const COURIERS: Courier[] = [
  { id: "standard", name: "Standard Delivery", estimate: "3-5 business days", price: 0, icon: Package },
  { id: "express", name: "Express Delivery", estimate: "1-2 business days", price: 5.00, icon: Truck },
  { id: "same-day", name: "Same Day Delivery", estimate: "Today", price: 12.00, icon: Zap },
];

interface Props {
  flatRate: number;
  onSelect?: (courierId: string, price: number) => void;
}

export default function CourierSelector({ flatRate, onSelect }: Props) {
  const [selected, setSelected] = useState("standard");

  const couriers = COURIERS.map(c => ({
    ...c,
    price: c.id === "standard" ? flatRate : flatRate + c.price,
  }));

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">Delivery Method</p>
      {couriers.map(courier => {
        const Icon = courier.icon;
        const isSelected = selected === courier.id;
        return (
          <Card
            key={courier.id}
            className={`border cursor-pointer transition-all ${
              isSelected
                ? "border-secondary/50 bg-secondary/10"
                : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
            onClick={() => {
              setSelected(courier.id);
              onSelect?.(courier.id, courier.price);
            }}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                isSelected ? "bg-secondary/20" : "bg-white/5"
              }`}>
                <Icon className={`h-4 w-4 ${isSelected ? "text-secondary" : "text-white/40"}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/70"}`}>
                  {courier.name}
                </p>
                <p className="text-[10px] text-white/40">{courier.estimate}</p>
              </div>
              <div className="text-right">
                {courier.price === 0 ? (
                  <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">Free</Badge>
                ) : (
                  <p className={`text-sm font-semibold ${isSelected ? "text-secondary" : "text-white/60"}`}>
                    RM {courier.price.toFixed(2)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
      <p className="text-[10px] text-white/30 text-center">
        Courier integration coming soon — currently using flat-rate shipping
      </p>
    </div>
  );
}
