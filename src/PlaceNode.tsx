import { Handle, Position } from 'reactflow';
import { Card, CardContent, Typography, Box } from '@mui/material';

const PlaceNode = ({ data }: { data: { label: string; tokens: number; setTokens: (tokens: number) => void } }) => {
  return (
    <Card
      sx={{
        width: 100,
        height: 100,
        borderRadius: '50%',
        border: '3px solid #1976d2',
        backgroundColor: 'rgba(25, 118, 210, 0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        cursor: 'pointer',
      }}
      onClick={() => data.setTokens(data.tokens + 1)}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
        data-testid="place-handle-top"
      />
      <CardContent>
        <Typography variant="subtitle1" component="div">
          {data.label}
        </Typography>
        <Typography variant="h6" component="div">
          {data.tokens}
        </Typography>
      </CardContent>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
        data-testid="place-handle-bottom"
      />
    </Card>
  );
};

export default PlaceNode;
