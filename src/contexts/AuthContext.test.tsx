import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./AuthContext";
import { BrowserRouter } from "react-router-dom";

// Mock supabase client
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockSignUp = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: any[]) => mockOnAuthStateChange(...args),
      getSession: () => mockGetSession(),
      signInWithPassword: (creds: any) => mockSignIn(creds),
      signUp: (opts: any) => mockSignUp(opts),
      signOut: () => mockSignOut(),
    },
    from: (table: string) => {
      mockFrom(table);
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { value: "15" }, error: null }),
          }),
        }),
      };
    },
  },
}));

// Mock useIdleTimeout
vi.mock("@/hooks/useIdleTimeout", () => ({
  useIdleTimeout: () => ({ showWarning: false, remaining: 60, stayActive: vi.fn() }),
}));

// Mock IdleTimeoutWarning
vi.mock("@/components/IdleTimeoutWarning", () => ({
  default: () => null,
}));

function TestConsumer() {
  const { user, role, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{loading ? "true" : "false"}</span>
      <span data-testid="user">{user ? user.id : "null"}</span>
      <span data-testid="role">{role ?? "null"}</span>
    </div>
  );
}

function renderWithProviders() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("AuthContext", () => {
  let authCallback: Function;

  beforeEach(() => {
    vi.clearAllMocks();

    mockOnAuthStateChange.mockImplementation((cb: Function) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignOut.mockResolvedValue({});
  });

  it("starts in loading state then resolves to no user", async () => {
    renderWithProviders();

    // Auth callback fires with no session
    act(() => { authCallback("INITIAL_SESSION", null); });

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("user")).toHaveTextContent("null");
      expect(screen.getByTestId("role")).toHaveTextContent("null");
    });
  });

  it("sets user when auth state changes to signed in", async () => {
    // Mock role fetch
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { role: "admin" }, error: null }),
        }),
      }),
    });

    renderWithProviders();

    const fakeSession = { user: { id: "user-123" } };
    act(() => { authCallback("SIGNED_IN", fakeSession); });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("user-123");
    });
  });

  it("clears user on sign out", async () => {
    renderWithProviders();

    // Sign in
    const fakeSession = { user: { id: "user-123" } };
    act(() => { authCallback("SIGNED_IN", fakeSession); });
    
    // Sign out
    act(() => { authCallback("SIGNED_OUT", null); });

    await waitFor(() => {
      expect(screen.getByTestId("user")).toHaveTextContent("null");
      expect(screen.getByTestId("role")).toHaveTextContent("null");
    });
  });
});
