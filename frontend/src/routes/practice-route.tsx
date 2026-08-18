import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeftIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PracticeHeader,
  PracticeHeaderSkeleton,
} from "@/features/practice/practice-header";
import { PracticeSession } from "@/features/practice/practice-session";
import { useExerciseSet, useManifest } from "@/lib/data/queries";
import { usePracticeProgress } from "@/lib/progress/practice-queries";
import {
  countCorrect,
  countCorrectEntries,
} from "@/lib/progress/practice-store";

const routeApi = getRouteApi("/practice/$setId");

/**
 * A practice set's page: header, then the session itself. Unlike a deck there
 * is no separate "start" step — a set has no direction or tag options to pick,
 * so the first exercise (always one that still needs work) renders as soon as
 * the set arrives.
 */
export function PracticePage() {
  const { setId } = routeApi.useParams();
  const navigate = useNavigate();

  const manifest = useManifest();
  const set = useExerciseSet(setId);
  const progress = usePracticeProgress(setId);

  const summary = manifest.data?.exerciseSets?.find(
    (entry) => entry.id === setId,
  );
  const isMissing = manifest.isSuccess && !summary;

  // Same one-way bounce as the study route: nothing to show without a set.
  const hasBounced = useRef(false);

  useEffect(() => {
    if (hasBounced.current) return;
    if (!isMissing && !set.isError) return;

    hasBounced.current = true;
    toast.error(
      isMissing
        ? "That practice set is not available"
        : "Could not load that practice set",
      {
        description: isMissing
          ? "It may have been renamed or removed."
          : "Check your connection and try again.",
      },
    );
    void navigate({ to: "/", replace: true });
  }, [isMissing, set.isError, navigate]);

  // Same two-source pattern as the deck page: the exact count once the set is
  // loaded, and until then the stored-entry count clamped to the manifest's.
  const correct = useMemo(() => {
    if (!progress.data) return 0;
    if (set.data) return countCorrect(set.data, progress.data);
    return Math.min(
      countCorrectEntries(progress.data),
      summary?.exerciseCount ?? 0,
    );
  }, [set.data, progress.data, summary?.exerciseCount]);

  return (
    <div className="flex flex-col gap-6">
      <div className="-ml-2 flex items-center gap-1">
        <Button asChild variant="ghost" size="icon-lg" aria-label="Overview">
          <Link to="/">
            <ChevronLeftIcon />
          </Link>
        </Button>
        <Link
          to="/"
          className="rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Practice
        </Link>
      </div>

      {summary ? (
        <PracticeHeader
          name={summary.name}
          icon={summary.icon}
          color={summary.color}
          kind={summary.kind}
          level={summary.level}
          exerciseCount={summary.exerciseCount}
          correct={correct}
        />
      ) : (
        <PracticeHeaderSkeleton />
      )}

      {set.data && progress.data ? (
        // Keyed by set identity: the session snapshots a queue of indices into
        // set.exercises, so a different set (or revision) must remount it
        // rather than have stale indices applied to a new array.
        <PracticeSession
          key={`${set.data.id}:${set.data.revision}`}
          set={set.data}
          progress={progress.data}
        />
      ) : (
        <PracticeSessionSkeleton />
      )}
    </div>
  );
}

function PracticeSessionSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-1.5 w-full rounded-full" />
      <Skeleton className="h-6 w-3/4" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
