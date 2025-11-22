"use client";
import React, { useEffect, useState } from "react";
import { Search, ShieldCheck, Users, BookOpen, Star, Clock, GraduationCap, ChevronRight, Award } from "lucide-react";
import { redirect } from "next/navigation";
import TextType from "@/components/reactbits/texttype";
import LogoLoop from "@/components/reactbits/logoloop";
import Image from "next/image";
import { motion } from "framer-motion";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { getCollectionData } from "../actions";
import SkeletonFAQs from "@/components/landing/faqskeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

// ------------------ PLACEHOLDERS ------------------
const stats = [
  { label: "Tutors", value: 43 },
  { label: "Tutees", value: 43 },
  { label: "Offerings", value: 43 },
  { label: "Hours Tutored", value: 120 },
  { label: "Avg. Rating", value: 4.8 },
  { label: "Subjects", value: 25 },
];

export type FAQs = {
  q: string;
  a: string;
};
// ---------------------------------------------------

const techLogos = [
  {
    node: (
      <Image
        src={"/images/AnimoAprendoMinimalLogo.png"}
        width={50}
        height={50}
        alt="logo"
      />
    ),
    title: "AnimoAprendo",
    href: "https://animoaprendo.com",
  },
  {
    node: (
      <Image src={"/images/DLSUDLogo.png"} width={50} height={50} alt="logo" />
    ),
    title: "DLSUD",
    href: "https://dlsud.edu.ph",
  },
  {
    node: (
      <Image src={"/images/CICSLogo.png"} width={50} height={50} alt="logo" />
    ),
    title: "CICS",
    href: "https://www.facebook.com/dlsud.cics",
  },
  {
    node: (
      <Image src={"/images/COSLogo.png"} width={50} height={50} alt="logo" />
    ),
    title: "COS",
    href: "https://www.facebook.com/profile.php?id=61565118910503",
  },
];

export default function Landing() {
  const [faq, setFaq] = useState<FAQs[]>();

  useEffect(() => {
    getCollectionData("faq").then((res) => {
      if (res.success) {
        setFaq(res.data);
      }
    });
  }, []);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("query");
    const queryFormat = String(query).trim().replace(/ /g, "+");

    if (queryFormat) {
      redirect("/search?query=" + queryFormat);
    }
  }

  return (
    <div className="w-full select-none">
      {/* Hero Section */}
      <section className="w-full">
        <div
          className="hero w-full min-h-[44rem] relative"
          style={{
            backgroundImage: "url(/images/DLSUD-rotonda.jpg)",
          }}
        >
          <div className="hero-overlay bg-gradient-to-b from-green-900/40 to-black/70 "></div>
          <div className="hero-content !items-start !justify-start text-white/95 w-full">
            <div className="w-full">
              <TextType
                text={["Having trouble with a subject?", "We got you covered!"]}
                id="hero-title"
                typingSpeed={75}
                variableSpeed={{ min: 50, max: 75 }}
                pauseDuration={2000}
                cursorCharacter="_"
                className="text-2xl h-8 lg:h-16 lg:text-5xl font-semibold"
              />
              <br />
              <p className="lg:mb-3 lg:text-2xl font-light">
                Where students teach, learn, and grow together.
              </p>
              <br />

              <form
                className="flex w-full max-w-2xl bg-white text-black/95 rounded-lg shadow-xl overflow-hidden"
                onSubmit={handleSearch}
              >
                <Input
                  type="text"
                  name="query"
                  placeholder="Search using a course code or a subject name"
                  className="flex-1 text-lg font-medium border-0 rounded-l-lg rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0 h-14"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="bg-green-900 hover:bg-green-800 rounded-l-none px-6 h-14"
                >
                  <Search className="w-5 h-5" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Loop */}
      <section className="w-full py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              <Award className="w-4 h-4 mr-2" />
              Trusted Partners
            </Badge>
            <h2 className="text-xl font-semibold text-muted-foreground">
              Powered by DLSU-D and Academic Partners
            </h2>
          </div>
          <div className="w-full h-[120px] overflow-x-hidden overflow-y-clip">
            <LogoLoop
              logos={techLogos}
              speed={50}
              direction="left"
              logoHeight={48}
              scaleOnHover
              gap={60}
              fadeOut
              fadeOutColor="#ffffff"
              ariaLabel="Technology partners"
            />
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Our Growing Community</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join thousands of students and educators in our thriving academic community
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, i) => {
            const icons = [Users, BookOpen, BookOpen, Clock, Star, GraduationCap];
            const Icon = icons[i] || Users;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="text-center hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="pt-6">
                    <Icon className="w-12 h-12 mx-auto mb-4 text-primary" />
                    <h3 className="text-3xl font-bold mb-2 text-primary">
                      {stat.value}
                    </h3>
                    <p className="text-muted-foreground font-medium">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Description */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="outline" className="mb-6">
            <GraduationCap className="w-4 h-4 mr-2" />
            DLSU-D's First Peer-to-Peer Platform
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">AnimoAprendo</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            The first peer-to-peer tutoring system of DLSU-D. Learn from students
            who understand your struggles — or share your expertise to help others
            succeed in their academic journey.
          </p>
        </div>
      </section>

      {/* Teacher CTA */}
      <section className="bg-muted/50 py-20 w-full">
        <div className="container mx-auto px-4 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl flex items-center justify-center gap-2">
                <GraduationCap className="w-8 h-8 text-primary" />
                Teachers, your expertise matters too!
              </CardTitle>
              <CardDescription className="text-lg">
                Join AnimoAprendo to guide students with professional insights and
                experience from the classroom.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpButton mode="modal">
                <Button size="lg" className="bg-green-700 hover:bg-green-800">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Become a Teacher Tutor
                </Button>
              </SignUpButton>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Community & Safety */}
      <section className="bg-primary text-primary-foreground py-20 w-full">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-foreground/10 rounded-full mb-6">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Community & Safety</h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto leading-relaxed">
              AnimoAprendo is built on respect, collaboration, and academic
              integrity. We ensure a safe and supportive space for all learners and
              tutors within the DLSU-D community.
            </p>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="bg-gradient-to-r from-green-800 to-green-900 text-white py-20 w-full">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to level up your learning?</h2>
            <p className="text-xl opacity-90 mb-8">
              Join AnimoAprendo today — as a tutor, tutee, or teacher.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <SignInButton mode="modal">
                <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-green-900">
                  <Search className="w-4 h-4 mr-2" />
                  Find a Tutor
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline" size="lg" className="bg-transparent border-white text-white hover:bg-white hover:text-green-900">
                  <Users className="w-4 h-4 mr-2" />
                  Become a Tutor
                </Button>
              </SignUpButton>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Find answers to common questions about our platform
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          {faq ? (
            <div className="space-y-4">
              {faq.map((item, i) => (
                <Collapsible key={i}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardTitle className="text-left text-lg flex items-center justify-between">
                          {item.q}
                          <ChevronRight className="w-5 h-5 transition-transform duration-200" />
                        </CardTitle>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Separator className="mb-4" />
                        <p className="text-muted-foreground">{item.a}</p>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          ) : (
            <SkeletonFAQs />
          )}
        </div>
      </section>
    </div>
  );
}
