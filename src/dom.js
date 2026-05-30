/**
 * dom.js
 * Minimal DOM implementation buat Kitsune
 * Cukup buat JS di page bisa manipulasi document
 */

import * as htmlparser2 from 'htmlparser2'
import * as cssSelect from 'css-select'
import render from 'dom-serializer'

export function createDOM(html = '') {
  // Parse HTML jadi DOM tree
  let dom = htmlparser2.parseDocument(html)

  // Helper: cari semua element
  function findAll(selector, root = dom) {
    try {
      return cssSelect.selectAll(selector, root)
    } catch {
      return []
    }
  }

  // Helper: cari satu element
  function findOne(selector, root = dom) {
    try {
      return cssSelect.selectOne(selector, root) || null
    } catch {
      return null
    }
  }

  // Bikin element object yang bisa dipakai JS di page
  function wrapElement(node) {
    if (!node) return null

    const el = {
      // Properties
      get innerHTML() {
        return render(node.children || [])
      },
      set innerHTML(val) {
        const parsed = htmlparser2.parseDocument(val)
        node.children = parsed.children
        node.children.forEach(c => { c.parent = node })
      },

      get outerHTML() {
        return render(node)
      },

      get textContent() {
        return getText(node)
      },
      set textContent(val) {
        node.children = [{ type: 'text', data: val, parent: node }]
      },

      get innerText() {
        return getText(node)
      },

      // Tag info
      get tagName() {
        return (node.name || '').toUpperCase()
      },
      get nodeName() {
        return (node.name || '').toUpperCase()
      },
      get nodeType() { return 1 },

      // Attributes
      getAttribute(name) {
        return node.attribs?.[name] ?? null
      },
      setAttribute(name, val) {
        if (!node.attribs) node.attribs = {}
        node.attribs[name] = String(val)
      },
      removeAttribute(name) {
        if (node.attribs) delete node.attribs[name]
      },
      hasAttribute(name) {
        return name in (node.attribs || {})
      },

      get id() { return node.attribs?.id || '' },
      set id(val) {
        if (!node.attribs) node.attribs = {}
        node.attribs.id = val
      },

      get className() { return node.attribs?.class || '' },
      set className(val) {
        if (!node.attribs) node.attribs = {}
        node.attribs.class = val
      },

      get classList() {
        const classes = (node.attribs?.class || '').split(' ').filter(Boolean)
        return {
          contains: (c) => classes.includes(c),
          add: (c) => {
            if (!classes.includes(c)) classes.push(c)
            if (!node.attribs) node.attribs = {}
            node.attribs.class = classes.join(' ')
          },
          remove: (c) => {
            const idx = classes.indexOf(c)
            if (idx > -1) classes.splice(idx, 1)
            if (!node.attribs) node.attribs = {}
            node.attribs.class = classes.join(' ')
          },
          toggle: (c) => {
            if (classes.includes(c)) {
              classes.splice(classes.indexOf(c), 1)
            } else {
              classes.push(c)
            }
            if (!node.attribs) node.attribs = {}
            node.attribs.class = classes.join(' ')
          },
          get length() { return classes.length }
        }
      },

      get href() { return node.attribs?.href || '' },
      get src() { return node.attribs?.src || '' },
      get value() { return node.attribs?.value || '' },
      set value(val) {
        if (!node.attribs) node.attribs = {}
        node.attribs.value = val
      },

      // Style (simulasi sederhana)
      style: new Proxy({}, {
        get: () => '',
        set: () => true
      }),

      // DOM traversal
      get parentElement() {
        return node.parent ? wrapElement(node.parent) : null
      },
      get parentNode() {
        return node.parent ? wrapElement(node.parent) : null
      },
      get children() {
        const kids = (node.children || []).filter(c => c.type === 'tag')
        return kids.map(wrapElement)
      },
      get childNodes() {
        return (node.children || []).map(wrapElement)
      },
      get firstChild() {
        return node.children?.[0] ? wrapElement(node.children[0]) : null
      },
      get lastChild() {
        const kids = node.children || []
        return kids.length ? wrapElement(kids[kids.length - 1]) : null
      },
      get nextSibling() {
        if (!node.parent) return null
        const siblings = node.parent.children || []
        const idx = siblings.indexOf(node)
        return idx < siblings.length - 1 ? wrapElement(siblings[idx + 1]) : null
      },
      get previousSibling() {
        if (!node.parent) return null
        const siblings = node.parent.children || []
        const idx = siblings.indexOf(node)
        return idx > 0 ? wrapElement(siblings[idx - 1]) : null
      },

      // Query
      querySelector(sel) {
        return wrapElement(findOne(sel, node))
      },
      querySelectorAll(sel) {
        return findAll(sel, node).map(wrapElement)
      },
      getElementsByTagName(tag) {
        return findAll(tag, node).map(wrapElement)
      },
      getElementsByClassName(cls) {
        return findAll(`.${cls}`, node).map(wrapElement)
      },

      // DOM manipulation
      appendChild(child) {
        if (!node.children) node.children = []
        if (child._node) {
          child._node.parent = node
          node.children.push(child._node)
        }
        return child
      },
      removeChild(child) {
        if (node.children && child._node) {
          const idx = node.children.indexOf(child._node)
          if (idx > -1) node.children.splice(idx, 1)
        }
        return child
      },
      insertBefore(newChild, refChild) {
        if (!node.children) node.children = []
        if (newChild._node && refChild?._node) {
          const idx = node.children.indexOf(refChild._node)
          if (idx > -1) node.children.splice(idx, 0, newChild._node)
          else node.children.push(newChild._node)
        }
        return newChild
      },
      remove() {
        if (node.parent?.children) {
          const idx = node.parent.children.indexOf(node)
          if (idx > -1) node.parent.children.splice(idx, 1)
        }
      },
      cloneNode(deep = false) {
        const clone = JSON.parse(JSON.stringify(node))
        return wrapElement(clone)
      },

      // Events (no-op, kita gak perlu actual events)
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      click: () => {},
      focus: () => {},
      blur: () => {},

      // Bounding rect (simulasi)
      getBoundingClientRect: () => ({
        top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0
      }),

      // contains
      contains(other) {
        return other?._node ? node.children?.includes(other._node) ?? false : false
      },

      matches(sel) {
        try {
          return cssSelect.is(node, sel)
        } catch {
          return false
        }
      },

      // Reference ke raw node (internal)
      _node: node,
    }

    return el
  }

  // Ambil text dari node
  function getText(node) {
    if (!node) return ''
    if (node.type === 'text') return node.data || ''
    return (node.children || []).map(getText).join('')
  }

  // Bikin document object
  const document = {
    // Query
    querySelector(sel) {
      return wrapElement(findOne(sel))
    },
    querySelectorAll(sel) {
      return findAll(sel).map(wrapElement)
    },
    getElementById(id) {
      return wrapElement(findOne(`#${id}`))
    },
    getElementsByTagName(tag) {
      return findAll(tag).map(wrapElement)
    },
    getElementsByClassName(cls) {
      return findAll(`.${cls}`).map(wrapElement)
    },
    getElementsByName(name) {
      return findAll(`[name="${name}"]`).map(wrapElement)
    },

    // Create elements
    createElement(tag) {
      const node = {
        type: 'tag',
        name: tag.toLowerCase(),
        attribs: {},
        children: [],
        parent: null
      }
      return wrapElement(node)
    },
    createTextNode(text) {
      const node = { type: 'text', data: text, parent: null }
      return wrapElement(node)
    },
    createDocumentFragment() {
      const node = { type: 'root', children: [], parent: null }
      return wrapElement(node)
    },

    // Head & Body
    get head() {
      return wrapElement(findOne('head')) || wrapElement({ type: 'tag', name: 'head', attribs: {}, children: [] })
    },
    get body() {
      return wrapElement(findOne('body')) || wrapElement({ type: 'tag', name: 'body', attribs: {}, children: [] })
    },
    get documentElement() {
      return wrapElement(findOne('html')) || wrapElement(dom)
    },

    // Title
    get title() {
      return getText(findOne('title')) || ''
    },
    set title(val) {
      const titleEl = findOne('title')
      if (titleEl) titleEl.children = [{ type: 'text', data: val }]
    },

    // Cookie
    cookie: '',

    // Ready state
    readyState: 'complete',
    get URL() { return '' },

    // Events
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,

    // Serialize balik ke HTML
    get documentElement() {
      return wrapElement(dom)
    },

    // Internal
    _dom: dom,
    _render() {
      return render(dom)
    }
  }

  return document
}
