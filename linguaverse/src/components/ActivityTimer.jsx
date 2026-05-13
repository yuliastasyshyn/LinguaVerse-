import { useEffect, useRef } from "react";
import { useProgress } from "../context/ProgressContext.jsx";

export default function ActivityTimer() {
  const { updateProgress } = useProgress();
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(async () => {
      try {
        await updateProgress({ minutes: 1 });
      } catch (err) {
        console.error("Timer update failed:", err.message || err);
      }
    }, 60000);

    return () => clearInterval(timerRef.current);
  }, [updateProgress]);

  return null;
}
