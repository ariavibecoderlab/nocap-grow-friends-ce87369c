import jsPDF from "jspdf";

export interface SalesOrderData {
  storeName: string;
  logoUrl?: string | null;
  orderNumber: string;
  orderDate: string;
  status: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingAddress: string;
  notes?: string | null;
  items: { productName: string; quantity: number; unitPrice: number; subtotal: number }[];
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  trackingNumber?: string | null;
}

/** Pre-load a logo URL into a base64 data URL. Returns null on failure. */
async function loadLogoDataUrl(logoUrl: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = logoUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** Render one sales order onto the given jsPDF doc (on its current page). */
function renderOrder(doc: jsPDF, data: SalesOrderData, logoDataUrl: string | null) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = margin;

  const addLine = (label: string, value: string, yPos: number, labelWidth = 35) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(label, margin, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + labelWidth, yPos);
  };

  let logoLoaded = false;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, y, 18, 18);
      logoLoaded = true;
    } catch { /* skip */ }
  }

  const textX = logoLoaded ? margin + 22 : margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.storeName, textX, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text("SALES ORDER", textX, y + 13);
  doc.setTextColor(0);

  y += logoLoaded ? 24 : 20;

  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFontSize(9);
  addLine("Order #:", data.orderNumber, y);
  const dateStr = new Date(data.orderDate).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = new Date(data.orderDate).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
  doc.text(`${dateStr}  ${timeStr}`, pageWidth - margin, y, { align: "right" });
  y += 5;
  addLine("Status:", data.status.charAt(0).toUpperCase() + data.status.slice(1), y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Buyer Details", margin, y);
  y += 5;
  doc.setFontSize(9);
  addLine("Name:", data.buyerName, y); y += 5;
  addLine("Phone:", data.buyerPhone, y); y += 5;
  addLine("Email:", data.buyerEmail, y); y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Address:", margin, y);
  doc.setFont("helvetica", "normal");
  const addressLines = doc.splitTextToSize(data.shippingAddress, pageWidth - margin * 2 - 35);
  doc.text(addressLines, margin + 35, y);
  y += addressLines.length * 4 + 2;

  if (data.notes) { addLine("Notes:", data.notes, y); y += 5; }
  y += 4;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y - 3, pageWidth - margin * 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Product", margin + 2, y + 1);
  doc.text("Qty", pageWidth - margin - 55, y + 1, { align: "right" });
  doc.text("Unit Price", pageWidth - margin - 30, y + 1, { align: "right" });
  doc.text("Subtotal", pageWidth - margin - 2, y + 1, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const item of data.items) {
    if (y > 260) { doc.addPage(); y = margin; }
    const nameLines = doc.splitTextToSize(item.productName, 80);
    doc.text(nameLines, margin + 2, y);
    doc.text(String(item.quantity), pageWidth - margin - 55, y, { align: "right" });
    doc.text(`RM ${item.unitPrice.toFixed(2)}`, pageWidth - margin - 30, y, { align: "right" });
    doc.text(`RM ${item.subtotal.toFixed(2)}`, pageWidth - margin - 2, y, { align: "right" });
    y += nameLines.length * 4 + 2;
    doc.setDrawColor(230);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
  }
  y += 4;

  const totalsX = pageWidth - margin - 2;
  const labelX = pageWidth - margin - 50;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", labelX, y, { align: "right" });
  doc.text(`RM ${data.subtotal.toFixed(2)}`, totalsX, y, { align: "right" }); y += 5;
  doc.text("Shipping", labelX, y, { align: "right" });
  doc.text(`RM ${data.shippingFee.toFixed(2)}`, totalsX, y, { align: "right" }); y += 5;

  doc.setDrawColor(180);
  doc.line(labelX - 10, y - 2, totalsX, y - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total", labelX, y + 2, { align: "right" });
  doc.text(`RM ${data.totalAmount.toFixed(2)}`, totalsX, y + 2, { align: "right" }); y += 10;

  if (data.trackingNumber) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    addLine("Tracking #:", data.trackingNumber, y);
  }

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generated by NoCap Pay · ${new Date().toLocaleString("en-MY")}`, pageWidth / 2, 285, { align: "center" });
  doc.setTextColor(0);
}

/** Generate and download a single sales order PDF. */
export async function generateSalesOrderPdf(data: SalesOrderData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataUrl = data.logoUrl ? await loadLogoDataUrl(data.logoUrl) : null;
  renderOrder(doc, data, logoDataUrl);
  doc.save(`order-${data.orderNumber}.pdf`);
}

/** Generate and download a combined PDF with multiple sales orders (one per page). */
export async function generateBulkSalesOrderPdf(orders: SalesOrderData[]) {
  if (orders.length === 0) return;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Pre-load logo once (all orders share the same store)
  const logoDataUrl = orders[0].logoUrl ? await loadLogoDataUrl(orders[0].logoUrl) : null;

  for (let i = 0; i < orders.length; i++) {
    if (i > 0) doc.addPage();
    renderOrder(doc, orders[i], logoDataUrl);
  }

  doc.save(`sales-orders-${orders.length}.pdf`);
}
