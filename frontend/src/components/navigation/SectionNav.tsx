import React from 'react';
import { NavLink } from 'react-router-dom';
import type { AppNavigationModel } from '../../lib/appNavigation';
import type { User } from '../../types';
import './SectionNav.css';

interface SectionNavProps {
  navigation: AppNavigationModel;
  user: User | null;
  selectedClientId: string | null;
}

export const SectionNav: React.FC<SectionNavProps> = ({
  navigation,
  user,
  selectedClientId
}) => {
  const isAdminMode = user?.role === 'SUPER_ADMIN' && !selectedClientId;
  const activeAdminCluster = navigation.activeAdminCluster;
  const activeMenuGroup = navigation.activeMenuGroup;
  const activeGroup = isAdminMode ? activeAdminCluster : activeMenuGroup;

  const links = isAdminMode
    ? activeAdminCluster?.items.map((item) => ({
      key: item.path,
      icon: item.icon,
      label: item.label,
      path: item.path,
      badge: item.badge,
      isAi: item.isAi,
      isActive: navigation.isAdminItemActive(item),
    }))
    : activeMenuGroup?.visibleItems.map((item) => ({
      key: `${item.module}-${item.path}`,
      icon: item.icon,
      label: item.label,
      path: navigation.getPath(item.path),
      badge: item.badge,
      isAi: item.isAi,
      isActive: navigation.isItemActive(item),
    }));

  if (!activeGroup || !links || links.length <= 1) return null;

  const Icon = activeGroup.icon;

  return (
    <nav className="section-nav-shell" aria-label={`Atalhos de ${activeGroup.label}`}>
      <div className="section-nav-inner">
        <div className="section-nav-context">
          <span className="section-nav-context-icon">
            <Icon size={16} />
          </span>
          <span>{activeGroup.label}</span>
        </div>

        <div className="section-nav-list">
          {links.map((link) => {
            const LinkIcon = link.icon;
            return (
              <NavLink
                key={link.key}
                to={link.path}
                className={`section-nav-link ${link.isActive ? 'active' : ''} ${link.isAi ? 'ai' : ''}`}
                title={link.label}
              >
                <LinkIcon size={16} />
                <span>{link.label}</span>
                {link.badge && <span className="section-nav-badge">{link.badge}</span>}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
