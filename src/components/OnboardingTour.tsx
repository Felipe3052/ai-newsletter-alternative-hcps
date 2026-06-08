import { useEffect, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';
import type { TabId } from '../App';

interface TourStep {
  title: string;
  body: string;
  selector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  tab?: TabId;
}

const tourSteps: TourStep[] = [
  {
    title: 'Welcome to the Relevance Engine 🩺',
    body: 'This application demonstrates a modern solution for Information Triage for Healthcare Professionals (HCPs). Instead of flooding HCPs with generic newsletters, our Relevance Engine filters and highlights medical updates tailored to their active Patient Panels.',
    // Center modal
  },
  {
    title: '1. Select a Simulated HCP',
    body: 'Choose which HCP profile to simulate (e.g., Dr. Lena Meier, oncologist). Each HCP manages a distinct Patient Panel. The Relevance Engine uses an anonymized HCP Relevance Profile derived from this panel to assess relevance.',
    selector: '#hcp-selector',
    placement: 'right',
    tab: 'app'
  },
  {
    title: '2. Choose a Newsletter',
    body: 'Select a Newsletter to test (e.g., a thoracic oncology update, a guidelines brief, or an administrative update).',
    selector: '#newsletter-selector',
    placement: 'right',
    tab: 'app'
  },
  {
    title: '3. Run Relevance Check',
    body: 'Click "Check relevance" to simulate the AI-powered Information Triage. The Relevance Engine compares the Newsletter\'s clinical signals against the HCP\'s Relevance Profile to determine if it is Push-Worthy.',
    selector: '#run-check-button',
    placement: 'right',
    tab: 'app'
  },
  {
    title: '4. HCP App & Inbox',
    body: 'If the Relevance Decision is Push-Worthy, a concise, patient-safe Relevance Summary is pushed to the HCP Inbox. If not, the inbox remains clean, protecting the HCP from information overload.',
    selector: '#phone-inbox',
    placement: 'left',
    tab: 'app'
  },
  {
    title: '5. Exploration & Transparency',
    body: 'Explore the workflow tabs to see the engineering and AI layers in action:\n\n• Anonymization: See how Patient Panels are de-identified into clean clinical traits.\n• Newsletters: Read the original, complete Newsletter inputs.\n• AI Decision: Inspect the live AI reasoning, score, and generated payload.',
    selector: '#navigation-tabs',
    placement: 'bottom'
  }
];

interface OnboardingTourProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  onClose: () => void;
}

export function OnboardingTour({ activeTab, setActiveTab, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = tourSteps[currentStep];

  // Auto-switch tabs if needed
  useEffect(() => {
    if (step.tab && activeTab !== step.tab) {
      setActiveTab(step.tab);
    }
  }, [currentStep, step.tab]);

  const recalculate = () => {
    if (!step.selector) {
      setRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(460px, 90vw)',
      });
      return;
    }

    const el = document.querySelector(step.selector);
    if (!el) {
      setRect(null);
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(460px, 90vw)',
      });
      return;
    }

    const elementRect = el.getBoundingClientRect();

    const padding = 8;
    const absoluteRect = {
      top: elementRect.top - padding,
      left: elementRect.left - padding,
      width: elementRect.width + padding * 2,
      height: elementRect.height + padding * 2,
      bottom: elementRect.bottom + padding,
      right: elementRect.right + padding,
    };

    setRect(absoluteRect as unknown as DOMRect);

    // Initial rough placement
    const placement = step.placement || 'bottom';
    const tooltipWidth = 340;
    const gap = 16;
    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      left = absoluteRect.left + absoluteRect.width / 2 - tooltipWidth / 2;
      top = absoluteRect.bottom + gap;
    } else if (placement === 'top') {
      left = absoluteRect.left + absoluteRect.width / 2 - tooltipWidth / 2;
      top = absoluteRect.top - gap - 220; // Temporary height estimate
    } else if (placement === 'right') {
      left = absoluteRect.right + gap;
      top = absoluteRect.top + absoluteRect.height / 2 - 110;
    } else if (placement === 'left') {
      left = absoluteRect.left - tooltipWidth - gap;
      top = absoluteRect.top + absoluteRect.height / 2 - 110;
    }

    // Constrain within viewport bounds horizontally
    const viewportWidth = window.innerWidth;
    left = Math.max(16, Math.min(viewportWidth - tooltipWidth - 16, left));

    setTooltipStyle({
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
    });
  };

  // Recalculate dimensions on step/tab changes, window resizing, or scroll
  useEffect(() => {
    // Add small delay to let tab switching transition complete before measuring elements
    const timer = setTimeout(recalculate, 150);

    window.addEventListener('resize', recalculate);
    window.addEventListener('scroll', recalculate);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', recalculate);
      window.removeEventListener('scroll', recalculate);
    };
  }, [currentStep, activeTab]);

  // Fine-tune vertical alignment once tooltip height is known
  useEffect(() => {
    if (!step.selector || !rect) return;
    const tooltipEl = tooltipRef.current;
    if (!tooltipEl) return;

    const tooltipHeight = tooltipEl.offsetHeight;
    const placement = step.placement || 'bottom';
    const gap = 16;
    let top = 0;

    if (placement === 'bottom') {
      top = rect.bottom + gap;
    } else if (placement === 'top') {
      top = rect.top - tooltipHeight - gap;
    } else {
      // center vertically
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
    }

    // Keep vertically inside bounds relative to viewport height
    const viewportHeight = window.innerHeight;
    top = Math.max(16, Math.min(viewportHeight - tooltipHeight - 16, top));

    setTooltipStyle((prev) => ({
      ...prev,
      top: `${top}px`,
    }));
  }, [rect, currentStep]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding-completed', 'true');
    onClose();
  };

  return (
    <div className="tour-overlay" onClick={handleComplete}>
      {/* Target element highlight hole */}
      {rect && (
        <div
          className="tour-highlight-hole"
          style={{
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
          onClick={(e) => e.stopPropagation()} // prevent closing when clicking the highlighted element
        />
      )}

      {/* Floating Tour dialog card */}
      <div
        ref={tooltipRef}
        className={`tour-card ${!step.selector ? 'is-centered' : ''}`}
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          className="tour-close-btn"
          type="button"
          onClick={handleComplete}
          aria-label="Close Tour"
        >
          <X size={16} />
        </button>

        <div className="tour-header">
          {!step.selector ? (
            <div className="tour-badge welcome">
              <Sparkles size={14} />
              <span>Introduction</span>
            </div>
          ) : (
            <div className="tour-badge">
              <span>Step {currentStep} of {tourSteps.length - 1}</span>
            </div>
          )}
          <h3>{step.title}</h3>
        </div>

        <div className="tour-body">
          {step.body.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        <div className="tour-footer">
          {/* Progress dots for step indicator */}
          <div className="tour-progress">
            {tourSteps.map((_, index) => (
              <span
                key={index}
                className={`tour-progress-dot ${index === currentStep ? 'is-active' : ''}`}
                onClick={() => setCurrentStep(index)}
              />
            ))}
          </div>

          <div className="tour-actions">
            {currentStep > 0 && (
              <button className="tour-btn tour-btn-secondary" type="button" onClick={handlePrev}>
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            )}

            <button className="tour-btn tour-btn-primary" type="button" onClick={handleNext}>
              <span>{currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
