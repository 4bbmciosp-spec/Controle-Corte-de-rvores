import React, { useState } from 'react';
import { POP_CORTE_ARVORE_DATA } from '../data/popCorteArvoreData';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Zap, 
  Scale, 
  TreePine, 
  Compass, 
  HardHat, 
  CheckCircle2,
  BookOpen,
  Eye,
  Info
} from 'lucide-react';

interface PopViewerModalProps {
  onClose: () => void;
}

export const PopViewerModal: React.FC<PopViewerModalProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState<'TODOS' | 'FINALIDADE' | 'DISPOSICOES' | 'PROCEDIMENTOS' | 'DEFINICOES' | 'ELETRICA'>('TODOS');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1700] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-5xl bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col text-slate-800 print:border-none print:shadow-none print:max-h-full print:bg-white print:text-black">
        
        {/* Modal Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-red-900 via-red-800 to-red-950 text-white border-b border-red-950 flex flex-wrap items-center justify-between gap-3 print:bg-slate-100 print:border-slate-300 print:text-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
              <TreePine className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  POP Oficial CBMRS
                </span>
                <span className="text-xs text-red-200 font-medium">Revisão SET/2024</span>
              </div>
              <h2 className="font-extrabold text-white text-base sm:text-lg tracking-tight print:text-black">
                Procedimento Operacional Padrão: Corte de Árvore
              </h2>
              <p className="text-xs text-red-100 font-medium print:text-slate-600">
                Câmara Técnica de Salvamento em Altura • Corpo de Bombeiros Militar do RS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white text-red-900 hover:bg-red-50 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow cursor-pointer border border-red-200"
              title="Imprimir ou Salvar em PDF"
            >
              <Printer className="w-4 h-4 text-red-700" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-red-200 hover:text-white hover:bg-red-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Navigation Tabs for Fast Field Consultation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto print:hidden text-xs">
          <button
            onClick={() => setActiveSection('TODOS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeSection === 'TODOS'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            Visualização Completa
          </button>
          <button
            onClick={() => setActiveSection('DEFINICOES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeSection === 'DEFINICOES'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Nomenclaturas & Definições</span>
          </button>
          <button
            onClick={() => setActiveSection('PROCEDIMENTOS')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeSection === 'PROCEDIMENTOS'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Procedimentos & Segurança</span>
          </button>
          <button
            onClick={() => setActiveSection('DISPOSICOES')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeSection === 'DISPOSICOES'
                ? 'bg-red-800 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Competências Legais & Risco</span>
          </button>
          <button
            onClick={() => setActiveSection('ELETRICA')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeSection === 'ELETRICA'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Distâncias de Rede Elétrica (MTB-35)</span>
          </button>
        </div>

        {/* Content Body - Structured like the Official Document */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-slate-800 bg-white font-sans leading-relaxed print:p-0 print:space-y-4">
          
          {/* Official Document Letterhead Header (Always displayed for PDF printing) */}
          <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
            <div className="text-[13px] font-black text-slate-900 uppercase tracking-wide">
              {POP_CORTE_ARVORE_DATA.header.state}
            </div>
            <div className="text-xs font-bold text-slate-800 uppercase">
              {POP_CORTE_ARVORE_DATA.header.secretariat} • {POP_CORTE_ARVORE_DATA.header.institution}
            </div>
            <div className="inline-block bg-slate-900 text-white text-xs font-extrabold px-3 py-1 rounded-md mt-1 tracking-wider uppercase">
              {POP_CORTE_ARVORE_DATA.header.documentType}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-slate-600 border-t border-slate-200 mt-2 font-mono">
              <div><strong>Seção:</strong> {POP_CORTE_ARVORE_DATA.header.section}</div>
              <div><strong>Assunto:</strong> {POP_CORTE_ARVORE_DATA.header.subject}</div>
              <div><strong>Câmara Técnica:</strong> Salvamento em Altura</div>
              <div><strong>Revisão:</strong> {POP_CORTE_ARVORE_DATA.header.revisionDate}</div>
            </div>
          </div>

          {/* Quick Notice for Field Crews */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2.5 print:hidden">
            <Info className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold">Diretriz Técnica para as Guarnições do 4º BBM:</strong>
              <p className="mt-0.5 text-slate-700">
                Este POP padroniza a atuação e a terminologia operacional em corte e vistoria de árvores. Consulte as diretrizes de isolamento (raio 2,5x), uso obrigatório de EPI florestal, métodos de <em>Balança</em>, <em>Guia</em> e distâncias mínimas de segurança em redes de alta tensão.
              </p>
            </div>
          </div>

          {/* 1. FINALIDADE */}
          {(activeSection === 'TODOS' || activeSection === 'FINALIDADE') && (
            <section className="space-y-2">
              <div className="bg-slate-900 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-md flex items-center gap-2">
                <span>1 - FINALIDADE</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 px-2 py-1">
                {POP_CORTE_ARVORE_DATA.purpose}
              </p>
            </section>
          )}

          {/* 4. DEFINIÇÕES & NOMENCLATURAS OFICIAIS */}
          {(activeSection === 'TODOS' || activeSection === 'DEFINICOES') && (
            <section className="space-y-3">
              <div className="bg-slate-900 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-md flex items-center justify-between">
                <span>4 - DEFINIÇÕES E NOMENCLATURAS TÉCNICAS</span>
                <span className="text-[10px] font-normal text-slate-300">Base oficial para preenchimento de boletins</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {POP_CORTE_ARVORE_DATA.definitions.map((def, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 transition-all shadow-xs space-y-1"
                  >
                    <div className="text-xs font-extrabold text-red-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-red-700 shrink-0" />
                      <span>{def.title}</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                      {def.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 2. DISPOSIÇÕES GERAIS E COMPETÊNCIAS */}
          {(activeSection === 'TODOS' || activeSection === 'DISPOSICOES') && (
            <section className="space-y-2">
              <div className="bg-slate-900 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-md flex items-center justify-between">
                <span>2 - DISPOSIÇÕES GERAIS E ENQUADRAMENTO LEGAL</span>
                <span className="text-[10px] font-normal text-slate-300">Critérios de risco iminente</span>
              </div>

              <div className="space-y-2 px-1">
                {POP_CORTE_ARVORE_DATA.generalProvisions.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-start gap-2.5">
                    <span className="font-mono font-bold text-red-800 shrink-0 bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                      {item.code}
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 3. PROCEDIMENTOS OPERACIONAIS */}
          {(activeSection === 'TODOS' || activeSection === 'PROCEDIMENTOS') && (
            <section className="space-y-2.5">
              <div className="bg-slate-900 text-white px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-md flex items-center justify-between">
                <span>3 - PROCEDIMENTOS TÉCNICOS OPERACIONAIS</span>
                <span className="text-[10px] font-normal text-slate-300">Normas de segurança da guarnição</span>
              </div>

              <div className="space-y-2 px-1">
                {POP_CORTE_ARVORE_DATA.procedures.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs flex items-start gap-2.5 shadow-xs">
                    <span className="font-mono font-bold text-slate-900 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] border border-slate-200">
                      {item.code}
                    </span>
                    <div className="text-slate-700 leading-relaxed whitespace-pre-line">
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* TABELA DE SEGURANÇA ELÉTRICA (MTB-35) */}
          {(activeSection === 'TODOS' || activeSection === 'ELETRICA') && (
            <section className="space-y-3 bg-amber-50/70 p-4 rounded-xl border border-amber-300">
              <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs uppercase tracking-wider">
                <Zap className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Distância Mínima de Segurança para Linhas Energizadas (MTB-35)</span>
              </div>

              <p className="text-xs text-amber-900">
                Distância mínima necessária de um ponto energizado para que o bombeiro possa se movimentar e manipular ferramentas não isolantes sem risco de abertura de arco elétrico.
              </p>

              <div className="overflow-x-auto bg-white rounded-lg border border-amber-200 shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-amber-100 text-amber-950 font-bold border-b border-amber-200">
                      <th className="p-2.5">Classe de Tensão (kV)</th>
                      <th className="p-2.5">Distância Mínima de Segurança (metros)</th>
                      <th className="p-2.5">Ação Operacional Exigida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100 font-mono text-slate-800">
                    {POP_CORTE_ARVORE_DATA.electricalSafetyTable.map((row, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50">
                        <td className="p-2 font-bold text-red-900">{row.voltage}</td>
                        <td className="p-2 font-bold text-slate-900">{row.distance}</td>
                        <td className="p-2 font-sans text-[11px] text-slate-600">
                          {parseFloat(row.voltage) >= 69 
                            ? '🚨 Acionamento obrigatório de equipe da concessionária de energia'
                            : 'Isolamento de segurança e avaliação técnica de desligamento'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Document Footer Signatures */}
          <div className="pt-6 border-t border-slate-300 text-center space-y-4 print:pt-4">
            <div className="text-xs font-bold text-slate-700 uppercase">
              Câmara Técnica de Salvamento em Altura — CBMRS
            </div>
            <div className="flex justify-around text-xs text-slate-500 pt-4">
              <div className="border-t border-slate-400 w-48 text-center pt-1 font-mono text-[10px]">
                Comandante da Operação / Guarnição
              </div>
              <div className="border-t border-slate-400 w-48 text-center pt-1 font-mono text-[10px]">
                Oficial de Serviço do Pelotão
              </div>
            </div>
          </div>

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-slate-500 font-medium">
            Documento de Referência Normativa • SET/2024
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-red-800 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
