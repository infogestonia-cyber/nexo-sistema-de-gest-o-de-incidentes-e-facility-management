import React, { useState, useEffect } from 'react';
import { 
  Download, BarChart2, PieChart, Calendar, Cpu, 
  AlertTriangle, ShieldCheck, Wallet, Search,
  ChevronRight, Box as BoxIcon, History, FileText,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { RefreshButton } from './ui/RefreshButton';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';

const Box = (props: any) => <BoxIcon {...props} />;
const AlertCircle = (props: any) => <AlertTriangle {...props} />;

const REPORT_CATEGORIES = [
  {
    id: 'incidents',
    title: 'Incidentes',
    description: 'Histórico de ocorrências',
    icon: History,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  {
    id: 'assets',
    title: 'Ativos & Inventário',
    description: 'Detalhes e localização',
    icon: Cpu,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  {
    id: 'sla',
    title: 'Performance SLA',
    description: 'Tempos de resposta',
    icon: ShieldCheck,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10'
  },
  {
    id: 'materials',
    title: 'Consumo Materiais',
    description: 'Peças em intervenções',
    icon: Box,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  {
    id: 'stock',
    title: 'Stock Crítico',
    description: 'Alertas de reposição',
    icon: AlertCircle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10'
  },
  {
    id: 'finance',
    title: 'Analítico Financeiro',
    description: 'Custos reais vs orçados',
    icon: Wallet,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
  {
    id: 'maintenance',
    title: 'Plano Manutenção',
    description: 'Cronograma preventivas',
    icon: Calendar,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10'
  },
  {
    id: 'planning',
    title: 'Estratégico 5Y',
    description: 'Planeamento Capex/Opex',
    icon: BarChart2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  }
];

export default function Reports() {
  const [activeReportId, setActiveReportId] = useState('incidents');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const token = (sessionStorage.getItem('token') || localStorage.getItem('token'));

  const fetchReportData = async (type: string) => {
    setLoading(true);
    setCurrentPage(1);
    try {
      let endpoint = '';
      switch (type) {
        case 'incidents': endpoint = '/api/incidents'; break;
        case 'assets': endpoint = '/api/assets'; break;
        case 'maintenance': endpoint = '/api/maintenance-plans'; break;
        case 'planning': endpoint = '/api/planning-5y'; break;
        case 'sla': endpoint = '/api/reports/sla-performance'; break;
        case 'materials': endpoint = '/api/reports/material-consumption'; break;
        case 'stock': endpoint = '/api/reports/critical-stock'; break;
        case 'finance': endpoint = '/api/analytics/resource-allocation'; break;
      }

      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao obter dados');
      const data = await res.json();
      
      let finalData = Array.isArray(data) ? data : [];
      
      if (type === 'finance' && data && !Array.isArray(data)) {
          finalData = [{
              Total_Real: data.total,
              Maos_de_Obra: data.labor,
              Pecas: data.parts,
              Logistica: data.logistics,
              Consumiveis: data.consumables,
              Perc_Maos_de_Obra: `${data.percentages?.labor}%`,
              Perc_Pecas: `${data.percentages?.parts}%`,
              Perc_Logistica: `${data.percentages?.logistics}%`,
              Perc_Consumiveis: `${data.percentages?.consumables}%`
          }];
      }
      setReportData(finalData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData(activeReportId);
  }, [activeReportId]);

  const exportToExcel = () => {
    if (!reportData || reportData.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório");
    XLSX.writeFile(workbook, `Nexo_${activeReportId}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredData = reportData.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeReport = REPORT_CATEGORIES.find(r => r.id === activeReportId);

  return (
    <div className="space-y-6 page-enter pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Centro de Relatórios & BI</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Análise operacional e conformidade auditável</p>
        </div>
        <RefreshButton onClick={() => fetchReportData(activeReportId)} loading={loading} label="Sincronizar BI" />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation - Card Style */}
        <aside className="w-full lg:w-72 shrink-0">
          <Card className="border-border bg-card/50 overflow-hidden sticky top-24">
            <CardHeader className="py-4 px-6 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold flex items-center gap-2">
                <Database size={12} className="text-primary" /> Categorias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {REPORT_CATEGORIES.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setActiveReportId(report.id)}
                    className={`w-full flex items-center gap-3 p-3 transition-all rounded-md group ${
                      activeReportId === report.id 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10' 
                        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className={`p-1.5 rounded-sm transition-colors ${
                      activeReportId === report.id ? 'bg-white/20 text-white' : `${report.bgColor} ${report.color}`
                    }`}>
                      <report.icon size={16} />
                    </div>
                    <div className="text-left overflow-hidden">
                       <p className="text-[10px] font-bold uppercase tracking-wider truncate">
                        {report.title}
                       </p>
                    </div>
                    <ChevronRight size={12} className={`ml-auto transition-transform ${activeReportId === report.id ? 'translate-x-0.5' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Data Viewer - Card Style */}
        <main className="flex-1 min-w-0">
          <Card className="border-border bg-card shadow-sm h-full flex flex-col">
            <CardHeader className="p-6 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
               <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-lg ${activeReport?.bgColor} ${activeReport?.color} border border-border/50`}>
                     {activeReport && <activeReport.icon size={20} />}
                  </div>
                  <div>
                     <CardTitle className="text-lg font-bold tracking-tight">{activeReport?.title}</CardTitle>
                     <CardDescription className="text-[10px] uppercase tracking-widest font-medium mt-0.5">
                        {filteredData.length} Registros Encontrados
                     </CardDescription>
                  </div>
               </div>

               <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                     <input 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Pesquisar..." 
                        className="w-full sm:w-48 bg-muted/30 border border-border pl-9 pr-4 py-2 text-[11px] rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all font-medium"
                     />
                  </div>
                  <Button 
                    onClick={exportToExcel}
                    disabled={loading || reportData.length === 0}
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest border-border hover:bg-primary hover:text-primary-foreground transition-all flex gap-2 shrink-0"
                  >
                    <Download size={14} /> Excel
                  </Button>
               </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 overflow-hidden relative min-h-[500px] flex flex-col">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div 
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-20 bg-card/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-3"
                  >
                    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">A carregar matriz...</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <div className="flex-1 overflow-x-auto">
                <div className="min-w-full inline-block align-middle p-6 pb-2"> {/* Added padding as requested */}
                  {filteredData.length > 0 ? (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow className="border-border hover:bg-transparent">
                            {Object.keys(filteredData[0]).map((key) => (
                              <TableHead key={key} className="text-foreground h-12 text-[10px] font-bold uppercase tracking-widest py-4 bg-muted/30 whitespace-nowrap px-4 border-r border-border/10 last:border-0">
                                {key.replace(/_/g, ' ')}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedData.map((row, i) => (
                            <TableRow key={i} className="border-border/50 hover:bg-muted/20 group transition-all">
                              {Object.values(row).map((val: any, j) => (
                                <TableCell key={j} className="text-muted-foreground font-medium text-[11px] py-4 px-4 group-hover:text-foreground transition-colors max-w-[300px] truncate border-r border-border/10 last:border-0">
                                  {typeof val === 'boolean' ? (
                                    <Badge variant={val ? "success" : "destructive"} className="text-[8px] h-4 uppercase font-black px-1">
                                      {val ? 'Sim' : 'Não'}
                                    </Badge>
                                  ) : (
                                    String(val)
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="h-96 flex flex-col items-center justify-center gap-6 p-8">
                       <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center border border-border/50">
                          <Search size={24} className="text-muted-foreground" />
                       </div>
                       <div className="text-center space-y-2">
                          <p className="text-sm font-bold text-foreground">A procura não devolveu resultados</p>
                          <p className="text-xs text-muted-foreground">Experimente ajustar o termo de pesquisa ou selecione outra categoria lateral.</p>
                       </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pagination Footer */}
              {filteredData.length > pageSize && (
                <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/10 shrink-0">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                    Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredData.length)} de {filteredData.length} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <div className="flex items-center gap-1">
                       {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "ghost"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="h-8 w-8 p-0 text-[10px] font-bold"
                            >
                              {page}
                            </Button>
                          );
                       })}
                       {totalPages > 5 && <span className="text-muted-foreground text-[10px] px-1">...</span>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRightIcon size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Audit Footnote */}
      <Card className="border-dashed border-border bg-transparent shadow-none">
        <CardContent className="p-4 flex items-center gap-4 opacity-70">
           <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0 border border-border">
              <FileText size={18} />
           </div>
           <div>
              <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Centro de Exportação Certificado Nexo</p>
              <p className="text-[9px] text-muted-foreground leading-relaxed mt-0.5">
                Todos os dados gerados nesta consola seguem os padrões de integridade e imutabilidade exigidos pela ISO 41001 e normas de Facility Management local.
              </p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}

const Database = (props: any) => (
  <svg 
    {...props} 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
  >
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
  </svg>
);

