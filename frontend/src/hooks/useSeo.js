import { useEffect } from 'react'

const ensureMeta = (name) => {
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  return tag
}

const removeJsonLd = () => {
  const nodes = document.querySelectorAll('[data-seo-jsonld="true"]')
  nodes.forEach((node) => node.remove())
}

const appendJsonLd = (jsonLd) => {
  if (!jsonLd) return
  const payloads = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
  payloads.forEach((payload, index) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.setAttribute('data-seo-jsonld', 'true')
    script.id = `seo-jsonld-${index}`
    script.textContent = JSON.stringify(payload)
    document.head.appendChild(script)
  })
}

export default function useSeo({ title, description, jsonLd }) {
  useEffect(() => {
    if (title) {
      document.title = title
    }
    if (description) {
      const tag = ensureMeta('description')
      tag.setAttribute('content', description)
    }
    removeJsonLd()
    appendJsonLd(jsonLd)

    return () => {
      removeJsonLd()
    }
  }, [title, description, jsonLd])
}
