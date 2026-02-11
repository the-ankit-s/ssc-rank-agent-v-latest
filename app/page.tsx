import Link from "next/link";
import { Suspense } from "react";
import Image from "next/image";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import SubmitForm from "@/components/submit-form";


export default function HomePage() {
  return (
    <>
      <Navbar />

      {/* Hero Section */}
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

      {/* Stats Section */}
      <section className="py-16 border-y-4 border-black bg-brutal-yellow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-black uppercase mb-2">Platform Stats</h2>
            <div className="h-1 w-24 bg-black mx-auto"></div>
            <p className="mt-4 font-bold text-gray-800">Real-time data straight from the battleground</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white rounded-xl border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 border-2 border-black rounded-lg text-primary">
                  <span className="material-symbols-outlined">group</span>
                </div>
                <span className="text-xs font-bold text-black bg-green-200 border border-black px-2 py-1 rounded">+12% this week</span>
              </div>
              <div className="text-4xl font-black text-black mb-1">1.2M+</div>
              <div className="text-sm font-bold text-gray-500 uppercase">Total Submissions</div>
            </div>

            <div className="p-6 bg-white rounded-xl border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 border-2 border-black rounded-lg text-purple-600">
                  <span className="material-symbols-outlined">assignment_turned_in</span>
                </div>
                <span className="text-xs font-bold text-black bg-gray-200 border border-black px-2 py-1 rounded">50+ Exams</span>
              </div>
              <div className="text-4xl font-black text-black mb-1">45k+</div>
              <div className="text-sm font-bold text-gray-500 uppercase">Daily Rank Checks</div>
            </div>

            <div className="p-6 bg-white rounded-xl border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 border-2 border-black rounded-lg text-orange-600">
                  <span className="material-symbols-outlined">precision_manufacturing</span>
                </div>
                <span className="text-xs font-bold text-black bg-green-200 border border-black px-2 py-1 rounded">Precision</span>
              </div>
              <div className="text-4xl font-black text-black mb-1">99.2%</div>
              <div className="text-sm font-bold text-gray-500 uppercase">Accuracy Rate</div>
            </div>

            <div className="p-6 bg-white rounded-xl border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-teal-100 border-2 border-black rounded-lg text-teal-600">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <span className="text-xs font-bold text-black bg-gray-200 border border-black px-2 py-1 rounded">Fast</span>
              </div>
              <div className="text-4xl font-black text-black mb-1">2.5s</div>
              <div className="text-sm font-bold text-gray-500 uppercase">Processing Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl font-black text-black uppercase leading-tight">
              Everything you need to <br />
              <span className="bg-primary text-white px-2 transform rotate-2 inline-block">analyze</span> your performance
            </h2>
            <p className="mt-6 text-lg font-medium text-gray-600">
              We go beyond simple score calculation. Get deep insights into your weak areas and compare with toppers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative p-8 bg-blue-50 rounded-xl border-2 border-black shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200">
              <div className="w-16 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center mb-6 shadow-brutal-sm group-hover:bg-primary group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-4xl">bar_chart</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-3 uppercase">Normalization Score</h3>
              <p className="font-medium text-gray-600 leading-relaxed font-body">
                Our AI predicts your normalized score based on shift difficulty levels, helping you understand your actual standing before official results.
              </p>
            </div>

            <div className="group relative p-8 bg-purple-50 rounded-xl border-2 border-black shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200">
              <div className="w-16 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center mb-6 shadow-brutal-sm group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-4xl">pie_chart</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-3 uppercase">Section-wise Analysis</h3>
              <p className="font-medium text-gray-600 leading-relaxed font-body">
                Break down your performance by subject. Identify strong and weak zones in Math, Reasoning, English, and General Awareness.
              </p>
            </div>

            <div className="group relative p-8 bg-orange-50 rounded-xl border-2 border-black shadow-brutal hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200">
              <div className="w-16 h-16 bg-white border-2 border-black rounded-lg flex items-center justify-center mb-6 shadow-brutal-sm group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <span className="material-symbols-outlined text-4xl">leaderboard</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-3 uppercase">Category Rank</h3>
              <p className="font-medium text-gray-600 leading-relaxed font-body">
                Know your rank not just overall, but specifically within your category (UR, OBC, SC, ST, EWS) to gauge your selection chances accurately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Exams */}
      <section className="py-16 bg-brutal-bg border-t-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
            <h2 className="text-3xl font-black text-black uppercase bg-white border-2 border-black px-4 py-2 shadow-brutal-sm">
              Recent Exams Live
            </h2>
            <Link href="/exams" className="group font-bold text-black hover:text-primary flex items-center gap-2 border-b-2 border-transparent hover:border-primary transition-all">
              View all exams <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="relative bg-white rounded-xl p-6 border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
              <div className="absolute -top-3 -right-3 bg-green-400 border-2 border-black text-black text-xs font-black px-3 py-1 rounded shadow-brutal-sm transform rotate-6">
                ACTIVE
              </div>
              <div className="w-14 h-14 bg-gray-50 border-2 border-black rounded-lg flex items-center justify-center mb-4 text-2xl">
                🏛️
              </div>
              <h3 className="text-xl font-bold text-black uppercase">SSC CGL 2024</h3>
              <p className="text-sm font-bold text-gray-500 mb-6 font-body">Tier-I Preliminary Exam</p>
              <div className="flex items-center text-xs font-bold text-gray-700 gap-4 pt-4 border-t-2 border-dashed border-gray-300">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">groups</span> 850k+ Data
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">calendar_month</span> Sep 2024
                </span>
              </div>
            </div>

            <div className="relative bg-white rounded-xl p-6 border-2 border-black shadow-brutal hover:-translate-y-1 transition-transform">
              <div className="absolute -top-3 -right-3 bg-green-400 border-2 border-black text-black text-xs font-black px-3 py-1 rounded shadow-brutal-sm transform -rotate-3">
                ACTIVE
              </div>
              <div className="w-14 h-14 bg-gray-50 border-2 border-black rounded-lg flex items-center justify-center mb-4 text-2xl">
                👮‍♂️
              </div>
              <h3 className="text-xl font-bold text-black uppercase">SSC CPO 2024</h3>
              <p className="text-sm font-bold text-gray-500 mb-6 font-body">Paper-I Analysis</p>
              <div className="flex items-center text-xs font-bold text-gray-700 gap-4 pt-4 border-t-2 border-dashed border-gray-300">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">groups</span> 120k+ Data
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">calendar_month</span> June 2024
                </span>
              </div>
            </div>

            <div className="relative bg-gray-100 rounded-xl p-6 border-2 border-black border-dashed opacity-80 hover:opacity-100 transition-opacity">
              <div className="absolute -top-3 -right-3 bg-gray-300 border-2 border-black text-gray-700 text-xs font-black px-3 py-1 rounded">
                CLOSED
              </div>
              <div className="w-14 h-14 bg-white border-2 border-black rounded-lg flex items-center justify-center mb-4 text-2xl grayscale">
                💻
              </div>
              <h3 className="text-xl font-bold text-black uppercase">SSC CHSL 2023</h3>
              <p className="text-sm font-bold text-gray-500 mb-6 font-body">Final Result Out</p>
              <div className="flex items-center text-xs font-bold text-gray-700 gap-4 pt-4 border-t-2 border-dashed border-gray-300">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">groups</span> 400k+ Data
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">calendar_month</span> Mar 2024
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-white border-t-4 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-black text-center text-black mb-20 uppercase">How it works</h2>

          <div className="relative">
            <div className="hidden md:block absolute top-10 left-0 w-full h-2 bg-black -translate-y-1/2 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
              <div className="text-center group">
                <div className="w-20 h-20 mx-auto bg-white rounded-full border-4 border-black flex items-center justify-center text-black font-black text-2xl mb-6 shadow-brutal group-hover:-translate-y-2 transition-transform duration-300 relative">
                  1
                </div>
                <h3 className="text-xl font-bold text-black mb-2 uppercase">Copy Link</h3>
                <p className="text-sm font-medium text-gray-600 font-body px-2">
                  Copy your response sheet URL from the official SSC website after login.
                </p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 mx-auto bg-white rounded-full border-4 border-black flex items-center justify-center text-black font-black text-2xl mb-6 shadow-brutal group-hover:-translate-y-2 transition-transform duration-300 relative">
                  2
                </div>
                <h3 className="text-xl font-bold text-black mb-2 uppercase">Paste & Submit</h3>
                <p className="text-sm font-medium text-gray-600 font-body px-2">
                  Paste the link in our form, select your category, and click predict.
                </p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 mx-auto bg-white rounded-full border-4 border-black flex items-center justify-center text-black font-black text-2xl mb-6 shadow-brutal group-hover:-translate-y-2 transition-transform duration-300 relative">
                  3
                </div>
                <h3 className="text-xl font-bold text-black mb-2 uppercase">AI Analysis</h3>
                <p className="text-sm font-medium text-gray-600 font-body px-2">
                  Our system processes your raw score and calculates normalization.
                </p>
              </div>

              <div className="text-center group">
                <div className="w-20 h-20 mx-auto bg-primary rounded-full border-4 border-black flex items-center justify-center text-white font-black text-2xl mb-6 shadow-brutal group-hover:-translate-y-2 transition-transform duration-300 relative">
                  4
                </div>
                <h3 className="text-xl font-bold text-black mb-2 uppercase">Get Result</h3>
                <p className="text-sm font-medium text-gray-600 font-body px-2">
                  View your detailed scorecard, rank, and percentile instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
