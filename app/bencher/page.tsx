import type { Metadata } from 'next';
import BencherAppPicker from './BencherAppPicker';

export const metadata: Metadata = {
  title: 'Bencher Apps',
  description: 'Choose the dedicated two-sided or booklet bencher builder.',
};

export default function Page() {
  return <BencherAppPicker />;
}
