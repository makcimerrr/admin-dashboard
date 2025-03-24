import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import ContactForm from '../../contact-form';

export default function CustomersPage() {
  return (
      <div className="flex flex-col gap-4">
          <header className="flex flex-col gap-2 text-center">
              <h1 className="text-4xl font-bold">Contact Us</h1>
          </header>
          <main>
              <ContactForm />
          </main>
      </div>
  );
}
