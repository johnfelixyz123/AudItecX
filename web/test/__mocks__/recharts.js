const React = require('react')

function passthroughComponent(name) {
  const Component = ({ children }) => {
    if (typeof children === 'function') {
      return React.createElement('div', { 'data-mock': name }, children({ width: 400, height: 240 }))
    }
    return React.createElement('div', { 'data-mock': name }, children)
  }
  Component.displayName = `${name}Mock`
  return Component
}

module.exports = {
  ResponsiveContainer: passthroughComponent('ResponsiveContainer'),
  BarChart: passthroughComponent('BarChart'),
  Bar: passthroughComponent('Bar'),
  XAxis: passthroughComponent('XAxis'),
  YAxis: passthroughComponent('YAxis'),
  Tooltip: () => null,
  Cell: ({ children }) => React.createElement('div', { 'data-mock': 'Cell' }, children),
  CartesianGrid: passthroughComponent('CartesianGrid'),
}
