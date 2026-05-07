import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from './ConfirmModal';

const defaultProps = {
  open: true,
  title: 'Confirm delete',
  message: 'This cannot be undone.',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  onConfirm: vi.fn(),
  onClose: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConfirmModal', () => {
  it('renders nothing when open is false', () => {
    render(<ConfirmModal {...defaultProps} open={false} />);
    expect(screen.queryByText('Confirm delete')).not.toBeInTheDocument();
  });

  it('renders title, message, and both buttons when open', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirm delete')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ConfirmModal {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<ConfirmModal {...defaultProps} />);
    const backdrop = container.querySelector('.absolute.inset-0');
    await user.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
