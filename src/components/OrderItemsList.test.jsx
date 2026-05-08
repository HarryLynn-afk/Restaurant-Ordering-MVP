import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../utils/i18n';
import OrderItemsList from './OrderItemsList';

const wrap = (ui) => render(<LanguageProvider>{ui}</LanguageProvider>);

const items = [
  { id: '1', name: 'Pad Thai', quantity: 2, price: 120 },
  { id: '2', name: 'Tom Yum', quantity: 1, price: 95, modifierSummary: 'Extra spicy' },
];

describe('OrderItemsList', () => {
  it('renders each item name and quantity', () => {
    wrap(<OrderItemsList items={items} total={335} />);
    expect(screen.getByText(/Pad Thai × 2/)).toBeInTheDocument();
    expect(screen.getByText(/Tom Yum × 1/)).toBeInTheDocument();
  });

  it('renders the formatted total', () => {
    wrap(<OrderItemsList items={items} total={335} />);
    expect(screen.getByText(/฿335/)).toBeInTheDocument();
  });

  it('renders modifierSummary when present', () => {
    wrap(<OrderItemsList items={items} total={335} />);
    expect(screen.getByText('Extra spicy')).toBeInTheDocument();
  });

  it('does not render modifierSummary when absent', () => {
    wrap(<OrderItemsList items={[{ id: '1', name: 'Pad Thai', quantity: 1, price: 120 }]} total={120} />);
    expect(screen.queryByText('Extra spicy')).not.toBeInTheDocument();
  });

  it('renders the total row label', () => {
    wrap(<OrderItemsList items={items} total={335} />);
    expect(screen.getByText('Total')).toBeInTheDocument();
  });
});
