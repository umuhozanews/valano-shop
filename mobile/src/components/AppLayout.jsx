import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";

// The phone-shell layout: scrollable content area + a fixed bottom tab bar.
export default function AppLayout() {
  return (
    <div className="mx-auto flex h-[100dvh] max-w-[480px] flex-col bg-paper">
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
