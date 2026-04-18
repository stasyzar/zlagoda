import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Typography, IconButton, Divider, Button
} from '@mui/material';
import {
  People as PeopleIcon,
  Category as CategoryIcon,
  Inventory as InventoryIcon,
  Storefront as StorefrontIcon,
  CardMembership as CardMembershipIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

const managerLinks = [
  { label: 'Мій профіль', icon: <AccountCircleIcon />, path: '/manager/me' },
  { label: 'Працівники', icon: <PeopleIcon />, path: '/manager/employees' },
  { label: 'Категорії', icon: <CategoryIcon />, path: '/manager/categories' },
  { label: 'Товари', icon: <InventoryIcon />, path: '/manager/products' },
  { label: 'Товари у магазині', icon: <StorefrontIcon />, path: '/manager/store-products' },
  { label: 'Карти клієнтів', icon: <CardMembershipIcon />, path: '/manager/customers' },
  { label: 'Чеки', icon: <ReceiptIcon />, path: '/manager/checks' },
  { label: 'Звіти та аналітика', icon: <AssessmentIcon />, path: '/manager/reports' }, 
];

const cashierLinks = [
  { label: 'Мій профіль', icon: <AccountCircleIcon />, path: '/cashier/me' },
  { label: 'Товари', icon: <InventoryIcon />, path: '/cashier/products' },
  { label: 'Товари у магазині', icon: <StorefrontIcon />, path: '/cashier/store-products' },
  { label: 'Карти клієнтів', icon: <CardMembershipIcon />, path: '/cashier/customers' },
  { label: 'Чеки', icon: <ReceiptIcon />, path: '/cashier/checks' },
];

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = isManager ? managerLinks : cashierLinks;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2.5 }}>
        <Typography variant="h6" fontWeight={700} color="primary">
          ZLAGODA
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isManager ? 'Менеджер' : 'Касир'} · {user?.id_employee}
        </Typography>
      </Box>

      <Divider />

      <List sx={{ flex: 1, px: 1, pt: 1 }}>
        {links.map((link) => {
          const active = location.pathname === link.path;
          return (
            <ListItemButton
              key={link.path}
              onClick={() => navigate(link.path)}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{link.icon}</ListItemIcon>
              <ListItemText primary={link.label} />
            </ListItemButton>
          );
        })}
      </List>

      <Divider />
      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          color="inherit"
          sx={{ justifyContent: 'flex-start' }}
        >
          Вийти
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
        <IconButton
          sx={{ display: { sm: 'none' }, mb: 2 }}
          onClick={() => setMobileOpen(true)}
        >
          <MenuIcon />
        </IconButton>
        {children}
      </Box>
    </Box>
  );
}
