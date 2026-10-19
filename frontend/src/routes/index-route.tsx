import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DeckGrid, DeckGridSkeleton } from "@/features/decks/deck-grid";
import { CourseGrid } from "@/features/grammar/course-grid";
import { PracticeGrid } from "@/features/practice/practice-grid";
import { useManifest, useSyncData } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

/**
 * The overview: decks, the grammar course, then the remaining practice sets.
 * Renders entirely from the manifest.
 */
export function OverviewPage() {
  const manifest = useManifest();
  const sync = useSyncData();

  const handleSync = () => {
    sync.mutate(undefined, {
      onSuccess: () => toast.success("Decks are up to date"),
      onError: (error) =>
        toast.error("Could not refresh decks", {
          description: error.message,
        }),
    });
  };

  const decks = manifest.data?.decks;
  // A grammar set that carries lessons is a course level, shown in its own
  // section; everything else stays a plain practice set.
  const courseSets = manifest.data?.exerciseSets?.filter(
    (set) => (set.lessonCount ?? 0) > 0,
  );
  const exerciseSets = manifest.data?.exerciseSets?.filter(
    (set) => !set.lessonCount,
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Decks
        </h1>
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Refresh decks"
          disabled={sync.isPending}
          onClick={handleSync}
        >
          <RefreshCwIcon className={cn(sync.isPending && "animate-spin")} />
        </Button>
      </header>

      {decks ? (
        decks.length > 0 ? (
          <DeckGrid decks={decks} />
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No decks published yet.
          </p>
        )
      ) : manifest.isPending ? (
        <DeckGridSkeleton />
      ) : (
        <ManifestError
          message={
            manifest.error instanceof Error
              ? manifest.error.message
              : "The deck list could not be loaded."
          }
          isRetrying={sync.isPending}
          onRetry={handleSync}
        />
      )}

      {courseSets && courseSets.length > 0 ? (
        <>
          <header className="mt-4 flex flex-col gap-1">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Grammar course
            </h2>
            <p className="text-sm text-muted-foreground">
              Every grammar topic from A1 to C1, with lessons and exercises.
            </p>
          </header>
          <CourseGrid sets={courseSets} />
        </>
      ) : null}

      {/* Practice appears only when the manifest lists sets: a data payload
          without them renders exactly the overview it always did. */}
      {exerciseSets && exerciseSets.length > 0 ? (
        <>
          <header className="mt-4 flex items-center justify-between gap-4">
            <h2 className="font-heading text-2xl font-semibold tracking-tight">
              Practice
            </h2>
          </header>
          <PracticeGrid sets={exerciseSets} />
        </>
      ) : null}
    </div>
  );
}

interface ManifestErrorProps {
  message: string;
  isRetrying: boolean;
  onRetry: () => void;
}

function ManifestError({ message, isRetrying, onRetry }: ManifestErrorProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <TriangleAlertIcon className="size-8 text-destructive" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Could not load your decks</p>
        <p className="max-w-md text-sm break-words text-muted-foreground">
          {message}
        </p>
      </div>
      <Button
        size="lg"
        className="h-11"
        disabled={isRetrying}
        onClick={onRetry}
      >
        <RefreshCwIcon className={cn(isRetrying && "animate-spin")} />
        Try again
      </Button>
    </div>
  );
}
