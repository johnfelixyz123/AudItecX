const React = require('react')

function ReactMarkdown(props) {
  const { children, ...rest } = props || {}
  return React.createElement('div', { 'data-markdown': true, ...rest }, children)
}

module.exports = ReactMarkdown
module.exports.default = ReactMarkdown
