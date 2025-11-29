"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trophy, Star, Zap, Target, Award, Medal, Crown, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Achievement, UserStats } from "@/lib/gamification/types";
import { GamificationSystem } from "@/lib/gamification/system";
import { AchievementCard } from "./level-card";

interface AchievementSystemProps {
  stats: UserStats;
  onAchievementClick?: (achievement: Achievement) => void;
}

export function AchievementSystem({ stats, onAchievementClick }: AchievementSystemProps) {
  const achievements = GamificationSystem.checkAchievements(stats);
  
  const categorizedAchievements = {
    sessions: achievements.filter(a => a.category === 'sessions'),
    reviews: achievements.filter(a => a.category === 'reviews'),
    streak: achievements.filter(a => a.category === 'streak'),
    milestone: achievements.filter(a => a.category === 'milestone'),
    special: achievements.filter(a => a.category === 'special'),
  };

  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const totalAchievements = achievements.length;
  const completionPercentage = Math.round((totalUnlocked / totalAchievements) * 100);

  const categoryIcons = {
    sessions: Trophy,
    reviews: Star,
    streak: Zap,
    milestone: Target,
    special: Crown
  };

  const categoryNames = {
    sessions: 'Sessions',
    reviews: 'Reviews',
    streak: 'Streaks',
    milestone: 'Milestones',
    special: 'Special'
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Achievements
              </span>
              <Badge variant="secondary">
                {totalUnlocked}/{totalAchievements}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Completion</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              
              {/* Recent achievements preview */}
              <div className="flex gap-2 overflow-hidden">
                <TooltipProvider>
                  {achievements
                    .filter(a => a.unlocked)
                    .slice(-4)
                    .map((achievement) => (
                      <Tooltip key={achievement.id}>
                        <TooltipTrigger asChild>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="shrink-0 w-8 h-8 bg-black/10 rounded-full flex items-center justify-center text-sm cursor-pointer hover:bg-black/20 transition-colors"
                          >
                            {achievement.icon}
                          </motion.div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs bg-white text-black">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{achievement.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {achievement.rarity}
                              </Badge>
                            </div>
                            <p className="text-sm">{achievement.description}</p>
                            <div className="text-xs text-muted-foreground">
                              +{achievement.xpReward} XP
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                </TooltipProvider>
                {totalUnlocked === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Complete your first session to start earning achievements!
                  </div>
                )}
              </div>
              
              <Button variant="outline" size="sm" className="w-full">
                View All Achievements
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-6xl max-h-[80vh] w-full overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Achievement Gallery
            <Badge variant="secondary" className="ml-2">
              {totalUnlocked}/{totalAchievements} Complete
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">All</TabsTrigger>
            {/* {Object.entries(categoryNames).map(([key, name]) => {
              const Icon = categoryIcons[key as keyof typeof categoryIcons];
              const count = categorizedAchievements[key as keyof typeof categorizedAchievements].filter(a => a.unlocked).length;
              const total = categorizedAchievements[key as keyof typeof categorizedAchievements].length;
              
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-1">
                  <Icon className="w-3 h-3" />
                  {name}
                  <Badge variant="outline" className="text-xs ml-1">
                    {count}/{total}
                  </Badge>
                </TabsTrigger>
              );
            })} */}
          </TabsList>

          <div className="mt-4 overflow-y-auto max-h-96">
            <TabsContent value="all" className="mt-0">
              <AchievementGrid 
                achievements={achievements} 
                onAchievementClick={onAchievementClick}
              />
            </TabsContent>

            {Object.entries(categorizedAchievements).map(([category, categoryAchievements]) => (
              <TabsContent key={category} value={category} className="mt-0">
                <AchievementGrid 
                  achievements={categoryAchievements}
                  onAchievementClick={onAchievementClick}
                />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface AchievementGridProps {
  achievements: Achievement[];
  onAchievementClick?: (achievement: Achievement) => void;
}

function AchievementGrid({ achievements, onAchievementClick }: AchievementGridProps) {
  const sortedAchievements = [...achievements].sort((a, b) => {
    // Sort by unlocked status first, then by rarity
    if (a.unlocked !== b.unlocked) {
      return a.unlocked ? -1 : 1;
    }
    
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <AnimatePresence>
        {sortedAchievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onAchievementClick?.(achievement)}
          >
            <AchievementCard achievement={achievement} size="md" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface RecentAchievementsProps {
  stats: UserStats;
  limit?: number;
}

export function RecentAchievements({ stats, limit = 3 }: RecentAchievementsProps) {
  const achievements = GamificationSystem.checkAchievements(stats);
  const recentAchievements = achievements
    .filter(a => a.unlocked && a.unlockedAt)
    .sort((a, b) => 
      new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime()
    )
    .slice(0, limit);

  if (recentAchievements.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="w-5 h-5" />
          Recent Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentAchievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg"
            >
              <div className="text-2xl">{achievement.icon}</div>
              <div className="flex-1">
                <h4 className="font-medium">{achievement.name}</h4>
                <p className="text-sm text-muted-foreground">
                  {achievement.description}
                </p>
              </div>
              <Badge className="bg-green-100 text-green-800">
                +{achievement.xpReward} XP
              </Badge>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface AchievementNotificationProps {
  achievement: Achievement;
  isVisible: boolean;
  onClose: () => void;
}

export function AchievementNotification({ 
  achievement, 
  isVisible, 
  onClose 
}: AchievementNotificationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          className="fixed top-4 right-4 z-50"
        >
          <Card className="w-80 bg-linear-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                  className="text-3xl"
                >
                  {achievement.icon}
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-yellow-800">
                      Achievement Unlocked!
                    </h4>
                    <Badge className="bg-yellow-200 text-yellow-800">
                      +{achievement.xpReward} XP
                    </Badge>
                  </div>
                  <h5 className="font-semibold">{achievement.name}</h5>
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="self-start"
                >
                  ✕
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}