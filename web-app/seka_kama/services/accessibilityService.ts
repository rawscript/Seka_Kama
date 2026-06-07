// Accessibility Compliance Service for UI/UX Improvements
// Implementation of Task 1.2: Implement Accessibility Compliance Foundation

// ---------------------------------------------------------------------------
// Types and Interfaces
// ---------------------------------------------------------------------------

export interface ColorContrastResult {
  foreground: string;
  background: string;
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
  elementId?: string;
  elementType?: string;
}

export interface AccessibilityCheck {
  elementId: string;
  checkType: 'color-contrast' | 'semantic-structure' | 'keyboard-navigation' | 'aria-labels';
  status: 'pass' | 'fail' | 'warning';
  details: string;
  wcagLevel: 'A' | 'AA' | 'AAA';
  recommendation?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AccessibilityAudit {
  elementId: string;
  auditDate: number;
  checks: AccessibilityCheck[];
  overallStatus: 'compliant' | 'partial' | 'non-compliant';
  wcagLevelAchieved: 'A' | 'AA' | 'AAA';
  remediationPlan: RemediationStep[];
}

export interface RemediationStep {
  checkId: string;
  issue: string;
  solution: string;
  effort: number; // in hours
  priority: number; // 1-10
}

export interface SemanticStructure {
  elementId: string;
  tagName: string;
  ariaLabel?: string;
  ariaDescribedby?: string;
  ariaLabelledby?: string;
  role?: string;
  tabIndex?: number;
  hasFocusIndicator: boolean;
  isKeyboardAccessible: boolean;
  recommendations: string[];
}

export interface ColorVisionSimulation {
  elementId: string;
  originalColor: string;
  simulationType: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  simulatedColor: string;
  distinguishable: boolean;
  contrastRatio: number;
  recommendation?: string;
}

// ---------------------------------------------------------------------------
// Color Contrast Validation Utilities
// ---------------------------------------------------------------------------

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Calculate relative luminance according to WCAG 2.1 formula
 */
function calculateRelativeLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const R = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const G = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const B = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 */
function calculateContrastRatio(luminance1: number, luminance2: number): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Accessibility Validation Service
// ---------------------------------------------------------------------------

export const accessibilityService = {
  /**
   * Validate color contrast against WCAG 2.1 standards
   */
  validateColorContrast(
    foreground: string, 
    background: string, 
    elementId?: string,
    elementType?: string
  ): ColorContrastResult {
    // Convert colors to RGB
    const fgRgb = hexToRgb(foreground);
    const bgRgb = hexToRgb(background);
    
    // Calculate relative luminance
    const fgLuminance = calculateRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
    const bgLuminance = calculateRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    
    // Calculate contrast ratio
    const ratio = calculateContrastRatio(fgLuminance, bgLuminance);
    
    // Check WCAG compliance
    const meetsAA = ratio >= 4.5; // Normal text
    const meetsAAALarge = ratio >= 3; // Large text
    const meetsAAA = ratio >= 7; // Enhanced contrast
    
    // Determine WCAG level
    let wcagLevel: ColorContrastResult['wcagLevel'] = 'FAIL';
    if (ratio >= 7) wcagLevel = 'AAA';
    else if (ratio >= 4.5) wcagLevel = 'AA';
    else if (ratio >= 3) wcagLevel = 'A';
    
    return {
      foreground,
      background,
      ratio: parseFloat(ratio.toFixed(2)),
      meetsAA,
      meetsAAA,
      wcagLevel,
      elementId,
      elementType
    };
  },

  /**
   * Check if color pair meets WCAG 2.1 AA standards for normal text
   */
  meetsWCAGAA(foreground: string, background: string): boolean {
    const result = this.validateColorContrast(foreground, background);
    return result.meetsAA;
  },

  /**
   * Check if color pair meets WCAG 2.1 AAA standards for normal text
   */
  meetsWCAGAAA(foreground: string, background: string): boolean {
    const result = this.validateColorContrast(foreground, background);
    return result.meetsAAA;
  },

  /**
   * Get recommended accessible color combinations
   */
  getAccessibleColorCombinations(
    baseColor: string,
    type: 'foreground' | 'background' = 'foreground'
  ): Array<{ color: string; contrastRatio: number; meetsAA: boolean; meetsAAA: boolean }> {
    const predefinedColors = [
      '#000000', '#FFFFFF', '#333333', '#666666', '#999999',
      '#1a73e8', '#0d652d', '#ea4335', '#fbbc04', '#34a853',
      '#4285f4', '#db4437', '#f4b400', '#0f9d58', '#ab47bc'
    ];
    
    return predefinedColors.map(color => {
      const fg = type === 'foreground' ? color : baseColor;
      const bg = type === 'foreground' ? baseColor : color;
      const result = this.validateColorContrast(fg, bg);
      
      return {
        color,
        contrastRatio: result.ratio,
        meetsAA: result.meetsAA,
        meetsAAA: result.meetsAAA
      };
    }).filter(combo => combo.meetsAA) // Filter to only accessible combinations
      .sort((a, b) => b.contrastRatio - a.contrastRatio); // Sort by highest contrast
  },

  /**
   * Simulate color vision deficiencies
   */
  simulateColorVisionDeficiency(
    color: string,
    deficiencyType: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  ): ColorVisionSimulation {
    const rgb = hexToRgb(color);
    
    // Simplified simulation matrices for common color vision deficiencies
    // Note: Real simulations would use more accurate matrices
    let simulatedRgb = { r: rgb.r, g: rgb.g, b: rgb.b };
    
    switch (deficiencyType) {
      case 'protanopia': // Red-blind
        simulatedRgb = {
          r: 0.567 * rgb.r + 0.433 * rgb.g + 0.000 * rgb.b,
          g: 0.558 * rgb.r + 0.442 * rgb.g + 0.000 * rgb.b,
          b: 0.000 * rgb.r + 0.242 * rgb.g + 0.758 * rgb.b
        };
        break;
      case 'deuteranopia': // Green-blind
        simulatedRgb = {
          r: 0.625 * rgb.r + 0.375 * rgb.g + 0.000 * rgb.b,
          g: 0.700 * rgb.r + 0.300 * rgb.g + 0.000 * rgb.b,
          b: 0.000 * rgb.r + 0.300 * rgb.g + 0.700 * rgb.b
        };
        break;
      case 'tritanopia': // Blue-blind
        simulatedRgb = {
          r: 0.950 * rgb.r + 0.050 * rgb.g + 0.000 * rgb.b,
          g: 0.000 * rgb.r + 0.433 * rgb.g + 0.567 * rgb.b,
          b: 0.000 * rgb.r + 0.475 * rgb.g + 0.525 * rgb.b
        };
        break;
      case 'achromatopsia': // Monochromacy
        const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
        simulatedRgb = { r: luminance, g: luminance, b: luminance };
        break;
    }
    
    // Clamp values
    simulatedRgb.r = Math.min(255, Math.max(0, simulatedRgb.r));
    simulatedRgb.g = Math.min(255, Math.max(0, simulatedRgb.g));
    simulatedRgb.b = Math.min(255, Math.max(0, simulatedRgb.b));
    
    // Convert back to hex
    const simulatedHex = `#${Math.round(simulatedRgb.r).toString(16).padStart(2, '0')}${Math.round(simulatedRgb.g).toString(16).padStart(2, '0')}${Math.round(simulatedRgb.b).toString(16).padStart(2, '0')}`;
    
    // Check if colors are distinguishable (simplified check)
    const distinguishable = Math.abs(rgb.r - simulatedRgb.r) > 20 || 
                           Math.abs(rgb.g - simulatedRgb.g) > 20 || 
                           Math.abs(rgb.b - simulatedRgb.b) > 20;
    
    return {
      elementId: 'color-simulation',
      originalColor: color,
      simulationType: deficiencyType,
      simulatedColor: simulatedHex,
      distinguishable,
      contrastRatio: distinguishable ? 3.0 : 1.0, // Simplified
      recommendation: distinguishable ? undefined : 'Consider adding texture or pattern differentiation'
    };
  },

  /**
   * Analyze semantic structure of an element
   */
  analyzeSemanticStructure(elementId: string): SemanticStructure | null {
    if (typeof document === 'undefined') return null;
    
    const element = document.getElementById(elementId);
    if (!element) return null;
    
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaDescribedby = element.hasAttribute('aria-describedby');
    const hasAriaLabelledby = element.hasAttribute('aria-labelledby');
    const hasRole = element.hasAttribute('role');
    const tabIndex = element.tabIndex;
    
    // Check focus indicator
    const computedStyle = window.getComputedStyle(element);
    const hasFocusIndicator = 
      computedStyle.outlineStyle !== 'none' ||
      computedStyle.outlineWidth !== '0px' ||
      computedStyle.outlineColor !== 'transparent' ||
      computedStyle.boxShadow.includes('inset') ||
      computedStyle.borderColor !== 'transparent';
    
    // Check keyboard accessibility
    const isKeyboardAccessible = 
      element.tagName === 'BUTTON' ||
      element.tagName === 'A' ||
      element.tagName === 'INPUT' ||
      element.tagName === 'SELECT' ||
      element.tagName === 'TEXTAREA' ||
      tabIndex >= 0;
    
    const recommendations: string[] = [];
    
    if (!hasAriaLabel && !hasAriaLabelledby) {
      if (element.tagName === 'BUTTON' || element.tagName === 'A') {
        recommendations.push('Add aria-label or ensure visible text content');
      }
    }
    
    if (!hasFocusIndicator && isKeyboardAccessible) {
      recommendations.push('Add visible focus indicator for keyboard navigation');
    }
    
    if (tabIndex > 0) {
      recommendations.push('Avoid positive tabindex values for natural tab order');
    }
    
    return {
      elementId,
      tagName: element.tagName.toLowerCase(),
      ariaLabel: element.getAttribute('aria-label') || undefined,
      ariaDescribedby: element.getAttribute('aria-describedby') || undefined,
      ariaLabelledby: element.getAttribute('aria-labelledby') || undefined,
      role: element.getAttribute('role') || undefined,
      tabIndex,
      hasFocusIndicator,
      isKeyboardAccessible,
      recommendations
    };
  },

  /**
   * Perform comprehensive accessibility audit on an element
   */
  performAccessibilityAudit(elementId: string): AccessibilityAudit {
    const checks: AccessibilityCheck[] = [];
    
    // Color contrast check (if element has computed styles)
    if (typeof document !== 'undefined') {
      const element = document.getElementById(elementId);
      if (element) {
        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.color;
        const backgroundColor = computedStyle.backgroundColor;
        
        if (color && backgroundColor && color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          const contrastResult = this.validateColorContrast(
            this.rgbToHex(color),
            this.rgbToHex(backgroundColor),
            elementId,
            element.tagName.toLowerCase()
          );
          
          checks.push({
            elementId,
            checkType: 'color-contrast',
            status: contrastResult.meetsAA ? 'pass' : 'fail',
            details: `Contrast ratio: ${contrastResult.ratio}:1 (WCAG AA requires 4.5:1)`,
            wcagLevel: contrastResult.meetsAAA ? 'AAA' : contrastResult.meetsAA ? 'AA' : 'A',
            recommendation: contrastResult.meetsAA ? undefined : 'Increase contrast ratio to at least 4.5:1',
            severity: contrastResult.meetsAA ? 'low' : 'high'
          });
        }
      }
    }
    
    // Semantic structure check
    const semanticAnalysis = this.analyzeSemanticStructure(elementId);
    if (semanticAnalysis) {
      const hasAccessibleSemantics = 
        semanticAnalysis.ariaLabel || 
        semanticAnalysis.ariaLabelledby || 
        (semanticAnalysis.tagName === 'button' && elementId.includes('button')) ||
        (semanticAnalysis.tagName === 'a' && elementId.includes('link'));
      
      checks.push({
        elementId,
        checkType: 'semantic-structure',
        status: hasAccessibleSemantics ? 'pass' : 'warning',
        details: semanticAnalysis.recommendations.length > 0 
          ? semanticAnalysis.recommendations.join(', ')
          : 'Semantic structure is accessible',
        wcagLevel: hasAccessibleSemantics ? 'AA' : 'A',
        recommendation: hasAccessibleSemantics ? undefined : 'Improve semantic markup',
        severity: 'medium'
      });
      
      // Keyboard navigation check
      checks.push({
        elementId,
        checkType: 'keyboard-navigation',
        status: semanticAnalysis.isKeyboardAccessible ? 'pass' : 'warning',
        details: semanticAnalysis.isKeyboardAccessible 
          ? 'Element is keyboard accessible'
          : 'Element may not be reachable via keyboard',
        wcagLevel: 'AA',
        recommendation: semanticAnalysis.isKeyboardAccessible ? undefined : 'Ensure keyboard accessibility',
        severity: semanticAnalysis.isKeyboardAccessible ? 'low' : 'medium'
      });
    }
    
    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'fail');
    const warningChecks = checks.filter(c => c.status === 'warning');
    
    let overallStatus: AccessibilityAudit['overallStatus'] = 'compliant';
    if (failedChecks.length > 0) overallStatus = 'non-compliant';
    else if (warningChecks.length > 0) overallStatus = 'partial';
    
    // Determine WCAG level achieved
    const wcagLevels = checks.map(c => c.wcagLevel);
    let wcagLevelAchieved: AccessibilityAudit['wcagLevelAchieved'] = 'A';
    if (wcagLevels.includes('AAA')) wcagLevelAchieved = 'AAA';
    else if (wcagLevels.includes('AA')) wcagLevelAchieved = 'AA';
    
    // Create remediation plan
    const remediationPlan: RemediationStep[] = checks
      .filter(c => c.status !== 'pass' && c.recommendation)
      .map((check, index) => ({
        checkId: `${elementId}-check-${index}`,
        issue: check.details,
        solution: check.recommendation || 'No specific recommendation available',
        effort: check.severity === 'high' ? 2 : check.severity === 'medium' ? 1 : 0.5,
        priority: check.severity === 'high' ? 10 : check.severity === 'medium' ? 5 : 2
      }))
      .sort((a, b) => b.priority - a.priority);
    
    return {
      elementId,
      auditDate: Date.now(),
      checks,
      overallStatus,
      wcagLevelAchieved,
      remediationPlan
    };
  },

