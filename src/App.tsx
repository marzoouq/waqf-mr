/**
 * App entry — مفصول إلى providers/router/root-layout (M1.1, Version I-R).
 */
import { AppProviders } from "@/app/providers";
import { AppRouter } from "@/app/router";

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

export default App;
