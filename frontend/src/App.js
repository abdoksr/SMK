import FinanceApp from "@/finance/App";
import OrgApp from "@/org/App";
import Landing from "@/Landing";

// Each portal (Finance / Organisation) is a fully independent SPA with its own
// BrowserRouter, AuthProvider, and history. Rather than nesting two React Router
// instances (unsupported / flaky), we dispatch at the plain URL level: whichever
// portal owns the current path mounts its own router untouched.
function App() {
  const path = window.location.pathname;

  if (path === "/finance" || path.startsWith("/finance/")) {
    return <FinanceApp />;
  }
  if (path === "/org" || path.startsWith("/org/")) {
    return <OrgApp />;
  }
  return <Landing />;
}

export default App;
