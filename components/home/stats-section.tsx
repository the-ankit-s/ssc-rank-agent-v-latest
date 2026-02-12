export default function StatsSection() {
  return (
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
  );
}
