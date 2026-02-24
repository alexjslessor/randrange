import {
  Box,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Fragment } from 'react';

const colorForRisk = (value, maxValue) => {
  if (!Number.isFinite(value) || value <= 0 || maxValue <= 0) {
    return 'rgba(34, 40, 58, 0.72)';
  }

  const ratio = Math.min(1, Math.max(0, value / maxValue));
  const hue = 130 - 125 * ratio;
  const saturation = 78;
  const lightness = 44 - ratio * 10;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export default function SchedulingHeatmap({
  chartData,
  title = 'Risk Heatmap',
  subtitle = '',
  showLegend = true,
  bucketMinutes = 15,
}) {
  if (!chartData?.z?.length || !chartData?.z?.[0]?.length) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No heatmap data available.
        </Typography>
      </Box>
    );
  }

  const rowCount = chartData.z.length;
  const columnCount = chartData.z[0].length;
  const values = chartData.z.flat().filter((value) => Number.isFinite(value));
  const maxValue = values.length ? Math.max(...values) : 0;

  const tickEvery = Math.max(1, Math.round(120 / bucketMinutes));

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={1}
      >
        <Box>
          <Typography variant="h6">{title}</Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        <Chip
          size="small"
          label={`Max Risk ${maxValue.toFixed(2)}`}
          color="cyberMag"
          variant="outlined"
        />
      </Stack>

      <Box
        sx={{
          mt: 2,
          overflowX: 'auto',
          borderRadius: 1.5,
          border: '1px solid rgba(255,255,255,0.08)',
          px: 1,
          pb: 1,
          pt: 0.5,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `72px repeat(${columnCount}, minmax(8px, 1fr))`,
            gap: '2px',
            minWidth: Math.max(920, columnCount * 9),
          }}
        >
          <Box />
          {chartData.x.map((label, columnIndex) => (
            <Box
              key={`tick-${label}-${columnIndex}`}
              sx={{
                minHeight: 18,
                fontSize: '0.58rem',
                color: 'text.secondary',
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              {columnIndex % tickEvery === 0 ? label : ''}
            </Box>
          ))}

          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <Fragment key={`row-${rowIndex}`}>
              <Box
                sx={{
                  height: 12,
                  fontSize: '0.72rem',
                  color: 'text.secondary',
                  pr: 1,
                  textAlign: 'right',
                }}
              >
                {chartData.y[rowIndex]}
              </Box>
              {chartData.z[rowIndex].map((value, columnIndex) => (
                <Tooltip
                  key={`cell-${rowIndex}-${columnIndex}`}
                  title={`${chartData.y[rowIndex]} ${chartData.x[columnIndex]} - risk ${Number(value).toFixed(2)}`}
                  arrow
                >
                  <Box
                    sx={{
                      height: 12,
                      borderRadius: '1px',
                      backgroundColor: colorForRisk(Number(value), maxValue),
                    }}
                  />
                </Tooltip>
              ))}
            </Fragment>
          ))}
        </Box>
      </Box>

      {showLegend ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Low
          </Typography>
          <Box
            sx={{
              height: 8,
              width: 140,
              borderRadius: 999,
              background: 'linear-gradient(90deg, hsl(130, 78%, 44%), hsl(60, 78%, 40%), hsl(10, 78%, 35%))',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            High
          </Typography>
        </Stack>
      ) : null}
    </Box>
  );
}
