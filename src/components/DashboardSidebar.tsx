import { Link, useLocation } from "react-router-dom";
import { Map, Search, Radar, ShieldAlert, Settings, BarChart3 } from "lucide-react";

const sidebarLinks = [
  { icon: Map, label: "Dashboard", path: "/dashboard" },
  { icon: Search, label: "Prediction", path: "/dashboard/predictions" },
  { icon: Radar, label: "Spread", path: "/dashboard/pollution-spread" },
  { icon: ShieldAlert, label: "Exposure", path: "/dashboard/exposure-risk" },
  { icon: Settings, label: "Role Panel", path: "/dashboard/decision-support" },
  { icon: BarChart3, label: "Insights", path: "/dashboard/trends" },
];

const DashboardSidebar = () => {
  const location = useLocation();

  return (
    <aside className="flex w-14 flex-col items-center gap-1 border-r border-border bg-card py-4 sm:w-20 sm:py-6">
      <nav className="flex flex-1 flex-col items-center gap-1 sm:gap-2">
        {sidebarLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center transition-colors sm:gap-1 sm:px-3 sm:py-2.5 ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              title={link.label}
            >
              <link.icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
              <span className="hidden text-[10px] font-medium leading-tight sm:block">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;
