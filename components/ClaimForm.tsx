import React from 'react';
import { ClaimDraft } from '../types';

interface ClaimFormProps {
  data: ClaimDraft;
}

const ClaimForm: React.FC<ClaimFormProps> = ({ data }) => {
  const progress = Object.values(data).filter(v => v !== '' && v !== 'draft').length / 5 * 100;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <div className="bg-blue-600 px-6 py-4 text-white flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">Affidavit for Unclaimed Deposit</h3>
          <p className="text-blue-100 text-sm">Form DEA-2014 (RBI Compliant)</p>
        </div>
        <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
          <i className="fas fa-file-contract text-white"></i>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 h-1.5">
        <div 
          className="bg-green-500 h-1.5 transition-all duration-1000 ease-out" 
          style={{ width: `${Math.min(progress, 100)}%` }}
        ></div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Claimant Name</label>
            <div className={`p-3 rounded-lg border ${data.claimantName ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              {data.claimantName || 'Waiting for input...'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deceased Account Holder</label>
            <div className={`p-3 rounded-lg border ${data.deceasedName ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              {data.deceasedName || 'Waiting for input...'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Relationship</label>
            <div className={`p-3 rounded-lg border ${data.relationship ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              {data.relationship || 'Waiting for input...'}
            </div>
          </div>

           <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bank Name</label>
            <div className={`p-3 rounded-lg border ${data.bankName ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              {data.bankName || 'Waiting for input...'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
           <div className="flex items-center space-x-2">
              <span className={`h-3 w-3 rounded-full ${data.status === 'ready' ? 'bg-green-500' : 'bg-amber-400'}`}></span>
              <span className="text-sm font-medium text-slate-700 capitalize">
                {data.status === 'ready' ? 'Ready for Submission' : 'Drafting in progress...'}
              </span>
           </div>
        </div>
      </div>
      
      <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
         <button 
           disabled={data.status !== 'ready'}
           className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center space-x-2 transition-colors ${data.status === 'ready' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
         >
           <i className="fas fa-print"></i>
           <span>Generate PDF</span>
         </button>
      </div>
    </div>
  );
};

export default ClaimForm;