  /**
   * Scan page for accessibility issues
   */
  scanPageForAccessibilityIssues(): AccessibilityAudit[] {
    if (typeof document === 'undefined') return [];
    
    const interactiveElements = Array.from(document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]'
    ));
    
    return interactiveElements
      .map(element => {
        const elementId = element.id || `element-${Math.random().toString(36).substr(2, 9)}`;
        if (!element.id) element.id = elementId;
        return this.performAccessibilityAudit(elementId);
      })
      .filter(audit => audit.overallStatus !== 'compliant');
  },

  /**
   * Generate accessibility report
   */
  generateAccessibilityReport(): {
    timestamp: number;
    totalElementsScanned: number;
    compliantElements: number;
    nonCompliantElements: number;
    criticalIssues: number;
    wcagComplianceLevel: 'A' | 'AA' | 'AAA';
    issuesByType: Record<string, number>;
    recommendations: string[];
  } {
    const audits = this.scanPageForAccessibilityIssues();
    const totalElements = audits.length;
    const compliantElements = audits.filter(a => a.overallStatus === 'compliant').length;
    const nonCompliantElements = audits.filter(a => a.overallStatus === 'non-compliant').length;
    
    const issuesByType: Record<string, number> = {};
    const allChecks = audits.flatMap(a => a.checks);
    
    allChecks.forEach(check => {
      if (check.status !== 'pass') {
        issuesByType[check.checkType] = (issuesByType[check.checkType] || 0) + 1;
      }
    });
    
    const criticalIssues = allChecks.filter(c => c.severity === 'critical' && c.status !== 'pass').length;
    
    // Determine overall WCAG compliance level
    const wcagLevels = allChecks.map(c => c.wcagLevel);
    let wcagComplianceLevel: 'A' | 'AA' | 'AAA' = 'A';
    if (wcagLevels.includes('AAA')) wcagComplianceLevel = 'AAA';
    else if (wcagLevels.includes('AA')) wcagComplianceLevel = 'AA';
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (issuesByType['color-contrast'] > 0) {
      recommendations.push('Improve color contrast ratios to meet WCAG AA standards');
    }
    
    if (issuesByType['semantic-structure'] > 0) {
      recommendations.push('Add ARIA labels and roles to interactive elements');
    }
    
    if (issuesByType['keyboard-navigation'] > 0) {
      recommendations.push('Ensure all interactive elements are keyboard accessible');
    }
    
    if (criticalIssues > 0) {
      recommendations.push('Address critical accessibility issues immediately');
    }
    
    return {
      timestamp: Date.now(),
      totalElementsScanned: totalElements,
      compliantElements,
      nonCompliantElements,
      criticalIssues,
      wcagComplianceLevel,
      issuesByType,
      recommendations
    };
  },

  /**
   * Convert RGB string to hex
   */
  rgbToHex(rgb: string): string {
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    return '#000000';
  },

  /**
   * Get WCAG 2.1 AA compliance checklist
   */
  getWCAGChecklist(): Array<{
    id: string;
    requirement: string;
    level: 'A' | 'AA' | 'AAA';
    description: string;
    testMethod: string;
  }> {
    return [
      {
        id: '1.4.3',
        requirement: 'Color contrast ratio of at least 4.5:1 for normal text',
        level: 'AA',
        description: 'Text and images of text must have a contrast ratio of at least 4.5:1',
        testMethod: 'Use color contrast analyzer tools'
      },
      {
        id: '1.4.3-large',
        requirement: 'Color contrast ratio of at least 3:1 for large text',
        level: 'AA',
        description: 'Large-scale text (18pt or 14pt bold) must have a contrast ratio of at least 3:1',
        testMethod: 'Use color contrast analyzer tools'
      },
      {
        id: '2.1.1',
        requirement: 'All functionality available via keyboard',
        level: 'A',
        description: 'All functionality must be operable through a keyboard interface',
        testMethod: 'Navigate using only keyboard (Tab, Enter, Space, arrow keys)'
      },
      {
        id: '2.4.7',
        requirement: 'Focus indicators visible for all interactive elements',
        level: 'AA',
        description: 'Any keyboard operable user interface must have a mode of operation where the keyboard focus indicator is visible',
        testMethod: 'Tab through page and verify focus visibility'
      },
      {
        id: '4.1.2',
        requirement: 'Meaningful link text and button labels',
        level: 'A',
        description: 'Links and buttons must have accessible names',
        testMethod: 'Check aria-label, aria-labelledby, or visible text content'
      },
      {
        id: '3.3.2',
        requirement: 'Form labels associated with form controls',
        level: 'A',
        description: 'Labels must be programmatically associated with form controls',
        testMethod: 'Check label "for" attribute or aria-labelledby'
      },
      {
        id: '3.3.1',
        requirement: 'Error identification and suggestions for correction',
        level: 'A',
        description: 'If an input error is detected, the error must be identified and described to the user',
        testMethod: 'Check for error messages and suggestions'
      },
      {
        id: '3.2.3',
        requirement: 'Consistent navigation mechanisms',
        level: 'AA',
        description: 'Navigation mechanisms that are repeated on multiple pages must occur in the same relative order',
        testMethod: 'Verify navigation consistency across pages'
      },
      {
        id: '3.2.4',
        requirement: 'Consistent identification of components',
        level: 'AA',
        description: 'Components with the same functionality must be identified consistently',
        testMethod: 'Check component labeling consistency'
      }
    ];
  }
};

