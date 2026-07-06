import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { CloudUpload, LayoutDashboard, Folder, Clock, Settings, LogOut, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const items = [
  { title: "Dashboard", icon: LayoutDashboard, to: "/dashboard" as const },
  { title: "My Files", icon: Folder, to: "/my-files" as const },
  { title: "Recent", icon: Clock, to: null },
  { title: "Class Resources", icon: GraduationCap, to: "/class-resources" as const },
  { title: "Settings", icon: Settings, to: null },
];


export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const navigate = useNavigate();


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-card)]">
            <CloudUpload className="h-4 w-4" />
          </div>
          <span className="truncate text-lg font-extrabold tracking-tight group-data-[collapsible=icon]:hidden">
            FileNest
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.to ? currentPath === item.to : false;
                const inner = (
                  <>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </>
                );
                return (
                  <SidebarMenuItem key={item.title}>
                    {item.to ? (
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link to={item.to} className="flex items-center gap-2">
                          {inner}
                        </Link>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        tooltip={item.title}
                        onClick={() => toast(`${item.title} — coming soon`)}
                        className="flex items-center gap-2"
                      >
                        {inner}
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {user && (
        <div className="mt-auto border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-sidebar-foreground group-data-[collapsible=icon]:justify-center"
            onClick={async () => {
              await signOut();
              toast("Signed out");
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Log out</span>
          </Button>
        </div>
      )}

    </Sidebar>
  );
}
