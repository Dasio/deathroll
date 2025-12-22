"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/game/roomCode";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  const handleJoin = () => {
    const code = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(code)) {
      setError("Invalid room code");
      return;
    }
    router.push(`/play?room=${code}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-2">DeathRoll</h1>
        <p className="text-[var(--muted)]">Roll until someone hits 1!</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        <Card className="text-center">
          <h2 className="text-xl font-semibold mb-4">Host a Game</h2>
          <p className="text-[var(--muted)] mb-4">
            Create a room and invite others to join
          </p>
          <Link href="/host">
            <Button size="lg" className="w-full">
              Create Game
            </Button>
          </Link>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4 text-center">Join a Game</h2>
          <div className="space-y-4">
            <Input
              label="Room Code"
              placeholder="Enter 4-character code"
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                setError("");
              }}
              maxLength={4}
              error={error}
              className="text-center text-2xl font-mono tracking-widest uppercase"
            />
            <Button
              size="lg"
              className="w-full"
              onClick={handleJoin}
              disabled={roomCode.length !== 4}
            >
              Join Game
            </Button>
          </div>
        </Card>
      </div>

      <footer className="mt-12 text-[var(--muted)] text-sm">
        P2P multiplayer - no server required
      </footer>
    </main>
  );
}
