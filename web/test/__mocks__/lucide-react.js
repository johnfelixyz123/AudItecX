const React = require('react')

const createIcon = (name) => {
  const Icon = (props = {}) => React.createElement('svg', { 'data-icon': name, ...props })
  Icon.displayName = `MockIcon(${name})`
  return Icon
}

module.exports = new Proxy(
  {},
  {
    get: (_target, property) => {
      if (property === '__esModule') {
        return true
      }
      const name = typeof property === 'string' ? property : 'icon'
      return createIcon(name)
    },
  },
)
