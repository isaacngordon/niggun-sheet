import type { Metadata } from 'next';
import BencherRoute from './BencherRoute';

export const metadata: Metadata = {
  title: 'Bencher Builder',
  description: 'Customizable bencher.',
};

export default function Page() {
  return <BencherRoute />;
}
