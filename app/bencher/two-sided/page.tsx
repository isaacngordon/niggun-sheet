import type { Metadata } from 'next';
import BencherRoute from '../BencherRoute';

export const metadata: Metadata = {
  title: 'Two-Sided Bencher Builder',
  description: 'Build a double-sided bencher with songs arranged on one folded sheet.',
};

export default function TwoSidedBencherPage() {
  return <BencherRoute mode="2-page" />;
}
