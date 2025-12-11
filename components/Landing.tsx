import React from 'react';

interface LandingProps {
  onStart: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
      
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-20">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500 rounded-full blur-[100px]"></div>
      </div>

      <div className="z-10 max-w-2xl w-full text-center space-y-8">
        <div className="flex justify-center mb-6">
            <div className="h-20 w-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
                <i className="fas fa-hand-holding-heart text-4xl text-blue-300"></i>
            </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Civic<span className="text-blue-400">Ally</span>
        </h1>
        
        <p className="text-xl text-blue-100 font-light leading-relaxed">
          The Universal Bureaucratic Advocate. We help you navigate government services, claim assets, and bridge the service gap using advanced AI.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <i className="fas fa-language text-2xl text-blue-300 mb-2"></i>
                <h3 className="font-semibold">Multilingual</h3>
                <p className="text-xs text-slate-300 mt-1">Speak in your native tongue</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <i className="fas fa-file-invoice-dollar text-2xl text-green-300 mb-2"></i>
                <h3 className="font-semibold">Asset Recovery</h3>
                <p className="text-xs text-slate-300 mt-1">Claim unclaimed deposits</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <i className="fas fa-eye text-2xl text-purple-300 mb-2"></i>
                <h3 className="font-semibold">Visual Analysis</h3>
                <p className="text-xs text-slate-300 mt-1">Reads messy documents</p>
            </div>
        </div>

        <button 
          onClick={onStart}
          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-500 hover:scale-105 shadow-xl"
        >
          <span>Start Consultation</span>
          <i className="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
        </button>
        
        <p className="text-xs text-slate-400 pt-8">
          Powered by Gemini 1.5 Pro & Live API • Hackathon Demo
        </p>
      </div>
    </div>
  );
};

export default Landing;