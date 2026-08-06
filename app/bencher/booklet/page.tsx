import type { Metadata } from 'next';
import BencherRoute from '../BencherRoute';

export const metadata: Metadata = {
  title: 'Booklet Bencher Builder',
  description: 'Build and print an eight-page bencher booklet with a custom cover.',
};

export default function BookletBencherPage() {
  return <BencherRoute mode="8-page" />;
}
