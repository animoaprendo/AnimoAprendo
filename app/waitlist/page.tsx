'use client';

import { motion } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Users, Award, GraduationCap, Target, Clock, Calendar, CheckCircle } from 'lucide-react';

export default function ComingSoonPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <GraduationCap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">AnimoAprendo</span>
          </motion.div>
        </div>
      </nav>

      <div className="pt-20">
        {/* Hero Section */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm">
                🚀 Coming Soon
              </Badge>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                The Future of
                <span className="bg-gradient-to-r from-green-600 via-green-400 to-blue-500 bg-clip-text text-transparent"> Peer Learning</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Connect with top tutors from De La Salle University-Dasmariñas. 
                Experience personalized learning that adapts to your schedule and learning style.
              </p>

              {/* Coming Soon Info */}
              <Card className="max-w-md mx-auto mb-12 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-2xl text-center text-gray-900">
                    Coming Soon
                  </CardTitle>
                  <CardDescription className="text-center">
                    We're working hard to bring you the best peer-to-peer learning experience.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-center py-6"
                  >
                    <Calendar className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-700 font-medium mb-2">Launch Expected</p>
                    <p className="text-2xl font-bold text-blue-600 mb-4">Late 2025</p>
                    <p className="text-sm text-gray-600">
                      AnimoAprendo is being carefully developed to provide the best 
                      tutoring experience for DLSU-D students.
                    </p>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Features Preview */}
        <section className="px-6 py-20 bg-white/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                What Makes AnimoAprendo Special?
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Discover the features that will revolutionize how you learn and teach.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <Card className="h-full border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <BookOpen className="h-12 w-12 text-blue-600 mb-4" />
                    <CardTitle className="text-xl">Smart Matching</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Our system matches you with the perfect tutor based on your learning style, 
                      schedule, and academic needs.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <Card className="h-full border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <Users className="h-12 w-12 text-purple-600 mb-4" />
                    <CardTitle className="text-xl">Live Collaboration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      Engage in real-time chat, and video calls. 
                      Learn together with Microsoft Teams integration.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <Card className="h-full border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow">
                  <CardHeader>
                    <Award className="h-12 w-12 text-indigo-600 mb-4" />
                    <CardTitle className="text-xl">Verified Tutors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">
                      All tutors are verified DLSU-D students and alumni with proven track records 
                      in their respective subjects.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-green-800 text-white px-6 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <GraduationCap className="h-8 w-8 text-blue-400" />
                <span className="text-2xl font-bold">AnimoAprendo</span>
              </div>
              <p className="text-gray-400 mb-6">
                Empowering the next generation of learners through peer-to-peer education.
              </p>
              <Separator className="bg-gray-700 mb-6" />
              <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-400">
                <p>© 2024 AnimoAprendo. All rights reserved.</p>
                <p>De La Salle University-Dasmariñas</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}