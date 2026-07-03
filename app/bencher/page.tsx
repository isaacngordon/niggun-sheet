import type { Metadata } from 'next';
import BencherRoute from './BencherRoute';

export const metadata: Metadata = {
  title: 'Bencher Builder',
  description: 'Preformatted bencher in Double Sided and Booklet styles. Upload your logo, add oneg songs, and print.',
};

export default function Page() {
  return <BencherRoute />;
}
