import { render, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SnackbarProvider, useSnackbar } from '../src/context';

const { toastRenderMock } = vi.hoisted(() => ({
  toastRenderMock: vi.fn(),
}));

vi.mock('@/components/Toast', () => ({
  default: (props) => {
    toastRenderMock(props);
    return <div data-testid="toast-mock" />;
  },
}));

let snackbarRef;

const SnackbarProbe = () => {
  snackbarRef = useSnackbar();
  return <div data-testid="snackbar-probe" />;
};

const HookOutsideProviderProbe = () => {
  useSnackbar();
  return null;
};

const getLastToastProps = () => {
  const calls = toastRenderMock.mock.calls;
  return calls[calls.length - 1]?.[0];
};

describe('SnackbarContext Tests', () => {
  beforeEach(() => {
    toastRenderMock.mockReset();
    snackbarRef = undefined;
  });

  it('throws if useSnackbar is called outside SnackbarProvider', () => {
    expect(() => render(<HookOutsideProviderProbe />)).toThrow(
      'useSnackbar must be used within SnackbarProvider',
    );
  });

  it('shows trimmed messages with default values', async () => {
    render(
      <SnackbarProvider>
        <SnackbarProbe />
      </SnackbarProvider>,
    );

    act(() => {
      snackbarRef.showSnackbar('   hello world   ');
    });

    await waitFor(() => {
      expect(getLastToastProps().isOpen).toBe(true);
    });

    const props = getLastToastProps();
    expect(props.message).toBe('hello world');
    expect(props.severity).toBe('info');
    expect(props.autoHideDuration).toBe(5000);
    expect(props.title).toBeUndefined();
  });

  it('ignores blank messages', () => {
    render(
      <SnackbarProvider>
        <SnackbarProbe />
      </SnackbarProvider>,
    );

    const initialCallCount = toastRenderMock.mock.calls.length;

    act(() => {
      snackbarRef.showSnackbar('     ');
    });

    expect(toastRenderMock).toHaveBeenCalledTimes(initialCallCount);
    expect(getLastToastProps().isOpen).toBe(false);
  });

  it('supports custom options and close controls', async () => {
    render(
      <SnackbarProvider>
        <SnackbarProbe />
      </SnackbarProvider>,
    );

    act(() => {
      snackbarRef.showSnackbar('custom message', {
        severity: 'error',
        title: 'Error',
        autoHideDuration: 1200,
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
      });
    });

    await waitFor(() => {
      expect(getLastToastProps().isOpen).toBe(true);
    });

    let props = getLastToastProps();
    expect(props.severity).toBe('error');
    expect(props.title).toBe('Error');
    expect(props.autoHideDuration).toBe(1200);
    expect(props.anchorOrigin).toEqual({ vertical: 'top', horizontal: 'center' });

    act(() => {
      props.onClose(undefined, 'clickaway');
    });

    expect(getLastToastProps().isOpen).toBe(true);

    act(() => {
      snackbarRef.closeSnackbar();
    });

    await waitFor(() => {
      expect(getLastToastProps().isOpen).toBe(false);
    });
  });

  it('clears queued snackbars', async () => {
    render(
      <SnackbarProvider>
        <SnackbarProbe />
      </SnackbarProvider>,
    );

    act(() => {
      snackbarRef.showSnackbar('first');
      snackbarRef.showSnackbar('second');
    });

    await waitFor(() => {
      expect(getLastToastProps().isOpen).toBe(true);
    });
    expect(getLastToastProps().message).toBe('first');

    act(() => {
      snackbarRef.clearSnackbarQueue();
    });

    act(() => {
      getLastToastProps().onClose();
    });

    await waitFor(() => {
      expect(getLastToastProps().isOpen).toBe(false);
    });

    act(() => {
      getLastToastProps().onExited();
    });

    await waitFor(() => {
      const props = getLastToastProps();
      expect(props.isOpen).toBe(false);
      expect(props.message).toBe('');
    });
  });
});
