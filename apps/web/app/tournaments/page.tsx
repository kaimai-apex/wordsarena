import { Card } from '@/components/ui/card';

export default function TournamentsPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Card className="space-y-3 p-8 text-center">
        <h1 className="text-2xl font-bold text-ink">Arena tournaments</h1>
        <p className="text-ink-soft">Swiss and arena formats are planned for a later phase.</p>
      </Card>
    </div>
  );
}
