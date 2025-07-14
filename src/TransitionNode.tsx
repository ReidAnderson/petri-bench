import { Handle, Position } from 'reactflow';
import { Card, CardContent, Typography, IconButton, Box } from '@mui/material';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';

const TransitionNode = ({ data }: { data: { label: string; onFire: () => void } }) => {
  return (
    <Card
      sx={{
        width: 120,
        height: 60,
        border: '3px solid #424242',
        backgroundColor: 'rgba(66, 66, 66, 0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
        data-testid="transition-handle-left"
      />
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" component="div" sx={{ flexGrow: 1 }}>
            {data.label}
          </Typography>
          <IconButton
            size="small"
            color="primary"
            onClick={data.onFire}
            aria-label="fire transition"
          >
            <PlayCircleOutlineIcon />
          </IconButton>
        </Box>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
        data-testid="transition-handle-right"
      />
    </Card>
  );
};

export default TransitionNode;
