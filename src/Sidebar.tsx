import React from 'react';
import {
  Drawer,
  List,
  ListItemButton, // Changed for better interaction
  ListItemIcon,
  ListItemText,
  Button,
  Typography,
  Divider,
  Box,
  ListSubheader, // Added for grouping
  Tooltip, // Added for hints
} from '@mui/material';
import {
  Grain,
  AllOut,
  FileUpload,
  FileDownload,
  PlayArrow,
  Stop,
  AutoFixHigh, // Added for auto-format
  SkipNext, // Added for step forward
  FastForward, // Added for fast forward
  PlayCircle, // Added for start simulation
  StopCircle, // Added for end simulation
} from '@mui/icons-material';

const drawerWidth = 260; // Slightly wider for comfort

const onDragStart = (event: React.DragEvent<HTMLElement>, nodeType: string) => {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
};

const Sidebar = ({
  onExport,
  onImport,
  onRun,
  onStop,
  onAutoFormat, // Added
  onStartSimulation,
  onStepForward,
  onFastForward,
  onEndSimulation,
  isRunning,
  isInSimulationMode,
}: {
  onExport: () => void;
  onImport: (file: File) => void;
  onRun: () => void;
  onStop: () => void;
  onAutoFormat: () => void; // Added
  onStartSimulation: () => void;
  onStepForward: () => void;
  onFastForward: () => void;
  onEndSimulation: () => void;
  isRunning: boolean;
  isInSimulationMode: boolean;
}) => {
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    event.target.value = ''; // Reset for same file selection
  };

  return (
    <Drawer
      variant="permanent"
      anchor="left"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
    >
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" component="div">
          Petri Net Sim
        </Typography>
      </Box>
      <Divider />

      {/* Node Palette */}
      <List
        subheader={
          <ListSubheader component="div" sx={{ bgcolor: 'inherit' }}> {/* Make subheader less obtrusive */}
            Node Palette
          </ListSubheader>
        }
      >
        <Tooltip title="Drag to add a Place node" placement="right">
          <ListItemButton // Changed from ListItem for hover effects & better semantics
            onDragStart={(event) => onDragStart(event, 'place')}
            draggable
            sx={{ cursor: 'grab', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <ListItemIcon sx={{ minWidth: 40}}> {/* Ensure icons align */}
              <Grain />
            </ListItemIcon>
            <ListItemText primary="Place" />
          </ListItemButton>
        </Tooltip>
        <Tooltip title="Drag to add a Transition node" placement="right">
          <ListItemButton // Changed from ListItem
            onDragStart={(event) => onDragStart(event, 'transition')}
            draggable
            sx={{ cursor: 'grab', '&:hover': { bgcolor: 'action.hover' } }}
          >
            <ListItemIcon sx={{ minWidth: 40}}>
              <AllOut />
            </ListItemIcon>
            <ListItemText primary="Transition" />
          </ListItemButton>
        </Tooltip>
      </List>
      <Divider />

      {/* Layout Operations */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>Layout</Typography>
        <Button
          variant="outlined"
          startIcon={<AutoFixHigh />}
          onClick={onAutoFormat}
          fullWidth
        >
          Auto Format
        </Button>
      </Box>
      <Divider />

      {/* File Operations */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}> {/* Added gap */}
        <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>File Operations</Typography>
        <input
          type="file"
          accept=".pnml,.xml"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          id="import-file-input"
        />
        <label htmlFor="import-file-input" style={{ width: '100%'}}>
          <Button
            variant="outlined" // Kept outlined for distinction
            startIcon={<FileDownload />}
            component="span"
            fullWidth
          >
            Import PNML
          </Button>
        </label>
        <Button
          variant="outlined" // Changed to outlined for consistency in this group
          startIcon={<FileUpload />}
          onClick={onExport}
          fullWidth
        >
          Export PNML
        </Button>
      </Box>
      <Divider />

      {/* Simulation Controls */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'text.secondary' }}>
          {isInSimulationMode ? 'Simulation Mode' : 'Simulation'}
        </Typography>
        
        {!isInSimulationMode ? (
          <>
            {/* Start enhanced simulation */}
            <Button
              variant="outlined"
              startIcon={<PlayCircle />}
              onClick={onStartSimulation}
              fullWidth
            >
              Start Simulation
            </Button>
          </>
        ) : (
          <>
            {/* Enhanced simulation controls */}
            <Button
              variant="outlined"
              startIcon={<SkipNext />}
              onClick={onStepForward}
              fullWidth
            >
              Step Forward
            </Button>
            <Button
              variant="outlined"
              startIcon={<FastForward />}
              onClick={onFastForward}
              fullWidth
            >
              Fast Forward
            </Button>
            <Button
              variant="contained"
              color="error"
              startIcon={<StopCircle />}
              onClick={onEndSimulation}
              fullWidth
            >
              End Simulation
            </Button>
          </>
        )}
      </Box>
      <Divider />
       {/* Footer or additional info can go here */}
       <Box sx={{ p: 2, mt: 'auto', textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            v1.0.0
          </Typography>
       </Box>
    </Drawer>
  );
};

export default Sidebar;
