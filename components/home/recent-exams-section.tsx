import Link from "next/link";

export default function RecentExamsSection() {
  return (
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
  );
}
