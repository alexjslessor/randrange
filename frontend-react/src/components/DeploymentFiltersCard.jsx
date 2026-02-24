import {
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
} from '@mui/material';

const DeploymentFiltersCard = ({
  tags = [],
  onTagsChange,
  scheduleDate = '',
  onScheduleDateChange,
  onClear,
  children,
}) => {
  const hasExtras = Boolean(children);

  return (
    <Card
      sx={{
        mt: 2,
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <CardContent>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Typography variant="subtitle1">Filters</Typography>
          {onClear ? (
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              onClick={onClear}
            >
              Clear
            </Button>
          ) : null}
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          }}
        >
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={tags}
            onChange={(_event, newValue) => {
              if (onTagsChange) onTagsChange(newValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder="Add tag"
                helperText="Match deployments with any of these tags."
              />
            )}
          />

          <TextField
            label="Schedule date"
            type="date"
            value={scheduleDate}
            onChange={(event) => {
              if (onScheduleDateChange) onScheduleDateChange(event.target.value);
            }}
            InputLabelProps={{ shrink: true }}
            helperText="Show deployments with runs scheduled on this day."
          />
        </Box>

        {hasExtras ? (
          <>
            <Divider sx={{ my: 2 }} />
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              }}
            >
              {children}
            </Box>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default DeploymentFiltersCard;
