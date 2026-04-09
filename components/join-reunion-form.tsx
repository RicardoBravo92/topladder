'use client';

import { useUser } from '@clerk/nextjs';
import { useState, useTransition, useEffect } from 'react';
import { joinReunion } from '@/app/actions/reunion';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function JoinReunionForm() {
  const { user } = useUser();
  const router = useRouter();
  const [code, setCode] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('code');
      if (codeParam) setCode(codeParam);
    }
  }, []);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  const handleJoin = () => {
    if (!user || !code) return;
    setLoading(true);
    startTransition(async () => {
      try {
        const res = await joinReunion(code.toUpperCase());
        router.push(`/reunion/${res._id}`);
      } catch (e) {
        console.error(e);
        alert('Failed to join. Check code.');
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <Card className='hover:border-primary/50 transition-all duration-300 shadow-lg bg-card/50 backdrop-blur'>
      <CardHeader>
        <CardTitle>Join a Reunion</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='space-y-2'>
          <Label>Reunion Code</Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder='ABC1234'
            className='bg-background/50 uppercase'
          />
        </div>
        <Button
          variant='secondary'
          onClick={handleJoin}
          disabled={loading}
          className='w-full cursor-pointer'
        >
          {loading ? 'Joining...' : 'Join Reunion'}
        </Button>
      </CardContent>
    </Card>
  );
}
