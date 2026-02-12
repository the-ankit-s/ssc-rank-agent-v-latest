export default function HowItWorksSection() {
  return (
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
  );
}
