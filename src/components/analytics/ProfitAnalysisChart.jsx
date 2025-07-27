import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

export default function ProfitAnalysisChart({ data, type = 'line', title }) {
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-md">
          <p className="font-medium">{label}</p>
          {type === 'scatter' ? (
            <>
              <p className="text-blue-600">
                Days in Stock: <span className="font-bold">{data.x}</span>
              </p>
              <p className="text-green-600">
                Profit Margin: <span className="font-bold">{data.y}%</span>
              </p>
            </>
          ) : (
            <p className="text-green-600">
              Profit: <span className="font-bold">₹{(payload[0].value / 100000).toFixed(1)}L</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (type === 'scatter') {
    return (
      <Card className="momentum-card">
        <CardHeader>
          <CardTitle>{title || 'Profit Margin vs Days in Stock'}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Days in Stock"
                label={{ value: 'Days in Stock', position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Profit Margin (%)"
                label={{ value: 'Profit Margin (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter dataKey="y" fill="#00C49F" />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="momentum-card">
      <CardHeader>
        <CardTitle>{title || 'Monthly Profit Trends'}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Profit (₹L)', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#00C49F" 
              strokeWidth={3}
              dot={{ fill: '#00C49F', r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}