"use client";
import React, { useEffect, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import TextType from "@/components/reactbits/texttype";
import LogoLoop from "@/components/reactbits/logoloop";
import Image from "next/image";
import { motion } from "framer-motion";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { getCollectionData } from "../actions";
import SkeletonFAQs from "@/components/landing/faqskeleton";

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
    <div className="pb-10 w-full flex flex-col items-center select-none">
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
                className="join w-full bg-white px-0 rounded-lg max-w-2xl overflow-hidden shadow-lg"
                onSubmit={handleSearch}
              >
                <div className="flex w-full items-center">
                  <label className="input validator h-full join-item text-black/98 grow border-green-800 rounded-l-lg">
                    <input
                      type="text"
                      name="query"
                      placeholder="Search using a course code or a subject name"
                      className="lg:text-lg lg:font-semibold  focus:outline-none"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="btn btn-neutral join-item bg-green-900 hover:bg-green-950 h-12 w-12 border-0 p-0 transition-transform hover:scale-105 z-1"
                >
                  <Search />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Logo Loop */}
      <div className="w-lvw md:w-[94vw] h-[120px] overflow-x-hidden overflow-y-clip my-8">
        <h2 className="text-center text-lg font-semibold mb-2 text-green-900">
          Powered by DLSU-D and Partners
        </h2>
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

      {/* Metrics */}
      <section className="w-10/12 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-green-50 rounded-2xl p-6 shadow hover:shadow-lg transition text-center"
            >
              <h1 className="font-extrabold text-3xl text-green-900">
                {stat.value}
              </h1>
              <p className="font-semibold">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Description */}
      <section className="mt-14 text-center w-10/12">
        <h1 className="text-4xl font-bold text-green-900">AnimoAprendo</h1>
        <p className="mt-4 text-lg max-w-2xl mx-auto">
          The first peer-to-peer tutoring system of DLSU-D. Learn from students
          who understand your struggles — or share your expertise to help others
          succeed.
        </p>
      </section>

      {/* Teacher CTA */}
      <section className="bg-green-50 py-16 mt-20 w-full text-center">
        <h2 className="text-2xl font-bold text-green-900">
          Teachers, your expertise matters too!
        </h2>
        <p className="mt-2 text-lg text-green-800">
          Join AnimoAprendo to guide students with professional insights and
          experience.
        </p>
        <SignUpButton mode="modal">
          <div className="btn mt-6 bg-green-700 hover:bg-green-800 border-0 text-white rounded-lg">
            Become a Teacher Tutor
          </div>
        </SignUpButton>
      </section>

      {/* Community & Safety */}
      <section className="bg-green-900 text-white py-16 mt-20 w-full text-center">
        <ShieldCheck className="mx-auto h-12 w-12 mb-4" />
        <h2 className="text-3xl font-bold">Community & Safety</h2>
        <p className="mt-4 max-w-2xl mx-auto text-lg">
          AnimoAprendo is built on respect, collaboration, and academic
          integrity. We ensure a safe and supportive space for all learners and
          tutors within DLSU-D.
        </p>
      </section>

      {/* Final Call to Action */}
      <section className="bg-green-800 text-white py-12 text-center mt-10 w-full">
        <h2 className="text-3xl font-bold">Ready to level up your learning?</h2>
        <p className="mt-2 text-lg">
          Join AnimoAprendo today — as a tutor, tutee, or teacher.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <SignInButton mode="modal">
            <div className="btn btn-outline text-white border-white hover:bg-white hover:text-green-900 rounded-lg">
              Find a Tutor
            </div>
          </SignInButton>
          <SignUpButton mode="modal">
            <div className="btn btn-outline text-white border-white hover:bg-white hover:text-green-900 rounded-lg">
              Become a Tutor
            </div>
          </SignUpButton>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-10/12 mt-20">
        <h2 className="text-3xl font-bold text-green-900 text-center">
          Frequently Asked Questions
        </h2>
        <div className="mt-8 space-y-4 max-w-2xl mx-auto">
          {faq ? (
            faq.map((item, i) => (
              <div
                key={i}
                tabIndex={i}
                className="collapse collapse-arrow bg-green-50 rounded-lg shadow border"
              >
                <div className="collapse-title font-semibold">{item.q}</div>
                <div className="collapse-content text-sm">{item.a}</div>
              </div>
            ))
          ) : (
            <SkeletonFAQs />
          )}
        </div>
      </section>
    </div>
  );
}
