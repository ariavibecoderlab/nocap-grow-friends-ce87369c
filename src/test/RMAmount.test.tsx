import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RMAmount } from "@/components/RMAmount";

describe("RMAmount", () => {
  it("renders RM 0.00 for null/undefined/NaN/Infinity", () => {
    for (const v of [null, undefined, NaN, Infinity, -Infinity, "abc", ""] as const) {
      const { container, unmount } = render(<RMAmount value={v as never} />);
      expect(container.textContent).toBe("RM 0.00");
      unmount();
    }
  });

  it("formats finite numbers with grouping + 2 decimals", () => {
    const { container } = render(<RMAmount value={1234.5} />);
    expect(container.textContent).toBe("RM 1,234.50");
  });

  it("emits a <data> element with the numeric value attribute", () => {
    const { container } = render(<RMAmount value={1234.5} />);
    const data = container.querySelector("data");
    expect(data).not.toBeNull();
    expect(data!.getAttribute("value")).toBe("1,234.50");
  });

  it("renders negatives with leading minus inside the symbol", () => {
    const { container } = render(<RMAmount value={-9.9} />);
    expect(container.textContent).toBe("-RM 9.90");
  });

  it("delta mode prefixes positive values with +", () => {
    const { container } = render(<RMAmount value={12.5} sign="delta" />);
    expect(container.textContent).toBe("+RM 12.50");
  });

  it("delta mode renders zero as RM 0.00 (no sign)", () => {
    const { container } = render(<RMAmount value={0} sign="delta" />);
    expect(container.textContent).toBe("RM 0.00");
  });

  it("negative mode forces a leading minus on positive inputs", () => {
    const { container } = render(<RMAmount value={5} sign="negative" />);
    expect(container.textContent).toBe("-RM 5.00");
  });

  it("hideSymbol drops the RM prefix", () => {
    const { container } = render(<RMAmount value={1000} hideSymbol />);
    expect(container.textContent).toBe("1,000.00");
  });

  it("noGrouping removes thousands separators", () => {
    const { container } = render(<RMAmount value={1234.5} noGrouping />);
    expect(container.textContent).toBe("RM 1234.50");
  });

  it("as='span' renders a span instead of data", () => {
    const { container } = render(<RMAmount value={1} as="span" />);
    expect(container.querySelector("data")).toBeNull();
    expect(container.querySelector("span")).not.toBeNull();
  });
});
