'use client';

import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Menu,
  MenuItem,
  Avatar,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SearchIcon from '@mui/icons-material/Search';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { useLogoutUserMutation } from '@/store/api/authApi';
import { getInitials } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

const navItems = [
  { label: 'Dashboard', icon: DashboardIcon, href: ROUTES.DASHBOARD },
  { label: 'Meetings', icon: MeetingRoomIcon, href: ROUTES.MEETINGS },
  { label: 'Bot', icon: SmartToyIcon, href: ROUTES.MEETING_BOT },
  { label: 'Upload', icon: CloudUploadIcon, href: ROUTES.UPLOAD },
  { label: 'Search', icon: SearchIcon, href: ROUTES.SEARCH },
];

export default function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [logoutUser] = useLogoutUserMutation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logoutUser().unwrap();
    } catch (error) {
      console.error('Logout failed:', error);
    }
    dispatch(logout());
    router.push(ROUTES.LOGIN);
    handleMenuClose();
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: '#fff',
          color: '#201F1E',
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
        }}
      >
        <Toolbar>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: '#0078D4',
              marginRight: 3,
              fontSize: '1.25rem',
            }}
          >
            TMS
          </Typography>

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, flex: 1 }}>
            {navItems.map((item) => (
              <Button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                startIcon={<item.icon />}
                sx={{
                  textTransform: 'none',
                  color: '#605E5C',
                  '&:hover': { color: '#0078D4' },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Mobile Menu Icon */}
          <IconButton
            onClick={() => setMobileOpen(true)}
            sx={{ display: { xs: 'block', md: 'none' }, marginRight: 2 }}
          >
            <MenuIcon />
          </IconButton>

          {/* User Menu */}
          <Box display="flex" alignItems="center" gap={1}>
            {user && (
              <>
                <Button
                  onClick={handleMenuOpen}
                  startIcon={
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        backgroundColor: '#0078D4',
                        fontSize: '0.875rem',
                      }}
                    >
                      {getInitials(user.displayName)}
                    </Avatar>
                  }
                  sx={{
                    textTransform: 'none',
                    color: '#201F1E',
                    display: { xs: 'none', sm: 'flex' },
                  }}
                >
                  {user.displayName}
                </Button>
                <IconButton
                  onClick={handleMenuOpen}
                  sx={{ display: { xs: 'flex', sm: 'none' } }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      backgroundColor: '#0078D4',
                      fontSize: '0.875rem',
                    }}
                  >
                    {getInitials(user.displayName)}
                  </Avatar>
                </IconButton>
              </>
            )}
          </Box>

          {/* User Dropdown Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            {user && (
              <>
                <MenuItem disabled>
                  <Typography variant="caption" color="textSecondary">
                    {user.email}
                  </Typography>
                </MenuItem>
                <MenuItem onClick={() => handleNavigation(ROUTES.PROFILE)}>
                  <SettingsIcon sx={{ marginRight: 1 }} fontSize="small" />
                  Settings
                </MenuItem>
              </>
            )}
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ marginRight: 1 }} fontSize="small" />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      >
        <Box sx={{ width: 280, padding: 2 }}>
          <List>
            {navItems.map((item) => (
              <ListItem
                key={item.href}
                button
                onClick={() => handleNavigation(item.href)}
              >
                <ListItemIcon>
                  <item.icon />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
