import React from 'react';
import { LucideIcon } from 'lucide-react';
import { SidebarLink } from '@/components/ui/sidebar';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, href, isActive, onClick }) => {
  return (
    <SidebarLink
      link={{
        label,
        href,
        icon: <Icon className="h-5 w-5" />,
      }}
      isActive={isActive}
      onClick={onClick}
    />
  );
};

export default SidebarItem;
