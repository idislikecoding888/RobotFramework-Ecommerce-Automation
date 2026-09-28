function decodeEntities(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseAttributes(source) {
  const attrs = {};
  const input = String(source || "");
  const re = /([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = re.exec(input))) {
    attrs[match[1]] = decodeEntities(match[2] ?? match[3] ?? "");
  }
  return attrs;
}

function parseXml(xml) {
  const document = { name: "#document", attrs: {}, children: [], text: "" };
  const stack = [document];
  const tokenRe = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<[^>]+>|[^<]+/g;
  let token;

  while ((token = tokenRe.exec(xml))) {
    const value = token[0];
    if (!value) continue;

    if (value.startsWith("<!--") || value.startsWith("<?")) continue;

    if (value.startsWith("<![CDATA[")) {
      stack[stack.length - 1].text += value.slice(9, -3);
      continue;
    }

    if (value.startsWith("</")) {
      const closeName = value.slice(2, -1).trim();
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].name === closeName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (value.startsWith("<")) {
      const selfClosing = /\/\s*>$/.test(value);
      const inner = value.slice(1, selfClosing ? -2 : -1).trim();
      const nameMatch = inner.match(/^([^\s/]+)/);
      if (!nameMatch) continue;

      const name = nameMatch[1];
      const attrSource = inner.slice(name.length);
      const node = { name, attrs: parseAttributes(attrSource), children: [], text: "" };
      stack[stack.length - 1].children.push(node);

      if (!selfClosing) stack.push(node);
      continue;
    }

    stack[stack.length - 1].text += value;
  }

  return document;
}

function child(node, name) {
  return node.children.find((item) => item.name === name) || null;
}

function children(node, name) {
  return node.children.filter((item) => item.name === name);
}

function findAll(node, name, output = []) {
  for (const item of node.children) {
    if (item.name === name) output.push(item);
    findAll(item, name, output);
  }
  return output;
}

function text(node) {
  return collectText(node).replace(/\s+/g, " ").trim();
}

function collectText(node) {
  let result = node.text || "";
  for (const item of node.children) result += collectText(item);
  return result;
}

module.exports = { parseXml, child, children, findAll, text, collectText };
