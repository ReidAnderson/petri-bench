import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

const TransitionNode = ({ data }: { data: { label: string; onFire: () => void } }) => {
  return (
    <Card
      sx={{
        minWidth: 120,
        border: '2px solid #424242',
        backgroundColor: 'rgba(66, 66, 66, 0.1)',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      <CardContent>
        <Typography variant="subtitle1" component="div">
          {data.label}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            color="primary"
            startIcon={<PlayCircleOutlineIcon />}
            onClick={data.onFire}
          >
            Fire
          </Button>
        </Box>
      </CardContent>
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </Card>
  );
};

export default TransitionNode;
