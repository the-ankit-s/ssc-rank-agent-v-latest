import Link from "next/link";

export default function Footer() {
    return (
        <footer className="bg-black text-white pt-16 pb-8 border-t-8 border-primary">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="bg-white rounded p-1 text-black border border-white">
                                <span className="material-symbols-outlined text-lg">analytics</span>
                            </div>
                            <span className="font-bold text-2xl">
                                Rankify<span className="text-primary">AI</span>
                            </span>
                        </div>
                        <p className="text-sm text-gray-400 mb-6 font-body leading-relaxed">
                            Empowering aspirants with data-driven insights. The most trusted platform for exam analysis in India.
                        </p>
                        <div className="flex space-x-4">
                            <a
                                href="#"
                                className="w-10 h-10 rounded border border-gray-700 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-black transition-all"
                            >
                                <span className="material-symbols-outlined">public</span>
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 rounded border border-gray-700 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-black transition-all"
                            >
                                <span className="material-symbols-outlined">chat</span>
                            </a>
                            <a
                                href="#"
                                className="w-10 h-10 rounded border border-gray-700 flex items-center justify-center hover:bg-primary hover:border-primary hover:text-black transition-all"
                            >
                                <span className="material-symbols-outlined">mail</span>
                            </a>
                        </div>
                    </div>

                    {/* Platform */}
                    <div>
                        <h4 className="font-bold text-lg mb-6 uppercase text-primary">Platform</h4>
                        <ul className="space-y-3 text-sm font-medium font-body text-gray-300">
                            <li>
                                <Link href="/submit" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Rank Predictor
                                </Link>
                            </li>
                            <li>
                                <Link href="/exams" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Marks Calculator
                                </Link>
                            </li>
                            <li>
                                <Link href="/cutoffs" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Cut-off Analysis
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="font-bold text-lg mb-6 uppercase text-primary">Resources</h4>
                        <ul className="space-y-3 text-sm font-medium font-body text-gray-300">
                            <li>
                                <a href="#" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Blog
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Exam Updates
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Help Center
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="font-bold text-lg mb-6 uppercase text-primary">Legal</h4>
                        <ul className="space-y-3 text-sm font-medium font-body text-gray-300">
                            <li>
                                <a href="#" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Terms of Service
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-white hover:underline underline-offset-4 decoration-primary">
                                    Cookie Policy
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500 font-bold">© 2024 RANKIFYAI. ALL RIGHTS RESERVED.</p>
                    <div className="flex items-center gap-2 border border-green-900 bg-green-900/20 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="text-xs text-green-400 font-bold uppercase">Systems Operational</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
