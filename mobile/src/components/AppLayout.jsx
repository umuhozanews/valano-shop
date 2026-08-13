import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-paper">
      {/* Sidebar for Desktop & Tablet */}
      <Sidebar />

      {/* Main Scrollable View */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

