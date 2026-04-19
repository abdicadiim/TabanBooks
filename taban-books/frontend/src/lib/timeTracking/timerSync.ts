export type RemoteTimerState = {
  isTimerRunning?: boolean;
  startTime?: number;
  elapsedTime?: number;
  pausedElapsedTime?: number;
  timerNotes?: string;
  associatedProject?: string;
  selectedProjectForTimer?: string;
  selectedTaskForTimer?: string;
  isBillable?: boolean;
  lastUpdated?: number;
};

export const syncRemoteTimer = async (_timerState: RemoteTimerState | null): Promise<void> => {
  // The current backend does not expose a dedicated timer sync endpoint yet.
  // Keep the helper as a safe no-op so the UI can still synchronize locally.
  return;
};

export default syncRemoteTimer;
