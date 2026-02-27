import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Capture Navigate props
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: (props: any) => {
      mockNavigate(props);
      return <div data-testid="navigate" data-to={props.to} />;
    },
  };
});

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    render(
      <MemoryRouter>
        <ProtectedRoute><div>محتوى</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.queryByText("محتوى")).not.toBeInTheDocument();
    // Loader should be present (animate-spin class)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("redirects to /auth when user is not logged in", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute><div>محتوى</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/auth");
  });

  it("renders children when user is logged in without role restriction", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "admin", loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute><div>محتوى محمي</div></ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText("محتوى محمي")).toBeInTheDocument();
  });

  it("renders children when user has allowed role", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "beneficiary", loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["admin", "beneficiary"]}>
          <div>مستفيد</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText("مستفيد")).toBeInTheDocument();
  });

  it("redirects to /unauthorized when user role is not allowed", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "waqif", loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["admin"]}>
          <div>محتوى</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/unauthorized");
  });

  it("shows verification message when loading is done but role is null", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: null, loading: false, signOut: vi.fn() });
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["admin"]}>
          <div>محتوى</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    // loading=false + role=null → shows verification spinner with sign out button
    expect(screen.getByText('جاري التحقق من الصلاحيات...')).toBeInTheDocument();
    expect(screen.getByText('تسجيل الخروج')).toBeInTheDocument();
  });

  it("shows loading spinner when role is loading", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: null, loading: true });
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["admin"]}>
          <div>محتوى</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    // loading=true → spinner (handled by the first loading check)
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("admin can access admin-only routes", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "admin", loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["admin"]}>
          <div>لوحة تحكم</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText("لوحة تحكم")).toBeInTheDocument();
  });

  it("beneficiary cannot access admin routes", () => {
    mockUseAuth.mockReturnValue({ user: { id: "1" }, role: "beneficiary", loading: false });
    render(
      <MemoryRouter>
        <ProtectedRoute allowedRoles={["admin"]}>
          <div>لوحة تحكم</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/unauthorized");
  });
});
