'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Chip,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Typography,
} from '@mui/material';
import { ActionItem, ActionItemStatus } from '@/types';
import { getPriorityColor, formatDate } from '@/lib/utils';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface ActionItemListProps {
  items: ActionItem[];
  isLoading?: boolean;
  onUpdateItem?: (index: number, data: Partial<ActionItem>) => Promise<void>;
  onDeleteItem?: (index: number) => Promise<void>;
}

export default function ActionItemList({
  items,
  isLoading = false,
  onUpdateItem,
  onDeleteItem,
}: ActionItemListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<ActionItem>>({});

  const handleEditOpen = (index: number, item: ActionItem) => {
    setEditingIndex(index);
    setEditData({ ...item });
  };

  const handleEditClose = () => {
    setEditingIndex(null);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    if (editingIndex !== null && onUpdateItem) {
      await onUpdateItem(editingIndex, editData);
      handleEditClose();
    }
  };

  const handleToggleStatus = async (index: number, item: ActionItem) => {
    if (onUpdateItem) {
      const newStatus: ActionItemStatus =
        item.status === ActionItemStatus.COMPLETED
          ? ActionItemStatus.PENDING
          : ActionItemStatus.COMPLETED;
      await onUpdateItem(index, { status: newStatus });
    }
  };

  const handleDelete = async (index: number) => {
    if (onDeleteItem) {
      await onDeleteItem(index);
    }
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary" align="center" py={3}>
            No action items
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader title={`Action Items (${items.length})`} />
        <CardContent>
          <List>
            {items.map((item, index) => (
              <ListItem
                key={`${index}-${item.description}`}
                secondaryAction={
                  <Box display="flex" gap={1}>
                    {onUpdateItem && (
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditOpen(index, item)}
                        disabled={isLoading}
                      >
                        Edit
                      </Button>
                    )}
                    {onDeleteItem && (
                      <Button
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDelete(index)}
                        disabled={isLoading}
                        color="error"
                      >
                        Delete
                      </Button>
                    )}
                  </Box>
                }
                disablePadding
              >
                <ListItemButton
                  sx={{ flex: 1 }}
                  onClick={() => handleToggleStatus(index, item)}
                  disabled={isLoading}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={item.status === ActionItemStatus.COMPLETED}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          textDecoration:
                            item.status === ActionItemStatus.COMPLETED
                              ? 'line-through'
                              : 'none',
                        }}
                      >
                        {item.description}
                      </Typography>
                    }
                    secondary={
                      <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                        <Chip
                          label={item.priority}
                          size="small"
                          sx={{
                            backgroundColor: getPriorityColor(item.priority),
                            color: '#fff',
                          }}
                        />
                        {item.assignee && (
                          <Chip label={`Assigned: ${item.assignee}`} size="small" variant="outlined" />
                        )}
                        {item.dueDate && (
                          <Chip
                            label={`Due: ${formatDate(item.dueDate)}`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingIndex !== null} onClose={handleEditClose} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Action Item</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Description"
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Assignee"
              value={editData.assignee || ''}
              onChange={(e) => setEditData({ ...editData, assignee: e.target.value })}
            />
            <TextField
              fullWidth
              label="Due Date"
              type="date"
              value={editData.dueDate ? editData.dueDate.split('T')[0] : ''}
              onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
