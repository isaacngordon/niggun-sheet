'use client';

import { useEffect, useState } from 'react';

const TOOLTIP_SELECTOR = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function getAriaLabelledByText(element: Element) {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (!labelledBy) {
    return '';
  }

  return normalizeText(
    labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' '),
  );
}

function getAssociatedLabelText(element: Element) {
  const nearestLabel = element.closest('label');
  if (nearestLabel) {
    return normalizeText(nearestLabel.textContent);
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return normalizeText(Array.from(element.labels ?? []).map((label) => label.textContent ?? '').join(' '));
  }

  return '';
}

function getElementText(element: Element) {
  const ariaLabel = normalizeText(element.getAttribute('aria-label'));
  if (ariaLabel) {
    return ariaLabel;
  }

  const songTitle = normalizeText(
    element.querySelector('.sb2-song-card-title, .sb2-song-item-title')?.textContent,
  );
  if (songTitle) {
    return songTitle;
  }

  const labelledByText = getAriaLabelledByText(element);
  if (labelledByText) {
    return labelledByText;
  }

  const labelText = getAssociatedLabelText(element);
  if (labelText) {
    return labelText;
  }

  if (element instanceof HTMLInputElement) {
    if (element.type === 'submit' || element.type === 'button' || element.type === 'reset') {
      return normalizeText(element.value || element.name);
    }

    return normalizeText(element.placeholder || element.name);
  }

  if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    return normalizeText(element.getAttribute('placeholder') || element.getAttribute('name') || '');
  }

  const imageAlt = normalizeText(element.querySelector('img[alt]')?.getAttribute('alt'));
  if (imageAlt) {
    return imageAlt;
  }

  return normalizeText(element.textContent);
}

function syncTooltip(element: Element) {
  if (element.hasAttribute('title') && element.getAttribute('data-auto-tooltip') !== 'true') {
    return;
  }

  const tooltip = getElementText(element);
  if (!tooltip) {
    if (element.getAttribute('data-auto-tooltip') === 'true') {
      element.removeAttribute('title');
      element.removeAttribute('data-auto-tooltip');
    }
    return;
  }

  if (element.getAttribute('title') !== tooltip || element.getAttribute('data-auto-tooltip') === 'true') {
    element.setAttribute('title', tooltip);
    element.setAttribute('data-auto-tooltip', 'true');
  }
}

function applyTooltips(root: ParentNode) {
  const elements = new Set<Element>();

  if (root instanceof Element && root.matches(TOOLTIP_SELECTOR)) {
    elements.add(root);
  }

  root.querySelectorAll?.(TOOLTIP_SELECTOR).forEach((element) => {
    elements.add(element);
  });

  elements.forEach(syncTooltip);
}

export default function AutoTooltipManager() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    let frameId = 0;

    const scheduleApply = () => {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        applyTooltips(document.body);
      });
    };

    applyTooltips(document.body);

    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'placeholder', 'name', 'title', 'value'],
    });

    return () => {
      observer.disconnect();
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return null;
}