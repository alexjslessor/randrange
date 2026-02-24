const BRAND_BLUE = '#0075be';
const BRAND_BLUE_RGB = '0, 117, 190';
const brandBlue = (alpha) => `rgba(${BRAND_BLUE_RGB}, ${alpha})`;

export const fieldStyles = {
  '& .MuiInputBase-root': {
    borderRadius: 1.7,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(2px)',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 203, 221, 0.6)',
  },
  '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(0, 203, 221, 0.95)',
    boxShadow: '0 0 0 2px rgba(0, 203, 221, 0.16)',
  },
};

export const dialogStyles = {
  paper: {
    borderRadius: 3,
    border: '1px solid rgba(0, 203, 221, 0.35)',
    background: 'linear-gradient(170deg, rgba(15,22,28,0.98), rgba(9,12,16,0.99))',
    boxShadow: '0 24px 56px rgba(0, 0, 0, 0.62)',
    overflow: 'hidden',
  },
  title: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'linear-gradient(120deg, rgba(0, 203, 221, 0.2), rgba(143, 42, 163, 0.18))',
    px: 2,
    py: 1.5,
  },
  content: {
    p: { xs: 2, sm: 2.5 },
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
  },
  actions: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    px: 2.5,
    pb: 1.8,
    pt: 1.2,
  },
};

export const dashboardThemeStyles = {
  dialog: {
    ...dialogStyles,
    sectionCard: {
      p: { xs: 1.5, sm: 2 },
      borderRadius: 2.5,
      border: '1px solid rgba(255, 255, 255, 0.11)',
      background: 'linear-gradient(160deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
    },
    helpBadge: {
      width: 18,
      height: 18,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1,
      color: 'cyberAqua.main',
      border: '1px solid rgba(0,203,221,0.55)',
      backgroundColor: 'rgba(0,203,221,0.12)',
      cursor: 'help',
    },
    actionCard: {
      p: { xs: 1.5, sm: 2 },
      position: 'relative',
      overflow: 'hidden',
      background: `linear-gradient(160deg, ${brandBlue(0.14)}, rgba(143,42,163,0.06) 55%, rgba(255,255,255,0.02))`,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10), 0 18px 48px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(6px)',
      '&:after': {
        content: '""',
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 2,
        background: `linear-gradient(90deg, ${brandBlue(0.95)}, rgba(143,42,163,0.65), transparent)`,
        pointerEvents: 'none',
      },
      '&:hover': {
        boxShadow: `inset 0 0 0 1px ${brandBlue(0.30)}, 0 22px 58px rgba(0,0,0,0.40)`,
      },
    },
    field: fieldStyles,
    primaryButton: {
      alignSelf: { xs: 'stretch', md: 'center' },
      px: 2.4,
      borderRadius: 999,
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      background: `linear-gradient(135deg, ${brandBlue(0.95)}, rgba(123, 91, 255, 0.62))`,
      boxShadow: '0 12px 28px rgba(0,0,0,0.40)',
      '&:hover': {
        background: `linear-gradient(135deg, ${brandBlue(1)}, rgba(123, 91, 255, 0.78))`,
        boxShadow: '0 16px 36px rgba(0,0,0,0.48)',
      },
    },
    accentSubmitButton: {
      alignSelf: { xs: 'stretch', md: 'center' },
      px: 2.2,
      borderRadius: 999,
      textTransform: 'none',
      fontWeight: 700,
      letterSpacing: '0.02em',
      whiteSpace: 'nowrap',
      background: 'linear-gradient(120deg, rgba(0,203,221,0.85), rgba(143,42,163,0.8))',
      boxShadow: '0 12px 28px rgba(0,0,0,0.40)',
      '&:hover': {
        background: 'linear-gradient(120deg, rgba(0,203,221,1), rgba(143,42,163,0.95))',
        boxShadow: '0 16px 36px rgba(0,0,0,0.48)',
      },
    },
  },
  table: {
    footerSelect: {
      minWidth: 92,
      height: 28,
      px: 1,
      borderRadius: 1,
      color: 'text.primary',
      backgroundColor: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.15)',
      outline: 'none',
      cursor: 'pointer',
      transition: 'border-color 120ms ease, box-shadow 120ms ease, background-color 120ms ease',
      '&:hover': {
        borderColor: 'rgba(0,203,221,0.55)',
        backgroundColor: 'rgba(255,255,255,0.09)',
      },
      '&:focus': {
        borderColor: 'cyberAqua.main',
        boxShadow: '0 0 0 2px rgba(0,203,221,0.18)',
      },
      '& option': {
        backgroundColor: 'background.paper',
        color: 'text.primary',
      },
    },
  },
  dataGrid: {
    card: {
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.11)',
      background: `linear-gradient(160deg, ${brandBlue(0.14)}, rgba(143,42,163,0.06) 45%, rgba(255,255,255,0.02))`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 18px 48px rgba(0,0,0,0.35)',
    },
    grid: {
      border: 0,
      backgroundColor: 'transparent',
      '& .MuiDataGrid-main': {
        backgroundColor: 'transparent',
      },
      '& .MuiDataGrid-columnHeaders': {
        background: `linear-gradient(90deg, ${brandBlue(0.28)}, rgba(143,42,163,0.12))`,
        boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.10)',
      },
      '& .MuiDataGrid-columnHeaderTitle': {
        fontWeight: 700,
        letterSpacing: '0.02em',
      },
      '& .MuiDataGrid-row': {
        boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.06)',
      },
      '& .MuiDataGrid-row:nth-of-type(even)': {
        backgroundColor: 'rgba(255,255,255,0.02)',
      },
      '& .MuiDataGrid-row:hover': {
        backgroundColor: brandBlue(0.16),
      },
      '& .MuiDataGrid-row.Mui-selected': {
        backgroundColor: 'rgba(143,42,163,0.18)',
      },
      '& .MuiDataGrid-row.Mui-selected:hover': {
        backgroundColor: 'rgba(143,42,163,0.24)',
      },
      '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
        outline: `2px solid ${BRAND_BLUE}`,
        outlineOffset: -2,
        boxShadow: `0 0 0 3px ${brandBlue(0.20)}`,
      },
      '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
        outline: `2px solid ${BRAND_BLUE}`,
        outlineOffset: -2,
        boxShadow: `0 0 0 3px ${brandBlue(0.20)}`,
      },
      '& .MuiDataGrid-iconSeparator': {
        display: 'none',
      },
      '& .MuiDataGrid-footerContainer': {
        backgroundColor: 'rgba(255,255,255,0.02)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
      },
      '& .MuiDataGrid-virtualScroller': {
        background: 'transparent',
      },
      '& .MuiDataGrid-overlay': {
        background: 'transparent',
      },
    },
  },
};
