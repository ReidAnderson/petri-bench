import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Typography,
  Divider,
  Box,
} from '@mui/material';
import { Grain, AllOut, FileUpload, FileDownload, PlayArrow, Stop } from '@mui/icons-material';

const onDragStart = (event: React.DragEvent<HTMLElement>, nodeType: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const Sidebar = ({
  onExport,
  onImport,
  onRun,
  onStop,
  isRunning,
}: {
  onExport: () => void;
  onImport: (file: File) => void;
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
}) => {
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div">
          Petri Net Bench
        </Typography>
        <Typography variant="body2">Drag nodes to the canvas.</Typography>
      </Box>
      <Divider />
      <List>
        <ListItem
          onDragStart={(event) => onDragStart(event, 'place')}
          draggable
          sx={{ cursor: 'grab' }}
        >
          <ListItemIcon>
            <Grain />
          </ListItemIcon>
          <ListItemText primary="Place" />
        </ListItem>
        <ListItem
          onDragStart={(event) => onDragStart(event, 'transition')}
          draggable
          sx={{ cursor: 'grab' }}
        >
          <ListItemIcon>
            <AllOut />
          </ListItemIcon>
          <ListItemText primary="Transition" />
        </ListItem>
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <input
          type="file"
          accept=".pnml,.xml"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          id="import-file-input"
        />
        <label htmlFor="import-file-input">
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            component="span"
            fullWidth
          >
            Import PNML
          </Button>
        </label>
        <Button
          variant="contained"
          startIcon={<FileUpload />}
          onClick={onExport}
          fullWidth
          sx={{ mt: 1 }}
        >
          Export to PNML
        </Button>
        <Box sx={{ mt: 2 }}>
          {!isRunning ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={onRun}
              fullWidth
            >
              Run Simulation
            </Button>
          ) : (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Stop />}
              onClick={onStop}
              fullWidth
            >
              Stop Simulation
            </Button>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
