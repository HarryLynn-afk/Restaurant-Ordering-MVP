import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageLightbox from './ImageLightbox';

const SRC = 'https://example.com/photo.jpg';

describe('ImageLightbox', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(<ImageLightbox src={SRC} open={false} onClose={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the image with the given src when open', () => {
    const { container } = render(<ImageLightbox src={SRC} open={true} onClose={vi.fn()} />);
    expect(container.querySelector('img')).toHaveAttribute('src', SRC);
  });

  it('calls onClose when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ImageLightbox src={SRC} open={true} onClose={onClose} />);
    await user.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
