export default function FeaturesSection() {
  return (
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
  );
}
