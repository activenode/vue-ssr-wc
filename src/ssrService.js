const vueRenderer = require("vue-server-renderer");
// here we are mocking a ssr service where the HTML gets send to

/**
 * We need the following map since the CMS plays web components.
 * But what Vue needs is an actual vue component
 * (that it can wrap back to a web component to make it isomorphic)
 */
const wcToVueMap = {
  "wc-slider": "slider-container",
  "wc-slider-elem": "slider-elem"
};
const wcKeys = Object.keys(wcToVueMap);

/**
 * This function converts given html so that the tagNames
 * are mapped back to the Vue component names
 * @param {DOMElement} node - the XML root node of the HTML which shall be traversed
 * @param {DOMElement} parent - should not be provided! it is required for its recursive calls!
 */
const convertWcHtmlNodesToVueTemplate = (node, parent) => {
  const nodeName = node.nodeName.toLowerCase();
  if (!parent) {
    parent = document.createElement("ghost");
  }

  let newElem;

  if (nodeName === "#text") {
    // its a text node, copy
    newElem = node.cloneNode();
  } else if (wcKeys.includes(nodeName)) {
    // okay we need to rename this one
    const newTagName = wcToVueMap[nodeName];
    newElem = document.createElement(newTagName);
  } else {
    newElem = document.createElement(nodeName);
    // process all children
  }

  if (nodeName !== "#text") {
    [...node.attributes].forEach(attr => {
      newElem.setAttribute(attr.name, attr.value);
    });

    [...node.childNodes].forEach(childNode => {
      convertWcHtmlNodesToVueTemplate(childNode, newElem);
    });
  }

  parent.appendChild(newElem);

  return parent.innerHTML;
};

export function convertRawHtmlToVueTemplate(rawHtml) {
  const parsedHtmlAsNodes = new DOMParser().parseFromString(
    rawHtml,
    "application/xml"
  );

  const rootElement = parsedHtmlAsNodes.documentElement;
  const vueTemplateString = convertWcHtmlNodesToVueTemplate(rootElement);

  return Promise.resolve(vueTemplateString);
}

export function ssrVueTemplate(Vue, htmlVueTemplate) {
  const html = new Vue({ template: htmlVueTemplate });
  const renderer = vueRenderer.createRenderer();

  return renderer.renderToString(html, {
    optimizeSSR: false
  });
}
