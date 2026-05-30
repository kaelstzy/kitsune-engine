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
      getAttributeNode(name) {
        if (!this.hasAttribute(name)) return null
        return { name, value: node.attribs[name], specified: true }
      },
      getAttributeNames() {
        return Object.keys(node.attribs || {})
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
      get type() { return node.attribs?.type || '' },
      get name() { return node.attribs?.name || '' },

      // Style (simulasi sederhana — jQuery butuh ini)
      style: new Proxy({}, {
        get: (_, prop) => {
          if (prop === 'cssText') return ''
          if (prop === 'setProperty') return () => {}
          if (prop === 'removeProperty') return () => {}
          if (prop === 'getPropertyValue') return () => ''
          return ''
        },
        set: () => true
      }),

      // Dataset
      get dataset() {
        const data = {}
        for (const [key, val] of Object.entries(node.attribs || {})) {
          if (key.startsWith('data-')) {
            const camel = key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
            data[camel] = val
          }
        }
        return data
      },

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
      get childElementCount() {
        return (node.children || []).filter(c => c.type === 'tag').length
      },
      get firstChild() {
        return node.children?.[0] ? wrapElement(node.children[0]) : null
      },
      get lastChild() {
        const kids = node.children || []
        return kids.length ? wrapElement(kids[kids.length - 1]) : null
      },
      get firstElementChild() {
        const kids = (node.children || []).filter(c => c.type === 'tag')
        return kids.length ? wrapElement(kids[0]) : null
      },
      get lastElementChild() {
        const kids = (node.children || []).filter(c => c.type === 'tag')
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
      get nextElementSibling() {
        if (!node.parent) return null
        const siblings = node.parent.children || []
        let idx = siblings.indexOf(node) + 1
        while (idx < siblings.length) {
          if (siblings[idx].type === 'tag') return wrapElement(siblings[idx])
          idx++
        }
        return null
      },
      get previousElementSibling() {
        if (!node.parent) return null
        const siblings = node.parent.children || []
        let idx = siblings.indexOf(node) - 1
        while (idx >= 0) {
          if (siblings[idx].type === 'tag') return wrapElement(siblings[idx])
          idx--
        }
        return null
      },

      // Query
      querySelector(sel) {
        return wrapElement(findOne(sel, node))
      },
      querySelectorAll(sel) {
        return findAll(sel, node).map(wrapElement)
      },
      getElementsByTagName(tag) {
        if (tag === '*') return findAll('*', node).map(wrapElement)
        return findAll(tag, node).map(wrapElement)
      },
      getElementsByClassName(cls) {
        return findAll(`.${cls}`, node).map(wrapElement)
      },
      getElementsByTagNameNS(ns, tag) {
        return findAll(tag, node).map(wrapElement)
      },

      // DOM manipulation
      appendChild(child) {
        if (!node.children) node.children = []
        if (child && child._node) {
          child._node.parent = node
          node.children.push(child._node)
        }
        return child
      },
      prepend(...nodes) {
        if (!node.children) node.children = []
        for (const child of nodes.reverse()) {
          if (child && child._node) {
            child._node.parent = node
            node.children.unshift(child._node)
          }
        }
      },
      append(...nodes) {
        for (const child of nodes) {
          if (child && child._node) {
            child._node.parent = node
            if (!node.children) node.children = []
            node.children.push(child._node)
          }
        }
      },
      removeChild(child) {
        if (node.children && child && child._node) {
          const idx = node.children.indexOf(child._node)
          if (idx > -1) node.children.splice(idx, 1)
        }
        return child
      },
      insertBefore(newChild, refChild) {
        if (!node.children) node.children = []
        if (newChild && newChild._node) {
          if (refChild && refChild._node) {
            const idx = node.children.indexOf(refChild._node)
            if (idx > -1) node.children.splice(idx, 0, newChild._node)
            else node.children.push(newChild._node)
          } else {
            node.children.push(newChild._node)
          }
          newChild._node.parent = node
        }
        return newChild
      },
      replaceChild(newChild, oldChild) {
        if (node.children && newChild && newChild._node && oldChild && oldChild._node) {
          const idx = node.children.indexOf(oldChild._node)
          if (idx > -1) {
            newChild._node.parent = node
            node.children.splice(idx, 1, newChild._node)
          }
        }
        return oldChild
      },
      remove() {
        if (node.parent?.children) {
          const idx = node.parent.children.indexOf(node)
          if (idx > -1) node.parent.children.splice(idx, 1)
        }
      },
      cloneNode(deep = false) {
  function cloneRaw(n, parent = null) {
    const c = {
      type: n.type,
      name: n.name,
      data: n.data,
      attribs: n.attribs ? { ...n.attribs } : {},
      parent,
      children: []
    }
    if (deep && n.children) {
      c.children = n.children.map(child => cloneRaw(child, c))
    }
    return c
  }
  return wrapElement(cloneRaw(node))
},
      normalize() {},

      // Events (no-op)
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      click: () => {},
      focus: () => {},
      blur: () => {},
      submit: () => {},

      // Bounding rect (simulasi)
      getBoundingClientRect: () => ({
        top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0,
        toJSON: () => ({})
      }),
      getClientRects: () => [],
      scrollIntoView: () => {},
      scrollTo: () => {},
      scroll: () => {},

      // contains
      contains(other) {
        if (!other) return false
        if (other._node === node) return true
        return other?._node ? (node.children || []).includes(other._node) : false
      },

      matches(sel) {
        try {
          return cssSelect.is(node, sel)
        } catch {
          return false
        }
      },

      closest(sel) {
        let current = node
        while (current) {
          try {
            if (cssSelect.is(current, sel)) return wrapElement(current)
          } catch {}
          current = current.parent
        }
        return null
      },

      // insertAdjacentHTML / insertAdjacentElement / insertAdjacentText
      insertAdjacentHTML(position, htmlStr) {
        const parsed = htmlparser2.parseDocument(htmlStr)
        const newNodes = parsed.children
        const parent = node.parent
        const attach = (n, p) => { n.parent = p; return n }

        if (position === 'beforebegin' && parent) {
          const idx = parent.children.indexOf(node)
          parent.children.splice(idx, 0, ...newNodes.map(n => attach(n, parent)))
        } else if (position === 'afterbegin') {
          if (!node.children) node.children = []
          node.children.unshift(...newNodes.map(n => attach(n, node)))
        } else if (position === 'beforeend') {
          if (!node.children) node.children = []
          node.children.push(...newNodes.map(n => attach(n, node)))
        } else if (position === 'afterend' && parent) {
          const idx = parent.children.indexOf(node)
          parent.children.splice(idx + 1, 0, ...newNodes.map(n => attach(n, parent)))
        }
      },
      insertAdjacentElement(position, element) {
        if (!element || !element._node) return null
        const newNode = element._node
        const parent = node.parent
        if (position === 'beforebegin' && parent) {
          newNode.parent = parent
          parent.children.splice(parent.children.indexOf(node), 0, newNode)
        } else if (position === 'afterbegin') {
          if (!node.children) node.children = []
          newNode.parent = node; node.children.unshift(newNode)
        } else if (position === 'beforeend') {
          if (!node.children) node.children = []
          newNode.parent = node; node.children.push(newNode)
        } else if (position === 'afterend' && parent) {
          newNode.parent = parent
          parent.children.splice(parent.children.indexOf(node) + 1, 0, newNode)
        }
        return element
      },
      insertAdjacentText(position, text) {
        const textNode = { type: 'text', data: text, parent: null }
        const parent = node.parent
        if (position === 'beforebegin' && parent) {
          textNode.parent = parent
          parent.children.splice(parent.children.indexOf(node), 0, textNode)
        } else if (position === 'afterbegin') {
          if (!node.children) node.children = []
          textNode.parent = node; node.children.unshift(textNode)
        } else if (position === 'beforeend') {
          if (!node.children) node.children = []
          textNode.parent = node; node.children.push(textNode)
        } else if (position === 'afterend' && parent) {
          textNode.parent = parent
          parent.children.splice(parent.children.indexOf(node) + 1, 0, textNode)
        }
      },

      // before() / after() / replaceWith()
      before(...nodes_) {
        if (!node.parent) return
        const idx = node.parent.children.indexOf(node)
        const toInsert = nodes_.flatMap(n => {
          if (typeof n === 'string') return [{ type: 'text', data: n, parent: node.parent }]
          if (n && n._node) { n._node.parent = node.parent; return [n._node] }
          return []
        })
        node.parent.children.splice(idx, 0, ...toInsert)
      },
      after(...nodes_) {
        if (!node.parent) return
        const idx = node.parent.children.indexOf(node)
        const toInsert = nodes_.flatMap(n => {
          if (typeof n === 'string') return [{ type: 'text', data: n, parent: node.parent }]
          if (n && n._node) { n._node.parent = node.parent; return [n._node] }
          return []
        })
        node.parent.children.splice(idx + 1, 0, ...toInsert)
      },
      replaceWith(...nodes_) {
        if (!node.parent) return
        const idx = node.parent.children.indexOf(node)
        const toInsert = nodes_.flatMap(n => {
          if (typeof n === 'string') return [{ type: 'text', data: n, parent: node.parent }]
          if (n && n._node) { n._node.parent = node.parent; return [n._node] }
          return []
        })
        node.parent.children.splice(idx, 1, ...toInsert)
      },

      // toggleAttribute
      toggleAttribute(name, force) {
        if (!node.attribs) node.attribs = {}
        const has = name in node.attribs
        if (force === true || (!has && force === undefined)) {
          node.attribs[name] = ''; return true
        } else if (force === false || (has && force === undefined)) {
          delete node.attribs[name]; return false
        }
        return false
      },

      // isConnected — true kalau ada di DOM tree
      get isConnected() {
        let current = node
        while (current.parent) current = current.parent
        return current.type === 'root'
      },

      // ownerDocument — referensi ke document
      get ownerDocument() { return document },

      // animate (stub — banyak framework modern pakai ini)
      animate(keyframes, options) {
        return {
          finished: Promise.resolve(),
          ready: Promise.resolve(),
          play: () => {}, pause: () => {}, cancel: () => {},
          finish: () => {}, reverse: () => {}, commitStyles: () => {},
          persist: () => {}, currentTime: 0, playbackRate: 1,
          playState: 'finished', effect: null, timeline: null,
          onfinish: null, oncancel: null,
        }
      },

      // contentEditable
      get contentEditable() { return node.attribs?.contenteditable || 'inherit' },
      set contentEditable(val) {
        if (!node.attribs) node.attribs = {}
        node.attribs.contenteditable = val
      },
      get isContentEditable() { return node.attribs?.contenteditable === 'true' },

      // offsetParent dll (jQuery butuh ini gak throw)
      get offsetParent() { return null },
      get offsetTop() { return 0 },
      get offsetLeft() { return 0 },
      get offsetWidth() { return 0 },
      get offsetHeight() { return 0 },
      get scrollTop() { return 0 },
      set scrollTop(_) {},
      get scrollLeft() { return 0 },
      set scrollLeft(_) {},
      get scrollWidth() { return 0 },
      get scrollHeight() { return 0 },
      get clientTop() { return 0 },
      get clientLeft() { return 0 },
      get clientWidth() { return 0 },
      get clientHeight() { return 0 },

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
      if (tag === '*') return findAll('*').map(wrapElement)
      return findAll(tag).map(wrapElement)
    },
    getElementsByClassName(cls) {
      return findAll(`.${cls}`).map(wrapElement)
    },
    getElementsByName(name) {
      return findAll(`[name="${name}"]`).map(wrapElement)
    },
    getElementsByTagNameNS(ns, tag) {
      return findAll(tag).map(wrapElement)
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
    createElementNS(ns, tag) {
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
    createComment(data) {
      return wrapElement({ type: 'comment', data, parent: null })
    },
    createAttribute(name) {
      return { name, value: '', specified: true }
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

    // Ready state & metadata
    readyState: 'complete',
    get URL() { return '' },
    get baseURI() { return '' },
    nodeType: 9,
    nodeName: '#document',
    compatMode: 'CSS1Compat',
    characterSet: 'UTF-8',
    charset: 'UTF-8',
    inputEncoding: 'UTF-8',
    contentType: 'text/html',

    // jQuery / framework butuh ini
    defaultView: null,
    implementation: {
      hasFeature: () => true,
      createDocumentType: () => null,
      createDocument: () => null,
    },

    // document.write
    write(html) {
      const parsed = require !== undefined ? null : null
      const imp = htmlparser2.parseDocument(html)
      const body = findOne('body')
      if (body) {
        imp.children.forEach(c => { c.parent = body; body.children.push(c) })
      }
    },
    writeln(html) { this.write(html + '') },
    open() {},
    close() {},

    // Events
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,

    // Internal
    _dom: dom,
    _render() {
      return render(dom)
    }
  }

  return document
}