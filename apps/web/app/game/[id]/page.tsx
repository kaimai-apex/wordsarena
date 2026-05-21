import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GamePage({ params }: { params: { id: string } }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Card className="space-y-4 p-8">
        <h1 className="text-2xl font-bold text-ink">Match found</h1>
        <p className="text-ink-soft">
          Game <span className="font-mono text-sm">{params.id}</span> is queued up.
          The live VS board UI is coming in Phase 3.
        </p>
        <Link href="/lobby">
          <Button variant="secondary">Back to lobby</Button>
        </Link>
      </Card>
    </div>
  );
}
