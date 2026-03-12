import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./dialog";
import { NativeSelect, type NativeSelectOption } from "./native-select";
import { Button } from "./button";

/**
 * Integration tests: NativeSelect inside Radix Dialog
 * Ensures no React 19 removeChild/insertBefore crashes.
 */

/* ── helpers ── */

/** Wraps NativeSelect in a controlled Dialog */
function DialogWithSelect({
  options,
  placeholder,
  label,
}: {
  options: NativeSelectOption[];
  placeholder?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>فتح</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription className="sr-only">test</DialogDescription>
        </DialogHeader>
        <NativeSelect
          value={value}
          onValueChange={setValue}
          options={options}
          placeholder={placeholder}
        />
        <p data-testid="selected-value">{value}</p>
      </DialogContent>
    </Dialog>
  );
}

/** Multiple NativeSelects in one Dialog (like ExpenseFormDialog) */
function DialogWithMultipleSelects() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("");
  const [property, setProperty] = useState("");

  const typeOptions: NativeSelectOption[] = [
    { value: "كهرباء", label: "كهرباء" },
    { value: "مياه", label: "مياه" },
    { value: "صيانة", label: "صيانة" },
  ];

  const propertyOptions: NativeSelectOption[] = [
    { value: "p1", label: "عقار 101 - الرياض" },
    { value: "p2", label: "عقار 102 - جدة" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>إضافة مصروف</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة مصروف جديد</DialogTitle>
          <DialogDescription className="sr-only">نموذج مصروف</DialogDescription>
        </DialogHeader>
        <NativeSelect
          value={type}
          onValueChange={setType}
          options={typeOptions}
          placeholder="اختر نوع المصروف"
        />
        <NativeSelect
          value={property}
          onValueChange={setProperty}
          options={propertyOptions}
          placeholder="اختر العقار"
        />
        <p data-testid="type-value">{type}</p>
        <p data-testid="property-value">{property}</p>
      </DialogContent>
    </Dialog>
  );
}

/** Dialog with form submission (like BeneficiaryFormDialog) */
function DialogWithFormAndSelect() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("beneficiary");
  const onSubmit = vi.fn();

  const roleOptions: NativeSelectOption[] = [
    { value: "admin", label: "ناظر" },
    { value: "beneficiary", label: "مستفيد" },
    { value: "accountant", label: "محاسب" },
    { value: "waqif", label: "واقف" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>إنشاء مستخدم</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إنشاء مستخدم جديد</DialogTitle>
          <DialogDescription className="sr-only">نموذج مستخدم</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(role);
          }}
        >
          <NativeSelect value={role} onValueChange={setRole} options={roleOptions} />
          <Button type="submit">حفظ</Button>
        </form>
        <p data-testid="role-value">{role}</p>
      </DialogContent>
    </Dialog>
  );
}

/* ── tests ── */

describe("NativeSelect داخل Dialog – اختبارات تكامل", () => {
  it("يفتح الحوار ويعرض NativeSelect بالخيارات", () => {
    const options = [
      { value: "a", label: "خيار أ" },
      { value: "b", label: "خيار ب" },
    ];
    render(<DialogWithSelect options={options} label="اختبار" placeholder="اختر" />);
    fireEvent.click(screen.getByText("فتح"));
    expect(screen.getByText("اختبار")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByText("اختر")).toBeInTheDocument();
  });

  it("يغيّر القيمة داخل الحوار بدون أخطاء", () => {
    const options = [
      { value: "a", label: "خيار أ" },
      { value: "b", label: "خيار ب" },
    ];
    render(<DialogWithSelect options={options} label="اختبار" />);
    fireEvent.click(screen.getByText("فتح"));

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "b" } });
    expect(screen.getByTestId("selected-value")).toHaveTextContent("b");
  });

  it("يدعم تغيير القيمة عدة مرات متتالية", () => {
    const options = [
      { value: "x", label: "X" },
      { value: "y", label: "Y" },
      { value: "z", label: "Z" },
    ];
    render(<DialogWithSelect options={options} label="تبديل" />);
    fireEvent.click(screen.getByText("فتح"));

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "x" } });
    fireEvent.change(select, { target: { value: "y" } });
    fireEvent.change(select, { target: { value: "z" } });
    expect(screen.getByTestId("selected-value")).toHaveTextContent("z");
  });

  it("يعمل مع عدة NativeSelect في نفس الحوار (نموذج المصروفات)", () => {
    render(<DialogWithMultipleSelects />);
    fireEvent.click(screen.getByText("إضافة مصروف"));

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);

    fireEvent.change(selects[0], { target: { value: "صيانة" } });
    fireEvent.change(selects[1], { target: { value: "p2" } });

    expect(screen.getByTestId("type-value")).toHaveTextContent("صيانة");
    expect(screen.getByTestId("property-value")).toHaveTextContent("p2");
  });

  it("يتبدّل بين القوائم المنسدلة المتعددة بدون تعارض", () => {
    render(<DialogWithMultipleSelects />);
    fireEvent.click(screen.getByText("إضافة مصروف"));

    const selects = screen.getAllByRole("combobox");
    // alternate between the two selects
    fireEvent.change(selects[0], { target: { value: "كهرباء" } });
    fireEvent.change(selects[1], { target: { value: "p1" } });
    fireEvent.change(selects[0], { target: { value: "مياه" } });

    expect(screen.getByTestId("type-value")).toHaveTextContent("مياه");
    expect(screen.getByTestId("property-value")).toHaveTextContent("p1");
  });

  it("يعمل مع إرسال النموذج والقيمة المحدّدة (نموذج إدارة المستخدمين)", () => {
    render(<DialogWithFormAndSelect />);
    fireEvent.click(screen.getByText("إنشاء مستخدم"));

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "accountant" } });
    expect(screen.getByTestId("role-value")).toHaveTextContent("accountant");

    // submit form
    fireEvent.click(screen.getByText("حفظ"));
  });

  it("يحتفظ بالقيمة الافتراضية عند فتح الحوار", () => {
    render(<DialogWithFormAndSelect />);
    fireEvent.click(screen.getByText("إنشاء مستخدم"));
    expect(screen.getByTestId("role-value")).toHaveTextContent("beneficiary");
  });

  it("لا يتعطل عند فتح وإغلاق وإعادة فتح الحوار", () => {
    const options = [{ value: "v", label: "Value" }];
    render(<DialogWithSelect options={options} label="تكرار" />);

    // open → change → close → reopen
    fireEvent.click(screen.getByText("فتح"));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "v" } });

    // close via Escape
    fireEvent.keyDown(document, { key: "Escape" });

    // reopen
    fireEvent.click(screen.getByText("فتح"));
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });
});