// ---------------------------------------------------------------------------
// React Hook for Accessibility Service
// ---------------------------------------------------------------------------

export function useAccessibility() {
  return {
    // Color Contrast
    validateColorContrast: (foreground: string, background: string, elementId?: string) => 
      accessibilityService.validateColorContrast(foreground, background, elementId),
    
    meetsWCAGAA: (foreground: string, background: string) => 
      accessibilityService.meetsWCAGAA(foreground, background),
    
    meetsWCAGAAA: (foreground: string, background: string) => 
      accessibilityService.meetsWCAGAAA(foreground, background),
    
    getAccessibleColorCombinations: (baseColor: string, type?: 'foreground' | 'background') => 
      accessibilityService.getAccessibleColorCombinations(baseColor, type),
    
    // Color Vision Simulation
    simulateColorVisionDeficiency: (color: string, deficiencyType: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia') => 
      accessibilityService.simulateColorVisionDeficiency(color, deficiencyType),
    
    // Semantic Analysis
    analyzeSemanticStructure: (elementId: string) => 
      accessibilityService.analyzeSemanticStructure(elementId),
    
    // Audits and Reports
    performAccessibilityAudit: (elementId: string) => 
      accessibilityService.performAccessibilityAudit(elementId),
    
    scanPageForAccessibilityIssues: () => 
      accessibilityService.scanPageForAccessibilityIssues(),
    
    generateAccessibilityReport: () => 
      accessibilityService.generateAccessibilityReport(),
    
    // WCAG Checklist
    getWCAGChecklist: () => 
      accessibilityService.getWCAGChecklist(),
    
    // Utilities
    rgbToHex: (rgb: string) => 
      accessibilityService.rgbToHex(rgb)
  };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default accessibilityService;