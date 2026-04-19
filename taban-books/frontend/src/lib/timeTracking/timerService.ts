export type TimerStateLike = {
  isTimerRunning?: boolean;
  startTime?: number | string;
  elapsedTime?: number;
  pausedElapsedTime?: number;
};

export const calculateElapsedTime = (timerState: TimerStateLike | null | undefined): number => {
  if (!timerState) return 0;

  if (timerState.isTimerRunning && timerState.startTime) {
    const startedAt = Number(timerState.startTime);
    if (Number.isFinite(startedAt)) {
      const elapsedFromStart = Math.floor((Date.now() - startedAt) / 1000);
      return Math.max(0, Number(timerState.pausedElapsedTime || 0) + elapsedFromStart);
    }
  }

  return Number(timerState.pausedElapsedTime || timerState.elapsedTime || 0);
};

export default calculateElapsedTime;
