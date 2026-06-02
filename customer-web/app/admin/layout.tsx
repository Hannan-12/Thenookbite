import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TNB Admin',
  description: 'The Nook Bite — Admin Panel',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
