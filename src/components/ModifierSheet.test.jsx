import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { it, expect, vi } from 'vitest';
import ModifierSheet from './ModifierSheet';

vi.mock('../utils/i18n', () => ({ useCustomerLanguage: () => ({ t: key => key }) }));

it('preserves option identifiers in the cart for server validation', async () => {
  const add = vi.fn();
  render(<ModifierSheet item={{ id: 'noodles', name: 'Noodles', price: 40 }} groups={[
    { id: 'size', type: 'required', options: [{ id: 'regular', name: 'Regular' }] },
    { id: 'extras', type: 'extras', options: [{ id: 'egg', name: 'Egg', price: 10 }] },
  ]} onClose={() => {}} onAddToCart={add} />);
  const user = userEvent.setup();
  expect(screen.getByRole('button', { name: /customer.addToCart/ })).toBeDisabled();
  await user.click(screen.getByRole('radio', { name: 'Regular' }));
  await user.click(screen.getByRole('checkbox', { name: /Egg/ }));
  await user.click(screen.getByRole('button', { name: /customer.addToCart/ }));
  expect(add).toHaveBeenCalledWith(expect.objectContaining({ price: 50,
    selections: { size: 'regular', extras: { egg: true } }, modifierSummary: 'Regular, Egg' }));
});
