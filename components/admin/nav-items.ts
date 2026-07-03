import {
  FileText,
  FolderKanban,
  Images,
  LayoutDashboard,
  MessageSquare,
  PenSquare,
  Settings,
  Tags,
} from "lucide-react";

/**
 * Single source of truth for the admin sidebar links, shared by the desktop
 * `<aside>` and the mobile drawer so they never drift apart.
 */
export const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/posts", label: "Posts", icon: PenSquare },
  { href: "/admin/projects", label: "Projects", icon: FolderKanban },
  { href: "/admin/research", label: "Research", icon: FileText },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/kinds", label: "Tag icons", icon: Tags },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export type AdminNavItem = (typeof ADMIN_NAV)[number];
