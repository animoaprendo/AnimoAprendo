"use client";
import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { InfoIcon, StarIcon } from "lucide-react";
import Confetti from "react-confetti";

let addExperience: (exp: number) => void;

// Per-element duration multipliers (change these to make parts faster/slower)
const COUNT_MULT = 1.5; // numeric count multiplier
const BAR_MULT = 1.5; // progress bar multiplier
const DENOM_MULT = 1.0; // denominator transition multiplier
const REMAIN_MULT = 1.5; // remaining-to-next multiplier
const RESET_MULT = 1.0; // reset animation multiplier
const CELEBRATE_MULT = 1.0; // celebration duration multiplier

export function AddExperience(exp: number) {
  if (addExperience) addExperience(exp);
}

export default function RankFragment() {
  const [currentExp, setCurrentExp] = useState<number>(1200);
  const [experience, setExperience] = useState<number>(0);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [animateExp, setAnimateExp] = useState<number>(0);
  const [rankUp, setRankUp] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    addExperience = (exp: number) => {
      setExperience(exp);
      setAnimateExp(0);
      setIsVisible(true);
      setRankUp(false);
    };
  }, []);

  useEffect(() => {
    const handleResize = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // TODO: replace with API call to get ranks and expNeeded
  // Example rank structure
  const ranks = [
    { name: "Iron I", expNeeded: 300 },
    { name: "Iron II", expNeeded: 400 },
    { name: "Iron III", expNeeded: 500 },
    { name: "Bronze I", expNeeded: 600 },
    { name: "Bronze II", expNeeded: 700 },
    { name: "Bronze III", expNeeded: 800 },
    { name: "Silver I", expNeeded: 1000 },
    { name: "Silver II", expNeeded: 1200 },
    { name: "Silver III", expNeeded: 1400 },
    { name: "Gold I", expNeeded: 1600 },
  ];

  const getRankIndex = (exp: number) => {
    let acc = 0;
    for (let i = 0; i < ranks.length; i++) {
      if (exp < acc + ranks[i].expNeeded) return i;
      acc += ranks[i].expNeeded;
    }
    return ranks.length - 1;
  };

  const totalExp = currentExp + animateExp;
  const currentRankIndex = getRankIndex(totalExp);
  const currentRank = ranks[currentRankIndex];
  const nextRank = ranks[currentRankIndex + 1] ?? null;

  let accumulated = 0;
  for (let i = 0; i < currentRankIndex; i++) {
    accumulated += ranks[i].expNeeded;
  }
  const progressExp = totalExp - accumulated;

  // motion values
  const progress = useMotionValue(0);
  const progressPercent = useTransform(progress, (latest) => `${latest}%`);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  // denom (exp needed for current rank) and remaining EXP to next rank
  const denom = useMotionValue(currentRank.expNeeded);
  const denomRounded = useTransform(denom, (v) => Math.round(v));
  const remaining = useMotionValue(currentRank.expNeeded - progressExp);
  const remainingRounded = useTransform(remaining, (v) => Math.round(v));

  useEffect(() => {
    if (!isVisible) return;

    const runAnimation = async () => {
      let expToAdd = experience;
      let expLeft = currentExp;

      const oldRankIndex = getRankIndex(expLeft);
      let oldAccum = 0;
      for (let i = 0; i < oldRankIndex; i++) oldAccum += ranks[i].expNeeded;
      const oldProgressExp = expLeft - oldAccum;

      await Promise.all([
        animate(count, oldProgressExp, { duration: 0 }),
        animate(
          progress,
          (oldProgressExp / ranks[oldRankIndex].expNeeded) * 100,
          { duration: 0 }
        ),
        animate(denom, ranks[oldRankIndex].expNeeded, { duration: 0 }),
        animate(remaining, ranks[oldRankIndex].expNeeded - oldProgressExp, {
          duration: 0,
        }),
      ]);

      while (expToAdd > 0) {
        // Compute the immediate current rank and how much is needed to finish it
        const currentIndex = getRankIndex(expLeft);
        const currentRankObj = ranks[currentIndex];

        let rankAccum = 0;
        for (let i = 0; i < currentIndex; i++) rankAccum += ranks[i].expNeeded;
        const currentProgressExp = expLeft - rankAccum;
        let needed = currentRankObj.expNeeded - currentProgressExp;

        if (expToAdd >= needed && currentIndex < ranks.length) {
          // Fill current bar to 100% (animate count and progress in parallel)
          const baseFill = 1;
          const fillDuration = baseFill * Math.max(0.01, (COUNT_MULT + BAR_MULT) / 2);
          await Promise.all([
            animate(count, currentRankObj.expNeeded, { duration: fillDuration * COUNT_MULT }),
            animate(progress, 100, { duration: fillDuration * BAR_MULT }),
            // remaining goes to 0 as we fill the bar
            animate(remaining, 0, { duration: fillDuration * REMAIN_MULT }),
          ]);
          // Show rankup celebration while bar stays at 100%
          setRankUp(true);
          // Wait a frame so React can paint the celebration before we await the full duration
          await new Promise((r) => requestAnimationFrame(r));
          const celebrateMs = 2000 * CELEBRATE_MULT;
          await new Promise((r) => setTimeout(r, celebrateMs));
          setRankUp(false);

          // Reset bar for the next rank (small fade/reset) so remaining EXP can continue
          // Use a very short animation for a smooth transition back to 0
          const resetBase = 0.15;
          const resetDur = resetBase * RESET_MULT;
          // Determine new denom (next rank's expNeeded) if available
          const newDenom = ranks[currentIndex + 1]
            ? ranks[currentIndex + 1].expNeeded
            : currentRankObj.expNeeded;

          await Promise.all([
            animate(count, 0, { duration: resetDur * COUNT_MULT }),
            animate(progress, 0, { duration: resetDur * BAR_MULT }),
            // animate denom to the new denominator and set remaining to newDenom (progress 0)
            animate(denom, newDenom, { duration: resetDur * DENOM_MULT }),
            animate(remaining, newDenom, { duration: resetDur * REMAIN_MULT }),
          ]);

          expLeft += needed;
          // Update currentExp immediately so the UI shows the new rank/progress
          setCurrentExp(expLeft);
          expToAdd -= needed;
        } else {
          const singleBase = 1;
          const singleDur = singleBase * Math.max(0.01, (COUNT_MULT + BAR_MULT) / 2);
          const newProgressExp = currentProgressExp + expToAdd;
          await Promise.all([
            animate(count, newProgressExp, { duration: singleDur * COUNT_MULT }),
            animate(
              progress,
              (newProgressExp / currentRankObj.expNeeded) * 100,
              { duration: singleDur * BAR_MULT }
            ),
            // animate remaining to reflect the decreasing amount to next rank
            animate(remaining, currentRankObj.expNeeded - newProgressExp, {
              duration: singleDur * REMAIN_MULT,
            }),
          ]);
          expLeft += expToAdd;
          expToAdd = 0;
        }
      }

      // Close modal after everything finishes
      setTimeout(() => {
        setCurrentExp(expLeft);
        setExperience(0);
        setAnimateExp(0);
        setIsVisible(false);
      }, 1000);
    };

    runAnimation();
  }, [isVisible, experience]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center bg-black/20 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {rankUp && (
            <Confetti width={dimensions.width} height={dimensions.height} />
          )}

          <motion.div
            layout="position"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-3 bg-white/90 backdrop-blur-lg rounded-2xl px-6 py-4 shadow-lg w-full max-w-lg"
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-row items-center gap-2">
                <InfoIcon className="w-5 h-5 text-blue-500 shrink-0" />
                <h1 className="text-sm md:text-base text-gray-800 font-medium">
                  Experience Gained:{" "}
                  <motion.span
                    key={experience}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-green-700 font-semibold"
                  >
                    +{experience} EXP
                  </motion.span>
                </h1>
              </div>

              <div className="flex flex-wrap gap-4 text-sm md:text-base">
                <span className="text-gray-600">
                  Current Rank:{" "}
                  <span className="font-bold text-green-700">
                    {currentRank.name}
                  </span>
                </span>
                {nextRank && (
                  <span className="text-gray-600">
                    Next Rank:{" "}
                    <span className="font-bold text-green-700">
                      {nextRank.name}
                    </span>
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="relative h-5 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="absolute left-0 top-0 h-5 bg-gradient-to-r from-green-400 to-green-600"
                    style={{ width: progressPercent }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-800">
                    <motion.span>{rounded}</motion.span>/
                    <motion.span>{denomRounded}</motion.span>
                  </span>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  <motion.span>{remainingRounded}</motion.span> EXP to next rank
                </p>
              </div>

              <AnimatePresence>
                {rankUp && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center gap-2 mt-3"
                  >
                    <StarIcon className="w-8 h-8 text-yellow-500" />
                    <p className="text-lg font-bold text-yellow-600">
                      🎉 Congratulations! You ranked up!
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
