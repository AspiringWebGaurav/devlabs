export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  loggedInAt: number;
  expiresAt: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface AdminMetric {
  title: string;
  value: string | number;
  description: string;
  change?: string;
}

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}
