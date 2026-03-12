import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { NativeSelect } from "./native-select";

const options = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C", disabled: true },
];

const noop = () => {};

describe("NativeSelect", () => {
  it("يعرض جميع الخيارات", () => {
    render(<NativeSelect value="" onValueChange={noop} options={options} />);
    expect(screen.getByRole("combobox").querySelectorAll("option")).toHaveLength(3);
  });

  it("يعرض placeholder كخيار معطّل", () => {
    render(<NativeSelect value="" onValueChange={noop} options={options} placeholder="اختر" />);
    const ph = screen.getByText("اختر") as HTMLOptionElement;
    expect(ph.tagName).toBe("OPTION");
    expect(ph.disabled).toBe(true);
  });

  it("لا يعرض خيار فارغ بدون placeholder", () => {
    render(<NativeSelect value="a" onValueChange={noop} options={options} />);
    const allOptions = screen.getByRole("combobox").querySelectorAll("option");
    expect(allOptions).toHaveLength(3);
  });

  it("يستدعي onValueChange بالقيمة الصحيحة", () => {
    const handler = vi.fn();
    render(<NativeSelect value="a" onValueChange={handler} options={options} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
    expect(handler).toHaveBeenCalledWith("b");
  });

  it("يكون معطّلاً عند تمرير disabled", () => {
    render(<NativeSelect value="a" onValueChange={noop} options={options} disabled />);
    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("يعطّل الخيار الفردي", () => {
    render(<NativeSelect value="a" onValueChange={noop} options={options} />);
    const opt = screen.getByText("Option C") as HTMLOptionElement;
    expect(opt.disabled).toBe(true);
  });

  it("يعكس القيمة المحددة", () => {
    render(<NativeSelect value="b" onValueChange={noop} options={options} />);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("b");
  });

  it("يطبّق className على العنصر الخارجي", () => {
    const { container } = render(
      <NativeSelect value="a" onValueChange={noop} options={options} className="custom-wrap" />,
    );
    expect(container.firstElementChild).toHaveClass("custom-wrap");
  });

  it("يطبّق triggerClassName على عنصر select", () => {
    render(
      <NativeSelect value="a" onValueChange={noop} options={options} triggerClassName="custom-trigger" />,
    );
    expect(screen.getByRole("combobox")).toHaveClass("custom-trigger");
  });

  it("يعرض أيقونة ChevronDown", () => {
    const { container } = render(<NativeSelect value="a" onValueChange={noop} options={options} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("يمرر ref للعنصر الخارجي", () => {
    const ref = createRef<HTMLDivElement>();
    render(<NativeSelect ref={ref} value="a" onValueChange={noop} options={options} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass("relative");
  });
});
