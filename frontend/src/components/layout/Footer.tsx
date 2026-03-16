'use client';

import React from 'react';
import { Box, Container, Typography, Link, Divider } from '@mui/material';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: '#fff',
        borderTop: '1px solid #E1DFDD',
        marginTop: 'auto',
        paddingY: 3,
      }}
    >
      <Container maxWidth="lg">
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
        >
          <Typography variant="body2" color="textSecondary">
            © {currentYear} Teams Meeting Summary. All rights reserved.
          </Typography>
          <Box display="flex" gap={3}>
            <Link href="#" variant="body2" color="textSecondary">
              Privacy Policy
            </Link>
            <Link href="#" variant="body2" color="textSecondary">
              Terms of Service
            </Link>
            <Link href="#" variant="body2" color="textSecondary">
              Support
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
