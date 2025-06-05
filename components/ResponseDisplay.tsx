import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AiResponseData, AnalysisTask, GroundingChunk, ThemeMode, ThemeRelationship } from '../types';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import ForceGraph2D, { NodeObject, LinkObject } from 'react-force-graph-2d';
// Removed: import OriginalWordCloud from 'react-d3-cloud'; 
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions
  // RadialLinearScale might be needed for PolarArea/Radar if added
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
  // RadialLinearScale
);

interface ResponseDisplayProps {
  response: AiResponseData | null;
  isLoading: boolean;
  error: string | null;
  task: AnalysisTask;
  theme: ThemeMode;
}

type SupportedChartType = 'Bar' | 'Line' | 'Pie' | 'Doughnut' | 'Relationship Map' | 'Adjacency Matrix'; 

interface AppNodeObject extends NodeObject {
  id: string;
  name: string;
  val: number;
  color: string;
  __bckgDimensions?: [number, number];
}

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-8 text-slate-600 dark:text-slate-400">
    <svg className="animate-spin h-10 w-10 text-blue-600 dark:text-blue-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="text-lg font-medium">Generating insights...</p>
    <p className="text-sm">This may take a moment.</p>
  </div>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-700 text-red-700 dark:text-red-300 p-4 rounded-md shadow" role="alert">
    <p className="font-bold">Error</p>
    <p>{message}</p>
  </div>
);

const baseChartColors = [
    'rgba(54, 162, 235, 0.85)', 'rgba(255, 99, 132, 0.85)', 'rgba(75, 192, 192, 0.85)',
    'rgba(255, 206, 86, 0.85)', 'rgba(153, 102, 255, 0.85)', 'rgba(255, 159, 64, 0.85)',
    'rgba(199, 199, 199, 0.85)', 'rgba(83, 102, 255, 0.85)', 'rgba(102, 255, 83, 0.85)',
    'rgba(255, 83, 102, 0.85)',
];
const baseChartColorsDark = [ 
    'rgba(100, 181, 246, 0.85)', // Blue
    'rgba(255, 138, 128, 0.85)', // Red
    'rgba(77, 208, 225, 0.85)',  // Cyan/Teal
    'rgba(212, 170, 38, 0.85)',  // Darker Yellow/Gold
    'rgba(179, 157, 219, 0.85)', // Purple
    'rgba(255, 183, 77, 0.85)',  // Orange
    'rgba(100, 116, 139, 0.85)', // Darker Gray (Slate-ish)
    'rgba(121, 134, 203, 0.85)', // Indigo
    'rgba(129, 212, 250, 0.85)', // Light Blue
    'rgba(240, 98, 146, 0.85)',  // Pink
];


