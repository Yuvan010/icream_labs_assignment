'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Globe, AlertCircle, Search, Bell, Settings, LogOut, Activity, ArrowUpRight, Target, Sparkles, Zap, BarChart3 } from 'lucide-react';
import './dashboard.css';

export default function Dashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [engineData, setEngineData] = useState<any[]>([]);
  const [keywordData, setKeywordData] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [overallScore, setOverallScore] = useState(0);

  // Add the missing loadDashboard function
  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        router.push('/auth');
        return;
      }

      const { data: projects, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .limit(1);

      if (projectError) {
        setError('Failed to load project');
        setLoading(false);
        return;
      }

      if (!projects || projects.length === 0) {
        setLoading(false);
        return;
      }

      const proj = projects[0];
      setProject(proj);

      const { data: keywords } = await supabase
        .from('keywords')
        .select('*')
        .eq('project_id', proj.id);

      const { data: engines } = await supabase.from('engines').select('*');

      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data: checks } = await supabase
        .from('checks')
        .select('*')
        .eq('project_id', proj.id)
        .gte('timestamp', fourteenDaysAgo.toISOString())
        .order('timestamp', { ascending: true });

      if (checks && keywords && engines) {
        processData(checks, keywords, engines);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  // Add the missing processData function
  const processData = (checks: any[], keywords: any[], engines: any[]) => {
    const dailyData: any = {};
    
    checks.forEach(check => {
      const date = new Date(check.timestamp).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
      if (!dailyData[date]) {
        dailyData[date] = { date, total: 0, present: 0, engines: {} };
      }
      dailyData[date].total++;
      if (check.presence) dailyData[date].present++;
      
      const engineName = engines.find(e => e.id === check.engine_id)?.name || 'Unknown';
      if (!dailyData[date].engines[engineName]) {
        dailyData[date].engines[engineName] = { total: 0, present: 0 };
      }
      dailyData[date].engines[engineName].total++;
      if (check.presence) dailyData[date].engines[engineName].present++;
    });

    const trend = Object.values(dailyData).map((day: any) => ({
      date: day.date,
      score: Math.round((day.present / day.total) * 100),
      ...Object.fromEntries(
        Object.entries(day.engines).map(([name, data]: [string, any]) => [
          name.toLowerCase(),
          Math.round((data.present / data.total) * 100)
        ])
      )
    }));

    setTrendData(trend);
    
    const last7Days = trend.slice(-7);
    const avgScore = last7Days.length > 0 
      ? last7Days.reduce((sum, d) => sum + d.score, 0) / last7Days.length 
      : 0;
    setOverallScore(Math.round(avgScore));

    const enginePerf: any = {};
    engines.forEach(engine => {
      const engineChecks = checks.filter(c => c.engine_id === engine.id);
      const present = engineChecks.filter(c => c.presence).length;
      const citations = engineChecks.reduce((sum, c) => sum + (c.citations_count || 0), 0);
      
      enginePerf[engine.name] = {
        name: engine.name,
        score: engineChecks.length > 0 ? Math.round((present / engineChecks.length) * 100) : 0,
        checks: engineChecks.length,
        citations
      };
    });

    setEngineData(Object.values(enginePerf));

    const keywordPerf = keywords.map(kw => {
      const kwChecks = checks.filter(c => c.keyword_id === kw.id);
      const present = kwChecks.filter(c => c.presence).length;
      const score = kwChecks.length > 0 ? Math.round((present / kwChecks.length) * 100) : 0;
      
      const recent = kwChecks.slice(-20);
      const older = kwChecks.slice(-40, -20);
      const recentScore = recent.length > 0 ? recent.filter(c => c.presence).length / recent.length : 0;
      const olderScore = older.length > 0 ? older.filter(c => c.presence).length / older.length : 0;
      
      let trend = 'stable';
      if (recentScore > olderScore + 0.1) trend = 'up';
      if (recentScore < olderScore - 0.1) trend = 'down';

      const engineCount = new Set(kwChecks.filter(c => c.presence).map(c => c.engine_id)).size;

      return {
        keyword: kw.keyword,
        visibility: score,
        trend,
        engines: engineCount,
        id: kw.id
      };
    });

    setKeywordData(keywordPerf.sort((a, b) => b.visibility - a.visibility));

    const recs: any[] = [];
    
    keywordPerf.forEach(kw => {
      if (kw.engines < 4) {
        const missing = 4 - kw.engines;
        recs.push({
          type: 'missing',
          text: `"${kw.keyword}" missing on ${missing} engine${missing > 1 ? 's' : ''}`,
          priority: 'high'
        });
      }
    });

    keywordPerf.forEach(kw => {
      if (kw.visibility < 50) {
        recs.push({
          type: 'low',
          text: `Low visibility for "${kw.keyword}" (${kw.visibility}%)`,
          priority: 'medium'
        });
      }
    });

    const engineNames = Object.keys(enginePerf);
    if (engineNames.length > 0) {
      const bestEngine = enginePerf[engineNames.reduce((a, b) => 
        enginePerf[a].score > enginePerf[b].score ? a : b
      )];
      
      if (bestEngine) {
        recs.push({
          type: 'opportunity',
          text: `Strong performance on ${bestEngine.name} (${bestEngine.score}%)`,
          priority: 'low'
        });
      }
    }

    setRecommendations(recs.slice(0, 4));
  };

  // Add the missing handleSignOut function
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-content">
          <div className="loading-spinner-large">
            <div className="spinner-background"></div>
            <div className="spinner-foreground"></div>
            <Sparkles className="spinner-icon" />
          </div>
          <p className="loading-text">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-container">
          <div className="error-icon-large">
            <AlertCircle className="error-icon-svg" />
          </div>
          <h2 className="error-title">Something Went Wrong</h2>
          <p className="error-message-text">{error}</p>
          <button onClick={loadDashboard} className="btn-primary error-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="dashboard-error">
        <div className="error-container">
          <div className="error-icon-large">
            <Target className="error-icon-svg" />
          </div>
          <h2 className="error-title">No Project Found</h2>
          <p className="error-message-text">Run the seed script to generate sample data:</p>
          <code className="seed-code">npm run seed</code>
          <button onClick={handleSignOut} className="sign-out-button">
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          {/* Left Side - Logo & Project */}
          <div className="header-left">
            <div className="logo-section-header">
              <div className="logo-container-header">
                
                
              </div>
              <div className="logo-text">
                <h1 className="app-title-header">AEO Tracker</h1>
                <p className="app-subtitle-header">AI Search Intelligence</p>
              </div>
            </div>
            
            <div className="project-info">
              <Globe className="project-icon" />
              <div>
                <div className="project-name">{project.name}</div>
                <div className="project-domain">{project.domain}</div>
              </div>
            </div>
          </div>
          
          {/* Right Side - Actions */}
          <div className="header-right">
            <button className="header-action">
              <Bell className="action-icon" />
            </button>
            <button className="header-action">
              <Settings className="action-icon" />
            </button>
            <button onClick={handleSignOut} className="sign-out-header">
              <LogOut className="sign-out-icon" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        <div className="main-content">
          {/* KPI Cards Row */}
          <div className="kpi-grid">
            {/* Overall Visibility Card */}
            <div className="kpi-card featured">
              <div className="kpi-content">
                <div className="kpi-header">
                  <div className="kpi-icon-container">
                    <Activity className="kpi-icon" />
                  </div>
                  <div className="trend-badge">
                    <TrendingUp className="trend-icon" />
                    <span>+12%</span>
                  </div>
                </div>
                <p className="kpi-label">OVERALL VISIBILITY</p>
                <h3 className="kpi-value">{overallScore}%</h3>
                <p className="kpi-description">Last 7 days average</p>
              </div>
            </div>

            {/* Keywords Tracked Card */}
            <div className="kpi-card">
              <div className="kpi-content">
                <div className="kpi-header">
                  <div className="kpi-icon-container keyword">
                    <Search className="kpi-icon" />
                  </div>
                </div>
                <p className="kpi-label">KEYWORDS TRACKED</p>
                <h3 className="kpi-value">{keywordData.length}</h3>
                <p className="kpi-description">Across 4 AI engines</p>
              </div>
            </div>

            {/* Data Points Card */}
            <div className="kpi-card">
              <div className="kpi-content">
                <div className="kpi-header">
                  <div className="kpi-icon-container data">
                    <BarChart3 className="kpi-icon" />
                  </div>
                </div>
                <p className="kpi-label">DATA POINTS</p>
                <h3 className="kpi-value">{trendData.length}</h3>
                <p className="kpi-description">Last 14 days</p>
              </div>
            </div>

            {/* Avg Citations Card */}
            <div className="kpi-card">
              <div className="kpi-content">
                <div className="kpi-header">
                  <div className="kpi-icon-container citation">
                    <Zap className="kpi-icon" />
                  </div>
                </div>
                <p className="kpi-label">AVG CITATIONS</p>
                <h3 className="kpi-value">
                  {engineData.length > 0 
                    ? Math.round(engineData.reduce((sum, e) => sum + e.citations, 0) / engineData.length) 
                    : 0}
                </h3>
                <p className="kpi-description">Per engine</p>
              </div>
            </div>
          </div>

          {/* Visibility Trend Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <div>
                <h2 className="chart-title">Visibility Trend</h2>
                <p className="chart-subtitle">Performance over the last 14 days</p>
              </div>
              <select className="chart-select">
                <option>Last 14 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>
            {trendData.length > 0 ? (
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} />
                    <XAxis dataKey="date" stroke="#64748B" style={{ fontSize: '14px', fontWeight: 600 }} />
                    <YAxis stroke="#64748B" style={{ fontSize: '14px', fontWeight: 600 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                        border: '2px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                        fontSize: '14px',
                        fontWeight: 600
                      }}
                      labelStyle={{ color: '#1E293B', fontWeight: 700, marginBottom: '8px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: 600 }} />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="url(#lineGradient)" 
                      strokeWidth={4} 
                      name="Overall" 
                      dot={{ fill: '#8B5CF6', r: 6, strokeWidth: 2, stroke: '#7C3AED' }} 
                      activeDot={{ r: 8 }}
                    />
                    <Line type="monotone" dataKey="chatgpt" stroke="#10B981" strokeWidth={3} name="ChatGPT" dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="gemini" stroke="#F59E0B" strokeWidth={3} name="Gemini" dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="claude" stroke="#EF4444" strokeWidth={3} name="Claude" dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="perplexity" stroke="#8B5CF6" strokeWidth={3} name="Perplexity" dot={{ r: 5 }} />
                    <defs>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="50%" stopColor="#EC4899" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="chart-empty">
                <p>No trend data available</p>
              </div>
            )}
          </div>

          {/* Bottom Row */}
          <div className="bottom-grid">
            {/* Keyword Performance */}
            <div className="bottom-card">
              <div className="bottom-card-header">
                <div>
                  <h2 className="bottom-card-title">Keyword Performance</h2>
                  <p className="bottom-card-subtitle">Top performing keywords</p>
                </div>
                <button className="view-all-button">
                  <ArrowUpRight className="button-icon" />
                  View All
                </button>
              </div>
              
              <div className="keywords-list">
                {keywordData.slice(0, 6).map((keyword, index) => (
                  <div key={keyword.id} className="keyword-item">
                    <div className="keyword-main">
                      <div className="keyword-rank">{index + 1}</div>
                      <div className="keyword-info">
                        <h4 className="keyword-name">{keyword.keyword}</h4>
                        <div className="keyword-meta">
                          <div className="keyword-meta-item">
                            <Globe className="meta-icon" />
                            <span>{keyword.engines}/4 engines</span>
                          </div>
                          <div className="keyword-meta-item">
                            {keyword.trend === 'up' && <TrendingUp className="meta-icon trend-up" />}
                            {keyword.trend === 'down' && <TrendingDown className="meta-icon trend-down" />}
                            {keyword.trend === 'stable' && <Minus className="meta-icon trend-stable" />}
                            <span className={`trend-text trend-${keyword.trend}`}>
                              {keyword.trend}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="keyword-stats">
                      <div className="visibility-score">{keyword.visibility}%</div>
                      <div className="visibility-label">VISIBILITY</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bottom-card">
              <div className="bottom-card-header">
                <div>
                  <h2 className="bottom-card-title">AI Recommendations</h2>
                  <p className="bottom-card-subtitle">Actionable insights for improvement</p>
                </div>
              </div>
              
              <div className="recommendations-list">
                {recommendations.map((rec, index) => (
                  <div key={index} className={`recommendation-item priority-${rec.priority}`}>
                    <div className="recommendation-indicator"></div>
                    <div className="recommendation-content">
                      <h4 className="recommendation-text">{rec.text}</h4>
                      <div className="recommendation-meta">
                        <span className={`priority-badge priority-${rec.priority}`}>
                          {rec.priority.toUpperCase()} PRIORITY
                        </span>
                        <span className="recommendation-type">{rec.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {recommendations.length === 0 && (
                  <div className="no-recommendations">
                    <div className="no-rec-icon">
                      <Sparkles className="no-rec-icon-svg" />
                    </div>
                    <h4 className="no-rec-title">Great Performance!</h4>
                    <p className="no-rec-text">No critical recommendations at this time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}