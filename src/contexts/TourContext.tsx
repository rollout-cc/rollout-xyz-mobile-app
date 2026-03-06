import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getTourById, type TourStep } from "@/lib/tourSteps";

interface TourContextValue {
  activeTourId: string | null;
  currentStep: TourStep | null;
  currentStepIndex: number;
  totalSteps: number;
  startTour: (tourId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  resetAllTours: () => Promise<void>;
  isTourCompleted: (tourId: string) => boolean;
  tryStartPageTour: (tourId: string) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTourId, setActiveTourId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const pendingNavRef = useRef<{ tourId: string; stepIdx: number } | null>(null);

  // Load completed tours from DB
  useEffect(() => {
    if (!user) return;
    supabase
      .from("tour_progress")
      .select("tour_id")
      .eq("user_id", user.id)
      .eq("completed", true)
      .then(({ data }) => {
        if (data) setCompletedTours(new Set(data.map((r: any) => r.tour_id)));
        setLoaded(true);
      });
  }, [user]);

  // After navigation, resume the tour step if we were navigating for a tour
  useEffect(() => {
    if (!pendingNavRef.current) return;
    const { tourId, stepIdx } = pendingNavRef.current;
    const tour = getTourById(tourId);
    if (!tour) return;
    const step = tour.steps[stepIdx];
    if (!step?.page || location.pathname === step.page) {
      // We've arrived — set state after a brief delay for DOM to render
      const timer = setTimeout(() => {
        setActiveTourId(tourId);
        setStepIndex(stepIdx);
        pendingNavRef.current = null;
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const markComplete = useCallback(
    async (tourId: string) => {
      setCompletedTours((prev) => new Set(prev).add(tourId));
      if (!user) return;
      await supabase.from("tour_progress").upsert(
        { user_id: user.id, tour_id: tourId, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "user_id,tour_id" }
      );
    },
    [user]
  );

  const startTour = useCallback(
    (tourId: string) => {
      const tour = getTourById(tourId);
      if (!tour || tour.steps.length === 0) return;
      const firstStep = tour.steps[0];
      if (firstStep.page && location.pathname !== firstStep.page) {
        pendingNavRef.current = { tourId, stepIdx: 0 };
        navigate(firstStep.page);
      } else {
        setActiveTourId(tourId);
        setStepIndex(0);
      }
    },
    [location.pathname, navigate]
  );

  const nextStep = useCallback(() => {
    if (!activeTourId) return;
    const tour = getTourById(activeTourId);
    if (!tour) return;
    const nextIdx = stepIndex + 1;
    if (nextIdx >= tour.steps.length) {
      // Tour complete
      setActiveTourId(null);
      setStepIndex(0);
      markComplete(activeTourId);
      return;
    }
    const nextStepDef = tour.steps[nextIdx];
    if (nextStepDef.page && location.pathname !== nextStepDef.page) {
      pendingNavRef.current = { tourId: activeTourId, stepIdx: nextIdx };
      setActiveTourId(null); // hide overlay during navigation
      navigate(nextStepDef.page);
    } else {
      setStepIndex(nextIdx);
    }
  }, [activeTourId, stepIndex, location.pathname, navigate, markComplete]);

  const prevStep = useCallback(() => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  }, [stepIndex]);

  const skipTour = useCallback(() => {
    if (activeTourId) {
      markComplete(activeTourId);
    }
    setActiveTourId(null);
    setStepIndex(0);
  }, [activeTourId, markComplete]);

  const resetAllTours = useCallback(async () => {
    setCompletedTours(new Set());
    if (!user) return;
    await supabase.from("tour_progress").delete().eq("user_id", user.id);
  }, [user]);

  const isTourCompleted = useCallback(
    (tourId: string) => completedTours.has(tourId),
    [completedTours]
  );

  const tryStartPageTour = useCallback(
    (tourId: string) => {
      if (!loaded || completedTours.has(tourId) || activeTourId) return;
      // Small delay to ensure DOM elements are rendered
      setTimeout(() => startTour(tourId), 600);
    },
    [loaded, completedTours, activeTourId, startTour]
  );

  const tour = activeTourId ? getTourById(activeTourId) : null;
  const currentStep = tour ? tour.steps[stepIndex] ?? null : null;

  return (
    <TourContext.Provider
      value={{
        activeTourId,
        currentStep,
        currentStepIndex: stepIndex,
        totalSteps: tour?.steps.length ?? 0,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        resetAllTours,
        isTourCompleted,
        tryStartPageTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
