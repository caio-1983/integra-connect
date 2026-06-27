import React from 'react';
import { NavItem } from '@/config/navigation';
import SidebarItem from './SidebarItem';

interface SidebarSectionProps {
  items: NavItem[];
  currentPath: string;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ items, currentPath }) => {
  return (
    <nav className="flex flex-col gap-1.5">
      {items.map((item) => (
        <SidebarItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          href={`/${item.id}`}
          isActive={currentPath.startsWith(item.id)}
        />
      ))}
    </nav>
  );
};

export default SidebarSection;
