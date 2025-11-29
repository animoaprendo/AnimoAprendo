"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Star, 
  Users, 
  Target,
  BarChart3,
  Zap,
  Award
} from "lucide-react";
import { motion } from "framer-motion";
import { UserStats } from "@/lib/gamification/types";
import { GamificationSystem } from "@/lib/gamification/system";

interface StatsOverviewProps {
  stats: UserStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const profile = GamificationSystem.createProfile("current-user", stats);
  
  const statItems = [
    {
      label: "Sessions Completed",
      value: stats.completed,
      icon: Calendar,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      change: "+3 this week"
    },
    {
      label: "Average Rating",
      value: stats.averageRating ? `${stats.averageRating.toFixed(1)}⭐` : "No ratings",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      change: stats.totalReviews ? `${stats.totalReviews} reviews` : ""
    },
    {
      label: "Response Time",
      value: stats.responseTime ? 
        (stats.responseTime < 60 ? `${Math.round(stats.responseTime)}m` : 
         (() => {
           const hours = stats.responseTime / 60;
           return hours % 1 === 0 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
         })()) : "N/A",
      icon: Clock,
      color: "text-green-600",
      bgColor: "bg-green-50",
      change: stats.responseTime && stats.responseTime <= 120 ? "Excellent!" : ""
    },
    {
      label: "Current Streak",
      value: `${stats.streakDays || 0} days`,
      icon: Zap,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      change: stats.streakDays && stats.streakDays >= 7 ? "On fire! 🔥" : ""
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-full ${item.bgColor}`}>
                    <Icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  {item.change && (
                    <Badge variant="outline" className="text-xs">
                      {item.change}
                    </Badge>
                  )}
                </div>
                <div>
                  <div className={`text-2xl font-bold ${item.color} mb-1`}>
                    {item.value}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

interface ProgressTrackerProps {
  stats: UserStats;
  goals?: {
    sessions: number;
    rating: number;
    streak: number;
  };
}

export function ProgressTracker({ stats, goals = { sessions: 50, rating: 4.5, streak: 30 } }: ProgressTrackerProps) {
  const progressItems = [
    {
      label: "Session Goal",
      current: stats.completed,
      target: goals.sessions,
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-100"
    },
    {
      label: "Rating Goal",
      current: stats.averageRating || 0,
      target: goals.rating,
      icon: Star,
      color: "text-yellow-600", 
      bgColor: "bg-yellow-100",
      isDecimal: true
    },
    {
      label: "Streak Goal",
      current: stats.streakDays || 0,
      target: goals.streak,
      icon: Zap,
      color: "text-orange-600",
      bgColor: "bg-orange-100"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Progress Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {progressItems.map((item, index) => {
          const Icon = item.icon;
          const progress = Math.min((item.current / item.target) * 100, 100);
          const isCompleted = item.current >= item.target;
          
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded ${item.bgColor}`}>
                    <Icon className={`w-3 h-3 ${item.color}`} />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                  {isCompleted && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      Complete!
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.isDecimal 
                    ? `${item.current.toFixed(1)}/${item.target}` 
                    : `${item.current}/${item.target}`
                  }
                </span>
              </div>
              <Progress 
                value={progress} 
                className="h-2"
              />
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface ActivityHeatmapProps {
  stats: UserStats;
  activityData?: { date: string; sessions: number }[];
}

export function ActivityHeatmap({ stats, activityData = [] }: ActivityHeatmapProps) {
  // Generate mock activity data for the last 30 days if not provided
  const mockData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      sessions: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0
    };
  });

  const data = activityData.length > 0 ? activityData : mockData;
  const maxSessions = Math.max(...data.map(d => d.sessions));

  const getIntensity = (sessions: number) => {
    if (sessions === 0) return "bg-gray-100";
    const intensity = Math.min(sessions / maxSessions, 1);
    if (intensity <= 0.25) return "bg-green-200";
    if (intensity <= 0.5) return "bg-green-300"; 
    if (intensity <= 0.75) return "bg-green-400";
    return "bg-green-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Activity Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Last 30 days</span>
            <span>{stats.streakDays || 0} day streak</span>
          </div>
          
          <div className="grid grid-cols-10 gap-1">
            {data.map((day, index) => (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`w-3 h-3 rounded-sm ${getIntensity(day.sessions)} cursor-pointer`}
                title={`${day.date}: ${day.sessions} sessions`}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gray-100 rounded-sm" />
              <div className="w-3 h-3 bg-green-200 rounded-sm" />
              <div className="w-3 h-3 bg-green-300 rounded-sm" />
              <div className="w-3 h-3 bg-green-400 rounded-sm" />
              <div className="w-3 h-3 bg-green-500 rounded-sm" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WeeklyGoalsProps {
  stats: UserStats;
  weeklyTarget?: number;
}

export function WeeklyGoals({ stats, weeklyTarget = 5 }: WeeklyGoalsProps) {
  // Mock current week progress (you'd get this from your database)
  const currentWeekSessions = Math.floor(stats.completed * 0.15); // Rough estimate
  const progress = Math.min((currentWeekSessions / weeklyTarget) * 100, 100);
  const remainingSessions = Math.max(0, weeklyTarget - currentWeekSessions);
  
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const mockWeeklyData = daysOfWeek.map((day, index) => ({
    day,
    sessions: index < 4 ? Math.floor(Math.random() * 2) + 1 : 0,
    isToday: index === 3 // Mock Thursday as today
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            This Week's Goals
          </span>
          <Badge 
            variant={progress >= 100 ? "default" : "outline"}
            className={progress >= 100 ? "bg-green-600" : ""}
          >
            {currentWeekSessions}/{weeklyTarget}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Weekly Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3" />
          {remainingSessions > 0 && (
            <p className="text-xs text-muted-foreground">
              {remainingSessions} more session{remainingSessions !== 1 ? 's' : ''} to reach your goal
            </p>
          )}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {mockWeeklyData.map((day, index) => (
            <motion.div
              key={day.day}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`text-center p-2 rounded-lg ${
                day.isToday 
                  ? 'bg-primary/10 border-primary/20 border-2' 
                  : 'bg-muted'
              }`}
            >
              <div className="text-xs font-medium mb-1">{day.day}</div>
              <div className={`text-lg font-bold ${
                day.sessions > 0 ? 'text-green-600' : 'text-gray-400'
              }`}>
                {day.sessions || '·'}
              </div>
            </motion.div>
          ))}
        </div>

        {progress >= 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-3 bg-green-50 rounded-lg border border-green-200"
          >
            <Award className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm font-medium text-green-800">
              Weekly goal achieved! 🎉
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}