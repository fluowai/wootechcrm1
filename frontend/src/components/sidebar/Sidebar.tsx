import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ChevronDown,
  X,
  LogOut,
  ChevronRight,
  Monitor
} from 'lucide-react';
import { ClientSelector } from './ClientSelector';
import type {
  AdminMenuCluster,
  AdminMenuItem,
  AppNavigationModel,
  IconComponent,
  VisibleMenuGroup
} from '../../lib/appNavigation';
import type { User } from '../../types';
import './Sidebar.css';

interface SidebarItemProps {
  icon: IconComponent;
  label: string;
  path?: string;
  isActive?: boolean;
  isAi?: boolean;
  badge?: string;
  children?: React.ReactNode;
  collapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  icon: Icon,
  label,
  path,
  isActive,
  isAi,
  badge,
  children,
  collapsed
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isChildActive = React.Children.toArray(children).some((child) =>
    React.isValidElement<SidebarItemProps>(child) && child.props.path === location.pathname
  );

  useEffect(() => {
    if (isChildActive) setIsOpen(true);
  }, [isChildActive]);

  const content = (
    <div
      className={`sidebar-item ${isActive || isChildActive ? 'active' : ''} ${isAi ? 'sidebar-item-ai' : ''}`}
      title={collapsed ? label : undefined}
    >
      <Icon size={21} className="sidebar-item-icon" />
      {!collapsed && (
        <>
          <span className="sidebar-item-label">{label}</span>
          {badge && <span className="ai-badge">{badge}</span>}
          {children && (
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} className="ml-auto opacity-50" />
            </motion.div>
          )}
        </>
      )}
    </div>
  );

  if (children && !collapsed) {
    return (
      <div>
        <div onClick={() => setIsOpen(!isOpen)}>{content}</div>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="sidebar-submenu"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return path ? (
    <NavLink to={path} style={{ textDecoration: 'none' }}>
      {content}
    </NavLink>
  ) : (
    content
  );
};

const SidebarGroup: React.FC<{
  label: string;
  icon?: IconComponent;
  count?: number;
  children: React.ReactNode;
  collapsed?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}> = ({ label, icon: Icon, count, children, collapsed, collapsible, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const visibleChildren = !collapsible || collapsed || isOpen;

  return (
    <div className="sidebar-group">
      {!collapsed && (
        <button
          type="button"
          className={`sidebar-group-label ${collapsible ? 'sidebar-group-trigger' : ''}`}
          onClick={() => collapsible && setIsOpen((open) => !open)}
        >
          <span className="sidebar-group-title">
            {Icon && <Icon size={16} />}
            <span>{label}</span>
          </span>
          <span className="sidebar-group-meta">
            {typeof count === 'number' && <span className="sidebar-group-count">{count}</span>}
            {collapsible && (
              <ChevronDown size={15} className={`sidebar-group-chevron ${isOpen ? 'open' : ''}`} />
            )}
          </span>
        </button>
      )}
      {visibleChildren && children}
    </div>
  );
};

export const Sidebar: React.FC<{
  onLogout: () => void;
  user: User | null;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  selectedClientId: string | null;
  onSelectClient: (clientId: string | null) => void;
  navigation: AppNavigationModel;
  whiteLabel?: { logoUrl?: string; name?: string };
}> = ({
  onLogout,
  user,
  isMobileOpen,
  setIsMobileOpen,
  collapsed,
  setCollapsed,
  selectedClientId,
  onSelectClient,
  navigation,
  whiteLabel
}) => {
  const renderAdminItem = (item: AdminMenuItem) => (
    <SidebarItem
      key={item.path}
      icon={item.icon}
      label={item.label}
      path={item.path}
      isActive={navigation.isAdminItemActive(item)}
      collapsed={collapsed}
      badge={item.badge}
      isAi={item.isAi}
    />
  );

  const renderAdminCluster = (cluster: AdminMenuCluster) => (
    <SidebarItem
      key={cluster.label}
      icon={cluster.icon}
      label={cluster.label}
      collapsed={collapsed}
    >
      {cluster.items.map(renderAdminItem)}
    </SidebarItem>
  );

  const renderClientGroupShortcut = (group: VisibleMenuGroup) => {
    const firstItem = group.visibleItems[0];
    const firstChildItem = group.visibleChildren[0]?.items[0];
    const targetPath = firstItem?.path || firstChildItem?.path;
    if (!targetPath) return null;

    return (
      <SidebarItem
        key={group.label}
        icon={group.icon}
        label={group.label}
        path={navigation.getPath(targetPath)}
        isActive={group.isActive}
        collapsed={collapsed}
      />
    );
  };

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] md:hidden"
          onClick={() => setIsMobileOpen?.(false)}
        />
      )}

      <aside className={`sidebar-container ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-wrapper">
            {whiteLabel?.logoUrl ? (
              <img src={whiteLabel.logoUrl} alt={whiteLabel?.name || "Logo"} className="logo-icon object-contain" />
            ) : (
              <div className="logo-icon">
                <Monitor size={20} />
              </div>
            )}
            <span className="logo-text">{whiteLabel?.name || "Nexus360"}</span>
          </div>
          <button
            className="hidden md:flex p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronRight size={18} style={{ transform: collapsed ? '' : 'rotate(180deg)', transition: '0.3s' }} />
          </button>
          <button
            className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
            onClick={() => setIsMobileOpen?.(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-scroll custom-scrollbar">
          <ClientSelector
            user={user}
            selectedClientId={selectedClientId}
            onSelectClient={onSelectClient}
            collapsed={collapsed}
          />

          {user?.role === 'SUPER_ADMIN' && selectedClientId && (
            <div className={collapsed ? "mb-4 flex justify-center" : "px-4 mb-4"}>
              <button
                onClick={() => onSelectClient(null)}
                title={collapsed ? "Voltar ao Modo Admin" : undefined}
                className={collapsed
                  ? "flex h-12 w-12 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-700 shadow-sm transition-all hover:bg-amber-100"
                  : "w-full flex items-center justify-center gap-2.5 p-3.5 bg-amber-50 text-amber-700 rounded-2xl text-[13px] font-bold border border-amber-100 hover:bg-amber-100 transition-all shadow-sm"
                }
              >
                <Shield size={collapsed ? 20 : 17} />
                {!collapsed && 'Voltar ao Modo Admin'}
              </button>
            </div>
          )}

          {user?.role === 'SUPER_ADMIN' && !selectedClientId ? (
            <SidebarGroup label="Menu Super Admin" collapsed={collapsed}>
              {navigation.adminClusters.map(renderAdminCluster)}
            </SidebarGroup>
          ) : (
            <SidebarGroup label="Menu" collapsed={collapsed}>
              {navigation.visibleMenuGroups.map(renderClientGroupShortcut)}
            </SidebarGroup>
          )}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile-mini">
            <div className="user-avatar">{user?.name?.substring(0, 1) || 'U'}</div>
            {!collapsed && (
              <div className="user-info">
                <div className="user-name">{user?.name}</div>
                <div className="user-role">{user?.role}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={onLogout}
              className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors text-[15px] font-semibold"
            >
              <LogOut size={17} />
              Sair do Sistema
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
