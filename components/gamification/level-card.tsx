"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Award, Trophy, Star, TrendingUp, Zap, Target } from "lucide-react";
import { GamificationSystem } from "@/lib/gamification/system";
import { UserStats, UserLevel, Achievement } from "@/lib/gamification/types";
import { motion } from "framer-motion";

interface LevelCardProps {
  userId: string;
  stats: UserStats;
  className?: string;
}

export function LevelCard({ userId, stats, className = "" }: LevelCardProps) {
  const profile = GamificationSystem.createProfile(userId, stats);
  const { level, totalXP } = profile;
  const progressPercentage = GamificationSystem.getLevelProgress(level);

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      {/* Background gradient based on level */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `linear-gradient(135deg, ${level.color}20, ${level.color}05)`,
        }}
      />

      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Level Progress
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <div className="text-center">
          <motion.div
            className="flex items-center justify-center gap-3 mb-3"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-3xl">{level.icon}</span>
            <div>
              <div className="text-2xl font-bold">Level {level.level}</div>
              <Badge
                className="text-white"
                style={{ backgroundColor: level.color }}
              >
                {level.title}
              </Badge>
            </div>
          </motion.div>

          <p className="text-sm text-muted-foreground mb-4">
            {level.description}
          </p>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Progress to Level {level.level + 1}</span>
              <span className="font-medium">
                {level.currentXP} / {level.currentXP + level.xpToNextLevel} XP
              </span>
            </div>
            <Progress
              value={progressPercentage}
              className="h-3"
              style={{
                background: `${level.color}20`,
              }}
            />
            <div className="text-xs text-muted-foreground">
              {level.xpToNextLevel > 0
                ? `${level.xpToNextLevel} XP to next level`
                : "Max level reached!"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-xl font-bold text-primary">{totalXP}</div>
            <div className="text-xs text-muted-foreground">Total XP</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: level.color }}>
              #{Math.max(1, 8 - level.level)}
            </div>
            <div className="text-xs text-muted-foreground">Rank Estimate</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  size?: "sm" | "md" | "lg";
}

export function AchievementCard({
  achievement,
  size = "md",
}: AchievementCardProps) {
  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
  };

  const iconSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const rarityColors = {
    common: "bg-gray-100 text-gray-800 border-gray-200",
    rare: "bg-blue-100 text-blue-800 border-blue-200",
    epic: "bg-purple-100 text-purple-800 border-purple-200",
    legendary: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-lg border-2 h-full ${
        achievement.unlocked
          ? rarityColors[achievement.rarity]
          : "bg-gray-50 text-gray-400 border-gray-200"
      } ${sizeClasses[size]} transition-all hover:shadow-md`}
    >
      {achievement.unlocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
        >
          ✓
        </motion.div>
      )}

      <div className="text-center h-full flex flex-col items-center">
        <div className={`${iconSizes[size]} mb-2`}>
          {achievement.unlocked ? achievement.icon : "🔒"}
        </div>
        <h4
          className={`font-semibold ${size === "sm" ? "text-sm" : "text-base"} mb-1`}
        >
          {achievement.name}
        </h4>
        <p
          className={`text-xs ${achievement.unlocked ? "text-current" : "text-gray-400"} opacity-80 mb-2`}
        >
          {achievement.description}
        </p>

        {achievement.progress !== undefined && achievement.maxProgress && (
          <div className="space-y-1 w-full">
            <Progress
              value={(achievement.progress / achievement.maxProgress) * 100}
              className="h-1 w-full"
            />
            <div className="text-xs opacity-70">
              {achievement.progress} / {achievement.maxProgress}
            </div>
          </div>
        )}

        {achievement.unlocked && (
          <Badge variant="outline" className="text-xs mt-auto">
            +{achievement.xpReward} XP
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

interface AchievementsGridProps {
  stats: UserStats;
  maxDisplay?: number;
  showAll?: boolean;
}

export function AchievementsGrid({
  stats,
  maxDisplay = 6,
  showAll = false,
}: AchievementsGridProps) {
  const achievements = GamificationSystem.checkAchievements(stats);
  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const displayAchievements = showAll
    ? achievements
    : achievements.slice(0, maxDisplay);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Achievements ({unlockedAchievements.length}/{achievements.length})
        </h3>
        {!showAll && achievements.length > maxDisplay && (
          <Button variant="outline" size="sm">
            View All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayAchievements.map((achievement) => (
          <AchievementCard
            key={achievement.id}
            achievement={achievement}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}

interface NextGoalsProps {
  stats: UserStats;
}

export function NextGoals({ stats }: NextGoalsProps) {
  const achievements = GamificationSystem.checkAchievements(stats);
  const nextAchievements = GamificationSystem.getNextAchievements(achievements);
  const profile = GamificationSystem.createProfile("current-user", stats);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Next Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Next Level Progress */}
        <div className="p-3 bg-primary/5 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Next Level</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span>Level {profile.level.level + 1}</span>
            <span>{profile.level.xpToNextLevel} XP needed</span>
          </div>
          <Progress
            value={GamificationSystem.getLevelProgress(profile.level)}
            className="h-2"
          />
        </div>

        {/* Upcoming Achievements */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Close to Unlocking
          </h4>
          {nextAchievements.length > 0 ? (
            <div className="space-y-2">
              {nextAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded"
                >
                  <span className="text-lg">{achievement.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {achievement.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {achievement.progress} / {achievement.maxProgress}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    +{achievement.xpReward} XP
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Keep up the great work! Complete more sessions to unlock new
              achievements.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
