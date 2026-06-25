import React from 'react';
import MathText from './MathText';

const LatexBlockRenderer = ({ text }) => {
  if (!text) return null;

  const blockRegex = /\\begin\{(tasks|enumerate|itemize)\}(?:\((\d+)\))?/;
  const match = blockRegex.exec(text);

  if (!match) return <MathText text={text} />;

  const type = match[1];
  const arg = match[2];
  const startIndex = match.index;

  let count = 0;
  let endIndex = -1;
  const tagRegex = new RegExp(`\\\\(begin|end)\\{${type}\\}`, 'g');
  tagRegex.lastIndex = startIndex;

  let tagMatch;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    if (tagMatch[1] === 'begin') count++;
    else count--;

    if (count === 0) {
      endIndex = tagMatch.index;
      break;
    }
  }

  if (endIndex === -1) return <MathText text={text} />;

  const beforeText = text.substring(0, startIndex);
  const innerText = text.substring(startIndex + match[0].length, endIndex);
  const afterText = text.substring(endIndex + `\\end{${type}}`.length);

  const elements = [];

  if (beforeText.trim()) elements.push(<LatexBlockRenderer key={`before-${startIndex}`} text={beforeText} />);

  const splitByItem = (txt, keyword) => {
    const parts = txt.split(keyword);
    if (parts.length > 0 && parts[0].trim() === '') parts.shift();
    return parts;
  };

  if (type === 'tasks') {
    const cols = parseInt(arg) || 1;
    const items = splitByItem(innerText, '\\task');
    elements.push(
      <div key={`tasks-${startIndex}`} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '1rem', margin: '0.5rem 0' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ fontWeight: 'bold', color: 'var(--color-text)', marginTop: '2px' }}>{String.fromCharCode(97 + i)})</span>
            <div style={{ flex: 1, minWidth: 0 }}><LatexBlockRenderer text={item.trim()} /></div>
          </div>
        ))}
      </div>
    );
  } else if (type === 'enumerate') {
    const items = splitByItem(innerText, '\\item');
    elements.push(
      <div key={`enum-${startIndex}`} style={{ margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, i) => {
          let content = item.trim();
          let label = `${i + 1}.`;

          const labelMatch = content.match(/^\[(.*?)\]/);
          if (labelMatch) {
            label = labelMatch[1];
            content = content.substring(labelMatch[0].length).trim();
          }
          return (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--color-text)', minWidth: '1.5rem', marginTop: '2px' }}>{label}</span>
              <div style={{ flex: 1, minWidth: 0 }}><LatexBlockRenderer text={content} /></div>
            </div>
          );
        })}
      </div>
    );
  } else if (type === 'itemize') {
    const items = splitByItem(innerText, '\\item');
    elements.push(
      <div key={`item-${startIndex}`} style={{ margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--color-text)', minWidth: '1rem', fontWeight: 'bold', marginTop: '2px' }}>•</span>
            <div style={{ flex: 1, minWidth: 0 }}><LatexBlockRenderer text={item.trim()} /></div>
          </div>
        ))}
      </div>
    );
  }

  if (afterText.trim()) elements.push(<LatexBlockRenderer key={`after-${startIndex}`} text={afterText} />);

  return <>{elements}</>;
};

export default LatexBlockRenderer;
