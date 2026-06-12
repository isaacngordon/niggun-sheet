import type { Metadata } from 'next';
import BencherRuffleSandbox from './BencherRuffleSandbox';

export const metadata: Metadata = {
  title: 'Bencher Ruffle Sandbox',
  description: 'Sandbox for experimenting with Bencher page ruffle effects.',
};

export default function Page() {
  return <BencherRuffleSandbox />;
}
