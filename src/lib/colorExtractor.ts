// Extract dominant accent color from an image URL via canvas sampling
export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const w = (canvas.width = 64);
        const h = (canvas.height = 64);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        // Bucket colors by quantizing to a 4-bit per channel grid; pick most saturated frequent
        const buckets = new Map<string, { count: number; r: number; g: number; b: number; sat: number }>();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 200) continue;
          // skip near-white & near-black
          const max = Math.max(r, g, b), min = Math.min(r, g, b);
          if (max < 30 || min > 230) continue;
          const sat = max === 0 ? 0 : (max - min) / max;
          if (sat < 0.2) continue; // skip greys
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
          const cur = buckets.get(key);
          if (cur) {
            cur.count++;
          } else {
            buckets.set(key, { count: 1, r, g, b, sat });
          }
        }
        if (buckets.size === 0) return resolve(null);
        // Score: count * (1 + sat)
        let best: { r: number; g: number; b: number } | null = null;
        let bestScore = -1;
        buckets.forEach((v) => {
          const score = v.count * (1 + v.sat);
          if (score > bestScore) { bestScore = score; best = { r: v.r, g: v.g, b: v.b }; }
        });
        if (!best) return resolve(null);
        const hex = "#" + [best.r, best.g, best.b].map((n) => n.toString(16).padStart(2, "0")).join("");
        resolve(hex.toUpperCase());
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
