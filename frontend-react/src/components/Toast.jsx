import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Slide from '@mui/material/Slide';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const severityPalette = {
    success: {
        background: 'linear-gradient(140deg, rgba(14, 72, 48, 0.96), rgba(20, 109, 197, 0.92))',
        border: '1px solid rgba(112, 233, 177, 0.58)',
        glow: '0 0 0 1px rgba(112, 233, 177, 0.2) inset',
    },
    error: {
        background: 'linear-gradient(140deg, rgba(114, 22, 35, 0.97), rgba(203, 32, 47, 0.92))',
        border: '1px solid rgba(255, 143, 154, 0.65)',
        glow: '0 0 0 1px rgba(255, 143, 154, 0.22) inset',
    },
    warning: {
        background: 'linear-gradient(140deg, rgba(122, 74, 8, 0.97), rgba(190, 130, 22, 0.92))',
        border: '1px solid rgba(255, 212, 131, 0.62)',
        glow: '0 0 0 1px rgba(255, 212, 131, 0.22) inset',
    },
    info: {
        background: 'linear-gradient(140deg, rgba(12, 54, 86, 0.97), rgba(0, 155, 182, 0.9))',
        border: '1px solid rgba(124, 234, 255, 0.62)',
        glow: '0 0 0 1px rgba(124, 234, 255, 0.18) inset',
    },
};

const SlideLeftTransition = (props) => <Slide {...props} direction="left" />;

const Alert = React.forwardRef(function Alert(props, ref) {
    const { id, ...rest } = props; // Remove id from props passed to MuiAlert
    return (
        <MuiAlert
            elevation={6}
            ref={ref}
            variant="filled"
            {...rest}
        />
    );
});

const Toast = ({
    id,
    isOpen,
    message,
    title,
    severity = 'success',
    onClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
    },
    onExited,
    autoHideDuration,
    anchorOrigin = { vertical: 'bottom', horizontal: 'right' },
    sx = {},
}) => {
    const colors = severityPalette[severity] || severityPalette.info;

    return (
        <Snackbar
            key={id}
            open={isOpen}
            onClose={onClose}
            autoHideDuration={autoHideDuration}
            anchorOrigin={anchorOrigin}
            TransitionComponent={SlideLeftTransition}
            TransitionProps={{ onExited }}
            sx={{ zIndex: 1400 }}
        >
            <Alert
                severity={severity}
                onClose={onClose}
                sx={{
                    minWidth: { xs: 'min(92vw, 320px)', sm: 360 },
                    maxWidth: { xs: '92vw', sm: 520 },
                    borderRadius: 2.2,
                    border: colors.border,
                    background: colors.background,
                    boxShadow: `0 18px 42px rgba(0, 0, 0, 0.4), ${colors.glow}`,
                    backdropFilter: 'blur(8px)',
                    color: '#f7f9fc',
                    alignItems: 'flex-start',
                    '& .MuiAlert-icon': {
                        color: 'rgba(255, 255, 255, 0.9)',
                        mt: 0.15,
                    },
                    '& .MuiAlert-action': {
                        pt: 0.25,
                    },
                    ...sx,
                }}
            >
                <Stack spacing={0.25}>
                    {title ? (
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, letterSpacing: 0.25 }}>
                            {title}
                        </Typography>
                    ) : null}
                    <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.35 }}>
                        {message}
                    </Typography>
                </Stack>
            </Alert>
        </Snackbar>
    );
};

export default Toast;

