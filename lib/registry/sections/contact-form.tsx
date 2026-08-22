import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../card';
import { Form, FormField } from '../form';
import { Input } from '../input';
import { Button } from '../button';

export function ContactFormSection({
  onSubmit,
}: {
  onSubmit?: (data: { name: string; email: string; message: string }) => void;
}) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({ name, email, message });
    }
    setSent(true);
  };

  return (
    <section className="py-20 bg-[#0d0e12] px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl">
        <Card className="bg-[#111318] border-[#2a2c34]">
          <CardHeader className="text-center">
            <CardTitle>Get in Touch</CardTitle>
            <CardDescription>Have a question or custom enterprise requirements? Send us a message.</CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-8 space-y-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-xl">
                  ✓
                </div>
                <h4 className="text-sm font-semibold text-white">Message Sent!</h4>
                <p className="text-xs text-[#8a8b8d]">Thanks for reaching out. We will get back to you shortly.</p>
              </div>
            ) : (
              <Form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Your Name" required>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                  />
                </FormField>
                <FormField label="Email Address" required>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                  />
                </FormField>
                <FormField label="Message" required>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help?"
                    required
                    className="w-full rounded-lg border border-[#2a2c34] bg-[#17191f] px-3 py-2 text-sm text-[#e1e2e5] placeholder:text-[#6a6b6c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6363] transition-all"
                  />
                </FormField>
                <Button type="submit" variant="glow" className="w-full">
                  Send Message
                </Button>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
