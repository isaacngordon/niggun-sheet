import { redirect } from 'next/navigation';

export default function PrintOnPointPage() {
  redirect('/bencher?printShop=print-on-point');
}