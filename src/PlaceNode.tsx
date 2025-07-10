import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, Typography, Button, Chip, Box } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const PlaceNode = ({ data }: { data: { label: string; tokens: number; setTokens: (tokens: number) => void } }) => {
  return (
    <Card
      sx={{
        minWidth: 120,
        borderRadius: '50%',
        border: '2px solid #1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        textAlign: 'center',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      <CardContent>
        <Typography variant="subtitle1" component="div">
          {data.label}
        </Typography>
        <Chip label={`Tokens: ${data.tokens}`} sx={{ mt: 1, mb: 1 }} />
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => data.setTokens(data.tokens + 1)}
        >
          Add
        </Button>
      </CardContent>
      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </Card>
  );
};

export default PlaceNode;
