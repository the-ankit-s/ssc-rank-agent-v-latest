import { Suspense } from "react";
import SubmitForm from "@/components/submit-form";

export default function HeroSection() {
  return (
    <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
      {/* Animated Blobs */}
      <div className="absolute top-20 right-0 -z-10 w-96 h-96 bg-brutal-blue rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-40 -left-10 -z-10 w-96 h-96 bg-brutal-purple rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left Content */}
          <div className="lg:w-1/2 text-center lg:text-left z-10">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-black shadow-brutal-sm rounded-lg mb-8 transform -rotate-2 hover:rotate-0 transition-transform cursor-default">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-black"></span>
              </span>
              <span className="font-bold text-sm">Live: SSC CGL 2024 Analysis</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-black mb-6 leading-[1.1]">
              PREDICT YOUR <br />
              <span className="relative inline-block px-4 py-1 mx-1 transform -rotate-1 bg-primary border-4 border-black shadow-brutal text-white">
                SSC RANK
              </span>
              <br />WITH AI POWER
            </h1>

            {/* Description */}
            <p className="text-xl font-medium text-gray-700 font-body mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed border-l-4 border-brutal-yellow pl-6">
              Join 1M+ aspirants using our brutal algorithms to analyze performance, predict cut-offs, and compare scores across shifts with{" "}
              <span className="bg-brutal-yellow px-1 border border-black">99% accuracy</span>.
            </p>

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start">
              <div className="flex -space-x-4">
                <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-300"></div>
                <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-400"></div>
                <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-500"></div>
                <div className="w-12 h-12 rounded-full border-2 border-black bg-brutal-yellow flex items-center justify-center text-xs font-bold text-black z-10">
                  +2k
                </div>
              </div>
              <div className="flex items-center gap-2 font-bold font-body bg-white px-3 py-1 border-2 border-black rounded shadow-brutal-sm">
                <span className="material-symbols-outlined text-yellow-500">star</span>
                <span>4.9/5 from verified users</span>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:w-1/2 w-full perspective-1000">
            <div className="relative transform rotate-1 hover:rotate-0 transition-transform duration-300">
              <div className="absolute top-4 left-4 w-full h-full bg-black rounded-xl border-2 border-black"></div>
              <div className="relative bg-white rounded-xl border-4 border-black p-6 sm:p-8">
                {/* Form Header */}
                <div className="flex items-center justify-between mb-8 border-b-4 border-black pb-4 border-dashed">
                  <h3 className="text-2xl font-bold uppercase">Check Your Rank</h3>
                  <div className="bg-brutal-green text-black border-2 border-black px-3 py-1 rounded font-bold text-xs uppercase shadow-[2px_2px_0px_#000]">
                    Instant Result
                  </div>
                </div>

                {/* Form */}
                <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded-xl"></div>}>
                  <SubmitForm />
                </Suspense>

                {/* Form Footer */}
                <div className="mt-6 pt-4 border-t-2 border-black flex items-center justify-between text-xs font-bold text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-green-600 text-sm">lock</span>
                    <span>Secure & Private</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-blue-600 text-sm">update</span>
                    <span>Updated 10m ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