const getInitialDarkModeState = (currentTheme: ThemeMode): boolean => {
  if (currentTheme === 'dark') return true;
  if (currentTheme === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
};

interface ForceDirectedRelationshipChartProps {
  nodesData: Record<string, any>;
  linksData: ThemeRelationship[];
  theme: ThemeMode;
  parentWidth: number;
  parentHeight: number;
}

const ForceDirectedRelationshipChart: React.FC<ForceDirectedRelationshipChartProps> = ({ nodesData, linksData, theme, parentWidth, parentHeight }) => {
  const fgRef = useRef<any>(null);
  const [graphData, setGraphData] = useState<{ nodes: AppNodeObject[], links: LinkObject[] }>({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
  const initialDarkModeStateForGraph: boolean = getInitialDarkModeState(theme);
  const [isEffectiveDarkMode, setIsEffectiveDarkMode] = useState<boolean>(initialDarkModeStateForGraph);

  useEffect(() => {
    const darkModeState = getInitialDarkModeState(theme);
    if(isEffectiveDarkMode !== darkModeState) { 
      setIsEffectiveDarkMode(darkModeState);
    }
    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (event: MediaQueryListEvent) => {
        setIsEffectiveDarkMode(event.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, isEffectiveDarkMode]); 

  const currentChartColors = isEffectiveDarkMode ? baseChartColorsDark : baseChartColors;

  useEffect(() => {
    const appNodes: AppNodeObject[] = Object.entries(nodesData).map(([id, prominence], index) => ({
      id,
      name: id,
      val: typeof prominence === 'number' ? Math.max(1, prominence) : 5,
      color: currentChartColors[index % currentChartColors.length],
    }));

    const typedLinks: LinkObject[] = linksData
        .filter(link => appNodes.find(n => n.id === link.source) && appNodes.find(n => n.id === link.target))
        .map(link => ({
            source: link.source,
            target: link.target,
            strength: link.strength,
    }));
    
    setGraphData({ nodes: appNodes, links: typedLinks });
  }, [nodesData, linksData, currentChartColors]);
  
  const nodeCanvasObject = useCallback((node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const name = (node as AppNodeObject).name || node.id?.toString() || 'Unnamed Node';
    const val = (node as AppNodeObject).val || 5;
    const nodeColor = (node as AppNodeObject).color || 'rgba(31, 120, 180, 0.9)';
    const nodeId = node.id?.toString();

    const label = name;
    const isHovered = nodeId === hoveredNode;
    const fontSize = isHovered ? 14 / globalScale : 12 / globalScale;
    ctx.font = `${isHovered ? 'bold ' : ''}${fontSize}px Sans-Serif`;
    
    const textWidth = ctx.measureText(label).width;
    const nodeRadiusVal = Math.max(1, val);
    const baseRadius = Math.max(2, nodeRadiusVal / 1.5) / globalScale; 
    const nodeRadius = Math.max(baseRadius, textWidth / (2*globalScale) + (isHovered ? 3 : 2) / globalScale);

    const currentX = typeof node.x === 'number' ? node.x : 0;
    const currentY = typeof node.y === 'number' ? node.y : 0;

    ctx.beginPath();
    ctx.arc(currentX, currentY, nodeRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = nodeColor;
    ctx.fill();

    if (isHovered) {
      ctx.strokeStyle = isEffectiveDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isEffectiveDarkMode ? '#f0f0f0' : '#111827'; 
    ctx.fillText(label, currentX, currentY);

    (node as AppNodeObject).__bckgDimensions = [nodeRadius * 2, nodeRadius * 2]; 
  }, [hoveredNode, isEffectiveDarkMode]);

  const handleNodeHover = (node: NodeObject | null) => {
    setHoveredNode(node ? node.id as string : null);
  };

  const linkColor = useCallback((link: any) => {
    const isConnectedToHover = hoveredNode && (link.source.id === hoveredNode || link.target.id === hoveredNode);
    if (isConnectedToHover) return isEffectiveDarkMode ? 'rgba(255,100,100,0.9)' : 'rgba(255,0,0,0.8)';
    return isEffectiveDarkMode ? `rgba(200,200,200,${Math.max(0.2, (link.strength || 0.2) * 0.6)})` : `rgba(0,0,0,${Math.max(0.1, (link.strength || 0.2) * 0.5)})`;
  }, [hoveredNode, isEffectiveDarkMode]);

  const linkWidth = useCallback((link: any) => {
     const isConnectedToHover = hoveredNode && (link.source.id === hoveredNode || link.target.id === hoveredNode);
     return (isConnectedToHover ? 2.5 : 1.5) * Math.max(0.5, (link.strength || 0.5));
  }, [hoveredNode]);

  const nodePointerAreaPaint = useCallback((node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = color;
    const bckgDimensions = (node as AppNodeObject).__bckgDimensions;
    const currentX = typeof node.x === 'number' ? node.x : 0;
    const currentY = typeof node.y === 'number' ? node.y : 0;
    if (bckgDimensions) {
      ctx.fillRect(currentX - bckgDimensions[0] / 2, currentY - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
    }
  }, []);


  if (graphData.nodes.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 p-4 text-center">No theme relationships to display, or data is insufficient for a map.</p>;
  }
  
  if (parentWidth === 0 || parentHeight === 0) {
     return <p className="text-slate-500 dark:text-slate-400 p-4 text-center">Initializing graph...</p>;
  }


  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      width={parentWidth}
      height={parentHeight}
      nodeLabel="name"
      nodeVal="val" 
      nodeRelSize={4} 
      nodeCanvasObject={nodeCanvasObject}
      onNodeHover={handleNodeHover}
      nodePointerAreaPaint={nodePointerAreaPaint}
      linkColor={linkColor}
      linkWidth={linkWidth}
      linkDirectionalParticles={link => hoveredNode && (link.source.id === hoveredNode || link.target.id === hoveredNode) ? 2 : 1}
      linkDirectionalParticleWidth={link => hoveredNode && (link.source.id === hoveredNode || link.target.id === hoveredNode) ? 2.5 : 1.5}
      linkDirectionalParticleSpeed={(link:any) => (link.strength || 0.1) * 0.01}
      cooldownTicks={100}
      onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
      backgroundColor={isEffectiveDarkMode ? "rgba(30, 41, 59, 1)" : "rgba(248, 250, 252, 1)"}
    />
  );
};

interface AdjacencyMatrixChartProps {
  nodesData: Record<string, any>;
  linksData: ThemeRelationship[];
  theme: ThemeMode;
}

const AdjacencyMatrixChart: React.FC<AdjacencyMatrixChartProps> = ({ nodesData, linksData, theme }) => {
  const themes = Object.keys(nodesData).sort();
  const initialDarkModeStateForMatrix: boolean = getInitialDarkModeState(theme);
  const [isEffectiveDarkMode, setIsEffectiveDarkMode] = useState<boolean>(initialDarkModeStateForMatrix);

  useEffect(() => {
     const darkModeState = getInitialDarkModeState(theme);
    if(isEffectiveDarkMode !== darkModeState) {
      setIsEffectiveDarkMode(darkModeState);
    }
    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (event: MediaQueryListEvent) => {
        setIsEffectiveDarkMode(event.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, isEffectiveDarkMode]);


  if (themes.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 p-4 text-center">No themes available for Adjacency Matrix.</p>;
  }

  const getColor = (value: number, type: 'strength' | 'prominence'): string => {
    const maxVal = type === 'prominence' ? 10 : 1;
    const normalizedValue = Math.max(0, Math.min(value / maxVal, 1));
    if (isNaN(normalizedValue)) return isEffectiveDarkMode ? 'rgb(51, 65, 85)' : 'rgb(241, 245, 249)';

    let baseColor, targetColor;
    if (isEffectiveDarkMode) {
      baseColor = type === 'prominence' ? [22, 78, 99] : [30, 58, 138]; 
      targetColor = type === 'prominence' ? [74, 222, 128] : [96, 165, 250]; 
    } else {
      baseColor = type === 'prominence' ? [230, 245, 230] : [220, 235, 255];
      targetColor = type === 'prominence' ? [34, 139, 34] : [54, 162, 235];
    }
    
    const r = Math.round(baseColor[0] + (targetColor[0] - baseColor[0]) * normalizedValue);
    const g = Math.round(baseColor[1] + (targetColor[1] - baseColor[1]) * normalizedValue);
    const b = Math.round(baseColor[2] + (targetColor[2] - baseColor[2]) * normalizedValue);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getTextColor = (bgColorRgb: string, value: number, type: 'strength' | 'prominence'): string => {
      const rgb = bgColorRgb.match(/\d+/g)?.map(Number);
      if (!rgb || rgb.length < 3) return isEffectiveDarkMode ? 'text-slate-100' : 'text-slate-900';
      
      const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
      if (isEffectiveDarkMode) {
        return brightness > 100 ? 'text-slate-900' : 'text-slate-100';
      } else {
        return brightness < 128 ? 'text-slate-100' : 'text-slate-900';
      }
  };

  return (
    <div className="overflow-x-auto p-2">
      <table className="min-w-full border-collapse border border-slate-300 dark:border-slate-600 text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 p-1.5 z-10 min-w-[80px] w-[150px]"></th> {/* Empty corner cell */}
            {themes.map(themeName => (
              <th 
                key={themeName} 
                className="border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300" 
                title={themeName}
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  height: '120px', 
                  width: '40px', // Keep columns narrow
                  minWidth: '40px', // Ensure it doesn't collapse too much
                  textAlign: 'center',
                  verticalAlign: 'middle', // Better for multi-line vertical text
                  padding: '4px 2px',
                  overflowWrap: 'break-word', // Allow text to wrap within the width
                  // wordBreak: 'break-all', // More aggressive breaking if needed
                }}
              >
                {themeName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {themes.map(rowTheme => (
            <tr key={rowTheme}>
              <td 
                className="sticky left-0 bg-slate-50 dark:bg-slate-700/60 border border-slate-300 dark:border-slate-600 p-1.5 font-semibold whitespace-normal z-10 text-slate-700 dark:text-slate-300 min-w-[80px] w-[150px]" 
                title={rowTheme}
                style={{
                  overflowWrap: 'break-word',
                }}
              >
                 {rowTheme}
              </td>
              {themes.map(colTheme => {
                let cellContent: string | number = '-';
                let cellTitle = '';
                let bgColor = '';
                let textColorClass = '';
                let valueForTextColor: number = 0;
                let typeForTextColor: 'strength' | 'prominence' = 'strength';


                if (rowTheme === colTheme) {
                  const prominence = nodesData[rowTheme];
                  valueForTextColor = typeof prominence === 'number' ? prominence : 0;
                  typeForTextColor = 'prominence';
                  cellContent = typeof prominence === 'number' ? prominence.toFixed(1) : String(prominence);
                  cellTitle = `Prominence of ${rowTheme}: ${cellContent}`;
                  bgColor = getColor(valueForTextColor, 'prominence');
                } else {
                  const relationship = linksData.find(
                    link => (link.source === rowTheme && link.target === colTheme) || (link.source === colTheme && link.target === rowTheme)
                  );
                  if (relationship) {
                    valueForTextColor = relationship.strength;
                    typeForTextColor = 'strength';
                    cellContent = relationship.strength.toFixed(2);
                    cellTitle = `Relationship between ${rowTheme} & ${colTheme}: ${cellContent}`;
                    bgColor = getColor(valueForTextColor, 'strength');
                  } else {
                     cellTitle = `No direct relationship found between ${rowTheme} & ${colTheme}`;
                     bgColor = isEffectiveDarkMode ? 'rgb(51, 65, 85)' : 'rgb(248, 250, 252)'; 
                  }
                }
                textColorClass = getTextColor(bgColor, valueForTextColor, typeForTextColor);
                return (
                  <td key={colTheme} className={`border border-slate-300 dark:border-slate-600 p-1.5 text-center ${textColorClass}`} style={{backgroundColor: bgColor}} title={cellTitle}>
                    {cellContent}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


interface FactExtractionDisplayProps {
  data: AiResponseData;
  taskType: AnalysisTask;
  theme: ThemeMode;
}

const FactExtractionDisplay: React.FC<FactExtractionDisplayProps> = ({ data, taskType, theme }) => {
  const facts = data.extractedFacts || {};
  const relationships = data.themeRelationships || [];
  const [selectedChartType, setSelectedChartType] = useState<SupportedChartType>('Bar');
  
  // Updated displayTitle and chartTitleText to remove "(Beta)"
  const displayTitle = taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS ? "Identified Themes & Relationships" : "Extracted Facts";
  const chartTitleText = taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS ? "Visualized Themes & Prominence" : "Visualized Numerical Facts";
  
  const initialDarkModeStateForDisplay: boolean = getInitialDarkModeState(theme);
  const [isEffectiveDarkMode, setIsEffectiveDarkMode] = useState<boolean>(initialDarkModeStateForDisplay);

  const chartContainerRef = useRef<HTMLDivElement>(null); 
  const [chartContainerSize, setChartContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });


  useEffect(() => {
    const darkModeState = getInitialDarkModeState(theme);
    if(isEffectiveDarkMode !== darkModeState) {
      setIsEffectiveDarkMode(darkModeState);
    }
    if (theme === 'system' && typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (event: MediaQueryListEvent) => {
        setIsEffectiveDarkMode(event.matches);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, isEffectiveDarkMode]);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setChartContainerSize({ width, height });
      }
    });

    if (chartContainerRef.current) {
      observer.observe(chartContainerRef.current);
      // Initial size
      const { width, height } = chartContainerRef.current.getBoundingClientRect();
      setChartContainerSize({ width, height });
    }

    return () => {
      if (chartContainerRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        observer.unobserve(chartContainerRef.current);
      }
      observer.disconnect();
    };
  }, []); 


  const currentChartColors = isEffectiveDarkMode ? baseChartColorsDark : baseChartColors;


  const numericalFacts = Object.entries(facts)
    .map(([key, value]) => {
      const strValue = String(value).trim();
      const cleanedValue = strValue.replace(/[$,€£%]/g, '').replace(/,(?=\d{3})/g, '');
      const num = parseFloat(cleanedValue);
      return { label: key, value: num, originalValue: value };
    })
    .filter(item => !isNaN(item.value) && isFinite(item.value));

  const hasNumericalDataForTraditionalCharts = numericalFacts.length >= 1;
  const hasDataForRelationshipVisualizations = taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS && Object.keys(facts).length > 0 && relationships.length >= 0; 

  // Effect for setting initial default chart type
  useEffect(() => {
    let defaultChart: SupportedChartType = 'Bar';
    if (taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) {
      if (hasDataForRelationshipVisualizations) {
        defaultChart = 'Relationship Map';
      } else if (hasNumericalDataForTraditionalCharts) { 
        defaultChart = 'Bar';
      }
    } else if (taskType === AnalysisTask.FACT_EXTRACTION) {
      if (hasNumericalDataForTraditionalCharts) {
        defaultChart = 'Bar';
      }
    }
    setSelectedChartType(defaultChart);
  }, [taskType, facts, relationships, hasNumericalDataForTraditionalCharts, hasDataForRelationshipVisualizations]);
  
  // Effect for validating current selection if data changes
  useEffect(() => {
    let isValidSelection = false;
    switch (selectedChartType) {
        case 'Relationship Map':
        case 'Adjacency Matrix':
            isValidSelection = hasDataForRelationshipVisualizations;
            break;
        case 'Bar':
        case 'Line':
        case 'Pie':
        case 'Doughnut':
            isValidSelection = hasNumericalDataForTraditionalCharts;
            break;
        default:
            isValidSelection = false;
    }

    if (!isValidSelection) {
        if (taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS) {
            if (hasDataForRelationshipVisualizations) setSelectedChartType('Relationship Map');
            else if (hasNumericalDataForTraditionalCharts) setSelectedChartType('Bar');
            else setSelectedChartType('Bar'); 
        } else if (taskType === AnalysisTask.FACT_EXTRACTION) {
            if (hasNumericalDataForTraditionalCharts) setSelectedChartType('Bar');
            else setSelectedChartType('Bar'); 
        }
    }
  }, [selectedChartType, facts, relationships, taskType, hasNumericalDataForTraditionalCharts, hasDataForRelationshipVisualizations]);


  const chartDataConfig: ChartData = {
    labels: numericalFacts.map(fact => fact.label),
    datasets: [{
      label: taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS ? 'Prominence Score' : 'Extracted Numerical Value',
      data: numericalFacts.map(fact => fact.value),
      backgroundColor: selectedChartType === 'Pie' || selectedChartType === 'Doughnut'
        ? numericalFacts.map((_, i) => currentChartColors[i % currentChartColors.length])
        : currentChartColors[0],
      borderColor: selectedChartType === 'Pie' || selectedChartType === 'Doughnut'
        ? numericalFacts.map((_, i) => currentChartColors[i % currentChartColors.length].replace('0.85', '1')) 
        : currentChartColors[0].replace('0.85', '1'), 
      borderWidth: 1,
      fill: selectedChartType === 'Line' ? false : undefined,
      tension: selectedChartType === 'Line' ? 0.1 : undefined,
    }],
  };

  const chartOptionsConfig: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        display: (selectedChartType === 'Pie' || selectedChartType === 'Doughnut') ? true : (numericalFacts.length > 0),
        labels: { color: isEffectiveDarkMode ? '#e2e8f0' : '#334155' } 
      },
      title: {
        display: true,
        text: `${selectedChartType} Chart: ${chartTitleText}`,
        font: { size: 16 },
        color: isEffectiveDarkMode ? '#e2e8f0' : '#1e293b' 
      },
      tooltip: {
        backgroundColor: isEffectiveDarkMode ? 'rgba(51, 65, 85, 0.9)' : 'rgba(255, 255, 255, 0.9)', 
        titleColor: isEffectiveDarkMode ? '#f1f5f9' : '#1e293b', 
        bodyColor: isEffectiveDarkMode ? '#cbd5e1' : '#334155', 
        borderColor: isEffectiveDarkMode ? '#475569' : '#e2e8f0', 
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || context.label || '';
            if (label) { label += ': '; }
            let value = context.parsed.y ?? context.parsed;
            if (value !== null && typeof value === 'number') {
              label += value.toLocaleString();
            } else if (typeof value === 'string'){
              label += value;
            }
            if ((selectedChartType === 'Pie' || selectedChartType === 'Doughnut') && context.chart.data.datasets[0].data.length > 0) {
                const total = context.chart.data.datasets[0].data.reduce((a: number, b: number) => a + b, 0);
                if (total > 0 && typeof value === 'number') { 
                    const percentage = ((value / total) * 100).toFixed(1);
                    label += ` (${percentage}%)`;
                }
            }
            return label;
          }
        }
      }
    },
    scales: (selectedChartType === 'Bar' || selectedChartType === 'Line') ? {
      y: { 
        beginAtZero: true, 
        ticks: { 
            color: isEffectiveDarkMode ? '#94a3b8' : '#475569', 
            callback: function(value: string | number) { if (typeof value === 'number' && Math.abs(value) >= 1000) { return value.toLocaleString(); } return value; }
        },
        grid: { color: isEffectiveDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)' } 
      },
      x: { 
        ticks: { 
            autoSkip: false, maxRotation: 45, minRotation: 0,
            color: isEffectiveDarkMode ? '#94a3b8' : '#475569' 
        },
        grid: { color: isEffectiveDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)' } 
      }
    } : undefined,
  };

  const renderChart = () => {
    if (selectedChartType === 'Relationship Map') {
      if (hasDataForRelationshipVisualizations) {
        return <ForceDirectedRelationshipChart nodesData={facts} linksData={relationships} theme={theme} parentWidth={chartContainerSize.width} parentHeight={chartContainerSize.height} />;
      } else {
        return <p className="text-slate-500 dark:text-slate-400 p-4 text-center">Insufficient data for Relationship Map. AI might not have found significant relationships or themes.</p>;
      }
    }
    if (selectedChartType === 'Adjacency Matrix') {
      if (hasDataForRelationshipVisualizations) {
        // Wrap AdjacencyMatrixChart in a div that allows vertical scrolling within the chart area
        return (
          <div className="w-full h-full overflow-y-auto">
            <AdjacencyMatrixChart nodesData={facts} linksData={relationships} theme={theme} />
          </div>
        );
      } else {
        return <p className="text-slate-500 dark:text-slate-400 p-4 text-center">Insufficient data for Adjacency Matrix. AI might not have found themes or relationships.</p>;
      }
    }
        
    if (!hasNumericalDataForTraditionalCharts) {
         return <p className="text-slate-500 dark:text-slate-400 p-4 text-center">No numerical data available to display this chart type for the current themes/facts. Check if themes have numerical prominence scores or if facts are numerical.</p>;
    }
    switch (selectedChartType) {
      case 'Line': return <Line options={chartOptionsConfig} data={chartDataConfig} />;
      case 'Pie': return <Pie options={chartOptionsConfig} data={chartDataConfig} />;
      case 'Doughnut': return <Doughnut options={chartOptionsConfig} data={chartDataConfig} />;
      case 'Bar': default: return <Bar options={chartOptionsConfig} data={chartDataConfig} />;
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{displayTitle}:</h4>
      {Object.keys(facts).length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm mb-4 max-h-60 bg-white dark:bg-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-600">
            <thead className="bg-slate-50 dark:bg-slate-700/60 sticky top-0 z-10">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS ? "Theme/Topic" : "Fact"}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS ? "Prominence/Score" : "Value"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
              {Object.entries(facts).map(([key, value]) => (
                <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">{key}</td>
                  <td className="px-4 py-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{String(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
         <p className="text-slate-500 dark:text-slate-400 p-4 text-center bg-slate-50 dark:bg-slate-700/60 rounded-md border dark:border-slate-700">No facts or themes were extracted by the AI for this document, or the structure was not recognized.</p>
      )}

      {(hasNumericalDataForTraditionalCharts || hasDataForRelationshipVisualizations) && (
        <>
          <div className="mt-6 p-4 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm bg-white dark:bg-slate-800">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 space-y-2 sm:space-y-0">
              <h5 className="text-md font-semibold text-slate-700 dark:text-slate-200">Data Visualization</h5>
              <div id="chart-type-select-wrapper">
                <label htmlFor="chartTypeSelect" className="sr-only">Select Chart Type</label>
                <select
                  id="chartTypeSelect"
                  value={selectedChartType}
                  onChange={(e) => setSelectedChartType(e.target.value as SupportedChartType)}
                  className="p-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 w-full sm:w-auto bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                  aria-label="Select chart type for visualization"
                >
                  {taskType === AnalysisTask.THEMATIC_CONTENT_ANALYSIS ? (
                    <>
                      <option value="Relationship Map" disabled={!hasDataForRelationshipVisualizations}>Relationship Map</option>
                      <option value="Adjacency Matrix" disabled={!hasDataForRelationshipVisualizations}>Adjacency Matrix</option>
                      <option value="Bar" disabled={!hasNumericalDataForTraditionalCharts}>Bar Chart</option>
                      <option value="Line" disabled={!hasNumericalDataForTraditionalCharts}>Line Chart</option>
                      <option value="Pie" disabled={!hasNumericalDataForTraditionalCharts}>Pie Chart</option>
                      <option value="Doughnut" disabled={!hasNumericalDataForTraditionalCharts}>Doughnut Chart</option>
                    </>
                  ) : ( // For FACT_EXTRACTION
                    <>
                      <option value="Bar" disabled={!hasNumericalDataForTraditionalCharts}>Bar Chart</option>
                      <option value="Line" disabled={!hasNumericalDataForTraditionalCharts}>Line Chart</option>
                      <option value="Pie" disabled={!hasNumericalDataForTraditionalCharts}>Pie Chart</option>
                      <option value="Doughnut" disabled={!hasNumericalDataForTraditionalCharts}>Doughnut Chart</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div ref={chartContainerRef} className="relative w-full bg-white dark:bg-slate-800" style={{ height: '350px', minHeight: '300px' }}>
              {renderChart()}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">Note: Charts display items recognized as numerical or structured relationships. Complex values or non-standard formats might not be visualized accurately.</p>
        </>
      )}
    </div>
  );
};

const SourceChunksDisplay: React.FC<{ chunks: GroundingChunk[] }> = ({ chunks }) => (
  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
    <h4 className="text-md font-semibold text-slate-600 dark:text-slate-300 mb-2">Sources (from Web Search):</h4>
    <ul className="space-y-1 list-disc list-inside">
      {chunks.map((chunk, index) => (
        chunk.web && (
          <li key={index} className="text-sm">
            <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline break-all">
              {chunk.web.title || chunk.web.uri}
            </a>
          </li>
        )
      ))}
    </ul>
  </div>
);

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ response, isLoading, error, task, theme }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!response) {
    return <p className="text-slate-500 dark:text-slate-400 italic text-center py-10">Enter your document and query, then click "Analyze" to see results.</p>;
  }

  const showFactExtractionOrThemeDisplay =
    (task === AnalysisTask.FACT_EXTRACTION || task === AnalysisTask.THEMATIC_CONTENT_ANALYSIS)
    && response.extractedFacts && Object.keys(response.extractedFacts).length > 0; 

  return (
    <div id="response-display-scroll-container" className="space-y-4 max-h-[70vh] md:max-h-[calc(100vh-250px)] overflow-y-auto p-1 pr-2">
      {showFactExtractionOrThemeDisplay ? (
        <FactExtractionDisplay data={response} taskType={task} theme={theme} />
      ) : (
        <div className="prose prose-slate dark:prose-invert max-w-none p-3 bg-slate-50 dark:bg-slate-700/60 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="whitespace-pre-wrap break-words">{String(response?.text || '')}</p>
        </div>
      )}
      {response.sourceChunks && response.sourceChunks.length > 0 && (
        <SourceChunksDisplay chunks={response.sourceChunks} />
      )}
    </div>
  );
};