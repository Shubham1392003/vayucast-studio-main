import { Outlet } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import Navbar from "./Navbar";

const DashboardLayout = () => {
  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto bg-background p-3 sm:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
