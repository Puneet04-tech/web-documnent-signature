import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { FileText, Users, Clock, TrendingUp, Calendar, Download } from 'lucide-react'
import { format } from 'date-fns'
import api from '../services/api'

export default function DocumentAnalytics() {
  const { id } = useParams<{ id: string }>()
  const [timeRange, setTimeRange] = useState('30d')

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', id, timeRange],
    queryFn: () => api.getDocumentAnalytics(id, timeRange),
    enabled: !!id
  })

  const analytics = analyticsData?.data

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  const signatureData = analytics.signaturesOverTime || []
  const activityData = analytics.activityByDay || []
  const deviceData = analytics.deviceBreakdown || []

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Document Analytics</h1>
          <p className="mt-1 text-sm text-white/75">{analytics.documentName}</p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-white/10 rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={() => api.exportAnalytics(id, timeRange)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-8 w-8 text-white/60" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-white/60">Total Views</p>
              <p className="text-2xl font-bold text-white">{analytics.totalViews}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-white/60" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-white/60">Unique Signers</p>
              <p className="text-2xl font-bold text-white">{analytics.uniqueSigners}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-white/60" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-white/60">Avg. Signing Time</p>
              <p className="text-2xl font-bold text-white">{analytics.avgSigningTime}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-white/60" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-white/60">Completion Rate</p>
              <p className="text-2xl font-bold text-white">{analytics.completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signatures Over Time */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-white mb-4">Signatures Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={signatureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Line 
                type="monotone" 
                dataKey="signatures" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity by Day */}
        <div className="card p-6">
          <h3 className="text-lg font-medium text-white mb-4">Activity by Day</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="day" 
                stroke="#9CA3AF"
                tickFormatter={(value) => format(new Date(value), 'EEE')}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#F3F4F6' }}
              />
              <Bar dataKey="views" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-white mb-4">Device Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={deviceData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {deviceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
